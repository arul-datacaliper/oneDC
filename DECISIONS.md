# Architecture decisions will go here
# OneDC — Product & Architecture Decisions (MVP)

## Purpose
Centralized platform for Employees, Projects, and Timesheets for our IT services org (~150 employees). Later: Payroll & Resource Allocation.

## Roles
- EMPLOYEE: manage own timesheets.
- APPROVER: approve/reject timesheets for projects they own.
- ADMIN: manage employees, clients/projects, allocations, settings, reports.

## Timesheet Lifecycle
DRAFT → SUBMITTED → APPROVED → LOCKED  
(REJECTED returns the entry to DRAFT with approver comment.)

## Policies (MVP)
- Week start: **MONDAY**
- Daily hours cap: **12** (hard cap 24)
- Editable past days: **14**
- Future entries: **Not allowed**
- Description: **Required**
- Ticket reference: Optional (regex per project later)
- Allocation guard: Off (MVP). Will validate against allocations in Phase-2.

## Core Entities (MVP)
- **User** (app_user)
- **Client** (client)
- **Project** (project) — includes `billable`, `budget_hours` (optional now)
- **ProjectAllocation** (project_allocation)
- **TimesheetEntry** (timesheet_entry)
- **Holiday** (holiday)
- **AuditLog** (audit_log)
- **AppSetting** (app_setting) — week start, caps, etc.

## Naming & IDs
- DB: snake_case tables/columns; PKs are UUIDv4.
- API/Code: C# PascalCase for DTOs/entities.
- Timestamps stored in **UTC**; UI displays in user’s local tz.

## Security & Auth (MVP → Prod)
- MVP: temporary debug header `X-Debug-UserId` for local dev.
- Prod: Azure AD (OIDC). Map AAD group/app role → EMPLOYEE/APPROVER/ADMIN.
- Row-level checks: user sees own entries; approver restricted to owned projects.

## Reporting (MVP)
- Utilization (billable vs total) using APPROVED/LOCKED entries.
- Missing Timesheets (dates with no entries).
- Overtime (sum(user, day) > policy cap).
- Burn-down (requires `project.budget_hours`, optional in MVP).
- Export CSV/XLSX for all reports.

## Non-Functional (MVP)
- Postgres 16, .NET 8 API, Angular 17, Azure App Service + Azure Postgres.
- Observability: App Insights.
- Secrets: Azure Key Vault.

## Out of Scope (MVP)
- Payroll integration
- Jira/Azure Boards sync
- Cost rates & margins
- Resource planning calendar

## Definition of Done — Step 1
- This file reviewed/committed.
- Everyone agrees to roles, lifecycle, policies, and entities.
