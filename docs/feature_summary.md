
# Bảng Tóm Tắt Tính Năng - App Ghi Nước V3.0 (PWA)

| Nhóm Tính Năng | Chức Năng Chi Tiết | File Chính | Trạng Thái |
| :--- | :--- | :--- | :--- |
| **PWA & Offline** | Hỗ trợ chạy không mạng, cài đặt icon màn hình chính. | `sw.js`, `manifest.json` | Hoàn thành |
| **Quản Lý Bộ 01/02** | Phân tách danh sách theo tab, chuyển đổi linh hoạt. | `useWaterData.ts`, `App.tsx` | Hoàn thành |
| **Tìm Kiếm Thông Minh** | Dropdown lịch sử, Voice Search, Auto-clear sau khi chọn KH. | `Header.tsx`, `App.tsx` | Tối ưu |
| **Ghi Chỉ Số & Thu Tiền** | Ghi số mới, nhập tiền khách trả, tính tiền nợ còn lại. | `DetailView.tsx`, `utils.ts` | Hoàn thành |
| **Quản Lý Nhóm** | Gom nhiều hộ vào 1 bill tổng, gửi Zalo cho chủ nhóm. | `GroupDetailView.tsx` | Hoàn thành |
| **Thanh Toán VietQR** | Tự động sinh mã QR đúng số tiền còn nợ (sau trừ đã trả). | `utils.ts`, `App.tsx` | Hoàn thành |
| **Báo Cáo & Chốt Kỳ** | Thống kê doanh thu, nợ tồn, chốt kỳ chuyển nợ sang kỳ mới. | `StatsView.tsx` | Hoàn thành |
| **Dữ Liệu Cloud** | Đồng bộ Google Sheets qua API Script riêng cho từng bộ. | `App.tsx`, `ConfigView.tsx` | Hoàn thành |
| **Nhập/Xuất Excel** | Hỗ trợ file 12 cột chuẩn, Backup dữ liệu ra file Excel. | `utils.ts` | Hoàn thành |
