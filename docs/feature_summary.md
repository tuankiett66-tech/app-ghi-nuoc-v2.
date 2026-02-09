# Bang Tom Tat Tinh Nang - App Ghi Nuoc (Cap nhat 2024-05-25)

| Ten Tinh Nang | File Phu Trach | Trang Thai | Ghi Chu Logic |
| :--- | :--- | :--- | :--- |
| Quan ly Danh Bo | `hooks/useWaterData.ts` | Hoan thanh | Tach biet Bo 01 va Bo 02 qua `activeTab`. Luu tru LocalStorage. |
| Tinh Toan Ke Toan | `utils.ts` | Hoan thanh | Balance = (Volume * Rate + OldDebt) - Paid. Tu dong tinh khi nhap So Moi. |
| Tim Kiem Giong Noi | `components/Header.tsx`, `components/GroupDetailView.tsx` | Moi | Su dung Web Speech API de nhap STT hoac Tim ten nhanh bang giong noi. |
| Nhap Lieu & Dieu Huong | `components/DetailView.tsx`, `components/Modals.tsx` | Toi uu | Sau khi sua thong tin se quay lai dung trang Chi tiet KH, khong bi out ra danh sach. |
| Quan ly Nhom (Compact) | `components/GroupDetailView.tsx` | Toi uu | Bo cuc sieu gon (Compact), hien thi nhieu KH hon, tu dong xoa o nhap STT sau khi "+" de nhap tiep. |
| Gui Zalo Rieng Le | `App.tsx` | Hoan thanh | Copy noi dung vao clipboard truoc khi redirect zalo.me. |
| Quet Ma QR Pay | `components/Modals.tsx` | Hoan thanh | Tich hop VietQR tu dong theo so du (balance) va ten khach khong dau. |
| Xuat/Nhap Excel | `utils.ts` | Hoan thanh | Ho tro gop du lieu tu file Excel vao App (chi ap dung cho Danh bo goc). |
| Chot Ky Moi | `hooks/useWaterData.ts` | Hoan thanh | Chuyen Balance thanh OldDebt, reset NewIndex ve 0, xoa dau Zalo. |
| Thong Ke & Verify | `components/StatsView.tsx`, `components/VerifyView.tsx` | Hoan thanh | Theo doi doanh thu va doi soat dong tien trong ngay. |