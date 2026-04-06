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

## Code References
- `utils.ts`: `parseExcelFile` (mapping logic), `calculateRow` (data normalization).
- `hooks/useWaterData.ts`: `updateCustomer` (persistence logic).
- `components/DetailView.tsx`: Header layout and inline QR display.
