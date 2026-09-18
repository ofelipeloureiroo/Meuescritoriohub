import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  Upload,
  Trash2,
  X,
  Settings,
  Image as ImageIcon,
  Save,
  AlertTriangle,
  LogOut,
  Shield,
  Palette,
  Briefcase,
  Sparkles,
  RefreshCw,
  Layers,
  CheckSquare,
  Plus,
  ChevronRight,
  Check,
  Building,
  DollarSign,
  Tag,
  Share2,
  Users,
  Lock,
  Copy,
  Camera,
  User,
} from 'lucide-react';
import { compressImage } from '../../utils/imageCompressor';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { NicheType, ThemeColorId, OfficeSettings, CollaboratorPermissions } from '../../types';
import { NICHES, THEMES } from '../../utils/theme';

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

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    architectProfile,
    updateArchitectProfile,
    updateProfilePhoto,
    changeTheme,
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
    removeCollaborator,
    logout
  } = useAuth();
  const navigate = useNavigate();

  // Tab control inside Modal
  const [modalTab, setModalTab] = useState<'profile' | 'advanced' | 'collaborators'>('profile');
  const [advSubTab, setAdvSubTab] = useState<'categories' | 'actions' | 'leads' | 'acquisition'>('categories');

  // Collaboration Form States
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [isCopiedCode, setIsCopiedCode] = useState(false);

  // Profile Form States
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [selectedNiche, setSelectedNiche] = useState<NicheType>('arquitetura');
  const [selectedTheme, setSelectedTheme] = useState<ThemeColorId>('gold');
  const [isCompressingPhoto, setIsCompressingPhoto] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [tempUrlInput, setTempUrlInput] = useState('');
  const photoFileInputRef = useRef<HTMLInputElement>(null);
  
  // Confirms
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDemoConfirm, setShowDemoConfirm] = useState(false);
  const [resetStatus, setResetStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Advanced: Quick form inputs
  const [newReceita, setNewReceita] = useState('');
  const [newCustoDireto, setNewCustoDireto] = useState('');
  const [newDespOperacional, setNewDespOperacional] = useState('');

  const [newActionType, setNewActionType] = useState('');
  const [newActionAreas, setNewActionAreas] = useState<string[]>(['Comercial']);

  const [newLossReason, setNewLossReason] = useState('');
  const [newChannel, setNewChannel] = useState('');
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(architectProfile.name || '');
      setTitle(architectProfile.title || '');
      setPhotoUrl(architectProfile.photoUrl || '');
      setSelectedNiche(architectProfile.niche || 'arquitetura');
      setSelectedTheme(architectProfile.themeColor || 'gold');
      setShowResetConfirm(false);
      setShowDemoConfirm(false);
    }
  }, [isOpen, architectProfile]);

  if (!isOpen) return null;

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

  // Actions Profile
  const handleSaveProfile = () => {
    updateArchitectProfile({ name, title, niche: selectedNiche, themeColor: selectedTheme, photoUrl });
    updateProfilePhoto(photoUrl);
    changeTheme(selectedTheme);
    changeNiche(selectedNiche);
    onClose();
  };

  const handleSelectThemeQuick = (t: ThemeColorId) => {
    setSelectedTheme(t);
    changeTheme(t);
  };

  const handleSelectNicheQuick = (n: NicheType) => {
    setSelectedNiche(n);
    changeNiche(n);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      if (content) {
        if (importDataJSON(content)) {
          alert('Dados carregados com sucesso!');
          onClose();
        } else {
          alert('Erro ao carregar dados. O arquivo JSON pode estar corrompido ou ser inválido.');
        }
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleResetData = () => {
    if (showResetConfirm) {
      resetAllData();
      setShowResetConfirm(false);
      setResetStatus('Todo o escritório foi zerado com sucesso.');
      setTimeout(() => setResetStatus(null), 4000);
    } else {
      setShowResetConfirm(true);
    }
  };

  const handleResetRequested = () => {
    resetRequestedModules();
    setResetStatus('Financeiro, Projetos, Equipe e Fornecedores zerados com sucesso!');
    setTimeout(() => setResetStatus(null), 4000);
  };

  const handleResetFinance = () => {
    resetFinancialData();
    setResetStatus('Módulo Financeiro zerado com sucesso.');
    setTimeout(() => setResetStatus(null), 4000);
  };

  const handleResetProjects = () => {
    resetProjectsData();
    setResetStatus('Módulo de Projetos zerado com sucesso.');
    setTimeout(() => setResetStatus(null), 4000);
  };

  const handleResetTeam = () => {
    resetTeamData();
    setResetStatus('Equipe redefinida para o titular administrador.');
    setTimeout(() => setResetStatus(null), 4000);
  };

  const handleResetSuppliers = () => {
    resetSuppliersData();
    setResetStatus('Catálogo de fornecedores limpo com sucesso.');
    setTimeout(() => setResetStatus(null), 4000);
  };

  const handleLoadDemo = () => {
    if (showDemoConfirm) {
      loadDemoData();
      setShowDemoConfirm(false);
      onClose();
    } else {
      setShowDemoConfirm(true);
    }
  };

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  // ADVANCED SETTINGS MANAGEMENT ACTION HELPERS
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

  const toggleMatrixCell = (area: 'comercial' | 'operacao' | 'financeiro', vinculo: 'lead' | 'cliente' | 'projeto') => {
    const current = { ...officeSettings.actionMatrix };
    current[area] = { ...current[area], [vinculo]: !current[area][vinculo] };
    updateOfficeSettings({ actionMatrix: current });
  };

  const addActionType = () => {
    if (!newActionType.trim()) return;
    const list = [...officeSettings.actionTypes];
    const newId = 'act-' + (list.length + 1);
    list.push({
      id: newId,
      name: newActionType.trim(),
      areas: newActionAreas,
    });
    updateOfficeSettings({ actionTypes: list });
    setNewActionType('');
  };

  const deleteActionType = (id: string) => {
    const list = officeSettings.actionTypes.filter(act => act.id !== id);
    updateOfficeSettings({ actionTypes: list });
  };

  const toggleActionArea = (actionId: string, areaName: string) => {
    const list = officeSettings.actionTypes.map(act => {
      if (act.id === actionId) {
        const hasArea = act.areas.includes(areaName);
        const newAreas = hasArea 
          ? act.areas.filter(a => a !== areaName) 
          : [...act.areas, areaName];
        return { ...act, areas: newAreas };
      }
      return act;
    });
    updateOfficeSettings({ actionTypes: list });
  };

  const toggleLeadStage = (id: string) => {
    const list = officeSettings.leadStages.map(st => {
      if (st.id === id) {
        return { ...st, enabled: !st.enabled };
      }
      return st;
    });
    updateOfficeSettings({ leadStages: list });
  };

  const addLossReason = () => {
    if (!newLossReason.trim()) return;
    if (!officeSettings.lossReasons.includes(newLossReason.trim())) {
      updateOfficeSettings({ lossReasons: [...officeSettings.lossReasons, newLossReason.trim()] });
    }
    setNewLossReason('');
  };

  const deleteLossReason = (item: string) => {
    updateOfficeSettings({ lossReasons: officeSettings.lossReasons.filter(r => r !== item) });
  };

  const addAcquisitionChannel = () => {
    if (!newChannel.trim()) return;
    if (!officeSettings.acquisitionChannels.includes(newChannel.trim())) {
      updateOfficeSettings({ acquisitionChannels: [...officeSettings.acquisitionChannels, newChannel.trim()] });
    }
    setNewChannel('');
  };

  const deleteAcquisitionChannel = (item: string) => {
    updateOfficeSettings({ acquisitionChannels: officeSettings.acquisitionChannels.filter(c => c !== item) });
  };

  const addOfficeTag = () => {
    if (!newTag.trim()) return;
    if (!officeSettings.tags.includes(newTag.trim())) {
      updateOfficeSettings({ tags: [...officeSettings.tags, newTag.trim()] });
    }
    setNewTag('');
  };

  const deleteOfficeTag = (item: string) => {
    updateOfficeSettings({ tags: officeSettings.tags.filter(t => t !== item) });
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150">
      <div className={`w-full ${modalTab === 'advanced' || modalTab === 'collaborators' ? 'max-w-4xl' : 'max-w-xl'} rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-2xl flex flex-col max-h-[90vh] transition-all`}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)] bg-[var(--bg-input)]/40">
          <div className="flex items-center gap-2 text-[var(--text-main)]">
            <Settings className="w-5 h-5 text-[var(--theme-primary)]" />
            <h2 className="text-base font-serif font-bold">Painel de Configurações do Escritório</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[var(--bg-card-hover)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Level Tab Navigation */}
        <div className="flex border-b border-[var(--border-color)] px-4 bg-[var(--bg-input)]/20">
          <button
            onClick={() => setModalTab('profile')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              modalTab === 'profile'
                ? 'border-[var(--theme-primary)] text-[var(--theme-primary)] font-extrabold'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            Perfil, Tema & Backup
          </button>
          <button
            onClick={() => setModalTab('advanced')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              modalTab === 'advanced'
                ? 'border-[var(--theme-primary)] text-[var(--theme-primary)] font-extrabold'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Configurações Operacionais
          </button>
          <button
            onClick={() => setModalTab('collaborators')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              modalTab === 'collaborators'
                ? 'border-[var(--theme-primary)] text-[var(--theme-primary)] font-extrabold'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Equipe & Colaboradores
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto no-scrollbar flex-1 space-y-5 text-xs">
          
          {modalTab === 'profile' && (
            <div className="space-y-5">
              {/* Theme & Niche Customization Section */}
              <section className="space-y-3">
                <h3 className="text-xs font-bold text-[var(--theme-primary)] uppercase tracking-wider flex items-center gap-1.5">
                  <Palette className="w-4 h-4" /> Estilo & Nicho de Atuação
                </h3>

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
                    <div className="pt-2 border-t border-[var(--border-color)] flex flex-wrap items-center gap-2">
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
                      <span className="text-[10px] text-[var(--text-muted)] mx-1">•</span>
                      <button
                        type="button"
                        onClick={() => setShowUrlInput(!showUrlInput)}
                        className="text-[10px] text-[var(--theme-primary)] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <ImageIcon className="w-3 h-3" />
                        <span>Colar Link de Imagem</span>
                      </button>
                    </div>

                    {showUrlInput && (
                      <div className="pt-2 flex items-center gap-2">
                        <input
                          type="url"
                          value={tempUrlInput}
                          onChange={(e) => setTempUrlInput(e.target.value)}
                          placeholder="https://exemplo.com/foto.jpg"
                          className="flex-1 px-3 py-1.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-main)] text-xs focus:outline-none focus:border-[var(--theme-primary)]"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (tempUrlInput.trim()) {
                              setPhotoUrl(tempUrlInput.trim());
                              updateProfilePhoto(tempUrlInput.trim());
                              setTempUrlInput('');
                              setShowUrlInput(false);
                            }
                          }}
                          className="px-3 py-1.5 rounded-xl bg-[var(--bg-card-secondary)] hover:bg-[var(--bg-card-hover)] text-[var(--text-main)] text-xs font-bold border border-[var(--border-color)] cursor-pointer"
                        >
                          Aplicar
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Nicho Selector */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[var(--text-muted)] mb-1">
                      Nicho Operacional
                    </label>
                    <select
                      value={selectedNiche}
                      onChange={(e) => handleSelectNicheQuick(e.target.value as NicheType)}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-main)] text-xs font-semibold focus:outline-none focus:border-[var(--theme-primary)] cursor-pointer"
                    >
                      {(Object.keys(NICHES) as NicheType[]).map((nk) => (
                        <option key={nk} value={nk}>
                          {NICHES[nk].label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Profile Name & title */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[var(--text-muted)] mb-1">Nome do Negócio</label>
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
                      className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-main)] focus:outline-none focus:border-[var(--theme-primary)]"
                      placeholder="Ex: Studio Alvorada"
                    />
                  </div>
                </div>

                {/* Theme Palette Swatches */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-[var(--text-muted)] mb-1.5">
                    Paleta Cromática do Painel
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(Object.keys(THEMES) as ThemeColorId[]).map((tk) => {
                      const th = THEMES[tk];
                      const isSelected = selectedTheme === tk;
                      return (
                        <button
                          key={tk}
                          type="button"
                          onClick={() => handleSelectThemeQuick(tk)}
                          className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[var(--bg-card-secondary)] border-white/30 ring-1 ring-[var(--theme-primary)]'
                              : 'bg-[var(--bg-input)] border border-[var(--border-color)] hover:border-[#52443c]'
                          }`}
                        >
                          <span
                             className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0"
                             style={{ backgroundColor: th.primary }}
                          />
                          <span className="text-[11px] font-bold text-[var(--text-main)] truncate">
                            {th.name.split(' ')[0]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-[var(--text-muted)] mb-1">Título Profissional</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-main)] focus:outline-none focus:border-[var(--theme-primary)]"
                    placeholder="Ex: Consultoria, Reformas & Decoração"
                  />
                </div>

                <button
                  onClick={handleSaveProfile}
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[var(--theme-primary)] text-black rounded-xl font-bold transition-all hover:bg-[var(--theme-primary-hover)] cursor-pointer text-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar Dados de Perfil</span>
                </button>
              </section>

              {/* Backup & System operations Section */}
              <section className="space-y-3 pt-3 border-t border-[var(--border-color)]">
                <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Cópia de Segurança & Integração</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => exportDataJSON()}
                    className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-input)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-color)] hover:border-[var(--theme-primary)]/40 transition-all text-left cursor-pointer"
                  >
                    <div>
                      <h4 className="font-bold text-[var(--text-main)] text-xs">Exportar Dados (Backup JSON)</h4>
                      <p className="text-[10px] text-[var(--text-muted)]">Baixa um arquivo com todos os dados.</p>
                    </div>
                    <Download className="w-4 h-4 text-[var(--theme-primary)]" />
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-input)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-color)] hover:border-blue-500/40 transition-all text-left cursor-pointer"
                  >
                    <div>
                      <h4 className="font-bold text-[var(--text-main)] text-xs">Importar Dados (JSON)</h4>
                      <p className="text-[10px] text-[var(--text-muted)]">Carrega um arquivo salvo anteriormente.</p>
                    </div>
                    <Upload className="w-4 h-4 text-blue-400" />
                  </button>
                  <input
                    type="file"
                    accept=".json"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              </section>

              {/* Reset Data & Demo */}
              <section className="space-y-3 pt-3 border-t border-[var(--border-color)]">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Gerenciamento & Limpeza de Dados</h3>
                  {resetStatus && (
                    <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-0.5 rounded-full animate-in fade-in">
                      {resetStatus}
                    </span>
                  )}
                </div>

                {/* Primary Quick Reset: Financeiro, Projetos, Equipe e Fornecedores */}
                <div className="bg-[var(--bg-input)] border border-amber-900/40 rounded-xl p-3.5 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-[var(--text-main)] flex items-center gap-1.5">
                        <Trash2 className="w-3.5 h-3.5 text-amber-500" />
                        <span>Zerar Módulos Solicitados</span>
                      </h4>
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                        Limpa Financeiro, Projetos, Equipe e Fornecedores para iniciar do zero.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetRequested}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold cursor-pointer transition-colors whitespace-nowrap self-start sm:self-auto"
                    >
                      Zerar Módulos
                    </button>
                  </div>

                  {/* Individual quick reset pills */}
                  <div className="pt-2 border-t border-[var(--border-color)] flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={handleResetFinance}
                      className="px-2.5 py-1 rounded-lg bg-[var(--bg-card-secondary)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-color)] text-[11px] text-[var(--text-main)] cursor-pointer transition-colors"
                    >
                      Zerar Financeiro
                    </button>
                    <button
                      type="button"
                      onClick={handleResetProjects}
                      className="px-2.5 py-1 rounded-lg bg-[var(--bg-card-secondary)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-color)] text-[11px] text-[var(--text-main)] cursor-pointer transition-colors"
                    >
                      Zerar Projetos
                    </button>
                    <button
                      type="button"
                      onClick={handleResetTeam}
                      className="px-2.5 py-1 rounded-lg bg-[var(--bg-card-secondary)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-color)] text-[11px] text-[var(--text-main)] cursor-pointer transition-colors"
                    >
                      Zerar Equipe
                    </button>
                    <button
                      type="button"
                      onClick={handleResetSuppliers}
                      className="px-2.5 py-1 rounded-lg bg-[var(--bg-card-secondary)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-color)] text-[11px] text-[var(--text-main)] cursor-pointer transition-colors"
                    >
                      Zerar Fornecedores
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={handleLoadDemo}
                    className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-card-secondary)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-color)] text-left cursor-pointer transition-colors"
                  >
                    <div>
                      <h4 className="font-bold text-[var(--text-main)]">Carregar Dados de Exemplo</h4>
                      <p className="text-[10px] text-[var(--text-muted)]">Simula projetos e fluxo financeiro para testes.</p>
                    </div>
                    <RefreshCw className="w-4 h-4 text-[var(--theme-primary)] shrink-0" />
                  </button>

                  <button
                    type="button"
                    onClick={handleResetData}
                    className={`flex items-center justify-between p-3 rounded-xl text-left border cursor-pointer transition-all ${
                      showResetConfirm
                        ? 'bg-rose-500/10 border-rose-500 text-rose-300 animate-pulse'
                        : 'bg-[var(--bg-input)] border border-[var(--border-color)] text-rose-400 hover:bg-rose-500/5'
                    }`}
                  >
                    <div>
                      <h4 className="font-bold">
                        {showResetConfirm ? '⚠️ Confirmar Limpeza Total?' : 'Zerar Todo o Escritório'}
                      </h4>
                      <p className="text-[10px] text-[var(--text-muted)]">Apaga permanentemente todos os registros.</p>
                    </div>
                    <Trash2 className="w-4 h-4 text-rose-500 shrink-0" />
                  </button>
                </div>
              </section>
            </div>
          )}

          {modalTab === 'advanced' && (
            // ADVANCED TAB CONSOLE (REPLICATING SCREENSHOTS 1, 2, 3, 4)
            <div className="flex flex-col md:flex-row gap-5 h-full min-h-[400px]">
              {/* Inner Sub tab bar */}
              <div className="flex flex-row md:flex-col gap-1.5 md:w-56 overflow-x-auto md:overflow-x-visible pb-2.5 md:pb-0 border-b md:border-b-0 md:border-r border-[var(--border-color)] pr-0 md:pr-4">
                <button
                  onClick={() => setAdvSubTab('categories')}
                  className={`px-3 py-2 rounded-xl text-left text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    advSubTab === 'categories'
                      ? 'bg-[var(--bg-card-secondary)] text-[var(--theme-primary)] border border-[var(--border-color)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)]'
                  }`}
                >
                  1. Categorias Financeiras
                </button>
                <button
                  onClick={() => setAdvSubTab('actions')}
                  className={`px-3 py-2 rounded-xl text-left text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    advSubTab === 'actions'
                      ? 'bg-[var(--bg-card-secondary)] text-[var(--theme-primary)] border border-[var(--border-color)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)]'
                  }`}
                >
                  2. Matriz Área x Ações
                </button>
                <button
                  onClick={() => setAdvSubTab('leads')}
                  className={`px-3 py-2 rounded-xl text-left text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    advSubTab === 'leads'
                      ? 'bg-[var(--bg-card-secondary)] text-[var(--theme-primary)] border border-[var(--border-color)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)]'
                  }`}
                >
                  3. Status Leads & Perdas
                </button>
                <button
                  onClick={() => setAdvSubTab('acquisition')}
                  className={`px-3 py-2 rounded-xl text-left text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    advSubTab === 'acquisition'
                      ? 'bg-[var(--bg-card-secondary)] text-[var(--theme-primary)] border border-[var(--border-color)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)]'
                  }`}
                >
                  4. Canais & Etiquetas (Tags)
                </button>
              </div>

              {/* Subtab content view */}
              <div className="flex-1 space-y-4">
                
                {/* ADV PANEL 1: Categorias Financeiras */}
                {advSubTab === 'categories' && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div>
                      <h4 className="text-sm font-serif font-bold text-[var(--text-main)]">Categorias Financeiras</h4>
                      <p className="text-[10px] text-[var(--text-muted)]">Classifique suas receitas, custos diretos e despesas para a DRE automática do seu painel.</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      {/* RECEITAS */}
                      <div className="bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl p-3.5 space-y-3">
                        <span className="text-[10px] uppercase font-bold text-emerald-400 block tracking-wider border-b border-[var(--border-color)] pb-1">RECEITAS</span>
                        <div className="space-y-1.5 max-h-[180px] overflow-y-auto no-scrollbar">
                          {officeSettings.financialCategories.receitas.map(item => (
                            <div key={item} className="flex items-center justify-between p-1.5 bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)]/55 text-[11px]">
                              <span className="text-[var(--text-main)] font-medium">{item}</span>
                              <button onClick={() => deleteFinancialCategory('receitas', item)} className="p-0.5 text-[var(--text-muted)] hover:text-rose-400 cursor-pointer">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-1">
                          <input
                            type="text"
                            placeholder="Nova receita"
                            value={newReceita}
                            onChange={(e) => setNewReceita(e.target.value)}
                            className="flex-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-2 py-1 text-xs text-[var(--text-main)] focus:outline-none"
                          />
                          <button
                            onClick={() => { addFinancialCategory('receitas', newReceita); setNewReceita(''); }}
                            className="bg-emerald-500 hover:bg-emerald-600 text-black p-1.5 rounded-lg cursor-pointer flex items-center justify-center"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                          </button>
                        </div>
                      </div>

                      {/* CUSTO DIRETO */}
                      <div className="bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl p-3.5 space-y-3">
                        <span className="text-[10px] uppercase font-bold text-amber-400 block tracking-wider border-b border-[var(--border-color)] pb-1">CUSTOS DIRETOS</span>
                        <div className="space-y-1.5 max-h-[180px] overflow-y-auto no-scrollbar">
                          {officeSettings.financialCategories.custosDiretos.map(item => (
                            <div key={item} className="flex items-center justify-between p-1.5 bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)]/55 text-[11px]">
                              <span className="text-[var(--text-main)] font-medium">{item}</span>
                              <button onClick={() => deleteFinancialCategory('custosDiretos', item)} className="p-0.5 text-[var(--text-muted)] hover:text-rose-400 cursor-pointer">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-1">
                          <input
                            type="text"
                            placeholder="Novo custo"
                            value={newCustoDireto}
                            onChange={(e) => setNewCustoDireto(e.target.value)}
                            className="flex-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-2 py-1 text-xs text-[var(--text-main)] focus:outline-none"
                          />
                          <button
                            onClick={() => { addFinancialCategory('custosDiretos', newCustoDireto); setNewCustoDireto(''); }}
                            className="bg-amber-500 hover:bg-amber-600 text-black p-1.5 rounded-lg cursor-pointer flex items-center justify-center"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                          </button>
                        </div>
                      </div>

                      {/* DESPESA OPERACIONAL */}
                      <div className="bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl p-3.5 space-y-3">
                        <span className="text-[10px] uppercase font-bold text-rose-400 block tracking-wider border-b border-[var(--border-color)] pb-1">DESPESAS OPERACIONAIS</span>
                        <div className="space-y-1.5 max-h-[180px] overflow-y-auto no-scrollbar">
                          {officeSettings.financialCategories.despesasOperacionais.map(item => (
                            <div key={item} className="flex items-center justify-between p-1.5 bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)]/55 text-[11px]">
                              <span className="text-[var(--text-main)] font-medium">{item}</span>
                              <button onClick={() => deleteFinancialCategory('despesasOperacionais', item)} className="p-0.5 text-[var(--text-muted)] hover:text-rose-400 cursor-pointer">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-1">
                          <input
                            type="text"
                            placeholder="Nova despesa"
                            value={newDespOperacional}
                            onChange={(e) => setNewDespOperacional(e.target.value)}
                            className="flex-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-2 py-1 text-xs text-[var(--text-main)] focus:outline-none"
                          />
                          <button
                            onClick={() => { addFinancialCategory('despesasOperacionais', newDespOperacional); setNewDespOperacional(''); }}
                            className="bg-rose-500 hover:bg-rose-600 text-black p-1.5 rounded-lg cursor-pointer flex items-center justify-center"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ADV PANEL 2: Matriz Área x Vínculo & Tipos de Ação */}
                {advSubTab === 'actions' && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div>
                      <h4 className="text-sm font-serif font-bold text-[var(--text-main)]">Matriz de Áreas & Tipos de Ação</h4>
                      <p className="text-[10px] text-[var(--text-muted)]">Defina quais vínculos comerciais e operacionais (Lead, Cliente, Projeto) estão conectados a cada área.</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Matrix Grid */}
                      <div className="bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl p-4 space-y-3">
                        <span className="text-[10px] uppercase font-bold text-[var(--theme-primary)] block tracking-wider border-b border-[var(--border-color)] pb-1">MATRIZ ÁREA x VÍNCULO</span>
                        <div className="overflow-x-auto">
                          <table className="w-full text-[11px] text-[var(--text-muted)]">
                            <thead>
                              <tr className="border-b border-[var(--border-color)]/60 text-[var(--text-main)]">
                                <th className="text-left pb-2 font-serif font-bold">ÁREA</th>
                                <th className="text-center pb-2">LEAD</th>
                                <th className="text-center pb-2">CLIENTE</th>
                                <th className="text-center pb-2">PROJETO</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-color)]/30">
                              {(['comercial', 'operacao', 'financeiro'] as const).map(area => (
                                <tr key={area} className="hover:bg-[var(--bg-card-hover)]/40 transition-colors">
                                  <td className="py-2.5 font-bold text-[var(--text-main)] capitalize">{area}</td>
                                  {(['lead', 'cliente', 'projeto'] as const).map(vin => (
                                    <td key={vin} className="text-center py-2.5">
                                      <input
                                        type="checkbox"
                                        checked={officeSettings.actionMatrix[area][vin]}
                                        onChange={() => toggleMatrixCell(area, vin)}
                                        className="rounded border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--theme-primary)] focus:ring-[var(--theme-primary)]"
                                      />
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Action types list */}
                      <div className="bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl p-4 space-y-3">
                        <span className="text-[10px] uppercase font-bold text-[var(--theme-primary)] block tracking-wider border-b border-[var(--border-color)] pb-1">TIPOS DE AÇÃO</span>
                        <div className="space-y-1.5 max-h-[170px] overflow-y-auto no-scrollbar">
                          {officeSettings.actionTypes.map(act => (
                            <div key={act.id} className="flex items-center justify-between p-1.5 bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)]/55 text-[11px]">
                              <div className="flex flex-col">
                                <span className="text-[var(--text-main)] font-semibold">{act.name}</span>
                                <span className="text-[9px] text-[var(--text-muted)]">Áreas: {act.areas.join(', ')}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {['Comercial', 'Operação', 'Financeiro'].map(ar => {
                                  const isActive = act.areas.includes(ar);
                                  return (
                                    <button
                                      key={ar}
                                      onClick={() => toggleActionArea(act.id, ar)}
                                      className={`text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded ${
                                        isActive 
                                          ? 'bg-[var(--theme-primary)]/15 text-[var(--theme-primary)] border border-[var(--theme-primary)]/20' 
                                          : 'bg-[var(--bg-input)] text-[var(--text-muted)] border border-[var(--border-color)]'
                                      }`}
                                    >
                                      {ar[0]}
                                    </button>
                                  );
                                })}
                                <button onClick={() => deleteActionType(act.id)} className="p-0.5 text-[var(--text-muted)] hover:text-rose-400 cursor-pointer">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            placeholder="Tipo de Ação (ex: Agendar visita)"
                            value={newActionType}
                            onChange={(e) => setNewActionType(e.target.value)}
                            className="flex-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-2 py-1 text-xs text-[var(--text-main)] focus:outline-none"
                          />
                          <button
                            onClick={addActionType}
                            className="bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-black px-2 py-1.5 rounded-lg cursor-pointer flex items-center justify-center font-bold"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ADV PANEL 3: Status Leads & Perdas */}
                {advSubTab === 'leads' && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div>
                      <h4 className="text-sm font-serif font-bold text-[var(--text-main)]">Status do Funil & Motivos de Perda</h4>
                      <p className="text-[10px] text-[var(--text-muted)]">Personalize os status de prospecção comercial (CRM de Leads) e gerencie motivos para desistências.</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Lead Stages */}
                      <div className="bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl p-4 space-y-3">
                        <span className="text-[10px] uppercase font-bold text-[var(--theme-primary)] block tracking-wider border-b border-[var(--border-color)] pb-1">ETAPAS DO FUNIL DE LEADS</span>
                        <div className="space-y-1.5 max-h-[220px] overflow-y-auto no-scrollbar">
                          {officeSettings.leadStages.map(stg => (
                            <div key={stg.id} className="flex items-center justify-between p-2 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)]/55 text-[11px]">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: stg.color || (stg.status === 'Ganho' ? '#10b981' : stg.status === 'Perdido' ? '#ef4444' : '#3b82f6') }}
                                />
                                <span className="font-bold text-[var(--text-main)]">{stg.name}</span>
                                <span className="text-[9px] text-[var(--text-muted)] italic">({stg.status})</span>
                              </div>
                              <button
                                onClick={() => toggleLeadStage(stg.id)}
                                className={`text-[9px] font-bold px-2 py-0.5 rounded-full border cursor-pointer ${stg.enabled ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-[var(--bg-input)] text-[var(--text-muted)] border border-[var(--border-color)]'}`}
                              >
                                {stg.enabled ? 'Ativado' : 'Desativado'}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Loss reasons list */}
                      <div className="bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl p-4 space-y-3">
                        <span className="text-[10px] uppercase font-bold text-rose-400 block tracking-wider border-b border-[var(--border-color)] pb-1">MOTIVOS DE PERDA DE ORÇAMENTOS</span>
                        <div className="space-y-1.5 max-h-[160px] overflow-y-auto no-scrollbar">
                          {officeSettings.lossReasons.map(item => (
                            <div key={item} className="flex items-center justify-between p-1.5 bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)]/55 text-[11px]">
                              <span className="text-[var(--text-main)] font-medium truncate max-w-[200px]">{item}</span>
                              <button onClick={() => deleteLossReason(item)} className="p-0.5 text-[var(--text-muted)] hover:text-rose-400 cursor-pointer">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            placeholder="Adicionar motivo de perda..."
                            value={newLossReason}
                            onChange={(e) => setNewLossReason(e.target.value)}
                            className="flex-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-2 py-1 text-xs text-[var(--text-main)] focus:outline-none"
                          />
                          <button
                            onClick={addLossReason}
                            className="bg-rose-500 hover:bg-rose-600 text-black px-2 py-1.5 rounded-lg cursor-pointer flex items-center justify-center font-bold"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ADV PANEL 4: Canais & Tags */}
                {advSubTab === 'acquisition' && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div>
                      <h4 className="text-sm font-serif font-bold text-[var(--text-main)]">Canais de Aquisição & Etiquetas (Tags)</h4>
                      <p className="text-[10px] text-[var(--text-muted)]">Mapeie as vias de captação de clientes (de onde vêm as vendas) e crie etiquetas gerais.</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Acquisition Channels */}
                      <div className="bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl p-4 space-y-3">
                        <span className="text-[10px] uppercase font-bold text-[var(--theme-primary)] block tracking-wider border-b border-[var(--border-color)] pb-1">CANAIS DE AQUISIÇÃO</span>
                        <div className="space-y-1.5 max-h-[160px] overflow-y-auto no-scrollbar">
                          {officeSettings.acquisitionChannels.map(item => (
                            <div key={item} className="flex items-center justify-between p-1.5 bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)]/55 text-[11px]">
                              <span className="text-[var(--text-main)] font-medium">{item}</span>
                              <button onClick={() => deleteAcquisitionChannel(item)} className="p-0.5 text-[var(--text-muted)] hover:text-rose-400 cursor-pointer">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            placeholder="Canal (ex: Indicação, Google)"
                            value={newChannel}
                            onChange={(e) => setNewChannel(e.target.value)}
                            className="flex-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-2 py-1 text-xs text-[var(--text-main)] focus:outline-none"
                          />
                          <button
                            onClick={addAcquisitionChannel}
                            className="bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-black px-2 py-1.5 rounded-lg cursor-pointer flex items-center justify-center font-bold"
                          >
                            Add
                          </button>
                        </div>
                      </div>

                      {/* Tags list */}
                      <div className="bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl p-4 space-y-3">
                        <span className="text-[10px] uppercase font-bold text-[var(--theme-primary)] block tracking-wider border-b border-[var(--border-color)] pb-1">ETIQUETAS DO ESCRITÓRIO (TAGS)</span>
                        
                        <div className="flex flex-wrap gap-1.5 min-h-[110px] p-2 bg-[var(--bg-card)] border border-[var(--border-color)]/60 rounded-xl max-h-[150px] overflow-y-auto no-scrollbar">
                          {officeSettings.tags.length === 0 ? (
                            <span className="text-[10px] text-[var(--text-muted)] italic p-2">Nenhuma etiqueta customizada criada ainda.</span>
                          ) : (
                            officeSettings.tags.map(item => (
                              <div key={item} className="flex items-center gap-1 px-2 py-0.5 bg-[var(--theme-badge-bg)] text-[var(--theme-badge-text)] border border-[var(--theme-badge-border)] rounded-full text-[10px]">
                                <span>{item}</span>
                                <button onClick={() => deleteOfficeTag(item)} className="hover:text-rose-400 cursor-pointer text-[var(--text-muted)] text-xs font-bold font-serif leading-none">
                                  ×
                                </button>
                              </div>
                            ))
                          )}
                        </div>

                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            placeholder="Nova etiqueta"
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { addOfficeTag(); } }}
                            className="flex-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-2 py-1 text-xs text-[var(--text-main)] focus:outline-none"
                          />
                          <button
                            onClick={addOfficeTag}
                            className="bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-black px-2 py-1.5 rounded-lg cursor-pointer flex items-center justify-center font-bold"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}

          {modalTab === 'collaborators' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* CASE 1: Collaborator Connected to an Office */}
              {profile?.joinedOwnerUid ? (
                <div className="space-y-6">
                  <div className="p-4 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="space-y-1 text-center md:text-left">
                      <h4 className="text-sm font-serif font-bold text-[var(--text-main)] flex items-center justify-center md:justify-start gap-2">
                        <Shield className="w-4 h-4 text-emerald-400" />
                        Escritório Vinculado
                      </h4>
                      <p className="text-xs text-[var(--text-muted)]">
                        Você está conectado como colaborador. Todos os seus dados de projetos e finanças estão sincronizados com este escritório.
                      </p>
                      <p className="text-[10px] text-[var(--theme-primary)] font-mono font-semibold">
                        UID do Proprietário: {profile.joinedOwnerUid}
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        if (confirm('Deseja realmente sair deste escritório? Você perderá acesso a todos os dados compartilhados.')) {
                          await leaveCollaboratedOffice();
                        }
                      }}
                      className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 hover:border-rose-500 text-rose-400 rounded-xl font-bold transition-all text-xs cursor-pointer flex items-center gap-1.5 shrink-0"
                    >
                      <LogOut className="w-4 h-4" />
                      Sair do Escritório
                    </button>
                  </div>

                  <div className="bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
                    <div className="border-b border-[var(--border-color)] pb-2">
                      <h4 className="text-xs uppercase font-bold text-[var(--text-muted)] tracking-wider">Suas Permissões de Acesso</h4>
                      <p className="text-[10px] text-[var(--text-muted)]">As permissões abaixo foram atribuídas a você pelo proprietário do escritório.</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { key: 'today', label: 'Meu Dia & Agenda' },
                        { key: 'actions', label: 'Central de Ações' },
                        { key: 'leads', label: 'Leads Comercial' },
                        { key: 'projects', label: 'Gestão de Projetos' },
                        { key: 'suppliers', label: 'Fornecedores' },
                        { key: 'team', label: 'Gestão de Equipe' },
                        { key: 'clients', label: 'Clientes & Contratos' },
                        { key: 'deadlines', label: 'Prazos & Cobranças' },
                        { key: 'finance', label: 'Financeiro' },
                        { key: 'health', label: 'Saúde do Negócio' },
                        { key: 'goals', label: 'Metas & Objetivos' },
                        { key: 'budget', label: 'Orçamento' },
                        { key: 'portfolio', label: 'Vitrine / Portfólio' },
                      ].map(({ key, label }) => {
                        const hasAccess = profile?.collaborators?.find(c => c.uid === user?.uid)?.permissions?.[key as keyof CollaboratorPermissions] ?? true;
                        return (
                          <div 
                            key={key} 
                            className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all ${
                              hasAccess 
                                ? 'bg-emerald-500/5 border-emerald-500/30 text-emerald-300' 
                                : 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-muted)]'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${hasAccess ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
                            <div className="truncate">
                              <p className="text-[11px] font-bold truncate leading-none">{label}</p>
                              <p className="text-[9px] text-[var(--text-muted)]">{hasAccess ? 'Acesso Permitido' : 'Sem Acesso'}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left panel: Code share and Slot limit */}
                  <div className="lg:col-span-1 space-y-5">
                    
                    {/* Invite Code Card */}
                    <div className="bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
                      <div className="space-y-1">
                        <h4 className="text-xs uppercase font-bold text-[var(--text-muted)] tracking-wider">Convidar Colaboradores</h4>
                        <p className="text-[10px] text-[var(--text-muted)]">
                          Compartilhe o código abaixo para que outros usuários possam entrar e gerenciar o escritório com você.
                        </p>
                      </div>

                      <div className="p-3 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl flex items-center justify-between gap-2.5">
                        <span className="text-base font-mono font-bold text-[var(--theme-primary)] tracking-widest pl-1.5 uppercase select-all">
                          {profile?.inviteCode || '...'}
                        </span>
                        <button
                          onClick={() => {
                            if (profile?.inviteCode) {
                              navigator.clipboard.writeText(profile.inviteCode);
                              setIsCopiedCode(true);
                              setTimeout(() => setIsCopiedCode(false), 2000);
                            }
                          }}
                          className="p-2 bg-[var(--bg-card-secondary)] hover:bg-[var(--bg-card-hover)] text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 border border-[var(--border-color)] hover:text-[var(--theme-primary)]"
                          title="Copiar Código"
                        >
                          {isCopiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
                          <span className="text-[10px]">{isCopiedCode ? 'Copiado!' : 'Copiar'}</span>
                        </button>
                      </div>

                      {/* Connect option (if they are not connected and want to join someone else's space instead) */}
                      <div className="border-t border-[var(--border-color)]/45 pt-4 space-y-3">
                        <div className="space-y-1">
                          <h5 className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Entrar em outro escritório</h5>
                          <p className="text-[9px] text-[var(--text-muted)]">Quer se conectar ao escritório de outro usuário?</p>
                        </div>

                        <form onSubmit={handleJoinOffice} className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Código"
                            value={inviteCodeInput}
                            onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                            className="bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-2.5 py-1.5 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--theme-primary)] w-full font-mono uppercase tracking-widest"
                          />
                          <button
                            type="submit"
                            disabled={inviteLoading || !inviteCodeInput.trim()}
                            className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 text-black px-3.5 py-1.5 rounded-xl cursor-pointer text-xs font-bold transition-all shrink-0 flex items-center justify-center"
                          >
                            {inviteLoading ? '...' : 'Entrar'}
                          </button>
                        </form>
                        {inviteError && <p className="text-[10px] text-rose-400 font-semibold">{inviteError}</p>}
                        {inviteSuccess && <p className="text-[10px] text-emerald-400 font-semibold">{inviteSuccess}</p>}
                      </div>
                    </div>

                    {/* Team Slots Limit Info */}
                    <div className="bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
                      <div className="space-y-1">
                        <h4 className="text-xs uppercase font-bold text-[var(--text-muted)] tracking-wider">Capacidade da Equipe</h4>
                        <p className="text-[10px] text-[var(--text-muted)]">
                          Cada conta do escritório permite a participação de até 4 membros colaboradores.
                        </p>
                      </div>

                      {(() => {
                        const totalSlots = 4;
                        const joinedCount = profile?.collaborators?.length || 0;
                        const pct = Math.min(100, (joinedCount / totalSlots) * 100);

                        return (
                          <div className="space-y-3.5">
                            <div className="flex justify-between items-center text-[11px] font-bold">
                              <span className="text-[var(--text-main)]">Membros Conectados</span>
                              <span className="text-[var(--theme-primary)]">{joinedCount} / {totalSlots}</span>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full bg-[var(--bg-input)] rounded-full h-2 overflow-hidden border border-[var(--border-color)]/45">
                              <div 
                                className="h-full bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-primary-hover)] transition-all duration-300 rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                  </div>

                  {/* Right panel: Active Collaborators List and Access Control */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4 min-h-[400px]">
                      <div className="border-b border-[var(--border-color)] pb-2">
                        <h4 className="text-sm font-serif font-bold text-[var(--text-main)]">Gerenciamento de Acessos</h4>
                        <p className="text-[10px] text-[var(--text-muted)]">Configure exatamente as abas e recursos que cada convidado pode ver e editar.</p>
                      </div>

                      {(!profile?.collaborators || profile.collaborators.length === 0) ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                          <div className="w-12 h-12 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-muted)]">
                            <Users className="w-6 h-6" />
                          </div>
                          <div className="max-w-[280px]">
                            <h5 className="font-bold text-[var(--text-main)] text-xs">Nenhum Colaborador Ativo</h5>
                            <p className="text-[10px] text-[var(--text-muted)] mt-1">
                              Sua equipe ainda não tem membros. Envie o código do seu escritório para seus parceiros de projeto.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {profile.collaborators.map((collab) => (
                            <div 
                              key={collab.uid} 
                              className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 space-y-3"
                            >
                              {/* Collaborator header */}
                              <div className="flex items-center justify-between border-b border-[var(--border-color)]/50 pb-2 gap-2">
                                <div className="space-y-0.5">
                                  <h5 className="font-bold text-[var(--text-main)] text-xs font-mono">{collab.email}</h5>
                                  <p className="text-[9px] text-[var(--text-muted)]">
                                    Conectado em: {collab.joinedAt ? new Date(collab.joinedAt).toLocaleDateString('pt-BR') : 'Data não informada'}
                                  </p>
                                </div>

                                <button
                                  onClick={async () => {
                                    if (confirm(`Remover acesso de ${collab.email}? Esta ação irá desvincular o usuário imediatamente.`)) {
                                      await removeCollaborator(collab.uid);
                                    }
                                  }}
                                  className="p-1 px-2.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                                >
                                  Remover Membro
                                </button>
                              </div>

                              {/* Matrix permissions toggle */}
                              <div className="space-y-2">
                                <span className="text-[9px] uppercase font-bold text-[var(--text-muted)] block tracking-wider">Permissões de Abas Autorizadas:</span>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                  {[
                                    { key: 'today', label: 'Meu Dia & Agenda' },
                                    { key: 'actions', label: 'Central de Ações' },
                                    { key: 'leads', label: 'Leads Comercial' },
                                    { key: 'projects', label: 'Gestão de Projetos' },
                                    { key: 'suppliers', label: 'Fornecedores' },
                                    { key: 'team', label: 'Gestão de Equipe' },
                                    { key: 'clients', label: 'Clientes & Contratos' },
                                    { key: 'deadlines', label: 'Prazos & Cobranças' },
                                    { key: 'finance', label: 'Financeiro' },
                                    { key: 'health', label: 'Saúde do Negócio' },
                                    { key: 'goals', label: 'Metas & Objetivos' },
                                    { key: 'budget', label: 'Orçamento' },
                                    { key: 'portfolio', label: 'Vitrine / Portfólio' },
                                  ].map(({ key, label }) => {
                                    const hasPerm = collab.permissions?.[key as keyof CollaboratorPermissions] ?? true;
                                    return (
                                      <label 
                                        key={key}
                                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer select-none transition-all ${
                                          hasPerm 
                                            ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300' 
                                            : 'bg-[var(--bg-input)]/60 border-[var(--border-color)] text-[var(--text-muted)]'
                                        }`}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={hasPerm}
                                          onChange={() => {
                                            const updatedPerms = {
                                              ...collab.permissions,
                                              [key]: !hasPerm
                                            };
                                            updateCollaboratorPermissions(collab.uid, updatedPerms);
                                          }}
                                          className="rounded border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--theme-primary)] focus:ring-[var(--theme-primary)] cursor-pointer"
                                        />
                                        <span className="text-[10px] font-semibold truncate">{label}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>

                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border-color)] flex justify-between bg-[var(--bg-input)]/40">
          <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            Sincronização Cloud Ativa
          </p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[var(--bg-card-secondary)] hover:bg-[var(--bg-card-hover)] text-[var(--text-main)] rounded-xl font-bold transition-all text-xs border border-[var(--border-color)] cursor-pointer"
          >
            Fechar Painel
          </button>
        </div>

      </div>
    </div>
  );
};
