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
      if (cleanEmail === SAMPLE_CLIENT_PORTAL.clientEmail.toLowerCase() &&
          (cleanCode.toUpperCase() === SAMPLE_CLIENT_PORTAL.accessCode.toUpperCase() || cleanCode === SAMPLE_CLIENT_PORTAL.id)) {
        return { success: true, portal: SAMPLE_CLIENT_PORTAL };
      }
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

/**
 * Permanently deletes a client portal document.
 */
export async function deleteClientPortalAccess(portalId: string): Promise<void> {
  const portalRef = doc(db, 'clientPortals', portalId);
  await deleteDoc(portalRef);
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

