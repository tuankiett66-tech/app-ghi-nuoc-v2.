
# Quy Trình Kiểm Soát Chất Lượng (KCS) & Update V3.1

## 1. Checklist Kiểm Tra Toàn Diện
- [ ] **Offline Check**: Tắt mạng Wifi/4G -> Load lại App -> App phải mở được và hiện dữ liệu.
- [ ] **Filter Check**: Tìm "Lê" -> Chọn khách hàng -> Nhấn Quay lại -> Ô tìm kiếm phải trống, hiện đủ danh sách.
- [ ] **Overpayment Check (MỚI)**: Nhập bill 468k -> Nhập khách trả 500k -> Tin nhắn Zalo phải hiện **TIỀN DƯ: -32.000**.
- [ ] **Zalo Bill Check**: Gửi bill -> Kiểm tra dòng "CÒN LẠI" = (Tiền nước + Nợ cũ) - Đã trả.
- [ ] **QR Code Check**: Nếu số dư âm -> Mã QR sinh ra phải mặc định là **0đ** (ngân hàng không thu số âm).
- [ ] **Excel Check**: Nhập file Excel 12 cột -> Kiểm tra STT, Tên, Số Cũ, Nợ Cũ vào đúng ô không.

## 2. Hướng Dẫn Kỹ Thuật
- **Logic Bill**: Tại `App.tsx`, hàm `generateMsg` chịu trách nhiệm render văn bản. Biến `remaining` không bị chặn bởi `Math.max(0)` để giữ nguyên giá trị âm.
- **Storage**: Mọi dữ liệu lưu tại key `water_data_final_v21`.

## 3. Nhật Ký Phiên Bản (Version Log)
| Phiên bản | Ngày | Nội dung | Ghi chú |
| :--- | :--- | :--- | :--- |
| **V1.0** | 2024 | Khởi tạo quản lý ghi nước cơ bản. | Stable |
| **V2.0** | 2026-02-10 | Thêm VietQR động và trừ tiền khách trả. | Improved |
| **V3.0** | 2026-02-11 | Nâng cấp PWA, Auto-clear search. | PWA Ready |
| **V3.1** | 2026-02-11 | **Sửa lỗi tính toán bill**: Hiển thị chính xác số dư âm khi khách trả thừa. | **Fixed Bug** |
