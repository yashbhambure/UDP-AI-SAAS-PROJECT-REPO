# Tick-It AI 🤖

> AI-powered execution engine that converts unstructured content (PDFs, emails, LinkedIn posts, images) into structured tasks, deadlines, checklists, and reminders — with semantic search over everything ever uploaded.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + Express |
| LLM | Gemini 2.0 Flash (via `@google/generative-ai`) |
| Embeddings | Gemini `text-embedding-004` |
| Vector DB | ChromaDB (local) |
| Primary DB | MongoDB + Mongoose |
| Background Jobs | `node-cron` |
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
│   │   ├── services/     # LLM, embedding, vector, extraction, tasks
│   │   ├── workers/      # Cron jobs
│   │   ├── middleware/   # Auth, error handling, upload
│   │   └── utils/        # Text extractor, logger, file hash
│   └── prompts/          # LLM prompt templates (tunable independently)
└── frontend/       # React + Vite dashboard
```

## Quick Start

### Prerequisites
- **Node.js**: Version 18+ installed.
- **MongoDB**: A running instance (local MongoDB Community Server or remote MongoDB Atlas connection string).
- **ChromaDB**: Install Python ChromaDB package and start the server:
  ```bash
  pip install chromadb
  chroma run --host 127.0.0.1 --port 8000
  ```
- **Gemini API Key**: Obtain a key from [Google AI Studio](https://aistudio.google.com/apikey).

### Environment Variables (.env)
Create a `.env` file in the `backend/` directory. Refer to the table below or the [.env.example](file:///d:/Tick-It%20AI/backend/.env) file:

| Variable | Description | Example Value |
|---|---|---|
| `PORT` | Express server port | `5000` |
| `JWT_SECRET` | Secret key for JWT signing | `your-jwt-secret-key` |
| `JWT_EXPIRES_IN` | Token expiration duration | `7d` |
| `MONGO_URI` | MongoDB connection URI | `mongodb://localhost:27017/tickit-ai` |
| `GEMINI_API_KEY` | Gemini developer API key | `AIzaSy...` |
| `GEMINI_MODEL` | Gemini text/chat LLM model | `gemini-2.5-flash` |
| `GEMINI_EMBEDDING_MODEL`| Gemini vector embedding model | `gemini-embedding-001` |
| `VECTOR_DB_URL` | ChromaDB instance url | `http://127.0.0.1:8000` |
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
   # Edit .env with your MONGO_URI and GEMINI_API_KEY
   ```
3. Start the Express API server:
   ```bash
   npm run dev
   ```

### Verification & Testing
Four E2E testing suites are available to verify the core backend modules. Make sure the ChromaDB server is running on port 8000 before running tests (tests use an in-process MongoDB Memory Server).

1. **Content Understanding & Ingestion In-Depth Test**:
   ```bash
   cd backend
   node src/utils/testExtraction.js
   ```
2. **Memory, Search & RAG Verification Test**:
   ```bash
   cd backend
   node test_search_e2e.js
   ```
3. **Data Isolation (Multi-User) Verification Test**:
   ```bash
   cd backend
   node test_isolation.js
   ```
4. **Task & Reminder Engine (Cascades) Verification Test**:
   ```bash
   cd backend
   node test_week3_e2e.js
   ```
5. **Dashboard summary & AI Insights Verification Test**:
   ```bash
   cd backend
   node test_week4_e2e.js
   ```


## API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Get JWT token |
| POST | `/api/documents/upload` | Upload + AI-extract document |
| GET | `/api/documents/:id` | Fetch document + opportunity |
| GET | `/api/opportunities` | List opportunities |
| GET | `/api/opportunities/:id` | Opportunity detail + tasks |
| PATCH | `/api/opportunities/:id/status` | Update status |
| GET | `/api/tasks` | List tasks (filterable) |
| PATCH | `/api/tasks/:id/status` | Update + cascade reminders |
| PATCH | `/api/checklist-items/:id/status` | Update checked status |
| GET | `/api/reminders` | List reminders |
| POST | `/api/search` | Semantic search (RAG) |
| GET | `/api/dashboard/summary` | Aggregated stats + AI insights |

## Build Order (4 Weeks)

- **Week 1** ✅ — Content Understanding: upload → extract → save
- **Week 2** — Memory & Search: embeddings → ChromaDB → RAG
- **Week 3** — Tasks & Reminders: auto-generation → cron worker → cascades
- **Week 4** — Dashboard: React UI, filters, AI insights panel

## Future Work

- **Templates**: Reusable Opportunity blueprints (saved category + default checklist/task patterns) to speed up extraction for recurring document types.
