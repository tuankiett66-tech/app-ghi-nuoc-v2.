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

4. **Excel Export**:
   - When exporting for a new period (file name starts with `Ky_Moi`), the "NỢ LẠI" column (Column K) must be blank to allow the collector to write in it.
   - For MaKH, Address, and Phone columns, use a Zero-Width Space (`\u200B`) prefix in the Excel cell to prevent auto-formatting (e.g., preventing addresses from flipping to dates and keeping leading zeros in phones).
   - Example logic in `utils.ts`: `const safeAddress = c.address ? "\u200B" + c.address : "";`

5. **Zalo Message Logic**:
   - Include "ĐÃ THANH TOÁN: -[số tiền]" in the message if `paid` > 0 to clearly show the deduction.
   - Use the dynamic period-based format for the header: `Tiền nước  KỲ [Kỳ]/[Năm]_Ngày ghi chỉ số:1/[Tháng]/[Năm].` (e.g., `Tiền nước  KỲ 6/2026_Ngày ghi chỉ số:1/7/2026.`).

## Synchronization
- The app uses a Google Apps Script for cloud backup.
- **Double-Backup Fallback**: To ensure backward compatibility, `isSubMeter` status must be saved both directly inside each customer row and consolidated inside the `extra_sync_data` JSON string (under `subMeters`). This guarantees that if a user uses an older script version, their sub-meter properties are still preserved during restore.
- Update the Apps Script reference in `/docs/script_v4.4.js` to support 18 columns, including `isSubMeter` in Column R.
- Ensure `handleBackupCloud` in `App.tsx` maps all critical fields: `isProcessed`, `isZalo`, `isSubMeter`, `dailySupplyReadings`, `groups`, `lossRecords`, `master1Initial`, `master2Initial`.
