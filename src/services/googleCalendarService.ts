import { GoogleAuthProvider, signInWithPopup, linkWithPopup, reauthenticateWithPopup } from 'firebase/auth';
import { auth } from '../lib/firebase';

// In-memory cache for the Google Calendar OAuth Access Token and Email
let cachedGCalToken: string | null = null;
let cachedGCalEmail: string | null = null;

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  htmlLink?: string;
}

/**
 * Returns the cached token if available
 */
export const getGoogleAccessToken = (): string | null => {
  return cachedGCalToken;
};

/**
 * Returns the connected Google email if available
 */
export const getGoogleUserEmail = (): string | null => {
  return cachedGCalEmail || localStorage.getItem('office_gcal_email');
};

/**
 * Checks if Google Calendar integration is enabled by the user
 */
export const isGoogleCalendarEnabled = (): boolean => {
  return localStorage.getItem('office_gcal_synced') === 'true';
};

/**
 * Authenticates the user with Google and requests Calendar scopes
 */
export const authenticateGoogleCalendar = async (): Promise<{ token: string; email: string }> => {
  const provider = new GoogleAuthProvider();
  // Request full calendar management scopes as configured in Google Developer Console / IA Studio
  provider.addScope('https://www.googleapis.com/auth/calendar');
  provider.addScope('https://www.googleapis.com/auth/calendar.events');

  try {
    let result: any;
    const currentUser = auth.currentUser;
    if (currentUser) {
      const isGoogleLinked = currentUser.providerData.some(p => p.providerId === 'google.com');
      if (isGoogleLinked) {
        try {
          result = await reauthenticateWithPopup(currentUser, provider);
        } catch (reauthErr) {
          console.warn('Reautenticação falhou, tentando login direto:', reauthErr);
          result = await signInWithPopup(auth, provider);
        }
      } else {
        try {
          result = await linkWithPopup(currentUser, provider);
        } catch (linkErr: any) {
          console.warn('Link falhou, tentando login direto:', linkErr);
          result = await signInWithPopup(auth, provider);
        }
      }
    } else {
      result = await signInWithPopup(auth, provider);
    }

    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    if (!credential?.accessToken) {
      throw new Error('Não foi possível obter o token de acesso do Google.');
    }

    cachedGCalToken = credential.accessToken;
    cachedGCalEmail = result.user.email || currentUser?.email || 'lfquadrosdecorativos@gmail.com';

    // Persist active integration flags and the connected email (non-sensitive info)
    localStorage.setItem('office_gcal_synced', 'true');
    localStorage.setItem('office_gcal_email', cachedGCalEmail);

    return { token: cachedGCalToken, email: cachedGCalEmail };
  } catch (error) {
    console.error('Erro na autenticação do Google Calendar:', error);
    throw error;
  }
};

/**
 * Disconnects the Google Calendar integration
 */
export const disconnectGoogleCalendar = () => {
  cachedGCalToken = null;
  cachedGCalEmail = null;
  localStorage.removeItem('office_gcal_synced');
  localStorage.removeItem('office_gcal_email');
};

/**
 * Helper to build timezone-aware ISO string for start/end times
 */
const formatDateTimeISO = (dateStr: string, timeStr?: string): string => {
  if (!timeStr) {
    return `${dateStr}T09:00:00`;
  }
  return `${dateStr}T${timeStr}:00`;
};

/**
 * Fetches events from the user's Primary Google Calendar
 */
export const fetchGoogleEvents = async (timeMin?: string, timeMax?: string): Promise<GoogleCalendarEvent[]> => {
  const token = getGoogleAccessToken();
  if (!token) {
    throw new Error('Sessão do Google expirada. Reautorize para sincronizar.');
  }

  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');
  url.searchParams.set('maxResults', '150');

  if (timeMin) {
    url.searchParams.set('timeMin', timeMin);
  } else {
    // Default to fetch events starting from 3 months ago
    const past = new Date();
    past.setMonth(past.getMonth() - 3);
    url.searchParams.set('timeMin', past.toISOString());
  }

  if (timeMax) {
    url.searchParams.set('timeMax', timeMax);
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Clear token if invalid/expired
      cachedGCalToken = null;
      throw new Error('Token expirado. Por favor, reautorize a conexão.');
    }
    const errText = await response.text();
    throw new Error(`Erro na API do Google Calendar: ${errText}`);
  }

  const data = await response.json();
  return (data.items || []) as GoogleCalendarEvent[];
};

/**
 * Creates a new event in the Google Calendar
 */
export const createGoogleEvent = async (
  summary: string,
  description: string,
  dateStr: string,
  timeStr?: string,
  durationMinutes = 60
): Promise<GoogleCalendarEvent> => {
  const token = getGoogleAccessToken();
  if (!token) {
    throw new Error('Sessão do Google expirada. Reautorize para sincronizar.');
  }

  // Calculate start and end datetimes
  const startISO = formatDateTimeISO(dateStr, timeStr);
  const startDate = new Date(startISO);
  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
  const endISO = endDate.toISOString();

  const body: any = {
    summary,
    description: `${description}\n\n[Criado via Meu Escritório Online]`,
    start: {
      dateTime: startDate.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: endISO,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  };

  // For all-day events (if no time specified, use date-only structures)
  if (!timeStr) {
    const nextDay = new Date(startDate);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayStr = nextDay.toISOString().split('T')[0];

    body.start = { date: dateStr };
    body.end = { date: nextDayStr };
  }

  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Erro ao criar evento no Google: ${errText}`);
  }

  return await response.json() as GoogleCalendarEvent;
};

/**
 * Updates an existing event in the Google Calendar
 */
export const updateGoogleEvent = async (
  eventId: string,
  summary: string,
  description: string,
  dateStr: string,
  timeStr?: string,
  durationMinutes = 60
): Promise<GoogleCalendarEvent> => {
  const token = getGoogleAccessToken();
  if (!token) {
    throw new Error('Sessão do Google expirada. Reautorize para sincronizar.');
  }

  const startISO = formatDateTimeISO(dateStr, timeStr);
  const startDate = new Date(startISO);
  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
  const endISO = endDate.toISOString();

  const body: any = {
    summary,
    description: `${description}\n\n[Sincronizado via Meu Escritório Online]`,
    start: {
      dateTime: startDate.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: endISO,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  };

  if (!timeStr) {
    const nextDay = new Date(startDate);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayStr = nextDay.toISOString().split('T')[0];

    body.start = { date: dateStr };
    body.end = { date: nextDayStr };
  }

  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Erro ao atualizar evento no Google: ${errText}`);
  }

  return await response.json() as GoogleCalendarEvent;
};

/**
 * Deletes an event from the Google Calendar
 */
export const deleteGoogleEvent = async (eventId: string): Promise<void> => {
  const token = getGoogleAccessToken();
  if (!token) {
    throw new Error('Sessão do Google expirada. Reautorize para sincronizar.');
  }

  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    const errText = await response.text();
    throw new Error(`Erro ao excluir evento no Google: ${errText}`);
  }
};
