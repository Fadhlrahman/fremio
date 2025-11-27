# 🚀 FREMIO DEPLOYMENT GUIDE

Panduan lengkap untuk deploy Fremio ke Cloudflare Pages + Supabase (GRATIS!)

## 📋 Daftar Isi

1. [Arsitektur Sistem](#arsitektur-sistem)
2. [Setup Supabase](#setup-supabase)
3. [Setup Cloudflare R2](#setup-cloudflare-r2)
4. [Deploy ke Cloudflare Pages](#deploy-ke-cloudflare-pages)
5. [Konfigurasi Environment](#konfigurasi-environment)
6. [Custom Domain](#custom-domain)
7. [Troubleshooting](#troubleshooting)

---

## 🏗️ Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                            │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   CLOUDFLARE PAGES (GRATIS)                     │
│                   https://fremio.pages.dev                      │
│                                                                 │
│   📁 Static Files:                                             │
│   • index.html                                                 │
│   • main.js (React App)                                        │
│   • assets/ (images, fonts)                                    │
└──────────────────────────┬──────────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   SUPABASE   │  │ CLOUDFLARE   │  │   SUPABASE   │
│   Database   │  │     R2       │  │   Storage    │
│              │  │   (Opsional) │  │              │
│ • Users      │  │              │  │ • Photos     │
│ • Frames     │  │ • Large      │  │ • Videos     │
│ • Moments    │  │   Videos     │  │ • Avatars    │
│              │  │              │  │              │
│ 💰 500MB     │  │ 💰 10GB      │  │ 💰 1GB       │
│    GRATIS    │  │    GRATIS    │  │    GRATIS    │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## 1️⃣ Setup Supabase

### Langkah 1: Buat Akun & Project

1. Buka [supabase.com](https://supabase.com)
2. Klik **Start your project** (Sign up dengan GitHub)
3. Klik **New Project**
4. Isi:
   - **Name**: `fremio`
   - **Database Password**: (buat password kuat, simpan!)
   - **Region**: `Southeast Asia (Singapore)` ← Pilih ini!
5. Klik **Create new project**
6. Tunggu 2-3 menit sampai selesai

### Langkah 2: Dapatkan Credentials

1. Pergi ke **Project Settings** (gear icon di sidebar)
2. Klik **API**
3. Catat:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR...`

### Langkah 3: Buat Database Tables

Pergi ke **SQL Editor** dan jalankan:

```sql
-- =============================================
-- FREMIO DATABASE SCHEMA
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. PROFILES TABLE (User profiles)
-- =============================================
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    phone VARCHAR(20),
    avatar_url TEXT,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'kreator', 'user')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'banned', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);

-- =============================================
-- 2. FRAMES TABLE
-- =============================================
CREATE TABLE frames (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    thumbnail_url TEXT,
    image_url TEXT,
    max_captures INTEGER DEFAULT 3,
    slots JSONB,
    layout JSONB,
    is_active BOOLEAN DEFAULT true,
    popularity INTEGER DEFAULT 0,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_frames_category ON frames(category);
CREATE INDEX idx_frames_active ON frames(is_active);

-- =============================================
-- 3. MOMENTS TABLE (User captures)
-- =============================================
CREATE TABLE moments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    frame_id UUID REFERENCES frames(id) ON DELETE SET NULL,
    photos JSONB,
    video_url TEXT,
    result_url TEXT,
    metadata JSONB,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_moments_user ON moments(user_id);
CREATE INDEX idx_moments_frame ON moments(frame_id);

-- =============================================
-- 4. USER_FRAMES TABLE (Saved frames)
-- =============================================
CREATE TABLE user_frames (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    frame_id UUID REFERENCES frames(id) ON DELETE CASCADE,
    saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, frame_id)
);

-- =============================================
-- 5. CONTACT_MESSAGES TABLE
-- =============================================
CREATE TABLE contact_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 6. AFFILIATES TABLE
-- =============================================
CREATE TABLE affiliates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    code VARCHAR(20) UNIQUE NOT NULL,
    referral_count INTEGER DEFAULT 0,
    earnings DECIMAL(10, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE frames ENABLE ROW LEVEL SECURITY;
ALTER TABLE moments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_frames ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone" 
    ON profiles FOR SELECT 
    USING (true);

CREATE POLICY "Users can update own profile" 
    ON profiles FOR UPDATE 
    USING (auth.uid() = id);

-- Frames policies (public read)
CREATE POLICY "Frames are viewable by everyone" 
    ON frames FOR SELECT 
    USING (is_active = true);

CREATE POLICY "Admins can manage frames" 
    ON frames FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Moments policies
CREATE POLICY "Users can view own moments" 
    ON moments FOR SELECT 
    USING (user_id = auth.uid() OR is_public = true);

CREATE POLICY "Users can create own moments" 
    ON moments FOR INSERT 
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own moments" 
    ON moments FOR DELETE 
    USING (user_id = auth.uid());

-- User frames policies
CREATE POLICY "Users can manage own saved frames" 
    ON user_frames FOR ALL 
    USING (user_id = auth.uid());

-- =============================================
-- TRIGGER: Auto update updated_at
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_frames_updated_at
    BEFORE UPDATE ON frames
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- TRIGGER: Auto create profile on signup
-- =============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        'user'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- =============================================
-- INSERT SAMPLE DATA
-- =============================================
INSERT INTO frames (name, description, category, max_captures, is_active) VALUES
('Fremio Blue 2', '2 slot foto vertikal - Blue Frame', 'portrait', 2, true),
('Fremio Blue 3', '3 foto x 2 = 6 slot photobooth klasik', 'photobooth', 3, true),
('Fremio Blue 4', '4 slot foto grid 2x2', 'grid', 4, true),
('Fremio Pink 3', '3 foto x 2 = 6 slot photobooth - Pink', 'photobooth', 3, true),
('Fremio Cream 3', '3 foto x 2 = 6 slot photobooth - Cream', 'photobooth', 3, true);
```

### Langkah 4: Setup Storage Buckets

1. Pergi ke **Storage** di sidebar
2. Klik **New bucket**
3. Buat bucket-bucket ini:

| Bucket Name | Public | Keterangan |
|-------------|--------|------------|
| `frames` | ✅ Yes | Frame images |
| `moments` | ✅ Yes | User photos & videos |
| `avatars` | ✅ Yes | Profile photos |
| `thumbnails` | ✅ Yes | Thumbnails |

4. Untuk setiap bucket, klik **Policies** dan tambahkan:

```sql
-- Allow public read
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'frames');

-- Allow authenticated upload
CREATE POLICY "Authenticated Upload" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'moments' AND
    auth.role() = 'authenticated'
);
```

---

## 2️⃣ Setup Cloudflare R2 (Opsional)

Jika butuh lebih banyak storage (>1GB), gunakan Cloudflare R2.

### Langkah 1: Buat Bucket

1. Login ke [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Pilih akun Anda
3. Klik **R2** di sidebar
4. Klik **Create bucket**
5. Nama: `fremio-storage`
6. Location: **Automatic**

### Langkah 2: Setup Public Access

1. Klik bucket `fremio-storage`
2. Pergi ke **Settings**
3. Di **Public access**, klik **Allow Access**
4. Pilih salah satu:
   - **R2.dev subdomain**: Gratis, URL seperti `fremio-storage.xxx.r2.dev`
   - **Custom domain**: Gunakan domain Anda sendiri

### Langkah 3: Buat API Token (Jika Perlu Upload dari Server)

1. Klik **Manage R2 API Tokens**
2. **Create API Token**
3. Permissions: **Object Read & Write**
4. Simpan **Access Key ID** dan **Secret Access Key**

---

## 3️⃣ Deploy ke Cloudflare Pages

### Metode A: Via GitHub (Recommended)

#### Langkah 1: Push ke GitHub

```bash
# Di folder my-app
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/fremio.git
git push -u origin main
```

#### Langkah 2: Connect Cloudflare Pages

1. Buka [Cloudflare Pages](https://pages.cloudflare.com)
2. Klik **Create a project**
3. Pilih **Connect to Git**
4. Authorize GitHub
5. Pilih repository `fremio`
6. Konfigurasi build:

| Setting | Value |
|---------|-------|
| **Project name** | `fremio` |
| **Production branch** | `main` |
| **Framework preset** | `None` |
| **Build command** | `npm run build:cloudflare` |
| **Build output directory** | `dist` |
| **Root directory** | `my-app` |

7. Tambahkan **Environment Variables**:

| Variable | Value |
|----------|-------|
| `NODE_VERSION` | `18` |
| `VITE_SUPABASE_URL` | `https://xxxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJI...` |
| `VITE_APP_NAME` | `Fremio` |

8. Klik **Save and Deploy**
9. Tunggu 2-3 menit

✅ **Selesai!** Aplikasi Anda live di: `https://fremio.pages.dev`

### Metode B: Via CLI (Manual Deploy)

```bash
# Install Wrangler CLI
npm install -g wrangler

# Login ke Cloudflare
wrangler login

# Build aplikasi
cd my-app
npm install
npm run build:cloudflare

# Deploy
wrangler pages deploy dist --project-name=fremio
```

---

## 4️⃣ Konfigurasi Environment

### Local Development

Buat file `.env` di folder `my-app`:

```env
# Supabase
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Optional: Cloudflare R2
VITE_R2_PUBLIC_URL=https://fremio-storage.xxx.r2.dev

# App Config
VITE_APP_NAME=Fremio
VITE_APP_URL=http://localhost:5173
```

### Production (Cloudflare Pages)

1. Buka project di Cloudflare Pages dashboard
2. Pergi ke **Settings** > **Environment variables**
3. Tambahkan semua variable di atas

---

## 5️⃣ Custom Domain (Opsional)

### Langkah 1: Beli Domain

Beli domain di:
- [Namecheap](https://namecheap.com) (~$10/tahun)
- [Niagahoster](https://niagahoster.co.id) (~Rp 150k/tahun)
- [Cloudflare Registrar](https://cloudflare.com) (harga grosir)

### Langkah 2: Tambahkan ke Cloudflare Pages

1. Buka project Fremio di Pages
2. Klik **Custom domains**
3. Klik **Set up a custom domain**
4. Masukkan domain: `fremio.com`
5. Ikuti instruksi untuk setup DNS

### Langkah 3: Konfigurasi DNS

Jika domain di Cloudflare:
- Otomatis dikonfigurasi

Jika domain di tempat lain:
- Tambahkan CNAME record:
  - Name: `@` atau `www`
  - Target: `fremio.pages.dev`

---

## 6️⃣ Verifikasi Deployment

### Checklist:

- [ ] Website accessible di `https://fremio.pages.dev`
- [ ] Login/Register berfungsi
- [ ] Upload foto berfungsi
- [ ] Frame selection berfungsi
- [ ] Capture moment berfungsi
- [ ] HTTPS aktif (gembok hijau)

### Test Commands:

```bash
# Test website
curl -I https://fremio.pages.dev

# Test Supabase connection
curl https://xxxxx.supabase.co/rest/v1/frames \
  -H "apikey: YOUR_ANON_KEY"
```

---

## 7️⃣ Troubleshooting

### Error: "Page Not Found" setelah refresh

**Solusi**: Pastikan file `_routes.json` dan `functions/_middleware.js` sudah ada.

### Error: "Supabase not configured"

**Solusi**: Pastikan environment variables sudah diset di Cloudflare Pages dashboard.

### Error: Upload gagal

**Solusi**: 
1. Cek Storage policies di Supabase
2. Pastikan bucket sudah dibuat dan public

### Build gagal di Cloudflare

**Solusi**:
1. Cek build logs
2. Pastikan `NODE_VERSION=18` diset
3. Pastikan `npm run build:cloudflare` jalan di local

---

## 📊 Monitoring & Analytics

### Cloudflare Analytics (Gratis)

1. Buka project di Pages dashboard
2. Klik tab **Analytics**
3. Lihat:
   - Total requests
   - Unique visitors
   - Bandwidth usage
   - Top pages

### Supabase Dashboard

1. Buka Supabase project
2. Lihat:
   - Database usage
   - Storage usage
   - Auth users
   - API requests

---

## 💰 Estimasi Biaya

| Layanan | Free Tier | Biaya Setelah Limit |
|---------|-----------|---------------------|
| **Cloudflare Pages** | Unlimited | GRATIS selamanya |
| **Supabase Database** | 500MB | $25/bln (8GB) |
| **Supabase Auth** | 50,000 MAU | $25/bln (100k) |
| **Supabase Storage** | 1GB | $0.021/GB |
| **Cloudflare R2** | 10GB | $0.015/GB |
| **Custom Domain** | - | ~$10-15/tahun |

**Total untuk mulai: Rp 0 (GRATIS!)**

---

## 🎉 Selesai!

Fremio Anda sekarang:
- ✅ Live di `https://fremio.pages.dev`
- ✅ Database di Supabase Singapore
- ✅ CDN global via Cloudflare
- ✅ Gratis sampai traffic besar!

Jika ada pertanyaan, buka issue di GitHub repository.
