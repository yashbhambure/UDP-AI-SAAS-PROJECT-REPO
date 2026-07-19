# UDP AI SAAS Project Repository

| Name | Batch | Student ID | Program |
|------|------|------|------|
| Yash Bhambure | AI_SAAS | (Yash)-AISaaS-0703 | UDP_AI_SAAS |

---
# Tick-It AI 🤖

> AI-powered execution engine that converts unstructured content (PDFs, DOCX, plain text, LinkedIn posts, emails, OCR'd images) into structured tasks, deadlines, checklists, and reminders — with semantic search over everything ever uploaded, and automated in-app, email, and SMS notifications before deadlines.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + Express |
| LLM (extraction, insights, RAG generation) | Groq — Llama 3.3 70B (`llama-3.3-70b-versatile`) |
| RAG Orchestration | LangChain (`langchain`, `@langchain/core`, `@langchain/community`, `@langchain/groq`) |
| Embeddings | Local — `Xenova/all-MiniLM-L6-v2` via `@xenova/transformers`, wrapped through LangChain's `Embeddings` interface (384 dimensions, no external API calls) |
| Vector DB | ChromaDB (local), wrapped via LangChain's `Chroma` vectorstore |
| Primary DB | MongoDB + Mongoose |
| Background Jobs | `node-cron` |
| Email Notifications | Resend |
| SMS Notifications | Twilio |
| Frontend | React + Vite + Tailwind CSS + Framer Motion |
| OCR | Tesseract.js |
| Auth | JWT (email + password) |

## Project Structure

```
Tick-It AI/
├── backend/        # Express API + all backend logic
│   ├── src/
│   │   ├── config/       # DB connection, env validation
│   │   ├── models/       # Mongoose schemas
│   │   ├── routes/       # Express routers
│   │   ├── services/     # LLM, embedding, vector, extraction, tasks, reminders
│   │   ├── workers/      # Cron jobs (reminder worker)
│   │   ├── middleware/   # Auth, error handling, upload
│   │   └── utils/        # Text extractor, logger, file hash
│   └── prompts/          # LLM prompt templates (tunable independently)
└── frontend/       # React + Vite dashboard
    └── src/
        ├── views/         # Dashboard, Tracker, Ingest, Search, Documents, Analytics, Profile, Login
        ├── components/    # Reusable UI components
        └── context/       # Auth context
```

## Quick Start

### Prerequisites
- **Node.js**: Version 18+ installed.
- **MongoDB**: A running instance (local MongoDB Community Server or remote MongoDB Atlas connection string).
- **ChromaDB**: Install the Python ChromaDB package and start the server:
  ```bash
  pip install chromadb
  chroma run --host 127.0.0.1 --port 8000
  ```
- **Groq API Key**: Obtain a free key from [Groq Console](https://console.groq.com).
- **(Optional) Resend API Key**: For email notifications — [resend.com](https://resend.com).
- **(Optional) Twilio Account**: For SMS notifications — [twilio.com](https://twilio.com).

### Environment Variables (.env)
Create a `.env` file in the `backend/` directory. Refer to the table below or the `.env.example` file:

| Variable | Description | Example Value |
|---|---|---|
| `PORT` | Express server port | `5000` |
| `JWT_SECRET` | Secret key for JWT signing | `your-jwt-secret-key` |
| `JWT_EXPIRES_IN` | Token expiration duration | `7d` |
| `MONGO_URI` | MongoDB connection URI | `mongodb://localhost:27017/tickit-ai` |
| `GROQ_API_KEY` | Groq API key | `gsk_...` |
| `GROQ_MODEL` | Groq LLM model | `llama-3.3-70b-versatile` |
| `VECTOR_DB_URL` | ChromaDB instance URL | `http://127.0.0.1:8000` |
| `VECTOR_DB_TYPE` | Vector DB type | `chroma` |
| `REMINDER_DAYS_BEFORE` | Task reminder days list (comma separated) | `7,2,0` |
| `REMINDER_CRON` | Reminder cron checking schedule | `*/5 * * * *` |
| `TWILIO_ACCOUNT_SID` | Twilio account identifier | `AC...` |
| `TWILIO_AUTH_TOKEN` | Twilio authorization token | `your_token` |
| `TWILIO_PHONE_NUMBER` | Twilio SMS sender phone number (E.164 format) | `+15551234567` |
| `RESEND_API_KEY` | Resend email API key | `re_...` |

### Notification Channel Limitations
> [!IMPORTANT]
> - **Twilio Trial Account Limitation**: Twilio trial accounts can only send SMS messages to phone numbers that have been manually added and verified in the Twilio Console.
> - **Resend Free-Tier Limitation**: Resend free accounts can only send emails to the email address used to sign up for the Resend account. Additionally, all emails must use `onboarding@resend.dev` as the `from` address until a custom domain is verified.

### Backend Setup
1. Navigate to the backend folder and install dependencies:
   ```bash
   cd backend
   npm install
   ```
2. Copy the environment template and configure variables:
   ```bash
   cp .env.example .env
   # Edit .env with your MONGO_URI and GROQ_API_KEY
   ```
3. Start the Express API server:
   ```bash
   npm run dev
   ```
   Server runs on `http://localhost:5000`.

### Frontend Setup
1. In a separate terminal, navigate to the frontend folder and install dependencies:
   ```bash
   cd frontend
   npm install
   ```
2. Start the Vite dev server:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:5173` in your browser. Register a new account to get started.

### Verification & Testing
Six E2E testing suites are available to verify the core backend modules. Make sure ChromaDB is running on port 8000 before running tests (tests use an in-process MongoDB Memory Server).

1. **Content Understanding & Ingestion**:
   ```bash
   cd backend
   node src/utils/testExtraction.js
   ```
2. **Memory, Search & RAG Verification**:
   ```bash
   cd backend
   node test_search_e2e.js
   ```
3. **Data Isolation (Multi-User) Verification**:
   ```bash
   cd backend
   node test_isolation.js
   ```
4. **Task & Reminder Engine (Cascades) Verification**:
   ```bash
   cd backend
   node test_week3_e2e.js
   ```
5. **Dashboard Summary & AI Insights Verification**:
   ```bash
   cd backend
   node test_week4_e2e.js
   ```
6. **Notification Channels (Email/SMS) Verification**:
   ```bash
   cd backend
   node test_notification_channels.js
   ```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Get JWT token |
| GET | `/api/users/me` | Get current user profile |
| PATCH | `/api/users/me` | Update phone number & notification preferences |
| POST | `/api/documents/upload` | Upload + AI-extract document |
| GET | `/api/documents` | List all uploaded documents |
| GET | `/api/documents/:id` | Fetch document + opportunity |
| POST | `/api/documents/:id/retry` | Retry extraction on a failed document |
| GET | `/api/opportunities` | List opportunities |
| GET | `/api/opportunities/:id` | Opportunity detail + tasks + checklist |
| PATCH | `/api/opportunities/:id/status` | Update status (cascades to tasks/reminders) |
| GET | `/api/tasks` | List tasks (filterable) |
| PATCH | `/api/tasks/:id/status` | Update task status + cascade reminders/opportunity |
| PATCH | `/api/checklist-items/:id/status` | Toggle checklist item checked status |
| GET | `/api/reminders` | List reminders |
| POST | `/api/reminders/run-now` | Manually trigger reminder scan (dev/testing only) |
| POST | `/api/search` | Semantic search (hybrid RAG via LangChain) |
| GET | `/api/search/history` | Get user's search history |
| DELETE | `/api/search/history/:id` | Delete a single search history entry |
| DELETE | `/api/search/history` | Clear all search history |
| GET | `/api/dashboard/summary` | Aggregated stats + AI insights |
| GET | `/api/analytics/summary` | Completion trend, avg time-to-completion, category breakdown |

## Frontend Pages

| Page | Route | Description |
|---|---|---|
| Login / Signup | `/login` | Auth screen with visual workflow explainer |
| Dashboard | `/` | Summary metrics, upcoming reminders, AI insights |
| Tracker | `/tracker` | Opportunity list with tasks, checklists, and status management |
| Ingest Document | `/ingest` | Upload or paste documents (single or multi-file) |
| RAG Search | `/search` | Semantic search with grounded answers, citations, and search history |
| Documents | `/documents` | Full document repository with status tracking and retry-extraction |
| Analytics | `/analytics` | Completion trends, category breakdown, avg time-to-completion |
| Profile / Settings | `/profile` | Phone number and notification channel preferences |

## Project Status

All four originally planned weeks are complete, plus additional features built beyond the original scope:

- **Week 1** ✅ — Content Understanding: upload → extract → save
- **Week 2** ✅ — Memory & Search: embeddings → ChromaDB → RAG
- **Week 3** ✅ — Tasks & Reminders: auto-generation → cron worker → cascades
- **Week 4** ✅ — Dashboard: React UI, filters, AI insights panel
- **Beyond spec** ✅ — LangChain RAG integration, multi-channel notifications (in-app/email/SMS), multi-file upload, Documents page, Analytics page, search history

## Future Work

- **Templates**: Reusable Opportunity blueprints (saved category + default checklist/task patterns) to speed up extraction for recurring document types.
