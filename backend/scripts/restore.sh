#!/bin/bash
# ============================================
# Fremio VPS Restore Script
# Restores database and uploads from backup
# ============================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="/root/backups"
RESTORE_DIR="/tmp/fremio_restore"
UPLOADS_DIR="/root/fremio/backend/uploads"

# Database settings
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-fremio_db}"
DB_USER="${DB_USER:-fremio_user}"

# Cloudflare R2 settings
R2_BUCKET="${R2_BUCKET:-fremio-backups}"
R2_ENDPOINT="${R2_ENDPOINT:-}"
R2_ACCESS_KEY="${R2_ACCESS_KEY:-}"
R2_SECRET_KEY="${R2_SECRET_KEY:-}"

echo -e "${CYAN}======================================${NC}"
echo -e "${CYAN}  Fremio Restore Script${NC}"
echo -e "${CYAN}  $(date)${NC}"
echo -e "${CYAN}======================================${NC}"
echo ""

# ==================== FUNCTIONS ====================

show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -l, --list          List available backups"
    echo "  -b, --backup NAME   Restore specific backup by name"
    echo "  -r, --r2            Download backup from R2 first"
    echo "  -d, --database      Restore database only"
    echo "  -u, --uploads       Restore uploads only"
    echo "  -h, --help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --list"
    echo "  $0 --backup fremio_backup_20240115_120000"
    echo "  $0 --r2 --backup fremio_backup_20240115_120000"
    echo ""
}

list_backups() {
    echo -e "${GREEN}Available local backups:${NC}"
    echo ""
    
    for type in daily weekly monthly; do
        echo -e "${YELLOW}${type^} backups:${NC}"
        if [ -d "${BACKUP_DIR}/${type}" ]; then
            ls -lt "${BACKUP_DIR}/${type}" 2>/dev/null | head -20
        else
            echo "  (none)"
        fi
        echo ""
    done
    
    # List R2 backups if configured
    if [ -n "$R2_ENDPOINT" ] && [ -n "$R2_ACCESS_KEY" ]; then
        echo -e "${YELLOW}R2 Cloud backups:${NC}"
        export AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY"
        export AWS_SECRET_ACCESS_KEY="$R2_SECRET_KEY"
        
        aws s3 ls "s3://${R2_BUCKET}/" --endpoint-url "$R2_ENDPOINT" --recursive 2>/dev/null | tail -20
    fi
}

download_from_r2() {
    local backup_name="$1"
    
    if [ -z "$R2_ENDPOINT" ] || [ -z "$R2_ACCESS_KEY" ]; then
        echo -e "${RED}R2 not configured${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}Downloading ${backup_name} from R2...${NC}"
    
    export AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY"
    export AWS_SECRET_ACCESS_KEY="$R2_SECRET_KEY"
    
    # Find backup in R2
    for type in daily weekly monthly; do
        R2_PATH="s3://${R2_BUCKET}/${type}/${backup_name}.tar.gz"
        if aws s3 ls "$R2_PATH" --endpoint-url "$R2_ENDPOINT" 2>/dev/null; then
            echo -e "${GREEN}Found backup in ${type}${NC}"
            
            # Download
            mkdir -p "${BACKUP_DIR}/${type}/${backup_name}"
            aws s3 cp "$R2_PATH" "${RESTORE_DIR}/${backup_name}.tar.gz" \
                --endpoint-url "$R2_ENDPOINT"
            
            if [ $? -eq 0 ]; then
                # Extract
                tar -xzf "${RESTORE_DIR}/${backup_name}.tar.gz" -C "${BACKUP_DIR}/${type}/${backup_name}"
                echo -e "${GREEN}✓ Downloaded and extracted${NC}"
                return 0
            fi
        fi
    done
    
    echo -e "${RED}Backup not found in R2${NC}"
    exit 1
}

restore_database() {
    local backup_path="$1"
    local db_file="${backup_path}/database.sql.gz"
    
    if [ ! -f "$db_file" ]; then
        echo -e "${RED}Database backup file not found: ${db_file}${NC}"
        return 1
    fi
    
    echo -e "${YELLOW}⚠ This will DROP and recreate the database!${NC}"
    echo -e "${YELLOW}  Database: ${DB_NAME}${NC}"
    read -p "Are you sure? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        echo -e "${YELLOW}Cancelled${NC}"
        return 1
    fi
    
    echo -e "${GREEN}Restoring database...${NC}"
    
    # Drop existing database and recreate
    echo -e "${YELLOW}Dropping existing database...${NC}"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
        -c "DROP DATABASE IF EXISTS ${DB_NAME};" 2>/dev/null
    
    echo -e "${YELLOW}Creating new database...${NC}"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
        -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};" 2>/dev/null
    
    # Restore from backup
    echo -e "${YELLOW}Restoring data...${NC}"
    gunzip -c "$db_file" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Database restored successfully${NC}"
        return 0
    else
        echo -e "${RED}✗ Database restore failed${NC}"
        return 1
    fi
}

restore_uploads() {
    local backup_path="$1"
    local uploads_file="${backup_path}/uploads.tar.gz"
    
    if [ ! -f "$uploads_file" ]; then
        echo -e "${RED}Uploads backup file not found: ${uploads_file}${NC}"
        return 1
    fi
    
    echo -e "${YELLOW}⚠ This will replace existing uploads!${NC}"
    echo -e "${YELLOW}  Directory: ${UPLOADS_DIR}${NC}"
    read -p "Are you sure? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        echo -e "${YELLOW}Cancelled${NC}"
        return 1
    fi
    
    echo -e "${GREEN}Restoring uploads...${NC}"
    
    # Create backup of existing uploads
    if [ -d "$UPLOADS_DIR" ]; then
        BACKUP_EXISTING="${UPLOADS_DIR}.bak.$(date +%Y%m%d_%H%M%S)"
        mv "$UPLOADS_DIR" "$BACKUP_EXISTING"
        echo -e "${YELLOW}Existing uploads moved to: ${BACKUP_EXISTING}${NC}"
    fi
    
    # Create directory and restore
    mkdir -p "$UPLOADS_DIR"
    tar -xzf "$uploads_file" -C "$UPLOADS_DIR"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Uploads restored successfully${NC}"
        
        # Set permissions
        chown -R www-data:www-data "$UPLOADS_DIR" 2>/dev/null || true
        chmod -R 755 "$UPLOADS_DIR"
        
        return 0
    else
        echo -e "${RED}✗ Uploads restore failed${NC}"
        # Restore original
        if [ -d "$BACKUP_EXISTING" ]; then
            rm -rf "$UPLOADS_DIR"
            mv "$BACKUP_EXISTING" "$UPLOADS_DIR"
            echo -e "${YELLOW}Original uploads restored${NC}"
        fi
        return 1
    fi
}

restore_config() {
    local backup_path="$1"
    local config_file="${backup_path}/config.tar.gz"
    
    if [ ! -f "$config_file" ]; then
        echo -e "${YELLOW}Config backup file not found, skipping${NC}"
        return 0
    fi
    
    echo -e "${YELLOW}⚠ This will replace config files!${NC}"
    read -p "Restore config files? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        echo -e "${YELLOW}Skipped config restore${NC}"
        return 0
    fi
    
    echo -e "${GREEN}Restoring config files...${NC}"
    
    # Extract to temp and selectively copy
    mkdir -p "${RESTORE_DIR}/config"
    tar -xzf "$config_file" -C "${RESTORE_DIR}/config"
    
    # Copy .env if exists
    if [ -f "${RESTORE_DIR}/config/backend/.env" ]; then
        cp "${RESTORE_DIR}/config/backend/.env" "/root/fremio/backend/.env"
        echo -e "${GREEN}✓ .env restored${NC}"
    fi
    
    # Copy ecosystem.config.js if exists
    if [ -f "${RESTORE_DIR}/config/backend/ecosystem.config.js" ]; then
        cp "${RESTORE_DIR}/config/backend/ecosystem.config.js" "/root/fremio/backend/ecosystem.config.js"
        echo -e "${GREEN}✓ ecosystem.config.js restored${NC}"
    fi
    
    return 0
}

find_backup_path() {
    local backup_name="$1"
    
    for type in daily weekly monthly; do
        local path="${BACKUP_DIR}/${type}/${backup_name}"
        if [ -d "$path" ]; then
            echo "$path"
            return 0
        fi
    done
    
    return 1
}

# ==================== MAIN ====================

# Parse arguments
FROM_R2=false
DATABASE_ONLY=false
UPLOADS_ONLY=false
BACKUP_NAME=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -l|--list)
            list_backups
            exit 0
            ;;
        -b|--backup)
            BACKUP_NAME="$2"
            shift 2
            ;;
        -r|--r2)
            FROM_R2=true
            shift
            ;;
        -d|--database)
            DATABASE_ONLY=true
            shift
            ;;
        -u|--uploads)
            UPLOADS_ONLY=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# Check if backup name provided
if [ -z "$BACKUP_NAME" ]; then
    echo -e "${RED}Please specify a backup name with -b or --backup${NC}"
    echo ""
    show_help
    exit 1
fi

# Create restore directory
mkdir -p "$RESTORE_DIR"

# Download from R2 if requested
if [ "$FROM_R2" = true ]; then
    download_from_r2 "$BACKUP_NAME"
fi

# Find backup path
BACKUP_PATH=$(find_backup_path "$BACKUP_NAME")

if [ -z "$BACKUP_PATH" ]; then
    echo -e "${RED}Backup not found: ${BACKUP_NAME}${NC}"
    echo -e "${YELLOW}Use --list to see available backups${NC}"
    exit 1
fi

echo -e "${GREEN}Found backup: ${BACKUP_PATH}${NC}"
echo ""

# Show manifest if exists
if [ -f "${BACKUP_PATH}/manifest.json" ]; then
    echo -e "${CYAN}Backup manifest:${NC}"
    cat "${BACKUP_PATH}/manifest.json"
    echo ""
fi

# Restore based on options
if [ "$DATABASE_ONLY" = true ]; then
    restore_database "$BACKUP_PATH"
elif [ "$UPLOADS_ONLY" = true ]; then
    restore_uploads "$BACKUP_PATH"
else
    # Full restore
    echo -e "${GREEN}Starting full restore...${NC}"
    echo ""
    
    restore_database "$BACKUP_PATH"
    echo ""
    
    restore_uploads "$BACKUP_PATH"
    echo ""
    
    restore_config "$BACKUP_PATH"
fi

# Cleanup
rm -rf "$RESTORE_DIR"

# ==================== SUMMARY ====================
echo ""
echo -e "${CYAN}======================================${NC}"
echo -e "${CYAN}  Restore Complete!${NC}"
echo -e "${CYAN}======================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Restart the application: pm2 restart fremio-api"
echo "2. Verify the application is working"
echo "3. Check database connectivity"
echo ""
