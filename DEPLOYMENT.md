# OneDC Production Deployment Guide

## Prerequisites

1. **Server Requirements:**
   - .NET 9.0 Runtime
   - PostgreSQL 12+ database server
   - Node.js 18+ (for frontend build)
   - Web server (Nginx/IIS) for frontend hosting

2. **Database Setup:**
   - PostgreSQL server running
   - Database created (e.g., `onedc_production`)
   - Database user with appropriate permissions

## Deployment Steps

### 1. Database Configuration

#### Option A: Automatic Migration (Recommended for small deployments)
The application will automatically create tables and apply migrations on startup.

#### Option B: Manual Migration (Recommended for large deployments)
```bash
# Run migrations manually before deployment
cd backend
dotnet ef database update --project OneDc.Infrastructure --startup-project OneDc.Api --connection "Host=your-db-server;Database=onedc_production;Username=your-user;Password=your-password"
```

### 2. Backend Deployment

1. **Update Configuration:**
   Create `appsettings.Production.json`:
   ```json
   {
     "ConnectionStrings": {
       "OneDcDb": "Host=your-db-server;Database=onedc_production;Username=your-user;Password=your-password"
     },
     "Jwt": {
       "Key": "your-super-secure-256-bit-key-here-change-this-in-production",
       "Issuer": "OneDC",
       "Audience": "OneDC-Users"
     },
     "Logging": {
       "LogLevel": {
         "Default": "Warning",
         "Microsoft.AspNetCore": "Warning"
       }
     }
   }
   ```

2. **Build and Publish:**
   ```bash
   cd backend
   dotnet publish OneDc.Api -c Release -o ./publish
   ```

3. **Deploy to Server:**
   - Copy the `publish` folder to your server
   - Set environment variable: `ASPNETCORE_ENVIRONMENT=Production`
   - Run: `dotnet OneDc.Api.dll`

### 3. Frontend Deployment

1. **Update Environment Configuration:**
   Create `frontend/onedc/src/environments/environment.prod.ts`:
   ```typescript
   export const environment = {
     production: true,
     apiUrl: 'https://your-api-domain.com/api'
   };
   ```

2. **Build for Production:**
   ```bash
   cd frontend/onedc
   npm install
   npm run build
   ```

3. **Deploy Static Files:**
   - Copy `dist/onedc/` contents to your web server (Nginx/Apache)
   - Configure web server to serve the Angular app

### 4. Web Server Configuration (Nginx Example)

```nginx
# Frontend (Angular)
server {
    listen 80;
    server_name your-frontend-domain.com;
    root /path/to/your/dist/onedc;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}

# Backend API (Optional - if serving through Nginx)
server {
    listen 80;
    server_name your-api-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection keep-alive;
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 5. Initial Admin Setup

After deployment, the system will create an initial admin user:
- **Email:** `admin@yourcompany.com`
- **Password:** `YourSecurePassword123!`

**IMPORTANT:** Change these credentials immediately after first login!

### 6. Database Schema

The following tables will be created automatically:

#### Core Tables:
- `ts.app_user` - User accounts and employee information
- `ts.client` - Client/customer information
- `ts.project` - Project details
- `ts.task` - Project tasks
- `ts.timesheet_entry` - Time tracking entries
- `ts.project_allocation` - User-project assignments
- `ts.approval_workflow` - Approval processes
- `ts.holiday` - Holiday calendar
- `ts.audit_log` - System audit trail

#### Key Indexes and Constraints:
- Primary keys on all entity IDs
- Foreign key relationships maintained
- Unique constraints on email addresses
- Indexes on frequently queried fields

### 7. Environment Variables

Set these environment variables on your production server:

```bash
export ASPNETCORE_ENVIRONMENT=Production
export ASPNETCORE_URLS=http://0.0.0.0:5000
export ConnectionStrings__OneDcDb="Host=your-db;Database=onedc_production;Username=user;Password=pass"
export Jwt__Key="your-256-bit-secret-key"
```

### 8. Security Considerations

1. **Database Security:**
   - Use strong passwords
   - Limit database user permissions
   - Enable SSL connections

2. **Application Security:**
   - Use HTTPS in production
   - Set secure JWT secret key
   - Configure CORS properly
   - Regular security updates

3. **Server Security:**
   - Firewall configuration
   - Regular OS updates
   - Monitoring and logging

### 9. Monitoring and Maintenance

1. **Health Checks:**
   - Monitor API endpoint: `/health`
   - Database connectivity
   - Application logs

2. **Backup Strategy:**
   - Regular database backups
   - Application configuration backups
   - Migration scripts backup

3. **Updates:**
   - Plan for database migrations
   - Zero-downtime deployment strategies
   - Rollback procedures

## Troubleshooting

### Common Issues:

1. **Database Connection Issues:**
   - Check connection string
   - Verify database server accessibility
   - Check user permissions

2. **Migration Failures:**
   - Review migration logs
   - Check database schema conflicts
   - Verify user permissions for DDL operations

3. **Authentication Issues:**
   - Verify JWT configuration
   - Check token expiration settings
   - Validate CORS configuration

4. **Frontend-Backend Communication:**
   - Check API URL configuration
   - Verify CORS settings
   - Check network connectivity

## Support

For deployment issues, check:
1. Application logs
2. Database logs
3. Web server logs
4. System logs

Remember to:
- Test deployment in staging environment first
- Have rollback plan ready
- Monitor system after deployment
- Change default credentials immediately
