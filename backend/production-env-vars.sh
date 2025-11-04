#!/bin/bash
# Production Environment Variables for OneDC Backend

# Azure Email Configuration (if using Azure Communication Services)
export AZURE_EMAIL_CONNECTION_STRING="your-azure-email-connection-string"
export AZURE_EMAIL_FROM_EMAIL="noreply@datacaliper.com"
export AZURE_EMAIL_FROM_NAME="OneDC System"

# Application Base URL - Frontend URL for email links
export APP_BASE_URL="https://135.233.176.35/"

echo "✓ Environment variables set for OneDC Production"
echo "  - Frontend URL: $APP_BASE_URL"
echo "  - Email From: $AZURE_EMAIL_FROM_NAME <$AZURE_EMAIL_FROM_EMAIL>"
