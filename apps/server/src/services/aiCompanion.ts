import { env } from "../config/env.js";

type AiHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

const openings = [
  "I hear you.",
  "That makes sense.",
  "Let us slow this down a bit.",
  "You are not alone in this."
];

const coaching = [
  "What feels most urgent right now?",
  "What is one small part of this you can control today?",
  "Can you break this into facts, worries, and next actions?",
  "What would a good enough next step look like?"
];

const closings = [
  "Take the smallest useful step and see what changes.",
  "You do not need the whole answer before moving.",
  "Try one experiment instead of solving everything at once.",
  "If you want, we can turn this into a simple plan."
];

const observations = [
  "The part that stands out most is the pressure to decide quickly.",
  "What you wrote sounds like a mix of emotion and practical next steps.",
  "There is usually one piece here that matters more than the rest.",
  "This looks like a moment where clarity matters more than speed."
];

const questionBank = [
  "What would change if we made the next step smaller?",
  "Which part of this is actually under your control today?",
  "What is the easiest useful move you could make next?",
  "What would be enough progress for today?"
];

function hashMessage(message: string) {
  return [...message].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) % 10_000, message.length);
}

function pick<T>(items: T[], seed: number) {
  return items[Math.abs(seed) % items.length];
}

function detectTopic(message: string) {
  const text = message.toLowerCase();
  if (/(exam|study|class|homework|assignment|course)/.test(text)) return "study";
  if (/(job|career|resume|interview|work|office)/.test(text)) return "work";
  if (/(friend|relationship|partner|family|people)/.test(text)) return "relationships";
  if (/(anxious|anxiety|stress|worried|panic|overwhelm)/.test(text)) return "stress";
  if (/(plan|goal|project|build|idea|launch)/.test(text)) return "planning";
  return "general";
}

function extractKeywords(message: string) {
  const stopwords = new Set(["this", "that", "with", "have", "just", "about", "there", "what", "when", "want", "need", "from", "your", "into", "like", "make", "been", "were", "them", "then", "they", "will", "would", "could"]);
  return message
    .toLowerCase()
    .match(/[a-z']+/g)
    ?.filter((word) => word.length > 4 && !stopwords.has(word))
    .slice(0, 2) ?? [];
}

function buildFallbackReply(message: string) {
  const normalized = message.trim();
  const seed = hashMessage(normalized);
  const opening = pick(openings, seed);
  const observation = pick(observations, seed >> 1);
  const coachingLine = pick(coaching, seed >> 2);
  const closing = pick(closings, seed >> 4);
  const question = pick(questionBank, seed >> 5);
  const topic = detectTopic(normalized);
  const keywords = extractKeywords(normalized);
  const keywordLine =
    keywords.length > 0
      ? `You mentioned ${keywords.join(" and ")}.`
      : "I am focusing on the main feeling and the next step.";
  const subjectHint =
    topic === "study"
      ? "For study, I would focus on the next topic and the exact task."
      : topic === "work"
        ? "For work, the next move is usually one concrete deliverable or message."
        : topic === "relationships"
          ? "For people stuff, clarity often starts with what you want to say or ask."
          : topic === "stress"
            ? "When stress is high, shrinking the next step can help a lot."
            : topic === "planning"
              ? "For planning, a rough outline is usually enough to start."
      : "For this, a simple next step is usually better than a perfect answer.";

  return `${opening} ${observation} ${subjectHint} ${keywordLine} ${coachingLine} ${question} ${closing}\n\nI am here to help you think it through, not as a therapist or emergency service.`;
}

export async function getAiCompanionReply(message: string, history: AiHistoryMessage[] = []) {
  if (!env.openaiApiKey) {
    return buildFallbackReply(message);
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.openaiApiKey}`
    },
    body: JSON.stringify({
      model: env.openaiModel,
      messages: [
        {
          role: "system",
          content:
            "You are Connectify AI Companion. Be warm, practical, concise, and supportive. You are not a therapist. Do not diagnose. Use the recent chat context when it helps. For crisis or self-harm risk, encourage contacting local emergency services or trusted people immediately."
        },
        ...history,
        { role: "user", content: message }
      ],
      temperature: 0.7
    })
  });

  if (!response.ok) {
    return buildFallbackReply(message);
  }

  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content?.trim() || buildFallbackReply(message);
}
