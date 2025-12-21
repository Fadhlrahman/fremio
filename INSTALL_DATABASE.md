# Database Installation Guide

## Option 1: PostgreSQL (Recommended for Production)

### Step 1: Download PostgreSQL

1. Download installer dari: https://www.postgresql.org/download/windows/
2. Atau gunakan direct link: https://www.enterprisedb.com/downloads/postgres-postgresql-downloads
3. Pilih versi: **PostgreSQL 17.x** untuk Windows x86-64

### Step 2: Install PostgreSQL

1. Jalankan installer sebagai **Administrator** (klik kanan → Run as Administrator)
2. Klik **Next** sampai ke halaman **Select Components**
3. Pastikan **PostgreSQL Server** dan **Command Line Tools** ter-checklist
4. Klik **Next**
5. **Data Directory**: Biarkan default (biasanya `C:\Program Files\PostgreSQL\17\data`)
6. **Password**: Masukkan password untuk user `postgres` (INGAT PASSWORD INI!)
   - Contoh: `postgres123` (simpan di notepad!)
7. **Port**: Biarkan default **5432**
8. **Locale**: Pilih **[Default locale]**
9. Klik **Next** → **Next** → **Finish**

### Step 3: Setup Database

Setelah install selesai:

```powershell
# 1. Buka PowerShell sebagai Administrator
# 2. Masuk ke psql
cd "C:\Program Files\PostgreSQL\17\bin"
.\psql.exe -U postgres

# 3. Masukkan password yang tadi dibuat
# 4. Di psql prompt, jalankan:
CREATE DATABASE fremio;
\c fremio
\q

# 5. Import schema
.\psql.exe -U postgres -d fremio -f "D:\Project\fremio\database\schema.sql"

# 6. (Optional) Import seed data
.\psql.exe -U postgres -d fremio -f "D:\Project\fremio\database\seed.sql"

# 7. Setup payment tables
.\psql.exe -U postgres -d fremio -f "D:\Project\fremio\database\setup-payment-tables.sql"
```

### Step 4: Update Backend .env

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=fremio
DB_USER=postgres
DB_PASSWORD=postgres123  # Password yang tadi Anda buat
```

### Step 5: Restart Backend

```powershell
cd D:\Project\fremio\backend
npm start
```

---

## Option 2: SQLite (Easier for Development)

SQLite tidak perlu instalasi terpisah, sudah include di Node.js!

### Step 1: Install SQLite Package

```powershell
cd D:\Project\fremio\backend
npm install better-sqlite3
```

### Step 2: Create SQLite Database File

Saya akan buatkan adapter-nya.

---

## Current Status

**Masalah Saat Ini:**

- PostgreSQL belum terinstall
- User registration menggunakan in-memory storage (hilang saat restart)
- Payment system butuh database untuk persist transaction

**Solusi:**

1. **CEPAT (10 menit)**: Install PostgreSQL manual → Setup database → Test
2. **ALTERNATIF (5 menit)**: Pakai SQLite (saya buatkan adapter)

**Pilih mana?** Reply:

- "postgresql" - Saya tunggu Anda install PostgreSQL manual
- "sqlite" - Saya setup SQLite sekarang (lebih cepat)
