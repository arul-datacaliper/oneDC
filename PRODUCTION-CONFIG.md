# OneDC Production Configuration Template

## Database Configuration

### PostgreSQL Setup Commands:
```sql
-- Create database
CREATE DATABASE onedc_production;

-- Create user (replace with your credentials)
CREATE USER onedc_user WITH ENCRYPTED PASSWORD 'your_secure_password';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE onedc_production TO onedc_user;

-- Connect to the database
\c onedc_production

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO onedc_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO onedc_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO onedc_user;
```

## Backend Configuration

### appsettings.Production.json Template:
```json
{
  "ConnectionStrings": {
    "OneDcDb": "Host=localhost;Database=onedc_production;Username=onedc_user;Password=your_secure_password;SSL Mode=Require"
  },
  "Jwt": {
    "Key": "your-super-secure-256-bit-key-here-must-be-at-least-32-characters-long",
    "Issuer": "OneDC-Production",
    "Audience": "OneDC-Users"
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning",
      "Microsoft.EntityFrameworkCore": "Warning"
    }
  },
  "AllowedHosts": "*"
}
```

## Frontend Configuration

### environment.prod.ts Template:
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://api.yourcompany.com/api',
  appName: 'OneDC - Time Tracking',
  version: '1.0.0'
};
```

## Nginx Configuration

### Frontend Server Block:
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name yourcompany.com www.yourcompany.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourcompany.com www.yourcompany.com;

    # SSL Configuration
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Document root
    root /var/www/onedc/dist/onedc;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Handle Angular routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### API Server Block:
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name api.yourcompany.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.yourcompany.com;

    # SSL Configuration
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;

    # Proxy to .NET application
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection keep-alive;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;
        proxy_read_timeout 86400;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:5000/health;
        access_log off;
    }
}
```

## Systemd Service Configuration

### /etc/systemd/system/onedc-api.service:
```ini
[Unit]
Description=OneDC API Service
After=network.target
After=postgresql.service

[Service]
Type=notify
ExecStart=/usr/bin/dotnet /var/www/onedc-api/OneDc.Api.dll
Restart=always
RestartSec=10
KillSignal=SIGINT
SyslogIdentifier=onedc-api
User=www-data
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=ASPNETCORE_URLS=http://localhost:5000
WorkingDirectory=/var/www/onedc-api

[Install]
WantedBy=multi-user.target
```

### Service Management Commands:
```bash
# Enable and start the service
sudo systemctl enable onedc-api.service
sudo systemctl start onedc-api.service

# Check status
sudo systemctl status onedc-api.service

# View logs
sudo journalctl -u onedc-api.service -f
```

## Docker Configuration (Alternative)

### Dockerfile (Backend):
```dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app
EXPOSE 80

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY ["OneDc.Api/OneDc.Api.csproj", "OneDc.Api/"]
COPY ["OneDc.Infrastructure/OneDc.Infrastructure.csproj", "OneDc.Infrastructure/"]
COPY ["OneDc.Domain/OneDc.Domain.csproj", "OneDc.Domain/"]
RUN dotnet restore "OneDc.Api/OneDc.Api.csproj"
COPY . .
WORKDIR "/src/OneDc.Api"
RUN dotnet build "OneDc.Api.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "OneDc.Api.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "OneDc.Api.dll"]
```

### docker-compose.yml:
```yaml
version: '3.8'
services:
  onedc-api:
    build: ./backend
    ports:
      - "5000:80"
    environment:
      - ASPNETCORE_ENVIRONMENT=Production
      - ConnectionStrings__OneDcDb=Host=db;Database=onedc_production;Username=onedc_user;Password=your_password
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:15
    environment:
      POSTGRES_DB: onedc_production
      POSTGRES_USER: onedc_user
      POSTGRES_PASSWORD: your_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./frontend/dist:/usr/share/nginx/html
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - onedc-api
    restart: unless-stopped

volumes:
  postgres_data:
```

## Security Checklist

- [ ] Change default admin credentials
- [ ] Set strong JWT secret key (256-bit)
- [ ] Configure HTTPS/SSL certificates
- [ ] Set up database user with minimal permissions
- [ ] Configure firewall rules
- [ ] Enable database SSL connections
- [ ] Set up monitoring and alerting
- [ ] Configure log rotation
- [ ] Regular security updates
- [ ] Backup strategy implemented
