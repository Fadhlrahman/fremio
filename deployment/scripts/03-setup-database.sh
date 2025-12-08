#!/bin/bash
# ============================================
# FREMIO - Database Server Setup Script
# VPS 5: PostgreSQL + Redis
# ============================================

set -e

echo "=========================================="
echo "FREMIO DATABASE SERVER SETUP"
echo "=========================================="

# Update sistem
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install PostgreSQL 15
echo "🐘 Installing PostgreSQL 15..."
apt install -y gnupg2 wget
sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
apt update
apt install -y postgresql-15 postgresql-contrib-15

# Install Redis
echo "🔴 Installing Redis..."
apt install -y redis-server

# Generate password
DB_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 24)
echo "Generated Database Password: $DB_PASSWORD"
echo "$DB_PASSWORD" > /root/db_password.txt
chmod 600 /root/db_password.txt

# Configure PostgreSQL
echo "📝 Configuring PostgreSQL..."

# Backup original configs
cp /etc/postgresql/15/main/postgresql.conf /etc/postgresql/15/main/postgresql.conf.bak
cp /etc/postgresql/15/main/pg_hba.conf /etc/postgresql/15/main/pg_hba.conf.bak

# PostgreSQL performance tuning untuk 8GB RAM VPS
cat >> /etc/postgresql/15/main/postgresql.conf << 'PG_CONF'

# Connection Settings
listen_addresses = '*'
max_connections = 500
superuser_reserved_connections = 3

# Memory Settings (untuk 8GB RAM)
shared_buffers = 2GB
effective_cache_size = 6GB
maintenance_work_mem = 512MB
work_mem = 16MB

# Checkpoint Settings
checkpoint_completion_target = 0.9
wal_buffers = 64MB
max_wal_size = 2GB
min_wal_size = 512MB

# Query Planner
random_page_cost = 1.1
effective_io_concurrency = 200

# Logging
log_destination = 'stderr'
logging_collector = on
log_directory = 'pg_log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_rotation_age = 1d
log_rotation_size = 100MB
log_min_duration_statement = 1000
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d '

# Autovacuum
autovacuum = on
autovacuum_max_workers = 4
autovacuum_naptime = 30s
autovacuum_vacuum_cost_limit = 1000

# Connection pooling preparation
tcp_keepalives_idle = 600
tcp_keepalives_interval = 30
tcp_keepalives_count = 10
PG_CONF

# Configure pg_hba.conf untuk allow connections dari App Servers
cat > /etc/postgresql/15/main/pg_hba.conf << 'PG_HBA'
# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   all             postgres                                peer
local   all             all                                     peer
host    all             all             127.0.0.1/32            scram-sha-256
host    all             all             ::1/128                 scram-sha-256

# Allow connections from App Servers (Update IP sesuai kebutuhan)
# Format: host    database    user    ip-address/32    scram-sha-256
host    fremio_db       fremio_user     APP_SERVER_1_IP/32      scram-sha-256
host    fremio_db       fremio_user     APP_SERVER_2_IP/32      scram-sha-256
host    fremio_db       fremio_user     APP_SERVER_3_IP/32      scram-sha-256

# Untuk testing, allow semua (JANGAN gunakan di production!)
# host    all             all             0.0.0.0/0               scram-sha-256
PG_HBA

# Restart PostgreSQL
systemctl restart postgresql

# Create database and user
echo "🔧 Creating database and user..."
sudo -u postgres psql << PSQL_COMMANDS
-- Create user
CREATE USER fremio_user WITH PASSWORD '$DB_PASSWORD';

-- Create database
CREATE DATABASE fremio_db OWNER fremio_user;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE fremio_db TO fremio_user;

-- Connect to fremio_db
\c fremio_db

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO fremio_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO fremio_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO fremio_user;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
PSQL_COMMANDS

# Configure Redis
echo "📝 Configuring Redis..."

# Backup original config
cp /etc/redis/redis.conf /etc/redis/redis.conf.bak

# Redis configuration untuk caching
cat > /etc/redis/redis.conf << 'REDIS_CONF'
# Network
bind 0.0.0.0
port 6379
protected-mode yes
# requirepass YOUR_REDIS_PASSWORD  # Uncomment dan set password jika perlu

# General
daemonize yes
pidfile /var/run/redis/redis-server.pid
loglevel notice
logfile /var/log/redis/redis-server.log

# Memory Management (untuk 8GB total, alokasi 1GB untuk Redis)
maxmemory 1gb
maxmemory-policy allkeys-lru

# Snapshotting (untuk persistence)
save 900 1
save 300 10
save 60 10000
stop-writes-on-bgsave-error yes
rdbcompression yes
rdbchecksum yes
dbfilename dump.rdb
dir /var/lib/redis

# Append Only File (lebih reliable)
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec
no-appendfsync-on-rewrite no
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb

# Clients
maxclients 10000
timeout 300

# Security
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command DEBUG ""
REDIS_CONF

# Restart Redis
systemctl restart redis-server
systemctl enable redis-server

# Create database schema file
echo "📝 Creating database schema..."
cat > /root/schema.sql << 'SCHEMA_SQL'
-- FREMIO Database Schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE,
    display_name VARCHAR(100),
    avatar_url TEXT,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'kreator')),
    firebase_uid VARCHAR(128) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true
);

-- Frames table
CREATE TABLE IF NOT EXISTS frames (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL DEFAULT 'default',
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    layout VARCHAR(20) DEFAULT '4' CHECK (layout IN ('1', '2', '3', '4', '5', '6')),
    is_free BOOLEAN DEFAULT true,
    price DECIMAL(10, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    tags TEXT[],
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Photos table (user-generated photos)
CREATE TABLE IF NOT EXISTS photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    frame_id UUID REFERENCES frames(id),
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User purchases (for paid frames)
CREATE TABLE IF NOT EXISTS purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    frame_id UUID REFERENCES frames(id),
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    transaction_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contact messages
CREATE TABLE IF NOT EXISTS contact_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    replied_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics events
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(50) NOT NULL,
    user_id UUID REFERENCES users(id),
    frame_id UUID REFERENCES frames(id),
    metadata JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessions (for custom auth if not using Firebase)
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(512) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_frames_category ON frames(category);
CREATE INDEX IF NOT EXISTS idx_frames_display_order ON frames(display_order);
CREATE INDEX IF NOT EXISTS idx_frames_is_active ON frames(is_active);
CREATE INDEX IF NOT EXISTS idx_photos_user_id ON photos(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);

-- Full text search index for frames
CREATE INDEX IF NOT EXISTS idx_frames_name_trgm ON frames USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_frames_description_trgm ON frames USING gin(description gin_trgm_ops);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_frames_updated_at ON frames;
CREATE TRIGGER update_frames_updated_at BEFORE UPDATE ON frames FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO fremio_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO fremio_user;
SCHEMA_SQL

# Run schema
sudo -u postgres psql -d fremio_db -f /root/schema.sql

# Create script to update allowed IPs
cat > /root/update-allowed-ips.sh << 'UPDATE_IPS_SCRIPT'
#!/bin/bash
# Script untuk update IP yang diizinkan connect ke database

if [ "$#" -ne 3 ]; then
    echo "Usage: $0 <APP_SERVER_1_IP> <APP_SERVER_2_IP> <APP_SERVER_3_IP>"
    exit 1
fi

APP1=$1
APP2=$2
APP3=$3

sed -i "s/APP_SERVER_1_IP/$APP1/g" /etc/postgresql/15/main/pg_hba.conf
sed -i "s/APP_SERVER_2_IP/$APP2/g" /etc/postgresql/15/main/pg_hba.conf
sed -i "s/APP_SERVER_3_IP/$APP3/g" /etc/postgresql/15/main/pg_hba.conf

systemctl reload postgresql

# Update Redis ACL (optional)
# redis-cli CONFIG SET requirepass "your-password"

echo "✅ Allowed IPs updated successfully!"
UPDATE_IPS_SCRIPT

chmod +x /root/update-allowed-ips.sh

# Setup firewall
echo "🔒 Setting up firewall..."
apt install -y ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
# PostgreSQL hanya dari App Servers (update IP nanti)
ufw allow from 10.0.0.0/8 to any port 5432
# Redis hanya dari App Servers (update IP nanti)
ufw allow from 10.0.0.0/8 to any port 6379
ufw --force enable

# Create backup script
cat > /root/backup-database.sh << 'BACKUP_SCRIPT'
#!/bin/bash
# Daily database backup script

BACKUP_DIR="/var/backups/postgresql"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/fremio_db_$DATE.sql.gz"

mkdir -p $BACKUP_DIR

# Backup database
pg_dump -U postgres fremio_db | gzip > $BACKUP_FILE

# Keep only last 7 days
find $BACKUP_DIR -type f -mtime +7 -delete

echo "$(date): Backup completed - $BACKUP_FILE" >> /var/log/backup.log
BACKUP_SCRIPT

chmod +x /root/backup-database.sh

# Add backup to cron (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /root/backup-database.sh") | crontab -

echo ""
echo "=========================================="
echo "✅ DATABASE SERVER SETUP COMPLETE!"
echo "=========================================="
echo ""
echo "INFORMASI PENTING:"
echo "==================="
echo "Database Password: $DB_PASSWORD"
echo "Password tersimpan di: /root/db_password.txt"
echo ""
echo "Connection String:"
echo "postgresql://fremio_user:$DB_PASSWORD@<THIS_SERVER_IP>:5432/fremio_db"
echo ""
echo "Redis URL:"
echo "redis://<THIS_SERVER_IP>:6379"
echo ""
echo "LANGKAH SELANJUTNYA:"
echo "1. Update allowed IPs untuk App Servers:"
echo "   /root/update-allowed-ips.sh <APP1_IP> <APP2_IP> <APP3_IP>"
echo ""
echo "2. Update firewall dengan IP spesifik App Servers"
echo ""
echo "3. Test koneksi dari App Server:"
echo "   psql -h <THIS_IP> -U fremio_user -d fremio_db"
echo ""
