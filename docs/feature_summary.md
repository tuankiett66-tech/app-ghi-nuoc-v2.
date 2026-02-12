
# Bảng Tóm Tắt Tính Năng - App Ghi Nước V3.1 (Fixed Calculation)

| Nhóm Tính Năng | Chức Năng Chi Tiết | File Chính | Trạng Thái | Ghi Chú |
| :--- | :--- | :--- | :--- | :--- |
| **PWA & Offline** | Hỗ trợ chạy không mạng, cài đặt icon màn hình chính. | `sw.js`, `manifest.json` | Hoàn thành | Hoạt động 100% offline. |
| **Quản Lý Bộ 01/02** | Phân tách danh sách theo tab, chuyển đổi linh hoạt. | `useWaterData.ts`, `App.tsx` | Hoàn thành | Lưu trữ độc lập. |
| **Tìm Kiếm Thông Minh** | Dropdown lịch sử, Voice Search, Auto-clear sau khi chọn KH. | `Header.tsx`, `App.tsx` | Tối ưu | Đã fix lỗi kẹt bộ lọc. |
| **Ghi Chỉ Số & Thu Tiền** | Ghi số mới, nhập tiền khách trả, tính tiền nợ còn lại. | `DetailView.tsx`, `utils.ts` | Hoàn thành | **Đã fix**: Hỗ trợ số dư âm (khách trả thừa). |
| **Gửi Zalo & VietQR** | Tự động sinh nội dung bill và QR thanh toán. | `App.tsx`, `utils.ts` | Hoàn thành | Bill Zalo hiện đúng số âm. QR tự về 0 nếu âm. |
| **Quản Lý Nhóm** | Gom nhiều hộ vào 1 bill tổng, gửi Zalo cho chủ nhóm. | `GroupDetailView.tsx` | Hoàn thành | Hỗ trợ bill nhóm trừ tiền trả từng hộ. |
| **Báo Cáo & Chốt Kỳ** | Thống kê doanh thu, nợ tồn, chốt kỳ chuyển nợ sang kỳ mới. | `StatsView.tsx` | Hoàn thành | Chốt kỳ tự chuyển số âm sang nợ cũ âm. |
| **Dữ Liệu Cloud** | Đồng bộ Google Sheets qua API Script riêng cho từng bộ. | `App.tsx`, `ConfigView.tsx` | Hoàn thành | Fetch Real-time. |
| **Nhập/Xuất Excel** | Hỗ trợ file 12 cột chuẩn, Backup dữ liệu ra file Excel. | `utils.ts` | Hoàn thành | Mapping cột thông minh. |
