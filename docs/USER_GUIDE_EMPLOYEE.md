# oneDC User Guide - Employee Role

## Table of Contents
1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Dashboard](#dashboard)
4. [Your Tasks](#your-tasks)
5. [Timesheets](#timesheets)
6. [Profile Management](#profile-management)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Overview

As an **Employee**, you can view and manage your assigned tasks, submit timesheets, and track your work across projects.

### What You Can Do:
✅ View tasks assigned to you  
✅ Update status of your tasks (New → In Progress → Completed)  
✅ Create and submit timesheet entries  
✅ View your own timesheets and approval status  
✅ Update your profile information  
✅ View projects where you have assigned tasks  

### What You Cannot Do:
❌ Create or edit tasks (contact your Approver/Manager)  
❌ View other employees' timesheets  
❌ Approve timesheets  
❌ Manage users, clients, or projects  
❌ Delete tasks or projects  
❌ Access system-wide reports  

---

## Getting Started

### First Login

1. **Receive Welcome Email**
   - Your admin will create your account
   - You'll receive an email with:
     - Your username (email address)
     - Temporary password
     - Link to the system

2. **Login**
   - Go to the oneDC login page
   - Enter your email and password
   - Click "Sign In"

3. **Change Your Password** (Recommended)
   - Go to Profile settings
   - Click "Change Password"
   - Enter current password
   - Enter new password (min 8 characters)
   - Confirm new password
   - Click "Update"

4. **Complete Your Profile**
   - Add profile photo (optional)
   - Verify your contact information
   - Add any missing details

### Navigation

The main menu includes:
- **Dashboard** - Overview of your work
- **Tasks** - View and manage your assigned tasks
- **Timesheets** - Log and track your work hours
- **Profile** - Manage your account settings

---

## Dashboard

**Access:** Click on "Dashboard" in the navigation menu (usually the home page)

### What You'll See:

#### Quick Stats
- **Your Tasks**: Number of tasks assigned to you
- **Pending Timesheets**: Drafts not yet submitted
- **This Week's Hours**: Total hours logged this week
- **Completed Tasks**: Tasks you've completed recently

#### This Week's Summary
- Visual breakdown of your time by project
- Hours logged each day
- Completion progress

#### Your Recent Tasks
- List of recently assigned or updated tasks
- Quick status view
- Click to view details or update status

#### Pending Approvals
- See status of your submitted timesheets:
  - ⏳ Submitted (awaiting approval)
  - ✅ Approved
  - ❌ Rejected (needs resubmission)

---

## Your Tasks

**Access:** Navigate to **Tasks** module

### Viewing Your Tasks

1. **Select a Project** from the dropdown
   - You'll only see projects where you have assigned tasks
   - If the dropdown is empty, you don't have any tasks yet
   
2. **Default Filter: "My Tasks"**
   - By default, you see only tasks assigned to you
   - Look for the badge that says "My Tasks" next to the Assignee filter
   
3. **View All Tasks** (Optional)
   - Use the "Assignee" filter dropdown
   - Select "All" to see all tasks in the project
   - Or select a specific team member

4. **Additional Filters:**
   - **Status**: Filter by New, In Progress, Blocked, Completed, Cancelled
   - **Search**: Search by task title, description, or label

### Understanding Task Information

Each task shows:
- **Title**: What needs to be done
- **Description**: Detailed explanation (click title to view)
- **Label**: Type of work (Bug, Feature, Enhancement, etc.)
- **Assignee**: Who's responsible (usually you)
- **Estimated Hours**: How long it should take
- **Start Date**: When to begin
- **End Date**: Target completion date
- **Status**: Current state of the task

### Task Statuses

- 🆕 **New**: Just assigned, not started yet
- ⚙️ **In Progress**: Currently working on it
- 🚫 **Blocked**: Stuck, can't proceed
- ✅ **Completed**: Finished
- ❌ **Cancelled**: No longer needed

### Working with Your Tasks

#### Start Working on a Task

**For "New" tasks:**
1. Find the task in the list
2. Click the **"Start Working" (play icon)** button
3. Status will change to "In Progress"

**Or manually:**
1. Click task title to view details
2. Note the requirements and acceptance criteria
3. Begin work

#### Mark Task as Completed

When you finish a task:
1. Click the **"Complete" (checkmark icon)** button next to the task
2. Status will automatically change to "Completed"
3. Your manager will be notified

**Note:** Make sure you've:
- ✅ Completed all requirements
- ✅ Tested your work
- ✅ Logged your time in timesheets
- ✅ Updated any documentation

#### View Task Details

- Click on the **task title** to open full details
- View complete description, dates, estimated hours, etc.
- Close to return to task list

**Note:** You cannot edit task details. Contact your Approver/Manager if:
- Task description is unclear
- Estimated hours are unrealistic
- Dates need to change
- You need the task reassigned

---

## Timesheets

**Access:** Navigate to **Timesheets** module

Timesheets are how you record the time you spend working on projects and tasks.

### Viewing Your Timesheets

1. Open the **Timesheets** module
2. You'll see all your timesheet entries
3. **Filter by:**
   - **Date Range**: This week, last week, this month, custom
   - **Project**: Specific project
   - **Status**: Draft, Submitted, Approved, Rejected

### Understanding Timesheet Status

- 📝 **Draft**: Saved but not submitted - you can still edit
- ⏳ **Submitted**: Sent to approver, awaiting review - no longer editable
- ✅ **Approved**: Approved by manager - locked
- ❌ **Rejected**: Needs correction - you can edit and resubmit

### Creating a Timesheet Entry

**When to Log Time:**  
Log your time daily or at least weekly. Don't wait until the end of the month!

**How to Create an Entry:**

1. Click **"Add Entry"** or **"New Timesheet"** button

2. Fill in the required information:

   **Project** (required)
   - Select the project you worked on
   - Only projects with your assigned tasks will appear
   
   **Work Date** (required)
   - Date you performed the work
   - Cannot be a future date
   
   **Hours** (required)
   - Time spent in decimal format
   - Examples:
     - 8 hours = 8 or 8.0
     - 7.5 hours = 7.5 (7 hours 30 minutes)
     - 6.25 hours = 6.25 (6 hours 15 minutes)
   - Must be between 0 and 24 hours
   
   **Description** (highly recommended)
   - What you worked on
   - Be specific and clear
   - Good examples:
     - ✅ "Implemented user login API endpoint with JWT authentication"
     - ✅ "Fixed bug #234 - email validation not working on signup form"
     - ✅ "Code review for PR #45, provided feedback on database queries"
   - Bad examples:
     - ❌ "Worked on project"
     - ❌ "Coding"
     - ❌ "8 hours work"
   
   **Ticket Reference** (optional)
   - Jira ticket number, GitHub issue, etc.
   - Example: "PROJ-123", "GH-456"
   
   **Task** (optional)
   - Link to a specific task in oneDC
   - Select from dropdown of tasks in the selected project

3. Click **"Save as Draft"**

Your entry is saved but not yet submitted for approval. You can edit it anytime.

### Editing a Draft Entry

1. Find the entry with status "Draft"
2. Click the **Edit (pencil)** icon
3. Make your changes
4. Click **"Save"**

**Note:** You can only edit Draft or Rejected entries. Once submitted, you cannot edit.

### Submitting Timesheets for Approval

**When to Submit:**  
Submit your timesheets weekly, typically by Friday or Monday morning.

**How to Submit:**

1. Review all your draft entries for the week
2. Verify:
   - ✅ All days are logged
   - ✅ Hours are accurate
   - ✅ Descriptions are clear and specific
   - ✅ Correct projects are selected
3. Click **"Submit"** or **"Submit for Approval"** button
4. Confirm submission
5. Entries change to "Submitted" status
6. Your approver will be notified

**What Happens Next:**
- Approver reviews your timesheet (usually within 1-3 days)
- You'll receive notification when:
  - ✅ Approved (no action needed)
  - ❌ Rejected (needs correction - see below)

### Handling Rejected Timesheets

If your timesheet is rejected:

1. You'll receive a notification
2. Check the **rejection comment** from your approver
   - They'll explain what needs to be fixed
   
3. Common rejection reasons:
   - Vague description
   - Incorrect project or task
   - Unrealistic hours
   - Missing information
   - Duplicate entry

4. **To Fix and Resubmit:**
   - Find the rejected entry (Status: Rejected)
   - Click **Edit**
   - Make the requested corrections
   - Click **"Save"**
   - Click **"Submit"** again

5. Approver will review the resubmission

### Deleting a Timesheet Entry

You can only delete **Draft** or **Rejected** entries.

1. Find the draft/rejected entry
2. Click the **Delete (trash)** icon
3. Confirm deletion

**Warning:** Deletion is permanent. You cannot delete Approved or Submitted entries.

### Timesheet Best Practices

✅ **DO:**
- Log time daily (most accurate)
- Write clear, specific descriptions
- Include what you accomplished
- Reference tasks or tickets when applicable
- Keep hours reasonable (typically 7-8 hours/day)
- Submit weekly for approval
- Review rejection comments carefully
- Ask questions if unclear about rejection

❌ **DON'T:**
- Use vague descriptions like "worked on stuff"
- Wait weeks or months to log time
- Log unrealistic hours (e.g., 15 hours in one day)
- Submit duplicate entries
- Ignore rejection feedback
- Log time on wrong project
- Forget to submit by deadline

### Weekly Timesheet Workflow

**Monday-Friday:**
1. At end of each day, log your hours
2. Write clear description of what you did
3. Link to task if applicable
4. Save as draft

**Friday or Monday:**
1. Review all draft entries for the week
2. Verify accuracy
3. Submit all entries for approval
4. Wait for approval notification

**If Rejected:**
1. Review approver's comments
2. Make corrections
3. Resubmit same day

---

## Profile Management

**Access:** Click on your name/avatar → **Profile** or **Settings**

### View Your Profile

- Your basic information
- Role (Employee)
- Department
- Job Title
- Contact details

### Update Your Profile

1. Click **"Edit Profile"** or **"Update"**
2. You can update:
   - Profile photo
   - Phone number
   - Other contact details (check what's editable)
3. Click **"Save"**

**Note:** You cannot change:
- Your name (contact Admin)
- Email address (contact Admin)
- Role (contact Admin)
- Department (contact Admin)

### Change Password

1. Go to **Profile** → **Change Password**
2. Enter your **current password**
3. Enter your **new password**
   - Minimum 8 characters
   - Include uppercase, lowercase, numbers (check your system requirements)
4. **Confirm new password**
5. Click **"Update Password"**

**Tips:**
- Use a strong, unique password
- Don't share your password
- Change password every 3-6 months
- Don't reuse old passwords

### Upload Profile Photo

1. Click on your avatar/photo area
2. Click **"Upload Photo"** or **"Change Photo"**
3. Select image file (JPG, PNG)
   - Recommended: Square image, at least 200x200 pixels
4. Crop if needed
5. Click **"Save"**

---

## Best Practices

### Time Management

✅ **Effective Habits:**
- Check tasks every morning
- Prioritize tasks by due date
- Start tasks marked as "urgent" first
- Update task status as you work
- Log time daily
- Submit timesheets weekly
- Keep your manager informed of progress

### Communication

✅ **When to Communicate:**
- Task description is unclear → Ask your manager
- Can't meet deadline → Notify manager immediately
- Blocked on task → Update status to "Blocked" and notify manager
- Timesheet rejected → Review comments and fix immediately
- Found a bug or issue → Report to manager or create task (if allowed)

❌ **Avoid:**
- Working in silence when stuck
- Missing deadlines without notice
- Ignoring rejected timesheets
- Leaving tasks in wrong status

### Quality Work

✅ **Before Marking Task Complete:**
- All requirements met
- Code tested (if development work)
- Documentation updated
- Peer review completed (if applicable)
- Time logged in timesheets

### Professionalism

✅ **Maintain:**
- Accurate time logging
- Clear communication
- Meeting deadlines
- Quality work
- Positive attitude
- Proactive problem-solving

---

## Common Scenarios

### Scenario 1: No Projects in Task Dropdown
**Issue:** Can't see any projects when trying to view tasks.

**Reason:** You don't have any tasks assigned yet.

**Action:**
- Contact your manager or team lead
- Ask to be assigned to projects and tasks
- Check if you're in the right team

### Scenario 2: Can't Submit Timesheet
**Issue:** Submit button is disabled or not visible.

**Possible Reasons:**
- No draft entries to submit
- Entries already submitted
- Missing required fields

**Action:**
1. Check if entries are already "Submitted"
2. Verify all required fields are filled
3. Make sure hours are between 0-24
4. Contact support if issue persists

### Scenario 3: Forgot to Log Time for Last Week
**Issue:** It's Monday and you forgot to log last week's time.

**Action:**
1. Log the time now (even if late)
2. Use draft entries to reconstruct your week:
   - Check your calendar
   - Review completed tasks
   - Check emails or meeting notes
3. Submit with note explaining the delay
4. Your manager may accept or ask for clarification

**Prevention:** Set daily reminder to log time at end of day.

### Scenario 4: Worked on Multiple Tasks Same Day
**Issue:** How to log 8 hours across 3 different tasks?

**Solution:**
Create separate timesheet entries:
- Entry 1: Project A, Task 1, 3 hours, "Implemented feature X"
- Entry 2: Project A, Task 2, 2 hours, "Fixed bug in Y"
- Entry 3: Project B, Task 3, 3 hours, "Code review for Z"
- Total: 8 hours

### Scenario 5: Task Taking Much Longer Than Estimated
**Issue:** Task estimated 4 hours is taking 12+ hours.

**Action:**
1. Continue working but notify your manager
2. Explain why it's taking longer:
   - Scope was larger than expected
   - Technical complications
   - Waiting on dependencies
3. Ask if priorities should change
4. Log actual time worked (be honest)

### Scenario 6: Timesheet Rejected But Don't Understand Why
**Issue:** Rejection comment is unclear.

**Action:**
1. Review the comment carefully
2. Check the entry for obvious errors
3. If still unclear, reply to the rejection or email your approver:
   - "Hi [Manager], I received a rejection on my timesheet for [date]. Could you help me understand what needs to be corrected? The comment mentioned [X] but I'm not sure how to address it."
4. Wait for clarification
5. Make corrections
6. Resubmit

---

## Tips for Success

### Daily Routine
- ☑️ Check Dashboard for new tasks or updates
- ☑️ Review task priorities and deadlines
- ☑️ Work on assigned tasks
- ☑️ Update task status as you progress
- ☑️ Log your hours at end of day

### Weekly Routine
- ☑️ Review all tasks for the week
- ☑️ Complete high-priority tasks first
- ☑️ Submit all timesheet entries by Friday
- ☑️ Check for approved/rejected timesheets
- ☑️ Plan for next week's tasks

### Monthly Routine
- ☑️ Review completed tasks
- ☑️ Verify all timesheets are approved
- ☑️ Update profile information if needed
- ☑️ Reflect on accomplishments

---

## Keyboard Shortcuts (if available)

Check with your system if these are supported:
- `Ctrl/Cmd + S` - Save entry
- `Ctrl/Cmd + N` - New entry
- `Esc` - Close modal/cancel

---

## Troubleshooting

### Cannot Login
- **Wrong password?** → Click "Forgot Password" link
- **Account locked?** → Contact your admin
- **Wrong email?** → Check welcome email for correct address

### Task Not Updating
- **Try:** Refresh the page (F5 or Ctrl+R)
- **Check:** Internet connection
- **Action:** If persists, contact support

### Timesheet Entry Won't Save
- **Check:** All required fields filled
- **Check:** Hours are valid (0-24)
- **Check:** Date is not in future
- **Check:** Project is selected
- **Action:** Clear browser cache and try again

### Can't See Recent Tasks
- **Try:** Change project filter
- **Try:** Clear status filter (select "All")
- **Try:** Refresh page
- **Check:** You're in correct module (Tasks not Timesheets)

---

## Getting Help

### First Steps:
1. Check this user guide
2. Ask your team members
3. Contact your manager
4. Reach out to system admin

### Support Contact:
- **Email:** support@onedc.com (replace with actual support email)
- **Response Time:** Usually within 1 business day
- **Documentation:** Check `/docs/` folder for additional guides

### When Requesting Help, Include:
- Your name and email
- Screenshot of the issue (if applicable)
- What you were trying to do
- Error message (if any)
- Steps you've already tried

---

## Frequently Asked Questions (FAQ)

**Q: How do I request time off?**  
A: Contact your manager or HR department. The system may have a separate leave management module.

**Q: Can I log time on weekends?**  
A: Check your company policy. Generally, log actual work time only if you worked on weekends.

**Q: What if I made a mistake in an approved timesheet?**  
A: Contact your manager or admin. They can reverse the approval so you can correct it.

**Q: How many hours should I log per day?**  
A: Typically 7-8 hours for a full workday. Log your actual work time honestly.

**Q: Can I see my coworkers' timesheets?**  
A: No, as an Employee you can only see your own timesheets.

**Q: How often will I get new tasks?**  
A: Depends on your project and manager. Check Tasks module daily for updates.

**Q: Do I need to log time for meetings?**  
A: Yes, if meetings are project-related. Include them in your timesheet entry for that project.

**Q: What if I have no tasks assigned?**  
A: Contact your manager. You should always have work assigned.

---

## Summary

As an Employee in oneDC:
1. ✅ Check tasks daily
2. ✅ Update task status as you work
3. ✅ Log time every day
4. ✅ Submit timesheets weekly
5. ✅ Respond to rejection feedback promptly
6. ✅ Communicate blockers or issues
7. ✅ Keep your profile updated

**Remember:** Accurate time logging and task management help your team track project progress and budget. Your contributions matter!

---

**Last Updated:** October 2025  
**Version:** 1.0
