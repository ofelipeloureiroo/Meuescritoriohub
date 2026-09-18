import {
  ArchitectProfile,
  ArchitectureProject,
  BankAccount,
  CategoryBudget,
  Client,
  Debt,
  FreelanceProject,
  HouseMortgage,
  ProjectInstallment,
  ProjectMilestone,
  SavingsGoal,
  Transaction,
  WorkContract,
} from '../types';

export const EMPTY_BANK_ACCOUNTS: BankAccount[] = [
  {
    id: 'bank-principal',
    name: 'Conta Principal / Banco',
    type: 'bank',
    balance: 0,
    color: '#3b82f6',
    textColor: '#ffffff',
    iconName: 'CreditCard',
    isDefault: true,
  },
  {
    id: 'cash-wallet',
    name: 'Dinheiro Físico / Caixa',
    type: 'physical_cash',
    balance: 0,
    color: '#10b981',
    textColor: '#ffffff',
    iconName: 'Banknote',
  },
];

export const EMPTY_HOUSE_MORTGAGE: HouseMortgage = {
  enabled: false,
  bankName: '',
  propertyName: '',
  propertyValue: 0,
  financedAmount: 0,
  currentDebt: 0,
  totalInstallments: 0,
  paidInstallments: 0,
  currentInstallmentValue: 0,
  annualInterestRate: 0,
  amortizationSystem: 'SAC',
  monthlyDueDate: 10,
  extraAmortizations: [],
};

export const INITIAL_BANK_ACCOUNTS: BankAccount[] = EMPTY_BANK_ACCOUNTS;
export const INITIAL_HOUSE_MORTGAGE: HouseMortgage = EMPTY_HOUSE_MORTGAGE;
export const INITIAL_DEBTS: Debt[] = [];
export const INITIAL_CLIENTS: Client[] = [];
export const INITIAL_FREELANCE_PROJECTS: FreelanceProject[] = [];
export const INITIAL_SAVINGS_GOALS: SavingsGoal[] = [];

export const INITIAL_CATEGORY_BUDGETS: CategoryBudget[] = [
  {
    category: 'aluguel_escritorio' as any,
    name: 'Aluguel do Escritório & Condomínio',
    monthlyBudget: 0,
    color: '#6366f1',
    iconName: 'Building2',
  },
  {
    category: 'softwares_licencas' as any,
    name: 'Softwares & Licenças (CAD, BIM, Render)',
    monthlyBudget: 0,
    color: '#3b82f6',
    iconName: 'Laptop',
  },
  {
    category: 'contabilidade_juridico' as any,
    name: 'Contabilidade & Honorários Jurídicos',
    monthlyBudget: 0,
    color: '#10b981',
    iconName: 'FileText',
  },
  {
    category: 'marketing_prospeccao' as any,
    name: 'Marketing, Tráfego Pago & Prospecção',
    monthlyBudget: 0,
    color: '#ec4899',
    iconName: 'Target',
  },
  {
    category: 'material_escritorio' as any,
    name: 'Material de Escritório, Amostras & Gráfica',
    monthlyBudget: 0,
    color: '#f97316',
    iconName: 'Package',
  },
  {
    category: 'internet_telefonia' as any,
    name: 'Internet Fibra, Telefonia & Servidores Nuvem',
    monthlyBudget: 0,
    color: '#06b6d4',
    iconName: 'Wifi',
  },
  {
    category: 'manutencao_equipamentos' as any,
    name: 'Manutenção de Equipamentos & Periféricos',
    monthlyBudget: 0,
    color: '#8b5cf6',
    iconName: 'Wrench',
  },
  {
    category: 'impostos_taxas' as any,
    name: 'Impostos, DAS Simples & Taxas Municipais/RRT',
    monthlyBudget: 0,
    color: '#ef4444',
    iconName: 'FileCheck',
  },
  {
    category: 'cursos_capacitacao' as any,
    name: 'Cursos, Especializações & Feiras do Setor',
    monthlyBudget: 0,
    color: '#14b8a6',
    iconName: 'GraduationCap',
  },
  {
    category: 'outros_operacionais' as any,
    name: 'Outras Despesas Operacionais / Diversos',
    monthlyBudget: 0,
    color: '#64748b',
    iconName: 'MoreHorizontal',
  },
];

export const INITIAL_TRANSACTIONS: Transaction[] = [];
export const INITIAL_ARCHITECTURE_PROJECTS: ArchitectureProject[] = [];

export const INITIAL_ARCHITECT_PROFILE: ArchitectProfile = {
  name: 'Meu Escritório',
  title: '',
  photoUrl: '',
  location: '',
  specialty: '',
  tagline: '',
  description: '',
  instagramHandle: '',
  instagramUrl: '',
  followersCount: '',
  rating: 5.0,
  pixKey: '',
  pixKeyType: 'email',
  bankInfo: '',
  niche: 'vendas',
  themeColor: 'gold',
  showPortfolio: true,
};

export const INITIAL_PROJECT_INSTALLMENTS: ProjectInstallment[] = [];
export const INITIAL_PROJECT_MILESTONES: ProjectMilestone[] = [];
export const INITIAL_WORK_CONTRACTS: WorkContract[] = [];
