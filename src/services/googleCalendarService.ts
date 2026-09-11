import { GoogleAuthProvider, signInWithPopup, linkWithPopup, reauthenticateWithPopup } from 'firebase/auth';
import { auth } from '../lib/firebase';

import { doc, onSnapshot, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

// In-memory cache for the Google Calendar OAuth Access Token and Email
let cachedGCalToken: string | null = null;
let cachedGCalEmail: string | null = null;

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  calendarId?: string;
  calendarTitle?: string;
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

export interface GoogleTaskItem {
  id: string;
  title: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string; // RFC 3339 timestamp (e.g. 2026-09-11T00:00:00.000Z)
  completed?: string;
  updated?: string;
  listId?: string;
  listTitle?: string;
  webViewLink?: string;
}

/**
 * Returns the cached token if available, checking session/local storage across page refreshes
 */
export const getGoogleAccessToken = (): string | null => {
  if (cachedGCalToken) return cachedGCalToken;
  try {
    const stored = sessionStorage.getItem('office_gcal_token') || localStorage.getItem('office_gcal_token');
    if (stored) {
      cachedGCalToken = stored;
      return stored;
    }
  } catch {}
  return null;
};

/**
 * Attempts to restore token from Firestore if local storage is missing (e.g. iframe refresh)
 */
export const restoreGoogleTokenFromCloud = async (): Promise<string | null> => {
  if (cachedGCalToken) return cachedGCalToken;
  try {
    const snap = await getDoc(doc(db, 'system_integrations', 'google_calendar'));
    if (snap.exists()) {
      const data = snap.data();
      if (data.token && data.synced) {
        cachedGCalToken = data.token;
        if (data.email) cachedGCalEmail = data.email;
        try {
          sessionStorage.setItem('office_gcal_token', data.token);
          localStorage.setItem('office_gcal_token', data.token);
          localStorage.setItem('office_gcal_synced', 'true');
          if (data.email) localStorage.setItem('office_gcal_email', data.email);
        } catch {}
        return data.token;
      }
    }
  } catch (e) {
    console.warn('Could not restore token from cloud:', e);
  }
  return null;
};

/**
 * Returns the connected Google email if available
 */
export const getGoogleUserEmail = (): string | null => {
  if (cachedGCalEmail) return cachedGCalEmail;
  try {
    const stored = sessionStorage.getItem('office_gcal_email') || localStorage.getItem('office_gcal_email');
    if (stored) {
      cachedGCalEmail = stored;
      return stored;
    }
  } catch {}
  return null;
};

/**
 * Checks if Google Calendar integration is enabled by the user
 */
export const isGoogleCalendarEnabled = (): boolean => {
  try {
    return localStorage.getItem('office_gcal_synced') === 'true';
  } catch {
    return false;
  }
};

/**
 * Authenticates the user with Google and requests Calendar & Tasks scopes
 */
export const authenticateGoogleCalendar = async (): Promise<{ token: string; email: string }> => {
  // Strategy 1: Attempt direct Firebase popup first (fastest, cleanest in modern browsers)
  try {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/calendar');
    provider.addScope('https://www.googleapis.com/auth/calendar.events');
    provider.addScope('https://www.googleapis.com/auth/tasks');
    provider.addScope('https://www.googleapis.com/auth/userinfo.email');
    provider.setCustomParameters({ 
      prompt: 'consent',
      login_hint: 'lfquadrosdecorativos@gmail.com'
    });

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;
    const email = result.user?.email || 'lfquadrosdecorativos@gmail.com';

    if (token) {
      cachedGCalToken = token;
      cachedGCalEmail = email;
      try {
        sessionStorage.setItem('office_gcal_token', token);
        localStorage.setItem('office_gcal_token', token);
        localStorage.setItem('office_gcal_synced', 'true');
        localStorage.setItem('office_gcal_email', email);
      } catch {}

      try {
        setDoc(doc(db, 'system_integrations', 'google_calendar'), {
          token,
          email,
          updatedAt: Date.now(),
          synced: true,
        }, { merge: true }).catch(() => {});
      } catch {}

      return { token, email };
    }
  } catch (directErr: any) {
    console.warn('Direct popup attempt redirected to proxy popup:', directErr?.message || directErr);
  }

  // Strategy 2: Popup proxy with cross-channel Firestore & postMessage listeners
  return new Promise((resolve, reject) => {
    const sessionId = 'gcal_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    
    // Choose proxy base domain
    const isLocalOrPreview = window.location.hostname.includes('ais-pre-') || 
                             window.location.hostname.includes('localhost') || 
                             window.location.hostname.includes('ais-dev-');

    const baseOrigin = isLocalOrPreview 
      ? window.location.origin 
      : 'https://ais-pre-su4zqshj47o55562to2iuv-729561127771.us-east1.run.app';

    const proxyUrl = `${baseOrigin}/oauth-proxy?session=${sessionId}`;

    let isFinished = false;
    let unsubscribeFirestore: (() => void) | null = null;
    let timeoutTimer: any = null;

    const cleanup = () => {
      if (unsubscribeFirestore) {
        try { unsubscribeFirestore(); } catch {}
      }
      if (timeoutTimer) {
        clearTimeout(timeoutTimer);
      }
      window.removeEventListener('message', messageListener);
    };

    const handleSuccess = (token: string, email: string) => {
      if (isFinished) return;
      isFinished = true;
      cleanup();

      cachedGCalToken = token;
      cachedGCalEmail = email || 'lfquadrosdecorativos@gmail.com';
      try {
        sessionStorage.setItem('office_gcal_token', token);
        localStorage.setItem('office_gcal_token', token);
        localStorage.setItem('office_gcal_synced', 'true');
        localStorage.setItem('office_gcal_email', cachedGCalEmail);
      } catch {}

      // Persist to Firestore for durable cross-session sync
      try {
        setDoc(doc(db, 'system_integrations', 'google_calendar'), {
          token,
          email: cachedGCalEmail,
          updatedAt: Date.now(),
          synced: true,
        }, { merge: true }).catch(() => {});
      } catch {}

      if (popup && !popup.closed) {
        try { popup.close(); } catch {}
      }

      resolve({ token, email: cachedGCalEmail });
    };

    const handleError = (errorMsg: string) => {
      if (isFinished) return;
      isFinished = true;
      cleanup();

      if (popup && !popup.closed) {
        try { popup.close(); } catch {}
      }

      reject(new Error(errorMsg));
    };

    // Channel 1: postMessage listener
    const messageListener = (event: MessageEvent) => {
      if (event.data && event.data.type === 'OAUTH_SUCCESS' && event.data.token) {
        handleSuccess(event.data.token, event.data.email);
      } else if (event.data && event.data.type === 'OAUTH_ERROR') {
        handleError(event.data.error || 'Falha na autenticação do Google.');
      }
    };
    window.addEventListener('message', messageListener);

    // Channel 2: Firestore snapshot listener
    try {
      const sessionDocRef = doc(db, 'oauth_sessions', sessionId);
      unsubscribeFirestore = onSnapshot(sessionDocRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.status === 'success' && data.token) {
            handleSuccess(data.token, data.email);
          } else if (data.status === 'error') {
            handleError(data.error || 'Erro na autenticação.');
          }
        }
      });
    } catch (fsErr) {
      console.warn('Firestore snapshot listener failed to attach:', fsErr);
    }

    // Open popup directly within the click event
    const width = 500;
    const height = 650;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      proxyUrl,
      'GoogleOAuthPopup',
      `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes,scrollbars=yes`
    );

    if (!popup) {
      cleanup();
      reject(new Error('Bloqueador de popups ativo. Por favor, permita popups para este site ou clique no botão para autorizar.'));
      return;
    }

    // Maximum wait time: 2 minutes
    timeoutTimer = setTimeout(() => {
      if (!isFinished) {
        handleError('Tempo limite para login do Google excedido. Clique em Conectar novamente.');
      }
    }, 120000);
  });
};

/**
 * Disconnects the Google Calendar integration
 */
export const disconnectGoogleCalendar = () => {
  cachedGCalToken = null;
  cachedGCalEmail = null;
  try {
    sessionStorage.removeItem('office_gcal_token');
    localStorage.removeItem('office_gcal_token');
    localStorage.removeItem('office_gcal_synced');
    localStorage.removeItem('office_gcal_email');
  } catch {}
  try {
    deleteDoc(doc(db, 'system_integrations', 'google_calendar')).catch(() => {});
  } catch {}
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
 * Fetches events across ALL user calendars (Primary + Secondary/Team calendars)
 * using a comprehensive date range and proper pagination so no events are lost.
 */
export const fetchGoogleEvents = async (timeMin?: string, timeMax?: string): Promise<GoogleCalendarEvent[]> => {
  let token = getGoogleAccessToken();
  if (!token) {
    // Attempt cloud recovery
    token = await restoreGoogleTokenFromCloud();
  }
  if (!token) {
    // Fallback to cached events if available without crashing
    try {
      const cached = localStorage.getItem('office_cached_gcal_events');
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  }

  // Broad date window: from 1 year ago to 2 years in the future
  const past = new Date();
  past.setFullYear(past.getFullYear() - 1);
  const future = new Date();
  future.setFullYear(future.getFullYear() + 2);

  const finalTimeMin = timeMin || past.toISOString();
  const finalTimeMax = timeMax || future.toISOString();

  // 1. Discover all active calendars in the user's Google account
  const calendarMap = new Map<string, { id: string; summary?: string }>();
  // Always include primary calendar
  calendarMap.set('primary', { id: 'primary', summary: 'Principal' });
  if (cachedGCalEmail) {
    calendarMap.set(cachedGCalEmail, { id: cachedGCalEmail, summary: 'Principal' });
  }

  try {
    const listRes = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=reader', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (listRes.ok) {
      const listData = await listRes.json();
      if (listData.items && Array.isArray(listData.items) && listData.items.length > 0) {
        listData.items.forEach((c: any) => {
          if (c.id && !c.deleted) {
            calendarMap.set(c.id, { id: c.id, summary: c.summary || c.id });
          }
        });
      }
    } else if (listRes.status === 401) {
      // Try restoring once from cloud
      const refreshedToken = await restoreGoogleTokenFromCloud();
      if (refreshedToken && refreshedToken !== token) {
        token = refreshedToken;
      }
    }
  } catch (err: any) {
    console.warn('Could not list all calendars, continuing with primary:', err);
  }

  const targetCalendars = Array.from(calendarMap.values());

  // 2. Fetch events from all discovered calendars in parallel with pagination
  const allEventsMap = new Map<string, GoogleCalendarEvent>();

  await Promise.all(
    targetCalendars.map(async (cal) => {
      try {
        let pageToken: string | undefined = undefined;
        let pageCount = 0;

        do {
          const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events`);
          url.searchParams.set('singleEvents', 'true');
          url.searchParams.set('orderBy', 'startTime');
          url.searchParams.set('maxResults', '250');
          url.searchParams.set('timeMin', finalTimeMin);
          url.searchParams.set('timeMax', finalTimeMax);
          if (pageToken) {
            url.searchParams.set('pageToken', pageToken);
          }

          const response = await fetch(url.toString(), {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const data = await response.json();
            if (data.items && Array.isArray(data.items)) {
              for (const item of data.items) {
                if (item.id && item.status !== 'cancelled') {
                  allEventsMap.set(item.id, {
                    ...item,
                    calendarId: cal.id,
                    calendarTitle: cal.summary,
                  });
                }
              }
            }
            pageToken = data.nextPageToken;
            pageCount++;
          } else {
            break;
          }
        } while (pageToken && pageCount < 6); // Fetch up to 1500 items per calendar
      } catch (calErr: any) {
        console.warn(`Error fetching events for calendar ${cal.id}:`, calErr);
      }
    })
  );

  const eventList = Array.from(allEventsMap.values());
  if (eventList.length > 0) {
    try {
      localStorage.setItem('office_cached_gcal_events', JSON.stringify(eventList));
    } catch {}
  } else {
    // If live returned empty due to network glitch, try reading cache
    try {
      const cached = localStorage.getItem('office_cached_gcal_events');
      if (cached) return JSON.parse(cached);
    } catch {}
  }

  return eventList;
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
  let token = getGoogleAccessToken();
  if (!token) {
    token = await restoreGoogleTokenFromCloud();
  }
  if (!token) {
    throw new Error('Sessão do Google expirada. Reautorize para sincronizar.');
  }

  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok && response.status !== 404 && response.status !== 410) {
    const errText = await response.text();
    throw new Error(`Erro ao excluir evento no Google: ${errText}`);
  }
};

// ==========================================
// GOOGLE TASKS API INTEGRATION
// ==========================================

/**
 * Fetches tasks across all Google Task Lists for the user
 */
export const fetchGoogleTasks = async (): Promise<GoogleTaskItem[]> => {
  let token = getGoogleAccessToken();
  if (!token) {
    token = await restoreGoogleTokenFromCloud();
  }
  if (!token) {
    return [];
  }

  const taskListMap = new Map<string, string>();
  taskListMap.set('@default', 'Minhas Tarefas');

  // 1. Discover all task lists
  try {
    const listsRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (listsRes.ok) {
      const listsData = await listsRes.json();
      if (listsData.items && Array.isArray(listsData.items)) {
        listsData.items.forEach((l: any) => {
          if (l.id) {
            taskListMap.set(l.id, l.title || 'Tarefas');
          }
        });
      }
    } else if (listsRes.status === 401) {
      const refreshedToken = await restoreGoogleTokenFromCloud();
      if (refreshedToken && refreshedToken !== token) {
        token = refreshedToken;
      }
    } else if (listsRes.status === 403) {
      console.warn('Google Tasks scope may not be granted on this token yet.');
    }
  } catch (err: any) {
    console.warn('Could not list Google Task lists:', err);
  }

  const allTasks: GoogleTaskItem[] = [];
  const listEntries = Array.from(taskListMap.entries());

  // 2. Fetch tasks from all discovered lists
  await Promise.all(
    listEntries.map(async ([listId, listTitle]) => {
      try {
        let pageToken: string | undefined = undefined;
        let count = 0;

        do {
          const url = new URL(`https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(listId)}/tasks`);
          url.searchParams.set('showCompleted', 'true');
          url.searchParams.set('showHidden', 'true');
          url.searchParams.set('maxResults', '100');
          if (pageToken) {
            url.searchParams.set('pageToken', pageToken);
          }

          const res = await fetch(url.toString(), {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (res.ok) {
            const data = await res.json();
            if (data.items && Array.isArray(data.items)) {
              for (const item of data.items) {
                if (item.id && !item.deleted && (item.title || item.notes)) {
                  allTasks.push({
                    id: item.id,
                    title: item.title || 'Tarefa sem título',
                    notes: item.notes,
                    status: item.status === 'completed' ? 'completed' : 'needsAction',
                    due: item.due,
                    completed: item.completed,
                    updated: item.updated,
                    listId,
                    listTitle,
                    webViewLink: item.webViewLink,
                  });
                }
              }
            }
            pageToken = data.nextPageToken;
            count++;
          } else {
            break;
          }
        } while (pageToken && count < 5);
      } catch (err: any) {
        console.warn(`Error fetching tasks for list ${listId}:`, err);
      }
    })
  );

  if (allTasks.length > 0) {
    try {
      localStorage.setItem('office_cached_gtasks', JSON.stringify(allTasks));
    } catch {}
  } else {
    try {
      const cached = localStorage.getItem('office_cached_gtasks');
      if (cached) return JSON.parse(cached);
    } catch {}
  }

  return allTasks;
};

/**
 * Creates a new task in Google Tasks
 */
export const createGoogleTask = async (
  title: string,
  notes?: string,
  dueDateStr?: string,
  listId = '@default'
): Promise<GoogleTaskItem | null> => {
  let token = getGoogleAccessToken();
  if (!token) token = await restoreGoogleTokenFromCloud();
  if (!token) throw new Error('Sessão do Google expirada. Reautorize para sincronizar.');

  const body: any = {
    title,
    notes: notes ? `${notes}\n\n[Criado via Meu Escritório Online]` : '[Criado via Meu Escritório Online]',
  };

  if (dueDateStr) {
    // Google Tasks expects RFC 3339 formatted date timestamp (e.g. 2026-09-11T00:00:00.000Z)
    body.due = `${dueDateStr}T00:00:00.000Z`;
  }

  const response = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(listId)}/tasks`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.warn(`Erro ao criar tarefa no Google Tasks: ${errText}`);
    return null;
  }

  const data = await response.json();
  return {
    id: data.id,
    title: data.title,
    notes: data.notes,
    status: data.status === 'completed' ? 'completed' : 'needsAction',
    due: data.due,
    completed: data.completed,
    updated: data.updated,
    listId,
  };
};

/**
 * Updates the completion status of a task in Google Tasks
 */
export const updateGoogleTaskStatus = async (
  taskId: string,
  isCompleted: boolean,
  listId = '@default'
): Promise<void> => {
  let token = getGoogleAccessToken();
  if (!token) token = await restoreGoogleTokenFromCloud();
  if (!token) return;

  const body: any = isCompleted
    ? { status: 'completed' }
    : { status: 'needsAction', completed: null };

  try {
    const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(taskId)}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn('Erro ao atualizar status da tarefa no Google:', errText);
    }
  } catch (err) {
    console.warn('Erro ao conectar com Google Tasks:', err);
  }
};

/**
 * Deletes a task from Google Tasks
 */
export const deleteGoogleTask = async (
  taskId: string,
  listId = '@default'
): Promise<void> => {
  let token = getGoogleAccessToken();
  if (!token) token = await restoreGoogleTokenFromCloud();
  if (!token) return;

  try {
    await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(taskId)}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (err) {
    console.warn('Erro ao excluir tarefa do Google:', err);
  }
};
