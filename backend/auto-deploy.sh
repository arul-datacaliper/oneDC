#!/bin/bash

# OneDC Automated Deployment Script
# Usage: ./auto-deploy.sh [production|development]

set -e  # Exit on any error

ENVIRONMENT=${1:-production}
PROJECT_ROOT="/Users/arul/oneDC/MVP-ver1/oneDC"
BACKEND_DIR="$PROJECT_ROOT/backend"
BUILD_DIR="$BACKEND_DIR/publish/linux-x64-final"
DEPLOY_DIR="$HOME/onedc-deploys"
SERVER_USER="azureuser"

# Environment-specific configuration
if [ "$ENVIRONMENT" == "production" ]; then
    SERVER_IP="40.74.201.85"  # Production server IP
    SERVER_PATH="/home/azureuser/datacaliper/onedc-prod"
    SERVER_PORT="5000"
else
    SERVER_IP="135.233.176.35"  # Development server IP
    SERVER_PATH="/home/azureuser/datacaliper/onedc-dev"
    SERVER_PORT="5260"
fi

echo "========================================="
echo "OneDC Automated Deployment Script"
echo "Environment: $ENVIRONMENT"
echo "========================================="

# Validate environment
if [ "$ENVIRONMENT" != "production" ] && [ "$ENVIRONMENT" != "development" ]; then
    echo "ERROR: Invalid environment. Use 'production' or 'development'"
    exit 1
fi

# Step 1: Clean and Build
echo ""
echo "Step 1: Building application..."
echo "-----------------------------------"
cd "$BACKEND_DIR"

# Clean previous build
echo "Cleaning previous build..."
rm -rf ./publish/linux-x64-final/*

# Build
echo "Building for $ENVIRONMENT..."
dotnet publish OneDc.Api -c Release -r linux-x64 --self-contained true -o ./publish/linux-x64-final

if [ $? -ne 0 ]; then
    echo "ERROR: Build failed!"
    exit 1
fi

echo "✓ Build successful"

# Step 2: Configure Environment
echo ""
echo "Step 2: Configuring environment..."
echo "-----------------------------------"

# Look for environment files in backend root (not publish folder)
ENV_SOURCE_DIR="$BACKEND_DIR"

if [ "$ENVIRONMENT" == "production" ]; then
    if [ ! -f "$ENV_SOURCE_DIR/.env.production" ]; then
        echo "ERROR: .env.production not found in $ENV_SOURCE_DIR"
        echo "Please create it from .env.production.template"
        exit 1
    fi
    cp "$ENV_SOURCE_DIR/.env.production" "$BUILD_DIR/.env"
    echo "✓ Production environment configured"
else
    if [ ! -f "$ENV_SOURCE_DIR/.env.development" ]; then
        echo "ERROR: .env.development not found in $ENV_SOURCE_DIR"
        exit 1
    fi
    cp "$ENV_SOURCE_DIR/.env.development" "$BUILD_DIR/.env"
    echo "✓ Development environment configured"
fi

# Verify environment
APP_URL=$(grep "APP_BASE_URL=" "$BUILD_DIR/.env" | cut -d'=' -f2)
echo "  APP_BASE_URL: $APP_URL"

# Step 3: Create Deployment Package
if [ "$ENVIRONMENT" == "production" ]; then
    echo ""
    echo "Step 3: Creating deployment package..."
    echo "-----------------------------------"
    mkdir -p "$DEPLOY_DIR"
    TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    PACKAGE_NAME="onedc-backend-$TIMESTAMP.tar.gz"
    
    # Package only the build output (not source code)
    cd "$BUILD_DIR"
    tar -czf "$DEPLOY_DIR/$PACKAGE_NAME" .
    echo "✓ Package created: $PACKAGE_NAME"
    
    # Step 4: Transfer to Server
    echo ""
    echo "Step 4: Transferring to production server..."
    echo "-----------------------------------"
    echo "Uploading to $SERVER_USER@$SERVER_IP:$SERVER_PATH..."
    
    scp "$DEPLOY_DIR/$PACKAGE_NAME" "$SERVER_USER@$SERVER_IP:/tmp/"
    
    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to transfer package to server"
        exit 1
    fi
    
    echo "✓ Transfer complete"
    
    # Step 5: Deploy on Server
    echo ""
    echo "Step 5: Deploying on production server..."
    echo "-----------------------------------"
    
    ssh "$SERVER_USER@$SERVER_IP" << ENDSSH
set -e

# Stop old instance first
echo "Stopping old instance..."
pkill -f OneDc.Api || true
sleep 2

# Clean deployment - remove everything except logs
echo "Cleaning deployment directory..."
if [ -d "$SERVER_PATH" ]; then
    # Backup logs if they exist
    if [ -d "$SERVER_PATH/logs" ]; then
        mkdir -p /tmp/onedc-logs-backup
        cp -r $SERVER_PATH/logs/* /tmp/onedc-logs-backup/ 2>/dev/null || true
    fi
    
    # Remove everything
    rm -rf $SERVER_PATH/*
    echo "✓ Cleaned $SERVER_PATH"
    
    # Restore logs
    if [ -d "/tmp/onedc-logs-backup" ]; then
        mkdir -p $SERVER_PATH/logs
        cp -r /tmp/onedc-logs-backup/* $SERVER_PATH/logs/ 2>/dev/null || true
        rm -rf /tmp/onedc-logs-backup
        echo "✓ Logs preserved"
    fi
fi

# Create fresh directories
mkdir -p $SERVER_PATH/releases
mkdir -p $SERVER_PATH/logs
echo "✓ Fresh directories created"

# Extract new version
RELEASE_DIR="$SERVER_PATH/releases/$TIMESTAMP"
mkdir -p \$RELEASE_DIR
tar -xzf /tmp/$PACKAGE_NAME -C \$RELEASE_DIR/

# Make executable BEFORE creating symlink
chmod +x \$RELEASE_DIR/OneDc.Api

# Update current symlink
ln -sfn \$RELEASE_DIR $SERVER_PATH/current

echo "✓ Files deployed to \$RELEASE_DIR"

# Start new instance
echo "Starting new instance..."
cd $SERVER_PATH/current
nohup ./OneDc.Api --urls "http://0.0.0.0:$SERVER_PORT" > $SERVER_PATH/logs/onedc.log 2>&1 &
echo \$! > $SERVER_PATH/onedc.pid

echo "✓ Application started (PID: \$(cat $SERVER_PATH/onedc.pid))"

# Clean up
rm /tmp/$PACKAGE_NAME

# Verify
sleep 3
if ps -p \$(cat $SERVER_PATH/onedc.pid) > /dev/null; then
    echo "✓ Application is running"
else
    echo "✗ WARNING: Application may not have started correctly"
    echo "Check logs: tail -f $SERVER_PATH/logs/onedc.log"
fi
ENDSSH
    
    if [ $? -ne 0 ]; then
        echo "ERROR: Deployment on server failed"
        exit 1
    fi
    
    echo ""
    echo "========================================="
    echo "✓ Deployment completed successfully!"
    echo "========================================="
    echo ""
    echo "Environment:      $ENVIRONMENT"
    echo "Server:           $SERVER_IP"
    echo "Deployment Path:  $SERVER_PATH"
    echo "Application URL:  http://$SERVER_IP:$SERVER_PORT"
    echo ""
    echo "Useful commands:"
    echo "  View logs:    ssh $SERVER_USER@$SERVER_IP 'tail -f $SERVER_PATH/logs/onedc.log'"
    echo "  Check status: ssh $SERVER_USER@$SERVER_IP 'ps aux | grep OneDc.Api'"
    echo "  Stop app:     ssh $SERVER_USER@$SERVER_IP 'pkill -f OneDc.Api'"
    echo ""
    
else
    # Development mode
    echo ""
    echo "========================================="
    echo "✓ Development build completed!"
    echo "========================================="
    echo ""
    echo "To run locally:"
    echo "  cd $BUILD_DIR"
    echo "  ./OneDc.Api --urls \"http://localhost:5000\""
    echo ""
fi
