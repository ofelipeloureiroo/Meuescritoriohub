import React, { useRef, useState } from 'react';
import {
  Briefcase,
  Camera,
  Check,
  Globe,
  Image as ImageIcon,
  Instagram,
  Layers,
  MapPin,
  Palette,
  QrCode,
  RefreshCw,
  Sparkles,
  Upload,
  User,
  X,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { ArchitectProfile, BgThemeId, NicheType, ThemeColorId } from '../../types';
import { BG_THEMES, NICHES, THEMES } from '../../utils/theme';
import { cleanInstagramHandle, buildInstagramUrl, formatFollowersCount } from '../../utils/instagram';
import { compressImage } from '../../utils/imageCompressor';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

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
  {
    id: 'preset-4',
    label: 'Luz Natural & Biofilia',
    url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'preset-5',
    label: 'Executivo & Campo',
    url: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'preset-6',
    label: 'Tech & Engenharia',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
  },
];

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose }) => {
  const { architectProfile, updateArchitectProfile, updateProfilePhoto, changeTheme, changeBgTheme, changeNiche } = useFinance();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'theme_niche' | 'photo' | 'info'>('theme_niche');
  const [formData, setFormData] = useState<ArchitectProfile>({ ...architectProfile });
  const [urlInput, setUrlInput] = useState('');
  const [previewPhoto, setPreviewPhoto] = useState(architectProfile.photoUrl);
  const [isDragOver, setIsDragOver] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const processImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido (JPG, PNG, WebP).');
      return;
    }

    try {
      const compressed = await compressImage(file, 500, 500, 0.75);
      if (compressed) {
        setPreviewPhoto(compressed);
        setFormData((prev) => ({ ...prev, photoUrl: compressed }));
      }
    } catch (err) {
      console.error('Erro ao processar foto de perfil:', err);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleApplyUrl = () => {
    if (urlInput.trim()) {
      setPreviewPhoto(urlInput.trim());
      setFormData((prev) => ({ ...prev, photoUrl: urlInput.trim() }));
      setUrlInput('');
    }
  };

  const handleSelectPreset = (url: string) => {
    setPreviewPhoto(url);
    setFormData((prev) => ({ ...prev, photoUrl: url }));
  };

  const handleSelectNiche = (nicheId: NicheType) => {
    const nicheConf = NICHES[nicheId];
    if (!nicheConf) return;
    setFormData((prev) => ({
      ...prev,
      niche: nicheId,
      showPortfolio: nicheConf.hasPortfolio,
      title: nicheConf.defaultTitle,
      specialty: nicheConf.defaultSpecialty,
      tagline: nicheConf.description,
      description: `Atendimento profissional especializado em ${nicheConf.label.toLowerCase()}. Soluções sob medida com foco em qualidade, pontualidade e excelência para cada cliente.`,
    }));
  };

  const handleResetToNicheDefaults = () => {
    const nicheConf = NICHES[formData.niche || 'outro'];
    if (!nicheConf) return;
    setFormData((prev) => ({
      ...prev,
      title: nicheConf.defaultTitle,
      specialty: nicheConf.defaultSpecialty,
      tagline: nicheConf.description,
      description: `Atendimento profissional especializado em ${nicheConf.label.toLowerCase()}. Soluções sob medida com foco em qualidade, pontualidade e excelência para cada cliente.`,
      showPortfolio: nicheConf.hasPortfolio,
    }));
  };

  const handleSelectTheme = (themeId: ThemeColorId) => {
    setFormData((prev) => ({
      ...prev,
      themeColor: themeId,
    }));
    changeTheme(themeId);
  };

  const handleSelectBgTheme = (bgThemeId: BgThemeId) => {
    setFormData((prev) => ({
      ...prev,
      bgTheme: bgThemeId,
    }));
    changeBgTheme(bgThemeId);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const finalHandle = cleanInstagramHandle(formData.instagramHandle);
    const finalUrl = buildInstagramUrl(formData.instagramHandle, formData.instagramUrl);
    const finalFollowers = formatFollowersCount(formData.followersCount);
    const updatedProfile = {
      ...formData,
      instagramHandle: finalHandle,
      instagramUrl: finalUrl,
      followersCount: finalFollowers,
    };
    updateArchitectProfile(updatedProfile);
    if (previewPhoto) {
      updateProfilePhoto(previewPhoto);
    }
    if (formData.themeColor) {
      changeTheme(formData.themeColor);
    }
    if (formData.bgTheme) {
      changeBgTheme(formData.bgTheme);
    }
    if (formData.niche && formData.niche !== architectProfile.niche) {
      changeNiche(formData.niche);
    }
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div
        className="relative w-full max-w-3xl bg-[#1a1614] border border-[#3d342f] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#2d2621] bg-gradient-to-r from-[#241e1b] to-[#1a1614]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-[var(--theme-primary)]/20 to-[var(--theme-accent)]/20 border border-[var(--theme-primary)]/30 text-[var(--theme-primary)]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-serif font-medium text-[#f5ede4]">
                Personalizar Escritório & Nicho
              </h2>
              <p className="text-xs text-[#a89a8f]">
                Ajuste seu nicho de atuação, esquema de cores, foto de perfil e dados de atendimento
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-[#a89a8f] hover:text-[#f5ede4] hover:bg-[#2c241f] transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#2d2621] bg-[#161311] px-6 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('theme_niche')}
            className={`flex items-center gap-2 py-3.5 px-4 text-sm font-medium border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'theme_niche'
                ? 'border-[var(--theme-primary)] text-[var(--theme-primary)] font-bold'
                : 'border-transparent text-[#8a7c73] hover:text-[#e5ddd5]'
            }`}
          >
            <Palette className="w-4 h-4" />
            Nicho & Cores
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('photo')}
            className={`flex items-center gap-2 py-3.5 px-4 text-sm font-medium border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'photo'
                ? 'border-[var(--theme-primary)] text-[var(--theme-primary)] font-bold'
                : 'border-transparent text-[#8a7c73] hover:text-[#e5ddd5]'
            }`}
          >
            <Camera className="w-4 h-4" />
            Foto & Avatar
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`flex items-center gap-2 py-3.5 px-4 text-sm font-medium border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'info'
                ? 'border-[var(--theme-primary)] text-[var(--theme-primary)] font-bold'
                : 'border-transparent text-[#8a7c73] hover:text-[#e5ddd5]'
            }`}
          >
            <User className="w-4 h-4" />
            Dados & Cobrança Pix
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: NICHO & CORES */}
          {activeTab === 'theme_niche' && (
            <div className="space-y-6">
              {/* Nicho Selection */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-[#fcf8f5] flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-[var(--theme-primary)]" />
                      Qual é o seu Nicho / Atuação?
                    </h3>
                    <p className="text-xs text-[#a89a8f]">
                      O escritório adapta categorias, nomenclaturas e status para sua profissão.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(Object.keys(NICHES) as NicheType[]).map((nicheKey) => {
                    const niche = NICHES[nicheKey];
                    const isSelected = (formData.niche || 'arquitetura') === nicheKey;

                    return (
                      <button
                        key={nicheKey}
                        type="button"
                        onClick={() => handleSelectNiche(nicheKey)}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                          isSelected
                            ? 'bg-[var(--theme-primary)]/15 border-[var(--theme-primary)] shadow-lg shadow-[var(--theme-primary)]/10 ring-1 ring-[var(--theme-primary)]'
                            : 'bg-[#201a17] border-[#342c27] hover:border-[#4d423b] text-[#a89a8f]'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <span className={`text-xs font-bold ${isSelected ? 'text-[#fcf8f5]' : 'text-[#d6c7bc]'}`}>
                            {niche.label}
                          </span>
                          {isSelected && (
                            <span className="w-4 h-4 rounded-full bg-[var(--theme-primary)] text-black flex items-center justify-center text-[10px] font-bold shrink-0">
                              ✓
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#8a7c73] line-clamp-2">
                          {niche.defaultSpecialty}
                        </p>
                        <div className="pt-1">
                          {niche.hasPortfolio ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 inline-flex items-center gap-1">
                              📷 Com Galeria de Fotos
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-[#2a221d] text-[#8a7c73] border border-[#3d342f] inline-flex items-center gap-1">
                              📄 Modo Gestão Sem Fotos
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Portfolio Display Switch */}
              <div className="p-4 rounded-2xl bg-[#201a17] border border-[#342c27] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-[var(--theme-primary)]" />
                    <span className="text-sm font-bold text-[#fcf8f5]">
                      Exibir Galeria & Portfólio no Painel
                    </span>
                    {(formData.showPortfolio ?? NICHES[formData.niche || 'vendas']?.hasPortfolio) ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Ativado (Com Fotos)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-700/40 text-zinc-300 border border-zinc-600/40">
                        Oculto (Foco em Contratos & Finanças)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#a89a8f] max-w-xl leading-relaxed">
                    Quando seu nicho for vendas (catálogo), arquitetura, design, fotografia ou criador de conteúdo, ative o portfólio para exibir fotos e mostruário. Para advocacia, consultoria e outros serviços, deixe oculto para manter o painel limpo.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, showPortfolio: false }))}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      !(formData.showPortfolio ?? NICHES[formData.niche || 'vendas']?.hasPortfolio)
                        ? 'bg-[#3d342f] text-white border-zinc-500 ring-1 ring-zinc-400 font-bold'
                        : 'bg-[#181412] text-[#8a7c73] border-[#2e2621] hover:text-[#d6c7bc]'
                    }`}
                  >
                    Ocultar Fotos
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, showPortfolio: true }))}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      (formData.showPortfolio ?? NICHES[formData.niche || 'vendas']?.hasPortfolio)
                        ? 'bg-[var(--theme-primary)] text-black border-[var(--theme-primary)] shadow-md font-bold'
                        : 'bg-[#181412] text-[#8a7c73] border-[#2e2621] hover:text-[#d6c7bc]'
                    }`}
                  >
                    Exibir Portfólio
                  </button>
                </div>
              </div>

              {/* Theme Colors Selection */}
              <div className="pt-4 border-t border-[#2d2621]">
                <div className="mb-3">
                  <h3 className="text-sm font-bold text-[#fcf8f5] flex items-center gap-2">
                    <Palette className="w-4 h-4 text-[var(--theme-primary)]" />
                    Esquema de Cores do Escritório
                  </h3>
                  <p className="text-xs text-[#a89a8f]">
                    Escolha a paleta de destaque visual para botões, bordas, badges e gráficos.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(Object.keys(THEMES) as ThemeColorId[]).map((themeKey) => {
                    const th = THEMES[themeKey];
                    const isSelected = (formData.themeColor || 'gold') === themeKey;

                    return (
                      <button
                        key={themeKey}
                        type="button"
                        onClick={() => handleSelectTheme(themeKey)}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-2 ${
                          isSelected
                            ? 'bg-[#28221e] border-white/40 ring-2 ring-[var(--theme-primary)] shadow-lg'
                            : 'bg-[#201a17] border-[#342c27] hover:border-[#4d423b]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-5 h-5 rounded-full shadow-inner border border-white/20"
                              style={{ backgroundColor: th.primary }}
                            />
                            <span
                              className="w-3.5 h-3.5 rounded-full shadow-inner -ml-3 border border-white/20"
                              style={{ backgroundColor: th.accent }}
                            />
                          </div>
                          {isSelected && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[var(--theme-primary)] text-black">
                              Ativo
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#fcf8f5]">{th.name}</p>
                          <p className="text-[10px] text-[#8a7c73] truncate">{th.subtitle}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Background Theme Selector */}
                <div className="pt-4 border-t border-[#342c27]/60">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-sm font-bold text-[#fcf8f5]">Aparência & Cor do Fundo</h4>
                      <p className="text-xs text-[#a89c93]">
                        Escolha a tonalidade de fundo do site (Modo Escuro Warm, OLED, Grafite ou Claro Elegante)
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {(Object.keys(BG_THEMES) as BgThemeId[]).map((bgKey) => {
                      const bgTh = BG_THEMES[bgKey];
                      const isSelected = (formData.bgTheme || 'dark_warm') === bgKey;

                      return (
                        <button
                          key={bgKey}
                          type="button"
                          onClick={() => handleSelectBgTheme(bgKey)}
                          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                            isSelected
                              ? 'bg-[var(--theme-primary)]/10 border-[var(--theme-primary)] ring-2 ring-[var(--theme-primary)]'
                              : 'bg-[#201a17] border-[#342c27] hover:border-[#4d423b]'
                          }`}
                        >
                          <span
                            className="w-6 h-6 rounded-lg border border-white/20 shrink-0 shadow-inner"
                            style={{ backgroundColor: bgTh.previewBg }}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-[#fcf8f5] truncate">{bgTh.name}</p>
                            <p className="text-[10px] text-[#a89c93] truncate">{bgTh.subtitle}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PHOTO & AVATAR */}
          {activeTab === 'photo' && (
            <div className="space-y-6">
              {/* Photo Preview */}
              <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-2xl bg-[#201a17] border border-[#342c27]">
                <div className="relative group">
                  <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-[var(--theme-accent)] via-[var(--theme-primary)] to-[var(--theme-accent)] shadow-2xl">
                    <div className="w-full h-full rounded-full overflow-hidden bg-[#14110f] border-2 border-[#1a1614]">
                      <img
                        src={previewPhoto || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80'}
                        alt="Prévia da foto de perfil"
                        className="w-full h-full object-cover object-top"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity backdrop-blur-xs cursor-pointer"
                  >
                    <Camera className="w-6 h-6 mb-1 text-[var(--theme-primary)]" />
                    <span className="text-[11px] font-medium">Trocar</span>
                  </button>
                </div>

                <div className="flex-1 text-center sm:text-left space-y-3">
                  <div>
                    <h3 className="text-base font-medium text-[#f5ede4]">
                      {formData.name || 'Meu Escritório'}
                    </h3>
                    <p className="text-xs text-[#a89a8f]">
                      Recomendado: foto quadrada (1:1), JPG, PNG ou WebP com boa nitidez.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2.5 justify-center sm:justify-start">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--theme-primary)] text-black font-bold text-xs shadow-md hover:brightness-110 active:scale-95 transition-all"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Carregar do Computador / Celular
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const defaultUrl =
                          'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80';
                        setPreviewPhoto(defaultUrl);
                        setFormData((prev) => ({ ...prev, photoUrl: defaultUrl }));
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#2c241f] hover:bg-[#382f29] text-[#cfc2b8] text-xs transition-colors"
                      title="Restaurar foto padrão"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Restaurar Padrão
                    </button>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Drag & Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  isDragOver
                    ? 'border-[var(--theme-primary)] bg-[var(--theme-primary)]/10'
                    : 'border-[#3d342f] hover:border-[var(--theme-primary)]/50 bg-[#161311]/60'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="p-3 rounded-full bg-[#241e1b] text-[var(--theme-primary)]">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-medium text-[#f5ede4]">
                    Arraste e solte uma foto aqui ou clique para buscar
                  </p>
                  <p className="text-xs text-[#8a7c73]">
                    Formatos JPG, PNG, WebP (máx. 10MB)
                  </p>
                </div>
              </div>

              {/* URL Input */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-[#c4b5a8]">
                  Ou cole o link direto de uma imagem online:
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://exemplo.com/minha-foto.jpg"
                    className="flex-1 bg-[#14110f] border border-[#3d342f] rounded-xl px-3.5 py-2 text-sm text-[#f5ede4] placeholder-[#6b5f56] focus:outline-none focus:border-[var(--theme-primary)]"
                  />
                  <button
                    type="button"
                    onClick={handleApplyUrl}
                    className="px-4 py-2 bg-[#2c241f] hover:bg-[#382f29] text-[#f5ede4] rounded-xl text-xs font-medium transition-colors"
                  >
                    Aplicar
                  </button>
                </div>
              </div>

              {/* Presets Grid */}
              <div className="space-y-3">
                <label className="block text-xs font-medium text-[#c4b5a8]">
                  Ou selecione um avatar profissional:
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {PRESET_AVATARS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset.url)}
                      className={`group relative rounded-2xl overflow-hidden aspect-square border-2 transition-all cursor-pointer ${
                        previewPhoto === preset.url
                          ? 'border-[var(--theme-primary)] ring-2 ring-[var(--theme-primary)]/40 scale-95'
                          : 'border-[#342c27] hover:border-[#52443c]'
                      }`}
                    >
                      <img
                        src={preset.url}
                        alt={preset.label}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1.5">
                        <span className="text-[10px] text-white font-medium truncate">
                          {preset.label}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: INFO & PIX */}
          {activeTab === 'info' && (() => {
            const activeNicheConfig = NICHES[formData.niche || 'outro'] || NICHES.outro;
            return (
              <div className="space-y-4">
                {/* Niche Info Card */}
                <div className="p-3.5 rounded-xl bg-[#1a1614] border border-[#3d342f] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{activeNicheConfig.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#fcf8f5]">
                          Nicho do Cadastro: {activeNicheConfig.label}
                        </span>
                        {activeNicheConfig.hasPortfolio ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Com Portfólio
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            Modo Gestão (Sem Portfólio)
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#a89c93]">
                        Os campos abaixo e os cadastros do app refletem este segmento.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetToNicheDefaults}
                    className="px-3 py-1.5 rounded-lg bg-[#241e1b] hover:bg-[#2e2622] text-[11px] font-bold text-[var(--theme-primary)] border border-[#3d342f] transition-colors whitespace-nowrap self-start sm:self-auto cursor-pointer"
                  >
                    Usar Textos Padrão do Nicho
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--theme-primary)] uppercase tracking-wider mb-1.5">
                      Seu Nome / Nome do Escritório *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-[#14110f] border border-[#3d342f] rounded-xl px-3.5 py-2.5 text-sm text-[#f5ede4] focus:outline-none focus:border-[var(--theme-primary)]"
                      placeholder={`Ex: ${activeNicheConfig.label} / Seu Nome`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--theme-primary)] uppercase tracking-wider mb-1.5">
                      Título Profissional
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full bg-[#14110f] border border-[#3d342f] rounded-xl px-3.5 py-2.5 text-sm text-[#f5ede4] focus:outline-none focus:border-[var(--theme-primary)]"
                      placeholder={`Ex: ${activeNicheConfig.defaultTitle}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--theme-primary)] uppercase tracking-wider mb-1.5">
                      Especialidade Principal
                    </label>
                    <input
                      type="text"
                      value={formData.specialty}
                      onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                      className="w-full bg-[#14110f] border border-[#3d342f] rounded-xl px-3.5 py-2.5 text-sm text-[#f5ede4] focus:outline-none focus:border-[var(--theme-primary)]"
                      placeholder={`Ex: ${activeNicheConfig.defaultSpecialty}`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--theme-primary)] uppercase tracking-wider mb-1.5">
                      Localização (Cidade, UF)
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full bg-[#14110f] border border-[#3d342f] rounded-xl px-3.5 py-2.5 text-sm text-[#f5ede4] focus:outline-none focus:border-[var(--theme-primary)]"
                      placeholder="Ex: São Paulo, SP ou Rio de Janeiro, RJ"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--theme-primary)] uppercase tracking-wider mb-1.5">
                    Slogan / Frase de Apresentação
                  </label>
                  <input
                    type="text"
                    value={formData.tagline}
                    onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                    className="w-full bg-[#14110f] border border-[#3d342f] rounded-xl px-3.5 py-2.5 text-sm text-[#f5ede4] focus:outline-none focus:border-[var(--theme-primary)]"
                    placeholder={`Ex: ${activeNicheConfig.description}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--theme-primary)] uppercase tracking-wider mb-1.5">
                    Biografia / Apresentação do Negócio
                  </label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-[#14110f] border border-[#3d342f] rounded-xl px-3.5 py-2.5 text-sm text-[#f5ede4] focus:outline-none focus:border-[var(--theme-primary)] resize-none"
                    placeholder={`Conte um pouco sobre sua trajetória em ${activeNicheConfig.label.toLowerCase()} e o compromisso com seus clientes...`}
                  />
                </div>

              {/* Redes, Seguidores & Pix */}
              <div className="pt-3 border-t border-[#2d2621] grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--theme-primary)] uppercase tracking-wider mb-1.5">
                    Instagram (@perfil ou Link)
                  </label>
                  <input
                    type="text"
                    value={formData.instagramHandle || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      const generatedUrl = buildInstagramUrl(val, formData.instagramUrl);
                      setFormData({ ...formData, instagramHandle: val, instagramUrl: generatedUrl });
                    }}
                    onBlur={(e) => {
                      const val = e.target.value;
                      if (val.trim()) {
                        const clean = cleanInstagramHandle(val);
                        const generatedUrl = buildInstagramUrl(clean, formData.instagramUrl);
                        setFormData({ ...formData, instagramHandle: clean, instagramUrl: generatedUrl });
                      }
                    }}
                    className="w-full bg-[#14110f] border border-[#3d342f] rounded-xl px-3.5 py-2.5 text-sm text-[#f5ede4] focus:outline-none focus:border-[var(--theme-primary)]"
                    placeholder="@seuescritorio ou link do perfil"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--theme-primary)] uppercase tracking-wider mb-1.5">
                    Seguidores / Público
                  </label>
                  <input
                    type="text"
                    value={formData.followersCount || ''}
                    onChange={(e) => setFormData({ ...formData, followersCount: e.target.value })}
                    onBlur={(e) => {
                      if (e.target.value.trim()) {
                        const formatted = formatFollowersCount(e.target.value);
                        setFormData({ ...formData, followersCount: formatted });
                      }
                    }}
                    className="w-full bg-[#14110f] border border-[#3d342f] rounded-xl px-3.5 py-2.5 text-sm text-[#f5ede4] focus:outline-none focus:border-[var(--theme-primary)]"
                    placeholder="Ex: 63 mil seguidores ou 63k"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--theme-primary)] uppercase tracking-wider mb-1.5">
                    Chave Pix (Cobrança)
                  </label>
                  <input
                    type="text"
                    value={formData.pixKey || ''}
                    onChange={(e) => setFormData({ ...formData, pixKey: e.target.value })}
                    className="w-full bg-[#14110f] border border-[#3d342f] rounded-xl px-3.5 py-2.5 text-sm text-[#f5ede4] focus:outline-none focus:border-[var(--theme-primary)]"
                    placeholder="Chave Pix"
                  />
                </div>
              </div>
            </div>
            );
          })()}

          {/* Footer Save Actions */}
          <div className="pt-4 border-t border-[#2d2621] flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-[#201a17] hover:bg-[#2c241f] text-[#a89a8f] text-sm font-medium transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[var(--theme-primary)] text-black font-bold text-sm shadow-lg hover:brightness-110 active:scale-95 transition-all"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  Salvo com Sucesso!
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Salvar Alterações
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
