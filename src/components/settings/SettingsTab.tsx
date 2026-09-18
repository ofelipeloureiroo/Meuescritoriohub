import React, { useState, useEffect, useRef } from 'react';
import { ProjectTemplatesManager } from './ProjectTemplatesManager';
import { motion } from 'motion/react';
import {
  Settings,
  Users,
  Clock,
  Trash2,
  Plus,
  FolderOpen,
  Package,
  Calendar,
  Wallet,
  Target,
  PieChart,
  Home,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Check,
  AlertTriangle,
  Sparkles,
  CheckSquare,
  Building,
  DollarSign,
  Tag,
  Share2,
  Lock,
  Copy,
  Download,
  Upload,
  RefreshCw,
  Sliders,
  Wrench,
  Brain,
  Edit2,
  X,
  FileText,
  Camera,
  Image as ImageIcon,
  Eye,
  EyeOff,
  Zap,
  ShieldCheck,
} from 'lucide-react';
import { compressImage } from '../../utils/imageCompressor';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { signOut, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { NicheType, ThemeColorId, BgThemeId, OfficeSettings, CollaboratorPermissions } from '../../types';
import { NICHES, THEMES, BG_THEMES } from '../../utils/theme';
import { saveMercadoPagoConfig } from '../../lib/mercadopago';

const PRESET_AVATARS = [
  {
    id: 'preset-1',
    label: 'Clássico Executivo',
    url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'preset-2',
    label: 'Studio Criativo',
    url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'preset-3',
    label: 'Minimalista & Moderno',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  },
];

export const SettingsTab: React.FC = () => {
  const {
    architectProfile,
    updateArchitectProfile,
    updateProfilePhoto,
    changeTheme,
    changeBgTheme,
    changeNiche,
    exportDataJSON,
    importDataJSON,
    loadDemoData,
    resetAllData,
    resetFinancialData,
    resetProjectsData,
    resetTeamData,
    resetSuppliersData,
    resetRequestedModules,
    officeSettings,
    updateOfficeSettings,
  } = useFinance();

  const {
    user,
    profile,
    updateProfile,
    joinWithInviteCode,
    leaveCollaboratedOffice,
    updateCollaboratorPermissions,
    removeCollaborator
  } = useAuth();

  // Top level horizontal tabs
  const [activeSubTab, setActiveSubTab] = useState<'minha-conta' | 'sistema' | 'operacao' | 'financeiro' | 'inteligencia'>('minha-conta');

  // Get the real email the user registered/logged in with (prioritizes Firebase user email or Google provider email, filters system fallbacks)
  const getDisplayEmail = () => {
    // 1. Google provider email if authenticated with Google
    const googleEmail = user?.providerData?.find(p => p.providerId === 'google.com')?.email;
    if (googleEmail) return googleEmail;

    // 2. Auth user email if it is a real user email
    if (user?.email && !user.email.includes('master_escritorio')) {
      return user.email;
    }

    // 3. Local session fallback email
    try {
      const saved = localStorage.getItem('office_local_session');
      const local = saved ? JSON.parse(saved) : null;
      if (local?.email && !local.email.includes('master_escritorio')) {
        return local.email;
      }
    } catch {}

    // 4. Firestore profile email if it is a real user email
    if (profile?.email && !profile.email.includes('master_escritorio')) {
      return profile.email;
    }

    // 5. Global owner default fallback
    return 'lfquadrosdecorativos@gmail.com';
  };

  // Get the appropriate display name for the profile tab
  const getDisplayName = () => {
    // 1. Use the name from the local profile if it is not the generic business name
    if (profile?.name && profile.name !== 'LP Arquitetura e Interiores') {
      return profile.name;
    }

    // 2. Use authenticated user's display name if available
    if (user?.displayName) return user.displayName;

    // 3. Fallback to architect profile name or generic name
    return profile?.name || architectProfile.ownerName || architectProfile.name || 'Usuário';
  };

  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isUpdatingPass, setIsUpdatingPass] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Preencha todos os campos de senha.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('A nova senha deve ter no mínimo 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('As senhas não coincidem.');
      return;
    }

    if (!user || !user.email) {
      setPasswordError('Usuário não autenticado.');
      return;
    }

    setIsUpdatingPass(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser!, credential);
      await updatePassword(auth.currentUser!, newPassword);
      setPasswordSuccess('Senha alterada com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setPasswordError('Senha atual incorreta.');
      } else {
        setPasswordError(`Erro ao alterar senha: ${err.message}`);
      }
    } finally {
      setIsUpdatingPass(false);
    }
  };

  // Operation specific views
  const [actionAreaFilter, setActionAreaFilter] = useState<'Comercial' | 'Operação' | 'Financeiro'>('Comercial');
  const [newActionType, setNewActionType] = useState('');
  const [isEditingActions, setIsEditingActions] = useState(false);

  // Leads section states
  const [newLossReason, setNewLossReason] = useState('');
  const [newChannel, setNewChannel] = useState('');
  const [newTag, setNewTag] = useState('');

  // Project Templates, Statuses and Types
  // Since they are optional in officeSettings, we'll initialize them with default fallbacks
  const projectTypes = officeSettings.projectTypes || ['Projeto Arquitetônico', 'Reforma', 'Projeto de Interiores', 'Consultoria'];
  const projectStatuses = officeSettings.projectStatuses || [
    { name: 'Proposta', color: '#f59e0b' },
    { name: 'Em Andamento', color: '#3b82f6' },
    { name: 'Em Revisão', color: '#8b5cf6' },
    { name: 'Concluído', color: '#10b981' },
    { name: 'Pausado', color: '#6b7280' },
    { name: 'Cancelado', color: '#ef4444' }
  ];
  const projectTemplates = officeSettings.projectTemplates || [
    {
      id: 'tpl-1',
      name: 'Projeto Arquitetônico + Interiores',
      type: 'Projeto Arquitetônico',
      date: '16/06/2026',
      isSystem: true,
      stages: ['Estudo Preliminar', 'Anteprojeto', 'Projeto Executivo', 'Detalhamento']
    },
    {
      id: 'tpl-2',
      name: 'Reforma Completa',
      type: 'Reforma',
      date: '16/06/2026',
      isSystem: true,
      stages: ['Demolição/Construção', 'Elétrica e Hidráulica', 'Revestimentos', 'Marcenaria']
    },
    {
      id: 'tpl-3',
      name: 'Projeto Arquitetônico',
      type: 'Projeto Arquitetônico',
      date: '06/08/2026',
      isSystem: true,
      stages: ['Estudo Preliminar', 'Anteprojeto', 'Projeto Executivo']
    },
    {
      id: 'tpl-4',
      name: 'Projeto de Interiores',
      type: 'Projeto de Interiores',
      date: '06/08/2026',
      isSystem: true,
      stages: ['Definição de Layout', 'Paleta de Cores e Materiais', 'Detalhamento Técnico']
    }
  ];
  const templateBindings = officeSettings.templateBindings || {
    'Projeto Arquitetônico': 'tpl-3',
    'Reforma': 'tpl-2',
    'Projeto de Interiores': 'tpl-4',
    'Consultoria': 'tpl-1'
  };

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('tpl-1');
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateType, setNewTemplateType] = useState('Projeto Arquitetônico');
  const [newTemplateStages, setNewTemplateStages] = useState<string[]>(['Briefing', 'Proposta']);
  const [tempStageInput, setTempStageInput] = useState('');

  const [newProjectTypeInput, setNewProjectTypeInput] = useState('');
  const [newProjectStatusName, setNewProjectStatusName] = useState('');
  const [newProjectStatusColor, setNewProjectStatusColor] = useState('#3b82f6');

  // Profile fields inside "Sistema"
  const [name, setName] = useState(architectProfile.name || '');
  const [ownerName, setOwnerName] = useState(architectProfile.ownerName || '');
  const [titleText, setTitleText] = useState(architectProfile.title || '');
  const [photoUrl, setPhotoUrl] = useState(architectProfile.photoUrl || '');
  const [selectedNiche, setSelectedNiche] = useState<NicheType>(architectProfile.niche || 'arquitetura');
  const [selectedTheme, setSelectedTheme] = useState<ThemeColorId>(architectProfile.themeColor || 'gold');
  const [selectedBgTheme, setSelectedBgTheme] = useState<BgThemeId>(architectProfile.bgTheme || 'dark_warm');

  // Collaboration state
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [isCopiedCode, setIsCopiedCode] = useState(false);

  // Backup / Reset states
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDemoConfirm, setShowDemoConfirm] = useState(false);
  const [resetStatus, setResetStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoFileInputRef = useRef<HTMLInputElement>(null);
  const [isCompressingPhoto, setIsCompressingPhoto] = useState(false);

  // Financial fields inside "Financeiro"
  const [newReceita, setNewReceita] = useState('');
  const [newCustoDireto, setNewCustoDireto] = useState('');
  const [newDespOperacional, setNewDespOperacional] = useState('');

  // Mercado Pago Config State
  const [mpAccessToken, setMpAccessToken] = useState('');
  const [mpPublicKey, setMpPublicKey] = useState('');
  const [mpDefaultDays, setMpDefaultDays] = useState(5);
  const [mpInstructions, setMpInstructions] = useState('Após o vencimento cobrar multa de 2% e juros de mora de 1% ao mês.');
  const [showMpToken, setShowMpToken] = useState(false);
  const [mpSavedSuccess, setMpSavedSuccess] = useState(false);

  useEffect(() => {
    if (officeSettings.mercadopagoConfig) {
      setMpAccessToken(officeSettings.mercadopagoConfig.accessToken || '');
      setMpPublicKey(officeSettings.mercadopagoConfig.publicKey || '');
      setMpDefaultDays(officeSettings.mercadopagoConfig.defaultExpirationDays || 5);
      setMpInstructions(officeSettings.mercadopagoConfig.defaultInstructions || 'Após o vencimento cobrar multa de 2% e juros de mora de 1% ao mês.');
    }
  }, [officeSettings.mercadopagoConfig]);

  // Intelligence rules inside "Inteligência"
  const [aiEnabled, setAiEnabled] = useState(true);
  const [cashRunawayThreshold, setCashRunawayThreshold] = useState(3); // in months
  const [autoAuditAlerts, setAutoAuditAlerts] = useState(true);

  // Synchronize profile forms when architectProfile loaded
  useEffect(() => {
    setName(architectProfile.name || '');
    setTitleText(architectProfile.title || '');
    setPhotoUrl(architectProfile.photoUrl || '');
    setSelectedNiche(architectProfile.niche || 'arquitetura');
    setSelectedTheme(architectProfile.themeColor || 'gold');
    setSelectedBgTheme(architectProfile.bgTheme || 'dark_warm');
  }, [architectProfile]);

  // Actions Matrix update helper
  const toggleMatrixCell = (area: 'comercial' | 'operacao' | 'financeiro', vinculo: 'lead' | 'cliente' | 'projeto') => {
    const current = { ...officeSettings.actionMatrix };
    current[area] = { ...current[area], [vinculo]: !current[area][vinculo] };
    updateOfficeSettings({ actionMatrix: current });
  };

  // Toggle stage enabled/disabled
  const toggleLeadStage = (id: string) => {
    const list = officeSettings.leadStages.map(st => {
      if (st.id === id) {
        return { ...st, enabled: !st.enabled };
      }
      return st;
    });
    updateOfficeSettings({ leadStages: list });
  };

  // Up/down stage helper
  const reorderLeadStage = (index: number, direction: 'up' | 'down') => {
    const list = [...officeSettings.leadStages];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < list.length) {
      const temp = list[index];
      list[index] = list[targetIndex];
      list[targetIndex] = temp;
      updateOfficeSettings({ leadStages: list });
    }
  };

  // Loss Reason CRUD
  const handleAddLossReason = () => {
    if (!newLossReason.trim()) return;
    if (!officeSettings.lossReasons.includes(newLossReason.trim())) {
      updateOfficeSettings({ lossReasons: [...officeSettings.lossReasons, newLossReason.trim()] });
    }
    setNewLossReason('');
  };

  const handleDeleteLossReason = (item: string) => {
    updateOfficeSettings({ lossReasons: officeSettings.lossReasons.filter(r => r !== item) });
  };

  // Acquisition Channel CRUD
  const handleAddAcquisitionChannel = () => {
    if (!newChannel.trim()) return;
    if (!officeSettings.acquisitionChannels.includes(newChannel.trim())) {
      updateOfficeSettings({ acquisitionChannels: [...officeSettings.acquisitionChannels, newChannel.trim()] });
    }
    setNewChannel('');
  };

  const handleDeleteAcquisitionChannel = (item: string) => {
    updateOfficeSettings({ acquisitionChannels: officeSettings.acquisitionChannels.filter(c => c !== item) });
  };

  // Tags CRUD
  const handleAddOfficeTag = () => {
    if (!newTag.trim()) return;
    if (!officeSettings.tags.includes(newTag.trim())) {
      updateOfficeSettings({ tags: [...officeSettings.tags, newTag.trim()] });
    }
    setNewTag('');
  };

  const handleDeleteOfficeTag = (item: string) => {
    updateOfficeSettings({ tags: officeSettings.tags.filter(t => t !== item) });
  };

  // Project Types CRUD
  const handleAddProjectType = () => {
    if (!newProjectTypeInput.trim()) return;
    if (!projectTypes.includes(newProjectTypeInput.trim())) {
      const updated = [...projectTypes, newProjectTypeInput.trim()];
      updateOfficeSettings({ projectTypes: updated });
    }
    setNewProjectTypeInput('');
  };

  const handleDeleteProjectType = (type: string) => {
    const updated = projectTypes.filter(t => t !== type);
    updateOfficeSettings({ projectTypes: updated });
  };

  // Project Statuses CRUD
  const handleAddProjectStatus = () => {
    if (!newProjectStatusName.trim()) return;
    if (!projectStatuses.some(s => s.name === newProjectStatusName.trim())) {
      const updated = [...projectStatuses, { name: newProjectStatusName.trim(), color: newProjectStatusColor }];
      updateOfficeSettings({ projectStatuses: updated });
    }
    setNewProjectStatusName('');
  };

  const handleDeleteProjectStatus = (name: string) => {
    const updated = projectStatuses.filter(s => s.name !== name);
    updateOfficeSettings({ projectStatuses: updated });
  };

  // Financial Category Helpers
  const addFinancialCategory = (group: 'receitas' | 'custosDiretos' | 'despesasOperacionais', value: string) => {
    if (!value.trim()) return;
    const current = { ...officeSettings.financialCategories };
    if (!current[group].includes(value.trim())) {
      current[group] = [...current[group], value.trim()];
      updateOfficeSettings({ financialCategories: current });
    }
  };

  const deleteFinancialCategory = (group: 'receitas' | 'custosDiretos' | 'despesasOperacionais', value: string) => {
    const current = { ...officeSettings.financialCategories };
    current[group] = current[group].filter(item => item !== value);
    updateOfficeSettings({ financialCategories: current });
  };

  const handleSaveMercadoPagoConfig = async () => {
    updateOfficeSettings({
      mercadopagoConfig: {
        accessToken: mpAccessToken.trim(),
        publicKey: mpPublicKey.trim(),
        defaultExpirationDays: Number(mpDefaultDays) || 5,
        defaultInstructions: mpInstructions.trim(),
      },
    });

    try {
      await saveMercadoPagoConfig({
        accessToken: mpAccessToken.trim(),
        publicKey: mpPublicKey.trim(),
      });
    } catch (err) {
      console.error("Erro ao salvar credenciais do Mercado Pago no servidor:", err);
    }

    setMpSavedSuccess(true);
    setTimeout(() => setMpSavedSuccess(false), 3000);
  };

  // Template custom manager
  const handleCreateTemplate = () => {
    if (!newTemplateName.trim()) return;
    const newTpl = {
      id: 'tpl-' + Date.now(),
      name: newTemplateName.trim(),
      type: newTemplateType,
      date: new Date().toLocaleDateString('pt-BR'),
      stages: newTemplateStages
    };
    const updated = [...projectTemplates, newTpl];
    updateOfficeSettings({ projectTemplates: updated });
    setNewTemplateName('');
    setNewTemplateStages(['Briefing', 'Proposta']);
  };

  const handleAddStageToNewTemplate = () => {
    if (!tempStageInput.trim()) return;
    if (!newTemplateStages.includes(tempStageInput.trim())) {
      setNewTemplateStages([...newTemplateStages, tempStageInput.trim()]);
    }
    setTempStageInput('');
  };

  const handleRemoveStageFromNewTemplate = (idx: number) => {
    setNewTemplateStages(newTemplateStages.filter((_, i) => i !== idx));
  };

  const handleUpdateTemplateBinding = (type: string, tplId: string) => {
    const current = { ...templateBindings };
    current[type] = tplId;
    updateOfficeSettings({ templateBindings: current });
  };

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido (JPG, PNG, WebP).');
      return;
    }
    try {
      setIsCompressingPhoto(true);
      const compressed = await compressImage(file, 500, 500, 0.78);
      if (compressed) {
        setPhotoUrl(compressed);
        updateProfilePhoto(compressed);
      }
    } catch (err) {
      console.error('Erro ao processar foto:', err);
    } finally {
      setIsCompressingPhoto(false);
      if (photoFileInputRef.current) {
        photoFileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = () => {
    setPhotoUrl('');
    updateProfilePhoto('');
  };

  // Profile Action Saves
  const handleSaveProfile = () => {
    updateArchitectProfile({ name, ownerName, title: titleText, niche: selectedNiche, themeColor: selectedTheme, bgTheme: selectedBgTheme, photoUrl });
    updateProfilePhoto(photoUrl);
    changeTheme(selectedTheme);
    changeBgTheme(selectedBgTheme);
    changeNiche(selectedNiche);
    setResetStatus('Dados de perfil e estilo atualizados com sucesso!');
    setTimeout(() => setResetStatus(null), 3000);
  };

  const handleJoinOffice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCodeInput.trim()) return;
    setInviteLoading(true);
    setInviteError('');
    setInviteSuccess('');
    try {
      const res = await joinWithInviteCode(inviteCodeInput);
      if (res.success) {
        setInviteSuccess(res.message);
        setInviteCodeInput('');
      } else {
        setInviteError(res.message);
      }
    } catch (err: any) {
      setInviteError(err.message || 'Erro inesperado.');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (profile?.inviteCode) {
      navigator.clipboard.writeText(profile.inviteCode);
      setIsCopiedCode(true);
      setTimeout(() => setIsCopiedCode(false), 2000);
    }
  };

  // Reset helpers
  const handleResetRequested = () => {
    resetRequestedModules();
    setResetStatus('Módulos principais zerados!');
    setTimeout(() => setResetStatus(null), 4000);
  };

  const handleLoadDemo = () => {
    loadDemoData();
    setResetStatus('Dados de exemplo carregados com sucesso!');
    setTimeout(() => setResetStatus(null), 4000);
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-200">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[var(--text-main)] tracking-wide">Configurações</h1>
          <p className="text-[var(--text-muted)] text-xs mt-0.5">Gerencie as regras e parâmetros operacionais, financeiros e de inteligência do seu sistema</p>
        </div>
        {resetStatus && (
          <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-1.5 self-stretch md:self-auto justify-center">
            <Check className="w-4 h-4 animate-bounce" />
            <span>{resetStatus}</span>
          </div>
        )}
      </div>

      {/* Main Sections Horizontal Tabs */}
      <div className="flex border-b border-[var(--border-color)] overflow-x-auto no-scrollbar gap-1 pt-1 bg-[var(--bg-card-secondary)] p-1.5 rounded-2xl">
        <button
          onClick={() => setActiveSubTab('minha-conta')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'minha-conta'
              ? 'bg-[var(--bg-card)] text-[var(--theme-primary)] border border-[var(--border-color)] font-extrabold shadow-sm'
              : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Minha Conta</span>
        </button>
        <button
          onClick={() => setActiveSubTab('sistema')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'sistema'
              ? 'bg-[var(--bg-card)] text-[var(--theme-primary)] border border-[var(--border-color)] font-extrabold shadow-sm'
              : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Sistema</span>
        </button>
        <button
          onClick={() => setActiveSubTab('operacao')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'operacao'
              ? 'bg-[var(--bg-card)] text-[var(--theme-primary)] border border-[var(--border-color)] font-extrabold shadow-sm'
              : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>Operação</span>
        </button>
        <button
          onClick={() => setActiveSubTab('financeiro')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'financeiro'
              ? 'bg-[var(--bg-card)] text-[var(--theme-primary)] border border-[var(--border-color)] font-extrabold shadow-sm'
              : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Financeiro</span>
        </button>
        <button
          onClick={() => setActiveSubTab('inteligencia')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'inteligencia'
              ? 'bg-[var(--bg-card)] text-[var(--theme-primary)] border border-[var(--border-color)] font-extrabold shadow-sm'
              : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
          }`}
        >
          <Brain className="w-4 h-4" />
          <span>Inteligência</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="space-y-6">

        {/* MINHA CONTA TAB */}
        {activeSubTab === 'minha-conta' && (
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Perfil card */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center gap-2.5 border-b border-[var(--border-color)] pb-3">
                <Users className="w-4 h-4 text-[var(--theme-primary)]" />
                <h3 className="font-serif font-bold text-[var(--text-main)] text-sm uppercase tracking-wider">Perfil</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-[var(--text-muted)] mb-1">Nome</label>
                  <div className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-main)] text-xs font-medium">
                    {getDisplayName()}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-[var(--text-muted)] mb-1">E-mail</label>
                  <div className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-main)] text-xs font-medium">
                    {getDisplayEmail()}
                  </div>
                </div>
              </div>
            </div>

            {/* Alterar Senha card */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center gap-2.5 border-b border-[var(--border-color)] pb-3">
                <Lock className="w-4 h-4 text-[var(--theme-primary)]" />
                <h3 className="font-serif font-bold text-[var(--text-main)] text-sm uppercase tracking-wider">Alterar Senha</h3>
              </div>

              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-[var(--text-muted)] mb-1">Senha Atual</label>
                  <div className="relative">
                    <input
                      type={showCurrentPass ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Sua senha atual"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-main)] text-xs focus:outline-none focus:border-[var(--theme-primary)] pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-main)]"
                    >
                      {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-[var(--text-muted)] mb-1">Nova Senha</label>
                  <div className="relative">
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-main)] text-xs focus:outline-none focus:border-[var(--theme-primary)] pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-main)]"
                    >
                      {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-[var(--text-muted)] mb-1">Confirmar Nova Senha</label>
                  <div className="relative">
                    <input
                      type={showConfirmPass ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita a nova senha"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-main)] text-xs focus:outline-none focus:border-[var(--theme-primary)] pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-main)]"
                    >
                      {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {passwordError && (
                  <p className="text-xs text-rose-500 font-medium">{passwordError}</p>
                )}
                {passwordSuccess && (
                  <p className="text-xs text-emerald-500 font-medium">{passwordSuccess}</p>
                )}

                <button
                  type="submit"
                  disabled={isUpdatingPass}
                  className="w-full py-3 bg-[var(--theme-primary)] hover:opacity-90 text-[var(--bg-card-secondary)] font-bold text-xs rounded-xl transition-all cursor-pointer shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isUpdatingPass ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Alterando senha...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Alterar senha</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* 1. SISTEMA TAB */}
        {activeSubTab === 'sistema' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Business Profile */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2.5 border-b border-[var(--border-color)] pb-3">
                <Building className="w-4 h-4 text-[var(--theme-primary)]" />
                <h3 className="font-serif font-bold text-[var(--text-main)] text-sm">Identidade do Escritório</h3>
              </div>
              
              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-[var(--text-muted)] mb-1">Nome Comercial do Negócio</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setName(val);
                      updateArchitectProfile({ name: val });
                    }}
                    onBlur={() => {
                      if (name.trim()) {
                        updateArchitectProfile({ name: name.trim() });
                      }
                    }}
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-main)] text-xs focus:outline-none focus:border-[var(--theme-primary)]"
                    placeholder="Ex: Studio Alvorada"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-[var(--text-muted)] mb-1">Responsável pelo Escritório</label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setOwnerName(val);
                      updateArchitectProfile({ ownerName: val });
                    }}
                    onBlur={() => {
                      if (ownerName.trim()) {
                        updateArchitectProfile({ ownerName: ownerName.trim() });
                      }
                    }}
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-main)] text-xs focus:outline-none focus:border-[var(--theme-primary)]"
                    placeholder="Ex: Carlos Felipe"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-[var(--text-muted)] mb-1">Título Profissional ou Slogan</label>
                  <input
                    type="text"
                    value={titleText}
                    onChange={(e) => setTitleText(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-main)] text-xs focus:outline-none focus:border-[var(--theme-primary)]"
                    placeholder="Ex: Arquitetura, Interiores e Consultorias"
                  />
                </div>

                {/* Foto de Perfil / Logotipo */}
                <div className="p-3.5 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-color)] flex flex-col sm:flex-row items-center gap-4">
                  <div className="relative group shrink-0">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-[var(--theme-primary)] bg-[var(--bg-card-secondary)] flex items-center justify-center shadow-lg shadow-black/40">
                      {photoUrl ? (
                        <img
                          src={photoUrl}
                          alt="Foto de Perfil"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-[var(--theme-primary)]">
                          <Building className="w-7 h-7 opacity-80" />
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => photoFileInputRef.current?.click()}
                      title="Alterar Foto"
                      className="absolute -bottom-1 -right-1 p-1.5 rounded-xl bg-[var(--theme-primary)] text-black font-bold shadow-md hover:scale-110 transition-transform cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex-1 w-full text-center sm:text-left space-y-1.5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-[var(--text-main)] flex items-center justify-center sm:justify-start gap-1.5">
                          <span>Foto de Perfil ou Logotipo</span>
                          {photoUrl && (
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              Personalizada
                            </span>
                          )}
                        </h4>
                        <p className="text-[10px] text-[var(--text-muted)]">
                          Escolha sua foto profissional ou a logomarca do seu escritório.
                        </p>
                      </div>

                      <div className="flex items-center justify-center sm:justify-end gap-2">
                        <input
                          type="file"
                          ref={photoFileInputRef}
                          accept="image/*"
                          className="hidden"
                          onChange={handlePhotoFileChange}
                        />
                        <button
                          type="button"
                          onClick={() => photoFileInputRef.current?.click()}
                          disabled={isCompressingPhoto}
                          className="px-3 py-1.5 rounded-xl bg-[var(--theme-primary)] text-black font-bold text-[11px] hover:bg-[var(--theme-primary-hover)] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>{isCompressingPhoto ? 'Processando...' : 'Carregar Foto'}</span>
                        </button>
                        {photoUrl && (
                          <button
                            type="button"
                            onClick={handleRemovePhoto}
                            title="Remover foto"
                            className="p-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Presets and URL link */}
                    <div className="pt-2 border-t border-[var(--border-subtle)] flex flex-wrap items-center gap-2">
                      <span className="text-[10px] text-[var(--text-muted)]">Avatares de exemplo:</span>
                      {PRESET_AVATARS.map((av) => (
                        <button
                          key={av.id}
                          type="button"
                          onClick={() => {
                            setPhotoUrl(av.url);
                            updateProfilePhoto(av.url);
                          }}
                          className={`w-6 h-6 rounded-lg overflow-hidden border transition-all cursor-pointer ${
                            photoUrl === av.url
                              ? 'border-[var(--theme-primary)] ring-2 ring-[var(--theme-primary)]/40 scale-105'
                              : 'border-[var(--border-color)] opacity-60 hover:opacity-100 hover:border-white/40'
                          }`}
                          title={av.label}
                        >
                          <img src={av.url} alt={av.label} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[var(--text-muted)] mb-1">Nicho Operacional</label>
                    <select
                      value={selectedNiche}
                      onChange={(e) => {
                        setSelectedNiche(e.target.value as NicheType);
                        changeNiche(e.target.value as NicheType);
                      }}
                      className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-main)] text-xs font-semibold focus:outline-none focus:border-[var(--theme-primary)] cursor-pointer"
                    >
                      {(Object.keys(NICHES) as NicheType[]).map((nk) => (
                        <option key={nk} value={nk}>{NICHES[nk].label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[var(--text-muted)] mb-1">URL da Logomarca (Opcional)</label>
                    <input
                      type="text"
                      value={photoUrl}
                      onChange={(e) => {
                        setPhotoUrl(e.target.value);
                        updateProfilePhoto(e.target.value);
                      }}
                      className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-main)] text-xs focus:outline-none focus:border-[var(--theme-primary)]"
                      placeholder="https://..."
                    />
                  </div>
                </div>

                {/* Color swatch selection */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[var(--text-muted)] mb-2">Paleta Cromática do Painel (Destaques & Detalhes)</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(Object.keys(THEMES) as ThemeColorId[]).map((tk) => {
                        const th = THEMES[tk];
                        const isSelected = selectedTheme === tk;
                        return (
                          <button
                            key={tk}
                            type="button"
                            onClick={() => {
                              setSelectedTheme(tk);
                              changeTheme(tk);
                            }}
                            className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[var(--bg-card-secondary)] border-white/30 ring-2 ring-[var(--theme-primary)]'
                                : 'bg-[var(--bg-input)] border-[var(--border-color)] hover:border-[var(--theme-primary)]'
                            }`}
                          >
                            <span
                              className="w-4 h-4 rounded-full border border-white/20 shrink-0 shadow-xs"
                              style={{ backgroundColor: th.primary }}
                            />
                            <span className="text-[11px] font-semibold text-[var(--text-main)] truncate">
                              {th.name.split(' ')[0]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Background Theme Selection */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[var(--text-muted)] mb-2">Aparência & Cor do Fundo do Site</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {(Object.keys(BG_THEMES) as BgThemeId[]).map((bgKey) => {
                        const bgTh = BG_THEMES[bgKey];
                        const isSelected = selectedBgTheme === bgKey;
                        return (
                          <button
                            key={bgKey}
                            type="button"
                            onClick={() => {
                              setSelectedBgTheme(bgKey);
                              changeBgTheme(bgKey);
                            }}
                            className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[var(--theme-primary)]/10 border-[var(--theme-primary)] ring-2 ring-[var(--theme-primary)]'
                                : 'bg-[var(--bg-input)] border-[var(--border-color)] hover:border-[var(--theme-primary)]'
                            }`}
                          >
                            <span
                              className="w-5 h-5 rounded-md border border-white/20 shrink-0 shadow-inner"
                              style={{ backgroundColor: bgTh.previewBg }}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-bold text-[var(--text-main)] truncate">{bgTh.name}</p>
                              <p className="text-[9px] text-[var(--text-muted)] truncate">{bgTh.subtitle}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSaveProfile}
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[var(--theme-primary)] text-black rounded-xl font-bold transition-all hover:bg-[var(--theme-primary-hover)] cursor-pointer text-xs mt-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Salvar Dados Cadastrais</span>
                </button>
              </div>
            </div>

            {/* Backups & Cloud Sync */}
            <div className="space-y-6">
              
              {/* Backups Card */}
              <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2.5 border-b border-[var(--border-color)] pb-3">
                  <RefreshCw className="w-4 h-4 text-[var(--theme-primary)]" />
                  <h3 className="font-serif font-bold text-[var(--text-main)] text-sm">Cópias de Segurança & Backup</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <button
                    onClick={() => exportDataJSON()}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--bg-input)] hover:bg-[var(--bg-card-secondary)] border border-[var(--border-color)] hover:border-[var(--theme-primary)]/40 transition-all text-left cursor-pointer"
                  >
                    <div>
                      <h4 className="font-bold text-[var(--text-main)] text-xs">Exportar Backup</h4>
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Baixar arquivo com todos os dados (.json)</p>
                    </div>
                    <Download className="w-4 h-4 text-[var(--theme-primary)]" />
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--bg-input)] hover:bg-[var(--bg-card-secondary)] border border-[var(--border-color)] hover:border-blue-500/40 transition-all text-left cursor-pointer"
                  >
                    <div>
                      <h4 className="font-bold text-[var(--text-main)] text-xs">Importar Backup</h4>
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Carregar arquivo salvo anteriormente (.json)</p>
                    </div>
                    <Upload className="w-4 h-4 text-blue-400" />
                  </button>
                  <input
                    type="file"
                    accept=".json"
                    ref={fileInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          const content = ev.target?.result as string;
                          if (content && importDataJSON(content)) {
                            setResetStatus('Backup carregado com sucesso!');
                            setTimeout(() => setResetStatus(null), 3000);
                          }
                        };
                        reader.readAsText(file);
                      }
                    }}
                    className="hidden"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                  <button
                    onClick={handleLoadDemo}
                    className="flex-1 py-2 px-3 rounded-xl border border-[var(--border-color)] text-center text-xs font-bold hover:bg-[var(--bg-card-hover)] transition-colors text-[var(--text-main)] cursor-pointer"
                  >
                    Carregar Dados de Exemplo
                  </button>
                  
                  <button
                    onClick={handleResetRequested}
                    className="flex-1 py-2 px-3 rounded-xl border border-rose-500/25 hover:border-rose-500/50 bg-rose-500/5 text-rose-400 text-center text-xs font-bold transition-colors cursor-pointer"
                  >
                    Zerar Módulos Básicos
                  </button>
                </div>
              </div>

              {/* Collaboration Setup */}
              <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2.5 border-b border-[var(--border-color)] pb-3">
                  <Users className="w-4 h-4 text-[var(--theme-primary)]" />
                  <h3 className="font-serif font-bold text-[var(--text-main)] text-sm">Integração de Equipe & Convites</h3>
                </div>

                {profile?.joinedOwnerUid ? (
                  <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-300 space-y-3">
                    <div>
                      <p className="font-bold flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5" />
                        Você faz parte de outro escritório!
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)] mt-1">Suas configurações de sistema estão sob a administração do proprietário principal do escritório.</p>
                    </div>
                    <button
                      onClick={async () => {
                        if (confirm("Deseja realmente sair deste escritório e retornar para o seu próprio?")) {
                          await leaveCollaboratedOffice();
                        }
                      }}
                      className="w-full py-2 bg-rose-600/90 hover:bg-rose-600 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                    >
                      Desvincular e Sair do Escritório
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-[11px] text-[var(--text-muted)]">Gere um código de convite para que outros colaboradores possam acessar seus dados de projetos e CRM sincronizados.</p>
                    {profile?.inviteCode ? (
                      <div className="flex items-center justify-between p-2.5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl">
                        <div className="flex flex-col">
                          <span className="text-[9px] uppercase font-semibold text-[var(--text-muted)]">Seu Código de Convite:</span>
                          <span className="text-xs font-mono font-bold text-[var(--theme-primary)]">{profile.inviteCode}</span>
                        </div>
                        <button
                          onClick={handleCopyCode}
                          className="p-2 bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>{isCopiedCode ? 'Copiado!' : 'Copiar'}</span>
                        </button>
                      </div>
                    ) : (
                      <div className="p-3.5 bg-[var(--bg-card-secondary)]/40 border border-dashed border-[var(--border-color)] rounded-xl text-center">
                        <span className="text-xs text-[var(--text-muted)]">Crie uma conta com seu e-mail para ativar a colaboração por convites</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* 2. OPERACAO TAB (The rich pipeline, actions, templates and tags manager shown in screenshots) */}
        {activeSubTab === 'operacao' && (
          <div className="space-y-6">

            {/* SUB-SECTION 1: Ações */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ChevronRight className="w-4 h-4 text-[var(--theme-primary)] shrink-0" />
                <div>
                   <h2 className="text-sm font-serif font-bold text-[var(--text-main)]">Ações</h2>
                   <p className="text-[10px] text-[var(--text-muted)]">Regras e tipos de ação do sistema</p>
                </div>
              </div>

              {/* CARD 1: Matriz Área x Vínculo */}
              <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-[var(--bg-card-secondary)] border border-[var(--border-color)]">
                    <Sliders className="w-5 h-5 text-[var(--theme-primary)]" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-[var(--text-main)] text-sm">Matriz Área × Vínculo</h3>
                    <p className="text-[11px] text-[var(--text-muted)]">Defina quais vínculos podem ser usados em cada área de ação</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-[var(--text-muted)]">
                    <thead>
                      <tr className="border-b border-[var(--border-color)] text-[var(--text-main)]">
                        <th className="text-left pb-2.5 font-bold uppercase tracking-wider text-[10px]">ÁREA</th>
                        <th className="text-center pb-2.5 font-bold uppercase tracking-wider text-[10px]">LEAD</th>
                        <th className="text-center pb-2.5 font-bold uppercase tracking-wider text-[10px]">CLIENTE</th>
                        <th className="text-center pb-2.5 font-bold uppercase tracking-wider text-[10px]">PROJETO</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)]/30">
                      {(['comercial', 'operacao', 'financeiro'] as const).map(area => (
                        <tr key={area} className="hover:bg-[var(--bg-card-secondary)]/40 transition-colors">
                          <td className="py-3 font-bold text-[var(--text-main)] capitalize">{area === 'comercial' ? 'Comercial' : area === 'operacao' ? 'Operação' : 'Financeiro'}</td>
                          {(['lead', 'cliente', 'projeto'] as const).map(vin => {
                            const isChecked = officeSettings.actionMatrix[area][vin];
                            return (
                              <td key={vin} className="py-3 text-center">
                                <label className="relative inline-flex items-center cursor-pointer justify-center">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleMatrixCell(area, vin)}
                                    className="sr-only peer"
                                  />
                                  <div className="w-9 h-5 bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--theme-primary)] peer-checked:after:bg-black peer-checked:after:border-transparent"></div>
                                </label>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="pt-3 border-t border-[var(--border-color)]/30 space-y-2">
                  <p className="text-[10px] text-[var(--text-muted)]">Combinações desabilitadas ficam bloqueadas no formulário de nova ação. Ações existentes com combinações desabilitadas não são afetadas.</p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {officeSettings.actionMatrix.comercial.lead || officeSettings.actionMatrix.comercial.cliente ? (
                      <span className="px-2.5 py-1 rounded-full bg-[rgba(var(--theme-primary-rgb),0.12)] text-[var(--theme-primary)] border border-[rgba(var(--theme-primary-rgb),0.25)] text-[10px] font-bold">
                        Comercial: {['lead', 'cliente'].filter(v => officeSettings.actionMatrix.comercial[v as 'lead'|'cliente']).map(s => s === 'lead' ? 'Lead' : 'Cliente').join(', ')}
                      </span>
                    ) : null}
                    {officeSettings.actionMatrix.operacao.cliente || officeSettings.actionMatrix.operacao.projeto ? (
                      <span className="px-2.5 py-1 rounded-full bg-[var(--bg-card-secondary)] text-[var(--text-muted)] border border-[var(--border-color)] text-[10px] font-bold">
                        Operação: {['cliente', 'projeto'].filter(v => officeSettings.actionMatrix.operacao[v as 'cliente'|'projeto']).map(s => s === 'cliente' ? 'Cliente' : 'Projeto').join(', ')}
                      </span>
                    ) : null}
                    {officeSettings.actionMatrix.financeiro.cliente || officeSettings.actionMatrix.financeiro.projeto ? (
                      <span className="px-2.5 py-1 rounded-full bg-[var(--bg-card-secondary)] text-[var(--text-muted)] border border-[var(--border-color)] text-[10px] font-bold">
                        Financeiro: {['cliente', 'projeto'].filter(v => officeSettings.actionMatrix.financeiro[v as 'cliente'|'projeto']).map(s => s === 'cliente' ? 'Cliente' : 'Projeto').join(', ')}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* CARD 2: Tipos de Ação */}
              <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between gap-2 border-b border-[var(--border-color)] pb-3">
                  <div>
                    <h3 className="font-serif font-bold text-[var(--text-main)] text-sm">Tipos de Ação</h3>
                    <p className="text-[11px] text-[var(--text-muted)]">Configure os tipos disponíveis por área — tipos inativos não aparecem no formulário</p>
                  </div>
                  <button
                    onClick={() => setIsEditingActions(!isEditingActions)}
                    className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] text-[11px] font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)] transition-all cursor-pointer"
                  >
                    {isEditingActions ? 'Finalizar Edição' : 'Editar'}
                  </button>
                </div>

                {/* Sub Tab filtering inside Card */}
                <div className="flex gap-1 bg-[var(--bg-input)] p-1 rounded-xl w-fit">
                  {(['Comercial', 'Operação', 'Financeiro'] as const).map(area => {
                    const count = officeSettings.actionTypes.filter(act => act.areas.includes(area)).length;
                    return (
                      <button
                        key={area}
                        onClick={() => setActionAreaFilter(area)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold tracking-wider uppercase cursor-pointer transition-all ${
                          actionAreaFilter === area
                            ? 'bg-[var(--bg-card-secondary)] text-[var(--theme-primary)]'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                        }`}
                      >
                        {area} <span className="text-[9px] opacity-70 ml-0.5">{count}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-wrap gap-2">
                  {officeSettings.actionTypes
                    .filter(act => act.areas.includes(actionAreaFilter))
                    .map(act => (
                      <span
                        key={act.id}
                        className="px-3 py-1.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-main)] text-xs font-semibold flex items-center gap-1.5 transition-all group"
                      >
                        <span>{act.name}</span>
                        {act.areas.length > 1 && (
                          <span className="text-[9px] text-[var(--text-muted)] font-bold px-1 rounded bg-[var(--bg-card-secondary)]">
                            {act.areas.length} ÁREAS
                          </span>
                        )}
                        {isEditingActions && (
                          <button
                            onClick={() => {
                              const list = officeSettings.actionTypes.filter(a => a.id !== act.id);
                              updateOfficeSettings({ actionTypes: list });
                            }}
                            className="p-0.5 rounded hover:bg-rose-500/10 text-rose-400 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </span>
                    ))}
                </div>

                {/* Add actions block */}
                {isEditingActions && (
                  <div className="flex items-center gap-2 pt-2 border-t border-[var(--border-color)]/30 max-w-md">
                    <input
                      type="text"
                      value={newActionType}
                      onChange={(e) => setNewActionType(e.target.value)}
                      placeholder="Novo tipo de ação (ex: Lançar aditivo)"
                      className="flex-1 px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-main)] text-xs focus:outline-none"
                    />
                    <button
                      onClick={() => {
                        if (!newActionType.trim()) return;
                        const list = [...officeSettings.actionTypes];
                        list.push({
                          id: 'act-' + Date.now(),
                          name: newActionType.trim(),
                          areas: [actionAreaFilter]
                        });
                        updateOfficeSettings({ actionTypes: list });
                        setNewActionType('');
                      }}
                      className="px-4 py-2 rounded-xl bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-black text-xs font-bold cursor-pointer transition-colors"
                    >
                      Adicionar
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* SUB-SECTION 2: Leads */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ChevronRight className="w-4 h-4 text-[var(--theme-primary)] shrink-0" />
                <div>
                  <h2 className="text-sm font-serif font-bold text-[var(--text-main)]">Leads</h2>
                  <p className="text-[10px] text-[var(--text-muted)]">Pipeline, canais e classificação</p>
                </div>
              </div>

              {/* CARD 1: Status e Substatuses do Lead */}
              <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
                <div>
                  <h3 className="font-serif font-bold text-[var(--text-main)] text-sm">Status e Substatuses do Lead</h3>
                  <p className="text-[11px] text-[var(--text-muted)]">Configure as etapas do pipeline e os substatuses disponíveis em cada etapa</p>
                </div>

                <div className="space-y-2">
                  {officeSettings.leadStages.map((stg, idx) => (
                    <div
                      key={stg.id}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                        stg.enabled 
                          ? 'bg-[var(--bg-input)] border-[var(--border-color)]' 
                          : 'bg-[var(--bg-input)]/30 border-[var(--border-color)]/30 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Up/down reorder */}
                        <div className="flex flex-col text-zinc-600">
                          <button onClick={() => reorderLeadStage(idx, 'up')} disabled={idx === 0} className="hover:text-[var(--text-main)] disabled:opacity-30 cursor-pointer">
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => reorderLeadStage(idx, 'down')} disabled={idx === officeSettings.leadStages.length - 1} className="hover:text-[var(--text-main)] disabled:opacity-30 cursor-pointer">
                            <ChevronDown className="w-3.5 h-3.5 animate-in" />
                          </button>
                        </div>

                        {/* Dot indicator based on status group */}
                        <span
                          className={`w-2.5 h-2.5 rounded-full`}
                          style={{
                            backgroundColor: stg.status === 'Ganho' ? '#10b981' : stg.status === 'Perdido' ? '#ef4444' : '#3b82f6'
                          }}
                        />

                        {/* Label name */}
                        <span className="font-bold text-[var(--text-main)] text-xs">{stg.name}</span>
                        
                        {/* Status group badge */}
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-wider uppercase ${
                          stg.status === 'Ganho' 
                            ? 'bg-emerald-500/10 text-emerald-400' 
                            : stg.status === 'Perdido' 
                              ? 'bg-rose-500/10 text-rose-400' 
                              : 'bg-[var(--bg-card-secondary)] text-[var(--text-muted)]'
                        }`}>
                          {stg.status === 'Ganho' ? 'Ganho' : stg.status === 'Perdido' ? 'Perdido' : 'Ativo'}
                        </span>

                        <span className="text-[10px] text-[var(--text-muted)]">
                          {stg.subsCount || 6} subs
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <button className="text-[11px] font-bold text-[var(--theme-primary)] hover:underline flex items-center gap-0.5 cursor-pointer">
                           <span>Substatuses</span>
                           <ChevronRight className="w-3 h-3" />
                        </button>

                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={stg.enabled}
                            onChange={() => toggleLeadStage(stg.id)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--theme-primary)] peer-checked:after:bg-black peer-checked:after:border-transparent"></div>
                        </label>
                        
                        <button
                          onClick={() => {
                            const list = officeSettings.leadStages.filter(s => s.id !== stg.id);
                            updateOfficeSettings({ leadStages: list });
                          }}
                          className="p-1 rounded text-[var(--text-muted)] hover:text-rose-400 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={() => {
                      const nameInput = prompt('Digite o nome da nova etapa do funil:');
                      if (!nameInput) return;
                      const list = [...officeSettings.leadStages];
                      list.push({
                        id: 'stg-' + Date.now(),
                        label: nameInput.trim(),
                        name: nameInput.trim(),
                        status: 'Ativo',
                        subsCount: 6,
                        enabled: true
                      });
                      updateOfficeSettings({ leadStages: list });
                    }}
                    className="flex items-center gap-1.5 text-xs text-[var(--theme-primary)] hover:text-[var(--theme-primary-hover)] font-bold cursor-pointer pt-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Novo status</span>
                  </button>
                </div>

                <p className="text-[10px] text-[var(--text-muted)] pt-2 border-t border-[var(--border-color)]/30">Use as setas para reordenar as etapas do funil. Clique no nome para renomear. Ativo (em andamento), Ganho (contrato fechado) ou Perdido (negociação encerrada).</p>
              </div>

              {/* CARD 2: Motivos de Perda */}
              <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                  <div>
                    <h3 className="font-serif font-bold text-[var(--text-main)] text-sm">Motivos de perda</h3>
                    <p className="text-[11px] text-[var(--text-muted)]">Categorias disponíveis ao registrar uma venda perdida</p>
                  </div>
                  <button
                    onClick={() => {
                      const value = prompt('Digite o novo motivo de perda:');
                      if (value && value.trim()) {
                        updateOfficeSettings({ lossReasons: [...officeSettings.lossReasons, value.trim()] });
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] text-[11px] font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer"
                  >
                    + Adicionar
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto no-scrollbar pr-1">
                  {officeSettings.lossReasons.map(reason => (
                    <div key={reason} className="flex items-center justify-between p-2.5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl text-xs">
                      <div className="flex items-center gap-2">
                        <Sliders className="w-3.5 h-3.5 text-zinc-600" />
                        <span className="text-[var(--text-main)] font-medium">{reason}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteLossReason(reason)}
                        className="p-1 text-[var(--text-muted)] hover:text-rose-400 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* CARD 3 & 4 SIDE BY SIDE: Canais de Aquisição & Tags */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Canais de Aquisição */}
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                    <h3 className="font-serif font-bold text-[var(--text-main)] text-sm">Canais de Aquisição</h3>
                    <button
                      onClick={() => {
                        const channel = prompt('Digite o novo canal de aquisição (ex: TikTok, Google):');
                        if (channel && channel.trim()) {
                          updateOfficeSettings({ acquisitionChannels: [...officeSettings.acquisitionChannels, channel.trim()] });
                        }
                      }}
                      className="p-1 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-card-hover)] text-[var(--theme-primary)] transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    {officeSettings.acquisitionChannels.map(chan => (
                      <div key={chan} className="flex items-center justify-between p-2.5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl text-xs">
                        <div className="flex items-center gap-2">
                          <CheckSquare className="w-3.5 h-3.5 text-[var(--theme-primary)]" />
                          <span className="text-[var(--text-main)] font-semibold">{chan}</span>
                        </div>
                        <button
                          onClick={() => handleDeleteAcquisitionChannel(chan)}
                          className="p-1 text-[var(--text-muted)] hover:text-rose-400 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tags Card */}
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                    <h3 className="font-serif font-bold text-[var(--text-main)] text-sm">Etiquetas (Tags)</h3>
                    <button
                      onClick={() => {
                        const tagVal = prompt('Digite a nova tag do escritório:');
                        if (tagVal && tagVal.trim()) {
                          updateOfficeSettings({ tags: [...officeSettings.tags, tagVal.trim()] });
                        }
                      }}
                      className="p-1 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-card-hover)] text-[var(--theme-primary)] transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="min-h-[140px] p-4 bg-[var(--bg-input)] border border-dashed border-[var(--border-color)] rounded-2xl flex flex-wrap gap-2 items-start justify-start">
                    {officeSettings.tags.length === 0 ? (
                      <span className="text-xs text-[var(--text-muted)] italic p-1.5">Nenhuma tag cadastrada ainda.</span>
                    ) : (
                      officeSettings.tags.map(tag => (
                        <div key={tag} className="flex items-center gap-1.5 px-3 py-1 bg-[var(--theme-badge-bg)] text-[var(--theme-badge-text)] border border-[var(--theme-badge-border)] rounded-full text-xs font-semibold">
                          <span>{tag}</span>
                          <button
                            onClick={() => handleDeleteOfficeTag(tag)}
                            className="text-xs hover:text-rose-400 font-bold leading-none cursor-pointer"
                          >
                            ×
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* SUB-SECTION 3: Projetos (as seen in screenshots 4 and 5) */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ChevronRight className="w-4 h-4 text-[var(--theme-primary)] shrink-0" />
                <div>
                  <h2 className="text-sm font-serif font-bold text-[var(--text-main)]">Projetos</h2>
                  <p className="text-[10px] text-[var(--text-muted)]">Tipos, status e templates de projeto</p>
                </div>
              </div>

              <ProjectTemplatesManager
                officeSettings={officeSettings}
                updateOfficeSettings={updateOfficeSettings}
                projectTypes={projectTypes}
                templateBindings={templateBindings}
                handleUpdateTemplateBinding={handleUpdateTemplateBinding}
              />

              {/* CARD 3 & 4 SIDE BY SIDE: Tipos de Projeto & Status de Projeto */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Tipos de Projeto */}
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                    <h3 className="font-serif font-bold text-[var(--text-main)] text-sm">Tipos de Projeto</h3>
                    <button
                      onClick={() => {
                        const typeVal = prompt('Nome do novo tipo de projeto:');
                        if (typeVal && typeVal.trim()) {
                          const updated = [...projectTypes, typeVal.trim()];
                          updateOfficeSettings({ projectTypes: updated });
                        }
                      }}
                      className="p-1 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-card-hover)] text-[var(--theme-primary)] cursor-pointer transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[220px] overflow-y-auto no-scrollbar">
                    {projectTypes.map(type => (
                      <div key={type} className="flex items-center justify-between p-2.5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl text-xs font-semibold text-[var(--text-main)]">
                        <div className="flex items-center gap-2">
                          <Sliders className="w-3.5 h-3.5 text-zinc-600" />
                          <span>{type}</span>
                        </div>
                        <button
                          onClick={() => handleDeleteProjectType(type)}
                          className="p-1 text-[var(--text-muted)] hover:text-rose-400 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status de Projeto */}
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                    <h3 className="font-serif font-bold text-[var(--text-main)] text-sm">Status de Projeto</h3>
                    <button
                      onClick={() => {
                        const nameVal = prompt('Nome do novo status de projeto:');
                        if (!nameVal) return;
                        const colorVal = prompt('Cor hexadecimal para o status (ex: #ef4444):', '#3b82f6');
                        const updated = [...projectStatuses, { name: nameVal.trim(), color: colorVal || '#3b82f6' }];
                        updateOfficeSettings({ projectStatuses: updated });
                      }}
                      className="p-1 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-card-hover)] text-[var(--theme-primary)] cursor-pointer transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[220px] overflow-y-auto no-scrollbar">
                    {projectStatuses.map(status => (
                      <div key={status.name} className="flex items-center justify-between p-2.5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl text-xs font-semibold text-[var(--text-main)]">
                        <div className="flex items-center gap-2.5">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: status.color }} />
                          <span>{status.name}</span>
                        </div>
                        <button
                          onClick={() => handleDeleteProjectStatus(status.name)}
                          className="p-1 text-[var(--text-muted)] hover:text-rose-400 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* 3. FINANCEIRO TAB */}
        {activeSubTab === 'financeiro' && (
          <div className="space-y-6">
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
              <div>
                <h3 className="font-serif font-bold text-[var(--text-main)] text-sm">Categorias Financeiras (Regras DRE)</h3>
                <p className="text-[11px] text-[var(--text-muted)]">Classifique suas entradas e saídas para alimentar relatórios de DRE e orçamentários do sistema</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Receitas */}
                <div className="bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl p-4 space-y-3">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 block tracking-wider border-b border-[var(--border-color)] pb-1.5">RECEITAS</span>
                  <div className="space-y-1.5 max-h-[200px] overflow-y-auto no-scrollbar">
                    {officeSettings.financialCategories.receitas.map(item => (
                      <div key={item} className="flex items-center justify-between p-2 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)]/40 text-xs text-[var(--text-main)]">
                        <span>{item}</span>
                        <button onClick={() => deleteFinancialCategory('receitas', item)} className="text-[var(--text-muted)] hover:text-rose-400 cursor-pointer p-0.5">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-1.5 pt-1">
                    <input
                      type="text"
                      placeholder="Nova receita"
                      value={newReceita}
                      onChange={(e) => setNewReceita(e.target.value)}
                      className="flex-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-2.5 py-1 text-xs text-[var(--text-main)] focus:outline-none"
                    />
                    <button
                      onClick={() => { addFinancialCategory('receitas', newReceita); setNewReceita(''); }}
                      className="bg-emerald-500 hover:bg-emerald-600 text-black p-1.5 rounded-lg cursor-pointer flex items-center justify-center font-bold"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </div>
                </div>

                {/* Custos Diretos */}
                <div className="bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl p-4 space-y-3">
                  <span className="text-[10px] uppercase font-bold text-amber-400 block tracking-wider border-b border-[var(--border-color)] pb-1.5">CUSTOS DIRETOS</span>
                  <div className="space-y-1.5 max-h-[200px] overflow-y-auto no-scrollbar">
                    {officeSettings.financialCategories.custosDiretos.map(item => (
                      <div key={item} className="flex items-center justify-between p-2 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)]/40 text-xs text-[var(--text-main)]">
                        <span>{item}</span>
                        <button onClick={() => deleteFinancialCategory('custosDiretos', item)} className="text-[var(--text-muted)] hover:text-rose-400 cursor-pointer p-0.5">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-1.5 pt-1">
                    <input
                      type="text"
                      placeholder="Novo custo"
                      value={newCustoDireto}
                      onChange={(e) => setNewCustoDireto(e.target.value)}
                      className="flex-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-2.5 py-1 text-xs text-[var(--text-main)] focus:outline-none"
                    />
                    <button
                      onClick={() => { addFinancialCategory('custosDiretos', newCustoDireto); setNewCustoDireto(''); }}
                      className="bg-amber-500 hover:bg-amber-600 text-black p-1.5 rounded-lg cursor-pointer flex items-center justify-center font-bold"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </div>
                </div>

                {/* Despesas */}
                <div className="bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl p-4 space-y-3">
                  <span className="text-[10px] uppercase font-bold text-rose-400 block tracking-wider border-b border-[var(--border-color)] pb-1.5">DESPESAS OPERACIONAIS</span>
                  <div className="space-y-1.5 max-h-[200px] overflow-y-auto no-scrollbar">
                    {officeSettings.financialCategories.despesasOperacionais.map(item => (
                      <div key={item} className="flex items-center justify-between p-2 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)]/40 text-xs text-[var(--text-main)]">
                        <span>{item}</span>
                        <button onClick={() => deleteFinancialCategory('despesasOperacionais', item)} className="text-[var(--text-muted)] hover:text-rose-400 cursor-pointer p-0.5">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-1.5 pt-1">
                    <input
                      type="text"
                      placeholder="Nova despesa"
                      value={newDespOperacional}
                      onChange={(e) => setNewDespOperacional(e.target.value)}
                      className="flex-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-2.5 py-1 text-xs text-[var(--text-main)] focus:outline-none"
                    />
                    <button
                      onClick={() => { addFinancialCategory('despesasOperacionais', newDespOperacional); setNewDespOperacional(''); }}
                      className="bg-rose-500 hover:bg-rose-600 text-black p-1.5 rounded-lg cursor-pointer flex items-center justify-center font-bold"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Mercado Pago Integration Configuration */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-color)] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                    <Zap className="w-4 h-4 fill-current" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-[var(--text-main)] text-sm">
                      Integração Mercado Pago (Boletos Registrados & Cobranças)
                    </h3>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      Permite que seu escritório emita boletos válidos (FEBRABAN) e cobranças com compensação e conciliação automática.
                    </p>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 self-start sm:self-auto flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{mpAccessToken ? 'Chave do Escritório Ativa' : 'Pronto p/ Emitir (Chave Padrão)'}</span>
                </span>
              </div>

              {mpSavedSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in">
                  <Check className="w-4 h-4" />
                  <span>Configurações do Mercado Pago salvas com sucesso!</span>
                </div>
              )}

              <div className="space-y-3.5 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-medium text-[var(--text-muted)]">
                      Access Token do Mercado Pago (Opcional)
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowMpToken(!showMpToken)}
                      className="text-[10px] text-amber-400 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      {showMpToken ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showMpToken ? 'Ocultar' : 'Visualizar'}</span>
                    </button>
                  </div>
                  <input
                    type={showMpToken ? 'text' : 'password'}
                    value={mpAccessToken}
                    onChange={(e) => setMpAccessToken(e.target.value)}
                    placeholder="TEST-... ou APP_USR-... (Deixe em branco para usar a chave padrão da plataforma)"
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <p className="text-[10px] text-[var(--text-muted)] opacity-80 mt-1">
                    Se você inserir seu próprio token (Access Token de Produção ou Teste do Mercado Pago Developers), os valores pagos pelos seus clientes entrarão diretamente na sua conta bancária / Mercado Pago.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-[11px] font-medium text-[var(--text-muted)] block mb-1">
                      Public Key (Chave Pública)
                    </label>
                    <input
                      type="text"
                      value={mpPublicKey}
                      onChange={(e) => setMpPublicKey(e.target.value)}
                      placeholder="TEST-... ou APP_USR-..."
                      className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-[var(--text-muted)] block mb-1">
                      Dias Padrão para Vencimento do Boleto
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={mpDefaultDays}
                      onChange={(e) => setMpDefaultDays(Number(e.target.value))}
                      className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-[var(--text-muted)] block mb-1">
                    Instruções Padrão de Multa e Juros Impressas no Boleto
                  </label>
                  <input
                    type="text"
                    value={mpInstructions}
                    onChange={(e) => setMpInstructions(e.target.value)}
                    placeholder="Após o vencimento cobrar multa de 2% e juros de mora de 1% ao mês."
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveMercadoPagoConfig}
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Salvar Configurações do Mercado Pago</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. INTELIGENCIA TAB */}
        {activeSubTab === 'inteligencia' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Gemini Setup */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2.5 border-b border-[var(--border-color)] pb-3">
                <Brain className="w-4 h-4 text-[var(--theme-primary)]" />
                <h3 className="font-serif font-bold text-[var(--text-main)] text-sm">Assistente de IA & Auditoria (Gemini)</h3>
              </div>

              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between p-3.5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl">
                  <div className="space-y-0.5">
                    <span className="font-bold text-[var(--text-main)]">Ativar Relatórios Automáticos de Saúde</span>
                    <p className="text-[10px] text-[var(--text-muted)]">Audita seu fluxo financeiro mensal utilizando inteligência artificial</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={aiEnabled}
                      onChange={() => setAiEnabled(!aiEnabled)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-zinc-850 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--theme-primary)] peer-checked:after:bg-black peer-checked:after:border-transparent"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl">
                  <div className="space-y-0.5">
                    <span className="font-bold text-[var(--text-main)]">Alertas de Auditoria de Lançamento</span>
                    <p className="text-[10px] text-[var(--text-muted)]">Detecta duplicidades ou incoerências nas parcelas ou prazos de projetos</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoAuditAlerts}
                      onChange={() => setAutoAuditAlerts(!autoAuditAlerts)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-zinc-850 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--theme-primary)] peer-checked:after:bg-black peer-checked:after:border-transparent"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Threshold limits */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2.5 border-b border-[var(--border-color)] pb-3">
                <AlertTriangle className="w-4 h-4 text-[var(--theme-primary)]" />
                <h3 className="font-serif font-bold text-[var(--text-main)] text-sm">Gatilhos de Saúde do Negócio</h3>
              </div>

              <div className="space-y-4 text-xs">
                <div className="flex flex-col gap-2 p-3.5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl">
                  <div className="flex justify-between">
                    <span className="font-bold text-[var(--text-main)]">Meses de Sobrevivência Mínimos (Runway)</span>
                    <span className="text-[var(--theme-primary)] font-bold">{cashRunawayThreshold} meses</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="12"
                    value={cashRunawayThreshold}
                    onChange={(e) => setCashRunawayThreshold(Number(e.target.value))}
                    className="w-full h-1 bg-[var(--bg-card-secondary)] rounded-lg appearance-none cursor-pointer accent-[var(--theme-primary)]"
                  />
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">
                    Gera um aviso crítico na página "Saúde do Negócio" caso o saldo em caixa projetado seja inferior ao período definido.
                  </p>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
