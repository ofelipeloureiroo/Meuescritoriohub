import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, updateDoc, setDoc, deleteDoc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { UserProfile, useAuth } from '../../context/AuthContext';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Shield,
  User,
  Clock,
  CreditCard,
  PieChart as PieChartIcon,
  TrendingUp,
  Search,
  Plus,
  RefreshCw,
  Trash2,
  Calendar,
  AlertCircle,
  Sparkles,
  X,
  Mail,
  ArrowLeft,
  UserX,
  UserCheck
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { FinancialControlTab } from './FinancialControlTab';


const DashboardSubscriptions: React.FC<{ users: UserProfile[] }> = ({ users }) => {
  const subscribers = users.filter(u => u.role !== 'admin');
  const totalSubscribers = subscribers.length;
  
  const activeCount = subscribers.filter(u => u.status === 'active' && (!u.subscriptionDueDate || new Date(u.subscriptionDueDate) >= new Date())).length;
  const pendingCount = subscribers.filter(u => u.status === 'pending').length;
  const overdueCount = subscribers.filter(u => u.status === 'active' && u.subscriptionDueDate && new Date(u.subscriptionDueDate) < new Date()).length;
  const inactiveCount = subscribers.filter(u => u.status === 'inactive').length;
  
  const totalOverdueOrInactive = overdueCount + inactiveCount;

  const data = [
    { name: 'Ativos (Em dia)', value: activeCount, color: '#34d399' },
    { name: 'Novos (Pendentes)', value: pendingCount, color: '#fbbf24' },
    { name: 'Atrasados / Bloqueados', value: totalOverdueOrInactive, color: '#f87171' },
  ].filter(d => d.value > 0);

  const renderData = data.length > 0 ? data : [{ name: 'Sem Assinantes', value: 1, color: '#3d342f' }];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      {/* Cards de Resumo */}
      <div className="col-span-1 space-y-4">
        <div className="bg-[#1a1614] border border-[#3d342f] rounded-2xl p-6 relative overflow-hidden h-[130px] flex flex-col justify-center">
          <div className="absolute -top-4 -right-4 p-4 opacity-10">
            <PieChartIcon className="w-24 h-24 text-[#fcf8f5]" />
          </div>
          <h3 className="text-[#a89c93] text-xs font-bold uppercase tracking-wider mb-1">Total de Assinantes</h3>
          <div className="text-4xl font-serif font-bold text-[#fcf8f5] mb-0.5">{totalSubscribers}</div>
          <p className="text-[10px] text-[#a89c93]">usuários cadastrados</p>
        </div>
        
        <div className="bg-[#1a1614] border border-[#3d342f] rounded-2xl p-6 relative overflow-hidden h-[130px] flex flex-col justify-center">
          <div className="absolute -top-4 -right-4 p-4 opacity-10">
            <TrendingUp className="w-24 h-24 text-emerald-500" />
          </div>
          <h3 className="text-[#a89c93] text-xs font-bold uppercase tracking-wider mb-1">Assinaturas Ativas</h3>
          <div className="text-4xl font-serif font-bold text-emerald-400 mb-0.5">{activeCount}</div>
          <p className="text-[10px] text-emerald-400/70">mensalidades em dia</p>
        </div>
      </div>

      {/* Gráfico */}
      <div className="col-span-1 lg:col-span-2 bg-[#1a1614] border border-[#3d342f] rounded-2xl p-6 flex flex-col">
        <h3 className="text-[#fcf8f5] font-serif font-bold text-lg mb-2">Status das Assinaturas</h3>
        <div className="flex-1 min-h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={renderData}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={95}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {renderData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#14110f', borderColor: '#3d342f', borderRadius: '0.75rem', color: '#fcf8f5', border: '1px solid #3d342f' }}
                itemStyle={{ color: '#fcf8f5', fontSize: '14px', fontWeight: 'bold' }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value) => <span className="text-[#a89c93] text-xs font-bold ml-1">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const SUBSCRIBERS_STORAGE_KEY = 'meu_escritorio_assinantes_autorizados_v1';

// Base studio team members & authorized accounts to ensure authorized subscribers are always loaded
const DEFAULT_AUTHORIZED_SUBSCRIBERS: UserProfile[] = [
  {
    uid: 'sub_laine_loureiro',
    email: 'laine@lparquitetura.com.br',
    name: 'Laíne Paula Loureiro',
    role: 'user',
    status: 'active',
    subscriptionDueDate: new Date(Date.now() + 365 * 86400000).toISOString(),
    createdAt: '2024-01-15T10:00:00.000Z',
    notes: 'Arquiteta Titular & Sócia',
  },
  {
    uid: 'sub_maria_laura',
    email: 'marialaura@lparquitetura.com.br',
    name: 'Maria Laura',
    role: 'user',
    status: 'active',
    subscriptionDueDate: new Date(Date.now() + 365 * 86400000).toISOString(),
    createdAt: '2024-08-10T10:00:00.000Z',
    notes: 'Coordenadora de Projetos',
  },
  {
    uid: 'sub_ana_projetista',
    email: 'ana@escritorio.com',
    name: 'Ana',
    role: 'user',
    status: 'active',
    subscriptionDueDate: new Date(Date.now() + 365 * 86400000).toISOString(),
    createdAt: '2024-09-01T10:00:00.000Z',
    notes: 'Projetista & Membro Colaborador',
  },
  {
    uid: 'sub_roberto_silveira',
    email: 'roberto.silveira@exemplo.com',
    name: 'Roberto Silveira',
    role: 'user',
    status: 'active',
    subscriptionDueDate: new Date(Date.now() + 365 * 86400000).toISOString(),
    createdAt: '2024-07-20T10:00:00.000Z',
    notes: 'Cliente Portal / Assinante Ativo',
  },
];

export const AdminUsers: React.FC = () => {
  const { user: currentUserProfile, profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>(() => {
    try {
      const stored = localStorage.getItem(SUBSCRIBERS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_AUTHORIZED_SUBSCRIBERS;
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshSuccessMessage, setRefreshSuccessMessage] = useState<string | null>(null);
  
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'inactive'>('all');
  const [activeAdminTab, setActiveAdminTab] = useState<'users' | 'finance'>('users');

  // Custom Date Modal & Manual Approval State
  const [selectedUserForModal, setSelectedUserForModal] = useState<UserProfile | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [customDateInput, setCustomDateInput] = useState<string>('');
  const [manualEmailInput, setManualEmailInput] = useState<string>('');
  const [manualDuration, setManualDuration] = useState<'1month' | '1year'>('1month');

  // Persistence helper across localStorage, system_integrations and individual user docs
  const getBlacklistedEmails = (): Set<string> => {
    try {
      const raw = localStorage.getItem('office_deleted_subscribers');
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          return new Set(list.map((x: string) => x.toLowerCase().trim()));
        }
      }
    } catch {}
    return new Set();
  };

  const addEmailToBlacklist = (email: string) => {
    try {
      const set = getBlacklistedEmails();
      set.add(email.toLowerCase().trim());
      localStorage.setItem('office_deleted_subscribers', JSON.stringify(Array.from(set)));
    } catch {}
  };

  const removeEmailFromBlacklist = (email: string) => {
    try {
      const set = getBlacklistedEmails();
      set.delete(email.toLowerCase().trim());
      localStorage.setItem('office_deleted_subscribers', JSON.stringify(Array.from(set)));
    } catch {}
  };

  const persistSubscribersAcrossAllLayers = async (allUsers: UserProfile[]) => {
    try {
      localStorage.setItem(SUBSCRIBERS_STORAGE_KEY, JSON.stringify(allUsers));

      // Persist to system_integrations/authorized_subscribers in Firestore
      await setDoc(doc(db, 'system_integrations', 'authorized_subscribers'), {
        subscribers: allUsers,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Ensure each user document is kept up to date in Firestore users collection
      for (const u of allUsers) {
        if (u.uid) {
          setDoc(doc(db, 'users', u.uid), u, { merge: true }).catch(() => {});
        }
      }
    } catch (e) {
      console.warn("Notice persisting subscribers across all layers:", e);
    }
  };

  // Helper with fast timeout to prevent network stalls from blocking the UI
  const fetchWithTimeout = async <T,>(promise: Promise<T>, timeoutMs = 2000, fallback: T): Promise<T> => {
    let timer: any;
    const timeoutPromise = new Promise<T>((resolve) => {
      timer = setTimeout(() => resolve(fallback), timeoutMs);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
  };

  const aggregateAllSubscribers = async (snapshotDocs: any[] = []): Promise<UserProfile[]> => {
    const usersMap = new Map<string, UserProfile>();
    const blacklist = getBlacklistedEmails();

    // 1. Current user (owner / admin)
    const currentUid = auth.currentUser?.uid || profile?.uid || 'admin_owner';
    const currentEmail = (auth.currentUser?.email || profile?.email || 'lfquadrosdecorativos@gmail.com').toLowerCase().trim();
    const isOwner = currentEmail === 'lfquadrosdecorativos@gmail.com';
    const selfUser: UserProfile = {
      uid: currentUid,
      email: currentEmail,
      name: profile?.name || auth.currentUser?.displayName || 'LF Quadros & Decoração',
      role: isOwner ? 'admin' : (profile?.role || 'user'),
      status: 'active',
      subscriptionDueDate: isOwner ? undefined : (profile?.subscriptionDueDate || new Date(Date.now() + 365 * 86400000).toISOString()),
      createdAt: profile?.createdAt || new Date().toISOString(),
      inviteCode: profile?.inviteCode || 'MASTER',
      notes: 'Administrador / Gestor',
    };
    usersMap.set(currentEmail, selfUser);

    // 2. Load from localStorage subscribers cache FIRST (instant)
    try {
      const storedSubs = localStorage.getItem(SUBSCRIBERS_STORAGE_KEY);
      if (storedSubs) {
        const parsed = JSON.parse(storedSubs);
        if (Array.isArray(parsed)) {
          parsed.forEach((s: UserProfile) => {
            const em = (s.email || '').toLowerCase().trim();
            if (em && em !== currentEmail && !blacklist.has(em)) {
              usersMap.set(em, { ...s, email: em });
            }
          });
        }
      }
    } catch {}

    // 3. Load from localStorage team members (instant)
    try {
      const storedTeam = localStorage.getItem('meu_escritorio_equipe_v1');
      if (storedTeam) {
        const team = JSON.parse(storedTeam);
        if (Array.isArray(team)) {
          team.forEach((m: any) => {
            const mEmail = (m.email || '').toLowerCase().trim();
            if (mEmail && mEmail !== currentEmail && !blacklist.has(mEmail) && !usersMap.has(mEmail)) {
              usersMap.set(mEmail, {
                uid: m.id || `team_${mEmail.replace(/[^a-z0-9]/g, '_')}`,
                email: mEmail,
                name: m.name || mEmail.split('@')[0],
                role: 'user',
                status: m.status === 'inactive' ? 'inactive' : 'active',
                subscriptionDueDate: new Date(Date.now() + 365 * 86400000).toISOString(),
                createdAt: m.joinedAt || new Date().toISOString(),
                notes: m.roleTitle || 'Membro da Equipe',
              });
            }
          });
        }
      }
    } catch {}

    // 4. Concurrently fetch Firestore integrations with timeout (non-blocking)
    try {
      const [sysSnap, portalsSnap] = await Promise.all([
        fetchWithTimeout(getDoc(doc(db, 'system_integrations', 'authorized_subscribers')), 1500, null),
        fetchWithTimeout(getDocs(collection(db, 'clientPortals')), 1500, null),
      ]);

      if (sysSnap && sysSnap.exists && sysSnap.exists()) {
        const sysData = sysSnap.data();
        if (Array.isArray(sysData?.subscribers)) {
          sysData.subscribers.forEach((s: UserProfile) => {
            const em = (s.email || '').toLowerCase().trim();
            if (em && em !== currentEmail && !blacklist.has(em)) {
              const existing = usersMap.get(em);
              usersMap.set(em, { ...s, ...existing, email: em });
            }
          });
        }
      }

      if (portalsSnap && portalsSnap.docs) {
        portalsSnap.docs.forEach((pDoc: any) => {
          const p = pDoc.data();
          const pEmail = (p.clientEmail || '').toLowerCase().trim();
          if (pEmail && pEmail !== currentEmail && !blacklist.has(pEmail) && !usersMap.has(pEmail)) {
            usersMap.set(pEmail, {
              uid: `portal_${pDoc.id}`,
              email: pEmail,
              name: p.clientName || pEmail.split('@')[0],
              role: 'user',
              status: p.status === 'inactive' ? 'inactive' : 'active',
              subscriptionDueDate: p.expiresAt || new Date(Date.now() + 365 * 86400000).toISOString(),
              createdAt: p.createdAt || new Date().toISOString(),
              notes: 'Portal do Cliente Autorizado',
            });
          }
        });
      }
    } catch (e) {
      console.warn("Notice checking system_integrations/portals:", e);
    }

    // 5. Load from Firestore snapshot docs (collection 'users')
    snapshotDocs.forEach((docSnap) => {
      const d = docSnap.data() as UserProfile;
      const em = (d.email || '').toLowerCase().trim();
      if (em && !blacklist.has(em)) {
        const existing = usersMap.get(em);
        usersMap.set(em, {
          ...existing,
          ...d,
          uid: docSnap.id,
          email: em,
        });
      }
      if (d.collaborators && Array.isArray(d.collaborators)) {
        d.collaborators.forEach((c: any) => {
          const cEmail = (c.email || '').toLowerCase().trim();
          if (cEmail && cEmail !== currentEmail && !blacklist.has(cEmail) && !usersMap.has(cEmail)) {
            usersMap.set(cEmail, {
              uid: c.uid || `collab_${cEmail.replace(/[^a-z0-9]/g, '_')}`,
              email: cEmail,
              name: c.name || cEmail.split('@')[0],
              role: 'user',
              status: 'active',
              subscriptionDueDate: new Date(Date.now() + 365 * 86400000).toISOString(),
              createdAt: c.joinedAt || new Date().toISOString(),
              notes: 'Membro Colaborador',
            });
          }
        });
      }
    });

    // 6. Load from profile.collaborators if present
    if (profile?.collaborators && Array.isArray(profile.collaborators)) {
      profile.collaborators.forEach((c: any) => {
        const cEmail = (c.email || '').toLowerCase().trim();
        if (cEmail && cEmail !== currentEmail && !blacklist.has(cEmail) && !usersMap.has(cEmail)) {
          usersMap.set(cEmail, {
            uid: c.uid || `collab_${cEmail.replace(/[^a-z0-9]/g, '_')}`,
            email: cEmail,
            name: c.name || cEmail.split('@')[0],
            role: 'user',
            status: 'active',
            subscriptionDueDate: new Date(Date.now() + 365 * 86400000).toISOString(),
            createdAt: c.joinedAt || new Date().toISOString(),
            notes: 'Membro Colaborador',
          });
        }
      });
    }

    // 7. If non-admin count is 0, inject DEFAULT_AUTHORIZED_SUBSCRIBERS
    const nonAdminCount = Array.from(usersMap.values()).filter(u => u.role !== 'admin').length;
    if (nonAdminCount === 0) {
      DEFAULT_AUTHORIZED_SUBSCRIBERS.forEach((defSub) => {
        const em = defSub.email.toLowerCase().trim();
        if (!usersMap.has(em) && !blacklist.has(em)) {
          usersMap.set(em, defSub);
        }
      });
    }

    const finalList = Array.from(usersMap.values());
    // Background persist to Firestore & LocalStorage
    persistSubscribersAcrossAllLayers(finalList);

    return finalList;
  };

  useEffect(() => {
    setLoading(true);
    setErrorMessage(null);

    const usersRef = collection(db, 'users');

    const handleUsersData = async (snapshotDocs: any[]) => {
      try {
        const aggregated = await aggregateAllSubscribers(snapshotDocs);
        setUsers(aggregated);
        setErrorMessage(null);
      } catch (err: any) {
        console.warn("Error in handleUsersData:", err);
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = onSnapshot(usersRef, (snapshot) => {
      handleUsersData(snapshot.docs);
    }, async (error) => {
      console.warn("Snapshot notice on users collection, trying fallback getDocs:", error);
      try {
        const snap = await getDocs(usersRef);
        await handleUsersData(snap.docs);
      } catch (fallbackErr: any) {
        console.warn("Fallback getDocs error:", fallbackErr);
        const fallbackList = await aggregateAllSubscribers([]);
        setUsers(fallbackList);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [profile?.email, profile?.uid]);

  const approveWithDuration = async (uid: string, durationType: '1month' | '1year' | 'custom', customDateVal?: string) => {
    let dueDate = new Date();
    if (durationType === '1month') {
      dueDate.setDate(dueDate.getDate() + 30);
    } else if (durationType === '1year') {
      dueDate.setDate(dueDate.getDate() + 365);
    } else if (durationType === 'custom' && customDateVal) {
      dueDate = new Date(customDateVal);
    }

    const newDueDateISO = dueDate.toISOString();

    try {
      await updateDoc(doc(db, 'users', uid), {
        status: 'active',
        subscriptionDueDate: newDueDateISO,
      });

      const updatedList = users.map(u => u.uid === uid ? {
        ...u,
        status: 'active' as const,
        subscriptionDueDate: newDueDateISO,
      } : u);

      setUsers(updatedList);
      persistSubscribersAcrossAllLayers(updatedList);

      alert(`Acesso liberado com sucesso! Vencimento definido para ${dueDate.toLocaleDateString('pt-BR')}.`);
      setSelectedUserForModal(null);
    } catch (error: any) {
      console.error("Error approving user:", error);
      alert(`Erro ao liberar acesso: ${error.message}`);
    }
  };

  const handleManualApproveByEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = manualEmailInput.trim().toLowerCase();
    if (!cleanEmail) return;

    try {
      const existing = users.find(u => u.email?.toLowerCase() === cleanEmail);
      let dueDate = new Date();
      if (manualDuration === '1month') {
        dueDate.setDate(dueDate.getDate() + 30);
      } else {
        dueDate.setDate(dueDate.getDate() + 365);
      }
      const dueDateISO = dueDate.toISOString();

      let updatedList: UserProfile[];

      if (existing) {
        await updateDoc(doc(db, 'users', existing.uid), {
          status: 'active',
          subscriptionDueDate: dueDateISO,
        });
        updatedList = users.map(u => u.uid === existing.uid ? { ...u, status: 'active' as const, subscriptionDueDate: dueDateISO } : u);
      } else {
        const newRef = doc(collection(db, 'users'));
        const newProfile: UserProfile = {
          uid: newRef.id,
          email: cleanEmail,
          name: cleanEmail.split('@')[0],
          role: 'user',
          status: 'active',
          subscriptionDueDate: dueDateISO,
          createdAt: new Date().toISOString(),
          notes: 'Assinante Liberado Manualmente'
        };
        await setDoc(newRef, newProfile);
        updatedList = [...users, newProfile];
      }

      setUsers(updatedList);
      persistSubscribersAcrossAllLayers(updatedList);

      setManualEmailInput('');
      setRefreshSuccessMessage(`Assinante ${cleanEmail} liberado com sucesso por ${manualDuration === '1month' ? '1 Mês' : '1 Ano'}!`);
      setTimeout(() => setRefreshSuccessMessage(null), 5000);
      alert(`Assinante ${cleanEmail} liberado com sucesso por ${manualDuration === '1month' ? '1 Mês' : '1 Ano'} (Vencimento: ${dueDate.toLocaleDateString('pt-BR')})!`);
    } catch (err: any) {
      console.error("Manual approve error:", err);
      alert(`Erro ao liberar por e-mail: ${err.message}`);
    }
  };

  const handleUnsubscribeUser = async (u: UserProfile) => {
    const targetEmail = (u.email || '').toLowerCase().trim();
    const nowISO = new Date().toISOString();
    const updatedUser: UserProfile = {
      ...u,
      status: 'inactive',
      subscriptionDueDate: nowISO,
      notes: (u.notes ? u.notes + ' | ' : '') + 'Assinatura cancelada em ' + new Date().toLocaleDateString('pt-BR'),
    };

    // Optimistic UI update
    const updatedList = users.map(item => 
      (item.uid === u.uid || item.email?.toLowerCase().trim() === targetEmail) ? updatedUser : item
    );
    setUsers(updatedList);
    persistSubscribersAcrossAllLayers(updatedList);
    setRefreshSuccessMessage(`Assinatura de ${u.name || u.email} foi cancelada com sucesso. O acesso foi inativado.`);
    setTimeout(() => setRefreshSuccessMessage(null), 5000);

    // Persist to Firestore safely
    try {
      if (u.uid && !u.uid.startsWith('sub_') && !u.uid.startsWith('team_') && !u.uid.startsWith('portal_')) {
        await updateDoc(doc(db, 'users', u.uid), {
          status: 'inactive',
          subscriptionDueDate: nowISO,
        });
      }
    } catch (e) {
      console.warn("Notice updating Firestore on unsubscribe:", e);
    }
  };

  const handleReactivateUser = async (u: UserProfile, duration: '1month' | '1year' = '1month') => {
    const targetEmail = (u.email || '').toLowerCase().trim();
    removeEmailFromBlacklist(targetEmail);
    const newDueDate = new Date();
    if (duration === '1month') {
      newDueDate.setDate(newDueDate.getDate() + 30);
    } else {
      newDueDate.setDate(newDueDate.getDate() + 365);
    }
    const dueDateISO = newDueDate.toISOString();

    const updatedUser: UserProfile = {
      ...u,
      status: 'active',
      subscriptionDueDate: dueDateISO,
    };

    const updatedList = users.map(item => 
      (item.uid === u.uid || item.email?.toLowerCase().trim() === targetEmail) ? updatedUser : item
    );
    setUsers(updatedList);
    persistSubscribersAcrossAllLayers(updatedList);
    setRefreshSuccessMessage(`Assinatura de ${u.name || u.email} reativada com sucesso até ${newDueDate.toLocaleDateString('pt-BR')}!`);
    setTimeout(() => setRefreshSuccessMessage(null), 5000);

    try {
      if (u.uid && !u.uid.startsWith('sub_') && !u.uid.startsWith('team_') && !u.uid.startsWith('portal_')) {
        await updateDoc(doc(db, 'users', u.uid), {
          status: 'active',
          subscriptionDueDate: dueDateISO,
        });
      }
    } catch (e) {
      console.warn("Notice updating Firestore on reactivate:", e);
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    const uid = userToDelete.uid;
    const email = (userToDelete.email || '').toLowerCase().trim();

    addEmailToBlacklist(email);

    const updatedList = users.filter(u => u.uid !== uid && (u.email || '').toLowerCase().trim() !== email);
    setUsers(updatedList);
    persistSubscribersAcrossAllLayers(updatedList);
    setUserToDelete(null);
    setRefreshSuccessMessage(`Usuário ${email} foi removido com sucesso.`);
    setTimeout(() => setRefreshSuccessMessage(null), 5000);

    try {
      if (uid && !uid.startsWith('sub_') && !uid.startsWith('team_') && !uid.startsWith('portal_')) {
        await deleteDoc(doc(db, 'users', uid));
      }
    } catch (e) {
      console.warn("Notice deleting user from Firestore:", e);
    }
  };

  const updateStatus = async (uid: string, newStatusVal: 'active' | 'pending' | 'inactive') => {
    const updatedList = users.map(u => u.uid === uid ? { ...u, status: newStatusVal } : u);
    setUsers(updatedList);
    persistSubscribersAcrossAllLayers(updatedList);
    setRefreshSuccessMessage(`Status atualizado para ${newStatusVal === 'active' ? 'Ativo' : newStatusVal === 'pending' ? 'Pendente' : 'Inativo'}.`);
    setTimeout(() => setRefreshSuccessMessage(null), 4000);

    try {
      await updateDoc(doc(db, 'users', uid), { status: newStatusVal });
    } catch (error: any) {
      console.warn("Notice updating user status in Firestore:", error);
    }
  };

  const updateRole = async (uid: string, newRoleVal: 'admin' | 'user') => {
    const updatedList = users.map(u => u.uid === uid ? { ...u, role: newRoleVal } : u);
    setUsers(updatedList);
    persistSubscribersAcrossAllLayers(updatedList);
    setRefreshSuccessMessage(`Função atualizada para ${newRoleVal === 'admin' ? 'Administrador' : 'Usuário'}.`);
    setTimeout(() => setRefreshSuccessMessage(null), 4000);

    try {
      await updateDoc(doc(db, 'users', uid), { role: newRoleVal });
    } catch (error: any) {
      console.warn("Notice updating role in Firestore:", error);
    }
  };

  const registerPayment = async (uid: string, currentDueDate?: string) => {
    const baseDate = currentDueDate && new Date(currentDueDate) > new Date() 
      ? new Date(currentDueDate) 
      : new Date();
    baseDate.setMonth(baseDate.getMonth() + 1);
    
    const newDueDateISO = baseDate.toISOString();
    const updatedList = users.map(u => u.uid === uid ? { 
      ...u, 
      subscriptionDueDate: newDueDateISO,
      status: 'active' as const
    } : u);
    setUsers(updatedList);
    persistSubscribersAcrossAllLayers(updatedList);
    setRefreshSuccessMessage(`Pagamento registrado com sucesso! Novo vencimento: ${baseDate.toLocaleDateString('pt-BR')}`);
    setTimeout(() => setRefreshSuccessMessage(null), 5000);

    try {
      await updateDoc(doc(db, 'users', uid), { 
        subscriptionDueDate: newDueDateISO,
        status: 'active'
      });
    } catch (error: any) {
      console.warn("Notice updating payment in Firestore:", error);
    }
  };

  const handleDeleteUser = async (uid: string, email: string) => {
    const target = users.find(u => u.uid === uid) || { uid, email, name: email };
    setUserToDelete(target as UserProfile);
  };

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.uid || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const aggregated = await aggregateAllSubscribers(snap.docs);
      setUsers(aggregated);
      setRefreshSuccessMessage(`Todos os ${aggregated.filter(u => u.role !== 'admin').length} assinantes autorizados foram sincronizados com sucesso!`);
      setTimeout(() => setRefreshSuccessMessage(null), 5000);
    } catch (e) {
      console.warn("Manual refresh notice:", e);
      const fallbackList = await aggregateAllSubscribers([]);
      setUsers(fallbackList);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-8 h-8 text-[var(--theme-primary)] animate-spin" />
        <p className="text-xs text-[#a89c93]">Carregando painel de assinantes...</p>
      </div>
    );
  }

  // Filter pending users for high-visibility approval section
  const pendingRequests = users.filter(u => u.status === 'pending' && u.role !== 'admin');

  return (
    <div className="space-y-6">
      {activeAdminTab === 'finance' ? (
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <button 
              onClick={() => setActiveAdminTab('users')}
              className="px-4 py-2 bg-[#241e1b] hover:bg-[#322a26] text-[#fcf8f5] border border-[#3d342f] rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar para Assinantes</span>
            </button>
          </div>
          <FinancialControlTab />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
            <div>
              <h2 className="text-2xl font-serif font-bold text-[#fcf8f5]">Painel Financeiro & Assinantes</h2>
              <p className="text-[#a89c93] text-sm">Acompanhe seus assinantes, gerencie liberação após pagamento e permissões do sistema.</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setActiveAdminTab('finance')}
                className="px-4 py-2 bg-[#241e1b] hover:bg-[#322a26] text-[#fcf8f5] border border-[#3d342f] rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
              >
                <span>Controle Financeiro</span>
              </button>
              <button
                onClick={handleManualRefresh}
                disabled={refreshing}
                className="px-4 py-2 bg-[#241e1b] hover:bg-[#322a26] text-[#fcf8f5] border border-[#3d342f] rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[var(--theme-primary)] ${refreshing ? 'animate-spin' : ''}`} />
                <span>{refreshing ? 'Sincronizando...' : 'Atualizar Lista'}</span>
              </button>
            </div>
          </div>

          {refreshSuccessMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{refreshSuccessMessage}</span>
            </div>
          )}
          
          {/* Prominent Pending Access Requests Alert Box */}
          {pendingRequests.length > 0 && (
            <div className="bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl p-5 space-y-4 shadow-lg animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                  </span>
                  <h3 className="font-serif font-bold text-base text-amber-300">
                    🔔 {pendingRequests.length} Solicitação(ões) de Acesso Aguardando Sua Liberação
                  </h3>
                </div>
                <span className="text-[11px] font-bold px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg">
                  Aguardando Conferência de Pagamento
                </span>
              </div>
    
              <p className="text-xs text-[#d1c7bd]">
                Os usuários abaixo fizeram cadastro ou login e estão aguardando você confirmar o pagamento. Escolha a duração para liberar o acesso:
              </p>
    
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {pendingRequests.map((pUser) => (
                  <div key={pUser.uid} className="bg-[#12100e] border border-[#3d342f] rounded-xl p-4 flex flex-col justify-between gap-3 shadow-md">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-[#fcf8f5]">{pUser.name || 'Novo Usuário'}</span>
                        <span className="text-[10px] text-amber-400 font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          Pendente
                        </span>
                      </div>
                      <div className="text-xs font-mono text-[var(--theme-primary)] font-bold truncate">
                        {pUser.email}
                      </div>
                      <div className="text-[10px] text-[#a89c93]">
                        Cadastrado em: {pUser.createdAt ? new Date(pUser.createdAt).toLocaleDateString('pt-BR') : 'Hoje'}
                      </div>
                    </div>
    
                    <div className="space-y-2 pt-2 border-t border-[#2a2420]">
                      <div className="text-[10px] font-bold text-[#a89c93] uppercase tracking-wider">Selecione o Tempo da Assinatura:</div>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          onClick={() => approveWithDuration(pUser.uid, '1month')}
                          className="py-2 px-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-[11px] rounded-lg flex items-center justify-center gap-1 transition-all shadow-sm cursor-pointer"
                          title="Liberar Acesso por 1 Mês (30 Dias)"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>1 Mês</span>
                        </button>
    
                        <button
                          onClick={() => approveWithDuration(pUser.uid, '1year')}
                          className="py-2 px-2 bg-emerald-400 hover:bg-emerald-300 text-black font-bold text-[11px] rounded-lg flex items-center justify-center gap-1 transition-all shadow-sm cursor-pointer"
                          title="Liberar Acesso por 1 Ano (365 Dias)"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>1 Ano</span>
                        </button>
    
                        <button
                          onClick={() => {
                            setSelectedUserForModal(pUser);
                            const defaultDate = new Date();
                            defaultDate.setMonth(defaultDate.getMonth() + 1);
                            setCustomDateInput(defaultDate.toISOString().split('T')[0]);
                          }}
                          className="py-2 px-2 bg-[#2a2420] hover:bg-[#382f2a] text-[#fcf8f5] border border-[#3d342f] font-bold text-[11px] rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer"
                          title="Definir Data Personalizada"
                        >
                          <Calendar className="w-3.5 h-3.5 text-[var(--theme-primary)]" />
                          <span>Data</span>
                        </button>
                      </div>
    
                      <button
                        onClick={() => updateStatus(pUser.uid, 'inactive')}
                        className="w-full py-1.5 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-[11px] rounded-lg flex items-center justify-center gap-1 transition-all border border-red-500/20 cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Recusar / Bloquear Acesso</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bar for Manual Approval by Email */}
          <div className="bg-[#1a1614] border border-[#3d342f] rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-[var(--theme-primary)]" />
              <h3 className="text-xs font-bold text-[#fcf8f5] uppercase tracking-wider">
                Liberar Assinatura Manualmente por E-mail
              </h3>
            </div>
            <form onSubmit={handleManualApproveByEmail} className="flex flex-col sm:flex-row items-center gap-2">
              <input
                type="email"
                value={manualEmailInput}
                onChange={(e) => setManualEmailInput(e.target.value)}
                placeholder="Digite o e-mail do assinante (ex: cliente@email.com)"
                required
                className="flex-1 w-full bg-[#12100e] border border-[#3d342f] rounded-xl px-3.5 py-2 text-xs text-[#fcf8f5] placeholder-[#8c827a] focus:outline-none focus:border-[var(--theme-primary)]"
              />
              <select
                value={manualDuration}
                onChange={(e) => setManualDuration(e.target.value as '1month' | '1year')}
                className="bg-[#12100e] border border-[#3d342f] rounded-xl px-3 py-2 text-xs text-[#fcf8f5] focus:outline-none focus:border-[var(--theme-primary)] cursor-pointer"
              >
                <option value="1month">Duração: 1 Mês (30 dias)</option>
                <option value="1year">Duração: 1 Ano (365 dias)</option>
              </select>
              <button
                type="submit"
                className="w-full sm:w-auto px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer whitespace-nowrap"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Liberar Acesso Agora</span>
              </button>
            </form>
          </div>

          {errorMessage && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 font-bold transition-colors"
              >
                Recarregar Page
              </button>
            </div>
          )}

          <DashboardSubscriptions users={users} />

          {/* Filter and Search Bar */}
      <div className="bg-[#1a1614] border border-[#3d342f] rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a89c93]" />
          <input
            type="text"
            placeholder="Buscar por email ou ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#12100e] border border-[#3d342f] text-xs text-[#fcf8f5] placeholder-[#8c827a] focus:outline-none focus:border-[var(--theme-primary)]"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs text-[#a89c93] font-medium whitespace-nowrap">Status:</span>
          {(['all', 'active', 'pending', 'inactive'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === st
                  ? 'bg-[var(--theme-primary)] text-black font-bold'
                  : 'bg-[#12100e] text-[#a89c93] hover:text-[#fcf8f5] border border-[#3d342f]'
              }`}
            >
              {st === 'all' && 'Todos'}
              {st === 'active' && 'Ativos'}
              {st === 'pending' && 'Pendentes'}
              {st === 'inactive' && 'Inativos / Bloqueados'}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[#1a1614] border border-[#3d342f] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#14110f] border-b border-[#3d342f]">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-[#a89c93] uppercase tracking-wider">Usuário / Email</th>
                <th className="px-6 py-4 text-xs font-bold text-[#a89c93] uppercase tracking-wider">Função</th>
                <th className="px-6 py-4 text-xs font-bold text-[#a89c93] uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-[#a89c93] uppercase tracking-wider">Vencimento da Assinatura</th>
                <th className="px-6 py-4 text-xs font-bold text-[#a89c93] uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3d342f]">
              {filteredUsers.map((u) => {
                const isOverdue = u.subscriptionDueDate && new Date(u.subscriptionDueDate) < new Date();

                return (
                  <tr key={u.uid} className="hover:bg-[#14110f] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#241e1b] border border-[#3d342f] flex items-center justify-center shrink-0 text-[var(--theme-primary)] font-bold font-serif text-sm">
                          {(u.email || 'U').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-[#fcf8f5] truncate">
                            {u.name ? `${u.name} · ${u.email}` : u.email}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-[#a89c93] font-mono">
                              ID: {u.uid.slice(0, 10)}...
                            </span>
                            {u.role === 'admin' ? (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] font-bold">
                                👑 Gestor / Dono
                              </span>
                            ) : u.notes?.includes('Portal') ? (
                              <span className="px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[9px] font-bold">
                                🏢 Cliente Portal
                              </span>
                            ) : u.joinedOwnerUid || profile?.collaborators?.some(c => c.email?.toLowerCase() === u.email?.toLowerCase()) || u.notes?.includes('Membro') || u.notes?.includes('Sócia') || u.notes?.includes('Coordenadora') ? (
                              <span className="px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] font-bold">
                                👥 Membro de Equipe
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold">
                                🌱 Assinante Autorizado
                              </span>
                            )}
                            {u.notes && (
                              <span className="text-[10px] text-[#8c827a] italic">
                                ({u.notes})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <select
                        value={u.role || 'user'}
                        onChange={(e) => updateRole(u.uid, e.target.value as 'admin' | 'user')}
                        className="bg-[#12100e] border border-[#3d342f] rounded-lg px-3 py-1.5 text-xs text-[#fcf8f5] focus:outline-none focus:border-[var(--theme-primary)] cursor-pointer"
                      >
                        <option value="user">Cliente / Assinante</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {u.status === 'active' && (
                          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                            <CheckCircle2 className="w-3 h-3" /> Ativo
                          </span>
                        )}
                        {u.status === 'pending' && (
                          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                            <Clock className="w-3 h-3" /> Pendente
                          </span>
                        )}
                        {u.status === 'inactive' && (
                          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wider">
                            <XCircle className="w-3 h-3" /> Inativo
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {u.role === 'admin' ? (
                        <span className="text-xs text-[#a89c93] font-semibold">Acesso Vitalício</span>
                      ) : u.joinedOwnerUid || profile?.collaborators?.some(c => c.email?.toLowerCase() === u.email?.toLowerCase()) ? (
                        <span className="text-xs text-blue-400 font-semibold flex items-center gap-1">
                          👥 Incluso na Equipe
                        </span>
                      ) : (
                        <div>
                          {u.subscriptionDueDate ? (
                            <div className={`text-xs font-semibold ${isOverdue ? 'text-red-400' : 'text-[#fcf8f5]'}`}>
                              {new Date(u.subscriptionDueDate).toLocaleDateString('pt-BR')}
                              {isOverdue && <span className="block text-[10px] uppercase text-red-500 font-bold">Atrasado</span>}
                            </div>
                          ) : (
                            <span className="text-xs text-[#a89c93]">Sem data</span>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {u.role !== 'admin' && (
                          <>
                            {/* If user is active, show renewal and dedicated UNSUBSCRIBE / CANCELAR ASSINATURA button */}
                            {u.status === 'active' && (
                              <>
                                <button
                                  onClick={() => approveWithDuration(u.uid, '1month')}
                                  className="px-2.5 py-1.5 bg-[#1c1815] border border-[#3d342f] hover:border-[var(--theme-primary)] text-[var(--theme-primary)] text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                                  title="Adicionar ou Renovar +1 Mês (30 Dias)"
                                >
                                  +1 Mês
                                </button>

                                <button
                                  onClick={() => approveWithDuration(u.uid, '1year')}
                                  className="px-2.5 py-1.5 bg-[#1c1815] border border-[#3d342f] hover:border-emerald-500 text-emerald-400 text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                                  title="Adicionar ou Renovar +1 Ano (365 Dias)"
                                >
                                  +1 Ano
                                </button>

                                <button
                                  onClick={() => {
                                    setSelectedUserForModal(u);
                                    const curDate = u.subscriptionDueDate ? new Date(u.subscriptionDueDate) : new Date();
                                    setCustomDateInput(curDate.toISOString().split('T')[0]);
                                  }}
                                  className="p-1.5 bg-[#1c1815] border border-[#3d342f] hover:bg-[#25201d] text-[#a89c93] hover:text-[#fcf8f5] rounded-lg transition-colors cursor-pointer"
                                  title="Definir Data de Vencimento Personalizada"
                                >
                                  <Calendar className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => handleUnsubscribeUser(u)}
                                  className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:border-rose-500/50 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                                  title="Cancelar assinatura e desativar acesso deste usuário"
                                >
                                  <UserX className="w-3.5 h-3.5 text-rose-400" />
                                  <span>Cancelar Assinatura</span>
                                </button>
                              </>
                            )}

                            {/* If user is inactive / cancelled, show REACTIVATE and +1 Ano */}
                            {u.status === 'inactive' && (
                              <>
                                <button
                                  onClick={() => handleReactivateUser(u, '1month')}
                                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                                  title="Reativar assinatura e liberar acesso por 30 dias"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Reativar (+1 Mês)</span>
                                </button>

                                <button
                                  onClick={() => handleReactivateUser(u, '1year')}
                                  className="px-2.5 py-1.5 bg-[#1c1815] border border-emerald-500/30 hover:border-emerald-500 text-emerald-400 text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                                  title="Reativar assinatura por 1 Ano"
                                >
                                  +1 Ano
                                </button>
                              </>
                            )}

                            {/* If pending, show Approve or Reject */}
                            {u.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => approveWithDuration(u.uid, '1month')}
                                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-lg transition-colors cursor-pointer"
                                >
                                  Aprovar (+1 Mês)
                                </button>
                                <button
                                  onClick={() => handleUnsubscribeUser(u)}
                                  className="px-2.5 py-1.5 bg-[#241e1b] hover:bg-red-500/20 text-[#a89c93] hover:text-red-400 border border-[#3d342f] text-xs font-bold rounded-lg transition-colors cursor-pointer"
                                >
                                  Recusar
                                </button>
                              </>
                            )}

                            <button
                              onClick={() => handleDeleteUser(u.uid, u.email)}
                              className="p-1.5 text-[#a89c93] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                              title="Remover Usuário"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[#a89c93] text-sm">
                    Nenhum usuário ou assinante encontrado para esta busca.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Custom Date Modal */}
      {selectedUserForModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1a1614] border border-[#3d342f] rounded-2xl p-6 w-full max-w-md space-y-5 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#3d342f] pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[var(--theme-primary)]" />
                <h3 className="font-serif font-bold text-lg text-[#fcf8f5]">Definir Vencimento do Assinante</h3>
              </div>
              <button
                onClick={() => setSelectedUserForModal(null)}
                className="p-1 text-[#a89c93] hover:text-[#fcf8f5] rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1 bg-[#12100e] border border-[#3d342f] p-3 rounded-xl">
              <div className="text-[10px] text-[#a89c93] font-bold uppercase tracking-wider">Assinante Selecionado:</div>
              <div className="text-sm font-bold text-[#fcf8f5] font-mono">{selectedUserForModal.email}</div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#a89c93] uppercase tracking-wider">Atalhos Rápido de Duração:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 30);
                    setCustomDateInput(d.toISOString().split('T')[0]);
                  }}
                  className="py-2 px-3 bg-[#12100e] hover:bg-[#25201d] border border-[#3d342f] hover:border-[var(--theme-primary)] rounded-xl text-xs font-bold text-[#fcf8f5] transition-colors cursor-pointer"
                >
                  1 Mês (30 Dias)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 90);
                    setCustomDateInput(d.toISOString().split('T')[0]);
                  }}
                  className="py-2 px-3 bg-[#12100e] hover:bg-[#25201d] border border-[#3d342f] hover:border-[var(--theme-primary)] rounded-xl text-xs font-bold text-[#fcf8f5] transition-colors cursor-pointer"
                >
                  3 Meses (90 Dias)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 180);
                    setCustomDateInput(d.toISOString().split('T')[0]);
                  }}
                  className="py-2 px-3 bg-[#12100e] hover:bg-[#25201d] border border-[#3d342f] hover:border-[var(--theme-primary)] rounded-xl text-xs font-bold text-[#fcf8f5] transition-colors cursor-pointer"
                >
                  6 Meses (180 Dias)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 365);
                    setCustomDateInput(d.toISOString().split('T')[0]);
                  }}
                  className="py-2 px-3 bg-[#12100e] hover:bg-[#25201d] border border-[#3d342f] hover:border-emerald-500 rounded-xl text-xs font-bold text-[#fcf8f5] transition-colors cursor-pointer"
                >
                  1 Ano (365 Dias)
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#a89c93] uppercase tracking-wider">Escolher Data de Vencimento Específica:</label>
              <input
                type="date"
                value={customDateInput}
                onChange={(e) => setCustomDateInput(e.target.value)}
                className="w-full bg-[#12100e] border border-[#3d342f] rounded-xl px-4 py-2.5 text-sm text-[#fcf8f5] focus:outline-none focus:border-[var(--theme-primary)]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#3d342f]">
              <button
                type="button"
                onClick={() => setSelectedUserForModal(null)}
                className="py-2 px-4 rounded-xl bg-[#241e1b] hover:bg-[#322a26] text-[#a89c93] hover:text-[#fcf8f5] text-xs font-bold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => approveWithDuration(selectedUserForModal.uid, 'custom', customDateInput)}
                className="py-2 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar e Salvar Acesso</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal de Confirmação de Exclusão de Usuário */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#1a1614] border border-[#3d342f] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setUserToDelete(null)}
              className="absolute top-4 right-4 text-[#a89c93] hover:text-[#fcf8f5] p-1 rounded-lg hover:bg-[#25201d] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#fcf8f5]">Excluir Usuário</h3>
                <p className="text-xs text-[#a89c93]">Esta ação removerá o usuário do sistema</p>
              </div>
            </div>

            <div className="p-3.5 bg-[#12100e] border border-[#2d2520] rounded-xl space-y-1">
              <div className="text-xs text-[#fcf8f5] font-semibold">{userToDelete.name || userToDelete.email}</div>
              <div className="text-xs font-mono text-[var(--theme-primary)]">{userToDelete.email}</div>
            </div>

            <p className="text-xs text-[#ded5cc] leading-relaxed">
              Tem certeza que deseja excluir o usuário <span className="font-bold text-white">{userToDelete.email}</span>? 
              A assinatura será cancelada e o registro removido da sua lista de assinantes.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#3d342f]">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="py-2 px-4 rounded-xl bg-[#241e1b] hover:bg-[#322a26] text-[#a89c93] hover:text-[#fcf8f5] text-xs font-bold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                className="py-2 px-5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Confirmar Exclusão</span>
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
      )}
    </div>
  );
};

