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
  ClientPortalProject,
  ClientPortalStage,
  ArchitectureProject,
  Client,
  ArchitectProfile
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
 * Converts an ArchitectureProject (from FinanceContext/Gestor) into a high-fidelity ClientPortalProject.
 */
export function convertArchitectureProjectToPortalProject(ap: ArchitectureProject): ClientPortalProject {
  const isDelivered = ap.status === 'entregue' || ap.status === 'concluido';
  const isObra = ap.status === 'obra';
  const isExecutivo = ap.status === 'executivo';
  const isAnteprojeto = ap.status === 'anteprojeto';

  let defaultProgress = 30;
  let stageName = 'Estudo Preliminar & Modelagem 3D';
  let stageIndex = 1;

  if (isDelivered) {
    defaultProgress = 100;
    stageName = 'Entrega Final & Obra Concluída';
    stageIndex = 5;
  } else if (isObra) {
    defaultProgress = 80;
    stageName = 'Acompanhamento de Obra';
    stageIndex = 4;
  } else if (isExecutivo) {
    defaultProgress = 60;
    stageName = 'Projeto Executivo & Marcenaria';
    stageIndex = 3;
  } else if (isAnteprojeto) {
    defaultProgress = 40;
    stageName = 'Anteprojeto & Aprovação 3D';
    stageIndex = 2;
  }

  const rawAny = ap as any;
  const progress = typeof rawAny.progressPercent === 'number' ? rawAny.progressPercent : defaultProgress;
  const currentStage = (rawAny.currentStageName as string) || stageName;

  // Stages
  let portalStages: ClientPortalStage[] = [];
  if (ap.stages && ap.stages.length > 0) {
    portalStages = ap.stages.map((st, i) => {
      let stStatus: 'completed' | 'in_progress' | 'pending' = 'pending';
      if (st.status === 'completed') {
        stStatus = 'completed';
      } else if (st.status === 'in_progress') {
        stStatus = 'in_progress';
      }
      const stAny = st as any;
      return {
        id: st.id || `stg-${i}`,
        name: st.name,
        status: stStatus,
        completedAt: stStatus === 'completed' ? (stAny.completedDate || 'Concluído') : undefined,
        plannedDate: st.endDatePlanned || stAny.deadline || undefined
      };
    });
  } else {
    // Generate standard 5 stages reflecting project status & progress
    portalStages = [
      { 
        id: `stg-${ap.id}-1`, 
        name: '1. Briefing & Levantamento Técnico', 
        description: 'Alinhamento do programa de necessidades e medições detalhadas.',
        status: 'completed', 
        completedAt: 'Concluído' 
      },
      { 
        id: `stg-${ap.id}-2`, 
        name: '2. Estudo Preliminar & Modelagem 3D', 
        description: 'Apresentação de layouts humanizados e volumetria 3D.',
        status: (progress >= 35 ? 'completed' : 'in_progress'), 
        completedAt: progress >= 35 ? 'Concluído' : undefined 
      },
      { 
        id: `stg-${ap.id}-3`, 
        name: '3. Anteprojeto & Aprovação', 
        description: 'Definição de materiais, iluminação e aprovações necessárias.',
        status: (progress >= 55 ? 'completed' : progress >= 35 ? 'in_progress' : 'pending'), 
        completedAt: progress >= 55 ? 'Concluído' : undefined 
      },
      { 
        id: `stg-${ap.id}-4`, 
        name: '4. Projeto Executivo & Marcenaria', 
        description: 'Pranchas executivas técnicas para marcenaria, forro e marmoraria.',
        status: (progress >= 75 ? 'completed' : progress >= 55 ? 'in_progress' : 'pending') 
      },
      { 
        id: `stg-${ap.id}-5`, 
        name: '5. Acompanhamento & Entrega Final', 
        description: 'Visitas técnicas, fiscalização de obra e entrega do caderno final.',
        status: (progress >= 100 ? 'completed' : progress >= 75 ? 'in_progress' : 'pending') 
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
  existingPortal?: ClientPortalAccess | null
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

  const portalProjects: ClientPortalProject[] = clientProjects.map(convertArchitectureProjectToPortalProject);

  const portalId = existingPortal?.id || `portal-${client.id}`;
  const accessCode = existingPortal?.accessCode || `MEO-${client.id.replace(/\D/g, '').slice(-4) || '2026'}`;

  const profileAny = profile as any;

  return {
    id: portalId,
    officeUid: existingPortal?.officeUid || 'office-current',
    officeName: profile?.name || profile?.title || 'Studio Arq & Interiores',
    officeEmail: profileAny?.email || 'contato@escritorio.com',
    officePhone: profileAny?.phone || '(11) 98765-4321',
    officeLogo: profile?.logoUrl || profile?.photoUrl,
    clientId: client.id,
    clientName: client.name,
    clientEmail: client.email || `${client.name.toLowerCase().replace(/\s+/g, '.')}@cliente.com`,
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
  profile?: ArchitectProfile | null
): ClientPortalAccess {
  // 1. Check if portal client matches any client in office database
  const matchedClient = clients.find(
    c => c.id === portal.clientId ||
         (portal.clientEmail && c.email && c.email.trim().toLowerCase() === portal.clientEmail.trim().toLowerCase()) ||
         c.name.trim().toLowerCase() === portal.clientName.trim().toLowerCase()
  );

  if (matchedClient) {
    return buildClientPortalAccess(matchedClient, architectureProjects, profile, portal);
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

  // If projects exist in Gestor for this client, convert them
  const portalProjects = activeProjects.map(convertArchitectureProjectToPortalProject);

  const profileAny = profile as any;

  return {
    ...portal,
    officeName: profile?.name || profile?.title || portal.officeName,
    officeEmail: profileAny?.email || portal.officeEmail,
    officePhone: profileAny?.phone || portal.officePhone,
    officeLogo: profile?.logoUrl || profile?.photoUrl || portal.officeLogo,
    projects: portalProjects
  };
}


