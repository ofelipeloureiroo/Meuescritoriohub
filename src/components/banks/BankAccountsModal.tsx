import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRightLeft,
  Building2,
  Check,
  CheckCircle2,
  Pencil,
  Plus,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import { BankAccount } from '../../types';
import { useFinance } from '../../context/FinanceContext';
import { formatCurrency } from '../../utils/formatters';
import { POPULAR_BANKS, getBankInfo } from '../../utils/boletoGenerator';

interface BankAccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTransferModal?: () => void;
  initialEditingAccountId?: string | null;
}

const COLOR_OPTIONS = [
  { label: 'Laranja (Itaú / Inter)', value: '#ec7000' },
  { label: 'Roxo (Nubank)', value: '#820ad1' },
  { label: 'Vermelho (Bradesco / Santander)', value: '#cc092f' },
  { label: 'Azul (Caixa / Principal)', value: '#0066b3' },
  { label: 'Verde (Sicredi / Dinheiro)', value: '#10b981' },
  { label: 'Petróleo (Sicoob)', value: '#003641' },
  { label: 'Dourado / Bronze', value: '#c58a4b' },
  { label: 'Preto / Grafite (C6 / Black)', value: '#242424' },
];

export const BankAccountsModal: React.FC<BankAccountsModalProps> = ({
  isOpen,
  onClose,
  onOpenTransferModal,
  initialEditingAccountId,
}) => {
  const { bankAccounts, addBankAccount, updateBankAccount, deleteBankAccount } = useFinance();

  // Mode: 'list' | 'add' | 'edit'
  const [mode, setMode] = useState<'list' | 'add' | 'edit'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    bankCode: '341',
    agency: '',
    accountNumber: '',
    wallet: '109',
    balance: '0',
    type: 'bank' as 'bank' | 'fintech' | 'investment' | 'physical_cash',
    color: '#ec7000',
  });

  // Account deletion confirmation dialog state
  const [accountToDelete, setAccountToDelete] = useState<BankAccount | null>(null);

  // If instructed to edit a specific account on open
  React.useEffect(() => {
    if (isOpen && initialEditingAccountId) {
      const acc = bankAccounts.find((a) => a.id === initialEditingAccountId);
      if (acc) {
        startEdit(acc);
      }
    } else if (isOpen) {
      setMode('list');
      setAccountToDelete(null);
    }
  }, [isOpen, initialEditingAccountId]);

  if (!isOpen) return null;

  const startAdd = () => {
    setEditingId(null);
    setFormData({
      name: '',
      bankCode: '341',
      agency: '',
      accountNumber: '',
      wallet: '109',
      balance: '0',
      type: 'bank',
      color: '#ec7000',
    });
    setMode('add');
  };

  const startEdit = (acc: BankAccount) => {
    setEditingId(acc.id);
    const matchedBank = getBankInfo(acc.bankCode || acc.name);
    setFormData({
      name: acc.name,
      bankCode: acc.bankCode || matchedBank.code || '341',
      agency: acc.agency || '',
      accountNumber: acc.accountNumber || '',
      wallet: acc.wallet || matchedBank.walletDefault || '109',
      balance: String(acc.balance || 0),
      type: acc.type || 'bank',
      color: acc.color || matchedBank.color || '#c58a4b',
    });
    setMode('edit');
  };

  const handleBankSelect = (code: string) => {
    const bank = POPULAR_BANKS[code];
    if (bank) {
      setFormData((prev) => ({
        ...prev,
        bankCode: code,
        name: prev.name.trim() ? prev.name : bank.name,
        color: bank.color || prev.color,
        wallet: bank.walletDefault || prev.wallet,
      }));
    } else {
      setFormData((prev) => ({ ...prev, bankCode: code }));
    }
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const numBalance = parseFloat(formData.balance.replace(',', '.')) || 0;

    if (mode === 'add') {
      addBankAccount({
        name: formData.name.trim(),
        bankCode: formData.bankCode,
        agency: formData.agency.trim() || undefined,
        accountNumber: formData.accountNumber.trim() || undefined,
        wallet: formData.wallet.trim() || undefined,
        balance: numBalance,
        type: formData.type,
        color: formData.color,
        iconName: 'Building2',
      });
    } else if (mode === 'edit' && editingId) {
      updateBankAccount(editingId, {
        name: formData.name.trim(),
        bankCode: formData.bankCode,
        agency: formData.agency.trim() || undefined,
        accountNumber: formData.accountNumber.trim() || undefined,
        wallet: formData.wallet.trim() || undefined,
        balance: numBalance,
        type: formData.type,
        color: formData.color,
      });
    }

    setMode('list');
    setEditingId(null);
  };

  const handleConfirmDelete = () => {
    if (accountToDelete) {
      deleteBankAccount(accountToDelete.id);
      setAccountToDelete(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-[#1c1815] text-[#fcf8f5] shadow-2xl border border-[#3d342f] p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#3d342f] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[#c58a4b] flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#fcf8f5]">
                {mode === 'list' && 'Contas Bancárias e Saldos'}
                {mode === 'add' && 'Adicionar Nova Conta Bancária'}
                {mode === 'edit' && 'Editar Conta Bancária'}
              </h3>
              <p className="text-xs text-[#a89c93]">
                {mode === 'list' && 'Gerencie agência e conta para recebimento de boletos'}
                {mode !== 'list' && 'Informe os dados da agência e conta para emissão de boletos'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#a89c93] hover:text-[#fcf8f5] hover:bg-[#28221e] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ================= VIEW: LIST OF ACCOUNTS ================= */}
        {mode === 'list' && (
          <div className="space-y-4">
            <div className="space-y-2.5">
              {bankAccounts.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#a89c93]">
                  Nenhuma conta cadastrada. Clique em "+ Adicionar Banco" abaixo.
                </div>
              ) : (
                bankAccounts.map((acc) => {
                  const bankInfo = getBankInfo(acc.bankCode || acc.name);
                  const hasBoletoData = Boolean(acc.agency && acc.accountNumber);

                  return (
                    <div
                      key={acc.id}
                      className="p-3.5 sm:p-4 rounded-xl border border-[#3d342f] bg-[#241e1b] hover:border-[#4d423b] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      {/* Left: Info */}
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-sm shrink-0 shadow-xs"
                          style={{ backgroundColor: acc.color || bankInfo.color || '#c58a4b' }}
                        >
                          {acc.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-[#fcf8f5] truncate">
                              {acc.name}
                            </h4>
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#1a1614] text-[#a89c93] border border-[#3d342f]">
                              {acc.type === 'physical_cash'
                                ? 'Caixa Físico'
                                : acc.type === 'fintech'
                                ? 'Fintech / Digital'
                                : acc.type === 'investment'
                                ? 'Investimento'
                                : 'Conta Corrente'}
                            </span>
                          </div>

                          {/* Boleto Banking Details (Agência / Conta) */}
                          {acc.type !== 'physical_cash' && (
                            <div className="mt-1">
                              {hasBoletoData ? (
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-md font-medium">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                    Agência: {acc.agency} • Conta: {acc.accountNumber}
                                  </span>
                                  {acc.wallet && (
                                    <span className="text-[10px] font-mono text-[#a89c93] bg-[#1a1614] px-1.5 py-0.5 rounded border border-[#3d342f]">
                                      Cart. {acc.wallet}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-1.5 text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                                  <AlertCircle className="w-3 h-3 text-amber-400" />
                                  <span>Sem agência/conta para boleto</span>
                                  <button
                                    onClick={() => startEdit(acc)}
                                    className="text-[#d49454] underline hover:text-[#fcf8f5] cursor-pointer ml-1 font-bold"
                                  >
                                    Preencher
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Balance & Actions */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#322924]">
                        <div className="text-left sm:text-right">
                          <span className="text-[10px] text-[#a89c93] block">Saldo Atual</span>
                          <span className="text-sm font-bold font-serif text-[#fcf8f5]">
                            {formatCurrency(acc.balance)}
                          </span>
                        </div>

                        {/* Action Buttons: Edit and Delete */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEdit(acc)}
                            title="Editar dados da conta e agência"
                            className="p-1.5 text-[#a89c93] hover:text-[#fcf8f5] hover:bg-[#322924] rounded-lg transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setAccountToDelete(acc)}
                            title="Excluir conta bancária"
                            className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[#3d342f]">
              {onOpenTransferModal && (
                <button
                  onClick={onOpenTransferModal}
                  className="px-3.5 py-2 rounded-xl border border-[#3d342f] bg-[#241e1b] text-xs font-semibold text-[#fcf8f5] hover:bg-[#2d2520] transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-[#c58a4b]" />
                  <span>Nova Transferência</span>
                </button>
              )}

              <button
                onClick={startAdd}
                className="ml-auto px-4 py-2 rounded-xl bg-[#c58a4b] hover:bg-[#b0783d] text-black text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Banco</span>
              </button>
            </div>
          </div>
        )}

        {/* ================= VIEW: ADD OR EDIT FORM ================= */}
        {(mode === 'add' || mode === 'edit') && (
          <form onSubmit={handleSaveForm} className="space-y-4">
            {/* Bank Select & Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#d49454] uppercase tracking-wider mb-1.5">
                  Banco Emissor
                </label>
                <select
                  value={formData.bankCode}
                  onChange={(e) => handleBankSelect(e.target.value)}
                  className="w-full bg-[#14110f] border border-[#3d342f] text-[#fcf8f5] text-xs font-medium rounded-xl p-2.5 focus:outline-none focus:border-[#c58a4b]"
                >
                  {Object.values(POPULAR_BANKS).map((bank) => (
                    <option key={bank.code} value={bank.code}>
                      {bank.code} - {bank.name}
                    </option>
                  ))}
                  <option value="other">Outro Banco</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#d49454] uppercase tracking-wider mb-1.5">
                  Nome da Conta / Identificação *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Itaú PJ, Nubank Empresa, Caixa"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#14110f] border border-[#3d342f] text-[#fcf8f5] text-xs rounded-xl p-2.5 focus:outline-none focus:border-[#c58a4b]"
                />
              </div>
            </div>

            {/* Destaque: Dados de Recebimento do Boleto */}
            <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/25 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#c58a4b]" />
                  Dados de Recebimento de Boleto Bancário
                </span>
                <span className="text-[10px] text-amber-400/80 bg-amber-500/15 px-2 py-0.5 rounded-md font-medium">
                  Usado no Boleto
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#c4b5a5] mb-1">
                    Agência *
                  </label>
                  <input
                    type="text"
                    placeholder="ex: 1234 ou 1234-5"
                    value={formData.agency}
                    onChange={(e) => setFormData({ ...formData, agency: e.target.value })}
                    className="w-full bg-[#14110f] border border-[#3d342f] text-[#fcf8f5] font-mono text-xs rounded-xl p-2.5 focus:outline-none focus:border-[#c58a4b]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#c4b5a5] mb-1">
                    Conta Corrente com Dígito *
                  </label>
                  <input
                    type="text"
                    placeholder="ex: 56789-0"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                    className="w-full bg-[#14110f] border border-[#3d342f] text-[#fcf8f5] font-mono text-xs rounded-xl p-2.5 focus:outline-none focus:border-[#c58a4b]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#c4b5a5] mb-1">
                    Carteira do Boleto
                  </label>
                  <input
                    type="text"
                    placeholder="ex: 109, 09, 112"
                    value={formData.wallet}
                    onChange={(e) => setFormData({ ...formData, wallet: e.target.value })}
                    className="w-full bg-[#14110f] border border-[#3d342f] text-[#fcf8f5] font-mono text-xs rounded-xl p-2.5 focus:outline-none focus:border-[#c58a4b]"
                  />
                </div>
              </div>
              <p className="text-[10px] text-[#a89c93]">
                Esses dados serão impressos na <strong>Ficha de Compensação</strong> e utilizados para calcular a <strong>Linha Digitável</strong> dos boletos emitidos por esta conta.
              </p>
            </div>

            {/* Tipo de Conta e Saldo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#d49454] uppercase tracking-wider mb-1.5">
                  Tipo de Conta
                </label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      type: e.target.value as 'bank' | 'fintech' | 'investment' | 'physical_cash',
                    })
                  }
                  className="w-full bg-[#14110f] border border-[#3d342f] text-[#fcf8f5] text-xs font-medium rounded-xl p-2.5 focus:outline-none focus:border-[#c58a4b]"
                >
                  <option value="bank">Conta Corrente Bancária</option>
                  <option value="fintech">Fintech / Digital (Nubank, Inter, etc.)</option>
                  <option value="investment">Investimento / Poupança</option>
                  <option value="physical_cash">Caixa Físico (Espécie)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#d49454] uppercase tracking-wider mb-1.5">
                  Saldo {mode === 'add' ? 'Inicial' : 'Atual'} (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.balance}
                  onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                  className="w-full bg-[#14110f] border border-[#3d342f] text-[#fcf8f5] text-xs font-mono rounded-xl p-2.5 focus:outline-none focus:border-[#c58a4b]"
                />
              </div>
            </div>

            {/* Cor de Identificação */}
            <div>
              <label className="block text-xs font-semibold text-[#d49454] uppercase tracking-wider mb-1.5">
                Cor de Identificação
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: c.value })}
                    className={`w-7 h-7 rounded-lg transition-transform cursor-pointer flex items-center justify-center ${
                      formData.color === c.value ? 'scale-110 ring-2 ring-white shadow-md' : 'opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.label}
                  >
                    {formData.color === c.value && <Check className="w-4 h-4 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Form Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#3d342f]">
              <button
                type="button"
                onClick={() => {
                  setMode('list');
                  setEditingId(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#a89c93] hover:text-[#fcf8f5] hover:bg-[#28221e] transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#c58a4b] hover:bg-[#b0783d] text-black text-xs font-bold transition-all cursor-pointer shadow-md active:scale-95"
              >
                {mode === 'add' ? 'Adicionar Conta' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        )}

        {/* ================= DELETE CONFIRMATION DIALOG ================= */}
        {accountToDelete && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
            <div className="w-full max-w-sm rounded-2xl bg-[#1c1815] border border-rose-500/40 p-5 space-y-3 shadow-2xl">
              <div className="flex items-center gap-2.5 text-rose-400">
                <div className="w-8 h-8 rounded-lg bg-rose-500/15 flex items-center justify-center shrink-0">
                  <Trash2 className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold text-[#fcf8f5]">Excluir Conta Bancária?</h4>
              </div>

              <p className="text-xs text-[#c4b5a5]">
                Deseja realmente excluir a conta <strong className="text-white">"{accountToDelete.name}"</strong>?
              </p>

              {accountToDelete.balance !== 0 && (
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Esta conta possui saldo atual de <strong>{formatCurrency(accountToDelete.balance)}</strong>.</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAccountToDelete(null)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[#a89c93] hover:text-[#fcf8f5] hover:bg-[#28221e] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md active:scale-95"
                >
                  Sim, Excluir
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
