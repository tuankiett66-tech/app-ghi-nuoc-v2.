# Gemini Instructions for Water Tracker App

## Lessons Learned & Best Practices

### 1. Excel Column Mapping (Fixed in V3.9)
- **Problem**: "Chỉ số cũ" (Old Index) and "Nợ cũ" (Old Debt) both contain "CŨ". Simple `includes("CŨ")` logic causes mapping collisions.
- **Solution**: 
  - Match "NỢ" (Nợ cũ, Nợ kỳ trước) FIRST.
  - Match "CŨ" but EXCLUDE "NỢ" for "Chỉ số cũ".
  - This ensures Column F (Chỉ số cũ) and Column I (Nợ cũ) are correctly identified.

### 2. Phone Number Deletion (Fixed in V3.9)
- **Problem**: Clearing a phone number in the UI and saving didn't persist the change because `if (updates.phoneTenant)` evaluates to `false` for an empty string, skipping the update.
- **Solution**: Use `if (updates.phoneTenant !== undefined)` to allow `""` to be passed and saved.
- **Problem**: `calculateRow` had fallback logic `phone: cust.phone || cust.phoneTenant` which automatically restored a deleted number if the other field was present.
- **Solution**: Remove fallback logic. Treat `phone` and `phoneTenant` as independent fields.

### 3. Mobile UI & QR Code (Fixed in V3.8)
- **Problem**: Header buttons were too wide for mobile, pushing the QR button off-screen.
- **Solution**: Compact header buttons, use icons only for "Add After", and prioritize the QR button position.
- **Problem**: QR Modal was sometimes hidden or hard to interact with on mobile.
- **Solution**: Implement `showQrInline` in `DetailView` to show the QR code directly below the customer name.

- **Meter Tracking Persistence**: Ensure `installDate` is included in all map/mapping loops in `App.tsx` and `utils.ts` to prevent data loss during Cloud Sync or Excel re-imports.

- **Problem**: Address column values like `304/5` were being reversed/auto-formatted as dates by Excel. Attempting to use a single quote prefix `'` resulted in the quote being visible in the cell value.
- **Solution**: Use a Zero-Width Space (`\u200B`) at the start of the address, MaKH, and phone strings. This is invisible (unlike `'`) and effectively stops Excel's auto-formatting and date-parsing logic.

### 4. Click vs. Reorder Conflict (Fixed in V4.3)
- **Problem**: Reorder buttons (up/down) were too slow and looked "unprofessional". Using arrows in a clickable zone often triggered the wrong action.
- **Solution**: Implement a dedicated "Sort Mode" (Edit Mode). When active, show a 3-bar "Grip" icon. Use `@dnd-kit` for native-feeling drag-and-drop reordering. This completely separates the "Viewing/Navigation" state from the "Organizing" state.

### 5. Multi-Device Group Sync (Fixed in V4.2)
- **Problem**: Overwriting groups during sync led to data loss if one device had 18 groups and another had 20.
- **Solution**: Implement a merge strategy during the `restore` phase. Check if a local group exists in the cloud payload (by ID or Case-Insensitive Name). If not, keep the local version. This ensures all groups from all devices eventually aggregate in the cloud.

### 6. Visibility in Sunlight
- **Problem**: Small fonts for critical numbers (usage, readings) were hard to read outdoors.
- **Solution**: Standardize on high-contrast, large font sizes for numeric data in `DetailView`, `LossView`, and `LossDailyTracking`.

### 7. Group Billing Copy Status & Modern Feedback (Fixed in V4.4)
- **Problem**: Users found it hard to track which group bills had already been copied/billed. Copying data (customer names, group bills) lacked elegant in-context validation, relying on primitive `alert()` popups that broke flow.
- **Solution**:
  - **Dynamic Highlights**: Groups with `group.isProcessed === true` are styled with an emerald border, light green tint, and an inline "Đã copy" checkmark badge in `GroupListView`.
  - **Action Sync**: Copied status `isProcessed` is updated to `true` automatically on clicking copy/Zalo button for the group, and is fully persisted through local/cloud synchronization mechanisms.
  - **Micro-interactions**: Added instant feedback transitions (2 seconds) replacing the standard copy buttons with a double-check icon (`CheckCheck`) and a green hue, replacing popups.
  - **Period Transitions**: All group processed states automatically reset to `false` in `createNewMonth` to ensure a clean slate for the next period.

### 8. Displaying Group Bill Amount on List (Fixed in V4.5)
- **Problem**: When viewing the Group list, collectors had to enter each group's detail view to see the total billing amount, which slowed down physical field collection progress.
- **Solution**: Dynamically calculate each group's total outstanding bill (sum of the `balance` of all group members) in `GroupListView.tsx` and render it directly on the group list cards in a distinct, highly readable rose-600 formatted currency value ("Tiền nhóm: [Số tiền] đ").

### 9. Minimalist Group List Card Layout (Fixed in V4.6)
- **Problem**: The group list cards had a cluttered UI with excessive line clamping, arrow icons, and misaligned metrics that made reading and navigating slow in the field.
- **Solution**: Refactored the cards to be highly minimalist and optimized for mobile:
  - **Line 1 (Group Name)**: Wraps naturally to display the full name without truncate or clamp, keeping the Edit action in context.
  - **Line 2 (Status & Balance)**: Keeps the total balance highlighted in high-contrast rose-600 bold text directly underneath the name, combined with the number of member households and processing indicator.
  - **Clean Structure**: The delete action is placed cleanly at the outer right end, and arrow icons are completely removed. Clicking anywhere on the card opens its details immediately.

### 10. Sub-Meter Sync Persistence (Fixed in V4.7)
- **Problem**: Every time uploading to or downloading from the cloud occurred, the sub-meter ("Đồng hồ phụ" / `isSubMeter`) flag was reset back to default false because the legacy Google Apps Script (V4.3 and earlier) only parsed up to 17 columns (A to Q) and ignored `isSubMeter` entirely.
- **Solution**:
  - **Double-Sync Fallback Mechanism**: Implemented a highly robust fallback mechanism. In `App.tsx`, `isSubMeter` is now backed up both as an individual field and inside the `extra_sync_data` JSON string (which stores a list of sub-meter customers). When restoring data, if the Apps Script is outdated and returns `undefined` for `item.isSubMeter`, the app seamlessly falls back to reading from `extra_sync_data.subMeters`. This prevents any data loss even if the user hasn't redeployed their script.
  - **Updated Google Apps Script (V4.4)**: Created `/docs/script_v4.4.js` which natively supports 18 columns, reading and writing `isSubMeter` directly in Column R of Google Sheets.
  - **Excel Synchronization**: Added support for `"ĐỒNG HỒ PHỤ"` column (Column M / 13) in Excel export and import, completing the end-to-end data integrity chain.

### 11. Customer Position Retention (Fixed in V4.8)
- **Problem**: When searching for a customer (e.g. searching "2750") and opening their details or copying their bill, returning to the list view reset the scroll position back to the top (first item 2001), forcing the user to search or scroll again.
- **Solution**: Pass `selectedId` (or `lastScrollId.current`) into `ListView.tsx` and use a `useEffect` hook to automatically scroll the container to the active customer's DOM element (`#cust-[id]`), preserving position seamlessly.

### 12. Google Photos Style Fast Scrubber (Fixed in V4.8)
- **Problem**: Standard long lists can be tedious to scroll through, but permanent scroll bars clutter mobile screens and obscure card action buttons.
- **Solution**: Implemented an elegant, auto-hiding vertical scrubber handle in `ListView.tsx`. It remains invisible during normal viewing and smoothly fades in (`opacity-100`) only while actively dragging or scrolling, then automatically fades out after 1.2 seconds of inactivity.

### 13. Loss Report Excel Export Fix (Fixed in V4.9)
- **Problem**: Clicking "Báo cáo" in `LossView` failed with `Có lỗi khi xuất Excel!` because dynamic import `await import('xlsx-js-style')` in Vite/ESM returned a module object without unpacking `mod.default`, causing `XLSX.utils` to be `undefined`.
- **Solution**:
  - Refactored `getXLSX()` in `utils.ts` to return `mod.default || mod`.
  - Added robust null-safety, safe value parsing (`parseSafe`), explicit cell typing (`t: 'n' | 's'`), and safe filename sanitization to `exportLossPeriodReportToExcel`.

### 14. Code Modularization & App.tsx Refactoring (Fixed in V5.0)
- **Problem**: As features grew (loss logs, multiple billing groups, backup mechanisms), the main `App.tsx` file became bloated (nearly 1,000 lines), resulting in high information density and making incremental updates extremely slow or prone to context window limits.
- **Solution**:
  - Refactored and split out the complex cloud synchronization mechanisms (`handleSyncCloud`, `handleBackupCloud`, sync state states) into a custom hook `/hooks/useWaterSync.ts`.
  - Re-anchored `App.tsx` strictly as an orchestrator and route dispatcher, dramatically improving build speeds, lint/compile feedback times, and readability.

### 15. Optimizing Detail View Action Flow (Fixed in V5.1)
- **Problem**: In physical field-recording conditions, scrolling down to execute the "Gửi Zalo & Chốt số" action was tedious and slowed down progress on standard phone screens.
- **Solution**: Shifted the primary Zalo action button higher up (positioned immediately below the calculation values of "Còn lại phải thu" and above the "Khách trả tiền" input). Standardized component border-radius to `rounded-2xl` and compacted container padding to `p-4` to fit the critical input-and-send flow entirely inside the initial screen viewport.

### 16. Strict 3-Step Agent Workflow & Authority Limits (Quy trình 3 bước chuẩn, Trách nhiệm và Quyền hạn của Agent)
- **Problem**: In correct field operations, the Agent must NOT blindly or automatically mark bills as paid ("Thu đủ") when a customer claims payment without sending a transaction screenshot, as it leads to incorrect reporting and auditing.
- **Solution**: Enforce a strict definition of the Agent's responsibilities, boundaries, and 3-step workflow in all reasoning steps:
  - **TRÁCH NHIỆM (Responsibilities)**:
    - **Phân tích giao dịch**: Agent chịu trách nhiệm phân tích các tin nhắn biến động số dư / tin nhắn báo chuyển khoản thô, tự động đối khớp mã căn hộ/Mã KH và đề xuất giao dịch phù hợp lên `AgentView`.
    - **Báo cáo đối soát**: Ghi nhận và tổ chức các hộ "Chờ kiểm tra" vào `VerifyView` để người dùng đối chiếu.
    - **Đồng bộ hóa tức thì**: Sau khi được người dùng duyệt lệnh, Agent có trách nhiệm tự động cập nhật hệ thống dữ liệu và sao lưu lên Google Sheets qua Cloud Backup trong vòng 5 giây.
  - **QUYỀN HẠN (Authority Limits - GIỚI HẠN TUYỆT ĐỐI)**:
    - **Không tự ý phê duyệt**: Agent **TUYỆT ĐỐI KHÔNG CÓ QUYỀN** tự động thay đổi trạng thái "Thu đủ" (paid) hoặc đổi màu thẻ sang màu xanh lá của hộ dân khi chỉ có thông tin báo ck bằng lời nhắn mà chưa có bằng chứng chi tiết (ảnh chụp màn hình giao dịch thành công) hoặc ngân hàng chưa báo nhận tiền thực tế.
    - **Kiểm soát tối cao**: Quyền bấm duyệt quyết định "Thu đủ" và hoàn tất chu trình nợ thuộc về **CON NGƯỜI (người quản lý)** sau khi trực tiếp đối chiếu khớp chứng từ.
  - **QUY TRÌNH 3 BƯỚC CHUẨN CỦA AGENT**:
    1. **Bước 1 (Gửi thông báo - COPY BILL)**:
       - Agent đọc trên App danh sách các hộ thuộc Nhóm đã kết bạn Zalo và có dư nợ > 0, chọn tuần tự từ Mã KH nhỏ nhất (ví dụ: 1007).
       - Qua ứng dụng Zalo Web để kiểm tra xem Mã KH này đã được gửi thông báo tiền nước của kỳ này chưa.
       - *Trường hợp chưa gửi*: Nhấn **COPY BILL** trên App rồi dán (Paste) gửi thông báo nước sang Zalo cho khách hàng.
       - *Trường hợp đã gửi rồi nhưng khách chưa thanh toán*: Bỏ qua và chuyển ngay sang Mã KH tiếp theo. Lặp lặp lại quy trình tuần tự cho đến khi hết danh sách.
    2. **Bước 2 (Đối soát & Lập báo cáo Chờ Kiểm Tra - CHỜ DUYỆT)**:
       - Khi có thông báo khách hàng gửi tin nhắn báo đã chuyển tiền hoặc gửi ảnh bill thanh toán trên Zalo, người quản lý/Agent kiểm tra tin nhắn để lấy Mã KH, sau đó quay lại App kiểm tra đối soát thông tin.
       - Nếu thông tin trùng khớp, tiến hành đăng ký trạng thái của Mã KH đó là **"Thông báo đã chuyển khoản nhưng chưa có chi tiết giao dịch - Chờ kiểm tra"** (Verify View) để đưa vào danh sách Chờ duyệt, tuyệt đối **KHÔNG** bấm "Thu đủ" lúc này. Lặp lại quy trình đối soát này cho các tin nhắn tiếp theo.
    3. **Bước 3 (Duyệt Thu Đủ & Gửi Sticker Cảm Ơn)**:
       - Chỉ thực hiện hành động duyệt **"Thu đủ"** (đổi màu xanh lá, dư nợ về 0) cho Mã KH có trong Báo cáo sau khi đã đối khớp xác nhận biến động số dư thực tế từ ngân hàng hoặc chứng từ chuyển khoản thành công.
       - Ngay sau khi duyệt trên hệ thống, quay lại Zalo Web tìm đúng Mã KH tương ứng và gửi sticker Cảm ơn `"🙏"` để hoàn tất chu trình nợ.

### 17. Big Data Optimization & Selective Scope (Fixed in V5.2)
- **Problem**: When running the simulation or uploading real bills in a database of 1800+ customers, the payload sent to Gemini for OCR analysis was extremely large, causing slow processing, matching errors, and hitting context window or API limits. In addition, the dropdown for simulation got cluttered with fully paid or unconnected contacts.
- **Solution**:
  - Filtered the customer scope inside `AgentView` with a strict `filteredCustomers` array matching two conditions simultaneously: **Unpaid** (`balance > 0`) and **Zalo Friend** (`isZaloFriend === true`).
  - Switched the OCR matching payload (`customersPayload`) in `handleFileUpload` to only send this targeted subset, drastically improving speed, decreasing API cost, and ensuring 100% accurate matches without noise.
  - Constrained the Simulation dropdown menu to only display these unpaid Zalo friends, keeping the field UI compact, elegant, and fully aligned with field-collection practices.

### 18. Strict 2-Minute Notification Compliance
- **Rule**: Agent **MUST** adhere to a strict 2-minute cycle (`*/2 * * * *`) for checking, notifying, and reconciling pending items. This ensures no client interaction, balance updates, or payments on Zalo Web are delayed or missed.

## Code References
- `utils.ts`: `parseExcelFile` (mapping logic), `calculateRow` (data normalization), `exportToExcel`, `exportLossPeriodReportToExcel` (safe Excel generation).
- `hooks/useWaterData.ts`: `updateCustomer` (persistence logic).
- `hooks/useWaterSync.ts`: `handleSyncCloud`, `handleBackupCloud` (cloud synchronization and backup logic).
- `components/ListView.tsx`: Auto-hiding fast scrubber icon, customer auto-scroll positioning (`selectedId`).
- `components/DetailView.tsx`: Header layout and inline QR display.
- `components/LossView.tsx`: Loss management & report generation.
