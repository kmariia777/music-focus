import { logger } from "./logger";

const CONNECTORS_HOSTNAME = process.env["REPLIT_CONNECTORS_HOSTNAME"];
const REPL_IDENTITY = process.env["REPL_IDENTITY"];
const WEB_REPL_RENEWAL = process.env["WEB_REPL_RENEWAL"];

const CONNECTOR_ID = "ccfg_google-calendar_DDDBAC03DE404369B74F32E78D";

async function getAccessToken(): Promise<string> {
  if (!CONNECTORS_HOSTNAME || !REPL_IDENTITY) {
    throw new Error("Google Calendar connector not configured. Please connect it via Replit integrations.");
  }

  const url = `https://${CONNECTORS_HOSTNAME}/api/v2/connection?connectorConfigId=${CONNECTOR_ID}`;
  const resp = await fetch(url, {
    headers: {
      "X-Replit-Identity": REPL_IDENTITY,
      ...(WEB_REPL_RENEWAL ? { "X-Replit-Web-Repl-Renewal": WEB_REPL_RENEWAL } : {}),
    },
  });

  if (!resp.ok) {
    const text = await resp.text();
    logger.error({ status: resp.status, body: text }, "Failed to get connector token");
    throw new Error(`Connector token fetch failed: ${resp.status}`);
  }

  const data = (await resp.json()) as { accessToken?: string; access_token?: string };
  const token = data.accessToken ?? data.access_token;
  if (!token) throw new Error("No access token in connector response");
  return token;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  description?: string;
  htmlLink?: string;
}

export async function getUpcomingEvents(maxResults = 20): Promise<CalendarEvent[]> {
  const token = await getAccessToken();
  const now = new Date().toISOString();
  const twoWeeksOut = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const params = new URLSearchParams({
    calendarId: "primary",
    timeMin: now,
    timeMax: twoWeeksOut,
    maxResults: String(maxResults),
    singleEvents: "true",
    orderBy: "startTime",
  });

  const resp = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!resp.ok) {
    const text = await resp.text();
    logger.error({ status: resp.status, body: text }, "Google Calendar API error");
    throw new Error(`Calendar API error: ${resp.status}`);
  }

  const data = (await resp.json()) as {
    items?: Array<{
      id: string;
      summary?: string;
      description?: string;
      htmlLink?: string;
      start: { dateTime?: string; date?: string };
      end: { dateTime?: string; date?: string };
    }>;
  };

  return (data.items ?? []).map((item) => ({
    id: item.id,
    title: item.summary ?? "(No title)",
    start: item.start.dateTime ?? item.start.date ?? "",
    end: item.end.dateTime ?? item.end.date ?? "",
    description: item.description,
    htmlLink: item.htmlLink,
  }));
}
