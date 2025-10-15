# Confirmation Dialog Service

A reusable confirmation dialog service for Angular applications that provides a modern, customizable alternative to the browser's native `confirm()` dialog.

## Features

- **Modern UI**: Beautiful Bootstrap-styled modal dialogs
- **Customizable**: Support for different types (danger, warning, info, success)
- **Flexible Sizing**: Multiple dialog sizes (sm, md, lg, xl)
- **Rich Content**: Support for detailed information and custom styling
- **Promise-based**: Easy async/await usage
- **Type-safe**: Full TypeScript support

## Usage

### 1. Import the Service

```typescript
import { ConfirmationDialogService } from '../../core/services/confirmation-dialog.service';

constructor(private confirmationDialogService: ConfirmationDialogService) {}
```

### 2. Basic Confirmation

```typescript
async deleteItem() {
  const confirmed = await this.confirmationDialogService.confirm(
    'Delete Item',
    'Are you sure you want to delete this item?',
    'Delete',
    'Cancel'
  );
  
  if (confirmed) {
    // Proceed with deletion
  }
}
```

### 3. Pre-built Convenience Methods

#### Delete Confirmation
```typescript
const confirmed = await this.confirmationDialogService.confirmDelete('user account');
```

#### Leave Request Warning
```typescript
const confirmed = await this.confirmationDialogService.confirmLeaveRequest(27, 25);
```

#### Information Dialog
```typescript
await this.confirmationDialogService.showInfo(
  'Process Complete',
  'Your request has been processed successfully.',
  ['Request ID: #12345', 'Email sent to: user@example.com']
);
```

### 4. Advanced Custom Dialog

```typescript
const confirmed = await this.confirmationDialogService.open({
  title: 'Critical Operation',
  message: 'This operation will permanently modify your data.',
  details: [
    'All existing data will be overwritten',
    'This action cannot be undone',
    'Please ensure you have a backup'
  ],
  confirmText: 'I Understand, Proceed',
  cancelText: 'Cancel',
  type: 'danger',
  size: 'lg',
  showDetailsAsAlert: true
});
```

## Dialog Types

- **`danger`**: Red header, used for destructive actions
- **`warning`**: Yellow header, used for cautionary messages
- **`info`**: Blue header, used for informational content
- **`success`**: Green header, used for positive confirmations

## Dialog Sizes

- **`sm`**: Small dialog
- **`md`**: Medium dialog (default)
- **`lg`**: Large dialog
- **`xl`**: Extra large dialog

## Configuration Options

### ConfirmationDialogData Interface

```typescript
interface ConfirmationDialogData {
  title: string;                    // Dialog title
  message: string;                  // Main message text
  confirmText?: string;             // Confirm button text (default: "Confirm")
  cancelText?: string;              // Cancel button text (default: "Cancel")
  type?: 'danger' | 'warning' | 'info' | 'success';  // Dialog type
  details?: string[];               // Additional details to display
  showDetailsAsAlert?: boolean;     // Style details as alert box (default: true)
  size?: 'sm' | 'md' | 'lg' | 'xl'; // Dialog size (default: 'md')
}
```

## Examples in Leave Management

The confirmation dialog service is currently used in the leave management component for:

1. **Leave balance warnings**: When users request more leave days than available
2. **Delete confirmations**: When users want to delete leave requests

### Leave Balance Warning Example

```typescript
// In leave-management.component.ts
if (balance && this.isRequestExceedingBalance()) {
  const requestedDays = this.calculateRequestedDays();
  const confirmed = await this.confirmationDialogService.confirmLeaveRequest(
    requestedDays,
    balance.remainingDays
  );
  
  if (!confirmed) {
    return;
  }
}
```

This creates a dialog showing:
- Title: "Leave Balance Warning"
- Message: "This request exceeds your available leave balance. Do you want to proceed?"
- Details: Requested days, available days, and shortfall
- Buttons: "OK" and "Cancel"

## Best Practices

1. **Use appropriate types**: Choose the right dialog type for your use case
2. **Provide clear messages**: Make the action and consequences clear
3. **Include relevant details**: Use the details array for additional context
4. **Use meaningful button text**: Replace generic "OK/Cancel" with action-specific text
5. **Handle the promise**: Always await the result and handle both confirmed and cancelled cases

## Migration from Native confirm()

**Before:**
```typescript
if (!confirm('Are you sure you want to delete this item?')) {
  return;
}
```

**After:**
```typescript
const confirmed = await this.confirmationDialogService.confirmDelete('item');
if (!confirmed) {
  return;
}
```

This provides a much better user experience with:
- Modern, responsive design
- Better accessibility
- Consistent styling with your application
- More informative content
- Professional appearance
