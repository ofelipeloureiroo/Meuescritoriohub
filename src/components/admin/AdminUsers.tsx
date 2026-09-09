import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, updateDoc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
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
  X
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

  // Modal New User
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user');
  const [newStatus, setNewStatus] = useState<'active' | 'pending' | 'inactive'>('active');
  const [newDueDate, setNewDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  useEffect(() => {
    setLoading(true);
    setErrorMessage(null);

    const usersRef = collection(db, 'users');
    const unsubscribe = onSnapshot(usersRef, async (snapshot) => {
      const usersList: UserProfile[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as UserProfile;
        usersList.push({ ...data, uid: docSnap.id });
      });

      // If current user logged in is missing in Firestore list, auto-create their document
      const currentUid = auth.currentUser?.uid;
      const currentEmail = auth.currentUser?.email || profile?.email || 'lfquadrosdecorativos@gmail.com';
      if (currentUid && !usersList.some(u => u.uid === currentUid)) {
        const isOwner = currentEmail.toLowerCase() === 'lfquadrosdecorativos@gmail.com';
        const selfUser: UserProfile = {
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
          usersList.push(selfUser);
        } catch (e) {
          console.warn("Auto sync current user doc notice:", e);
        }
      }

      setUsers(usersList);
      setLoading(false);
    }, (error) => {
      console.error("Snapshot error on users collection:", error);
      setErrorMessage("Erro ao sincronizar lista de usuários com o servidor.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile?.email]);

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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) {
      alert("Informe um email válido.");
      return;
    }

    setIsCreatingUser(true);
    try {
      // Generate unique ID based on email or random string
      const generatedUid = 'usr_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      const userPayload: UserProfile = {
        uid: generatedUid,
        email: newEmail.trim().toLowerCase(),
        role: newRole,
        status: newStatus,
        subscriptionDueDate: newRole === 'admin' ? undefined : new Date(newDueDate).toISOString(),
        createdAt: new Date().toISOString(),
        inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
        collaborators: [],
        collaboratorUids: [],
      };

      await setDoc(doc(db, 'users', generatedUid), userPayload, { merge: true });
      setIsAddUserModalOpen(false);
      setNewEmail('');
      setNewName('');
    } catch (err: any) {
      console.error("Error creating user:", err);
      alert(`Erro ao cadastrar usuário: ${err.message}`);
    } finally {
      setIsCreatingUser(false);
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-8 h-8 text-[var(--theme-primary)] animate-spin" />
        <p className="text-xs text-[#a89c93]">Carregando painel de assinantes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div>
          <h2 className="text-2xl font-serif font-bold text-[#fcf8f5]">Painel Financeiro & Assinantes</h2>
          <p className="text-[#a89c93] text-sm">Acompanhe seus assinantes, gerencie liberação após pagamento e permissões do sistema.</p>
        </div>
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
                          <div className="text-[10px] text-[#a89c93] font-mono">
                            ID: {u.uid.slice(0, 12)}...
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
                      {u.role !== 'admin' ? (
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
                      ) : (
                        <span className="text-xs text-[#a89c93] font-semibold">Acesso Vitalício</span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        {u.role !== 'admin' && (
                          <button
                            onClick={() => registerPayment(u.uid, u.subscriptionDueDate)}
                            className="px-3 py-1.5 bg-[#1c1815] border border-[var(--theme-primary)]/30 hover:bg-[var(--theme-primary)]/20 text-[var(--theme-primary)] flex items-center gap-1 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                            title="Renovar +1 Mês de acesso"
                          >
                            <CreditCard className="w-3.5 h-3.5" /> +1 Mês
                          </button>
                        )}
                        {u.status !== 'active' && (
                          <button
                            onClick={() => updateStatus(u.uid, 'active')}
                            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-bold rounded-lg transition-colors cursor-pointer"
                          >
                            Ativar
                          </button>
                        )}
                        {u.status !== 'inactive' && (
                          <button
                            onClick={() => updateStatus(u.uid, 'inactive')}
                            className="px-3 py-1.5 bg-[#241e1b] hover:bg-red-500/20 text-[#a89c93] hover:text-red-400 border border-[#3d342f] hover:border-red-500/30 text-xs font-bold rounded-lg transition-colors cursor-pointer"
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
    </div>
  );
};

