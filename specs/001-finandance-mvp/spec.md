# Feature Specification: Finandance MVP

**Feature Branch**: `001-finandance-mvp`
**Created**: 2026-02-22
**Status**: Draft
**Input**: User description: "Finandance MVP - Premium web platform for personal finance focused on collaboration (Shared Projects) and cash flow control. Allows users to connect bank accounts (Wise), exchanges (Kraken), and wallets (Ledger) to consolidate wealth, audit daily spending, and allocate balances to joint financial goals."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Connect Financial Integrations (Priority: P1)

**Description**: User connects their financial accounts (Wise, Kraken, Ledger) by providing API keys or public addresses. The system encrypts credentials and synchronizes account data.

**Why this priority**: This is the core data gathering mechanism. Without integrations, users cannot see their consolidated wealth or track spending. All other features depend on having connected accounts.

**Independent Test**: Can be tested by connecting a mock integration and verifying that funding sources are discovered and balances are synchronized. Delivers the data foundation.

**Acceptance Scenarios**:

1. **Given** a user with valid Wise API credentials, **When** they add a Wise integration, **Then** the system encrypts the API key, discovers Jars/Pockets, and saves them as funding sources with their respective currencies
2. **Given** a user with valid Kraken API credentials, **When** they add a Kraken integration, **Then** the system encrypts the API key, discovers wallet balances, and saves them as funding sources
3. **Given** a user providing a public Ledger address, **When** they add a Ledger integration, **Then** the system queries the blockchain explorer and saves the wallet as a funding source (no API key needed)
4. **Given** an integration with invalid credentials, **Then** the system marks the integration as ERROR status and shows a clear error message
5. **Given** a sync operation in progress, **When** it completes, **Then** the frontend receives the updated status and refreshes funding sources without a full page reload

---

### User Story 2 - Create and Manage Shared Projects (Priority: P1)

**Description**: Users create financial goals (projects) and invite collaborators. Funding sources can be assigned to projects — optionally with a partial allocation — to track progress toward shared goals.

**Why this priority**: This is the core value proposition — enabling couples and partners to track combined wealth toward common goals. This differentiates Finandance from other finance apps.

**Independent Test**: Can be tested by creating a project, inviting a collaborator, assigning funding sources, and verifying the project balance reflects combined sources. Delivers the shared savings experience.

**Acceptance Scenarios**:

1. **Given** an authenticated user, **When** they create a project with name, target amount, target currency, and optional target date, **Then** the project is created and they are the OWNER
2. **Given** a project OWNER, **When** they invite a collaborator by email, **Then** the collaborator receives an invitation and can accept or decline
3. **Given** a project with multiple members, **When** funding sources are assigned (with optional allocated amounts), **Then** the project balance displays the combined total in the project's target currency using current exchange rates
4. **Given** a collaborator who declines an invitation, **Then** the OWNER is notified and the collaborator is not added to the project

---

### User Story 3 - View Budget and Transactions (Priority: P2)

**Description**: User views their budget overview with spending by category, and a paginated transaction list with all synchronized transactions from connected accounts.

**Why this priority**: Budget tracking is essential for personal finance management. Users need visibility into their spending patterns to make informed decisions.

**Independent Test**: Can be tested by viewing the budget page and transactions list after connecting integrations. Delivers spending visibility.

**Acceptance Scenarios**:

1. **Given** a user with connected accounts, **When** they navigate to the budget page, **Then** they see a donut chart comparing monthly spending limit to actual spending, broken down by category
2. **Given** a user with connected accounts, **When** they navigate to transactions, **Then** they see a paginated table of all income and expenses synchronized from all connected sources

---

### User Story 4 - Split Expenses with Collaborators (Priority: P2)

**Description**: User can split a specific transaction with their project collaborator, specifying a custom split amount or defaulting to 50/50. The split is reflected in the project's combined balance calculations.

**Why this priority**: Enables couples to fairly share expenses and see accurate combined spending. This enhances the collaborative value of the platform.

**Independent Test**: Can be tested by selecting a transaction and toggling split, then verifying the split is saved and reflected in project calculations.

**Acceptance Scenarios**:

1. **Given** a transaction from a connected account, **When** the user clicks on it and activates the split toggle, **Then** they can select a collaborator and optionally specify a split amount (default: 50/50)
2. **Given** a split transaction, **Then** the split is persisted and the user's share is reflected in project balance calculations

---

### User Story 5 - Secure Authentication with 2FA (Priority: P3 - DEFERRED)

**Description**: User registers with email and password, then optionally configures two-factor authentication for enhanced security. Mandatory 2FA enforcement is deferred until pre-launch to allow frictionless development and testing. The auth infrastructure (TOTP + recovery codes) must be designed and DB-ready from day one, but the enforcement gate is toggled off.

**Why this priority**: Security is critical but mandatory enforcement before launch creates friction during development iteration. The full 2FA flow (setup, TOTP verify, recovery codes) will be activated as a final pre-launch step.

**Independent Test**: Can be tested by completing the registration flow and optionally enabling 2FA. Delivers basic authentication for the development phase.

**Acceptance Scenarios**:

1. **Given** a new user with valid email, **When** they register with email and password, **Then** the system creates their account and grants dashboard access
2. **Given** a user who wants to enable 2FA, **When** they go to security settings, **Then** they can scan a QR code, receive 8 one-time recovery codes, and activate TOTP for their account
3. **Given** a user with 2FA enabled, **When** they log in, **Then** the system requires a valid TOTP code after credentials
4. **Given** a user who loses their 2FA device, **When** they use a valid recovery code, **Then** they gain access and the code is marked as consumed

**Pre-launch activation**: Before going live, enable mandatory 2FA enforcement in Supabase Auth settings — no code changes needed, only a configuration toggle.

---

### User Story 6 - Post-Creation Activation Flow + Auto-Save / DCA (Priority: P1)

**Description**: After creating a shared project, the user is guided through a post-creation interstitial page that helps them immediately link funding sources or set up a recurring savings plan (Auto-Save / DCA). The system stores savings plan configurations and displays in-app reminders on the project detail page.

**Why this priority**: This directly addresses the gap between project creation and project engagement. Without it, projects are "dead on arrival" with no funding sources and no plan. Captures the highest-intent moment.

**Full PRD & Tasks**: See [`specs/002-activation-autosave/`](../002-activation-autosave/spec.md)

**Acceptance Scenarios**:

1. **Given** a user who just completed the project creation wizard, **When** the project is created, **Then** they are redirected to `/shared-projects/[id]/get-started` (not the detail page)
2. **Given** the activation page, **When** the user chooses "Link Sources", **Then** they can link funding sources with checkboxes and see a running balance total
3. **Given** the activation page, **When** the user chooses "Auto-Save", **Then** they can configure amount, frequency, and source with a real-time projection chart showing estimated completion date
4. **Given** a saved Auto-Save plan, **When** the user views the project detail page, **Then** a "Savings Plan" section shows the plan summary with reminder status indicator
5. **Given** a user who clicks "Explore First", **Then** they navigate directly to the project detail page

---

### Edge Cases

- What happens when an integration's API rate limit is exceeded during sync?
- How does the system handle when a collaborator declines or leaves a project?
- What happens when a connected account is closed or access is revoked by the provider?
- How does the system handle currency conversion when summing balances from sources in different currencies?
- What happens when the target date for a project passes without reaching the goal?
- What happens when a user loses access to their 2FA authenticator app and has no remaining recovery codes?
- What happens to funding sources and transactions when an integration is deleted?
- What happens when exchange rate data is stale or the rate provider is unavailable?

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to register with email and password
- **FR-002**: System MUST provide an optional TOTP-based 2FA setup flow (mandatory enforcement deferred to pre-launch)
- **FR-003**: System MUST require a valid TOTP code on login when the user has 2FA enabled
- **FR-004**: System MUST generate 8 single-use recovery codes when a user enables 2FA, store them hashed, and display them once
- **FR-005**: System MUST allow users to authenticate using a valid recovery code when their authenticator device is unavailable
- **FR-006**: System MUST allow users to add integrations with Wise (API key), Kraken (API key), and Ledger (public address only)
- **FR-007**: System MUST encrypt all API keys using Fernet (MultiFernet for rotation support) before storing in the database
- **FR-008**: System MUST synchronize funding sources (wallets, jars, pockets) from connected integrations asynchronously
- **FR-009**: System MUST synchronize transaction history from connected integrations
- **FR-010**: System MUST allow users to create projects with name, target amount, target currency, and optional target date
- **FR-011**: System MUST allow project OWNERs to invite collaborators via email
- **FR-012**: System MUST allow users to assign funding sources to projects, with optional partial allocation amounts
- **FR-013**: System MUST calculate project balance as the sum of assigned allocations from all project members' sources, converted to the project's target currency
- **FR-014**: System MUST display budget overview with spending by category in a donut chart
- **FR-015**: System MUST display a paginated transaction list with all synchronized transactions
- **FR-016**: System MUST allow users to split expenses with project collaborators, supporting both equal (50/50) and custom amount splits
- **FR-017**: System MUST handle integration errors gracefully and display status to users
- **FR-018**: System MUST log security-sensitive operations (integration add/delete, 2FA events, recovery code use) to an audit log

### Key Entities

- **User**: Registered user of the platform (2FA optional during development, mandatory pre-launch)
- **Integration**: Connection to a financial provider (Wise, Kraken, Ledger) with encrypted credentials
- **Funding Source**: Individual account or wallet discovered from an integration (Jar, Pocket, Wallet) with its native currency
- **Project**: Shared financial goal with a target amount in a specific currency
- **Project Member**: Collaborator on a project with a role (Owner, Member, Pending Invite)
- **Transaction**: Individual financial movement from a funding source
- **Exchange Rate**: Cached conversion rate between currencies (TTL: 1 hour)

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete registration in under 3 minutes
- **SC-002**: When 2FA is enabled by a user, 100% of their login attempts require a valid TOTP code or recovery code
- **SC-003**: Integration sync completes and funding sources are visible within 30 seconds of connection
- **SC-004**: Budget and transaction data loads within 2 seconds of page navigation
- **SC-005**: Project balance accurately reflects the sum of all assigned funding sources, converted to the project's target currency using current exchange rates
- **SC-006**: Users can split expenses and see the split reflected in project calculations within the same session
- **SC-007**: 95% of users successfully connect at least one integration on first try
