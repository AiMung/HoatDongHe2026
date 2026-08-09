/* ==========================================================================
   MOCK DATA & CONSTANTS
   ========================================================================== */

let WEEKLY_ACTIVITIES = [];

const CONFIG_API_URL = "https://script.google.com/macros/s/AKfycbxXG4eo8qwmplkE0zH89Xp8fimHw6AZJNN93ADeT4WR9HikxszC8kN7IqRUJY33yiRr3A/exec";
window.CONFIG_API_URL = CONFIG_API_URL;
const DEFAULT_ATTENDANCE = [
  { date: "2026-06-01", week: "Tuần 1", name: "Nguyễn Văn An", status: "Có mặt", notes: "Đi đúng giờ", chiDoan: "Chi đoàn Thanh niên Tổ dân phố Nguyễn Trung Trực 2" },
  { date: "2026-06-01", week: "Tuần 1", name: "Trần Thị Bình", status: "Có mặt", notes: "Hào hứng", chiDoan: "Chi đoàn Thanh niên Tổ dân phố Nguyễn Trung Trực 2" },
  { date: "2026-06-01", week: "Tuần 1", name: "Lê Hoàng Châu", status: "Vắng có phép", notes: "Bị ốm nhẹ", chiDoan: "Chi đoàn Thanh niên Tổ dân phố Nguyễn Trung Trực 2" },
  { date: "2026-06-08", week: "Tuần 2", name: "Nguyễn Văn An", status: "Có mặt", notes: "Học bơi rất tích cực", chiDoan: "Chi đoàn Thanh niên Tổ dân phố Nguyễn Trung Trực 2" },
  { date: "2026-06-08", week: "Tuần 2", name: "Phạm Minh Đức", status: "Có mặt", notes: "Nhiệt tình tham gia sơ cứu", chiDoan: "Chi đoàn Thanh niên Tổ dân phố Nguyễn Văn Trỗi." },
  { date: "2026-06-08", week: "Tuần 2", name: "Vũ Thu Hà", status: "Vắng không phép", notes: "", chiDoan: "Chi đoàn Thanh niên Tổ dân phố Nguyễn Văn Trỗi." }
];

let dynamicStudentSuggestions = [
  "Nguyễn Văn An", "Trần Thị Bình", "Lê Hoàng Châu", "Phạm Minh Đức", "Vũ Thu Hà",
  "Hoàng Quốc Bảo", "Đặng Thùy Dương", "Phan Gia Huy", "Bùi Khánh Linh", "Đỗ Nam Phong",
  "Mai Thanh Thảo", "Ngô Minh Triết", "Trịnh Thảo Vy", "Lý Gia Hào", "Vương Hải Đăng"
];

const DEFAULT_PHOTOS = [
  { id: 1, title: "Lớp học vẽ ngoài trời mùa hè", category: "arts", src: "image/activity_art.png" },
  { id: 2, title: "Các trận bóng đá thiếu nhi sôi động", category: "sports", src: "image/activity_sports.png" },
  { id: 3, title: "Hướng dẫn thực hành lắp ráp STEM", category: "skills", src: "image/activity_skills.png" },
  { id: 4, title: "Các chiến sĩ tình nguyện trồng cây xanh", category: "volunteer", src: "image/activity_volunteer.png" }
];

/* ==========================================================================
   INITIALIZATION & PERSISTED STATE
   ========================================================================== */

let attendanceRecords = [];
let galleryPhotos = [];
let activeLightboxIndex = 0;

document.addEventListener("DOMContentLoaded", () => {
  // Sync state from Local/Session Storage
  loadAttendanceData();
  loadGalleryData();
  loadWeeklyActivitiesData();

  const isLoginPage = !!document.getElementById("loginForm");
  const isPublicEventPage = !!document.getElementById("publicRegisterForm");

  // --- Auth Guard: Bảo vệ tất cả trang nội bộ ---
  if (!isLoginPage && !isPublicEventPage) {
    const userStr = localStorage.getItem("summer_user");
    if (!userStr) {
      window.location.href = "login.html";
      return; // Dừng khởi tạo hoàn toàn nếu chưa đăng nhập
    }

    // Kiểm tra Timeout (30 phút inactive)
    const lastActive = localStorage.getItem("summer_last_active");
    if (lastActive && Date.now() - parseInt(lastActive) > 30 * 60 * 1000) {
      localStorage.removeItem("summer_user");
      window.location.href = "login.html";
      return;
    }
    localStorage.setItem("summer_last_active", Date.now());
    document.addEventListener("mousemove", () => localStorage.setItem("summer_last_active", Date.now()));
    document.addEventListener("keydown", () => localStorage.setItem("summer_last_active", Date.now()));
  }

  // Core layouts
  if (!isLoginPage && !isPublicEventPage) {
    initTheme();
    initMobileMenu();
    highlightActiveSidebar();
    renderSidebarProfile();

    // Parallel Sync with Caching (5 mins)
    const lastSync = localStorage.getItem("summer_sync_time");
    if (CONFIG_API_URL && (!lastSync || Date.now() - parseInt(lastSync) > 5 * 60 * 1000)) {
      Promise.all([
        syncMembersWithServer(),
        syncAttendanceWithServer(),
        syncGalleryWithServer(),
        syncWeeklyActivitiesWithServer()
      ]).then(() => {
        localStorage.setItem("summer_sync_time", Date.now());
      }).catch(err => console.warn("Sync error:", err));
    } else if (CONFIG_API_URL && WEEKLY_ACTIVITIES.length === 0) {
      // Force sync if empty
      syncWeeklyActivitiesWithServer();
    }
  } else if (isLoginPage) {
    initTheme();
    initLoginPage();
  } else {
    initTheme();
  }

  // Conditionally initialize page-specific modules
  if (document.getElementById("days")) {
    initCountdown();
  }
  if (document.getElementById("weeklySlider") || document.getElementById("weeklyGrid") || document.getElementById("extraEventList")) {
    initWeeklyActivities();
    initExtraEvents();
  }
  if (document.getElementById("attendanceTableBody")) {
    initAttendanceTracker();
    initBulkWeeklyAttendance();
  }
  if (document.getElementById("galleryGrid")) {
    initGallery();
  }
  if (document.getElementById("publicRegisterForm")) {
    initPublicEventRegister();
  }

  // Always update general statistics if counters are visible on the page
  updateStatsMetrics();
});

/* ==========================================================================
   DATA HANDLERS
   ========================================================================== */

// --- UTILS: TOAST & SKELETON ---
function showToast(message, type = "success") {
  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    container.style.cssText = "position:fixed;bottom:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:10px;";
    document.body.appendChild(container);
  }
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.style.cssText = `background: ${type === 'success' ? '#10b981' : '#ef4444'};color:white;padding:12px 24px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);font-weight:500;transform:translateY(100%);opacity:0;transition:all 0.3s ease;display:flex;align-items:center;gap:10px;`;
  toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}"></i> ${message}`;
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.transform = "translateY(0)";
    toast.style.opacity = "1";
  });

  setTimeout(() => {
    toast.style.transform = "translateY(100%)";
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function showSkeletonLoading(containerId, rows = 3) {
  const container = document.getElementById(containerId);
  if (!container) return;
  let html = '';
  for (let i = 0; i < rows; i++) {
    html += `<div style="height:40px;background:linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:4px;margin-bottom:10px;"></div>`;
  }
  container.innerHTML = html;
}

function loadAttendanceData() {
  const storedData = localStorage.getItem("summer_attendance");
  if (storedData) {
    attendanceRecords = JSON.parse(storedData);
  } else {
    attendanceRecords = [...DEFAULT_ATTENDANCE];
    localStorage.setItem("summer_attendance", JSON.stringify(attendanceRecords));
  }
}

function loadGalleryData() {
  const storedPhotos = localStorage.getItem("summer_gallery");
  if (storedPhotos) {
    galleryPhotos = JSON.parse(storedPhotos);
  } else {
    galleryPhotos = [...DEFAULT_PHOTOS];
    localStorage.setItem("summer_gallery", JSON.stringify(galleryPhotos));
  }
}

function loadWeeklyActivitiesData() {
  const stored = localStorage.getItem("summer_weeks");
  if (stored) {
    WEEKLY_ACTIVITIES = JSON.parse(stored);
  }
}

/* ==========================================================================
   SIDEBAR & NAVIGATION LOGIC
   ========================================================================== */

function highlightActiveSidebar() {
  const path = window.location.pathname;
  const filename = path.substring(path.lastIndexOf('/') + 1);

  let activeId = "link-dashboard"; // default

  if (filename.includes("event.html")) {
    activeId = "link-event";
  } else if (filename.includes("attendance.html")) {
    activeId = "link-attendance";
  } else if (filename.includes("sudden_events.html")) {
    activeId = "link-sudden";
  } else if (filename.includes("gallery.html")) {
    activeId = "link-gallery";
  }

  const link = document.getElementById(activeId);
  if (link) {
    document.querySelectorAll(".sidebar-link").forEach(l => l.classList.remove("active"));
    link.classList.add("active");
  }
}

function initMobileMenu() {
  const mobileMenuBtn = document.getElementById("mobileMenuBtn");
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");

  if (mobileMenuBtn && sidebar && overlay) {
    mobileMenuBtn.addEventListener("click", () => {
      sidebar.classList.toggle("open");
      overlay.style.display = sidebar.classList.contains("open") ? "block" : "none";

      const icon = mobileMenuBtn.querySelector("i");
      if (icon) {
        icon.classList.toggle("fa-bars");
        icon.classList.toggle("fa-xmark");
      }
    });

    overlay.addEventListener("click", () => {
      sidebar.classList.remove("open");
      overlay.style.display = "none";
      const icon = mobileMenuBtn.querySelector("i");
      if (icon) {
        icon.classList.add("fa-bars");
        icon.classList.remove("fa-xmark");
      }
    });
  }
}

/* ==========================================================================
   THEME MANAGER (DARK / LIGHT MODE)
   ========================================================================== */

function initTheme() {
  const themeToggle = document.getElementById("themeToggle");
  if (!themeToggle) return;

  const currentTheme = localStorage.getItem("theme");

  if (currentTheme === "dark") {
    document.body.classList.add("dark-theme");
    themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
  } else {
    document.body.classList.remove("dark-theme");
    themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
  }

  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-theme");
    const isDark = document.body.classList.contains("dark-theme");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    themeToggle.innerHTML = isDark ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
  });
}

/* ==========================================================================
   COUNTDOWN TIMER
   ========================================================================== */

function initCountdown() {
  // Target date: August 31, 2026, 18:00:00
  const targetDate = new Date("August 31, 2026 18:00:00").getTime();

  function updateTimer() {
    const now = new Date().getTime();
    const difference = targetDate - now;

    const daysEl = document.getElementById("days");
    const hoursEl = document.getElementById("hours");
    const minutesEl = document.getElementById("minutes");
    const secondsEl = document.getElementById("seconds");

    if (!daysEl) return;

    if (difference < 0) {
      daysEl.innerText = "00";
      hoursEl.innerText = "00";
      minutesEl.innerText = "00";
      secondsEl.innerText = "00";
      const targetEl = document.querySelector(".countdown-target");
      if (targetEl) targetEl.innerText = "Chiến dịch hè 2026 đã hoàn thành tốt đẹp!";
      return;
    }

    const d = Math.floor(difference / (1000 * 60 * 60 * 24));
    const h = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const m = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((difference % (1000 * 60)) / 1000);

    daysEl.innerText = String(d).padStart(2, '0');
    hoursEl.innerText = String(h).padStart(2, '0');
    minutesEl.innerText = String(m).padStart(2, '0');
    secondsEl.innerText = String(s).padStart(2, '0');
  }

  updateTimer();
  setInterval(updateTimer, 1000);
}

/* ==========================================================================
   WEEKLY PROGRAM DETAILS & FILTER
   ========================================================================== */

function initWeeklyActivities() {
  const weeklySlider = document.getElementById("weeklySlider");
  const weeklyFilters = document.getElementById("weeklyFilters");
  const prevBtn = document.getElementById("prevWeekBtn");
  const nextBtn = document.getElementById("nextWeekBtn");
  if (!weeklySlider) return;

  window.renderWeeks = function (filter = "all") {
    weeklySlider.innerHTML = "";

    const filteredWeeks = WEEKLY_ACTIVITIES.filter(w => {
      if (filter === "all") return true;
      return w.tags.includes(filter);
    });

    if (filteredWeeks.length === 0) {
      weeklySlider.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1; width: 100%;">
          <i class="fa-solid fa-calendar-minus"></i>
          <p>Không tìm thấy hoạt động nào phù hợp.</p>
        </div>`;
      return;
    }

    filteredWeeks.forEach((w, index) => {
      const card = document.createElement("div");
      // Mặc định tuần đầu tiên mở rộng
      card.className = "weekly-card-slider glass-card fade-in-up" + (index === 0 ? " expanded" : "");
      card.style.animationDelay = `${((index) % 5) * 100}ms`;

      let bgImg = "image/activity_art.png";
      if (w.tags.includes("thể thao")) bgImg = "image/activity_sports.png";
      else if (w.tags.includes("kỹ năng")) bgImg = "image/activity_skills.png";
      else if (w.tags.includes("tình nguyện")) bgImg = "image/activity_volunteer.png";

      card.style.backgroundImage = `linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0.2)), url('${bgImg}')`;

      const tagHtml = w.tags.map(t => {
        let tagClass = "study";
        if (t === "kỹ năng") tagClass = "skills";
        if (t === "thể thao") tagClass = "sports";
        if (t === "tình nguyện") tagClass = "volunteer";
        if (t === "nghệ thuật") tagClass = "arts";
        return `<span class="weekly-tag ${tagClass}">${t}</span>`;
      }).join("");

      card.innerHTML = `
        <div class="weekly-slider-content">
          <div class="weekly-slider-header">
            <span class="weekly-num">Tuần ${w.week}</span>
            <div class="weekly-tags">${tagHtml}</div>
          </div>
          <h3 class="weekly-card-title">${w.title}</h3>
          
          <div class="weekly-slider-details">
            <p class="weekly-card-desc">${w.desc}</p>
            <div class="weekly-footer">
              <span class="weekly-date"><i class="fa-regular fa-calendar"></i> ${w.date}</span>
              <button class="weekly-link btn btn-sm btn-primary" data-week="${w.week}">Chi tiết</button>
            </div>
          </div>
        </div>
      `;

      card.addEventListener("click", (e) => {
        // Đừng toggle nếu click vào nút chi tiết
        if (e.target.classList.contains("weekly-link")) return;

        document.querySelectorAll(".weekly-card-slider").forEach(c => c.classList.remove("expanded"));
        card.classList.add("expanded");
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      });

      weeklySlider.appendChild(card);
    });

    document.querySelectorAll(".weekly-link").forEach(link => {
      link.addEventListener("click", () => {
        const weekNum = parseInt(link.getAttribute("data-week"));
        openWeekDetailsModal(weekNum);
      });
    });
  };

  // Scroll buttons
  if (prevBtn && nextBtn) {
    prevBtn.addEventListener("click", () => {
      weeklySlider.scrollBy({ left: -350, behavior: 'smooth' });
    });
    nextBtn.addEventListener("click", () => {
      weeklySlider.scrollBy({ left: 350, behavior: 'smooth' });
    });
  }

  // Filter clicks
  if (weeklyFilters) {
    weeklyFilters.addEventListener("click", (e) => {
      const btn = e.target.closest(".filter-btn");
      if (btn) {
        document.querySelectorAll("#weeklyFilters .filter-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const filterValue = btn.getAttribute("data-filter");
        window.renderWeeks(filterValue);
      }
    });
  }

  const weeklyModal = document.getElementById("weeklyModal");
  const closeWeeklyModal = document.getElementById("closeWeeklyModal");

  if (closeWeeklyModal && weeklyModal) {
    closeWeeklyModal.addEventListener("click", () => {
      weeklyModal.classList.remove("open");
    });

    weeklyModal.addEventListener("click", (e) => {
      if (e.target === weeklyModal) {
        weeklyModal.classList.remove("open");
      }
    });
  }

  window.renderWeeks();
}

function openWeekDetailsModal(weekNum) {
  const weekData = WEEKLY_ACTIVITIES.find(w => w.week === weekNum);
  if (!weekData) return;

  const weeklyModal = document.getElementById("weeklyModal");
  const title = document.getElementById("weeklyModalTitle");
  const body = document.getElementById("weeklyModalBody");

  if (!weeklyModal || !title || !body) return;

  title.innerHTML = `<i class="fa-solid fa-calendar-day text-blue"></i> Chi tiết Hoạt động Tuần ${weekData.week}: ${weekData.title}`;

  let scheduleHtml = weekData.schedule.map(s => `
    <div class="modal-schedule-item">
      <div class="modal-schedule-day">${s.day}</div>
      <div class="modal-schedule-activity">${s.activity}</div>
    </div>
  `).join("");

  body.innerHTML = `
    <p style="margin-bottom: 20px; font-weight: 500; color: var(--text-muted);">
      <i class="fa-solid fa-bullhorn"></i> <strong>Chủ điểm chính:</strong> ${weekData.desc}
    </p>
    <div style="background: rgba(0, 102, 204, 0.02); border-radius: var(--radius-sm); padding: 16px; border: var(--glass-border);">
      <h4 style="margin-bottom: 12px; font-weight: 700; color: var(--text-main); font-size: 0.95rem;"><i class="fa-solid fa-list-ol"></i> Lịch sinh hoạt chi tiết:</h4>
      ${scheduleHtml}
    </div>
    <div style="margin-top: 16px; font-size: 0.8rem; color: var(--text-muted); display: flex; gap: 20px;">
      <span><i class="fa-solid fa-clock-rotate-left"></i> Thời gian: ${weekData.date}</span>
      <span><i class="fa-solid fa-tags"></i> Nhãn: ${weekData.tags.join(", ")}</span>
    </div>
    <div style="margin-top:12px;">
      <a class="btn btn-primary btn-sm" href="gallery.html?week=Tuần%20${weekData.week}"><i class="fa-solid fa-images"></i> Mở album tuần này</a>
    </div>
  `;

  weeklyModal.classList.add("open");
}

function initExtraEvents() {
  const listEl = document.getElementById("extraEventList");
  if (!listEl) return;
  const userStr = localStorage.getItem("summer_user");
  const user = userStr ? JSON.parse(userStr) : null;
  const createBox = document.getElementById("extraEventCreateBox");
  const btnToggleCreate = document.getElementById("btnToggleCreateEvent");

  // Show toggle button if admin
  if (btnToggleCreate && user && user.quyen === "Admin") {
    btnToggleCreate.style.display = "inline-flex";
    btnToggleCreate.addEventListener("click", () => {
      if (createBox.style.display === "none") {
        createBox.style.display = "block";
        btnToggleCreate.innerHTML = '<i class="fa-solid fa-times"></i> Đóng';
        createBox.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        createBox.style.display = "none";
        btnToggleCreate.innerHTML = '<i class="fa-solid fa-circle-plus"></i> Tạo hoạt động';
      }
    });
  }

  // Show create box if admin
  if (createBox && user && user.quyen === "Admin") createBox.style.display = "none";

  const form = document.getElementById("extraEventForm");
  const btnCancelCreate = document.getElementById("btnCancelCreate");

  if (btnCancelCreate) {
    btnCancelCreate.addEventListener("click", () => {
      createBox.style.display = "none";
      if (btnToggleCreate) {
        btnToggleCreate.innerHTML = '<i class="fa-solid fa-circle-plus"></i> Tạo hoạt động';
      }
      form.reset();
    });
  }

  if (form && !form.dataset.listenerAttached) {
    form.dataset.listenerAttached = "true";
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const btnSubmit = form.querySelector("button[type='submit']");
      const originalText = btnSubmit.innerHTML;
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang tạo...';

      fetch(CONFIG_API_URL, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          action: "createExtraEvent",
          ten: document.getElementById("evtName").value.trim(),
          moTa: document.getElementById("evtDesc").value.trim(),
          batDau: document.getElementById("evtStart").value,
          ketThuc: document.getElementById("evtEnd").value,
          diaDiem: document.getElementById("evtLocation").value.trim(),
          gioiHan: document.getElementById("evtLimit").value.trim(),
          taoBoi: user ? user.chiDoan : "Admin"
        })
      }).then(r => r.json()).then(res => {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = originalText;
        if (res.success) {
          showToast("Đã tạo hoạt động bổ sung thành công!");
          form.reset();
          createBox.style.display = "none";
          if (btnToggleCreate) {
            btnToggleCreate.innerHTML = '<i class="fa-solid fa-circle-plus"></i> Tạo hoạt động';
          }
          loadExtraEvents();
        } else showToast(res.error || "Không tạo được sự kiện", "error");
      }).catch(() => {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = originalText;
        showToast("Lỗi kết nối khi tạo sự kiện", "error");
      });
    });
  }

  function loadExtraEvents() {
    listEl.innerHTML = `<div class="empty-state" style="padding:30px;"><i class="fa-solid fa-circle-notch fa-spin" style="font-size:1.8rem; margin-bottom:8px;"></i><p>Đang tải danh sách hoạt động...</p></div>`;
    fetch(CONFIG_API_URL + "?action=getExtraEvents")
      .then(r => r.json())
      .then(res => {
        if (!res.success) {
          listEl.innerHTML = `<div class="empty-state"><p>${res.error || "Không tải được danh sách."}</p></div>`;
          return;
        }
        renderExtraEvents(res.data || []);
      })
      .catch(() => {
        listEl.innerHTML = `<div class="empty-state"><p>Không tải được danh sách hoạt động đột xuất.</p></div>`;
      });
  }

  // Helper: Format DateTime for humans
  function formatDateTimeVN(isoStr) {
    if (!isoStr) return "Chưa xác định";
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr; // Fallback to raw string if not parseable
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${hh}:${mm} - Ngày ${day}/${month}/${year}`;
    } catch (e) { return isoStr; }
  }

  function renderExtraEvents(events) {
    if (!events.length) {
      listEl.innerHTML = `<div class="empty-state"><i class="fa-regular fa-calendar-minus" style="font-size:2.5rem; opacity:0.4; margin-bottom:12px;"></i><p>Chưa có hoạt động bổ sung nào được tạo.</p></div>`;
      return;
    }
    listEl.innerHTML = "";
    // Show newest events first
    events.slice().reverse().forEach(evt => {
      const card = document.createElement("div");
      card.className = "feed-item glass-card fade-in-up";

      const regLink = `${window.location.origin}${window.location.pathname.replace(/[^/]+$/, '')}event-register.html?eventId=${encodeURIComponent(evt.ID)}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(regLink)}`;

      card.innerHTML = `
        <div class="feed-details" style="flex:1; display: flex; flex-direction: column;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
            <span class="status-tag" style="background: linear-gradient(135deg, rgba(236, 72, 153, 0.15), rgba(244, 63, 94, 0.15)); color: #e11d48; margin: 0; padding: 6px 14px; border-radius: 20px; font-weight: 700; letter-spacing: 0.5px; box-shadow: 0 2px 10px rgba(225, 29, 72, 0.1); display: inline-flex; align-items: center; gap: 6px;"><i class="fa-solid fa-bolt" style="color: #f43f5e;"></i> SỰ KIỆN ĐỘT XUẤT</span>
            <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600; display: flex; align-items: center; gap: 6px; background: var(--bg-main); padding: 4px 10px; border-radius: 12px; border: 1px solid var(--border-color);"><i class="fa-regular fa-calendar-check text-blue"></i> Mới</span>
          </div>
          <h4 class="feed-item-title" style="font-size: 1.6rem; font-weight: 800; background: linear-gradient(135deg, var(--text-main), var(--primary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 12px; line-height: 1.3;">${evt.Ten}</h4>
          <p class="feed-item-desc" style="font-size: 0.95rem; line-height: 1.6; color: var(--text-muted); margin-bottom: 20px; border-left: 3px solid var(--primary); padding-left: 14px; background: linear-gradient(90deg, rgba(59, 130, 246, 0.05) 0%, transparent 100%); padding-top: 10px; padding-bottom: 10px; border-radius: 0 8px 8px 0;">${evt.MoTa || "Chưa có mô tả chi tiết."}</p>
          
          <div class="event-info" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; background: transparent; padding: 12px 0; border: none; margin-bottom: 20px;">
            <div class="event-info-item" style="margin: 0; display: flex; align-items: center; gap: 14px; background: var(--bg-main); padding: 12px 16px; border-radius: 12px; border: 1px solid var(--border-color);">
              <div style="width: 40px; height: 40px; border-radius: 10px; background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.15)); color: #d97706; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink: 0;"><i class="fa-regular fa-clock"></i></div>
              <div style="min-width: 0; flex: 1;">
                <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); font-weight: 700; margin-bottom: 2px;">Thời gian</div>
                <div style="font-size: 0.95rem; font-weight: 700; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${formatDateTimeVN(evt.BatDau)}</div>
              </div>
            </div>
            <div class="event-info-item" style="margin: 0; display: flex; align-items: center; gap: 14px; background: var(--bg-main); padding: 12px 16px; border-radius: 12px; border: 1px solid var(--border-color);">
              <div style="width: 40px; height: 40px; border-radius: 10px; background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(37, 99, 235, 0.15)); color: #2563eb; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink: 0;"><i class="fa-solid fa-location-dot"></i></div>
              <div style="min-width: 0; flex: 1;">
                <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); font-weight: 700; margin-bottom: 2px;">Địa điểm</div>
                <div style="font-size: 0.95rem; font-weight: 700; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${evt.DiaDiem || "Chưa xác định"}</div>
              </div>
            </div>
            <div class="event-info-item" style="margin: 0; display: flex; align-items: center; gap: 14px; background: var(--bg-main); padding: 12px 16px; border-radius: 12px; border: 1px solid var(--border-color);">
              <div style="width: 40px; height: 40px; border-radius: 10px; background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.15)); color: #059669; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink: 0;"><i class="fa-solid fa-user-group"></i></div>
              <div style="min-width: 0; flex: 1;">
                <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); font-weight: 700; margin-bottom: 2px;">Giới hạn</div>
                <div style="font-size: 0.95rem; font-weight: 700; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${evt.GioiHan ? `${evt.GioiHan} người` : "Không giới hạn"}</div>
              </div>
            </div>
            <div class="event-info-item" style="margin: 0; display: flex; align-items: center; gap: 14px; background: var(--bg-main); padding: 12px 16px; border-radius: 12px; border: 1px solid var(--border-color);">
              <div style="width: 40px; height: 40px; border-radius: 10px; background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(109, 40, 217, 0.15)); color: #6d28d9; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink: 0;"><i class="fa-regular fa-circle-user"></i></div>
              <div style="min-width: 0; flex: 1;">
                <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); font-weight: 700; margin-bottom: 2px;">Người tạo</div>
                <div style="font-size: 0.95rem; font-weight: 700; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${evt.TaoBoi || "Admin"}</div>
              </div>
            </div>
          </div>

          <div class="event-actions" style="margin-top: auto; display: flex; gap: 10px; flex-wrap: wrap; align-items: center; padding-top: 16px; border-top: 1px dashed rgba(0,0,0,0.1);">
            <button class="btn btn-sm btn-reg-event" data-id="${evt.ID}" style="background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; padding: 8px 16px; font-size: 0.9rem; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25); border-radius: 50px; transition: all 0.3s ease; font-weight: 600;"><i class="fa-solid fa-pen-nib" style="margin-right: 6px;"></i> Đăng ký</button>
            <button class="btn btn-sm btn-view-reg" data-id="${evt.ID}" style="background: white; color: var(--text-main); border: 2px solid var(--border-color); padding: 6px 16px; font-size: 0.9rem; border-radius: 50px; font-weight: 600; transition: all 0.3s ease; box-shadow: 0 2px 6px rgba(0,0,0,0.05);"><i class="fa-solid fa-list-ol" style="margin-right: 6px; color: var(--primary);"></i> DS Tham gia</button>
            <button class="btn btn-sm btn-cancel-reg" data-id="${evt.ID}" style="background: transparent; color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); padding: 7px 16px; font-size: 0.9rem; border-radius: 50px; transition: all 0.3s ease; font-weight: 600;"><i class="fa-solid fa-xmark" style="margin-right: 6px;"></i> Hủy</button>
            
            <div style="flex-grow: 1;"></div>
            
            ${user && user.quyen === "Admin" ? `
              <div style="display: flex; gap: 8px; border-left: 2px solid var(--border-color); padding-left: 12px;">
                <button class="btn btn-sm btn-edit-event hover-scale" data-id="${evt.ID}" style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.15)); color: #d97706; border: none; width: 36px; height: 36px; border-radius: 12px; padding: 0; display: flex; align-items: center; justify-content: center; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: none;" title="Sửa sự kiện"><i class="fa-solid fa-pen"></i></button>
                <button class="btn btn-sm btn-delete-event hover-scale" data-id="${evt.ID}" style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.15)); color: #ef4444; border: none; width: 36px; height: 36px; border-radius: 12px; padding: 0; display: flex; align-items: center; justify-content: center; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: none;" title="Xóa sự kiện"><i class="fa-solid fa-trash"></i></button>
              </div>
            ` : ""}
          </div>
          <div class="table-wrapper" id="regTable_${evt.ID}" style="display:none; margin-top:20px; border-radius: var(--radius-md); border: 1px solid var(--primary-glow); overflow: hidden; box-shadow: 0 10px 30px rgba(0, 102, 204, 0.08);"></div>
        </div>
        
        <div class="qr-container-box" style="background: linear-gradient(180deg, rgba(255,255,255,0.8), rgba(248,250,252,0.9)); border: 1px solid rgba(0,0,0,0.05); padding: 24px; border-radius: 20px; min-width: 220px; box-shadow: inset 0 2px 10px rgba(0,0,0,0.02); display: flex; flex-direction: column; justify-content: center; align-items: center;">
          <div style="background: white; padding: 14px; border-radius: 16px; box-shadow: 0 8px 25px rgba(0,0,0,0.08); margin-bottom: 20px; border: 1px solid rgba(0,0,0,0.03);">
            <img src="${qrUrl}" alt="QR ${evt.Ten}" style="width: 140px; height: 140px; border-radius: 8px; display: block;">
          </div>
          <span class="qr-label" style="font-size: 0.9rem; font-weight: 800; color: var(--text-main); margin-bottom: 14px; letter-spacing: 0.5px; text-align: center;"><i class="fa-solid fa-qrcode" style="color: var(--primary); margin-right: 6px;"></i> QUÉT ĐỂ ĐĂNG KÝ</span>
          <a href="${qrUrl}" target="_blank" download="QR_${evt.ID}.png" class="btn btn-sm hover-scale" style="background: linear-gradient(135deg, var(--primary-glow), rgba(0,102,204,0.05)); color: var(--primary); font-weight: 700; border-radius: 12px; width: 100%; justify-content: center; padding: 10px 16px; border: 1px solid rgba(0,102,204,0.15); transition: all 0.3s ease;"><i class="fa-solid fa-download"></i> TẢI MÃ QR</a>
        </div>
      `;
      listEl.appendChild(card);
    });

    listEl.querySelectorAll(".btn-reg-event").forEach(btn => {
      btn.addEventListener("click", () => {
        const eventId = btn.dataset.id;
        if (!user) return showToast("Bạn cần đăng nhập để đăng ký!", "error");

        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

        fetch(CONFIG_API_URL, {
          method: "POST", mode: "cors", headers: { "Content-Type": "text/plain" },
          body: JSON.stringify({
            action: "registerEvent",
            eventId,
            hoTen: user.chiDoan + " - Đại diện",
            sdt: "",
            chiDoan: user.chiDoan,
            ghiChu: "Đăng ký nhanh từ tài khoản",
            nguon: "in-app"
          })
        }).then(r => r.json()).then(res => {
          btn.disabled = false;
          btn.innerHTML = '<i class="fa-solid fa-pen-nib"></i> Đăng ký';
          if (res.success) {
            showToast("Đăng ký đại diện Chi đoàn thành công!");
            loadExtraEvents();
          } else showToast(res.error || "Không đăng ký được", "error");
        }).catch(() => {
          btn.disabled = false;
          btn.innerHTML = '<i class="fa-solid fa-pen-nib"></i> Đăng ký';
          showToast("Lỗi kết nối khi gửi đăng ký", "error");
        });
      });
    });

    listEl.querySelectorAll(".btn-cancel-reg").forEach(btn => {
      btn.addEventListener("click", () => {
        if (!user) return showToast("Bạn cần đăng nhập!", "error");
        if (confirm("Hủy bỏ đăng ký tham gia hoạt động bổ sung này của Chi đoàn bạn?")) {
          btn.disabled = true;
          btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
          fetch(CONFIG_API_URL, {
            method: "POST", mode: "cors", headers: { "Content-Type": "text/plain" },
            body: JSON.stringify({ action: "cancelEventRegistration", eventId: btn.dataset.id, hoTen: user.chiDoan + " - Đại diện", sdt: "" })
          }).then(r => r.json()).then(res => {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Hủy';
            if (res.success) {
              showToast("Đã hủy đăng ký thành công!");
              loadExtraEvents();
            } else {
              showToast(res.error || "Không hủy đăng ký được", "error");
            }
          });
        }
      });
    });

    listEl.querySelectorAll(".btn-view-reg").forEach(btn => {
      btn.addEventListener("click", () => {
        const wrap = document.getElementById(`regTable_${btn.dataset.id}`);
        if (!wrap) return;

        if (wrap.style.display === "block") {
          wrap.style.display = "none";
          return;
        }

        wrap.innerHTML = `<div style="text-align:center; padding:15px; color:var(--text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> Đang tải danh sách...</div>`;
        wrap.style.display = "block";

        fetch(CONFIG_API_URL + `?action=getEventRegistrations&eventId=${encodeURIComponent(btn.dataset.id)}`)
          .then(r => r.json()).then(res => {
            const rows = res.data || [];
            if (!rows.length) {
              wrap.innerHTML = `<div class="empty-state" style="padding:15px;"><p>Chưa có người/chi đoàn nào đăng ký.</p></div>`;
              return;
            }
            let html = `<table class="table" style="min-width:100%; font-size:0.8rem; border-collapse:collapse; margin-bottom:0;">
              <thead>
                <tr>
                  <th style="padding:8px 10px;">Họ tên</th>
                  <th style="padding:8px 10px;">Chi đoàn / Đơn vị</th>
                  <th style="padding:8px 10px;">Nguồn</th>
                  <th style="padding:8px 10px;">Thời gian</th>
                </tr>
              </thead>
              <tbody>`;
            rows.forEach(r => {
              html += `<tr>
                <td style="padding:8px 10px; font-weight:600;">${r.HoTen || ""}</td>
                <td style="padding:8px 10px;">${r.ChiDoan || ""}</td>
                <td style="padding:8px 10px;"><span class="status-pill present" style="padding:2px 6px; font-size:0.65rem;">${r.Nguon || "web"}</span></td>
                <td style="padding:8px 10px; color:var(--text-muted); font-size:0.75rem;">${r.NgayDK || ""}</td>
              </tr>`;
            });
            html += `</tbody></table>`;
            wrap.innerHTML = html;
          })
          .catch(() => {
            wrap.innerHTML = `<div style="text-align:center; padding:15px; color:#ef4444;"><i class="fa-solid fa-triangle-exclamation"></i> Lỗi không tải được dữ liệu.</div>`;
          });
      });
    });

    // Admin Action Bindings
    if (user && user.quyen === "Admin") {
      listEl.querySelectorAll(".btn-delete-event").forEach(btn => {
        btn.addEventListener("click", () => {
          const eventId = btn.dataset.id;
          const matchedEvt = events.find(e => e.ID === eventId);
          if (confirm(`Bạn có chắc chắn muốn xóa hoạt động đột xuất "${matchedEvt ? matchedEvt.Ten : ""}"? Thao tác này sẽ xóa vĩnh viễn sự kiện và toàn bộ danh sách đăng ký tham gia trên Google Sheets!`)) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            fetch(CONFIG_API_URL, {
              method: "POST",
              mode: "cors",
              headers: { "Content-Type": "text/plain" },
              body: JSON.stringify({ action: "deleteExtraEvent", id: eventId, eventId: eventId, ID: eventId })
            })
              .then(r => r.json())
              .then(res => {
                if (res.success) {
                  showToast("Đã xóa hoạt động bổ sung thành công!");
                  loadExtraEvents();
                } else {
                  showToast(res.error || "Không thể xóa sự kiện", "error");
                  btn.disabled = false;
                  btn.innerHTML = '<i class="fa-solid fa-trash-can"></i> Xóa';
                }
              })
              .catch(() => {
                showToast("Lỗi kết nối khi gửi lệnh xóa sự kiện", "error");
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-trash-can"></i> Xóa';
              });
          }
        });
      });

      listEl.querySelectorAll(".btn-edit-event").forEach(btn => {
        btn.addEventListener("click", () => {
          const eventId = btn.dataset.id;
          const matchedEvt = events.find(e => e.ID === eventId);
          if (matchedEvt) openEditEventModal(matchedEvt);
        });
      });
    }
  }

  function openEditEventModal(evt) {
    const modal = document.getElementById("weeklyModal");
    const title = document.getElementById("weeklyModalTitle");
    const body = document.getElementById("weeklyModalBody");
    if (!modal || !title || !body) return;

    title.innerHTML = `<i class="fa-solid fa-pen-to-square" style="color:#f59e0b; margin-right:8px;"></i> Chỉnh sửa hoạt động bổ sung`;

    body.innerHTML = `
      <form id="editEventForm" style="display:grid; grid-template-columns:1fr; gap:16px;">
        <div class="form-group">
          <label class="form-label" style="font-weight: 700; color: var(--text-main); margin-bottom: 8px; display: block;">Tên hoạt động <span class="required" style="color:#ef4444;">*</span></label>
          <input id="editEvtName" class="form-control form-control-lg" style="width: 100%; padding: 12px 16px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); font-size: 1rem; background: var(--input-bg); color: var(--text-main);" value="${evt.Ten || ""}" required>
        </div>
        <div class="form-group">
          <label class="form-label" style="font-weight: 700; color: var(--text-main); margin-bottom: 8px; display: block;">Địa điểm</label>
          <input id="editEvtLocation" class="form-control form-control-lg" style="width: 100%; padding: 12px 16px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); font-size: 1rem; background: var(--input-bg); color: var(--text-main);" value="${evt.DiaDiem || ""}">
        </div>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:16px;">
          <div class="form-group" style="grid-column:1/-1;">
            <label class="form-label" style="font-weight: 700; color: var(--text-main); margin-bottom: 8px; display: block;">Thời gian bắt đầu</label>
            <input id="editEvtStart" type="datetime-local" class="form-control form-control-lg" style="width: 100%; padding: 12px 16px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); font-size: 1rem; background: var(--input-bg); color: var(--text-main);" value="${evt.BatDau || ""}" required>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" style="font-weight: 700; color: var(--text-main); margin-bottom: 8px; display: block;">Giới hạn người tham gia</label>
          <input id="editEvtLimit" type="number" class="form-control form-control-lg" style="width: 100%; padding: 12px 16px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); font-size: 1rem; background: var(--input-bg); color: var(--text-main);" value="${evt.GioiHan || ""}" placeholder="Để trống = không giới hạn">
        </div>
        <div class="form-group">
          <label class="form-label" style="font-weight: 700; color: var(--text-main); margin-bottom: 8px; display: block;">Mô tả hoạt động</label>
          <textarea id="editEvtDesc" class="form-control form-control-lg" rows="4" style="width: 100%; padding: 12px 16px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); font-size: 1rem; background: var(--input-bg); color: var(--text-main); resize:vertical;">${evt.MoTa || ""}</textarea>
        </div>
        <div style="display:flex; gap:12px; margin-top:20px; justify-content:flex-end; border-top: 1px solid var(--border-color); padding-top: 16px;">
          <button type="button" class="btn btn-secondary" id="btnCancelEditEvent" style="padding: 10px 24px; border-radius: 50px; font-weight: 600;">Hủy</button>
          <button type="submit" class="btn btn-primary" style="padding: 10px 24px; border-radius: 50px; font-weight: 600; background: linear-gradient(135deg, #10b981, #059669); border: none; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);"><i class="fa-solid fa-circle-check"></i> Lưu thay đổi</button>
        </div>
      </form>
    `;

    document.getElementById("btnCancelEditEvent").addEventListener("click", () => {
      modal.classList.remove("open");
    });

    const editForm = document.getElementById("editEventForm");
    editForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const btnSave = editForm.querySelector("button[type='submit']");
      btnSave.disabled = true;
      btnSave.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang lưu...';

      fetch(CONFIG_API_URL, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          action: "updateExtraEvent",
          id: evt.ID,
          eventId: evt.ID,
          ten: document.getElementById("editEvtName").value.trim(),
          moTa: document.getElementById("editEvtDesc").value.trim(),
          batDau: document.getElementById("editEvtStart").value.trim(),
          diaDiem: document.getElementById("editEvtLocation").value.trim(),
          ID: evt.ID, // Added to fix potential backend casing issues
          gioiHan: document.getElementById("editEvtLimit").value.trim()
        })
      })
        .then(r => r.json())
        .then(res => {
          if (res.success) {
            showToast("Đã cập nhật hoạt động thành công!");
            modal.classList.remove("open");
            loadExtraEvents();
          } else {
            showToast(res.error || "Không cập nhật được sự kiện", "error");
            btnSave.disabled = false;
            btnSave.innerHTML = '<i class="fa-solid fa-circle-check"></i> Lưu thay đổi';
          }
        })
        .catch(() => {
          showToast("Lỗi kết nối máy chủ khi cập nhật", "error");
          btnSave.disabled = false;
          btnSave.innerHTML = '<i class="fa-solid fa-circle-check"></i> Lưu thay đổi';
        });
    });

    modal.classList.add("open");
  }

  loadExtraEvents();
}

const LIST_CHI_DOAN = [
  "Chi đoàn Thanh niên Tổ dân phố Đồi Dinh",
  "Chi đoàn Thanh niên Tổ dân phố Nguyễn Văn Trỗi.",
  "Chi đoàn Thanh niên Tổ dân phố Phan Bội Châu.",
  "Chi đoàn Thanh niên Tổ dân phố Đoàn Kết.",
  "Chi đoàn Thanh niên Tổ dân phố Hòa Bình.",
  "Chi đoàn Thanh niên Tổ dân phố Nam Kỳ Khởi Nghĩa.",
  "Chi đoàn Thanh niên Tổ dân phố Ánh Sáng.",
  "Chi đoàn Thanh niên Tổ dân phố Đa Hòa.",
  "Chi đoàn Thanh niên Tổ dân phố Mimosa.",
  "Chi đoàn Thanh niên Tổ dân phố Hàm Nghi.",
  "Chi đoàn Thanh niên Tổ dân phố Trưng Vương.",
  "Chi đoàn Thanh niên Tổ dân phố Bùi Thị Xuân 1.",
  "Chi đoàn Thanh niên Tổ dân phố Lý Tự Trọng.",
  "Chi đoàn Thanh niên Tổ dân phố Võ Thị Sáu.",
  "Chi đoàn Thanh niên Tổ dân phố Nguyễn Thị Nghĩa.",
  "Chi đoàn Thanh niên Tổ dân phố Bùi Thị Xuân 2.",
  "Chi đoàn Thanh niên Tổ dân phố Tô Ngọc Vân.",
  "Chi đoàn Thanh niên Tổ dân phố Phan Đình Phùng 1.",
  "Chi đoàn Thanh niên Tổ dân phố Phan Đình Phùng 2.",
  "Chi đoàn Thanh niên Tổ dân phố Nguyễn Công Trứ.",
  "Chi đoàn Thanh niên Tổ dân phố An Dương Vương.",
  "Chi đoàn Thanh niên Tổ dân phố Mỹ Lộc.",
  "Chi đoàn Thanh niên Tổ dân phố Cổ Loa.",
  "Chi đoàn Thanh niên Tổ dân phố Nguyễn Lương Bằng.",
  "Chi đoàn Thanh niên Tổ dân phố Nguyễn Du.",
  "Chi đoàn Thanh niên Tổ dân phố Phạm Ngũ Lão.",
  "Chi đoàn Thanh niên Tổ dân phố Lê Đại Hành.",
  "Chi đoàn Thanh niên Tổ dân phố Trần Phú.",
  "Chi đoàn Thanh niên Tổ dân phố Suối Cát.",
  "Chi đoàn Thanh niên Tổ dân phố Xuân An.",
  "Chi đoàn Thanh niên Tổ dân phố Nhà Chung.",
  "Chi đoàn Thanh niên Tổ dân phố Hà Huy Tập 1.",
  "Chi đoàn Thanh niên Tổ dân phố Tân Bình.",
  "Chi đoàn Thanh niên Tổ dân phố Hà Huy Tập 2.",
  "Chi đoàn Thanh niên Tổ dân phố Lương Thế Vinh.",
  "Chi đoàn Thanh niên Tổ dân phố Ba Tháng Tư.",
  "Chi đoàn Thanh niên Tổ dân phố Đặng Thái Thân.",
  "Chi đoàn Thanh niên Tổ dân phố Nguyễn Tri Phương.",
  "Chi đoàn Thanh niên Tổ dân phố Nguyễn Trung Trực 2",
  "Chi đoàn Thanh niên Tổ dân phố An Bình 1",
  "Chi đoàn Thanh niên Tổ dân phố An Bình 2",
  "Chi đoàn Thanh niên Tổ dân phố Tô Hiến Thành.",
  "Chi đoàn Thanh niên Tổ dân phố Tân Lạc",
  "Chi đoàn Thanh niên Tổ dân phố Prenn.",
  "Chi đoàn Thanh niên Tổ dân phố Trường Chinh.",
  "Chi đoàn Thanh niên Tổ dân phố Thiên Thành.",
  "Chi đoàn Thanh niên Tổ dân phố Mạc Đĩnh Chi 1.",
  "Chi đoàn Thanh niên Tổ dân phố Mạc Đĩnh Chi 2.",
  "Chi đoàn Thanh niên Tổ dân phố Trần Lê.",
  "Chi đoàn Thanh niên Tổ dân phố Thiện Mỹ.",
  "Chi đoàn Thanh niên Tổ dân phố Đồng Thiện",
  "Chi đoàn Thanh niên Ngô Thì Nhậm",
  "Chi đoàn Thanh niên Tổ dân phố Nam Thiên.",
  "Chi đoàn Thanh niên Tổ dân phố Huyền Trân Công Chúa.",
  "Chi đoàn Thanh niên Tổ dân phố Ngô Thì Sỹ",
  "Chi đoàn Thanh niên Tổ dân phố Lê Hồng Phong.",
  "Chi đoàn Thanh niên Tổ dân phố Huỳnh Thúc Kháng.",
  "Chi đoàn Thanh niên Tổ dân phố An Lạc 1.",
  "Chi đoàn Thanh niên Tổ dân phố An Lạc 2.",
  "Chi đoàn Thanh niên Tổ dân phố Nguyễn Trung Trực 1.",
  "Chi đoàn Thanh niên Tổ dân phố An Sơn 1.",
  "Chi đoàn Thanh niên Tổ dân phố An Sơn 2.",
  "Chi đoàn Thanh niên Tổ dân phố Trần Thái Tông.",
  "Chi đoàn Thanh niên Tổ dân phố Yên Thế.",
  "Chi đoàn Thanh niên Tổ dân phố Hoàng Hoa Thám.",
  "Chi đoàn Thanh niên Tổ dân phố Đa Lợi.",
  "Chi đoàn Thanh niên Tổ dân phố Lê Văn Tám.",
  "Chi đoàn Thanh niên Tổ dân phố Khe Sanh.",
  "Chi đoàn Thanh niên Tổ dân phố Sở Lăng.",
  "Chi đoàn Thanh niên Tổ dân phố Trần Quý Cáp",
  "Chi đoàn Thanh niên Tổ dân phố Hồng Lạc",
  "Chi đoàn Thanh niên Tổ dân phố Phạm Hồng Thái",
  "Chi đoàn Thanh niên Tổ dân phố Trần Hưng Đạo",
  "Chi đoàn Thanh niên Tổ dân phố Khởi Nghĩa Bắc Sơn",
  "Chi đoàn Thanh niên Tổ dân phố Nhất Thống",
  "Chi đoàn Thanh niên Tổ dân phố Yersin",
  "Chi đoàn Thanh niên Tổ dân phố Trần Quang Diệu"
];

function initPublicEventRegister() {
  // Đã ngưng dùng: logic chọn chi đoàn + tải thông tin sự kiện + gửi đăng ký
  // giờ được xử lý trực tiếp trong <script> nội tuyến của event-register.html
  // (danh sách 22 cụm mới). Hàm này được giữ lại nhưng return sớm để tránh
  // gắn trùng dropdown/listener lên cùng các phần tử #prChiDoanSearch,
  // #prChiDoan, #chiDoanDropdownList, gây ghi đè lẫn nhau.
  return;

  const form = document.getElementById("publicRegisterForm");
  if (!form) return;

  const qs = new URLSearchParams(window.location.search);
  const eventId = qs.get("eventId") || "";
  const resultEl = document.getElementById("publicResult");
  const resultContainer = document.getElementById("publicResultContainer");
  const titleEl = document.getElementById("eventTitlePublic");

  // Search Select inputs
  const searchInput = document.getElementById("prChiDoanSearch");
  const hiddenInput = document.getElementById("prChiDoan");
  const dropdownList = document.getElementById("chiDoanDropdownList");

  // Load Event details
  fetch(CONFIG_API_URL + "?action=getExtraEvents")
    .then(r => r.json())
    .then(res => {
      const evt = (res.data || []).find(x => x.ID === eventId);
      if (evt && titleEl) {
        titleEl.innerHTML = `<i class="fa-solid fa-bullhorn" style="color: var(--primary); margin-right: 6px;"></i> <strong>${evt.Ten}</strong><br><span style="font-size:0.8rem; opacity:0.8;"><i class="fa-regular fa-clock"></i> ${evt.BatDau || ""} | <i class="fa-solid fa-location-dot"></i> ${evt.DiaDiem || ""}</span>`;
      } else if (titleEl) {
        titleEl.textContent = "Không tìm thấy thông tin sự kiện hoặc sự kiện đã kết thúc.";
        titleEl.style.color = "#ef4444";
      }
    })
    .catch(() => {
      if (titleEl) titleEl.textContent = "Lỗi kết nối máy chủ để tải thông tin sự kiện.";
    });

  // Setup Search Select Dropdown for 77 Chi Đoàn
  if (searchInput && hiddenInput && dropdownList) {
    // Render list
    function populateDropdown(filterText = "") {
      dropdownList.innerHTML = "";
      const filtered = LIST_CHI_DOAN.filter(item =>
        item.toLowerCase().includes(filterText.toLowerCase())
      );

      if (filtered.length === 0) {
        dropdownList.innerHTML = `<div class="search-dropdown-item" style="color: var(--text-muted); cursor: default;"><i class="fa-solid fa-face-frown"></i> Không tìm thấy chi đoàn nào</div>`;
        return;
      }

      filtered.forEach(item => {
        const div = document.createElement("div");
        div.className = "search-dropdown-item";
        div.innerHTML = `<i class="fa-regular fa-circle-dot"></i> ${item}`;
        div.addEventListener("click", () => {
          searchInput.value = item;
          hiddenInput.value = item;
          dropdownList.style.display = "none";
        });
        dropdownList.appendChild(div);
      });
    }

    searchInput.addEventListener("focus", () => {
      populateDropdown(searchInput.value);
      dropdownList.style.display = "block";
    });

    searchInput.addEventListener("input", function () {
      hiddenInput.value = ""; // clear hidden value if typed
      populateDropdown(this.value);
    });

    // Hide dropdown when clicking outside
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".searchable-select-container")) {
        dropdownList.style.display = "none";
        // Check if value matches list exactly, if not clear search input
        if (hiddenInput.value === "") {
          const exactMatch = LIST_CHI_DOAN.find(x => x.toLowerCase() === searchInput.value.trim().toLowerCase());
          if (exactMatch) {
            searchInput.value = exactMatch;
            hiddenInput.value = exactMatch;
          } else {
            searchInput.value = "";
          }
        }
      }
    });
  }

  // Handle registration submission
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    if (!eventId) {
      alert("Thiếu ID sự kiện, không thể đăng ký!");
      return;
    }

    const btnSubmit = form.querySelector("button[type='submit']");
    const originalBtnText = btnSubmit.innerHTML;
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang gửi đăng ký...';

    if (resultContainer) resultContainer.style.display = "none";

    fetch(CONFIG_API_URL, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        action: "registerEvent",
        eventId,
        hoTen: document.getElementById("prName").value.trim(),
        sdt: document.getElementById("prPhone").value.trim(),
        chiDoan: hiddenInput.value || searchInput.value.trim(),
        ghiChu: document.getElementById("prNote").value.trim(),
        nguon: "qr-form"
      })
    })
      .then(r => r.json())
      .then(res => {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = originalBtnText;

        if (resultContainer && resultEl) {
          resultContainer.style.display = "block";
          if (res.success) {
            resultContainer.style.background = "rgba(16, 185, 129, 0.15)";
            resultContainer.style.border = "1px solid rgba(16, 185, 129, 0.3)";
            resultEl.style.color = "#34d399";
            resultEl.innerHTML = '<i class="fa-regular fa-circle-check"></i> Đăng ký thành công! Chào mừng bạn tham gia hoạt động.';
            form.reset();
            if (searchInput) searchInput.value = "";
            if (hiddenInput) hiddenInput.value = "";
          } else {
            resultContainer.style.background = "rgba(239, 68, 68, 0.15)";
            resultContainer.style.border = "1px solid rgba(239, 68, 68, 0.3)";
            resultEl.style.color = "#f87171";
            resultEl.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> ' + (res.error || "Lỗi đăng ký, vui lòng thử lại sau.");
          }
        }
      })
      .catch(err => {
        console.error(err);
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = originalBtnText;
        if (resultContainer && resultEl) {
          resultContainer.style.display = "block";
          resultContainer.style.background = "rgba(239, 68, 68, 0.15)";
          resultContainer.style.border = "1px solid rgba(239, 68, 68, 0.3)";
          resultEl.style.color = "#f87171";
          resultEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Lỗi kết nối mạng, vui lòng thử lại.';
        }
      });
  });
}

/* ==========================================================================
   ATTENDANCE SYSTEM & STORAGE INTERFACE
   ========================================================================== */

function initAttendanceTracker() {
  const form = document.getElementById("attendanceForm");
  const attWeekSelect = document.getElementById("attWeek");
  const filterWeekSelect = document.getElementById("filterAttWeek");
  const filterChiDoanSelect = document.getElementById("filterAttChiDoan");
  const searchInput = document.getElementById("searchAttName");
  const btnExportCSV = document.getElementById("btnExportCSV");
  const btnClearHistory = document.getElementById("btnClearHistory");

  if (!document.getElementById("attendanceTableBody")) return;

  const userStr = localStorage.getItem("summer_user");
  const currentUser = userStr ? JSON.parse(userStr) : null;

  if (filterChiDoanSelect) {
    if (currentUser && currentUser.quyen === "Admin") {
      filterChiDoanSelect.style.display = "";
      populateChiDoanFilter(filterChiDoanSelect);
    } else {
      filterChiDoanSelect.style.display = "none";
    }
  }

  // Populate week selectors (chỉ populate một lần, kiểm tra chính xác bằng dataset flag)
  if (attWeekSelect && !attWeekSelect.dataset.populated) {
    attWeekSelect.dataset.populated = "true";
    WEEKLY_ACTIVITIES.forEach(w => {
      const opt = document.createElement("option");
      opt.value = `Tuần ${w.week}`;
      opt.textContent = `Tuần ${w.week} - ${w.title}`;
      attWeekSelect.appendChild(opt);
    });
  }

  if (filterWeekSelect && !filterWeekSelect.dataset.populated) {
    filterWeekSelect.dataset.populated = "true";
    WEEKLY_ACTIVITIES.forEach(w => {
      const opt = document.createElement("option");
      opt.value = `Tuần ${w.week}`;
      opt.textContent = `Tuần ${w.week}`;
      filterWeekSelect.appendChild(opt);
    });
  }

  // Default to today
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById("attDate");
  if (dateInput) dateInput.value = today;

  // Handle Form Submission (Sử dụng flag tránh trùng lặp sự kiện)
  if (form && !form.dataset.listenerAttached) {
    form.dataset.listenerAttached = "true";
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const date = document.getElementById("attDate").value;
      const week = attWeekSelect.value;
      const name = document.getElementById("attName").value.trim();
      const status = document.querySelector('input[name="attStatus"]:checked').value;
      const notes = document.getElementById("attNotes").value.trim();

      if (!date || !week || !name) return;

      const chiDoanName = currentUser ? currentUser.chiDoan : "Chi đoàn Thanh niên Tổ dân phố Nguyễn Trung Trực 2";

      // Kiểm tra trùng lặp (cùng người, cùng ngày, cùng chi đoàn)
      const isDuplicateLocal = attendanceRecords.some(r =>
        r.name.toLowerCase() === name.toLowerCase() &&
        r.date === date &&
        r.chiDoan === chiDoanName
      );

      if (isDuplicateLocal) {
        showToast(`Đoàn viên "${name}" đã được điểm danh trong ngày ${date.split('-').reverse().join('/')}.`, "error");
        return;
      }

      // Tạo đối tượng điểm danh mới
      const newRecord = {
        id: "ATT_" + String(new Date().getTime()).substring(5),
        date,
        week,
        name,
        status,
        notes,
        chiDoan: chiDoanName
      };

      const btnSubmit = document.getElementById("btnSubmitAttendance");
      const originalText = btnSubmit.innerHTML;
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang lưu...';

      const saveLocal = () => {
        attendanceRecords.push(newRecord);
        localStorage.setItem("summer_attendance", JSON.stringify(attendanceRecords));
        document.getElementById("attName").value = "";
        document.getElementById("attNotes").value = "";

        renderAttendanceTable();
        updateStatsMetrics();

        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<i class="fa-solid fa-circle-check"></i> Đã lưu!';
        btnSubmit.style.background = 'linear-gradient(135deg, var(--accent-green), #10b981)';

        setTimeout(() => {
          btnSubmit.innerHTML = originalText;
          btnSubmit.style.background = '';
        }, 2000);
      };

      // Nếu không có API kết nối
      if (!CONFIG_API_URL) {
        saveLocal();
        return;
      }

      // Kiểm tra xem học sinh có trong danh mục của chi đoàn chưa
      const memberExists = dynamicStudentSuggestions.some(mName => mName.toLowerCase() === name.toLowerCase());

      const memberPromise = memberExists
        ? Promise.resolve({ success: true })
        : fetch(CONFIG_API_URL, {
          method: "POST",
          mode: "cors",
          headers: { "Content-Type": "text/plain" },
          body: JSON.stringify({
            action: "addMember",
            hoTen: name,
            chiDoan: chiDoanName
          })
        }).then(r => r.json());

      memberPromise
        .then(memberResult => {
          if (memberResult.success && !memberExists) {
            dynamicStudentSuggestions.push(name);
          }
          return fetch(CONFIG_API_URL, {
            method: "POST",
            mode: "cors",
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify({
              action: "saveAttendance",
              ngay: date,
              tuan: week,
              hoTen: name,
              chiDoan: chiDoanName,
              trangThai: status,
              ghiChu: notes
            })
          });
        })
        .then(res => res.json())
        .then(result => {
          if (result.success) {
            newRecord.id = result.data.ID;
            saveLocal();
            showToast("Đã lưu điểm danh thành công!");
          } else {
            showToast(result.error, "error");
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = originalText;
          }
        })
        .catch(err => {
          console.error("Lỗi đồng bộ điểm danh:", err);
          newRecord.id = "ATT_OFF_" + String(new Date().getTime()).substring(5);
          saveLocal();
          showToast("Mất kết nối. Đã lưu Offline!", "error");
        });
    });
  }

  // Autocomplete suggestions
  const nameInput = document.getElementById("attName");
  if (nameInput && !nameInput.dataset.listenerAttached) {
    nameInput.dataset.listenerAttached = "true";
    nameInput.addEventListener("input", function () {
      const val = this.value;
      closeAutocompleteList();
      if (!val) return;

      const container = document.createElement("DIV");
      container.setAttribute("id", this.id + "autocomplete-list");
      container.setAttribute("class", "autocomplete-items");
      this.parentNode.appendChild(container);

      dynamicStudentSuggestions.forEach(suggested => {
        if (suggested.toUpperCase().includes(val.toUpperCase())) {
          const div = document.createElement("DIV");
          const idx = suggested.toUpperCase().indexOf(val.toUpperCase());
          div.innerHTML = suggested.substr(0, idx) +
            "<strong>" + suggested.substr(idx, val.length) + "</strong>" +
            suggested.substr(idx + val.length);

          div.innerHTML += "<input type='hidden' value='" + suggested + "'>";
          div.addEventListener("click", function () {
            nameInput.value = this.getElementsByTagName("input")[0].value;
            closeAutocompleteList();
          });
          container.appendChild(div);
        }
      });
    });
  }

  function closeAutocompleteList(elm) {
    const items = document.getElementsByClassName("autocomplete-items");
    for (let i = 0; i < items.length; i++) {
      if (elm != items[i] && elm != nameInput) {
        items[i].parentNode.removeChild(items[i]);
      }
    }
  }

  document.addEventListener("click", (e) => {
    closeAutocompleteList(e.target);
  });

  // Table filtering hooks
  let searchTimeout;
  if (searchInput && !searchInput.dataset.listenerAttached) {
    searchInput.dataset.listenerAttached = "true";
    searchInput.addEventListener("input", () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(renderAttendanceTable, 300);
    });
  }
  if (filterWeekSelect && !filterWeekSelect.dataset.listenerAttached) {
    filterWeekSelect.dataset.listenerAttached = "true";
    filterWeekSelect.addEventListener("change", renderAttendanceTable);
  }
  if (filterChiDoanSelect && !filterChiDoanSelect.dataset.listenerAttached) {
    filterChiDoanSelect.dataset.listenerAttached = "true";
    filterChiDoanSelect.addEventListener("change", renderAttendanceTable);
  }

  // Clear Database
  if (btnClearHistory && !btnClearHistory.dataset.listenerAttached) {
    btnClearHistory.dataset.listenerAttached = "true";
    btnClearHistory.addEventListener("click", () => {
      if (confirm("Xóa toàn bộ lịch sử điểm danh của Chi đoàn bạn? Thao tác này không thể hoàn tác!")) {
        const chiDoanToDelete = currentUser ? currentUser.chiDoan : null;

        const clearLocal = () => {
          // FIX: Logic đúng — chỉ XÓA bản ghi của chi đoàn hiện tại, GIỮ LẠI bản ghi chi đoàn khác.
          // Admin có thể chỉ định chi đoàn cụ thể để xóa (không bao giờ xóa toàn hệ thống trừ khi cố ý).
          if (chiDoanToDelete) {
            attendanceRecords = attendanceRecords.filter(r => r.chiDoan !== chiDoanToDelete);
          }
          localStorage.setItem("summer_attendance", JSON.stringify(attendanceRecords));
          renderAttendanceTable();
          updateStatsMetrics();
        };

        if (!CONFIG_API_URL) {
          clearLocal();
          return;
        }

        fetch(CONFIG_API_URL, {
          method: "POST",
          mode: "cors",
          headers: { "Content-Type": "text/plain" },
          body: JSON.stringify({
            action: "clearHistory",
            chiDoan: chiDoanToDelete || ""
          })
        })
          .then(res => res.json())
          .then(result => {
            if (result.success) {
              clearLocal();
              showToast("Đã xóa lịch sử điểm danh.");
            } else {
              showToast("Lỗi máy chủ: " + result.error, "error");
            }
          })
          .catch(err => {
            console.error("Lỗi kết nối khi xóa:", err);
            clearLocal();
            showToast("Đã xóa cục bộ (Offline).", "error");
          });
      }
    });
  }

  // Export to Excel/CSV
  if (btnExportCSV && !btnExportCSV.dataset.listenerAttached) {
    btnExportCSV.dataset.listenerAttached = "true";
    btnExportCSV.addEventListener("click", () => {
      const recordsToExport = attendanceRecords.filter(r => {
        if (currentUser && currentUser.quyen !== "Admin") {
          return r.chiDoan === currentUser.chiDoan;
        }
        return true;
      });

      if (recordsToExport.length === 0) {
        alert("Không có dữ liệu!");
        return;
      }

      let csv = "\uFEFF"; // UTF-8 BOM for Excel
      csv += "Ngày,Tuần,Họ và Tên,Trạng thái,Chi đoàn,Ghi chú\n";

      recordsToExport.forEach(r => {
        const formatted = r.date.split("-").reverse().join("/");
        csv += `"${formatted}","${r.week}","${r.name}","${r.status}","${r.chiDoan || ''}","${r.notes || ''}"\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Diem_Danh_${currentUser ? currentUser.chiDoan.replace(/\s+/g, '_') : 'He'}.csv`;
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }

  renderAttendanceTable();
}

function populateChiDoanFilter(selectEl) {
  if (!selectEl) return;
  const currentValue = selectEl.value || "all";
  selectEl.innerHTML = `<option value="all">Tất cả chi đoàn</option>`;
  const chiDoanList = Array.from(new Set(attendanceRecords.map(r => (r.chiDoan || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, "vi"));
  chiDoanList.forEach(chiDoan => {
    const opt = document.createElement("option");
    opt.value = chiDoan;
    opt.textContent = chiDoan;
    selectEl.appendChild(opt);
  });
  if ([...selectEl.options].some(o => o.value === currentValue)) {
    selectEl.value = currentValue;
  }
}

function renderAttendanceTable() {
  const tableBody = document.getElementById("attendanceTableBody");
  if (!tableBody) return;

  const searchInput = document.getElementById("searchAttName");
  const filterWeekSelect = document.getElementById("filterAttWeek");
  const filterChiDoanSelect = document.getElementById("filterAttChiDoan");
  const emptyState = document.getElementById("attendanceEmptyState");

  const userStr = localStorage.getItem("summer_user");
  const currentUser = userStr ? JSON.parse(userStr) : null;

  tableBody.innerHTML = "";

  const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : "";
  const filterWeek = filterWeekSelect ? filterWeekSelect.value : "all";
  const filterChiDoan = filterChiDoanSelect ? filterChiDoanSelect.value : "all";

  if (currentUser && currentUser.quyen === "Admin") {
    populateChiDoanFilter(filterChiDoanSelect);
  }

  const filtered = attendanceRecords.filter(r => {
    // Bảo mật lọc theo Chi đoàn: Người dùng chỉ xem chi đoàn mình, Admin xem tất cả
    if (currentUser && currentUser.quyen !== "Admin" && r.chiDoan !== currentUser.chiDoan) {
      return false;
    }
    const matchSearch = r.name.toLowerCase().includes(searchTerm);
    const matchWeek = filterWeek === "all" || r.week === filterWeek;
    const matchChiDoan = !currentUser || currentUser.quyen !== "Admin" || filterChiDoan === "all" || r.chiDoan === filterChiDoan;
    return matchSearch && matchWeek && matchChiDoan;
  });

  filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (filtered.length === 0) {
    if (emptyState) emptyState.style.display = "flex";
    return;
  }

  if (emptyState) emptyState.style.display = "none";

  filtered.forEach((r) => {
    let statusClass = "present";
    if (r.status === "Vắng có phép") statusClass = "excused";
    if (r.status === "Vắng không phép") statusClass = "unexcused";

    const tr = document.createElement("tr");
    const formattedDate = r.date.split("-").reverse().join("/");

    tr.innerHTML = `
      <td><strong>${formattedDate}</strong></td>
      <td><span class="weekly-tag study" style="font-size: 0.75rem; text-transform:none;">${r.week}</span></td>
      <td><small>${r.chiDoan || "-"}</small></td>
      <td><strong>${r.name}</strong></td>
      <td><span class="status-pill ${statusClass}">${r.status}</span></td>
      <td><small class="text-muted">${r.notes || "—"}</small></td>
      <td>
        <button class="btn-delete-row" title="Xóa dòng này" aria-label="Xóa dòng này">
          <i class="fa-regular fa-trash-can"></i>
        </button>
      </td>
    `;

    tr.querySelector(".btn-delete-row").addEventListener("click", () => {
      deleteAttendanceRecord(r);
    });

    tableBody.appendChild(tr);
  });

  updateStatsMetrics();
}

function deleteAttendanceRecord(record) {
  const userStr = localStorage.getItem("summer_user");
  const currentUser = userStr ? JSON.parse(userStr) : null;

  if (confirm(`Bạn muốn xóa thông tin điểm danh của em "${record.name}"?`)) {
    const performDeleteLocal = () => {
      attendanceRecords = attendanceRecords.filter(r => r !== record);
      localStorage.setItem("summer_attendance", JSON.stringify(attendanceRecords));
      renderAttendanceTable();
      updateStatsMetrics();
    };

    if (!CONFIG_API_URL || !record.id || record.id.startsWith("ATT_OFF_")) {
      performDeleteLocal();
      return;
    }

    fetch(CONFIG_API_URL, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        action: "deleteAttendance",
        id: record.id,
        chiDoan: currentUser ? currentUser.chiDoan : ""
      })
    })
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          performDeleteLocal();
        } else {
          alert("Lỗi xóa từ server: " + result.error);
        }
      })
      .catch(err => {
        console.error("Lỗi kết nối khi xóa:", err);
        performDeleteLocal();
        alert("Đã xóa tạm thời trên trình duyệt (Offline).");
      });
  }
}

function updateStatsMetrics() {
  const countEl = document.getElementById("valStatMembers");
  const rateEl = document.getElementById("valStatAttendance");

  const statPresent = document.getElementById("statPresent");
  const statExcused = document.getElementById("statExcused");
  const statUnexcused = document.getElementById("statUnexcused");

  const userStr = localStorage.getItem("summer_user");
  const currentUser = userStr ? JSON.parse(userStr) : null;

  // Lọc thống kê theo Chi đoàn
  const myRecords = attendanceRecords.filter(r => {
    if (currentUser && currentUser.quyen !== "Admin") {
      return r.chiDoan === currentUser.chiDoan;
    }
    return true;
  });

  // Nếu có Dashboard stats
  if (countEl || rateEl) {
    const unique = new Set(myRecords.map(r => r.name));
    if (countEl) countEl.innerText = `${unique.size} em`;
    if (rateEl) {
      if (myRecords.length === 0) {
        rateEl.innerText = "0%";
      } else {
        const presents = myRecords.filter(r => r.status === "Có mặt").length;
        const pct = (presents / myRecords.length) * 100;
        rateEl.innerText = `${pct.toFixed(1)}%`;
      }
    }

    // Cập nhật biểu đồ nếu đang ở Dashboard
    if (typeof updateDashboardCharts === "function") {
      updateDashboardCharts(myRecords);
    }
  }

  // Nếu có Attendance Detail Stats (lọc theo tuần đang hiển thị trên bảng)
  if (statPresent && statExcused && statUnexcused) {
    const filterWeekSelect = document.getElementById("filterAttWeek");
    const filterWeek = filterWeekSelect ? filterWeekSelect.value : "all";

    const currentViewRecords = myRecords.filter(r => {
      return filterWeek === "all" || r.week === filterWeek;
    });

    let present = 0, excused = 0, unexcused = 0;
    currentViewRecords.forEach(r => {
      if (r.status === "Có mặt") present++;
      else if (r.status === "Vắng có phép") excused++;
      else if (r.status === "Vắng không phép") unexcused++;
    });

    statPresent.innerText = present;
    statExcused.innerText = excused;
    statUnexcused.innerText = unexcused;
  }

  renderHonorStats(currentUser, myRecords);
}

function renderHonorStats(currentUser, myRecords) {
  const topAttendanceName = document.getElementById("topAttendanceName");
  const topAttendanceMeta = document.getElementById("topAttendanceMeta");
  const topRateName = document.getElementById("topRateName");
  const topRateMeta = document.getElementById("topRateMeta");
  const adminHonorWrapper = document.getElementById("adminHonorWrapper");
  const adminHonorBody = document.getElementById("adminHonorBody");
  if (!topAttendanceName || !topRateName) return;

  const personMap = new Map();
  myRecords.forEach(r => {
    const key = `${r.name}||${r.chiDoan || ""}`;
    const val = personMap.get(key) || { name: r.name, chiDoan: r.chiDoan || "", total: 0, present: 0 };
    val.total += 1;
    if (r.status === "Có mặt") val.present += 1;
    personMap.set(key, val);
  });

  const ranking = [...personMap.values()].sort((a, b) => (b.total - a.total) || (b.present - a.present));
  const byRate = [...personMap.values()].filter(p => p.total > 0).sort((a, b) => ((b.present / b.total) - (a.present / a.total)) || (b.total - a.total));
  const topByTotal = ranking[0];
  const topByRate = byRate[0];

  topAttendanceName.textContent = topByTotal ? topByTotal.name : "Chưa có dữ liệu";
  topAttendanceMeta.textContent = topByTotal ? `${topByTotal.total} buổi tham gia • ${topByTotal.chiDoan || "N/A"}` : "-";

  if (topByRate) {
    const rate = ((topByRate.present / topByRate.total) * 100).toFixed(1);
    topRateName.textContent = topByRate.name;
    topRateMeta.textContent = `${rate}% có mặt (${topByRate.present}/${topByRate.total})`;
  } else {
    topRateName.textContent = "Chưa có dữ liệu";
    topRateMeta.textContent = "-";
  }

  if (!adminHonorWrapper || !adminHonorBody || !currentUser || currentUser.quyen !== "Admin") {
    if (adminHonorWrapper) adminHonorWrapper.style.display = "none";
    return;
  }

  const chiDoanMap = new Map();
  attendanceRecords.forEach(r => {
    const key = r.chiDoan || "Chưa phân loại";
    const row = chiDoanMap.get(key) || { chiDoan: key, members: new Set(), total: 0, present: 0, person: new Map() };
    row.members.add(r.name);
    row.total += 1;
    if (r.status === "Có mặt") row.present += 1;
    const p = row.person.get(r.name) || { total: 0, present: 0 };
    p.total += 1;
    if (r.status === "Có mặt") p.present += 1;
    row.person.set(r.name, p);
    chiDoanMap.set(key, row);
  });

  adminHonorBody.innerHTML = "";
  [...chiDoanMap.values()].sort((a, b) => b.members.size - a.members.size).forEach(c => {
    let bestName = "Chưa có";
    let bestRate = -1;
    c.person.forEach((v, name) => {
      const rate = v.total ? (v.present / v.total) : 0;
      if (rate > bestRate) {
        bestRate = rate;
        bestName = name;
      }
    });
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${c.chiDoan}</strong></td>
      <td>${c.members.size}</td>
      <td>${bestName}</td>
      <td>${c.total ? ((c.present / c.total) * 100).toFixed(1) : "0.0"}%</td>
    `;
    adminHonorBody.appendChild(tr);
  });
  adminHonorWrapper.style.display = adminHonorBody.children.length ? "block" : "none";
}

let attendanceLineChartInstance = null;
let statusDoughnutChartInstance = null;

function updateDashboardCharts(myRecords) {
  if (typeof Chart === 'undefined') return;

  const ctxLine = document.getElementById('attendanceLineChart');
  const ctxDoughnut = document.getElementById('statusDoughnutChart');

  if (!ctxLine || !ctxDoughnut) return;

  // Ẩn skeleton khi load xong
  const skeletonLine = document.getElementById('chartSkeletonLine');
  const skeletonDoughnut = document.getElementById('chartSkeletonDoughnut');
  if (skeletonLine) skeletonLine.style.display = 'none';
  if (skeletonDoughnut) skeletonDoughnut.style.display = 'none';

  // Process data for Line Chart (Điểm danh theo tuần)
  const weeks = WEEKLY_ACTIVITIES.map(w => `Tuần ${w.week}`);
  const presentCounts = weeks.map(w => {
    return myRecords.filter(r => r.week === w && r.status === "Có mặt").length;
  });

  if (attendanceLineChartInstance) {
    attendanceLineChartInstance.data.datasets[0].data = presentCounts;
    attendanceLineChartInstance.update();
  } else {
    attendanceLineChartInstance = new Chart(ctxLine, {
      type: 'line',
      data: {
        labels: weeks.map(w => w.replace('Tuần ', 'T')),
        datasets: [{
          label: 'Số lượng có mặt',
          data: presentCounts,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          borderWidth: 3,
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: '#3b82f6',
          pointBorderWidth: 2,
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: { usePointStyle: true }
          }
        },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  // Process data for Doughnut Chart (Trạng thái)
  let present = 0, excused = 0, unexcused = 0;
  myRecords.forEach(r => {
    if (r.status === "Có mặt") present++;
    else if (r.status === "Vắng có phép") excused++;
    else if (r.status === "Vắng không phép") unexcused++;
  });

  const doughnutData = [present, excused, unexcused];

  if (statusDoughnutChartInstance) {
    statusDoughnutChartInstance.data.datasets[0].data = doughnutData;
    statusDoughnutChartInstance.update();
  } else {
    statusDoughnutChartInstance = new Chart(ctxDoughnut, {
      type: 'doughnut',
      data: {
        labels: ['Có mặt', 'Vắng phép', 'Vắng K/P'],
        datasets: [{
          data: doughnutData,
          backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
          borderWidth: 0,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: { position: 'bottom', labels: { padding: 20, font: { family: "'Outfit', sans-serif" } } }
        }
      }
    });
  }
}

function initBulkWeeklyAttendance() {
  const weekSelect = document.getElementById("bulkWeekSelect");
  const body = document.getElementById("bulkAttendanceBody");
  const tabsBar = document.getElementById("excelTabsBar");

  if (!body) return;
  const user = JSON.parse(localStorage.getItem("summer_user") || "{}");

  // Set default week to Tuần 1, or read from URL parameters (e.g. ?week=Tuần 2 hoặc ?week=2)
  const urlParams = new URLSearchParams(window.location.search);
  let activeWeek = "Tuần 1";
  const weekParam = urlParams.get("week");
  if (weekParam) {
    if (weekParam.startsWith("Tuần ")) {
      activeWeek = weekParam;
    } else if (!isNaN(weekParam)) {
      activeWeek = "Tuần " + weekParam;
    }
  }

  // Populate dynamic Excel-like sheet tabs
  if (tabsBar) {
    tabsBar.innerHTML = "";
    WEEKLY_ACTIVITIES.forEach(w => {
      const tab = document.createElement("div");
      tab.className = "excel-tab" + (`Tuần ${w.week}` === activeWeek ? " active" : "");
      tab.innerHTML = `<i class="fa-solid fa-file-excel excel-tab-icon"></i> Tuần ${w.week}`;
      tab.dataset.week = `Tuần ${w.week}`;

      tab.addEventListener("click", () => {
        document.querySelectorAll(".excel-tab").forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        activeWeek = tab.dataset.week;
        if (weekSelect) weekSelect.value = activeWeek;
        loadWeek(activeWeek);
      });
      tabsBar.appendChild(tab);
    });
  }

  // If there's a compatibility select, populate it and sync
  if (weekSelect) {
    weekSelect.innerHTML = "";
    WEEKLY_ACTIVITIES.forEach(w => {
      const opt = document.createElement("option");
      opt.value = `Tuần ${w.week}`;
      opt.textContent = `Tuần ${w.week}`;
      if (`Tuần ${w.week}` === activeWeek) opt.selected = true;
      weekSelect.appendChild(opt);
    });
    weekSelect.addEventListener("change", () => {
      activeWeek = weekSelect.value;
      document.querySelectorAll(".excel-tab").forEach(t => {
        if (t.dataset.week === activeWeek) t.classList.add("active");
        else t.classList.remove("active");
      });
      loadWeek(activeWeek);
    });
  }

  function rowTemplate(r = {}) {
    const tr = document.createElement("tr");
    tr.className = "excel-row";

    // Status color pill class helper
    const getStatusClass = (status) => {
      if (status === "Có mặt") return "present";
      if (status === "Vắng có phép") return "excused";
      return "unexcused";
    };

    tr.innerHTML = `
      <td contenteditable="true" class="excel-cell cell-name" data-placeholder="Nhập họ tên...">${r.HoTen || ""}</td>
      <td style="padding: 4px 8px;">
        <select class="excel-select excel-select-gender">
          <option value="" disabled ${!r.GioiTinh ? "selected" : ""}>Chọn...</option>
          <option value="Nam" ${r.GioiTinh === "Nam" ? "selected" : ""}>Nam</option>
          <option value="Nữ" ${r.GioiTinh === "Nữ" ? "selected" : ""}>Nữ</option>
        </select>
      </td>
      <td contenteditable="true" class="excel-cell cell-year" data-placeholder="200x">${r.NamSinh || ""}</td>
      <td contenteditable="true" class="excel-cell cell-org" data-placeholder="Nhập trường/nơi học...">${r.DonVi || ""}</td>
      <td style="padding: 4px 8px;">
        <select class="excel-select excel-select-status status-pill ${getStatusClass(r.TrangThai || "Có mặt")}">
          <option ${r.TrangThai === "Có mặt" ? "selected" : ""}>Có mặt</option>
          <option ${r.TrangThai === "Vắng có phép" ? "selected" : ""}>Vắng có phép</option>
          <option ${r.TrangThai === "Vắng không phép" ? "selected" : ""}>Vắng không phép</option>
        </select>
      </td>
      <td contenteditable="true" class="excel-cell cell-notes" data-placeholder="Không có ghi chú...">${r.GhiChu || ""}</td>
      <td style="text-align: center; padding: 4px 8px;">
        <button class="btn-delete-row" title="Xóa hàng này"><i class="fa-solid fa-trash-can"></i></button>
      </td>
    `;

    // Dynamic color shifting for status select
    const statusSelect = tr.querySelector(".excel-select-status");
    statusSelect.addEventListener("change", function () {
      this.className = "excel-select excel-select-status status-pill " + getStatusClass(this.value);
    });

    tr.querySelector(".btn-delete-row").addEventListener("click", () => {
      if (confirm(`Bạn muốn xóa dòng của đoàn viên "${tr.querySelector('.cell-name').textContent.trim() || 'chưa đặt tên'}" khỏi danh sách?`)) {
        tr.remove();
        if (body.querySelectorAll("tr").length === 0) {
          body.appendChild(rowTemplate({}));
        }
      }
    });

    return tr;
  }

  function loadWeek(weekVal) {
    body.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 30px; color: var(--text-muted);"><i class="fa-solid fa-spinner fa-spin" style="font-size: 1.5rem; margin-bottom: 8px; display:block;"></i> Đang tải dữ liệu điểm danh ${weekVal}...</td></tr>`;

    fetch(CONFIG_API_URL + `?action=getWeeklyRoster&week=${encodeURIComponent(weekVal)}`)
      .then(r => r.json())
      .then(res => {
        body.innerHTML = "";
        const rows = (res.data || []).filter(x => user.quyen === "Admin" || x.ChiDoan === user.chiDoan);
        rows.forEach(r => body.appendChild(rowTemplate(r)));
        if (!rows.length) body.appendChild(rowTemplate({}));
      })
      .catch(err => {
        console.error("Lỗi khi tải bảng tuần:", err);
        body.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 20px; color: #ef4444;"><i class="fa-solid fa-triangle-exclamation"></i> Lỗi kết nối máy chủ. Vui lòng kiểm tra lại.</td></tr>`;
      });
  }

  // Add bulk row
  document.getElementById("btnAddBulkRow")?.addEventListener("click", () => {
    const tr = rowTemplate({});
    body.appendChild(tr);
    tr.querySelector('.cell-name').focus();
  });

  // Sort Names alphabetically A-Z (using Vietnamese locale)
  document.getElementById("btnSortBulkName")?.addEventListener("click", () => {
    const trs = [...body.querySelectorAll("tr.excel-row")];
    const dataList = trs.map(tr => {
      const tds = tr.querySelectorAll("td");
      return {
        hoTen: (tr.querySelector(".cell-name")?.textContent || "").trim(),
        gioiTinh: tr.querySelector(".excel-select-gender")?.value || "",
        namSinh: (tr.querySelector(".cell-year")?.textContent || "").trim(),
        donVi: (tr.querySelector(".cell-org")?.textContent || "").trim(),
        trangThai: tr.querySelector(".excel-select-status")?.value || "Có mặt",
        ghiChu: (tr.querySelector(".cell-notes")?.textContent || "").trim()
      };
    }).filter(x => x.hoTen); // only keep rows that have names

    if (!dataList.length) return showToast("Không có dữ liệu hợp lệ để sắp xếp", "error");

    // Sort using localeCompare for Vietnamese characters support
    dataList.sort((a, b) => a.hoTen.localeCompare(b.hoTen, 'vi', { sensitivity: 'base' }));

    body.innerHTML = "";
    dataList.forEach(r => body.appendChild(rowTemplate({
      HoTen: r.hoTen,
      GioiTinh: r.gioiTinh,
      NamSinh: r.namSinh,
      DonVi: r.donVi,
      TrangThai: r.trangThai,
      GhiChu: r.ghiChu
    })));
    showToast("Đã sắp xếp danh sách theo bảng chữ cái A-Z");
  });

  // Load previous week roster
  document.getElementById("btnLoadPrevWeek")?.addEventListener("click", () => {
    const cur = parseInt((activeWeek || "Tuần 1").replace("Tuần ", ""));
    if (cur <= 1) return showToast("Tuần 1 không có tuần trước để lấy dữ liệu", "error");

    const prevWeekVal = "Tuần " + (cur - 1);
    body.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 25px;"><i class="fa-solid fa-spinner fa-spin"></i> Đang sao chép sơ đồ thành viên từ ${prevWeekVal}...</td></tr>`;

    fetch(CONFIG_API_URL + `?action=getWeeklyRoster&week=${encodeURIComponent(prevWeekVal)}`)
      .then(r => r.json())
      .then(res => {
        body.innerHTML = "";
        const rows = (res.data || []).filter(x => user.quyen === "Admin" || x.ChiDoan === user.chiDoan);
        if (!rows.length) {
          body.appendChild(rowTemplate({}));
          showToast(`Không tìm thấy thành viên nào ở ${prevWeekVal}`, "error");
          return;
        }
        rows.forEach(r => body.appendChild(rowTemplate({
          HoTen: r.HoTen,
          GioiTinh: r.GioiTinh,
          NamSinh: r.NamSinh,
          DonVi: r.DonVi,
          TrangThai: "Có mặt", // mặc định có mặt
          GhiChu: ""
        })));
        showToast(`Đã sao chép ${rows.length} thành viên từ ${prevWeekVal}. Vui lòng tích điểm danh và nhấn Lưu!`);
      })
      .catch(() => {
        body.innerHTML = "";
        body.appendChild(rowTemplate({}));
        showToast("Lỗi khi kết nối để lấy danh sách tuần trước", "error");
      });
  });

  // Save current week roster
  document.getElementById("btnSaveBulkWeek")?.addEventListener("click", () => {
    const rows = [...body.querySelectorAll("tr.excel-row")].map(tr => {
      return {
        hoTen: (tr.querySelector(".cell-name")?.textContent || "").trim(),
        gioiTinh: tr.querySelector(".excel-select-gender")?.value || "",
        namSinh: (tr.querySelector(".cell-year")?.textContent || "").trim(),
        donVi: (tr.querySelector(".cell-org")?.textContent || "").trim(),
        trangThai: tr.querySelector(".excel-select-status")?.value || "Có mặt",
        ghiChu: (tr.querySelector(".cell-notes")?.textContent || "").trim()
      };
    }).filter(x => x.hoTen);

    if (rows.length === 0) {
      alert("Vui lòng điền ít nhất một dòng điểm danh có Họ tên!");
      return;
    }

    const btn = document.getElementById("btnSaveBulkWeek");
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang lưu...';

    fetch(CONFIG_API_URL, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        action: "saveWeeklyRoster",
        week: activeWeek,
        chiDoan: user.chiDoan,
        rows
      })
    })
      .then(r => r.json())
      .then(res => {
        btn.disabled = false;
        btn.innerHTML = originalText;
        if (res.success) {
          showToast(`Đã lưu thành công bảng điểm danh ${activeWeek}!`);
          loadWeek(activeWeek);
        } else {
          showToast(res.error || "Không lưu được bảng", "error");
        }
      })
      .catch(err => {
        console.error(err);
        btn.disabled = false;
        btn.innerHTML = originalText;
        showToast("Lỗi kết nối mạng, không lưu được dữ liệu bảng!", "error");
      });
  });

  // Initial load
  loadWeek(activeWeek);
}

/* ==========================================================================
   AUTHENTICATION, SIDEBAR LOGOUT & SYNC FUNCTIONS
   ========================================================================== */

/* ==========================================================================
   PASSWORD MANAGEMENT
   ========================================================================== */

const DEFAULT_PASSWORD = "123456";
const ADMIN_DEFAULT_PASSWORD = "admin123";

/**
 * Lấy mật khẩu đã được lưu cho một chi đoàn cụ thể.
 * Trả về null nếu chưa có (tức là lần đầu đăng nhập).
 */
function getStoredPassword(chiDoan) {
  const key = "summer_pass_" + btoa(encodeURIComponent(chiDoan));
  return localStorage.getItem(key);
}

/**
 * Lưu mật khẩu mới cho một chi đoàn.
 */
function savePassword(chiDoan, newPassword) {
  const key = "summer_pass_" + btoa(encodeURIComponent(chiDoan));
  localStorage.setItem(key, btoa(newPassword)); // encode đơn giản
}

function savePasswordToServer(chiDoan, newPassword) {
  if (!CONFIG_API_URL) return Promise.resolve({ success: true, offline: true });
  return fetch(CONFIG_API_URL, {
    method: "POST",
    mode: "cors",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({
      action: "changePassword",
      chiDoan: chiDoan,
      matKhauMoi: newPassword
    })
  }).then(r => r.json());
}

/**
 * Kiểm tra xem mật khẩu nhập vào có khớp không.
 */
function verifyPassword(chiDoan, inputPassword) {
  const stored = getStoredPassword(chiDoan);
  const isAdmin = chiDoan === "Ban Chỉ Đạo Hè Phường";
  const defaultPass = isAdmin ? ADMIN_DEFAULT_PASSWORD : DEFAULT_PASSWORD;

  if (!stored) {
    // Chưa từng đổi mật khẩu → dùng mật khẩu mặc định
    return inputPassword === defaultPass;
  }
  return atob(stored) === inputPassword;
}

/**
 * Kiểm tra xem chi đoàn có đang dùng mật khẩu mặc định không.
 */
function isUsingDefaultPassword(chiDoan) {
  const stored = getStoredPassword(chiDoan);
  if (!stored) return true; // Chưa từng đổi
  const isAdmin = chiDoan === "Ban Chỉ Đạo Hè Phường";
  const defaultPass = isAdmin ? ADMIN_DEFAULT_PASSWORD : DEFAULT_PASSWORD;
  return atob(stored) === defaultPass;
}

/* ==========================================================================
   AUTHENTICATION
   ========================================================================== */

function initLoginPage() {
  const form = document.getElementById("loginForm");
  const errorBox = document.getElementById("loginError");
  const errorMsg = document.getElementById("errorMessage");

  // Khởi tạo nút show/hide password
  const toggleBtn = document.getElementById("togglePassword");
  const passInput = document.getElementById("loginPassword");
  if (toggleBtn && passInput) {
    toggleBtn.addEventListener("click", () => {
      const isHidden = passInput.type === "password";
      passInput.type = isHidden ? "text" : "password";
      toggleBtn.querySelector("i").className = isHidden ? "fa-solid fa-eye-slash" : "fa-solid fa-eye";
    });
  }

  if (form) {
    // Nếu người dùng đã đăng nhập từ trước, tự động chuyển đến trang chủ
    if (localStorage.getItem("summer_user")) {
      window.location.href = "dashboard.html";
      return;
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const chiDoan = document.getElementById("loginChiDoan").value;
      const matKhau = document.getElementById("loginPassword").value;
      const btnSubmit = document.getElementById("btnLoginSubmit");

      btnSubmit.disabled = true;
      btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xác thực...';
      errorBox.style.display = "none";

      // Chế độ ngoại tuyến (Offline local) khi không có API URL
      if (!CONFIG_API_URL) {
        setTimeout(() => {
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Đăng nhập hệ thống';

          if (verifyPassword(chiDoan, matKhau)) {
            const mockUser = {
              chiDoan: chiDoan,
              quyen: chiDoan === "Ban Chỉ Đạo Hè Phường" ? "Admin" : "User"
            };
            localStorage.setItem("summer_user", JSON.stringify(mockUser));
            localStorage.setItem("summer_last_active", Date.now());

            // Kiểm tra có cần đổi mật khẩu lần đầu không
            if (isUsingDefaultPassword(chiDoan)) {
              showChangePasswordModal(chiDoan);
            } else {
              window.location.href = "dashboard.html";
            }
          } else {
            errorMsg.innerText = "Mật khẩu truy cập không đúng. Vui lòng kiểm tra lại.";
            errorBox.style.display = "flex";
          }
        }, 800);
        return;
      }

      // Chế độ kết nối máy chủ Google Sheets
      fetch(CONFIG_API_URL, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          action: "login",
          chiDoan: chiDoan,
          matKhau: matKhau
        })
      })
        .then(res => res.json())
        .then(result => {
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Đăng nhập hệ thống';

          if (result.success) {
            localStorage.setItem("summer_user", JSON.stringify(result.data));
            localStorage.setItem("summer_last_active", Date.now());

            // Kiểm tra có cần đổi mật khẩu lần đầu không
            if (isUsingDefaultPassword(chiDoan)) {
              showChangePasswordModal(chiDoan);
            } else {
              window.location.href = "dashboard.html";
            }
          } else {
            errorMsg.innerText = result.error || "Sai mật khẩu hoặc tài khoản chưa được thiết lập.";
            errorBox.style.display = "flex";
          }
        })
        .catch(err => {
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Đăng nhập hệ thống';
          console.error("Lỗi API đăng nhập:", err);
          errorMsg.innerText = "Lỗi kết nối máy chủ CSDL. Thử lại sau hoặc chuyển sang chạy Local.";
          errorBox.style.display = "flex";
        });
    });
  }
}

/* ==========================================================================
   FIRST-LOGIN: FORCED CHANGE PASSWORD MODAL
   ========================================================================== */

function showChangePasswordModal(chiDoan) {
  const modal = document.getElementById("changePasswordModal");
  if (!modal) return;

  modal.classList.add("open");

  // Khởi tạo show/hide password cho modal
  ["toggleNewPass", "toggleConfirmPass"].forEach(btnId => {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      const input = document.getElementById(targetId);
      if (!input) return;
      const isHidden = input.type === "password";
      input.type = isHidden ? "text" : "password";
      btn.querySelector("i").className = isHidden ? "fa-solid fa-eye-slash" : "fa-solid fa-eye";
    });
  });

  // Thanh đánh giá độ mạnh mật khẩu
  const newPassInput = document.getElementById("newPassword");
  const strengthBar = document.getElementById("strengthBar");
  const strengthText = document.getElementById("strengthText");

  if (newPassInput && strengthBar) {
    newPassInput.addEventListener("input", () => {
      const val = newPassInput.value;
      const result = evaluatePasswordStrength(val);
      strengthBar.style.width = result.pct + "%";
      strengthBar.style.background = result.color;
      if (strengthText) {
        strengthText.textContent = result.label;
        strengthText.style.color = result.color;
      }
    });
  }

  // Submit đổi mật khẩu
  const changeForm = document.getElementById("changePasswordForm");
  const changeError = document.getElementById("changePassError");

  if (changeForm && !changeForm.dataset.listenerAttached) {
    changeForm.dataset.listenerAttached = "true";
    changeForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const newPass = document.getElementById("newPassword").value;
      const confirmPass = document.getElementById("confirmPassword").value;

      changeError.style.display = "none";

      if (newPass.length < 6) {
        changeError.textContent = "Mật khẩu mới phải có ít nhất 6 ký tự.";
        changeError.style.display = "flex";
        return;
      }

      if (newPass === DEFAULT_PASSWORD || newPass === ADMIN_DEFAULT_PASSWORD) {
        changeError.textContent = "Không được dùng mật khẩu mặc định. Vui lòng chọn mật khẩu khác.";
        changeError.style.display = "flex";
        return;
      }

      if (newPass !== confirmPass) {
        changeError.textContent = "Mật khẩu xác nhận không khớp. Vui lòng kiểm tra lại.";
        changeError.style.display = "flex";
        return;
      }

      const btnChange = document.getElementById("btnChangePassword");
      if (btnChange) {
        btnChange.disabled = true;
        btnChange.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang cập nhật...';
      }

      savePasswordToServer(chiDoan, newPass)
        .then(result => {
          if (!result.success) {
            throw new Error(result.error || "Không thể cập nhật mật khẩu trên máy chủ.");
          }
          savePassword(chiDoan, newPass);
          if (btnChange) {
            btnChange.innerHTML = '<i class="fa-solid fa-circle-check"></i> Đã cập nhật!';
            btnChange.style.background = 'linear-gradient(135deg, #10b981, #059669)';
          }
          setTimeout(() => {
            modal.classList.remove("open");
            window.location.href = "dashboard.html";
          }, 1000);
        })
        .catch(err => {
          if (btnChange) {
            btnChange.disabled = false;
            btnChange.innerHTML = '<i class="fa-solid fa-shield-halved"></i> Xác nhận &amp; Vào hệ thống';
            btnChange.style.background = '';
          }
          changeError.textContent = err.message || "Lỗi cập nhật mật khẩu. Vui lòng thử lại.";
          changeError.style.display = "flex";
        });
    });
  }
}

function evaluatePasswordStrength(password) {
  if (!password) return { pct: 0, color: "#e2e8f0", label: "" };
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { pct: 20, color: "#ef4444", label: "Rất yếu" };
  if (score === 2) return { pct: 40, color: "#f59e0b", label: "Yếu" };
  if (score === 3) return { pct: 60, color: "#eab308", label: "Trung bình" };
  if (score === 4) return { pct: 80, color: "#22c55e", label: "Mạnh" };
  return { pct: 100, color: "#10b981", label: "Rất mạnh" };
}

function renderSidebarProfile() {
  const userStr = localStorage.getItem("summer_user");
  if (!userStr) return;
  const user = JSON.parse(userStr);
  const profileContainer = document.querySelector(".sidebar-profile");

  if (profileContainer) {
    let initials = "CĐ";
    if (user.chiDoan.includes("Ban Chỉ Đạo")) {
      initials = "BCĐ";
    } else {
      // Lấy viết tắt từ tên tổ dân phố. Ví dụ: "Tổ dân phố Nguyễn Trung Trực 2" -> "NTT2"
      const tdpMatch = user.chiDoan.match(/Tổ dân phố\s+([^\s.]+)/i);
      if (tdpMatch && tdpMatch[1]) {
        const cleanName = user.chiDoan.split("Tổ dân phố")[1].trim().replace(/\./g, "");
        initials = cleanName.split(" ").map(w => w.charAt(0)).join("").toUpperCase();
      } else {
        initials = user.chiDoan.split(" ").slice(-1)[0].substring(0, 3).toUpperCase();
      }
    }

    const roleName = user.quyen === "Admin" ? "Quản trị viên" : "Cán bộ phụ trách";

    profileContainer.innerHTML = `
      <div class="sidebar-profile-box">
        <div style="display: flex; align-items: center; gap: 12px; width: 100%;">
          <div class="profile-avatar">${initials}</div>
          <div class="profile-info" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            <span class="profile-name" title="${user.chiDoan}" style="font-size: 0.82rem;">${user.chiDoan}</span>
            <span class="profile-role">${roleName}</span>
          </div>
        </div>
        <button class="btn-logout" id="btnLogout"><i class="fa-solid fa-right-from-bracket"></i> Đăng xuất</button>
      </div>
    `;

    document.getElementById("btnLogout").addEventListener("click", () => {
      if (confirm("Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?")) {
        localStorage.removeItem("summer_user");
        window.location.href = "login.html";
      }
    });
  }
}

function syncMembersWithServer() {
  if (!CONFIG_API_URL) return Promise.resolve();
  const userStr = localStorage.getItem("summer_user");
  if (!userStr) return Promise.resolve();
  const user = JSON.parse(userStr);

  return fetch(CONFIG_API_URL + "?action=getMembers&chiDoan=" + encodeURIComponent(user.chiDoan))
    .then(res => res.json())
    .then(result => {
      if (result.success && result.data && result.data.length > 0) {
        dynamicStudentSuggestions = result.data.map(m => m.HoTen);
      }
    })
    .catch(err => console.warn("Lỗi đồng bộ đoàn viên từ server:", err));
}

function syncAttendanceWithServer() {
  if (!CONFIG_API_URL) return Promise.resolve();
  const userStr = localStorage.getItem("summer_user");
  if (!userStr) return Promise.resolve();
  const user = JSON.parse(userStr);

  if (document.getElementById("attendanceTableBody")) showSkeletonLoading("attendanceTableBody", 5);

  return fetch(CONFIG_API_URL + "?action=getAttendance&chiDoan=" + encodeURIComponent(user.chiDoan))
    .then(res => res.json())
    .then(result => {
      if (result.success && result.data) {
        const records = result.data.map(row => ({
          id: row.ID,
          date: row.Ngay,
          week: row.Tuan,
          name: row.HoTen,
          status: row.TrangThai,
          notes: row.GhiChu,
          chiDoan: row.ChiDoan
        }));

        attendanceRecords = records;
        localStorage.setItem("summer_attendance", JSON.stringify(attendanceRecords));

        if (document.getElementById("attendanceTableBody")) {
          renderAttendanceTable();
        }
        updateStatsMetrics();
      }
    })
    .catch(err => console.warn("Lỗi đồng bộ dữ liệu điểm danh từ server:", err));
}

function syncGalleryWithServer() {
  if (!CONFIG_API_URL) return Promise.resolve();

  if (document.getElementById("galleryGrid")) {
    document.getElementById("galleryGrid").innerHTML = `<div class="skeleton-row" style="height:200px;grid-column:1/-1;animation:shimmer 1.5s infinite;background:linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%);background-size:200% 100%;border-radius:12px;"></div>`;
  }

  return fetch(CONFIG_API_URL + "?action=getPhotos")
    .then(res => res.json())
    .then(result => {
      if (result.success && result.data) {
        galleryPhotos = result.data.map(row => ({
          id: row.ID,
          title: row.Title,
          category: row.Category,
          src: row.URL,
          chiDoan: row.ChiDoan,
          ngayUp: row.NgayUp || "",
          week: row.Tuan || ""
        }));
        localStorage.setItem("summer_gallery", JSON.stringify(galleryPhotos));
        if (typeof window.renderGallery === "function" && document.getElementById("galleryGrid")) {
          window.renderGallery(document.querySelector('#galleryFilters .filter-btn.active')?.dataset.filter || 'all');
        }
      }
    })
    .catch(err => console.warn("Lỗi đồng bộ ảnh:", err));
}

function syncWeeklyActivitiesWithServer() {
  if (!CONFIG_API_URL) return Promise.resolve();

  return fetch(CONFIG_API_URL + "?action=getWeeklyActivities")
    .then(res => res.json())
    .then(result => {
      if (result.success && result.data && result.data.length > 0) {
        WEEKLY_ACTIVITIES = result.data;
        localStorage.setItem("summer_weeks", JSON.stringify(WEEKLY_ACTIVITIES));

        // Re-render UI if it's already on screen
        if (typeof window.renderWeeks === "function") {
          window.renderWeeks(document.querySelector('#weeklyFilters .filter-btn.active')?.dataset.filter || 'all');
        }

        // Re-populate week select in attendance if needed
        const attWeekSelect = document.getElementById("attWeek");
        if (attWeekSelect && WEEKLY_ACTIVITIES.length > 0) {
          attWeekSelect.innerHTML = '<option value="" disabled selected>-- Chọn tuần --</option>';
          WEEKLY_ACTIVITIES.forEach(w => {
            const opt = document.createElement("option");
            opt.value = `Tuần ${w.week}`;
            opt.textContent = `Tuần ${w.week} - ${w.title}`;
            attWeekSelect.appendChild(opt);
          });
        }
      }
    })
    .catch(err => console.warn("Lỗi đồng bộ Lịch trình Tuần:", err));
}

/* ==========================================================================
   PHOTO GALLERY & SIMULATED FILE LOADING
   ========================================================================== */

function initGallery() {
  const galleryGrid = document.getElementById("galleryGrid");
  const galleryFilters = document.getElementById("galleryFilters");
  const imageUploadInput = document.getElementById("imageUploadInput");
  const btnUploadSimulation = document.getElementById("btnUploadSimulation");

  if (!galleryGrid) return;

  function renderGallery(filter = "all") {
    window.renderGallery = renderGallery;
    galleryGrid.innerHTML = "";

    const qs = new URLSearchParams(window.location.search);
    const weekFilter = qs.get("week");
    const filtered = galleryPhotos.filter(p => {
      const byCat = filter === "all" || p.category === filter;
      const byWeek = !weekFilter || (p.week || "") === weekFilter;
      return byCat && byWeek;
    });

    if (filtered.length === 0) {
      galleryGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <i class="fa-regular fa-image"></i>
          <p>Không có hình ảnh nào.</p>
        </div>`;
      return;
    }

    filtered.forEach((p, index) => {
      const item = document.createElement("div");
      item.className = "gallery-item";
      item.innerHTML = `
        <div class="gallery-img-container">
          <img src="${normalizePhotoUrl(p.src)}" alt="${p.title}" class="gallery-img" loading="lazy">
          <div class="gallery-overlay">
            <span class="gallery-item-category">${getCategoryName(p.category)}</span>
            <h4 class="gallery-item-title">${p.title}</h4>
            <p class="gallery-meta-line"><i class="fa-solid fa-building-flag"></i> ${p.chiDoan || "Chưa rõ chi đoàn"}</p>
            <p class="gallery-meta-line"><i class="fa-regular fa-clock"></i> ${formatDisplayDateTime(p.ngayUp)}</p>
            <p class="gallery-meta-line"><i class="fa-solid fa-calendar-week"></i> ${p.week || "Chưa gán tuần"}</p>
          </div>
        </div>
      `;

      const imgEl = item.querySelector(".gallery-img");
      if (imgEl) {
        imgEl.addEventListener("error", () => {
          const fb = getDriveFallbackUrl(p.src);
          if (fb && imgEl.src !== fb) {
            imgEl.src = fb;
            return;
          }
          imgEl.src = "image/activity_volunteer.png";
        }, { once: true });
      }

      item.addEventListener("click", () => {
        activeLightboxIndex = index;
        openLightbox(filtered);
      });

      galleryGrid.appendChild(item);
    });
  }

  function getCategoryName(cat) {
    switch (cat) {
      case "skills": return "Huấn luyện kỹ năng";
      case "sports": return "Hội thao & Trò chơi";
      case "volunteer": return "Tình nguyện xanh";
      case "arts": return "Hoạt động văn nghệ";
      default: return "Sự kiện hè";
    }
  }

  function normalizePhotoUrl(url) {
    if (!url) return "image/activity_volunteer.png";
    if (url.includes("lh3.googleusercontent.com/d/")) return url;
    const idMatch = String(url).match(/(?:id=|\/d\/)([a-zA-Z0-9_-]{10,})/);
    if (idMatch && idMatch[1]) return `https://lh3.googleusercontent.com/d/${idMatch[1]}=w1600`;
    return url;
  }

  function getDriveFallbackUrl(url) {
    const idMatch = String(url || "").match(/(?:id=|\/d\/)([a-zA-Z0-9_-]{10,})/);
    if (!idMatch || !idMatch[1]) return "";
    return `https://drive.google.com/uc?export=view&id=${idMatch[1]}`;
  }

  function formatDisplayDateTime(v) {
    if (!v) return "Chưa có thời gian";
    if (typeof v === "string" && v.includes("/") && v.includes(":")) return v;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
  }

  // Filter tabs
  if (galleryFilters) {
    galleryFilters.addEventListener("click", (e) => {
      const btn = e.target.closest(".filter-btn");
      if (btn) {
        document.querySelectorAll("#galleryFilters .filter-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const filterVal = btn.getAttribute("data-filter");
        renderGallery(filterVal);
      }
    });
  }

  // Mở Upload Modal thay vì chọn file luôn
  const uploadModal = document.getElementById("uploadPhotoModal");
  if (btnUploadSimulation && uploadModal) {
    btnUploadSimulation.addEventListener("click", () => {
      uploadModal.classList.add("open");
    });
  }

  const uploadForm = document.getElementById("uploadPhotoForm");
  if (uploadForm) {
    uploadForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const fileInput = document.getElementById("uploadFile");
      if (!fileInput.files || !fileInput.files[0]) return;
      const file = fileInput.files[0];

      const title = document.getElementById("uploadTitle").value;
      const category = document.getElementById("uploadCategory").value;
      const week = document.getElementById("uploadWeek").value.trim();
      const btnSubmit = document.getElementById("btnSubmitUpload");
      const userStr = localStorage.getItem("summer_user");
      const currentUser = userStr ? JSON.parse(userStr) : null;
      const chiDoan = currentUser ? currentUser.chiDoan : "";

      btnSubmit.disabled = true;
      btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang tải lên...';

      const reader = new FileReader();
      reader.onload = function (evt) {
        const base64Data = evt.target.result.split(',')[1];

        if (!CONFIG_API_URL) {
          // Offline fallback
          galleryPhotos.unshift({ id: Date.now(), title, category, src: evt.target.result, chiDoan, ngayUp: formatDisplayDateTime(new Date().toISOString()), week });
          localStorage.setItem("summer_gallery", JSON.stringify(galleryPhotos));
          renderGallery("all");
          uploadModal.classList.remove("open");
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Tải lên';
          showToast("Đã lưu ảnh cục bộ (Offline)");
          return;
        }

        fetch(CONFIG_API_URL, {
          method: "POST",
          mode: "cors",
          headers: { "Content-Type": "text/plain" },
          body: JSON.stringify({
            action: "uploadPhoto",
            base64Data: base64Data,
            fileName: file.name,
            mimeType: file.type,
            title: title,
            category: category,
            chiDoan: chiDoan,
            week: week
          })
        }).then(r => r.json()).then(res => {
          if (res.success) {
            galleryPhotos.unshift({ id: res.data.id, title, category, src: res.data.url, chiDoan, ngayUp: res.data.ngayUp || "", week: res.data.week || week });
            localStorage.setItem("summer_gallery", JSON.stringify(galleryPhotos));
            renderGallery("all");
            uploadModal.classList.remove("open");
            showToast("Tải ảnh lên Google Drive thành công!");
          } else {
            showToast("Lỗi: " + res.error, "error");
          }
        }).catch(err => {
          showToast("Lỗi kết nối mạng", "error");
        }).finally(() => {
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Tải lên';
          uploadForm.reset();
        });
      };
      reader.readAsDataURL(file);
    });

    document.getElementById("closeUploadModal")?.addEventListener("click", () => {
      uploadModal.classList.remove("open");
    });
  }

  // Lightbox Modal
  const lightbox = document.getElementById("lightboxModal");
  const lightboxImg = document.getElementById("lightboxImg");
  const lightboxCaption = document.getElementById("lightboxCaption");
  const closeBtn = document.getElementById("closeLightbox");
  const prevBtn = document.getElementById("prevLightboxBtn");
  const nextBtn = document.getElementById("nextLightboxBtn");

  let lightboxList = [];

  function openLightbox(list) {
    if (!lightbox) return;
    lightboxList = list;
    updateLightbox();
    lightbox.classList.add("open");
  }

  function updateLightbox() {
    const item = lightboxList[activeLightboxIndex];
    if (!item) return;
    lightboxImg.src = normalizePhotoUrl(item.src);
    lightboxCaption.innerHTML = `<strong>${item.title}</strong> — <span>${getCategoryName(item.category)}</span><br><small>${item.chiDoan || "Chưa rõ chi đoàn"} • ${formatDisplayDateTime(item.ngayUp)}</small>`;
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", () => lightbox.classList.remove("open"));
  }

  if (lightbox) {
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox || e.target.classList.contains("lightbox-content")) {
        lightbox.classList.remove("open");
      }
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      activeLightboxIndex = (activeLightboxIndex - 1 + lightboxList.length) % lightboxList.length;
      updateLightbox();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      activeLightboxIndex = (activeLightboxIndex + 1) % lightboxList.length;
      updateLightbox();
    });
  }

  document.addEventListener("keydown", (e) => {
    if (lightbox && lightbox.classList.contains("open")) {
      if (e.key === "Escape") lightbox.classList.remove("open");
      if (e.key === "ArrowLeft" && prevBtn) prevBtn.click();
      if (e.key === "ArrowRight" && nextBtn) nextBtn.click();
    }
  });

  renderGallery();
  let syncTimer = null;

  function save() {
    try { localStorage.setItem(SK, JSON.stringify(data)); } catch { }

    // Debounce: hủy timer cũ, đặt timer mới 1.5s
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => syncToServer(), 1500);
  }

  function syncToServer() {
    if (!window.CONFIG_API_URL) return;
    const userStr = localStorage.getItem("summer_user");
    const user = userStr ? JSON.parse(userStr) : null;
    if (!user) return;

    const rows = data.map(r => ({
      hoTen: r.name,
      gioiTinh: r.gioiTinh || "",
      namSinh: r.namSinh || "",
      donVi: r.donVi || "",
      trangThai: STATUS_TEXT[r.attendance[activeWeek]],
      ghiChu: r.notes || ""
    }));

    fetch(window.CONFIG_API_URL, {
      method: "POST", mode: "cors",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        action: "saveWeeklyRoster",
        week: `Tuần ${activeWeek + 1}`,
        chiDoan: user.chiDoan,
        rows
      })
    })
      .then(r => r.json())
      .then(res => {
        if (res.success) showToast("Đã lưu bảng điểm danh!");
        else showToast(res.error || "Lỗi lưu dữ liệu", "error");
      })
      .catch(() => showToast("Mất kết nối, đã lưu offline", "error"));
  }
}