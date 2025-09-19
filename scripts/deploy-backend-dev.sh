#!/bin/bash

# OneDC Backend Development Server Deployment Script
# VM IP: 135.233.176.35

set -e

echo "Starting OneDC Backend Deployment for DEVELOPMENT Server..."

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

# Use staging configuration for development server
echo "Copying staging configuration..."
if [ -f "$PROJECT_NAME/appsettings.Staging.json" ]; then
    cp $PROJECT_NAME/appsettings.Staging.json $PUBLISH_DIR/
    echo "✅ Staging config copied"
else
    echo "❌ ERROR: appsettings.Staging.json not found!"
    echo "Please update the database host address in appsettings.Staging.json"
    exit 1
fi

# Create deployment package
echo "Creating deployment package..."
cd $PUBLISH_DIR
tar -czf ../onedc-backend-dev.tar.gz .
cd ..

echo "✅ Backend deployment package ready: onedc-backend-dev.tar.gz"
echo ""
echo "🚀 Next steps for DEVELOPMENT deployment:"
echo "1. Update DB host in appsettings.Staging.json"
echo "2. Upload to VM: scp onedc-backend-dev.tar.gz username@$VM_IP:~/"
echo "3. SSH to VM: ssh username@$VM_IP"
echo "4. Extract: tar -xzf onedc-backend-dev.tar.gz -C /var/www/onedc-api/"
echo "5. Set permissions: sudo chown -R www-data:www-data /var/www/onedc-api"
echo "6. Start service: sudo systemctl restart onedc-api.service"
echo ""
echo "📊 Development database will be created automatically on first run."
