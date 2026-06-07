/**
 * ==========================================================================
 * HƯỚNG DẪN THIẾT LẬP GOOGLE SHEETS & GOOGLE APPS SCRIPT
 * ==========================================================================
 * 
 * BƯỚC 1: Tạo một file Google Sheets mới (Ví dụ đặt tên là: "CSDL Sinh Hoạt Hè 2026")
 * BƯỚC 2: Vào menu mở rộng -> Chọn "Apps Script" (Tiện ích mở rộng -> Apps Script)
 * BƯỚC 3: Xóa sạch code mặc định, copy toàn bộ nội dung file này và paste vào đó.
 * BƯỚC 4: Nhấn nút Save (Ctrl + S).
 * BƯỚC 5: Chạy hàm "setupDatabase" một lần duy nhất để khởi tạo CSDL.
 *         - Google sẽ yêu cầu Ủy quyền truy cập (Authorization Required).
 *         - Nhấn "Xem quyền sử dụng" -> Chọn tài khoản Google -> "Nâng cao" (Advanced)
 *           -> "Đi tới Dự án không an toàn" -> "Cho phép" (Allow).
 *         - Hàm tự tạo 4 Sheets: "TaiKhoan", "DanhSachDoanVien", "DiemDanh", "HinhAnh"
 *           kèm dữ liệu mẫu và 77 Chi đoàn với mật khẩu mặc định "123456".
 * BƯỚC 6: Triển khai thành API Web App:
 *         - Nhấn "Triển khai" (Deploy) -> "Triển khai mới" (New deployment).
 *         - Loại cấu hình: "Ứng dụng web" (Web app).
 *         - "Thực thi dưới dạng": Chọn "Tôi" (Me).
 *         - "Ai có quyền truy cập": Chọn "Bất kỳ ai" (Anyone).
 *         - Nhấn "Triển khai" -> Copy URL dạng: https://script.google.com/macros/s/xxx/exec
 *         - Paste URL này vào CONFIG_API_URL trong file app.js.
 * 
 * ⚠️  LƯU Ý VỀ HÌNH ẢNH:
 *         - Tính năng upload ảnh lên Google Drive yêu cầu quyền DriveApp.
 *         - Ảnh sẽ được lưu vào thư mục "SinhHoatHe2026_Gallery" trên Drive của bạn.
 *         - Kích thước ảnh tối đa khuyến nghị: dưới 5MB/ảnh.
 *         - Sau khi upload, ảnh tự động được chia sẻ public (Anyone with link can view).
 */

// ============================================================
// ĐỊNH NGHĨA CẤU TRÚC CÁC SHEET
// ============================================================
const SHEET_ACCOUNTS = "TaiKhoan";
const SHEET_MEMBERS = "DanhSachDoanVien";
const SHEET_ATTENDANCE = "DiemDanh";
const SHEET_GALLERY = "HinhAnh";  // Sheet lưu thông tin ảnh Drive
const SHEET_WEEKS = "HoatDongTuan"; // Sheet lưu lịch trình sinh hoạt hè
const SHEET_EXTRA_EVENTS = "HoatDongBoSung";
const SHEET_EVENT_REG = "DangKySuKien";
const SHEET_WEEKLY_ROSTER = "BangTuan";

// Tên thư mục lưu ảnh trên Google Drive
const DRIVE_FOLDER_NAME = "SinhHoatHe2026_Gallery";

// Danh sách các Chi đoàn để khởi tạo CSDL tài khoản ban đầu
const LIST_CHI_DOAN = [
  "Chi đoàn TDP Đồi Dinh",
  "Chi đoàn TDP Nguyễn Văn Trỗi.",
  "Chi đoàn TDP Phan Bội Châu.",
  "Chi đoàn TDP Đoàn Kết.",
  "Chi đoàn TDP Hòa Bình.",
  "Chi đoàn TDP Nam Kỳ Khởi Nghĩa.",
  "Chi đoàn TDP Ánh Sáng.",
  "Chi đoàn TDP Đa Hòa.",
  "Chi đoàn TDP Mimosa.",
  "Chi đoàn TDP Hàm Nghi.",
  "Chi đoàn TDP Trưng Vương.",
  "Chi đoàn TDP Bùi Thị Xuân 1.",
  "Chi đoàn TDP Lý Tự Trọng.",
  "Chi đoàn TDP Võ Thị Sáu.",
  "Chi đoàn TDP Nguyễn Thị Nghĩa.",
  "Chi đoàn TDP Bùi Thị Xuân 2.",
  "Chi đoàn TDP Tô Ngọc Vân.",
  "Chi đoàn TDP Phan Đình Phùng 1.",
  "Chi đoàn TDP Phan Đình Phùng 2.",
  "Chi đoàn TDP Nguyễn Công Trứ.",
  "Chi đoàn TDP An Dương Vương.",
  "Chi đoàn TDP Mỹ Lộc.",
  "Chi đoàn TDP Cổ Loa.",
  "Chi đoàn TDP Nguyễn Lương Bằng.",
  "Chi đoàn TDP Nguyễn Du.",
  "Chi đoàn TDP Phạm Ngũ Lão.",
  "Chi đoàn TDP Lê Đại Hành.",
  "Chi đoàn TDP Trần Phú.",
  "Chi đoàn TDP Suối Cát.",
  "Chi đoàn TDP Xuân An.",
  "Chi đoàn TDP Nhà Chung.",
  "Chi đoàn TDP Hà Huy Tập 1.",
  "Chi đoàn TDP Tân Bình.",
  "Chi đoàn TDP Hà Huy Tập 2.",
  "Chi đoàn TDP Lương Thế Vinh.",
  "Chi đoàn TDP Ba Tháng Tư.",
  "Chi đoàn TDP Đặng Thái Thân.",
  "Chi đoàn TDP Nguyễn Tri Phương.",
  "Chi đoàn TDP Nguyễn Trung Trực 2",
  "Chi đoàn TDP An Bình 1",
  "Chi đoàn TDP An Bình 2",
  "Chi đoàn TDP Tô Hiến Thành.",
  "Chi đoàn TDP Tân Lạc",
  "Chi đoàn TDP Prenn.",
  "Chi đoàn TDP Trường Chinh.",
  "Chi đoàn TDP Thiên Thành.",
  "Chi đoàn TDP Mạc Đỉnh Chi 1.",
  "Chi đoàn TDP Mạc Đỉnh Chi 2.",
  "Chi đoàn TDP Trần Lê.",
  "Chi đoàn TDP Thiện Mỹ.",
  "Chi đoàn TDP Đồng Thiện",
  "Chi đoàn Thanh niên Ngô Thì Nhậm",
  "Chi đoàn TDP Nam Thiên.",
  "Chi đoàn TDP Huyền Trân Công Chúa.",
  "Chi đoàn TDP Ngô Thì Sỹ",
  "Chi đoàn TDP Lê Hồng Phong.",
  "Chi đoàn TDP Huỳnh Thúc Kháng.",
  "Chi đoàn TDP An Lạc 1.",
  "Chi đoàn TDP An Lạc 2.",
  "Chi đoàn TDP Nguyễn Trung Trực 1.",
  "Chi đoàn TDP An Sơn 1.",
  "Chi đoàn TDP An Sơn 2.",
  "Chi đoàn TDP Trần Thái Tông.",
  "Chi đoàn TDP Yên Thế.",
  "Chi đoàn TDP Hoàng Hoa Thám.",
  "Chi đoàn TDP Đa Lợi.",
  "Chi đoàn TDP Lê Văn Tám.",
  "Chi đoàn TDP Khe Sanh.",
  "Chi đoàn TDP Sở Lăng.",
  "Chi đoàn TDP Trần Quý Cáp",
  "Chi đoàn TDP Hồng Lạc",
  "Chi đoàn TDP Phạm Hồng Thái",
  "Chi đoàn TDP Trần Hưng Đạo",
  "Chi đoàn TDP Khởi Nghĩa Bắc Sơn",
  "Chi đoàn TDP Nhất Thống",
  "Chi đoàn TDP Yersin",
  "Chi đoàn TDP Trần Quang Diệu"
];

// ============================================================
// KHỞI TẠO CƠ SỞ DỮ LIỆU
// ============================================================
function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Sheet Tài khoản
  let sheetAcc = ss.getSheetByName(SHEET_ACCOUNTS);
  if (!sheetAcc) { sheetAcc = ss.insertSheet(SHEET_ACCOUNTS); } else { sheetAcc.clear(); }
  sheetAcc.appendRow(["ChiDoan", "MatKhau", "Quyen"]);
  LIST_CHI_DOAN.forEach(function (chidoan) {
    sheetAcc.appendRow([chidoan, "123456", "User"]);
  });
  sheetAcc.appendRow(["Ban Chỉ Đạo Hè Phường", "admin123", "Admin"]);

  // 2. Sheet Danh sách Đoàn viên
  let sheetMem = ss.getSheetByName(SHEET_MEMBERS);
  if (!sheetMem) { sheetMem = ss.insertSheet(SHEET_MEMBERS); } else { sheetMem.clear(); }
  sheetMem.appendRow(["ID", "HoTen", "ChiDoan", "NgaySinh", "SDT"]);
  sheetMem.appendRow(["MEM_001", "Nguyễn Văn An", "Chi đoàn TDP Nguyễn Trung Trực 2", "2008-05-15", "0912345678"]);
  sheetMem.appendRow(["MEM_002", "Trần Thị Bình", "Chi đoàn TDP Nguyễn Trung Trực 2", "2009-08-20", "0987654321"]);
  sheetMem.appendRow(["MEM_003", "Lê Hoàng Châu", "Chi đoàn TDP Nguyễn Trung Trực 2", "2008-12-10", "0905123456"]);
  sheetMem.appendRow(["MEM_004", "Phạm Minh Đức", "Chi đoàn TDP Nguyễn Văn Trỗi.", "2008-03-05", "0934567890"]);
  sheetMem.appendRow(["MEM_005", "Vũ Thu Hà", "Chi đoàn TDP Nguyễn Văn Trỗi.", "2009-11-22", "0945678901"]);

  // 3. Sheet Điểm danh
  let sheetAtt = ss.getSheetByName(SHEET_ATTENDANCE);
  if (!sheetAtt) { sheetAtt = ss.insertSheet(SHEET_ATTENDANCE); } else { sheetAtt.clear(); }
  sheetAtt.appendRow(["ID", "Ngay", "Tuan", "HoTen", "ChiDoan", "TrangThai", "GhiChu"]);
  sheetAtt.appendRow(["ATT_001", "2026-06-01", "Tuần 1", "Nguyễn Văn An", "Chi đoàn TDP Nguyễn Trung Trực 2", "Có mặt", "Đi đúng giờ"]);
  sheetAtt.appendRow(["ATT_002", "2026-06-01", "Tuần 1", "Trần Thị Bình", "Chi đoàn TDP Nguyễn Trung Trực 2", "Có mặt", "Hào hứng"]);
  sheetAtt.appendRow(["ATT_003", "2026-06-01", "Tuần 1", "Lê Hoàng Châu", "Chi đoàn TDP Nguyễn Trung Trực 2", "Vắng có phép", "Bị ốm nhẹ"]);
  sheetAtt.appendRow(["ATT_004", "2026-06-08", "Tuần 2", "Nguyễn Văn An", "Chi đoàn TDP Nguyễn Trung Trực 2", "Có mặt", "Học bơi tích cực"]);
  sheetAtt.appendRow(["ATT_005", "2026-06-08", "Tuần 2", "Phạm Minh Đức", "Chi đoàn TDP Nguyễn Văn Trỗi.", "Có mặt", "Nhiệt tình"]);
  sheetAtt.appendRow(["ATT_006", "2026-06-08", "Tuần 2", "Vũ Thu Hà", "Chi đoàn TDP Nguyễn Văn Trỗi.", "Vắng không phép", ""]);

  // 4. Sheet Hình ảnh Gallery (MỚI)
  let sheetGal = ss.getSheetByName(SHEET_GALLERY);
  if (!sheetGal) { sheetGal = ss.insertSheet(SHEET_GALLERY); } else { sheetGal.clear(); }
  // Cột: ID | URL | Title | Category | ChiDoan | NgayUp | DriveFileId | Tuan
  sheetGal.appendRow(["ID", "URL", "Title", "Category", "ChiDoan", "NgayUp", "DriveFileId", "Tuan"]);

  // 5. Sheet Hoạt Động Bổ Sung
  let sheetExtra = ss.getSheetByName(SHEET_EXTRA_EVENTS);
  if (!sheetExtra) { sheetExtra = ss.insertSheet(SHEET_EXTRA_EVENTS); } else { sheetExtra.clear(); }
  sheetExtra.appendRow(["ID", "Ten", "MoTa", "BatDau", "KetThuc", "DiaDiem", "GioiHan", "TaoBoi", "NgayTao", "TrangThai"]);

  // 6. Sheet Đăng Ký Sự Kiện
  let sheetReg = ss.getSheetByName(SHEET_EVENT_REG);
  if (!sheetReg) { sheetReg = ss.insertSheet(SHEET_EVENT_REG); } else { sheetReg.clear(); }
  sheetReg.appendRow(["ID", "EventID", "HoTen", "SDT", "ChiDoan", "GhiChu", "Nguon", "NgayDK"]);

  // 7. Sheet Điểm Danh Bảng Tuần (nhập nhanh)
  let sheetRoster = ss.getSheetByName(SHEET_WEEKLY_ROSTER);
  if (!sheetRoster) { sheetRoster = ss.insertSheet(SHEET_WEEKLY_ROSTER); } else { sheetRoster.clear(); }
  sheetRoster.appendRow(["ID", "Tuan", "ChiDoan", "HoTen", "GioiTinh", "NamSinh", "DonVi", "TrangThai", "GhiChu", "NgayCapNhat"]);

  // 8. Sheet Hoạt Động Tuần
  let sheetWeeks = ss.getSheetByName(SHEET_WEEKS);
  if (!sheetWeeks) { sheetWeeks = ss.insertSheet(SHEET_WEEKS); } else { sheetWeeks.clear(); }
  sheetWeeks.appendRow(["Tuan", "TieuDe", "ThoiGian", "MoTa", "Nhan", "LichTrinh_JSON"]);

  sheetWeeks.appendRow([1, "Khai Mạc Hè Phường & Tiếp Nhận Đoàn Viên", "07/06 - 20/06",
    "Lễ khai mạc sinh hoạt hè toàn phường, thành lập BCĐ hè tổ dân phố, tiếp nhận đoàn viên – học sinh về sinh hoạt hè tại các chi đoàn.",
    "khai mạc, kỹ năng",
    JSON.stringify([
      { day: "07/06", activity: "Tham gia Lễ Khai mạc hè cấp phường (dự kiến tại Quảng trường)." },
      { day: "Trước 20/06", activity: "Các tổ dân phố tổ chức Khai mạc hè tại địa phương, thông báo lịch về BCĐ hè phường." },
      { day: "Cả tuần", activity: "BCĐ hè TDP thành lập Ban Điều hành hè; các Chi đoàn tiếp nhận đoàn viên, học sinh về tham gia sinh hoạt hè." }
    ])]);

  sheetWeeks.appendRow([2, "Tiếp Sức Mùa Thi & Khởi Động Chiến Dịch Tình Nguyện Hè", "10/06 - 13/06",
    "Hỗ trợ tiếp sức mùa thi 2026, triển khai chiến dịch 'Tình nguyện hè', 'Hoa phượng đỏ', 'Hành quân xanh' năm 2026 của tỉnh.",
    "tình nguyện",
    JSON.stringify([
      { day: "10/06 - 13/06", activity: "Cử lực lượng Đoàn viên Thanh niên tham gia hỗ trợ tiếp sức mùa thi theo phân bổ của Đoàn phường." },
      { day: "Cả tuần", activity: "Phát động và triển khai chiến dịch 'Tình nguyện hè', 'Hoa phượng đỏ', 'Hành quân xanh' phối hợp các đơn vị ĐH, CĐ." }
    ])]);

  sheetWeeks.appendRow([3, "Tháng Hành Động Vì Trẻ Em & Ra Quân Tình Nguyện", "21/06 - 30/06",
    "Tổ chức các hoạt động trong Tháng hành động vì trẻ em; thành lập Đội hình thanh niên tình nguyện tại chỗ; tuyên truyền phòng chống đuối nước, giáo dục giới tính, sức khỏe sinh sản vị thành niên.",
    "tình nguyện, kỹ năng, sức khỏe",
    JSON.stringify([
      { day: "Thứ 2", activity: "Ra quân vệ sinh môi trường, cạo xóa quảng cáo sai quy định, hướng dẫn đăng ký định danh điện tử VNeID." },
      { day: "Thứ 4", activity: "Mời cán bộ TTDS-KHHGĐ nói chuyện chuyên đề Giáo dục giới tính, SKSS vị thành niên, phòng chống dịch bệnh mùa hè." },
      { day: "Thứ 7", activity: "Tuyên truyền phòng chống đuối nước; tổ chức các trò chơi tập thể sinh hoạt tại tổ dân phố." }
    ])]);

  sheetWeeks.appendRow([4, "Đối Thoại Lãnh Đạo với thanh niên", "01/07 - 09/07",
    "Tổ chức Đối thoại giữa lãnh đạo UBND với Thanh niên địa phương; BCĐ hè TDP tổ chức sinh hoạt theo chương trình của tổ dân phố.",
    "đối thoại, sinh hoạt",
    JSON.stringify([
      { day: "01/07 - 09/07", activity: "Tham gia 'Đối thoại giữa lãnh đạo UBND với Thanh niên địa phương' – hoạt động tập trung toàn phường." },
      { day: "Cả tuần", activity: "BCĐ hè TDP tổ chức sinh hoạt theo chương trình của tổ dân phố." }
    ])]);

  sheetWeeks.appendRow([5, "Đổi Rác Thải Nhựa Lấy Quà & Trồng Cây Xanh", "10/07 - 11/07",
    "Tổ chức chương trình 'Đổi rác thải nhựa lấy quà tặng'; phát động phong trào trồng hoa, cây xanh tại khuôn viên hội trường tổ.",
    "môi trường, tình nguyện",
    JSON.stringify([
      { day: "10/07 - 11/07", activity: "Đoàn viên Thanh niên tham gia hoạt động 'Đổi rác thải nhựa lấy quà tặng' – hoạt động tập trung toàn phường." },
      { day: "Cả đợt", activity: "Phát động phong trào phần việc thanh niên: đảm nhận trồng hoa, cây xanh tại khuôn viên hội trường tổ dân phố." }
    ])]);

  sheetWeeks.appendRow([6, "Tuyên Truyền Pháp Luật & An Toàn Mạng Xã Hội", "12/07 - 18/07",
    "Tuyên truyền phòng chống xâm hại tình dục, bạo lực, ma túy, tệ nạn xã hội, nghiện game; định hướng an toàn mạng xã hội; Hội thi Rung chuông vàng tìm hiểu kiến thức pháp luật.",
    "pháp luật, kỹ năng, an toàn",
    JSON.stringify([
      { day: "Thứ 2", activity: "Sinh hoạt tập thể, lồng ghép tuyên truyền Luật ATGT, Hiến pháp, phòng chống đuối nước – phối hợp Công an phường." },
      { day: "Thứ 4", activity: "Hướng dẫn ĐVTTN phòng chống xâm hại tình dục, bạo lực học đường, ma túy, HIV/AIDS; định hướng an toàn mạng xã hội." },
      { day: "Thứ 7", activity: "Hội thi Rung chuông vàng tìm hiểu kiến thức pháp luật – huy động ĐVTN toàn phường tham gia." }
    ])]);

  sheetWeeks.appendRow([7, "Uống Nước Nhớ Nguồn – Kỷ Niệm 27/7 & Văn Nghệ Quần Chúng", "19/07 - 31/07",
    "Thăm viếng gia đình chính sách, viếng Nghĩa trang Liệt sĩ nhân ngày Thương binh – Liệt sĩ 27/7; Hội thi Văn nghệ quần chúng tổ dân phố.",
    "tri ân, văn nghệ, tình nguyện",
    JSON.stringify([
      { day: "19/07 - 26/07", activity: "Ra quân vệ sinh môi trường; giới thiệu Hội viên HLHTN tiên tiến cho Đoàn phường kết nạp Đoàn." },
      { day: "27/07", activity: "Tổ chức thăm các gia đình chính sách tại tổ dân phố; tham gia viếng Nghĩa trang Liệt sĩ theo lịch phường." },
      { day: "Cuối tháng 7", activity: "BCĐ hè phối hợp hệ thống chính trị TDP xây dựng tiết mục văn nghệ; tham gia Hội thi Văn nghệ quần chúng tổ dân phố." }
    ])]);

  sheetWeeks.appendRow([8, "Hội Trại Hè – Kỹ Năng Sống & Trò Chơi Lớn", "01/08 - 08/08",
    "Tổ chức Hội trại hè, trò chơi lớn, rèn luyện kỹ năng sống; nhận xét sinh hoạt cho đoàn viên, thanh thiếu nhi; gửi danh sách sinh hoạt về Đoàn phường.",
    "kỹ năng, thể thao, trại hè",
    JSON.stringify([
      { day: "01/08 - 08/08", activity: "Tổ chức Hội trại hè tập trung toàn phường: trò chơi lớn, kỹ năng sinh tồn, giải mật thư, đêm lửa trại." },
      { day: "Cả đợt", activity: "Huy động lực lượng ĐVTN tại tổ dân phố tham gia; nhận xét sinh hoạt và gửi danh sách về Đoàn phường." }
    ])]);

  sheetWeeks.appendRow([9, "Tổng Kết Hè Tổ Dân Phố", "09/08 - 13/08",
    "Các tổ dân phố tiến hành tổng kết hè, khen thưởng cá nhân có thành tích tốt trong hoạt động hè 2026.",
    "tổng kết, khen thưởng",
    JSON.stringify([
      { day: "09/08 - 13/08", activity: "Các TDP tổ chức Tổng kết hè: đánh giá kết quả, khen thưởng cá nhân xuất sắc." },
      { day: "Trước tổng kết ít nhất 1 tuần", activity: "Gửi lịch tổng kết hè TDP về BCĐ hè phường." }
    ])]);

  sheetWeeks.appendRow([10, "Tổng Kết Hè Cấp Phường – Bế Mạc Sinh Hoạt Hè 2026", "14/08",
    "Lễ Tổng kết sinh hoạt hè cấp phường Xuân Hương năm 2026; tuyên dương, khen thưởng tập thể và cá nhân xuất sắc.",
    "tổng kết, khen thưởng, bế mạc",
    JSON.stringify([
      { day: "14/08", activity: "Lễ Tổng kết hè cấp phường: tuyên dương, khen thưởng các tập thể – cá nhân có thành tích xuất sắc trong hoạt động hè 2026." }
    ])]);
  Logger.log("✅ Khởi tạo cơ sở dữ liệu thành công! (TaiKhoan, DanhSachDoanVien, DiemDanh, HinhAnh, HoatDongTuan)");
}

// ============================================================
// XỬ LÝ YÊU CẦU GET (Lấy dữ liệu)
// ============================================================
function doGet(e) {
  try {
    const action = e.parameter.action;
    const chiDoan = e.parameter.chiDoan;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!action) return jsonResponse({ success: false, error: "Thi?u tham s? action" });

    if (action === "getMembers") {
      const sheet = ss.getSheetByName(SHEET_MEMBERS);
      const rows = sheet.getDataRange().getValues();
      const headers = rows[0];
      const out = [];
      for (let i = 1; i < rows.length; i++) {
        if (!chiDoan || chiDoan === "Ban Ch? �?o H� Phu?ng" || rows[i][2] === chiDoan) {
          const item = {}; headers.forEach((h, j) => item[h] = rows[i][j]); out.push(item);
        }
      }
      return jsonResponse({ success: true, data: out });
    }

    if (action === "getAttendance") {
      const sheet = ss.getSheetByName(SHEET_ATTENDANCE);
      const rows = sheet.getDataRange().getValues();
      const headers = rows[0];
      const out = [];
      for (let i = 1; i < rows.length; i++) {
        if (!chiDoan || chiDoan === "Ban Ch? �?o H� Phu?ng" || rows[i][4] === chiDoan) {
          const item = {}; headers.forEach((h, j) => item[h] = rows[i][j]); out.push(item);
        }
      }
      return jsonResponse({ success: true, data: out, total: out.length });
    }

    if (action === "getPhotos") {
      const sheet = ss.getSheetByName(SHEET_GALLERY);
      if (!sheet) return jsonResponse({ success: true, data: [] });
      const rows = sheet.getDataRange().getValues();
      if (rows.length <= 1) return jsonResponse({ success: true, data: [] });
      const headers = rows[0];
      const out = [];
      for (let i = 1; i < rows.length; i++) { if (!rows[i][0]) continue; const item = {}; headers.forEach((h, j) => item[h] = rows[i][j]); out.push(item); }
      return jsonResponse({ success: true, data: out });
    }

    if (action === "getWeeklyActivities") {
      const sheet = ss.getSheetByName(SHEET_WEEKS);
      if (!sheet) return jsonResponse({ success: true, data: [] });
      const rows = sheet.getDataRange().getValues();
      const out = [];
      for (let i = 1; i < rows.length; i++) {
        if (!rows[i][0]) continue;
        out.push({ week: parseInt(rows[i][0]), title: rows[i][1], date: rows[i][2], desc: rows[i][3], tags: String(rows[i][4] || '').split(',').map(t => t.trim()).filter(Boolean), schedule: rows[i][5] ? JSON.parse(rows[i][5]) : [] });
      }
      return jsonResponse({ success: true, data: out });
    }

    if (action === "getExtraEvents") {
      const sheet = ss.getSheetByName(SHEET_EXTRA_EVENTS);
      if (!sheet) return jsonResponse({ success: true, data: [] });
      const rows = sheet.getDataRange().getValues();
      if (rows.length <= 1) return jsonResponse({ success: true, data: [] });
      const headers = rows[0];
      const out = [];
      for (let i = 1; i < rows.length; i++) { if (!rows[i][0]) continue; const item = {}; headers.forEach((h, j) => item[h] = rows[i][j]); out.push(item); }
      return jsonResponse({ success: true, data: out });
    }

    if (action === "getEventRegistrations") {
      const eventId = e.parameter.eventId || "";
      const sheet = ss.getSheetByName(SHEET_EVENT_REG);
      if (!sheet) return jsonResponse({ success: true, data: [] });
      const rows = sheet.getDataRange().getValues();
      if (rows.length <= 1) return jsonResponse({ success: true, data: [] });
      const headers = rows[0];
      const out = [];
      for (let i = 1; i < rows.length; i++) { if (!rows[i][0]) continue; if (eventId && rows[i][1] !== eventId) continue; const item = {}; headers.forEach((h, j) => item[h] = rows[i][j]); out.push(item); }
      return jsonResponse({ success: true, data: out });
    }

    if (action === "getWeeklyRoster") {
      const week = e.parameter.week || "";
      const sheet = ss.getSheetByName(SHEET_WEEKLY_ROSTER);
      if (!sheet) return jsonResponse({ success: true, data: [] });
      const rows = sheet.getDataRange().getValues();
      if (rows.length <= 1) return jsonResponse({ success: true, data: [] });
      const headers = rows[0];
      const out = [];
      for (let i = 1; i < rows.length; i++) { if (!rows[i][0]) continue; if (week && String(rows[i][1]) !== String(week)) continue; const item = {}; headers.forEach((h, j) => item[h] = rows[i][j]); out.push(item); }
      return jsonResponse({ success: true, data: out });
    }

    return jsonResponse({ success: false, error: "H�nh d?ng kh�ng h?p l?" });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!action) return jsonResponse({ success: false, error: "Thi?u tham s? action" });

    if (action === "login") {
      const sheet = ss.getSheetByName(SHEET_ACCOUNTS);
      const rows = sheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === postData.chiDoan && String(rows[i][1]) === String(postData.matKhau)) {
          return jsonResponse({ success: true, data: { chiDoan: rows[i][0], quyen: rows[i][2] } });
        }
      }
      return jsonResponse({ success: false, error: "Sai t�n Chi do�n ho?c m?t kh?u" });
    }

    if (action === "changePassword") {
      const sheet = ss.getSheetByName(SHEET_ACCOUNTS);
      const rows = sheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === postData.chiDoan) { sheet.getRange(i + 1, 2).setValue(postData.matKhauMoi); return jsonResponse({ success: true }); }
      }
      return jsonResponse({ success: false, error: "Kh�ng t�m th?y t�i kho?n" });
    }

    if (action === "addMember") {
      const sheet = ss.getSheetByName(SHEET_MEMBERS);
      const id = "MEM_" + String(new Date().getTime()).substring(5);
      sheet.appendRow([id, postData.hoTen, postData.chiDoan, postData.ngaySinh || "", postData.sdt || ""]);
      return jsonResponse({ success: true, data: { ID: id, HoTen: postData.hoTen, ChiDoan: postData.chiDoan } });
    }

    if (action === "saveAttendance") {
      const sheet = ss.getSheetByName(SHEET_ATTENDANCE);
      const id = "ATT_" + String(new Date().getTime()).substring(5);
      sheet.appendRow([id, postData.ngay, postData.tuan, postData.hoTen, postData.chiDoan, postData.trangThai, postData.ghiChu || ""]);
      return jsonResponse({ success: true, data: { ID: id } });
    }

    if (action === "deleteAttendance") {
      const sheet = ss.getSheetByName(SHEET_ATTENDANCE);
      const rows = sheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === postData.id) { sheet.deleteRow(i + 1); return jsonResponse({ success: true }); }
      }
      return jsonResponse({ success: false, error: "Kh�ng t�m th?y b?n ghi" });
    }

    if (action === "clearHistory") {
      const sheet = ss.getSheetByName(SHEET_ATTENDANCE);
      const rows = sheet.getDataRange().getValues();
      for (let i = rows.length - 1; i >= 1; i--) {
        if (!postData.chiDoan || postData.chiDoan === "Ban Ch? �?o H� Phu?ng" || rows[i][4] === postData.chiDoan) sheet.deleteRow(i + 1);
      }
      return jsonResponse({ success: true });
    }

    if (action === "createExtraEvent") {
      const sheet = ss.getSheetByName(SHEET_EXTRA_EVENTS);
      const id = "EVT_" + String(new Date().getTime()).substring(5);
      const now = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss");
      sheet.appendRow([id, postData.ten, postData.moTa || "", postData.batDau || "", postData.ketThuc || "", postData.diaDiem || "", postData.gioiHan || "", postData.taoBoi || "", now, "OPEN"]);
      return jsonResponse({ success: true, data: { id: id } });
    }

    if (action === "registerEvent") {
      const sheet = ss.getSheetByName(SHEET_EVENT_REG);
      const id = "REG_" + String(new Date().getTime()).substring(5);
      const now = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss");
      sheet.appendRow([id, postData.eventId, postData.hoTen, postData.sdt || "", postData.chiDoan || "", postData.ghiChu || "", postData.nguon || "web", now]);
      return jsonResponse({ success: true, data: { id: id } });
    }

    if (action === "cancelEventRegistration") {
      const sheet = ss.getSheetByName(SHEET_EVENT_REG);
      const rows = sheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][1] === postData.eventId && rows[i][2] === postData.hoTen && String(rows[i][3] || "") === String(postData.sdt || "")) { sheet.deleteRow(i + 1); return jsonResponse({ success: true }); }
      }
      return jsonResponse({ success: false, error: "Kh�ng t�m th?y dang k�" });
    }

    if (action === "saveWeeklyRoster") {
      const week = postData.week;
      const chiDoan = postData.chiDoan;
      const rowsIn = postData.rows || [];
      const sheet = ss.getSheetByName(SHEET_WEEKLY_ROSTER);
      const data = sheet.getDataRange().getValues();
      for (let i = data.length - 1; i >= 1; i--) {
        if (String(data[i][1]) === String(week) && data[i][2] === chiDoan) sheet.deleteRow(i + 1);
      }
      const now = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss");
      rowsIn.forEach(r => {
        const id = "WKR_" + String(new Date().getTime()).substring(5) + Math.floor(Math.random() * 9);
        sheet.appendRow([id, week, chiDoan, r.hoTen || "", r.gioiTinh || "", r.namSinh || "", r.donVi || "", r.trangThai || "C� m?t", r.ghiChu || "", now]);
      });
      return jsonResponse({ success: true });
    }

    if (action === "uploadPhoto") {
      const base64Data = postData.base64Data;
      const fileName = postData.fileName || ("photo_" + Date.now() + ".jpg");
      const title = postData.title || "?nh sinh ho?t h�";
      const category = postData.category || "volunteer";
      const chiDoan = postData.chiDoan || "";
      const mimeType = postData.mimeType || "image/jpeg";
      const week = postData.week || "";
      if (!base64Data) return jsonResponse({ success: false, error: "Thi?u d? li?u ?nh" });
      let folder; const it = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
      if (it.hasNext()) folder = it.next(); else { folder = DriveApp.createFolder(DRIVE_FOLDER_NAME); folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); }
      const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), mimeType, fileName);
      const file = folder.createFile(blob); file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      const fileId = file.getId();
      const viewUrl = "https://lh3.googleusercontent.com/d/" + fileId + "=w1600";
      const time = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss");
      const sheetGal = ss.getSheetByName(SHEET_GALLERY);
      const id = "IMG_" + String(new Date().getTime()).substring(5);
      sheetGal.appendRow([id, viewUrl, title, category, chiDoan, time, fileId, week]);
      return jsonResponse({ success: true, data: { id, url: viewUrl, title, category, chiDoan, ngayUp: time, week, fileId } });
    }

    if (action === "deletePhoto") {
      const sheet = ss.getSheetByName(SHEET_GALLERY);
      const rows = sheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === postData.id) {
          const fileId = rows[i][6];
          if (fileId) { try { DriveApp.getFileById(String(fileId)).setTrashed(true); } catch (err) { } }
          sheet.deleteRow(i + 1);
          return jsonResponse({ success: true });
        }
      }
      return jsonResponse({ success: false, error: "Kh�ng t�m th?y ?nh" });
    }
    if (action === "deleteExtraEvent") {
      const sheet = ss.getSheetByName(SHEET_EXTRA_EVENTS);
      const rows = sheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === postData.id || rows[i][0] === postData.ID || rows[i][0] === postData.eventId) {
          sheet.deleteRow(i + 1);
          // Xóa luôn các đăng ký liên quan
          const regSheet = ss.getSheetByName(SHEET_EVENT_REG);
          const regRows = regSheet.getDataRange().getValues();
          for (let j = regRows.length - 1; j >= 1; j--) {
            if (regRows[j][1] === rows[i][0]) regSheet.deleteRow(j + 1);
          }
          return jsonResponse({ success: true });
        }
      }
      return jsonResponse({ success: false, error: "Không tìm thấy sự kiện" });
    }

    if (action === "updateExtraEvent") {
      const sheet = ss.getSheetByName(SHEET_EXTRA_EVENTS);
      const rows = sheet.getDataRange().getValues();
      const targetId = postData.id || postData.ID || postData.eventId;
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === targetId) {
          if (postData.ten) sheet.getRange(i + 1, 2).setValue(postData.ten);
          if (postData.moTa !== undefined) sheet.getRange(i + 1, 3).setValue(postData.moTa);
          if (postData.batDau) sheet.getRange(i + 1, 4).setValue(postData.batDau);
          if (postData.ketThuc) sheet.getRange(i + 1, 5).setValue(postData.ketThuc);
          if (postData.diaDiem !== undefined) sheet.getRange(i + 1, 6).setValue(postData.diaDiem);
          if (postData.gioiHan !== undefined) sheet.getRange(i + 1, 7).setValue(postData.gioiHan);
          return jsonResponse({ success: true });
        }
      }
      return jsonResponse({ success: false, error: "Không tìm thấy sự kiện để cập nhật" });
    }
    return jsonResponse({ success: false, error: "H�nh d?ng kh�ng h?p l?: " + action });
  } catch (err) {
    Logger.log("doPost ERROR: " + err.toString());
    return jsonResponse({ success: false, error: err.toString() });
  }

}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
