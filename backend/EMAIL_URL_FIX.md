# Email URL Configuration Fix

## Problem
Welcome emails were using hardcoded `http://localhost:4200` instead of environment-specific URLs (dev/prod).

## Root Cause
The `EmailService.cs` was reading from `BASE_URL` environment variable, but the `.env` files used `APP_BASE_URL`.

## Solution

### 1. Fixed EmailService.cs
**File:** `backend/OneDc.Services/Implementation/EmailService.cs`

**Changed line 27:**
```csharp
// Before:
BaseUrl = Environment.GetEnvironmentVariable("BASE_URL") ?? configuration["AppSettings:BaseUrl"] ?? "http://localhost:4200"

// After:
BaseUrl = Environment.GetEnvironmentVariable("APP_BASE_URL") ?? configuration["AppSettings:BaseUrl"] ?? "http://localhost:4200"
```

### 2. Updated .env Files

**Development** (`backend/.env.development`):
```bash
APP_BASE_URL=http://135.233.176.35:4200
```

**Production** (`backend/.env.production`):
```bash
APP_BASE_URL=http://40.74.201.85:4200
```

## How It Works Now

When creating a new user or sending welcome emails:

1. **Development Environment:**
   - Email shows: `http://135.233.176.35:4200`
   - Users click and go to dev server

2. **Production Environment:**
   - Email shows: `http://40.74.201.85:4200`
   - Users click and go to prod server

## Testing

### Test Welcome Email in Development:

1. Deploy to development:
   ```bash
   cd /Users/arul/oneDC/MVP-ver1/oneDC/backend
   ./auto-deploy.sh development
   ```

2. Create a new user via Admin panel or API

3. Check the welcome email - it should show:
   ```
   Login URL: http://135.233.176.35:4200
   ```

### Test Welcome Email in Production:

1. Deploy to production:
   ```bash
   cd /Users/arul/oneDC/MVP-ver1/oneDC/backend
   ./auto-deploy.sh production
   ```

2. Create a new user

3. Check the welcome email - it should show:
   ```
   Login URL: http://40.74.201.85:4200
   ```

## Email Templates That Use This URL

The following email templates use `_emailConfig.BaseUrl`:

1. **Welcome Email** (`SendWelcomeEmailAsync`)
   - Shows login URL
   - Has "Login to OneDC" button

2. **Password Reset Email** (`SendPasswordResetEmailAsync`)
   - Shows reset link with OTP
   - Has "Reset Password" button

3. **Leave Request Email** (`SendLeaveRequestEmailAsync`)
   - Has link to approvals page

4. **Leave Status Email** (`SendLeaveStatusEmailAsync`)
   - Has link to leave management

5. **Timesheet Submission Email** (`SendTimesheetSubmissionEmailAsync`)
   - Has link to approvals

6. **Timesheet Approval Email** (`SendTimesheetApprovalEmailAsync`)
   - Has link to timesheets

All these emails will now use the correct environment-specific URL! ✅

## Verification Commands

```bash
# Check development URL
grep APP_BASE_URL /Users/arul/oneDC/MVP-ver1/oneDC/backend/.env.development

# Check production URL
grep APP_BASE_URL /Users/arul/oneDC/MVP-ver1/oneDC/backend/.env.production

# Check if EmailService.cs is reading correct variable
grep "APP_BASE_URL" /Users/arul/oneDC/MVP-ver1/oneDC/backend/OneDc.Services/Implementation/EmailService.cs
```

## Next Steps

1. ✅ Code changes completed
2. **Rebuild and deploy** to both environments
3. **Test** by creating a test user and checking the welcome email
4. **Verify** all email templates show correct URLs

## Future: SSL/HTTPS

When you set up SSL certificates for production, update to:

```bash
# In .env.production
APP_BASE_URL=https://onedc.yourcompany.com
```

Or if using just IP with SSL:
```bash
APP_BASE_URL=https://40.74.201.85:4200
```
