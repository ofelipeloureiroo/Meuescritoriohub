import React, { useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  Eye,
  Globe,
  MessageCircle,
  Share2,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinanceContext';
import {
  buildPublicPortfolioData,
  publishPortfolioToFirestore,
} from '../../services/publicPortfolioService';

interface SharePortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SharePortfolioModal: React.FC<SharePortfolioModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { architectProfile, architectureProjects, clients } = useFinance();

  const [copied, setCopied] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

  if (!isOpen) return null;

  const targetUid = user?.uid || 'preview';
  const publicUrl = `${window.location.origin}/portfolio?u=${targetUid}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleSyncPublic = async () => {
    setIsSyncing(true);
    try {
      const data = buildPublicPortfolioData(
        targetUid,
        architectProfile,
        architectureProjects,
        clients?.length || 0
      );
      await publishPortfolioToFirestore(data);
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 3000);
    } catch (err) {
      console.error('Error syncing public portfolio:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const shareText = `Olá! Conheça nosso portfólio e projetos recentes de ${architectProfile?.name || 'nosso estúdio'}:\n${publicUrl}`;
  const whatsappShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200 font-sans">
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-6 border-b border-[var(--border-color)] bg-[var(--bg-card-secondary)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-xs"
              style={{
                backgroundColor: 'var(--theme-badge-bg)',
                color: 'var(--theme-badge-text)',
                border: '1px solid var(--theme-badge-border)',
              }}
            >
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-serif font-bold text-[var(--text-main)]">
                Compartilhar Portfólio Público
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Mini Landing Page elegante e sem dados financeiros
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Privacy & Zero Leakage Guarantee */}
          <div className="p-4 rounded-2xl bg-[var(--bg-card-secondary)] border border-[var(--border-color)] space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-main)]">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Privacidade Total para o Cliente (Modo Apresentação)</span>
            </div>
            <ul className="text-xs text-[var(--text-muted)] space-y-1.5 list-disc list-inside">
              <li><strong className="text-[var(--text-main)]">Sem Faturamento & Honorários:</strong> Nenhum valor monetário é exibido.</li>
              <li><strong className="text-[var(--text-main)]">Sem Prazos e Cobranças:</strong> Botões e avisos internos permanecem estritamente no seu painel.</li>
              <li><strong className="text-[var(--text-main)]">Foco em Conversão:</strong> O cliente visualiza fotos em alta resolução, bio, especialidade e botão direto para falar no seu WhatsApp.</li>
            </ul>
          </div>

          {/* Link Box */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-main)] flex items-center justify-between">
              <span>Link Público Exclusivo:</span>
              <span className="text-[11px] font-semibold" style={{ color: 'var(--theme-primary)' }}>Pronto para envio</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={publicUrl}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-xs text-[var(--text-main)] font-mono select-all focus:outline-none focus:border-[var(--theme-primary)]"
              />
              <button
                onClick={handleCopy}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'text-black'
                }`}
                style={!copied ? { backgroundColor: 'var(--theme-primary)' } : undefined}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Share Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <a
              href={whatsappShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3.5 rounded-2xl bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/40 text-[#128C7E] dark:text-[#25D366] font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
            >
              <MessageCircle className="w-4 h-4 fill-[#25D366]" />
              <span>Enviar via WhatsApp</span>
            </a>

            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3.5 rounded-2xl bg-[var(--bg-card-secondary)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-color)] text-[var(--text-main)] font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
            >
              <Eye className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} />
              <span>Visualizar como Cliente</span>
              <ExternalLink className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            </a>
          </div>

          {/* Sync Button */}
          <div className="pt-3 border-t border-[var(--border-color)] flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-[11px] text-[var(--text-muted)]">
              Adicionou novos projetos recentemente? Sincronize com 1 clique:
            </span>
            <button
              onClick={handleSyncPublic}
              disabled={isSyncing}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[var(--bg-card-secondary)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-main)] flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--theme-primary)' }} />
              <span>{isSyncing ? 'Sincronizando...' : syncSuccess ? 'Sincronizado!' : 'Atualizar Página Pública'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
