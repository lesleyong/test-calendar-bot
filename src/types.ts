export interface Event {
  id: number;
  name: string;
  start_date: string;       // YYYY-MM-DD
  start_time: string | null; // HH:MM (24h), optional
  end_date: string | null;   // YYYY-MM-DD, optional
  end_time: string | null;   // HH:MM (24h), optional
  description: string | null;
  created_by: number;
  created_at: string;
}

export interface Settings {
  id: 1;
  reminder_days: number;
  nudge_weekday: string | null; // 'monday' | 'tuesday' | ... | 'sunday'
  nudge_time: string | null; // 'HH:MM'
  nudge_enabled: 0 | 1;
}

export interface AddEventSession {
  step: 'name' | 'date' | 'description';
  name?: string;
  date?: string;
}
