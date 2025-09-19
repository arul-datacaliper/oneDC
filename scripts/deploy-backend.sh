#!/bin/bash

# OneDC Backend Deployment Script for VM: 135.233.176.35

set -e

echo "Starting OneDC Backend Deployment for Production VM..."

# Configuration
PROJECT_NAME="OneDc.Api"
BUILD_CONFIGURATION="Release"
PUBLISH_DIR="./publish"
VM_IP="135.233.176.35"

# Clean previous build
echo "Cleaning previous builds..."
rm -rf $PUBLISH_DIR
dotnet clean

# Restore dependencies
echo "Restoring dependencies..."
dotnet restore

# Build and publish
echo "Building and publishing application..."
dotnet publish $PROJECT_NAME -c $BUILD_CONFIGURATION -o $PUBLISH_DIR

# Ensure production config exists
if [ ! -f "$PROJECT_NAME/appsettings.Production.json" ]; then
    echo "ERROR: appsettings.Production.json not found!"
    echo "Make sure you have created the production configuration file."
    exit 1
fi

# Copy configuration files
echo "Copying configuration files..."
cp $PROJECT_NAME/appsettings.Production.json $PUBLISH_DIR/

# Create deployment package
echo "Creating deployment package..."
cd $PUBLISH_DIR
tar -czf ../onedc-backend.tar.gz .
cd ..

echo "Backend deployment package ready: onedc-backend.tar.gz"
echo ""
echo "Next steps:"
echo "1. Upload to VM: scp onedc-backend.tar.gz username@$VM_IP:~/"
echo "2. SSH to VM: ssh username@$VM_IP"
echo "3. Extract: tar -xzf onedc-backend.tar.gz -C /var/www/onedc-api/"
echo "4. Set permissions: sudo chown -R www-data:www-data /var/www/onedc-api"
echo "5. Start service: sudo systemctl start onedc-api.service"
echo ""
echo "Database will be automatically created and migrated on first run."
