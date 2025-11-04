# Leave Management Bug Fixes

## Issues Found

### Issue #1: Edit/Delete Icons Not Showing for Leaves Starting Today
**Problem**: Users could not edit or delete leave requests that start on the current date. Only leaves starting in the future had edit/delete icons visible.

**Example**:
- Leave starting **04/11/2025** (today) - ❌ No edit/delete icons
- Leave starting **17/11/2025** (future) - ✅ Has edit/delete icons

**Root Cause**: 
The `canEdit()` and `canDelete()` methods in `leave.service.ts` used `isUpcoming()` which checks if the start date is **greater than** today:

```typescript
isUpcoming(startDate: string): boolean {
  const start = new Date(startDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  return start > today;  // ← Only future dates, not today
}
```

This meant `startDate > today` returned `false` for leaves starting today.

### Issue #2: Users Can Apply Multiple Leaves for Same Date
**Problem**: Users could create multiple leave requests for the same date/date range. The system didn't prevent duplicate pending leave applications.

**Example**:
- User applies for leave on **04/11/2025** (Emergency - Afternoon Half Day) ✅
- User applies again for **04/11/2025** (Annual) ✅ ← Should be blocked!
- Both leave requests created successfully

**Root Cause**:
The `HasOverlappingLeaveAsync()` method in `LeaveRepository.cs` only checked for overlapping with **"Approved"** leaves, not **"Pending"** leaves:

```csharp
var query = _context.LeaveRequests
    .Where(lr => lr.EmployeeId == employeeId &&
               lr.Status == "Approved" &&  // ← Only checks Approved leaves
               ((lr.StartDate <= endDate && lr.EndDate >= startDate)));
```

This allowed multiple pending leave requests for the same dates.

## Solutions Implemented

### Fix #1: Allow Edit/Delete for Leaves Starting Today

**File**: `frontend/onedc/src/app/core/services/leave.service.ts`

**Change**: Modified `canEdit()` and `canDelete()` to allow editing/deleting leaves that start today:

```typescript
// BEFORE
canEdit(leaveRequest: LeaveRequest): boolean {
  return leaveRequest.status === 'Pending' && this.isUpcoming(leaveRequest.startDate);
}

// AFTER
canEdit(leaveRequest: LeaveRequest): boolean {
  const leaveStart = new Date(leaveRequest.startDate);
  leaveStart.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return leaveRequest.status === 'Pending' && leaveStart >= today; // ← Now includes today
}
```

**Logic Change**: `start > today` → `start >= today`

**Result**: Users can now edit/delete:
- ✅ Leaves starting today (before they begin)
- ✅ Leaves starting in the future
- ❌ Leaves that have already started (past dates)

### Fix #2: Prevent Duplicate Leave Applications

**File**: `backend/OneDc.Repository/Implementation/LeaveRepository.cs`

**Change**: Modified `HasOverlappingLeaveAsync()` to check for overlapping with both "Approved" **AND** "Pending" leaves:

```csharp
// BEFORE
var query = _context.LeaveRequests
    .Where(lr => lr.EmployeeId == employeeId &&
               lr.Status == "Approved" &&
               ((lr.StartDate <= endDate && lr.EndDate >= startDate)));

// AFTER
var query = _context.LeaveRequests
    .Where(lr => lr.EmployeeId == employeeId &&
               (lr.Status == "Approved" || lr.Status == "Pending") && // ← Added Pending
               ((lr.StartDate <= endDate && lr.EndDate >= startDate)));
```

**Result**: Users now receive error message when trying to apply for overlapping dates:
- ❌ "You already have a leave request for the selected dates"
- Prevents duplicate pending applications
- Prevents overlapping with approved leaves (existing behavior)

## Testing Scenarios

### Test #1: Edit/Delete Today's Leave
1. ✅ Create a leave request for today (04/11/2025)
2. ✅ View "My Leave Requests" tab
3. ✅ Verify edit (pencil) icon is visible
4. ✅ Verify delete (trash) icon is visible
5. ✅ Click edit → Should open edit form
6. ✅ Click delete → Should show confirmation dialog

### Test #2: Duplicate Leave Prevention
1. ✅ Apply for leave: 17/11/2025 - 20/11/2025 (Sick)
2. ✅ Verify leave created successfully
3. ❌ Try to apply again: 17/11/2025 - 20/11/2025 (Personal)
4. ✅ Should show error: "You already have a leave request for the selected dates"
5. ❌ Try partial overlap: 19/11/2025 - 22/11/2025
6. ✅ Should show same error (overlaps with existing)

### Test #3: Half Day Overlaps
1. ✅ Apply for half day: 04/11/2025 Afternoon (Emergency)
2. ✅ Verify leave created
3. ❌ Try to apply full day: 04/11/2025 (Annual)
4. ✅ Should show error (overlap detected)
5. ❌ Try to apply another half day: 04/11/2025 Morning (Sick)
6. ✅ Should show error (same date, even if different period)

### Test #4: Edit Existing Leave - No Overlap Error
1. ✅ Create leave: 14/11/2025 (Personal)
2. ✅ Click edit
3. ✅ Change reason/hours (keep same date)
4. ✅ Submit → Should succeed without overlap error
5. **Why?** `excludeRequestId` parameter excludes current request from overlap check

## Impact Analysis

### User Experience Improvements
1. **Better Flexibility**: Users can now modify leaves scheduled for today (e.g., change from full day to half day)
2. **Data Integrity**: Prevents accidental duplicate leave applications
3. **Clear Feedback**: Users get immediate error messages for invalid overlapping requests

### Edge Cases Handled

#### Approved + Pending Overlap
- User has **Approved** leave: 10/11 - 15/11
- User tries **Pending** leave: 12/11 - 14/11
- ✅ Blocked (overlaps with approved)

#### Pending + Pending Overlap
- User has **Pending** leave: 17/11 - 20/11
- User tries another **Pending**: 19/11 - 22/11
- ✅ Blocked (overlaps with existing pending)

#### Same Day Multiple Types
- User has **Emergency** half day: 04/11 Afternoon
- User tries **Annual** full day: 04/11
- ✅ Blocked (same date overlap)

#### Edit Own Leave (No False Positive)
- User edits existing leave ID 123
- System excludes ID 123 from overlap check
- ✅ Update succeeds (doesn't detect self-overlap)

## Security Considerations

### No Security Impact
- ✅ Users can still only edit/delete **their own** pending leaves
- ✅ Approved leaves remain protected (cannot edit/delete)
- ✅ Overlap check respects user boundaries (employee-specific)
- ✅ Past dates still blocked from editing

### Validation Flow Maintained
1. Frontend validation (immediate feedback)
2. Backend validation (security layer)
3. Database constraints (data integrity)

## Rejected Alternatives

### Alternative #1: Allow Multiple Pending Leaves for Same Date
**Why Rejected**: 
- Causes confusion for approvers (which one to approve?)
- Leads to accounting errors (double-counted leave days)
- Users might submit duplicates by mistake

### Alternative #2: Only Check Approved Leaves (Original Behavior)
**Why Rejected**:
- Allows multiple pending duplicates
- Causes issues when all get approved
- Poor user experience

### Alternative #3: Block Today's Date from Editing
**Why Rejected**:
- Too restrictive for users
- Legitimate use case: User needs to change full day → half day on same morning
- No technical reason to prevent this

## Deployment Notes

### Files Changed
1. **Frontend**: `frontend/onedc/src/app/core/services/leave.service.ts`
   - Modified `canEdit()` method (line 258-266)
   - Modified `canDelete()` method (line 268-276)

2. **Backend**: `backend/OneDc.Repository/Implementation/LeaveRepository.cs`
   - Modified `HasOverlappingLeaveAsync()` method (line 105)
   - Added: `|| lr.Status == "Pending"` to WHERE clause

### Database Changes
- ❌ No database schema changes required
- ✅ No migrations needed
- ✅ Existing data unaffected

### Backward Compatibility
- ✅ **Fully backward compatible**
- Existing leave requests work as before
- No breaking API changes
- No frontend breaking changes

### Rollback Plan
If issues occur:

**Frontend Rollback**:
```typescript
// Revert to original isUpcoming() check
canEdit(leaveRequest: LeaveRequest): boolean {
  return leaveRequest.status === 'Pending' && this.isUpcoming(leaveRequest.startDate);
}
```

**Backend Rollback**:
```csharp
// Revert to checking only Approved leaves
lr.Status == "Approved" &&
```

## Future Enhancements

1. **Smart Half Day Handling**: Allow morning + afternoon half days on same date (different users or same user different periods)
2. **Leave Type Priority**: Emergency leaves override personal leaves for same date
3. **Overlap Warnings**: Show warning instead of error for certain leave types
4. **Bulk Delete**: Allow deleting multiple pending leaves at once
5. **Leave Request Draft**: Save draft without validation, submit later with validation

## Related Issues

- **ALLOCATION_UPDATE_FEATURE.md**: Similar duplicate detection logic
- **APPROVER_ALLOCATION_VISIBILITY_FIX.md**: Role-based filtering patterns

---
**Created**: November 4, 2025  
**Issues Fixed**: 
1. Edit/delete icons not showing for today's leaves
2. Multiple leave applications allowed for same date  
**Status**: ✅ Fixed - Ready for Testing
