#!/bin/bash

# OneDC Backend Deployment Script

set -e

echo "Starting OneDC Backend Deployment..."

# Configuration
PROJECT_NAME="OneDc.Api"
BUILD_CONFIGURATION="Release"
PUBLISH_DIR="./publish"

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

# Copy configuration files
echo "Copying configuration files..."
cp appsettings.Production.json $PUBLISH_DIR/ 2>/dev/null || echo "appsettings.Production.json not found - create it manually"

echo "Backend deployment package ready in: $PUBLISH_DIR"
echo ""
echo "Next steps:"
echo "1. Copy the '$PUBLISH_DIR' folder to your production server"
echo "2. Set ASPNETCORE_ENVIRONMENT=Production"
echo "3. Configure your database connection string"
echo "4. Run: dotnet OneDc.Api.dll"
echo ""
echo "Database will be automatically created and migrated on first run."
