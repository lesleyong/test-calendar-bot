import Database from 'better-sqlite3';
import { Event, Settings } from './types';

export function initDb(dbPath: string): Database.Database {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      start_date  TEXT    NOT NULL,
      start_time  TEXT,
      end_date    TEXT,
      end_time    TEXT,
      description TEXT,
      created_by  INTEGER NOT NULL,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      id              INTEGER PRIMARY KEY CHECK (id = 1),
      reminder_days   INTEGER NOT NULL DEFAULT 3,
      nudge_weekday   TEXT,
      nudge_time      TEXT,
      nudge_enabled   INTEGER NOT NULL DEFAULT 0
    );

    INSERT OR IGNORE INTO settings (id) VALUES (1);

    CREATE TABLE IF NOT EXISTS reminder_log (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id  INTEGER REFERENCES events(id) ON DELETE CASCADE,
      sent_at   TEXT    NOT NULL DEFAULT (datetime('now')),
      type      TEXT    NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
    CREATE INDEX IF NOT EXISTS idx_reminder_log_event ON reminder_log(event_id, type);
  `);

  // Migrations for existing databases
  try { db.exec('ALTER TABLE events RENAME COLUMN event_date TO start_date'); } catch {}
  for (const col of ['start_time TEXT', 'end_date TEXT', 'end_time TEXT']) {
    try { db.exec(`ALTER TABLE events ADD COLUMN ${col}`); } catch {}
  }

  return db;
}

export function insertEvent(
  db: Database.Database,
  name: string,
  start_date: string,
  start_time: string | null,
  end_date: string | null,
  end_time: string | null,
  description: string | null,
  created_by: number
): Event {
  const stmt = db.prepare(
    'INSERT INTO events (name, start_date, start_time, end_date, end_time, description, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  const info = stmt.run(name, start_date, start_time, end_date, end_time, description, created_by);
  return getEventById(db, info.lastInsertRowid as number)!;
}

export function getUpcomingEvents(db: Database.Database): Event[] {
  return db
    .prepare("SELECT * FROM events WHERE start_date >= date('now') ORDER BY start_date ASC, start_time ASC")
    .all() as Event[];
}

export function getEventById(db: Database.Database, id: number): Event | undefined {
  return db.prepare('SELECT * FROM events WHERE id = ?').get(id) as Event | undefined;
}

export function deleteEvent(db: Database.Database, id: number): boolean {
  const info = db.prepare('DELETE FROM events WHERE id = ?').run(id);
  return info.changes > 0;
}

export function getSettings(db: Database.Database): Settings {
  return db.prepare('SELECT * FROM settings WHERE id = 1').get() as Settings;
}

export function updateReminderDays(db: Database.Database, days: number): void {
  db.prepare('UPDATE settings SET reminder_days = ? WHERE id = 1').run(days);
}

export function updateNudge(
  db: Database.Database,
  weekday: string,
  time: string
): void {
  db.prepare(
    'UPDATE settings SET nudge_weekday = ?, nudge_time = ?, nudge_enabled = 1 WHERE id = 1'
  ).run(weekday, time);
}

export function getEventsOnDate(db: Database.Database, date: string): Event[] {
  return db
    .prepare('SELECT * FROM events WHERE start_date = ?')
    .all(date) as Event[];
}

export function hasReminderBeenSent(
  db: Database.Database,
  eventId: number | null,
  type: 'pre_event' | 'nudge'
): boolean {
  if (type === 'nudge') {
    // Check if a nudge was already sent today
    const row = db
      .prepare(
        "SELECT id FROM reminder_log WHERE type = 'nudge' AND date(sent_at) = date('now')"
      )
      .get();
    return row !== undefined;
  }
  const row = db
    .prepare('SELECT id FROM reminder_log WHERE event_id = ? AND type = ?')
    .get(eventId, type);
  return row !== undefined;
}

export function logReminder(
  db: Database.Database,
  eventId: number | null,
  type: 'pre_event' | 'nudge'
): void {
  db.prepare('INSERT INTO reminder_log (event_id, type) VALUES (?, ?)').run(eventId, type);
}
