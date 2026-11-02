# Ultra Learn (LearnX) — Production Deployment Guide
**Frontend**: Vercel (TanStack Start / React 19)  
**Backend**: Render (Dual Web Services: Python FastAPI + Node.js Gateway)  
**Database**: Supabase (PostgreSQL 16 + pgvector)

---

## Architecture Overview in Production

```
+─────────────────────────────────+
|   Frontend on Vercel            |
|   https://<your-app>.vercel.app |
+────────────────┬────────────────+
                 │
                 │ Authorization: Bearer <JWT>
                 ▼
+─────────────────────────────────+        Internal        +──────────────────────────────────+
|   Node.js Gateway on Render     | ─────────────────────► |   FastAPI RAG Engine on Render   |
|   https://<node-app>.onrender.com                       |   https://<fastapi-app>.onrender.com |
+────────────────┬────────────────+                        +─────────────────┬────────────────+
                 │                                                           │
                 │ Connection Pool (Port 6543)                               │ 1536-d Vector Search
                 ▼                                                           ▼
+─────────────────────────────────────────────────────────────────────────────────────────────+
|                                Supabase Cloud PostgreSQL 16                                 |
|                                (Tables with RLS + pgvector HNSW)                            |
+─────────────────────────────────────────────────────────────────────────────────────────────+
```

---

## STEP 1: Deploy Backends on Render (5 Minutes)

We have provided a declarative [`render.yaml`](./render.yaml) blueprint that configures both backend services automatically.

### 1.1 Create Blueprint on Render
1. Go to your [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** in the top navigation bar and select **Blueprint**.
3. Connect your GitHub account and select your repository: **`vkrfish/feathered-friends-finder`**.
4. Give your blueprint a group name (e.g., `learnx-production`).
5. Render will automatically parse `render.yaml` and discover two web services:
   - **`learnx-fastapi`** (Python 3.11 RAG engine)
   - **`learnx-node-gateway`** (Node.js API gateway)

### 1.2 Fill in Environment Variables on Render
When prompted by Render, fill in the following environment variables:

#### For `learnx-fastapi`:
| Key | Value Description | Example / Where to find |
| :--- | :--- | :--- |
| `DATABASE_URL` | Supabase Postgres URI | `postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres` |
| `GEMINI_API_KEY` | Google Gemini API Key | `AIzaSy...` (from Google AI Studio) |
| `OPENROUTER_API_KEY` | *(Optional)* OpenRouter Key | `sk-or-v1-...` |

#### For `learnx-node-gateway`:
| Key | Value Description | Example / Where to find |
| :--- | :--- | :--- |
| `DATABASE_URL` | Supabase Postgres URI | Same as above |
| `SUPABASE_URL` | Supabase Project URL | `https://[PROJECT-REF].supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase Publishable Key | `sb_publishable_...` |
| `FASTAPI_URL` | *(Auto-wired by Render)* | Render automatically sets this to the internal or public URL of `learnx-fastapi` |

6. Click **Apply**.
7. Render will build both services. Once built, copy your **Node.js Gateway URL** (e.g. `https://learnx-node-gateway.onrender.com`).

---

## STEP 2: Deploy Frontend on Vercel (3 Minutes)

The frontend is built with React 19 and TanStack Start, configured via [`vercel.json`](./vercel.json).

### 2.1 Import Project into Vercel
1. Go to your [Vercel Dashboard](https://vercel.com/) and click **Add New... > Project**.
2. Select your repository: **`vkrfish/feathered-friends-finder`**.
3. In the project settings, Vercel will auto-detect **TanStack Start**.
   - **Build Command**: `npm run build`
   - **Install Command**: `npm install`

### 2.2 Add Environment Variables on Vercel
Under **Environment Variables**, add the following 4 keys:

| Key | Value | Description |
| :--- | :--- | :--- |
| `VITE_API_GATEWAY_URL` | `https://learnx-node-gateway.onrender.com` | URL of your deployed Node.js Gateway on Render |
| `VITE_FASTAPI_URL` | `https://learnx-fastapi.onrender.com` | URL of your deployed FastAPI Engine on Render |
| `VITE_SUPABASE_URL` | `https://[REF].supabase.co` | Your Supabase Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` | Your Supabase Publishable/Anon Key |

3. Click **Deploy**.
4. In under 60 seconds, Vercel will deploy your frontend live at `https://<your-project>.vercel.app`.

---

## STEP 3: Configure Supabase Redirect URLs

To ensure users can sign in and be redirected to your live Vercel domain:
1. Open your [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to **Authentication > URL Configuration**.
3. In **Site URL**, set:
   `https://<your-project>.vercel.app`
4. In **Redirect URLs**, add:
   `https://<your-project>.vercel.app/**`
5. Click **Save**.

---

## STEP 4: Verification Checklist

Once both Vercel and Render deployments complete:
1. **Health Check**:
   - Visit `https://learnx-node-gateway.onrender.com/uploads` (or health endpoint) $\rightarrow$ Returns active status.
   - Visit `https://learnx-fastapi.onrender.com/docs` $\rightarrow$ Interactive Swagger UI loads.
2. **End-to-End Test on Vercel**:
   - Open your live Vercel URL.
   - Sign up a new user or log in with an existing account.
   - Verify that your private study notebook loads.
   - Ingest a YouTube lecture or PDF $\rightarrow$ Verify flashcards, quizzes, and RAG chat streaming work end-to-end!
