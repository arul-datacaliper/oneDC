# oneDC User Guide - Approver Role

## Table of Contents
1. [Overview](#overview)
2. [Dashboard](#dashboard)
3. [Project Access](#project-access)
4. [Task Management](#task-management)
5. [Timesheets](#timesheets)
6. [Approvals](#approvals)
7. [Reports](#reports)
8. [Best Practices](#best-practices)

---

## Overview

As an **Approver**, you have enhanced permissions to manage projects, tasks, and approve timesheets for projects where you are either:
- Assigned as the **Default Approver**, OR
- Added as a **Team Member** (any role)

### Key Responsibilities:
- Manage tasks for your projects
- Assign tasks to team members
- Review and approve/reject timesheets
- Monitor project progress
- Submit your own timesheets
- View project-specific reports

### Access Levels:
✅ **Full Access**: Projects where you're the Default Approver or Team Member  
✅ **View Access**: Your own timesheets and tasks  
❌ **No Access**: Other users' management, clients, system-wide reports

---

## Dashboard

**Access:** Click on "Dashboard" in the navigation menu

### What You'll See:
- **Your Projects**: Quick count of projects you can access
- **Pending Approvals**: Number of timesheets waiting for your review
- **This Week's Hours**: Your logged hours for the current week
- **Your Tasks**: Tasks assigned to you

### Quick Actions:
- Navigate to Tasks module
- View pending approvals
- Access your timesheets
- View project details

---

## Project Access

### Which Projects Can You See?

You have access to projects where you are:

1. **Default Approver**: You're designated as the main approver for the project
   - ✅ Manage all tasks
   - ✅ Approve timesheets
   - ✅ View all project details

2. **Team Member**: You're added to the project team (any role: Member, Lead, Contributor, Reviewer)
   - ✅ Manage all tasks
   - ✅ Approve timesheets  
   - ✅ View all project details

### Viewing Your Projects
1. Navigate to any module (Tasks, Timesheets, etc.)
2. Open the **Project** dropdown
3. You'll see only projects where you're the Default Approver or a Team Member

**Note:** If you don't see any projects, contact your Admin to:
- Add you as a Team Member to relevant projects, OR
- Assign you as the Default Approver

---

## Task Management

**Access:** Navigate to **Tasks** module

### View Tasks

1. **Select a Project** from the dropdown
   - Only your accessible projects will appear
   
2. **Filter Tasks:**
   - **Status**: New, In Progress, Blocked, Completed, Cancelled
   - **Assignee**: 
     - By default, you see tasks assigned to you
     - You can view "All" or filter by specific team members
   - **Search**: Search by title, description, or label

3. **View Information:**
   - Task title and description
   - Label (Bug, Feature, etc.)
   - Assigned team member
   - Estimated hours
   - Start and end dates
   - Current status

### Create New Task

1. Select a project from the dropdown
2. Click **"New Task"** button
3. Fill in task details:
   - **Title** (required) - Be clear and specific
   - **Description** - Detailed explanation of the work
   - **Label** - Bug, Feature, Enhancement, etc.
   - **Assigned User** - Select team member from your project
   - **Estimated Hours** - Must be 0 or greater (no negative values)
   - **Start Date** - When work should begin
   - **End Date** - Target completion date
   - **Status** - Usually "New" for new tasks
4. Click **"Save"**

**Tips:**
- Write clear, actionable task titles
- Include acceptance criteria in the description
- Set realistic estimated hours
- Assign tasks to appropriate team members

### Edit Task

1. Click the **Edit (pencil)** icon next to the task
2. Update any field as needed:
   - Change assignee
   - Update status
   - Adjust dates or hours
   - Modify description
3. Click **"Save"**

### Duplicate Task

1. Click the **Duplicate (copy)** icon
2. A new task will be created with the same information
3. Edit the new task as needed (change title, assignee, etc.)
4. Click **"Save"**

**Use Case:** Create similar tasks quickly without re-entering all details.

### Mark Task as Completed

1. Click the **Complete (checkmark)** icon next to the task
2. Task status will automatically change to "Completed"

**Note:** You can change status back by editing the task if needed.

### Delete Task

1. Click the **Delete (trash)** icon next to the task
2. Confirm deletion in the popup

**Warning:** Deletion is permanent. Consider changing status to "Cancelled" instead.

### View Task Details

- Click on the **task title** to open full details in view-only mode
- View all information without making changes
- Close to return to task list

---

## Timesheets

**Access:** Navigate to **Timesheets** module

### View Timesheets

#### Your Own Timesheets
- View all your submitted time entries
- Filter by date range
- See status: Draft, Submitted, Approved, Rejected

#### Team Timesheets
- View timesheets for projects where you're Approver/Team Member
- Filter by:
  - User (team member)
  - Project
  - Date range
  - Status

### Create Timesheet Entry

1. Click **"Add Entry"** or **"New Timesheet"**
2. Fill in required information:
   - **Project**: Select from your accessible projects (required)
   - **Work Date**: Date you performed the work (required)
   - **Hours**: Hours worked (decimal format, e.g., 7.5) (required)
   - **Description**: What you worked on (recommended)
   - **Ticket Reference**: Jira ticket, GitHub issue, etc. (optional)
   - **Task**: Link to specific task in oneDC (optional)
3. Click **"Save as Draft"**

### Submit Timesheet for Approval

1. Review your draft entries
2. Ensure all information is accurate
3. Click **"Submit"** button
4. Timesheet will be sent to the project approver
5. You'll be notified when it's approved or rejected

### Edit Draft Timesheet

1. Find the draft entry (Status: Draft)
2. Click **Edit** icon
3. Update fields as needed
4. Click **"Save"**

**Note:** You can only edit entries in "Draft" status. Once submitted, contact your approver for changes.

### Delete Timesheet Entry

1. Click **Delete** icon next to draft or rejected entry
2. Confirm deletion

**Note:** You can only delete Draft or Rejected entries. Approved entries cannot be deleted.

---

## Approvals

**Access:** Navigate to **Approvals** module

This is one of your primary responsibilities as an Approver.

### View Pending Approvals

1. Open the **Approvals** module
2. You'll see timesheet entries awaiting your approval for:
   - Projects where you're the Default Approver
   - Projects where you're a Team Member

3. **Filter By:**
   - **Project**: Specific project
   - **User**: Specific team member
   - **Date Range**: Specific time period
   - **Status**: Submitted, Approved, Rejected

### Review Timesheet Details

For each entry, review:
- **Employee Name**: Who submitted the timesheet
- **Project**: Which project the work was done on
- **Task**: Specific task (if linked)
- **Work Date**: When the work was performed
- **Hours**: Time logged (ensure it's reasonable)
- **Description**: What work was done (should be clear and specific)
- **Ticket Reference**: External reference number (if applicable)

### Approve Timesheet

1. Review the entry thoroughly
2. Verify:
   - ✅ Hours are reasonable for the work described
   - ✅ Work date is correct
   - ✅ Description is clear and specific
   - ✅ Project and task are appropriate
   - ✅ No duplicate entries exist
3. (Optional) Add a comment: "Looks good!" or "Approved"
4. Click **"Approve"** button
5. Confirmation message will appear

### Reject Timesheet

1. Review the entry
2. Identify issues:
   - ❌ Incorrect project or task
   - ❌ Unrealistic hours
   - ❌ Vague or missing description
   - ❌ Wrong work date
   - ❌ Duplicate entry
3. **Add a comment** (required for rejections):
   - Be specific about why you're rejecting
   - Provide clear guidance for correction
   - Example: "Please provide more detail about what was accomplished. '8 hours work' is too vague."
4. Click **"Reject"** button
5. Employee will be notified and can resubmit

### Bulk Approve/Reject

1. Select multiple entries using **checkboxes**
2. Click **"Approve Selected"** or **"Reject Selected"**
3. Add a comment (optional for approval, recommended for rejection)
4. Confirm action

**Best for:** Approving multiple valid entries from the same employee at once.

### Approval Notifications

You'll receive notifications for:
- New timesheet submissions
- Resubmitted timesheets after rejection
- Approaching approval deadlines

**Check approvals regularly** - ideally daily or at least 2-3 times per week.

---

## Reports

**Access:** Navigate to **Reports** module

### Available Reports for Approvers:

#### 1. Your Projects Report
- View hours logged across your projects
- Filter by date range
- See budget vs actual hours
- Export to CSV

#### 2. Team Hours Report
- Hours logged by each team member on your projects
- Filter by date range and project
- Identify over/under utilization
- Export to CSV

#### 3. Your Timesheet Summary
- Your own submitted, approved, and rejected timesheets
- Filter by project and date range
- Export to CSV

#### 4. Project Progress Report
- Task completion status
- Hours logged vs estimated
- Project health indicators

### Generate a Report

1. Select report type
2. Set filters:
   - **Date Range**: Last week, last month, custom
   - **Project**: Select your project (or all)
   - **User**: Specific team member (optional)
3. Click **"Generate"**
4. Review results in table format
5. Click **"Export to CSV"** to download

### Using Reports Effectively

- **Weekly Review**: Check team hours every Monday
- **Monthly Summary**: Generate project reports at month-end
- **Budget Tracking**: Monitor hours vs budget regularly
- **Resource Planning**: Identify team member availability

---

## Best Practices

### Task Management

✅ **DO:**
- Create clear, descriptive task titles
- Write detailed descriptions with acceptance criteria
- Set realistic estimated hours
- Assign tasks promptly
- Update task status regularly
- Review team progress weekly

❌ **DON'T:**
- Create vague tasks like "Fix bugs"
- Overload team members with too many tasks
- Forget to update estimated hours when scope changes
- Leave tasks in "New" status for too long

### Timesheet Approvals

✅ **DO:**
- Review timesheets within 24-48 hours
- Check for reasonable hours and clear descriptions
- Provide specific feedback when rejecting
- Verify work aligns with project tasks
- Look for duplicate entries
- Approve in batches when appropriate

❌ **DON'T:**
- Approve without reviewing
- Reject without clear explanation
- Let approvals pile up for weeks
- Approve obviously incorrect entries
- Be too lenient or too strict - be consistent

### Your Own Timesheets

✅ **DO:**
- Log time daily (don't wait until end of week)
- Write clear descriptions of work performed
- Link to tasks when applicable
- Include ticket references
- Submit weekly for approval
- Keep total hours reasonable (7-8 hours/day)

❌ **DON'T:**
- Use vague descriptions like "worked on project"
- Forget to submit timesheets
- Log unrealistic hours (e.g., 15 hours in one day)
- Duplicate entries
- Wait months to log time

### Communication

✅ **DO:**
- Communicate task priorities to your team
- Provide feedback on completed work
- Notify team of project changes
- Be available for questions
- Escalate blockers quickly

❌ **DON'T:**
- Assign tasks without context
- Leave team members blocked
- Ignore questions or concerns
- Make major changes without notice

---

## Common Scenarios

### Scenario 1: Can't See Projects in Task Module
**Issue:** Dropdown is empty when trying to create a task.

**Solution:**
1. Check if you're assigned as Default Approver or Team Member on any projects
2. Contact your Admin to be added to relevant projects
3. Verify you're looking at the correct module

### Scenario 2: Team Member's Timesheet Seems Incorrect
**Issue:** Hours look too high or description is vague.

**Action:**
1. Click "Reject"
2. Add specific comment: "Please clarify what tasks were completed during these 12 hours. Also, can you break this into daily entries?"
3. Team member will receive notification
4. Review resubmission

### Scenario 3: Need to Change an Approved Timesheet
**Issue:** You approved an entry by mistake.

**Action:**
1. Contact your Admin - they can reverse approvals
2. Explain the situation and provide correct information
3. Admin will handle the correction

### Scenario 4: Task Taking Longer Than Estimated
**Issue:** Task estimated at 8 hours is taking 20 hours.

**Action:**
1. Edit the task
2. Update estimated hours to reflect reality
3. Add comment in description explaining why
4. Discuss with team member to understand scope change
5. Report to Admin if affecting project budget significantly

### Scenario 5: Team Member Not Submitting Timesheets
**Issue:** It's been 2 weeks without timesheet submission.

**Action:**
1. Send reminder via email or chat
2. Explain importance of timely submission
3. Offer to help if they're confused
4. Escalate to Admin if pattern continues

---

## Tips for Success

### Daily Routine
- ☑️ Check for new task assignments or updates
- ☑️ Review and respond to any team questions
- ☑️ Log your own time entries
- ☑️ Check for pending approvals (aim to stay under 5 pending)

### Weekly Routine
- ☑️ Review all team tasks for your projects
- ☑️ Update task statuses as needed
- ☑️ Approve all pending timesheets
- ☑️ Submit your weekly timesheets
- ☑️ Generate project hours report
- ☑️ Plan tasks for upcoming week

### Monthly Routine
- ☑️ Review project progress vs budget
- ☑️ Generate team utilization reports
- ☑️ Provide feedback to team members
- ☑️ Identify and address any issues
- ☑️ Plan resource needs for next month

---

## Troubleshooting

### Cannot Approve Timesheet
- **Check:** Are you the approver for that project?
- **Check:** Is it already approved by someone else?
- **Action:** Contact Admin if you should have access

### Task Creation Disabled
- **Check:** Have you selected a project?
- **Check:** Is the project Active?
- **Action:** Contact Admin to activate project or add you as team member

### Cannot See Team Member in Assignee List
- **Check:** Is the team member added to the project?
- **Action:** Contact Admin to add them to project team

---

## Support

For questions or technical issues:
- Contact your system administrator
- Email: support@onedc.com (replace with actual support email)
- Check full documentation in `/docs/` folder

---

**Last Updated:** October 2025  
**Version:** 1.0
