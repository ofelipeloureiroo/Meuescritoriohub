import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from './AuthContext';
import {
  EMPTY_BANK_ACCOUNTS,
  EMPTY_HOUSE_MORTGAGE,
  INITIAL_ARCHITECT_PROFILE,
  INITIAL_ARCHITECTURE_PROJECTS,
  INITIAL_BANK_ACCOUNTS,
  INITIAL_CATEGORY_BUDGETS,
  INITIAL_CLIENTS,
  INITIAL_DEBTS,
  INITIAL_FREELANCE_PROJECTS,
  INITIAL_HOUSE_MORTGAGE,
  INITIAL_PROJECT_INSTALLMENTS,
  INITIAL_PROJECT_MILESTONES,
  INITIAL_SAVINGS_GOALS,
  INITIAL_TRANSACTIONS,
  INITIAL_WORK_CONTRACTS,
  CONNECTED_PORTAL_CLIENT,
  CONNECTED_PORTAL_PROJECT_1,
  CONNECTED_PORTAL_PROJECT_2,
  CONNECTED_PORTAL_CONTRACT_1,
  CONNECTED_PORTAL_INSTALLMENTS,
} from '../data/initialData';
import {
  ArchitectProfile,
  BgThemeId,
  ArchitectureProject,
  BankAccount,
  CategoryBudget,
  Client,
  ConstructionReport,
  ContractStatus,
  Debt,
  DigitalSignature,
  ExtraAmortization,
  FreelanceProject,
  HouseMortgage,
  NicheType,
  ProjectInstallment,
  ProjectMilestone,
  SavingsGoal,
  ThemeColorId,
  Transaction,
  WorkContract,
  OfficeSettings,
  BudgetLimits,
  AppAction,
  TeamMember,
} from '../types';
import { applyThemeToDocument, NICHES, THEMES } from '../utils/theme';
import { getNicheSampleProjects } from '../utils/nicheSampleData';

interface FinanceContextType {
  architectProfile: ArchitectProfile;
  updateArchitectProfile: (profile: Partial<ArchitectProfile>) => void;
  updateProfilePhoto: (photoUrl: string) => void;
  changeTheme: (theme: ThemeColorId) => void;
  changeBgTheme: (bgTheme: BgThemeId) => void;
  changeNiche: (niche: NicheType) => void;
  loadNicheSampleProjects: (niche?: NicheType) => void;
  transactions: Transaction[];
  bankAccounts: BankAccount[];
  houseMortgage: HouseMortgage;
  debts: Debt[];
  clients: Client[];
  freelanceProjects: FreelanceProject[];
  architectureProjects: ArchitectureProject[];
  projectInstallments: ProjectInstallment[];
  projectMilestones: ProjectMilestone[];
  workContracts: WorkContract[];
  savingsGoals: SavingsGoal[];
  categoryBudgets: CategoryBudget[];
  officeSettings: OfficeSettings;
  updateOfficeSettings: (settings: Partial<OfficeSettings>) => void;
  selectedMonth: string; // YYYY-MM
  setSelectedMonth: (month: string) => void;

  // Actions - Architecture Projects & Photos
  addArchitectureProject: (project: Omit<ArchitectureProject, 'id' | 'createdAt'>) => void;
  updateArchitectureProject: (id: string, project: Partial<ArchitectureProject>) => void;
  deleteArchitectureProject: (id: string) => void;
  addPhotoToProject: (projectId: string, photoUrl: string) => void;
  removePhotoFromProject: (projectId: string, photoIndex: number) => void;
  updateProjectStatus: (id: string, newStatus: ArchitectureProject['status']) => void;
  addConstructionReport: (projectId: string, report: Omit<ConstructionReport, 'id'>) => void;

  // Actions - Project Installments & Milestones (Prazos & Cobranças)
  addProjectInstallment: (installment: Omit<ProjectInstallment, 'id' | 'createdAt'>) => void;
  updateProjectInstallment: (id: string, installment: Partial<ProjectInstallment>) => void;
  deleteProjectInstallment: (id: string) => void;
  receiveInstallmentPayment: (installmentId: string, bankAccountId: string, paidDate?: string, amount?: number) => void;

  addProjectMilestone: (milestone: Omit<ProjectMilestone, 'id' | 'createdAt'>) => void;
  updateProjectMilestone: (id: string, milestone: Partial<ProjectMilestone>) => void;
  deleteProjectMilestone: (id: string) => void;
  toggleProjectMilestone: (id: string) => void;

  // Actions - Transactions
  addTransaction: (tx: Omit<Transaction, 'id'>) => void;
  updateTransaction: (id: string, tx: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;

  // Actions - Banks & Physical Cash
  addBankAccount: (account: Omit<BankAccount, 'id'>) => void;
  updateBankAccount: (id: string, account: Partial<BankAccount>) => void;
  deleteBankAccount: (id: string) => void;
  transferFunds: (fromId: string, toId: string, amount: number, description: string) => void;
  adjustPhysicalCash: (amount: number, type: 'deposit' | 'withdraw', note: string) => void;

  // Actions - Mortgage & Debts
  updateMortgage: (mortgage: Partial<HouseMortgage>) => void;
  applyMortgageAmortization: (
    amount: number,
    type: 'prazo' | 'prestacao',
    fromAccountId: string,
    notes?: string
  ) => void;
  payMortgageInstallment: (fromAccountId: string) => void;
  addDebt: (debt: Omit<Debt, 'id'>) => void;
  updateDebt: (id: string, debt: Partial<Debt>) => void;
  deleteDebt: (id: string) => void;
  payDebtInstallment: (debtId: string, fromAccountId: string) => void;

  // Actions - Freelancer & Clients & Contracts
  addClient: (client: Omit<Client, 'id' | 'createdAt' | 'totalBilled' | 'totalPaid' | 'pendingAmount' | 'projectsCount'>) => void;
  updateClient: (id: string, client: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  addFreelanceProject: (project: Omit<FreelanceProject, 'id' | 'createdAt'>) => void;
  updateFreelanceProject: (id: string, project: Partial<FreelanceProject>) => void;
  deleteFreelanceProject: (id: string) => void;
  receiveProjectPayment: (projectId: string, amount: number, bankAccountId: string) => void;

  // Actions - Work Contracts & Digital Signatures & Payments
  addWorkContract: (contract: Omit<WorkContract, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateWorkContract: (id: string, contract: Partial<WorkContract>) => void;
  deleteWorkContract: (id: string) => void;
  sendContractForSignature: (contractId: string) => void;
  signWorkContract: (contractId: string, signature: Omit<DigitalSignature, 'signedAt' | 'verificationCode'>) => void;
  markContractAwaitingPayment: (contractId: string) => void;
  confirmContractPayment: (contractId: string, bankAccountId?: string) => void;

  // Actions - Goals & Budgets
  addSavingsGoal: (goal: Omit<SavingsGoal, 'id'>) => void;
  updateSavingsGoal: (id: string, goal: Partial<SavingsGoal>) => void;
  deleteSavingsGoal: (id: string) => void;
  contributeToGoal: (goalId: string, amount: number, fromAccountId: string) => void;
  addCategoryBudget: (item: CategoryBudget) => void;
  deleteCategoryBudget: (category: string) => void;
  updateCategoryBudget: (category: string, monthlyBudget: number) => void;

  // Actions - App Actions & Tasks
  actions: AppAction[];
  addAppAction: (action: Omit<AppAction, 'id' | 'createdAt'>) => void;
  updateAppAction: (id: string, action: Partial<AppAction>) => void;
  deleteAppAction: (id: string) => void;

  // Computed Financial & Project Metrics
  totalNetWorth: number;
  totalBankBalance: number;
  totalPhysicalCash: number;
  currentMonthTransactions: Transaction[];
  monthlyIncomeCLT: number;
  monthlyIncomeFreelance: number;
  monthlyTotalIncome: number;
  monthlyTotalExpense: number;
  monthlyExpenseCasa: number;
  monthlyExpenseCarro: number;
  monthlyExpenseLazer: number;
  monthlyBalance: number;
  clientsByState: Record<string, { clientsCount: number; totalBilled: number; projectsCount: number; clients: Client[] }>;
  statesWithJobsCount: number;

  monthlyIncomeSummary: { clt: number; freelancer: number; other: number; total: number };
  monthlyExpenseSummary: { byCategory: Record<string, number>; total: number };
  budgetLimits: BudgetLimits;
  updateBudgetLimits: (newLimits: BudgetLimits) => void;

  // Deadlines & Installments Alerts
  ongoingArchitectureProjects: ArchitectureProject[];
  dueSoonInstallments: ProjectInstallment[];
  overdueInstallments: ProjectInstallment[];
  pendingInstallments: ProjectInstallment[];
  totalPendingInstallmentsAmount: number;
  totalPaidInstallmentsAmount: number;
  dueSoonMilestones: ProjectMilestone[];
  overdueMilestones: ProjectMilestone[];
  pendingMilestones: ProjectMilestone[];

  // Backup / Reset / Export / Demo
  exportDataJSON: () => void;
  exportTransactionsCSV: () => void;
  importDataJSON: (jsonString: string) => boolean;
  loadDemoData: () => void;
  resetAllData: () => void;
  resetToDemoData: () => void;
  resetFinancialData: () => void;
  resetProjectsData: () => void;
  resetTeamData: () => void;
  resetSuppliersData: () => void;
  resetRequestedModules: () => void;
}

const INITIAL_OFFICE_SETTINGS: OfficeSettings = {
  financialCategories: {
    receitas: [
      'Consultoria',
      'Honorários de Coordenação',
      'Honorários de Projeto',
      'Licenciamento',
      'Outros Honorários',
      'Revisão / Adendo'
    ],
    custosDiretos: [
      'Colaborador / Freelancer',
      'Despesa de Obra',
      'Impressão / Plotagem',
      'Salário / Pró-labore'
    ],
    despesasOperacionais: [
      'Aluguel / Coworking',
      'Marketing / Publicidade',
      'Material de Escritório',
      'Outros',
      'Software / Assinatura',
      'Viagem / Deslocamento'
    ]
  },
  actionMatrix: {
    comercial: { lead: true, cliente: true, projeto: false },
    operacao: { lead: false, cliente: true, projeto: true },
    financeiro: { lead: false, cliente: true, projeto: true }
  },
  actionTypes: [
    { id: 'act-1', name: 'Enviar mensagem', areas: ['Comercial'] },
    { id: 'act-2', name: 'Ligar', areas: ['Comercial'] },
    { id: 'act-3', name: 'Agendar reunião', areas: ['Comercial'] },
    { id: 'act-4', name: 'Realizar reunião', areas: ['Comercial'] },
    { id: 'act-5', name: 'Follow-up', areas: ['Comercial'] },
    { id: 'act-6', name: 'Enviar proposta', areas: ['Comercial'] },
    { id: 'act-7', name: 'Negociar', areas: ['Comercial'] },
    { id: 'act-8', name: 'Fechar negócio', areas: ['Comercial'] },
    { id: 'act-9', name: 'Acompanhar pendência', areas: ['Comercial', 'Operação', 'Financeiro'] },
    { id: 'act-10', name: 'Cobrar retorno', areas: ['Comercial', 'Operação', 'Financeiro'] },
    { id: 'act-11', name: 'Outro', areas: ['Comercial', 'Operação', 'Financeiro'] }
  ],
  leadStages: [
    { id: 'novo', name: 'Novo', status: 'Ativo', subsCount: 6, enabled: true },
    { id: 'diagnostico', name: 'Diagnóstico', status: 'Ativo', subsCount: 6, enabled: true },
    { id: 'proposta', name: 'Proposta', status: 'Ativo', subsCount: 8, enabled: true },
    { id: 'negociacao', name: 'Negociação', status: 'Ativo', subsCount: 6, enabled: true },
    { id: 'contratado', name: 'Contratado', status: 'Ganho', subsCount: 6, enabled: true },
    { id: 'perdido', name: 'Perdido', status: 'Perdido', subsCount: 6, enabled: true }
  ],
  lossReasons: [
    'Preço / orçamento acima do esperado',
    'Escolheu outro arquiteto/escritório',
    'Não respondeu / sumiu',
    'Projeto adiado',
    'Cliente sem prioridade no momento',
    'Escopo não compatível',
    'Prazo incompatível',
    'Localização fora da área de atendimento',
    'Perfil desalinhado',
    'Fechou com fornecedor/construtora',
    'Lead sem qualificação',
    'Outro'
  ],
  acquisitionChannels: ['Indicação', 'Instagram', 'WhatsApp', 'Evento/Feira', 'Google'],
  tags: []
};

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const isCloudLoadedRef = useRef(false);
  const isSyncingFromCloudRef = useRef(false);
  const lastLocalMutationRef = useRef<number>(0);

  const recordLocalMutation = () => {
    lastLocalMutationRef.current = Date.now();
  };

  const targetUid = profile?.joinedOwnerUid || user?.uid;

  // Prefix storage keys per user UID for full data isolation
  const getStorageKey = (key: string) => {
    return targetUid ? `office_v2_${targetUid}_${key}` : `office_v2_guest_${key}`;
  };

  const isOwner = user?.email === 'lfquadrosdecorativos@gmail.com';

  const getCleanProfile = (): ArchitectProfile => {
    const rawName = user?.displayName || user?.email?.split('@')[0] || 'Meu Negócio';
    const formattedName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
    return {
      name: formattedName,
      title: '',
      photoUrl: user?.photoURL || '',
      location: '',
      specialty: '',
      tagline: '',
      description: '', // Bio description starts completely empty
      instagramHandle: '',
      instagramUrl: '',
      followersCount: '', // Followers count starts completely empty
      rating: 5.0,
      niche: 'arquitetura',
      themeColor: 'amber',
      showPortfolio: true,
    };
  };

  const [architectProfile, setArchitectProfile] = useState<ArchitectProfile>(() => {
    const saved = localStorage.getItem(getStorageKey('profile'));
    if (saved) {
      try {
        const parsed: ArchitectProfile = JSON.parse(saved);
        // Clean migration: if profile still has legacy hardcoded "Laíne Paula" or "Arquitetura e Interiores"
        if (parsed.name === 'Laíne Paula' && isOwner) {
          parsed.name = 'LF Quadros & Decoração';
          parsed.title = 'Arte, Decoração & Vendas';
          parsed.specialty = 'Quadros decorativos, telas canvas e mostruário';
          parsed.niche = 'arte_decoracao';
          parsed.showPortfolio = true;
        } else if (parsed.name === 'Laíne Paula') {
          parsed.name = user?.displayName || 'Meu Escritório';
          parsed.title = 'Gestão Comercial & Serviços';
        }
        if (parsed.niche && parsed.niche !== 'arquitetura') {
          const n = NICHES[parsed.niche];
          if (n) {
            if (
              !parsed.title ||
              parsed.title === 'Arquitetura e Interiores' ||
              parsed.title === 'Arquitetura & Interiores' ||
              parsed.title === 'Arquiteta & Urbanista' ||
              parsed.title.toLowerCase().includes('arquitetura')
            ) {
              parsed.title = n.defaultTitle;
            }
            if (
              !parsed.specialty ||
              parsed.specialty.toLowerCase().includes('interiores residenciais') ||
              parsed.specialty.toLowerCase().includes('arquitetura')
            ) {
              parsed.specialty = n.defaultSpecialty;
            }
            if (parsed.showPortfolio === undefined) {
              parsed.showPortfolio = n.hasPortfolio;
            }
          }
        } else if (parsed.title === 'Arquitetura e Interiores' || parsed.title === 'Arquitetura & Interiores') {
          parsed.title = 'Gestão, Projetos & Vendas';
        }
        if (parsed.showPortfolio === undefined) {
          const n = NICHES[parsed.niche || 'vendas'];
          parsed.showPortfolio = n?.hasPortfolio ?? true;
        }
        return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    // If owner without saved profile, start with personalized multi-segment profile
    if (isOwner) {
      return {
        name: 'LF Quadros & Decoração',
        title: 'Arte, Decoração & Vendas',
        photoUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=400&q=80',
        location: 'Brasil • Atendimento Nacional',
        specialty: 'Quadros sob medida, telas canvas e composições de parede',
        tagline: 'Arte que transforma ambientes com estilo e sofisticação.',
        description: 'Vendas de quadros sob medida, impressões fine art, telas canvas e soluções decorativas.',
        instagramHandle: '@lfquadrosdecorativos',
        instagramUrl: 'https://instagram.com/lfquadrosdecorativos',
        followersCount: '15 mil seguidores',
        rating: 5.0,
        pixKey: 'lfquadrosdecorativos@gmail.com',
        pixKeyType: 'email',
        niche: 'arte_decoracao',
        themeColor: 'amber',
        showPortfolio: true,
      };
    }
    return getCleanProfile();
  });

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const defaultDemoTransactions: Transaction[] = [
      {
        id: 'tx-rec-jjc',
        description: 'Projeto JJC',
        amount: 2012,
        type: 'income',
        structure: 'recorrente',
        status: 'completed',
        category: 'Honorários de Projeto',
        bankAccountId: 'bank-principal',
        date: '2026-09-01',
        dueDate: '2026-10-01',
        isRecurring: true,
        recurrenceFrequency: 'mensal',
        recurrenceStartDate: '2026-09-01',
        clientName: 'JJC',
        projectName: 'Projeto JJC',
        notes: 'Recorrência mensal de honorários',
      },
      {
        id: 'tx-rec-bfe',
        description: 'Projeto BFE',
        amount: 14000,
        type: 'income',
        structure: 'recorrente',
        status: 'cancelled',
        category: 'Honorários de Projeto',
        bankAccountId: 'bank-principal',
        date: '2026-09-15',
        dueDate: '2026-09-15',
        isRecurring: true,
        recurrenceFrequency: 'mensal',
        recurrenceStartDate: '2026-08-01',
        clientName: 'BFE',
        projectName: 'Projeto BFE',
        notes: 'Contrato cancelado pelo cliente',
      },
    ];

    const saved = localStorage.getItem(getStorageKey('transactions'));
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.some((t: any) => t.id === 'tx-1' || t.id === 'tx-freela-1')) {
          return defaultDemoTransactions;
        }
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch {}
    }
    return defaultDemoTransactions;
  });

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(() => {
    const saved = localStorage.getItem(getStorageKey('accounts'));
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.some((a: any) => a.id === 'bank-nubank' || a.balance > 1000)) {
          return EMPTY_BANK_ACCOUNTS;
        }
        return parsed;
      } catch {}
    }
    return EMPTY_BANK_ACCOUNTS;
  });

  const [houseMortgage, setHouseMortgage] = useState<HouseMortgage>(() => {
    const saved = localStorage.getItem(getStorageKey('mortgage'));
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.currentDebt === 218400) {
          return EMPTY_HOUSE_MORTGAGE;
        }
        return parsed;
      } catch {}
    }
    return EMPTY_HOUSE_MORTGAGE;
  });

  const [debts, setDebts] = useState<Debt[]>(() => {
    const saved = localStorage.getItem(getStorageKey('debts'));
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.some((d: any) => d.id === 'debt-1' || d.id === 'debt-2')) {
          return [];
        }
        return parsed;
      } catch {}
    }
    return [];
  });

  const [clients, setClients] = useState<Client[]>(() => {
    const saved = localStorage.getItem(getStorageKey('clients'));
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (!parsed.some((c: any) => c.id === CONNECTED_PORTAL_CLIENT.id || c.name?.toLowerCase().includes('roberto & camila'))) {
            return [CONNECTED_PORTAL_CLIENT, ...parsed];
          }
          return parsed;
        }
      } catch {}
    }
    return [CONNECTED_PORTAL_CLIENT];
  });

  const [freelanceProjects, setFreelanceProjects] = useState<FreelanceProject[]>(() => {
    const saved = localStorage.getItem(getStorageKey('projects'));
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.some((p: any) => p.id === 'fp-1' || p.id === 'fp-2')) {
          return [];
        }
        return parsed;
      } catch {}
    }
    return [];
  });

  const [architectureProjects, setArchitectureProjects] = useState<ArchitectureProject[]>(() => {
    const saved = localStorage.getItem(getStorageKey('architecture_projects'));
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((p: any) => p.id !== 'proj-bfe' && p.id !== 'proj-1');
          if (filtered.length > 0) {
            if (!filtered.some((p: any) => p.id === CONNECTED_PORTAL_PROJECT_1.id || p.id === 'proj-alphaville-01')) {
              return [CONNECTED_PORTAL_PROJECT_1, CONNECTED_PORTAL_PROJECT_2, ...filtered];
            }
            return filtered;
          }
        }
      } catch {}
    }
    return [CONNECTED_PORTAL_PROJECT_1, CONNECTED_PORTAL_PROJECT_2];
  });

  const [projectInstallments, setProjectInstallments] = useState<ProjectInstallment[]>(() => {
    const saved = localStorage.getItem(getStorageKey('installments'));
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (!parsed.some((i: any) => i.projectId === 'proj-alphaville-01')) {
            return [...CONNECTED_PORTAL_INSTALLMENTS, ...parsed];
          }
          return parsed;
        }
      } catch {}
    }
    return CONNECTED_PORTAL_INSTALLMENTS;
  });

  const [projectMilestones, setProjectMilestones] = useState<ProjectMilestone[]>(() => {
    const saved = localStorage.getItem(getStorageKey('milestones'));
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed;
      } catch {}
    }
    return [];
  });

  const [workContracts, setWorkContracts] = useState<WorkContract[]>(() => {
    const saved = localStorage.getItem(getStorageKey('work_contracts'));
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (!parsed.some((c: any) => c.id === CONNECTED_PORTAL_CONTRACT_1.id || c.projectId === 'proj-alphaville-01')) {
            return [CONNECTED_PORTAL_CONTRACT_1, ...parsed];
          }
          return parsed;
        }
      } catch {}
    }
    return [CONNECTED_PORTAL_CONTRACT_1];
  });

  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>(() => {
    const saved = localStorage.getItem(getStorageKey('goals'));
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.some((g: any) => g.id?.startsWith('goal-'))) {
          return [];
        }
        return parsed;
      } catch {}
    }
    return [];
  });

  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudget[]>(() => {
    const saved = localStorage.getItem(getStorageKey('budgets'));
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return INITIAL_CATEGORY_BUDGETS;
  });

  const [officeSettings, setOfficeSettings] = useState<OfficeSettings>(() => {
    const saved = localStorage.getItem(getStorageKey('office_settings'));
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return INITIAL_OFFICE_SETTINGS;
  });

  const [actions, setActions] = useState<AppAction[]>(() => {
    const saved = localStorage.getItem(getStorageKey('actions'));
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.some((a: any) => a.id?.startsWith('act-demo-'))) {
          return [];
        }
        return parsed;
      } catch {}
    }
    return [];
  });

  const updateOfficeSettings = (updated: Partial<OfficeSettings>) => {
    setOfficeSettings((prev) => ({
      ...prev,
      ...updated,
    }));
  };

  // Apply CSS color theme whenever themeColor or bgTheme changes
  useEffect(() => {
    applyThemeToDocument(
      architectProfile.themeColor || 'gold',
      architectProfile.bgTheme || 'dark_warm'
    );
  }, [architectProfile.themeColor, architectProfile.bgTheme]);

  // Sync to user-scoped localStorage
  useEffect(() => {
    localStorage.setItem(getStorageKey('office_settings'), JSON.stringify(officeSettings));
  }, [officeSettings, targetUid]);

  // Sync to user-scoped localStorage
  useEffect(() => {
    localStorage.setItem(getStorageKey('transactions'), JSON.stringify(transactions));
  }, [transactions, targetUid]);

  useEffect(() => {
    localStorage.setItem(getStorageKey('accounts'), JSON.stringify(bankAccounts));
  }, [bankAccounts, targetUid]);

  useEffect(() => {
    localStorage.setItem(getStorageKey('mortgage'), JSON.stringify(houseMortgage));
  }, [houseMortgage, targetUid]);

  useEffect(() => {
    localStorage.setItem(getStorageKey('debts'), JSON.stringify(debts));
  }, [debts, targetUid]);

  const safeSetItem = (key: string, data: any) => {
    try {
      localStorage.setItem(getStorageKey(key), JSON.stringify(data));
    } catch (err) {
      console.warn(`localStorage setItem failed for key ${key}:`, err);
    }
  };

  useEffect(() => {
    safeSetItem('clients', clients);
  }, [clients, targetUid]);

  useEffect(() => {
    safeSetItem('projects', freelanceProjects);
  }, [freelanceProjects, targetUid]);

  useEffect(() => {
    safeSetItem('architecture_projects', architectureProjects);
  }, [architectureProjects, targetUid]);

  useEffect(() => {
    safeSetItem('installments', projectInstallments);
  }, [projectInstallments, targetUid]);

  useEffect(() => {
    safeSetItem('milestones', projectMilestones);
  }, [projectMilestones, targetUid]);

  useEffect(() => {
    safeSetItem('work_contracts', workContracts);
  }, [workContracts, targetUid]);

  useEffect(() => {
    safeSetItem('goals', savingsGoals);
  }, [savingsGoals, targetUid]);

  useEffect(() => {
    safeSetItem('budgets', categoryBudgets);
  }, [categoryBudgets, targetUid]);

  useEffect(() => {
    safeSetItem('profile', architectProfile);
  }, [architectProfile, targetUid]);

  useEffect(() => {
    safeSetItem('actions', actions);
  }, [actions, targetUid]);

  // Real-time Cloud Sync from Firestore
  useEffect(() => {
    if (!targetUid) {
      isCloudLoadedRef.current = false;
      return;
    }

    isCloudLoadedRef.current = false;
    const workspaceDocRef = doc(db, 'users', targetUid, 'data', 'workspace');

    const unsubscribe = onSnapshot(
      workspaceDocRef,
      async (snapshot) => {
        if (snapshot.exists()) {
          // If Firestore is notifying us of local pending writes or a recent local edit, do not clobber React state
          if (snapshot.metadata.hasPendingWrites) {
            return;
          }
          if (Date.now() - lastLocalMutationRef.current < 5000) {
            return;
          }

          const data = snapshot.data();
          isSyncingFromCloudRef.current = true;

          // Detect if Firestore contains old demo projects or demo transactions
          const hasLegacyDemo =
            (data.architectureProjects && data.architectureProjects.some((p: any) => p.id === 'proj-bfe' || p.id === 'proj-1')) ||
            (data.transactions && data.transactions.some((t: any) => t.id === 'tx-1' || t.id === 'tx-freela-1')) ||
            (data.bankAccounts && data.bankAccounts.some((a: any) => a.id === 'bank-nubank' && a.balance > 1000));

          if (hasLegacyDemo) {
            const cleanedPayload = {
              transactions: [],
              bankAccounts: EMPTY_BANK_ACCOUNTS,
              houseMortgage: EMPTY_HOUSE_MORTGAGE,
              debts: [],
              architectureProjects: [CONNECTED_PORTAL_PROJECT_1, CONNECTED_PORTAL_PROJECT_2],
              freelanceProjects: [],
              projectInstallments: CONNECTED_PORTAL_INSTALLMENTS,
              projectMilestones: [],
              workContracts: [CONNECTED_PORTAL_CONTRACT_1],
              clients: [CONNECTED_PORTAL_CLIENT],
              savingsGoals: [],
              actions: [],
              updatedAt: new Date().toISOString(),
            };
            setDoc(workspaceDocRef, cleanedPayload, { merge: true }).catch(console.error);
            setTransactions([]);
            setBankAccounts(EMPTY_BANK_ACCOUNTS);
            setHouseMortgage(EMPTY_HOUSE_MORTGAGE);
            setDebts([]);
            setArchitectureProjects([CONNECTED_PORTAL_PROJECT_1, CONNECTED_PORTAL_PROJECT_2]);
            setFreelanceProjects([]);
            setProjectInstallments(CONNECTED_PORTAL_INSTALLMENTS);
            setProjectMilestones([]);
            setWorkContracts([CONNECTED_PORTAL_CONTRACT_1]);
            setClients([CONNECTED_PORTAL_CLIENT]);
            setSavingsGoals([]);
            setActions([]);
            isCloudLoadedRef.current = true;
            setTimeout(() => {
              isSyncingFromCloudRef.current = false;
            }, 150);
            return;
          }

          if (data.profile) setArchitectProfile(data.profile);
          if (data.transactions) setTransactions(data.transactions);
          if (data.bankAccounts) setBankAccounts(data.bankAccounts);
          if (data.houseMortgage) setHouseMortgage(data.houseMortgage);
          if (data.debts) setDebts(data.debts);
          if (data.clients) {
            const cloudClients = Array.isArray(data.clients) ? data.clients : [];
            if (cloudClients.length > 0 && !cloudClients.some((c: any) => c.id === CONNECTED_PORTAL_CLIENT.id || c.name?.toLowerCase().includes('roberto & camila'))) {
              setClients([CONNECTED_PORTAL_CLIENT, ...cloudClients]);
            } else if (cloudClients.length === 0) {
              setClients([CONNECTED_PORTAL_CLIENT]);
            } else {
              setClients(cloudClients);
            }
          }
          if (data.freelanceProjects) setFreelanceProjects(data.freelanceProjects);
          if (data.architectureProjects) {
            const cloudProjects = Array.isArray(data.architectureProjects) ? data.architectureProjects : [];
            const filteredProjects = cloudProjects.filter((p: any) => p.id !== 'proj-bfe' && p.id !== 'proj-1');
            if (filteredProjects.length > 0 && !filteredProjects.some((p: any) => p.id === CONNECTED_PORTAL_PROJECT_1.id || p.id === 'proj-alphaville-01')) {
              setArchitectureProjects([CONNECTED_PORTAL_PROJECT_1, CONNECTED_PORTAL_PROJECT_2, ...filteredProjects]);
            } else if (filteredProjects.length === 0) {
              setArchitectureProjects([CONNECTED_PORTAL_PROJECT_1, CONNECTED_PORTAL_PROJECT_2]);
            } else {
              setArchitectureProjects(filteredProjects);
            }
          }
          if (data.projectInstallments) {
            const cloudInst = Array.isArray(data.projectInstallments) ? data.projectInstallments : [];
            if (cloudInst.length > 0 && !cloudInst.some((i: any) => i.projectId === 'proj-alphaville-01')) {
              setProjectInstallments([...CONNECTED_PORTAL_INSTALLMENTS, ...cloudInst]);
            } else if (cloudInst.length === 0) {
              setProjectInstallments(CONNECTED_PORTAL_INSTALLMENTS);
            } else {
              setProjectInstallments(cloudInst);
            }
          }
          if (data.projectMilestones) setProjectMilestones(data.projectMilestones);
          if (data.workContracts) {
            const cloudContracts = Array.isArray(data.workContracts) ? data.workContracts : [];
            if (cloudContracts.length > 0 && !cloudContracts.some((c: any) => c.id === CONNECTED_PORTAL_CONTRACT_1.id || c.projectId === 'proj-alphaville-01')) {
              setWorkContracts([CONNECTED_PORTAL_CONTRACT_1, ...cloudContracts]);
            } else if (cloudContracts.length === 0) {
              setWorkContracts([CONNECTED_PORTAL_CONTRACT_1]);
            } else {
              setWorkContracts(cloudContracts);
            }
          }
          if (data.savingsGoals) setSavingsGoals(data.savingsGoals);
          if (data.categoryBudgets) setCategoryBudgets(data.categoryBudgets);
          if (data.officeSettings) setOfficeSettings(data.officeSettings);
          if (data.actions) setActions(data.actions);

          isCloudLoadedRef.current = true;
          setTimeout(() => {
            isSyncingFromCloudRef.current = false;
          }, 150);
        } else {
          // Document does not exist in Firestore for this user yet. Initialize it!
          try {
            isSyncingFromCloudRef.current = true;
            const payload = {
              profile: architectProfile,
              transactions,
              bankAccounts,
              houseMortgage,
              debts,
              clients,
              freelanceProjects,
              architectureProjects,
              projectInstallments,
              projectMilestones,
              workContracts,
              savingsGoals,
              categoryBudgets,
              officeSettings: INITIAL_OFFICE_SETTINGS,
              actions,
              updatedAt: new Date().toISOString(),
            };
            await setDoc(workspaceDocRef, JSON.parse(JSON.stringify(payload)), { merge: true });
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, `users/${targetUid}/data/workspace`);
          } finally {
            isCloudLoadedRef.current = true;
            setTimeout(() => {
              isSyncingFromCloudRef.current = false;
            }, 150);
          }
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${targetUid}/data/workspace`);
        isCloudLoadedRef.current = true;
      }
    );

    return () => unsubscribe();
  }, [targetUid]);

  // Auto-save local changes to Firestore (debounced 500ms)
  useEffect(() => {
    if (!targetUid || !isCloudLoadedRef.current || isSyncingFromCloudRef.current) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const workspaceDocRef = doc(db, 'users', targetUid, 'data', 'workspace');
        const payload = {
          profile: architectProfile,
          transactions,
          bankAccounts,
          houseMortgage,
          debts,
          clients,
          freelanceProjects,
          architectureProjects,
          projectInstallments,
          projectMilestones,
          workContracts,
          savingsGoals,
          categoryBudgets,
          officeSettings,
          actions,
          updatedAt: new Date().toISOString(),
        };
        await setDoc(workspaceDocRef, JSON.parse(JSON.stringify(payload)), { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${targetUid}/data/workspace`);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [
    targetUid,
    architectProfile,
    transactions,
    bankAccounts,
    houseMortgage,
    debts,
    clients,
    freelanceProjects,
    architectureProjects,
    projectInstallments,
    projectMilestones,
    workContracts,
    savingsGoals,
    categoryBudgets,
    officeSettings,
    actions,
  ]);

  // One-time automatic reset for requested modules: Financeiro, Projetos, Equipe, Fornecedores
  useEffect(() => {
    const migrationKey = getStorageKey('reset_requested_modules_v3');
    const migrated = localStorage.getItem(migrationKey);
    if (!migrated) {
      recordLocalMutation();
      // Zero out Finance
      setTransactions([]);
      setBankAccounts(EMPTY_BANK_ACCOUNTS);
      setHouseMortgage(EMPTY_HOUSE_MORTGAGE);
      setDebts([]);
      setProjectInstallments([]);
      setWorkContracts([]);
      setSavingsGoals([]);
      setActions([]);

      // Zero out Projects
      setArchitectureProjects([]);
      setFreelanceProjects([]);
      setProjectMilestones([]);

      // Zero out Suppliers in localStorage
      try {
        localStorage.setItem('meu_escritorio_fornecedores_v1', JSON.stringify([]));
        window.dispatchEvent(new CustomEvent('suppliers_updated'));
      } catch {}

      // Reset Team to only the current owner in localStorage
      try {
        const ownerAdminMember: TeamMember = {
          id: 'member_owner',
          name: architectProfile.name || user?.displayName || 'LF Quadros & Decoração',
          email: user?.email || 'lfquadrosdecorativos@gmail.com',
          role: 'admin',
          roleTitle: 'Administrador / Gestor',
          initials: 'LF',
          color: '#b8a38b',
          isCurrentUser: true,
          status: 'active',
          accessibleModulesCount: 9,
          permissions: {
            projects: true,
            actions: true,
            clients: true,
            suppliers: true,
            finance: true,
            deadlines: true,
            goals: true,
            budget: true,
            team: true,
          },
          joinedAt: new Date().toISOString().split('T')[0],
        };
        localStorage.setItem('meu_escritorio_equipe_v1', JSON.stringify([ownerAdminMember]));
        window.dispatchEvent(new CustomEvent('team_updated'));
      } catch {}

      // Save empty modules to user-scoped localStorage
      safeSetItem('transactions', []);
      safeSetItem('accounts', EMPTY_BANK_ACCOUNTS);
      safeSetItem('mortgage', EMPTY_HOUSE_MORTGAGE);
      safeSetItem('debts', []);
      safeSetItem('installments', []);
      safeSetItem('work_contracts', []);
      safeSetItem('goals', []);
      safeSetItem('actions', []);
      safeSetItem('architecture_projects', []);
      safeSetItem('projects', []);
      safeSetItem('milestones', []);

      localStorage.setItem(migrationKey, 'true');

      // Also persist clean state to Firestore
      if (targetUid) {
        const workspaceDocRef = doc(db, 'users', targetUid, 'data', 'workspace');
        setDoc(
          workspaceDocRef,
          {
            transactions: [],
            bankAccounts: EMPTY_BANK_ACCOUNTS,
            houseMortgage: EMPTY_HOUSE_MORTGAGE,
            debts: [],
            projectInstallments: [],
            workContracts: [],
            savingsGoals: [],
            actions: [],
            architectureProjects: [],
            freelanceProjects: [],
            projectMilestones: [],
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        ).catch(console.error);
      }
    }
  }, [targetUid]);

  // Actions - Profile & Customization
  const updateArchitectProfile = (updatedFields: Partial<ArchitectProfile>) => {
    recordLocalMutation();
    setArchitectProfile((prev) => ({
      ...prev,
      ...updatedFields,
    }));
  };

  const updateProfilePhoto = (photoUrl: string) => {
    recordLocalMutation();
    setArchitectProfile((prev) => ({
      ...prev,
      photoUrl,
    }));
  };

  const changeTheme = (theme: ThemeColorId) => {
    recordLocalMutation();
    applyThemeToDocument(theme, architectProfile.bgTheme || 'dark_warm');
    setArchitectProfile((prev) => ({
      ...prev,
      themeColor: theme,
    }));
  };

  const changeBgTheme = (bgTheme: BgThemeId) => {
    recordLocalMutation();
    applyThemeToDocument(architectProfile.themeColor || 'gold', bgTheme);
    setArchitectProfile((prev) => ({
      ...prev,
      bgTheme,
    }));
  };

  const changeNiche = (niche: NicheType) => {
    if (niche === architectProfile.niche) return;
    recordLocalMutation();
    const nicheConf = NICHES[niche];
    if (!nicheConf) return;
    setArchitectProfile((prev) => ({
      ...prev,
      niche,
      showPortfolio: nicheConf.hasPortfolio,
      title: nicheConf.defaultTitle,
      specialty: nicheConf.defaultSpecialty,
      tagline: nicheConf.description,
      description: `Atendimento profissional especializado em ${nicheConf.label.toLowerCase()}. Soluções personalizadas, foco em qualidade e excelência para cada cliente.`,
    }));

    // If projects are still the initial sample architecture projects, switch them automatically to the new niche's sample projects!
    // If the user deleted all projects (prev.length === 0), respect the deletion and do NOT reload samples!
    setArchitectureProjects((prev) => {
      if (prev.length === 0) return prev;
      const isInitialSamples =
        prev.every((p) => p.id.startsWith('proj-arch-') || p.id.startsWith('sample-'));
      if (isInitialSamples) {
        return getNicheSampleProjects(niche);
      }
      return prev;
    });
  };

  const loadNicheSampleProjects = (targetNiche?: NicheType) => {
    const n = targetNiche || architectProfile.niche || 'outro';
    const samples = getNicheSampleProjects(n);
    setArchitectureProjects(samples);
  };

  // Actions
  const addTransaction = (txData: Omit<Transaction, 'id'>) => {
    recordLocalMutation();
    const newTx: Transaction = {
      ...txData,
      id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };

    setTransactions((prev) => [newTx, ...prev]);

    // Update account balance if completed
    if (newTx.status === 'completed') {
      if (newTx.type === 'income') {
        setBankAccounts((prev) =>
          prev.map((acc) =>
            acc.id === newTx.bankAccountId ? { ...acc, balance: acc.balance + newTx.amount } : acc
          )
        );
      } else if (newTx.type === 'expense') {
        setBankAccounts((prev) =>
          prev.map((acc) =>
            acc.id === newTx.bankAccountId ? { ...acc, balance: acc.balance - newTx.amount } : acc
          )
        );
      }
    }
  };

  const updateTransaction = (id: string, updatedFields: Partial<Transaction>) => {
    recordLocalMutation();
    setTransactions((prev) =>
      prev.map((tx) => {
        if (tx.id === id) {
          const updated = { ...tx, ...updatedFields };
          // Handle transition to completed
          if (tx.status !== 'completed' && updated.status === 'completed') {
            if (updated.type === 'income') {
              setBankAccounts((bPrev) =>
                bPrev.map((acc) =>
                  acc.id === updated.bankAccountId ? { ...acc, balance: acc.balance + updated.amount } : acc
                )
              );
            } else if (updated.type === 'expense') {
              setBankAccounts((bPrev) =>
                bPrev.map((acc) =>
                  acc.id === updated.bankAccountId ? { ...acc, balance: acc.balance - updated.amount } : acc
                )
              );
            }
          }
          // Handle transition from completed to non-completed
          if (tx.status === 'completed' && updated.status !== 'completed') {
            if (tx.type === 'income') {
              setBankAccounts((bPrev) =>
                bPrev.map((acc) =>
                  acc.id === tx.bankAccountId ? { ...acc, balance: acc.balance - tx.amount } : acc
                )
              );
            } else if (tx.type === 'expense') {
              setBankAccounts((bPrev) =>
                bPrev.map((acc) =>
                  acc.id === tx.bankAccountId ? { ...acc, balance: acc.balance + tx.amount } : acc
                )
              );
            }
          }
          return updated;
        }
        return tx;
      })
    );
  };

  const deleteTransaction = (id: string) => {
    recordLocalMutation();
    const tx = transactions.find((t) => t.id === id);
    if (tx && tx.status === 'completed') {
      // Revert balance change
      if (tx.type === 'income') {
        setBankAccounts((prev) =>
          prev.map((acc) =>
            acc.id === tx.bankAccountId ? { ...acc, balance: acc.balance - tx.amount } : acc
          )
        );
      } else if (tx.type === 'expense') {
        setBankAccounts((prev) =>
          prev.map((acc) =>
            acc.id === tx.bankAccountId ? { ...acc, balance: acc.balance + tx.amount } : acc
          )
        );
      }
    }
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const addBankAccount = (accountData: Omit<BankAccount, 'id'>) => {
    recordLocalMutation();
    const newAcc: BankAccount = {
      ...accountData,
      id: `bank-${Date.now()}`,
    };
    setBankAccounts((prev) => [...prev, newAcc]);
  };

  const updateBankAccount = (id: string, updatedFields: Partial<BankAccount>) => {
    recordLocalMutation();
    setBankAccounts((prev) =>
      prev.map((acc) => (acc.id === id ? { ...acc, ...updatedFields } : acc))
    );
  };

  const deleteBankAccount = (id: string) => {
    recordLocalMutation();
    setBankAccounts((prev) => prev.filter((acc) => acc.id !== id));
  };

  const transferFunds = (
    fromId: string,
    toId: string,
    amount: number,
    description: string
  ) => {
    if (amount <= 0 || fromId === toId) return;

    const fromAcc = bankAccounts.find((a) => a.id === fromId);
    const toAcc = bankAccounts.find((a) => a.id === toId);

    if (!fromAcc || !toAcc) return;

    setBankAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id === fromId) return { ...acc, balance: acc.balance - amount };
        if (acc.id === toId) return { ...acc, balance: acc.balance + amount };
        return acc;
      })
    );

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];

    const transferTx: Transaction = {
      id: `tx-tf-${Date.now()}`,
      description: description || `Transferência de ${fromAcc.name} para ${toAcc.name}`,
      amount,
      type: 'transfer',
      bankAccountId: fromId,
      toBankAccountId: toId,
      date: dateStr,
      status: 'completed',
      notes: `Transferência interna entre contas.`,
    };

    setTransactions((prev) => [transferTx, ...prev]);
  };

  const adjustPhysicalCash = (amount: number, type: 'deposit' | 'withdraw', note: string) => {
    const cashAcc = bankAccounts.find((a) => a.type === 'physical_cash') || bankAccounts.find((a) => a.id === 'cash-wallet');
    if (!cashAcc) return;

    const now = new Date().toISOString().split('T')[0];

    if (type === 'deposit') {
      setBankAccounts((prev) =>
        prev.map((acc) => (acc.id === cashAcc.id ? { ...acc, balance: acc.balance + amount } : acc))
      );
      addTransaction({
        description: `Entrada Dinheiro Físico / Cofre: ${note || 'Depósito em espécie'}`,
        amount,
        type: 'income',
        incomeSource: 'cash_entry',
        bankAccountId: cashAcc.id,
        date: now,
        status: 'completed',
        paymentMethod: 'dinheiro_vivo',
        notes: note,
      });
    } else {
      setBankAccounts((prev) =>
        prev.map((acc) => (acc.id === cashAcc.id ? { ...acc, balance: Math.max(0, acc.balance - amount) } : acc))
      );
      addTransaction({
        description: `Saída Dinheiro Físico: ${note || 'Gasto em espécie'}`,
        amount,
        type: 'expense',
        category: 'outros',
        bankAccountId: cashAcc.id,
        date: now,
        status: 'completed',
        paymentMethod: 'dinheiro_vivo',
        notes: note,
      });
    }
  };

  const updateMortgage = (updated: Partial<HouseMortgage>) => {
    setHouseMortgage((prev) => ({ ...prev, ...updated }));
  };

  const applyMortgageAmortization = (
    amount: number,
    type: 'prazo' | 'prestacao',
    fromAccountId: string,
    notes?: string
  ) => {
    if (amount <= 0) return;

    const remainingInstallments = Math.max(1, houseMortgage.totalInstallments - houseMortgage.paidInstallments);
    const monthlyAmortization = houseMortgage.currentDebt / remainingInstallments;
    const monthsReduced = type === 'prazo' ? Math.min(remainingInstallments - 1, Math.max(1, Math.floor(amount / (monthlyAmortization || 1)))) : 0;
    const monthlyRate = Math.pow(1 + houseMortgage.annualInterestRate / 100, 1 / 12) - 1;
    const interestSaved = Math.round(amount * monthlyRate * (remainingInstallments / 2));

    const extra: ExtraAmortization = {
      id: `amort-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      amount,
      type,
      monthsReduced,
      interestSaved,
      notes: notes || `Amortização extraordinária por ${type === 'prazo' ? 'redução de prazo' : 'redução da prestação'}`,
    };

    // Deduct from account
    setBankAccounts((prev) =>
      prev.map((acc) => (acc.id === fromAccountId ? { ...acc, balance: acc.balance - amount } : acc))
    );

    // Update mortgage debt
    setHouseMortgage((prev) => {
      const newDebt = Math.max(0, prev.currentDebt - amount);
      const newTotalInstallments = type === 'prazo' ? Math.max(prev.paidInstallments + 1, prev.totalInstallments - monthsReduced) : prev.totalInstallments;
      const newRemaining = Math.max(1, newTotalInstallments - prev.paidInstallments);
      const newInstallmentValue = (newDebt / newRemaining) + (newDebt * monthlyRate);

      return {
        ...prev,
        currentDebt: newDebt,
        totalInstallments: newTotalInstallments,
        currentInstallmentValue: type === 'prestacao' ? newInstallmentValue : prev.currentInstallmentValue,
        extraAmortizations: [extra, ...prev.extraAmortizations],
      };
    });

    // Record transaction
    addTransaction({
      description: `Amortização Extraordinária Financiamento Casa (${type === 'prazo' ? 'Redução de Prazo' : 'Redução de Parcela'})`,
      amount,
      type: 'expense',
      category: 'financiamento',
      bankAccountId: fromAccountId,
      date: new Date().toISOString().split('T')[0],
      status: 'completed',
      paymentMethod: 'pix',
      notes: `Abatimento de ${monthsReduced > 0 ? `${monthsReduced} meses` : 'parcela'}. Economia de juros estimada: ~R$ ${interestSaved.toLocaleString('pt-BR')}`,
    });
  };

  const payMortgageInstallment = (fromAccountId: string) => {
    const installmentValue = houseMortgage.currentInstallmentValue;
    
    // Deduct from account
    setBankAccounts((prev) =>
      prev.map((acc) => (acc.id === fromAccountId ? { ...acc, balance: acc.balance - installmentValue } : acc))
    );

    // Update mortgage
    setHouseMortgage((prev) => {
      const remainingInstallments = Math.max(1, prev.totalInstallments - prev.paidInstallments);
      const monthlyAmortization = prev.currentDebt / remainingInstallments;
      const newDebt = Math.max(0, prev.currentDebt - monthlyAmortization);
      const newPaid = prev.paidInstallments + 1;
      const monthlyRate = Math.pow(1 + prev.annualInterestRate / 100, 1 / 12) - 1;
      const newRemaining = Math.max(1, prev.totalInstallments - newPaid);
      const nextInstallmentValue = (newDebt / newRemaining) + (newDebt * monthlyRate);

      return {
        ...prev,
        paidInstallments: newPaid,
        currentDebt: newDebt,
        currentInstallmentValue: prev.amortizationSystem === 'SAC' ? nextInstallmentValue : prev.currentInstallmentValue,
      };
    });

    // Add transaction
    addTransaction({
      description: `Parcela Financiamento Casa (${houseMortgage.paidInstallments + 1}/${houseMortgage.totalInstallments})`,
      amount: installmentValue,
      type: 'expense',
      category: 'casa',
      bankAccountId: fromAccountId,
      date: new Date().toISOString().split('T')[0],
      status: 'completed',
      paymentMethod: 'transferencia',
      notes: `Pagamento mensal da parcela habitacional`,
    });
  };

  const addDebt = (debtData: Omit<Debt, 'id'>) => {
    const newDebt: Debt = {
      ...debtData,
      id: `debt-${Date.now()}`,
    };
    setDebts((prev) => [...prev, newDebt]);
  };

  const updateDebt = (id: string, updatedFields: Partial<Debt>) => {
    setDebts((prev) => prev.map((d) => (d.id === id ? { ...d, ...updatedFields } : d)));
  };

  const deleteDebt = (id: string) => {
    setDebts((prev) => prev.filter((d) => d.id !== id));
  };

  const payDebtInstallment = (debtId: string, fromAccountId: string) => {
    const debt = debts.find((d) => d.id === debtId);
    if (!debt) return;

    const val = debt.installmentValue;

    // Deduct from account
    setBankAccounts((prev) =>
      prev.map((acc) => (acc.id === fromAccountId ? { ...acc, balance: acc.balance - val } : acc))
    );

    // Update debt
    setDebts((prev) =>
      prev.map((d) => {
        if (d.id === debtId) {
          const newPaid = d.paidInstallments + 1;
          const newRemaining = Math.max(0, d.remainingAmount - val);
          return {
            ...d,
            paidInstallments: newPaid,
            remainingAmount: newRemaining,
          };
        }
        return d;
      })
    );

    // Transaction
    addTransaction({
      description: `Pagamento Parcela: ${debt.title} (${debt.paidInstallments + 1}/${debt.totalInstallments})`,
      amount: val,
      type: 'expense',
      category: debt.category === 'veiculo' ? 'carro' : 'dividas',
      bankAccountId: fromAccountId,
      date: new Date().toISOString().split('T')[0],
      status: 'completed',
      paymentMethod: 'pix',
      notes: `Credor: ${debt.creditor}`,
    });
  };

  const addClient = (clientData: Omit<Client, 'id' | 'createdAt' | 'totalBilled' | 'totalPaid' | 'pendingAmount' | 'projectsCount'>) => {
    const safeState = clientData.state ? clientData.state.toLowerCase() : 'br';
    const newClient: Client = {
      ...clientData,
      id: `cli-${safeState}-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
      totalBilled: 0,
      totalPaid: 0,
      pendingAmount: 0,
      projectsCount: 0,
      status: clientData.status || 'active',
    };
    setClients((prev) => [newClient, ...prev]);
  };

  const updateClient = (id: string, updatedFields: Partial<Client>) => {
    setClients((prev) => prev.map((c) => (c.id === id ? { ...c, ...updatedFields } : c)));
  };

  const deleteClient = (id: string) => {
    setClients((prev) => prev.filter((c) => c.id !== id));
  };

  const addFreelanceProject = (projectData: Omit<FreelanceProject, 'id' | 'createdAt'>) => {
    const newProj: FreelanceProject = {
      ...projectData,
      id: `proj-${Date.now()}`,
    };
    setFreelanceProjects((prev) => [newProj, ...prev]);

    // Update client stats
    setClients((prev) =>
      prev.map((c) => {
        if (c.id === projectData.clientId) {
          const newBilled = c.totalBilled + projectData.totalValue;
          const newPaid = c.totalPaid + projectData.paidValue;
          const newPending = newBilled - newPaid;
          return {
            ...c,
            totalBilled: newBilled,
            totalPaid: newPaid,
            pendingAmount: newPending,
            projectsCount: c.projectsCount + 1,
            lastJobDate: projectData.startDate,
            status: 'active',
          };
        }
        return c;
      })
    );

    // If paid value > 0, record initial transaction
    if (projectData.paidValue > 0) {
      const defaultBank = bankAccounts.find((b) => b.isDefault)?.id || bankAccounts[0]?.id || 'cash-wallet';
      addTransaction({
        description: `Sinal Freela: ${projectData.title} (${projectData.clientName})`,
        amount: projectData.paidValue,
        type: 'income',
        incomeSource: 'freelancer',
        bankAccountId: defaultBank,
        date: projectData.startDate,
        status: 'completed',
        paymentMethod: 'pix',
        clientName: projectData.clientName,
        clientId: projectData.clientId,
        projectId: newProj.id,
      });
    }
  };

  const updateFreelanceProject = (id: string, updatedFields: Partial<FreelanceProject>) => {
    setFreelanceProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updatedFields } : p))
    );
  };

  const deleteFreelanceProject = (id: string) => {
    setFreelanceProjects((prev) => prev.filter((p) => p.id !== id));
  };

  // Architecture Projects & Portfolio Actions
  const addArchitectureProject = (projectData: Omit<ArchitectureProject, 'id' | 'createdAt'>) => {
    recordLocalMutation();
    const newProj: ArchitectureProject = {
      ...projectData,
      id: `proj-arch-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setArchitectureProjects((prev) => [newProj, ...prev]);
  };

  const updateArchitectureProject = (id: string, updatedFields: Partial<ArchitectureProject>) => {
    recordLocalMutation();
    setArchitectureProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updatedFields } : p))
    );
  };

  const deleteArchitectureProject = (id: string) => {
    recordLocalMutation();
    setArchitectureProjects((prev) => prev.filter((p) => p.id !== id));
    setProjectMilestones((prev) => prev.filter((m) => m.projectId !== id));
    setProjectInstallments((prev) => prev.filter((i) => i.projectId !== id));
    setActions((prev) => prev.filter((a) => a.relatedId !== id));
  };

  const addPhotoToProject = (projectId: string, photoUrl: string) => {
    if (!photoUrl.trim()) return;
    recordLocalMutation();
    setArchitectureProjects((prev) =>
      prev.map((p) => {
        if (p.id === projectId) {
          const currentImages = p.images || [];
          return {
            ...p,
            images: [...currentImages, photoUrl.trim()],
          };
        }
        return p;
      })
    );
  };

  const removePhotoFromProject = (projectId: string, photoIndex: number) => {
    recordLocalMutation();
    setArchitectureProjects((prev) =>
      prev.map((p) => {
        if (p.id === projectId) {
          const currentImages = [...(p.images || [])];
          currentImages.splice(photoIndex, 1);
          return {
            ...p,
            images: currentImages,
          };
        }
        return p;
      })
    );
  };

  const updateProjectStatus = (id: string, newStatus: ArchitectureProject['status']) => {
    recordLocalMutation();
    setArchitectureProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p))
    );
  };

  const addConstructionReport = (projectId: string, report: Omit<ConstructionReport, 'id'>) => {
    const newReport: ConstructionReport = {
      ...report,
      id: `rep-${Date.now()}`,
    };
    setArchitectureProjects((prev) =>
      prev.map((p) => {
        if (p.id === projectId) {
          return {
            ...p,
            reports: [newReport, ...(p.reports || [])],
          };
        }
        return p;
      })
    );
  };

  const receiveProjectPayment = (projectId: string, amount: number, bankAccountId: string) => {
    const project = freelanceProjects.find((p) => p.id === projectId);
    if (!project || amount <= 0) return;

    const newPaid = project.paidValue + amount;
    const isFullyPaid = newPaid >= project.totalValue;

    setFreelanceProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? {
              ...p,
              paidValue: newPaid,
              status: isFullyPaid ? 'paid' : p.status,
            }
          : p
      )
    );

    // Update Client
    setClients((prev) =>
      prev.map((c) => {
        if (c.id === project.clientId) {
          const totalPaid = c.totalPaid + amount;
          const pendingAmount = Math.max(0, c.totalBilled - totalPaid);
          return {
            ...c,
            totalPaid,
            pendingAmount,
          };
        }
        return c;
      })
    );

    // Record Income Transaction
    addTransaction({
      description: `Recebimento Freela: ${project.title} (${project.clientName})`,
      amount,
      type: 'income',
      incomeSource: 'freelancer',
      bankAccountId,
      date: new Date().toISOString().split('T')[0],
      status: 'completed',
      paymentMethod: 'pix',
      clientName: project.clientName,
      clientId: project.clientId,
      projectId: project.id,
    });
  };

  // Work Contracts Actions
  const addWorkContract = (contractData: Omit<WorkContract, 'id' | 'createdAt' | 'updatedAt'>) => {
    const id = `contract-${Date.now()}`;
    const nowStr = new Date().toISOString();
    const newContract: WorkContract = {
      ...contractData,
      id,
      createdAt: nowStr.split('T')[0],
      updatedAt: nowStr,
    };
    setWorkContracts((prev) => [newContract, ...prev]);

    // Update Client active contract
    if (contractData.clientId) {
      setClients((prev) =>
        prev.map((c) =>
          c.id === contractData.clientId
            ? { ...c, contractStatus: contractData.status, activeContractId: id }
            : c
        )
      );
    }
    return id;
  };

  const updateWorkContract = (id: string, updatedFields: Partial<WorkContract>) => {
    const nowStr = new Date().toISOString();
    setWorkContracts((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const updated = { ...c, ...updatedFields, updatedAt: nowStr };
          if (updatedFields.status && updated.clientId) {
            setClients((clientPrev) =>
              clientPrev.map((cli) =>
                cli.id === updated.clientId ? { ...cli, contractStatus: updatedFields.status } : cli
              )
            );
          }
          return updated;
        }
        return c;
      })
    );
  };

  const deleteWorkContract = (id: string) => {
    recordLocalMutation();
    setWorkContracts((prev) => {
      const contractToDelete = prev.find((c) => c.id === id);
      if (contractToDelete?.clientId) {
        setClients((clientPrev) =>
          clientPrev.map((cli) =>
            cli.id === contractToDelete.clientId
              ? {
                  ...cli,
                  activeContractId: cli.activeContractId === id ? undefined : cli.activeContractId,
                }
              : cli
          )
        );
      }
      return prev.filter((c) => c.id !== id);
    });
  };

  const sendContractForSignature = (contractId: string) => {
    const nowStr = new Date().toISOString();
    setWorkContracts((prev) =>
      prev.map((c) => {
        if (c.id === contractId) {
          const updated: WorkContract = {
            ...c,
            status: 'sent_for_signature',
            sentAt: nowStr,
            updatedAt: nowStr,
          };
          if (updated.clientId) {
            setClients((clientPrev) =>
              clientPrev.map((cli) =>
                cli.id === updated.clientId ? { ...cli, contractStatus: 'sent_for_signature' } : cli
              )
            );
          }
          return updated;
        }
        return c;
      })
    );
  };

  const signWorkContract = (
    contractId: string,
    signatureData: Omit<DigitalSignature, 'signedAt' | 'verificationCode'>
  ) => {
    const nowStr = new Date().toISOString();
    const verificationCode = `DOC-SIG-${Math.random().toString(36).substring(2, 9).toUpperCase()}-BR`;
    const fullSignature: DigitalSignature = {
      ...signatureData,
      signedAt: nowStr,
      verificationCode,
    };

    setWorkContracts((prev) =>
      prev.map((c) => {
        if (c.id === contractId) {
          const updated: WorkContract = {
            ...c,
            status: 'signed',
            signedAt: nowStr,
            clientSignature: fullSignature,
            updatedAt: nowStr,
          };
          if (updated.clientId) {
            setClients((clientPrev) =>
              clientPrev.map((cli) =>
                cli.id === updated.clientId ? { ...cli, contractStatus: 'signed' } : cli
              )
            );
          }
          return updated;
        }
        return c;
      })
    );
  };

  const markContractAwaitingPayment = (contractId: string) => {
    const nowStr = new Date().toISOString();
    setWorkContracts((prev) =>
      prev.map((c) => {
        if (c.id === contractId) {
          const updated: WorkContract = {
            ...c,
            status: 'awaiting_payment',
            updatedAt: nowStr,
          };
          if (updated.clientId) {
            setClients((clientPrev) =>
              clientPrev.map((cli) =>
                cli.id === updated.clientId ? { ...cli, contractStatus: 'awaiting_payment' } : cli
              )
            );
          }
          return updated;
        }
        return c;
      })
    );
  };

  const confirmContractPayment = (contractId: string, bankAccountId?: string) => {
    const nowStr = new Date().toISOString();
    const contract = workContracts.find((c) => c.id === contractId);
    if (!contract) return;

    setWorkContracts((prev) =>
      prev.map((c) => {
        if (c.id === contractId) {
          const updated: WorkContract = {
            ...c,
            status: 'paid',
            paidAt: nowStr,
            updatedAt: nowStr,
          };
          if (updated.clientId) {
            setClients((clientPrev) =>
              clientPrev.map((cli) =>
                cli.id === updated.clientId ? { ...cli, contractStatus: 'paid' } : cli
              )
            );
          }
          return updated;
        }
        return c;
      })
    );

    // If payment amount specified and account selected, record transaction and update client paid amount
    const payAmount = contract.downPaymentAmount || contract.totalAmount;
    if (payAmount > 0 && bankAccountId) {
      addTransaction({
        description: `Entrada / Pagamento Contrato: ${contract.title} (${contract.clientName})`,
        amount: payAmount,
        type: 'income',
        incomeSource: 'freelancer',
        bankAccountId,
        date: nowStr.split('T')[0],
        status: 'completed',
        paymentMethod: 'pix',
        clientName: contract.clientName,
        clientId: contract.clientId,
      });

      if (contract.clientId) {
        setClients((prev) =>
          prev.map((c) => {
            if (c.id === contract.clientId) {
              const totalPaid = c.totalPaid + payAmount;
              const pendingAmount = Math.max(0, c.totalBilled - totalPaid);
              return {
                ...c,
                totalPaid,
                pendingAmount,
              };
            }
            return c;
          })
        );
      }
    }
  };

  const addSavingsGoal = (goalData: Omit<SavingsGoal, 'id'>) => {
    const newGoal: SavingsGoal = {
      ...goalData,
      id: `goal-${Date.now()}`,
    };
    setSavingsGoals((prev) => [...prev, newGoal]);
  };

  const updateSavingsGoal = (id: string, updatedFields: Partial<SavingsGoal>) => {
    setSavingsGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, ...updatedFields } : g))
    );
  };

  const deleteSavingsGoal = (id: string) => {
    setSavingsGoals((prev) => prev.filter((g) => g.id !== id));
  };

  const contributeToGoal = (goalId: string, amount: number, fromAccountId: string) => {
    if (amount <= 0) return;

    const goal = savingsGoals.find((g) => g.id === goalId);
    if (!goal) return;

    // Deduct from bank account
    setBankAccounts((prev) =>
      prev.map((acc) => (acc.id === fromAccountId ? { ...acc, balance: acc.balance - amount } : acc))
    );

    // Add to goal
    setSavingsGoals((prev) =>
      prev.map((g) => (g.id === goalId ? { ...g, currentAmount: g.currentAmount + amount } : g))
    );

    // Record transaction
    addTransaction({
      description: `Aporte Meta: ${goal.title}`,
      amount,
      type: 'expense',
      category: 'outros',
      bankAccountId: fromAccountId,
      date: new Date().toISOString().split('T')[0],
      status: 'completed',
      notes: `Aporte direcionado para reserva/meta`,
    });
  };

  const updateCategoryBudget = (category: string, monthlyBudget: number) => {
    recordLocalMutation();
    setCategoryBudgets((prev) =>
      prev.map((b) => (b.category === category ? { ...b, monthlyBudget } : b))
    );
  };

  const addCategoryBudget = (item: CategoryBudget) => {
    recordLocalMutation();
    setCategoryBudgets((prev) => [...prev, item]);
  };

  const deleteCategoryBudget = (category: string) => {
    recordLocalMutation();
    setCategoryBudgets((prev) => prev.filter((b) => b.category !== category));
  };

  const addAppAction = (actionData: Omit<AppAction, 'id' | 'createdAt'>) => {
    recordLocalMutation();
    const newAction: AppAction = {
      ...actionData,
      id: `act-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setActions((prev) => [newAction, ...prev]);
  };

  const updateAppAction = (id: string, updatedFields: Partial<AppAction>) => {
    recordLocalMutation();
    setActions((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updatedFields } : a))
    );
  };

  const deleteAppAction = (id: string) => {
    recordLocalMutation();
    setActions((prev) => prev.filter((a) => a.id !== id));
  };

  // Actions - Project Installments & Cobranças
  const addProjectInstallment = (installmentData: Omit<ProjectInstallment, 'id' | 'createdAt'>) => {
    recordLocalMutation();
    const newInst: ProjectInstallment = {
      ...installmentData,
      id: `inst-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setProjectInstallments((prev) => [newInst, ...prev]);
  };

  const updateProjectInstallment = (id: string, updatedFields: Partial<ProjectInstallment>) => {
    recordLocalMutation();
    setProjectInstallments((prev) =>
      prev.map((inst) => (inst.id === id ? { ...inst, ...updatedFields } : inst))
    );
  };

  const deleteProjectInstallment = (id: string) => {
    recordLocalMutation();
    setProjectInstallments((prev) => prev.filter((inst) => inst.id !== id));
  };

  const receiveInstallmentPayment = (
    installmentId: string,
    bankAccountId: string,
    paidDate?: string,
    amount?: number
  ) => {
    recordLocalMutation();
    const inst = projectInstallments.find((i) => i.id === installmentId);
    if (!inst) return;

    const actualDate = paidDate || new Date().toISOString().split('T')[0];
    const actualAmount = amount !== undefined && amount > 0 ? amount : inst.amount;

    // 1. Update installment
    setProjectInstallments((prev) =>
      prev.map((i) =>
        i.id === installmentId
          ? {
              ...i,
              status: 'paid',
              paidDate: actualDate,
              paidAmount: actualAmount,
              bankAccountId,
            }
          : i
      )
    );

    // 2. Update parent ArchitectureProject's paidAmount
    setArchitectureProjects((prev) =>
      prev.map((p) => {
        if (p.id === inst.projectId || p.title === inst.projectTitle) {
          const currentPaid = p.paidAmount || 0;
          return {
            ...p,
            paidAmount: currentPaid + actualAmount,
          };
        }
        return p;
      })
    );

    // 3. Create income transaction in the selected bank account
    const newTx: Transaction = {
      id: `tx-inst-${Date.now()}`,
      description: `Honorários: ${inst.projectTitle} - Parcela ${inst.installmentNumber}/${inst.totalInstallments} (${inst.description})`,
      amount: actualAmount,
      type: 'income',
      incomeSource: 'freelancer',
      bankAccountId,
      date: actualDate,
      status: 'completed',
      paymentMethod: 'pix',
      clientName: inst.clientName,
      notes: `Recebimento da parcela ${inst.installmentNumber}/${inst.totalInstallments} referente ao projeto ${inst.projectTitle}.`,
    };

    setTransactions((prev) => [newTx, ...prev]);

    // 4. Update bank account balance
    setBankAccounts((prev) =>
      prev.map((acc) =>
        acc.id === bankAccountId ? { ...acc, balance: acc.balance + actualAmount } : acc
      )
    );
  };

  // Actions - Project Milestones & Prazos
  const addProjectMilestone = (milestoneData: Omit<ProjectMilestone, 'id' | 'createdAt'>) => {
    recordLocalMutation();
    const newMs: ProjectMilestone = {
      ...milestoneData,
      id: `ms-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setProjectMilestones((prev) => [newMs, ...prev]);
  };

  const updateProjectMilestone = (id: string, updatedFields: Partial<ProjectMilestone>) => {
    recordLocalMutation();
    setProjectMilestones((prev) =>
      prev.map((ms) => (ms.id === id ? { ...ms, ...updatedFields } : ms))
    );
  };

  const deleteProjectMilestone = (id: string) => {
    recordLocalMutation();
    setProjectMilestones((prev) => prev.filter((ms) => ms.id !== id));
  };

  const toggleProjectMilestone = (id: string) => {
    recordLocalMutation();
    setProjectMilestones((prev) =>
      prev.map((ms) => {
        if (ms.id === id) {
          const isCompleted = !ms.completed;
          return {
            ...ms,
            completed: isCompleted,
            completedDate: isCompleted ? new Date().toISOString().split('T')[0] : undefined,
          };
        }
        return ms;
      })
    );
  };

  // Computations
  const totalBankBalance = useMemo(() => {
    return bankAccounts
      .filter((a) => a.type !== 'physical_cash')
      .reduce((sum, a) => sum + (a.balance || 0), 0);
  }, [bankAccounts]);

  const totalPhysicalCash = useMemo(() => {
    return bankAccounts
      .filter((a) => a.type === 'physical_cash' || a.id === 'cash-wallet')
      .reduce((sum, a) => sum + (a.balance || 0), 0);
  }, [bankAccounts]);

  const totalNetWorth = useMemo(() => {
    return totalBankBalance + totalPhysicalCash;
  }, [totalBankBalance, totalPhysicalCash]);

  const currentMonthTransactions = useMemo(() => {
    return transactions.filter((t) => t.date.startsWith(selectedMonth));
  }, [transactions, selectedMonth]);

  const monthlyIncomeCLT = useMemo(() => {
    return currentMonthTransactions
      .filter((t) => t.type === 'income' && t.incomeSource === 'clt' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [currentMonthTransactions]);

  const monthlyIncomeFreelance = useMemo(() => {
    return currentMonthTransactions
      .filter((t) => t.type === 'income' && t.incomeSource === 'freelancer' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [currentMonthTransactions]);

  const monthlyTotalIncome = useMemo(() => {
    return currentMonthTransactions
      .filter((t) => t.type === 'income' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [currentMonthTransactions]);

  const monthlyTotalExpense = useMemo(() => {
    return currentMonthTransactions
      .filter((t) => t.type === 'expense' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [currentMonthTransactions]);

  const monthlyExpenseCasa = useMemo(() => {
    return currentMonthTransactions
      .filter((t) => t.type === 'expense' && (t.category === 'casa' || t.category === 'financiamento') && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [currentMonthTransactions]);

  const monthlyExpenseCarro = useMemo(() => {
    return currentMonthTransactions
      .filter((t) => t.type === 'expense' && t.category === 'carro' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [currentMonthTransactions]);

  const monthlyExpenseLazer = useMemo(() => {
    return currentMonthTransactions
      .filter((t) => t.type === 'expense' && t.category === 'lazer' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [currentMonthTransactions]);

  const monthlyBalance = useMemo(() => {
    return monthlyTotalIncome - monthlyTotalExpense;
  }, [monthlyTotalIncome, monthlyTotalExpense]);

  // Clients grouped by Brazil state
  const clientsByState = useMemo(() => {
    const map: Record<string, { clientsCount: number; totalBilled: number; projectsCount: number; clients: Client[] }> = {};

    clients.forEach((c) => {
      const uf = (c.state || '').toUpperCase().trim();
      if (!uf) return;
      if (!map[uf]) {
        map[uf] = { clientsCount: 0, totalBilled: 0, projectsCount: 0, clients: [] };
      }
      map[uf].clientsCount += 1;
      map[uf].totalBilled += c.totalBilled || 0;
      map[uf].projectsCount += c.projectsCount || 0;
      map[uf].clients.push(c);
    });

    return map;
  }, [clients]);

  const statesWithJobsCount = useMemo(() => {
    return Object.keys(clientsByState).length;
  }, [clientsByState]);

  const budgetLimits = useMemo(() => {
    const limits: Record<string, number> = {};
    categoryBudgets.forEach((b) => {
      limits[b.category] = b.monthlyBudget;
    });
    return limits as unknown as BudgetLimits;
  }, [categoryBudgets]);

  const updateBudgetLimits = (newLimits: BudgetLimits) => {
    recordLocalMutation();
    setCategoryBudgets((prev) =>
      prev.map((b) => {
        if (b.category in newLimits) {
          return { ...b, monthlyBudget: newLimits[b.category as keyof BudgetLimits] };
        }
        return b;
      })
    );
  };

  const monthlyIncomeSummary = useMemo(() => {
    const clt = currentMonthTransactions
      .filter((t) => t.type === 'income' && t.incomeSource === 'clt' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);
    const freelancer = currentMonthTransactions
      .filter((t) => t.type === 'income' && t.incomeSource === 'freelancer' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);
    const other = currentMonthTransactions
      .filter((t) => t.type === 'income' && t.incomeSource !== 'clt' && t.incomeSource !== 'freelancer' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);
    const total = clt + freelancer + other;
    return { clt, freelancer, other, total };
  }, [currentMonthTransactions]);

  const monthlyExpenseSummary = useMemo(() => {
    const byCategory: Record<string, number> = {
      casa: 0,
      carro: 0,
      lazer: 0,
      alimentacao: 0,
      saude: 0,
      freela_tools: 0,
      educacao: 0,
      financiamento: 0,
      dividas: 0,
      impostos: 0,
      outros: 0,
    };
    let total = 0;
    currentMonthTransactions
      .filter((t) => t.type === 'expense' && t.status === 'completed')
      .forEach((t) => {
        const cat = t.category || 'outros';
        byCategory[cat] = (byCategory[cat] || 0) + t.amount;
        total += t.amount;
      });
    return { byCategory, total };
  }, [currentMonthTransactions]);

  // Ongoing architecture projects
  const ongoingArchitectureProjects = useMemo(() => {
    return architectureProjects.filter((p) => p.status !== 'entregue');
  }, [architectureProjects]);

  // Today reference string
  const todayStr = useMemo(() => {
    return new Date().toISOString().split('T')[0];
  }, []);

  // Helper for difference in days
  const getDaysDiff = (targetDateStr: string) => {
    if (!targetDateStr) return 999;
    const today = new Date(todayStr);
    const target = new Date(targetDateStr);
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Installment alerts
  const pendingInstallments = useMemo(() => {
    return projectInstallments.filter((i) => i.status !== 'paid');
  }, [projectInstallments]);

  const totalPendingInstallmentsAmount = useMemo(() => {
    return pendingInstallments.reduce((sum, i) => sum + (i.amount || 0), 0);
  }, [pendingInstallments]);

  const totalPaidInstallmentsAmount = useMemo(() => {
    return projectInstallments
      .filter((i) => i.status === 'paid')
      .reduce((sum, i) => sum + (i.paidAmount || i.amount || 0), 0);
  }, [projectInstallments]);

  const overdueInstallments = useMemo(() => {
    return projectInstallments.filter((i) => {
      if (i.status === 'paid') return false;
      if (i.status === 'overdue') return true;
      return i.dueDate < todayStr;
    });
  }, [projectInstallments, todayStr]);

  const dueSoonInstallments = useMemo(() => {
    return projectInstallments.filter((i) => {
      if (i.status === 'paid') return false;
      const diff = getDaysDiff(i.dueDate);
      return diff >= 0 && diff <= 7;
    });
  }, [projectInstallments, todayStr]);

  // Milestone alerts
  const pendingMilestones = useMemo(() => {
    return projectMilestones.filter((m) => !m.completed);
  }, [projectMilestones]);

  const overdueMilestones = useMemo(() => {
    return projectMilestones.filter((m) => !m.completed && m.dueDate < todayStr);
  }, [projectMilestones, todayStr]);

  const dueSoonMilestones = useMemo(() => {
    return projectMilestones.filter((m) => {
      if (m.completed) return false;
      const diff = getDaysDiff(m.dueDate);
      return diff >= 0 && diff <= 7;
    });
  }, [projectMilestones, todayStr]);

  // Export / Import / Reset
  const exportDataJSON = () => {
    const exportObject = {
      transactions,
      bankAccounts,
      houseMortgage,
      debts,
      clients,
      freelanceProjects,
      architectureProjects,
      projectInstallments,
      projectMilestones,
      savingsGoals,
      categoryBudgets,
      architectProfile,
      exportedAt: new Date().toISOString(),
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportObject, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `laine_paula_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const exportTransactionsCSV = () => {
    const headers = ['ID', 'Data', 'Descrição', 'Tipo', 'Origem/Categoria', 'Valor (R$)', 'Status', 'Conta/Banco', 'Cliente'];
    const rows = transactions.map((t) => [
      t.id,
      t.date,
      `"${t.description.replace(/"/g, '""')}"`,
      t.type,
      t.type === 'income' ? t.incomeSource || '' : t.category || '',
      t.amount.toFixed(2).replace('.', ','),
      t.status,
      bankAccounts.find((a) => a.id === t.bankAccountId)?.name || t.bankAccountId,
      t.clientName ? `"${t.clientName.replace(/"/g, '""')}"` : '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map((e) => e.join(''))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `extrato_financeiro_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const importDataJSON = (jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString);
      if (data.transactions) setTransactions(data.transactions);
      if (data.bankAccounts) setBankAccounts(data.bankAccounts);
      if (data.houseMortgage) setHouseMortgage(data.houseMortgage);
      if (data.debts) setDebts(data.debts);
      if (data.clients) setClients(data.clients);
      if (data.freelanceProjects) setFreelanceProjects(data.freelanceProjects);
      if (data.architectureProjects) setArchitectureProjects(data.architectureProjects);
      if (data.projectInstallments) setProjectInstallments(data.projectInstallments);
      if (data.projectMilestones) setProjectMilestones(data.projectMilestones);
      if (data.savingsGoals) setSavingsGoals(data.savingsGoals);
      if (data.categoryBudgets) setCategoryBudgets(data.categoryBudgets);
      if (data.architectProfile) setArchitectProfile(data.architectProfile);
      return true;
    } catch {
      return false;
    }
  };

  const loadDemoData = () => {
    setTransactions(INITIAL_TRANSACTIONS);
    setBankAccounts(INITIAL_BANK_ACCOUNTS);
    setHouseMortgage(INITIAL_HOUSE_MORTGAGE);
    setDebts(INITIAL_DEBTS);
    setClients(INITIAL_CLIENTS);
    setFreelanceProjects(INITIAL_FREELANCE_PROJECTS);
    setArchitectureProjects(INITIAL_ARCHITECTURE_PROJECTS);
    setProjectInstallments(INITIAL_PROJECT_INSTALLMENTS);
    setProjectMilestones(INITIAL_PROJECT_MILESTONES);
    setWorkContracts(INITIAL_WORK_CONTRACTS);
    setSavingsGoals(INITIAL_SAVINGS_GOALS);
    setCategoryBudgets(INITIAL_CATEGORY_BUDGETS);
    setArchitectProfile(INITIAL_ARCHITECT_PROFILE);
    applyThemeToDocument(INITIAL_ARCHITECT_PROFILE.themeColor || 'gold');
  };

  const resetFinancialData = () => {
    recordLocalMutation();
    setTransactions([]);
    setBankAccounts(EMPTY_BANK_ACCOUNTS);
    setHouseMortgage(EMPTY_HOUSE_MORTGAGE);
    setDebts([]);
    setProjectInstallments([]);
    setWorkContracts([]);
    setSavingsGoals([]);
    safeSetItem('transactions', []);
    safeSetItem('accounts', EMPTY_BANK_ACCOUNTS);
    safeSetItem('mortgage', EMPTY_HOUSE_MORTGAGE);
    safeSetItem('debts', []);
    safeSetItem('installments', []);
    safeSetItem('work_contracts', []);
    safeSetItem('goals', []);
    if (targetUid) {
      const workspaceDocRef = doc(db, 'users', targetUid, 'data', 'workspace');
      setDoc(
        workspaceDocRef,
        {
          transactions: [],
          bankAccounts: EMPTY_BANK_ACCOUNTS,
          houseMortgage: EMPTY_HOUSE_MORTGAGE,
          debts: [],
          projectInstallments: [],
          workContracts: [],
          savingsGoals: [],
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      ).catch(console.error);
    }
  };

  const resetProjectsData = () => {
    recordLocalMutation();
    setArchitectureProjects([]);
    setFreelanceProjects([]);
    setProjectMilestones([]);
    setActions((prev) => prev.filter((a) => a.origin !== 'Projeto'));
    safeSetItem('architecture_projects', []);
    safeSetItem('projects', []);
    safeSetItem('milestones', []);
    if (targetUid) {
      const workspaceDocRef = doc(db, 'users', targetUid, 'data', 'workspace');
      setDoc(
        workspaceDocRef,
        {
          architectureProjects: [],
          freelanceProjects: [],
          projectMilestones: [],
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      ).catch(console.error);
    }
  };

  const resetTeamData = () => {
    const ownerAdminMember: TeamMember = {
      id: 'member_owner',
      name: architectProfile.name || user?.displayName || 'LF Quadros & Decoração',
      email: user?.email || 'lfquadrosdecorativos@gmail.com',
      role: 'admin',
      roleTitle: 'Administrador / Gestor',
      initials: 'LF',
      color: '#b8a38b',
      isCurrentUser: true,
      status: 'active',
      accessibleModulesCount: 9,
      permissions: {
        projects: true,
        actions: true,
        clients: true,
        suppliers: true,
        finance: true,
        deadlines: true,
        goals: true,
        budget: true,
        team: true,
      },
      joinedAt: new Date().toISOString().split('T')[0],
    };
    try {
      localStorage.setItem('meu_escritorio_equipe_v1', JSON.stringify([ownerAdminMember]));
      window.dispatchEvent(new CustomEvent('team_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error(e);
    }
  };

  const resetSuppliersData = () => {
    try {
      localStorage.setItem('meu_escritorio_fornecedores_v1', JSON.stringify([]));
      window.dispatchEvent(new CustomEvent('suppliers_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error(e);
    }
  };

  const resetRequestedModules = () => {
    resetFinancialData();
    resetProjectsData();
    resetTeamData();
    resetSuppliersData();
  };

  const resetAllData = () => {
    resetFinancialData();
    resetProjectsData();
    resetTeamData();
    resetSuppliersData();
    setClients([]);
    safeSetItem('clients', []);
    setCategoryBudgets(INITIAL_CATEGORY_BUDGETS);
    safeSetItem('budgets', INITIAL_CATEGORY_BUDGETS);
    setActions([]);
    safeSetItem('actions', []);
    setArchitectProfile(getCleanProfile());
    if (targetUid) {
      const workspaceDocRef = doc(db, 'users', targetUid, 'data', 'workspace');
      setDoc(
        workspaceDocRef,
        {
          clients: [],
          actions: [],
          categoryBudgets: INITIAL_CATEGORY_BUDGETS,
          profile: getCleanProfile(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      ).catch(console.error);
    }
  };

  return (
    <FinanceContext.Provider
      value={{
        architectProfile,
        updateArchitectProfile,
        updateProfilePhoto,
        changeTheme,
        changeBgTheme,
        changeNiche,
        loadNicheSampleProjects,
        transactions,
        bankAccounts,
        houseMortgage,
        debts,
        clients,
        freelanceProjects,
        architectureProjects,
        projectInstallments,
        projectMilestones,
        workContracts,
        savingsGoals,
        categoryBudgets,
        officeSettings,
        updateOfficeSettings,
        selectedMonth,
        setSelectedMonth,
        addArchitectureProject,
        updateArchitectureProject,
        deleteArchitectureProject,
        addPhotoToProject,
        removePhotoFromProject,
        updateProjectStatus,
        addConstructionReport,
        addProjectInstallment,
        updateProjectInstallment,
        deleteProjectInstallment,
        receiveInstallmentPayment,
        addProjectMilestone,
        updateProjectMilestone,
        deleteProjectMilestone,
        toggleProjectMilestone,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        addBankAccount,
        updateBankAccount,
        deleteBankAccount,
        transferFunds,
        adjustPhysicalCash,
        updateMortgage,
        applyMortgageAmortization,
        payMortgageInstallment,
        addDebt,
        updateDebt,
        deleteDebt,
        payDebtInstallment,
        addClient,
        updateClient,
        deleteClient,
        addFreelanceProject,
        updateFreelanceProject,
        deleteFreelanceProject,
        receiveProjectPayment,
        addWorkContract,
        updateWorkContract,
        deleteWorkContract,
        sendContractForSignature,
        signWorkContract,
        markContractAwaitingPayment,
        confirmContractPayment,
        addSavingsGoal,
        updateSavingsGoal,
        deleteSavingsGoal,
        contributeToGoal,
        updateCategoryBudget,
        addCategoryBudget,
        deleteCategoryBudget,
        totalNetWorth,
        totalBankBalance,
        totalPhysicalCash,
        currentMonthTransactions,
        monthlyIncomeCLT,
        monthlyIncomeFreelance,
        monthlyTotalIncome,
        monthlyTotalExpense,
        monthlyExpenseCasa,
        monthlyExpenseCarro,
        monthlyExpenseLazer,
        monthlyBalance,
        clientsByState,
        statesWithJobsCount,
        ongoingArchitectureProjects,
        dueSoonInstallments,
        overdueInstallments,
        pendingInstallments,
        totalPendingInstallmentsAmount,
        totalPaidInstallmentsAmount,
        dueSoonMilestones,
        overdueMilestones,
        pendingMilestones,
        exportDataJSON,
        exportTransactionsCSV,
        importDataJSON,
        loadDemoData,
        resetAllData,
        resetFinancialData,
        resetProjectsData,
        resetTeamData,
        resetSuppliersData,
        resetRequestedModules,
        monthlyIncomeSummary,
        monthlyExpenseSummary,
        budgetLimits,
        updateBudgetLimits,
        resetToDemoData: loadDemoData,
        actions,
        addAppAction,
        updateAppAction,
        deleteAppAction,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};
