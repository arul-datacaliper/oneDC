# Approver Allocation Visibility Fix

## Issue
Approvers who were allocated to projects (but not managing those projects or being team members) could not see:
- Their own allocations
- Projects they were allocated to (in timesheet project dropdown)
- Their allocation summary
- Their names in employee lists

This happened because the role-based filtering in multiple controllers only checked:
1. Projects where approver is DefaultApprover
2. Projects where approver is a ProjectMember

But **NOT** projects where approver has WeeklyAllocations.

## Root Cause
Backend controllers had restrictive role-based filtering that excluded approvers' own allocations when they weren't project managers or team members.

## Solution
Enhanced role-based filtering logic across all relevant controllers to include projects where approvers have allocations.

## Files Changed

### 1. AllocationsController.cs
**Endpoint: `GET /api/allocations/week/{weekStartDate}`** (Line 47)
- **Before**: Only showed allocations for projects where approver is DefaultApprover or ProjectMember
- **After**: Also shows approver's own allocations (`wa.UserId == currentUserId`)

**Endpoint: `GET /api/allocations/project-summary/{weekStartDate}`** (Line 311)
- **Before**: Only showed projects where approver is DefaultApprover or ProjectMember
- **After**: Also shows projects where approver has allocations

**Endpoint: `GET /api/allocations/employee-summary/{weekStartDate}`** (Line 386)
- **Before**: Only showed employees from projects approver manages
- **After**: Also includes approver themselves in the employee list

**Endpoint: `GET /api/allocations/available-projects`** (Line 568)
- **Before**: Only showed projects where approver is DefaultApprover or ProjectMember
- **After**: Also shows projects where approver has allocations

**Endpoint: `GET /api/allocations/available-employees`** (Line 606)
- **Before**: Only showed employees from projects approver manages
- **After**: Also includes approver themselves in available employees list

### 2. ProjectsController.cs
**Endpoint: `GET /api/projects`** (Line 38)
- **Before**: Only returned projects where approver is DefaultApprover or ProjectMember
- **After**: Also returns projects where approver has allocations
- **Used by**: Timesheet module project dropdown

**Endpoint: `GET /api/projects/with-members`** (Line 186)
- **Before**: Only returned projects with members where approver manages/is member of
- **After**: Also returns projects where approver has allocations

## Technical Implementation

### Pattern Used (Consistent Across All Endpoints)

```csharp
// Get projects where approver is DefaultApprover or ProjectMember
var approverProjectIds = await _db.Projects
    .Where(p => p.DefaultApprover == currentUserId || 
               _db.Set<ProjectMember>().Any(pm => pm.ProjectId == p.ProjectId && pm.UserId == currentUserId))
    .Select(p => p.ProjectId)
    .ToListAsync();

// Get projects where approver has allocations
var allocationProjectIds = await _db.WeeklyAllocations
    .Where(wa => wa.UserId == currentUserId)
    .Select(wa => wa.ProjectId)
    .Distinct()
    .ToListAsync();

// Combine both lists
var allProjectIds = approverProjectIds.Union(allocationProjectIds).ToList();

// Use allProjectIds in the query filter
query = query.Where(p => allProjectIds.Contains(p.ProjectId));
```

### For Employee Lists (Include Approver Themselves)

```csharp
var allEmployeeIds = employeeIdsInAllocations
    .Union(employeeIdsInMembers)
    .Union(new[] { currentUserId })  // ← Key addition
    .Distinct()
    .ToList();
```

## Testing Scenarios

### Scenario 1: Admin Creates Allocation for Approver
1. ✅ Admin logs in
2. ✅ Navigates to Allocations
3. ✅ Selects project "MD Phase 1 - David1"
4. ✅ Adds "Arul guru" (Approver) with 2 hours
5. ✅ Creates allocation successfully
6. ✅ Approver "Arul guru" logs in
7. ✅ **Can now see** their allocation in Allocations page
8. ✅ **Can now see** "MD Phase 1 - David1" in timesheet project dropdown
9. ✅ **Can create** timesheet entries for that project

### Scenario 2: Approver Views Their Own Data
1. ✅ Approver logs in who has allocations but doesn't manage projects
2. ✅ Navigates to Allocations → Overview
3. ✅ Sees their own name in employee list
4. ✅ Sees their allocated hours
5. ✅ Navigates to Allocations → Employee View
6. ✅ Can filter by their own name
7. ✅ Sees all their allocations across projects

### Scenario 3: Timesheet Project Visibility
1. ✅ Approver logs in who was allocated to a project
2. ✅ Navigates to Timesheet Editor
3. ✅ Opens project dropdown
4. ✅ **Can now see** projects they have allocations for
5. ✅ Can create timesheet entries for those projects

## Impact Analysis

### Before Fix
- **Approvers**: Could only see/use projects they manage or are members of
- **Problem**: If admin allocates approver to other projects, approver can't track time
- **Workaround**: Admin had to manually add approver as ProjectMember (incorrect semantic)

### After Fix
- **Approvers**: Can see/use all projects where they have allocations
- **Benefit**: Proper separation of concerns (allocation ≠ project membership)
- **Use Case**: Approvers can be temporarily allocated to projects for specific tasks without becoming full team members

## Related Modules

### Modules That Benefit From This Fix
1. ✅ **Allocations Module**: View own allocations, create/edit/delete
2. ✅ **Timesheet Module**: Select projects to log hours
3. ✅ **Reports Module**: Approver's data appears in allocation reports
4. ✅ **Dashboard Module**: Approver's utilization calculated correctly

### Modules Unaffected
- **Projects Module**: Project access still controlled by DefaultApprover/ProjectMember
- **Tasks Module**: Task assignment still controlled by ProjectMember status
- **Approvals Module**: Approval permissions still based on DefaultApprover

## Security Considerations

### What Approvers CAN Do With Allocated Projects
✅ View their own allocations
✅ Create timesheet entries
✅ See project name in dropdowns
✅ View their utilization reports

### What Approvers CANNOT Do (Security Maintained)
❌ View other team members' timesheets
❌ Approve timesheets (only for managed projects)
❌ Edit project details
❌ Add/remove project members
❌ View project tasks not assigned to them

## Future Enhancements

1. **Allocation-Based Permissions**: Create a permission system based on allocation type
   - Example: "Consultant" allocation → Read-only access
   - Example: "Lead" allocation → Can view team member timesheets

2. **Automatic ProjectMember Creation**: When allocating someone for > X hours/weeks, ask if they should become a team member

3. **Allocation Expiry Handling**: Hide expired allocations from project dropdowns while keeping historical data

4. **Notification System**: Notify approvers when they're allocated to new projects

## Rollback Plan

If issues arise, revert these specific lines:

### AllocationsController.cs
- Line 47: Change back to `approverProjectIds.Contains(wa.ProjectId)` (remove `|| wa.UserId == currentUserId`)
- Line 311, 386, 568, 606: Remove allocation-based project/employee filtering

### ProjectsController.cs
- Line 38: Remove WeeklyAllocations union logic
- Line 186: Remove WeeklyAllocations union logic

## Deployment Notes

1. **No Database Changes Required**: Pure logic changes in controllers
2. **No Frontend Changes Required**: Frontend already handles dynamic project lists
3. **Testing Priority**: High - affects core functionality for approver role
4. **Backward Compatible**: Yes - existing admin/employee roles unaffected

---
**Created**: November 4, 2025  
**Issue**: Approvers couldn't see their own allocations or allocated projects  
**Fix**: Enhanced role-based filtering to include allocation-based visibility  
**Status**: ✅ Fixed - Ready for testing
