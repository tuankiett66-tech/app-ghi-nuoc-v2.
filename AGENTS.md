# Agent Instructions for Water Tracker App

## Critical Data Handling Rules
1. **Excel Column Mapping**:
   - Always prioritize matching "NỢ" (Nợ cũ, Nợ kỳ trước) before matching "CŨ" (Chỉ số cũ).
   - "Chỉ số cũ" mapping should explicitly exclude strings containing "NỢ" to avoid mis-mapping.
   - Example logic in `utils.ts`: `else if (text.includes("NỢ CŨ") || text.includes("NỢ KỲ")) colMap.oldDebt = idx; else if (text.includes("CŨ") && !text.includes("NỢ")) colMap.oldIndex = idx;`

2. **Data Persistence & Sync**:
   - **Phone Numbers**: In `updateCustomer`, always check for `undefined` (e.g., `updates.phoneTenant !== undefined`) to allow empty strings (`""`) to be saved.
   - **Green Status (isProcessed)**: Always include `isProcessed` in Cloud Backup and Restore (Sync) to prevent losing the "sent message" visual indicator.
   - **Group Billing Processed Status (`isProcessed`)**: Track the `isProcessed` boolean flag for each group. Ensure it is preserved during cloud backup and restored properly inside the `groups` list (within `extra_sync_data` of the configuration).
   - **Meter Expiry & Group Status Reset**: All group `isProcessed` flags must be reset to `false` automatically when initiating a new period (`createNewMonth` or chốt kỳ) to start clean.
   - **Meter Install Date (installDate)**: Ensure `installDate` is mapped in `handleBackupCloud` and `handleSyncCloud` to persist meter expiration tracking across devices.
   - **Daily Supply Tracking**: Ensure `dailySupplyReadings` array is included in the Cloud Backup JSON object to persist loss management history.
   - **Group Sync & Merging**: When restoring from cloud, use a merge strategy for `groups` to compare local vs cloud entities (by ID or Name) and preserve data from both sides. Include `extra_sync_data` (stringified JSON) within the `config` object as a fallback for scripts that only support the config table.

3. **UI & Layout**:
   - **Fast Vertical Scrubber (Google Photos style)**: In `ListView.tsx`, provide a subtle floating scrubber handle (`ChevronsUpDown`) on the right side. It must stay hidden by default and fade in smoothly (`opacity-100`) only when scrolling or dragging, and automatically fade out (`opacity-0`) after 1.2s of inactivity for a clean, non-obtrusive UI.
   - **Selected Customer Position Preservation**: When searching or interacting with a customer (e.g. searching "2750" and navigating back from DetailView or completing an action), the list view must remember the customer (`selectedId` / `lastScrollId.current`) and automatically scroll to keep that customer visible at the top of `ListView`.
   - **Large Numbers**: Priority metrics like "Mã KH", "Tiêu thụ" (Volume), "Số cũ/mới", and "Chỉ số" (CS reading) must use large, bold fonts (e.g., `text-[13px]`+ for labels, `text-[18px]`+ for main values) for high visibility in field conditions.
   - **Group Copied Status indicators**: Group cards in the main Group List must visually highlight copy status. When `group.isProcessed` is `true`, style the card with an emerald border, high-contrast subtle green background (`border-emerald-500 bg-emerald-50/10`), and a "Đã copy" checkmark badge.
   - **Group Bill Total display on list**: Each group card in `GroupListView.tsx` must display the total outstanding bill of all members in the group (calculated as the sum of members' `balance`). Use a distinct, high-contrast label ("Tiền nhóm") and a prominent rose-600 colored text format (e.g. `text-rose-600 text-[15px] font-black`) next to the action buttons for instant visibility.
   - **Minimalist Group Card Layout**: The group cards in `GroupListView.tsx` must be styled to be highly minimalist and easy to read under field conditions:
     - **Line 1 (Tên nhóm)**: Must show the group name fully without using line clamp so that the text wraps naturally (`break-words`), with a small edit button on the side.
     - **Line 2 (Số tiền & Hộ thành viên)**: Displays the group balance in dynamic rose-600 colored text next to the "Tiền nhóm:" label, accompanied by the count of household members and "ĐÃ COPY" badge if processed.
     - **Trash Button Position**: Placed at the very end (far right) of the card, centered vertically.
     - **Click to Detail**: Clicking the card navigates directly to Detail View. Normal arrow indicators (`ArrowRight`) must be omitted for maximum minimalism.
   - **Copy Action Feedback**: Trigger instant visual micro-animations and status updates upon copying critical data:
     - When copying a customer name in `DetailView`, immediately change the button layout to green (`bg-emerald-100 text-emerald-700`) and replace the copy icon with a double-check (`CheckCheck` icon) for 2 seconds.
     - When copying a group's combined invoice (`BILL` action in `GroupDetailView`), change the button label to "ĐÃ COPY" and replace the icon with `CheckCheck` for 2 seconds.
   - **Reorder Control Segregation**: In lists where items can be reordered (Groups, Members), use a dedicated "Sort Mode" (Edit Mode) triggered by a button in the header. In this mode:
     - Show a 3-bar "Grip" handle at the start of each card for drag-and-drop reordering using `dnd-kit`.
     - Disable normal navigation/deletion clicks to prevent accidental triggers while reordering.
     - Provide a "Done" button to exit the mode.
   - The QR button must be prioritized in the header for mobile visibility.
   - QR code display should be inline within `DetailView` (using `showQrInline` state) to avoid modal overlay issues on mobile.
   - Always provide a "Copy Name" button next to the customer name in `DetailView`.
   - **Optimized DetailView Layout (Zalo Position)**: The "Gửi Zalo & Chốt số" button must be positioned high up in the detail layout, immediately below the "Còn lại phải thu" block and above the "Khách trả tiền" form. This prevents having to scroll down on mobile screens. Keep card padding compact (`p-4` or `p-3.5`) and border radius to a neat `rounded-2xl` to ensure the entire primary flow fits within the mobile viewport.

4. **Excel Export**:
   - When exporting for a new period (file name starts with `Ky_Moi`), the "NỢ LẠI" column (Column K) must be blank to allow the collector to write in it.
   - For MaKH, Address, and Phone columns, use a Zero-Width Space (`\u200B`) prefix in the Excel cell to prevent auto-formatting (e.g., preventing addresses from flipping to dates and keeping leading zeros in phones).
   - In `exportLossPeriodReportToExcel`, ensure `getXLSX()` unswaps `.default` and all cell structures explicitly format values and safe file names to prevent runtime export failures.
   - Example logic in `utils.ts`: `const safeAddress = c.address ? "\u200B" + c.address : "";`

5. **Zalo Message Logic**:
   - Include "ĐÃ THANH TOÁN: -[số tiền]" in the message if `paid` > 0 to clearly show the deduction.
   - Use the dynamic period-based format for the header: `Tiền nước  KỲ [Kỳ]/[Năm]_Ngày ghi chỉ số:1/[Tháng]/[Năm].` (e.g., `Tiền nước  KỲ 6/2026_Ngày ghi chỉ số:1/7/2026.`).

6. **Strict 3-Step Agent Workflow & Authority Limits (Quy trình 3 bước chuẩn, Trách nhiệm và Quyền hạn của Agent)**:
   - **TRÁCH NHIỆM (Responsibilities)**:
     - **Đối soát cú pháp & Khớp thông tin**: Agent xử lý nội dung giao dịch chuyển khoản thô (tin nhắn biến động số dư, tin nhắn báo ck từ KH), phân tích cú pháp để trích xuất số tiền, tự động tìm kiếm và đối khớp với Mã KH phù hợp để hiển thị gợi ý thông minh trong `AgentView`.
     - **Tổ chức báo cáo đối soát**: Agent tự động tổng hợp danh sách các khách hàng chuyển khoản thiếu chi tiết giao dịch vào danh mục "Chờ kiểm tra" (Verify View) để người quản lý dễ dàng đối chiếu trực tiếp với ngân hàng cuối kỳ.
     - **Đồng bộ hóa dữ liệu**: Sau khi có lệnh duyệt chính thức từ người quản lý, Agent có trách nhiệm ghi nhận đầy đủ, đồng bộ và tự động sao lưu trực tiếp dữ liệu (bao gồm cả trạng thái `isProcessed`) lên Google Sheets qua Cloud Backup trong vòng 5 giây.
   - **QUYỀN HẠN (Authority Limits - GIỚI HẠN TUYỆT ĐỐI)**:
     - **Không tự ý phê duyệt**: Agent **TUYỆT ĐỐI KHÔNG CÓ QUYỀN** tự động đổi trạng thái khách hàng sang "Thu đủ" (paid = nợ cũ + tiền kỳ mới) hoặc dán nhãn màu xanh lá khi khách hàng chỉ tuyên bố bằng lời nhắn/tin nhắn chữ mà chưa gửi kèm ảnh chụp giao dịch thành công hoặc khi ngân hàng chưa thông báo nhận được tiền thực tế.
     - **Quyền quyết định thuộc về Con người**: Chỉ người quản lý (Con người) mới có quyền bấm phê duyệt lệnh "Thu đủ" trên hệ thống sau khi đã trực đối khớp chứng từ giao dịch hoặc tài khoản ngân hàng nhận tiền thành công.
   - **QUY TRÌNH 3 BƯỚC CHUẨN CỦA AGENT**:
     - **Bước 1: Gửi thông báo nước (Copy Bill)**:
       - Agent đọc trên App danh sách các hộ thuộc Nhóm đã kết bạn Zalo và có dư nợ > 0, chọn tuần tự từ Mã KH nhỏ nhất (ví dụ: 1007).
       - Qua ứng dụng Zalo Web để kiểm tra xem Mã KH này đã được gửi thông báo tiền nước của kỳ này chưa.
       - *Trường hợp chưa gửi*: Nhấn **COPY BILL** trên App rồi dán (Paste) gửi thông báo nước sang Zalo cho khách hàng.
       - *Trường hợp đã gửi rồi nhưng khách chưa thanh toán*: Bỏ qua và chuyển ngay sang Mã KH tiếp theo. Lặp lặp lại quy trình tuần tự cho đến khi hết danh sách.
     - **Bước 2: Đối soát & Lập báo cáo Chờ Kiểm Tra (Chờ Duyệt)**:
       - Khi có thông báo khách hàng gửi tin nhắn báo đã chuyển tiền hoặc gửi ảnh bill thanh toán trên Zalo, người quản lý/Agent kiểm tra tin nhắn để lấy Mã KH, sau đó quay lại App kiểm tra đối soát thông tin.
       - Nếu thông tin trùng khớp, tiến hành đăng ký trạng thái của Mã KH đó là **"Thông báo đã chuyển khoản nhưng chưa có chi tiết giao dịch - Chờ kiểm tra"** (Verify View) để đưa vào danh sách Chờ duyệt, tuyệt đối **KHÔNG** bấm "Thu đủ" lúc này. Lặp lại quy trình đối soát này cho các tin nhắn tiếp theo.
     - **Bước 3: Duyệt Thu Đủ & Gửi Sticker Cảm Ơn**:
       - Chỉ thực hiện hành động duyệt **"Thu đủ"** (đổi màu xanh lá, dư nợ về 0) cho Mã KH có trong Báo cáo sau khi đã đối khớp xác nhận biến động số dư thực tế từ ngân hàng hoặc chứng từ chuyển khoản thành công.
       - Ngay sau khi duyệt trên hệ thống, quay lại Zalo Web tìm đúng Mã KH tương ứng và gửi sticker Cảm ơn `"🙏"` để hoàn tất chu trình nợ.
   - **LỌC TỐI ƯU DỮ LIỆU LỚN (1800+ KH)**:
     - Để giải quyết vấn đề quá tải dữ liệu, Agent **CHỈ QUAN TÂM VÀ CHỈ HIỂN THỊ** các hộ dân thỏa mãn đồng thời hai điều kiện: **Chưa thanh toán** (balance > 0) và **Đã kết bạn Zalo** (`isZaloFriend === true`).
     - Tự động bỏ qua các hộ đã ghi nhận "Thu Đủ" hoặc chưa kết bạn Zalo khỏi danh mục tác nghiệp của Agent và Payload gửi sang Gemini OCR nhằm tối ưu hóa chi phí, tốc độ xử lý và hạn chế tối đa sai lệch định danh.

## Synchronization
- The app uses a Google Apps Script for cloud backup.
- **Double-Backup Fallback**: To ensure backward compatibility, `isSubMeter` status must be saved both directly inside each customer row and consolidated inside the `extra_sync_data` JSON string (under `subMeters`). This guarantees that if a user uses an older script version, their sub-meter properties are still preserved during restore.
- Update the Apps Script reference in `/docs/script_v4.4.js` to support 18 columns, including `isSubMeter` in Column R.
- Ensure `handleBackupCloud` in `useWaterSync.ts` maps all critical fields: `isProcessed`, `isZalo`, `isSubMeter`, `dailySupplyReadings`, `groups`, `lossRecords`, `master1Initial`, `master2Initial`.

## Code Architecture & Modularization
To prevent information overload and make updates fast, the application codebase is strictly organized by functional modules:
1. **Core Data State (`/hooks/useWaterData.ts`)**:
   - Manages customers, configuration, group structures, loss records, and local storage state.
   - Contains functions like `updateCustomer`, `closePeriod`, `addNewCustomer`, `deleteCustomer`, etc.
2. **Cloud Synchronization (`/hooks/useWaterSync.ts`)**:
   - Manages cloud backup and restore procedures (`handleBackupCloud`, `handleSyncCloud`).
   - Keeps sync states (`isSyncing`, `syncStatus`, `lastAutoBackup`) separate from the UI components.
3. **Helper Utilities (`/utils.ts`)**:
   - Houses Excel generation, import parsers, calculation logic (`calculateRow`), date formatters, and Zalo message formatting.
4. **Isolated Components (`/components/*`)**:
   - Individual modules for `ListView`, `DetailView`, `LossView`, `StatsView`, `GroupListView`, `GroupDetailView`, etc.
   - Any state-dependent screen or visual subsystem must be built in its own file under `/components` rather than bundled into `App.tsx`.
5. **Main Entry & Routing (`/App.tsx`)**:
   - Orchestrates screen switching and ties hooks (`useWaterData`, `useWaterSync`) with visual components. Do not put data-fetching or backup business logic directly in `App.tsx` — delegate to dedicated hooks.
