# Telegram Event Reminder Bot — Product Requirements Document

## Overview

A Telegram bot for a single group chat that helps members save upcoming events and sends automated reminders. The bot eliminates the problem of forgetting to book the next event by proactively nudging the group when no upcoming events are scheduled.

---

## Problem Statement

Group chats often lose track of planned events in the noise of daily messages. Two recurring pain points:
1. Members forget an event is coming up until it's too late to prepare
2. After an event passes, nobody remembers to book the next one

---

## Goals

- Provide a simple, command-driven interface for managing group events
- Send automated reminders N days before each event
- Send a configurable weekly nudge when no upcoming events are booked
- Require minimal setup and run reliably on a self-hosted Docker container

---

## Non-Goals

- Multi-group support (single group only)
- Calendar integrations (Google Calendar, iCal)
- Event RSVP / attendance tracking
- Recurring events

---

## User Personas

**Group member** — adds and views events using simple commands
**Group admin** — configures reminder timing and nudge schedule

---

## Features

### 1. Event Management

| Command | Description |
|---|---|
| `/addevent name=... date=... [time=...] [end-date=...] [end-time=...] [desc=...]` | Add event |
| `/listevents` | List all upcoming events (sorted by start date/time) |
| `/deleteevent <id>` | Delete an event by its ID |

**Rules:**
- Any group member can add or delete events
- Start date must be today or in the future
- Start time, end date, end time, and description are all optional
- End date must be on or after start date

### 2. Pre-Event Reminders

- The bot sends a message to the group N days before each scheduled event
- Default: 3 days before
- Admin configures with `/setreminder <days>` (e.g. `/setreminder 7`)
- Reminders are deduplication-safe — only sent once even if the bot restarts

### 3. Booking Nudge

- If no upcoming events exist, the bot sends a nudge on a configurable day and time
- Admin configures with `/setnudge <weekday> <HH:MM>` (e.g. `/setnudge friday 18:00`)
- Only fires once per day; skipped if upcoming events exist
- Disabled by default; enabled automatically when `/setnudge` is first set

### 4. Configuration & Info

| Command | Description | Access |
|---|---|---|
| `/settings` | Show current reminder days, nudge day/time | Anyone |
| `/setreminder <days>` | Set pre-event reminder offset | Admin only |
| `/setnudge <weekday> <HH:MM>` | Set nudge schedule | Admin only |
| `/start` | Welcome message, displays help | Anyone |

### 5. Links

| Command | Description |
|---|---|
| `/links` | Post a list of useful links as tappable buttons |

- Accessible by any group member
- Links are hardcoded in source; changing them requires a redeploy
- Each link opens in a new browser page via Telegram inline URL button

**Links:**
- ActiveSG — https://activesg.gov.sg/home
- Play\!Pickle — https://mobileapp.courtreserve.com/Online/Portal/Navigate/13455?nodeItem=9

---

## Technical Requirements

| Requirement | Choice |
|---|---|
| Language | TypeScript (Node.js) |
| Bot framework | grammY |
| Database | SQLite (better-sqlite3) |
| Scheduler | node-cron |
| Deployment | Railway (production) / Docker + docker-compose (local) |
| Persistence | Railway Volume mounted at `/app/data` (survives deploys and restarts) |

---

## Data Model

### Events
- `id` — auto-increment primary key
- `name` — event title
- `start_date` — date in YYYY-MM-DD format (required)
- `start_time` — time in HH:MM format (optional)
- `end_date` — date in YYYY-MM-DD format (optional)
- `end_time` — time in HH:MM format (optional)
- `description` — optional freetext
- `created_by` — Telegram user ID of creator
- `created_at` — ISO timestamp

### Settings (single row)
- `reminder_days` — days before event to send reminder (default: 3)
- `nudge_weekday` — day of week for nudge (e.g. `friday`)
- `nudge_time` — time of nudge in HH:MM format
- `nudge_enabled` — boolean flag

### Reminder Log
- Tracks which reminders have been sent to prevent duplicates on restart
- `event_id`, `type` (`pre_event` or `nudge`), `sent_at`

---

## Scheduler Behaviour

**Pre-event reminder** fires daily at 09:00 (configured timezone):
- Computes `today + reminder_days`
- Sends a reminder for each event on that date (if not already sent)

**Nudge check** runs every minute:
- Skipped if nudge not configured or upcoming events exist
- Fires once per day at the configured weekday + time

---

## Setup

### Local (Docker)

1. Create a bot via [@BotFather](https://t.me/BotFather) and get the `BOT_TOKEN`
2. Add the bot to your group and grant it admin privileges (needed to check member status)
3. Copy `.env.example` to `.env`, fill in `BOT_TOKEN` and `TZ`
4. Run `docker compose up` — on first `/start`, the bot logs the group's chat ID
5. Set `GROUP_CHAT_ID` in `.env` and restart: `docker compose restart`

### Production (Railway)

1. Create a Railway project and add a Volume, mounted at `/app/data`
2. Set environment variables in Railway: `BOT_TOKEN`, `GROUP_CHAT_ID`, `TZ`, `DB_PATH=/app/data/bot.db`
3. Deploy from the repo — Railway builds via the `Dockerfile` and runs the bot
4. The SQLite database persists on the Railway Volume across all deploys and restarts

---

## Environment Variables

```bash
BOT_TOKEN=          # Required. From @BotFather
GROUP_CHAT_ID=      # Required. Negative number (e.g. -1001234567890)
DB_PATH=/app/data/bot.db  # Path inside container (default fine)
TZ=Asia/Singapore   # IANA timezone for cron jobs
```

---

## Acceptance Criteria

- [ ] `/addevent` works in both inline and guided modes
- [ ] `/listevents` shows upcoming events sorted by date
- [ ] `/deleteevent` removes the correct event
- [ ] Pre-event reminder fires exactly once per event at the right time
- [ ] Nudge fires on the right weekday/time only when no events are booked
- [ ] Nudge does not fire if upcoming events exist
- [ ] `/setreminder` and `/setnudge` reject non-admin users
- [ ] Bot survives container restart with all data intact
- [ ] No duplicate reminders after restart
- [ ] `/links` replies with inline URL buttons for ActiveSG and Play!Pickle
