#!/bin/bash

# OneDC Frontend Development Server Deployment Script
# VM IP: 135.233.176.35

set -e

echo "Starting OneDC Frontend Deployment for DEVELOPMENT Server..."

VM_IP="135.233.176.35"

# Navigate to frontend directory
cd frontend/onedc

# Ensure development server environment file exists
echo "Setting up development server environment..."
cat > src/environments/environment.prod.ts << EOF
export const environment = {
  production: false,
  apiUrl: '/api',
  appName: 'OneDC - Time Tracking (Development)',
  version: '1.0.0-dev'
};
EOF

# Install dependencies
echo "Installing dependencies..."
npm install

# Build for development server (using prod configuration but dev environment)
echo "Building for development server..."
npm run build --prod

# Create deployment package
echo "Creating deployment package..."
cd dist
tar -czf onedc-frontend-dev.tar.gz onedc/

echo "✅ Frontend build complete!"
echo "📦 Development package created: frontend/onedc/dist/onedc-frontend-dev.tar.gz"
echo ""
echo "🚀 Next steps for DEVELOPMENT deployment:"
echo "1. Upload to VM: scp dist/onedc-frontend-dev.tar.gz username@$VM_IP:~/"
echo "2. SSH to VM: ssh username@$VM_IP"
echo "3. Extract: tar -xzf onedc-frontend-dev.tar.gz -C /var/www/onedc-frontend/"
echo "4. Set permissions: sudo chown -R www-data:www-data /var/www/onedc-frontend"
echo "5. Configure Nginx and restart: sudo systemctl reload nginx"
echo ""
echo "🌐 Access your DEVELOPMENT application at: http://$VM_IP"
echo "🔑 Default login: admin@yourcompany.com / YourSecurePassword123!"
