/* ─────────────────────────────────────────────────────────────
   calendar-embed.js — Soul School lightweight calendar widget
   Fetches upcoming events from one or more Google Calendars
   and renders them into a target container as styled cards.
   ───────────────────────────────────────────────────────────── */

const EMBED_API_KEY = 'ALzaSyC6rpSesCYzceFAdTA6eEZK_1rNBuRholl';

/* ─── Calendar sources ───────────────────────────────────────
   Each entry has an id and an optional label.
   To add a calendar later, append an entry to PORTAL_CALENDARS.
   Set id to null to leave a slot as a placeholder.
   ─────────────────────────────────────────────────────────── */

const PRIMARY_CALENDAR_ID =
  '5a1abf9806d5c29bb0ffcb97d8fca402f313804aea80bbc2640aa6ad190abb63@group.calendar.google.com';

const PORTAL_CALENDARS = [
  { id: PRIMARY_CALENDAR_ID,  label: 'Main' },
  // { id: 'CALENDAR_ID_2@group.calendar.google.com', label: 'Placeholder 2' },
  // { id: 'CALENDAR_ID_3@group.calendar.google.com', label: 'Placeholder 3' },
  // { id: 'CALENDAR_ID_4@group.calendar.google.com', label: 'Placeholder 4' },
];

/* ─────────────────────────────────────────────────────────── */

/**
 * Fetch upcoming events from a single Google Calendar.
 * Returns an array of event objects sorted by start time,
 * or an empty array on failure.
 */
async function fetchCalendarEvents(calendarId, maxResults = 50) {
  const timeMin = new Date().toISOString();
  const timeMax = new Date();
  timeMax.setMonth(timeMax.getMonth() + 6);

  const params = new URLSearchParams({
    key:          EMBED_API_KEY,
    timeMin:      timeMin,
    timeMax:      timeMax.toISOString(),
    singleEvents: 'true',
    orderBy:      'startTime',
    maxResults:   String(maxResults),
  });

  const url =
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json();
      console.error(`Calendar fetch failed for ${calendarId}:`, err?.error?.message);
      return [];
    }
    const data = await res.json();
    return data.items || [];
  } catch (err) {
    console.error(`Calendar fetch error for ${calendarId}:`, err);
    return [];
  }
}

/**
 * Fetch and merge events from multiple calendar IDs,
 * de-duplicate by event id, sort by start time, then slice.
 */
async function fetchMergedEvents(calendarIds, limit) {
  const results = await Promise.all(
    calendarIds
      .filter(Boolean)
      .map(id => fetchCalendarEvents(id))
  );

  const seen = new Set();
  const merged = [];
  for (const events of results) {
    for (const ev of events) {
      if (!seen.has(ev.id)) {
        seen.add(ev.id);
        merged.push(ev);
      }
    }
  }

  merged.sort((a, b) => eventStart(a) - eventStart(b));
  return merged.slice(0, limit);
}

/* ─── Rendering ─────────────────────────────────────────── */

/**
 * Render event cards into `container`.
 * Uses the same CSS classes as the existing static cards.
 */
function renderEventCards(container, events) {
  container.innerHTML = '';

  if (events.length === 0) {
    container.innerHTML =
      '<p class="event-no-results">No upcoming gatherings — check back soon.</p>';
    return;
  }

  events.forEach(ev => {
    const start    = eventStart(ev);
    const dateStr  = start.toLocaleString('default', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    });
    const timeStr  = formatEmbedTime(ev);
    const location = ev.location || 'Location TBA';
    const desc     = ev.description ? stripEmbedHtml(ev.description) : '';

    const card = document.createElement('div');
    card.className = 'event-card';
    card.innerHTML = `
      <h2 class="event-title">${escHtml(ev.summary || 'Gathering')}</h2>
      <p class="event-meta">${escHtml(dateStr)} · ${escHtml(timeStr)}</p>
      <p class="event-location">${escHtml(location)}</p>
      ${desc ? `<p class="event-desc">${escHtml(desc)}</p>` : ''}
    `;
    container.appendChild(card);
  });
}

function renderLoadingCards(container, count) {
  container.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const card = document.createElement('div');
    card.className = 'event-card event-card--loading';
    card.innerHTML = `
      <div class="event-skel event-skel--title"></div>
      <div class="event-skel event-skel--meta"></div>
      <div class="event-skel event-skel--desc"></div>
    `;
    container.appendChild(card);
  }
}

/* ─── Public init functions ─────────────────────────────── */

/**
 * Index page: show next `limit` events from the primary calendar.
 * Call after DOMContentLoaded.
 */
async function initIndexCalendar(containerId, limit = 3) {
  const container = document.getElementById(containerId);
  if (!container) return;

  renderLoadingCards(container, limit);
  const events = await fetchMergedEvents([PRIMARY_CALENDAR_ID], limit);
  renderEventCards(container, events);
}

/**
 * Portal page: show next `limit` events merged from all PORTAL_CALENDARS.
 * Call after the password gate passes (WEAREFREE unlocked).
 */
async function initPortalCalendar(containerId, limit = 6) {
  const container = document.getElementById(containerId);
  if (!container) return;

  renderLoadingCards(container, limit);
  const ids    = PORTAL_CALENDARS.map(c => c.id).filter(Boolean);
  const events = await fetchMergedEvents(ids, limit);
  renderEventCards(container, events);
}

/* ─── Helpers ───────────────────────────────────────────── */

function eventStart(ev) {
  return new Date(ev.start?.dateTime || ev.start?.date || Date.now());
}

function formatEmbedTime(ev) {
  if (ev.start?.date && !ev.start?.dateTime) return 'All day';
  const s = new Date(ev.start.dateTime);
  const e = new Date(ev.end?.dateTime || ev.start.dateTime);
  const fmt = d => d.toLocaleTimeString('default', { hour: 'numeric', minute: '2-digit' });
  return `${fmt(s)} – ${fmt(e)}`;
}

function stripEmbedHtml(str) {
  return str
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .trim();
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
