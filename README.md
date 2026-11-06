# Event Sourced Ledger

A full-stack financial ledger management system built using Django REST Framework, PostgreSQL, React, and Vite, implementing double-entry bookkeeping, event sourcing, idempotent transfers, and audit logging.

## Overview

Event Sourced Ledger is a financial ledger management application designed to maintain accurate, consistent, and auditable financial records.

The system follows the principles of double-entry bookkeeping and event sourcing. Every posted financial transaction is represented through balanced debit and credit entries, while important domain events are persisted to maintain a chronological record of financial operations.

The application provides a web-based interface for managing accounts, performing transfers, viewing ledger transactions, inspecting event records, monitoring audit logs, and verifying system integrity.

## Key Features

- **Account Management:** Create accounts, view account details, and manage account statuses.
- **Double-Entry Bookkeeping:** Maintain balanced debit and credit entries for every posted financial transaction.
- **Fund Transfers:** Transfer funds between eligible accounts with transaction validation.
- **Idempotency:** Prevent duplicate transfers when the same request is submitted multiple times.
- **Event Sourcing:** Persist domain events to maintain a chronological history of important financial operations.
- **Event Replay:** Reconstruct and verify application projections using persisted events.
- **Historical Balance:** Calculate account balances as of a specified timestamp.
- **Audit Logging:** Maintain an audit trail of important operations.
- **System Integrity:** Verify consistency between financial records, event records, and derived account balances.
- **Authentication and Authorization:** Protect application routes and enforce access restrictions.
- **Transaction Safety:** Use database transactions and row-level locking to maintain consistency during concurrent financial operations.

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | JavaScript, React, Vite |
| Backend | Python, Django REST Framework |
| Database | PostgreSQL |


## System Architecture

The application follows a frontend-backend architecture.

```text
                 ┌─────────────────────────┐
                 │     React Dashboard     │
                 │                         │
                 │  Dashboard              │
                 │  Accounts               │
                 │  Transfers              │
                 │  Ledger Transactions    │
                 │  Event Logs             │
                 │  Audit Logs             │
                 │  System Integrity       │
                 └────────────┬────────────┘
                              │
                           REST API
                              │
                 ┌────────────▼────────────┐
                 │       DRF Backend       │
                 │                         │
                 │  Accounts Application   │
                 │  Ledger Application     │
                 │  Transfers Application  │
                 │  Events Application     │
                 │  Audit Application      │
                 │  Common Utilities       │
                 └────────────┬────────────┘
                              │
                 ┌────────────▼────────────┐
                 │      PostgreSQL         │
                 │                         │
                 │  Accounts               │
                 │  Ledger Transactions    │
                 │  Ledger Entries         │
                 │  Transfers              │
                 │  Domain Events          │
                 │  Audit Logs             │
                 └─────────────────────────┘
```

## Project Structure

```text
Event_Sourced_Ledger/
│
├── backend/
│   ├── apps/
│   │   ├── accounts/
│   │   │   ├── management/
│   │   │   │   └── commands/
│   │   │   │       └── seed_demo_data.py
│   │   │   ├── migrations/
│   │   │   ├── models.py
│   │   │   ├── selectors.py
│   │   │   ├── serializers.py
│   │   │   ├── services.py
│   │   │   ├── tests.py
│   │   │   ├── urls.py
│   │   │   └── views.py
│   │   │
│   │   ├── audit/
│   │   ├── common/
│   │   ├── events/
│   │   ├── ledger/
│   │   └── transfers/
│   │
│   ├── config/
│   ├── manage.py
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── config/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── styles/
│   │   ├── utils/
│   │   ├── App.jsx
│   │   └── main.jsx
│   │
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
│
└── .gitignore
```

### Backend Applications

| Application | Responsibility |
|---|---|
| `accounts` | Account creation, account details, account status management, and authentication-related functionality |
| `ledger` | Financial transactions, ledger entries, balance calculations, and historical balances |
| `transfers` | Account-to-account transfers, validation, and idempotency |
| `events` | Domain event storage, event recording, replay, and integrity verification |
| `audit` | Audit log creation, storage, and retrieval |
| `common` | Shared functionality such as pagination and common API utilities |



## Core Concepts

### 1. Double-Entry Bookkeeping

The system follows double-entry bookkeeping, where every posted financial transaction contains corresponding debit and credit entries.

The fundamental accounting rule is:

**Total Debits = Total Credits**

A transaction cannot be posted if its debit and credit totals do not match.

The system also calculates balances according to account types:

- Assets and Expenses: Debits increase the balance.
- Liabilities, Equity, and Income: Credits increase the balance.

### 2. Event Sourcing

Important domain events are stored as persistent records instead of relying exclusively on the current state of the system.

Examples include:

- Account creation
- Transaction posting
- Transfer completion

Events are associated with aggregates and assigned sequence numbers to maintain their order.

This provides a historical record of important operations and supports event replay and integrity verification.

### 3. Idempotency

Idempotency prevents duplicate financial operations when a client retries a request.

Each transfer request uses an idempotency key. If the same request is submitted again with the same key and details, the existing result is returned instead of creating another transfer.

Requests using the same key but different details are rejected.

### 4. Historical Balance Calculation

The application supports calculating an account's balance at a specified timestamp.

Only posted ledger entries belonging to transactions posted on or before the requested timestamp are considered.

### 5. Audit Logging

Important operations generate audit records containing information such as:

- Action performed
- Actor responsible for the action
- Affected resource
- Description
- Additional metadata
- Timestamp

Audit records provide traceability for financial and administrative operations.

### 6. System Integrity and Event Replay

The system includes functionality to replay stored events and verify derived financial projections against persisted ledger data.

This helps identify inconsistencies between event records, transfers, transactions, and account balances.

### 7. Transaction Atomicity and Concurrency

Financial operations use database transactions to ensure that related changes succeed or fail together.

Account locking and idempotency controls help prevent inconsistent results during concurrent transfer requests.

## API Overview

The backend exposes REST API endpoints through the following route prefixes:

| Module | API Prefix |
|---|---|
| Authentication | `/api/auth/` |
| Accounts | `/api/accounts/` |
| Transfers | `/api/transfers/` |
| Ledger | `/api/ledger/` |
| Events | `/api/events/` |
| Audit Logs | `/api/audit-logs/` |
| System Integrity | `/api/integrity/` |
| Dashboard | `/api/dashboard/` |


## Prerequisites

Install the following before setting up the project:

- Python (compatible with Django 6.1.2)
- Node.js and npm (compatible with Vite 8)
- PostgreSQL
- Git

## Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/tarun290705/Event_Sourced_Ledger
cd Event_Sourced_Ledger
```

### 2. Database Setup

1. Install and start PostgreSQL.
2. Create a database.
3. Create a PostgreSQL user with the required database permissions.
4. Configure the database credentials in the root `.env` file.

Example PostgreSQL configuration:

```sql
CREATE DATABASE event_ledger;

CREATE USER ledger_user WITH PASSWORD 'your_database_password';

GRANT ALL PRIVILEGES ON DATABASE event_ledger TO ledger_user;
```

Ensure that the database user has the required schema permissions as well.

### 3. Configure Environment Variables

Create a `.env` file in the project root, at the same level as the `backend` and `frontend` directories.

Example:

```env
DJANGO_SECRET_KEY=replace-with-a-secret-key
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1

DB_NAME=event_ledger
DB_USER=ledger_user
DB_PASSWORD=your_database_password
DB_HOST=localhost
DB_PORT=5432
```

Generate a Django secret key rather than using the example placeholder.

**Important:** Do not commit actual secret keys or database passwords to version control.

### 4. Backend Setup

Open a terminal and navigate to the backend directory:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv venv
```

Activate it on Windows PowerShell:

```powershell
.\venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Apply database migrations:

```bash
python manage.py migrate
```

Create an administrator account:

```bash
python manage.py createsuperuser
```

Start the Django development server:

```bash
python manage.py runserver
```

Backend development server:

```text
http://127.0.0.1:8000/
```

### 5. Frontend Setup

Open another terminal and navigate to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Create a frontend `.env` file if you want to override the default API URL:

```env
VITE_BASE_URL=/api
```

The frontend defaults to `/api` when `VITE_BASE_URL` is not defined.

Start the Vite development server:

```bash
npm run dev
```

Frontend development server:

```text
http://localhost:5173/
```

### Frontend-Backend Connection

The Vite development server is configured to proxy requests beginning with `/api` to the Django backend:

```text
Frontend: http://localhost:5173/
                  |
                  | /api/*
                  v
Backend:  http://127.0.0.1:8000/
```

This allows the frontend to communicate with the backend through the same development origin and supports the session-based authentication and CSRF workflow.

## Demo Data

The project includes a Django management command for generating demonstration accounts and transfers.

After applying migrations and creating a user, run the following command from the backend directory:

```bash
python manage.py seed_demo_data
```

To associate the demonstration customer accounts with a specific existing user:

```bash
python manage.py seed_demo_data --owner <username>
```

The command creates:

- One cash reserve asset account.
- Three customer liability accounts.
- Opening deposits for the customer accounts.
- Two sample transfers between customer accounts.

The sample opening balances and transfers are denominated in Indian Rupees (INR), with amounts stored in paise.

The command is safe to run multiple times. Existing demonstration accounts are reused, and existing transfers are not duplicated.

## Running the Project

Start the backend and frontend development servers in separate terminals.

**Terminal 1 – Backend**

```bash
cd backend
venv\Scripts\Activate.ps1
python manage.py runserver
```

**Terminal 2 – Frontend**

```bash
cd frontend
npm run dev
```

Make sure PostgreSQL is running before starting the backend.

Open the frontend in your browser:

```text
http://localhost:5173/
```

## Authentication

The backend uses Django REST Framework authentication with:

- Session Authentication
- Basic Authentication

The frontend API client uses cookie credentials and CSRF tokens for requests that modify server-side data.

Authentication is required by default for API endpoints unless an endpoint explicitly overrides the default permission configuration.

## Testing

Run backend tests from the backend directory:

```bash
python manage.py test
```

Run Django system checks:

```bash
python manage.py check
```

Check migration consistency:

```bash
python manage.py makemigrations --check
```
