# ClientFlow CRM
<img width="1465" height="917" alt="image" src="https://github.com/user-attachments/assets/f213095f-2c07-4890-8457-902438f46e70" />


ClientFlow CRM is a full-stack web application built using **React, Node.js, Express, and MongoDB**. It helps businesses manage customers, leads, deals, tasks, and team members.

**Status:** Work in progress. Some features are implemented but have not been fully tested.
To run This project :- Login as Admin
ADMIN_EMAIL=harsh@gmail.com
ADMIN_PASSWORD=Harsh@2026Secure!


## 1. Features
<img width="1912" height="912" alt="image" src="https://github.com/user-attachments/assets/e338f484-e394-4581-b9bf-b23e66293a18" />


* **Dashboard:** View CRM statistics and reports.

<img width="1907" height="921" alt="image" src="https://github.com/user-attachments/assets/c824de0f-cd63-4676-b1c0-f456d92e2519" />

* **Leads:** Add, edit, delete, search, filter, and assign leads.
<img width="1908" height="917" alt="image" src="https://github.com/user-attachments/assets/9d73130e-3b1d-4337-8325-d55861f9f6ba" />

* **Contacts and Companies:** Manage customer information.
<img width="1911" height="901" alt="image" src="https://github.com/user-attachments/assets/8940d4e5-0267-4412-bfbd-5ae9236b1a3a" />

* **Deals:** Track sales opportunities and their stages.
* **Tasks:** Create and manage tasks and reminders.
* **Team Management:** Admins can invite users, change roles, and manage accounts.
* **Authentication:** Login, logout, password reset, and profile management.
* **Notifications:** Receive notifications, including live updates.
* **Reports:** View reports and export data to CSV.
* **Pipeline:** Track deals using drag-and-drop.
* **Lead Scoring:** Automatically assign Hot, Warm, or Cold ratings using rules.
* **Settings:** Manage account security, organization settings, and themes.
* **Audit Logs:** Track important activities.

## 2. Technologies Used

**Frontend**

* React
* Vite
* CSS

**Backend**

* Node.js
* Express.js
* MongoDB
* Socket.IO
* JWT authentication

## 3. Requirements

Install these before starting:

* Node.js and npm
* MongoDB locally or a MongoDB Atlas account

## 4. Installation

Open PowerShell in the project folder.

### Step 1: Install dependencies

```powershell
npm run install:all
```

### Step 2: Configure environment variables

Copy the example files:

```powershell
Copy-Item server\.env.example server\.env
Copy-Item client\.env.example client\.env
```

Configure `server/.env` with your MongoDB connection string and a strong JWT secret.

Configure `client/.env` according to the example file.

**Do not overwrite existing `.env` files if they already contain your configuration.**

### Step 3: Create the administrator account

```powershell
$env:ADMIN_NAME="Admin"
$env:ADMIN_EMAIL="admin@example.com"
$env:ADMIN_PASSWORD="YourStrongPassword123!"
npm run seed:admin
```

Use your own email and a strong password.

### Step 4: Start the backend

Open a terminal and run:

```powershell
npm run dev:server
```

Backend health check:

`http://localhost:5000/api/health`

### Step 5: Start the frontend

Open another terminal and run:

```powershell
npm run dev:client
```

Open:

`http://localhost:5173`

## 5. Team Management

Only administrators can create team member accounts.

To add a team member:

1. Log in as an administrator.
2. Open the Team page.
3. Click **Add User**.
4. Create an account using an invitation link or a temporary password.
5. Assign the appropriate role.

Administrators can also edit user details, change roles, deactivate accounts, and delete eligible users.

Users who still own CRM records must have those records reassigned before their accounts can be deleted.

## 6. Testing

Run the existing tests from the project root:

```powershell
npm test
```

Some integration tests require a separate test database. To run them using a local MongoDB instance:

```powershell
$env:TEST_MONGODB_URI="mongodb://127.0.0.1:27017/clientflow_test"
npm test
```

The test database must end in `_test`. Never use your production database for testing.

Build the frontend:

```powershell
cd client
npm install
npm run build
```

**Testing status:** The source code has undergone basic syntax and import checks, but the application has not yet been fully run or tested. Frontend automated tests are not available.

## 7. Deployment

**Backend:** Deploy the `server` folder to Render and configure the required environment variables.

**Frontend:** Deploy the `client` folder to Vercel and configure `VITE_API_URL` to point to your backend API.

Both services should use HTTPS in production for secure cross-site cookies.

## 8. Known Limitations

* Self-registration is not available; administrators create accounts.
* Email features require SMTP configuration.
* Task reminders require the backend to remain running.
* Lead scoring is rule-based, not machine learning.
* Some advanced interactions, including touch-based pipeline dragging, need testing.
* Automated frontend and comprehensive integration tests are not yet available.
* Lead conversion transactions require MongoDB Atlas or a replica set for full transactional support.

## 9. Future Improvements

* Add automated frontend tests.
* Improve mobile responsiveness and touch interactions.
* Add a visual editor for lead-scoring rules.
* Improve background task scheduling.
* Expand automated API and integration testing.

---

**ClientFlow CRM** — A work-in-progress CRM platform for managing customers, sales, and teams.
