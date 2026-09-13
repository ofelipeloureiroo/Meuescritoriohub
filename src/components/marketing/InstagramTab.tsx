import React, { useState, useEffect, useMemo } from 'react';
import {
  Instagram,
  Sparkles,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  Upload,
  Image as ImageIcon,
  Film,
  Layers,
  CircleDot,
  Trash2,
  Edit2,
  CheckCircle2,
  Calendar as CalendarIcon,
  User,
  FolderOpen,
  Wand2,
  Sliders,
  Check,
  Bookmark,
  RotateCw,
  Lightbulb,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinanceContext';
import { useTeamMembers } from '../../hooks/useTeamMembers';

export type PostType = 'Feed' | 'Reels' | 'Carrossel' | 'Stories';
export type PostCategory = 'Educativo' | 'Portfólio' | 'Bastidores' | 'Antes e Depois' | 'Dicas' | 'Promocional';
export type PostPriority = 'Baixa' | 'Média' | 'Alta';
export type PostStatus = 'Planejado' | 'Hoje' | 'Postado' | 'Atrasado';

export interface InstagramPost {
  id: string;
  title: string;
  imageUrl?: string;
  description: string;
  type: PostType;
  category: PostCategory;
  priority: PostPriority;
  scheduledDate: string; // YYYY-MM-DD
  responsibleId?: string;
  responsibleName?: string;
  projectId?: string;
  projectName?: string;
  status: PostStatus;
  createdAt: string;
}

export interface StoryStep {
  number: number;
  typeLabel: string;
  instruction: string;
  quote?: string;
  pollCard?: {
    question: string;
    options: string[];
    tip: string;
  };
}

export interface RichInsight {
  id: string;
  categoryTag: string;
  formatTag: string;
  title: string;
  subtitle: string;
  bgImageUrl: string;
  stories: StoryStep[];
  visualDirection: string[];
}

const RICH_INSIGHTS: RichInsight[] = [
  {
    id: 'insight_1',
    title: 'Detalhes que falam por si',
    subtitle: 'Mostre o material que traduz sua assinatura no projeto da vez.',
    categoryTag: 'ARQUITETURA REAL',
    formatTag: 'Stories · 3',
    bgImageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1600&auto=format&fit=crop',
    stories: [
      {
        number: 1,
        typeLabel: 'STORY 1 · FOTO',
        instruction: '📷 Tire uma foto macro da textura de um material que você está especificando agora.',
        quote: '"Textura que dura."',
      },
      {
        number: 2,
        typeLabel: 'STORY 2 · VÍDEO',
        instruction: '🎥 Grave um micro-vídeo girando uma amostra na mesa para mostrar o brilho ou acabamento.',
        quote: '"O tato no concreto."',
      },
      {
        number: 3,
        typeLabel: 'STORY 3 · ENQUETE',
        instruction: '📊 Com uma foto do material em uma superfície, pergunte sobre a sensação que ele transmite.',
        pollCard: {
          question: 'Qual a primeira sensação?',
          options: ['Aconchego', 'Sofisticação'],
          tip: 'Escolha opções que reforcem a percepção de valor.',
        },
      },
    ],
    visualDirection: ['textura', 'luz natural', 'sofisticação discreta'],
  },
  {
    id: 'insight_2',
    title: 'Do Conceito 3D à Entrega Real',
    subtitle: 'Revele a evolução de um ambiente comparando a maquete eletrônica com a obra finalizada.',
    categoryTag: 'PORTFÓLIO & PROCESSO',
    formatTag: 'Stories · 3',
    bgImageUrl: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=1600&auto=format&fit=crop',
    stories: [
      {
        number: 1,
        typeLabel: 'STORY 1 · VÍDEO',
        instruction: '🎬 Grave o projeto no software 3D fazendo o movimento de câmera que será repetido na obra.',
        quote: '"O sonho desenhado."',
      },
      {
        number: 2,
        typeLabel: 'STORY 2 · FOTO',
        instruction: '📸 Mostre a foto real do mesmo ângulo com a marcenaria e iluminação finalizadas.',
        quote: '"Fidelidade em cada detalhe."',
      },
      {
        number: 3,
        typeLabel: 'STORY 3 · ENQUETE',
        instruction: '📊 Pergunte aos seguidores o que mais chamou atenção na fidelidade do projeto.',
        pollCard: {
          question: 'O render 3D ficou idêntico à realidade?',
          options: ['Melhor que o render!', 'Exatamente igual'],
          tip: 'Mostre a precisão do seu acompanhamento de obra.',
        },
      },
    ],
    visualDirection: ['alinhamento', 'fidelidade visual', 'iluminação cênica'],
  },
  {
    id: 'insight_3',
    title: '5 Segredos da Iluminação Indireta',
    subtitle: 'Ensine como fitas de LED e perfis de embutir valorizam o painel ripado e a cabeceira.',
    categoryTag: 'DICAS & CONTEÚDO',
    formatTag: 'Stories · 3',
    bgImageUrl: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?q=80&w=1600&auto=format&fit=crop',
    stories: [
      {
        number: 1,
        typeLabel: 'STORY 1 · FOTO',
        instruction: '💡 Foto da suíte máster à noite somente com a iluminação de destaque acesa.',
        quote: '"Aconchego sem ofuscar."',
      },
      {
        number: 2,
        typeLabel: 'STORY 2 · VÍDEO',
        instruction: '🎥 Registre a troca do clima do ambiente alternando os circuitos de iluminação.',
        quote: '"Luz na medida certa."',
      },
      {
        number: 3,
        typeLabel: 'STORY 3 · ENQUETE',
        instruction: '📊 Teste a preferência de temperatura de cor dos seus potenciais clientes.',
        pollCard: {
          question: 'Qual temperatura de cor você prefere no quarto?',
          options: ['Luz Quente (2700K)', 'Luz Neutra (4000K)'],
          tip: 'Ajudar seu público a decidir aumenta a autoridade do escritório.',
        },
      },
    ],
    visualDirection: ['temperatura de cor', 'aconchego', 'perfil de led'],
  },
];

const SUGGESTED_POST_IDEAS = [
  {
    title: '5 Erros Comuns na Reforma da Cozinha',
    type: 'Carrossel' as PostType,
    category: 'Dicas' as PostCategory,
    description: 'Carrossel explicativo com soluções práticas para evitar dores de cabeça no planejamento de móveis e hidráulica.',
  },
  {
    title: 'Antes & Depois: Sala Integrada Modernizada',
    type: 'Feed' as PostType,
    category: 'Antes e Depois' as PostCategory,
    description: 'Fotos comparativas mostrando a evolução do conceito até a produção final do ambiente.',
  },
  {
    title: 'Bastidores da Escolha de Revestimentos',
    type: 'Reels' as PostType,
    category: 'Bastidores' as PostCategory,
    description: 'Reels dinâmico gravado na loja de materiais mostrando a curadoria do escritório para o projeto.',
  },
  {
    title: 'Perguntas & Respostas sobre Orçamento de Projeto',
    type: 'Stories' as PostType,
    category: 'Educativo' as PostCategory,
    description: 'Caixinha de perguntas nos Stories respondendo quanto custa contratar um arquiteto/designer.',
  },
];

export const InstagramTab: React.FC = () => {
  const { user, targetUid } = useAuth();
  const { architectureProjects } = useFinance();
  const { teamMembers } = useTeamMembers();

  const getStorageKey = () => `meu_escritorio_instagram_posts_${targetUid || user?.uid || 'default'}`;

  // Initial Posts
  const [posts, setPosts] = useState<InstagramPost[]>(() => {
    try {
      const saved = localStorage.getItem(getStorageKey());
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading instagram posts', e);
    }
    // Default initial mock posts
    return [
      {
        id: 'post_demo_1',
        title: 'Antes & Depois: Reforma Residencial',
        description: 'Resultado final da transformação da sala de estar integrada com conceito aberto.',
        type: 'Carrossel',
        category: 'Antes e Depois',
        priority: 'Alta',
        scheduledDate: '2026-09-13',
        status: 'Hoje',
        responsibleName: 'LF Quadros',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'post_demo_2',
        title: 'Como escolher a iluminação ideal',
        description: 'Dicas práticas de iluminação direta e indireta para dormitórios.',
        type: 'Feed',
        category: 'Educativo',
        priority: 'Média',
        scheduledDate: '2026-09-18',
        status: 'Planejado',
        responsibleName: 'LF Quadros',
        createdAt: new Date().toISOString(),
      },
    ];
  });

  // Current calendar month/year state (Defaulting to September 2026 or current date)
  const [currentDate, setCurrentDate] = useState(() => new Date(2026, 8, 1)); // Sep 2026
  const [isInsightExpanded, setIsInsightExpanded] = useState(true);
  const [insightIndex, setInsightIndex] = useState(0);

  // Filters
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterResponsible, setFilterResponsible] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<InstagramPost | null>(null);

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formType, setFormType] = useState<PostType>('Feed');
  const [formCategory, setFormCategory] = useState<PostCategory>('Educativo');
  const [formPriority, setFormPriority] = useState<PostPriority>('Média');
  const [formScheduledDate, setFormScheduledDate] = useState('2026-09-13');
  const [formResponsibleId, setFormResponsibleId] = useState('');
  const [formProjectId, setFormProjectId] = useState('');

  // Selected Post Details Drawer/Modal
  const [selectedPost, setSelectedPost] = useState<InstagramPost | null>(null);

  // Persist posts
  useEffect(() => {
    try {
      localStorage.setItem(getStorageKey(), JSON.stringify(posts));
    } catch (e) {
      console.error('Error saving posts', e);
    }
  }, [posts, targetUid]);

  // Handle Month Navigation
  const handlePrevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Open Modal
  const handleOpenNewPost = (presetDate?: string) => {
    setEditingPost(null);
    setFormTitle('');
    setFormImageUrl('');
    setFormDescription('');
    setFormType('Feed');
    setFormCategory('Educativo');
    setFormPriority('Média');
    setFormScheduledDate(presetDate || '2026-09-13');
    setFormResponsibleId(teamMembers[0]?.id || '');
    setFormProjectId('');
    setIsModalOpen(true);
  };

  const handleOpenEditPost = (post: InstagramPost, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingPost(post);
    setFormTitle(post.title);
    setFormImageUrl(post.imageUrl || '');
    setFormDescription(post.description);
    setFormType(post.type);
    setFormCategory(post.category);
    setFormPriority(post.priority);
    setFormScheduledDate(post.scheduledDate);
    setFormResponsibleId(post.responsibleId || '');
    setFormProjectId(post.projectId || '');
    setSelectedPost(null);
    setIsModalOpen(true);
  };

  // Suggest Post Idea
  const handleSuggestPostOfDay = () => {
    const randomIdea = SUGGESTED_POST_IDEAS[Math.floor(Math.random() * SUGGESTED_POST_IDEAS.length)];
    setEditingPost(null);
    setFormTitle(randomIdea.title);
    setFormImageUrl('');
    setFormDescription(randomIdea.description);
    setFormType(randomIdea.type);
    setFormCategory(randomIdea.category);
    setFormPriority('Alta');
    setFormScheduledDate('2026-09-13');
    setFormResponsibleId(teamMembers[0]?.id || '');
    setFormProjectId('');
    setIsModalOpen(true);
  };

  // Image File Upload Handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Save Post
  const handleSavePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const responsibleMember = teamMembers.find((m) => m.id === formResponsibleId);
    const selectedProj = architectureProjects.find((p) => p.id === formProjectId);

    // Calculate Status based on date
    const todayStr = '2026-09-13';
    let status: PostStatus = 'Planejado';
    if (formScheduledDate === todayStr) {
      status = 'Hoje';
    } else if (formScheduledDate < todayStr) {
      status = 'Atrasado';
    }

    if (editingPost) {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === editingPost.id
            ? {
                ...p,
                title: formTitle.trim(),
                imageUrl: formImageUrl || undefined,
                description: formDescription.trim(),
                type: formType,
                category: formCategory,
                priority: formPriority,
                scheduledDate: formScheduledDate,
                responsibleId: formResponsibleId || undefined,
                responsibleName: responsibleMember?.name || p.responsibleName,
                projectId: formProjectId || undefined,
                projectName: selectedProj?.name || undefined,
                status: p.status === 'Postado' ? 'Postado' : status,
              }
            : p
        )
      );
    } else {
      const newPost: InstagramPost = {
        id: `post_${Date.now()}`,
        title: formTitle.trim(),
        imageUrl: formImageUrl || undefined,
        description: formDescription.trim(),
        type: formType,
        category: formCategory,
        priority: formPriority,
        scheduledDate: formScheduledDate,
        responsibleId: formResponsibleId || undefined,
        responsibleName: responsibleMember?.name || user?.displayName || 'LF Quadros',
        projectId: formProjectId || undefined,
        projectName: selectedProj?.name || undefined,
        status,
        createdAt: new Date().toISOString(),
      };
      setPosts((prev) => [...prev, newPost]);
    }

    setIsModalOpen(false);
  };

  const handleDeletePost = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPosts((prev) => prev.filter((p) => p.id !== id));
    if (selectedPost?.id === id) setSelectedPost(null);
  };

  const handleTogglePostStatus = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const nextStatus: PostStatus = p.status === 'Postado' ? 'Planejado' : 'Postado';
        return { ...p, status: nextStatus };
      })
    );
  };

  // Filtered Posts
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      if (filterType !== 'all' && post.type !== filterType) return false;
      if (filterStatus !== 'all' && post.status !== filterStatus) return false;
      if (filterResponsible !== 'all' && post.responsibleId !== filterResponsible) return false;
      return true;
    });
  }, [posts, filterType, filterStatus, filterResponsible]);

  // Calendar Days Calculation (Monday to Sunday)
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Day of week: 0=Sun, 1=Mon, ..., 6=Sat
    // We want 0=Mon, 1=Tue, ..., 6=Sun
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6; // Sunday

    const daysInMonth = lastDayOfMonth.getDate();

    const prevMonthLastDay = new Date(year, month, 0).getDate();

    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
    }> = [];

    // Overflow previous month days
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const prevDate = new Date(year, month - 1, dayNum);
      const mStr = String(prevDate.getMonth() + 1).padStart(2, '0');
      const dStr = String(dayNum).padStart(2, '0');
      const dateStr = `${prevDate.getFullYear()}-${mStr}-${dStr}`;
      days.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === '2026-09-13',
      });
    }

    // Current month days
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const mStr = String(month + 1).padStart(2, '0');
      const dStr = String(dayNum).padStart(2, '0');
      const dateStr = `${year}-${mStr}-${dStr}`;
      days.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: true,
        isToday: dateStr === '2026-09-13',
      });
    }

    // Overflow next month days to complete 35 or 42 grid cells
    const totalGridCells = days.length > 35 ? 42 : 35;
    const remainingCells = totalGridCells - days.length;
    for (let dayNum = 1; dayNum <= remainingCells; dayNum++) {
      const nextDate = new Date(year, month + 1, dayNum);
      const mStr = String(nextDate.getMonth() + 1).padStart(2, '0');
      const dStr = String(dayNum).padStart(2, '0');
      const dateStr = `${nextDate.getFullYear()}-${mStr}-${dStr}`;
      days.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === '2026-09-13',
      });
    }

    return days;
  }, [currentDate]);

  const monthYearLabel = useMemo(() => {
    const monthNames = [
      'Janeiro',
      'Fevereiro',
      'Março',
      'Abril',
      'Maio',
      'Junho',
      'Julho',
      'Agosto',
      'Setembro',
      'Outubro',
      'Novembro',
      'Dezembro',
    ];
    return `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  }, [currentDate]);

  const richInsight = RICH_INSIGHTS[insightIndex % RICH_INSIGHTS.length];
  const [savedInsights, setSavedInsights] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleNextInsight = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setInsightIndex((prev) => (prev + 1) % RICH_INSIGHTS.length);
  };

  const handleSaveInsight = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!savedInsights.includes(richInsight.id)) {
      setSavedInsights((prev) => [...prev, richInsight.id]);
      showToast('Insight salvo com sucesso!');
    } else {
      showToast('Este insight já está salvo!');
    }
  };

  const handleAcceptInsight = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingPost(null);
    setFormTitle(richInsight.title);
    setFormImageUrl(richInsight.bgImageUrl);

    const formattedDesc =
      `${richInsight.subtitle}\n\n` +
      richInsight.stories
        .map(
          (s) =>
            `${s.typeLabel}:\n${s.instruction}${s.quote ? `\n${s.quote}` : ''}`
        )
        .join('\n\n');

    setFormDescription(formattedDesc);
    setFormType('Stories');
    setFormCategory('Educativo');
    setFormPriority('Alta');
    setFormScheduledDate('2026-09-13');
    setFormResponsibleId(teamMembers[0]?.id || '');
    setFormProjectId('');
    setIsModalOpen(true);
    showToast('Post pré-preenchido com o insight!');
  };

  const getTypeIcon = (type: PostType) => {
    switch (type) {
      case 'Reels':
        return Film;
      case 'Carrossel':
        return Layers;
      case 'Stories':
        return CircleDot;
      default:
        return ImageIcon;
    }
  };

  const getStatusDotColor = (status: PostStatus) => {
    switch (status) {
      case 'Postado':
        return 'bg-emerald-500';
      case 'Hoje':
        return 'bg-amber-400';
      case 'Atrasado':
        return 'bg-rose-500';
      default:
        return 'bg-purple-400';
    }
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-16">
      {/* 1. HEADER */}
      <div>
        <h1 className="text-2xl font-serif font-bold text-[#fcf8f5] flex items-center gap-2.5">
          <Instagram className="w-6 h-6 text-[#e1306c]" />
          <span>Instagram</span>
        </h1>
        <p className="text-xs text-[#a89c93] mt-0.5 font-sans">Planejamento de conteúdo</p>
      </div>

      {/* 2. INSIGHT DO DIA CARD (EXACT MATCH TO USER REFERENCE IMAGE) */}
      <div className="bg-[#f9f8f6] border border-[#e8e4dc] rounded-2xl overflow-hidden shadow-xl transition-all text-[#1c1917]">
        {/* TOP HEADER BAR */}
        <div
          className="px-5 py-3.5 bg-[#f5f3ee] border-b border-[#e8e4dc] flex items-center justify-between cursor-pointer select-none"
          onClick={() => setIsInsightExpanded(!isInsightExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#e8e4dc] text-[#57534e] flex items-center justify-center shrink-0">
              <Sliders className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-[#78716c] uppercase tracking-wider">
                INSIGHT DO DIA
              </span>
              <span className="text-sm font-semibold text-[#1c1917]">
                {richInsight.title}
              </span>
            </div>
          </div>

          <button className="p-1.5 text-[#78716c] hover:text-[#1c1917] rounded-lg transition-colors cursor-pointer">
            {isInsightExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* EXPANDED CONTENT AREA */}
        {isInsightExpanded && (
          <div className="p-4 sm:p-6 space-y-6">
            {/* HERO BANNER WITH BACKGROUND IMAGE OVERLAY */}
            <div
              className="relative rounded-2xl overflow-hidden bg-cover bg-center min-h-[200px] sm:min-h-[220px] flex flex-col justify-end p-6 sm:p-8 shadow-inner border border-[#e2ded7]"
              style={{ backgroundImage: `url(${richInsight.bgImageUrl})` }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/50 to-black/20" />

              <div className="relative z-10 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold rounded-full flex items-center gap-1 border border-white/20">
                    <Sparkles className="w-3 h-3 text-[#85e3c1]" />
                    INSIGHT DO DIA
                  </span>
                  <span className="px-3 py-1 bg-black/60 backdrop-blur-md text-white/90 text-[10px] font-bold rounded-full uppercase tracking-wider border border-white/20">
                    {richInsight.categoryTag}
                  </span>
                  <span className="px-3 py-1 bg-black/60 backdrop-blur-md text-white/80 text-[10px] font-bold rounded-full uppercase tracking-wider border border-white/20">
                    {richInsight.formatTag}
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight">
                  {richInsight.title}
                </h2>
                <p className="text-xs sm:text-sm text-stone-200 max-w-2xl font-sans">
                  {richInsight.subtitle}
                </p>
              </div>
            </div>

            {/* STORIES STEPS LIST */}
            <div className="space-y-5 px-1 sm:px-2">
              {richInsight.stories.map((story) => (
                <div key={story.number} className="flex items-start gap-3.5">
                  <div className="w-7 h-7 rounded-full bg-[#f0ede8] border border-[#e2ded7] text-[#44403c] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    {story.number}
                  </div>

                  <div className="flex-1 space-y-1">
                    <p className="text-[10px] font-bold text-[#8c827a] tracking-wider uppercase">
                      {story.typeLabel}
                    </p>
                    <p className="text-xs sm:text-sm font-semibold text-[#1c1917] leading-snug">
                      {story.instruction}
                    </p>
                    {story.quote && (
                      <p className="text-xs italic text-[#78716c] font-serif">
                        {story.quote}
                      </p>
                    )}

                    {story.pollCard && (
                      <div className="mt-3 p-4 bg-[#f4f2ee] rounded-xl border border-[#e8e4dc] space-y-2 text-xs">
                        <p className="font-bold text-[#1c1917]">{story.pollCard.question}</p>
                        <ul className="space-y-1 text-[#44403c] font-medium pl-1">
                          {story.pollCard.options.map((opt) => (
                            <li key={opt} className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#78716c]" />
                              <span>{opt}</span>
                            </li>
                          ))}
                        </ul>
                        <p className="text-[11px] text-[#78716c] pt-2 border-t border-[#e2ded7] flex items-center gap-1">
                          <span>💡</span>
                          <span>{story.pollCard.tip}</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* DIREÇÃO VISUAL TAGS */}
            <div className="flex flex-wrap items-center gap-2 pt-2 px-1 sm:px-2 text-xs">
              <span className="text-[10px] font-bold text-[#8c827a] uppercase tracking-wider mr-1">
                DIREÇÃO VISUAL
              </span>
              {richInsight.visualDirection.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 bg-[#f0ede8] border border-[#e2ded7] text-[#44403c] text-[11px] font-medium rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* ACTION BUTTONS FOOTER */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-[#e8e4dc]">
              {/* LEFT GROUP */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={handleAcceptInsight}
                  className="px-4 py-2.5 bg-[#1c352d] hover:bg-[#25463c] text-white text-xs font-bold rounded-full transition-all flex items-center gap-2 cursor-pointer shadow-sm border border-[#2d5246]"
                >
                  <Check className="w-4 h-4 text-[#85e3c1]" />
                  <span>Aceitar e criar post</span>
                </button>

                <button
                  onClick={handleSaveInsight}
                  className="px-4 py-2.5 bg-[#f0ede8] hover:bg-[#e8e4dc] text-[#2c2825] text-xs font-bold rounded-full transition-all flex items-center gap-2 cursor-pointer border border-[#e2ded7]"
                >
                  <Bookmark className="w-4 h-4 text-[#78716c]" />
                  <span>{savedInsights.includes(richInsight.id) ? 'Salvo' : 'Salvar'}</span>
                </button>

                <button
                  onClick={handleNextInsight}
                  className="px-3.5 py-2.5 text-[#78716c] hover:text-[#1c1917] text-xs font-medium rounded-full transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>Não combina</span>
                </button>
              </div>

              {/* RIGHT GROUP */}
              <button
                onClick={handleNextInsight}
                className="px-4 py-2.5 border border-[#d6d1c7] bg-white hover:bg-[#f8f7f5] text-[#2c2825] text-xs font-bold rounded-full transition-all flex items-center gap-2 cursor-pointer shadow-2xs self-start sm:self-center"
              >
                <RotateCw className="w-3.5 h-3.5 text-[#78716c]" />
                <span>Gerar outro</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* TOAST FEEDBACK NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1c352d] text-white border border-[#85e3c1]/40 px-4 py-3 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-[#85e3c1]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 3. FILTER BAR & ACTIONS */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* DROPDOWN FILTERS */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* RESPONSABLE FILTER */}
          <div className="relative">
            <select
              value={filterResponsible}
              onChange={(e) => setFilterResponsible(e.target.value)}
              className="appearance-none px-3.5 py-2 pr-8 bg-[#1a1614] border border-[#302722] rounded-xl text-xs text-[#fcf8f5] focus:outline-none focus:border-[#85e3c1] cursor-pointer"
            >
              <option value="all">Todos...</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#8c7e73] absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* TYPE FILTER */}
          <div className="relative">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="appearance-none px-3.5 py-2 pr-8 bg-[#1a1614] border border-[#302722] rounded-xl text-xs text-[#fcf8f5] focus:outline-none focus:border-[#85e3c1] cursor-pointer"
            >
              <option value="all">Todos tipos</option>
              <option value="Feed">Feed</option>
              <option value="Reels">Reels</option>
              <option value="Carrossel">Carrossel</option>
              <option value="Stories">Stories</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#8c7e73] absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* STATUS FILTER */}
          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="appearance-none px-3.5 py-2 pr-8 bg-[#1a1614] border border-[#302722] rounded-xl text-xs text-[#fcf8f5] focus:outline-none focus:border-[#85e3c1] cursor-pointer"
            >
              <option value="all">Todos status</option>
              <option value="Planejado">Planejado</option>
              <option value="Hoje">Hoje</option>
              <option value="Postado">Postado</option>
              <option value="Atrasado">Atrasado</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#8c7e73] absolute right-2.5 top-2.5 pointer-events-none" />
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleSuggestPostOfDay}
            className="px-3.5 py-2 bg-[#25201d] hover:bg-[#2e2724] border border-[#382f29] text-[#fcf8f5] rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#85e3c1]" />
            <span>Sugerir Post do Dia</span>
          </button>

          <button
            onClick={() => handleOpenNewPost()}
            className="px-4 py-2 bg-[#1c352d] hover:bg-[#25463c] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border border-[#2d5246] shadow-md"
          >
            <Plus className="w-4 h-4 text-[#85e3c1]" />
            <span>Novo Post</span>
          </button>
        </div>
      </div>

      {/* 4. CALENDAR SECTION */}
      <div className="bg-[#1a1614] border border-[#302722] rounded-2xl p-5 space-y-4 shadow-xl">
        {/* CALENDAR NAVIGATION */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 text-[#8c7e73] hover:text-[#fcf8f5] hover:bg-[#25201d] rounded-xl transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <h2 className="text-base font-serif font-bold text-[#fcf8f5]">{monthYearLabel}</h2>

          <button
            onClick={handleNextMonth}
            className="p-1.5 text-[#8c7e73] hover:text-[#fcf8f5] hover:bg-[#25201d] rounded-xl transition-colors cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* DAYS OF WEEK HEADER */}
        <div className="grid grid-cols-7 gap-1 text-center border-b border-[#302722] pb-2">
          {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((d) => (
            <div key={d} className="text-xs font-bold text-[#8c7e73]">
              {d}
            </div>
          ))}
        </div>

        {/* CALENDAR GRID */}
        <div className="grid grid-cols-7 gap-1.5">
          {calendarDays.map((day, idx) => {
            const dayPosts = filteredPosts.filter((p) => p.scheduledDate === day.dateStr);

            return (
              <div
                key={`${day.dateStr}_${idx}`}
                onClick={() => handleOpenNewPost(day.dateStr)}
                className={`min-h-[110px] p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between group ${
                  day.isToday
                    ? 'bg-[#1e2320] border-2 border-[#85e3c1] shadow-lg'
                    : day.isCurrentMonth
                    ? 'bg-[#12100e] border-[#2c241e] hover:border-[#3d342f]'
                    : 'bg-[#0f0d0c]/50 border-[#1f1916] text-[#524740]'
                }`}
              >
                {/* DAY TOP */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold ${
                      day.isToday
                        ? 'text-[#85e3c1]'
                        : day.isCurrentMonth
                        ? 'text-[#fcf8f5]'
                        : 'text-[#63554c]'
                    }`}
                  >
                    {day.dayNumber}
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenNewPost(day.dateStr);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-[#8c7e73] hover:text-[#85e3c1] transition-all"
                    title="Adicionar post nesta data"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* POSTS LIST IN DAY CELL */}
                <div className="space-y-1 my-1 flex-1 overflow-y-auto max-h-[75px] no-scrollbar">
                  {dayPosts.map((post) => {
                    const TypeIcon = getTypeIcon(post.type);
                    return (
                      <div
                        key={post.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPost(post);
                        }}
                        className={`p-1.5 rounded-lg border text-[10px] transition-all flex items-center justify-between gap-1.5 ${
                          post.status === 'Postado'
                            ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-200 line-through opacity-80'
                            : post.status === 'Hoje'
                            ? 'bg-amber-950/50 border-amber-700/50 text-amber-100 font-semibold'
                            : post.status === 'Atrasado'
                            ? 'bg-rose-950/50 border-rose-800/50 text-rose-200'
                            : 'bg-[#1f1a17] border-[#382f29] text-[#fcf8f5] hover:border-[#85e3c1]'
                        }`}
                      >
                        <div className="flex items-center gap-1 min-w-0 flex-1">
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${getStatusDotColor(
                              post.status
                            )}`}
                          />
                          <TypeIcon className="w-3 h-3 shrink-0 text-[#85e3c1]" />
                          <span className="truncate leading-tight">{post.title}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* CALENDAR FOOTER LEGEND */}
        <div className="flex flex-wrap items-center justify-center gap-6 pt-3 border-t border-[#302722] text-xs text-[#a89c93]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block" />
            <span>Planejado</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
            <span>Hoje</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            <span>Postado</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
            <span>Atrasado</span>
          </div>
        </div>
      </div>

      {/* 5. MODAL NOVO / EDITAR POST (IMAGE 3 MATCH) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1614] border border-[#302722] rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 no-scrollbar">
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between pb-3 border-b border-[#302722]">
              <h3 className="font-serif font-bold text-[#fcf8f5] text-base">
                {editingPost ? 'Editar Post' : 'Novo Post'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-[#8c7e73] hover:text-[#fcf8f5] rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePost} className="space-y-4">
              {/* TÍTULO * */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#fcf8f5] block">Título *</label>
                <input
                  type="text"
                  placeholder="Título do post"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-[#12100e] border border-[#382f29] rounded-xl text-xs text-[#fcf8f5] placeholder-[#73655c] focus:outline-none focus:border-[#85e3c1]"
                />
              </div>

              {/* IMAGEM DROPZONE */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#fcf8f5] block">Imagem</label>
                <div className="relative border-2 border-dashed border-[#382f29] hover:border-[#85e3c1] rounded-xl p-4 bg-[#12100e] text-center transition-all">
                  {formImageUrl ? (
                    <div className="relative group max-h-40 overflow-hidden rounded-lg mx-auto">
                      <img
                        src={formImageUrl}
                        alt="Preview"
                        className="max-h-40 mx-auto object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => setFormImageUrl('')}
                        className="absolute top-2 right-2 p-1.5 bg-black/70 text-rose-400 rounded-full hover:bg-black transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center justify-center gap-1.5 py-2">
                      <div className="w-10 h-10 rounded-full bg-[#1c352d] text-[#85e3c1] flex items-center justify-center border border-[#2d5246]">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-semibold text-[#85e3c1]">Enviar</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* DESCRIÇÃO */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#fcf8f5] block">Descrição</label>
                <textarea
                  rows={3}
                  placeholder="Escreva a legenda ou tópicos do post..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#12100e] border border-[#382f29] rounded-xl text-xs text-[#fcf8f5] placeholder-[#73655c] focus:outline-none focus:border-[#85e3c1] resize-none"
                />
              </div>

              {/* TIPO & CATEGORIA ROW */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#fcf8f5] block">Tipo</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as PostType)}
                    className="w-full px-3 py-2.5 bg-[#12100e] border border-[#382f29] rounded-xl text-xs text-[#fcf8f5] focus:outline-none focus:border-[#85e3c1] cursor-pointer"
                  >
                    <option value="Feed">Feed</option>
                    <option value="Reels">Reels</option>
                    <option value="Carrossel">Carrossel</option>
                    <option value="Stories">Stories</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#fcf8f5] block">Categoria</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as PostCategory)}
                    className="w-full px-3 py-2.5 bg-[#12100e] border border-[#382f29] rounded-xl text-xs text-[#fcf8f5] focus:outline-none focus:border-[#85e3c1] cursor-pointer"
                  >
                    <option value="Educativo">Educativo</option>
                    <option value="Portfólio">Portfólio</option>
                    <option value="Bastidores">Bastidores</option>
                    <option value="Antes e Depois">Antes e Depois</option>
                    <option value="Dicas">Dicas</option>
                    <option value="Promocional">Promocional</option>
                  </select>
                </div>
              </div>

              {/* PRIORIDADE */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#fcf8f5] block">Prioridade</label>
                <select
                  value={formPriority}
                  onChange={(e) => setFormPriority(e.target.value as PostPriority)}
                  className="w-full px-3 py-2.5 bg-[#12100e] border border-[#382f29] rounded-xl text-xs text-[#fcf8f5] focus:outline-none focus:border-[#85e3c1] cursor-pointer"
                >
                  <option value="Baixa">Baixa</option>
                  <option value="Média">Média</option>
                  <option value="Alta">Alta</option>
                </select>
              </div>

              {/* DATA PREVISTA */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#fcf8f5] block">Data Prevista</label>
                <input
                  type="date"
                  value={formScheduledDate}
                  onChange={(e) => setFormScheduledDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#12100e] border border-[#382f29] rounded-xl text-xs text-[#fcf8f5] focus:outline-none focus:border-[#85e3c1]"
                />
              </div>

              {/* RESPONSÁVEL */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#fcf8f5] block">Responsável</label>
                <select
                  value={formResponsibleId}
                  onChange={(e) => setFormResponsibleId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#12100e] border border-[#382f29] rounded-xl text-xs text-[#fcf8f5] focus:outline-none focus:border-[#85e3c1] cursor-pointer"
                >
                  <option value="">Selecionar...</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.roleTitle ? `(${m.roleTitle})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* PROJETO (OPCIONAL) */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#fcf8f5] block">Projeto (opcional)</label>
                <select
                  value={formProjectId}
                  onChange={(e) => setFormProjectId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#12100e] border border-[#382f29] rounded-xl text-xs text-[#fcf8f5] focus:outline-none focus:border-[#85e3c1] cursor-pointer"
                >
                  <option value="">Nenhum</option>
                  {architectureProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* SUBMIT BUTTON */}
              <div className="pt-3 border-t border-[#302722]">
                <button
                  type="submit"
                  className="w-full py-3 bg-[#1c352d] hover:bg-[#25463c] text-white text-xs font-bold rounded-xl transition-all cursor-pointer border border-[#2d5246] shadow-lg flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4 text-[#85e3c1]" />
                  <span>Criar Post + Tarefa</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. SELECTED POST DETAIL MODAL */}
      {selectedPost && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1614] border border-[#302722] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#1c352d] border border-[#2d5246] text-[#85e3c1] flex items-center justify-center">
                  {React.createElement(getTypeIcon(selectedPost.type), { className: 'w-4 h-4' })}
                </div>
                <div>
                  <h3 className="font-serif font-bold text-[#fcf8f5] text-base leading-tight">
                    {selectedPost.title}
                  </h3>
                  <p className="text-[11px] text-[#a89c93]">
                    Data: {selectedPost.scheduledDate.split('-').reverse().join('/')}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedPost(null)}
                className="p-1 text-[#8c7e73] hover:text-[#fcf8f5] rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedPost.imageUrl && (
              <img
                src={selectedPost.imageUrl}
                alt={selectedPost.title}
                className="w-full max-h-48 object-cover rounded-xl border border-[#302722]"
              />
            )}

            {selectedPost.description && (
              <p className="text-xs text-[#a89c93] leading-relaxed bg-[#12100e] p-3 rounded-xl border border-[#2c241e]">
                {selectedPost.description}
              </p>
            )}

            <div className="grid grid-cols-2 gap-2 text-xs text-[#a89c93]">
              <div className="bg-[#12100e] p-2.5 rounded-xl border border-[#2c241e]">
                <span className="text-[10px] text-[#8c7e73] block">Tipo</span>
                <span className="font-bold text-[#fcf8f5]">{selectedPost.type}</span>
              </div>
              <div className="bg-[#12100e] p-2.5 rounded-xl border border-[#2c241e]">
                <span className="text-[10px] text-[#8c7e73] block">Categoria</span>
                <span className="font-bold text-[#fcf8f5]">{selectedPost.category}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#302722]">
              <button
                onClick={(e) => handleTogglePostStatus(selectedPost.id, e)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                  selectedPost.status === 'Postado'
                    ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                    : 'bg-[#1c352d] border-[#2d5246] text-[#85e3c1]'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{selectedPost.status === 'Postado' ? 'Marcar como Pendente' : 'Marcar como Postado'}</span>
              </button>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={(e) => handleOpenEditPost(selectedPost, e)}
                  className="p-2 border border-[#382f29] text-[#a89c93] hover:text-[#fcf8f5] hover:bg-[#25201d] rounded-xl transition-all"
                  title="Editar"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => handleDeletePost(selectedPost.id, e)}
                  className="p-2 border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                  title="Excluir"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
