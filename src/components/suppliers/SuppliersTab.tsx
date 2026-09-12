import React, { useState, useEffect } from 'react';
import {
  Package,
  Search,
  Plus,
  Star,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  Pencil,
  Trash2,
  X,
  Building2,
  CheckCircle2,
  Tag,
  Filter,
  Layers,
  MessageCircle,
} from 'lucide-react';
import { SupplierItem } from '../../types';
import { useAuth } from '../../context/AuthContext';

const INITIAL_SUPPLIERS: SupplierItem[] = [
  {
    id: 'supp_1',
    name: 'Marmoraria Prime Stone Ltda',
    tradeName: 'Prime Stone Granitos & Quartzos',
    category: 'Marmoraria',
    contactPerson: 'Ricardo Alves',
    phone: '(11) 98765-4321',
    whatsapp: '11987654321',
    email: 'contato@primestone.com.br',
    city: 'São Paulo - SP',
    address: 'Av. dos Bandeirantes, 2400',
    partnershipTerms: 'RT 5% • 10% desc. para clientes',
    rating: 5,
    status: 'active',
    notes: 'Especialista em bancadas em ilha, cubas esculpidas e quartzito Taj Mahal.',
    isFavorite: true,
    tags: ['Pedras Naturais', 'Bancadas', 'Quartzo'],
    createdAt: '2024-02-10',
  },
  {
    id: 'supp_2',
    name: 'Marcenaria Conceito & Arte Ind.',
    tradeName: 'Conceito Marcenaria Fina',
    category: 'Marcenaria',
    contactPerson: 'Sérgio Mendonça',
    phone: '(11) 97654-3210',
    whatsapp: '11976543210',
    email: 'sergio@conceitomarcenaria.com.br',
    city: 'São Paulo - SP',
    address: 'Rua Fradique Coutinho, 1120',
    partnershipTerms: 'RT 6% • 8% desc. para clientes',
    rating: 5,
    status: 'active',
    notes: 'Excelente acabamento em lâmina natural de carvalho e ferragens Blum/Hafele.',
    isFavorite: true,
    tags: ['Lâmina Natural', 'Mobiliário Sob Medida', 'Closets'],
    createdAt: '2024-03-01',
  },
  {
    id: 'supp_3',
    name: 'Lúmen Design Luminárias Eireli',
    tradeName: 'Lúmen & Projetos de Luz',
    category: 'Iluminação',
    contactPerson: 'Camila Duarte',
    phone: '(11) 96543-2109',
    whatsapp: '11965432109',
    email: 'projetos@lumendesign.com.br',
    city: 'Campinas - SP',
    address: 'Rua Coronel Silva Telles, 450',
    partnershipTerms: '12% desc. cliente no pagamento à vista',
    rating: 5,
    status: 'active',
    notes: 'Perfis de LED ultrafinos, trilhos magnéticos e consultoria luminotécnica gratuita.',
    isFavorite: true,
    tags: ['LED', 'Trilhos Magnéticos', 'Luminotécnico'],
    createdAt: '2024-04-12',
  },
  {
    id: 'supp_4',
    name: 'Porto Revest Pisos & Revestimentos',
    tradeName: 'Porto Revest Acabamentos',
    category: 'Pisos & Revestimentos',
    contactPerson: 'Fernando Castro',
    phone: '(11) 95432-1098',
    whatsapp: '11954321098',
    email: 'fernando@portorevest.com.br',
    city: 'São Paulo - SP',
    address: 'Alameda Gabriel Monteiro da Silva, 890',
    partnershipTerms: 'RT 4% • 10% desc. cliente',
    rating: 4,
    status: 'active',
    notes: 'Grandes formatos (120x120cm e lastras), pisos vinílicos e rodapés Santa Luzia.',
    isFavorite: false,
    tags: ['Porcelanato', 'Lastras', 'Vinílico'],
    createdAt: '2024-05-18',
  },
  {
    id: 'supp_5',
    name: 'Vidros Arte & Esquadrias Ltda',
    tradeName: 'Arte Vidros & Perfis',
    category: 'Vidraçaria & Esquadrias',
    contactPerson: 'Marcos Vinicius',
    phone: '(11) 94321-0987',
    whatsapp: '11943210987',
    email: 'marcos@artevidros.com.br',
    city: 'São Paulo - SP',
    address: 'Av. Rebouças, 1800',
    partnershipTerms: '5% desc. cliente',
    rating: 4,
    status: 'active',
    notes: 'Boxes piso-teto, guarda-corpos em vidro temperado laminado e espelhos bronze.',
    isFavorite: false,
    tags: ['Espelhos', 'Guarda-corpo', 'Esquadrias'],
    createdAt: '2024-06-05',
  },
  {
    id: 'supp_6',
    name: 'Engenharia Civil & Obras Prime',
    tradeName: 'Eng. Paulo Roberto Reformas',
    category: 'Obras & Empreiteiros',
    contactPerson: 'Eng. Paulo Roberto',
    phone: '(11) 93210-9876',
    whatsapp: '11932109876',
    email: 'paulo@primeobras.com.br',
    city: 'São Paulo - SP',
    address: 'Rua Funchal, 500',
    partnershipTerms: 'Indicação mútua de projetos e obras',
    rating: 5,
    status: 'active',
    notes: 'Equipe própria de civil, elétrica, hidráulica e pintura com cronograma rigoroso.',
    isFavorite: true,
    tags: ['Construção', 'Reforma Civil', 'Gerenciamento'],
    createdAt: '2024-07-20',
  },
];

const CATEGORIES = [
  'Todos',
  'Molduras & Telas',
  'Gráfica & Impressão',
  'Marcenaria',
  'Marmoraria',
  'Iluminação',
  'Pisos & Revestimentos',
  'Vidraçaria & Esquadrias',
  'Obras & Empreiteiros',
  'Mobiliário & Decoração',
  'Climatização',
  'Outros',
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Molduras & Telas': { bg: 'bg-amber-50', text: 'text-amber-900', border: 'border-amber-200' },
  'Gráfica & Impressão': { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200' },
  Marcenaria: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  Marmoraria: { bg: 'bg-stone-50', text: 'text-stone-800', border: 'border-stone-200' },
  Iluminação: { bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-200' },
  'Pisos & Revestimentos': { bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-200' },
  'Vidraçaria & Esquadrias': { bg: 'bg-cyan-50', text: 'text-cyan-800', border: 'border-cyan-200' },
  'Obras & Empreiteiros': { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200' },
  'Mobiliário & Decoração': { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
  Climatização: { bg: 'bg-teal-50', text: 'text-teal-800', border: 'border-teal-200' },
  Outros: { bg: 'bg-zinc-50', text: 'text-zinc-800', border: 'border-zinc-200' },
};

export const SuppliersTab: React.FC = () => {
  const { user, profile } = useAuth();
  const targetUid = profile?.joinedOwnerUid || user?.uid;

  const getStorageKey = (key: string) => {
    return targetUid ? `office_v2_${targetUid}_${key}` : `office_v2_guest_${key}`;
  };

  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierItem | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formTradeName, setFormTradeName] = useState('');
  const [formCategory, setFormCategory] = useState('Marcenaria');
  const [formContactPerson, setFormContactPerson] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formWhatsapp, setFormWhatsapp] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCity, setFormCity] = useState('São Paulo - SP');
  const [formAddress, setFormAddress] = useState('');
  const [formTerms, setFormTerms] = useState('');
  const [formRating, setFormRating] = useState(5);
  const [formNotes, setFormNotes] = useState('');
  const [formIsFavorite, setFormIsFavorite] = useState(false);

  // Load suppliers whenever targetUid changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(getStorageKey('suppliers'));
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.some((s: any) => s.id === 'supp_1' || s.id === 'supp_2' || s.name?.includes('Granitos Brasil'))) {
          localStorage.setItem(getStorageKey('suppliers'), JSON.stringify([]));
          setSuppliers([]);
        } else {
          setSuppliers(parsed);
        }
      } else {
        setSuppliers([]);
      }
    } catch {
      setSuppliers([]);
    }
  }, [targetUid]);

  // Save suppliers whenever suppliers list changes
  useEffect(() => {
    if (!targetUid) return;
    try {
      const serialized = JSON.stringify(suppliers);
      const storageKey = getStorageKey('suppliers');
      if (localStorage.getItem(storageKey) !== serialized) {
        localStorage.setItem(storageKey, serialized);
        window.dispatchEvent(new CustomEvent('suppliers_updated'));
      }
    } catch (e) {
      console.error('Failed to persist suppliers', e);
    }
  }, [suppliers, targetUid]);

  // Synchronize with external changes or events
  useEffect(() => {
    const handleSuppliersUpdated = () => {
      try {
        const saved = localStorage.getItem(getStorageKey('suppliers'));
        if (saved) {
          const parsed = JSON.parse(saved);
          setSuppliers((prev) => {
            if (JSON.stringify(prev) === saved) {
              return prev;
            }
            return parsed;
          });
        } else {
          setSuppliers((prev) => (prev.length === 0 ? prev : []));
        }
      } catch {
        setSuppliers((prev) => (prev.length === 0 ? prev : []));
      }
    };
    window.addEventListener('suppliers_updated', handleSuppliersUpdated);
    window.addEventListener('storage', handleSuppliersUpdated);
    return () => {
      window.removeEventListener('suppliers_updated', handleSuppliersUpdated);
      window.removeEventListener('storage', handleSuppliersUpdated);
    };
  }, [targetUid]);

  const handleOpenAddModal = () => {
    setEditingSupplier(null);
    setFormName('');
    setFormTradeName('');
    setFormCategory('Marcenaria');
    setFormContactPerson('');
    setFormPhone('');
    setFormWhatsapp('');
    setFormEmail('');
    setFormCity('São Paulo - SP');
    setFormAddress('');
    setFormTerms('RT 5% • 10% desc. cliente');
    setFormRating(5);
    setFormNotes('');
    setFormIsFavorite(false);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (supp: SupplierItem) => {
    setEditingSupplier(supp);
    setFormName(supp.name);
    setFormTradeName(supp.tradeName || '');
    setFormCategory(supp.category);
    setFormContactPerson(supp.contactPerson || '');
    setFormPhone(supp.phone);
    setFormWhatsapp(supp.whatsapp || '');
    setFormEmail(supp.email || '');
    setFormCity(supp.city || '');
    setFormAddress(supp.address || '');
    setFormTerms(supp.partnershipTerms || '');
    setFormRating(supp.rating);
    setFormNotes(supp.notes || '');
    setFormIsFavorite(supp.isFavorite || false);
    setIsModalOpen(true);
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editingSupplier) {
      setSuppliers((prev) =>
        prev.map((s) =>
          s.id === editingSupplier.id
            ? {
                ...s,
                name: formName.trim(),
                tradeName: formTradeName.trim(),
                category: formCategory,
                contactPerson: formContactPerson.trim(),
                phone: formPhone.trim(),
                whatsapp: formWhatsapp.trim() || formPhone.replace(/\D/g, ''),
                email: formEmail.trim(),
                city: formCity.trim(),
                address: formAddress.trim(),
                partnershipTerms: formTerms.trim(),
                rating: formRating,
                notes: formNotes.trim(),
                isFavorite: formIsFavorite,
              }
            : s
        )
      );
    } else {
      const newSupp: SupplierItem = {
        id: `supp_${Date.now()}`,
        name: formName.trim(),
        tradeName: formTradeName.trim() || formName.trim(),
        category: formCategory,
        contactPerson: formContactPerson.trim(),
        phone: formPhone.trim(),
        whatsapp: formWhatsapp.trim() || formPhone.replace(/\D/g, ''),
        email: formEmail.trim(),
        city: formCity.trim(),
        address: formAddress.trim(),
        partnershipTerms: formTerms.trim(),
        rating: formRating,
        status: 'active',
        notes: formNotes.trim(),
        isFavorite: formIsFavorite,
        createdAt: new Date().toISOString().split('T')[0],
      };
      setSuppliers((prev) => [newSupp, ...prev]);
    }

    setIsModalOpen(false);
    setEditingSupplier(null);
  };

  const [deletingSupplierId, setDeletingSupplierId] = useState<string | null>(null);

  const handleDeleteSupplier = (id: string) => {
    setDeletingSupplierId(id);
  };

  const confirmDeleteSupplier = () => {
    if (!deletingSupplierId) return;
    setSuppliers((prev) => prev.filter((s) => s.id !== deletingSupplierId));
    if (editingSupplier?.id === deletingSupplierId) {
      setIsModalOpen(false);
      setEditingSupplier(null);
    }
    setDeletingSupplierId(null);
  };

  const handleToggleFavorite = (id: string) => {
    setSuppliers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isFavorite: !s.isFavorite } : s))
    );
  };

  // Filtered suppliers
  const filteredSuppliers = suppliers.filter((supp) => {
    if (onlyFavorites && !supp.isFavorite) return false;
    if (selectedCategory !== 'Todos' && supp.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchName = supp.name.toLowerCase().includes(query);
      const matchTrade = supp.tradeName?.toLowerCase().includes(query);
      const matchContact = supp.contactPerson?.toLowerCase().includes(query);
      const matchCity = supp.city?.toLowerCase().includes(query);
      const matchNotes = supp.notes?.toLowerCase().includes(query);
      if (!matchName && !matchTrade && !matchContact && !matchCity && !matchNotes) {
        return false;
      }
    }
    return true;
  });

  const favoritesCount = suppliers.filter((s) => s.isFavorite).length;

  return (
    <div className="bg-[#fbf9f5] text-zinc-900 p-6 sm:p-8 rounded-3xl border border-[#ebe5dc] shadow-sm space-y-6 pb-16 max-w-7xl mx-auto animate-in fade-in duration-150">
      {/* Top Header & New Supplier CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight">
            Fornecedores
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Rede de parceiros homologados, lojas, prestadores de serviço e avaliações
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center justify-center gap-2 bg-[#b8a38b] hover:bg-[#a89178] text-white px-5 py-2.5 rounded-full text-xs font-bold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Novo Fornecedor</span>
        </button>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl border border-zinc-200/90 p-4 shadow-xs">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Cadastrado</span>
            <Package className="w-4 h-4 text-zinc-500" />
          </div>
          <span className="text-2xl font-bold text-zinc-900">{suppliers.length}</span>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Parceiros no catálogo</span>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200/90 p-4 shadow-xs">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Parceiros Chave</span>
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
          </div>
          <span className="text-2xl font-bold text-zinc-900">{favoritesCount}</span>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Fornecedores favoritos</span>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200/90 p-4 shadow-xs">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Categorias</span>
            <Layers className="w-4 h-4 text-zinc-500" />
          </div>
          <span className="text-2xl font-bold text-zinc-900">
            {new Set(suppliers.map((s) => s.category)).size}
          </span>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Especialidades ativas</span>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200/90 p-4 shadow-xs">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Média Avaliação</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <span className="text-2xl font-bold text-zinc-900">
            {(
              suppliers.reduce((acc, s) => acc + s.rating, 0) / (suppliers.length || 1)
            ).toFixed(1)}
            <span className="text-xs font-normal text-zinc-400"> / 5.0</span>
          </span>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Qualidade comprovada</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-zinc-200/90 p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome, contato, cidade ou especialidade..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-800 bg-white placeholder-zinc-400 focus:outline-hidden focus:border-[#8c7456]"
            />
          </div>

          {/* Quick Filter: Favorites Only */}
          <button
            onClick={() => setOnlyFavorites(!onlyFavorites)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer shrink-0 ${
              onlyFavorites
                ? 'bg-amber-50 text-amber-900 border-amber-300'
                : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
            }`}
          >
            <Star
              className={`w-3.5 h-3.5 ${onlyFavorites ? 'fill-amber-500 text-amber-500' : 'text-zinc-400'}`}
            />
            <span>Apenas Favoritos ({favoritesCount})</span>
          </button>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full whitespace-nowrap font-medium transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#241e1b] text-white font-semibold shadow-xs'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/80'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Suppliers Grid */}
      {filteredSuppliers.length === 0 ? (
        <div className="bg-white rounded-3xl border border-zinc-200 p-12 text-center max-w-lg mx-auto shadow-xs">
          <Package className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-zinc-800">Nenhum fornecedor encontrado</h3>
          <p className="text-xs text-zinc-500 mt-1">
            Tente ajustar os termos da busca ou adicione um novo parceiro ao catálogo.
          </p>
          <button
            onClick={handleOpenAddModal}
            className="mt-4 inline-flex items-center gap-1.5 bg-[#b8a38b] hover:bg-[#a89178] text-white px-4 py-2 rounded-full text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Cadastrar Fornecedor</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.map((supp) => {
            const catColors =
              CATEGORY_COLORS[supp.category] || CATEGORY_COLORS['Outros'];
            const waNumber = (supp.whatsapp || supp.phone).replace(/\D/g, '');

            return (
              <div
                key={supp.id}
                className="bg-white rounded-2xl border border-zinc-200/90 hover:border-zinc-300 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top: Category Tag & Favorite Star */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${catColors.bg} ${catColors.text} ${catColors.border}`}
                    >
                      {supp.category}
                    </span>

                    <button
                      onClick={() => handleToggleFavorite(supp.id)}
                      className="p-1 text-zinc-300 hover:text-amber-500 transition-colors cursor-pointer"
                      title={supp.isFavorite ? 'Remover dos favoritos' : 'Marcar como favorito'}
                    >
                      <Star
                        className={`w-4 h-4 ${
                          supp.isFavorite ? 'text-amber-500 fill-amber-500' : ''
                        }`}
                      />
                    </button>
                  </div>

                  {/* Title & Trade Name */}
                  <h3 className="font-bold text-sm text-zinc-900 leading-tight">
                    {supp.tradeName || supp.name}
                  </h3>
                  {supp.tradeName && supp.tradeName !== supp.name && (
                    <p className="text-[11px] text-zinc-500 mt-0.5 truncate">{supp.name}</p>
                  )}

                  {/* Star Rating */}
                  <div className="flex items-center gap-1 my-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-3.5 h-3.5 ${
                          star <= supp.rating
                            ? 'text-amber-500 fill-amber-500'
                            : 'text-zinc-200'
                        }`}
                      />
                    ))}
                    <span className="text-[11px] font-semibold text-zinc-600 ml-1">
                      {supp.rating}.0
                    </span>
                  </div>

                  {/* Partnership Terms Banner */}
                  {supp.partnershipTerms && (
                    <div className="bg-[#faf8f5] border border-[#ebe5dc] rounded-xl px-2.5 py-1.5 my-2.5 text-[11px] font-medium text-[#8c6d48] flex items-center gap-1.5">
                      <Tag className="w-3 h-3 text-[#b8a38b] shrink-0" />
                      <span className="truncate">{supp.partnershipTerms}</span>
                    </div>
                  )}

                  {/* Contact Information */}
                  <div className="space-y-1.5 text-xs text-zinc-600 my-3">
                    {supp.contactPerson && (
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-400 text-[11px]">Contato:</span>
                        <span className="font-semibold text-zinc-800 truncate">
                          {supp.contactPerson}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Phone className="w-3 h-3 text-zinc-400 shrink-0" />
                      <span>{supp.phone}</span>
                    </div>

                    {supp.city && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3 h-3 text-zinc-400 shrink-0" />
                        <span className="truncate">{supp.city}</span>
                      </div>
                    )}
                  </div>

                  {/* Notes / Specialties */}
                  {supp.notes && (
                    <p className="text-[11px] text-zinc-500 bg-zinc-50 p-2.5 rounded-xl border border-zinc-150 line-clamp-2 mt-2">
                      {supp.notes}
                    </p>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center justify-between pt-3 mt-4 border-t border-zinc-100 gap-2">
                  {/* WhatsApp Link */}
                  {waNumber ? (
                    <a
                      href={`https://wa.me/55${waNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold border border-emerald-200 transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>WhatsApp</span>
                    </a>
                  ) : (
                    <div />
                  )}

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(supp)}
                      className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer"
                      title="Editar fornecedor"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteSupplier(supp.id)}
                      className="p-1.5 rounded-lg border border-zinc-200 hover:bg-red-50 text-zinc-400 hover:text-red-600 transition-colors cursor-pointer"
                      title="Excluir fornecedor"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Novo / Editar Fornecedor */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-zinc-200 p-6 overflow-hidden max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-[#8c7456]" />
                <h3 className="font-bold text-sm text-zinc-900">
                  {editingSupplier ? 'Editar fornecedor' : 'Cadastrar novo fornecedor'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="space-y-4 pt-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Nome Fantasia <span className="text-[#8c7456]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formTradeName}
                    onChange={(e) => setFormTradeName(e.target.value)}
                    placeholder="Ex: Prime Stone Marmoraria"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-800 bg-white focus:outline-hidden focus:border-[#8c7456]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Razão Social
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ex: Prime Stone Ltda"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-800 bg-white focus:outline-hidden focus:border-[#8c7456]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Categoria <span className="text-[#8c7456]">*</span>
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-800 bg-white focus:outline-hidden focus:border-[#8c7456]"
                  >
                    {CATEGORIES.filter((c) => c !== 'Todos').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Contato / Responsável
                  </label>
                  <input
                    type="text"
                    value={formContactPerson}
                    onChange={(e) => setFormContactPerson(e.target.value)}
                    placeholder="Ex: Ricardo Alves"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-800 bg-white focus:outline-hidden focus:border-[#8c7456]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Telefone / WhatsApp <span className="text-[#8c7456]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formPhone}
                    onChange={(e) => {
                      setFormPhone(e.target.value);
                      if (!formWhatsapp) setFormWhatsapp(e.target.value);
                    }}
                    placeholder="(11) 98765-4321"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-800 bg-white focus:outline-hidden focus:border-[#8c7456]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="contato@parceiro.com.br"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-800 bg-white focus:outline-hidden focus:border-[#8c7456]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Cidade / UF
                  </label>
                  <input
                    type="text"
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    placeholder="Ex: São Paulo - SP"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-800 bg-white focus:outline-hidden focus:border-[#8c7456]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Condição de Parceria / RT
                  </label>
                  <input
                    type="text"
                    value={formTerms}
                    onChange={(e) => setFormTerms(e.target.value)}
                    placeholder="Ex: RT 5% • 10% desc. cliente"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-800 bg-white focus:outline-hidden focus:border-[#8c7456]"
                  />
                </div>
              </div>

              {/* Avaliação & Favorito */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Avaliação da Equipe
                  </label>
                  <div className="flex items-center gap-1 py-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setFormRating(star)}
                        className="p-1 text-zinc-300 hover:text-amber-500 transition-colors cursor-pointer"
                      >
                        <Star
                          className={`w-5 h-5 ${
                            star <= formRating
                              ? 'text-amber-500 fill-amber-500'
                              : 'text-zinc-200'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center pt-4">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-zinc-700">
                    <input
                      type="checkbox"
                      checked={formIsFavorite}
                      onChange={(e) => setFormIsFavorite(e.target.checked)}
                      className="rounded text-[#8c7456] focus:ring-[#8c7456]"
                    />
                    <span className="font-semibold flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      Fornecedor Favorito
                    </span>
                  </label>
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Especialidades e Observações
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Materiais que mais utiliza, prazos de entrega, diferenciais técnicos..."
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-800 bg-white focus:outline-hidden focus:border-[#8c7456]"
                />
              </div>

              {/* Submit / Cancel */}
              <div className="flex items-center justify-between gap-2 pt-3 border-t border-zinc-100">
                {editingSupplier ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteSupplier(editingSupplier.id)}
                    className="px-3 py-2 rounded-xl text-xs font-medium text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="py-2.5 px-4 rounded-xl text-xs font-semibold text-zinc-600 border border-zinc-200 hover:bg-zinc-50 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="py-2.5 px-5 rounded-xl text-xs font-bold text-white bg-[#b8a38b] hover:bg-[#a89178] transition-colors cursor-pointer shadow-xs"
                  >
                    Salvar fornecedor
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE SUPPLIER MODAL */}
      {deletingSupplierId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1c1815] border border-rose-500/30 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-[#fcf8f5] text-base">
                  Excluir fornecedor
                </h3>
                <p className="text-xs text-rose-400/80 mt-0.5 font-medium">
                  Esta ação não pode ser desfeita
                </p>
              </div>
            </div>

            <p className="text-xs text-[#fcf8f5] leading-relaxed bg-[#12100e] p-3.5 rounded-xl border border-[#302722]">
              Tem certeza que deseja excluir permanentemente este fornecedor?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#302722]">
              <button
                onClick={() => setDeletingSupplierId(null)}
                className="px-4 py-2 rounded-xl border border-[#3d342f] text-xs font-bold text-[#a89c93] hover:text-[#fcf8f5] hover:bg-[#25201d] transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteSupplier}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-rose-900/30"
              >
                <Trash2 className="w-4 h-4" />
                Confirmar exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
