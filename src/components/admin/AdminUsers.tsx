import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { UserProfile } from '../../context/AuthContext';
import { Loader2, CheckCircle2, XCircle, Shield, User, Clock, CreditCard, PieChart as PieChartIcon, TrendingUp, AlertTriangle } from 'lucide-react';
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
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const usersData: UserProfile[] = [];
      querySnapshot.forEach((doc) => {
        usersData.push(doc.data() as UserProfile);
      });
      setUsers(usersData);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (uid: string, newStatus: 'active' | 'pending' | 'inactive') => {
    try {
      await updateDoc(doc(db, 'users', uid), { status: newStatus });
      setUsers(users.map(u => u.uid === uid ? { ...u, status: newStatus } : u));
    } catch (error) {
      console.error("Error updating user:", error);
    }
  };

  const updateRole = async (uid: string, newRole: 'admin' | 'user') => {
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
      setUsers(users.map(u => u.uid === uid ? { ...u, role: newRole } : u));
    } catch (error) {
      console.error("Error updating role:", error);
    }
  };

  const registerPayment = async (uid: string, currentDueDate?: string) => {
    try {
      const baseDate = currentDueDate && new Date(currentDueDate) > new Date() 
        ? new Date(currentDueDate) 
        : new Date();
      baseDate.setMonth(baseDate.getMonth() + 1);
      
      const newDueDate = baseDate.toISOString();
      await updateDoc(doc(db, 'users', uid), { 
        subscriptionDueDate: newDueDate,
        status: 'active' // Auto-activate if they paid
      });
      
      setUsers(users.map(u => u.uid === uid ? { 
        ...u, 
        subscriptionDueDate: newDueDate,
        status: 'active'
      } : u));
    } catch (error) {
      console.error("Error updating payment:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[#c58a4b] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 mb-2">
        <h2 className="text-2xl font-serif font-bold text-[#fcf8f5]">Painel Financeiro & Assinantes</h2>
        <p className="text-[#a89c93]">Acompanhe suas receitas e gerencie o acesso dos seus clientes.</p>
      </div>

      <DashboardSubscriptions users={users} />

      <div className="bg-[#1a1614] border border-[#3d342f] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#14110f] border-b border-[#3d342f]">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-[#a89c93] uppercase tracking-wider">Usuário</th>
                <th className="px-6 py-4 text-xs font-bold text-[#a89c93] uppercase tracking-wider">Função</th>
                <th className="px-6 py-4 text-xs font-bold text-[#a89c93] uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-[#a89c93] uppercase tracking-wider">Assinatura</th>
                <th className="px-6 py-4 text-xs font-bold text-[#a89c93] uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3d342f]">
              {users.map(u => (
                <tr key={u.uid} className="hover:bg-[#14110f] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#241e1b] border border-[#3d342f] flex items-center justify-center">
                        <User className="w-5 h-5 text-[#a89c93]" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-[#fcf8f5]">{u.email}</div>
                        <div className="text-xs text-[#a89c93]">ID: {u.uid.slice(0, 8)}...</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={u.role}
                      onChange={(e) => updateRole(u.uid, e.target.value as 'admin' | 'user')}
                      className="bg-[#12100e] border border-[#3d342f] rounded-lg px-3 py-1.5 text-xs text-[#fcf8f5] focus:outline-none focus:border-[#c58a4b]"
                    >
                      <option value="user">Cliente / Usuário</option>
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
                          <div className={`text-xs font-medium ${new Date(u.subscriptionDueDate) < new Date() ? 'text-red-400' : 'text-[#fcf8f5]'}`}>
                            Vence em: {new Date(u.subscriptionDueDate).toLocaleDateString('pt-BR')}
                            {new Date(u.subscriptionDueDate) < new Date() && <span className="block text-[10px] uppercase text-red-500 font-bold">Atrasado</span>}
                          </div>
                        ) : (
                          <span className="text-xs text-[#a89c93]">Não definida</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-[#a89c93]">Acesso Vitalício</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2 flex-wrap">
                      {u.role !== 'admin' && (
                        <button
                          onClick={() => registerPayment(u.uid, u.subscriptionDueDate)}
                          className="px-3 py-1.5 bg-[#1c1815] border border-[#c58a4b]/30 hover:bg-[#c58a4b]/20 text-[#c58a4b] flex items-center gap-1 text-xs font-bold rounded-lg transition-colors"
                          title="Adicionar +1 Mês de acesso"
                        >
                          <CreditCard className="w-3 h-3" /> +1 Mês
                        </button>
                      )}
                      {u.status !== 'active' && (
                        <button
                          onClick={() => updateStatus(u.uid, 'active')}
                          className="px-3 py-1.5 bg-[#c58a4b] hover:bg-[#d49454] text-black text-xs font-bold rounded-lg transition-colors"
                        >
                          Aprovar
                        </button>
                      )}
                      {u.status !== 'inactive' && (
                        <button
                          onClick={() => updateStatus(u.uid, 'inactive')}
                          className="px-3 py-1.5 bg-[#241e1b] hover:bg-red-500/20 text-[#a89c93] hover:text-red-400 border border-[#3d342f] hover:border-red-500/30 text-xs font-bold rounded-lg transition-colors"
                        >
                          Bloquear
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-[#a89c93] text-sm">
                    Nenhum usuário encontrado.
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
