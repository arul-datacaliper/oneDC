#!/bin/bash

# Test Password Reset Functionality
BASE_URL="http://localhost:5260/api"

echo "=== Testing Password Reset Flow ==="

# Test 1: Request password reset
echo "1. Requesting password reset for admin@datacaliper.com..."
RESET_RESPONSE=$(curl -s -X POST "$BASE_URL/PasswordReset/forgot-password" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@datacaliper.com"}')

echo "Response: $RESET_RESPONSE"
echo ""

# Test 2: Try to login with current password (should work)
echo "2. Testing login with current password (password123)..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/Auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@datacaliper.com", "password": "password123"}')

echo "Response: $LOGIN_RESPONSE"
echo ""

echo "=== Instructions ==="
echo "1. Check your console output for the OTP generated for admin@datacaliper.com"
echo "2. Use that OTP to test the reset password endpoint:"
echo "   curl -X POST \"$BASE_URL/PasswordReset/reset-password\" \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -d '{\"email\": \"admin@datacaliper.com\", \"otp\": \"YOUR_OTP_HERE\", \"newPassword\": \"newPassword123\"}'"
echo ""
echo "3. Then test login with the new password:"
echo "   curl -X POST \"$BASE_URL/Auth/login\" \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -d '{\"email\": \"admin@datacaliper.com\", \"password\": \"newPassword123\"}'"
