/* ─────────────────────────────────────────────────────────────
   calendar.js — Soul School Google Calendar integration
   ─────────────────────────────────────────────────────────────

   SETUP — fill in these two values once you have them:
   ───────────────────────────────────────────────────
   1. Create a project at https://console.cloud.google.com
   2. Enable the Google Calendar API
   3. Create an API Key (APIs & Services → Credentials)
   4. In Google Calendar, make your calendar public, then
      copy the Calendar ID from its settings page.
   5. Paste both values below and remove DEMO_MODE = true.
───────────────────────────────────────────────────────────── */

const GOOGLE_API_KEY   = 'YOUR_API_KEY_HERE';        // ← replace
const GOOGLE_CALENDAR_ID = 'YOUR_CALENDAR_ID_HERE';  // ← replace (e.g. abc123@group.calendar.google.com)

/* Set to false once you have real credentials */
const DEMO_MODE = true;

/* ─── Demo events shown before real credentials are added ─── */
const DEMO_EVENTS = [
  {
    id: 'demo-1',
    summary: 'Opening Gathering',
    description: 'Come meet the community. No prior experience needed — just curiosity and willingness to show up.',
    location: 'Soul School Bus · Old Town Square',
    start: { dateTime: futureDateISO(3, 18) },
    end:   { dateTime: futureDateISO(3, 20) },
  },
  {
    id: 'demo-2',
    summary: 'Nervous System Alchemy Workshop',
    description: 'A two-hour experiential session exploring regulation, presence, and the body as intelligence.',
    location: 'The Loft · 42 River St',
    start: { dateTime: futureDateISO(7, 10) },
    end:   { dateTime: futureDateISO(7, 12) },
  },
  {
    id: 'demo-3',
    summary: 'Online: Sovereign Discernment Circle',
    description: 'Join us online for a live guided session on perceiving clearly in noisy times. Link sent on RSVP.',
    location: 'Online — Zoom',
    start: { dateTime: futureDateISO(12, 19) },
    end:   { dateTime: futureDateISO(12, 20, 30) },
  },
  {
    id: 'demo-4',
    summary: 'Field Intelligence Intensive',
    description: 'A full-day immersion in collective sensing, presence, and emergent group intelligence.',
    location: 'Larimer County Fairgrounds',
    start: { dateTime: futureDateISO(18, 9) },
    end:   { dateTime: futureDateISO(18, 17) },
  },
  {
    id: 'demo-5',
    summary: 'Community Fire Night',
    description: 'Informal gathering around the fire. Stories, songs, silence — all welcome.',
    location: 'Soul School Land · Details at door',
    start: { dateTime: futureDateISO(24, 20) },
    end:   { dateTime: futureDateISO(24, 23) },
  },
];

/* Helper: build an ISO date string N days from today */
function futureDateISO(daysFromNow, hour = 12, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

/* ═══════════════════════════════════════════════════════════
   STATE
═══════════════════════════════════════════════════════════ */

let allEvents   = [];   // raw event objects from API or demo
let viewYear    = new Date().getFullYear();
let viewMonth   = new Date().getMonth(); // 0-indexed

/* ═══════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  // Navigation
  document.getElementById('btn-prev').addEventListener('click', () => shiftMonth(-1));
  document.getElementById('btn-next').addEventListener('click', () => shiftMonth(+1));

  // Modal close
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('event-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // Load events
  if (DEMO_MODE || GOOGLE_API_KEY === 'YOUR_API_KEY_HERE') {
    showSetupBanner();
    allEvents = DEMO_EVENTS;
    renderAll();
  } else {
    fetchGoogleEvents();
  }
});

/* ═══════════════════════════════════════════════════════════
   GOOGLE CALENDAR FETCH
═══════════════════════════════════════════════════════════ */

async function fetchGoogleEvents() {
  showSkeletonGrid();

  // Fetch events from 3 months back through 6 months ahead
  const timeMin = new Date();
  timeMin.setMonth(timeMin.getMonth() - 3);
  const timeMax = new Date();
  timeMax.setMonth(timeMax.getMonth() + 6);

  const params = new URLSearchParams({
    key:          GOOGLE_API_KEY,
    timeMin:      timeMin.toISOString(),
    timeMax:      timeMax.toISOString(),
    singleEvents: 'true',
    orderBy:      'startTime',
    maxResults:   '100',
  });

  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(GOOGLE_CALENDAR_ID)}/events?${params}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err?.error?.message || `HTTP ${res.status}`);
    }
    const data = await res.json();
    allEvents = data.items || [];
    renderAll();
  } catch (err) {
    console.error('Google Calendar fetch failed:', err);
    showGridError(err.message);
  }
}

/* ═══════════════════════════════════════════════════════════
   RENDER
═══════════════════════════════════════════════════════════ */

function renderAll() {
  renderMonthLabel();
  renderGrid();
  renderUpcomingList();
}

function renderMonthLabel() {
  const label = new Date(viewYear, viewMonth, 1)
    .toLocaleString('default', { month: 'long', year: 'numeric' });
  document.getElementById('month-label').textContent = label;
}

/* ── Calendar grid ── */

function renderGrid() {
  const grid = document.getElementById('cal-grid');
  grid.innerHTML = '';

  const today = new Date();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  // Map events to day numbers for this month
  const eventsByDay = buildEventDayMap(viewYear, viewMonth);

  // Leading cells from previous month
  for (let i = firstDay - 1; i >= 0; i--) {
    grid.appendChild(makeCell(daysInPrevMonth - i, true, [], false));
  }

  // Days in current month
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = (
      d === today.getDate() &&
      viewMonth === today.getMonth() &&
      viewYear === today.getFullYear()
    );
    grid.appendChild(makeCell(d, false, eventsByDay[d] || [], isToday));
  }

  // Trailing cells to complete the last row
  const totalCells = firstDay + daysInMonth;
  const trailing = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let d = 1; d <= trailing; d++) {
    grid.appendChild(makeCell(d, true, [], false));
  }
}

function makeCell(dayNum, otherMonth, events, isToday) {
  const cell = document.createElement('div');
  cell.className = 'cal-day' +
    (otherMonth  ? ' other-month' : '') +
    (isToday     ? ' today'       : '') +
    (events.length ? ' has-event' : '');
  cell.setAttribute('role', 'gridcell');

  const num = document.createElement('span');
  num.className = 'day-num';
  num.textContent = dayNum;
  cell.appendChild(num);

  if (!otherMonth) {
    const MAX_VISIBLE = 2;
    events.slice(0, MAX_VISIBLE).forEach(ev => {
      const pill = document.createElement('span');
      pill.className = 'event-pill';
      pill.textContent = ev.summary || 'Event';
      pill.addEventListener('click', () => openModal(ev));
      cell.appendChild(pill);
    });
    if (events.length > MAX_VISIBLE) {
      const more = document.createElement('span');
      more.className = 'more-indicator';
      more.textContent = `+${events.length - MAX_VISIBLE} more`;
      cell.appendChild(more);
    }
  }

  return cell;
}

/* ── Upcoming events list (next 30 days from today) ── */

function renderUpcomingList() {
  const list = document.getElementById('events-list');
  list.innerHTML = '';

  const now = new Date();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + 60);

  const upcoming = allEvents
    .filter(ev => {
      const start = eventStart(ev);
      return start >= now && start <= cutoff;
    })
    .sort((a, b) => eventStart(a) - eventStart(b));

  if (upcoming.length === 0) {
    list.innerHTML = '<p class="no-events">No upcoming gatherings — check back soon.</p>';
    return;
  }

  upcoming.forEach(ev => {
    const start = eventStart(ev);
    const card = document.createElement('div');
    card.className = 'event-card';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `${ev.summary}, ${formatDate(start)}`);

    const month = start.toLocaleString('default', { month: 'short' }).toUpperCase();
    const day   = start.getDate();

    card.innerHTML = `
      <div class="event-date-badge">
        <span class="badge-month">${month}</span>
        <span class="badge-day">${day}</span>
      </div>
      <div class="event-info">
        <div class="event-title">${ev.summary || 'Gathering'}</div>
        <div class="event-meta">${formatTime(ev)} · ${ev.location || 'Location TBA'}</div>
        ${ev.description ? `<div class="event-desc-preview">${stripHtml(ev.description)}</div>` : ''}
      </div>
    `;

    card.addEventListener('click', () => openModal(ev));
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') openModal(ev); });
    list.appendChild(card);
  });
}

/* ═══════════════════════════════════════════════════════════
   MODAL
═══════════════════════════════════════════════════════════ */

function openModal(ev) {
  const start = eventStart(ev);
  document.getElementById('modal-eyebrow').textContent =
    start.toLocaleString('default', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  document.getElementById('modal-title').textContent    = ev.summary || 'Gathering';
  document.getElementById('modal-time').textContent     = formatTime(ev);
  document.getElementById('modal-location').textContent = ev.location || '';
  document.getElementById('modal-desc').textContent     = ev.description ? stripHtml(ev.description) : '';

  // Google Calendar "Add to Calendar" link
  const gcalBase = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
  const gcalParams = new URLSearchParams({
    text:     ev.summary || 'Gathering',
    dates:    `${toGcalDate(ev.start)}/${toGcalDate(ev.end)}`,
    details:  ev.description || '',
    location: ev.location || '',
  });
  document.getElementById('modal-gcal-link').href = `${gcalBase}&${gcalParams}`;

  const modal = document.getElementById('event-modal');
  modal.classList.add('open');
  document.getElementById('modal-close').focus();
}

function closeModal() {
  document.getElementById('event-modal').classList.remove('open');
}

/* ═══════════════════════════════════════════════════════════
   MONTH NAVIGATION
═══════════════════════════════════════════════════════════ */

function shiftMonth(delta) {
  viewMonth += delta;
  if (viewMonth > 11) { viewMonth = 0;  viewYear++; }
  if (viewMonth < 0)  { viewMonth = 11; viewYear--; }
  renderAll();
}

/* ═══════════════════════════════════════════════════════════
   LOADING / ERROR STATES
═══════════════════════════════════════════════════════════ */

function showSkeletonGrid() {
  const grid = document.getElementById('cal-grid');
  grid.innerHTML = '';
  for (let i = 0; i < 35; i++) {
    const cell = document.createElement('div');
    cell.className = 'skeleton-day';
    cell.innerHTML = '<div class="skeleton-num"></div><div class="skeleton-bar"></div>';
    grid.appendChild(cell);
  }
}

function showGridError(message) {
  const grid = document.getElementById('cal-grid');
  grid.innerHTML = `<div class="cal-state error">Could not load events: ${message}</div>`;
}

function showSetupBanner() {
  const banner = document.createElement('div');
  banner.className = 'setup-banner';
  banner.innerHTML = `
    <p>
      ✦ &nbsp;Demo mode — showing placeholder events &nbsp;✦<br>
      Add your <code>GOOGLE_API_KEY</code> and <code>GOOGLE_CALENDAR_ID</code>
      to <code>scripts/calendar.js</code> and set <code>DEMO_MODE = false</code>
      to connect your live Google Calendar.
    </p>
  `;
  const header = document.querySelector('.cal-header');
  header.insertAdjacentElement('afterend', banner);
}

/* ═══════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════ */

/** Build a map of { dayNumber: [events] } for a given year/month */
function buildEventDayMap(year, month) {
  const map = {};
  allEvents.forEach(ev => {
    const start = eventStart(ev);
    if (start.getFullYear() === year && start.getMonth() === month) {
      const d = start.getDate();
      if (!map[d]) map[d] = [];
      map[d].push(ev);
    }
  });
  return map;
}

/** Get JS Date from event start (handles dateTime and all-day date) */
function eventStart(ev) {
  return new Date(ev.start?.dateTime || ev.start?.date || Date.now());
}

/** Format readable date */
function formatDate(date) {
  return date.toLocaleString('default', { weekday: 'short', month: 'long', day: 'numeric' });
}

/** Format time range string */
function formatTime(ev) {
  if (ev.start?.date && !ev.start?.dateTime) return 'All day';
  const s = new Date(ev.start.dateTime);
  const e = new Date(ev.end?.dateTime || ev.start.dateTime);
  const fmt = d => d.toLocaleTimeString('default', { hour: 'numeric', minute: '2-digit' });
  return `${fmt(s)} – ${fmt(e)}`;
}

/** Convert event start/end to Google Calendar date format YYYYMMDDTHHMMSSZ */
function toGcalDate(obj) {
  if (!obj) return '';
  if (obj.date) return obj.date.replace(/-/g, '');
  return new Date(obj.dateTime).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/** Strip basic HTML tags from descriptions */
function stripHtml(str) {
  return str.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").trim();
}