# KudiDash User Manual

## 1. Purpose of This Manual

This guide explains how to use the KudiDash dashboard as an end user or administrator.

It covers:

- How to sign in and access an organization
- What each dashboard module does
- What every visible action button does
- How data flows between modules (the "what affects what" part)
- Current limitations and scaffolded features

This is a user manual, not a technical/code guide.

## 2. What KudiDash Is

KudiDash is a multi-organization accounting dashboard with:

- Organization-based access (multi-tenant)
- Role-based permissions
- Double-entry journals
- Sales invoicing (AR)
- Purchase bills (AP)
- Inventory item master (with pricing and account mappings)
- Banking and reconciliation scaffolding
- Financial reports (Trial Balance, P&L, Balance Sheet)
- Organization settings and control account mappings
- User and role management

## 3. Getting Started

## 3.1 Sign In

You can sign in using:

- Email + password
- Magic link (send link to your email)

How it works:

1. Open the sign-in page.
2. Enter your email and password, then click `Sign in`.
3. Or enter your email and click `Send magic link`.
4. After successful sign-in, you are sent to organization selection (`/select-org`) unless a specific page redirect is present.

Notes:

- Magic link uses your email only.
- If public sign-up is disabled, users must be created by an administrator.

## 3.2 Sign Up (If Enabled)

If public sign-up is enabled:

1. Open `Sign up`.
2. Enter email, password, and confirm password.
3. Submit and confirm email (if email confirmation is enabled in your auth settings).
4. Sign in and proceed to organization selection.

If public sign-up is disabled:

- Users must be created by an admin in `Users & Roles`.

## 3.3 Organization Selection

After signing in, the `Select organization` screen lets you:

- Open an existing organization you belong to
- Create a new organization

Behavior:

- If you belong to exactly one organization, KudiDash automatically opens it.
- If you belong to multiple organizations, choose one from the list.

Each organization card shows:

- Organization name
- Your role in that organization
- Organization base currency

## 3.4 Create a New Organization

From the `Create organization` panel:

1. Enter organization name
2. Enter slug (URL-safe identifier)
3. Choose base currency (dropdown)
4. Click `Create organization`

What happens behind the scenes:

- The organization is created
- You are added as the `owner`
- Default organization account settings row is created
- You are redirected to the new organization dashboard

## 4. Dashboard Layout and Navigation

## 4.1 Sidebar Navigation (Desktop)

Main sections:

- Dashboard
- Chart of Accounts
- Journals
- Invoices
- Bills
- Inventory
- Banking
- Reports
- Settings
- Users & Roles

The sidebar also shows:

- Dashboard branding/logo (if configured)
- Current organization name
- Multi-tenant mode indicator

## 4.2 Top Bar

The top bar includes:

- Mobile menu button (small screens)
- Organization switcher
- Theme toggle (light/dark)
- User menu (email + sign out)

## 4.3 Organization Switcher

Use the org switcher to move between organizations you belong to without signing out.

What it does:

- Sends you to the selected organization’s dashboard
- Keeps your session active

## 4.4 Mobile Navigation

On mobile/smaller screens:

- A slide-out menu provides navigation to main modules
- It includes core modules (Dashboard, COA, Journals, Invoices, Bills, Inventory, Banking, Reports, Settings)

## 4.5 Access Control Behavior

KudiDash is organization-scoped.

This means:

- You only see data for organizations you belong to
- Opening an organization you do not have access to results in an access failure (often shown as page not found)

## 5. Role System and Permissions

KudiDash roles:

- `owner`
- `admin`
- `accountant`
- `approver`
- `viewer`

## 5.1 What Each Role Can Do (High Level)

`owner`

- Full access across all modules
- Can manage organization settings
- Can manage users and roles
- Can create, approve, post, and reverse journals

`admin`

- Similar to owner for most operations
- Can manage organization settings
- Can manage users and roles
- Can approve and post journals

`accountant`

- Can manage COA, sales, purchases, inventory, banking
- Can create journals
- Cannot approve/post/reverse journals
- Cannot manage org settings or users/roles

`approver`

- Can approve/post journals
- Can view reports
- Limited operational entry permissions

`viewer`

- Reports viewing only

## 5.2 How Permissions Affect the UI

The UI shows screens to members, but action availability depends on role.

Examples:

- `Users & Roles`: only owner/admin can create users, assign roles, disable users, or set passwords
- `Settings`: only owner/admin can save organization settings and control account mappings
- Journal approve/post/reverse actions depend on journal permissions

## 6. Dashboard (Home)

Path: `/<orgId>/dashboard`

## 6.1 What You See

The dashboard displays:

- KPI cards
- Revenue chart
- Expenses chart
- Recent invoices
- Bills to approve
- Journals pending approval

## 6.2 KPI Cards

The dashboard shows:

- Cash
- Revenue MTD
- Expenses MTD
- AR
- AP

Important:

- These values are calculated from posted journal lines (not drafts)
- AR/AP depend on your control account mappings in `Settings`
- Cash depends on account subtype mappings (`cash`/`bank`) and org account settings

## 6.3 Charts

Charts visualize:

- Revenue by period
- Expenses by period

The data is pulled from posted accounting entries and grouped by month.

## 6.4 Quick Operational Panels

The dashboard includes shortcut lists:

- Recent invoices
- Bills to approve
- Journals pending approval

These lists link directly into their detail pages.

## 7. Chart of Accounts (COA)

Path: `/<orgId>/coa`

Use this module to manage ledger accounts used throughout the system.

## 7.1 Create a New Account

Click `New account` to open the account form.

Fields include:

- Code
- Name
- Type (asset, liability, equity, income, expense)
- Subtype
- Currency (dropdown)

Notes:

- Account code should be unique within the organization
- Only active accounts appear in account selection dropdowns across forms

## 7.2 Edit an Account

From the COA table, click `Edit`.

You can update:

- Name
- Type/subtype
- Currency
- Other account form fields

## 7.3 Deactivate an Account

From the COA table, click `Deactivate`.

Effect:

- The account becomes inactive
- It remains in history/reports
- It no longer appears in active account dropdowns used by new entries/forms

## 7.4 Why COA Matters to Other Modules

The COA powers:

- Journal line account selection
- Invoice line revenue account selection
- Bill line expense account selection
- Bank account GL mapping
- Organization control account mappings (AR/AP/Cash/Bank/Retained Earnings/default revenue/default expense)
- Financial reports

## 8. Journals (Double-Entry)

Paths:

- Register: `/<orgId>/journals`
- New: `/<orgId>/journals/new`
- Detail: `/<orgId>/journals/<journalId>`

## 8.1 Journal Workflow

Journals follow a workflow:

1. Draft
2. Approved
3. Posted

Posted journals are immutable.

If you need to undo a posted journal:

- Use `Reverse`
- KudiDash creates a reversing journal entry instead of editing the original

## 8.2 Journal Register

The journal register shows:

- Journal number (or short ID if not posted/numbered yet)
- Date
- Reference
- Memo
- Status

Status filter buttons:

- All
- Draft
- Approved
- Posted

## 8.3 Create a Journal Entry

Use the `New journal` button.

Header fields:

- Entry date
- Reference
- Memo

Line fields:

- Account
- Description
- Debit
- Credit

Features:

- Add line
- Remove line (minimum two lines required)
- Running totals for debit and credit
- Balance indicator (`Balanced` / `Out of balance`)

Validation:

- Each line must contain either debit or credit (not both, not neither)
- The journal must have at least 2 lines
- Total debits must equal total credits

## 8.4 Approve a Journal

From the journal register or journal detail action section:

- Click `Approve` on a draft journal

Effect:

- Status changes from `draft` to `approved`

## 8.5 Post a Journal

From the journal register or journal detail action section:

- Click `Post` on an approved journal

Effects:

- Status changes to `posted`
- Journal number is generated if missing
- Posting date/time is recorded
- Journal becomes immutable
- Dashboard and reports can now reflect it

Posting checks (important):

- Journal must be approved
- Journal must be balanced
- Posting date must be in an open posting period (if posting periods are configured)

## 8.6 Reverse a Journal

From the journal register or journal detail action section:

- Click `Reverse` on a posted journal

Effect:

- Creates and posts a reversal journal with opposite debit/credit values
- Links reversal to the original journal

Current UI behavior:

- Uses the current date as reversal date
- Uses a standard reason text (`User requested reversal`)

## 8.7 Journal Detail Page

The journal detail page shows:

- Header information
- Workflow actions (through embedded actions table)
- Journal lines table

## 9. Invoices (Accounts Receivable / AR)

Paths:

- Register: `/<orgId>/invoices`
- New: `/<orgId>/invoices/new`
- Detail: `/<orgId>/invoices/<invoiceId>`
- PDF: `/<orgId>/invoices/<invoiceId>/pdf`

## 9.1 Invoices Overview

Invoices represent sales to customers.

Posting an invoice creates accounting entries (AR + revenue) via a database posting function.

## 9.2 Customers Panel

On the invoices page:

- You can add customers directly using the customer form
- Existing customers appear as chips/tags below the form

Customer form fields:

- Customer name
- Email (optional)

## 9.3 Invoice Register

The invoice register shows:

- Invoice number (or short ID if number not assigned yet)
- Date
- Due date
- Status
- Total

Actions in the register:

- `PDF` (download/preview printable invoice PDF)
- `Post` (available when status is `draft` or `approved`)

## 9.4 Create a New Invoice

Invoice header fields:

- Customer
- Currency (dropdown; includes GHS, USD, and others)
- Invoice date
- Due date
- Notes

Invoice lines fields:

- Description (now a product/item dropdown if inventory items exist)
- Quantity
- Unit Price
- Revenue Account
- Tax

Line actions:

- Add line
- Remove line

Totals are calculated automatically:

- Subtotal
- Tax total
- Total

## 9.5 Inventory Item Sync in Invoice Lines

If inventory items exist, the line `Description` field becomes a product/item dropdown.

When you select an item:

- The line description is set to the selected item name
- If the inventory item has a revenue account mapped, the invoice line revenue account is auto-filled
- The line `Unit Price` is auto-filled from the inventory item `Sale Price`

If no inventory items exist:

- The description remains a free text field

## 9.6 Post an Invoice

Click `Post` from the register or detail action area.

Effects:

- Invoice status becomes `posted`
- Invoice number is generated if missing
- A journal entry is created and posted automatically
- AR and revenue are updated
- Dashboard and reports can reflect the posting

Dependencies:

- AR control account must be configured in `Settings`
- Invoice date must fall in an open posting period (if posting periods are configured)

## 9.7 Invoice Detail Page

Shows:

- Invoice header (status, dates, totals)
- Actions (via embedded invoice row actions)
- Invoice line breakdown table

## 9.8 PDF Export

The `PDF` action generates a printable invoice document.

The PDF uses:

- Invoice data
- Organization branding/base currency
- Invoice company profile details from `Settings` (company name, address, phone, email, Tax ID)
- Invoice logo (from URL or uploaded image, if configured)
- Invoice line details

## 10. Bills (Accounts Payable / AP)

Paths:

- Register: `/<orgId>/bills`
- New: `/<orgId>/bills/new`
- Detail: `/<orgId>/bills/<billId>`

## 10.1 Bills Overview

Bills represent vendor payables.

Posting a bill creates accounting entries (expense + AP) via a database posting function.

## 10.2 Vendors Panel

On the bills page:

- You can add vendors directly
- Existing vendors display as tags/chips

Vendor form fields:

- Vendor name
- Email (optional)

## 10.3 Bill Register

The bill register shows:

- Bill number (or short ID)
- Date
- Due date
- Status
- Total

Actions:

- `Post` (available when status is `draft` or `approved`)

## 10.4 Create a New Bill

Bill header fields:

- Vendor
- Currency (dropdown)
- Bill date
- Due date
- Notes

Bill lines fields:

- Description (product/item dropdown if inventory items exist)
- Quantity
- Unit Cost
- Expense Account
- Tax

Totals are auto-calculated:

- Subtotal
- Tax total
- Total

## 10.5 Inventory Item Sync in Bill Lines

If inventory items exist, the line `Description` field becomes a product/item dropdown.

When you select an item:

- The line description is set to the selected item name
- If the item has a COGS account mapped, the line expense account is auto-filled
- The line `Unit Cost` is auto-filled from the inventory item `Purchase Price`

If no inventory items exist:

- The description remains free text

## 10.6 Post a Bill

Click `Post` from the register or detail action area.

Effects:

- Bill status becomes `posted`
- Bill number is generated if missing
- A journal entry is created and posted automatically
- Expenses and AP are updated
- Dashboard and reports can reflect the posting

Dependencies:

- AP control account must be configured in `Settings`
- Bill date must fall in an open posting period (if posting periods are configured)

## 10.7 Bill Detail Page

Shows:

- Bill header (dates, status, totals)
- Actions
- Bill line table

## 11. Inventory

Path: `/<orgId>/inventory`

The Inventory module is currently an item master + account mapping module with pricing support.

It is used to improve consistency in invoicing and billing.

## 11.1 Add Inventory Item

Fields:

- SKU
- Item name
- Valuation method
- Sale price
- Purchase price
- Inventory account (optional)
- COGS account (optional)
- Revenue account (optional)

Valuation methods available:

- Weighted Average
- FIFO
- LIFO
- Specific Identification

## 11.2 Inventory Register

The inventory register displays:

- SKU
- Item name
- Valuation method
- Sale price
- Purchase price
- Inventory account mapping
- COGS account mapping
- Revenue account mapping
- Status
- Created date

## 11.3 Deactivate Inventory Item

Click `Deactivate` on an active item.

Effects:

- Item becomes inactive
- It remains visible in history/register
- Inactive items are excluded from invoice/bill item dropdowns

## 11.4 How Inventory Connects to Sales and Purchases

Inventory item master data directly improves transaction entry:

- Invoices use item `Sale Price` to fill line `Unit Price`
- Bills use item `Purchase Price` to fill line `Unit Cost`
- Invoices can auto-fill revenue account from inventory item mapping
- Bills can auto-fill expense account from item COGS account mapping

This reduces manual entry mistakes and keeps pricing/account mappings consistent.

## 11.5 Current Scope vs Future Scope

Current scope:

- Item master
- Pricing defaults
- Account mappings
- Deactivation

Scaffolded/future scope:

- Stock movement posting
- Inventory valuation journal automation
- Location/bin management

## 12. Banking and Reconciliation

Path: `/<orgId>/banking/reconciliation`

This module manages:

- Bank account setup
- CSV transaction import
- Reconciliation session creation
- Manual transaction matching (scaffold)

## 12.1 Bank Accounts

Use the `Bank accounts` panel to add bank accounts.

Fields:

- Name
- Masked account number
- Currency (dropdown)
- Linked GL account (usually an asset/bank ledger account)

Why this matters:

- Bank transactions are imported against a specific bank account
- Reconciliation sessions are tied to a bank account

## 12.2 Import Bank Transactions (CSV)

Use the CSV import panel to paste CSV content.

Expected CSV format:

- Required headers: `date`, `description`, `amount`
- Optional header: `reference`

Example column order:

- `date,description,amount,reference`

Important limitations:

- The parser is a simple CSV parser intended for basic comma-separated files
- Complex CSV formatting may need cleanup before paste/import

Effect of import:

- Creates bank transactions as `unmatched`
- Source is marked as CSV import

## 12.3 Start Reconciliation Session

Use the session form to create a reconciliation session with:

- Bank account
- Statement start date
- Statement end date
- Statement ending balance

Effect:

- A new reconciliation session is created with status `open`

## 12.4 Sessions Panel

Shows created reconciliation sessions with:

- Date range
- Status
- Ending balance

## 12.5 Imported Bank Transactions

The transaction table shows:

- Date
- Description
- Reference
- Amount
- Match status

## 12.6 Match Transactions (Current Scaffold Behavior)

The `Match` button is enabled when:

- There is an open reconciliation session
- The transaction is not already matched

Current behavior when you click `Match`:

- Creates a reconciliation match record
- Uses the absolute transaction amount as the match amount
- Marks the bank transaction as `matched`

Current limitation:

- There is no UI yet for selecting matching candidates (journal line/invoice/bill)
- Matching is scaffolded and intended for future enhancement

## 13. Reports

Path: `/<orgId>/reports`

Reports are generated from posted accounting data.

## 13.1 Report Types

Available reports:

- Trial Balance
- Profit & Loss
- Balance Sheet

## 13.2 Period Snapshot Chart

The top chart summarizes:

- Income
- Expenses
- Assets

This is a quick visual snapshot for the current reporting period view.

## 13.3 Tabs and CSV Export

Each report tab includes:

- A table view
- `Export CSV` button

CSV export behavior:

- Uses currently visible rows
- Disabled when there are no rows

## 13.4 Report Data Source Rules (Very Important)

Reports are built from posted journal lines only.

This means:

- Draft invoices/bills do not affect reports
- Approved but unposted journals do not affect reports
- Posting is what moves operational entries into financial reporting

## 13.5 Current Period Behavior

The Reports page currently uses the current month period automatically for P&L and snapshot logic.

There is no date range picker in the current UI.

## 14. Settings

Path: `/<orgId>/settings`

Use Settings for organization identity, accounting configuration, and control account mappings.

## 14.1 Organization and Branding Settings

Fields include:

- Organization name
- Dashboard display name
- Dashboard color scheme
- Dashboard logo URL
- Base currency (dropdown)
- Fiscal year start month
- Invoice company name (for PDF invoices; optional override)
- Invoice company address
- Invoice company phone
- Invoice company email
- Invoice company Tax ID
- Invoice logo (URL or direct PNG/JPG upload)

Effects:

- Branding updates affect sidebar/topbar display
- Base currency is used as the organization’s primary currency context
- Fiscal year start month supports future fiscal-period reporting alignment
- Invoice company details and logo appear on downloaded invoice PDFs when configured

## 14.2 Control Account Mappings

The settings page lets you map key accounting control accounts:

- Accounts Receivable (AR)
- Accounts Payable (AP)
- Cash
- Bank
- Retained Earnings
- Default Revenue
- Default Expense

Why these mappings matter:

- Invoice posting requires AR control account
- Bill posting requires AP control account
- Dashboard KPI calculations rely on cash/bank/AR/AP mappings
- Future automations can use default revenue/expense mappings

## 14.3 Permissions

Only users with organization management permission (typically `owner` and `admin`) can save these settings.

## 14.4 Scaffold Notices

The settings page also includes informational cards for:

- Inventory (extended configuration future work)
- Fixed Assets (scaffolded backend hooks)
- Payroll (scaffolded backend hooks)

These are not full end-user processing modules yet.

## 15. Users & Roles

Path: `/<orgId>/settings/users-roles`

Use this page to manage access to the organization.

## 15.1 What the Page Contains

- Create user account (managed user creation)
- Add existing user by UUID
- Current members table

## 15.2 Create User Account (Managed User)

This creates a new authentication user and adds them to the organization in one step.

Fields:

- Email
- Full name (optional)
- Temporary password
- Role

Effect:

- A new user account is created
- The user is added to the org as an active member
- Profile info is populated when possible

## 15.3 Add Existing User by UUID

Use this when the user already exists in the auth system.

Fields:

- User UUID
- Role

Effect:

- Adds (or updates) the user’s org membership

## 15.4 Current Members Table

Shows:

- User (name or UUID)
- Email
- Status (Active/Disabled)
- Role
- Actions

## 15.5 Member Actions

Available actions (for owner/admin):

- Change role
- Disable member
- Set password

Set password:

- Opens a dialog
- Requires minimum password length
- Updates the selected user’s auth password

Disable member:

- Marks the membership inactive
- User loses active access to that organization

## 15.6 Permissions on This Page

Only owners/admins can manage users and roles.

Other members may see the page content but action controls are disabled or blocked by permissions.

## 16. Global Behaviors and Connections (How Features Affect Each Other)

This section explains the key "cause and effect" relationships across the dashboard.

## 16.1 Draft vs Posted Data

Draft entries are operational drafts and do not affect financial statements.

Posted entries affect:

- Dashboard KPIs
- Dashboard charts
- Reports (Trial Balance / P&L / Balance Sheet)

## 16.2 Invoices and Bills Create Journals

When you post:

- An invoice: KudiDash creates and posts a journal entry (AR + revenue)
- A bill: KudiDash creates and posts a journal entry (expense + AP)

This is why reports and dashboard values change after posting, not after draft creation.

## 16.3 Control Account Mappings Drive Posting and KPIs

Invoice posting depends on:

- AR control account mapping in `Settings`

Bill posting depends on:

- AP control account mapping in `Settings`

Dashboard KPI calculations depend on:

- Cash/Bank/AR/AP account mappings

If these mappings are missing, posting/KPIs may fail or be incomplete.

## 16.4 Inventory Item Master Drives Invoice/Bill Line Defaults

Inventory affects sales/purchases data entry by supplying:

- Item description
- Sale price (for invoices)
- Purchase price (for bills)
- Revenue account (invoice line auto-fill)
- COGS/expense account (bill line auto-fill)

This keeps pricing and account mappings consistent across departments.

## 16.5 Chart of Accounts Feeds the Entire System

COA changes affect:

- Journal line selections
- Invoice line revenue accounts
- Bill line expense accounts
- Bank account GL linking
- Settings control account mapping dropdowns
- Reports

Inactive accounts remain historical but are excluded from active selectors.

## 16.6 Banking Matching Is Currently Scaffolded

Bank matching currently:

- Marks imported transactions as matched
- Creates reconciliation match records

It does not yet perform advanced automatic matching logic or candidate selection UI.

## 16.7 Multi-Organization Isolation

Everything in KudiDash is organization-scoped.

This means:

- Each organization has separate data
- Membership and role are checked per organization
- Org switcher changes your working context without mixing data

## 17. Common Workflows (Step-by-Step)

## 17.1 New Organization Setup (Recommended Sequence)

1. Create organization
2. Open `Settings`
3. Configure branding and base currency
4. Create Chart of Accounts entries (or confirm your required accounts exist)
5. Map control accounts in `Settings`
6. Add users/roles (optional)
7. Add inventory items (optional but recommended)
8. Start creating invoices, bills, and journals

## 17.2 Sales Workflow (Invoice to Reporting)

1. Create customer (if needed)
2. Create draft invoice
3. Add invoice lines
4. Post invoice
5. Review invoice details/PDF
6. View impact on Dashboard and Reports

## 17.3 Purchase Workflow (Bill to Reporting)

1. Create vendor (if needed)
2. Create draft bill
3. Add bill lines
4. Post bill
5. View impact on Dashboard and Reports

## 17.4 Manual Journal Workflow

1. Create draft journal
2. Ensure it is balanced
3. Approve
4. Post
5. Reverse later if required (instead of editing)

## 17.5 Bank Reconciliation Starter Workflow

1. Create bank account and link GL account
2. Import CSV transactions
3. Start reconciliation session
4. Use `Match` on transactions (scaffolded manual match marking)
5. Review session list and transaction statuses

## 18. Statuses You Will See

## 18.1 Journal Statuses

- `draft`
- `approved`
- `posted`
- `voided` (status exists in model; void workflow is not surfaced in current UI)

## 18.2 Invoice and Bill Statuses

You may see:

- `draft`
- `approved`
- `posted`
- `paid`
- `voided`

Current UI focus:

- Draft creation
- Posting
- Detail viewing

`paid` and `voided` status transitions are not fully exposed through current dashboard actions.

## 18.3 Bank Match Status

- `unmatched`
- `matched`

## 19. Demo Mode vs Live Mode

KudiDash can run in demo mode.

In demo mode:

- Example data is shown
- Many actions simulate success but do not persist to a live database

In live mode:

- Actions write to Supabase/PostgreSQL
- Role and row-level security rules are enforced

## 20. Troubleshooting (User-Facing)

## 20.1 I Can Open the App but See No Organizations

Cause:

- You are signed in but not yet a member of any organization

Fix:

- Create an organization
- Or ask an admin to add you in `Users & Roles`

## 20.2 I Cannot Post an Invoice or Bill

Common causes:

- Missing AR/AP control account mapping in `Settings`
- No permission for sales/purchases actions
- Posting date falls in a closed posting period

## 20.3 Journal Will Not Post

Common causes:

- Journal is not approved yet
- Journal is not balanced
- Journal lines are invalid (both debit and credit entered on one line, or neither)
- Posting period closed

## 20.4 Reports Look Wrong or Empty

Check:

- Have invoices/bills/journals been posted?
- Are you expecting draft documents to appear? (Drafts do not affect reports)
- Are control account mappings configured for dashboard KPIs?

## 20.5 Bank Match Button Is Disabled

This usually means:

- No open reconciliation session exists
- The transaction is already matched

## 20.6 Users & Roles Actions Are Disabled

Cause:

- Your role does not have user/role management permission

Required role:

- Owner or Admin (in current permission setup)

## 21. Current Limitations and What Is Scaffolded

The dashboard is functional for core accounting flows, but some areas are intentionally scaffolded:

- Advanced bank matching candidate selection/scoring
- Full inventory stock movement valuation automation
- Fixed asset lifecycle processing UI
- Payroll processing UI and jurisdiction-specific tax workflows
- Receipts/payments allocation workflows in the UI (database tables exist, but user-facing flow is not fully surfaced)
- Full invoice/bill payment lifecycle transitions (`paid`) in the current UI

## 22. Best Practices for Daily Use

- Configure control accounts before posting invoices/bills
- Keep your Chart of Accounts clean and deactivate unused accounts instead of deleting history
- Use inventory item pricing/mappings to reduce invoice and bill entry errors
- Post transactions promptly if you want reports and KPIs to stay current
- Use journal reversal instead of editing posted entries
- Review `Users & Roles` regularly and disable access for departed team members

## 23. Quick Reference (What Affects What)

`Chart of Accounts`

- Feeds journals, invoices, bills, banking, settings, reports

`Settings (Control Accounts)`

- Required for invoice/bill posting and dashboard KPI accuracy

`Inventory`

- Auto-fills invoice/bill descriptions, accounts, and prices

`Invoices/Bills (Posted)`

- Create journal entries and affect dashboard/reports

`Journals (Posted)`

- Directly affect dashboard KPIs and financial reports

`Banking Matching`

- Updates reconciliation tracking status (scaffolded matching logic)

`Users & Roles`

- Controls who can perform actions in each module
