# Logout Feature Documentation

The OneDC application includes a comprehensive logout feature with the following capabilities:

## Frontend Features

### 1. Logout Button
- Located in the user dropdown menu in the top-right corner of the application
- Displays the current user's name in the dropdown button
- Shows a confirmation dialog before logging out

### 2. Confirmation Dialog
- Prevents accidental logouts
- Clear messaging about the logout action
- Option to cancel or proceed with logout

### 3. Keyboard Shortcut
- **Ctrl+Shift+L** - Quick logout shortcut for power users
- Works from anywhere in the application

### 4. User Feedback
- Success toast message when logout completes
- Error handling with appropriate messages
- Loading state management

### 5. Data Cleanup
- Clears JWT token from localStorage
- Clears onboarding completion status
- Resets all authentication-related observables
- Removes any other session-specific data

## Backend Features

### 1. Logout Endpoint
- **POST** `/api/auth/logout`
- Requires authentication (JWT token)
- Logs logout events for security auditing
- Returns success response

### 2. Security Logging
- Records user email and ID for logout events
- Timestamps all logout actions
- Handles errors gracefully without exposing system information

## Usage

### Manual Logout
1. Click the user dropdown in the top-right corner
2. Click "Sign out"
3. Confirm in the dialog that appears
4. User is redirected to login page

### Keyboard Logout
1. Press **Ctrl+Shift+L** from anywhere in the app
2. Confirm in the dialog that appears
3. User is redirected to login page

## Technical Implementation

### Frontend (Angular)
- `AuthService.logout()` - Main logout logic
- `ShellComponent.logout()` - UI interaction handling
- `ConfirmDialogComponent` - Reusable confirmation dialog
- Toast notifications for user feedback
- Keyboard event handling with HostListener

### Backend (.NET)
- `AuthController.Logout()` - Logout endpoint
- JWT claims extraction for logging
- Console logging for audit trail
- Graceful error handling

## Security Considerations

- JWT tokens are stateless, so logout primarily clears client-side data
- Backend logging provides audit trail for security monitoring
- Confirmation dialog prevents accidental logouts
- Error handling doesn't expose sensitive system information
- Future enhancement opportunity: Token blacklisting for enhanced security

## Future Enhancements

1. **Token Blacklisting**: Server-side token invalidation
2. **Session Timeout**: Automatic logout after inactivity
3. **Multiple Device Logout**: Logout from all devices option
4. **Logout Reasons**: Optional logout reason selection
5. **Activity Logging**: More detailed user activity tracking
