# oneDC User Guides

Welcome to the oneDC User Documentation! This folder contains comprehensive user guides for each role in the system.

## Available Guides

### 📘 [Admin User Guide](./USER_GUIDE_ADMIN.md)
Complete guide for system administrators with full access to all features.

**Key Topics:**
- User management (create, edit, delete users)
- Client and project management
- Task creation and management
- Resource allocation management
- Timesheet approval workflows
- System-wide reporting
- System configuration

**Who should read this:** System Administrators, IT Managers

---

### 📗 [Approver User Guide](./USER_GUIDE_APPROVER.md)
Guide for team leads, project managers, and approvers who manage projects and approve timesheets.

**Key Topics:**
- Project access (Default Approver or Team Member)
- Task management (create, edit, assign, track)
- Timesheet approval workflows
- Team member supervision
- Project-specific reporting
- Best practices for approvals

**Who should read this:** Project Managers, Team Leads, Department Heads, Approvers

---

### 📙 [Employee User Guide](./USER_GUIDE_EMPLOYEE.md)
Guide for employees who work on tasks and submit timesheets.

**Key Topics:**
- Viewing assigned tasks
- Updating task status
- Creating and submitting timesheets
- Handling rejected timesheets
- Profile management
- Daily workflows and best practices

**Who should read this:** Developers, Designers, Analysts, Consultants, All Team Members

---

## Quick Role Comparison

| Feature | Admin | Approver | Employee |
|---------|-------|----------|----------|
| **User Management** | ✅ Full | ❌ No | ❌ No |
| **Client Management** | ✅ Full | ❌ No | ❌ No |
| **Project Management** | ✅ All Projects | ✅ Their Projects* | ❌ View Only |
| **Task Creation** | ✅ All Projects | ✅ Their Projects* | ❌ No |
| **Task Assignment** | ✅ Yes | ✅ Their Projects* | ❌ No |
| **View Tasks** | ✅ All | ✅ Their Projects* | ✅ Assigned to Them |
| **Update Task Status** | ✅ All | ✅ Their Projects* | ✅ Assigned to Them |
| **Create Timesheets** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Approve Timesheets** | ✅ All | ✅ Their Projects* | ❌ No |
| **View Timesheets** | ✅ All | ✅ Their Projects* | ✅ Own Only |
| **Reports** | ✅ All | ✅ Their Projects* | ✅ Personal |
| **Allocations** | ✅ Manage | ❌ View Only | ❌ View Only |

\* **Their Projects** = Projects where Approver is the Default Approver OR a Team Member

---

## Getting Started

### For New Users

1. **Receive Your Credentials**
   - Your admin will create your account
   - You'll receive a welcome email with login details

2. **First Login**
   - Go to the oneDC login page
   - Enter your email and password
   - Change your password (recommended)

3. **Read Your Role Guide**
   - Admin: Start with [Admin Guide](./USER_GUIDE_ADMIN.md)
   - Approver: Start with [Approver Guide](./USER_GUIDE_APPROVER.md)
   - Employee: Start with [Employee Guide](./USER_GUIDE_EMPLOYEE.md)

4. **Complete Your Profile**
   - Add profile photo
   - Verify contact information
   - Update any missing details

### For System Administrators

Setting up a new user:
1. Create user account with appropriate role
2. Send them the relevant user guide link
3. Add them to projects (if Approver/Employee)
4. Assign initial tasks (if Employee)

---

## Common Workflows

### Project Setup (Admin)
1. Create client
2. Create project with client assignment
3. Assign Default Approver
4. Add team members
5. Create initial tasks
6. Set up allocations

### Task Assignment (Approver)
1. Select project
2. Create task with details
3. Assign to team member
4. Set estimated hours and dates
5. Monitor progress

### Time Logging (Employee)
1. Complete assigned tasks
2. Log time daily with clear descriptions
3. Submit timesheets weekly
4. Respond to feedback if rejected

### Timesheet Approval (Approver)
1. Review submitted timesheets
2. Verify hours and descriptions
3. Approve or reject with feedback
4. Monitor team utilization

---

## Role Definitions

### Admin
**Full system access and administrative capabilities**

Admins have unrestricted access to all modules and can:
- Manage all users, clients, and projects
- View and manage all tasks across all projects
- Approve any timesheets
- Generate any reports
- Configure system settings

**Typical Job Titles:** System Administrator, IT Manager, Operations Manager

### Approver
**Project management and approval capabilities**

Approvers can manage projects where they are either the **Default Approver** or a **Team Member**:
- Create and manage tasks for their projects
- Assign tasks to team members
- Approve/reject timesheets for their projects
- View project-specific reports
- Cannot manage users or clients

**Typical Job Titles:** Project Manager, Team Lead, Department Manager, Technical Lead

### Employee
**Task execution and time logging**

Employees have focused access to their own work:
- View and update tasks assigned to them
- Create and submit timesheets
- View own timesheet approval status
- Cannot create tasks or approve timesheets
- Cannot access other employees' data

**Typical Job Titles:** Developer, Designer, Analyst, Consultant, Contractor

---

## Key Concepts

### Projects
Work initiatives tied to clients with budgets, timelines, and teams.
- Created by Admins
- Managed by Admins and Approvers
- Visible to employees with assigned tasks

### Tasks
Specific work items within projects.
- Created by Admins and Approvers
- Assigned to Employees
- Tracked through status updates
- Linked to timesheets

### Timesheets
Time tracking entries for work performed.
- Created by all users (Admin, Approver, Employee)
- Submitted for approval
- Approved/Rejected by Approvers and Admins
- Used for billing and reporting

### Allocations
Planned resource assignments across projects.
- Managed by Admins
- Used for capacity planning
- Weekly hour allocations (max 40 hours/week)

### Approvals
Workflow for timesheet verification.
- Approvers review submitted timesheets
- Can approve or reject with feedback
- Employees can resubmit after corrections

---

## System Requirements

### Browser Compatibility
- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)

### Internet Connection
- Stable internet connection required
- Minimum speed: 1 Mbps

### Screen Resolution
- Minimum: 1280x720
- Recommended: 1920x1080 or higher

---

## Support & Resources

### Documentation
- **User Guides**: This folder (`/docs/`)
- **API Documentation**: `/docs/API.md` (if available)
- **Technical Documentation**: `/backend/README.md` and `/frontend/README.md`

### Getting Help

**For Technical Issues:**
- Contact: support@onedc.com (replace with actual support email)
- Response time: Within 1 business day

**For Role-Specific Questions:**
- Employees: Contact your manager/team lead
- Approvers: Contact your admin or project manager
- Admins: Contact IT support or system vendor

**For System Enhancement Requests:**
- Submit feature requests to: feedback@onedc.com
- Include detailed description and use case

---

## Training Recommendations

### For New Admins
- **Duration:** 2-3 hours
- **Topics:**
  - System overview and navigation
  - User management
  - Project and client setup
  - Task management
  - Allocation planning
  - Reports and analytics

### For New Approvers
- **Duration:** 1-2 hours
- **Topics:**
  - System navigation
  - Project access model
  - Task creation and management
  - Timesheet approval workflow
  - Best practices for approvals

### For New Employees
- **Duration:** 30-60 minutes
- **Topics:**
  - System login and navigation
  - Viewing assigned tasks
  - Updating task status
  - Creating timesheets
  - Submitting for approval

---

## Best Practices Across All Roles

### Communication
✅ Clear and timely communication  
✅ Document important decisions  
✅ Notify team of blockers immediately  
✅ Provide constructive feedback  

### Time Management
✅ Log time daily (don't wait)  
✅ Review timesheets before submitting  
✅ Meet submission deadlines  
✅ Be honest and accurate  

### Quality
✅ Write clear task descriptions  
✅ Set realistic estimates  
✅ Complete work before marking done  
✅ Test before completion  

### Collaboration
✅ Help team members when possible  
✅ Share knowledge and best practices  
✅ Participate in team activities  
✅ Be responsive to requests  

---

## Updates & Changelog

### Version 1.0 - October 2025
- Initial release of user guides
- Coverage for Admin, Approver, and Employee roles
- Comprehensive workflows and best practices
- Troubleshooting sections
- Common scenarios and FAQs

---

## Feedback

We welcome your feedback on these user guides!

**How to provide feedback:**
1. Email: feedback@onedc.com
2. Submit issues: [GitHub Issues](https://github.com/your-org/oneDC/issues)
3. Contact your system administrator

**What to include:**
- Which guide (Admin/Approver/Employee)
- Section that needs improvement
- Suggested changes or additions
- Any unclear instructions

---

## Quick Links

- 📘 [Admin User Guide](./USER_GUIDE_ADMIN.md)
- 📗 [Approver User Guide](./USER_GUIDE_APPROVER.md)
- 📙 [Employee User Guide](./USER_GUIDE_EMPLOYEE.md)

---

**Last Updated:** October 2025  
**Version:** 1.0  
**Maintained by:** oneDC Documentation Team
