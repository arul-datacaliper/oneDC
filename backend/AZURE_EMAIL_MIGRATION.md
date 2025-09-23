# Migration from SendGrid to Azure Email Communication Service

## Overview
This document outlines the changes made to replace SendGrid with Azure Email Communication Service in the OneDC application.

## Changes Made

### 1. Package References Updated

**OneDc.Api.csproj:**
- Removed: `SendGrid` (Version 9.29.3)
- Removed: `SendGrid.Extensions.DependencyInjection` (Version 1.0.1)
- Added: `Azure.Communication.Email` (Version 1.0.1)

**OneDc.Services.csproj:**
- Removed: `SendGrid` (Version 9.29.3)
- Removed: `SendGrid.Extensions.DependencyInjection` (Version 1.0.1)
- Added: `Azure.Communication.Email` (Version 1.0.1)

### 2. Configuration Changes

**Environment Variables (.env):**
```properties
# OLD SendGrid Configuration (REMOVED)
# SENDGRID_API_KEY=...
# SENDGRID_FROM_EMAIL=...
# SENDGRID_FROM_NAME=...

# NEW Azure Email Communication Configuration
AZURE_EMAIL_CONNECTION_STRING=endpoint=https://your-acs-resource.communication.azure.com/;accesskey=your-access-key
AZURE_EMAIL_FROM_EMAIL=donotreply@datacaliper.com
AZURE_EMAIL_FROM_NAME=OneDC System
```

**appsettings.json & appsettings.Development.json:**
```json
// OLD SendGrid Configuration (REPLACED)
{
  "AzureEmail": {
    "ConnectionString": "",
    "FromEmail": "donotreply@datacaliper.com",
    "FromName": "OneDC System"
  }
}
```

### 3. Code Changes

**Program.cs:**
- Replaced `using SendGrid.Extensions.DependencyInjection;` with `using Azure.Communication.Email;`
- Replaced SendGrid service registration with Azure Email Communication service:

```csharp
// OLD
builder.Services.AddSendGrid(options =>
{
    options.ApiKey = Environment.GetEnvironmentVariable("SENDGRID_API_KEY") ?? builder.Configuration["SendGrid:ApiKey"] ?? "";
});

// NEW
var azureEmailConnectionString = Environment.GetEnvironmentVariable("AZURE_EMAIL_CONNECTION_STRING") ?? 
                                builder.Configuration["AzureEmail:ConnectionString"] ?? "";
builder.Services.AddSingleton(new EmailClient(azureEmailConnectionString));
```

**EmailConfiguration.cs:**
- Replaced `SendGridApiKey` property with `AzureEmailConnectionString`

**EmailService.cs:**
- Replaced SendGrid imports with Azure Email Communication imports
- Updated constructor to use `EmailClient` instead of `ISendGridClient`
- Completely rewrote `SendEmailAsync` method to use Azure Email Communication API

## Setup Instructions

### 1. Azure Email Communication Service Setup

1. **Create Azure Communication Services resource:**
   - Go to Azure Portal
   - Create a new "Communication Services" resource
   - Note down the connection string from the Keys section

2. **Set up Email Domain:**
   - In your Communication Services resource, go to "Email" → "Provision domains"
   - Either use Azure Managed Domain or connect your custom domain
   - Configure SPF, DKIM, and DMARC records if using custom domain

3. **Update Configuration:**
   - Replace `your-acs-resource` and `your-access-key` in the connection string
   - Ensure the `FromEmail` address is from your verified domain

### 2. Environment Variables

Update your deployment environment variables:

```bash
# Required
AZURE_EMAIL_CONNECTION_STRING=endpoint=https://your-acs-resource.communication.azure.com/;accesskey=your-access-key

# Optional (will fall back to appsettings values)
AZURE_EMAIL_FROM_EMAIL=donotreply@datacaliper.com
AZURE_EMAIL_FROM_NAME=OneDC System
```

### 3. Testing

The following email functions are available and have been migrated:
- `SendPasswordResetEmailAsync` - Sends OTP for password reset
- `SendWelcomeEmailAsync` - Sends welcome email with temporary password
- `SendPasswordChangedNotificationAsync` - Sends password change confirmation
- `SendEmailAsync` - Generic email sending method

## Benefits of Azure Email Communication Service

1. **Integration**: Better integration with Azure ecosystem
2. **Reliability**: Built on Azure's infrastructure
3. **Cost-effective**: Often more cost-effective than SendGrid
4. **Compliance**: Built-in compliance features
5. **Scalability**: Automatic scaling with Azure
6. **Analytics**: Built-in email analytics and tracking

## Migration Verification

To verify the migration:

1. **Build Check**: ✅ Project builds successfully
2. **Dependencies**: ✅ All SendGrid dependencies removed
3. **Configuration**: ✅ All SendGrid configuration replaced
4. **Code**: ✅ All SendGrid API calls replaced

## Next Steps

1. Set up Azure Communication Services in your Azure subscription
2. Configure the proper connection string in your environment
3. Test email functionality in development environment
4. Update production environment variables
5. Monitor email delivery and performance

## Rollback Plan

If you need to rollback to SendGrid:

1. Revert the package references in `.csproj` files
2. Restore SendGrid configuration in appsettings and environment variables
3. Revert the EmailService.cs and Program.cs changes
4. Run `dotnet restore` and `dotnet build`

All the original SendGrid code is preserved in the git history and can be restored if needed.
