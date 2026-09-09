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
  Mail
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

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

export const AdminUsers: React.FC = () => {
  const { user: currentUserProfile, profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'inactive'>('all');

  // Custom Date Modal & Manual Approval State
  const [selectedUserForModal, setSelectedUserForModal] = useState<UserProfile | null>(null);
  const [customDateInput, setCustomDateInput] = useState<string>('');
  const [manualEmailInput, setManualEmailInput] = useState<string>('');
  const [manualDuration, setManualDuration] = useState<'1month' | '1year'>('1month');

  useEffect(() => {
    setLoading(true);
    setErrorMessage(null);

    const usersRef = collection(db, 'users');

    const handleUsersData = async (snapshotDocs: any[]) => {
      const usersList: UserProfile[] = snapshotDocs.map((docSnap) => ({
        ...(docSnap.data() as UserProfile),
        uid: docSnap.id,
      }));

      const currentUid = auth.currentUser?.uid || profile?.uid;
      const currentEmail = auth.currentUser?.email || profile?.email || 'lfquadrosdecorativos@gmail.com';
      if (currentUid && !usersList.some(u => u.uid === currentUid)) {
        const isOwner = currentEmail.toLowerCase() === 'lfquadrosdecorativos@gmail.com';
        const selfUser: UserProfile = profile || {
          uid: currentUid,
          email: currentEmail,
          role: isOwner ? 'admin' : 'user',
          status: 'active',
          subscriptionDueDate: isOwner ? undefined : new Date(Date.now() + 30 * 86400000).toISOString(),
          createdAt: new Date().toISOString(),
          inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
        };
        try {
          await setDoc(doc(db, 'users', currentUid), selfUser, { merge: true });
        } catch (e) {
          console.warn("Auto sync current user doc notice:", e);
        }
        usersList.push(selfUser);
      }

      setUsers(usersList);
      setErrorMessage(null);
      setLoading(false);
    };

    const unsubscribe = onSnapshot(usersRef, (snapshot) => {
      handleUsersData(snapshot.docs);
    }, async (error) => {
      console.warn("Snapshot notice on users collection, trying fallback getDocs:", error);
      try {
        const snap = await getDocs(usersRef);
        await handleUsersData(snap.docs);
      } catch (fallbackErr) {
        console.warn("Fallback getDocs error:", fallbackErr);
        const currentUid = auth.currentUser?.uid || profile?.uid;
        const currentEmail = auth.currentUser?.email || profile?.email || 'lfquadrosdecorativos@gmail.com';
        if (currentUid) {
          const isOwner = currentEmail.toLowerCase() === 'lfquadrosdecorativos@gmail.com';
          const selfUser: UserProfile = profile || {
            uid: currentUid,
            email: currentEmail,
            role: isOwner ? 'admin' : 'user',
            status: 'active',
            createdAt: new Date().toISOString(),
          };
          setUsers([selfUser]);
        }
        setErrorMessage(null);
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

      setUsers(users.map(u => u.uid === uid ? {
        ...u,
        status: 'active',
        subscriptionDueDate: newDueDateISO,
      } : u));

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

      if (existing) {
        await updateDoc(doc(db, 'users', existing.uid), {
          status: 'active',
          subscriptionDueDate: dueDateISO,
        });
        setUsers(users.map(u => u.uid === existing.uid ? { ...u, status: 'active', subscriptionDueDate: dueDateISO } : u));
      } else {
        const newRef = doc(collection(db, 'users'));
        const newProfile: UserProfile = {
          uid: newRef.id,
          email: cleanEmail,
          role: 'user',
          status: 'active',
          subscriptionDueDate: dueDateISO,
          createdAt: new Date().toISOString()
        };
        await setDoc(newRef, newProfile);
        setUsers([...users, newProfile]);
      }

      setManualEmailInput('');
      alert(`Assinante ${cleanEmail} liberado com sucesso por ${manualDuration === '1month' ? '1 Mês' : '1 Ano'} (Vencimento: ${dueDate.toLocaleDateString('pt-BR')})!`);
    } catch (err: any) {
      console.error("Manual approve error:", err);
      alert(`Erro ao liberar por e-mail: ${err.message}`);
    }
  };

  const updateStatus = async (uid: string, newStatusVal: 'active' | 'pending' | 'inactive') => {
    try {
      await updateDoc(doc(db, 'users', uid), { status: newStatusVal });
      setUsers(users.map(u => u.uid === uid ? { ...u, status: newStatusVal } : u));
    } catch (error: any) {
      console.error("Error updating user status:", error);
      alert(`Erro ao atualizar status: ${error.message}`);
    }
  };

  const updateRole = async (uid: string, newRoleVal: 'admin' | 'user') => {
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRoleVal });
      setUsers(users.map(u => u.uid === uid ? { ...u, role: newRoleVal } : u));
    } catch (error: any) {
      console.error("Error updating role:", error);
      alert(`Erro ao atualizar função: ${error.message}`);
    }
  };

  const registerPayment = async (uid: string, currentDueDate?: string) => {
    try {
      const baseDate = currentDueDate && new Date(currentDueDate) > new Date() 
        ? new Date(currentDueDate) 
        : new Date();
      baseDate.setMonth(baseDate.getMonth() + 1);
      
      const newDueDateISO = baseDate.toISOString();
      await updateDoc(doc(db, 'users', uid), { 
        subscriptionDueDate: newDueDateISO,
        status: 'active'
      });
      
      setUsers(users.map(u => u.uid === uid ? { 
        ...u, 
        subscriptionDueDate: newDueDateISO,
        status: 'active'
      } : u));
    } catch (error: any) {
      console.error("Error updating payment:", error);
      alert(`Erro ao registrar pagamento: ${error.message}`);
    }
  };

  const handleDeleteUser = async (uid: string, email: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o usuário ${email}? Esta ação não pode ser desfeita.`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'users', uid));
      setUsers(users.filter(u => u.uid !== uid));
    } catch (error: any) {
      console.error("Error deleting user:", error);
      alert(`Erro ao remover usuário: ${error.message}`);
    }
  };

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.uid || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleManualRefresh = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const usersList: UserProfile[] = snap.docs.map((docSnap) => ({
        ...(docSnap.data() as UserProfile),
        uid: docSnap.id,
      }));
      setUsers(usersList);
    } catch (e) {
      console.warn("Manual refresh notice:", e);
    } finally {
      setLoading(false);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div>
          <h2 className="text-2xl font-serif font-bold text-[#fcf8f5]">Painel Financeiro & Assinantes</h2>
          <p className="text-[#a89c93] text-sm">Acompanhe seus assinantes, gerencie liberação após pagamento e permissões do sistema.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleManualRefresh}
            className="px-4 py-2 bg-[#241e1b] hover:bg-[#322a26] text-[#fcf8f5] border border-[#3d342f] rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[var(--theme-primary)]" />
            <span>Atualizar Lista</span>
          </button>
        </div>
      </div>

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
                          <div className="text-sm font-bold text-[#fcf8f5] truncate">{u.email}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-[#a89c93] font-mono">
                              ID: {u.uid.slice(0, 10)}...
                            </span>
                            {u.role === 'admin' ? (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] font-bold">
                                👑 Gestor / Dono
                              </span>
                            ) : u.joinedOwnerUid || profile?.collaborators?.some(c => c.email?.toLowerCase() === u.email?.toLowerCase()) ? (
                              <span className="px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] font-bold">
                                👥 Membro de Equipe
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold">
                                🌱 Assinante
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
                          </>
                        )}

                        {u.status !== 'active' && (
                          <button
                            onClick={() => approveWithDuration(u.uid, '1month')}
                            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-lg transition-colors cursor-pointer"
                          >
                            Ativar
                          </button>
                        )}
                        {u.status !== 'inactive' && u.role !== 'admin' && (
                          <button
                            onClick={() => updateStatus(u.uid, 'inactive')}
                            className="px-2.5 py-1.5 bg-[#241e1b] hover:bg-red-500/20 text-[#a89c93] hover:text-red-400 border border-[#3d342f] hover:border-red-500/30 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                            title="Bloquear / Inativar Acesso"
                          >
                            Bloquear
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteUser(u.uid, u.email)}
                          className="p-1.5 text-[#a89c93] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Remover Usuário"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
    </div>
  );
};

