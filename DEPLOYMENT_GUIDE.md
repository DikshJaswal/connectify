# Connectify Deployment Guide

This repo has two deployable apps:

- `apps/server` is the backend API and Socket.IO server
- `apps/web` is the React frontend

## Folder map

- `apps/server/.env` holds backend secrets for local development
- `apps/server/.env.example` shows the backend variables you need
- `apps/web/.env` holds frontend variables for local development
- `apps/web/.env.example` shows the frontend variables you need
- `apps/server/render.yaml` is the Render blueprint for the API
- `apps/web/vercel.json` is the Vercel config for the web app

## Why the AI can repeat itself

If `OPENAI_API_KEY` is missing, the AI Companion uses a local fallback. That fallback is designed to be helpful, but it is still rule-based and can feel repetitive.

To fix that:

1. Add `OPENAI_API_KEY` in `apps/server/.env`
2. Keep `OPENAI_MODEL=gpt-4.1-mini` unless you have a reason to change it
3. Restart the server after changing env values
4. Make sure the server can reach `https://api.openai.com`

The server now also sends recent chat context to the model, so replies should feel less flat when the OpenAI key is present.

## Local setup

1. Install dependencies from the repo root:

   ```bash
   npm install
   ```

2. Create the env files:

   ```bash
   Copy-Item apps/server/.env.example apps/server/.env
   Copy-Item apps/web/.env.example apps/web/.env
   ```

3. Fill in `apps/server/.env` with:

   - `MONGO_URI`
   - `JWT_SECRET`
   - `CLIENT_URL`
   - `OPENAI_API_KEY`
   - optional Cloudinary keys

4. Set `apps/web/.env` to:

   ```env
   VITE_API_URL=http://localhost:5000
   ```

5. Start both apps:

   ```bash
   npm run dev
   ```

## What goes where in production

### Backend on Render

Use `apps/server` as the API service.

Required env vars on Render:

- `CLIENT_URL` should be your frontend URL
- `MONGO_URI` should be your Atlas connection string
- `JWT_SECRET` should be a long random secret
- `OPENAI_API_KEY` enables the AI Companion
- `OPENAI_MODEL` is optional
- Cloudinary keys are optional but recommended for uploads

The backend build and start commands are already defined in `apps/server/render.yaml`.

### Frontend on Vercel

Use `apps/web` as the frontend app.

Required env vars on Vercel:

- `VITE_API_URL` should be your Render backend URL

The Vercel config is already in `apps/web/vercel.json`.

### Database on MongoDB Atlas

1. Create a cluster
2. Create a database user
3. Allow network access for your host
4. Copy the connection string into `MONGO_URI`

## Step-by-step deployment

1. Deploy the MongoDB database first
2. Deploy the backend to Render
3. Copy the Render API URL
4. Deploy the frontend to Vercel
5. Set `VITE_API_URL` to the Render URL
6. Redeploy the frontend
7. Log in and test a direct chat, the AI Companion, and file upload

## How to check that it is connected properly

The setup is working when:

- `GET /health` on the backend returns `{ "ok": true, "name": "connectify-api" }`
- You can register or log in without API errors
- The socket badge shows connected in the UI
- Messages appear in both browser tabs in the same conversation
- The AI Companion gives varied replies when `OPENAI_API_KEY` is set

## Small deployment reminders

- Do not commit real secrets into `.env.example`
- Restart the backend after changing any env variable
- Use the deployed backend URL in the frontend, not `localhost`
