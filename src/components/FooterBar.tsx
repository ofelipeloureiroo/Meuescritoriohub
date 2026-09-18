import React, { useState } from 'react';
import {
  Building2,
  Instagram,
  MessageCircle,
  ExternalLink,
  ShieldCheck,
  Headphones,
  Sparkles,
  Heart,
  Copy,
  Check,
  Phone,
  HelpCircle,
  Mail,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';

export const FooterBar: React.FC = () => {
  const { architectProfile } = useFinance();
  const { user, isOwner, isAdmin } = useAuth();
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [showSupportModal, setShowSupportModal] = useState(false);

  // Show admin shortcut ONLY for the owner account (lfquadrosdecorativos@gmail.com)
  const isSuperAdmin = isOwner || (isAdmin && user?.email?.toLowerCase() === 'lfquadrosdecorativos@gmail.com');

  const instagramUrl = 'https://www.instagram.com/meuescritorio.online';
  const instagramHandle = '@meuescritorio.online';

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <>
      <footer className="w-full bg-[var(--bg-sidebar)]/95 backdrop-blur-md border-t border-[var(--border-color)] text-[var(--text-main)] py-4 px-4 sm:px-6 lg:px-8 mt-12 transition-all">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Brand & Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-md border border-[var(--theme-primary)]/40 bg-[var(--bg-card)] text-[var(--theme-primary)] shrink-0">
              <Building2 className="w-4 h-4 text-[var(--theme-primary)]" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-serif font-bold text-sm tracking-wider text-[var(--text-main)] uppercase leading-none">
                  MEU ESCRITÓRIO
                </span>
                <span className="text-[9px] font-extrabold uppercase tracking-widest px-1.5 py-0.2 rounded-md bg-[var(--theme-badge-bg)] text-[var(--theme-badge-text)] border border-[var(--theme-badge-border)]">
                  ONLINE
                </span>
              </div>
              <span className="text-[11px] text-[var(--text-muted)] mt-0.5">
                Plataforma de Gestão & Produtividade
              </span>
            </div>
          </div>

          {/* Center Info / Copyright */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-[var(--text-muted)] text-center">
            <span>© {new Date().getFullYear()} Meu Escritório Online</span>
            <span className="hidden sm:inline">•</span>
            <span className="flex items-center gap-1">
              Feito para Arquitetos & Designers
              <Heart className="w-3 h-3 text-rose-500 fill-rose-500 inline" />
            </span>
          </div>

          {/* Action Links: WhatsApp & Instagram (Styled in App Palette) */}
          <div className="flex items-center gap-2.5 flex-wrap justify-center">
            {/* Email Suporte */}
            <a
              href="mailto:suporte@meuescritorio.online"
              className="group flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-color)] hover:border-[var(--theme-primary)]/60 text-[var(--text-main)] text-xs font-semibold transition-all shadow-xs cursor-pointer"
              title="Falar com o Suporte via E-mail"
            >
              <div className="w-5 h-5 rounded-lg bg-[var(--theme-badge-bg)] border border-[var(--theme-badge-border)] flex items-center justify-center text-[var(--theme-primary)] group-hover:scale-110 transition-transform">
                <Mail className="w-3 h-3" />
              </div>
              <div className="flex flex-col text-left leading-tight">
                <span className="text-xs">Suporte E-mail</span>
                <span className="text-[9px] text-[var(--text-muted)] font-normal">suporte@meuescritorio.online</span>
              </div>
              <ExternalLink className="w-3 h-3 text-[var(--text-muted)] opacity-60 group-hover:opacity-100 group-hover:text-[var(--theme-primary)]" />
            </a>

            {/* Instagram Oficial */}
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-color)] hover:border-[var(--theme-primary)]/60 text-[var(--text-main)] text-xs font-semibold transition-all shadow-xs cursor-pointer"
              title="Acompanhar no Instagram"
            >
              <div className="w-5 h-5 rounded-lg bg-[var(--theme-badge-bg)] border border-[var(--theme-badge-border)] flex items-center justify-center text-[var(--theme-primary)] group-hover:scale-110 transition-transform">
                <Instagram className="w-3 h-3" />
              </div>
              <div className="flex flex-col text-left leading-tight">
                <span className="text-xs">Instagram</span>
                <span className="text-[9px] text-[var(--text-muted)] font-normal">{instagramHandle}</span>
              </div>
              <ExternalLink className="w-3 h-3 text-[var(--text-muted)] opacity-60 group-hover:opacity-100 group-hover:text-[var(--theme-primary)]" />
            </a>

            {/* Admin Panel Link */}
            {isSuperAdmin && (
              <a
                href="/admin"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-color)] hover:border-[var(--theme-primary)]/40 text-[var(--text-muted)] hover:text-[var(--text-main)] text-xs font-medium transition-colors cursor-pointer"
                title="Acessar Painel Administrativo"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[var(--theme-primary)]" />
                <span className="hidden sm:inline text-[11px]">Admin</span>
              </a>
            )}

            {/* Quick Support Modal Button */}
            <button
              onClick={() => setShowSupportModal(true)}
              className="p-2 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-color)] hover:border-[var(--theme-primary)]/50 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
              title="Canais de Atendimento"
            >
              <HelpCircle className="w-4 h-4 text-[var(--theme-primary)]" />
            </button>
          </div>
        </div>
      </footer>

      {/* Support & Channels Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[var(--bg-card)] text-[var(--text-main)] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[var(--border-color)] space-y-5 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[var(--theme-badge-bg)] border border-[var(--theme-badge-border)] flex items-center justify-center text-[var(--theme-primary)]">
                  <Headphones className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-[var(--text-main)]">
                    Canais do Meu Escritório Online
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    Suporte oficial e novidades da plataforma
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSupportModal(false)}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Channels List */}
            <div className="space-y-3">
              {/* Email Card */}
              <a
                href="mailto:suporte@meuescritorio.online"
                className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--bg-card-secondary)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-color)] hover:border-[var(--theme-primary)]/60 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[var(--theme-badge-bg)] border border-[var(--theme-badge-border)] flex items-center justify-center text-[var(--theme-primary)] group-hover:scale-105 transition-transform">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[var(--text-main)] flex items-center gap-1.5">
                      Suporte via E-mail
                      <span className="text-[10px] font-normal px-1.5 py-0.2 rounded bg-[var(--theme-badge-bg)] text-[var(--theme-badge-text)] border border-[var(--theme-badge-border)] animate-none">
                        suporte@meuescritorio.online
                      </span>
                    </h4>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      Tire dúvidas sobre projetos, financeiro e equipe
                    </p>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-[var(--text-muted)] opacity-70 group-hover:opacity-100 group-hover:text-[var(--theme-primary)]" />
              </a>

              {/* Instagram Card */}
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--bg-card-secondary)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-color)] hover:border-[var(--theme-primary)]/60 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[var(--theme-badge-bg)] border border-[var(--theme-badge-border)] flex items-center justify-center text-[var(--theme-primary)] group-hover:scale-105 transition-transform">
                    <Instagram className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[var(--text-main)] flex items-center gap-1.5">
                      Instagram Oficial
                      <span className="text-[10px] font-normal px-1.5 py-0.2 rounded bg-[var(--theme-badge-bg)] text-[var(--theme-badge-text)] border border-[var(--theme-badge-border)]">
                        {instagramHandle}
                      </span>
                    </h4>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      Dicas, atualizações e comunidade de escritórios
                    </p>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-[var(--text-muted)] opacity-70 group-hover:opacity-100 group-hover:text-[var(--theme-primary)]" />
              </a>
            </div>

            {/* Footer status */}
            <div className="pt-2 border-t border-[var(--border-color)] flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Sistema 100% Operacional
              </span>
              <button
                type="button"
                onClick={() => setShowSupportModal(false)}
                className="px-4 py-1.5 rounded-xl bg-[var(--bg-card-hover)] hover:bg-[var(--bg-card-secondary)] text-xs font-semibold text-[var(--text-main)] transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
