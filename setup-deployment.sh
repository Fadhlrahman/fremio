#!/bin/bash

# 🚀 Quick Setup Script for Auto-Deployment
# This script helps you setup GitHub Actions for auto-deploy

set -e

echo "🚀 Fremio Auto-Deployment Setup"
echo "================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if git is initialized
if [ ! -d .git ]; then
    echo -e "${RED}❌ Git repository not initialized${NC}"
    echo "Run: git init"
    exit 1
fi

echo -e "${GREEN}✅ Git repository detected${NC}"
echo ""

# Check if GitHub remote exists
if ! git remote get-url origin > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  No GitHub remote found${NC}"
    echo "Setup GitHub remote first:"
    echo "  git remote add origin https://github.com/yourusername/fremio.git"
    echo ""
    read -p "Press Enter after setting up remote..."
fi

REMOTE_URL=$(git remote get-url origin)
echo -e "${GREEN}✅ GitHub remote: ${REMOTE_URL}${NC}"
echo ""

# Generate SSH key for GitHub Actions
echo "🔑 Generating SSH key for GitHub Actions..."
SSH_KEY_PATH="$HOME/.ssh/github_actions_fremio"

if [ -f "$SSH_KEY_PATH" ]; then
    echo -e "${YELLOW}⚠️  SSH key already exists: $SSH_KEY_PATH${NC}"
    read -p "Regenerate? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Using existing key..."
    else
        rm -f "$SSH_KEY_PATH" "$SSH_KEY_PATH.pub"
        ssh-keygen -t ed25519 -C "github-actions@fremio" -f "$SSH_KEY_PATH" -N ""
        echo -e "${GREEN}✅ New SSH key generated${NC}"
    fi
else
    ssh-keygen -t ed25519 -C "github-actions@fremio" -f "$SSH_KEY_PATH" -N ""
    echo -e "${GREEN}✅ SSH key generated${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 SETUP INSTRUCTIONS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. VPS Public Key
echo -e "${GREEN}1. Add PUBLIC key to VPS:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
cat "$SSH_KEY_PATH.pub"
echo ""
echo "Copy the key above and run on your VPS:"
echo -e "${YELLOW}  ssh root@your-vps-ip${NC}"
echo -e "${YELLOW}  echo \"$(cat $SSH_KEY_PATH.pub)\" >> ~/.ssh/authorized_keys${NC}"
echo -e "${YELLOW}  chmod 600 ~/.ssh/authorized_keys${NC}"
echo ""
read -p "Press Enter after adding key to VPS..."
echo ""

# 2. Test SSH connection
echo -e "${GREEN}2. Test SSH connection:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
read -p "Enter VPS IP/hostname: " VPS_HOST
read -p "Enter VPS user (default: root): " VPS_USER
VPS_USER=${VPS_USER:-root}

echo "Testing SSH connection..."
if ssh -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no "$VPS_USER@$VPS_HOST" "echo 'SSH connection successful!'" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ SSH connection successful!${NC}"
else
    echo -e "${RED}❌ SSH connection failed!${NC}"
    echo "Make sure:"
    echo "  1. Public key is added to VPS ~/.ssh/authorized_keys"
    echo "  2. VPS firewall allows SSH (port 22)"
    echo "  3. VPS IP/hostname is correct"
    exit 1
fi
echo ""

# 3. Get Cloudflare credentials
echo -e "${GREEN}3. Cloudflare Setup:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Get your Cloudflare credentials:"
echo "  1. API Token: https://dash.cloudflare.com/profile/api-tokens"
echo "     - Create Token > Edit Cloudflare Workers"
echo "  2. Account ID: Cloudflare Dashboard > Select domain > Sidebar (Account ID)"
echo "  3. Project Name: Workers & Pages > Your project name"
echo ""
read -p "Enter Cloudflare API Token: " CLOUDFLARE_API_TOKEN
read -p "Enter Cloudflare Account ID: " CLOUDFLARE_ACCOUNT_ID
read -p "Enter Cloudflare Project Name (default: fremio): " CLOUDFLARE_PROJECT_NAME
CLOUDFLARE_PROJECT_NAME=${CLOUDFLARE_PROJECT_NAME:-fremio}
echo ""

# 4. Get VPS backend path
echo -e "${GREEN}4. VPS Backend Path:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
read -p "Enter backend path on VPS (e.g., /var/www/fremio-backend): " VPS_BACKEND_PATH
echo ""

# 5. Generate GitHub Secrets commands
echo -e "${GREEN}5. GitHub Secrets Setup:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Go to GitHub repository settings:"
echo "  ${REMOTE_URL}/settings/secrets/actions"
echo ""
echo "Add these secrets (click 'New repository secret' for each):"
echo ""
echo -e "${YELLOW}Name: CLOUDFLARE_API_TOKEN${NC}"
echo "Value: $CLOUDFLARE_API_TOKEN"
echo ""
echo -e "${YELLOW}Name: CLOUDFLARE_ACCOUNT_ID${NC}"
echo "Value: $CLOUDFLARE_ACCOUNT_ID"
echo ""
echo -e "${YELLOW}Name: CLOUDFLARE_PROJECT_NAME${NC}"
echo "Value: $CLOUDFLARE_PROJECT_NAME"
echo ""
echo -e "${YELLOW}Name: VPS_SSH_PRIVATE_KEY${NC}"
echo "Value: (copy entire private key below)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cat "$SSH_KEY_PATH"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${YELLOW}Name: VPS_HOST${NC}"
echo "Value: $VPS_HOST"
echo ""
echo -e "${YELLOW}Name: VPS_USER${NC}"
echo "Value: $VPS_USER"
echo ""
echo -e "${YELLOW}Name: VPS_BACKEND_PATH${NC}"
echo "Value: $VPS_BACKEND_PATH"
echo ""

# Save to file for reference
SECRETS_FILE="github-secrets-reference.txt"
cat > "$SECRETS_FILE" << EOF
GitHub Secrets for fremio Auto-Deployment
Generated: $(date)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FRONTEND (Cloudflare Pages)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CLOUDFLARE_API_TOKEN=$CLOUDFLARE_API_TOKEN

CLOUDFLARE_ACCOUNT_ID=$CLOUDFLARE_ACCOUNT_ID

CLOUDFLARE_PROJECT_NAME=$CLOUDFLARE_PROJECT_NAME

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BACKEND (VPS)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

VPS_SSH_PRIVATE_KEY=
$(cat "$SSH_KEY_PATH")

VPS_HOST=$VPS_HOST

VPS_USER=$VPS_USER

VPS_BACKEND_PATH=$VPS_BACKEND_PATH

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EOF

echo -e "${GREEN}✅ Secrets saved to: $SECRETS_FILE${NC}"
echo -e "${RED}⚠️  IMPORTANT: Delete this file after adding secrets to GitHub!${NC}"
echo ""

# 6. Commit and push
echo -e "${GREEN}6. Deploy workflows to GitHub:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
read -p "Commit and push workflows now? (Y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    git add .github/workflows/
    git add DEPLOYMENT_SETUP.md
    git add .gitignore
    git commit -m "feat: Add GitHub Actions for auto-deployment

- Frontend: Auto-deploy to Cloudflare Pages on push to main
- Backend: Auto-deploy to VPS via SSH on push to main
- Add comprehensive deployment setup guide
" || echo "Nothing to commit or already committed"
    
    echo ""
    echo "Pushing to GitHub..."
    git push origin main || git push origin master
    
    echo ""
    echo -e "${GREEN}✅ Workflows deployed to GitHub!${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "  1. Add secrets to GitHub (see $SECRETS_FILE)"
echo "  2. Delete $SECRETS_FILE after adding secrets"
echo "  3. Make a change and push to test deployment"
echo "  4. Monitor: ${REMOTE_URL}/actions"
echo ""
echo "Test deployment:"
echo -e "${YELLOW}  git add .${NC}"
echo -e "${YELLOW}  git commit -m 'test: Trigger auto-deployment'${NC}"
echo -e "${YELLOW}  git push origin main${NC}"
echo ""
echo "Happy deploying! 🚀"
