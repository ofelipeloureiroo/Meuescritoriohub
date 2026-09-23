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
  Image as ImageIcon,
  Instagram,
  Layers,
  Mail,
  MapPin,
  Maximize2,
  MessageCircle,
  Phone,
  Search,
  Share2,
  Sparkles,
  Star,
  X,
} from 'lucide-react';
import {
  PublicPortfolioData,
  PublicPortfolioProject,
  fetchPublicPortfolio,
  buildPublicPortfolioData,
} from '../../services/publicPortfolioService';
import { buildInstagramUrl, cleanInstagramHandle } from '../../utils/instagram';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';

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

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setLoading(true);
      try {
        const targetId = urlUserParam || user?.uid;
        if (targetId) {
          const fetched = await fetchPublicPortfolio(targetId);
          if (fetched && isMounted) {
            setPortfolioData(fetched);
            setLoading(false);
            return;
          }
        }

        // If logged in or in preview mode, construct from current context
        if (architectProfile && isMounted) {
          const fallback = buildPublicPortfolioData(
            user?.uid || 'preview',
            architectProfile,
            architectureProjects,
            clients?.length || 0
          );
          setPortfolioData(fallback);
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

  // Unique categories from projects
  const availableCategories = useMemo(() => {
    if (!portfolioData?.projects) return [];
    const map = new Map<string, string>();
    portfolioData.projects.forEach((p) => {
      if (p.category) {
        map.set(p.category, p.categoryLabel || p.category);
      }
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [portfolioData]);

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
    const defaultText = `Olá! Estive olhando o portfólio oficial de ${portfolioData?.officeName || 'vocês'} e gostaria de conversar sobre um projeto / orçamento.`;
    const text = encodeURIComponent(customText || defaultText);
    if (rawPhone) {
      const fullPhone = rawPhone.length <= 11 ? `55${rawPhone}` : rawPhone;
      return `https://wa.me/${fullPhone}?text=${text}`;
    }
    return `https://api.whatsapp.com/send?text=${text}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#100e0d] text-[#fcf8f5] flex items-center justify-center p-4 font-sans">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-3 border-[#c58a4b] border-t-transparent rounded-full animate-spin mx-auto shadow-lg" />
          <h2 className="text-lg font-serif font-bold text-[#fcf8f5] tracking-wide">
            Carregando Portfólio...
          </h2>
          <p className="text-xs text-[#a89c93]">Preparando a galeria de projetos e apresentações</p>
        </div>
      </div>
    );
  }

  if (!portfolioData) {
    return (
      <div className="min-h-screen bg-[#100e0d] text-[#fcf8f5] flex items-center justify-center p-4 font-sans">
        <div className="bg-[#181513] border border-[#2e2621] p-8 rounded-3xl max-w-md text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <Compass className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-serif font-bold text-[#fcf8f5]">Portfólio em Construção</h2>
          <p className="text-xs text-[#a89c93] leading-relaxed">
            Este espaço está sendo preparado com os projetos mais recentes. Volte em instantes para conferir.
          </p>
          <Link
            to="/app"
            className="inline-block px-5 py-2.5 rounded-xl bg-[#c58a4b] text-black font-bold text-xs shadow-lg transition-transform hover:scale-105"
          >
            Acessar Área do Escritório
          </Link>
        </div>
      </div>
    );
  }

  const effectiveInstagramUrl = buildInstagramUrl(portfolioData.instagramHandle, portfolioData.instagramUrl);
  const displayInstagram = cleanInstagramHandle(portfolioData.instagramHandle || portfolioData.instagramUrl) || '@instagram';

  return (
    <div className="min-h-screen bg-[#0d0b0a] text-[#fcf8f5] font-sans antialiased selection:bg-[#c58a4b]/30 selection:text-white pb-24">
      {/* Toast Notification */}
      {copiedLinkToast && (
        <div className="fixed top-6 right-6 z-50 bg-[#1f1a16] border border-[#c58a4b] text-[#fcf8f5] px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top duration-200">
          <div className="w-7 h-7 rounded-full bg-[#c58a4b]/20 flex items-center justify-center text-[#c58a4b]">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-xs font-medium">
            <span className="font-bold text-[#c58a4b] block">Link Copiado!</span>
            Pronto para enviar aos seus clientes no WhatsApp ou redes.
          </div>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#120f0d]/90 backdrop-blur-md border-b border-[#26201b] transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {portfolioData.photoUrl ? (
              <img
                src={portfolioData.photoUrl}
                alt={portfolioData.officeName}
                className="w-9 h-9 rounded-full object-cover border border-[#c58a4b]/40 shadow-sm"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#c58a4b]/20 border border-[#c58a4b]/40 flex items-center justify-center text-[#c58a4b] font-serif font-bold text-sm">
                {portfolioData.officeName.charAt(0)}
              </div>
            )}
            <div>
              <span className="font-serif font-bold text-sm sm:text-base text-[#fcf8f5] tracking-tight block truncate max-w-[200px] sm:max-w-xs">
                {portfolioData.officeName}
              </span>
              <span className="text-[10px] text-[#a89c93] font-medium block">
                {portfolioData.title}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-[#1c1815] hover:bg-[#28221e] border border-[#3d342f] text-xs font-semibold text-[#fcf8f5] flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              title="Copiar link deste portfólio"
            >
              <Share2 className="w-3.5 h-3.5 text-[#c58a4b]" />
              <span className="hidden sm:inline">Compartilhar</span>
            </button>

            {portfolioData.whatsapp && (
              <a
                href={generateWhatsAppLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-black font-bold text-xs flex items-center gap-1.5 transition-transform hover:scale-105 shadow-md"
              >
                <MessageCircle className="w-3.5 h-3.5 fill-black" />
                <span>Falar no WhatsApp</span>
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 space-y-12">
        {/* HERO SECTION / APRESENTAÇÃO */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#181412] via-[#14100e] to-[#0f0c0b] border border-[#2b241e] p-6 sm:p-10 shadow-2xl">
          <div
            className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-20"
            style={{ backgroundColor: '#c58a4b' }}
          />
          <div
            className="absolute bottom-0 left-1/3 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-15"
            style={{ backgroundColor: '#e2a96f' }}
          />

          <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8">
            {/* Avatar / Photo */}
            <div className="relative shrink-0">
              <div
                className="w-32 h-32 sm:w-40 sm:h-40 rounded-full p-1.5 shadow-2xl"
                style={{
                  background: 'linear-gradient(135deg, #e2a96f, #c58a4b, #8a5829)',
                }}
              >
                <div className="w-full h-full rounded-full overflow-hidden bg-[#14110f] border-2 border-[#1c1815]">
                  {portfolioData.photoUrl ? (
                    <img
                      src={portfolioData.photoUrl}
                      alt={portfolioData.officeName}
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#1f1a16] text-[#c58a4b] font-serif font-bold text-4xl">
                      {portfolioData.officeName.charAt(0)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bio & Details */}
            <div className="space-y-3.5 text-center md:text-left flex-1">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#fcf8f5] tracking-tight">
                  {portfolioData.officeName}
                </h1>
                <span className="px-3.5 py-1 rounded-full text-xs font-semibold bg-[#c58a4b]/15 text-[#e2a96f] border border-[#c58a4b]/30">
                  {portfolioData.title}
                </span>
              </div>

              <p className="text-sm font-medium text-[#fcf8f5] flex items-center justify-center md:justify-start gap-1.5">
                <MapPin className="w-4 h-4 text-[#c58a4b]" /> {portfolioData.location}
              </p>

              <div className="text-xs sm:text-sm text-[#c4b6ab] max-w-2xl leading-relaxed space-y-1">
                <p>
                  <strong className="text-[#fcf8f5] font-semibold">{portfolioData.specialty}</strong>
                </p>
                <p className="italic text-[#a89c93]">
                  ✨ {portfolioData.tagline}
                </p>
                <p className="text-[#968980]">
                  {portfolioData.description}
                </p>
              </div>

              {/* Social & Contact Bar */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
                {portfolioData.instagramHandle && (
                  <a
                    href={effectiveInstagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1e1916] hover:bg-[#28211d] text-xs font-medium text-[#fcf8f5] border border-[#382f28] transition-colors"
                  >
                    <Instagram className="w-4 h-4 text-[#e2a96f]" />
                    <span>{displayInstagram}</span>
                    <ExternalLink className="w-3 h-3 text-[#a89c93]" />
                  </a>
                )}

                <div className="px-3.5 py-1.5 rounded-xl bg-[#1e1916] border border-[#382f28] text-xs text-[#a89c93] flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span className="font-bold text-[#fcf8f5]">5.0</span>
                  <span>Avaliação de Clientes</span>
                </div>

                {portfolioData.whatsapp && (
                  <a
                    href={generateWhatsAppLink()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#c58a4b] hover:bg-[#b0793e] text-black font-bold text-xs shadow-md transition-all hover:scale-105"
                  >
                    <MessageCircle className="w-3.5 h-3.5 fill-black" />
                    <span>Solicitar Proposta</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* PILARES / DIFERENCIAIS DE CONFIANÇA */}
          <div className="mt-8 pt-6 border-t border-[#26201b] grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-[#0f0c0b]/80 border border-[#26201b] flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#c58a4b]/15 border border-[#c58a4b]/30 flex items-center justify-center text-[#e2a96f] font-serif font-bold text-base shrink-0">
                💎
              </div>
              <div>
                <span className="text-xs font-bold text-[#fcf8f5] block font-serif">Propostas Transparentes</span>
                <span className="text-[11px] text-[#a89c93]">Escopo detalhado e condições alinhadas desde o início</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0f0c0b]/80 border border-[#26201b] flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-base shrink-0">
                ⭐
              </div>
              <div>
                <span className="text-xs font-bold text-[#fcf8f5] block font-serif">Qualidade de Alto Padrão</span>
                <span className="text-[11px] text-[#a89c93]">Acompanhamento e soluções estéticas exclusivas</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0f0c0b]/80 border border-[#26201b] flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-base shrink-0">
                📋
              </div>
              <div>
                <span className="text-xs font-bold text-[#fcf8f5] block font-serif">Compromisso com Prazos</span>
                <span className="text-[11px] text-[#a89c93]">Entregas pontuais e cronograma rigoroso</span>
              </div>
            </div>
          </div>
        </section>

        {/* METRICS OF AUTHORITY (ZERO FINANCIAL DATA) */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-[#14100e] border border-[#26201b] space-y-1 shadow-sm">
            <div className="flex items-center justify-between text-xs text-[#a89c93]">
              <span>Projetos Entregues</span>
              <Building className="w-4 h-4 text-[#c58a4b]" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-[#fcf8f5] font-serif">
              {portfolioData.projectsCount || portfolioData.projects.length}
            </p>
            <span className="text-[11px] text-[#c58a4b] font-medium">Concluídos e aprovados</span>
          </div>

          <div className="p-5 rounded-2xl bg-[#14100e] border border-[#26201b] space-y-1 shadow-sm">
            <div className="flex items-center justify-between text-xs text-[#a89c93]">
              <span>Clientes Atendidos</span>
              <Heart className="w-4 h-4 text-rose-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-[#fcf8f5] font-serif">
              {Math.max(portfolioData.clientsCount, portfolioData.projectsCount)}
            </p>
            <span className="text-[11px] text-[#a89c93]">Satisfação comprovada</span>
          </div>

          <div className="p-5 rounded-2xl bg-[#14100e] border border-[#26201b] space-y-1 shadow-sm">
            <div className="flex items-center justify-between text-xs text-[#a89c93]">
              <span>Avaliação Média</span>
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-[#fcf8f5] font-serif">
              5.0 <span className="text-xs text-amber-400 font-normal">★★★★★</span>
            </p>
            <span className="text-[11px] text-emerald-400 font-medium">Nota máxima</span>
          </div>

          <div className="p-5 rounded-2xl bg-[#14100e] border border-[#26201b] space-y-1 shadow-sm">
            <div className="flex items-center justify-between text-xs text-[#a89c93]">
              <span>{portfolioData.niche === 'arquitetura' ? 'Área Projetada' : 'Especialidade'}</span>
              <Layers className="w-4 h-4 text-[#e2a96f]" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-[#fcf8f5] font-serif">
              {portfolioData.totalM2 ? `${portfolioData.totalM2} m²` : portfolioData.nicheLabel || 'Projetos'}
            </p>
            <span className="text-[11px] text-[#a89c93]">
              {portfolioData.totalM2 ? 'Metragem total executada' : 'Atendimento personalizado'}
            </span>
          </div>
        </section>

        {/* PORTFOLIO & GALLERY SECTION */}
        <section className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-[#26201b]">
            <div>
              <div className="flex items-center gap-2 text-[#c58a4b] text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>Galeria de Trabalhos Recentes</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#fcf8f5] mt-1">
                Portfólio de Projetos & Criações
              </h2>
              <p className="text-xs sm:text-sm text-[#a89c93] mt-1">
                Explore as soluções, conceitos visuais e projetos entregues pelo nosso estúdio.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-[#a89c93] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por projeto ou tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#14100e] border border-[#26201b] text-xs text-[#fcf8f5] placeholder-[#6e635b] focus:outline-none focus:border-[#c58a4b] transition-colors"
              />
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-[#c58a4b] text-black shadow-md font-bold'
                  : 'bg-[#14100e] text-[#a89c93] hover:text-[#fcf8f5] border border-[#26201b]'
              }`}
            >
              Todos os Projetos ({portfolioData.projects.length})
            </button>

            {availableCategories.map((cat) => {
              const count = portfolioData.projects.filter((p) => p.category === cat.value).length;
              return (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    selectedCategory === cat.value
                      ? 'bg-[#c58a4b] text-black shadow-md font-bold'
                      : 'bg-[#14100e] text-[#a89c93] hover:text-[#fcf8f5] border border-[#26201b]'
                  }`}
                >
                  {cat.label} ({count})
                </button>
              );
            })}
          </div>

          {/* Projects Grid */}
          {filteredProjects.length === 0 ? (
            <div className="text-center py-16 bg-[#14100e] rounded-3xl border border-[#26201b] space-y-3">
              <Camera className="w-10 h-10 text-[#6e635b] mx-auto" />
              <p className="text-sm font-serif text-[#fcf8f5]">Nenhum projeto encontrado nesta categoria</p>
              <p className="text-xs text-[#a89c93]">Tente selecionar outra categoria ou limpar a busca</p>
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setSearchQuery('');
                }}
                className="px-4 py-2 rounded-xl bg-[#1c1815] border border-[#3d342f] text-xs font-bold text-[#c58a4b] hover:bg-[#28221e]"
              >
                Ver Todos os Projetos
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => {
                const photosCount = (project.images?.length || 0) + (project.coverImage ? 1 : 0);
                const cover = project.coverImage || (project.images && project.images[0]) || '';

                return (
                  <div
                    key={project.id}
                    onClick={() => {
                      setSelectedProjectForModal(project);
                      setActiveImageIndex(0);
                    }}
                    className="group bg-[#14100e] rounded-3xl border border-[#26201b] hover:border-[#c58a4b]/60 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 cursor-pointer flex flex-col"
                  >
                    {/* Image Box */}
                    <div className="relative aspect-[4/3] bg-[#1c1815] overflow-hidden">
                      {cover ? (
                        <img
                          src={cover}
                          alt={project.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#6e635b]">
                          <ImageIcon className="w-12 h-12" />
                        </div>
                      )}

                      {/* Top Overlay Badge */}
                      <div className="absolute top-3 left-3 flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#14100e]/85 backdrop-blur-md text-[#e2a96f] border border-[#c58a4b]/30">
                          {project.categoryLabel || project.category}
                        </span>
                      </div>

                      {/* Photos Count Badge */}
                      {photosCount > 1 && (
                        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/75 backdrop-blur-md text-[#fcf8f5] flex items-center gap-1 border border-white/10">
                          <Camera className="w-3 h-3" />
                          <span>{photosCount} fotos</span>
                        </div>
                      )}

                      {/* Hover Action Prompt */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="px-4 py-2 rounded-xl bg-[#c58a4b] text-black font-bold text-xs flex items-center gap-1.5 shadow-xl transform scale-95 group-hover:scale-100 transition-transform">
                          <Eye className="w-4 h-4" />
                          Ver Projeto Completo
                        </span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <h3 className="font-serif font-bold text-lg text-[#fcf8f5] group-hover:text-[#c58a4b] transition-colors leading-snug line-clamp-1">
                          {project.title}
                        </h3>

                        {project.location && (
                          <div className="flex items-center gap-1.5 text-xs text-[#a89c93]">
                            <MapPin className="w-3.5 h-3.5 text-[#c58a4b]" />
                            <span>{project.location}</span>
                          </div>
                        )}

                        {project.description && (
                          <p className="text-xs text-[#8c8077] line-clamp-2 leading-relaxed">
                            {project.description}
                          </p>
                        )}
                      </div>

                      {/* Tags & Action Button */}
                      <div className="pt-2 border-t border-[#26201b]/80 flex items-center justify-between gap-2">
                        <div className="flex flex-wrap gap-1.5">
                          {(project.tags || []).slice(0, 2).map((t, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#1f1a16] text-[#a89c93] border border-[#2b241e]"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>

                        <span className="text-xs font-bold text-[#c58a4b] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                          <span>Conferir</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* CTA FOOTER CARD / SOLICITAR ORÇAMENTO */}
        <section className="rounded-3xl bg-gradient-to-r from-[#181412] via-[#1f1915] to-[#181412] border border-[#382f28] p-8 sm:p-12 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div
            className="absolute -top-24 -left-24 w-72 h-72 rounded-full blur-3xl pointer-events-none opacity-20"
            style={{ backgroundColor: '#c58a4b' }}
          />

          <div className="max-w-2xl mx-auto space-y-3 relative z-10">
            <span className="text-[11px] font-bold tracking-widest uppercase text-[#c58a4b] block">
              VAMOS TRABALHAR JUNTOS?
            </span>
            <h2 className="text-2xl sm:text-4xl font-serif font-bold text-[#fcf8f5]">
              Pronto para transformar o seu espaço ou projeto?
            </h2>
            <p className="text-xs sm:text-sm text-[#a89c93] leading-relaxed">
              Entre em contato diretamente com o nosso estúdio para tirar dúvidas, receber uma proposta personalizada ou agendar um atendimento.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 relative z-10">
            {portfolioData.whatsapp && (
              <a
                href={generateWhatsAppLink('Olá! Gostei muito dos projetos do portfólio e gostaria de solicitar um orçamento.')}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3.5 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-black font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xl hover:scale-105 active:scale-95 transition-all"
              >
                <MessageCircle className="w-4 h-4 fill-black" />
                <span>Conversar pelo WhatsApp</span>
              </a>
            )}

            {portfolioData.instagramHandle && (
              <a
                href={effectiveInstagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3.5 rounded-2xl bg-[#1c1815] hover:bg-[#28221e] border border-[#3d342f] text-[#fcf8f5] font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md"
              >
                <Instagram className="w-4 h-4 text-[#e2a96f]" />
                <span>Seguir no Instagram</span>
              </a>
            )}

            <button
              onClick={handleCopyLink}
              className="px-5 py-3.5 rounded-2xl bg-[#14100e] hover:bg-[#1c1815] border border-[#26201b] text-[#a89c93] hover:text-[#fcf8f5] text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-[#c58a4b]" />
              <span>Compartilhar Página</span>
            </button>
          </div>
        </section>
      </main>

      {/* PROJECT DETAIL MODAL FOR CLIENT */}
      {selectedProjectForModal && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setSelectedProjectForModal(null)}
        >
          <div
            className="bg-[#14100e] border border-[#382f28] w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl relative my-auto flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#26201b] flex items-center justify-between bg-[#181412]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#c58a4b]">
                  {selectedProjectForModal.categoryLabel || selectedProjectForModal.category}
                </span>
                <h3 className="text-lg sm:text-xl font-serif font-bold text-[#fcf8f5] leading-snug">
                  {selectedProjectForModal.title}
                </h3>
              </div>

              <button
                onClick={() => setSelectedProjectForModal(null)}
                className="w-9 h-9 rounded-full bg-[#1f1a16] border border-[#382f28] text-[#a89c93] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Image Gallery Viewer */}
              {(() => {
                const allImages = [
                  selectedProjectForModal.coverImage,
                  ...(selectedProjectForModal.images || []),
                ].filter(Boolean);

                const currentImg = allImages[activeImageIndex] || allImages[0];

                return (
                  <div className="space-y-3">
                    <div className="relative aspect-[16/9] sm:aspect-[21/9] bg-[#0d0b0a] rounded-2xl overflow-hidden border border-[#26201b] flex items-center justify-center">
                      {currentImg ? (
                        <img
                          src={currentImg}
                          alt={selectedProjectForModal.title}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <ImageIcon className="w-16 h-16 text-[#4a423d]" />
                      )}

                      {/* Navigation Arrows if Multiple Images */}
                      {allImages.length > 1 && (
                        <>
                          <button
                            onClick={() =>
                              setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : allImages.length - 1))
                            }
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center border border-white/20 transition-all cursor-pointer"
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() =>
                              setActiveImageIndex((prev) => (prev < allImages.length - 1 ? prev + 1 : 0))
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center border border-white/20 transition-all cursor-pointer"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </>
                      )}
                    </div>

                    {/* Thumbnail Strip */}
                    {allImages.length > 1 && (
                      <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        {allImages.map((img, idx) => (
                          <button
                            key={idx}
                            onClick={() => setActiveImageIndex(idx)}
                            className={`w-16 h-12 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                              activeImageIndex === idx
                                ? 'border-[#c58a4b] scale-105'
                                : 'border-[#26201b] opacity-60 hover:opacity-100'
                            }`}
                          >
                            <img src={img} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Project Info */}
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-4 text-xs text-[#a89c93]">
                  {selectedProjectForModal.location && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-[#c58a4b]" />
                      {selectedProjectForModal.location}
                    </span>
                  )}
                  {selectedProjectForModal.areaM2 && (
                    <span className="flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-[#e2a96f]" />
                      {selectedProjectForModal.areaM2} m²
                    </span>
                  )}
                  {selectedProjectForModal.year && (
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      Ano: {selectedProjectForModal.year}
                    </span>
                  )}
                </div>

                {selectedProjectForModal.description && (
                  <div className="p-4 rounded-2xl bg-[#0f0c0b] border border-[#26201b] space-y-1.5">
                    <span className="text-[11px] font-bold text-[#c58a4b] uppercase tracking-wider block">
                      SOBRE ESTE PROJETO
                    </span>
                    <p className="text-xs sm:text-sm text-[#c4b6ab] leading-relaxed whitespace-pre-line">
                      {selectedProjectForModal.description}
                    </p>
                  </div>
                )}

                {selectedProjectForModal.tags && selectedProjectForModal.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedProjectForModal.tags.map((t, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-lg bg-[#1f1a16] text-[#a89c93] border border-[#2b241e] text-xs font-medium"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer CTA */}
            <div className="px-6 py-4 border-t border-[#26201b] bg-[#181412] flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-[#a89c93] text-center sm:text-left">
                Gostou deste estilo? Solicite uma proposta para a sua necessidade.
              </span>

              {portfolioData.whatsapp && (
                <a
                  href={generateWhatsAppLink(
                    `Olá! Vi o projeto "${selectedProjectForModal.title}" no seu portfólio e gostaria de saber como funciona para desenvolver um projeto similar.`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-black font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-transform hover:scale-105"
                >
                  <MessageCircle className="w-4 h-4 fill-black" />
                  <span>Quero um Projeto Parecido</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
