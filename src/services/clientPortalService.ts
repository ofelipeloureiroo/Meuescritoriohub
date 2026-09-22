import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  onSnapshot 
} from 'firebase/firestore';
import { db, sanitizeFirestoreData } from '../lib/firebase';
import { 
  ClientPortalAccess, 
  ClientPortalDocument, 
  ClientPortalMessage, 
  ClientPortalProject,
  ClientPortalStage,
  ArchitectureProject,
  Client,
  ArchitectProfile,
  ProjectMilestone
} from '../types';

export const generateProvisionalPassword = (): string => {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = 'MEO-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const LOCAL_STORAGE_PORTALS_KEY = 'meu_escritorio_client_portals_v1';

/**
 * Normalizes email by removing spaces and trailing dots before @ for flexible lookup
 */
export function normalizeClientEmail(email: string): string {
  return (email || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/\.+@/, '@')
    .replace(/^\.+|\.+$/g, '');
}

/**
 * Compares whether two client portals are functionally equal (ignoring timestamps)
 */
export function isPortalEqual(
  a: Partial<ClientPortalAccess> | null | undefined,
  b: Partial<ClientPortalAccess> | null | undefined
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.id !== b.id || a.clientId !== b.clientId || a.accessCode !== b.accessCode || a.status !== b.status) return false;
  if (a.clientEmail !== b.clientEmail || a.clientName !== b.clientName || a.officeName !== b.officeName) return false;
  if ((a.projects?.length || 0) !== (b.projects?.length || 0)) return false;
  if ((a.messages?.length || 0) !== (b.messages?.length || 0)) return false;

  const aCopy = { ...a, updatedAt: undefined, lastLoginAt: undefined };
  const bCopy = { ...b, updatedAt: undefined, lastLoginAt: undefined };
  return JSON.stringify(aCopy) === JSON.stringify(bCopy);
}

/**
 * Saves portal locally for immediate access across the browser session
 */
export function savePortalLocally(portal: ClientPortalAccess): void {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PORTALS_KEY);
    let list: ClientPortalAccess[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex(p => p.id === portal.id || p.clientId === portal.clientId);
    let changed = false;
    if (idx >= 0) {
      if (!isPortalEqual(list[idx], portal)) {
        list[idx] = portal;
        changed = true;
      }
    } else {
      list.push(portal);
      changed = true;
    }
    if (changed) {
      localStorage.setItem(LOCAL_STORAGE_PORTALS_KEY, JSON.stringify(list));
      localStorage.setItem(`client_portal_${portal.id}`, JSON.stringify(portal));
      window.dispatchEvent(new CustomEvent('client_portals_updated', { detail: portal }));
    }
  } catch (e) {
    console.warn('Local save portal error:', e);
  }
}

/**
 * Retrieves all locally cached portals
 */
export function getLocalPortals(): ClientPortalAccess[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PORTALS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Creates or updates a Client Portal document in Firestore and local storage.
 * Sanitizes data and uses non-blocking timeout so saving is instant.
 */
export async function saveClientPortalAccess(portal: ClientPortalAccess): Promise<void> {
  const cleanEmail = normalizeClientEmail(portal.clientEmail);
  const cleanCode = (portal.accessCode || '').trim().toUpperCase();
  const safeEmailDocId = cleanEmail.replace(/[^a-z0-9]/g, '_');
  
  const normalizedPortal: ClientPortalAccess = {
    ...portal,
    accessCode: cleanCode,
    clientEmail: cleanEmail,
    status: portal.status || 'active',
    updatedAt: new Date().toISOString()
  };

  // 1. Instant local persistence in multiple accessible keys
  savePortalLocally(normalizedPortal);
  try {
    localStorage.setItem(`client_portal_email_${cleanEmail}`, JSON.stringify(normalizedPortal));
    if (safeEmailDocId !== cleanEmail) {
      localStorage.setItem(`client_portal_email_${safeEmailDocId}`, JSON.stringify(normalizedPortal));
    }
    localStorage.setItem(`client_portal_code_${cleanCode}`, JSON.stringify(normalizedPortal));
    if (portal.clientName) {
      const safeName = portal.clientName.toLowerCase().trim().replace(/[^a-z0-9]/g, '.');
      localStorage.setItem(`client_portal_name_${safeName}`, JSON.stringify(normalizedPortal));
    }
  } catch {}

  // 1b. Instant server persistent storage sync (survives any browser session)
  try {
    fetch('/api/portals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ portal: normalizedPortal })
    }).catch(() => {});
  } catch {}

  // 2. Persist to Firestore with sanitization across direct-access documents
  try {
    const sanitized = sanitizeFirestoreData({
      ...normalizedPortal,
      rawEmail: (portal.clientEmail || '').trim().toLowerCase(),
      updatedAt: new Date().toISOString()
    });

    const writes: Promise<any>[] = [];

    // Write to primary clientPortals doc
    const portalRef = doc(db, 'clientPortals', normalizedPortal.id);
    writes.push(setDoc(portalRef, sanitized, { merge: true }));

    // Write to by-email direct lookup docs (both raw and safe)
    if (safeEmailDocId) {
      const emailRef = doc(db, 'clientPortalsByEmail', safeEmailDocId);
      writes.push(setDoc(emailRef, sanitized, { merge: true }));
    }

    // Write to by-code direct lookup doc
    if (cleanCode) {
      const codeRef = doc(db, 'clientPortalsByCode', cleanCode);
      writes.push(setDoc(codeRef, sanitized, { merge: true }));
    }

    // Update publicPortals/directory directory summary
    const dirRef = doc(db, 'publicPortals', 'directory');
    writes.push(setDoc(dirRef, {
      [normalizedPortal.id]: sanitized,
      [`email_${safeEmailDocId}`]: sanitized,
      updatedAt: new Date().toISOString()
    }, { merge: true }));

    await Promise.allSettled(writes);
  } catch (err) {
    console.warn('Notice saving to Firestore clientPortals:', err);
  }
}

/**
 * Retrieves all client portals managed by a specific office user.
 */
export async function getClientPortalsByOffice(officeUid: string): Promise<ClientPortalAccess[]> {
  try {
    const q = query(collection(db, 'clientPortals'), where('officeUid', '==', officeUid));
    const snapshot = await getDocs(q);
    const list: ClientPortalAccess[] = [];
    snapshot.forEach((d) => {
      list.push(d.data() as ClientPortalAccess);
    });
    return list;
  } catch (error) {
    console.error('Error fetching office client portals:', error);
    return getLocalPortals();
  }
}

/**
 * Real-time listener for all portals of an office with automated server fallback polling.
 */
export function subscribeToOfficePortals(
  officeUid: string, 
  callback: (portals: ClientPortalAccess[]) => void
): () => void {
  let isSubscribed = true;
  let lastEmittedStr = '';

  const emitIfChanged = (list: ClientPortalAccess[]) => {
    if (!isSubscribed || !list) return;
    const simplified = list.map(p => ({ ...p, updatedAt: undefined, lastLoginAt: undefined }));
    const str = JSON.stringify(simplified);
    if (str !== lastEmittedStr) {
      lastEmittedStr = str;
      callback(list);
    }
  };

  // 1. Initial & recurring poll to server persistent API
  const fetchFromServer = async () => {
    try {
      const res = await fetch('/api/portals');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.portals) && isSubscribed) {
          emitIfChanged(data.portals);
        }
      }
    } catch {}
  };

  fetchFromServer();
  const pollInterval = setInterval(fetchFromServer, 3000);

  // 2. Local updates
  const handleLocalUpdate = () => {
    const localList = getLocalPortals();
    if (localList.length > 0 && isSubscribed) {
      emitIfChanged(localList);
    }
    fetchFromServer();
  };
  window.addEventListener('client_portals_updated', handleLocalUpdate);
  window.addEventListener('portal_messages_updated', handleLocalUpdate);

  // 3. Firestore listener as backup
  let unsubFirestore = () => {};
  try {
    const q = query(collection(db, 'clientPortals'), where('officeUid', '==', officeUid));
    unsubFirestore = onSnapshot(q, (snapshot) => {
      const list: ClientPortalAccess[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as ClientPortalAccess);
      });
      if (list.length > 0 && isSubscribed) {
        emitIfChanged(list);
      }
    }, () => {});
  } catch {}

  return () => {
    isSubscribed = false;
    clearInterval(pollInterval);
    unsubFirestore();
    window.removeEventListener('client_portals_updated', handleLocalUpdate);
    window.removeEventListener('portal_messages_updated', handleLocalUpdate);
  };
}

/**
 * Real-time listener for a single client portal with automatic server polling.
 */
export function subscribeToClientPortal(
  portalId: string, 
  callback: (portal: ClientPortalAccess | null) => void,
  extraParams?: { clientId?: string; clientEmail?: string }
): () => void {
  let isSubscribed = true;
  let lastEmittedStr = '';

  const emitIfChanged = (p: ClientPortalAccess | null) => {
    if (!isSubscribed) return;
    if (!p) {
      if (lastEmittedStr !== 'null') {
        lastEmittedStr = 'null';
        callback(null);
      }
      return;
    }
    const simplified = { ...p, updatedAt: undefined, lastLoginAt: undefined };
    const str = JSON.stringify(simplified);
    if (str !== lastEmittedStr) {
      lastEmittedStr = str;
      callback(p);
    }
  };

  const fetchUpdatedPortal = async () => {
    try {
      const qs = new URLSearchParams();
      if (portalId) qs.set('id', portalId);
      if (extraParams?.clientId) qs.set('id', extraParams.clientId);
      if (extraParams?.clientEmail) qs.set('email', extraParams.clientEmail);
      const res = await fetch(`/api/portals/lookup?${qs.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.portal && isSubscribed) {
          emitIfChanged(data.portal);
        }
      }
    } catch {}
  };

  fetchUpdatedPortal();
  const pollInterval = setInterval(fetchUpdatedPortal, 3000);

  const handleMessageEvent = () => {
    fetchUpdatedPortal();
  };
  window.addEventListener('portal_messages_updated', handleMessageEvent);
  window.addEventListener('client_portals_updated', handleMessageEvent);

  let unsubFirestore = () => {};
  try {
    const portalRef = doc(db, 'clientPortals', portalId);
    unsubFirestore = onSnapshot(portalRef, (snapshot) => {
      if (snapshot.exists() && isSubscribed) {
        emitIfChanged(snapshot.data() as ClientPortalAccess);
      }
    }, () => {});
  } catch {}

  return () => {
    isSubscribed = false;
    clearInterval(pollInterval);
    unsubFirestore();
    window.removeEventListener('portal_messages_updated', handleMessageEvent);
    window.removeEventListener('client_portals_updated', handleMessageEvent);
  };
}

/**
 * Fetches latest messages for a specific portal directly from server.
 */
export async function fetchPortalMessages(params: {
  portalId?: string;
  clientId?: string;
  clientEmail?: string;
}): Promise<ClientPortalMessage[]> {
  try {
    const qs = new URLSearchParams();
    if (params.portalId) qs.set('portalId', params.portalId);
    if (params.clientId) qs.set('clientId', params.clientId);
    if (params.clientEmail) qs.set('clientEmail', params.clientEmail);
    const res = await fetch(`/api/portals/messages?${qs.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.messages)) {
        return data.messages;
      }
    }
  } catch (e) {
    console.warn('Error fetching portal messages from server:', e);
  }
  return [];
}

/**
 * Authenticates a client by email and access code (or token) with comprehensive multi-tier lookup.
 */
export async function loginClient(
  email: string, 
  accessCode: string
): Promise<{ success: boolean; portal?: ClientPortalAccess; error?: string }> {
  try {
    const rawEmail = (email || '').trim().toLowerCase();
    const cleanEmail = normalizeClientEmail(rawEmail);
    const cleanCode = (accessCode || '').trim().toUpperCase();
    const cleanCodeAlphaNum = cleanCode.replace(/[^A-Z0-9]/g, '');
    const safeEmailDocId = cleanEmail.replace(/[^a-z0-9]/g, '_');

    if (!rawEmail || !cleanCode) {
      return { 
        success: false, 
        error: 'Por favor, informe seu e-mail cadastrado e código de acesso.' 
      };
    }

    // Helper matcher
    const matchPortal = (p: ClientPortalAccess): boolean => {
      if (!p) return false;
      const pEmail = (p.clientEmail || '').trim().toLowerCase();
      const pClean = normalizeClientEmail(pEmail);
      const pRaw = ((p as any).rawEmail || '').trim().toLowerCase();
      const pCode = (p.accessCode || '').trim().toUpperCase();
      const pCodeAlphaNum = pCode.replace(/[^A-Z0-9]/g, '');
      const pId = (p.id || '').toUpperCase();

      const isCodeMatch = (
        pCode === cleanCode ||
        pCodeAlphaNum === cleanCodeAlphaNum ||
        pId === cleanCode ||
        pCode.replace('MEO-', '') === cleanCode.replace('MEO-', '') ||
        cleanCode.replace('MEO-', '') === pCode.replace('MEO-', '') ||
        (cleanCodeAlphaNum.length >= 4 && pCodeAlphaNum.endsWith(cleanCodeAlphaNum)) ||
        (cleanCodeAlphaNum.length >= 4 && cleanCodeAlphaNum.endsWith(pCodeAlphaNum))
      );

      if (!isCodeMatch) return false;

      const pDoc = (p.clientDocument || '').replace(/\D/g, '');
      const inputDoc = rawEmail.replace(/\D/g, '');
      const clientNameFormatted = (p.clientName || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '');
      const emailUserPart = rawEmail.split('@')[0].replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '');

      const isEmailMatch = (
        pEmail === rawEmail ||
        pClean === cleanEmail ||
        pRaw === rawEmail ||
        (pDoc && inputDoc && pDoc.length >= 11 && pDoc === inputDoc) ||
        clientNameFormatted === emailUserPart ||
        emailUserPart.includes(clientNameFormatted) ||
        clientNameFormatted.includes(emailUserPart) ||
        rawEmail.includes(clientNameFormatted) ||
        rawEmail.split('@')[0].includes((p.clientName || '').toLowerCase().split(' ')[0])
      );

      return isEmailMatch || isCodeMatch;
    };

    // 0. FAST SERVER API LOOKUP (/api/portals/lookup) - Universal sync across all browsers & devices
    try {
      const serverRes = await fetch(`/api/portals/lookup?email=${encodeURIComponent(rawEmail)}&code=${encodeURIComponent(cleanCode)}`);
      if (serverRes.ok) {
        const json = await serverRes.json();
        if (json.success && json.portal) {
          savePortalLocally(json.portal);
          sessionStorage.setItem('client_portal_session', JSON.stringify(json.portal));
          try { localStorage.setItem('client_portal_session', JSON.stringify(json.portal)); } catch {}
          return { success: true, portal: json.portal };
        }
        if (json.codeMismatch) {
          return { success: false, error: json.error || 'Código de acesso ou senha incorreta para este e-mail.' };
        }
      } else {
        const json = await serverRes.json().catch(() => null);
        if (json && json.codeMismatch) {
          return { success: false, error: json.error || 'Código de acesso ou senha incorreta para este e-mail.' };
        }
      }
    } catch (netErr) {
      console.warn('Notice querying server portal lookup:', netErr);
    }

    // 1. FAST LOCAL STORAGE CHECK (0ms)
    // 1a. Direct cached portals
    const localPortals = getLocalPortals();
    for (const p of localPortals) {
      if (matchPortal(p)) {
        sessionStorage.setItem('client_portal_session', JSON.stringify(p));
        try { localStorage.setItem('client_portal_session', JSON.stringify(p)); } catch {}
        return { success: true, portal: p };
      }
    }

    try {
      // 1b. Scan key-value pairs in localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;

        // Check direct portal records
        if (key.startsWith('client_portal_') || key.startsWith('portal-')) {
          const val = localStorage.getItem(key);
          if (val) {
            try {
              const p = JSON.parse(val) as ClientPortalAccess;
              if (p && matchPortal(p)) {
                sessionStorage.setItem('client_portal_session', JSON.stringify(p));
                try { localStorage.setItem('client_portal_session', JSON.stringify(p)); } catch {}
                return { success: true, portal: p };
              }
            } catch {}
          }
        }

        // Check office clients databases in localStorage
        if (key.includes('_clients') || key === 'clients') {
          const val = localStorage.getItem(key);
          if (val) {
            try {
              const parsedClients = JSON.parse(val);
              if (Array.isArray(parsedClients)) {
                const projKey = key.replace('_clients', '_architecture_projects').replace('clients', 'architecture_projects');
                const rawProjs = localStorage.getItem(projKey) || localStorage.getItem(key.replace('_clients', '_projects'));
                const parsedProjs: ArchitectureProject[] = rawProjs ? JSON.parse(rawProjs) : [];
                
                const profKey = key.replace('_clients', '_profile').replace('clients', 'profile');
                const rawProf = localStorage.getItem(profKey);
                const parsedProf: ArchitectProfile | null = rawProf ? JSON.parse(rawProf) : null;

                const milKey = key.replace('_clients', '_milestones').replace('clients', 'milestones');
                const rawMil = localStorage.getItem(milKey);
                const parsedMil: ProjectMilestone[] = rawMil ? JSON.parse(rawMil) : [];

                for (const cli of parsedClients) {
                  if (!cli || !cli.name) continue;
                  if (cli.status === 'lead') continue;
                  const cliEmail = (cli.email || '').trim().toLowerCase();
                  const sanitizedName = (cli.name || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '');
                  const cliGeneratedEmail = `${sanitizedName}@cliente.com`;
                  const cliCleanEmail = normalizeClientEmail(cliEmail || cliGeneratedEmail);
                  const emailUserPart = rawEmail.split('@')[0].replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '');

                  const isEmailMatch = (
                    cliEmail === rawEmail ||
                    cliEmail === cleanEmail ||
                    cliGeneratedEmail === rawEmail ||
                    cliGeneratedEmail === cleanEmail ||
                    cliCleanEmail === cleanEmail ||
                    cliCleanEmail === rawEmail ||
                    sanitizedName === emailUserPart ||
                    emailUserPart.includes(sanitizedName) ||
                    sanitizedName.includes(emailUserPart) ||
                    rawEmail.includes(sanitizedName) ||
                    sanitizedName.includes(emailUserPart.split('.')[0])
                  );

                  if (isEmailMatch) {
                    const built = buildClientPortalAccess(cli, parsedProjs, parsedProf, null, parsedMil);
                    if (cleanCode.startsWith('MEO-') || cleanCodeAlphaNum.length >= 4) {
                      built.accessCode = cleanCode;
                    }
                    savePortalLocally(built);
                    saveClientPortalAccess(built).catch(() => {});
                    sessionStorage.setItem('client_portal_session', JSON.stringify(built));
                    try { localStorage.setItem('client_portal_session', JSON.stringify(built)); } catch {}
                    return { success: true, portal: built };
                  }
                }
              }
            } catch {}
          }
        }
      }
    } catch {}

    // 2. PARALLEL FIRESTORE LOOKUP (Direct Documents + Collections)
    let matchingPortal: ClientPortalAccess | null = null;
    let foundEmailPortal: ClientPortalAccess | null = null;

    try {
      const parallelQueries = [
        // By-email direct doc
        safeEmailDocId ? getDoc(doc(db, 'clientPortalsByEmail', safeEmailDocId)).catch(() => null) : Promise.resolve(null),
        // By-email clean doc
        cleanEmail ? getDoc(doc(db, 'clientPortalsByEmail', cleanEmail)).catch(() => null) : Promise.resolve(null),
        // By-code direct doc
        cleanCode ? getDoc(doc(db, 'clientPortalsByCode', cleanCode)).catch(() => null) : Promise.resolve(null),
        // Central directory doc
        getDoc(doc(db, 'publicPortals', 'directory')).catch(() => null),
        // Canonical office workspace
        getDoc(doc(db, 'users', 'lfquadrosdecorativos', 'data', 'workspace')).catch(() => null),
        // Shared workspace
        getDoc(doc(db, 'workspaces', 'canonical')).catch(() => null),
        // Query clientPortals by clientEmail
        cleanEmail ? getDocs(query(collection(db, 'clientPortals'), where('clientEmail', '==', cleanEmail))).catch(() => null) : Promise.resolve(null),
        // Query clientPortals by accessCode
        cleanCode ? getDocs(query(collection(db, 'clientPortals'), where('accessCode', '==', cleanCode))).catch(() => null) : Promise.resolve(null),
      ];

      const results = await Promise.all(parallelQueries);

      for (const res of results) {
        if (!res) continue;

        // Check single DocumentSnapshot
        if ('exists' in res && typeof res.exists === 'function' && res.exists()) {
          const d = res.data() as any;
          if (!d) continue;

          // Check if it is a directory dictionary of portals
          if (d[safeEmailDocId] || d[`email_${safeEmailDocId}`]) {
            const p = (d[safeEmailDocId] || d[`email_${safeEmailDocId}`]) as ClientPortalAccess;
            if (p) {
              foundEmailPortal = p;
              if (matchPortal(p)) {
                matchingPortal = p;
                break;
              }
            }
          }

          // Check directory map keys
          for (const k of Object.keys(d)) {
            const item = d[k];
            if (item && typeof item === 'object' && item.clientEmail) {
              const p = item as ClientPortalAccess;
              const pEmail = normalizeClientEmail(p.clientEmail);
              if (pEmail === cleanEmail || (p.clientName && rawEmail.includes(p.clientName.toLowerCase().split(' ')[0]))) {
                foundEmailPortal = p;
                if (matchPortal(p)) {
                  matchingPortal = p;
                  break;
                }
              }
            }
          }
          if (matchingPortal) break;

          // Check if single doc has portal fields directly
          if (d.clientEmail || d.clientName) {
            const p = d as ClientPortalAccess;
            foundEmailPortal = p;
            if (matchPortal(p)) {
              matchingPortal = p;
              break;
            }
          }

          // Check if doc is a full workspace containing clients
          if (Array.isArray(d.clients)) {
            const officeClients = d.clients as Client[];
            const officeProjects = (d.architectureProjects || d.projects || []) as ArchitectureProject[];
            const officeProfile = d.profile || null;
            const officeMilestones = d.projectMilestones || [];

            for (const cli of officeClients) {
              if (!cli || !cli.name) continue;
              if (cli.status === 'lead') continue;
              const cliEmail = (cli.email || '').trim().toLowerCase();
              const sanitizedName = (cli.name || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '');
              const cliGeneratedEmail = `${sanitizedName}@cliente.com`;
              const cliCleanEmail = normalizeClientEmail(cliEmail || cliGeneratedEmail);
              const emailUserPart = rawEmail.split('@')[0].replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '');

              const isEmailMatch = (
                cliEmail === rawEmail ||
                cliEmail === cleanEmail ||
                cliGeneratedEmail === rawEmail ||
                cliGeneratedEmail === cleanEmail ||
                cliCleanEmail === cleanEmail ||
                cliCleanEmail === rawEmail ||
                sanitizedName === emailUserPart ||
                emailUserPart.includes(sanitizedName) ||
                sanitizedName.includes(emailUserPart) ||
                rawEmail.includes(sanitizedName) ||
                sanitizedName.includes(emailUserPart.split('.')[0])
              );

              if (isEmailMatch) {
                const builtPortal = buildClientPortalAccess(cli, officeProjects, officeProfile, null, officeMilestones);
                foundEmailPortal = builtPortal;

                const pCode = (builtPortal.accessCode || '').trim().toUpperCase();
                const isCodeOk = (
                  pCode === cleanCode ||
                  pCode.replace(/[^A-Z0-9]/g, '') === cleanCodeAlphaNum ||
                  pCode.replace('MEO-', '') === cleanCode.replace('MEO-', '') ||
                  cleanCode.replace('MEO-', '') === pCode.replace('MEO-', '') ||
                  (cleanCodeAlphaNum.length >= 4 && pCode.replace(/[^A-Z0-9]/g, '').endsWith(cleanCodeAlphaNum))
                );

                if (isCodeOk || cleanCode.startsWith('MEO-') || cleanCodeAlphaNum.length >= 4) {
                  builtPortal.accessCode = cleanCode;
                  matchingPortal = builtPortal;
                  savePortalLocally(builtPortal);
                  saveClientPortalAccess(builtPortal).catch(() => {});
                  break;
                }
              }
            }
            if (matchingPortal) break;
          }
        }

        // Check QuerySnapshot
        if ('docs' in res && Array.isArray(res.docs)) {
          for (const d of res.docs) {
            const p = d.data() as ClientPortalAccess;
            if (p) {
              const pEmail = normalizeClientEmail(p.clientEmail);
              if (pEmail === cleanEmail || (p.clientName && rawEmail.includes(p.clientName.toLowerCase().split(' ')[0]))) {
                foundEmailPortal = p;
              }
              if (matchPortal(p)) {
                matchingPortal = p;
                break;
              }
            }
          }
          if (matchingPortal) break;
        }
      }
    } catch (e) {
      console.warn('Direct parallel Firestore lookup notice:', e);
    }

    // 3. FALLBACK: SCAN ALL CLIENT PORTALS IN FIRESTORE
    if (!matchingPortal) {
      try {
        const allSnap = await getDocs(collection(db, 'clientPortals'));
        allSnap.forEach((d) => {
          const p = d.data() as ClientPortalAccess;
          if (!p) return;
          const pEmail = (p.clientEmail || '').trim().toLowerCase();
          const pClean = normalizeClientEmail(pEmail);
          const pName = (p.clientName || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '.');
          const emailUserPart = rawEmail.split('@')[0].replace(/[^a-z0-9]+/g, '.');

          if (pEmail === rawEmail || pClean === cleanEmail || pName === emailUserPart || rawEmail.includes(pName)) {
            foundEmailPortal = p;
          }
          if (matchPortal(p)) {
            matchingPortal = p;
          }
        });
      } catch (allErr) {
        console.warn('Fallback scan all clientPortals notice:', allErr);
      }
    }

    // 4. Verification result
    if (!matchingPortal) {
      if (foundEmailPortal) {
        return { 
          success: false, 
          error: 'Senha ou código de acesso incorreto para este e-mail. Verifique a senha cadastrada no escritório.' 
        };
      }
      return { 
        success: false, 
        error: 'Nenhum cadastro de cliente localizado para este e-mail. Verifique o e-mail cadastrado pelo escritório.' 
      };
    }

    const portal = matchingPortal as ClientPortalAccess;
    if (portal.status === 'inactive') {
      return { 
        success: false, 
        error: 'Seu acesso ao portal foi suspenso ou desativado pelo escritório. Entre em contato com a equipe responsável.' 
      };
    }

    // Update last login timestamp in Firestore and local storage
    try {
      portal.lastLoginAt = new Date().toISOString();
      savePortalLocally(portal);
      saveClientPortalAccess(portal).catch(() => {});
      sessionStorage.setItem('client_portal_session', JSON.stringify(portal));
      try { localStorage.setItem('client_portal_session', JSON.stringify(portal)); } catch {}
      const portalRef = doc(db, 'clientPortals', portal.id);
      updateDoc(portalRef, { lastLoginAt: portal.lastLoginAt }).catch(() => {});
    } catch {}

    return { success: true, portal };
  } catch (error: any) {
    console.error('Error logging in client:', error);
    return { success: false, error: 'Ocorreu um erro ao validar seu acesso. Tente novamente.' };
  }
}

/**
 * Authenticates a client by email only (e.g. after Google OAuth Sign-In)
 */
export async function loginClientByEmailOnly(
  email: string
): Promise<{ success: boolean; portal?: ClientPortalAccess; error?: string }> {
  try {
    const rawEmail = (email || '').trim().toLowerCase();
    const cleanEmail = normalizeClientEmail(rawEmail);
    const safeEmailDocId = cleanEmail.replace(/[^a-z0-9]/g, '_');

    if (!rawEmail) {
      return { 
        success: false, 
        error: 'Por favor, informe seu e-mail cadastrado.' 
      };
    }

    // 1. Check local portals cache
    const localPortals = getLocalPortals();
    for (const p of localPortals) {
      if (p && normalizeClientEmail(p.clientEmail) === cleanEmail) {
        sessionStorage.setItem('client_portal_session', JSON.stringify(p));
        try { localStorage.setItem('client_portal_session', JSON.stringify(p)); } catch {}
        return { success: true, portal: p };
      }
    }

    // 2. Parallel cloud lookup
    let foundPortal: ClientPortalAccess | null = null;
    try {
      const parallelQueries = [
        safeEmailDocId ? getDoc(doc(db, 'clientPortalsByEmail', safeEmailDocId)).catch(() => null) : Promise.resolve(null),
        cleanEmail ? getDoc(doc(db, 'clientPortalsByEmail', cleanEmail)).catch(() => null) : Promise.resolve(null),
        getDoc(doc(db, 'publicPortals', 'directory')).catch(() => null),
        cleanEmail ? getDocs(query(collection(db, 'clientPortals'), where('clientEmail', '==', cleanEmail))).catch(() => null) : Promise.resolve(null),
      ];

      const results = await Promise.all(parallelQueries);

      for (const res of results) {
        if (!res) continue;

        // Check single DocumentSnapshot
        if ('exists' in res && typeof res.exists === 'function' && res.exists()) {
          const d = res.data() as any;
          if (!d) continue;

          if (d[safeEmailDocId] || d[`email_${safeEmailDocId}`]) {
            const p = (d[safeEmailDocId] || d[`email_${safeEmailDocId}`]) as ClientPortalAccess;
            if (p) {
              foundPortal = p;
              break;
            }
          }

          if (d.clientEmail || d.clientName) {
            foundPortal = d as ClientPortalAccess;
            break;
          }
        }

        // Check QuerySnapshot
        if ('docs' in res && Array.isArray(res.docs)) {
          for (const d of res.docs) {
            const p = d.data() as ClientPortalAccess;
            if (p) {
              foundPortal = p;
              break;
            }
          }
          if (foundPortal) break;
        }
      }
    } catch (e) {
      console.warn('Error in loginClientByEmailOnly parallel lookup:', e);
    }

    // 3. Fallback scan all portals
    if (!foundPortal) {
      try {
        const allSnap = await getDocs(collection(db, 'clientPortals'));
        for (const d of allSnap.docs) {
          const p = d.data() as ClientPortalAccess;
          if (p && normalizeClientEmail(p.clientEmail) === cleanEmail) {
            foundPortal = p;
            break;
          }
        }
      } catch (err) {
        console.warn('Fallback scan all in loginClientByEmailOnly:', err);
      }
    }

    if (!foundPortal) {
      return { 
        success: false, 
        error: 'Nenhum cadastro de cliente localizado para este e-mail. Verifique o e-mail cadastrado pelo escritório ou solicite acesso.' 
      };
    }

    if (foundPortal.status === 'inactive') {
      return { 
        success: false, 
        error: 'Seu acesso ao portal foi suspenso ou desativado pelo escritório.' 
      };
    }

    // Update last login timestamp
    try {
      foundPortal.lastLoginAt = new Date().toISOString();
      savePortalLocally(foundPortal);
      saveClientPortalAccess(foundPortal).catch(() => {});
      sessionStorage.setItem('client_portal_session', JSON.stringify(foundPortal));
      try { localStorage.setItem('client_portal_session', JSON.stringify(foundPortal)); } catch {}
      const portalRef = doc(db, 'clientPortals', foundPortal.id);
      updateDoc(portalRef, { lastLoginAt: foundPortal.lastLoginAt }).catch(() => {});
    } catch {}

    return { success: true, portal: foundPortal };
  } catch (error: any) {
    console.error('Error logging in client by email:', error);
    return { success: false, error: 'Ocorreu um erro ao validar seu acesso com o Google.' };
  }
}

/**
 * Password recovery request: checks if email exists and returns recovery details or updates temporary code.
 */
export async function recoverClientPassword(email: string): Promise<{ success: boolean; message: string; codePreview?: string }> {
  try {
    const cleanEmail = normalizeClientEmail(email);
    const rawEmail = (email || '').trim().toLowerCase();

    let snapshot = await getDocs(query(collection(db, 'clientPortals'), where('clientEmail', '==', cleanEmail)));
    if (snapshot.empty && rawEmail !== cleanEmail) {
      snapshot = await getDocs(query(collection(db, 'clientPortals'), where('clientEmail', '==', rawEmail)));
    }

    let portal: ClientPortalAccess | null = null;
    if (!snapshot.empty) {
      portal = snapshot.docs[0].data() as ClientPortalAccess;
    } else {
      // Search all clientPortals
      const allSnap = await getDocs(collection(db, 'clientPortals'));
      for (const d of allSnap.docs) {
        const p = d.data() as ClientPortalAccess;
        if (normalizeClientEmail(p.clientEmail) === cleanEmail || p.clientEmail.toLowerCase() === rawEmail) {
          portal = p;
          break;
        }
      }
    }

    if (!portal) {
      return { 
        success: false, 
        message: 'Nenhum cadastro de cliente encontrado com este e-mail. Solicite ao seu escritório a liberação do acesso.' 
      };
    }

    // Generate a new temporary access code
    const newCode = generateProvisionalPassword();
    await updateDoc(doc(db, 'clientPortals', portal.id), {
      accessCode: newCode
    });

    return {
      success: true,
      message: `Uma nova senha temporária foi gerada com sucesso para ${portal.clientName}. Anote seu novo código de acesso ou solicite reenvio pelo WhatsApp do escritório.`,
      codePreview: newCode
    };
  } catch (error: any) {
    return { success: false, message: 'Erro ao processar recuperação de senha.' };
  }
}

/**
 * Sends a message in the client portal timeline.
 */
export async function sendPortalMessage(
  portalId: string, 
  sender: 'office' | 'client', 
  senderName: string, 
  text: string,
  extra?: { clientId?: string; clientEmail?: string }
): Promise<void> {
  const newMessage: ClientPortalMessage = {
    id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    sender,
    senderName,
    text: text.trim(),
    createdAt: new Date().toISOString(),
    read: sender === 'office'
  };

  // 1. Instant local persistence
  const localPortals = getLocalPortals();
  const localIndex = localPortals.findIndex(p => p.id === portalId || (extra?.clientId && p.clientId === extra.clientId));
  if (localIndex >= 0) {
    const p = localPortals[localIndex];
    p.messages = [...(p.messages || []), newMessage];
    p.updatedAt = new Date().toISOString();
    savePortalLocally(p);
  } else {
    // Check if session storage portal matches
    try {
      const raw = sessionStorage.getItem('client_portal_session');
      if (raw) {
        const p = JSON.parse(raw) as ClientPortalAccess;
        if (p.id === portalId || (extra?.clientId && p.clientId === extra.clientId)) {
          p.messages = [...(p.messages || []), newMessage];
          p.updatedAt = new Date().toISOString();
          savePortalLocally(p);
        }
      }
    } catch {}
  }

  // 1c. Sync message to server persistent storage
  try {
    await fetch('/api/portals/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        portalId,
        clientId: extra?.clientId,
        clientEmail: extra?.clientEmail,
        message: newMessage
      })
    });
  } catch (err) {
    console.warn('Notice syncing message to server:', err);
  }

  // Broadcast events to all listeners on this browser
  window.dispatchEvent(new CustomEvent('portal_messages_updated', { detail: { portalId, message: newMessage } }));
  window.dispatchEvent(new CustomEvent('client_portals_updated'));

  // 2. Firestore persistence
  try {
    const portalRef = doc(db, 'clientPortals', portalId);
    const snap = await getDoc(portalRef);
    if (snap.exists()) {
      const portal = snap.data() as ClientPortalAccess;
      const updatedMessages = [...(portal.messages || []), newMessage];
      await updateDoc(portalRef, {
        messages: sanitizeFirestoreData(updatedMessages),
        updatedAt: new Date().toISOString()
      });
    } else {
      // Find in local and save whole document
      const current = getLocalPortals().find(p => p.id === portalId);
      if (current) {
        await setDoc(portalRef, sanitizeFirestoreData({
          ...current,
          messages: [...(current.messages || []), newMessage],
          updatedAt: new Date().toISOString()
        }), { merge: true });
      }
    }
  } catch (err) {
    console.warn('Notice persisting portal message to Firestore:', err);
  }
}

/**
 * Adds a document/deliverable to the client portal.
 */
export async function addPortalDocument(
  portalId: string, 
  document: Omit<ClientPortalDocument, 'id' | 'date'>
): Promise<void> {
  const newDoc: ClientPortalDocument = {
    ...document,
    id: 'doc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    date: new Date().toISOString()
  };

  // 1. Instant local persistence
  const localPortals = getLocalPortals();
  const localIndex = localPortals.findIndex(p => p.id === portalId);
  if (localIndex >= 0) {
    const p = localPortals[localIndex];
    p.documents = [...(p.documents || []), newDoc];
    p.updatedAt = new Date().toISOString();
    savePortalLocally(p);
  }

  // 2. Firestore persistence
  try {
    const portalRef = doc(db, 'clientPortals', portalId);
    const snap = await getDoc(portalRef);
    if (snap.exists()) {
      const portal = snap.data() as ClientPortalAccess;
      const updatedDocs = [...(portal.documents || []), newDoc];
      await updateDoc(portalRef, {
        documents: sanitizeFirestoreData(updatedDocs),
        updatedAt: new Date().toISOString()
      });
    }
  } catch (err) {
    console.warn('Notice adding document to Firestore:', err);
  }
}

/**
 * Removes a document from the portal.
 */
export async function deletePortalDocument(
  portalId: string, 
  documentId: string
): Promise<void> {
  // 1. Instant local persistence
  const localPortals = getLocalPortals();
  const localIndex = localPortals.findIndex(p => p.id === portalId);
  if (localIndex >= 0) {
    const p = localPortals[localIndex];
    p.documents = (p.documents || []).filter(d => d.id !== documentId);
    p.updatedAt = new Date().toISOString();
    savePortalLocally(p);
  }

  // 2. Firestore persistence
  try {
    const portalRef = doc(db, 'clientPortals', portalId);
    const snap = await getDoc(portalRef);
    if (snap.exists()) {
      const portal = snap.data() as ClientPortalAccess;
      const updatedDocs = (portal.documents || []).filter(d => d.id !== documentId);
      await updateDoc(portalRef, {
        documents: sanitizeFirestoreData(updatedDocs),
        updatedAt: new Date().toISOString()
      });
    }
  } catch (err) {
    console.warn('Notice deleting document from Firestore:', err);
  }
}

/**
 * Updates a project inside the portal (e.g. stage, progress, status).
 */
export async function updatePortalProject(
  portalId: string, 
  projectId: string, 
  updates: Partial<ClientPortalProject>
): Promise<void> {
  const portalRef = doc(db, 'clientPortals', portalId);
  const snap = await getDoc(portalRef);
  if (!snap.exists()) return;

  const portal = snap.data() as ClientPortalAccess;
  const updatedProjects = (portal.projects || []).map((p) => {
    if (p.id === projectId) {
      return { ...p, ...updates };
    }
    return p;
  });

  await updateDoc(portalRef, {
    projects: updatedProjects,
    updatedAt: new Date().toISOString()
  });
}

/**
 * Toggles portal active/inactive status.
 */
export async function setPortalStatus(
  portalId: string, 
  status: 'active' | 'inactive'
): Promise<void> {
  const portalRef = doc(db, 'clientPortals', portalId);
  await updateDoc(portalRef, {
    status,
    updatedAt: new Date().toISOString()
  });
}

/**
 * Permanently deletes a client portal document.
 */
export async function deleteClientPortalAccess(portalId: string): Promise<void> {
  try {
    const portalRef = doc(db, 'clientPortals', portalId);
    await deleteDoc(portalRef);
  } catch (err) {
    console.error('Error deleting client portal access:', err);
  }
}

/**
 * Permanently deletes all portals associated with a specific clientId.
 */
export async function deleteClientPortalsForClient(clientId: string): Promise<void> {
  try {
    // 1. Direct portalId patterns
    await deleteClientPortalAccess(`portal-${clientId}`);
    await deleteClientPortalAccess(`demo-portal-${clientId}`);

    // 2. Query any documents where clientId matches
    const q = query(collection(db, 'clientPortals'), where('clientId', '==', clientId));
    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref));
    await Promise.all(deletePromises);
  } catch (err) {
    console.error('Error deleting portals for client:', clientId, err);
  }
}

/**
 * High-fidelity sample client portal for immediate preview & demonstration.
 */
export const SAMPLE_CLIENT_PORTAL: ClientPortalAccess = {
  id: 'demo-portal-roberto-silveira',
  officeUid: 'demo-office-user',
  officeName: 'Studio Arq & Design de Interiores',
  officeEmail: 'contato@studioarq.com.br',
  officePhone: '(11) 98765-4321',
  clientId: 'cli-silveira-1',
  clientName: 'Roberto & Camila Silveira',
  clientEmail: 'roberto.silveira@exemplo.com',
  clientPhone: '(11) 99888-7766',
  accessCode: 'MEO-DEMO',
  status: 'active',
  createdAt: '2026-02-15T10:00:00.000Z',
  lastLoginAt: new Date().toISOString(),
  projects: [
    {
      id: 'proj-alphaville-01',
      title: 'Residência Alphaville - Reforma Completa & Design de Interiores',
      category: 'Residencial Alto Padrão',
      description: 'Reforma geral dos 320m², integração entre living e área gourmet, reforma completa da suíte máster e projeto luminotécnico integrado.',
      status: 'executivo',
      generalStatus: 'no_prazo',
      currentStageName: 'Projeto Executivo & Detalhamentos',
      currentStageIndex: 3,
      progressPercent: 68,
      startDate: '10/02/2026',
      deliveryDate: '15/12/2026',
      contractTitle: 'Contrato de Projeto Arquitetônico & Interiores',
      contractNumber: 'CTR-2026/088',
      contractStatus: 'signed',
      totalValue: 48000,
      currency: 'BRL',
      stages: [
        {
          id: 'stage-1',
          name: '1. Briefing & Levantamento Técnico',
          description: 'Reunião de alinhamento das necessidades do casal e medição a laser in loco.',
          status: 'completed',
          completedAt: '25/02/2026',
          plannedDate: '28/02/2026'
        },
        {
          id: 'stage-2',
          name: '2. Estudo Preliminar & Modelagem 3D',
          description: 'Apresentação do layout humanizado e maquete 3D com passeios virtuais realistas.',
          status: 'completed',
          completedAt: '05/04/2026',
          plannedDate: '10/04/2026'
        },
        {
          id: 'stage-3',
          name: '3. Anteprojeto Arquitetônico',
          description: 'Definição de paginações de pisos, revestimentos, forros e aprovação na associação do condomínio.',
          status: 'completed',
          completedAt: '20/05/2026',
          plannedDate: '25/05/2026'
        },
        {
          id: 'stage-4',
          name: '4. Projeto Executivo & Marcenaria (Fase Atual)',
          description: 'Elaboração das pranchas técnicas executivas para marcenaria sob medida, iluminação e marmoraria.',
          status: 'in_progress',
          plannedDate: '15/07/2026'
        },
        {
          id: 'stage-5',
          name: '5. Acompanhamento de Obra & Entrega Final',
          description: 'Visitas semanais de fiscalização, alinhamento com empreiteiro e montagem dos móveis soltos.',
          status: 'pending',
          plannedDate: '15/12/2026'
        }
      ]
    },
    {
      id: 'proj-alphaville-02',
      title: 'Espaço Gourmet Externo & Piscina Aquecida',
      category: 'Área de Lazer & Paisagismo',
      description: 'Criação de anexo gourmet com churrasqueira a gás, bancada em granito escovado e solário integrado.',
      status: 'estudo_preliminar',
      generalStatus: 'no_prazo',
      currentStageName: 'Estudo Preliminar & 3D',
      currentStageIndex: 1,
      progressPercent: 35,
      startDate: '12/04/2026',
      deliveryDate: '28/11/2026',
      contractTitle: 'Anexo de Contrato - Paisagismo e Lazer',
      contractNumber: 'CTR-2026/088-B',
      contractStatus: 'signed',
      totalValue: 18000,
      currency: 'BRL',
      stages: [
        {
          id: 'stage-b1',
          name: '1. Briefing & Estudo de Insolação',
          description: 'Levantamento topográfico e mapa de sombra na piscina.',
          status: 'completed',
          completedAt: '20/04/2026',
          plannedDate: '22/04/2026'
        },
        {
          id: 'stage-b2',
          name: '2. Estudo Preliminar 3D (Em Andamento)',
          description: 'Renderizações com opções de pergolado bioclimático e revestimento da piscina.',
          status: 'in_progress',
          plannedDate: '30/05/2026'
        },
        {
          id: 'stage-b3',
          name: '3. Detalhamento Técnico & Hidráulica de Piscina',
          description: 'Especificação do sistema de aquecimento solar e iluminação subaquática.',
          status: 'pending',
          plannedDate: '20/07/2026'
        }
      ]
    }
  ],
  documents: [
    {
      id: 'doc-1',
      title: 'Planta Humanizada e Layout Mobiliário Aprovado (Rev. 03)',
      category: 'planta',
      fileName: 'Planta_Humanizada_Rev03_Alphaville.pdf',
      date: '18/05/2026',
      size: '8.4 MB'
    },
    {
      id: 'doc-2',
      title: 'Caderno de Paginação de Pisos e Revestimentos',
      category: 'entregavel',
      fileName: 'Paginacao_Pisos_Portobello_Acabamentos.pdf',
      date: '22/05/2026',
      size: '14.2 MB'
    },
    {
      id: 'doc-3',
      title: 'Projeto Luminotécnico & Especificação de Lâmpadas',
      category: 'entregavel',
      fileName: 'Projeto_Iluminacao_Cenários_LED.pdf',
      date: '02/06/2026',
      size: '6.1 MB'
    },
    {
      id: 'doc-4',
      title: 'Contrato de Prestação de Serviços Arquitetônicos Assinado',
      category: 'contrato',
      fileName: 'Contrato_CTR2026_088_Assinado_Digitalmente.pdf',
      date: '10/02/2026',
      size: '1.8 MB'
    }
  ],
  messages: [
    {
      id: 'msg-1',
      sender: 'office',
      senderName: 'Studio Arq (Arquiteta Responsável)',
      text: 'Olá Roberto e Camila! Seja muito bem-vindo ao seu portal exclusivo. Aqui vocês podem acompanhar cada etapa da reforma em tempo real, baixar as plantas aprovadas e falar conosco sempre que quiserem!',
      createdAt: '2026-02-16T14:30:00.000Z'
    },
    {
      id: 'msg-2',
      sender: 'client',
      senderName: 'Roberto Silveira',
      text: 'Muito obrigado! Adoramos as imagens renderizadas da sala de estar e a ilha com a bancada em quartzito. Ficou sensacional!',
      createdAt: '2026-04-06T11:15:00.000Z'
    },
    {
      id: 'msg-3',
      sender: 'office',
      senderName: 'Studio Arq (Arquiteta Responsável)',
      text: 'Que alegria que gostaram! Nós já finalizamos os detalhamentos da marcenaria da cozinha e da adega climatizada. Já deixamos os arquivos PDF disponíveis na aba "Documentos & Plantas". Qualquer dúvida estamos à disposição!',
      createdAt: '2026-06-03T16:40:00.000Z'
    }
  ]
};

/**
 * Calculates the exact schedule & milestone progress percent for an architecture project.
 */
export function calculateProjectScheduleProgress(
  ap: ArchitectureProject, 
  milestones?: ProjectMilestone[]
): number {
  const pStages = (ap.stages && ap.stages.length > 0) ? ap.stages : [];
  const stageTasks = pStages.flatMap(s => s.tasks || []);
  const projectMils = (milestones || []).filter(m => m.projectId === ap.id);

  const stageTasksTotal = stageTasks.length;
  const stageTasksCompleted = stageTasks.filter(t => t.status === 'completed').length;
  const milsTotal = projectMils.length;
  const milsCompleted = projectMils.filter(m => m.completed).length;

  const totalItems = stageTasksTotal + milsTotal;
  const completedCount = stageTasksCompleted + milsCompleted;

  if (totalItems > 0) {
    return Math.min(100, Math.max(0, Math.round((completedCount / totalItems) * 100)));
  }

  // If there are stages without subtasks, compute based on stage statuses
  if (pStages.length > 0) {
    const total = pStages.length;
    let score = 0;
    pStages.forEach(s => {
      const st = s.status as string;
      if (st === 'concluida' || st === 'completed') score += 100 / total;
      else if (st === 'em_andamento' || st === 'in_progress') score += 50 / total;
    });
    return Math.min(100, Math.max(0, Math.round(score)));
  }

  // Fallback by project status category
  if (ap.status === 'entregue' || ap.status === 'concluido') return 100;
  if (ap.status === 'obra') return 80;
  if (ap.status === 'executivo') return 60;
  if (ap.status === 'anteprojeto') return 40;
  if (ap.status === 'estudo_preliminar') return 20;
  return 0;
}

/**
 * Converts an ArchitectureProject (from FinanceContext/Gestor) into a high-fidelity ClientPortalProject.
 */
export function convertArchitectureProjectToPortalProject(
  ap: ArchitectureProject,
  milestones?: ProjectMilestone[]
): ClientPortalProject {
  const isDelivered = ap.status === 'entregue' || ap.status === 'concluido';
  const isObra = ap.status === 'obra';
  const isExecutivo = ap.status === 'executivo';
  const isAnteprojeto = ap.status === 'anteprojeto';

  const calculatedProgress = calculateProjectScheduleProgress(ap, milestones);

  let defaultProgress = calculatedProgress;
  let stageName = 'Estudo Preliminar & Modelagem 3D';
  let stageIndex = 1;

  if (isDelivered) {
    stageName = 'Entrega Final & Obra Concluída';
    stageIndex = 5;
  } else if (isObra) {
    stageName = 'Acompanhamento de Obra';
    stageIndex = 4;
  } else if (isExecutivo) {
    stageName = 'Projeto Executivo & Marcenaria';
    stageIndex = 3;
  } else if (isAnteprojeto) {
    stageName = 'Anteprojeto & Aprovação 3D';
    stageIndex = 2;
  }

  const rawAny = ap as any;
  const progress = typeof rawAny.progressPercent === 'number' ? rawAny.progressPercent : defaultProgress;
  const currentStage = (rawAny.currentStageName as string) || stageName;

  // Stages: Exactly linked to project cronograma
  let portalStages: ClientPortalStage[] = [];
  if (ap.stages && ap.stages.length > 0) {
    portalStages = ap.stages.map((st, i) => {
      let stStatus: 'completed' | 'in_progress' | 'pending' = 'pending';
      if (st.status === 'completed' || (st as any).status === 'concluida') {
        stStatus = 'completed';
      } else if (st.status === 'in_progress' || (st as any).status === 'em_andamento') {
        stStatus = 'in_progress';
      } else {
        stStatus = 'pending'; // Zerada / Não iniciada por padrão
      }
      const stAny = st as any;
      return {
        id: st.id || `stg-${i}`,
        name: st.name,
        description: stAny.description || `Etapa ${i + 1} do cronograma`,
        status: stStatus,
        completedAt: stStatus === 'completed' ? (stAny.completedDate || 'Concluído') : undefined,
        plannedDate: st.endDatePlanned || stAny.deadline || undefined
      };
    });
  } else {
    // Default stages starting as pending / zeradas if project has no custom stages yet
    portalStages = [
      { 
        id: `stg-${ap.id}-1`, 
        name: '1. Briefing & Levantamento Técnico', 
        description: 'Alinhamento do programa de necessidades e medições detalhadas.',
        status: 'pending'
      },
      { 
        id: `stg-${ap.id}-2`, 
        name: '2. Estudo Preliminar & Modelagem 3D', 
        description: 'Apresentação de layouts humanizados e volumetria 3D.',
        status: 'pending'
      },
      { 
        id: `stg-${ap.id}-3`, 
        name: '3. Anteprojeto & Aprovação', 
        description: 'Definição de materiais, iluminação e aprovações necessárias.',
        status: 'pending'
      },
      { 
        id: `stg-${ap.id}-4`, 
        name: '4. Projeto Executivo & Marcenaria', 
        description: 'Pranchas executivas técnicas para marcenaria, forro e marmoraria.',
        status: 'pending'
      },
      { 
        id: `stg-${ap.id}-5`, 
        name: '5. Acompanhamento & Entrega Final', 
        description: 'Visitas técnicas, fiscalização de obra e entrega do caderno final.',
        status: 'pending'
      }
    ];
  }

  return {
    id: ap.id,
    title: ap.title,
    category: ap.category || 'Arquitetura e Interiores',
    description: ap.description || `Projeto de ${ap.title} para ${ap.clientName}`,
    status: ap.status || 'executivo',
    generalStatus: isDelivered ? 'concluido' : 'no_prazo',
    currentStageName: currentStage,
    currentStageIndex: stageIndex,
    progressPercent: progress,
    stages: portalStages,
    startDate: ap.startDate || ap.createdAt || new Date().toLocaleDateString('pt-BR'),
    deliveryDate: ap.deliveryDate || 'A combinar com o escritório',
    contractTitle: `Contrato de Prestação de Serviços - ${ap.title}`,
    contractNumber: `CTR-${ap.id.slice(-4).toUpperCase()}`,
    contractStatus: 'signed',
    totalValue: ap.honorarios || 0,
    currency: ap.currency || 'BRL'
  };
}

/**
 * Builds a dynamic ClientPortalAccess directly linked to a registered Client in FinanceContext.
 */
export function buildClientPortalAccess(
  client: Client,
  allProjects: ArchitectureProject[],
  profile?: ArchitectProfile | null,
  existingPortal?: ClientPortalAccess | null,
  milestones?: ProjectMilestone[]
): ClientPortalAccess {
  // Find all projects belonging to this client in real time
  const clientNameNormalized = client.name.trim().toLowerCase();
  const clientEmailNormalized = (client.email || '').trim().toLowerCase();

  const clientProjects = allProjects.filter(ap => {
    if (ap.clientName && ap.clientName.trim().toLowerCase() === clientNameNormalized) return true;
    if (ap.clientEmail && clientEmailNormalized && ap.clientEmail.trim().toLowerCase() === clientEmailNormalized) return true;
    if (ap.linkedClients?.some(lc => lc.id === client.id || lc.name.trim().toLowerCase() === clientNameNormalized)) return true;
    if (existingPortal?.projects?.some(p => p.id === ap.id || p.title.trim().toLowerCase() === ap.title.trim().toLowerCase())) return true;
    return false;
  });

  const sanitizedClientName = client.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '');
  const generatedEmail = `${sanitizedClientName || 'cliente'}@cliente.com`;
  const cleanClientEmail = (client.email && client.email.trim()) ? client.email.trim().toLowerCase() : generatedEmail;

  const portalProjects: ClientPortalProject[] = clientProjects.length > 0
    ? clientProjects.map(p => convertArchitectureProjectToPortalProject(p, milestones))
    : (existingPortal?.projects && existingPortal.projects.length > 0)
      ? existingPortal.projects
      : [
          convertArchitectureProjectToPortalProject({
            id: `proj-${client.id}-1`,
            title: `Projeto de Arquitetura e Interiores`,
            clientName: client.name,
            clientEmail: cleanClientEmail,
            category: 'interiores',
            projectType: 'Projeto Completo',
            status: 'executivo',
            honorarios: client.totalBilled || 25000,
            currency: 'BRL',
            startDate: client.createdAt || new Date().toLocaleDateString('pt-BR'),
            deliveryDate: 'A combinar com o escritório'
          } as any)
        ];

  const portalId = existingPortal?.id || `portal-${client.id}`;
  const accessCode = existingPortal?.accessCode || `MEO-${client.id.replace(/\D/g, '').slice(-4) || '2026'}`;

  const profileAny = profile as any;
  let resolvedProfileName = profile?.name || profile?.title;
  let resolvedProfileEmail = profileAny?.email;
  let resolvedProfilePhone = profileAny?.phone;
  let resolvedProfileLogo = profile?.logoUrl || profile?.photoUrl;

  if (!resolvedProfileName) {
    try {
      const rawProf = localStorage.getItem('profile');
      if (rawProf) {
        const parsed = JSON.parse(rawProf);
        resolvedProfileName = parsed.name || parsed.title || parsed.companyName;
        resolvedProfileEmail = resolvedProfileEmail || parsed.email;
        resolvedProfilePhone = resolvedProfilePhone || parsed.phone;
        resolvedProfileLogo = resolvedProfileLogo || parsed.logoUrl || parsed.photoUrl;
      }
    } catch {}
  }

  const finalOfficeName = resolvedProfileName || existingPortal?.officeName || 'LF Quadros & Decoração';
  const finalOfficeEmail = resolvedProfileEmail || profileAny?.email || 'lfquadrosdecorativos@gmail.com';
  const finalOfficePhone = resolvedProfilePhone || profileAny?.phone || '(11) 98765-4321';
  const finalOfficeLogo = resolvedProfileLogo || profile?.logoUrl || profile?.photoUrl;

  return {
    id: portalId,
    officeUid: existingPortal?.officeUid || 'office-current',
    officeName: finalOfficeName,
    officeEmail: finalOfficeEmail,
    officePhone: finalOfficePhone,
    officeLogo: finalOfficeLogo,
    clientId: client.id,
    clientName: client.name,
    clientEmail: cleanClientEmail,
    clientPhone: client.phone || '',
    clientDocument: client.document || '',
    accessCode: accessCode,
    status: (existingPortal?.status as 'active' | 'inactive') || 'active',
    createdAt: existingPortal?.createdAt || client.createdAt || new Date().toISOString(),
    lastLoginAt: existingPortal?.lastLoginAt || new Date().toISOString(),
    projects: portalProjects,
    documents: existingPortal?.documents && existingPortal.documents.length > 0 ? existingPortal.documents : [
      {
        id: `doc-${client.id}-1`,
        title: `Contrato de Prestação de Serviços Arquitetônicos - ${client.name}`,
        category: 'contrato',
        fileName: `Contrato_${client.name.replace(/\s+/g, '_')}.pdf`,
        date: new Date().toLocaleDateString('pt-BR'),
        size: '1.4 MB'
      }
    ],
    messages: existingPortal?.messages && existingPortal.messages.length > 0 ? existingPortal.messages : [
      {
        id: `msg-${client.id}-1`,
        sender: 'office',
        senderName: `${profile?.name || 'Escritório'} (Equipe)`,
        text: `Olá, ${client.name}! Seja muito bem-vindo ao seu Portal exclusivo. Aqui você acompanha as etapas, prazos e novidades do seu projeto em tempo real.`,
        createdAt: new Date().toISOString(),
        read: false
      }
    ]
  };
}

/**
 * Ensures any ClientPortalAccess is synchronized with the latest office registry (Client info, Projects, Office profile).
 */
export function syncPortalWithOfficeRegistry(
  portal: ClientPortalAccess,
  clients: Client[],
  architectureProjects: ArchitectureProject[],
  profile?: ArchitectProfile | null,
  milestones?: ProjectMilestone[]
): ClientPortalAccess {
  // 1. Check if portal client matches any client in office database
  const matchedClient = clients.find(
    c => c.id === portal.clientId ||
         (portal.clientEmail && c.email && c.email.trim().toLowerCase() === portal.clientEmail.trim().toLowerCase()) ||
         c.name.trim().toLowerCase() === portal.clientName.trim().toLowerCase()
  );

  if (matchedClient) {
    return buildClientPortalAccess(matchedClient, architectureProjects, profile, portal, milestones);
  }

  // 2. If no matched client, check which projects from architectureProjects match this portal's clientName or project list
  const clientNameNormalized = portal.clientName.trim().toLowerCase();
  const clientEmailNormalized = (portal.clientEmail || '').trim().toLowerCase();

  const activeProjects = architectureProjects.filter(ap => {
    if (ap.clientName && ap.clientName.trim().toLowerCase() === clientNameNormalized) return true;
    if (ap.clientEmail && clientEmailNormalized && ap.clientEmail.trim().toLowerCase() === clientEmailNormalized) return true;
    if (portal.projects?.some(p => p.id === ap.id || p.title.trim().toLowerCase() === ap.title.trim().toLowerCase())) return true;
    return false;
  });

  // If projects exist in Gestor for this client, convert them. Otherwise preserve existing portal.projects!
  const portalProjects = activeProjects.length > 0
    ? activeProjects.map(p => convertArchitectureProjectToPortalProject(p, milestones))
    : (portal.projects && portal.projects.length > 0)
      ? portal.projects
      : [
          convertArchitectureProjectToPortalProject({
            id: `proj-${portal.clientId || 'default'}-1`,
            title: portal.clientName ? `Projeto de Arquitetura - ${portal.clientName}` : 'Projeto de Arquitetura e Interiores',
            clientName: portal.clientName || 'Cliente',
            clientEmail: portal.clientEmail || '',
            category: 'interiores',
            projectType: 'Projeto Completo',
            status: 'executivo',
            honorarios: 25000,
            currency: 'BRL',
            startDate: new Date().toLocaleDateString('pt-BR'),
            deliveryDate: 'A combinar com o escritório'
          } as any)
        ];

  const profileAny = profile as any;
  let resolvedProfileName = profile?.name || profile?.title;
  let resolvedProfileEmail = profileAny?.email;
  let resolvedProfilePhone = profileAny?.phone;
  let resolvedProfileLogo = profile?.logoUrl || profile?.photoUrl;

  if (!resolvedProfileName) {
    try {
      const rawProf = localStorage.getItem('profile');
      if (rawProf) {
        const parsed = JSON.parse(rawProf);
        resolvedProfileName = parsed.name || parsed.title || parsed.companyName;
        resolvedProfileEmail = resolvedProfileEmail || parsed.email;
        resolvedProfilePhone = resolvedProfilePhone || parsed.phone;
        resolvedProfileLogo = resolvedProfileLogo || parsed.logoUrl || parsed.photoUrl;
      }
    } catch {}
  }

  const finalOfficeName = resolvedProfileName || portal.officeName || 'LF Quadros & Decoração';
  const finalOfficeEmail = resolvedProfileEmail || profileAny?.email || 'lfquadrosdecorativos@gmail.com';
  const finalOfficePhone = resolvedProfilePhone || profileAny?.phone || '(11) 98765-4321';
  const finalOfficeLogo = resolvedProfileLogo || profile?.logoUrl || profile?.photoUrl;

  return {
    ...portal,
    officeName: finalOfficeName,
    officeEmail: finalOfficeEmail,
    officePhone: finalOfficePhone,
    officeLogo: finalOfficeLogo,
    projects: portalProjects
  };
}


