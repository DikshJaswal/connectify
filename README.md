# Connectify

Connectify is a modern full-stack real-time messaging platform with private chats, group conversations, media sharing, profile management, notifications, and an integrated AI Companion.

## Stack

- Frontend: React, TypeScript, Tailwind CSS, React Router, Zustand, Socket.IO client
- Backend: Node.js, Express, TypeScript, Socket.IO
- Database: MongoDB
- Auth: JWT, bcrypt
- File storage: Cloudinary, with local fallback metadata when Cloudinary is not configured
- Deployment targets: Vercel for `apps/web`, Render for `apps/server`, MongoDB Atlas for database

## Quick Start

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy environment files:

   ```bash
   cp apps/server/.env.example apps/server/.env
   cp apps/web/.env.example apps/web/.env
   ```

3. Start MongoDB locally or set `MONGO_URI` to MongoDB Atlas.

4. Run both apps:

   ```bash
   npm run dev
   ```

The API runs on `http://localhost:5000` and the web app on `http://localhost:5173`.

## Connection Check

The app is connected properly when all of these are true:

- `GET http://localhost:5000/health` returns `{ "ok": true, "name": "connectify-api" }`
- You can register or log in from the web app without API errors
- The conversation sidebar shows a `Live` badge once the socket connects
- Sending a message updates the thread immediately and the message appears for the other side in the same conversation
- Pressing `Enter` sends a message, while `Shift+Enter` inserts a new line
- The trash icon in the chat header hides a direct chat from your list on your side

If the socket badge shows `Offline`, check `CLIENT_URL`, `VITE_API_URL`, and that the server is running on the same environment you used for login.

## AI Companion

Set `OPENAI_API_KEY` in `apps/server/.env` for generated AI replies. Without a key, Connectify uses a local supportive fallback response so the product remains usable in development.

The AI Companion is intentionally framed as a supportive assistant, not a therapist or emergency service.

## Deployment Notes

- Vercel: set the project root to the repository root and use `apps/web/vercel.json`. Add `VITE_API_URL` with the Render API URL.
- Render: use `apps/server/render.yaml` or create a Node web service manually. Add `CLIENT_URL`, `MONGO_URI`, Cloudinary keys, and a long `JWT_SECRET`.
- MongoDB Atlas: create a cluster, allow Render's outbound access, and paste the connection string into `MONGO_URI`.
- Cloudinary: image and file uploads work best with Cloudinary configured. In local development without Cloudinary, upload metadata is still saved with a `local://` placeholder URL.
- Full step-by-step setup: see [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md).
- AI troubleshooting: see [AI_COMPANION_FIX.md](AI_COMPANION_FIX.md).

## Security Note

Do not commit real credentials into `.env.example` or any tracked file. Keep secrets only in `apps/server/.env` and rotate any values that were previously shared or exposed.
