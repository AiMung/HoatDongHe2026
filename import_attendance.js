/* ==========================================================================
   IMPORT ĐIỂM DANH TỪ FILE EXCEL / CSV
   Tích hợp vào attendance.html và app.js
   
   Cách dùng:
     initImportAttendance();  // gọi 1 lần sau DOMContentLoaded
   ========================================================================== */

(function () {
  // ── Helpers dùng nội bộ ──────────────────────────────────────────────────

  function getUser() {
    try { return JSON.parse(localStorage.getItem('summer_user') || 'null'); } catch { return null; }
  }

  // Map tên cột linh hoạt → key chuẩn nội bộ
  const COL_ALIASES = {
    hoTen:     ['hoten', 'họtên', 'ho_ten', 'name', 'họ và tên', 'hovaten', 'fullname'],
    gioiTinh:  ['gioitinh', 'giới tính', 'gioi_tinh', 'gender', 'sex'],
    namSinh:   ['namsinh', 'năm sinh', 'nam_sinh', 'birthyear', 'yearofbirth', 'năm'],
    donVi:     ['donvi', 'đơn vị', 'don_vi', 'truong', 'trường', 'school', 'unit'],
    trangThai: ['trangthai', 'trạng thái', 'trang_thai', 'status', 'điểm danh', 'diemdanh'],
    ghiChu:    ['ghichu', 'ghi chú', 'ghi_chu', 'note', 'notes', 'remarks'],
    tuan:      ['tuan', 'tuần', 'week'],
    chiDoan:   ['chidoan', 'chi đoàn', 'chi_doan', 'unit', 'organization'],
  };

  function normalizeHeader(h) {
    return String(h || '').toLowerCase().replace(/\s+/g, '').replace(/[đ]/g, 'd').replace(/[áàảãạăắặằẳẵâấầẩẫậ]/g, 'a').replace(/[éèẻẽẹêếềểễệ]/g, 'e').replace(/[íìỉĩị]/g, 'i').replace(/[óòỏõọôốồổỗộơớờởỡợ]/g, 'o').replace(/[úùủũụưứừửữự]/g, 'u').replace(/[ýỳỷỹỵ]/g, 'y');
  }

  function mapHeaders(headerRow) {
    const map = {}; // index → key chuẩn
    headerRow.forEach((h, i) => {
      const norm = normalizeHeader(h);
      for (const [key, aliases] of Object.entries(COL_ALIASES)) {
        if (aliases.includes(norm)) { map[i] = key; break; }
      }
    });
    return map;
  }

  // Chuẩn hóa giá trị TrangThai
  function normalizeStatus(raw) {
    const v = normalizeHeader(raw);
    if (['commat', 'present', 'comat', 'có mặt', 'comặt', '1', 'x', 'v', 'co'].includes(v)) return 'Có mặt';
    if (['vangphep', 'excused', 'vắng phép', 'vangcophep', 'vangcó phép'].includes(v)) return 'Vắng có phép';
    if (['vangkhongphep', 'unexcused', 'vắng k/p', 'vangkp', 'vắng không phép', 'vangkhongcophep'].includes(v)) return 'Vắng không phép';
    return 'Có mặt'; // mặc định
  }

  // Parse CSV thủ công (hỗ trợ quoted fields)
  function parseCSV(text) {
    const rows = [];
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      if (!line.trim()) continue;
      const cells = [];
      let cur = '', inQ = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') { inQ = !inQ; }
        else if ((ch === ',' || ch === '\t') && !inQ) { cells.push(cur.trim()); cur = ''; }
        else { cur += ch; }
      }
      cells.push(cur.trim());
      rows.push(cells);
    }
    return rows;
  }

  // Parse XLSX bằng SheetJS (load động nếu chưa có)
  function parseXLSX(buffer) {
    return new Promise((resolve, reject) => {
      function doRead() {
        try {
          const wb = XLSX.read(buffer, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
          resolve(rows);
        } catch (e) { reject(e); }
      }
      if (typeof XLSX !== 'undefined') { doRead(); return; }
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      s.onload = doRead;
      s.onerror = () => reject(new Error('Không tải được thư viện đọc XLSX'));
      document.head.appendChild(s);
    });
  }

  // Đọc file → mảng rows thô
  function readFile(file) {
    return new Promise((resolve, reject) => {
      const ext = file.name.split('.').pop().toLowerCase();
      const reader = new FileReader();
      if (ext === 'csv') {
        reader.onload = e => resolve(parseCSV(e.target.result));
        reader.onerror = reject;
        reader.readAsText(file, 'UTF-8');
      } else if (['xlsx', 'xls'].includes(ext)) {
        reader.onload = e => parseXLSX(new Uint8Array(e.target.result)).then(resolve).catch(reject);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
      } else {
        reject(new Error('Chỉ hỗ trợ file .xlsx, .xls, .csv'));
      }
    });
  }

  // Chuyển rows thô → mảng record đã chuẩn hóa
  function rowsToRecords(rawRows) {
    if (!rawRows || rawRows.length < 2) throw new Error('File rỗng hoặc thiếu dòng tiêu đề');
    const hMap = mapHeaders(rawRows[0]);
    if (!Object.values(hMap).includes('hoTen')) throw new Error('Không tìm thấy cột "HoTen" (Họ Tên). Vui lòng dùng file mẫu được cung cấp.');
    const records = [];
    for (let i = 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (row.every(c => !String(c).trim())) continue; // bỏ dòng trống
      const rec = {};
      for (const [idx, key] of Object.entries(hMap)) {
        rec[key] = String(row[idx] || '').trim();
      }
      if (!rec.hoTen) continue;
      rec.trangThai = normalizeStatus(rec.trangThai);
      records.push(rec);
    }
    if (!records.length) throw new Error('Không có dòng dữ liệu hợp lệ trong file');
    return records;
  }

  // ── Tạo file mẫu Excel để tải về ──────────────────────────────────────────

  function downloadTemplate() {
    const user = getUser();
    // Tạo CSV mẫu với BOM UTF-8
    const chiDoan = user ? user.chiDoan : 'Chi đoàn TDP Ví dụ';
    const tuanHienTai = 'Tuần 1';
    const rows = [
      ['Tuan', 'ChiDoan', 'HoTen', 'GioiTinh', 'NamSinh', 'DonVi', 'TrangThai', 'GhiChu'],
      [tuanHienTai, chiDoan, 'Nguyễn Văn An', 'Nam', '2009', 'THCS Nguyễn Du', 'Có mặt', ''],
      [tuanHienTai, chiDoan, 'Trần Thị Bình', 'Nữ', '2010', 'THCS Lê Quý Đôn', 'Vắng có phép', 'Bị ốm'],
      [tuanHienTai, chiDoan, 'Lê Hoàng Châu', 'Nam', '2009', 'THCS Nguyễn Du', 'Vắng không phép', ''],
    ];
    const csv = '\uFEFF' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'Mau_DiemDanh_SinhHoatHe2026.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  // ── Modal HTML ─────────────────────────────────────────────────────────────

  const MODAL_HTML = `
<div id="importModal" style="
  position:fixed;inset:0;background:rgba(10,15,30,.6);backdrop-filter:blur(8px);
  z-index:5000;display:flex;align-items:center;justify-content:center;padding:16px;
  opacity:0;pointer-events:none;transition:opacity .25s;
">
  <div id="importCard" style="
    background:var(--bg-card,#fff);border:1px solid var(--border-color,#e5e7eb);
    border-radius:16px;box-shadow:0 24px 60px rgba(0,0,0,.18);
    width:100%;max-width:760px;max-height:90vh;display:flex;flex-direction:column;
    transform:translateY(24px) scale(.97);transition:transform .3s cubic-bezier(.16,1,.3,1);
    overflow:hidden;
  ">
    <!-- Header -->
    <div style="padding:20px 24px 16px;border-bottom:1px solid var(--border-color,#e5e7eb);
      background:linear-gradient(135deg,rgba(0,102,204,.05),rgba(59,130,246,.03));
      display:flex;align-items:center;justify-content:space-between;gap:12px;flex-shrink:0;">
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="width:42px;height:42px;border-radius:11px;
          background:linear-gradient(135deg,#0066cc,#3b82f6);
          display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.1rem;">
          <i class="fa-solid fa-file-import"></i>
        </div>
        <div>
          <div style="font-size:1.05rem;font-weight:800;color:var(--text-main,#111);">Import Điểm Danh từ Excel / CSV</div>
          <div style="font-size:.78rem;color:var(--text-muted,#6b7280);margin-top:2px;">Tải file, xem trước dữ liệu rồi xác nhận để lưu lên hệ thống</div>
        </div>
      </div>
      <button id="importModalClose" style="background:none;border:none;font-size:1.4rem;cursor:pointer;
        color:var(--text-muted,#6b7280);padding:4px 8px;border-radius:6px;line-height:1;">×</button>
    </div>

    <!-- Body -->
    <div style="padding:20px 24px;overflow-y:auto;flex:1;">

      <!-- Step 1: Tải mẫu + chọn file -->
      <div id="importStep1">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px;">
          <div style="background:var(--bg-main,#f8fafc);border:1.5px dashed var(--border-color,#e5e7eb);
            border-radius:10px;padding:16px;text-align:center;">
            <i class="fa-solid fa-file-csv" style="font-size:1.8rem;color:#10b981;margin-bottom:8px;display:block;"></i>
            <div style="font-size:.85rem;font-weight:700;color:var(--text-main,#111);margin-bottom:4px;">Bước 1: Tải file mẫu</div>
            <div style="font-size:.75rem;color:var(--text-muted,#6b7280);margin-bottom:10px;">Điền thông tin đoàn viên vào mẫu CSV/Excel</div>
            <button id="importBtnTemplate" style="
              background:#10b981;color:#fff;border:none;border-radius:8px;
              padding:7px 16px;font-size:.82rem;font-weight:700;cursor:pointer;
              display:inline-flex;align-items:center;gap:6px;">
              <i class="fa-solid fa-download"></i> Tải file mẫu (.csv)
            </button>
          </div>
          <div style="background:var(--bg-main,#f8fafc);border:1.5px dashed var(--border-color,#e5e7eb);
            border-radius:10px;padding:16px;text-align:center;">
            <i class="fa-solid fa-upload" style="font-size:1.8rem;color:var(--primary,#0066cc);margin-bottom:8px;display:block;"></i>
            <div style="font-size:.85rem;font-weight:700;color:var(--text-main,#111);margin-bottom:4px;">Bước 2: Chọn file đã điền</div>
            <div style="font-size:.75rem;color:var(--text-muted,#6b7280);margin-bottom:10px;">Hỗ trợ .xlsx, .xls, .csv (UTF-8)</div>
            <label style="
              background:var(--primary,#0066cc);color:#fff;border:none;border-radius:8px;
              padding:7px 16px;font-size:.82rem;font-weight:700;cursor:pointer;
              display:inline-flex;align-items:center;gap:6px;">
              <i class="fa-solid fa-folder-open"></i> Chọn file
              <input id="importFileInput" type="file" accept=".xlsx,.xls,.csv" style="display:none;">
            </label>
          </div>
        </div>

        <!-- Gợi ý cột -->
        <details style="background:rgba(59,130,246,.04);border:1px solid rgba(59,130,246,.15);border-radius:8px;padding:12px 14px;margin-bottom:4px;">
          <summary style="font-size:.8rem;font-weight:700;color:var(--primary,#0066cc);cursor:pointer;user-select:none;">
            <i class="fa-solid fa-circle-info"></i> Tên cột hợp lệ trong file (click để xem)
          </summary>
          <div style="margin-top:10px;font-size:.77rem;color:var(--text-muted,#6b7280);line-height:1.9;">
            <table style="width:100%;border-collapse:collapse;">
              <tr style="background:rgba(0,102,204,.06);">
                <th style="padding:5px 10px;text-align:left;border-radius:4px 0 0 4px;">Cột bắt buộc</th>
                <th style="padding:5px 10px;text-align:left;">Tên được chấp nhận</th>
              </tr>
              <tr><td style="padding:4px 10px;font-weight:600;color:var(--text-main,#111);">Họ tên</td><td style="padding:4px 10px;">HoTen, Họ và Tên, Name</td></tr>
              <tr><td style="padding:4px 10px;font-weight:600;color:var(--text-main,#111);">Trạng thái</td><td style="padding:4px 10px;">TrangThai, Status — giá trị: <b>Có mặt</b> / <b>Vắng có phép</b> / <b>Vắng không phép</b></td></tr>
              <tr style="background:rgba(0,0,0,.02);"><td style="padding:4px 10px;">Tuần</td><td style="padding:4px 10px;">Tuan, Week — ví dụ: Tuần 1</td></tr>
              <tr><td style="padding:4px 10px;">Chi đoàn</td><td style="padding:4px 10px;">ChiDoan (Admin) — User tự động dùng chi đoàn đăng nhập</td></tr>
              <tr style="background:rgba(0,0,0,.02);"><td style="padding:4px 10px;">Giới tính</td><td style="padding:4px 10px;">GioiTinh, Gender</td></tr>
              <tr><td style="padding:4px 10px;">Năm sinh</td><td style="padding:4px 10px;">NamSinh, BirthYear</td></tr>
              <tr style="background:rgba(0,0,0,.02);"><td style="padding:4px 10px;">Đơn vị</td><td style="padding:4px 10px;">DonVi, Trường, School</td></tr>
              <tr><td style="padding:4px 10px;">Ghi chú</td><td style="padding:4px 10px;">GhiChu, Notes</td></tr>
            </table>
          </div>
        </details>
      </div>

      <!-- Step 2: Preview + xử lý trùng -->
      <div id="importStep2" style="display:none;">
        <!-- Thanh chọn tuần (nếu file không có cột Tuan) -->
        <div style="display:flex;gap:10px;align-items:center;margin-bottom:14px;flex-wrap:wrap;">
          <div style="flex:1;min-width:200px;">
            <label style="font-size:.78rem;font-weight:700;color:var(--text-muted,#6b7280);display:block;margin-bottom:4px;">
              <i class="fa-solid fa-calendar-week" style="color:var(--primary,#0066cc);"></i> Áp dụng cho tuần:
            </label>
            <select id="importWeekSelect" style="
              width:100%;padding:8px 12px;font-size:.88rem;border:1.5px solid var(--border-color,#e5e7eb);
              border-radius:8px;background:var(--input-bg,#fff);color:var(--text-main,#111);outline:none;">
            </select>
          </div>
          <div id="importChiDoanWrap" style="flex:1;min-width:200px;display:none;">
            <label style="font-size:.78rem;font-weight:700;color:var(--text-muted,#6b7280);display:block;margin-bottom:4px;">
              <i class="fa-solid fa-building-flag" style="color:var(--primary,#0066cc);"></i> Chi đoàn:
            </label>
            <select id="importChiDoanSelect" style="
              width:100%;padding:8px 12px;font-size:.88rem;border:1.5px solid var(--border-color,#e5e7eb);
              border-radius:8px;background:var(--input-bg,#fff);color:var(--text-main,#111);outline:none;">
              <option value="__file__">Lấy từ file (cột ChiDoan)</option>
            </select>
          </div>
        </div>

        <!-- Thống kê nhanh -->
        <div id="importStats" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:8px;margin-bottom:14px;"></div>

        <!-- Bảng preview -->
        <div style="border:1px solid var(--border-color,#e5e7eb);border-radius:8px;overflow:hidden;max-height:300px;overflow-y:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:.8rem;" id="importPreviewTable">
            <thead style="position:sticky;top:0;background:var(--bg-main,#f8fafc);z-index:1;">
              <tr>
                <th style="padding:7px 10px;text-align:left;font-weight:700;color:var(--text-muted,#6b7280);border-bottom:1px solid var(--border-color,#e5e7eb);font-size:.72rem;text-transform:uppercase;letter-spacing:.4px;">Họ tên</th>
                <th style="padding:7px 10px;text-align:left;font-weight:700;color:var(--text-muted,#6b7280);border-bottom:1px solid var(--border-color,#e5e7eb);font-size:.72rem;text-transform:uppercase;letter-spacing:.4px;">GT</th>
                <th style="padding:7px 10px;text-align:left;font-weight:700;color:var(--text-muted,#6b7280);border-bottom:1px solid var(--border-color,#e5e7eb);font-size:.72rem;text-transform:uppercase;letter-spacing:.4px;">Năm</th>
                <th style="padding:7px 10px;text-align:left;font-weight:700;color:var(--text-muted,#6b7280);border-bottom:1px solid var(--border-color,#e5e7eb);font-size:.72rem;text-transform:uppercase;letter-spacing:.4px;">Trạng thái</th>
                <th style="padding:7px 10px;text-align:left;font-weight:700;color:var(--text-muted,#6b7280);border-bottom:1px solid var(--border-color,#e5e7eb);font-size:.72rem;text-transform:uppercase;letter-spacing:.4px;">Trùng?</th>
                <th style="padding:7px 10px;text-align:center;font-weight:700;color:var(--text-muted,#6b7280);border-bottom:1px solid var(--border-color,#e5e7eb);font-size:.72rem;text-transform:uppercase;letter-spacing:.4px;">Xử lý</th>
              </tr>
            </thead>
            <tbody id="importPreviewBody"></tbody>
          </table>
        </div>

        <!-- Ghi chú nếu có trùng -->
        <div id="importDupNote" style="display:none;margin-top:10px;padding:10px 14px;
          background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.3);border-radius:8px;
          font-size:.79rem;color:#92400e;display:flex;align-items:flex-start;gap:8px;">
          <i class="fa-solid fa-triangle-exclamation" style="margin-top:2px;flex-shrink:0;"></i>
          <span>Có đoàn viên <b>trùng tên</b> trong tuần này. Chọn <b>Ghi đè</b> để cập nhật trạng thái mới, hoặc <b>Bỏ qua</b> để giữ dữ liệu cũ.</span>
        </div>
      </div>

      <!-- Error box -->
      <div id="importError" style="display:none;margin-top:12px;padding:10px 14px;
        background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25);border-radius:8px;
        font-size:.82rem;color:#dc2626;display:flex;align-items:center;gap:8px;">
        <i class="fa-solid fa-circle-xmark"></i>
        <span id="importErrorMsg"></span>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding:14px 24px 18px;border-top:1px solid var(--border-color,#e5e7eb);
      background:var(--bg-main,#f8fafc);display:flex;justify-content:space-between;
      align-items:center;gap:10px;flex-shrink:0;flex-wrap:wrap;">
      <button id="importBtnBack" style="display:none;
        background:var(--bg-card,#fff);border:1px solid var(--border-color,#e5e7eb);
        border-radius:8px;padding:8px 16px;font-size:.85rem;font-weight:600;
        cursor:pointer;color:var(--text-muted,#6b7280);display:none;align-items:center;gap:6px;">
        <i class="fa-solid fa-arrow-left"></i> Chọn lại file
      </button>
      <div style="display:flex;gap:8px;margin-left:auto;">
        <button id="importBtnCancel" style="
          background:var(--bg-card,#fff);border:1px solid var(--border-color,#e5e7eb);
          border-radius:8px;padding:8px 18px;font-size:.85rem;font-weight:600;
          cursor:pointer;color:var(--text-muted,#6b7280);">Đóng</button>
        <button id="importBtnConfirm" style="display:none;
          background:linear-gradient(135deg,#0066cc,#3b82f6);color:#fff;border:none;
          border-radius:8px;padding:8px 22px;font-size:.85rem;font-weight:700;
          cursor:pointer;box-shadow:0 4px 14px rgba(0,102,204,.25);
          display:none;align-items:center;gap:7px;">
          <i class="fa-solid fa-circle-check"></i> Xác nhận Import
        </button>
      </div>
    </div>
  </div>
</div>`;

  // ── Khởi tạo chức năng import ─────────────────────────────────────────────

  window.initImportAttendance = function () {
    // Inject modal vào DOM
    if (!document.getElementById('importModal')) {
      document.body.insertAdjacentHTML('beforeend', MODAL_HTML);
    }

    const modal      = document.getElementById('importModal');
    const card       = document.getElementById('importCard');
    const step1      = document.getElementById('importStep1');
    const step2      = document.getElementById('importStep2');
    const previewBody = document.getElementById('importPreviewBody');
    const statsEl    = document.getElementById('importStats');
    const weekSel    = document.getElementById('importWeekSelect');
    const cdWrap     = document.getElementById('importChiDoanWrap');
    const cdSel      = document.getElementById('importChiDoanSelect');
    const errorBox   = document.getElementById('importError');
    const errorMsg   = document.getElementById('importErrorMsg');
    const dupNote    = document.getElementById('importDupNote');
    const btnConfirm = document.getElementById('importBtnConfirm');
    const btnBack    = document.getElementById('importBtnBack');

    let parsedRecords = []; // records từ file
    let decisionMap   = {}; // { index: 'overwrite' | 'skip' } cho trùng

    // ── Mở / đóng modal ──

    function openModal() {
      // Populate week selector từ WEEKLY_ACTIVITIES
      weekSel.innerHTML = '';
      const acts = (typeof WEEKLY_ACTIVITIES !== 'undefined' ? WEEKLY_ACTIVITIES : []);
      if (acts.length) {
        acts.forEach(w => {
          const o = document.createElement('option');
          o.value = `Tuần ${w.week}`;
          o.textContent = `Tuần ${w.week} — ${w.title}`;
          weekSel.appendChild(o);
        });
      } else {
        for (let i = 1; i <= 10; i++) {
          const o = document.createElement('option');
          o.value = `Tuần ${i}`;
          o.textContent = `Tuần ${i}`;
          weekSel.appendChild(o);
        }
      }

      // Hiện chi đoàn select cho Admin
      const user = getUser();
      if (user && user.quyen === 'Admin') {
        cdWrap.style.display = '';
        // Thêm danh sách chi đoàn nếu có
        if (typeof LIST_CHI_DOAN !== 'undefined') {
          cdSel.innerHTML = '<option value="__file__">Lấy từ file (cột ChiDoan)</option>';
          LIST_CHI_DOAN.forEach(cd => {
            const o = document.createElement('option');
            o.value = cd;
            o.textContent = cd;
            cdSel.appendChild(o);
          });
        }
      } else {
        cdWrap.style.display = 'none';
      }

      showError('');
      goStep1();
      modal.style.opacity = '0';
      modal.style.pointerEvents = 'auto';
      requestAnimationFrame(() => {
        modal.style.opacity = '1';
        card.style.transform = 'translateY(0) scale(1)';
      });
    }

    function closeModal() {
      modal.style.opacity = '0';
      card.style.transform = 'translateY(24px) scale(.97)';
      setTimeout(() => { modal.style.pointerEvents = 'none'; }, 250);
    }

    function goStep1() {
      step1.style.display = '';
      step2.style.display = 'none';
      btnConfirm.style.display = 'none';
      btnBack.style.display = 'none';
      parsedRecords = [];
      decisionMap = {};
    }

    function goStep2() {
      step1.style.display = 'none';
      step2.style.display = '';
      btnBack.style.display = 'inline-flex';
      btnConfirm.style.display = 'inline-flex';
    }

    // ── Hiện lỗi ──

    function showError(msg) {
      if (!msg) { errorBox.style.display = 'none'; return; }
      errorMsg.textContent = msg;
      errorBox.style.display = 'flex';
    }

    // ── Tính trùng ──

    function getRosterKey() {
      try {
        const u = getUser();
        if (!u) return 'att_roster_v4';
        if (u.quyen === 'Admin') return 'att_roster_v4_admin';
        return 'att_roster_v4_' + btoa(encodeURIComponent(u.chiDoan)).replace(/=/g, '');
      } catch { return 'att_roster_v4'; }
    }

    function getExistingNames(weekLabel) {
      // Đọc từ localStorage rosterData (cùng key với attendance.html)
      try {
        const stored = localStorage.getItem(getRosterKey());
        if (!stored) return new Set();
        const rData = JSON.parse(stored);
        const weekIdx = parseInt(weekLabel.replace('Tuần ', '')) - 1;
        return new Set(
          rData.filter(r => r.attendance && r.attendance[weekIdx] !== undefined && r.attendance[weekIdx] !== '')
            .map(r => r.name.toLowerCase())
        );
      } catch { return new Set(); }
    }

    // ── Render preview ──

    function renderPreview() {
      const week = weekSel.value;
      const existing = getExistingNames(week);
      let p = 0, e = 0, u = 0, dup = 0;

      previewBody.innerHTML = '';
      decisionMap = {};
      let hasDup = false;

      parsedRecords.forEach((rec, idx) => {
        const isDup = existing.has(rec.hoTen.toLowerCase());
        if (isDup) { hasDup = true; dup++; decisionMap[idx] = 'overwrite'; }

        const s = rec.trangThai;
        if (s === 'Có mặt') p++;
        else if (s === 'Vắng có phép') e++;
        else u++;

        const sColor = s === 'Có mặt' ? '#dcfce7' : s === 'Vắng có phép' ? '#fef9c3' : '#fee2e2';
        const sText  = s === 'Có mặt' ? '#166534' : s === 'Vắng có phép' ? '#854d0e' : '#991b1b';

        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--border-color,#e5e7eb)';
        tr.innerHTML = `
          <td style="padding:7px 10px;font-weight:600;color:var(--text-main,#111);">${rec.hoTen}</td>
          <td style="padding:7px 10px;color:var(--text-muted,#6b7280);font-size:.78rem;">${rec.gioiTinh || '—'}</td>
          <td style="padding:7px 10px;color:var(--text-muted,#6b7280);font-size:.78rem;">${rec.namSinh || '—'}</td>
          <td style="padding:7px 10px;">
            <span style="display:inline-block;padding:2px 9px;border-radius:12px;font-size:.74rem;font-weight:700;background:${sColor};color:${sText};">${s}</span>
          </td>
          <td style="padding:7px 10px;">
            ${isDup
              ? `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:10px;font-size:.73rem;font-weight:700;background:#fef3c7;color:#92400e;">
                  <i class="fa-solid fa-triangle-exclamation" style="font-size:.65rem;"></i> Đã có
                </span>`
              : `<span style="color:#10b981;font-size:.78rem;"><i class="fa-solid fa-circle-check"></i> Mới</span>`
            }
          </td>
          <td style="padding:7px 10px;text-align:center;">
            ${isDup
              ? `<select data-idx="${idx}" class="dup-action-sel" style="
                  font-size:.75rem;padding:3px 8px;border:1px solid var(--border-color,#e5e7eb);
                  border-radius:6px;background:var(--bg-card,#fff);color:var(--text-main,#111);cursor:pointer;outline:none;">
                  <option value="overwrite" selected>Ghi đè</option>
                  <option value="skip">Bỏ qua</option>
                </select>`
              : `<span style="color:var(--text-muted,#6b7280);font-size:.75rem;">—</span>`
            }
          </td>
        `;
        previewBody.appendChild(tr);
      });

      // Bind dup select
      previewBody.querySelectorAll('.dup-action-sel').forEach(sel => {
        sel.addEventListener('change', () => { decisionMap[parseInt(sel.dataset.idx)] = sel.value; });
      });

      // Stats
      const total = parsedRecords.length;
      statsEl.innerHTML = `
        <div style="background:var(--bg-card,#fff);border:1px solid var(--border-color,#e5e7eb);border-radius:8px;padding:10px 14px;border-left:3px solid #0066cc;">
          <div style="font-size:.7rem;color:var(--text-muted,#6b7280);font-weight:700;text-transform:uppercase;letter-spacing:.5px;">Tổng</div>
          <div style="font-size:1.6rem;font-weight:800;color:#0066cc;">${total}</div>
        </div>
        <div style="background:var(--bg-card,#fff);border:1px solid var(--border-color,#e5e7eb);border-radius:8px;padding:10px 14px;border-left:3px solid #10b981;">
          <div style="font-size:.7rem;color:var(--text-muted,#6b7280);font-weight:700;text-transform:uppercase;letter-spacing:.5px;">Có mặt</div>
          <div style="font-size:1.6rem;font-weight:800;color:#10b981;">${p}</div>
        </div>
        <div style="background:var(--bg-card,#fff);border:1px solid var(--border-color,#e5e7eb);border-radius:8px;padding:10px 14px;border-left:3px solid #f59e0b;">
          <div style="font-size:.7rem;color:var(--text-muted,#6b7280);font-weight:700;text-transform:uppercase;letter-spacing:.5px;">Vắng phép</div>
          <div style="font-size:1.6rem;font-weight:800;color:#d97706;">${e}</div>
        </div>
        <div style="background:var(--bg-card,#fff);border:1px solid var(--border-color,#e5e7eb);border-radius:8px;padding:10px 14px;border-left:3px solid #ef4444;">
          <div style="font-size:.7rem;color:var(--text-muted,#6b7280);font-weight:700;text-transform:uppercase;letter-spacing:.5px;">Vắng K/P</div>
          <div style="font-size:1.6rem;font-weight:800;color:#dc2626;">${u}</div>
        </div>
        ${dup ? `<div style="background:var(--bg-card,#fff);border:1px solid var(--border-color,#e5e7eb);border-radius:8px;padding:10px 14px;border-left:3px solid #f59e0b;">
          <div style="font-size:.7rem;color:var(--text-muted,#6b7280);font-weight:700;text-transform:uppercase;letter-spacing:.5px;">Trùng tên</div>
          <div style="font-size:1.6rem;font-weight:800;color:#d97706;">${dup}</div>
        </div>` : ''}
      `;

      dupNote.style.display = hasDup ? 'flex' : 'none';
    }

    weekSel.addEventListener('change', () => { if (parsedRecords.length) renderPreview(); });

    // ── Xác nhận import ──

    btnConfirm.addEventListener('click', () => {
      const user = getUser();
      if (!user) return;

      const week = weekSel.value;
      const weekIdx = parseInt(week.replace('Tuần ', '')) - 1;

      // Xác định chiDoan override
      const adminOverride = (user.quyen === 'Admin' && cdSel.value !== '__file__') ? cdSel.value : null;

      // Đọc rosterData từ localStorage
      let rData = [];
      try {
        const stored = localStorage.getItem(getRosterKey());
        if (stored) rData = JSON.parse(stored);
      } catch { rData = []; }

      // Đảm bảo weekCount đủ
      const weekCount = (typeof WEEKLY_ACTIVITIES !== 'undefined' && WEEKLY_ACTIVITIES.length) ? WEEKLY_ACTIVITIES.length : 10;
      rData.forEach(r => { while (r.attendance.length < weekCount) r.attendance.push(''); });

      const STATUS_MAP = { 'Có mặt': 'present', 'Vắng có phép': 'excused', 'Vắng không phép': 'unexcused' };

      let added = 0, updated = 0, skipped = 0;
      let nextId = rData.length ? Math.max(...rData.map(x => x.id), 0) + 1 : 1;

      parsedRecords.forEach((rec, idx) => {
        const action = decisionMap[idx]; // 'overwrite' | 'skip' | undefined (new)
        const chiDoan = adminOverride || rec.chiDoan || (user.quyen !== 'Admin' ? user.chiDoan : '');
        const statusKey = STATUS_MAP[rec.trangThai] || '';

        const existing = rData.find(r => r.name.toLowerCase() === rec.hoTen.toLowerCase()
          && (!r.group || r.group === chiDoan || user.quyen === 'Admin'));

        if (existing) {
          if (action === 'skip') { skipped++; return; }
          // Ghi đè
          existing.attendance[weekIdx] = statusKey;
          if (rec.gioiTinh) existing.gioiTinh = rec.gioiTinh;
          if (rec.namSinh)  existing.namSinh  = rec.namSinh;
          if (rec.donVi)    existing.donVi    = rec.donVi;
          if (rec.ghiChu)   existing.notes    = rec.ghiChu;
          updated++;
        } else {
          // Thêm mới
          const att = Array(weekCount).fill('');
          att[weekIdx] = statusKey;
          rData.push({
            id: nextId++,
            name: rec.hoTen,
            group: chiDoan,
            notes: rec.ghiChu || '',
            gioiTinh: rec.gioiTinh || '',
            namSinh: rec.namSinh || '',
            donVi: rec.donVi || '',
            attendance: att,
          });
          added++;
        }
      });

      // Lưu lại localStorage
      localStorage.setItem(getRosterKey(), JSON.stringify(rData));

      // Đồng bộ lên server (dùng saveWeeklyRoster có sẵn)
      const apiUrl = (typeof CONFIG_API_URL !== 'undefined') ? CONFIG_API_URL : '';
      if (apiUrl) {
        const rowsToSend = rData
          .filter(r => !adminOverride || r.group === adminOverride)
          .map(r => {
            const S = { present: 'Có mặt', excused: 'Vắng có phép', unexcused: 'Vắng không phép' };
            return {
              hoTen: r.name,
              gioiTinh: r.gioiTinh || '',
              namSinh: r.namSinh || '',
              donVi: r.donVi || '',
              trangThai: S[r.attendance[weekIdx]] || 'Chưa điểm danh',
              ghiChu: r.notes || '',
            };
          });

        const sendChiDoan = adminOverride || user.chiDoan;
        fetch(apiUrl, {
          method: 'POST', mode: 'cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: 'saveWeeklyRoster', week, chiDoan: sendChiDoan, rows: rowsToSend }),
        })
          .then(r => r.json())
          .then(res => {
            if (res.success) {
              if (typeof showToast === 'function') showToast(`Import thành công! +${added} mới, ${updated} cập nhật, ${skipped} bỏ qua. Đã lưu lên Sheets ✓`);
            } else {
              if (typeof showToast === 'function') showToast(`Đã lưu cục bộ. Lỗi Sheets: ${res.error}`, 'error');
            }
          })
          .catch(() => {
            if (typeof showToast === 'function') showToast(`Đã lưu offline. +${added} mới, ${updated} cập nhật.`, 'error');
          });
      } else {
        if (typeof showToast === 'function') showToast(`Import thành công (offline)! +${added} mới, ${updated} cập nhật, ${skipped} bỏ qua.`);
      }

      // Trigger re-render attendance widget nếu đang ở trang attendance
      if (typeof window.initBulkWeeklyAttendance === 'function') {
        // attendance.html dùng rosterData riêng — cần reload widget
        setTimeout(() => {
          if (typeof window._reloadAttWidget === 'function') window._reloadAttWidget();
        }, 300);
      }

      closeModal();
    });

    // ── Đọc file ──

    const fileInput = document.getElementById('importFileInput');
    fileInput.addEventListener('change', async function () {
      const file = this.files && this.files[0];
      if (!file) return;
      showError('');
      btnConfirm.style.display = 'none';

      try {
        const rawRows = await readFile(file);
        parsedRecords = rowsToRecords(rawRows);
        // Nếu file có cột Tuan → set weekSel
        const firstTuan = parsedRecords.find(r => r.tuan)?.tuan;
        if (firstTuan) {
          const opt = [...weekSel.options].find(o => o.value === firstTuan);
          if (opt) weekSel.value = firstTuan;
        }
        renderPreview();
        goStep2();
      } catch (err) {
        showError(err.message || 'Lỗi đọc file');
        this.value = '';
      }
    });

    // ── Event listeners ──

    document.getElementById('importBtnTemplate').addEventListener('click', downloadTemplate);
    document.getElementById('importModalClose').addEventListener('click', closeModal);
    document.getElementById('importBtnCancel').addEventListener('click', closeModal);
    btnBack.addEventListener('click', goStep1);
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

    // Expose open fn
    window.openImportModal = openModal;

    // ── Nút trigger trong attendance.html ──
    const trigger = document.getElementById('attBtnImport');
    if (trigger) trigger.addEventListener('click', openModal);
  };

  // ── Expose reload helper cho attendance widget ─────────────────────────────
  // attendance.html sẽ gán window._reloadAttWidget = () => { reinitWidget(); }

})();
