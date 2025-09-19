#!/bin/bash

# OneDC Frontend Deployment Script for VM: 135.233.176.35

set -e

echo "Starting OneDC Frontend Deployment for Production VM..."

VM_IP="135.233.176.35"

# Navigate to frontend directory
cd frontend/onedc

# Check if production environment file exists
if [ ! -f "src/environments/environment.prod.ts" ]; then
    echo "ERROR: environment.prod.ts not found!"
    echo "Creating production environment file..."
    cat > src/environments/environment.prod.ts << EOF
export const environment = {
  production: true,
  apiUrl: 'http://$VM_IP:5000/api',
  appName: 'OneDC - Time Tracking',
  version: '1.0.0'
};
EOF
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Build for production
echo "Building for production..."
npm run build --prod

# Create deployment package
echo "Creating deployment package..."
cd dist
tar -czf onedc-frontend.tar.gz onedc/

echo "Frontend build complete!"
echo "Production package created: frontend/onedc/dist/onedc-frontend.tar.gz"
echo ""
echo "Next steps:"
echo "1. Upload to VM: scp dist/onedc-frontend.tar.gz username@$VM_IP:~/"
echo "2. SSH to VM: ssh username@$VM_IP"
echo "3. Extract: tar -xzf onedc-frontend.tar.gz -C /var/www/onedc-frontend/"
echo "4. Set permissions: sudo chown -R www-data:www-data /var/www/onedc-frontend"
echo "5. Configure Nginx and restart: sudo systemctl reload nginx"
echo ""
echo "Access your application at: http://$VM_IP"
