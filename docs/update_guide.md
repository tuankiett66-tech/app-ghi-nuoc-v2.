
# Quy Trình Kiểm Sốát Chất Lượng (KCS) & Update

## 1. Checklist Kiểm Tra Trước Khi Release
- [x] **Logic Tìm Kiếm**: Gõ tìm khách -> Chọn khách -> Quay lại -> Ô tìm kiếm phải trống và hiện đủ danh sách.
- [x] **Lịch Sử Tìm Kiếm**: Click vào ô tìm kiếm -> Phải hiện danh sách các từ khóa đã tìm trước đó.
- [x] **Trừ Tiền Trực Tiếp**: Nhập "Số Mới" -> Nhập "Khách Trả" -> Kiểm tra dòng "CÒN LẠI" trong bill có trừ đúng không.
- [x] **VietQR Dynamic**: Mã QR phải mang số tiền bằng đúng dòng "CÒN LẠI" cuối cùng trong hóa đơn.
- [x] **Nhóm & Master Zalo**: Gửi Zalo nhóm -> Nội dung bill phải liệt kê đủ các hộ thành viên và trừ tiền đã trả của từng hộ.
- [x] **Đồng Bộ Cloud**: Kiểm tra xem Link Script Bộ 01 và Bộ 02 có hoạt động độc lập theo Tab không.

## 2. Hướng Dẫn Kỹ Thuật (Dành cho Dev)
- **Xóa Search Query**: Thực hiện trong `App.tsx` tại callback `onSelect` của `ListView`.
- **Logic Tính Toán**: Luôn sử dụng `Math.round()` để tránh sai số thập phân khi hiển thị tiền VNĐ.
- **Storage Key**: Phiên bản hiện tại sử dụng hậu tố `_v21` để tránh xung đột dữ liệu cũ.

## 3. Nhật Ký Phiên Bản (Version Log)
| Ngày | Nội dung thay đổi | Kết quả KCS |
| :--- | :--- | :--- |
| 2024-05-25 | Thêm Tìm kiếm giọng nói, Tối ưu Layout Nhóm, Sửa lỗi điều hướng Edit KH. | Đạt chuẩn |
| 2026-02-10 | Sửa lỗi logic CỘNG (trừ tiền khách trả) và cập nhật VietQR tự động theo số dư còn lại. | Đạt chuẩn |
| 2026-02-11 | Update: Thêm Lịch sử tìm kiếm, Auto-clear ô search sau khi chọn khách, Hoàn thiện docs hệ thống. | Đạt chuẩn |
