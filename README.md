# FamilyID 360 🏛️

> **Unified Family Identification & Welfare Scheme Eligibility Management System**  
> Built for the Government of Gujarat Digital Governance Initiative.

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-336791?style=flat&logo=postgresql&logoColor=white)](https://supabase.com/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?style=flat&logo=express&logoColor=white)](https://expressjs.com/)
[![Deployment](https://img.shields.io/badge/Deployed-Render%20%7C%20Vercel-46E3B7?style=flat)](https://render.com/)

---

## 📑 Table of Contents

1. [System Overview](#-system-overview)
2. [Key Capabilities](#-key-capabilities)
3. [Architecture & Workflow](#-architecture--workflow)
4. [Technology Stack](#-technology-stack)
5. [Repository Structure](#-repository-structure)
6. [Local Development Setup](#-local-development-setup)
7. [Database Setup (Supabase PostgreSQL)](#-database-setup-supabase-postgresql)
8. [Demo Credentials & Scenarios](#-demo-credentials--scenarios)
9. [Deployment Guide](#-deployment-guide)
   - [Deploy Backend on Render](#1-deploy-backend-on-render)
   - [Deploy Frontend on Vercel](#2-deploy-frontend-on-vercel)
10. [API Reference](#-api-reference)
11. [Security & Data Integrity](#-security--data-integrity)
12. [Troubleshooting & FAQs](#-troubleshooting--faqs)

---

## 🏛️ System Overview

**FamilyID 360** eliminates administrative fragmentation in public welfare distribution by assigning every Gujarat household a singular, authoritative **Family ID** (e.g., `GJ-2026-001`). 

The platform features:
* **Citizen Portal**: Enables families to manage member profiles, check real-time welfare entitlements via a **deterministic rule-based eligibility engine**, apply for state schemes, and upload required verification documents.
* **Officer & Administrative Workspace**: Gives taluka, district, and state verification officers tools for server-side family registry search, application adjudication, document inspection, duplicate detection, and immutable audit tracking.
* **AI Scheme Assistant**: Provides contextual assistance in natural language using an LLM integration (Groq / OpenAI compatible) while keeping entitlement calculations 100% deterministic and rule-governed.

---

## 🚀 Key Capabilities

### 👨‍👩‍👧‍👦 Citizen Portal
* **Family Dashboard**: Real-time snapshot of the household's Family ID, head of family, address, total members, income level, and state verification status.
* **Member Management**: Add and maintain household members (relationship, age, gender, occupation, disability status).
* **Scheme Discovery & Entitlement Match**: Live evaluation of household demographics against Gujarat welfare schemes with clear outcome badges:
  * `ELIGIBLE` — Household satisfies all statutory rules.
  * `POTENTIALLY_ELIGIBLE` — Income and demographics match, pending document submission.
  * `NOT_ELIGIBLE` — Specific rules not met (with transparent explanation).
* **Application Lifecycle**: One-click application submission with live status tracking (`PENDING` ➔ `UNDER_REVIEW` ➔ `DOCUMENT_REQUIRED` ➔ `APPROVED` / `REJECTED`).
* **Document Locker**: Secure uploading and tracking of income certificates, caste certificates, land records, and disability cards.

### 🛡️ Officer & Governance Workspace
* **Real-Time Analytics**: District-level statistics on enrolled households, pending reviews, approved benefits, and duplicate flags.
* **Registry Search**: Indexed server-side searching with filters for District, Verification Status, and Income ranges.
* **Application Adjudication**: Review submitted claims, inspect supporting documents, and issue approvals, rejections, or document requests with mandatory audit remarks.
* **Duplicate Detection Engine**: Cross-matches member names (with Gujarati honorific normalization such as *bhai*, *ben*), dates of birth, and contact numbers to flag potential duplicate identities with confidence scoring.
* **Accountability & Audit Logs**: Immutable recording of every state change, document inspection, and officer decision with timestamp and actor tracking.

---

## 🏗️ Architecture & Workflow

```mermaid
graph TD
    User([Citizen / Officer]) <--> Frontend[React 19 + Vite SPA\nHosted on Vercel]
    Frontend <-->|JWT / JSON REST API| Backend[Node.js + Express\nHosted on Render]
    Backend <-->|Sequelize ORM + SSL| Database[(Supabase PostgreSQL\nSession Pooler :5432)]
    Backend <-->|Advisory Queries| LLM[Groq / OpenAI Compatible\nAI Scheme Assistant]
```

### Authentication & Role Flow
```
Register / Login (Mobile + Password)
          ↓
Backend Verification (bcrypt hash check)
          ↓
JWT Signed (with userId & role: citizen | officer | admin)
          ↓
Role-Based Protected Route Navigation:
  ├── Citizen: /dashboard, /family, /members, /schemes, /applications, /documents
  ├── Officer: /officer/dashboard, /officer/families, /officer/applications, /officer/documents, /schemes
  └── Admin:   /admin/dashboard, System Governance
```

---

## 🛠️ Technology Stack

| Layer | Component | Technology / Library |
| :--- | :--- | :--- |
| **Frontend** | Framework | React 19, Vite, React Router v7 |
| | HTTP Client | Axios with custom interceptors & auto URL normalization |
| | Styling | Tailwind CSS & Custom Government Portal Design Tokens |
| **Backend** | Runtime & API | Node.js (v18+), Express 4 |
| | ORM | Sequelize 6 (PostgreSQL dialect) |
| | Authentication | JWT (`jsonwebtoken`), Password Hashing (`bcrypt`) |
| | File Uploads | Multer (with MIME & 10MB size validation) |
| | Validation | Express-Validator |
| **Database** | Primary Store | Hosted PostgreSQL (Supabase Connection Pooler with SSL) |
| **AI / NLP** | Assistant | Groq API / OpenAI compatible (`openai/gpt-oss-120b`) |
| **Deployment** | Infrastructure | **Backend**: Render Web Service \| **Frontend**: Vercel |

---

## 📁 Repository Structure

```
FamilyID360/
├── client/                     # Frontend Application (React + Vite)
│   ├── src/
│   │   ├── api/                # Modular Axios API services (schemes, family, officer, etc.)
│   │   ├── components/         # UI Components (Sidebar, Navbar, ErrorMessage, SchemeCard, Modal)
│   │   ├── context/            # Global state (AuthContext, FamilyContext)
│   │   ├── pages/              # Route views (Citizen & Officer dashboards, schemes, reviews)
│   │   ├── utils/              # Data formatters and validation helpers
│   │   ├── App.jsx             # Main router & role-based route definitions
│   │   └── main.jsx            # React root entry point
│   ├── vercel.json             # Vercel SPA rewrite configuration
│   └── package.json
│
├── server/                     # Backend Application (Node.js + Express)
│   ├── src/
│   │   ├── controllers/        # Business logic controllers (auth, family, scheme, officer, document)
│   │   ├── middleware/         # Auth verification, role guards, document uploaders
│   │   ├── models/             # Sequelize database models & entity associations
│   │   ├── routes/             # Express API route endpoints
│   │   ├── seeds/              # Seed scripts (seed.js, demo-seed.js)
│   │   ├── services/           # Rule-based eligibility engine & duplicate detection service
│   │   ├── app.js              # Express app setup, CORS, and health probes
│   │   └── server.js           # Server bootstrap & Sequelize database sync
│   └── package.json
│
├── render.yaml                 # Render infrastructure deployment blueprint
└── README.md                   # System documentation
```

---

## 💻 Local Development Setup

### Prerequisites
* **Node.js**: v18.x or v20.x
* **npm**: v9.x or higher
* **PostgreSQL** or access to a **Supabase PostgreSQL** project

### 1. Clone the Repository
```bash
git clone https://github.com/Rudraraiyani1902/FamilyID360.git
cd FamilyID360
```

### 2. Configure Backend (`server`)
```bash
cd server
npm install
```
Create a `.env` file in the `server/` directory:
```env
PORT=3000
NODE_ENV=development

# Database Connection (Supabase IPv4 Pooler recommended)
DATABASE_URL=postgresql://postgres.<PROJECT_REF>:<PASSWORD>@aws-0-ap-south-1.pooler.supabase.com:5432/postgres

# JWT Secret
JWT_SECRET=familyid360_super_secret_jwt_key_2024
JWT_EXPIRATION=7d

# CORS Allowed Origins (comma-separated or *)
CORS_ORIGIN=http://localhost:5173

# Optional AI Assistant configuration
AI_PROVIDER=openai_compatible
AI_API_URL=https://api.groq.com/openai/v1
AI_API_KEY=your_groq_api_key_here
AI_MODEL=openai/gpt-oss-120b
```

### 3. Configure Frontend (`client`)
```bash
cd ../client
npm install
```
Create a `.env` file in the `client/` directory:
```env
# Point to local server or leave as /api for Vite proxy
VITE_API_URL=/api
```

### 4. Seed Demo Data & Start Services
In `server/`:
```bash
# Populate database with 10 synthetic families, schemes, applications, and users
npm run demo:reset

# Start backend dev server
npm run dev
```
In a new terminal, in `client/`:
```bash
# Start frontend dev server
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## 🗄️ Database Setup (Supabase PostgreSQL)

Because modern Supabase direct connections (`db.<ref>.supabase.co`) use IPv6-only DNS resolution, always use the **Supabase Connection Pooler** (port `5432` Session Mode) to guarantee IPv4 compatibility across local development and hosting platforms like Render.

### Getting your Connection String
1. Go to your **Supabase Dashboard** ➔ **Project Settings** ➔ **Database**.
2. Under **Connection Pooling**, select **Session Mode** (Port `5432`).
3. Copy the URI and ensure your password is URL-encoded if it contains special characters (e.g. replace `@` with `%40`).

Example:
```
postgresql://postgres.yvxgmhgkdcczazqvalyc:YourPassword%40123@aws-0-ap-south-1.pooler.supabase.com:5432/postgres
```

### Automated Migration & Seeding
FamilyID 360 uses Sequelize automatic schema synchronization:
```bash
cd server
npm run demo:reset
```
This creates all tables (`users`, `families`, `family_members`, `schemes`, `scheme_rules`, `scheme_documents`, `applications`, `documents`, `audit_logs`, `duplicate_records`) and seeds diverse test scenarios.

---

## 🔑 Demo Credentials & Scenarios

All records are **100% synthetic** demo personas designed for live presentation:

| Role | Mobile Number | Password | Profile Description | Key Showcase Scenarios |
| :--- | :--- | :--- | :--- | :--- |
| **Citizen** | `9000000001` | `Demo@1234` | Ramesh Patel (BPL Farmer, Anand) | `ELIGIBLE` for Mukhyamantri Amrutam & BBBP; `DOCUMENT_REQUIRED` for Kisan Scheme |
| **Citizen** | `9000000002` | `Demo@1234` | Meena Sharma (Urban Middle, Ahmedabad) | Income > ₹7.5 Lakhs; evaluates to `NOT_ELIGIBLE` for poverty-line schemes |
| **Citizen** | `9000000003` | `Demo@1234` | Vijay Kumar (Senior Citizen, Rajkot) | Age ≥ 65; `ELIGIBLE` for Vridha Sahay Yojana (Old Age Pension) |
| **Officer** | `8000000001` | `Officer@1234` | Priya Joshi (Anand District) | Access to Family Search, Application Review, Duplicate Resolution |
| **Officer** | `8000000002` | `Officer@1234` | Arjun Mehta (Surat District) | District workspace & document verification |
| **Admin** | `7000000001` | `Admin@1234` | System Administrator | High-level analytics & system governance |

---

## 🚀 Deployment Guide

### 1. Deploy Backend on Render

1. Log in to your [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** ➔ **Web Service** and connect the `FamilyID360` repository.
3. Configure the service settings:
   - **Name**: `familyid360-api`
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/health`
4. Add the following **Environment Variables**:

| Variable Name | Value |
| :--- | :--- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | *Your Supabase pooler connection URL* |
| `JWT_SECRET` | *Your secret token signing key* |
| `CORS_ORIGIN` | `*` *(or your Vercel URL once generated)* |
| `AI_PROVIDER` | `openai_compatible` |
| `AI_API_URL` | `https://api.groq.com/openai/v1` |
| `AI_API_KEY` | *Your Groq API Key* |
| `AI_MODEL` | `openai/gpt-oss-120b` |

5. Click **Create Web Service**. Once deployed, verify `https://<service-name>.onrender.com/health`.

---

### 2. Deploy Frontend on Vercel

1. Log in to [Vercel Dashboard](https://vercel.com/dashboard) ➔ **Add New...** ➔ **Project**.
2. Import the `FamilyID360` repository.
3. In the project setup screen:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click **Edit** and choose **`client`** *(Essential)*
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add the **Environment Variable**:

| Key | Value | Environments |
| :--- | :--- | :--- |
| `VITE_API_URL` | `https://<your-render-backend-url>.onrender.com/api` | Production & Preview |

5. Click **Deploy**. Vercel will build and serve the application globally with client-side SPA routing backed by [client/vercel.json](file:///d:/FamilyID360/FamilyID360/client/vercel.json).

---

## 📡 API Reference

### 🔐 Authentication (`/api/auth`)
* `POST /api/auth/register` — Register a new citizen account.
* `POST /api/auth/login` — Sign in and receive JWT token.
* `GET /api/auth/me` — Retrieve current authenticated user profile.

### 🏠 Family Management (`/api/families`)
* `GET /api/families/me` — Retrieve authenticated citizen's family details and members.
* `POST /api/families` — Register household profile.
* `PUT /api/families/:id` — Update family demographic details.
* `GET /api/families/:id/members` — List household members.
* `POST /api/families/:id/members` — Add a new member.
* `PUT /api/families/:id/members/:mid` — Update member attributes.
* `DELETE /api/families/:id/members/:mid` — Remove a member record.

### 📜 Schemes & Entitlements (`/api/schemes` & `/api/eligibility`)
* `GET /api/schemes` — List all active welfare schemes (public / authenticated).
* `GET /api/schemes/:id` — Get specific scheme rules and required documents.
* `GET /api/families/:id/eligibility` — Run deterministic eligibility check for a family.
* `GET /api/eligibility/me` — Evaluate entitlement status for the authenticated household.

### 📝 Applications & Documents (`/api/applications` & `/api/documents`)
* `GET /api/applications` — List submitted scheme applications for current family.
* `POST /api/applications` — Submit a scheme benefit application.
* `GET /api/documents` — List uploaded verification documents.
* `POST /api/documents/upload` — Upload a supporting document (PDF, JPG, PNG).

### 👮 Officer Workspace (`/api/officer`)
*(Requires `officer` or `admin` role)*
* `GET /api/officer/dashboard/stats` — High-level statistics on beneficiaries and applications.
* `GET /api/officer/families` — Paginated and searchable family registry.
* `GET /api/officer/families/:id` — Detailed family profile with masked PII.
* `PATCH /api/officer/families/:id/verification` — Update verification status (`VERIFIED`, `REQUIRES_UPDATE`, `UNDER_REVIEW`).
* `GET /api/officer/applications` — Filterable claims list across all schemes and statuses.
* `PATCH /api/officer/applications/:id/status` — Approve, reject, or request documents for an application.
* `GET /api/officer/duplicates` — List potential duplicate household records.
* `POST /api/officer/duplicates/:id/decision` — Adjudicate duplicate candidate records.
* `GET /api/officer/audit-logs` — Immutable audit log trail of officer actions.

---

## 🔒 Security & Data Integrity

1. **Deterministic Rule Engine**: Entitlement evaluations rely strictly on database rules (`SchemeRule`), preventing AI hallucinations from making state welfare determinations.
2. **Strict RBAC & Route Protection**: API endpoints and React views enforce `citizen`, `officer`, and `admin` role boundaries.
3. **PII Masking**: Sensitive citizen details (such as Aadhaar references and mobile digits) are masked in officer registry views.
4. **Accountable Audit Trail**: All status modifications, application approvals/rejections, and duplicate determinations record old/new values in `AuditLog`.
5. **Safe File Handling**: Multer file uploads restrict execution types (PDF, JPEG, PNG only) and enforce a strict 10MB ceiling.

---

## ❓ Troubleshooting & FAQs

#### 1. Why does my Supabase database connection fail locally or on Render?
Ensure you are using the **Connection Pooler URL** (`aws-0-<region>.pooler.supabase.com:5432`) instead of the direct `db.<ref>.supabase.co` URL. Supabase direct connections use IPv6-only DNS, which causes `ENOTFOUND` errors on networks without IPv6.

#### 2. Why does the initial request to Render take 30-40 seconds?
On Render's Free tier, instances spin down after 15 minutes of inactivity. The Axios client is configured with a `60s` timeout so the client waits gracefully while the server boots up.

#### 3. Why did page refresh on Vercel give a 404 error?
Single Page Applications require routing rewrites so that deep links (e.g. `/schemes`, `/officer/applications`) are served by `/index.html`. This is handled by [client/vercel.json](file:///d:/FamilyID360/FamilyID360/client/vercel.json).

---

*FamilyID 360 — Built for Gujarat State Welfare Innovation. All data in this repository is synthetic and for demonstration purposes.*
