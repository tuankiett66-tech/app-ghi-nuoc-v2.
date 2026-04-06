# Agent Instructions for Water Tracker App

## Critical Data Handling Rules
1. **Excel Column Mapping**:
   - Always prioritize matching "NỢ" (Nợ cũ, Nợ kỳ trước) before matching "CŨ" (Chỉ số cũ).
   - "Chỉ số cũ" mapping should explicitly exclude strings containing "NỢ" to avoid mis-mapping.
   - Example logic in `utils.ts`: `else if (text.includes("NỢ CŨ") || text.includes("NỢ KỲ")) colMap.oldDebt = idx; else if (text.includes("CŨ") && !text.includes("NỢ")) colMap.oldIndex = idx;`

2. **Phone Number Persistence**:
   - In `calculateRow`, do NOT use fallback logic like `phone: cust.phone || cust.phoneTenant`. This prevents users from clearing one field if the other has data.
   - In `updateCustomer`, always check for `undefined` (e.g., `updates.phoneTenant !== undefined`) instead of truthiness. This allows empty strings (`""`) to be saved and persisted to the database.

3. **UI & Layout**:
   - The QR button must be prioritized in the header for mobile visibility.
   - QR code display should be inline within `DetailView` (using `showQrInline` state) to avoid modal overlay issues on mobile.
   - Always provide a "Copy Name" button next to the customer name in `DetailView`.

## Synchronization
- The app uses a Google Apps Script for cloud backup.
- No changes to the script are needed for data structure updates as it handles generic JSON objects.
- Ensure `handleBackupCloud` in `App.tsx` correctly maps all fields, including `phoneTenant`.
