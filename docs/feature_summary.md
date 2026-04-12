
# Bảng Tóm Tắt Tính Năng - App Ghi Nước V3.1 (Fixed Calculation)

| Nhóm Tính Năng | Chức Năng Chi Tiết | File Chính | Trạng Thái | Ghi Chú |
| :--- | :--- | :--- | :--- | :--- |
| **PWA & Offline** | Hỗ trợ chạy không mạng, cài đặt icon màn hình chính. | `sw.js`, `manifest.json` | Hoàn thành | Hoạt động 100% offline. |
| **Quản Lý Bộ 01/02** | Phân tách danh sách theo tab, chuyển đổi linh hoạt. | `App.tsx` | Hoàn thành | Lưu trữ độc lập qua localStorage. |
| **Đồng Bộ Đa Thiết Bị** | Tự động tải dữ liệu khi mở App, tự động sao lưu sau khi thay đổi (Debounce). | `App.tsx`, `useWaterData.ts` | Hoàn thành | Hiển thị thời gian đồng bộ cuối trên Header. |
| **Lọc Thông Minh** | Lọc KH chưa có Zalo, lọc KH CHƯA THU TIỀN (ẩn hộ 0m3/chưa ghi). | `Header.tsx`, `App.tsx` | Hoàn thành | Bấm icon đồng tiền màu đỏ để ẩn các hộ đã thu hoặc không dùng nước. |
| **Thu Tiền Nhanh** | Nút "Thu đủ" ngay tại danh sách không cần vào chi tiết. | `ListView.tsx`, `App.tsx` | Hoàn thành | Giúp xử lý nhanh khi khách trả đúng số tiền nợ. |
| **Tìm Kiếm Thông Minh** | Dropdown lịch sử, Voice Search, Auto-clear sau khi chọn KH. | `Header.tsx`, `App.tsx` | Tối ưu | Đã fix lỗi kẹt bộ lọc. |
| **Ghi Chỉ Số & Thu Tiền** | Ghi số mới, nhập tiền khách trả, tính tiền nợ còn lại. | `DetailView.tsx`, `utils.ts` | Hoàn thành | **Đã fix**: Hỗ trợ số dư âm (khách trả thừa). |
| **Gửi Zalo & VietQR** | Tự động sinh nội dung bill và QR thanh toán. | `App.tsx`, `utils.ts` | Hoàn thành | Bill Zalo hiện đúng số âm. QR tự về 0 nếu âm. |
| **Đồng Bộ Copy Bill** | Tự động đánh dấu "Xanh" (isZalo: true) khi bấm Copy Bill. | `App.tsx` | Hoàn thành | Giúp nhận biết hộ đã xử lý thủ công. |
| **Quản Lý Nhóm** | Gom nhiều hộ vào 1 bill tổng, gửi Zalo cho chủ nhóm. | `GroupDetailView.tsx` | Hoàn thành | **Mới**: Thêm nút Tiến/Lùi để duyệt nhóm nhanh. |
| **Quản Lý Thất Thoát** | Theo dõi lịch sử hao hụt qua từng kỳ, so sánh đồng hồ tổng và hộ dân. | `LossView.tsx` | Hoàn thành | **Mới**: Có biểu đồ xu hướng và bảng lịch sử chi tiết. |
| **Hai Tài Khoản Thu** | Hỗ trợ 2 STK riêng biệt: Tài khoản 1 (Thu chung) và Tài khoản 2 (Thu Nhóm). | `ConfigView.tsx` | Hoàn thành | **Mới**: Tự động đổi STK khi gửi Bill Nhóm hoặc Bill lẻ. |
| **Báo Cáo & Chốt Kỳ** | Thống kê doanh thu, nợ tồn, chốt kỳ chuyển nợ sang kỳ mới. | `StatsView.tsx` | Hoàn thành | **Mới**: Đánh giá thất thoát linh hoạt (Toàn hệ thống hoặc từng Bộ). |
| **Dữ Liệu Cloud** | Đồng bộ Google Sheets qua API Script riêng cho từng bộ. | `App.tsx`, `ConfigView.tsx` | Hoàn thành | Hỗ trợ Fetch (GET) và Backup (POST). |
| **Nhập/Xuất Excel** | Hỗ trợ file 12 cột chuẩn, Backup dữ liệu ra file Excel. | `utils.ts` | Hoàn thành | **Mới**: Thêm dòng **TỔNG CỘNG** cuối file Excel báo cáo. |
| **Quản lý KH** | Sửa thông tin, xóa SĐT, theo dõi thời hạn đồng hồ. | `Modals.tsx`, `useWaterData.ts` | Hoàn thành | **Đã fix**: Cho phép xóa trắng SĐT và lưu thành công. |
| **Giao diện Chi tiết** | Hiện QR trực tiếp, nút Copy tên, tối ưu nút bấm mobile. | `DetailView.tsx` | Hoàn thành | **Mới**: Nút QR ưu tiên, QR hiện inline không cần Modal. |
| **Giao diện Danh sách** | Nút "Thu đủ", "Copy Bill", "Copy Tên KH". | `ListView.tsx` | Hoàn thành | **Mới**: Thêm icon Copy nhỏ cạnh tên KH để tìm Zalo nhanh. |
| **Quản Lý Kết Bạn** | Nút "Kết bạn Zalo" và "Đã kết bạn" thủ công. | `DetailView.tsx` | Hoàn thành | **Layout**: Nằm DƯỚI nút "Gửi Zalo & Chốt số". |
| **Mẫu Thông Báo** | Sắp xếp lời nhắn nằm trên thông tin chuyển khoản. | `App.tsx`, `GroupDetailView.tsx` | Hoàn thành | Giúp khách hàng dễ đọc lời nhắn trước. |
