import React, { useState, useEffect } from 'react';
import {
  ListChecks,
  Plus,
  X,
  Trash2,
  Edit2,
  Check,
  ShoppingCart,
  Utensils,
  Package,
  PenTool,
  Printer,
  Gift,
  Wrench,
  HardHat,
  Sparkles,
  Store,
  Building2,
  Home,
  Briefcase,
  User,
  Calendar,
  Banknote,
  Laptop,
  Palette,
  CheckCircle2,
  Circle,
  PlusCircle,
  Search,
  MoreVertical,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// Available icons for selection matching user interface mockup
const ICON_OPTIONS = [
  { id: 'list', icon: ListChecks, label: 'Lista' },
  { id: 'cart', icon: ShoppingCart, label: 'Compras' },
  { id: 'utensils', icon: Utensils, label: 'Alimentação' },
  { id: 'package', icon: Package, label: 'Materiais' },
  { id: 'pen', icon: PenTool, label: 'Desenho/Projetos' },
  { id: 'printer', icon: Printer, label: 'Impressão' },
  { id: 'gift', icon: Gift, label: 'Presentes' },
  { id: 'wrench', icon: Wrench, label: 'Manutenção' },
  { id: 'hardhat', icon: HardHat, label: 'Obra' },
  { id: 'sparkles', icon: Sparkles, label: 'Destaques' },
  { id: 'store', icon: Store, label: 'Loja/Fornecedores' },
  { id: 'building', icon: Building2, label: 'Escritório' },
  { id: 'home', icon: Home, label: 'Residencial' },
  { id: 'briefcase', icon: Briefcase, label: 'Trabalho' },
  { id: 'user', icon: User, label: 'Pessoal' },
  { id: 'calendar', icon: Calendar, label: 'Datas' },
  { id: 'cash', icon: Banknote, label: 'Financeiro' },
  { id: 'laptop', icon: Laptop, label: 'Tecnologia' },
  { id: 'palette', icon: Palette, label: 'Design' },
];

export interface QuickListItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
}

export interface QuickList {
  id: string;
  title: string;
  iconId: string;
  items: QuickListItem[];
  createdAt: string;
}

export const ListsTab: React.FC = () => {
  const { user, targetUid } = useAuth();
  
  const getStorageKey = () => `meu_escritorio_quick_lists_${targetUid || user?.uid || 'default'}`;

  const [lists, setLists] = useState<QuickList[]>(() => {
    try {
      const saved = localStorage.getItem(getStorageKey());
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error loading quick lists', e);
    }
    return [];
  });

  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingList, setEditingList] = useState<QuickList | null>(null);
  const [listNameInput, setListNameInput] = useState('');
  const [selectedIconId, setSelectedIconId] = useState('list');
  const [newItemText, setNewItemText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingListId, setDeletingListId] = useState<string | null>(null);

  // Sync to localStorage
  useEffect(() => {
    try {
      const key = getStorageKey();
      localStorage.setItem(key, JSON.stringify(lists));
    } catch (e) {
      console.error('Error saving quick lists', e);
    }
  }, [lists, targetUid]);

  // Set active list default
  useEffect(() => {
    if (lists.length > 0 && (!activeListId || !lists.some((l) => l.id === activeListId))) {
      setActiveListId(lists[0].id);
    } else if (lists.length === 0) {
      setActiveListId(null);
    }
  }, [lists, activeListId]);

  const handleOpenNewListModal = () => {
    setEditingList(null);
    setListNameInput('');
    setSelectedIconId('list');
    setIsModalOpen(true);
  };

  const handleOpenEditListModal = (list: QuickList, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingList(list);
    setListNameInput(list.title);
    setSelectedIconId(list.iconId || 'list');
    setIsModalOpen(true);
  };

  const handleSaveList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!listNameInput.trim()) return;

    if (editingList) {
      setLists((prev) =>
        prev.map((l) =>
          l.id === editingList.id
            ? { ...l, title: listNameInput.trim(), iconId: selectedIconId }
            : l
        )
      );
    } else {
      const newList: QuickList = {
        id: `list_${Date.now()}`,
        title: listNameInput.trim(),
        iconId: selectedIconId,
        items: [],
        createdAt: new Date().toISOString(),
      };
      setLists((prev) => [...prev, newList]);
      setActiveListId(newList.id);
    }

    setIsModalOpen(false);
    setListNameInput('');
  };

  const handleDeleteList = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeletingListId(id);
  };

  const confirmDeleteList = () => {
    if (!deletingListId) return;
    setLists((prev) => prev.filter((l) => l.id !== deletingListId));
    setDeletingListId(null);
  };

  const handleAddItem = (listId: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newItemText.trim()) return;

    const newItem: QuickListItem = {
      id: `item_${Date.now()}`,
      text: newItemText.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
    };

    setLists((prev) =>
      prev.map((l) => (l.id === listId ? { ...l, items: [...l.items, newItem] } : l))
    );

    setNewItemText('');
  };

  const handleToggleItem = (listId: string, itemId: string) => {
    setLists((prev) =>
      prev.map((l) => {
        if (l.id !== listId) return l;
        return {
          ...l,
          items: l.items.map((it) => (it.id === itemId ? { ...it, completed: !it.completed } : it)),
        };
      })
    );
  };

  const handleDeleteItem = (listId: string, itemId: string) => {
    setLists((prev) =>
      prev.map((l) => {
        if (l.id !== listId) return l;
        return {
          ...l,
          items: l.items.filter((it) => it.id !== itemId),
        };
      })
    );
  };

  const getIconComponent = (iconId: string) => {
    const found = ICON_OPTIONS.find((opt) => opt.id === iconId);
    return found ? found.icon : ListChecks;
  };

  const activeList = lists.find((l) => l.id === activeListId) || lists[0];

  const filteredLists = lists.filter((l) =>
    l.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#fcf8f5]">Listas</h1>
          <p className="text-xs text-[#a89c93] mt-0.5">
            Lembretes rápidos para o dia a dia do escritório.
          </p>
        </div>

        <button
          onClick={handleOpenNewListModal}
          className="px-4 py-2.5 bg-[#1c352d] hover:bg-[#25463c] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer border border-[#2d5246]"
        >
          <Plus className="w-4 h-4 text-[#85e3c1]" />
          <span>Nova lista</span>
        </button>
      </div>

      {/* EMPTY STATE */}
      {lists.length === 0 ? (
        <div className="bg-[#1a1614] border border-[#302722] rounded-2xl p-12 text-center max-w-2xl mx-auto my-8 space-y-5 shadow-xl">
          <div className="w-16 h-16 rounded-full bg-[#25201d] border border-[#3d342f] text-[#85e3c1] flex items-center justify-center mx-auto shadow-inner">
            <PlusCircle className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-lg font-serif font-bold text-[#fcf8f5]">Crie sua primeira lista</h3>
            <p className="text-xs text-[#a89c93] max-w-sm mx-auto leading-relaxed">
              Compras, materiais ou lembretes em poucos toques.
            </p>
          </div>

          <button
            onClick={handleOpenNewListModal}
            className="px-6 py-3 bg-[#1c352d] hover:bg-[#25463c] text-white rounded-xl text-xs font-bold transition-all shadow-lg cursor-pointer border border-[#2d5246] inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4 text-[#85e3c1]" />
            <span>Criar lista</span>
          </button>
        </div>
      ) : (
        /* MAIN LISTS CONTENT */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* SIDEBAR LIST OF LISTS */}
          <div className="lg:col-span-4 bg-[#1a1614] border border-[#302722] rounded-2xl p-4 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-[#8c7e73] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar lista..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#12100e] border border-[#382f29] rounded-xl text-xs text-[#fcf8f5] placeholder-[#73655c] focus:outline-none focus:border-[#85e3c1]"
              />
            </div>

            <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1 no-scrollbar">
              {filteredLists.map((list) => {
                const IconComp = getIconComponent(list.iconId);
                const isActive = list.id === activeListId;
                const completedCount = list.items.filter((i) => i.completed).length;
                const totalCount = list.items.length;

                return (
                  <div
                    key={list.id}
                    onClick={() => setActiveListId(list.id)}
                    className={`group p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isActive
                        ? 'bg-[#25201d] border-[var(--theme-primary)] text-[#fcf8f5] shadow-md'
                        : 'bg-[#12100e]/70 border-[#2a221d] text-[#a89c93] hover:bg-[#1f1a17] hover:text-[#fcf8f5]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                          isActive
                            ? 'bg-[#1c352d] border-[#2d5246] text-[#85e3c1]'
                            : 'bg-[#1a1614] border-[#382f29] text-[#a89c93]'
                        }`}
                      >
                        <IconComp className="w-4 h-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-xs truncate text-[#fcf8f5]">{list.title}</p>
                        <p className="text-[10px] text-[#8c7e73] mt-0.5">
                          {totalCount === 0
                            ? 'Nenhum item'
                            : `${completedCount}/${totalCount} concluídos`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleOpenEditListModal(list, e)}
                        className="p-1.5 text-[#8c7e73] hover:text-[#fcf8f5] hover:bg-[#2d2520] rounded-lg transition-colors cursor-pointer"
                        title="Editar lista"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteList(list.id, e)}
                        className="p-1.5 text-rose-400/80 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                        title="Excluir lista"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ACTIVE LIST DETAIL PANEL */}
          {activeList && (
            <div className="lg:col-span-8 bg-[#1a1614] border border-[#302722] rounded-2xl p-6 space-y-6">
              {/* LIST HEADER */}
              <div className="flex items-center justify-between pb-4 border-b border-[#302722]">
                <div className="flex items-center gap-3">
                  {(() => {
                    const ActiveIcon = getIconComponent(activeList.iconId);
                    return (
                      <div className="w-11 h-11 rounded-2xl bg-[#1c352d] border border-[#2d5246] text-[#85e3c1] flex items-center justify-center shrink-0 shadow-md">
                        <ActiveIcon className="w-5 h-5" />
                      </div>
                    );
                  })()}
                  <div>
                    <h2 className="text-lg font-serif font-bold text-[#fcf8f5]">
                      {activeList.title}
                    </h2>
                    <p className="text-xs text-[#a89c93] mt-0.5">
                      {activeList.items.length === 0
                        ? 'Lista vazia. Adicione lembretes abaixo.'
                        : `${activeList.items.filter((i) => i.completed).length} de ${
                            activeList.items.length
                          } itens concluídos`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleOpenEditListModal(activeList, e)}
                    className="p-2 border border-[#382f29] text-[#a89c93] hover:text-[#fcf8f5] hover:bg-[#25201d] rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Editar</span>
                  </button>
                  <button
                    onClick={(e) => handleDeleteList(activeList.id, e)}
                    className="p-2 border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Excluir</span>
                  </button>
                </div>
              </div>

              {/* ADD NEW ITEM FORM */}
              <form onSubmit={(e) => handleAddItem(activeList.id, e)} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Adicionar novo item ou lembrete..."
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-[#12100e] border border-[#382f29] rounded-xl text-xs text-[#fcf8f5] placeholder-[#73655c] focus:outline-none focus:border-[#85e3c1] transition-all"
                />
                <button
                  type="submit"
                  disabled={!newItemText.trim()}
                  className="px-5 py-2.5 bg-[#1c352d] hover:bg-[#25463c] disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-[#2d5246]"
                >
                  <Plus className="w-4 h-4 text-[#85e3c1]" />
                  <span>Adicionar</span>
                </button>
              </form>

              {/* ITEMS LIST */}
              <div className="space-y-2 pt-2">
                {activeList.items.length === 0 ? (
                  <div className="p-8 text-center bg-[#12100e] rounded-xl border border-dashed border-[#302722]">
                    <p className="text-xs text-[#8c7e73]">
                      Nenhum item nesta lista ainda. Digite um lembrete acima.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeList.items.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleToggleItem(activeList.id, item.id)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          item.completed
                            ? 'bg-[#12100e]/50 border-[#25201d] text-[#73655c]'
                            : 'bg-[#12100e] border-[#302722] text-[#fcf8f5] hover:border-[#3d342f]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleItem(activeList.id, item.id);
                            }}
                            className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                              item.completed
                                ? 'bg-[#1c352d] text-[#85e3c1] border border-[#2d5246]'
                                : 'border border-[#3d342f] text-transparent hover:border-[#85e3c1]'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </button>

                          <span
                            className={`text-xs leading-relaxed select-none ${
                              item.completed ? 'line-through text-[#73655c]' : 'text-[#fcf8f5]'
                            }`}
                          >
                            {item.text}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteItem(activeList.id, item.id);
                          }}
                          className="p-1 text-[#73655c] hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                          title="Remover item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL NOVA / EDITAR LISTA */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1614] border border-[#302722] rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#302722]">
              <h3 className="font-serif font-bold text-[#fcf8f5] text-base">
                {editingList ? 'Editar lista' : 'Nova lista'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-[#8c7e73] hover:text-[#fcf8f5] rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveList} className="space-y-5">
              {/* INPUT NOME DA LISTA */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#fcf8f5] block">Nome da lista</label>
                <input
                  type="text"
                  placeholder="Nome da lista"
                  value={listNameInput}
                  onChange={(e) => setListNameInput(e.target.value)}
                  autoFocus
                  required
                  className="w-full px-3.5 py-2.5 bg-[#12100e] border border-[#382f29] rounded-xl text-xs text-[#fcf8f5] placeholder-[#73655c] focus:outline-none focus:border-[#85e3c1]"
                />
              </div>

              {/* ICON SELECTOR GRID */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#fcf8f5] block">Ícone</label>
                <div className="grid grid-cols-5 gap-2 max-h-[220px] overflow-y-auto pr-1 no-scrollbar p-1 bg-[#12100e] rounded-xl border border-[#302722]">
                  {ICON_OPTIONS.map((opt) => {
                    const IconComp = opt.icon;
                    const isSelected = selectedIconId === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSelectedIconId(opt.id)}
                        className={`w-full aspect-square rounded-xl flex items-center justify-center transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-[#1c352d] border-[#85e3c1] text-[#85e3c1] shadow-md'
                            : 'bg-[#1a1614] border-[#2f2722] text-[#8c7e73] hover:text-[#fcf8f5] hover:bg-[#25201d]'
                        }`}
                        title={opt.label}
                      >
                        <IconComp className="w-5 h-5" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* MODAL ACTIONS */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#302722]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#382f29] text-xs font-bold text-[#a89c93] hover:text-[#fcf8f5] hover:bg-[#25201d] transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!listNameInput.trim()}
                  className="px-5 py-2.5 bg-[#1c352d] hover:bg-[#25463c] disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all cursor-pointer border border-[#2d5246] shadow-md"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deletingListId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1614] border border-rose-500/30 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-[#fcf8f5] text-base">Excluir lista</h3>
                <p className="text-xs text-rose-400/80 mt-0.5 font-medium">
                  Esta ação não pode ser desfeita
                </p>
              </div>
            </div>

            <p className="text-xs text-[#fcf8f5] leading-relaxed bg-[#12100e] p-3.5 rounded-xl border border-[#302722]">
              Tem certeza que deseja excluir permanentemente esta lista e todos os seus lembretes?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#302722]">
              <button
                onClick={() => setDeletingListId(null)}
                className="px-4 py-2 rounded-xl border border-[#382f29] text-xs font-bold text-[#a89c93] hover:text-[#fcf8f5] hover:bg-[#25201d] transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteList}
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
