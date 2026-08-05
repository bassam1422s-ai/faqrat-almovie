# فقرة الموفي

موقع تقييم أفلام "فقرة الموفي" — كل واحد يقيّم من جواله، وبمجرد ما يخلص الجميع تنكشف كل التقييمات على شاشات الجميع بنفس اللحظة.

## الإعداد (مرة وحدة)

يحتاج المشروع 3 حسابات مجانية. اتبع الخطوات بالترتيب.

### 1. TMDB (بيانات الأفلام)

1. أنشئ حساب مجاني في [themoviedb.org](https://www.themoviedb.org/signup).
2. من الإعدادات → API → اطلب مفتاح API (نوع Developer).
3. انسخ قيمة **API Read Access Token** (مو الـ API Key العادي).

### 2. Supabase (قاعدة البيانات + التقييم اللحظي)

1. أنشئ حساب مجاني في [supabase.com](https://supabase.com).
2. أنشئ مشروع جديد (New Project).
3. من Project Settings → API، انسخ **Project URL** و **anon public key**.
4. من القائمة الجانبية اذهب لـ **SQL Editor** → New query، الصق محتوى ملف
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) كامل، واضغط Run.
5. من **Table Editor**، افتح جدول `participants` وأضف صف لكل واحد من الخمسة (عمود `name` فقط، الباقي تلقائي).

### 3. متغيرات البيئة

انسخ `.env.local.example` إلى `.env.local` واملأ القيم:

```bash
cp .env.local.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
TMDB_API_KEY=...
```

### 4. التشغيل محلياً

```bash
npm install
npm run dev
```

افتح [http://localhost:3000](http://localhost:3000).

## النشر (Vercel)

1. أنشئ مستودع جديد على GitHub وارفع المشروع له.
2. أنشئ حساب مجاني في [vercel.com](https://vercel.com) واربطه بحساب GitHub.
3. Import Project → اختر المستودع.
4. في Environment Variables أضف نفس المتغيرات الثلاثة من `.env.local`.
5. Deploy.

الرابط اللي يعطيك إياه Vercel (`your-project.vercel.app`) هو الرابط الثابت اللي تحفظونه كلكم.

## إضافة عضو جديد لاحقاً

من Supabase → Table Editor → جدول `participants`، أضف صف جديد بالاسم فقط.
