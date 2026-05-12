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

## Code References
- `utils.ts`: `parseExcelFile` (mapping logic), `calculateRow` (data normalization), `exportToExcel` (blank column K logic).
- `hooks/useWaterData.ts`: `updateCustomer` (persistence logic).
- `components/DetailView.tsx`: Header layout and inline QR display.
