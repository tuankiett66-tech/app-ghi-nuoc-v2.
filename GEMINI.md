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

## Code References
- `utils.ts`: `parseExcelFile` (mapping logic), `calculateRow` (data normalization), `exportToExcel` (blank column K logic).
- `hooks/useWaterData.ts`: `updateCustomer` (persistence logic).
- `components/DetailView.tsx`: Header layout and inline QR display.
