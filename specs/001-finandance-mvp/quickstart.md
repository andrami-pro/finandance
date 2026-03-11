# Quickstart: Finandance MVP Development

## Prerequisites

| Tool | Version | Installation |
|------|---------|--------------|
| Node.js | 18+ | https://nodejs.org |
| Python | 3.11+ | https://python.org |
| uv | Latest | `pip install uv` |
| Docker | Latest | https://docker.com |
| Supabase CLI | Latest | https://github.com/supabase/cli |

## Environment Setup

### 1. Clone and Navigate

```bash
git clone <repo-url>
cd app-finanzas
git checkout 001-finandance-mvp
```

### 2. Supabase Setup

```bash
# Create Supabase project in EU region (Frankfurt or London)
# Get your project URL and anon key from Supabase dashboard

# Create .env files
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
```

#### Backend Environment Variables (.env)

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database
DATABASE_URL=postgresql://postgres:password@db.yourproject.supabase.co:5432/postgres

# Security
MASTER_ENCRYPTION_KEY=generate-with-cryptography-fernet-keygen
SECRET_KEY=fastapi-secret-key

# API Keys (for integrations - obtained from providers)
WISE_API_KEY=your-wise-key
KRAKEN_API_KEY=your-kraken-key
```

#### Frontend Environment Variables (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Database Setup

```bash
# Run migrations
cd backend
supabase db reset

# Or apply schema manually via Supabase SQL Editor
# See data-model.md for complete schema
```

## Development Servers

### Backend (Terminal 1)

```bash
cd backend

# Create virtual environment
uv venv
source .venv/bin/activate  # Linux/Mac
# or
.venv\Scripts\activate  # Windows

# Install dependencies
uv pip install -r requirements.txt

# Run development server
uvicorn app.main:app --reload --port 8000
```

**API available at**: http://localhost:8000

### Frontend (Terminal 2)

```bash
cd frontend  # or root if using monorepo

# Install dependencies
npm install

# Run development server
npm run dev
```

**App available at**: http://localhost:3000

## Initial Data

### Create Test User

1. Navigate to http://localhost:3000/signup
2. Register with email/password
3. *(Optional) Complete 2FA setup - for MVP this step is optional, will be mandatory in V2)*

### Add Integration

1. Navigate to http://localhost:3000/integrations
2. Click "Add Integration"
3. Select provider (Wise/Kraken/Ledger)
4. Enter API credentials (use test/sandbox keys for development)

## Testing

### Backend Tests

```bash
cd backend
pytest tests/ -v
```

### Frontend Tests

```bash
cd frontend
npm run test
# or
npm run test:coverage
```

## Common Issues

| Issue | Solution |
|-------|----------|
| 2FA not available | 2FA is optional for MVP - will be mandatory in V2 |
| API key encryption fails | Verify `MASTER_ENCRYPTION_KEY` is set in .env |
| CORS errors | Update `ALLOWED_ORIGINS` in backend config |
| Database connection fails | Verify `DATABASE_URL` and Supabase project status |

## Project Structure

```
app-finanzas/
├── backend/              # FastAPI application
│   ├── app/
│   │   ├── api/        # API endpoints
│   │   ├── core/       # Config, security
│   │   ├── models/     # SQLAlchemy models
│   │   └── services/   # Business logic
│   ├── tests/
│   └── requirements.txt
│
├── frontend/            # Next.js application
│   ├── app/           # App router pages
│   ├── components/    # React components
│   ├── lib/          # Utilities
│   └── stores/       # State management
│
└── supabase/          # Database migrations
    └── migrations/
```

## Next Steps

1. Run `/speckit.tasks` to generate implementation tasks
2. Start with Phase 1 (Infrastructure) tasks
3. Complete authentication flow first (security gate)
4. Implement integrations in order: Wise → Kraken → Ledger

## Resources

- [FastAPI Docs](https://fastapi.tiangolo.com)
- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Tremor Charts](https://www.tremor.so)
- [shadcn/ui](https://ui.shadcn.com)
