#!/bin/bash

# OneDC VM Setup and Deployment Script
# VM IP: 135.233.176.35

echo "=== OneDC Production Deployment on VM ==="
echo "VM IP: 135.233.176.35"
echo ""

# First, connect to your VM
echo "1. Connect to VM:"
echo "ssh username@135.233.176.35"
echo ""
echo "Or if you're on Windows, use PuTTY with:"
echo "Host: 135.233.176.35"
echo "Port: 22"
echo ""

echo "2. Once connected, run the following commands:"
echo ""

cat << 'EOF'
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install .NET 9.0 Runtime
wget https://packages.microsoft.com/config/ubuntu/20.04/packages-microsoft-prod.deb -O packages-microsoft-prod.deb
sudo dpkg -i packages-microsoft-prod.deb
sudo apt update
sudo apt install -y aspnetcore-runtime-9.0

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Nginx
sudo apt install -y nginx

# Install Node.js (for building frontend if needed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installations
echo "=== Verifying Installations ==="
dotnet --version
psql --version
nginx -v
node --version
npm --version
EOF

echo ""
echo "3. After running the above commands, proceed with database setup:"
echo ""
