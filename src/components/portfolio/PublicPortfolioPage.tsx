import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import {
  Building,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Compass,
  ExternalLink,
  Eye,
  Heart,
  Instagram,
  Layers,
  MapPin,
  Maximize2,
  MessageCircle,
  Moon,
  Search,
  Share2,
  Sparkles,
  Star,
  Sun,
  User,
  Users,
  X,
} from 'lucide-react';
import {
  PublicPortfolioData,
  PublicPortfolioProject,
  fetchPublicPortfolio,
  buildPublicPortfolioData,
  resolveLocalProfileAndProjects,
} from '../../services/publicPortfolioService';
import { buildInstagramUrl, cleanInstagramHandle } from '../../utils/instagram';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { applyThemeToDocument, NICHES } from '../../utils/theme';

export const PublicPortfolioPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const [searchParams] = useSearchParams();
  const urlUserParam = searchParams.get('u') || searchParams.get('user') || userId;

  const { architectProfile, architectureProjects, clients } = useFinance();
  const { user } = useAuth();

  const [portfolioData, setPortfolioData] = useState<PublicPortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProjectForModal, setSelectedProjectForModal] = useState<PublicPortfolioProject | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [copiedLinkToast, setCopiedLinkToast] = useState(false);
  const [currentBgTheme, setCurrentBgTheme] = useState<'light_cream' | 'dark_luxury'>('light_cream');

  // Load and assemble portfolio data
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setLoading(true);
      try {
        const targetId = urlUserParam || user?.uid;

        // 1. Try Firestore / Local cache
        let data: PublicPortfolioData | null = null;
        if (targetId) {
          data = await fetchPublicPortfolio(targetId);
        }

        // 2. If not loaded or empty, fallback to active Context or LocalStorage
        if (!data || !data.officeName || data.officeName === 'Meu Escritório') {
          if (architectProfile && (architectProfile.name || architectureProjects.length > 0)) {
            data = buildPublicPortfolioData(
              user?.uid || 'preview',
              architectProfile,
              architectureProjects,
              clients?.length || 0
            );
          } else {
            const local = resolveLocalProfileAndProjects();
            if (local.profile && (local.profile.name || local.projects.length > 0)) {
              data = buildPublicPortfolioData(
                targetId || 'preview',
                local.profile,
                local.projects,
                local.clientsCount
              );
            }
          }
        }

        if (data && isMounted) {
          setPortfolioData(data);
          const initialBg = (data.bgTheme === 'dark_luxury' || data.bgTheme === 'dark_graphite' || data.bgTheme === 'dark_oled')
            ? 'dark_luxury'
            : 'light_cream';
          setCurrentBgTheme(initialBg);
          applyThemeToDocument((data.themeColor as any) || 'gold', initialBg as any);
        }
      } catch (err) {
        console.error('Error loading public portfolio:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [urlUserParam, user?.uid, architectProfile, architectureProjects, clients]);

  // Handle manual theme toggle (Modo Claro / Modo Escuro)
  const toggleTheme = () => {
    const nextTheme = currentBgTheme === 'light_cream' ? 'dark_luxury' : 'light_cream';
    setCurrentBgTheme(nextTheme);
    applyThemeToDocument((portfolioData?.themeColor as any) || 'gold', nextTheme as any);
  };

  // Niche config for category labels & titles
  const currentNicheConfig = useMemo(() => {
    const key = (portfolioData?.niche || 'design') as keyof typeof NICHES;
    return NICHES[key] || NICHES.design || NICHES.arquitetura;
  }, [portfolioData?.niche]);

  // Categories list
  const categories = useMemo(() => {
    const defaultList = currentNicheConfig?.categories || [
      { id: 'all', label: 'Todos os Projetos' },
      { id: 'identidade', label: 'Identidade & Branding' },
      { id: 'uiux', label: 'UI/UX & Web Design' },
      { id: 'editorial', label: 'Editorial & Embalagem' },
      { id: 'social_media', label: 'Social Media & Criativos' },
      { id: 'motion', label: 'Motion Design & Vídeo' },
      { id: 'antes_depois', label: '✨ Redesign / Antes & Depois' },
    ];

    const totalCount = portfolioData?.projects?.length || 0;

    return defaultList.map((c) => ({
      id: c.id,
      label: c.id === 'all' ? `Todos os Projetos (${totalCount})` : c.label,
    }));
  }, [currentNicheConfig, portfolioData?.projects?.length]);

  // Filtered projects
  const filteredProjects = useMemo(() => {
    if (!portfolioData?.projects) return [];
    return portfolioData.projects.filter((p) => {
      const matchesCategory =
        selectedCategory === 'all'
          ? true
          : selectedCategory === 'antes_depois'
          ? Boolean(p.beforeImage && p.afterImage)
          : p.category === selectedCategory;

      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchesCategory;

      const titleMatch = (p.title || '').toLowerCase().includes(q);
      const locMatch = (p.location || '').toLowerCase().includes(q);
      const descMatch = (p.description || '').toLowerCase().includes(q);
      const tagMatch = p.tags?.some((t) => t.toLowerCase().includes(q));

      return matchesCategory && (titleMatch || locMatch || descMatch || tagMatch);
    });
  }, [portfolioData, selectedCategory, searchQuery]);

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedLinkToast(true);
    setTimeout(() => setCopiedLinkToast(false), 3000);
  };

  const getCleanPhone = (phone?: string) => {
    if (!phone) return '';
    return phone.replace(/\D/g, '');
  };

  const generateWhatsAppLink = (customText?: string) => {
    const rawPhone = getCleanPhone(portfolioData?.whatsapp);
    const defaultText = `Olá ${portfolioData?.officeName || 'Carlos Felipe'}! Estive olhando o seu portfólio oficial e gostaria de tirar dúvidas sobre um projeto / orçamento.`;
    const text = encodeURIComponent(customText || defaultText);
    if (rawPhone) {
      const fullPhone = rawPhone.length <= 11 ? `55${rawPhone}` : rawPhone;
      return `https://wa.me/${fullPhone}?text=${text}`;
    }
    return `https://api.whatsapp.com/send?text=${text}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex items-center justify-center p-4 font-sans">
        <div className="text-center space-y-4">
          <div
            className="w-12 h-12 border-3 border-t-transparent rounded-full animate-spin mx-auto shadow-lg"
            style={{ borderColor: 'var(--theme-primary)', borderTopColor: 'transparent' }}
          />
          <h2 className="text-lg font-serif font-bold text-[var(--text-main)] tracking-wide">
            Carregando Portfólio...
          </h2>
          <p className="text-xs text-[var(--text-muted)]">Preparando a galeria de projetos e apresentações</p>
        </div>
      </div>
    );
  }

  if (!portfolioData) {
    return (
      <div className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex items-center justify-center p-4 font-sans">
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-8 rounded-3xl max-w-md text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto">
            <Compass className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-serif font-bold text-[var(--text-main)]">Portfólio em Construção</h2>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            Este espaço está sendo preparado com os projetos mais recentes.
          </p>
          <Link
            to="/app"
            className="inline-block px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg transition-transform hover:scale-105 text-black"
            style={{ backgroundColor: 'var(--theme-primary)' }}
          >
            Acessar Área do Escritório
          </Link>
        </div>
      </div>
    );
  }

  const effectiveInstagramUrl = buildInstagramUrl(portfolioData.instagramHandle, portfolioData.instagramUrl);
  const displayInstagram = cleanInstagramHandle(portfolioData.instagramHandle || portfolioData.instagramUrl) || '@instagram';

  const deliveredCount = portfolioData.projects.filter(p => p.category !== 'em_andamento').length || portfolioData.projectsCount;

  return (
    <div className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] font-sans antialiased selection:bg-[var(--theme-primary)]/30 selection:text-[var(--text-main)] pb-24 transition-colors duration-200">
      {/* Toast Notification */}
      {copiedLinkToast && (
        <div className="fixed top-6 right-6 z-50 bg-[var(--bg-card)] border border-[var(--theme-primary)] text-[var(--text-main)] px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top duration-200">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--theme-badge-bg)', color: 'var(--theme-badge-text)' }}
          >
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-xs font-medium">
            <span className="font-bold block" style={{ color: 'var(--theme-primary)' }}>Link Copiado!</span>
            Pronto para enviar aos seus clientes no WhatsApp ou redes.
          </div>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[var(--bg-card)]/90 backdrop-blur-md border-b border-[var(--border-color)] transition-all shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {portfolioData.photoUrl ? (
              <img
                src={portfolioData.photoUrl}
                alt={portfolioData.officeName}
                className="w-10 h-10 rounded-full object-cover border-2 shadow-sm"
                style={{ borderColor: 'var(--theme-primary)' }}
              />
            ) : (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-serif font-bold text-sm border-2"
                style={{
                  backgroundColor: 'var(--theme-badge-bg)',
                  color: 'var(--theme-badge-text)',
                  borderColor: 'var(--theme-primary)',
                }}
              >
                {portfolioData.officeName.charAt(0)}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-sm sm:text-base text-[var(--text-main)] tracking-tight block truncate max-w-[180px] sm:max-w-xs">
                  {portfolioData.officeName}
                </span>
                <span
                  className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold"
                  style={{
                    backgroundColor: 'var(--theme-badge-bg)',
                    color: 'var(--theme-badge-text)',
                    border: '1px solid var(--theme-badge-border)',
                  }}
                >
                  {portfolioData.title}
                </span>
              </div>
              <span className="text-[11px] text-[var(--text-muted)] font-medium block">
                Portfólio Oficial & Galeria de Projetos
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-[var(--bg-card-secondary)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-main)] flex items-center gap-1.5 transition-all cursor-pointer"
              title={currentBgTheme === 'light_cream' ? 'Mudar para Modo Escuro' : 'Mudar para Modo Claro'}
            >
              {currentBgTheme === 'light_cream' ? (
                <>
                  <Moon className="w-3.5 h-3.5 text-amber-600" />
                  <span className="hidden md:inline text-[11px]">Modo Escuro</span>
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden md:inline text-[11px]">Modo Claro</span>
                </>
              )}
            </button>

            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-[var(--bg-card-secondary)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-main)] flex items-center gap-1.5 transition-all cursor-pointer"
              title="Copiar link deste portfólio"
            >
              <Share2 className="w-3.5 h-3.5" style={{ color: 'var(--theme-primary)' }} />
              <span className="hidden sm:inline">Compartilhar</span>
            </button>

            {portfolioData.whatsapp && (
              <a
                href={generateWhatsAppLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-black font-bold text-xs flex items-center gap-1.5 transition-transform hover:scale-105 shadow-md"
              >
                <MessageCircle className="w-3.5 h-3.5 fill-black" />
                <span className="hidden sm:inline">Falar no WhatsApp</span>
                <span className="sm:hidden">WhatsApp</span>
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-8 sm:space-y-10">
        {/* 1. HERO PROFILE CARD (EXACT REPLICA OF THE APP'S PORTFOLIO TAB IN MODO CLARO) */}
        <section className="relative overflow-hidden rounded-3xl bg-[var(--bg-card)] border border-[var(--border-color)] p-6 sm:p-8 shadow-xl">
          <div className="flex flex-col lg:flex-row items-center lg:items-start justify-between gap-6 sm:gap-8">
            {/* Left: Avatar + Details */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-6 flex-1">
              {/* Profile Avatar with Gold Border Ring */}
              <div className="relative shrink-0">
                <div
                  className="w-28 h-28 sm:w-36 sm:h-36 rounded-full p-1.5 shadow-xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, var(--theme-gradient-from), var(--theme-primary), var(--theme-gradient-to))',
                  }}
                >
                  <div className="w-full h-full rounded-full overflow-hidden bg-[var(--bg-body)] border-2 border-[var(--bg-card)] flex items-center justify-center">
                    {portfolioData.photoUrl ? (
                      <img
                        src={portfolioData.photoUrl}
                        alt={portfolioData.officeName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center font-serif font-bold text-3xl sm:text-4xl"
                        style={{
                          backgroundColor: 'var(--theme-badge-bg)',
                          color: 'var(--theme-badge-text)',
                        }}
                      >
                        {portfolioData.officeName.charAt(0)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bio & Details */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-main)] font-serif tracking-tight">
                    {portfolioData.officeName}
                  </h1>
                  <span
                    className="px-3 py-1 rounded-full text-xs font-semibold"
                    style={{
                      backgroundColor: 'var(--theme-badge-bg)',
                      color: 'var(--theme-badge-text)',
                      border: '1px solid var(--theme-badge-border)',
                    }}
                  >
                    {portfolioData.title}
                  </span>
                </div>

                <p className="text-sm font-medium text-[var(--text-main)] flex items-center justify-center sm:justify-start gap-1.5">
                  <MapPin className="w-4 h-4" style={{ color: 'var(--theme-accent)' }} /> {portfolioData.location}
                </p>

                <p className="text-xs text-[var(--text-muted)] max-w-xl leading-relaxed">
                  <span className="mr-1.5">{currentNicheConfig.icon}</span><strong className="text-[var(--text-main)]">{portfolioData.specialty}</strong>
                  <br />
                  <span className="mr-1.5">✨</span><em>{portfolioData.tagline}</em> {portfolioData.description}
                </p>

                {/* Instagram & Rating Link */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-2">
                  {portfolioData.instagramHandle && (
                    <a
                      href={effectiveInstagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[var(--bg-card-secondary)] hover:bg-[var(--bg-card-hover)] text-xs font-medium text-[var(--text-main)] border border-[var(--border-color)] transition-colors"
                    >
                      <Instagram className="w-3.5 h-3.5" style={{ color: 'var(--theme-accent)' }} />
                      {displayInstagram}
                      <ExternalLink className="w-3 h-3 text-[var(--text-muted)]" />
                    </a>
                  )}

                  <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> {Number(portfolioData.rating || 5.0).toFixed(1)}
                    {portfolioData.followersCount && ` • ${portfolioData.followersCount}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Quick Action Buttons for Client Visitor */}
            <div className="flex flex-row sm:flex-col gap-3 w-full lg:w-auto justify-center sm:justify-end shrink-0">
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-[var(--theme-primary)]/20 to-amber-500/15 hover:brightness-110 text-[var(--theme-primary)] font-bold text-xs flex items-center justify-center gap-2 border border-[var(--theme-primary)]/40 shadow-sm transition-all active:scale-95 cursor-pointer"
                title="Compartilhar portfólio"
              >
                <Share2 className="w-4 h-4 stroke-[2.5]" />
                <span>Compartilhar Portfólio</span>
              </button>

              {portfolioData.whatsapp ? (
                <a
                  href={generateWhatsAppLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-initial px-5 py-3 rounded-xl text-black font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer hover:brightness-110"
                  style={{
                    backgroundColor: 'var(--theme-primary)',
                  }}
                >
                  <MessageCircle className="w-4 h-4 fill-black" />
                  <span>Solicitar Orçamento</span>
                </a>
              ) : (
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex-1 sm:flex-initial px-5 py-3 rounded-xl text-black font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer hover:brightness-110"
                  style={{
                    backgroundColor: 'var(--theme-primary)',
                  }}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Conhecer Trabalhos</span>
                </button>
              )}
            </div>
          </div>

          {/* 3 Highlight Badges (Exact replica from Screenshot 2) */}
          <div className="mt-6 pt-6 border-t border-[var(--border-color)]/80 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3.5 rounded-2xl bg-[var(--bg-input)]/80 border border-[var(--border-color)] flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-serif font-bold text-sm shrink-0"
                style={{
                  backgroundColor: 'rgba(var(--theme-accent-rgb), 0.2)',
                  color: 'var(--theme-accent)',
                  border: '1px solid rgba(var(--theme-accent-rgb), 0.4)',
                }}
              >
                R$
              </div>
              <div>
                <span className="text-xs font-bold text-[var(--text-main)] block font-serif">Propostas Claras</span>
                <span className="text-[11px] text-[var(--text-muted)]">Orçamentos transparentes e condições alinhadas</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[var(--bg-input)]/80 border border-[var(--border-color)] flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                style={{
                  backgroundColor: 'var(--theme-badge-bg)',
                  color: 'var(--theme-badge-text)',
                  border: '1px solid var(--theme-badge-border)',
                }}
              >
                ★
              </div>
              <div>
                <span className="text-xs font-bold text-[var(--text-main)] block font-serif">Qualidade Comprovada</span>
                <span className="text-[11px] text-[var(--text-muted)]">Avaliações reais e compromisso com o resultado</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[var(--bg-input)]/80 border border-[var(--border-color)] flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 font-bold text-sm shrink-0">
                📋
              </div>
              <div>
                <span className="text-xs font-bold text-[var(--text-main)] block font-serif">Contratos & Prazos</span>
                <span className="text-[11px] text-[var(--text-muted)]">Entregas pontuais com segurança jurídica</span>
              </div>
            </div>
          </div>
        </section>

        {/* 2. STUDIO METRICS BAR (EXACT 4 CARDS STYLING FROM SCREENSHOT 2) */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] space-y-1 shadow-sm">
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span>Total de Projetos de Design</span>
              <Building className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} />
            </div>
            <p className="text-2xl font-bold text-[var(--text-main)] font-serif">
              {portfolioData.projectsCount || portfolioData.projects.length}
            </p>
            <span className="text-[11px]" style={{ color: 'var(--theme-accent)' }}>
              {deliveredCount} entregues • 0 em andamento
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] space-y-1 shadow-sm">
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span>Itens Cadastrados</span>
              <Layers className="w-4 h-4" style={{ color: 'var(--theme-accent)' }} />
            </div>
            <p className="text-2xl font-bold text-[var(--text-main)] font-serif">
              {portfolioData.projectsCount || portfolioData.projects.length}{' '}
              <span className="text-sm font-sans font-normal text-[var(--text-muted)]">itens</span>
            </p>
            <span className="text-[11px] text-[var(--text-muted)] truncate block">
              {portfolioData.nicheLabel || 'Design Gráfico, Web & Branding'}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] space-y-1 shadow-sm">
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span>Avaliação Média</span>
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            </div>
            <p className="text-2xl font-bold text-[var(--text-main)] font-serif">
              5.0 <span className="text-xs text-amber-400 font-normal">★★★★★</span>
            </p>
            <span className="text-[11px] text-emerald-600 font-medium">Satisfação comprovada</span>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] space-y-1 shadow-sm">
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span>Clientes Atendidos</span>
              <Users className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} />
            </div>
            <p className="text-2xl font-bold text-[var(--text-main)] font-serif">
              {Math.max(portfolioData.clientsCount, portfolioData.projectsCount, 1)}
            </p>
            <span className="text-[11px] text-[var(--text-muted)]">Atendimento personalizado</span>
          </div>
        </section>

        {/* 3. PROJECT GALLERY (EXACT SEARCH BAR, CATEGORY PILLS AND CARDS FROM SCREENSHOT 2) */}
        <section className="space-y-5">
          {/* Section Header */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-[var(--text-main)] font-serif flex items-center gap-2">
                <Camera className="w-5 h-5" style={{ color: 'var(--theme-primary)' }} />
                <span>{currentNicheConfig.projectSectionTitle || 'Portfólio de Design & Criação'}</span>
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                {currentNicheConfig.projectSectionSubtitle || 'Identidades visuais, interfaces digitais, materiais editoriais e peças gráficas.'}
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Search Input */}
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por projeto, cliente ou material..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-xs text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--theme-primary)] transition-colors"
                />
              </div>

              {/* WhatsApp CTA Button */}
              {portfolioData.whatsapp && (
                <a
                  href={generateWhatsAppLink('Olá! Gostaria de fazer um orçamento com base nos projetos do portfólio.')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-black flex items-center gap-1.5 shadow-sm transition-all hover:brightness-110 whitespace-nowrap cursor-pointer"
                  style={{ backgroundColor: 'var(--theme-primary)' }}
                >
                  <MessageCircle className="w-3.5 h-3.5 fill-black" />
                  <span>Pedir Orçamento</span>
                </a>
              )}
            </div>
          </div>

          {/* Category Filter Pills (Exact Pills Style from Screenshot 2) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'text-black font-bold shadow-md'
                      : 'bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-color)]'
                  }`}
                  style={
                    isSelected
                      ? {
                          backgroundColor: 'var(--theme-primary)',
                        }
                      : undefined
                  }
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Projects Cards Grid */}
          {filteredProjects.length === 0 ? (
            <div className="text-center py-16 px-4 bg-[var(--bg-card)] border border-dashed border-[var(--border-color)] rounded-2xl space-y-3">
              <Camera className="w-10 h-10 mx-auto opacity-70" style={{ color: 'var(--theme-primary)' }} />
              <h3 className="text-base font-bold text-[var(--text-main)] font-serif">
                Nenhum projeto encontrado nesta categoria
              </h3>
              <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto">
                Tente selecionar outra categoria acima ou limpar a busca.
              </p>
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setSearchQuery('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-black shadow-md cursor-pointer transition-transform hover:scale-105"
                style={{ backgroundColor: 'var(--theme-primary)' }}
              >
                Ver Todos os Projetos
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((proj) => {
                const totalPhotos = (proj.images || []).length || 1;
                const hasBeforeAfter = Boolean(proj.beforeImage && proj.afterImage);

                return (
                  <div
                    key={proj.id}
                    className="group relative flex flex-col bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--theme-primary)]/60 rounded-2xl overflow-hidden shadow-lg transition-all duration-300 hover:-translate-y-1"
                  >
                    {/* Project Image & Overlay */}
                    <div
                      className="relative aspect-video sm:h-56 w-full overflow-hidden bg-[var(--bg-body)] cursor-pointer"
                      onClick={() => {
                        setSelectedProjectForModal(proj);
                        setActiveImageIndex(0);
                      }}
                    >
                      <img
                        src={proj.coverImage || proj.images?.[0] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80'}
                        alt={proj.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 opacity-70 group-hover:opacity-85 transition-opacity" />

                      {/* Status badge */}
                      <div className="absolute top-3 left-3 flex items-center gap-1.5">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide border shadow backdrop-blur-md bg-emerald-500/90 text-white border-emerald-400">
                          Aprovado & Entregue
                        </span>
                        {hasBeforeAfter && (
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold text-black border shadow"
                            style={{
                              backgroundColor: 'var(--theme-accent)',
                              borderColor: 'var(--theme-accent)',
                            }}
                          >
                            Antes & Depois
                          </span>
                        )}
                      </div>

                      {/* Photos count badge */}
                      <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-black/70 text-white text-[11px] font-medium backdrop-blur-md flex items-center gap-1">
                        <Camera className="w-3.5 h-3.5" style={{ color: 'var(--theme-primary)' }} />
                        <span>{totalPhotos} foto(s)</span>
                      </div>

                      {/* Quick Expand hover icon */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <div className="px-4 py-2 rounded-xl bg-black/80 text-white text-xs font-bold flex items-center gap-1.5 border border-white/20 shadow-2xl backdrop-blur-md">
                          <Eye className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} /> Ver Fotos em Alta
                        </div>
                      </div>
                    </div>

                    {/* Project Details */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className="text-[11px] font-semibold uppercase tracking-wider"
                            style={{ color: 'var(--theme-accent)' }}
                          >
                            {proj.categoryLabel || proj.category.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                            <Layers className="w-3 h-3" style={{ color: 'var(--theme-primary)' }} />{' '}
                            {totalPhotos} foto(s)
                          </span>
                        </div>

                        <h3
                          onClick={() => {
                            setSelectedProjectForModal(proj);
                            setActiveImageIndex(0);
                          }}
                          className="text-lg font-bold text-[var(--text-main)] font-serif leading-snug hover:text-[var(--theme-primary)] transition-colors cursor-pointer"
                        >
                          {proj.title}
                        </h3>

                        <div className="flex items-center justify-between text-xs text-[var(--text-muted)] pt-1">
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5" style={{ color: 'var(--theme-primary)' }} /> Cliente Atendido
                          </span>
                          {proj.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" style={{ color: 'var(--theme-accent)' }} /> {proj.location}
                            </span>
                          )}
                        </div>

                        {proj.description && (
                          <p className="text-xs text-[var(--text-muted)] line-clamp-2 pt-1 font-sans">
                            {proj.description}
                          </p>
                        )}
                      </div>

                      {/* Tags preview */}
                      {proj.tags && proj.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {proj.tags.slice(0, 3).map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-[var(--bg-card-secondary)] text-[10px] text-[var(--text-main)] border border-[var(--border-color)]"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Bottom Actions Bar */}
                      <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-between gap-2">
                        <button
                          onClick={() => {
                            setSelectedProjectForModal(proj);
                            setActiveImageIndex(0);
                          }}
                          className="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs"
                          style={{
                            backgroundColor: 'var(--theme-badge-bg)',
                            color: 'var(--theme-badge-text)',
                            border: '1px solid var(--theme-badge-border)',
                          }}
                          title="Ver fotos do projeto"
                        >
                          Ver Fotos
                        </button>

                        {portfolioData.whatsapp && (
                          <a
                            href={generateWhatsAppLink(`Olá! Vi o projeto "${proj.title}" no seu portfólio e gostaria de um orçamento parecido.`)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-lg bg-[var(--bg-card-secondary)] hover:bg-[var(--bg-card-hover)] text-xs font-semibold text-[var(--text-main)] border border-[var(--border-color)] transition-colors flex items-center gap-1.5"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Quero um Parecido</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 4. FOOTER CONVERSION BANNER */}
        <section className="relative overflow-hidden rounded-3xl bg-[var(--bg-card)] border border-[var(--border-color)] p-8 sm:p-12 text-center space-y-6 shadow-xl">
          <div className="max-w-2xl mx-auto space-y-3">
            <span
              className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full"
              style={{
                backgroundColor: 'var(--theme-badge-bg)',
                color: 'var(--theme-badge-text)',
                border: '1px solid var(--theme-badge-border)',
              }}
            >
              Vamos Trabalhar Juntos?
            </span>
            <h2 className="text-2xl sm:text-4xl font-serif font-bold text-[var(--text-main)]">
              Pronto para transformar o seu projeto em realidade?
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-xl mx-auto leading-relaxed">
              Entre em contato diretamente com {portfolioData.officeName} para tirar dúvidas, receber uma proposta personalizada ou agendar um atendimento.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {portfolioData.whatsapp && (
              <a
                href={generateWhatsAppLink('Olá! Gostaria de solicitar um orçamento para o meu projeto.')}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-black font-bold text-sm shadow-xl flex items-center gap-2 transition-transform hover:scale-105"
              >
                <MessageCircle className="w-4 h-4 fill-black" />
                <span>Conversar no WhatsApp</span>
              </a>
            )}

            <button
              onClick={handleCopyLink}
              className="px-5 py-3 rounded-2xl bg-[var(--bg-card-secondary)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-main)] flex items-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <Share2 className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} />
              <span>Compartilhar Página</span>
            </button>
          </div>
        </section>
      </main>

      {/* 5. PROJECT DETAIL & PHOTO VIEWER MODAL */}
      {selectedProjectForModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-[var(--border-color)] flex items-center justify-between gap-4">
              <div>
                <span
                  className="text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: 'var(--theme-accent)' }}
                >
                  {selectedProjectForModal.categoryLabel || selectedProjectForModal.category}
                </span>
                <h3 className="text-base sm:text-lg font-serif font-bold text-[var(--text-main)]">
                  {selectedProjectForModal.title}
                </h3>
              </div>

              <button
                onClick={() => setSelectedProjectForModal(null)}
                className="p-2 rounded-xl bg-[var(--bg-card-secondary)] hover:bg-[var(--bg-card-hover)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-color)] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {/* Photo Showcase Carousel */}
              {(() => {
                const photosList = selectedProjectForModal.images && selectedProjectForModal.images.length > 0
                  ? selectedProjectForModal.images
                  : [selectedProjectForModal.coverImage].filter(Boolean);

                const currentPhoto = photosList[activeImageIndex] || selectedProjectForModal.coverImage;

                return (
                  <div className="space-y-3">
                    <div className="relative aspect-video sm:h-[420px] w-full rounded-2xl overflow-hidden bg-black/40 border border-[var(--border-color)] flex items-center justify-center">
                      <img
                        src={currentPhoto}
                        alt={selectedProjectForModal.title}
                        className="w-full h-full object-contain"
                      />

                      {photosList.length > 1 && (
                        <>
                          <button
                            onClick={() => setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : photosList.length - 1))}
                            className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/70 text-white hover:bg-black/90 transition-all border border-white/20 cursor-pointer shadow-lg"
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => setActiveImageIndex((prev) => (prev < photosList.length - 1 ? prev + 1 : 0))}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/70 text-white hover:bg-black/90 transition-all border border-white/20 cursor-pointer shadow-lg"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </>
                      )}

                      <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-black/70 text-white text-xs font-medium backdrop-blur-md">
                        {activeImageIndex + 1} de {photosList.length}
                      </div>
                    </div>

                    {/* Thumbnails */}
                    {photosList.length > 1 && (
                      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                        {photosList.map((img, idx) => (
                          <button
                            key={idx}
                            onClick={() => setActiveImageIndex(idx)}
                            className={`relative w-20 h-14 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                              activeImageIndex === idx
                                ? 'border-[var(--theme-primary)] scale-105 shadow-md'
                                : 'border-transparent opacity-60 hover:opacity-100'
                            }`}
                          >
                            <img src={img} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Before & After comparison if available */}
              {selectedProjectForModal.beforeImage && selectedProjectForModal.afterImage && (
                <div className="space-y-2 pt-2 border-t border-[var(--border-color)]">
                  <h4 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--theme-accent)' }} />
                    <span>Comparativo Antes & Depois</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-[var(--text-muted)] block">Antes da Intervenção</span>
                      <div className="aspect-video rounded-xl overflow-hidden border border-[var(--border-color)]">
                        <img src={selectedProjectForModal.beforeImage} alt="Antes" className="w-full h-full object-cover" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold block" style={{ color: 'var(--theme-accent)' }}>Resultado Final (Depois)</span>
                      <div className="aspect-video rounded-xl overflow-hidden border border-[var(--border-color)]">
                        <img src={selectedProjectForModal.afterImage} alt="Depois" className="w-full h-full object-cover" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Project Description & Specs */}
              <div className="space-y-3 pt-2 border-t border-[var(--border-color)]">
                {selectedProjectForModal.description && (
                  <div>
                    <h4 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider mb-1">
                      Sobre o Projeto
                    </h4>
                    <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed whitespace-pre-line">
                      {selectedProjectForModal.description}
                    </p>
                  </div>
                )}

                {selectedProjectForModal.tags && selectedProjectForModal.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {selectedProjectForModal.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-[var(--bg-card-secondary)] text-xs text-[var(--text-main)] border border-[var(--border-color)] font-medium"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-[var(--border-color)] bg-[var(--bg-card-secondary)]/50 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-[var(--text-muted)]">
                Gostou deste trabalho? Converse diretamente com o estúdio.
              </div>

              {portfolioData.whatsapp && (
                <a
                  href={generateWhatsAppLink(`Olá! Vi o projeto "${selectedProjectForModal.title}" no seu portfólio oficial e gostaria de um orçamento similar.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-black font-bold text-xs flex items-center gap-2 shadow-md transition-transform hover:scale-105"
                >
                  <MessageCircle className="w-4 h-4 fill-black" />
                  <span>Quero um Projeto Parecido no WhatsApp</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
