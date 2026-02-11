
# Bảng Tóm Tắt Tính Năng - App Ghi Nước (Cập nhật 2026-02-11)

| Tên Tính Năng | File Phụ Trách | Trạng Thái | Ghi Chú Logic |
| :--- | :--- | :--- | :--- |
| **Quản lý Danh Bộ** | `hooks/useWaterData.ts` | Hoàn thành | Tách biệt Bộ 01 và Bộ 02 qua `activeTab`. Lưu trữ LocalStorage (`water_data_final_v21`). |
| **Tính Toán Hóa Đơn** | `utils.ts`, `DetailView.tsx` | Hoàn thành | `Balance = (Mới - Cũ) * Giá + Nợ Cũ - Đã Trả`. Tự động trừ tiền khách trả ngay trong bill. |
| **Tìm Kiếm & Lịch Sử** | `Header.tsx`, `App.tsx` | Tối ưu | Hỗ trợ Dropdown lịch sử tìm kiếm. Tự động xóa từ khóa sau khi chọn khách hàng để trả về danh sách sạch. |
| **Tìm Kiếm Giọng Nói** | `Header.tsx`, `GroupDetailView.tsx` | Hoàn thành | Sử dụng Web Speech API để nhập STT hoặc Tìm tên nhanh bằng giọng nói. |
| **Nhập Liệu & Điều Hướng** | `DetailView.tsx`, `Modals.tsx` | Hoàn thành | Ghi số mới, nhập số tiền khách trả tại chỗ. Nút "Thu đủ" tự động điền tổng tiền cần thu. |
| **Quản lý Nhóm** | `GroupListView.tsx`, `GroupDetailView.tsx` | Hoàn thành | Gom nhiều hộ vào 1 nhóm. Hỗ trợ SĐT "Chủ nhóm" để gửi Zalo tổng hợp. |
| **Gửi Zalo & QR Code** | `App.tsx`, `utils.ts` | Hoàn thành | Tự động sinh mã VietQR theo số dư cuối cùng (sau khi trừ tiền đã trả). Copy bill vào Clipboard. |
| **Kiểm Tra Cuối Ngày** | `VerifyView.tsx` | Hoàn thành | Lọc danh sách khách hàng đã thay đổi thông tin/thu tiền trong ngày hôm nay để đối soát. |
| **Báo Cáo & Chốt Kỳ** | `StatsView.tsx` | Hoàn thành | Thống kê doanh thu, nợ cũ, đã thu. Chốt kỳ: Chuyển Balance sang OldDebt, reset số cũ. |
| **Đồng Bộ Cloud** | `App.tsx`, `ConfigView.tsx` | Hoàn thành | Fetch dữ liệu từ Google Apps Script theo Link cấu hình trong Cài đặt. |
| **Nhập/Xuất Excel** | `utils.ts` | Hoàn thành | Hỗ trợ đọc file Excel có cấu hình cột linh hoạt và xuất file Backup/Báo cáo. |
