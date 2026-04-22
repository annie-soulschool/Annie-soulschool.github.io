/* ─────────────────────────────────────────────────────────────
   calendar-embed.js — Soul School lightweight calendar widget
   Fetches upcoming events from one or more Google Calendars
   and renders them into a target container as styled cards.
   ───────────────────────────────────────────────────────────── */

const EMBED_API_KEY = 'AIzaSyC6rpSesCYzceFAdTA6eEZK_1rNBuRhoII';

/* ─── Debug flag ─────────────────────────────────────────────
   Activate at runtime with:  localStorage.setItem('CAL_DEBUG', '1')
   ─────────────────────────────────────────────────────────── */
const CAL_DEBUG = localStorage.getItem('CAL_DEBUG') === '1';

function calLog(...args) {
  if (CAL_DEBUG) console.log('[CalEmbed]', ...args);
}

/* ─── Calendar sources ───────────────────────────────────────
   Each entry has an id and an optional label.
   To add a calendar later, append an entry to PORTAL_CALENDARS.
   Set id to null to leave a slot as a placeholder.
   ─────────────────────────────────────────────────────────── */

const PRIMARY_CALENDAR_ID =
  '5a1abf9806d5c29bb0ffcb97d8fca402f313804aea80bbc2640aa6ad190abb63@group.calendar.google.com';

const INTERNAL_CALENDAR_ID =
  '4cff68a40f78a5719d116ac58a12fff4b16e232069dbaaaa24ac06c6f6f174fe@group.calendar.google.com';

const PORTAL_CALENDARS = [
  { id: PRIMARY_CALENDAR_ID,  label: 'Main' },
  { id: INTERNAL_CALENDAR_ID, label: 'Internal' },
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
    fields:       'items(id,summary,description,location,start,end)',
  });

  const url =
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json();
      console.error(`[CalEmbed] Fetch failed for ${calendarId}:`, err?.error?.message);
      return [];
    }
    const data = await res.json();
    console.log('[CalEmbed] Raw API response:', JSON.stringify(data.items?.[0], null, 2));
    calLog(`Fetched ${(data.items || []).length} events from ${calendarId}`);
    calLog('Raw events:', data.items);
    return data.items || [];
  } catch (err) {
    console.error(`[CalEmbed] Fetch error for ${calendarId}:`, err);
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
  calLog(`Merged ${merged.length} unique events, slicing to ${limit}`);
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
    const timeStr  = formatTime(ev);
    const location = ev.location || 'Location TBA';

    const desc = ev.description ? sanitizeDescHtml(ev.description) : '';

    const card = document.createElement('div');
    card.className = 'event-card';
    card.innerHTML = `
      <h2 class="event-title">${escHtml(ev.summary || 'Gathering')}</h2>
      <p class="event-meta">${escHtml(dateStr)} · ${escHtml(timeStr)}</p>
      <p class="event-location">${escHtml(location)}</p>
      ${desc ? `<p class="event-desc" style="white-space:pre-line">${desc}</p>` : ''}
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
  calLog(`initIndexCalendar → rendering ${events.length} events into #${containerId}`);
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
  calLog(`initPortalCalendar → rendering ${events.length} events into #${containerId}`);
  renderEventCards(container, events);
}

/* ─── Helpers ───────────────────────────────────────────── */

function eventStart(ev) {
  return new Date(ev.start?.dateTime || ev.start?.date || Date.now());
}

function formatTime(ev) {
  if (ev.start?.date && !ev.start?.dateTime) return 'All day';
  const s = new Date(ev.start.dateTime);
  const e = new Date(ev.end?.dateTime || ev.start.dateTime);
  const fmt = d => d.toLocaleTimeString('default', { hour: 'numeric', minute: '2-digit' });
  return `${fmt(s)} – ${fmt(e)}`;
}

/**
 * Sanitize Google Calendar HTML: keep only <a>, <br>, <b>, <i>, <em>, <strong>.
 * Forces all links to open in a new tab. Strips everything else.
 *
 * Google Calendar sometimes returns descriptions where the HTML is
 * entity-encoded (e.g. &lt;a href="..."&gt;), so we decode one layer
 * first — turning those back into real tags — before parsing.
 */
function sanitizeDescHtml(str) {
  // Decode one layer of HTML entities in case the API returned escaped markup.
  const decoder = document.createElement('textarea');
  decoder.innerHTML = str;
  const decoded = decoder.value;

  const tmp = document.createElement('div');
  tmp.innerHTML = decoded;

  // Remove any disallowed tags but keep their text content
  const allowed = new Set(['A', 'BR', 'B', 'I', 'EM', 'STRONG']);
  tmp.querySelectorAll('*').forEach(el => {
    if (!allowed.has(el.tagName)) {
      el.replaceWith(...el.childNodes);
    } else if (el.tagName === 'A') {
      let href = el.getAttribute('href') || '';
      // Unwrap Google redirect URLs (google.com/url?q=<real-url>&...)
      if (/^https?:\/\/(www\.)?google\.com\/url\?/i.test(href)) {
        try {
          const qParam = new URL(href).searchParams.get('q');
          if (qParam) href = qParam;
        } catch (_) {}
      }
      // Only allow http/https links
      if (!/^https?:\/\//i.test(href)) {
        el.replaceWith(el.textContent);
      } else {
        // Strip all attributes except href, add safe target
        [...el.attributes].forEach(a => el.removeAttribute(a.name));
        el.setAttribute('href', href);
        el.setAttribute('target', '_blank');
        el.setAttribute('rel', 'noopener noreferrer');
      }
    }
  });

  // Also linkify any bare URLs not already wrapped in <a>
  return tmp.innerHTML.replace(
    /(?<!href=")https?:\/\/[^\s<>"]+/g,
    url => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
  );
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
