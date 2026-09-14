import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  AlertCircle,
  Barcode,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Copy,
  DollarSign,
  Download,
  ExternalLink,
  FileText,
  MessageCircle,
  Phone,
  Printer,
  QrCode,
  Send,
  Share2,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { ProjectInstallment } from '../../types';
import { useFinance } from '../../context/FinanceContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  POPULAR_BANKS,
  BankInfo,
  generateBoletoCodes,
  buildBoletoWhatsAppMessage,
  getBankInfo,
} from '../../utils/boletoGenerator';
import { BankAccountsModal } from '../banks/BankAccountsModal';

interface BoletoModalProps {
  isOpen: boolean;
  onClose: () => void;
  installment: ProjectInstallment | null;
  onUpdateInstallment?: (id: string, updates: Partial<ProjectInstallment>) => void;
}

export const BoletoModal: React.FC<BoletoModalProps> = ({
  isOpen,
  onClose,
  installment,
  onUpdateInstallment,
}) => {
  const { architectProfile, profile, user, bankAccounts } = useFinance();

  // Selected registered account ID or '' for raw bank
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedBankCode, setSelectedBankCode] = useState<string>('341'); // Itaú default
  const [isManageAccountsOpen, setIsManageAccountsOpen] = useState<boolean>(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);

  const [clientDocument, setClientDocument] = useState<string>('');
  const [customInstructions, setCustomInstructions] = useState<string>(
    'Após o vencimento cobrar multa de 2,00% e juros de mora de 1,00% ao mês. Não receber após 30 dias do vencimento.'
  );
  const [customNotes, setCustomNotes] = useState<string>('');
  const [showPixQr, setShowPixQr] = useState<boolean>(true);

  // Copy feedbacks
  const [copiedLinha, setCopiedLinha] = useState<boolean>(false);
  const [copiedPix, setCopiedPix] = useState<boolean>(false);
  const [showWhatsAppPreview, setShowWhatsAppPreview] = useState<boolean>(false);
  const [customMessage, setCustomMessage] = useState<string>('');
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const printRef = useRef<HTMLDivElement>(null);

  // Selected registered account object
  const selectedAccount = useMemo(() => {
    return bankAccounts.find((a) => a.id === selectedAccountId) || null;
  }, [bankAccounts, selectedAccountId]);

  // Effective bank code derived from registered account or selectedBankCode
  const effectiveBankCode = useMemo(() => {
    if (selectedAccount) {
      const codeFromAccount = selectedAccount.bankCode || getBankInfo(selectedAccount.name).code;
      if (codeFromAccount && POPULAR_BANKS[codeFromAccount]) {
        return codeFromAccount;
      }
    }
    return selectedBankCode || '341';
  }, [selectedAccount, selectedBankCode]);

  // Derived bank info
  const currentBank: BankInfo = useMemo(() => {
    return POPULAR_BANKS[effectiveBankCode] || POPULAR_BANKS['341'];
  }, [effectiveBankCode]);

  // Effective agency, account and wallet from registered account or bank default
  const effectiveAgency = selectedAccount?.agency || currentBank.agencyDefault;
  const effectiveAccountNumber = selectedAccount?.accountNumber || currentBank.accountDefault;
  const effectiveWallet = selectedAccount?.wallet || currentBank.walletDefault || '109';

  // Initialize data when installment opens or bankAccounts change
  useEffect(() => {
    if (installment && isOpen) {
      // 1. Try to find the account explicitly assigned to this installment
      let matchedAcc = bankAccounts.find((a) => a.id === installment.boletoBankAccountId);
      if (!matchedAcc && installment.bankAccountId) {
        matchedAcc = bankAccounts.find((a) => a.id === installment.bankAccountId);
      }

      // 2. If not found, pick the default account or first available bank/fintech account
      if (!matchedAcc && bankAccounts.length > 0) {
        matchedAcc =
          bankAccounts.find((a) => a.isDefault && a.type !== 'physical_cash') ||
          bankAccounts.find((a) => a.type !== 'physical_cash') ||
          bankAccounts[0];
      }

      if (matchedAcc) {
        setSelectedAccountId(matchedAcc.id);
        const code = matchedAcc.bankCode || getBankInfo(matchedAcc.name).code;
        setSelectedBankCode(code || '341');
      } else if (installment.boletoBank && POPULAR_BANKS[installment.boletoBank]) {
        setSelectedAccountId('');
        setSelectedBankCode(installment.boletoBank);
      } else {
        setSelectedAccountId('');
        setSelectedBankCode('341');
      }

      setClientDocument(installment.clientDocument || '');
      setCustomNotes(installment.description || '');
    }
  }, [installment, isOpen, bankAccounts]);

  const boletoData = useMemo(() => {
    if (!installment) return null;

    const codes = generateBoletoCodes(
      effectiveBankCode,
      installment.amount,
      installment.dueDate,
      `${installment.installmentNumber}`,
      effectiveAgency,
      effectiveAccountNumber,
      effectiveWallet
    );

    return {
      linhaDigitavel: installment.boletoBarcode || codes.linhaDigitavel,
      barcodeRaw: installment.boletoBarcodeRaw || codes.barcodeRaw,
      nossoNumero: installment.boletoOurNumber || codes.nossoNumero,
      fatorVencimento: codes.fatorVencimento,
      beneficiario:
        architectProfile?.name ||
        profile?.companyName ||
        user?.displayName ||
        'Escritório de Arquitetura',
      beneficiarioDoc:
        architectProfile?.cnpj || architectProfile?.cpf || '12.345.678/0001-90',
      beneficiarioEndereco: architectProfile?.city
        ? `${architectProfile.city} - ${architectProfile.state || 'Brasil'}`
        : 'Brasil',
      documentoNumero: `PARC-${String(installment.installmentNumber).padStart(2, '0')}/${installment.totalInstallments}`,
      dataDocumento: new Date().toLocaleDateString('pt-BR'),
      agenciaCodigo: `${effectiveAgency} / ${effectiveAccountNumber}`,
      carteira: effectiveWallet,
    };
  }, [
    installment,
    effectiveBankCode,
    effectiveAgency,
    effectiveAccountNumber,
    effectiveWallet,
    architectProfile,
    profile,
    user,
  ]);

  // Recalculate message when bank, account or codes change
  useEffect(() => {
    if (installment && boletoData) {
      const bankDisplayName = selectedAccount
        ? `${selectedAccount.name} (${currentBank.fullName})`
        : currentBank.fullName;

      const msg = buildBoletoWhatsAppMessage({
        clientName: installment.clientName || 'Cliente',
        projectTitle: installment.projectTitle || 'Projeto',
        installmentNumber: installment.installmentNumber,
        totalInstallments: installment.totalInstallments,
        description: installment.description || 'Honorários',
        amount: installment.amount,
        dueDate: installment.dueDate,
        linhaDigitavel: boletoData.linhaDigitavel,
        bankName: bankDisplayName,
        agency: effectiveAgency,
        accountNumber: effectiveAccountNumber,
        pixKey: architectProfile?.pixKey,
        architectName:
          architectProfile?.name || profile?.companyName || user?.displayName || 'Laíne Paula',
      });
      setCustomMessage(msg);
    }
  }, [
    effectiveBankCode,
    effectiveAgency,
    effectiveAccountNumber,
    selectedAccount,
    installment,
    boletoData,
    currentBank,
    architectProfile,
    profile,
    user,
  ]);

  if (!isOpen || !installment || !boletoData) return null;

  // Save generated boleto info into the installment
  const handleSaveToInstallment = () => {
    if (onUpdateInstallment && installment && boletoData) {
      onUpdateInstallment(installment.id, {
        boletoBarcode: boletoData.linhaDigitavel,
        boletoBarcodeRaw: boletoData.barcodeRaw,
        boletoOurNumber: boletoData.nossoNumero,
        boletoBank: effectiveBankCode,
        boletoBankAccountId: selectedAccountId || undefined,
        boletoGeneratedAt: new Date().toISOString(),
        clientDocument: clientDocument || undefined,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  };

  const handleCopyLinha = async () => {
    try {
      await navigator.clipboard.writeText(boletoData.linhaDigitavel);
      setCopiedLinha(true);
      handleSaveToInstallment();
      setTimeout(() => setCopiedLinha(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleCopyPix = async () => {
    const pix = architectProfile?.pixKey || 'contato@meuescritorio.online';
    try {
      await navigator.clipboard.writeText(pix);
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 2500);
    } catch {}
  };

  const handleSendWhatsApp = () => {
    handleSaveToInstallment();
    const rawPhone = (installment.clientPhone || '').replace(/\D/g, '');
    const cleanPhone = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;
    const encodedMsg = encodeURIComponent(customMessage);
    const url = rawPhone
      ? `https://wa.me/${cleanPhone}?text=${encodedMsg}`
      : `https://wa.me/?text=${encodedMsg}`;
    window.open(url, '_blank');
  };

  const handlePrint = () => {
    handleSaveToInstallment();
    window.print();
  };

  // Generate visual barcode bars (Code 128 / FEBRABAN simulation)
  const barcodePattern = [
    2, 1, 2, 2, 1, 3, 1, 2, 1, 1, 3, 1, 2, 2, 1, 1, 2, 3, 1, 2,
    1, 2, 2, 1, 3, 1, 1, 2, 2, 3, 1, 1, 2, 1, 2, 3, 1, 2, 1, 1,
    2, 2, 1, 3, 1, 2, 1, 2, 3, 1, 1, 2, 2, 1, 3, 1, 2, 1, 2, 2,
    1, 3, 1, 1, 2, 2, 3, 1, 1, 2, 1, 2, 3, 1, 2, 1, 1, 2, 2, 1,
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-[#1a1614] border border-[#3d342f] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-[#14110f] border-b border-[#3d342f] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Barcode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#fcf8f5]">
                  Boleto Bancário de Cobrança
                </h3>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold tracking-wider uppercase bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Parcela {installment.installmentNumber}/{installment.totalInstallments}
                </span>
              </div>
              <p className="text-xs text-[#a89c93] mt-0.5">
                {installment.projectTitle} • Cliente: <strong className="text-[#fcf8f5]">{installment.clientName}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 text-[#a89c93] hover:text-[#fcf8f5] hover:bg-[#241e1b] rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Top Control Bar: Bank Selector & Fast Actions */}
        <div className="px-4 sm:px-6 py-3 bg-[#1e1916] border-b border-[#3d342f] flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Bank / Account selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-[#a89c93] flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-[#c58a4b]" />
              Conta de Recebimento:
            </span>
            <select
              value={selectedAccountId || `bank_${effectiveBankCode}`}
              onChange={(e) => {
                const val = e.target.value;
                if (val.startsWith('bank_')) {
                  setSelectedAccountId('');
                  setSelectedBankCode(val.replace('bank_', ''));
                } else {
                  setSelectedAccountId(val);
                  const acc = bankAccounts.find((a) => a.id === val);
                  if (acc) {
                    const code = acc.bankCode || getBankInfo(acc.name).code;
                    setSelectedBankCode(code || '341');
                  }
                }
              }}
              className="bg-[#14110f] border border-[#3d342f] text-[#fcf8f5] text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#c58a4b] cursor-pointer max-w-[280px] sm:max-w-[340px] truncate"
            >
              {bankAccounts.length > 0 && (
                <optgroup label="Minhas Contas Bancárias Cadastradas">
                  {bankAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} {acc.agency && acc.accountNumber ? `(Ag: ${acc.agency} • CC: ${acc.accountNumber})` : '(Sem agência/conta)'}
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="Bancos Emissores (Padrão)">
                {Object.values(POPULAR_BANKS).map((bank) => (
                  <option key={bank.code} value={`bank_${bank.code}`}>
                    {bank.code} - {bank.name} ({bank.walletDefault ? `Cart. ${bank.walletDefault}` : ''})
                  </option>
                ))}
              </optgroup>
            </select>

            <button
              type="button"
              onClick={() => setIsManageAccountsOpen(true)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#14110f] hover:bg-[#28221e] border border-[#3d342f] text-amber-400 hover:text-amber-300 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Gerenciar contas bancárias, agência e conta"
            >
              <Building2 className="w-3.5 h-3.5 text-[#c58a4b]" />
              <span>Gerenciar Contas</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPixQr(!showPixQr)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors cursor-pointer ${
                showPixQr
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : 'bg-[#14110f] border-[#3d342f] text-[#a89c93] hover:text-[#fcf8f5]'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>BolePix (QR Code)</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleCopyLinha}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                copiedLinha
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#241e1b] hover:bg-[#2d2520] text-[#fcf8f5] border border-[#3d342f]'
              }`}
              title="Copiar linha digitável do boleto"
            >
              {copiedLinha ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5 text-[#c58a4b]" />}
              <span>{copiedLinha ? 'Linha Copiada!' : 'Copiar Linha'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#241e1b] hover:bg-[#2d2520] text-[#fcf8f5] border border-[#3d342f] flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Imprimir ou salvar PDF do boleto"
            >
              <Printer className="w-3.5 h-3.5 text-[#c58a4b]" />
              <span className="hidden sm:inline">Imprimir / PDF</span>
            </button>

            <button
              onClick={() => setShowWhatsAppPreview(!showWhatsAppPreview)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-95"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Enviar no WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Optional WhatsApp Preview Card */}
        {showWhatsAppPreview && (
          <div className="px-4 sm:px-6 py-3 bg-[#13231a] border-b border-emerald-600/30 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-emerald-300">
                  Mensagem de Envio do Boleto para {installment.clientName}
                </span>
                {installment.clientPhone && (
                  <span className="text-[11px] text-emerald-400/80">({installment.clientPhone})</span>
                )}
              </div>
              <button
                onClick={() => setShowWhatsAppPreview(false)}
                className="text-xs text-[#a89c93] hover:text-white"
              >
                Fechar
              </button>
            </div>

            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={4}
              className="w-full bg-[#0e1913] border border-emerald-500/30 rounded-xl p-2.5 text-xs text-[#ded5cc] font-mono focus:outline-none focus:border-emerald-400"
            />

            <div className="flex items-center justify-between mt-2 pt-1">
              <span className="text-[11px] text-emerald-400/70">
                A mensagem inclui o valor, vencimento e a linha digitável pronta para o cliente copiar.
              </span>
              <button
                onClick={handleSendWhatsApp}
                className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Disparar WhatsApp Agora</span>
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Content: Official Authentic Boleto Slip */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {savedSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Dados do boleto registrados com sucesso nesta parcela!</span>
            </div>
          )}

          {/* Quick Notice Banner */}
          <div className="p-3 rounded-xl bg-[#14110f] border border-[#3d342f] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#c58a4b] shrink-0" />
              <span className="text-[#a89c93]">
                Linha Digitável:{' '}
                <code className="text-[#fcf8f5] font-mono font-bold select-all bg-[#1f1916] px-2 py-0.5 rounded border border-[#3d342f]">
                  {boletoData.linhaDigitavel}
                </code>
              </span>
            </div>
            <button
              onClick={handleCopyLinha}
              className="px-2.5 py-1 text-xs font-semibold text-[#c58a4b] hover:text-[#d49454] bg-[#241e1b] rounded-lg border border-[#3d342f] self-start sm:self-auto cursor-pointer"
            >
              {copiedLinha ? 'Copiado!' : 'Copiar'}
            </button>
          </div>

          {/* Account Status Notice Banner */}
          {selectedAccount && !selectedAccount.agency && !selectedAccount.accountNumber && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 flex-wrap animate-in fade-in">
              <div className="flex items-center gap-2.5 text-xs text-amber-300">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  A conta <strong>"{selectedAccount.name}"</strong> não possui <strong>Agência e Conta Corrente</strong> cadastradas.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingAccountId(selectedAccount.id);
                  setIsManageAccountsOpen(true);
                }}
                className="px-3.5 py-1.5 bg-[#c58a4b] hover:bg-[#b0783d] text-black text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Cadastrar Agência e Conta</span>
              </button>
            </div>
          )}

          {selectedAccount && selectedAccount.agency && selectedAccount.accountNumber && (
            <div className="px-3.5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between gap-2 text-xs text-emerald-300 animate-in fade-in">
              <div className="flex items-center gap-2 flex-wrap">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Recebimento vinculado à conta: <strong className="text-white">{selectedAccount.name}</strong> • Agência: <strong className="font-mono text-white">{selectedAccount.agency}</strong> • Conta: <strong className="font-mono text-white">{selectedAccount.accountNumber}</strong> {selectedAccount.wallet ? `• Carteira: ${selectedAccount.wallet}` : ''}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingAccountId(selectedAccount.id);
                  setIsManageAccountsOpen(true);
                }}
                className="text-[11px] text-[#c58a4b] hover:underline cursor-pointer font-semibold shrink-0"
              >
                Alterar dados
              </button>
            </div>
          )}

          {/* PRINTABLE BOLETO CONTAINER (White sheet styled for standard FEBRABAN slip) */}
          <div
            id="printable-boleto"
            ref={printRef}
            className="bg-white text-black p-5 sm:p-7 rounded-xl shadow-lg font-sans text-xs border border-gray-300"
            style={{ color: '#000', backgroundColor: '#fff' }}
          >
            {/* Boleto Top Header: Bank Logo + Code + Linha Digitável */}
            <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-3">
              <div className="flex items-center gap-3">
                <div className="font-bold text-lg tracking-tight font-serif flex items-center gap-1.5 text-black">
                  <Building2 className="w-5 h-5 text-black" />
                  <span>{currentBank.name.toUpperCase()}</span>
                </div>
                <div className="border-l-2 border-r-2 border-black px-3 py-0.5 text-lg font-black tracking-wider text-black">
                  {currentBank.code}-{currentBank.digit}
                </div>
              </div>

              <div className="font-mono text-xs sm:text-sm font-bold tracking-tight text-right text-black select-all">
                {boletoData.linhaDigitavel}
              </div>
            </div>

            {/* Recibo do Pagador / Ficha de Compensação Table */}
            <div className="border border-black divide-y divide-black text-[11px]">
              {/* Row 1: Local de Pagamento & Vencimento */}
              <div className="grid grid-cols-12 divide-x divide-black">
                <div className="col-span-8 p-1.5">
                  <div className="text-[9px] uppercase font-bold text-gray-700">Local de Pagamento</div>
                  <div className="font-semibold text-black uppercase">
                    Pagável em qualquer agência bancária ou internet banking até o vencimento
                  </div>
                </div>
                <div className="col-span-4 p-1.5 bg-gray-100">
                  <div className="text-[9px] uppercase font-bold text-gray-700">Vencimento</div>
                  <div className="font-bold text-sm text-black">
                    {formatDate(installment.dueDate)}
                  </div>
                </div>
              </div>

              {/* Row 2: Beneficiário & Agência/Código Beneficiário */}
              <div className="grid grid-cols-12 divide-x divide-black">
                <div className="col-span-8 p-1.5">
                  <div className="text-[9px] uppercase font-bold text-gray-700">Beneficiário</div>
                  <div className="font-bold text-black uppercase">
                    {boletoData.beneficiario}
                  </div>
                  <div className="text-[10px] text-gray-700">
                    CNPJ/CPF: {boletoData.beneficiarioDoc} • {boletoData.beneficiarioEndereco}
                  </div>
                </div>
                <div className="col-span-4 p-1.5">
                  <div className="text-[9px] uppercase font-bold text-gray-700">Agência / Código Beneficiário</div>
                  <div className="font-semibold text-black">
                    {boletoData.agenciaCodigo}
                  </div>
                </div>
              </div>

              {/* Row 3: Data Doc, Nº Doc, Espécie Doc, Aceite, Data Proc, Nosso Número */}
              <div className="grid grid-cols-12 divide-x divide-black">
                <div className="col-span-2 p-1.5">
                  <div className="text-[9px] uppercase font-bold text-gray-700">Data Doc.</div>
                  <div className="font-medium text-black">{boletoData.dataDocumento}</div>
                </div>
                <div className="col-span-3 p-1.5">
                  <div className="text-[9px] uppercase font-bold text-gray-700">Nº do Documento</div>
                  <div className="font-medium text-black">{boletoData.documentoNumero}</div>
                </div>
                <div className="col-span-2 p-1.5">
                  <div className="text-[9px] uppercase font-bold text-gray-700">Espécie Doc.</div>
                  <div className="font-medium text-black">DS - Serviços</div>
                </div>
                <div className="col-span-1 p-1.5">
                  <div className="text-[9px] uppercase font-bold text-gray-700">Aceite</div>
                  <div className="font-medium text-black">N</div>
                </div>
                <div className="col-span-4 p-1.5 bg-gray-50">
                  <div className="text-[9px] uppercase font-bold text-gray-700">Nosso Número</div>
                  <div className="font-bold text-black font-mono">{boletoData.nossoNumero}</div>
                </div>
              </div>

              {/* Row 4: Uso do Banco, Carteira, Espécie, Quantidade, Valor, Valor Documento */}
              <div className="grid grid-cols-12 divide-x divide-black">
                <div className="col-span-2 p-1.5">
                  <div className="text-[9px] uppercase font-bold text-gray-700">Uso do Banco</div>
                  <div className="font-medium text-black">000</div>
                </div>
                <div className="col-span-2 p-1.5">
                  <div className="text-[9px] uppercase font-bold text-gray-700">Carteira</div>
                  <div className="font-medium text-black">{boletoData.carteira || currentBank.walletDefault || '109'}</div>
                </div>
                <div className="col-span-2 p-1.5">
                  <div className="text-[9px] uppercase font-bold text-gray-700">Espécie</div>
                  <div className="font-medium text-black">R$</div>
                </div>
                <div className="col-span-2 p-1.5">
                  <div className="text-[9px] uppercase font-bold text-gray-700">Quantidade</div>
                  <div className="font-medium text-black">-</div>
                </div>
                <div className="col-span-4 p-1.5 bg-gray-100">
                  <div className="text-[9px] uppercase font-bold text-gray-700">(=) Valor do Documento</div>
                  <div className="font-bold text-base text-black">
                    {formatCurrency(installment.amount)}
                  </div>
                </div>
              </div>

              {/* Row 5: Instruções e Demonstrativo + Campos de Dedução/Acréscimos */}
              <div className="grid grid-cols-12 divide-x divide-black">
                <div className="col-span-8 p-2.5 space-y-2">
                  <div className="text-[9px] uppercase font-bold text-gray-700">
                    Instruções (Texto de Responsabilidade do Beneficiário)
                  </div>
                  <p className="text-[10px] leading-relaxed text-black font-medium">
                    {customInstructions}
                  </p>
                  <p className="text-[10px] leading-relaxed text-gray-800">
                    • Projeto: <strong>{installment.projectTitle}</strong>
                    <br />• Descrição: <strong>{customNotes || installment.description}</strong> (Parcela {installment.installmentNumber} de {installment.totalInstallments})
                  </p>
                </div>

                <div className="col-span-4 divide-y divide-black">
                  <div className="p-1.5">
                    <div className="text-[9px] uppercase text-gray-600">(-) Descontos / Abatimentos</div>
                    <div className="text-right text-xs text-black">-</div>
                  </div>
                  <div className="p-1.5">
                    <div className="text-[9px] uppercase text-gray-600">(+) Juros / Multa</div>
                    <div className="text-right text-xs text-black">-</div>
                  </div>
                  <div className="p-1.5 bg-gray-100">
                    <div className="text-[9px] uppercase font-bold text-gray-700">(=) Valor Cobrado</div>
                    <div className="text-right font-bold text-xs text-black">
                      {formatCurrency(installment.amount)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 6: Pagador (Sacado) */}
              <div className="p-2.5 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="text-[9px] uppercase font-bold text-gray-700">Pagador (Sacado)</div>
                  <div className="text-[9px] text-gray-600">
                    CPF/CNPJ:{' '}
                    <span className="font-semibold text-black">
                      {clientDocument || installment.clientDocument || 'Não informado'}
                    </span>
                  </div>
                </div>

                <div className="font-bold text-black uppercase text-xs">
                  {installment.clientName}
                </div>

                <div className="text-[10px] text-gray-700 flex flex-wrap items-center gap-4">
                  {installment.clientPhone && <span>Tel / WhatsApp: {installment.clientPhone}</span>}
                  <span>Referência: Projeto {installment.projectTitle}</span>
                </div>
              </div>
            </div>

            {/* Bottom Section: Barcode & Pix Boleto Híbrido */}
            <div className="mt-4 pt-3 border-t-2 border-dashed border-gray-400 flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Barcode Graphic */}
              <div className="flex-1 w-full flex flex-col items-start">
                <div className="flex items-end h-16 w-full max-w-md bg-white overflow-hidden py-1">
                  {barcodePattern.map((width, idx) => (
                    <div
                      key={idx}
                      className="bg-black h-full"
                      style={{
                        width: `${width * 2}px`,
                        marginRight: `${(idx % 3 === 0 ? 2 : 1.2)}px`,
                      }}
                    />
                  ))}
                </div>
                <div className="font-mono text-[10px] tracking-widest text-gray-600 mt-1">
                  {boletoData.barcodeRaw}
                </div>
              </div>

              {/* Optional BolePix Side QR Code */}
              {showPixQr && (
                <div className="flex items-center gap-3 p-2.5 bg-gray-50 border border-gray-300 rounded-lg shrink-0">
                  <div className="w-16 h-16 bg-white border border-gray-300 p-1 flex items-center justify-center shrink-0">
                    <QrCode className="w-14 h-14 text-black" />
                  </div>
                  <div className="text-left">
                    <div className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded inline-block">
                      BolePix Instantâneo
                    </div>
                    <div className="text-[10px] text-gray-600 mt-1 max-w-[150px] truncate">
                      Chave: {architectProfile?.pixKey || 'Chave Pix'}
                    </div>
                    <button
                      onClick={handleCopyPix}
                      className="text-[10px] text-blue-700 font-bold hover:underline mt-0.5 cursor-pointer block"
                    >
                      {copiedPix ? 'Copiado!' : 'Copiar Chave Pix'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Cut line */}
            <div className="mt-4 pt-2 border-t border-dotted border-gray-400 flex items-center justify-between text-[9px] text-gray-500 italic">
              <span>Corte nesta linha para separar a ficha de compensação</span>
              <span>Autenticação Mecânica / Ficha de Compensação</span>
            </div>
          </div>

          {/* Quick Edit Details Box */}
          <div className="p-4 rounded-xl bg-[#14110f] border border-[#3d342f] space-y-3">
            <h4 className="text-xs font-bold text-[#fcf8f5] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#c58a4b]" />
              Personalizar Dados do Boleto
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-[#a89c93] block mb-1">
                  CPF ou CNPJ do Cliente (Pagador)
                </label>
                <input
                  type="text"
                  value={clientDocument}
                  onChange={(e) => setClientDocument(e.target.value)}
                  placeholder="000.000.000-00 ou 00.000.000/0001-00"
                  className="w-full bg-[#1e1916] border border-[#3d342f] rounded-xl px-3 py-2 text-xs text-[#fcf8f5] focus:outline-none focus:border-[#c58a4b]"
                />
              </div>

              <div>
                <label className="text-[11px] text-[#a89c93] block mb-1">
                  Telefone / WhatsApp do Cliente
                </label>
                <input
                  type="text"
                  defaultValue={installment.clientPhone || ''}
                  disabled
                  className="w-full bg-[#1e1916]/60 border border-[#3d342f] rounded-xl px-3 py-2 text-xs text-[#a89c93]"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] text-[#a89c93] block mb-1">
                Instruções de Cobrança / Multa e Juros
              </label>
              <textarea
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                rows={2}
                className="w-full bg-[#1e1916] border border-[#3d342f] rounded-xl p-2.5 text-xs text-[#fcf8f5] focus:outline-none focus:border-[#c58a4b]"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#14110f] border-t border-[#3d342f] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-[#a89c93]">
            <Calendar className="w-4 h-4 text-[#c58a4b]" />
            <span>
              Vencimento: <strong className="text-[#fcf8f5]">{formatDate(installment.dueDate)}</strong> • Valor:{' '}
              <strong className="text-emerald-400 font-bold">{formatCurrency(installment.amount)}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#a89c93] hover:text-[#fcf8f5] hover:bg-[#241e1b] transition-colors cursor-pointer"
            >
              Fechar
            </button>

            <button
              onClick={handleSaveToInstallment}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#241e1b] hover:bg-[#2d2520] text-[#c58a4b] border border-[#3d342f] transition-colors cursor-pointer"
            >
              Salvar Dados na Parcela
            </button>

            <button
              onClick={handleSendWhatsApp}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 shadow-lg transition-all cursor-pointer active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Enviar para o Cliente</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal to manage bank accounts, agency and account number directly from boleto view */}
      <BankAccountsModal
        isOpen={isManageAccountsOpen}
        onClose={() => {
          setIsManageAccountsOpen(false);
          setEditingAccountId(null);
        }}
        initialEditingAccountId={editingAccountId}
      />
    </div>
  );
};
