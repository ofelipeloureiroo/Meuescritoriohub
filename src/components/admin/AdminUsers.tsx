import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, updateDoc, setDoc, deleteDoc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db, auth, sanitizeFirestoreData } from '../../lib/firebase';
import { UserProfile, useAuth } from '../../context/AuthContext';
import { SupportTicket } from '../../types';
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
  UserCheck,
  Headset,
  MessageSquare
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { FinancialControlTab } from './FinancialControlTab';
import { AdminSupportTab } from './AdminSupportTab';


export const isPlatformAdminAccount = (email?: string): boolean => {
  if (!email) return false;
  const em = email.toLowerCase().trim();
  return em === 'lfquadrosdecorativos@gmail.com' || em.includes('master_escritorio');
};

const DashboardSubscriptions: React.FC<{ users: UserProfile[] }> = ({ users }) => {
  const subscribers = users.filter(u => !isPlatformAdminAccount(u.email));
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

  const renderData = data.length > 0 ? data : [{ name: 'Sem Assinantes', value: 1, color: 'var(--border-color)' }];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      {/* Cards de Resumo */}
      <div className="col-span-1 space-y-4">
        <div className="bg-white border border-zinc-200/90 rounded-2xl p-6 relative overflow-hidden h-[130px] flex flex-col justify-center shadow-2xs">
          <div className="absolute -top-4 -right-4 p-4 opacity-5">
            <PieChartIcon className="w-24 h-24 text-zinc-900" />
          </div>
          <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">Total de Assinantes</h3>
          <div className="text-4xl font-serif font-extrabold text-zinc-900 mb-0.5">{totalSubscribers}</div>
          <p className="text-xs text-zinc-500 font-medium">usuários cadastrados</p>
        </div>
        
        <div className="bg-white border border-emerald-200/90 rounded-2xl p-6 relative overflow-hidden h-[130px] flex flex-col justify-center shadow-2xs">
          <div className="absolute -top-4 -right-4 p-4 opacity-10">
            <TrendingUp className="w-24 h-24 text-emerald-600" />
          </div>
          <h3 className="text-emerald-800 text-xs font-bold uppercase tracking-wider mb-1">Assinaturas Ativas</h3>
          <div className="text-4xl font-serif font-extrabold text-emerald-600 mb-0.5">{activeCount}</div>
          <p className="text-xs text-emerald-700 font-semibold">mensalidades em dia</p>
        </div>
      </div>

      {/* Gráfico */}
      <div className="col-span-1 lg:col-span-2 bg-white border border-zinc-200/90 rounded-2xl p-6 flex flex-col shadow-2xs">
        <h3 className="text-zinc-900 font-serif font-bold text-lg mb-2">Status das Assinaturas</h3>
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
                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e4e4e7', borderRadius: '0.75rem', color: '#18181b', border: '1px solid #e4e4e7', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                itemStyle={{ color: '#18181b', fontSize: '14px', fontWeight: 'bold' }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value) => <span className="text-zinc-700 text-xs font-bold ml-1">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const SUBSCRIBERS_STORAGE_KEY = 'meu_escritorio_assinantes_autorizados_v1';

// Helper to ensure ONLY platform subscribers & platform admins are included
export const isPlatformSubscriber = (u: UserProfile): boolean => {
  if (!u || !u.email) return false;
  const em = u.email.toLowerCase().trim();
  if (isPlatformAdminAccount(em) || u.role === 'admin') return true;
  if (em === 'lainepaulaarq@gmail.com') return true;

  // Exclude team members, collaborators, and portal clients
  if (u.joinedOwnerUid) return false;
  if (u.uid?.startsWith('team_') || u.uid?.startsWith('portal_') || u.uid?.startsWith('collab_')) return false;
  
  const notesLower = (u.notes || '').toLowerCase();
  if (
    notesLower.includes('membro') || 
    notesLower.includes('equipe') || 
    notesLower.includes('colaborador') || 
    notesLower.includes('portal') || 
    notesLower.includes('sócia') || 
    notesLower.includes('socia') || 
    notesLower.includes('projetista') || 
    notesLower.includes('coordenadora')
  ) {
    return false;
  }

  return true;
};

// Base authorized accounts (guaranteed platform subscribers)
export const DEFAULT_AUTHORIZED_SUBSCRIBERS: UserProfile[] = [
  {
    uid: 'sub_lainepaulaarq',
    email: 'lainepaulaarq@gmail.com',
    name: 'Laíne Paula Loureiro (LP Arquitetura)',
    role: 'user',
    status: 'active',
    subscriptionDueDate: '2027-09-21T00:00:00.000Z',
    createdAt: '2026-01-15T10:00:00.000Z',
    inviteCode: 'LAINEP',
    notes: 'Arquiteta Titular / Assinante Oficial da Plataforma',
  }
];

export const AdminUsers: React.FC = () => {
  const { user: currentUserProfile, profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>(() => {
    try {
      const stored = localStorage.getItem(SUBSCRIBERS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const map = new Map<string, UserProfile>();
          parsed.filter(isPlatformSubscriber).forEach((u: UserProfile) => {
            if (u.email) map.set(u.email.toLowerCase().trim(), u);
          });
          DEFAULT_AUTHORIZED_SUBSCRIBERS.forEach(d => {
            const em = d.email.toLowerCase().trim();
            if (!map.has(em)) map.set(em, d);
          });
          return Array.from(map.values());
        }
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
  const [activeAdminTab, setActiveAdminTab] = useState<'users' | 'finance' | 'support'>('users');
  const [waitingSupportCount, setWaitingSupportCount] = useState<number>(0);

  // Real-time support tickets counter for notification badge
  useEffect(() => {
    const calcCount = () => {
      let count = 0;
      try {
        const globalPool = localStorage.getItem('meu_escritorio_global_support_tickets');
        if (globalPool) {
          const parsedPool = JSON.parse(globalPool) as SupportTicket[];
          if (Array.isArray(parsedPool)) {
            parsedPool.forEach(d => {
              if (d.status === 'waiting_admin' || (d.unreadByAdmin && d.unreadByAdmin > 0)) {
                count++;
              }
            });
          }
        }
      } catch {}
      setWaitingSupportCount(count);
    };

    calcCount();
    const handleUpdate = () => calcCount();
    window.addEventListener('support_tickets_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    const unsub = onSnapshot(collection(db, 'support_tickets'), (snapshot) => {
      snapshot.forEach((d) => {
        const data = d.data() as SupportTicket;
        try {
          const rawPool = localStorage.getItem('meu_escritorio_global_support_tickets');
          let pool: SupportTicket[] = rawPool ? JSON.parse(rawPool) : [];
          const idx = pool.findIndex(t => t.id === d.id);
          if (idx >= 0) pool[idx] = { ...data, id: d.id };
          else pool.push({ ...data, id: d.id });
          localStorage.setItem('meu_escritorio_global_support_tickets', JSON.stringify(pool));
        } catch {}
      });
      calcCount();
    }, (err) => {
      console.warn('Support count snapshot notice:', err);
    });

    return () => {
      unsub();
      window.removeEventListener('support_tickets_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

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

  const addEmailToBlacklist = async (email: string) => {
    const clean = email.toLowerCase().trim();
    if (!clean) return;
    try {
      const set = getBlacklistedEmails();
      set.add(clean);
      const arr = Array.from(set);
      localStorage.setItem('office_deleted_subscribers', JSON.stringify(arr));
      await setDoc(doc(db, 'system_integrations', 'deleted_subscribers'), {
        emails: arr,
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch(() => {});
    } catch {}
  };

  const removeEmailFromBlacklist = async (email: string) => {
    const clean = email.toLowerCase().trim();
    if (!clean) return;
    try {
      const set = getBlacklistedEmails();
      set.delete(clean);
      const arr = Array.from(set);
      localStorage.setItem('office_deleted_subscribers', JSON.stringify(arr));
      await setDoc(doc(db, 'system_integrations', 'deleted_subscribers'), {
        emails: arr,
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch(() => {});
    } catch {}
  };

  const persistSubscribersAcrossAllLayers = async (allUsers: UserProfile[]) => {
    try {
      localStorage.setItem(SUBSCRIBERS_STORAGE_KEY, JSON.stringify(allUsers));

      // Persist to server-side canonical subscribers API
      fetch('/api/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscribers: allUsers })
      }).catch(err => console.warn("Notice syncing subscribers to /api/subscribers:", err));

      // Persist to system_integrations/authorized_subscribers in Firestore
      await setDoc(doc(db, 'system_integrations', 'authorized_subscribers'), sanitizeFirestoreData({
        subscribers: allUsers,
        updatedAt: new Date().toISOString()
      }), { merge: true }).catch(() => {});

      // Ensure each user document is kept up to date in Firestore users collection
      for (const u of allUsers) {
        if (u.uid) {
          setDoc(doc(db, 'users', u.uid), sanitizeFirestoreData(u), { merge: true }).catch(() => {});
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

    // Ensure lainepaulaarq is never blacklisted
    blacklist.delete('lainepaulaarq@gmail.com');

    // Fetch Firestore remote blacklist to sync across devices/refreshes
    try {
      const delSnap = await fetchWithTimeout(getDoc(doc(db, 'system_integrations', 'deleted_subscribers')), 1500, null);
      if (delSnap && delSnap.exists && delSnap.exists()) {
        const delData = delSnap.data();
        if (Array.isArray(delData?.emails)) {
          delData.emails.forEach((e: string) => {
            const em = e.toLowerCase().trim();
            if (em !== 'lainepaulaarq@gmail.com') {
              blacklist.add(em);
            }
          });
          localStorage.setItem('office_deleted_subscribers', JSON.stringify(Array.from(blacklist)));
        }
      }
    } catch (e) {
      console.warn("Notice checking deleted_subscribers integration:", e);
    }

    // 1. Current user (owner / admin)
    const currentUid = auth.currentUser?.uid || profile?.uid || 'admin_owner';
    const currentEmail = (auth.currentUser?.email || profile?.email || 'lfquadrosdecorativos@gmail.com').toLowerCase().trim();
    const isOwner = isPlatformAdminAccount(currentEmail);
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

    // 2. Load DEFAULT_AUTHORIZED_SUBSCRIBERS (guarantees lainepaulaarq is always loaded)
    DEFAULT_AUTHORIZED_SUBSCRIBERS.forEach(d => {
      const em = d.email.toLowerCase().trim();
      if (!blacklist.has(em)) {
        usersMap.set(em, d);
      }
    });

    // 3. Load from server backend canonical subscribers API (/api/subscribers)
    try {
      const serverRes = await fetchWithTimeout(
        fetch('/api/subscribers').then(r => r.json()),
        2000,
        null
      );
      if (serverRes && Array.isArray(serverRes.subscribers)) {
        serverRes.subscribers.filter(isPlatformSubscriber).forEach((s: UserProfile) => {
          const em = (s.email || '').toLowerCase().trim();
          if (em && em !== currentEmail && !blacklist.has(em)) {
            const existing = usersMap.get(em);
            usersMap.set(em, { ...existing, ...s, email: em });
          }
        });
      }
    } catch (e) {
      console.warn("Notice loading /api/subscribers:", e);
    }

    // 4. Load from localStorage subscribers cache
    try {
      const storedSubs = localStorage.getItem(SUBSCRIBERS_STORAGE_KEY);
      if (storedSubs) {
        const parsed = JSON.parse(storedSubs);
        if (Array.isArray(parsed)) {
          parsed.filter(isPlatformSubscriber).forEach((s: UserProfile) => {
            const em = (s.email || '').toLowerCase().trim();
            if (em && em !== currentEmail && !blacklist.has(em)) {
              const existing = usersMap.get(em);
              usersMap.set(em, { ...existing, ...s, email: em });
            }
          });
        }
      }
    } catch {}

    // 5. Concurrently fetch Firestore system integrations with timeout (non-blocking)
    try {
      const sysSnap = await fetchWithTimeout(getDoc(doc(db, 'system_integrations', 'authorized_subscribers')), 1500, null);

      if (sysSnap && sysSnap.exists && sysSnap.exists()) {
        const sysData = sysSnap.data();
        if (Array.isArray(sysData?.subscribers)) {
          sysData.subscribers.filter(isPlatformSubscriber).forEach((s: UserProfile) => {
            const em = (s.email || '').toLowerCase().trim();
            if (em && em !== currentEmail && !blacklist.has(em)) {
              const existing = usersMap.get(em);
              usersMap.set(em, { ...existing, ...s, email: em });
            }
          });
        }
      }
    } catch (e) {
      console.warn("Notice checking system_integrations:", e);
    }

    // 6. Load from Firestore snapshot docs (collection 'users')
    snapshotDocs.forEach((docSnap) => {
      const d = docSnap.data() as UserProfile;
      const em = (d.email || '').toLowerCase().trim();
      if (em && isPlatformSubscriber(d) && !blacklist.has(em)) {
        const existing = usersMap.get(em);
        usersMap.set(em, {
          ...existing,
          ...d,
          uid: docSnap.id,
          email: em,
        });
      }
    });

    const finalList = Array.from(usersMap.values()).filter(isPlatformSubscriber);
    // Background persist to server API, Firestore & LocalStorage
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

    const handleLocalSync = async () => {
      try {
        const snap = await getDocs(usersRef);
        await handleUsersData(snap.docs);
      } catch (e) {}
    };

    window.addEventListener('subscribers_updated', handleLocalSync);
    window.addEventListener('storage', handleLocalSync);

    const unsubSys = onSnapshot(doc(db, 'system_integrations', 'authorized_subscribers'), async () => {
      try {
        const snap = await getDocs(usersRef);
        await handleUsersData(snap.docs);
      } catch (e) {}
    }, () => {});

    return () => {
      unsubscribe();
      unsubSys();
      window.removeEventListener('subscribers_updated', handleLocalSync);
      window.removeEventListener('storage', handleLocalSync);
    };
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
      const targetUser = users.find(u => u.uid === uid);
      if (targetUser?.email) {
        removeEmailFromBlacklist(targetUser.email);
      }

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

      if (targetUser?.email) {
        const amount = durationType === '1year' ? 990.00 : 97.00;
        const newDocId = `pay_${Date.now()}`;
        const newPayment = {
          id: newDocId,
          subscriberEmail: targetUser.email.toLowerCase().trim(),
          subscriberName: targetUser.name || targetUser.email.split('@')[0],
          description: durationType === '1year' ? 'Assinatura Anual Plataforma' : 'Assinatura Mensal Plataforma',
          plan: durationType,
          amount,
          date: new Date().toISOString().split('T')[0],
          paymentMethod: 'PIX',
          createdAt: new Date().toISOString()
        };
        setDoc(doc(db, 'platform_payments', newDocId), newPayment).catch(console.warn);
      }

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
      removeEmailFromBlacklist(cleanEmail);

      let dueDate = new Date();
      if (manualDuration === '1month') {
        dueDate.setDate(dueDate.getDate() + 30);
      } else {
        dueDate.setDate(dueDate.getDate() + 365);
      }
      const dueDateISO = dueDate.toISOString();

      // Look for existing user in local state or Firestore users collection
      let targetUid: string | null = null;
      const existingInState = users.find(u => u.email?.toLowerCase().trim() === cleanEmail);

      if (existingInState) {
        targetUid = existingInState.uid;
      } else {
        try {
          const qSnap = await getDocs(query(collection(db, 'users'), where('email', '==', cleanEmail)));
          if (!qSnap.empty) {
            targetUid = qSnap.docs[0].id;
          }
        } catch (qErr) {
          console.warn("Notice querying user by email in Firestore:", qErr);
        }
      }

      let updatedList: UserProfile[];

      if (targetUid) {
        await setDoc(doc(db, 'users', targetUid), {
          status: 'active',
          subscriptionDueDate: dueDateISO,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        if (existingInState) {
          updatedList = users.map(u => u.uid === targetUid ? {
            ...u,
            status: 'active' as const,
            subscriptionDueDate: dueDateISO
          } : u);
        } else {
          const updatedProfile: UserProfile = {
            uid: targetUid,
            email: cleanEmail,
            name: cleanEmail.split('@')[0],
            role: 'user',
            status: 'active',
            subscriptionDueDate: dueDateISO,
            createdAt: new Date().toISOString(),
            notes: 'Assinante Liberado Manualmente'
          };
          updatedList = [...users, updatedProfile];
        }
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

      // Auto-record platform subscription payment
      const newDocId = `pay_${Date.now()}`;
      const amount = manualDuration === '1year' ? 990.00 : 97.00;
      const newPayment = {
        id: newDocId,
        subscriberEmail: cleanEmail,
        subscriberName: cleanEmail.split('@')[0],
        description: manualDuration === '1year' ? 'Assinatura Anual (Liberação Manual)' : 'Assinatura Mensal (Liberação Manual)',
        plan: manualDuration,
        amount,
        date: new Date().toISOString().split('T')[0],
        paymentMethod: 'PIX',
        createdAt: new Date().toISOString()
      };
      setDoc(doc(db, 'platform_payments', newDocId), newPayment).catch(console.warn);

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

    await addEmailToBlacklist(email);

    const updatedList = users.filter(u => u.uid !== uid && (u.email || '').toLowerCase().trim() !== email);
    setUsers(updatedList);
    await persistSubscribersAcrossAllLayers(updatedList);
    setUserToDelete(null);
    setRefreshSuccessMessage(`Usuário ${email} foi removido com sucesso.`);
    setTimeout(() => setRefreshSuccessMessage(null), 5000);

    try {
      if (uid) {
        await deleteDoc(doc(db, 'users', uid, 'data', 'workspace')).catch(() => {});
        await deleteDoc(doc(db, 'users', uid)).catch(() => {});
      }
      if (email) {
        const qSnap = await getDocs(query(collection(db, 'users'), where('email', '==', email))).catch(() => null);
        if (qSnap && !qSnap.empty) {
          for (const d of qSnap.docs) {
            await deleteDoc(doc(db, 'users', d.id)).catch(() => {});
          }
        }
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

  // Filtered users (strictly platform subscribers and master admin)
  const filteredUsers = users.filter((u) => {
    if (!isPlatformSubscriber(u)) return false;
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
      setRefreshSuccessMessage(`Todos os ${aggregated.filter(u => !isPlatformAdminAccount(u.email)).length} assinantes autorizados foram sincronizados com sucesso!`);
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
  const pendingRequests = users.filter(u => (u.status === 'pending' || u.status === 'pending_payment') && !isPlatformAdminAccount(u.email));

  return (
    <div className="space-y-6">
      {/* Top Main Navigation Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-white border border-zinc-200 rounded-3xl shadow-sm">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-extrabold text-zinc-900 tracking-tight flex items-center gap-2">
            <span>Painel Administrativo & Gestão</span>
          </h2>
          <p className="text-zinc-500 text-xs font-medium mt-0.5">
            Gerencie assinantes, atenda chamados de suporte em tempo real e controle o faturamento.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveAdminTab('users')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border shadow-2xs ${
              activeAdminTab === 'users'
                ? 'bg-[#b5986e] text-white border-[#b5986e]'
                : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Assinantes ({users.filter(u => !isPlatformAdminAccount(u.email)).length})</span>
          </button>

          <button
            onClick={() => setActiveAdminTab('support')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border shadow-2xs relative ${
              activeAdminTab === 'support'
                ? 'bg-[#b5986e] text-white border-[#b5986e]'
                : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-200'
            }`}
          >
            <Headset className={`w-3.5 h-3.5 ${activeAdminTab === 'support' ? 'text-white' : 'text-[#b5986e]'}`} />
            <span>Suporte aos Assinantes</span>
            {waitingSupportCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-extrabold animate-pulse shadow-xs flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                <span>{waitingSupportCount}</span>
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveAdminTab('finance')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border shadow-2xs ${
              activeAdminTab === 'finance'
                ? 'bg-[#b5986e] text-white border-[#b5986e]'
                : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-200'
            }`}
          >
            <span>Controle Financeiro</span>
          </button>

          {activeAdminTab === 'users' && (
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="px-3.5 py-2 bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#b5986e] ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Sincronizando...' : 'Atualizar'}</span>
            </button>
          )}
        </div>
      </div>

      {activeAdminTab === 'support' ? (
        <AdminSupportTab users={users} />
      ) : activeAdminTab === 'finance' ? (
        <div className="space-y-6">
          <FinancialControlTab users={users} />
        </div>
      ) : (
        <div className="space-y-6">
          {refreshSuccessMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200 shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{refreshSuccessMessage}</span>
            </div>
          )}
          
          {/* Prominent Pending Access Requests Alert Box */}
          {pendingRequests.length > 0 && (
            <div className="bg-amber-50/90 border-2 border-amber-300/90 rounded-2xl p-5 space-y-4 shadow-2xs animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-amber-200 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                  </span>
                  <h3 className="font-serif font-extrabold text-base text-amber-950">
                    🔔 {pendingRequests.length} Solicitação(ões) de Acesso Aguardando Sua Liberação
                  </h3>
                </div>
                <span className="text-[11px] font-bold px-3 py-1 bg-amber-200/60 text-amber-900 border border-amber-300 rounded-lg shadow-2xs">
                  Aguardando Conferência de Pagamento
                </span>
              </div>
    
              <p className="text-xs text-amber-900 font-medium">
                Os usuários abaixo fizeram cadastro ou login e estão aguardando você confirmar o pagamento. Escolha a duração para liberar o acesso:
              </p>
    
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {pendingRequests.map((pUser) => (
                  <div key={pUser.uid} className="bg-white border border-amber-200/90 rounded-xl p-4 flex flex-col justify-between gap-3 shadow-2xs">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-zinc-900">{pUser.name || 'Novo Usuário'}</span>
                        <span className="text-[10px] text-amber-800 font-bold font-mono bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                          Pendente
                        </span>
                      </div>
                      <div className="text-xs font-mono text-[#8c6b3e] font-extrabold truncate">
                        {pUser.email}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-medium">
                        Cadastrado em: {pUser.createdAt ? new Date(pUser.createdAt).toLocaleDateString('pt-BR') : 'Hoje'}
                      </div>
                    </div>
    
                    <div className="space-y-2 pt-2 border-t border-zinc-100">
                      <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Selecione o Tempo da Assinatura:</div>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          onClick={() => approveWithDuration(pUser.uid, '1month')}
                          className="py-2 px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg flex items-center justify-center gap-1 transition-all shadow-2xs cursor-pointer"
                          title="Liberar Acesso por 1 Mês (30 Dias)"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>1 Mês</span>
                        </button>
    
                        <button
                          onClick={() => approveWithDuration(pUser.uid, '1year')}
                          className="py-2 px-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-[11px] rounded-lg flex items-center justify-center gap-1 transition-all shadow-2xs cursor-pointer"
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
                          className="py-2 px-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-300 font-bold text-[11px] rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs"
                          title="Definir Data Personalizada"
                        >
                          <Calendar className="w-3.5 h-3.5 text-[#b5986e]" />
                          <span>Data</span>
                        </button>
                      </div>
    
                      <button
                        onClick={() => updateStatus(pUser.uid, 'inactive')}
                        className="w-full py-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] rounded-lg flex items-center justify-center gap-1 transition-all border border-rose-200 cursor-pointer shadow-2xs"
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
          <div className="bg-white border border-zinc-200/90 rounded-2xl p-4 space-y-3 shadow-2xs">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#b5986e]" />
              <h3 className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                Liberar Assinatura Manualmente por E-mail
              </h3>
            </div>
            <form onSubmit={handleManualApproveByEmail} className="flex flex-col sm:flex-row items-center gap-2.5">
              <input
                type="email"
                value={manualEmailInput}
                onChange={(e) => setManualEmailInput(e.target.value)}
                placeholder="Digite o e-mail do assinante (ex: cliente@email.com)"
                required
                className="flex-1 w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3.5 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:bg-white focus:border-[#b5986e] font-medium"
              />
              <select
                value={manualDuration}
                onChange={(e) => setManualDuration(e.target.value as '1month' | '1year')}
                className="bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs text-zinc-900 font-semibold focus:outline-none focus:bg-white focus:border-[#b5986e] cursor-pointer"
              >
                <option value="1month">Duração: 1 Mês (30 dias)</option>
                <option value="1year">Duração: 1 Ano (365 dias)</option>
              </select>
              <button
                type="submit"
                className="w-full sm:w-auto px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer whitespace-nowrap"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Liberar Acesso Agora</span>
              </button>
            </form>
          </div>

          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-medium">{errorMessage}</span>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="px-3 py-1 rounded-lg bg-rose-200/60 hover:bg-rose-200 text-rose-900 font-bold transition-colors shadow-2xs"
              >
                Recarregar Página
              </button>
            </div>
          )}

          <DashboardSubscriptions users={users} />

          {/* Filter and Search Bar */}
      <div className="bg-white border border-zinc-200/90 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por email ou ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-zinc-50 border border-zinc-300 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:bg-white focus:border-[#b5986e] font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs text-zinc-500 font-bold whitespace-nowrap">Status:</span>
          {(['all', 'active', 'pending', 'inactive'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === st
                  ? 'bg-[#b5986e] text-white shadow-2xs'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 border border-zinc-200'
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
      <div className="bg-white border border-zinc-200/90 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-zinc-50/80 border-b border-zinc-200">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-zinc-600 uppercase tracking-wider">Usuário / Email</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-600 uppercase tracking-wider">Função</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-600 uppercase tracking-wider">Vencimento da Assinatura</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-600 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredUsers.map((u) => {
                const isOverdue = u.subscriptionDueDate && new Date(u.subscriptionDueDate) < new Date();

                return (
                  <tr key={u.uid} className="hover:bg-amber-50/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#b5986e]/15 border border-[#b5986e]/30 flex items-center justify-center shrink-0 text-[#8c6b3e] font-bold font-serif text-sm">
                          {(u.email || 'U').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-zinc-900 truncate">
                            {u.name ? `${u.name} · ${u.email}` : u.email}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-zinc-500 font-mono">
                              ID: {u.uid.slice(0, 10)}...
                            </span>
                            {u.role === 'admin' ? (
                              <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold">
                                👑 Gestor / Dono
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                                🌱 Assinante da Plataforma
                              </span>
                            )}
                            {u.notes && (
                              <span className="text-[10px] text-zinc-500 italic">
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
                        className="bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-1.5 text-xs text-zinc-900 font-semibold focus:outline-none focus:bg-white focus:border-[#b5986e] cursor-pointer"
                      >
                        <option value="user">Cliente / Assinante</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {u.status === 'active' && (
                          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Ativo
                          </span>
                        )}
                        {u.status === 'pending' && (
                          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold uppercase tracking-wider">
                            <Clock className="w-3.5 h-3.5 text-amber-600" /> Pendente
                          </span>
                        )}
                        {u.status === 'inactive' && (
                          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold uppercase tracking-wider">
                            <XCircle className="w-3.5 h-3.5 text-rose-600" /> Inativo
                          </span>
                        )}
                      </div>
                    </td>

                     <td className="px-6 py-4">
                      {isPlatformAdminAccount(u.email) ? (
                        <span className="text-xs text-amber-800 font-bold">Acesso Vitalício</span>
                      ) : (
                        <div>
                          {u.subscriptionDueDate ? (
                            <div className={`text-xs font-bold ${isOverdue ? 'text-rose-600' : 'text-zinc-900'}`}>
                              {new Date(u.subscriptionDueDate).toLocaleDateString('pt-BR')}
                              {isOverdue && <span className="block text-[10px] uppercase text-rose-600 font-extrabold">Atrasado</span>}
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-400 font-medium">Sem data</span>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {!isPlatformAdminAccount(u.email) && (
                          <>
                            {/* Open Support Chat with Subscriber */}
                            <button
                              onClick={() => {
                                setActiveAdminTab('support');
                              }}
                              className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-xl transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
                              title={`Abrir chat de suporte com ${u.name || u.email}`}
                            >
                              <Headset className="w-3.5 h-3.5 text-amber-700" />
                              <span>Suporte</span>
                            </button>

                            {/* If user is active, show renewal and dedicated UNSUBSCRIBE / CANCELAR ASSINATURA button */}
                            {u.status === 'active' && (
                              <>
                                <button
                                  onClick={() => approveWithDuration(u.uid, '1month')}
                                  className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-bold rounded-xl transition-all shadow-2xs cursor-pointer"
                                  title="Adicionar ou Renovar +1 Mês (30 Dias)"
                                >
                                  +1 Mês
                                </button>

                                <button
                                  onClick={() => approveWithDuration(u.uid, '1year')}
                                  className="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-[11px] font-bold rounded-xl transition-all shadow-2xs cursor-pointer"
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
                                  className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl transition-all cursor-pointer shadow-2xs"
                                  title="Definir Data de Vencimento Personalizada"
                                >
                                  <Calendar className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => handleUnsubscribeUser(u)}
                                  className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
                                  title="Cancelar assinatura e desativar acesso deste usuário"
                                >
                                  <UserX className="w-3.5 h-3.5 text-rose-600" />
                                  <span>Cancelar Assinatura</span>
                                </button>
                              </>
                            )}

                            {/* If user is inactive / cancelled, show REACTIVATE and +1 Ano */}
                            {u.status === 'inactive' && (
                              <>
                                <button
                                  onClick={() => handleReactivateUser(u, '1month')}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                                  title="Reativar assinatura e liberar acesso por 30 dias"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Reativar (+1 Mês)</span>
                                </button>

                                <button
                                  onClick={() => handleReactivateUser(u, '1year')}
                                  className="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-[11px] font-bold rounded-xl transition-all shadow-2xs cursor-pointer"
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
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
                                >
                                  Aprovar (+1 Mês)
                                </button>
                                <button
                                  onClick={() => handleUnsubscribeUser(u)}
                                  className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition-all shadow-2xs cursor-pointer"
                                >
                                  Recusar
                                </button>
                              </>
                            )}

                            <button
                              onClick={() => handleDeleteUser(u.uid, u.email)}
                              className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 border border-zinc-200 hover:border-rose-200 rounded-xl transition-all cursor-pointer shadow-2xs"
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
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-500 text-sm font-medium">
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 rounded-3xl p-6 w-full max-w-md space-y-5 shadow-2xl relative animate-in zoom-in-95 duration-200 text-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#b5986e]" />
                <h3 className="font-serif font-bold text-lg text-zinc-900">Definir Vencimento do Assinante</h3>
              </div>
              <button
                onClick={() => setSelectedUserForModal(null)}
                className="p-1 text-zinc-400 hover:text-zinc-700 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1 bg-zinc-50 border border-zinc-200 p-3.5 rounded-xl">
              <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Assinante Selecionado:</div>
              <div className="text-sm font-bold text-[#8c6b3e] font-mono">{selectedUserForModal.email}</div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-zinc-600 uppercase tracking-wider">Atalhos Rápidos de Duração:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 30);
                    setCustomDateInput(d.toISOString().split('T')[0]);
                  }}
                  className="py-2 px-3 bg-zinc-50 hover:bg-zinc-100 border border-zinc-300 hover:border-[#b5986e] rounded-xl text-xs font-bold text-zinc-800 transition-all cursor-pointer shadow-2xs"
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
                  className="py-2 px-3 bg-zinc-50 hover:bg-zinc-100 border border-zinc-300 hover:border-[#b5986e] rounded-xl text-xs font-bold text-zinc-800 transition-all cursor-pointer shadow-2xs"
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
                  className="py-2 px-3 bg-zinc-50 hover:bg-zinc-100 border border-zinc-300 hover:border-[#b5986e] rounded-xl text-xs font-bold text-zinc-800 transition-all cursor-pointer shadow-2xs"
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
                  className="py-2 px-3 bg-zinc-50 hover:bg-zinc-100 border border-zinc-300 hover:border-emerald-600 rounded-xl text-xs font-bold text-zinc-800 transition-all cursor-pointer shadow-2xs"
                >
                  1 Ano (365 Dias)
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-zinc-600 uppercase tracking-wider">Escolher Data de Vencimento Específica:</label>
              <input
                type="date"
                value={customDateInput}
                onChange={(e) => setCustomDateInput(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-4 py-2.5 text-sm text-zinc-900 focus:outline-none focus:bg-white focus:border-[#b5986e] font-semibold"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200">
              <button
                type="button"
                onClick={() => setSelectedUserForModal(null)}
                className="py-2 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => approveWithDuration(selectedUserForModal.uid, 'custom', customDateInput)}
                className="py-2 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white border border-zinc-200 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl relative animate-in fade-in zoom-in duration-200 text-zinc-900">
            <button
              onClick={() => setUserToDelete(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-700 p-1 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900">Excluir Usuário</h3>
                <p className="text-xs text-zinc-500 font-medium">Esta ação removerá o usuário do sistema</p>
              </div>
            </div>

            <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl space-y-1">
              <div className="text-xs text-zinc-900 font-bold">{userToDelete.name || userToDelete.email}</div>
              <div className="text-xs font-mono text-[#8c6b3e] font-bold">{userToDelete.email}</div>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed font-medium">
              Tem certeza que deseja excluir o usuário <span className="font-bold text-zinc-900">{userToDelete.email}</span>? 
              A assinatura será cancelada e o registro removido da sua lista de assinantes.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="py-2 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                className="py-2 px-5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
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

