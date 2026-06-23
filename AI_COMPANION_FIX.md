# AI Companion Fix Notes

If the AI Companion keeps giving the same style of reply, check these first:

1. `OPENAI_API_KEY` is set in `apps/server/.env`
2. The backend was restarted after the env change
3. The backend can reach OpenAI over the network
4. The conversation is the `ai` conversation, not a direct chat

## What the code does now

- Uses OpenAI when the key is present
- Falls back to a local reply generator when the key is missing
- Sends recent conversation context to OpenAI so replies are less repetitive

## What you should edit

- Backend secrets: `apps/server/.env`
- Frontend API URL: `apps/web/.env`
- OpenAI behavior: `apps/server/src/services/aiCompanion.ts`

## Good default env values

```env
OPENAI_MODEL=gpt-4.1-mini
VITE_API_URL=http://localhost:5000
```

## Best quick test

1. Start the backend and frontend
2. Open the AI Companion conversation
3. Send two different messages
4. Confirm the replies change based on the message and earlier context
