import React, { useState } from 'react';
import {
  AlertCircle,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  DollarSign,
  Download,
  ExternalLink,
  FileCheck,
  FileSignature,
  FileText,
  Mail,
  MessageCircle,
  PenTool,
  Phone,
  Printer,
  QrCode,
  Send,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { ContractStatus, DigitalSignature, WorkContract } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { DigitalSignatureModal } from './DigitalSignatureModal';

interface WorkContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: WorkContract | null;
  onSelectAnotherContract?: (contract: WorkContract) => void;
  onDelete?: () => void;
}

export const WorkContractModal: React.FC<WorkContractModalProps> = ({
  isOpen,
  onClose,
  contract,
  onDelete,
}) => {
  const {
    architectProfile,
    bankAccounts,
    sendContractForSignature,
    signWorkContract,
    markContractAwaitingPayment,
    confirmContractPayment,
    updateWorkContract,
    deleteWorkContract,
  } = useFinance();

  const [activeTab, setActiveTab] = useState<'view' | 'edit' | 'share'>('view');
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState(
    bankAccounts[0]?.id || ''
  );
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);
  const [paymentAmountToConfirm, setPaymentAmountToConfirm] = useState<number>(0);

  // Editable fields
  const [editTitle, setEditTitle] = useState(contract?.title || '');
  const [editScope, setEditScope] = useState(contract?.serviceScope || '');
  const [editTotal, setEditTotal] = useState(contract?.totalAmount || 0);
  const [editDownPayment, setEditDownPayment] = useState(contract?.downPaymentAmount || 0);
  const [editTerms, setEditTerms] = useState(contract?.paymentTerms || '');
  const [editPixKey, setEditPixKey] = useState(contract?.pixKey || architectProfile.pixKey || '');
  const [editDeadline, setEditDeadline] = useState(contract?.deadline || '');

  React.useEffect(() => {
    if (contract) {
      setEditTitle(contract.title || '');
      setEditScope(contract.serviceScope || '');
      setEditTotal(contract.totalAmount || 0);
      setEditDownPayment(contract.downPaymentAmount || contract.totalAmount * 0.5);
      setEditTerms(contract.paymentTerms || '');
      setEditPixKey(contract.pixKey || architectProfile.pixKey || '');
      setEditDeadline(contract.deadline || '');
      setPaymentAmountToConfirm(contract.downPaymentAmount || contract.totalAmount);
    }
  }, [contract, architectProfile]);

  if (!isOpen || !contract) return null;

  const getStatusBadge = (status: ContractStatus) => {
    switch (status) {
      case 'draft':
        return {
          label: 'Minuta / Em Elaboração',
          color: 'bg-zinc-800 text-zinc-300 border-zinc-700',
          icon: FileText,
        };
      case 'sent_for_signature':
        return {
          label: 'Enviado para Assinatura',
          color: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          icon: Send,
        };
      case 'signed':
        return {
          label: 'Contrato Assinado',
          color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          icon: FileCheck,
        };
      case 'awaiting_payment':
        return {
          label: 'Aguardando Pagamento do Cliente',
          color: 'bg-purple-500/20 text-purple-300 border-purple-500/40 animate-pulse',
          icon: Clock,
        };
      case 'paid':
        return {
          label: 'Pago & Em Execução',
          color: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
          icon: CheckCircle2,
        };
      case 'completed':
        return {
          label: 'Concluído',
          color: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
          icon: Check,
        };
      case 'cancelled':
        return {
          label: 'Cancelado',
          color: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
          icon: X,
        };
      default:
        return {
          label: status,
          color: 'bg-zinc-800 text-zinc-300 border-zinc-700',
          icon: FileText,
        };
    }
  };

  const statusInfo = getStatusBadge(contract.status);
  const StatusIcon = statusInfo.icon;

  // WhatsApp sharing message
  const generateWhatsAppMessage = () => {
    const profName = architectProfile?.name || 'Laíne Paula';
    const clientFirstName = contract.clientName.split(' ')[0];
    const formattedValue = formatCurrency(contract.totalAmount);
    const formattedDownPayment = formatCurrency(contract.downPaymentAmount || contract.totalAmount * 0.5);
    const pix = contract.pixKey || architectProfile.pixKey || 'contato@lainepaula.arq.br';

    if (contract.status === 'awaiting_payment') {
      return `Olá ${clientFirstName}! Tudo bem? Aqui é ${profName} 📐✨\n\n` +
        `Recebemos com sucesso a assinatura do seu contrato para o projeto "${contract.projectTitle}".\n\n` +
        `⏳ Para darmos início oficial às etapas de execução, segue a chave PIX para pagamento da entrada no valor de ${formattedDownPayment}:\n\n` +
        `💳 Chave PIX: ${pix}\n` +
        `Favorecido: ${profName}\n\n` +
        `Assim que realizar o pagamento, por gentileza nos envie o comprovante por aqui. Muito obrigado(a)!`;
    }

    if (contract.status === 'signed') {
      return `Olá ${clientFirstName}! Tudo bem? Aqui é ${profName} 📐✨\n\n` +
        `Confirmamos a assinatura digital do seu Contrato de Prestação de Serviços para o projeto "${contract.projectTitle}".\n\n` +
        `O documento foi devidamente autenticado com carimbo digital e código de verificação.\n\n` +
        `Estamos muito felizes em iniciar este trabalho com você!`;
    }

    return `Olá ${clientFirstName}! Tudo bem? Aqui é ${profName} 📐✨\n\n` +
      `Estou enviando o Contrato de Prestação de Serviços referente ao projeto "${contract.projectTitle}".\n\n` +
      `📋 Resumo do Contrato:\n` +
      `• Serviço: ${contract.title}\n` +
      `• Valor Total: ${formattedValue}\n` +
      `• Condições: ${contract.paymentTerms}\n` +
      `• Prazo Estimado: ${contract.deadline ? formatDate(contract.deadline) : 'A combinar'}\n\n` +
      `Por favor, revise os termos e realize a assinatura digital para que possamos iniciar o cronograma. Qualquer dúvida, estou à total disposição!`;
  };

  const handleSendViaWhatsApp = () => {
    sendContractForSignature(contract.id);
    const rawPhone = (contract.clientPhone || '').replace(/\D/g, '');
    const fullPhone = rawPhone.length <= 11 ? `55${rawPhone}` : rawPhone;
    const msg = encodeURIComponent(generateWhatsAppMessage());
    window.open(`https://wa.me/${fullPhone}?text=${msg}`, '_blank');
  };

  const handleCopyShareLink = () => {
    const textToCopy = `CONTRATO DE TRABALHO - ${contract.projectTitle}\nCliente: ${contract.clientName}\nValor: ${formatCurrency(contract.totalAmount)}\nCondições: ${contract.paymentTerms}\nStatus: ${statusInfo.label}\n\n${generateWhatsAppMessage()}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyPix = () => {
    const pix = contract.pixKey || architectProfile.pixKey || 'contato@lainepaula.arq.br';
    navigator.clipboard.writeText(pix);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2500);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    updateWorkContract(contract.id, {
      title: editTitle,
      serviceScope: editScope,
      totalAmount: Number(editTotal),
      downPaymentAmount: Number(editDownPayment),
      paymentTerms: editTerms,
      pixKey: editPixKey,
      deadline: editDeadline,
    });
    setActiveTab('view');
  };

  const handleConfirmPaymentSubmit = () => {
    confirmContractPayment(contract.id, selectedBankAccountId);
    setIsConfirmingPayment(false);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#1a1614] border border-[#3d342f] rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#3d342f] bg-[#14110f]/90 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm"
              style={{
                backgroundColor: 'var(--theme-badge-bg)',
                color: 'var(--theme-badge-text)',
                border: '1px solid var(--theme-badge-border)',
              }}
            >
              <FileSignature className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif font-bold text-lg text-[#fcf8f5]">
                  {contract.title}
                </h2>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusInfo.color}`}
                >
                  <StatusIcon className="w-3.5 h-3.5" />
                  <span>{statusInfo.label}</span>
                </span>
              </div>
              <p className="text-xs text-[#a89c93]">
                Cliente: <strong className="text-[#fcf8f5]">{contract.clientName}</strong> • Projeto:{' '}
                <strong className="text-[#fcf8f5]">{contract.projectTitle}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              title="Imprimir Contrato"
              className="p-2 rounded-xl border border-[#3d342f] text-[#a89c93] hover:text-[#fcf8f5] hover:bg-[#241e1b] transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsConfirmingDelete(true)}
              title="Excluir Contrato"
              className="p-2 rounded-xl border border-rose-900/40 bg-rose-950/20 text-rose-400 hover:text-rose-200 hover:bg-rose-900/40 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl border border-[#3d342f] text-[#a89c93] hover:text-[#fcf8f5] hover:bg-[#241e1b] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Workflow Action Header Strip */}
        <div className="bg-[#12100e] border-b border-[#2b2420] px-6 py-3 shrink-0 flex flex-wrap items-center justify-between gap-3">
          {/* Status Pipeline Step Indicators */}
          <div className="flex items-center gap-1.5 text-xs">
            <span
              className={`px-2 py-1 rounded-lg border font-medium ${
                contract.status === 'draft'
                  ? 'bg-[var(--theme-badge-bg)] text-[var(--theme-badge-text)] border-[var(--theme-primary)] font-bold'
                  : 'bg-[#1a1614] text-[#a89c93] border-[#3d342f]'
              }`}
            >
              1. Minuta
            </span>
            <span className="text-[#6b5d54]">→</span>
            <span
              className={`px-2 py-1 rounded-lg border font-medium ${
                contract.status === 'sent_for_signature'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                  : contract.sentAt
                  ? 'bg-zinc-800/80 text-emerald-400 border-zinc-700'
                  : 'bg-[#1a1614] text-[#a89c93] border-[#3d342f]'
              }`}
            >
              2. Enviado
            </span>
            <span className="text-[#6b5d54]">→</span>
            <span
              className={`px-2 py-1 rounded-lg border font-medium ${
                contract.status === 'signed'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                  : contract.signedAt
                  ? 'bg-zinc-800/80 text-emerald-400 border-zinc-700'
                  : 'bg-[#1a1614] text-[#a89c93] border-[#3d342f]'
              }`}
            >
              3. Contrato Assinado
            </span>
            <span className="text-[#6b5d54]">→</span>
            <span
              className={`px-2 py-1 rounded-lg border font-medium ${
                contract.status === 'awaiting_payment'
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 font-bold animate-pulse'
                  : 'bg-[#1a1614] text-[#a89c93] border-[#3d342f]'
              }`}
            >
              4. Aguardando Pagamento
            </span>
            <span className="text-[#6b5d54]">→</span>
            <span
              className={`px-2 py-1 rounded-lg border font-medium ${
                contract.status === 'paid'
                  ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 font-bold'
                  : 'bg-[#1a1614] text-[#a89c93] border-[#3d342f]'
              }`}
            >
              5. Pago & Execução
            </span>
          </div>

          {/* Quick Tabs */}
          <div className="flex items-center gap-1 bg-[#1a1614] p-1 rounded-xl border border-[#3d342f]">
            <button
              onClick={() => setActiveTab('view')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'view'
                  ? 'bg-[var(--theme-badge-bg)] text-[var(--theme-badge-text)] shadow-sm'
                  : 'text-[#a89c93] hover:text-[#fcf8f5]'
              }`}
            >
              Visualizar Contrato
            </button>
            <button
              onClick={() => setActiveTab('share')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'share'
                  ? 'bg-[var(--theme-badge-bg)] text-[var(--theme-badge-text)] shadow-sm'
                  : 'text-[#a89c93] hover:text-[#fcf8f5]'
              }`}
            >
              Enviar & Assinatura
            </button>
            <button
              onClick={() => setActiveTab('edit')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'edit'
                  ? 'bg-[var(--theme-badge-bg)] text-[var(--theme-badge-text)] shadow-sm'
                  : 'text-[#a89c93] hover:text-[#fcf8f5]'
              }`}
            >
              Editar Cláusulas
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-[#14110f]/60">
          {/* TAB 1: VIEW FORMAL CONTRACT */}
          {activeTab === 'view' && (
            <div className="space-y-6">
              {/* Highlight Notification Banner per Status */}
              {contract.status === 'awaiting_payment' && (
                <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 shrink-0">
                      <Clock className="w-5 h-5 animate-spin" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-purple-200 font-serif">
                        Aguardando Pagamento do Cliente
                      </h4>
                      <p className="text-xs text-purple-300/80">
                        O contrato já foi assinado. Aguardando a confirmação do pagamento de{' '}
                        <strong className="text-purple-200">
                          {formatCurrency(contract.downPaymentAmount || contract.totalAmount)}
                        </strong>.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handleCopyPix}
                      className="px-3 py-1.5 rounded-xl bg-purple-900/50 border border-purple-500/40 text-xs font-bold text-purple-200 hover:bg-purple-800/50 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedPix ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedPix ? 'Pix Copiado!' : 'Copiar Chave Pix'}</span>
                    </button>
                    <button
                      onClick={() => setIsConfirmingPayment(true)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirmar Pagamento</span>
                    </button>
                  </div>
                </div>
              )}

              {contract.status === 'signed' && (
                <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300 shrink-0">
                      <FileCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-emerald-200 font-serif flex items-center gap-2">
                        <span>Contrato Assinado com Sucesso!</span>
                        <span className="text-[10px] bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 rounded-full font-mono">
                          {contract.clientSignature?.verificationCode || 'VALIDADO'}
                        </span>
                      </h4>
                      <p className="text-xs text-emerald-300/80">
                        Assinado por <strong>{contract.clientSignature?.signerName || contract.clientName}</strong> em{' '}
                        {contract.signedAt ? formatDate(contract.signedAt) : 'Data recente'}.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => markContractAwaitingPayment(contract.id)}
                    className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-md shrink-0"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Avançar para Aguardando Pagamento</span>
                  </button>
                </div>
              )}

              {/* The Formal Document Container */}
              <div className="bg-[#181412] border border-[#3d342f] rounded-2xl p-6 sm:p-8 space-y-6 text-[#ded2c9] text-xs leading-relaxed shadow-xl font-sans relative">
                {/* Formal Seal Watermark in Top Right */}
                <div className="absolute top-6 right-6 text-right">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-[11px] font-bold border uppercase tracking-wider ${statusInfo.color}`}
                  >
                    {statusInfo.label}
                  </span>
                </div>

                {/* Contract Header */}
                <div className="border-b border-[#3d342f] pb-5">
                  <h3 className="font-serif font-bold text-base text-[#fcf8f5] uppercase tracking-wide">
                    INSTRUMENTO PARTICULAR DE CONTRATO DE PRESTAÇÃO DE SERVIÇOS
                  </h3>
                  <p className="text-[11px] text-[#a89c93] mt-1">
                    Regido pela legislação civil brasileira aplicável e pelas condições abaixo avençadas.
                  </p>
                </div>

                {/* Partes Contratantes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#14110f] p-4 rounded-xl border border-[#2b2420]">
                  <div>
                    <h5 className="font-serif font-bold text-[#fcf8f5] text-xs mb-1 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-[var(--theme-primary)]" />
                      <span>CONTRATADO(A) (PROFISSIONAL):</span>
                    </h5>
                    <p className="font-medium text-[#fcf8f5]">{architectProfile.name}</p>
                    <p className="text-[#a89c93]">{architectProfile.title}</p>
                    <p className="text-[#a89c93]">{architectProfile.specialty}</p>
                    <p className="text-[#a89c93]">Local: {architectProfile.location}</p>
                    {architectProfile.pixKey && (
                      <p className="text-[var(--theme-primary)] mt-1 font-mono text-[11px]">
                        Chave PIX: {architectProfile.pixKey}
                      </p>
                    )}
                  </div>

                  <div>
                    <h5 className="font-serif font-bold text-[#fcf8f5] text-xs mb-1 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[var(--theme-primary)]" />
                      <span>CONTRATANTE (CLIENTE):</span>
                    </h5>
                    <p className="font-medium text-[#fcf8f5]">{contract.clientName}</p>
                    {contract.clientDocument && (
                      <p className="text-[#a89c93]">CPF/CNPJ: {contract.clientDocument}</p>
                    )}
                    {contract.clientPhone && (
                      <p className="text-[#a89c93]">Telefone/WhatsApp: {contract.clientPhone}</p>
                    )}
                    {contract.clientEmail && (
                      <p className="text-[#a89c93]">Email: {contract.clientEmail}</p>
                    )}
                    {contract.clientAddress && (
                      <p className="text-[#a89c93]">Endereço: {contract.clientAddress}</p>
                    )}
                  </div>
                </div>

                {/* Cláusula 1: Objeto do Contrato */}
                <div className="space-y-1.5">
                  <h4 className="font-serif font-bold text-[#fcf8f5] text-xs uppercase tracking-wider text-[var(--theme-primary)]">
                    CLÁUSULA 1ª — DO OBJETO E ESCOPO DOS SERVIÇOS
                  </h4>
                  <p>
                    O presente contrato tem por objeto a prestação de serviços profissionais referente ao projeto intitulado{' '}
                    <strong className="text-[#fcf8f5]">"{contract.projectTitle}"</strong>, compreendendo o seguinte escopo detalhado:
                  </p>
                  <div className="p-3.5 bg-[#14110f] rounded-xl border border-[#2b2420] text-[#ded2c9] italic">
                    {contract.serviceScope || 'Desenvolvimento completo dos projetos contratados conforme especificações acordadas.'}
                  </div>
                </div>

                {/* Cláusula 2: Honorários e Condições Financeiras */}
                <div className="space-y-1.5">
                  <h4 className="font-serif font-bold text-[#fcf8f5] text-xs uppercase tracking-wider text-[var(--theme-primary)]">
                    CLÁUSULA 2ª — DOS HONORÁRIOS E FORMA DE PAGAMENTO
                  </h4>
                  <p>
                    Pelos serviços prestados, o CONTRATANTE pagará ao CONTRATADO o valor total de{' '}
                    <strong className="text-emerald-400 font-serif text-sm">
                      {formatCurrency(contract.totalAmount)}
                    </strong>
                    , estipulado nas seguintes condições:
                  </p>
                  <div className="p-3.5 bg-[#14110f] rounded-xl border border-[#2b2420] space-y-2">
                    <p className="text-[#fcf8f5] font-medium">
                      • Condição de Pagamento: <span className="text-[#ded2c9] font-normal">{contract.paymentTerms}</span>
                    </p>
                    {contract.downPaymentAmount ? (
                      <p className="text-[#fcf8f5] font-medium">
                        • Valor do Sinal / Entrada: <span className="text-emerald-400 font-bold">{formatCurrency(contract.downPaymentAmount)}</span>
                      </p>
                    ) : null}
                    <div className="pt-2 border-t border-[#2b2420] flex items-center justify-between">
                      <span className="text-[#a89c93]">
                        💳 Chave PIX Oficial para Transferências: <strong className="text-[#fcf8f5]">{contract.pixKey || architectProfile.pixKey || 'pix@empresa.com.br'}</strong>
                      </span>
                      <button
                        onClick={handleCopyPix}
                        className="px-2.5 py-1 rounded-lg bg-[#241e1b] hover:bg-[#2e2622] text-[#fcf8f5] text-[11px] font-bold border border-[#3d342f] flex items-center gap-1 cursor-pointer"
                      >
                        {copiedPix ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedPix ? 'Copiado' : 'Copiar Chave'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Cláusula 3: Prazos e Entregas */}
                <div className="space-y-1.5">
                  <h4 className="font-serif font-bold text-[#fcf8f5] text-xs uppercase tracking-wider text-[var(--theme-primary)]">
                    CLÁUSULA 3ª — DOS PRAZOS E CRONOGRAMA
                  </h4>
                  <p>
                    Os trabalhos terão início oficial após a confirmação da assinatura deste instrumento e do pagamento da entrada/sinal acordado. O prazo estimado para a entrega final é{' '}
                    <strong className="text-[#fcf8f5]">
                      {contract.deadline ? formatDate(contract.deadline) : 'conforme cronograma de etapas acordado entre as partes'}
                    </strong>
                    .
                  </p>
                </div>

                {/* Cláusula 4: Assinatura Digital e Validade Jurídica */}
                <div className="space-y-1.5">
                  <h4 className="font-serif font-bold text-[#fcf8f5] text-xs uppercase tracking-wider text-[var(--theme-primary)]">
                    CLÁUSULA 4ª — DA ASSINATURA ELETRÔNICA E VALIDADE
                  </h4>
                  <p>
                    As partes reconhecem a validade jurídica de qualquer manifestação de vontade, aceite ou assinatura colhida de forma eletrônica neste ambiente, conferindo plena eficácia jurídica aos termos deste contrato nos moldes da MP 2.200-2/2001 e Lei nº 14.063/2020.
                  </p>
                </div>

                {/* Digital Signature Audit Box */}
                <div className="pt-6 border-t border-[#3d342f] grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Professional Side */}
                  <div className="p-4 bg-[#14110f] rounded-xl border border-[#2b2420] text-center space-y-1">
                    <span className="text-[10px] text-[#a89c93] block uppercase tracking-wider">
                      CONTRATADO(A)
                    </span>
                    <p className="font-serif italic text-base text-[var(--theme-primary)]">
                      {architectProfile.name}
                    </p>
                    <p className="text-[11px] text-[#ded2c9] font-medium">{architectProfile.name}</p>
                    <span className="text-[10px] text-emerald-400 flex items-center justify-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Assinado pelo Emissor
                    </span>
                  </div>

                  {/* Client Side Signature */}
                  <div className="p-4 bg-[#14110f] rounded-xl border border-[#2b2420] text-center space-y-1">
                    <span className="text-[10px] text-[#a89c93] block uppercase tracking-wider">
                      CONTRATANTE / CLIENTE
                    </span>
                    {contract.clientSignature ? (
                      <div className="space-y-1">
                        {contract.clientSignature.signatureDataUrl ? (
                          <img
                            src={contract.clientSignature.signatureDataUrl}
                            alt="Assinatura do Cliente"
                            className="h-12 mx-auto object-contain filter invert opacity-90"
                          />
                        ) : (
                          <p className="font-serif italic text-lg text-emerald-400">
                            {contract.clientSignature.signerName}
                          </p>
                        )}
                        <p className="text-[11px] text-[#ded2c9] font-medium">
                          {contract.clientSignature.signerName}
                        </p>
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] text-emerald-300 font-mono">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{contract.clientSignature.verificationCode}</span>
                        </div>
                        <p className="text-[10px] text-[#a89c93]">
                          Assinado em {formatDate(contract.clientSignature.signedAt)}
                        </p>
                      </div>
                    ) : (
                      <div className="py-2 space-y-2">
                        <p className="text-xs text-amber-400 font-medium">
                          {contract.status === 'sent_for_signature'
                            ? '📤 Enviado - Aguardando Assinatura do Cliente'
                            : 'Pendente de Assinatura'}
                        </p>
                        <button
                          onClick={() => setIsSignModalOpen(true)}
                          className="px-3 py-1.5 rounded-xl bg-[var(--theme-badge-bg)] text-[var(--theme-badge-text)] border border-[var(--theme-badge-border)] text-xs font-bold hover:brightness-110 transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
                        >
                          <PenTool className="w-3.5 h-3.5" />
                          <span>Assinar Agora (Cliente)</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ENVIAR & ASSINATURA */}
          {activeTab === 'share' && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <div className="p-5 bg-[#181412] border border-[#3d342f] rounded-2xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-base text-[#fcf8f5]">
                      Enviar Contrato para o Cliente Assinar
                    </h3>
                    <p className="text-xs text-[#a89c93]">
                      Envie uma mensagem profissional com os dados do contrato e instruções de assinatura.
                    </p>
                  </div>
                </div>

                {/* Pre-built message preview */}
                <div>
                  <label className="block text-xs font-medium text-[#a89c93] mb-1.5">
                    Mensagem Formatada para WhatsApp / Email:
                  </label>
                  <div className="p-3.5 bg-[#14110f] border border-[#2b2420] rounded-xl text-xs text-[#fcf8f5] whitespace-pre-wrap font-sans leading-relaxed">
                    {generateWhatsAppMessage()}
                  </div>
                </div>

                {/* Share Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={handleSendViaWhatsApp}
                    className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-all"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Enviar no WhatsApp com 1 Clique</span>
                  </button>

                  <button
                    onClick={handleCopyShareLink}
                    className="py-3 px-4 rounded-xl bg-[#241e1b] hover:bg-[#2d2621] text-[#fcf8f5] font-bold text-xs border border-[#3d342f] flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedLink ? 'Texto Copiado!' : 'Copiar Texto da Proposta'}</span>
                  </button>
                </div>
              </div>

              {/* Status Update Quick Triggers */}
              <div className="p-5 bg-[#181412] border border-[#3d342f] rounded-2xl space-y-4">
                <h4 className="font-serif font-bold text-sm text-[#fcf8f5]">
                  Controle Manual do Status do Contrato
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    onClick={() => sendContractForSignature(contract.id)}
                    className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 cursor-pointer transition-all ${
                      contract.status === 'sent_for_signature'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                        : 'bg-[#14110f] text-[#a89c93] border-[#2b2420] hover:text-[#fcf8f5]'
                    }`}
                  >
                    <Send className="w-4 h-4" />
                    <span>Marcar como Enviado</span>
                  </button>

                  <button
                    onClick={() => setIsSignModalOpen(true)}
                    className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 cursor-pointer transition-all ${
                      contract.status === 'signed'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                        : 'bg-[#14110f] text-[#a89c93] border-[#2b2420] hover:text-[#fcf8f5]'
                    }`}
                  >
                    <PenTool className="w-4 h-4" />
                    <span>{contract.status === 'signed' ? 'Contrato Assinado ✓' : 'Assinar Digitalmente'}</span>
                  </button>

                  <button
                    onClick={() => markContractAwaitingPayment(contract.id)}
                    className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 cursor-pointer transition-all ${
                      contract.status === 'awaiting_payment'
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm'
                        : 'bg-[#14110f] text-[#a89c93] border-[#2b2420] hover:text-[#fcf8f5]'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span>Aguardando Pagamento</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: EDIT CONTRACT */}
          {activeTab === 'edit' && (
            <form onSubmit={handleSaveEdit} className="space-y-4 max-w-2xl mx-auto">
              <div className="p-5 bg-[#181412] border border-[#3d342f] rounded-2xl space-y-4">
                <h3 className="font-serif font-bold text-base text-[#fcf8f5]">
                  Personalizar Dados do Contrato
                </h3>

                <div>
                  <label className="block text-xs font-medium text-[#a89c93] mb-1">
                    Título do Contrato / Documento
                  </label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-[#14110f] border border-[#3d342f] rounded-xl px-3 py-2 text-xs text-[#fcf8f5] focus:outline-none focus:border-[var(--theme-primary)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#a89c93] mb-1">
                    Escopo Detalhado dos Serviços
                  </label>
                  <textarea
                    rows={4}
                    value={editScope}
                    onChange={(e) => setEditScope(e.target.value)}
                    className="w-full bg-[#14110f] border border-[#3d342f] rounded-xl px-3 py-2 text-xs text-[#fcf8f5] focus:outline-none focus:border-[var(--theme-primary)] resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#a89c93] mb-1">
                      Valor Total dos Honorários (R$)
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      step="any"
                      value={editTotal}
                      onChange={(e) => setEditTotal(Number(e.target.value))}
                      className="w-full bg-[#14110f] border border-[#3d342f] rounded-xl px-3 py-2 text-xs text-[#fcf8f5] focus:outline-none focus:border-[var(--theme-primary)]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#a89c93] mb-1">
                      Valor do Sinal / Entrada (R$)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={editDownPayment}
                      onChange={(e) => setEditDownPayment(Number(e.target.value))}
                      className="w-full bg-[#14110f] border border-[#3d342f] rounded-xl px-3 py-2 text-xs text-[#fcf8f5] focus:outline-none focus:border-[var(--theme-primary)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#a89c93] mb-1">
                    Condições de Pagamento
                  </label>
                  <input
                    type="text"
                    value={editTerms}
                    onChange={(e) => setEditTerms(e.target.value)}
                    placeholder="Ex: 50% de entrada + 50% na entrega"
                    className="w-full bg-[#14110f] border border-[#3d342f] rounded-xl px-3 py-2 text-xs text-[#fcf8f5] focus:outline-none focus:border-[var(--theme-primary)]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#a89c93] mb-1">
                      Chave PIX para Depósito
                    </label>
                    <input
                      type="text"
                      value={editPixKey}
                      onChange={(e) => setEditPixKey(e.target.value)}
                      placeholder="Chave Pix"
                      className="w-full bg-[#14110f] border border-[#3d342f] rounded-xl px-3 py-2 text-xs text-[#fcf8f5] focus:outline-none focus:border-[var(--theme-primary)]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#a89c93] mb-1">
                      Data Limite Estimada (Prazo)
                    </label>
                    <input
                      type="date"
                      value={editDeadline}
                      onChange={(e) => setEditDeadline(e.target.value)}
                      className="w-full bg-[#14110f] border border-[#3d342f] rounded-xl px-3 py-2 text-xs text-[#fcf8f5] focus:outline-none focus:border-[var(--theme-primary)]"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-[#2b2420]">
                  <button
                    type="button"
                    onClick={() => setActiveTab('view')}
                    className="px-4 py-2 rounded-xl border border-[#3d342f] text-xs text-[#a89c93] hover:text-[#fcf8f5] cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-bold text-[#12100e] cursor-pointer hover:brightness-110"
                    style={{ backgroundColor: 'var(--theme-primary)' }}
                  >
                    Salvar Alterações
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-[#3d342f] bg-[#14110f]/90 shrink-0 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-[#a89c93]">
            <span>Valor Total:</span>
            <strong className="text-emerald-400 font-serif text-sm">
              {formatCurrency(contract.totalAmount)}
            </strong>
          </div>

          <div className="flex items-center gap-2">
            {/* Primary Action Button based on status */}
            {contract.status === 'draft' && (
              <button
                onClick={handleSendViaWhatsApp}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Enviar para Cliente Assinar</span>
              </button>
            )}

            {contract.status === 'sent_for_signature' && (
              <>
                <button
                  onClick={handleSendViaWhatsApp}
                  className="px-3 py-2 rounded-xl bg-[#241e1b] hover:bg-[#2d2621] text-[#fcf8f5] text-xs font-bold border border-[#3d342f] flex items-center gap-1.5 cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Reenviar WhatsApp</span>
                </button>
                <button
                  onClick={() => setIsSignModalOpen(true)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#12100e] flex items-center gap-1.5 cursor-pointer shadow-md hover:brightness-110 transition-all"
                  style={{ backgroundColor: 'var(--theme-primary)' }}
                >
                  <PenTool className="w-3.5 h-3.5" />
                  <span>Assinar Contrato de Trabalho</span>
                </button>
              </>
            )}

            {contract.status === 'signed' && (
              <button
                onClick={() => markContractAwaitingPayment(contract.id)}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Marcar Aguardando Pagamento</span>
              </button>
            )}

            {contract.status === 'awaiting_payment' && (
              <button
                onClick={() => setIsConfirmingPayment(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirmar Pagamento Recebido</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#3d342f] text-xs text-[#a89c93] hover:text-[#fcf8f5] transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>

      {/* Digital Signature Modal */}
      {isSignModalOpen && (
        <DigitalSignatureModal
          isOpen={isSignModalOpen}
          onClose={() => setIsSignModalOpen(false)}
          contract={contract}
          onSign={(signature) => {
            signWorkContract(contract.id, signature);
          }}
        />
      )}

      {/* Payment Confirmation Drawer/Modal */}
      {isConfirmingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#1a1614] border border-[#3d342f] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#3d342f] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <h3 className="font-serif font-bold text-base text-[#fcf8f5]">
                  Confirmar Pagamento do Contrato
                </h3>
              </div>
              <button
                onClick={() => setIsConfirmingPayment(false)}
                className="text-[#a89c93] hover:text-[#fcf8f5] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#a89c93]">
              Ao confirmar, o status será atualizado para <strong className="text-teal-400">Pago & Em Execução</strong> e o valor será creditado no seu fluxo de caixa.
            </p>

            <div>
              <label className="block text-xs font-medium text-[#a89c93] mb-1">
                Valor Recebido (R$)
              </label>
              <input
                type="number"
                min={0}
                step="any"
                value={paymentAmountToConfirm}
                onChange={(e) => setPaymentAmountToConfirm(Number(e.target.value))}
                className="w-full bg-[#14110f] border border-[#3d342f] rounded-xl px-3 py-2 text-sm text-emerald-400 font-bold focus:outline-none focus:border-[var(--theme-primary)]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#a89c93] mb-1">
                Conta Bancária de Destino
              </label>
              <select
                value={selectedBankAccountId}
                onChange={(e) => setSelectedBankAccountId(e.target.value)}
                className="w-full bg-[#14110f] border border-[#3d342f] rounded-xl px-3 py-2 text-xs text-[#fcf8f5] focus:outline-none focus:border-[var(--theme-primary)]"
              >
                {bankAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({formatCurrency(acc.balance)})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#3d342f]">
              <button
                onClick={() => setIsConfirmingPayment(false)}
                className="px-4 py-2 rounded-xl border border-[#3d342f] text-xs text-[#a89c93] hover:text-[#fcf8f5] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmPaymentSubmit}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-md"
              >
                Confirmar & Dar Baixa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Contract Deletion */}
      {isConfirmingDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#1a1614] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-900/40 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-base text-[#fcf8f5]">Excluir Contrato</h3>
                <p className="text-xs text-[#a89c93]">Esta ação é irreversível.</p>
              </div>
            </div>

            <div className="bg-[#12100e] rounded-2xl p-4 border border-[#2b2420] space-y-1.5 text-xs">
              <p className="font-bold text-[#fcf8f5]">{contract.title}</p>
              <p className="text-[#a89c93]">
                Cliente: <strong className="text-[#fcf8f5]">{contract.clientName}</strong> • Projeto: {contract.projectTitle}
              </p>
              <p className="text-[#a89c93]">
                Valor: <strong className="text-[#fcf8f5]">{formatCurrency(contract.totalAmount)}</strong>
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(false)}
                className="px-4 py-2.5 rounded-xl border border-[#3d342f] text-xs font-semibold text-[#a89c93] hover:text-[#fcf8f5] hover:bg-[#241e1b] transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteWorkContract(contract.id);
                  onDelete?.();
                  setIsConfirmingDelete(false);
                  onClose();
                }}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-md"
              >
                Excluir Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
