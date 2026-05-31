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
  "Chi đoàn Thanh niên Tổ dân phố Mạc Đỉnh Chi 1.",
  "Chi đoàn Thanh niên Tổ dân phố Mạc Đỉnh Chi 2.",
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
  sheetMem.appendRow(["MEM_001", "Nguyễn Văn An", "Chi đoàn Thanh niên Tổ dân phố Nguyễn Trung Trực 2", "2008-05-15", "0912345678"]);
  sheetMem.appendRow(["MEM_002", "Trần Thị Bình", "Chi đoàn Thanh niên Tổ dân phố Nguyễn Trung Trực 2", "2009-08-20", "0987654321"]);
  sheetMem.appendRow(["MEM_003", "Lê Hoàng Châu", "Chi đoàn Thanh niên Tổ dân phố Nguyễn Trung Trực 2", "2008-12-10", "0905123456"]);
  sheetMem.appendRow(["MEM_004", "Phạm Minh Đức", "Chi đoàn Thanh niên Tổ dân phố Nguyễn Văn Trỗi.", "2008-03-05", "0934567890"]);
  sheetMem.appendRow(["MEM_005", "Vũ Thu Hà", "Chi đoàn Thanh niên Tổ dân phố Nguyễn Văn Trỗi.", "2009-11-22", "0945678901"]);

  // 3. Sheet Điểm danh
  let sheetAtt = ss.getSheetByName(SHEET_ATTENDANCE);
  if (!sheetAtt) { sheetAtt = ss.insertSheet(SHEET_ATTENDANCE); } else { sheetAtt.clear(); }
  sheetAtt.appendRow(["ID", "Ngay", "Tuan", "HoTen", "ChiDoan", "TrangThai", "GhiChu"]);
  sheetAtt.appendRow(["ATT_001", "2026-06-01", "Tuần 1", "Nguyễn Văn An", "Chi đoàn Thanh niên Tổ dân phố Nguyễn Trung Trực 2", "Có mặt", "Đi đúng giờ"]);
  sheetAtt.appendRow(["ATT_002", "2026-06-01", "Tuần 1", "Trần Thị Bình", "Chi đoàn Thanh niên Tổ dân phố Nguyễn Trung Trực 2", "Có mặt", "Hào hứng"]);
  sheetAtt.appendRow(["ATT_003", "2026-06-01", "Tuần 1", "Lê Hoàng Châu", "Chi đoàn Thanh niên Tổ dân phố Nguyễn Trung Trực 2", "Vắng có phép", "Bị ốm nhẹ"]);
  sheetAtt.appendRow(["ATT_004", "2026-06-08", "Tuần 2", "Nguyễn Văn An", "Chi đoàn Thanh niên Tổ dân phố Nguyễn Trung Trực 2", "Có mặt", "Học bơi tích cực"]);
  sheetAtt.appendRow(["ATT_005", "2026-06-08", "Tuần 2", "Phạm Minh Đức", "Chi đoàn Thanh niên Tổ dân phố Nguyễn Văn Trỗi.", "Có mặt", "Nhiệt tình"]);
  sheetAtt.appendRow(["ATT_006", "2026-06-08", "Tuần 2", "Vũ Thu Hà", "Chi đoàn Thanh niên Tổ dân phố Nguyễn Văn Trỗi.", "Vắng không phép", ""]);

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
  sheetWeeks.appendRow([1, "Khai Mạc Hè & Kết Nối Bạn Mới", "01/06 - 07/06", "Lễ ra quân chiến dịch hè, các trò chơi vòng tròn gắn kết tình đồng đội và phổ biến nội quy sinh hoạt hè.", "kỹ năng, nghệ thuật", JSON.stringify([
    { day: "Thứ 2", activity: "8:00 - Lễ Khai mạc sinh hoạt hè toàn phường tại Hội trường lớn." },
    { day: "Thứ 4", activity: "14:00 - Chuyên đề: 'Định hướng lối sống lành mạnh & Kế hoạch hè 2026'." },
    { day: "Thứ 7", activity: "15:00 - Sân chơi Team Building 'Vòng tay bè bạn' và Đăng ký các câu lạc bộ năng khiếu." }
  ])]);
  sheetWeeks.appendRow([2, "Kỹ Năng Sinh Tồn & Phòng Chống Tai Nạn", "08/06 - 14/06", "Tuyên truyền thực hành phòng chống đuối nước, thoát hiểm khi cháy nổ và kỹ năng sơ cấp cứu y tế.", "kỹ năng", JSON.stringify([
    { day: "Thứ 2", activity: "8:00 - Khai mạc lớp học bơi miễn phí tại hồ bơi địa phương (diễn ra cả tuần)." },
    { day: "Thứ 4", activity: "14:00 - Tập huấn lý thuyết phòng chống tai nạn thương tích và đuối nước." },
    { day: "Thứ 7", activity: "8:00 - Buổi diễn tập thực hành thoát nạn cháy nổ & Kỹ thuật sơ cứu, băng bó vết thương." }
  ])]);
  sheetWeeks.appendRow([3, "Hội Thao Hè - Bứt Phá Giới Hạn", "15/06 - 21/06", "Khai mạc các câu lạc bộ thể thao và vòng loại Giải Bóng đá Thiếu niên & Nhi đồng truyền thống.", "thể thao", JSON.stringify([
    { day: "Thứ 2", activity: "15:00 - Bốc thăm chia bảng và khai mạc giải bóng đá mini hè." },
    { day: "Thứ 4", activity: "16:00 - Các trận đấu vòng bảng bảng A và bảng B." },
    { day: "Thứ 7", activity: "7:30 - Ngày hội thể thao cộng đồng: Chạy việt dã thiếu niên và các trò chơi dân gian kéo co, nhảy bao bố." }
  ])]);
  sheetWeeks.appendRow([4, "Hành Trình Xanh - Chung Tay Bảo Vệ Môi Trường", "22/06 - 28/06", "Chiến dịch nhặt rác công viên, phân loại rác tại nguồn, làm nến thơm và trồng sen đá trang trí phòng học.", "tình nguyện, kỹ năng", JSON.stringify([
    { day: "Thứ 2", activity: "8:00 - Phát động phong trào 'Thu gom pin cũ & vỏ hộp sữa đổi cây xanh'." },
    { day: "Thứ 4", activity: "14:00 - Workshop làm nến thơm handmade và trang trí chậu cây bằng chai nhựa tái chế." },
    { day: "Thứ 7", activity: "7:00 - Ra quân dọn dẹp vệ sinh khuôn viên công viên thiếu nhi và sơn vẽ lại bồn hoa công cộng." }
  ])]);
  sheetWeeks.appendRow([5, "Âm Nhạc Mùa Hè - Ươm Mầm Nghệ Thuật", "29/06 - 05/07", "Tổ chức lớp hát dân ca, múa hiện đại và tuyển chọn các tiết mục văn nghệ chuẩn bị cho đêm hội lớn.", "nghệ thuật", JSON.stringify([
    { day: "Thứ 2", activity: "14:00 - Khai giảng lớp năng khiếu: Nhạc cụ, Thanh nhạc và Nhảy hiện đại hè." },
    { day: "Thứ 4", activity: "14:00 - Tập luyện các bài hát thiếu nhi và dân vũ cộng đồng." },
    { day: "Thứ 7", activity: "15:00 - Gala giao lưu âm nhạc đường phố và bình chọn giọng ca triển vọng." }
  ])]);
  sheetWeeks.appendRow([6, "Ngày Hội Sáng Tạo & Robotics", "06/07 - 12/07", "Tiếp cận thế giới công nghệ thông qua các thí nghiệm khoa học vui và lập trình robot LEGO đơn giản.", "học tập, kỹ năng", JSON.stringify([
    { day: "Thứ 2", activity: "14:00 - Workshop: 'Thế giới hóa học kỳ thú' qua các thí nghiệm an toàn." },
    { day: "Thứ 4", activity: "14:00 - Trải nghiệm lắp ráp mô hình kỹ thuật STEM cơ bản." },
    { day: "Thứ 7", activity: "8:30 - Hội thi sáng tạo robot mini: Vận hành robot vượt sa bàn thu hoạch quà." }
  ])]);
  sheetWeeks.appendRow([7, "Uống Nước Nhớ Nguồn - Tri Ân 27/7", "13/07 - 19/07", "Chuỗi hoạt động thăm hỏi gia đình có công với cách mạng, quét dọn Nghĩa trang Liệt sĩ nhân ngày 27/7.", "tình nguyện", JSON.stringify([
    { day: "Thứ 2", activity: "15:00 - Họp đoàn và lên kế hoạch đi thăm hỏi Mẹ Việt Nam Anh hùng tại địa phương." },
    { day: "Thứ 4", activity: "8:00 - Ra quân dọn dẹp, dâng hương tại Bia tưởng niệm Liệt sĩ phường." },
    { day: "Thứ 7", activity: "18:30 - Lễ thắp nến tri ân các anh hùng liệt sĩ tại Nghĩa trang Liệt sĩ thành phố." }
  ])]);
  sheetWeeks.appendRow([8, "Hội Trại Kỹ Năng - Vượt Qua Thử Thách", "20/07 - 26/07", "Hội trại hè dã ngoại kéo dài 2 ngày 1 đêm với các phần thi dựng lều nghệ thuật, giải mật thư và đốt lửa trại.", "kỹ năng, thể thao", JSON.stringify([
    { day: "Thứ 2", activity: "14:00 - Phổ biến luật trại, tập huấn giải mật thư và nút dây cơ bản." },
    { day: "Thứ 6", activity: "6:00 - Xuất phát đi địa điểm cắm trại dã ngoại (ngày 1: dựng lều, thi cắm hoa, đêm lửa trại)." },
    { day: "Thứ 7", activity: "Cả ngày - Ngày 2 của Hội trại: Trò chơi lớn chinh phục mật thư, bế mạc trại và thu dọn rác." }
  ])]);
  sheetWeeks.appendRow([9, "Kỳ Thủ Nhí - Trí Tuệ Tỏa Sáng", "27/07 - 02/08", "Giải thi đấu cờ vua, cờ tướng dành cho thanh thiếu niên để phát triển tư duy logic và sự kiên trì.", "thể thao, học tập", JSON.stringify([
    { day: "Thứ 2", activity: "14:00 - Đăng ký thi đấu giải cờ vua thanh thiếu niên hè 2026." },
    { day: "Thứ 4", activity: "15:00 - Đấu loại trực tiếp các kỳ thủ vòng bảng." },
    { day: "Thứ 7", activity: "8:00 - Chung kết giải cờ vua, trao giải thưởng và cúp lưu niệm cho kỳ thủ xuất sắc." }
  ])]);
  sheetWeeks.appendRow([10, "Diễn Đàn Trẻ Em - Lắng Nghe Con Nói", "03/08 - 09/08", "Rèn luyện kỹ năng thuyết trình trước đám đông, thảo luận về chủ đề phòng chống bạo lực học đường.", "kỹ năng, học tập", JSON.stringify([
    { day: "Thứ 2", activity: "14:00 - Chuyên đề kỹ năng thuyết trình, giao tiếp trước công chúng hiệu quả." },
    { day: "Thứ 4", activity: "14:00 - Thảo luận nhóm về quyền trẻ em và các giải pháp phòng chống bạo lực học đường." },
    { day: "Thứ 7", activity: "9:00 - Diễn đàn đối thoại trực tiếp giữa Lãnh đạo địa phương với thanh thiếu nhi." }
  ])]);
  sheetWeeks.appendRow([11, "Chung Tay Vì Cộng Đồng - Sách Cũ Trao Tay", "10/08 - 16/08", "Quyên góp sách giáo khoa cũ, vở mới, bút thước để chuẩn bị gửi tặng cho học sinh vùng cao khó khăn trước năm học mới.", "tình nguyện", JSON.stringify([
    { day: "Thứ 2", activity: "8:00 - Bắt đầu tiếp nhận quyên góp sách vở, đồ dùng học tập tại Văn phòng Đoàn." },
    { day: "Thứ 4", activity: "14:00 - Tổ chức phân loại sách, đóng tập vở ngăn nắp và viết thiệp chúc gửi học sinh miền núi." },
    { day: "Thứ 7", activity: "8:00 - Đóng thùng hàng gửi đi vùng cao và tổng kết kết quả đợt quyên góp thiện nguyện." }
  ])]);
  sheetWeeks.appendRow([12, "Lễ Tổng Kết - Đêm Hội Trăng Rằm Sớm", "17/08 - 23/08", "Tổng kết thi đua hoạt động hè, biểu diễn các tiết mục văn nghệ xuất sắc nhất và trao quà khuyến học cho học sinh nghèo.", "nghệ thuật, tình nguyện", JSON.stringify([
    { day: "Thứ 2", activity: "14:00 - Tổng duyệt chương trình biểu diễn văn nghệ tổng kết hè." },
    { day: "Thứ 4", activity: "14:00 - Chuẩn bị lồng đèn, quà bánh cho đêm hội Trăng rằm sớm." },
    { day: "Thứ 7", activity: "18:00 - Đêm hội tổng kết sinh hoạt hè 2026: Phát quà trung thu sớm, tuyên dương và trao học bổng." }
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

    return jsonResponse({ success: false, error: "H�nh d?ng kh�ng h?p l?: " + action });
  } catch (err) {
    Logger.log("doPost ERROR: " + err.toString());
    return jsonResponse({ success: false, error: err.toString() });
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
