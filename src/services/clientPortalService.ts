import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  ClientPortalAccess, 
  ClientPortalDocument, 
  ClientPortalMessage, 
  ClientPortalProject 
} from '../types';

export const generateProvisionalPassword = (): string => {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = 'MEO-';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

/**
 * Creates or updates a Client Portal document in Firestore.
 */
export async function saveClientPortalAccess(portal: ClientPortalAccess): Promise<void> {
  const portalRef = doc(db, 'clientPortals', portal.id);
  await setDoc(portalRef, {
    ...portal,
    clientEmail: portal.clientEmail.trim().toLowerCase(),
    updatedAt: new Date().toISOString()
  }, { merge: true });
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
    return [];
  }
}

/**
 * Real-time listener for all portals of an office.
 */
export function subscribeToOfficePortals(
  officeUid: string, 
  callback: (portals: ClientPortalAccess[]) => void
): () => void {
  const q = query(collection(db, 'clientPortals'), where('officeUid', '==', officeUid));
  return onSnapshot(q, (snapshot) => {
    const list: ClientPortalAccess[] = [];
    snapshot.forEach((d) => {
      list.push(d.data() as ClientPortalAccess);
    });
    callback(list);
  }, (err) => {
    console.warn('Error subscribing to client portals:', err);
  });
}

/**
 * Real-time listener for a single client portal.
 */
export function subscribeToClientPortal(
  portalId: string, 
  callback: (portal: ClientPortalAccess | null) => void
): () => void {
  const portalRef = doc(db, 'clientPortals', portalId);
  return onSnapshot(portalRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as ClientPortalAccess);
    } else {
      callback(null);
    }
  }, (err) => {
    console.warn('Error subscribing to client portal doc:', err);
  });
}

/**
 * Authenticates a client by email and access code (or token).
 */
export async function loginClient(
  email: string, 
  accessCode: string
): Promise<{ success: boolean; portal?: ClientPortalAccess; error?: string }> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = accessCode.trim();

    const q = query(collection(db, 'clientPortals'), where('clientEmail', '==', cleanEmail));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return { 
        success: false, 
        error: 'Nenhum acesso de cliente localizado para este e-mail. Verifique se o escritório já liberou seu acesso.' 
      };
    }

    let matchingPortal: ClientPortalAccess | null = null;
    snapshot.forEach((d) => {
      const p = d.data() as ClientPortalAccess;
      // Case-insensitive code check or token match
      if (p.accessCode.trim().toUpperCase() === cleanCode.toUpperCase() || p.id === cleanCode) {
        matchingPortal = p;
      }
    });

    if (!matchingPortal) {
      return { 
        success: false, 
        error: 'Senha ou código de acesso incorreto. Verifique a senha enviada pelo seu escritório.' 
      };
    }

    const portal = matchingPortal as ClientPortalAccess;
    if (portal.status === 'inactive') {
      return { 
        success: false, 
        error: 'Seu acesso ao portal foi suspenso ou desativado pelo escritório. Entre em contato com a equipe responsável.' 
      };
    }

    // Update last login
    const portalRef = doc(db, 'clientPortals', portal.id);
    await updateDoc(portalRef, {
      lastLoginAt: new Date().toISOString()
    });

    return { success: true, portal };
  } catch (error: any) {
    console.error('Client login error:', error);
    return { success: false, error: error?.message || 'Erro ao autenticar cliente.' };
  }
}

/**
 * Password recovery request: checks if email exists and returns recovery details or updates temporary code.
 */
export async function recoverClientPassword(email: string): Promise<{ success: boolean; message: string; codePreview?: string }> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const q = query(collection(db, 'clientPortals'), where('clientEmail', '==', cleanEmail));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return { 
        success: false, 
        message: 'Nenhum cadastro de cliente encontrado com este e-mail. Solicite ao seu escritório a liberação do acesso.' 
      };
    }

    const firstDoc = snapshot.docs[0];
    const portal = firstDoc.data() as ClientPortalAccess;

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
  text: string
): Promise<void> {
  const portalRef = doc(db, 'clientPortals', portalId);
  const snap = await getDoc(portalRef);
  if (!snap.exists()) return;

  const portal = snap.data() as ClientPortalAccess;
  const newMessage: ClientPortalMessage = {
    id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    sender,
    senderName,
    text: text.trim(),
    createdAt: new Date().toISOString(),
    read: false
  };

  const updatedMessages = [...(portal.messages || []), newMessage];
  await updateDoc(portalRef, {
    messages: updatedMessages,
    updatedAt: new Date().toISOString()
  });
}

/**
 * Adds a document/deliverable to the client portal.
 */
export async function addPortalDocument(
  portalId: string, 
  document: Omit<ClientPortalDocument, 'id' | 'date'>
): Promise<void> {
  const portalRef = doc(db, 'clientPortals', portalId);
  const snap = await getDoc(portalRef);
  if (!snap.exists()) return;

  const portal = snap.data() as ClientPortalAccess;
  const newDoc: ClientPortalDocument = {
    ...document,
    id: 'doc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    date: new Date().toISOString()
  };

  const updatedDocs = [...(portal.documents || []), newDoc];
  await updateDoc(portalRef, {
    documents: updatedDocs,
    updatedAt: new Date().toISOString()
  });
}

/**
 * Removes a document from the portal.
 */
export async function deletePortalDocument(
  portalId: string, 
  documentId: string
): Promise<void> {
  const portalRef = doc(db, 'clientPortals', portalId);
  const snap = await getDoc(portalRef);
  if (!snap.exists()) return;

  const portal = snap.data() as ClientPortalAccess;
  const updatedDocs = (portal.documents || []).filter(d => d.id !== documentId);
  await updateDoc(portalRef, {
    documents: updatedDocs,
    updatedAt: new Date().toISOString()
  });
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
