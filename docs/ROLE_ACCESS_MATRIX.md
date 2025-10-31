# oneDC Role-Based Feature Access Matrix

Quick visual reference showing what each role can do in oneDC.

---

## Access Legend
- ✅ **Full Access** - Can view, create, edit, delete
- 👁️ **View Only** - Can view but not modify
- 🔒 **Own Data Only** - Can only access their own data
- ❌ **No Access** - Cannot access this feature

---

## Feature Access Matrix

| Module / Feature | Admin | Approver | Employee |
|-----------------|-------|----------|----------|
| **DASHBOARD** |
| View Dashboard | ✅ | ✅ | ✅ |
| View System Stats | ✅ | 🔒 Project Stats | 🔒 Personal Stats |
| View All Activities | ✅ | 🔒 Project Activities | 🔒 Own Activities |
| | | | |
| **USERS** |
| View All Users | ✅ | 👁️ | 👁️ Limited |
| Create User | ✅ | ❌ | ❌ |
| Edit User | ✅ | ❌ | 🔒 Own Profile |
| Delete User | ✅ | ❌ | ❌ |
| Reset Password | ✅ | ❌ | 🔒 Own Password |
| Assign Roles | ✅ | ❌ | ❌ |
| | | | |
| **CLIENTS** |
| View Clients | ✅ | 👁️ | ❌ |
| Create Client | ✅ | ❌ | ❌ |
| Edit Client | ✅ | ❌ | ❌ |
| Delete Client | ✅ | ❌ | ❌ |
| | | | |
| **PROJECTS** |
| View All Projects | ✅ | ❌ | ❌ |
| View Own Projects | ✅ | ✅ * | 👁️ ** |
| Create Project | ✅ | ❌ | ❌ |
| Edit Project | ✅ | 🔒 * Own Projects | ❌ |
| Delete Project | ✅ | ❌ | ❌ |
| Assign Default Approver | ✅ | ❌ | ❌ |
| Manage Team Members | ✅ | 🔒 * Own Projects | ❌ |
| | | | |
| **TASKS** |
| View All Tasks | ✅ | ❌ | ❌ |
| View Project Tasks | ✅ | ✅ * | 🔒 ** Assigned Only |
| Create Task | ✅ | ✅ * | ❌ |
| Edit Task | ✅ | ✅ * | ❌ |
| Delete Task | ✅ | ✅ * | ❌ |
| Assign Task | ✅ | ✅ * | ❌ |
| Update Own Task Status | ✅ | ✅ | ✅ Assigned Tasks |
| Mark Complete | ✅ | ✅ * | ✅ Assigned Tasks |
| Duplicate Task | ✅ | ✅ * | ❌ |
| | | | |
| **TIMESHEETS** |
| View All Timesheets | ✅ | ❌ | ❌ |
| View Project Timesheets | ✅ | ✅ * | ❌ |
| View Own Timesheets | ✅ | ✅ | ✅ |
| Create Timesheet Entry | ✅ | ✅ | ✅ |
| Edit Draft/Rejected Entry | ✅ | ✅ | ✅ Own Only |
| Delete Draft/Rejected Entry | ✅ | ✅ | ✅ Own Only |
| Submit for Approval | ✅ | ✅ | ✅ Own Only |
| Approve Timesheets | ✅ All | ✅ * Project Timesheets | ❌ |
| Reject Timesheets | ✅ All | ✅ * Project Timesheets | ❌ |
| Edit Approved Timesheets | ✅ | ❌ | ❌ |
| | | | |
| **ALLOCATIONS** |
| View Allocations | ✅ | 👁️ | 👁️ Own Only |
| Create Allocation | ✅ | ❌ | ❌ |
| Edit Allocation | ✅ | ❌ | ❌ |
| Delete Allocation | ✅ | ❌ | ❌ |
| Export Allocations to CSV | ✅ | ❌ | ❌ |
| | | | |
| **APPROVALS** |
| View All Approvals | ✅ | ❌ | ❌ |
| View Project Approvals | ✅ | ✅ * | ❌ |
| Approve/Reject | ✅ All | ✅ * Project Timesheets | ❌ |
| Bulk Approve/Reject | ✅ | ✅ * | ❌ |
| View Approval History | ✅ | ✅ * | 🔒 Own Only |
| | | | |
| **REPORTS** |
| View System Reports | ✅ | ❌ | ❌ |
| View Project Reports | ✅ | ✅ * | ❌ |
| View Personal Reports | ✅ | ✅ | ✅ |
| User Activity Report | ✅ All Users | ✅ * Team Members | 🔒 Own Only |
| Project Hours Report | ✅ All Projects | ✅ * Own Projects | ❌ |
| Timesheet Summary | ✅ All | ✅ * Projects | 🔒 Own Only |
| Allocation Report | ✅ | 👁️ | 👁️ Own Only |
| Export Reports to CSV | ✅ | ✅ * | ✅ Own Reports |
| | | | |
| **PROFILE** |
| View Own Profile | ✅ | ✅ | ✅ |
| Edit Own Profile | ✅ | ✅ | ✅ |
| Change Own Password | ✅ | ✅ | ✅ |
| Upload Profile Photo | ✅ | ✅ | ✅ |
| | | | |
| **SETTINGS** |
| System Configuration | ✅ | ❌ | ❌ |
| Email Settings | ✅ | ❌ | ❌ |
| Holiday Management | ✅ | ❌ | ❌ |
| Audit Logs | ✅ | ❌ | ❌ |

---

## Key Notes

### * Approver Project Access
Approvers have access to projects where they are:
1. **Default Approver** for the project, OR
2. **Team Member** (any role: Member, Lead, Contributor, Reviewer)

If an Approver cannot see a project:
- They are not the Default Approver
- They are not added as a Team Member
- **Solution:** Contact Admin to be added to the project

### ** Employee Task/Project Access
Employees can only see:
- **Projects** where they have tasks assigned
- **Tasks** that are assigned to them specifically
- Cannot see tasks assigned to other team members (unless using "All" filter in task list)

---

## Permission Hierarchy

```
ADMIN (Highest)
  ├── Full system access
  ├── Manage all users, clients, projects
  ├── View and manage all tasks
  ├── Approve all timesheets
  └── Generate all reports
  
APPROVER (Middle)
  ├── Manage specific projects
  ├── Create and assign tasks
  ├── Approve project timesheets
  ├── View project reports
  └── Cannot manage users or clients
  
EMPLOYEE (Base)
  ├── View assigned tasks
  ├── Update own task status
  ├── Submit timesheets
  ├── View own reports
  └── Cannot create tasks or approve
```

---

## Access Scenarios

### Scenario 1: New Employee Joins
**Admin Actions:**
1. Create user account (Role: Employee)
2. Add to relevant projects as Team Member
3. Create initial tasks assigned to them

**What Employee Can Now See:**
- ✅ Projects where they have tasks
- ✅ Tasks assigned to them
- ✅ Can create timesheets for those projects

### Scenario 2: Promote Employee to Approver
**Admin Actions:**
1. Change user role from Employee to Approver
2. Assign as Default Approver to projects OR add as Team Member
3. Notify user of new responsibilities

**What Approver Can Now Do:**
- ✅ Create and manage tasks for their projects
- ✅ Approve timesheets
- ✅ View project reports

### Scenario 3: Project Manager Needs Access
**Issue:** Approver can't see a specific project

**Admin Actions:**
1. Go to Projects → Edit Project
2. Either:
   - Set Approver as "Default Approver", OR
   - Add Approver to "Team Members"
3. Save project

**Result:** Approver can now see and manage that project

---

## Feature Availability by Module

### Always Available to All Roles ✅
- Login/Logout
- View own profile
- Change own password
- View dashboard (role-appropriate data)
- Create own timesheets
- Submit own timesheets

### Restricted to Admins Only 🔒
- User management
- Client management
- Project creation/deletion
- System settings
- Holiday management
- Allocation management
- Audit logs

### Conditional Access (Approver) ⚠️
Based on project membership:
- Task creation/management
- Timesheet approval
- Project reports
- Team management

### Personal Data Only (Employee) 👤
- Own tasks
- Own timesheets
- Own reports
- Own profile

---

## Data Visibility Rules

### Admin
```
Can see: EVERYTHING
  ├── All users across all departments
  ├── All clients
  ├── All projects (Active, On Hold, Closed)
  ├── All tasks across all projects
  ├── All timesheets from all users
  └── All system reports
```

### Approver
```
Can see: OWN PROJECTS + TEAM DATA
  ├── All users (view only)
  ├── Projects where Default Approver or Team Member
  ├── All tasks in accessible projects
  ├── Timesheets from team members in accessible projects
  └── Reports for accessible projects
```

### Employee
```
Can see: OWN WORK ONLY
  ├── Own user profile
  ├── Projects with assigned tasks (view only)
  ├── Tasks assigned to self
  ├── Own timesheets
  └── Own reports
```

---

## Best Practice Recommendations

### For Admins
- ✅ Always set Default Approver when creating projects
- ✅ Add all relevant team members to projects
- ✅ Review user roles quarterly
- ✅ Deactivate users who leave the company
- ✅ Monitor system usage via audit logs

### For Approvers
- ✅ Regularly check project access
- ✅ Request Admin to add you to new projects
- ✅ Keep team member list updated
- ✅ Assign tasks promptly to team members
- ✅ Review and approve timesheets within 48 hours

### For Employees
- ✅ Contact manager if can't see expected projects
- ✅ Report access issues to Admin immediately
- ✅ Only work on assigned tasks
- ✅ Submit timesheets weekly
- ✅ Keep profile information current

---

## Troubleshooting Access Issues

### "I can't see any projects"

**If you're an Approver:**
- Check if you're assigned as Default Approver on any projects
- Check if you're added as Team Member on any projects
- Contact Admin to be added to relevant projects

**If you're an Employee:**
- Check if you have any tasks assigned
- Projects only appear if you have assigned tasks
- Contact your manager to assign tasks to you

### "I can't create tasks"

- Only Admins and Approvers can create tasks
- Approvers can only create tasks for their accessible projects
- Employees cannot create tasks (contact manager)

### "I can't approve timesheets"

- Only Admins and Approvers can approve timesheets
- Approvers can only approve for their accessible projects
- Employees cannot approve timesheets

### "I can see a project but can't manage it"

**If you're an Approver:**
- You might be seeing it through "View All" but don't have access
- Verify you're Default Approver or Team Member
- Contact Admin to be added properly

---

## Security Best Practices

### Password Policy
- ✅ Minimum 8 characters
- ✅ Include uppercase, lowercase, numbers
- ✅ Change every 90 days (recommended)
- ✅ Don't share passwords
- ✅ Use unique passwords (not used elsewhere)

### Account Security
- ✅ Log out when leaving workstation
- ✅ Don't share your account
- ✅ Report suspicious activity
- ✅ Enable 2FA if available

### Data Access
- ✅ Only access data you need for your job
- ✅ Don't share sensitive information
- ✅ Report data breaches immediately
- ✅ Follow company data protection policies

---

## Related Documentation

- 📘 [Admin User Guide](./USER_GUIDE_ADMIN.md) - Complete admin documentation
- 📗 [Approver User Guide](./USER_GUIDE_APPROVER.md) - Detailed approver workflows
- 📙 [Employee User Guide](./USER_GUIDE_EMPLOYEE.md) - Employee instructions
- ⚡ [Quick Reference](./QUICK_REFERENCE.md) - One-page cheat sheet

---

**Last Updated:** October 2025  
**Version:** 1.0
