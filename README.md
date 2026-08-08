# Wealth OS — راهنمای Deploy

## مراحل Deploy روی Vercel

### ۱. نصب dependencies
```bash
npm install
```

### ۲. تست محلی
```bash
npm run dev
```

### ۳. Deploy روی Vercel
```bash
npm install -g vercel
vercel
```

یا از طریق سایت vercel.com:
- Import این پوشه
- Framework: Vite
- Build Command: `npm run build`
- Output Directory: `dist`

## نکته مهم — Claude API
فایل `src/App.jsx` به Claude API وصل میشه.
برای کار کردن AI Advisor، باید یک API proxy سمت server اضافه کنی
تا کلید API مخفی بمونه و CORS نداشته باشی.

### راه ساده با Vercel Functions:
یه فایل `api/claude.js` بساز:
```js
export default async function handler(req, res) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(req.body)
  });
  const data = await response.json();
  res.json(data);
}
```

و در `src/App.jsx` آدرس API رو از:
`https://api.anthropic.com/v1/messages`
به:
`/api/claude`
تغییر بده.

سپس در Vercel dashboard، متغیر محیطی `ANTHROPIC_API_KEY` رو اضافه کن.

## راه‌اندازی Supabase (دیتابیس + Auth)

### ۱. ساخت پروژه
یک پروژه رایگان در [supabase.com](https://supabase.com) بساز.

### ۲. اجرای Migration
از منوی **SQL Editor** در داشبورد Supabase، محتوای فایل
`supabase/migrations/0001_init.sql` رو کپی و اجرا کن (یا با Supabase CLI:
`supabase db push`). این کار جدول‌های `assets`, `asset_history`,
`commodities`, `investment_opportunities`, `wealth_snapshots` رو با
Row Level Security فعال می‌سازه — هر کاربر فقط به داده‌ی خودش دسترسی داره.

### ۳. متغیرهای محیطی
از **Project Settings > API** مقادیر زیر رو بردار:

```bash
cp .env.example .env.local
```

و در `.env.local` پر کن:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

همین دو متغیر رو در Vercel dashboard هم (Settings > Environment Variables)
اضافه کن تا نسخه دیپلوی‌شده هم کار کنه.

### ۴. بدون Auth تأیید ایمیل (اختیاری، برای تست سریع‌تر)
در داشبورد Supabase، مسیر **Authentication > Providers > Email** رو باز کن
و «Confirm email» رو خاموش کن تا بعد از ثبت‌نام بلافاصله بشه وارد شد.

بعد از انجام این مراحل، `npm run dev` بزن — صفحه ورود/ثبت‌نام باید نمایش
داده بشه و بعد از اولین ثبت‌نام، داده‌ی نمونه به‌صورت خودکار برای حساب
جدید ساخته می‌شه.
