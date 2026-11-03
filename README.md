# CampusCare | Campus Complaint Management System

A web-based platform designed to simplify campus maintenance complaint reporting, tracking, and management.

CampusCare provides students with a centralised way to report campus-related issues and enables administrators to monitor complaints and manage their resolution through a dedicated dashboard.

## Overview

Campus maintenance issues such as damaged facilities, electrical problems, plumbing issues, and cleanliness concerns often require an organised reporting and tracking process.

CampusCare addresses this problem by providing a simple digital platform where students can submit complaints, attach supporting photographs, and track their progress using a unique complaint ID.

## Key Features

- **Complaint Submission:** Submit maintenance complaints with relevant details, category, and location.
- **Photo Upload:** Attach images to provide visual context for reported issues.
- **Complaint Tracking:** Track complaint progress using a unique complaint ID and registered email address.
- **Admin Authentication:** Dedicated administrator login for complaint management.
- **Status Management:** Update complaints as Pending, In Progress, or Resolved.
- **Dashboard Statistics:** View complaint summaries and status-based statistics.

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Backend | Node.js, Express.js |
| Database | MySQL |
| Database Connectivity | MySQL2 |
| File Upload | Multer |
| Session Management | Express Session |
| Security Headers | Helmet |

## Project Structure

```text
CampusComplaintManagement/
│
├── public/
│   ├── index.html
│   ├── style.css
│   └── app.js
│
├── uploads/
│   └── .gitkeep
│
├── database.sql
├── server.js
├── package.json
├── package-lock.json
├── .gitignore
└── README.md
```

## Getting Started

Follow these instructions to set up and run CampusCare locally.

### Prerequisites

Ensure the following are installed:

- [Node.js](https://nodejs.org/)
- [MySQL](https://dev.mysql.com/downloads/)
- [MySQL Workbench](https://dev.mysql.com/downloads/workbench/)

### Installation

**1. Clone the repository**

```bash
git clone YOUR_REPOSITORY_URL
```

**2. Navigate to the project directory**

```bash
cd CampusComplaintManagement
```

**3. Install dependencies**

```bash
npm install
```

**4. Configure the database**

- Open MySQL Workbench and connect to your MySQL server.
- Execute the SQL script provided in `database.sql`.
- This creates the `CampusCareDB` database and the required `complaints` table.

**5. Configure environment variables**

Create a `.env` file in the root project directory and provide your local configuration:

```dotenv
PORT=3000

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=CampusCareDB

ADMIN_PASSWORD=your_admin_password
SESSION_SECRET=your_long_random_secret
```

Replace the placeholder values with your own MySQL credentials and secure admin/session settings.

Keep the `.env` file private. It is excluded from the repository through `.gitignore`.

**6. Run the application**

```bash
npm start
```

**7. Access the application**

Open your browser and navigate to:

```text
http://localhost:3000
```

## Complaint Status Workflow

| Status | Description |
|---|---|
| Pending | Complaint has been successfully submitted. |
| In Progress | Complaint is currently being addressed. |
| Resolved | Reported issue has been resolved. |

## Application Modules

**Student Module**
- Submit new maintenance complaints.
- Upload supporting photographs.
- Track submitted complaints.

**Administrator Module**
- Authenticate through the admin login.
- View and monitor submitted complaints.
- Update complaint statuses.
- View dashboard statistics.

## Project Objective

The primary objective of CampusCare is to improve campus maintenance management through a centralised complaint-handling system, making the reporting process more accessible and complaint progress easier to monitor.

---

Developed as an academic project using HTML, CSS, JavaScript, Node.js, Express.js, and MySQL.

## Author

**Roshini Boominathan**

GitHub: [Roshini Boominathan](https://github.com/Roshini-Boominathan)
