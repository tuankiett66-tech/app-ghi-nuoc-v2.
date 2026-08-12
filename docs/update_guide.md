
# Quy Trình Kiểm Soát Chất Lượng (KCS) & Update V5.2

## 1. Checklist Kiểm Tra Toàn Diện
- [ ] **Offline Check**: Tắt mạng Wifi/4G -> Load lại App -> App phải mở được và hiện dữ liệu.
- [ ] **Filter Check**: Tìm "Lê" -> Chọn khách hàng -> Nhấn Quay lại -> Ô tìm kiếm phải trống, hiện đủ danh sách.
- [ ] **Overpayment Check**: Nhập bill 468k -> Nhập khách trả 500k -> Tin nhắn Zalo phải hiện **TIỀN DƯ: -32.000**.
- [ ] **Zalo Bill Check**: Gửi bill -> Kiểm tra dòng "CÒN LẠI" = (Tiền nước + Nợ cũ) - Đã trả.
- [ ] **QR Code Check**: Nếu số dư âm -> Mã QR sinh ra phải mặc định là **0đ** (ngân hàng không thu số âm).
- [ ] **Auto-Sync Check**: Mở App -> App phải tự động hiện "Đang đồng bộ" và tải dữ liệu mới nhất từ Cloud.
- [ ] **Auto-Backup Check**: Thay đổi số nước -> Đợi 5s -> Icon lưu trên Header phải tự động xoay (Syncing) và báo thành công.
- [ ] **Unpaid Filter Check**: Bấm icon đồng tiền đỏ -> Danh sách phải ẩn các hộ đã thu, hộ 0m3 và hộ chưa ghi số.
- [ ] **Collect Full Check**: Bấm nút "Thu đủ" trên card danh sách -> Số dư phải về 0 và hộ đó tự ẩn nếu đang bật lọc.
- [ ] **Copy Bill Sync Check**: Bấm nút "Copy Bill" trên danh sách -> KH đó phải tự động chuyển sang màu Xanh (isZalo = true).
- [ ] **Group Navigation Check**: Vào Chi tiết Nhóm -> Bấm nút Tiến/Lùi trên header -> Phải chuyển sang nhóm khác chính xác.
- [ ] **Excel STT Check**: Nhập file Excel có STT định dạng Văn bản (Text) -> Hệ thống phải nhận diện đúng số thứ tự.
- [ ] **Message Order Check**: Xem trước tin nhắn -> Lời nhắn (globalMessage) phải nằm TRÊN phần thông tin Ngân hàng.
- [ ] **Meter Tracking Check**: Vào Chi tiết KH -> Phần "Thời hạn thay đồng hồ" phải nằm DƯỚI CÙNG (dưới cả các nút kết bạn).
- [ ] **Detail Layout Check (ZALO POSITION)**: Nút "Gửi Zalo & Chốt số" nằm ngay dưới block nợ còn lại và TRÊN ô nhập khách trả, tối ưu tầm với trên mobile.
- [ ] **Excel Mapping Check**: Nhập file Excel -> Cột "CHỈ SỐ CŨ" và "NỢ CŨ" phải được nhận diện đúng (không bị đè lên nhau).
- [ ] **Phone Deletion Check**: Vào Sửa KH -> Xóa trắng SĐT -> Bấm Lưu -> Xem lại KH, SĐT phải trống (không tự khôi phục).
- [ ] **Header Search Pin Check (MỚI - V5.2)**: Kính lúp (Tìm kiếm) ghim cố định ở đầu thanh Top, có vạch ngăn cách mờ đứng. Các nút bấm khác cuộn ngang mượt mà.
- [ ] **QR Mobile Check**: Mở App trên điện thoại -> Nút QR phải hiện rõ trên Header -> Bấm QR, mã phải hiện inline trong trang chi tiết.
- [ ] **Loss Management Check**: Bấm tab "HAO HỤT" -> Phải thấy danh sách lịch sử -> Thêm bản ghi mới -> Biểu đồ phải cập nhật xu hướng.
- [ ] **Dual Bank Check**: Vào Cài đặt -> Nhập 2 tài khoản khác nhau -> Gửi Bill lẻ (phải hiện TK 1) -> Gửi Bill Nhóm (phải hiện TK 2).


## 2. Hướng Dẫn Kỹ Thuật
- **Logic Bill**: Tại `App.tsx`, hàm `generateMsg` chịu trách nhiệm render văn bản. Biến `remaining` không bị chặn bởi `Math.max(0)` để giữ nguyên giá trị âm.
- **Dual Bank**: Hệ thống sử dụng `groupBankId`, `groupAccountNo`, `groupAccountName` cho các giao dịch nhóm. Nếu để trống, sẽ tự động dùng Tài khoản 1 làm dự phòng.
- **Navigation**: Logic điều hướng Tiến/Lùi được xử lý tại `App.tsx` (truyền qua prop `onNavigate`) cho cả `DetailView` và `GroupDetailView`.
- **Excel Parsing**: Hàm `parseExcelFile` trong `utils.ts` sử dụng logic mapping ưu tiên "NỢ" trước "CŨ" để tránh nhầm lẫn cột.
- **Excel Export**: Sử dụng thư viện `xlsx-js-style` để hỗ trợ định dạng **BOLD** cho tên khách hàng và dòng **TỔNG CỘNG**.
- **Water Loss**: Hỗ trợ 2 chế độ so sánh: (Đồng hồ tổng vs Toàn hệ thống) hoặc (Đồng hồ tổng vs Từng bộ riêng biệt). Lịch sử thất thoát được lưu trữ riêng biệt và hiển thị qua biểu đồ `recharts`.
- **Lọc Nợ Đọng**: Bộ lọc nợ đọng ("Chưa thu" -> "Nợ đọng") lọc theo điều kiện thực tế `balance > 0` thay vì điều kiện cũ để đảm bảo theo dõi chính xác tất cả khách hàng còn tiền nợ (kể cả nợ cũ).
- **Sao Lưu & Đồng Bộ Không Mất Lịch Sử**: Sử dụng Google Apps Script V4.2 đồng bộ lưu trữ và giữ lại lịch sử ghi chỉ số (`updatedAt` thông qua map dữ liệu bổ trợ `updatedAtMap`) và ngày thay đồng hồ (`installDate`) ở 2 cột O (15) và P (16) trên Google Sheets.

## 3. Nhật Ký Phiên Bản (Version Log)
| Phiên bản | Ngày | Nội dung | Ghi chú |
| :--- | :--- | :--- | :--- |
| **V4.3** | 2026-04-08 | **Flexible Loss Assessment**: Hỗ trợ nhập 1 đồng hồ tổng cho cả 2 danh bộ hoặc từng bộ riêng. | **UX Improved** |
| **V4.4** | 2026-04-11 | **Loss Management Tab**: Thêm tab quản lý thất thoát chuyên sâu với biểu đồ xu hướng và lịch sử. | **Major Update** |
| **V4.5** | 2026-04-11 | **Dual Bank Accounts**: Hỗ trợ 2 tài khoản thu riêng biệt cho khách lẻ và khách nhóm. | **New Feature** |
| **V4.6** | 2026-06-24 | **Lọc Nợ Đọng Thực Tế**: Bộ lọc Chưa thu được chuyển sang lọc nợ đọng chính xác tất cả khách hàng còn nợ tiền (`balance > 0`). | **UX Optimization** |
| **V4.7** | 2026-06-24 | **Bảo Toàn Lịch Sử & Ngày Thay ĐH**: Cập nhật Google Apps Script V4.2 và logic đồng bộ giúp giữ lại lịch sử sử dụng (`updatedAt`) và ngày thay đồng hồ (`installDate`) khi tải về và sao lưu. | **Data Integrity** |
| **V4.8** | 2026-06-27 | **Cập nhật Tiêu Đề Zalo**: Thay đổi tiêu đề tin nhắn Zalo từ "KỲ NƯỚC THÁNG MM/YYYY" sang định dạng chính xác thực tế "Tiền nước Kỳ [Kỳ]_Ghi ngày 1/[Tháng]/[Năm]" để tránh nhầm lẫn thời gian. | **Zalo Billing Header** |
| **V4.9** | 2026-06-27 | **Bảo Vệ Lịch Sử Thay Đổi**: Tách biệt cập nhật thông tin bổ trợ (gửi tin nhắn, Zalo, địa chỉ, SĐT...) khỏi việc đổi thời gian (`updatedAt`). Lịch sử làm việc chỉ lưu thời điểm thay đổi số nước hoặc thu tiền thực tế. | **History Integrity** |
| **V5.0** | 2026-07-21 | **Đồng Bộ Đồng Hồ Phụ & Tối Ưu Giao Diện Nhóm**: Nâng cấp Apps Script V4.4 tự động tạo cột R (Đồng hồ phụ) với định dạng Checkbox trên Google Sheets, tích hợp cột M trên Excel. Thiết kế lại giao diện thẻ nhóm cực kỳ gọn gàng cho điện thoại (tên nhóm wrap, số tiền dòng 2, nút xoá ở cuối, bỏ mũi tên). | **Major Update (V5.0)** |
| **V5.1** | 2026-08-11 | **Tối Ưu Vị Trí Nút Bấm Zalo**: Chuyển vị trí nút "Gửi Zalo & Chốt số" lên cao ngay bên dưới khối hiển thị số tiền nợ "Còn lại phải thu", giúp tránh thao tác cuộn phiền hà trên màn hình điện thoại khi tác nghiệp thực địa. | **UX Optimization** |
| **V5.2** | 2026-08-11 | **Ghim Kính Lúp & Gỡ Bỏ Quét Ảnh AI / Gửi Nhanh**: Ghim cố định biểu tượng tìm kiếm kính lúp trên thanh Top Header với vạch đứng phân cách mờ. Loại bỏ hoàn toàn tính năng Quét ghi tay AI cũ và danh mục Fast Live Sender dự phòng để làm nhẹ hệ thống, tránh xung đột bất đồng bộ dữ liệu. | **Performance & Layout** |

