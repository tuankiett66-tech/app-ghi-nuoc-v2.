
# Quy Trình Kiểm Soát Chất Lượng (KCS) & Update V3.1

## 1. Checklist Kiểm Tra Toàn Diện
- [ ] **Offline Check**: Tắt mạng Wifi/4G -> Load lại App -> App phải mở được và hiện dữ liệu.
- [ ] **Filter Check**: Tìm "Lê" -> Chọn khách hàng -> Nhấn Quay lại -> Ô tìm kiếm phải trống, hiện đủ danh sách.
- [ ] **Overpayment Check**: Nhập bill 468k -> Nhập khách trả 500k -> Tin nhắn Zalo phải hiện **TIỀN DƯ: -32.000**.
- [ ] **Zalo Bill Check**: Gửi bill -> Kiểm tra dòng "CÒN LẠI" = (Tiền nước + Nợ cũ) - Đã trả.
- [ ] **QR Code Check**: Nếu số dư âm -> Mã QR sinh ra phải mặc định là **0đ** (ngân hàng không thu số âm).
- [ ] **Copy Bill Sync Check (MỚI)**: Bấm nút "Copy Bill" trên danh sách -> KH đó phải tự động chuyển sang màu Xanh (isZalo = true).
- [ ] **Group Navigation Check (MỚI)**: Vào Chi tiết Nhóm -> Bấm nút Tiến/Lùi trên header -> Phải chuyển sang nhóm khác chính xác.
- [ ] **Excel STT Check (MỚI)**: Nhập file Excel có STT định dạng Văn bản (Text) -> Hệ thống phải nhận diện đúng số thứ tự.
- [ ] **Message Order Check (MỚI)**: Xem trước tin nhắn -> Lời nhắn (globalMessage) phải nằm TRÊN phần thông tin Ngân hàng.
- [ ] **Meter Tracking Check (MỚI)**: Vào Chi tiết KH -> Phần "Thời hạn thay đồng hồ" phải nằm DƯỚI nút "Gửi Zalo".
- [ ] **Cloud Backup Check (MỚI)**: Vào Cấu hình -> Bấm "Sao lưu lên Cloud" -> Script phải trả về thông báo thành công.

## 2. Hướng Dẫn Kỹ Thuật
- **Logic Bill**: Tại `App.tsx`, hàm `generateMsg` chịu trách nhiệm render văn bản. Biến `remaining` không bị chặn bởi `Math.max(0)` để giữ nguyên giá trị âm.
- **Navigation**: Logic điều hướng Tiến/Lùi được xử lý tại `App.tsx` (truyền qua prop `onNavigate`) cho cả `DetailView` và `GroupDetailView`.
- **Excel Parsing**: Hàm `parseSafe` trong `utils.ts` được dùng để làm sạch dữ liệu STT trước khi đưa vào store.

## 3. Nhật Ký Phiên Bản (Version Log)
| Phiên bản | Ngày | Nội dung | Ghi chú |
| :--- | :--- | :--- | :--- |
| **V1.0** | 2024 | Khởi tạo quản lý ghi nước cơ bản. | Stable |
| **V2.0** | 2026-02-10 | Thêm VietQR động và trừ tiền khách trả. | Improved |
| **V3.0** | 2026-02-11 | Nâng cấp PWA, Auto-clear search. | PWA Ready |
| **V3.1** | 2026-02-11 | **Sửa lỗi tính toán bill**: Hiển thị chính xác số dư âm khi khách trả thừa. | **Fixed Bug** |
| **V3.2** | 2026-03-11 | **Update 2026-03-11**: Thêm điều hướng nhóm, đồng bộ copy bill, tối ưu Excel và hoàn thiện cấu trúc thư mục. | **Stable** |
| **V3.3** | 2026-03-12 | **Cloud Backup**: Thêm tính năng sao lưu dữ liệu lên Google Sheets qua phương thức POST. | **New Feature** |
