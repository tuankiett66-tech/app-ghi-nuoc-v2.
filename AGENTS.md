# Agent Instructions for Water Tracker App

## Critical Data Handling Rules
1. **Excel Column Mapping**:
   - Always prioritize matching "NỢ" (Nợ cũ, Nợ kỳ trước) before matching "CŨ" (Chỉ số cũ).
   - "Chỉ số cũ" mapping should explicitly exclude strings containing "NỢ" to avoid mis-mapping.
   - Example logic in `utils.ts`: `else if (text.includes("NỢ CŨ") || text.includes("NỢ KỲ")) colMap.oldDebt = idx; else if (text.includes("CŨ") && !text.includes("NỢ")) colMap.oldIndex = idx;`

2. **Data Persistence & Sync**:
   - **Phone Numbers**: In `updateCustomer`, always check for `undefined` (e.g., `updates.phoneTenant !== undefined`) to allow empty strings (`""`) to be saved.
   - **Green Status (isProcessed)**: Always include `isProcessed` in Cloud Backup and Restore (Sync) to prevent losing the "sent message" visual indicator.
   - **Meter Install Date (installDate)**: Ensure `installDate` is mapped in `handleBackupCloud` and `handleSyncCloud` to persist meter expiration tracking across devices.
   - **Daily Supply Tracking**: Ensure `dailySupplyReadings` array is included in the Cloud Backup JSON object to persist loss management history.
   - **Group Sync & Merging**: When restoring from cloud, use a merge strategy for `groups` to compare local vs cloud entities (by ID or Name) and preserve data from both sides. Include `extra_sync_data` (stringified JSON) within the `config` object as a fallback for scripts that only support the config table.

3. **UI & Layout**:
   - **Large Numbers**: Priority metrics like "Mã KH", "Tiêu thụ" (Volume), "Số cũ/mới", and "Chỉ số" (CS reading) must use large, bold fonts (e.g., `text-[13px]`+ for labels, `text-[18px]`+ for main values) for high visibility in field conditions.
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
   - Use the dynamic period-based format for the header: `Tiền nước Kỳ [Kỳ]_Ghi ngày 1/[Tháng]/[Năm]` (e.g., `Tiền nước Kỳ 6_Ghi ngày 1/7/2026`).

## Synchronization
- The app uses a Google Apps Script for cloud backup.
- No changes to the script are needed for data structure updates as it handles generic JSON objects.
- Ensure `handleBackupCloud` in `App.tsx` maps all critical fields: `isProcessed`, `isZalo`, `dailySupplyReadings`, `groups`, `lossRecords`, `master1Initial`, `master2Initial`.
