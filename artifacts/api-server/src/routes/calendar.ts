import { Router } from "express";
import { getUpcomingEvents } from "../lib/googleCalendar";

const router = Router();

router.get("/calendar/events", async (req, res) => {
  try {
    const events = await getUpcomingEvents(20);
    res.json(events);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("not configured") || message.includes("Connector token fetch failed")) {
      res.status(503).json({ error: "Google Calendar not connected", message });
    } else {
      req.log.error({ err }, "Calendar events fetch failed");
      res.status(500).json({ error: "Failed to fetch calendar events" });
    }
  }
});

export default router;
