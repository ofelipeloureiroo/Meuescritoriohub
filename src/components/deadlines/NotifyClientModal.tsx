import React, { useState, useEffect } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  MessageCircle,
  Phone,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { ProjectInstallment, ProjectMilestone } from '../../types';
import { useFinance } from '../../context/FinanceContext';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface NotifyClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  installment?: ProjectInstallment | null;
  milestone?: ProjectMilestone | null;
}

type MessageTemplateType = 'due_soon' | 'due_today' | 'overdue' | 'receipt' | 'milestone_done';

export const NotifyClientModal: React.FC<NotifyClientModalProps> = ({
  isOpen,
  onClose,
  installment,
  milestone,
}) => {
  const { architectProfile } = useFinance();
  const [templateType, setTemplateType] = useState<MessageTemplateType>('due_soon');
  const [customPhone, setCustomPhone] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [copied, setCopied] = useState(false);

  // Initialize or determine best initial template
  useEffect(() => {
    if (milestone) {
      setTemplateType('milestone_done');
      setCustomPhone(milestone.clientPhone || '');
    } else if (installment) {
      setCustomPhone(installment.clientPhone || '');
      const todayStr = new Date().toISOString().split('T')[0];
      if (installment.status === 'paid') {
        setTemplateType('receipt');
      } else if (installment.dueDate < todayStr) {
        setTemplateType('overdue');
      } else if (installment.dueDate === todayStr) {
        setTemplateType('due_today');
      } else {
        setTemplateType('due_soon');
      }
    }
  }, [installment, milestone, isOpen]);

  // Build dynamic message based on template type
  useEffect(() => {
    const architectName = architectProfile?.name || 'Laíne Paula';
    const pixKey = architectProfile?.pixKey || 'contato@lainepaula.arq.br';
    const pixType = architectProfile?.pixKeyType ? ` (${architectProfile.pixKeyType.toUpperCase()})` : '';

    if (milestone) {
      const clientName = milestone.clientName || 'Cliente';
      const projectTitle = milestone.projectTitle || 'Projeto';
      const stageName = milestone.title || 'Etapa do Projeto';

      setCustomMessage(
        `Olá ${clientName}! Tudo bem? Aqui é a arquiteta ${architectName} 📐✨\n\n` +
        `Passando para avisar que concluímos com sucesso a etapa: "${stageName}" do seu projeto "${projectTitle}".\n\n` +
        `Estou preparando o material para apresentação. Qualquer dúvida ou ajuste que queira conversar, estou à disposição!`
      );
      return;
    }

    if (installment) {
      const clientName = installment.clientName || 'Cliente';
      const projectTitle = installment.projectTitle || 'Projeto';
      const installmentInfo = `parcela ${installment.installmentNumber}/${installment.totalInstallments} (${installment.description})`;
      const formattedValue = formatCurrency(installment.amount);
      const formattedDueDate = formatDate(installment.dueDate);

      if (templateType === 'due_soon') {
        setCustomMessage(
          `Olá ${clientName}! Tudo bem? Aqui é a arquiteta ${architectName} 📐✨\n\n` +
          `Passando para lembrar que a ${installmentInfo} referente ao seu projeto "${projectTitle}" tem vencimento próximo no dia ${formattedDueDate}, no valor de ${formattedValue}.\n\n` +
          `💳 Dados para pagamento via PIX:\n` +
          `Chave PIX: ${pixKey}${pixType}\n` +
          `Favorecido: ${architectName}\n\n` +
          `Assim que realizar o pagamento, pode me enviar o comprovante por aqui. Muito obrigada!`
        );
      } else if (templateType === 'due_today') {
        setCustomMessage(
          `Olá ${clientName}! Tudo bem? Aqui é a arquiteta ${architectName} 📐✨\n\n` +
          `Lembrando que a ${installmentInfo} do projeto "${projectTitle}" vence hoje (${formattedDueDate}), no valor de ${formattedValue}.\n\n` +
          `💳 Chave PIX: ${pixKey}${pixType}\n` +
          `Favorecido: ${architectName}\n\n` +
          `Caso já tenha efetuado o pagamento, por favor desconsidere este lembrete e me envie o comprovante. Tenha um ótimo dia!`
        );
      } else if (templateType === 'overdue') {
        setCustomMessage(
          `Olá ${clientName}! Tudo bem? Aqui é a ${architectName} 📐\n\n` +
          `Consta em aberto em nosso sistema a ${installmentInfo} do projeto "${projectTitle}", vencida em ${formattedDueDate}, no valor de ${formattedValue}.\n\n` +
          `Poderia verificar, por gentileza? Caso precise de uma segunda via ou de novos dados de pagamento:\n` +
          `💳 Chave PIX: ${pixKey}${pixType}\n` +
          `Favorecido: ${architectName}\n\n` +
          `Se já foi pago, peço que me envie o comprovante para darmos baixa. Muito obrigada!`
        );
      } else if (templateType === 'receipt') {
        const paidDateFormatted = installment.paidDate ? formatDate(installment.paidDate) : 'recente';
        setCustomMessage(
          `Olá ${clientName}! Tudo bem? Aqui é a arquiteta ${architectName} 📐✨\n\n` +
          `Confirmamos o recebimento com sucesso da ${installmentInfo} do projeto "${projectTitle}" no valor de ${formattedValue} (${paidDateFormatted}).\n\n` +
          `Agradeço pela confiança e seguimos firmes com os próximos passos do projeto!`
        );
      }
    }
  }, [templateType, installment, milestone, architectProfile]);

  if (!isOpen) return null;

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(customMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendWhatsApp = () => {
    const cleanPhone = customPhone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
    const encodedText = encodeURIComponent(customMessage);
    const whatsappUrl = `https://wa.me/${phoneWithCountry}?text=${encodedText}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#1a1614] border border-[#3d342f] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#3d342f] bg-[#14110f]/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <MessageCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-[#fcf8f5]">
                Avisar Cliente pelo WhatsApp
              </h3>
              <p className="text-xs text-[#a89c93]">
                {installment
                  ? `${installment.clientName} • ${installment.projectTitle}`
                  : milestone
                  ? `${milestone.clientName} • ${milestone.projectTitle}`
                  : 'Lembrete profissional'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#a89c93] hover:text-[#fcf8f5] p-1.5 rounded-lg hover:bg-[#241e1b] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Template Selection Pills */}
          {installment && (
            <div>
              <label className="block text-xs font-semibold text-[#d49454] uppercase tracking-wider mb-2">
                Tipo de Lembrete
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setTemplateType('due_soon')}
                  className={`px-3 py-2 rounded-xl text-xs font-medium text-center transition-all cursor-pointer border ${
                    templateType === 'due_soon'
                      ? 'bg-[#c58a4b]/20 text-[#d49454] border-[#c58a4b]'
                      : 'bg-[#241e1b] text-[#a89c93] border-[#3d342f] hover:border-[#a89c93]/40'
                  }`}
                >
                  📅 A Vencer Logo
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateType('due_today')}
                  className={`px-3 py-2 rounded-xl text-xs font-medium text-center transition-all cursor-pointer border ${
                    templateType === 'due_today'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                      : 'bg-[#241e1b] text-[#a89c93] border-[#3d342f] hover:border-[#a89c93]/40'
                  }`}
                >
                  ⏰ Vence Hoje
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateType('overdue')}
                  className={`px-3 py-2 rounded-xl text-xs font-medium text-center transition-all cursor-pointer border ${
                    templateType === 'overdue'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500'
                      : 'bg-[#241e1b] text-[#a89c93] border-[#3d342f] hover:border-[#a89c93]/40'
                  }`}
                >
                  ⚠️ Parcela Vencida
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateType('receipt')}
                  className={`px-3 py-2 rounded-xl text-xs font-medium text-center transition-all cursor-pointer border ${
                    templateType === 'receipt'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500'
                      : 'bg-[#241e1b] text-[#a89c93] border-[#3d342f] hover:border-[#a89c93]/40'
                  }`}
                >
                  ✅ Confirmar Recibo
                </button>
              </div>
            </div>
          )}

          {/* Client Phone Input */}
          <div>
            <label className="block text-xs font-medium text-[#a89c93] mb-1.5">
              WhatsApp do Cliente (DDD + Número)
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-[#a89c93] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="(21) 99876-5432"
                value={customPhone}
                onChange={(e) => setCustomPhone(e.target.value)}
                className="w-full bg-[#241e1b] border border-[#3d342f] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#fcf8f5] focus:outline-none focus:border-[#c58a4b] transition-colors"
              />
            </div>
          </div>

          {/* Message Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-[#a89c93]">
                Mensagem Personalizada
              </label>
              <span className="text-[11px] text-[#a89c93]">
                Você pode editar antes de enviar
              </span>
            </div>
            <textarea
              rows={8}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="w-full bg-[#14110f] border border-[#3d342f] rounded-xl p-3.5 text-sm text-[#fcf8f5] focus:outline-none focus:border-[#c58a4b] leading-relaxed resize-none font-sans"
            />
          </div>

          {/* PIX Reminder Highlight */}
          <div className="p-3 bg-[#241e1b] rounded-xl border border-[#3d342f] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-[#a89c93]">Chave PIX configurada:</span>
              <span className="font-bold text-[#fcf8f5]">{architectProfile?.pixKey || 'contato@lainepaula.arq.br'}</span>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-[#3d342f] bg-[#14110f]/80">
          <button
            type="button"
            onClick={handleCopyMessage}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-[#241e1b] hover:bg-[#322924] text-[#fcf8f5] rounded-xl text-xs font-semibold border border-[#3d342f] transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">Mensagem Copiada!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-[#a89c93]" />
                <span>Copiar Mensagem</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 sm:w-auto px-4 py-2.5 bg-[#241e1b] hover:bg-[#322924] text-[#a89c93] hover:text-[#fcf8f5] rounded-xl text-xs font-semibold border border-[#3d342f] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="w-1/2 sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-900/30 transition-all cursor-pointer active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>Abrir WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
