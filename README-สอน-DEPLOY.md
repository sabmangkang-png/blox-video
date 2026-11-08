# BLOX Video Library - เสร็จสมบูรณ์ พร้อม Deploy

## ✅ สิ่งที่ทำเสร็จแล้ว
- Supabase: ตาราง videos + video_categories + bucket video-library-private (private)
- ส่วนขยาย: pg_trgm + search + view_count (ไฟล์ supabase-extensions.sql)
- Frontend: React + Vite + Supabase (ไฟล์ในโฟลเดอร์นี้)
- .env ใส่ URL + Publishable Key ของคุณแล้ว (ebwcypckzdbdbdxujwru)

## 🎯 สอน Deploy บน Vercel แบบทีละคลิก (ฟรี)

### ขั้นตอนที่ 0: เตรียมไฟล์ (1 นาที)
1. แตกไฟล์ ZIP นี้ จะได้โฟลเดอร์ `blox-final`
2. เช็คว่ามีไฟล์: package.json, vite.config.js, index.html, src/App.jsx, .env

### ขั้นตอนที่ 1: เพิ่มส่วนขยายใน Supabase (2 นาที)
1. เปิด https://supabase.com/dashboard/project/ebwcypckzdbdbdxujwru
2. เมนูซ้าย > SQL Editor > New Query
3. เปิดไฟล์ `supabase-extensions.sql` ในโฟลเดอร์นี้ > ก๊อปทั้งหมด > วางใน SQL Editor
4. กดปุ่ม Run (▶️) รอขึ้น Success

### ขั้นตอนที่ 2: เอาขึ้น GitHub (3 นาที)
วิธีง่ายสุด ไม่ต้องใช้คำสั่ง:
1. เปิด https://github.com/new > ตั้งชื่อ repo: `blox-video` > Create repository
2. กด `uploading an existing file` > ลากไฟล์ทั้งหมดในโฟลเดอร์ `blox-final` ใส่ > Commit

วิธีใช้คำสั่ง (ถ้าถนัด):
```
cd blox-final
git init
git add .
git commit -m "blox video"
git branch -M main
git remote add origin https://github.com/USERNAME/blox-video.git
git push -u origin main
```

### ขั้นตอนที่ 3: Deploy บน Vercel (3 นาที)
1. เปิด https://vercel.com > Sign up / Login ด้วย GitHub
2. กด Add New > Project > Import Git Repository > เลือก `blox-video`
3. หน้า Configure Project:
   - Framework Preset: Vite (Vercel จะเลือกให้เอง)
   - Root Directory: ./
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. หัวข้อ Environment Variables > ใส่ 2 ตัวนี้ (ถึงจะมี .env แล้ว ใส่ใน Vercel อีกครั้งจะชัวร์กว่า):
   ```
   VITE_SUPABASE_URL = https://ebwcypckzdbdbdxujwru.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY = sb_publishable_8etbk1QfsjFrCUT6aLreFQ_rUIY8386
   ```
5. กด Deploy > รอ 1-2 นาที > จะได้ลิงก์:
   `https://blox-video-xxxx.vercel.app`
   กดลิงก์นั้นได้เลย ใช้งานได้จริง!

### ขั้นตอนที่ 4: ทดสอบเว็บจริง
1. เปิดลิงก์ Vercel > ดูมุมขวาบน ต้องขึ้น `● เชื่อม Supabase แล้ว`
2. กด อัปโหลด > สมัคร/ล็อกอินด้วยอีเมล
3. อัปโหลดวิดีโอ MP4 (ไม่เกิน 100MB) > จะได้สถานะ pending
4. ไป Supabase Dashboard > Table Editor > videos > เปลี่ยน status เป็น published + ใส่ published_at = now()
5. กลับไปหน้าเว็บ กดรีเฟรช วิดีโอจะขึ้นหน้าแรก + กดเล่นได้

## ❓ ถ้า Deploy แล้วไม่ขึ้นวิดีโอ
- เช็ค Vercel > Settings > Environment Variables ว่ามี 2 ตัวครบไหม แล้วกด Redeploy
- เช็ค Supabase > Table Editor > videos ว่ามีแถว status = published ไหม
- เช็ค Supabase > Storage > video-library-private ว่ามีไฟล์ไหม
- เปิด Console ในเบราว์เซอร์ (F12) ดู error สีแดง แล้วส่งรูปมาให้ผมดูได้

## 🔒 ความปลอดภัย
- ในเว็บนี้ใช้แค่ Publishable Key (sb_publishable_...) ซึ่งออกแบบมาให้อยู่หน้าเว็บได้ ปลอดภัย
- ห้ามใส่ service_role key (sb_secret_...) ในเว็บหรือใน .env เด็ดขาด
