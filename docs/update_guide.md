
# Quy Trình Kiểm Soát Chất Lượng (KCS) & Update V3.1

## 1. Checklist Kiểm Tra Toàn Diện
- [ ] **Offline Check**: Tắt mạng Wifi/4G -> Load lại App -> App phải mở được và hiện dữ liệu.
- [ ] **Filter Check**: Tìm "Lê" -> Chọn khách hàng -> Nhấn Quay lại -> Ô tìm kiếm phải trống, hiện đủ danh sách.
- [ ] **Overpayment Check**: Nhập bill 468k -> Nhập khách trả 500k -> Tin nhắn Zalo phải hiện **TIỀN DƯ: -32.000**.
- [ ] **Zalo Bill Check**: Gửi bill -> Kiểm tra dòng "CÒN LẠI" = (Tiền nước + Nợ cũ) - Đã trả.
- [ ] **QR Code Check**: Nếu số dư âm -> Mã QR sinh ra phải mặc định là **0đ** (ngân hàng không thu số âm).
- [ ] **Auto-Sync Check (MỚI)**: Mở App -> App phải tự động hiện "Đang đồng bộ" và tải dữ liệu mới nhất từ Cloud.
- [ ] **Auto-Backup Check (MỚI)**: Thay đổi số nước -> Đợi 5s -> Icon lưu trên Header phải tự động xoay (Syncing) và báo thành công.
- [ ] **Unpaid Filter Check (MỚI)**: Bấm icon đồng tiền đỏ -> Danh sách phải ẩn các hộ đã thu, hộ 0m3 và hộ chưa ghi số.
- [ ] **Collect Full Check (MỚI)**: Bấm nút "Thu đủ" trên card danh sách -> Số dư phải về 0 và hộ đó tự ẩn nếu đang bật lọc.
- [ ] **Copy Bill Sync Check (MỚI)**: Bấm nút "Copy Bill" trên danh sách -> KH đó phải tự động chuyển sang màu Xanh (isZalo = true).
- [ ] **Group Navigation Check (MỚI)**: Vào Chi tiết Nhóm -> Bấm nút Tiến/Lùi trên header -> Phải chuyển sang nhóm khác chính xác.
- [ ] **Excel STT Check (MỚI)**: Nhập file Excel có STT định dạng Văn bản (Text) -> Hệ thống phải nhận diện đúng số thứ tự.
- [ ] **Message Order Check (MỚI)**: Xem trước tin nhắn -> Lời nhắn (globalMessage) phải nằm TRÊN phần thông tin Ngân hàng.
- [ ] **Meter Tracking Check (MỚI)**: Vào Chi tiết KH -> Phần "Thời hạn thay đồng hồ" phải nằm DƯỚI CÙNG (dưới cả các nút kết bạn).
- [ ] **Detail Layout Check (QUAN TRỌNG)**: Thứ tự từ trên xuống: Khu vực làm việc chính (Số mới/Tiền trả) -> Nút "Gửi Zalo & Chốt số" -> Các nút "Kết bạn Zalo".
- [ ] **Excel Mapping Check (MỚI)**: Nhập file Excel -> Cột "CHỈ SỐ CŨ" và "NỢ CŨ" phải được nhận diện đúng (không bị đè lên nhau).
- [ ] **Phone Deletion Check (MỚI)**: Vào Sửa KH -> Xóa trắng SĐT -> Bấm Lưu -> Xem lại KH, SĐT phải trống (không tự khôi phục).
- [ ] **QR Mobile Check (MỚI)**: Mở App trên điện thoại -> Nút QR phải hiện rõ trên Header -> Bấm QR, mã phải hiện inline trong trang chi tiết.
- [ ] **Excel Bold Check (MỚI)**: Xuất file Excel -> Những KH đã có Zalo (isZalo hoặc isZaloFriend) phải được **TÔ ĐẬM** tên.

## 2. Hướng Dẫn Kỹ Thuật
- **Logic Bill**: Tại `App.tsx`, hàm `generateMsg` chịu trách nhiệm render văn bản. Biến `remaining` không bị chặn bởi `Math.max(0)` để giữ nguyên giá trị âm.
- **Navigation**: Logic điều hướng Tiến/Lùi được xử lý tại `App.tsx` (truyền qua prop `onNavigate`) cho cả `DetailView` và `GroupDetailView`.
- **Excel Parsing**: Hàm `parseExcelFile` trong `utils.ts` sử dụng logic mapping ưu tiên "NỢ" trước "CŨ" để tránh nhầm lẫn cột.
- **Excel Export**: Sử dụng thư viện `xlsx-js-style` thay cho `xlsx` để hỗ trợ định dạng **BOLD** cho tên khách hàng.
- **Phone Handling**: Hàm `calculateRow` và `updateCustomer` đã được tối ưu để cho phép giá trị chuỗi trống (empty string) cho số điện thoại.

## 3. Nhật Ký Phiên Bản (Version Log)
| Phiên bản | Ngày | Nội dung | Ghi chú |
| :--- | :--- | :--- | :--- |
| **V4.0** | 2026-04-06 | **UX Update**: Thêm nút Copy tên KH ngay tại danh sách. Đã fix lỗi tên bị cắt dòng. | **UX Improved** |
| **V4.1** | 2026-04-06 | **Excel Styling**: Tự động **TÔ ĐẬM** tên khách hàng đã có Zalo khi xuất file Excel. | **New Feature** |
