import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  TrendingUp, 
  Trash2, 
  Plus, 
  DollarSign, 
  Users, 
  CreditCard, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Sparkles,
  X,
  Mail,
  Receipt
} from 'lucide-react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { UserProfile } from '../../context/AuthContext';

export interface PlatformPayment {
  id: string;
  subscriberEmail: string;
  subscriberName?: string;
  description: string;
  plan: '1month' | '1year' | 'custom' | 'manual';
  amount: number;
  date: string;
  paymentMethod: 'PIX' | 'Cartão de Crédito' | 'Boleto' | 'Transferência' | 'Outro';
  createdAt: string;
}

const STORAGE_KEY = 'platform_subscriber_payments_v1';

interface FinancialControlTabProps {
  users?: UserProfile[];
}

export const FinancialControlTab: React.FC<FinancialControlTabProps> = ({ users = [] }) => {
  const [payments, setPayments] = useState<PlatformPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State for Manual Subscription Payment
  const [formData, setFormData] = useState({
    subscriberEmail: '',
    subscriberName: '',
    description: 'Mensalidade Plataforma SaaS',
    plan: '1month' as '1month' | '1year' | 'custom' | 'manual',
    amount: '97.00',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'PIX' as 'PIX' | 'Cartão de Crédito' | 'Boleto' | 'Transferência' | 'Outro',
  });

  // Load Platform Subscriber Payments from Firestore & localStorage
  useEffect(() => {
    let unsub: () => void = () => {};

    const loadPlatformPayments = async () => {
      try {
        // 1. Try local storage first for instantaneous UI
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setPayments(parsed);
            }
          } catch (e) {
            console.warn("Cached payments parse error:", e);
          }
        }

        // 2. Subscribe to Firestore collection 'platform_payments'
        const colRef = collection(db, 'platform_payments');
        unsub = onSnapshot(colRef, (snapshot) => {
          const docsData: PlatformPayment[] = [];
          snapshot.forEach((d) => {
            docsData.push({ id: d.id, ...d.data() } as PlatformPayment);
          });

          // Sort by date descending
          docsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

          if (docsData.length > 0) {
            setPayments(docsData);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(docsData));
          } else {
            // If empty in Firestore and empty in local, seed default sample subscriber entries from active users
            const activeSubscribers = users.filter(u => u.role !== 'admin' && u.status === 'active');
            if (activeSubscribers.length > 0 && (!cached || JSON.parse(cached || '[]').length === 0)) {
              const seeded: PlatformPayment[] = activeSubscribers.map((u, idx) => ({
                id: `seed-${u.uid}-${idx}`,
                subscriberEmail: u.email,
                subscriberName: u.name || u.email.split('@')[0],
                description: 'Assinatura Plataforma SaaS - Ativação',
                plan: '1month',
                amount: 97.00,
                date: u.createdAt ? new Date(u.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                paymentMethod: 'PIX',
                createdAt: new Date().toISOString()
              }));
              setPayments(seeded);
              localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
            }
          }
          setLoading(false);
        }, (err) => {
          console.warn("Firestore platform_payments listener error, using fallback state:", err);
          setLoading(false);
        });

      } catch (err) {
        console.error("Error setting up platform payments listener:", err);
        setLoading(false);
      }
    };

    loadPlatformPayments();

    return () => {
      unsub();
    };
  }, [users]);

  // Handle plan selection auto-populating default prices
  const handlePlanChange = (plan: '1month' | '1year' | 'custom' | 'manual') => {
    let defaultAmount = formData.amount;
    let desc = formData.description;

    if (plan === '1month') {
      defaultAmount = '97.00';
      desc = 'Mensalidade Assinatura Plataforma (30 Dias)';
    } else if (plan === '1year') {
      defaultAmount = '990.00';
      desc = 'Anuidade Assinatura Plataforma (365 Dias)';
    }

    setFormData(prev => ({
      ...prev,
      plan,
      amount: defaultAmount,
      description: desc
    }));
  };

  // Add new subscriber payment record
  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subscriberEmail.trim()) {
      alert('Por favor, informe o e-mail do assinante.');
      return;
    }

    const numericAmount = parseFloat(formData.amount.replace(',', '.'));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      alert('Por favor, insira um valor válido para a assinatura.');
      return;
    }

    const newDocId = `pay_${Date.now()}`;
    const newPayment: PlatformPayment = {
      id: newDocId,
      subscriberEmail: formData.subscriberEmail.trim().toLowerCase(),
      subscriberName: formData.subscriberName.trim() || formData.subscriberEmail.split('@')[0],
      description: formData.description.trim() || 'Assinatura Plataforma',
      plan: formData.plan,
      amount: numericAmount,
      date: formData.date || new Date().toISOString().split('T')[0],
      paymentMethod: formData.paymentMethod,
      createdAt: new Date().toISOString()
    };

    try {
      // Save to Firestore
      await setDoc(doc(db, 'platform_payments', newDocId), newPayment);
      
      // Update local state and storage
      const updated = [newPayment, ...payments];
      setPayments(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      setShowAddModal(false);
      setSuccessMsg(`Recebimento de R$ ${numericAmount.toFixed(2)} registrado com sucesso para ${formData.subscriberEmail}!`);
      setTimeout(() => setSuccessMsg(null), 4000);

      // Reset form
      setFormData({
        subscriberEmail: '',
        subscriberName: '',
        description: 'Mensalidade Plataforma SaaS',
        plan: '1month',
        amount: '97.00',
        date: new Date().toISOString().split('T')[0],
        paymentMethod: 'PIX',
      });
    } catch (err: any) {
      console.error("Error saving platform payment:", err);
      // Fallback local update
      const updated = [newPayment, ...payments];
      setPayments(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setShowAddModal(false);
      setSuccessMsg(`Recebimento de R$ ${numericAmount.toFixed(2)} registrado localmente.`);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  // Delete individual payment record
  const handleDeletePayment = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja remover este registro de recebimento de assinatura?')) return;

    try {
      await deleteDoc(doc(db, 'platform_payments', id));
    } catch (e) {
      console.warn("Could not delete from Firestore:", e);
    }

    const updated = payments.filter(p => p.id !== id);
    setPayments(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  // Reset all platform financial control data
  const handleReset = async () => {
    if (window.confirm('Tem certeza que deseja zerar TODO o histórico de recebimentos de assinantes da plataforma? Esta ação não pode ser desfeita.')) {
      try {
        const querySnapshot = await getDocs(collection(db, 'platform_payments'));
        querySnapshot.forEach(async (d) => {
          await deleteDoc(doc(db, 'platform_payments', d.id));
        });
      } catch (e) {
        console.warn("Error deleting Firestore documents:", e);
      }

      setPayments([]);
      localStorage.removeItem(STORAGE_KEY);
      setSuccessMsg('Controle financeiro de assinantes zerado com sucesso.');
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  // Calculations for SaaS Metrics
  const totalRevenue = payments.reduce((acc, p) => acc + p.amount, 0);

  // Active platform subscribers count
  const activeSubscribersList = users.filter(u => u.role !== 'admin' && u.status === 'active');
  const activeSubscribersCount = activeSubscribersList.length;

  // Estimated MRR (Monthly Recurring Revenue): Active Subscribers * R$ 97,00 (or actual monthly values)
  const estimatedMRR = activeSubscribersCount * 97.00;

  // Ticket médio
  const averageTicket = payments.length > 0 ? totalRevenue / payments.length : 97.00;

  // Filtered Payments List
  const filteredPayments = payments.filter(p => 
    p.subscriberEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.subscriberName && p.subscriberName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.paymentMethod.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Title & Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Receipt className="w-6 h-6 text-[#b5986e]" />
            <h2 className="text-2xl sm:text-3xl font-serif font-extrabold text-zinc-900 tracking-tight">
              Controle Financeiro de Assinantes da Plataforma
            </h2>
          </div>
          <p className="text-zinc-600 text-xs sm:text-sm font-medium mt-0.5">
            Acompanhe o faturamento de mensalidades, faturas recebidas e receita de assinaturas do sistema.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Lançar Recebimento Manual</span>
          </button>

          <button
            onClick={handleReset}
            className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
            title="Zerar registros financeiros de assinantes da plataforma"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Zerar Histórico</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Metric Cards (Platform SaaS Financial Indicators) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Recebido em Assinaturas */}
        <div className="bg-white border border-emerald-200/90 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between shadow-2xs">
          <div className="absolute -top-3 -right-3 p-3 opacity-10">
            <TrendingUp className="w-20 h-20 text-emerald-600" />
          </div>
          <div>
            <span className="text-emerald-800 text-[11px] font-bold uppercase tracking-wider block mb-1">
              Faturamento Total de Assinaturas
            </span>
            <div className="text-2xl sm:text-3xl font-serif font-extrabold text-emerald-600">
              {totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
          </div>
          <span className="text-[10px] text-emerald-700 font-semibold mt-2 block">
            {payments.length} recebimento(s) confirmado(s)
          </span>
        </div>

        {/* Receita Recorrente Estimada (MRR) */}
        <div className="bg-white border border-sky-200/90 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between shadow-2xs">
          <div className="absolute -top-3 -right-3 p-3 opacity-10">
            <Sparkles className="w-20 h-20 text-sky-600" />
          </div>
          <div>
            <span className="text-sky-800 text-[11px] font-bold uppercase tracking-wider block mb-1">
              MRR Estimado (Recorrência)
            </span>
            <div className="text-2xl sm:text-3xl font-serif font-extrabold text-sky-600">
              {estimatedMRR.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              <span className="text-xs font-sans text-sky-700 font-semibold"> /mês</span>
            </div>
          </div>
          <span className="text-[10px] text-sky-700 font-semibold mt-2 block">
            Baseado em {activeSubscribersCount} assinante(s) ativo(s)
          </span>
        </div>

        {/* Ticket Médio de Assinatura */}
        <div className="bg-white border border-amber-200/90 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between shadow-2xs">
          <div className="absolute -top-3 -right-3 p-3 opacity-10">
            <DollarSign className="w-20 h-20 text-amber-600" />
          </div>
          <div>
            <span className="text-amber-800 text-[11px] font-bold uppercase tracking-wider block mb-1">
              Ticket Médio de Assinatura
            </span>
            <div className="text-2xl sm:text-3xl font-serif font-extrabold text-amber-600">
              {averageTicket.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
          </div>
          <span className="text-[10px] text-amber-700 font-semibold mt-2 block">
            Valor médio pago por fatura
          </span>
        </div>

        {/* Total Assinantes Pagantes */}
        <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between shadow-2xs">
          <div className="absolute -top-3 -right-3 p-3 opacity-10">
            <Users className="w-20 h-20 text-zinc-900" />
          </div>
          <div>
            <span className="text-zinc-500 text-[11px] font-bold uppercase tracking-wider block mb-1">
              Assinantes Ativos Pagantes
            </span>
            <div className="text-2xl sm:text-3xl font-serif font-extrabold text-zinc-900">
              {activeSubscribersCount}
            </div>
          </div>
          <span className="text-[10px] text-zinc-500 font-medium mt-2 block">
            Com acesso liberado ao sistema
          </span>
        </div>
      </div>

      {/* Table & Search Header */}
      <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pb-2">
          <div>
            <h3 className="text-zinc-900 font-serif font-bold text-lg">
              Histórico de Entradas de Assinaturas
            </h3>
            <p className="text-xs text-zinc-500 font-medium">
              Listagem de pagamentos efetuados pelos assinantes da plataforma.
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar por e-mail ou forma de pagamento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-zinc-50 border border-zinc-300 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:bg-white focus:border-[#b5986e] font-medium"
            />
          </div>
        </div>

        {/* Payments Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-zinc-50/80 border-b border-zinc-200">
              <tr>
                <th className="px-4 py-3.5 text-xs font-bold text-zinc-600 uppercase tracking-wider">Assinante / E-mail</th>
                <th className="px-4 py-3.5 text-xs font-bold text-zinc-600 uppercase tracking-wider">Descrição do Pagamento</th>
                <th className="px-4 py-3.5 text-xs font-bold text-zinc-600 uppercase tracking-wider">Forma de Pagamento</th>
                <th className="px-4 py-3.5 text-xs font-bold text-zinc-600 uppercase tracking-wider">Data</th>
                <th className="px-4 py-3.5 text-xs font-bold text-zinc-600 uppercase tracking-wider text-right">Valor</th>
                <th className="px-4 py-3.5 text-xs font-bold text-zinc-600 uppercase tracking-wider text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredPayments.map((p) => (
                <tr key={p.id} className="hover:bg-amber-50/20 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="font-bold text-xs text-zinc-900">{p.subscriberName || p.subscriberEmail}</div>
                    <div className="text-[11px] font-mono text-[#8c6b3e] font-semibold">{p.subscriberEmail}</div>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-zinc-800 font-medium">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 border border-zinc-200 text-zinc-800 text-[11px] font-bold">
                      {p.description}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-xs">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                      {p.paymentMethod}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-zinc-500 font-medium whitespace-nowrap">
                    {p.date ? new Date(p.date + 'T00:00:00').toLocaleDateString('pt-BR') : 'Sem data'}
                  </td>
                  <td className="px-4 py-3.5 text-xs font-extrabold text-emerald-600 text-right whitespace-nowrap">
                    {p.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <button
                      onClick={() => handleDeletePayment(p.id)}
                      className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 border border-zinc-200 hover:border-rose-200 rounded-lg transition-all cursor-pointer shadow-2xs"
                      title="Excluir este lançamento de recebimento"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}

              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-zinc-500 text-xs font-medium">
                    Nenhum recebimento de assinatura de plataforma encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para Lançar Recebimento Manual de Assinante */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 rounded-3xl p-6 w-full max-w-lg space-y-5 shadow-2xl relative animate-in zoom-in-95 duration-200 text-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#b5986e]" />
                <h3 className="font-serif font-bold text-lg text-zinc-900">
                  Lançar Recebimento de Assinatura
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-zinc-400 hover:text-zinc-700 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPayment} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-zinc-600 uppercase tracking-wider">
                  E-mail do Assinante *
                </label>
                <input
                  type="email"
                  required
                  placeholder="ex: cliente@email.com"
                  list="subscribers-list"
                  value={formData.subscriberEmail}
                  onChange={(e) => {
                    const email = e.target.value;
                    const matchedUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
                    setFormData(prev => ({
                      ...prev,
                      subscriberEmail: email,
                      subscriberName: matchedUser?.name || prev.subscriberName
                    }));
                  }}
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:bg-white focus:border-[#b5986e] font-medium"
                />
                <datalist id="subscribers-list">
                  {users.map(u => (
                    <option key={u.uid} value={u.email}>{u.name ? `${u.name} (${u.email})` : u.email}</option>
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-zinc-600 uppercase tracking-wider">
                    Plano de Assinatura
                  </label>
                  <select
                    value={formData.plan}
                    onChange={(e) => handlePlanChange(e.target.value as any)}
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs text-zinc-900 font-semibold focus:outline-none focus:bg-white focus:border-[#b5986e] cursor-pointer"
                  >
                    <option value="1month">Mensal (30 Dias) - R$ 97,00</option>
                    <option value="1year">Anual (365 Dias) - R$ 990,00</option>
                    <option value="custom">Valor Personalizado</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-zinc-600 uppercase tracking-wider">
                    Valor Recebido (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3.5 py-2 text-xs font-bold text-emerald-600 focus:outline-none focus:bg-white focus:border-[#b5986e]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-zinc-600 uppercase tracking-wider">
                  Descrição
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="ex: Mensalidade Plataforma - PIX enviado"
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3.5 py-2 text-xs text-zinc-900 focus:outline-none focus:bg-white focus:border-[#b5986e] font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-zinc-600 uppercase tracking-wider">
                    Forma de Pagamento
                  </label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value as any }))}
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs text-zinc-900 font-semibold focus:outline-none focus:bg-white focus:border-[#b5986e] cursor-pointer"
                  >
                    <option value="PIX">PIX</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Boleto">Boleto Bancário</option>
                    <option value="Transferência">Transferência</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-zinc-600 uppercase tracking-wider">
                    Data do Pagamento
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs text-zinc-900 font-semibold focus:outline-none focus:bg-white focus:border-[#b5986e]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="py-2 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="py-2 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Salvar Recebimento</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
