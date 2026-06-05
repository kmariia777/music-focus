import { Router } from "express";
import OpenAI from "openai";

const router = Router();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are Coach, a concise ADHD-friendly productivity assistant inside Focus Music Hub.
Your role: help users stay focused, plan tasks, manage energy, and build Pomodoro habits.
Keep replies short (2-4 sentences max). Be warm, direct, and practical — never preachy.
If the user asks to start a timer or add a task, encourage them briefly and let the app do the action.
Context you receive: timer running state, sessions completed today, whether they have tasks.`;

router.post("/coach/chat", async (req, res) => {
  try {
    const { messages, context } = req.body as {
      messages: { role: "user" | "assistant"; content: string }[];
      context?: { isTimerRunning?: boolean; sessionsCompleted?: number; hasTasks?: boolean };
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "messages array required" });
      return;
    }

    const contextNote = context
      ? `[Context: timer ${context.isTimerRunning ? "running" : "stopped"}, ${context.sessionsCompleted ?? 0} sessions today, tasks ${context.hasTasks ? "present" : "empty"}]`
      : "";

    const systemMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT + (contextNote ? "\n" + contextNote : "") },
    ];

    const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 200,
      messages: [...systemMessages, ...chatMessages],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
    res.end();
  }
});

export default router;
