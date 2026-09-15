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
          <h1 className="text-2xl font-serif font-bold text-[var(--text-main)]">Listas</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Lembretes rápidos para o dia a dia do escritório.
          </p>
        </div>

        <button
          onClick={handleOpenNewListModal}
          className="px-4 py-2.5 bg-[var(--theme-primary)] text-black font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer hover:brightness-110"
        >
          <Plus className="w-4 h-4 text-black" />
          <span>Nova lista</span>
        </button>
      </div>

      {/* EMPTY STATE */}
      {lists.length === 0 ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-12 text-center max-w-2xl mx-auto my-8 space-y-5 shadow-xl">
          <div className="w-16 h-16 rounded-full bg-[var(--bg-card-secondary)] border border-[var(--border-color)] text-[var(--theme-primary)] flex items-center justify-center mx-auto shadow-inner">
            <PlusCircle className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-lg font-serif font-bold text-[var(--text-main)]">Crie sua primeira lista</h3>
            <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto leading-relaxed">
              Compras, materiais ou lembretes em poucos toques.
            </p>
          </div>

          <button
            onClick={handleOpenNewListModal}
            className="px-6 py-3 bg-[var(--theme-primary)] text-black font-bold rounded-xl text-xs transition-all shadow-lg cursor-pointer inline-flex items-center gap-2 hover:brightness-110"
          >
            <Plus className="w-4 h-4 text-black" />
            <span>Criar lista</span>
          </button>
        </div>
      ) : (
        /* MAIN LISTS CONTENT */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* SIDEBAR LIST OF LISTS */}
          <div className="lg:col-span-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar lista..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[var(--bg-body)] border border-[var(--border-color)] rounded-xl text-xs text-[var(--text-main)] placeholder-[var(--text-muted)]/60 focus:outline-none focus:border-[var(--theme-primary)]"
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
                        ? 'bg-[var(--bg-card-secondary)] border-[var(--theme-primary)] text-[var(--text-main)] shadow-md'
                        : 'bg-[var(--bg-body)]/70 border-[var(--border-color)] text-[var(--text-muted)] hover:bg-[var(--bg-card-secondary)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                          isActive
                            ? 'bg-[var(--theme-primary)]/10 border-[var(--theme-primary)]/30 text-[var(--theme-primary)]'
                            : 'bg-[var(--bg-card-secondary)] border-[var(--border-color)] text-[var(--text-muted)]'
                        }`}
                      >
                        <IconComp className="w-4 h-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-xs truncate text-[var(--text-main)]">{list.title}</p>
                        <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                          {totalCount === 0
                            ? 'Nenhum item'
                            : `${completedCount}/${totalCount} concluídos`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleOpenEditListModal(list, e)}
                        className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-secondary)] rounded-lg transition-colors cursor-pointer"
                        title="Editar lista"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteList(list.id, e)}
                        className="p-1.5 text-rose-500/80 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
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
            <div className="lg:col-span-8 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 space-y-6">
              {/* LIST HEADER */}
              <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)]">
                <div className="flex items-center gap-3">
                  {(() => {
                    const ActiveIcon = getIconComponent(activeList.iconId);
                    return (
                      <div className="w-11 h-11 rounded-2xl bg-[var(--theme-primary)]/10 border border-[var(--theme-primary)]/30 text-[var(--theme-primary)] flex items-center justify-center shrink-0 shadow-md">
                        <ActiveIcon className="w-5 h-5" />
                      </div>
                    );
                  })()}
                  <div>
                    <h2 className="text-lg font-serif font-bold text-[var(--text-main)]">
                      {activeList.title}
                    </h2>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
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
                    className="p-2 border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-secondary)] rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Editar</span>
                  </button>
                  <button
                    onClick={(e) => handleDeleteList(activeList.id, e)}
                    className="p-2 border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
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
                  className="flex-1 px-4 py-2.5 bg-[var(--bg-body)] border border-[var(--border-color)] rounded-xl text-xs text-[var(--text-main)] placeholder-[var(--text-muted)]/60 focus:outline-none focus:border-[var(--theme-primary)] transition-all"
                />
                <button
                  type="submit"
                  disabled={!newItemText.trim()}
                  className="px-5 py-2.5 bg-[var(--theme-primary)] hover:brightness-110 disabled:opacity-40 text-black font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer border border-[var(--border-color)]"
                >
                  <Plus className="w-4 h-4 text-black" />
                  <span>Adicionar</span>
                </button>
              </form>

              {/* ITEMS LIST */}
              <div className="space-y-2 pt-2">
                {activeList.items.length === 0 ? (
                  <div className="p-8 text-center bg-[var(--bg-body)] rounded-xl border border-dashed border-[var(--border-color)]">
                    <p className="text-xs text-[var(--text-muted)]">
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
                            ? 'bg-[var(--bg-body)]/50 border-[var(--border-color)]/50 text-[var(--text-muted)]/60'
                            : 'bg-[var(--bg-body)] border border-[var(--border-color)] text-[var(--text-main)] hover:border-[var(--theme-primary)]/30'
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
                                ? 'bg-[var(--theme-primary)] text-black border border-[var(--theme-primary)]/50'
                                : 'border border-[var(--border-color)] text-transparent hover:border-[var(--theme-primary)]'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </button>

                          <span
                            className={`text-xs leading-relaxed select-none ${
                              item.completed ? 'line-through text-[var(--text-muted)]/60' : 'text-[var(--text-main)]'
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
                          className="p-1 text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
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
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
              <h3 className="font-serif font-bold text-[var(--text-main)] text-base">
                {editingList ? 'Editar lista' : 'Nova lista'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveList} className="space-y-5">
              {/* INPUT NOME DA LISTA */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-main)] block">Nome da lista</label>
                <input
                  type="text"
                  placeholder="Nome da lista"
                  value={listNameInput}
                  onChange={(e) => setListNameInput(e.target.value)}
                  autoFocus
                  required
                  className="w-full px-3.5 py-2.5 bg-[var(--bg-body)] border border-[var(--border-color)] rounded-xl text-xs text-[var(--text-main)] placeholder-[var(--text-muted)]/60 focus:outline-none focus:border-[var(--theme-primary)]"
                />
              </div>

              {/* ICON SELECTOR GRID */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--text-main)] block">Ícone</label>
                <div className="grid grid-cols-5 gap-2 max-h-[220px] overflow-y-auto pr-1 no-scrollbar p-1 bg-[var(--bg-body)] rounded-xl border border-[var(--border-color)]">
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
                            ? 'bg-[var(--theme-primary)]/10 border-[var(--theme-primary)] text-[var(--theme-primary)] shadow-md'
                            : 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-secondary)]'
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
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-[var(--border-color)] text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-secondary)] transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!listNameInput.trim()}
                  className="px-5 py-2.5 bg-[var(--theme-primary)] hover:brightness-110 disabled:opacity-40 text-black text-xs font-bold rounded-xl transition-all cursor-pointer border border-[var(--border-color)] shadow-md"
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
          <div className="bg-[var(--bg-card)] border border-rose-500/30 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-[var(--text-main)] text-base">Excluir lista</h3>
                <p className="text-xs text-rose-500 mt-0.5 font-medium">
                  Esta ação não pode ser desfeita
                </p>
              </div>
            </div>

            <p className="text-xs text-[var(--text-main)] leading-relaxed bg-[var(--bg-body)] p-3.5 rounded-xl border border-[var(--border-color)]">
              Tem certeza que deseja excluir permanentemente esta lista e todos os seus lembretes?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[var(--border-color)]">
              <button
                onClick={() => setDeletingListId(null)}
                className="px-4 py-2 rounded-xl border border-[var(--border-color)] text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-secondary)] transition-all cursor-pointer"
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
