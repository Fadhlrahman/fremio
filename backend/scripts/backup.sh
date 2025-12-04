#!/bin/bash
# ============================================
# Fremio VPS Backup Script
# Backs up database and uploads to R2 storage
# ============================================

# Configuration
BACKUP_DIR="/root/backups"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="fremio_backup_${DATE}"

# Database settings (from environment or defaults)
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-fremio_db}"
DB_USER="${DB_USER:-fremio_user}"

# Cloudflare R2 settings (optional)
R2_BUCKET="${R2_BUCKET:-fremio-backups}"
R2_ENDPOINT="${R2_ENDPOINT:-}"
R2_ACCESS_KEY="${R2_ACCESS_KEY:-}"
R2_SECRET_KEY="${R2_SECRET_KEY:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}  Fremio Backup Script${NC}"
echo -e "${GREEN}  $(date)${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""

# Create backup directory if not exists
mkdir -p "${BACKUP_DIR}"
mkdir -p "${BACKUP_DIR}/daily"
mkdir -p "${BACKUP_DIR}/weekly"
mkdir -p "${BACKUP_DIR}/monthly"

# Determine backup type
DAY_OF_WEEK=$(date +%u)
DAY_OF_MONTH=$(date +%d)

if [ "$DAY_OF_MONTH" == "01" ]; then
    BACKUP_TYPE="monthly"
elif [ "$DAY_OF_WEEK" == "7" ]; then
    BACKUP_TYPE="weekly"
else
    BACKUP_TYPE="daily"
fi

BACKUP_PATH="${BACKUP_DIR}/${BACKUP_TYPE}/${BACKUP_NAME}"
mkdir -p "${BACKUP_PATH}"

echo -e "${YELLOW}Backup type: ${BACKUP_TYPE}${NC}"
echo ""

# ==================== DATABASE BACKUP ====================
echo -e "${GREEN}[1/4] Backing up PostgreSQL database...${NC}"

DB_BACKUP_FILE="${BACKUP_PATH}/database.sql.gz"

# Check if PGPASSWORD is set
if [ -z "$PGPASSWORD" ]; then
    echo -e "${YELLOW}Note: PGPASSWORD not set. Using .pgpass or interactive mode.${NC}"
fi

# Create database dump
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --no-password \
    --format=plain \
    --no-owner \
    --no-acl \
    2>/dev/null | gzip > "$DB_BACKUP_FILE"

if [ $? -eq 0 ] && [ -s "$DB_BACKUP_FILE" ]; then
    DB_SIZE=$(du -h "$DB_BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}✓ Database backup complete: ${DB_SIZE}${NC}"
else
    echo -e "${RED}✗ Database backup failed${NC}"
    # Try alternative method
    echo -e "${YELLOW}Trying pg_dumpall...${NC}"
    pg_dumpall -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" \
        --no-password \
        2>/dev/null | gzip > "$DB_BACKUP_FILE"
fi

# ==================== UPLOADS BACKUP ====================
echo ""
echo -e "${GREEN}[2/4] Backing up uploads directory...${NC}"

UPLOADS_DIR="/root/fremio/backend/uploads"
UPLOADS_BACKUP_FILE="${BACKUP_PATH}/uploads.tar.gz"

if [ -d "$UPLOADS_DIR" ]; then
    tar -czf "$UPLOADS_BACKUP_FILE" -C "$UPLOADS_DIR" . 2>/dev/null
    if [ $? -eq 0 ]; then
        UPLOADS_SIZE=$(du -h "$UPLOADS_BACKUP_FILE" | cut -f1)
        echo -e "${GREEN}✓ Uploads backup complete: ${UPLOADS_SIZE}${NC}"
    else
        echo -e "${RED}✗ Uploads backup failed${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Uploads directory not found: ${UPLOADS_DIR}${NC}"
fi

# ==================== CONFIG BACKUP ====================
echo ""
echo -e "${GREEN}[3/4] Backing up configuration files...${NC}"

CONFIG_BACKUP_FILE="${BACKUP_PATH}/config.tar.gz"
CONFIG_DIR="/root/fremio"

# Backup important config files
tar -czf "$CONFIG_BACKUP_FILE" \
    -C "$CONFIG_DIR" \
    backend/.env \
    backend/ecosystem.config.js \
    2>/dev/null

if [ $? -eq 0 ]; then
    CONFIG_SIZE=$(du -h "$CONFIG_BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}✓ Config backup complete: ${CONFIG_SIZE}${NC}"
else
    echo -e "${YELLOW}⚠ Some config files may be missing${NC}"
fi

# ==================== CREATE MANIFEST ====================
echo ""
echo -e "${GREEN}Creating backup manifest...${NC}"

MANIFEST_FILE="${BACKUP_PATH}/manifest.json"
cat > "$MANIFEST_FILE" << EOF
{
    "backup_name": "${BACKUP_NAME}",
    "backup_type": "${BACKUP_TYPE}",
    "timestamp": "$(date -Iseconds)",
    "database": {
        "host": "${DB_HOST}",
        "name": "${DB_NAME}",
        "file": "database.sql.gz"
    },
    "files": {
        "uploads": "uploads.tar.gz",
        "config": "config.tar.gz"
    },
    "server": {
        "hostname": "$(hostname)",
        "ip": "$(curl -s ifconfig.me 2>/dev/null || echo 'unknown')"
    }
}
EOF

echo -e "${GREEN}✓ Manifest created${NC}"

# ==================== UPLOAD TO R2 (OPTIONAL) ====================
echo ""
echo -e "${GREEN}[4/4] Uploading to Cloudflare R2...${NC}"

if [ -n "$R2_ENDPOINT" ] && [ -n "$R2_ACCESS_KEY" ] && [ -n "$R2_SECRET_KEY" ]; then
    # Create final archive
    FINAL_ARCHIVE="${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
    tar -czf "$FINAL_ARCHIVE" -C "${BACKUP_PATH}" .
    
    # Configure AWS CLI for R2
    export AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY"
    export AWS_SECRET_ACCESS_KEY="$R2_SECRET_KEY"
    
    # Upload to R2
    aws s3 cp "$FINAL_ARCHIVE" "s3://${R2_BUCKET}/${BACKUP_TYPE}/${BACKUP_NAME}.tar.gz" \
        --endpoint-url "$R2_ENDPOINT" \
        2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Uploaded to R2: ${R2_BUCKET}/${BACKUP_TYPE}/${BACKUP_NAME}.tar.gz${NC}"
        # Remove local archive after successful upload
        rm -f "$FINAL_ARCHIVE"
    else
        echo -e "${RED}✗ R2 upload failed${NC}"
    fi
else
    echo -e "${YELLOW}⚠ R2 not configured, skipping cloud backup${NC}"
    echo -e "${YELLOW}  Set R2_ENDPOINT, R2_ACCESS_KEY, R2_SECRET_KEY to enable${NC}"
fi

# ==================== CLEANUP OLD BACKUPS ====================
echo ""
echo -e "${GREEN}Cleaning up old backups...${NC}"

# Remove daily backups older than 7 days
find "${BACKUP_DIR}/daily" -type d -mtime +7 -exec rm -rf {} \; 2>/dev/null
echo -e "${GREEN}✓ Removed daily backups older than 7 days${NC}"

# Remove weekly backups older than 30 days
find "${BACKUP_DIR}/weekly" -type d -mtime +30 -exec rm -rf {} \; 2>/dev/null
echo -e "${GREEN}✓ Removed weekly backups older than 30 days${NC}"

# Remove monthly backups older than 365 days
find "${BACKUP_DIR}/monthly" -type d -mtime +365 -exec rm -rf {} \; 2>/dev/null
echo -e "${GREEN}✓ Removed monthly backups older than 1 year${NC}"

# ==================== SUMMARY ====================
echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}  Backup Complete!${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo -e "Backup location: ${BACKUP_PATH}"
echo ""

# List backup contents
echo "Backup contents:"
ls -lh "${BACKUP_PATH}"

# Calculate total size
TOTAL_SIZE=$(du -sh "${BACKUP_PATH}" | cut -f1)
echo ""
echo -e "Total backup size: ${GREEN}${TOTAL_SIZE}${NC}"
echo ""

# Disk usage warning
DISK_USAGE=$(df -h "${BACKUP_DIR}" | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 80 ]; then
    echo -e "${RED}⚠ Warning: Disk usage is at ${DISK_USAGE}%${NC}"
    echo -e "${RED}  Consider uploading backups to R2 or increasing disk space${NC}"
fi
