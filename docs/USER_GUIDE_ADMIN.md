# oneDC User Guide - Admin Role

## Table of Contents
1. [Overview](#overview)
2. [Dashboard](#dashboard)
3. [User Management](#user-management)
4. [Client Management](#client-management)
5. [Project Management](#project-management)
6. [Task Management](#task-management)
7. [Allocations](#allocations)
8. [Timesheets](#timesheets)
9. [Reports](#reports)
10. [Approvals](#approvals)

---

## Overview

As an **Admin**, you have full access to all modules and features in the oneDC system. You can manage users, clients, projects, tasks, allocations, timesheets, and view comprehensive reports.

### Key Responsibilities:
- Manage all users (create, edit, delete)
- Manage clients and projects
- Oversee all project tasks
- Manage resource allocations
- Review and approve timesheets
- Generate reports and analytics
- Configure system settings

---

## Dashboard

**Access:** Click on "Dashboard" in the navigation menu

### Features:
- **Overview Cards**: Quick summary of:
  - Total Users
  - Active Projects
  - Pending Approvals
  - This Week's Hours
  
- **Recent Activities**: View latest system activities

- **Quick Actions**:
  - Navigate to any module
  - View pending approvals
  - Access reports

---

## User Management

**Access:** Navigate to **Users** module

### View Users
1. All users are displayed in a table with:
   - Name
   - Email
   - Role (Admin/Approver/Employee)
   - Department
   - Job Title
   - Status (Active/Inactive)

### Create New User
1. Click **"New User"** button
2. Fill in required fields:
   - **First Name** (required)
   - **Last Name** (required)
   - **Email** (required, must be unique)
   - **Role**: Select Admin, Approver, or Employee
   - **Job Title**
   - **Department**
   - **Phone**
   - **Password** (required for new users)
3. Optional: Upload profile photo
4. Click **"Save"**

**Note:** The system will send a welcome email to the new user with their credentials.

### Edit User
1. Click the **Edit (pencil)** icon next to the user
2. Modify the required fields
3. Click **"Save"**

**Important:** Email addresses must be unique. The system will prevent duplicate emails.

### Delete User
1. Click the **Delete (trash)** icon next to the user
2. Confirm the deletion in the popup

**Warning:** Deleting a user is permanent and cannot be undone.

### Reset User Password
1. Go to **Password Reset** module (if available)
2. Enter the user's email
3. System will send a password reset link

---

## Client Management

**Access:** Navigate to **Clients** module

### View Clients
- All clients displayed in a table with:
  - Client Name
  - Contact Person
  - Email
  - Contact Number
  - Address
  - Status (Active/Inactive)

### Create New Client
1. Click **"New Client"** button
2. Fill in required fields:
   - **Name** (required)
   - **Contact Person**
   - **Email**
   - **Contact Number** (10-15 digits, spaces/hyphens allowed)
   - **Address**
   - **Status**: Active or Inactive
3. Click **"Save"**

### Edit Client
1. Click the **Edit** icon next to the client
2. Update the required fields
3. Click **"Save"**

### Delete Client
1. Click the **Delete** icon
2. Confirm deletion

**Note:** You cannot delete a client that has active projects.

---

## Project Management

**Access:** Navigate to **Projects** module

### View Projects
- View all projects across all clients
- Filter by:
  - Client
  - Status (Active/On Hold/Closed)
  - Date range

### Create New Project
1. Click **"New Project"** button
2. Fill in the required information:
   - **Client**: Select from dropdown (required)
   - **Project Code**: Unique identifier (required)
   - **Project Name** (required)
   - **Description**
   - **Status**: Active, On Hold, or Closed
   - **Billable**: Yes/No
   - **Default Approver**: Select an approver for timesheets/tasks
   - **Start Date**
   - **End Date**
   - **Planned Release Date**
   - **Budget Hours**
   - **Budget Cost**
3. Click **"Next"** or **"Save"**

### Add Team Members to Project
1. After creating/editing a project, go to the **Team Members** section
2. Click **"Add Member"**
3. Select user from dropdown
4. Assign role: Member, Lead, Contributor, or Reviewer
5. Click **"Add"**

### Edit Project
1. Click the **Edit** icon next to the project
2. Modify fields as needed
3. Update team members if necessary
4. Click **"Save"**

### Delete Project
1. Click the **Delete** icon
2. Confirm deletion

**Warning:** Deleting a project will also delete all associated tasks and allocations.

---

## Task Management

**Access:** Navigate to **Tasks** module

### View Tasks
1. **Select a Project** from the dropdown (required)
2. View all tasks in the selected project
3. Filter tasks by:
   - **Status**: New, In Progress, Blocked, Completed, Cancelled
   - **Assignee**: Filter by team member
   - **Search**: Search by title, description, or label

### Create New Task
1. Select a project first
2. Click **"New Task"** button
3. Fill in task details:
   - **Title** (required)
   - **Description**
   - **Label** (e.g., Bug, Feature, Enhancement)
   - **Assigned User**: Select team member
   - **Estimated Hours**: Must be 0 or greater
   - **Start Date**
   - **End Date**
   - **Status**: New (default)
4. Click **"Save"**

### Edit Task
1. Click the **Edit (pencil)** icon next to the task
2. Update fields as needed
3. Click **"Save"**

### Duplicate Task
1. Click the **Duplicate (copy)** icon
2. A new task will be created with the same details
3. Modify as needed and save

### Mark Task as Completed
1. Click the **Complete (checkmark)** icon next to the task
2. Status will change to "Completed"

### Delete Task
1. Click the **Delete (trash)** icon
2. Confirm deletion

### View Task Details
- Click on the task title to view full details in read-only mode

---

## Allocations

**Access:** Navigate to **Allocations** module

### View Allocations
1. Select a week using the date picker
2. View allocation matrix showing:
   - Team members (rows)
   - Projects (columns)
   - Allocated hours per day (cells)
   - Total hours per week

### Create/Edit Allocations
1. Select the week to manage
2. Click **"Edit"** or **"Add Allocation"**
3. For each team member:
   - Select project
   - Set hours for each day (Monday-Friday)
   - Total must not exceed 40 hours per week per employee
4. Click **"Save"**

### Export Allocations
1. Select the desired week
2. Click **"Export to CSV"**
3. CSV file will download with allocation data

**Note:** System enforces 40-hour weekly limit per employee.

---

## Timesheets

**Access:** Navigate to **Timesheets** module

### View Timesheets
- **Your Timesheets**: View your own time entries
- **All Timesheets**: View timesheets from all team members (Admin only)
- **By User**: Filter timesheets by specific user
- **By Project**: Filter timesheets by project
- **By Date Range**: Filter by week/month

### Review & Approve Timesheets
1. Navigate to **Approvals** module
2. View pending timesheet approvals
3. Review each entry:
   - Project
   - Task (if applicable)
   - Date
   - Hours
   - Description
   - Ticket Reference
4. **Approve** or **Reject** with comments
5. Submit decision

### Create Your Own Timesheet Entry
1. Click **"Add Entry"**
2. Fill in:
   - **Project**: Select from your projects
   - **Work Date**
   - **Hours**: Decimal format (e.g., 7.5)
   - **Description**: What you worked on
   - **Ticket Reference**: Jira/ticket number (optional)
   - **Task**: Link to specific task (optional)
3. Click **"Save as Draft"**
4. When ready, click **"Submit"** to send for approval

---

## Reports

**Access:** Navigate to **Reports** module

### Available Reports:

#### 1. User Activity Report
- View hours logged per user
- Filter by date range
- Export to CSV

#### 2. Project Hours Report
- Total hours per project
- Budget vs actual hours
- Filter by date range
- Export to CSV

#### 3. Timesheet Summary
- Hours by status (Draft, Submitted, Approved, Rejected)
- Filter by user, project, date range
- Export to CSV

#### 4. Allocation Report
- View planned vs actual allocations
- Resource utilization
- Export to CSV

### Generate a Report
1. Select report type
2. Set filters:
   - Date range
   - Projects (optional)
   - Users (optional)
3. Click **"Generate"**
4. View results in table format
5. Click **"Export to CSV"** to download

---

## Approvals

**Access:** Navigate to **Approvals** module

### View Pending Approvals
- See all pending timesheet approvals across all projects
- Filter by:
  - Project
  - User
  - Date range
  - Status

### Approve/Reject Timesheets
1. Click on a timesheet entry to view details
2. Review:
   - User name
   - Project and task
   - Date and hours
   - Description
3. Add comments (optional but recommended for rejections)
4. Click **"Approve"** or **"Reject"**

### Bulk Actions
1. Select multiple timesheet entries using checkboxes
2. Click **"Approve Selected"** or **"Reject Selected"**
3. Add bulk comment if needed
4. Confirm action

---

## Best Practices

### User Management
- ✅ Always verify email addresses before creating users
- ✅ Assign appropriate roles based on responsibilities
- ✅ Keep user information up to date
- ✅ Regularly review and deactivate unused accounts

### Project Management
- ✅ Use clear, descriptive project names
- ✅ Always assign a Default Approver
- ✅ Set realistic budget hours and dates
- ✅ Keep project status updated (Active/On Hold/Closed)
- ✅ Add all relevant team members to projects

### Task Management
- ✅ Create tasks with clear titles and descriptions
- ✅ Assign tasks to appropriate team members
- ✅ Set realistic estimated hours
- ✅ Use labels consistently (Bug, Feature, etc.)
- ✅ Update task status regularly

### Allocations
- ✅ Plan allocations in advance
- ✅ Don't exceed 40 hours per employee per week
- ✅ Review and adjust allocations weekly
- ✅ Balance workload across team members

### Timesheets
- ✅ Review and approve timesheets promptly (within 2-3 days)
- ✅ Provide clear feedback when rejecting entries
- ✅ Verify hours against project budgets
- ✅ Check for any anomalies or discrepancies

### Reports
- ✅ Run regular reports to monitor project health
- ✅ Track budget vs actual hours weekly
- ✅ Identify resource bottlenecks early
- ✅ Use data to make informed decisions

---

## Troubleshooting

### Cannot Create User
- **Error: "Email already exists"**
  - Check if user already exists in the system
  - Use a different email address
  
### Cannot Delete Project
- **Error: "Project has active tasks"**
  - Complete or delete all tasks first
  - Or mark project as Closed instead of deleting

### Allocation Over Limit
- **Error: "Weekly hours exceed 40"**
  - Reduce hours in the allocation matrix
  - Distribute hours across multiple team members

### Timesheet Not Showing
- **Issue: Can't see timesheet entries**
  - Check date range filter
  - Verify project filter settings
  - Ensure user has submitted timesheets

---

## Support

For technical support or questions:
- Contact your system administrator
- Email: support@onedc.com (replace with actual support email)
- Check documentation: `/docs/` folder in the project

---

**Last Updated:** October 2025  
**Version:** 1.0
