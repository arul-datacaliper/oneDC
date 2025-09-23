#!/bin/bash

# Test Employee Creation with Welcome Email
BASE_URL="http://localhost:5260/api"

echo "=== Testing Employee Creation with Welcome Email ==="

# First, login as admin to get auth token
echo "1. Logging in as admin..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/Auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@datacaliper.com", "password": "password123"}')

# Extract token (assuming the response contains a token field)
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "Failed to get auth token. Login response: $LOGIN_RESPONSE"
    exit 1
fi

echo "Login successful! Token: ${TOKEN:0:20}..."
echo ""

# Create a new employee
echo "2. Creating new employee..."
CREATE_EMPLOYEE_RESPONSE=$(curl -s -X POST "$BASE_URL/employees" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "workEmail": "john.doe@datacaliper.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "EMPLOYEE",
    "gender": "MALE",
    "dateOfJoining": "2025-01-01",
    "jobTitle": "Software Developer",
    "department": "Engineering",
    "employeeType": "FULL_TIME",
    "personalEmail": "john.doe.personal@gmail.com",
    "contactNumber": "+1234567890",
    "presentAddressLine1": "123 Main St",
    "presentCity": "New York",
    "presentState": "NY",
    "presentCountry": "USA",
    "presentZipCode": "10001",
    "isActive": true
  }')

echo "Create employee response: $CREATE_EMPLOYEE_RESPONSE"
echo ""

echo "=== Expected Behavior ==="
echo "1. A new employee should be created with a temporary password"
echo "2. A welcome email should be sent to john.doe@datacaliper.com with:"
echo "   - Login credentials (email + temporary password)"
echo "   - Instructions to change password on first login"
echo "   - Login URL to the application"
echo ""
echo "3. Check the application logs for:"
echo "   - Password generation"
echo "   - Email sending confirmation"
echo "   - Any potential errors"
