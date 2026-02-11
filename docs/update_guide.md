
# Quy Trình Kiểm Soát Chất Lượng (KCS) & Update V3.0

## 1. Checklist Kiểm Tra Toàn Diện
- [ ] **Offline Check**: Tắt mạng Wifi/4G -> Load lại App -> App phải mở được và hiện dữ liệu.
- [ ] **Filter Check**: Tìm "Lê" -> Chọn khách hàng -> Nhấn Quay lại -> Ô tìm kiếm phải trống, hiện đủ danh sách.
- [ ] **Zalo Bill Check**: Gửi bill -> Kiểm tra dòng "CÒN LẠI" = (Tiền nước + Nợ cũ) - Đã trả.
- [ ] **QR Code Check**: Quét mã QR sinh ra -> Số tiền trong App ngân hàng phải khớp với dòng "CÒN LẠI".
- [ ] **Excel Check**: Nhập file Excel 12 cột -> Kiểm tra STT, Tên, Số Cũ, Nợ Cũ vào đúng ô không.
- [ ] **Tab Sync Check**: Chuyển Bộ 01/02 -> Danh sách khách hàng và Link Cloud phải đổi tương ứng.

## 2. Hướng Dẫn Kỹ Thuật
- **Storage**: Mọi dữ liệu lưu tại key `water_data_final_v21`.
- **Navigation**: Sử dụng hàm `navigateTo` trong `App.tsx` để quản lý việc xóa search query đồng nhất.

## 3. Nhật Ký Phiên Bản (Version Log)
| Phiên bản | Ngày | Nội dung | Ghi chú |
| :--- | :--- | :--- | :--- |
| **V1.0** | 2024 | Khởi tạo quản lý ghi nước cơ bản. | Stable |
| **V2.0** | 2026-02-10 | Thêm VietQR động và trừ tiền khách trả. | Improved |
| **V3.0** | 2026-02-11 | **Nâng cấp PWA**, Auto-clear search, Hoàn thiện docs hệ thống. | Current |
