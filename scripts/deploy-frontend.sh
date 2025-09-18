#!/bin/bash

# OneDC Frontend Deployment Script

set -e

echo "Starting OneDC Frontend Deployment..."

# Navigate to frontend directory
cd frontend/onedc

# Install dependencies
echo "Installing dependencies..."
npm install

# Build for production
echo "Building for production..."
npm run build

echo "Frontend build complete!"
echo "Production files are in: frontend/onedc/dist/onedc/"
echo ""
echo "Next steps:"
echo "1. Copy the contents of 'frontend/onedc/dist/onedc/' to your web server"
echo "2. Configure your web server to serve the Angular app"
echo "3. Set up routing to fallback to index.html for SPA"
echo "4. Update API URL in environment.prod.ts if needed"
