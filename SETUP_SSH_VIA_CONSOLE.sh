#!/bin/bash

# ================================================
# FREMIO - INSTALL SSH KEY VIA CONSOLE
# ================================================
# Script ini untuk di-run di WEB CONSOLE Hostinger
# Copy semua command ini ke terminal server
# ================================================

echo "=================================="
echo "SETUP SSH KEY - Run on Server"
echo "=================================="
echo ""

# Display public key to copy
echo "1. First, from your LOCAL Mac, run:"
echo "   cat ~/.ssh/id_ed25519.pub"
echo ""
echo "2. Copy the ENTIRE output"
echo ""
echo "3. Then run these commands on the SERVER (Web Console):"
echo ""
echo "# Create .ssh directory"
echo 'mkdir -p ~/.ssh && chmod 700 ~/.ssh'
echo ""
echo "# Add your public key (paste the key you copied)"
echo 'echo "PASTE_YOUR_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys'
echo ""
echo "# Set correct permissions"
echo 'chmod 600 ~/.ssh/authorized_keys'
echo ""
echo "# Restart SSH service"
echo 'systemctl restart sshd || systemctl restart ssh'
echo ""
echo "4. Test from your Mac:"
echo "   ssh root@76.13.192.32"
echo ""
echo "=================================="
