# FamilyID 360

> A modern digital platform for Gujarat Government's Family Identification and Welfare Scheme Management System.

FamilyID 360 bridges the gap between eligible citizens and government welfare schemes by providing a unified family identity, rule-based eligibility matching, and a powerful officer dashboard for beneficiary management.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Demo Mode](#demo-mode)
- [Demo Credentials](#demo-credentials)
- [API Reference](#api-reference)
- [Security Notes](#security-notes)

---

## Overview

FamilyID 360 assigns every household a unique **Family ID** (e.g., `GJ-2026-001`) that acts as a single point of identity for accessing Gujarat Government welfare schemes. Citizens can check their eligibility, apply for schemes, and track applications. Officers can search, verify, and audit family records.

---

## Features

### Citizen Portal
- **Family Dashboard** — View Family ID, members, income, and verification status
- **Family Members** — Add, edit, and manage household members
- **Scheme Discovery** — Browse all government schemes with eligibility badges (ELIGIBLE / POTENTIALLY ELIGIBLE / NOT ELIGIBLE)
- **Eligibility Engine** — Rule-based, deterministic eligibility check (no AI hallucination)
- **Applications** — Apply for schemes, track status, upload missing documents
- **Documents** — Manage uploaded documents per family and member
- **AI Assistant** — Natural language assistant for scheme queries

### Officer Portal
- **Dashboard Analytics** — Real-time stats: total families, applications by status, duplicates, verification queue
- **Family Registry Search** — Server-side search by Family ID, name, district, verification status
- **Family Details** — Authorized view with masked PII (Aadhaar, mobile)
- **Verification Workflow** — Update family status (VERIFIED / REQUIRES_UPDATE / UNDER_REVIEW) with audit trail
- **Duplicate Detection** — Deterministic duplicate matching with confidence scores
- **Data Quality Flags** — Missing income, incomplete profiles, shared mobile numbers
- **Audit Logs** — Complete timeline of officer actions with previous/new state

### Admin Portal
- System-level overview dashboard

---

## Technology Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Frontend    | React 19, Vite, React Router v7     |
| Styling     | Vanilla CSS (custom design system)  |
| HTTP Client | Axios                               |
| Backend     | Node.js, Express 4                  |
| Database    | PostgreSQL with Sequelize ORM       |
| Auth        | JWT (JSON Web Tokens) + bcrypt      |
| Eligibility | Rule-based engine (deterministic)   |

---

## Project Structure

```
FamilyID360/
├── client/                   # React frontend (Vite)
│   ├── src/
│   │   ├── api/              # Axios API service modules
│   │   ├── components/       # Reusable UI components
│   │   ├── context/          # AuthContext, FamilyContext
│   │   ├── pages/            # Page components (citizen + officer)
│   │   └── App.jsx           # Routes and role-based access
│   └── .env.example
│
├── server/                   # Express backend
│   ├── src/
│   │   ├── controllers/      # Request handlers
│   │   ├── middleware/       # Auth (verifyToken, authorizeRoles)
│   │   ├── models/           # Sequelize models (index.js)
│   │   ├── routes/           # Express routers
│   │   ├── services/         # Business logic (eligibility, dataQuality)
│   │   ├── seeds/
│   │   │   ├── seed.js       # Original seed (single demo family)
│   │   │   └── demo-seed.js  # Hackathon demo seed (10 families)
│   │   └── app.js
│   └── .env.example
│
└── README.md
```

---

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm 9+

### 1. Clone and install

```bash
git clone <repo-url>
cd FamilyID360

# Install backend dependencies
cd server && npm install

# Install frontend dependencies
cd ../client && npm install
```

### 2. Configure environment

**Backend:**
```bash
cd server
cp .env.example .env
# Edit .env: set DATABASE_URL and JWT_SECRET
```

**Frontend:**
```bash
cd client
cp .env.example .env
# VITE_API_URL=http://localhost:5000/api (default)
```

### 3. Set up the database

```bash
cd server

# Seed demo data (10 diverse families, all roles)
npm run demo:seed
```

### 4. Start the servers

**Backend (Terminal 1):**
```bash
cd server
npm run dev
# Server starts on http://localhost:5000
```

**Frontend (Terminal 2):**
```bash
cd client
npm run dev
# Client starts on http://localhost:5173
```

Open http://localhost:5173 in your browser.

---

## Demo Mode

The demo seed creates a rich, realistic dataset with intentionally diverse families for demonstrating all features of the eligibility engine and officer workflow.

```bash
# Seed demo data (idempotent — safe to run multiple times)
cd server
npm run demo:seed

# FULL RESET and re-seed (clears all data first)
npm run demo:reset
```

> **Warning:** `demo:reset` deletes ALL data including users, families, and applications. Use only in development/demo environments.

---

## Demo Credentials

All passwords below are for the demo environment only. Use strong, unique passwords in production.

| Role    | Mobile      | Password      | Description                     |
|---------|-------------|---------------|---------------------------------|
| Citizen | 9000000001  | Demo@1234     | Ramesh Patel — BPL Farmer, Anand (ELIGIBLE for multiple schemes) |
| Citizen | 9000000002  | Demo@1234     | Meena Sharma — Urban middle income, Ahmedabad |
| Citizen | 9000000003  | Demo@1234     | Vijay Kumar — Senior citizen household, Rajkot |
| Officer | 8000000001  | Officer@1234  | Priya Joshi — Anand District Officer |
| Officer | 8000000002  | Officer@1234  | Arjun Mehta — Surat District Officer |
| Admin   | 7000000001  | Admin@1234    | System Administrator |

### Demo Eligibility Showcase

| Family ID    | Location        | Income    | Key Eligibility Result |
|--------------|-----------------|-----------|------------------------|
| GJ-2026-001  | Petlad, Anand   | Rs.2.5L   | MA Yojana ✅ BBBP ✅ Kisan ⚠️ |
| GJ-2026-003  | Ahmedabad City  | Rs.7.8L   | Most schemes ❌ (high income) |
| GJ-2026-004  | Gondal, Rajkot  | Rs.0.9L   | Vridha Sahay ✅ MA Yojana ✅ |
| GJ-2026-006  | Vadodara City   | Rs.12L    | All schemes ❌ |
| GJ-2026-007  | Visnagar, Mehsana | Rs.0.6L | MA Yojana ✅ BBBP ✅ |
| GJ-2026-010  | Navsari Rural   | Rs.2.1L   | 4 schemes eligible/potential |

---

## API Reference

### Auth
| Method | Endpoint              | Access  | Description           |
|--------|-----------------------|---------|-----------------------|
| POST   | /api/auth/register    | Public  | Register new citizen  |
| POST   | /api/auth/login       | Public  | Login, returns JWT    |
| GET    | /api/auth/me          | Auth    | Get current user      |

### Families
| Method | Endpoint              | Access    | Description               |
|--------|-----------------------|-----------|---------------------------|
| POST   | /api/families         | Citizen   | Create family             |
| GET    | /api/families/me      | Citizen   | Get own family            |
| PUT    | /api/families/:id     | Citizen   | Update family             |

### Family Members
| Method | Endpoint                          | Access  | Description     |
|--------|-----------------------------------|---------|-----------------|
| GET    | /api/families/:id/members         | Citizen | List members    |
| POST   | /api/families/:id/members         | Citizen | Add member      |
| PUT    | /api/families/:id/members/:mid    | Citizen | Update member   |
| DELETE | /api/families/:id/members/:mid    | Citizen | Remove member   |

### Schemes & Eligibility
| Method | Endpoint                          | Access  | Description            |
|--------|-----------------------------------|---------|------------------------|
| GET    | /api/schemes                      | Auth    | List all schemes       |
| GET    | /api/schemes/:id                  | Auth    | Scheme details         |
| GET    | /api/families/:id/eligibility     | Citizen | Run eligibility check  |

### Applications
| Method | Endpoint              | Access  | Description            |
|--------|-----------------------|---------|------------------------|
| POST   | /api/applications     | Citizen | Submit application     |
| GET    | /api/applications     | Citizen | List own applications  |

### Officer (requires OFFICER or ADMIN role)
| Method | Endpoint                                    | Description                     |
|--------|---------------------------------------------|---------------------------------|
| GET    | /api/officer/dashboard/stats                | Dashboard analytics             |
| GET    | /api/officer/families                       | Search families (paginated)     |
| GET    | /api/officer/families/:id                   | Family details (masked PII)     |
| PATCH  | /api/officer/families/:id/verification      | Update verification status      |
| GET    | /api/officer/duplicates                     | List potential duplicates       |
| POST   | /api/officer/duplicates/:id/decision        | Record duplicate decision       |
| GET    | /api/officer/data-quality                   | Data quality issues             |
| GET    | /api/officer/applications                   | All applications (paginated)    |
| GET    | /api/officer/audit-logs                     | Audit trail                     |

---

## Security Notes

- **JWT**: Tokens expire after 7 days. Refresh requires re-login.
- **IDOR Protection**: Citizens can only access their own family data. Officers cannot access other officers' accounts.
- **PII Masking**: Aadhaar references and mobile numbers are masked in officer views.
- **Role Enforcement**: All officer/admin endpoints use `verifyToken` + `authorizeRoles` middleware.
- **No Hardcoded Secrets**: All secrets use environment variables. Never commit `.env` files.
- **Input Validation**: All user inputs validated with `express-validator`.
- **Demo Data**: The demo seed uses only synthetic/fictional data. No real citizen information.

---

## Development Notes

- The eligibility engine is **purely rule-based** — no LLM or AI involved. Results are deterministic.
- Duplicate detection uses **normalized name matching** (strips Gujarati honorifics like *bhai*, *ben*) + DOB/mobile/location comparison.
- All officer actions create immutable `AuditLog` entries with previous and new state.

---

*FamilyID 360 — Built for Gujarat Hackathon Demo. All data is synthetic.*
