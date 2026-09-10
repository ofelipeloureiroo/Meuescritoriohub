export type TransactionType = 'income' | 'expense' | 'transfer';

export type IncomeSource = 'clt' | 'freelancer' | 'investment' | 'cash_entry' | 'rendimento' | 'other';

export type PaymentMethod = 'pix' | 'debito' | 'credito' | 'cartao_credito' | 'cartao_debito' | 'dinheiro_vivo' | 'boleto' | 'transferencia' | 'ted';

export type ExpenseCategory =
  | 'casa'
  | 'carro'
  | 'lazer'
  | 'alimentacao'
  | 'saude'
  | 'freela_tools'
  | 'educacao'
  | 'financiamento'
  | 'dividas'
  | 'impostos'
  | 'outros';

export interface BudgetLimits {
  casa: number;
  carro: number;
  lazer: number;
  alimentacao: number;
  saude: number;
  freela_tools: number;
}

export type TransactionStructure = 'avulso' | 'contrato' | 'recorrente';
export type TransactionOrigin = 'projeto' | 'cliente' | 'avulso' | 'operacional' | 'ajuste';
export type TransactionRecurrenceFrequency = 'mensal' | 'quinzenal' | 'semanal' | 'anual';
export type TransactionStatus = 'completed' | 'pending' | 'overdue' | 'lost' | 'cancelled';

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  incomeSource?: IncomeSource;
  category?: string;
  bankAccountId: string; // 'cash' for physical cash or bank id
  toBankAccountId?: string; // For transfers
  date: string; // YYYY-MM-DD
  dueDate?: string; // YYYY-MM-DD
  status: TransactionStatus;
  notes?: string;
  isRecurring?: boolean;
  structure?: TransactionStructure;
  origin?: TransactionOrigin;
  recurrenceFrequency?: TransactionRecurrenceFrequency;
  recurrenceStartDate?: string;
  recurrenceEndDate?: string;
  installmentsCount?: number;
  installmentNumber?: number;
  clientName?: string;
  clientId?: string;
  projectId?: string;
  projectName?: string;
  paymentMethod?: PaymentMethod;
}

export interface BankAccount {
  id: string;
  name: string;
  type: 'bank' | 'fintech' | 'investment' | 'physical_cash';
  balance: number;
  color: string;
  textColor?: string;
  iconName: string;
  accountNumber?: string;
  bankCode?: string;
  isDefault?: boolean;
}

export interface ExtraAmortization {
  id: string;
  date: string;
  amount: number;
  type: 'prazo' | 'prestacao';
  monthsReduced?: number;
  interestSaved?: number;
  notes?: string;
}

export interface HouseMortgage {
  enabled: boolean;
  bankName: string;
  propertyName: string;
  propertyValue: number;
  financedAmount: number;
  currentDebt: number;
  totalInstallments: number;
  paidInstallments: number;
  currentInstallmentValue: number;
  annualInterestRate: number; // e.g. 9.5%
  amortizationSystem: 'SAC' | 'PRICE';
  monthlyDueDate: number; // Day of month, e.g. 10
  extraAmortizations: ExtraAmortization[];
  targetPayoffYear?: number;
}

export interface Debt {
  id: string;
  title: string;
  category: 'cartao' | 'emprestimo' | 'veiculo' | 'consignado' | 'outro';
  totalAmount: number;
  remainingAmount: number;
  installmentValue: number;
  totalInstallments: number;
  paidInstallments: number;
  dueDate: number; // Day of month
  interestRate?: number;
  creditor: string;
}

export type ContractStatus =
  | 'draft'                  // Minuta / Rascunho
  | 'sent_for_signature'    // Enviado para Assinatura (Aguardando Assinatura do Cliente)
  | 'signed'                // Contrato Assinado
  | 'awaiting_payment'      // Aguardando Pagamento do Cliente
  | 'paid'                  // Pago / Entrada Recebida (Em Execução)
  | 'completed'             // Concluído / Entregue
  | 'cancelled';            // Cancelado

export interface DigitalSignature {
  signerName: string;
  signerDocument?: string; // CPF or CNPJ
  signerEmail?: string;
  signerPhone?: string;
  signedAt: string; // ISO String
  signatureDataUrl?: string; // Drawn canvas or seal data
  signatureType?: 'drawn' | 'typed';
  ipAddress?: string;
  verificationCode: string; // Unique verification hash
}

export interface WorkContract {
  id: string;
  clientId: string;
  clientName: string;
  clientDocument?: string; // CPF / CNPJ
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  clientCity?: string;
  clientState?: string;
  projectId?: string;
  projectTitle: string;
  title: string; // e.g. "Contrato de Prestação de Serviços de Arquitetura & Design"
  serviceScope: string; // Detailed description of deliverables
  totalAmount: number;
  currency?: string; // 'BRL' | 'USD' | 'EUR' | etc.
  downPaymentAmount?: number;
  paymentTerms: string; // e.g. "50% de entrada no ato da assinatura + 50% na entrega"
  installmentsCount?: number;
  pixKey?: string;
  pixKeyType?: string;
  bankDetails?: string;
  startDate?: string;
  deadline?: string;
  status: ContractStatus;
  sentAt?: string;
  signedAt?: string;
  paidAt?: string;
  clientSignature?: DigitalSignature;
  professionalSignature?: DigitalSignature;
  notes?: string;
  clauses?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  document?: string; // CPF or CNPJ
  country?: string; // 'BR' | 'US' | 'PT' | 'IT' | 'ES' | 'GB' | 'FR' | 'DE' | 'CH' | 'AE' | 'CA' | 'AU' | 'JP' | 'AR' | etc.
  countryName?: string; // 'Brasil', 'Estados Unidos', 'Portugal', etc.
  countryFlag?: string; // '🇧🇷', '🇺🇸', '🇵🇹', etc.
  state: string; // UF or Region: SP, RJ, FL, Lisboa, Milão, etc.
  city: string;
  address?: string;
  serviceType: string;
  currency?: string; // 'BRL' | 'USD' | 'EUR' | 'GBP'
  totalBilled: number;
  totalPaid: number;
  pendingAmount: number;
  status: 'active' | 'completed' | 'lead';
  contractStatus?: ContractStatus;
  activeContractId?: string;
  projectsCount: number;
  createdAt: string;
  lastJobDate?: string;
  notes?: string;

  // CRM Pipeline & Scoring Fields
  pipelineStage?: string;
  leadScore?: number;
  estimatedValue?: number;
  proposalsText?: string;
  subStatus?: string;
  lastInteractionDate?: string;
  stoppedDays?: number;
  badgeText?: string;
  originChannel?: string;
  isHighPriority?: boolean;

  // Extended Lead Form Fields (Reference Screenshot)
  clientType?: 'pf' | 'pj';
  birthdayDay?: string;
  birthdayMonth?: string;
  birthdayYear?: string;
  whatsapp?: string;
  instagram?: string;
  neighborhood?: string;
  profession?: string;
  acquisitionChannel?: string;
  detailedOrigin?: string;
  projectType?: string;
  internalCostEstimate?: number;
  urgency?: 'Baixa' | 'Média' | 'Alta' | 'Urgente' | string;
  clientProfile?: 'Econômico' | 'Médio' | 'Alto Padrão' | 'Premium' | string;
  approximateArea?: number;
  desiredStartDate?: string;
  talkedToOtherArchitect?: boolean;
  proposalValue?: number;
  proposalsList?: Array<{ id: string; title: string; value: number; sentDate?: string }>;
  entryDate?: string;
  responsibleId?: string;
  responsibleName?: string;
  autoFollowUp?: boolean;
  clientActions?: Array<{ id: string; title: string; date: string; type?: string; completed?: boolean }>;
}

export interface FreelanceProject {
  id: string;
  clientId: string;
  clientName: string;
  title: string;
  description?: string;
  serviceType: string;
  country?: string;
  countryName?: string;
  countryFlag?: string;
  state: string;
  city: string;
  currency?: string;
  totalValue: number;
  paidValue: number;
  status: 'prospect' | 'in_progress' | 'delivered' | 'paid' | 'cancelled';
  startDate: string;
  deadline: string;
  deliveredDate?: string;
  notes?: string;
}

export interface SavingsGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  category: 'reserva' | 'reserva_emergencia' | 'casa' | 'financiamento' | 'viagem' | 'lazer' | 'carro' | 'reforma' | 'equipamento' | 'investimento' | 'outros';
  targetDate?: string;
  deadline?: string;
  color: string;
  iconName?: string;
  monthlyContribution?: number;
}

export interface CategoryBudget {
  category: ExpenseCategory;
  name: string;
  monthlyBudget: number;
  color: string;
  iconName: string;
}

export interface ConstructionReport {
  id: string;
  date: string;
  text: string;
  images?: string[];
}

export type NicheType =
  | 'vendas'
  | 'advocacia'
  | 'arquitetura'
  | 'engenharia'
  | 'design'
  | 'criador_conteudo'
  | 'arte_decoracao'
  | 'consultoria'
  | 'saude_estetica'
  | 'imobiliario'
  | 'fotografia'
  | 'tecnologia'
  | 'marketing'
  | 'educacao'
  | 'eventos'
  | 'autonomo'
  | 'outro';

export type ThemeColorId =
  | 'gold'
  | 'emerald'
  | 'sapphire'
  | 'amethyst'
  | 'ruby'
  | 'amber'
  | 'cyan'
  | 'slate';

export type BgThemeId = 'dark_warm' | 'dark_oled' | 'dark_graphite' | 'light_cream' | 'light_pure';

export interface ProjectTaskItem {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed';
  duration?: string;
  startDatePlanned?: string;
  endDatePlanned?: string;
  responsible?: string;
  predecessor?: string;
  hasAlert?: boolean;
  isPromoted?: boolean;
  actionId?: string;
}

export interface ProjectWorkflowStage {
  id: string;
  name: string;
  status: 'not_started' | 'in_progress' | 'completed';
  duration?: string;
  startDatePlanned?: string;
  endDatePlanned?: string;
  responsible?: string;
  predecessor?: string;
  tasks: ProjectTaskItem[];
  isExpanded?: boolean;
}

export interface ProjectLinkedClient {
  id: string;
  name: string;
  role: 'Principal' | 'Cônjuge' | 'Sócio' | 'Financeiro' | 'Outro' | string;
  isStarred?: boolean;
}

export interface ArchitectureProject {
  id: string;
  title: string;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  category:
    | 'residencial'
    | 'interiores'
    | 'cozinha_gourmet'
    | 'suite_master'
    | 'living'
    | 'comercial'
    | 'consultoria'
    | string;
  country?: string;
  countryName?: string;
  countryFlag?: string;
  location: string; // e.g. "Miami, Flórida (EUA)" or "Cascais, Lisboa (Portugal)" or "Rio Bonito, RJ"
  state: string; // UF or Region
  areaM2?: number; // e.g. 140
  honorarios?: number; // e.g. 12500
  paidAmount?: number;
  currency?: string;
  status: 'estudo_preliminar' | 'anteprojeto' | 'executivo' | 'obra' | 'entregue' | string;
  coverImage: string;
  images: string[];
  beforeImage?: string;
  afterImage?: string;
  description?: string;
  deliveryDate?: string;
  startDate?: string;
  featured?: boolean;
  tags?: string[];
  createdAt?: string;
  reports?: ConstructionReport[];
  color?: string;
  projectType?: string;
  marginPercent?: number;
  costEstimate?: number;
  closingDate?: string;
  stages?: ProjectWorkflowStage[];
  linkedClients?: ProjectLinkedClient[];
}

export interface WorldCountry {
  code: string; // e.g. 'BR', 'US', 'PT', 'IT'
  name: string; // 'Brasil', 'Estados Unidos', 'Portugal'
  flag: string; // '🇧🇷', '🇺🇸', '🇵🇹'
  continent: 'América do Sul' | 'América do Norte' | 'Europa' | 'Ásia' | 'Oceania' | 'África' | 'Oriente Médio' | 'Oriente Médio & Ásia';
  capital: string;
  currency: string; // 'BRL', 'USD', 'EUR', 'GBP'
  currencySymbol: string;
  cx: number; // SVG coordinates on 1000x520 world projection
  cy: number;
  polygonPath?: string;
  timeZone: string;
  dialCode?: string;
}

export interface ContinentInfo {
  name: string;
  color: string;
  countries: string[]; // country codes
}

export interface BrazilStateInfo {
  uf: string;
  name: string;
  region: 'Norte' | 'Nordeste' | 'Centro-Oeste' | 'Sudeste' | 'Sul';
  capital: string;
  svgPath: string;
  labelX: number;
  labelY: number;
}

export interface ArchitectProfile {
  name: string;
  title: string;
  photoUrl: string;
  location: string;
  specialty: string;
  tagline: string;
  description: string;
  instagramHandle: string;
  instagramUrl: string;
  followersCount: string;
  rating: number;
  pixKey?: string;
  pixKeyType?: 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria';
  bankInfo?: string;
  niche?: NicheType;
  nicheCustomName?: string;
  themeColor?: ThemeColorId;
  bgTheme?: BgThemeId;
  customAccentColor?: string;
  logoUrl?: string;
  websiteUrl?: string;
  showPortfolio?: boolean;
}

export interface ProjectInstallment {
  id: string;
  projectId: string;
  projectTitle: string;
  clientName: string;
  clientPhone?: string;
  installmentNumber: number;
  totalInstallments: number;
  description: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  status: 'pending' | 'paid' | 'overdue';
  paidDate?: string;
  paidAmount?: number;
  bankAccountId?: string;
  pixKey?: string;
  notes?: string;
  createdAt: string;
}

export interface ProjectMilestone {
  id: string;
  projectId: string;
  projectTitle: string;
  clientName: string;
  clientPhone?: string;
  title: string;
  stage: 'briefing' | 'estudo_preliminar' | 'anteprojeto' | 'executivo' | 'obra' | 'entregue';
  dueDate: string; // YYYY-MM-DD
  completed: boolean;
  completedDate?: string;
  priority: 'baixa' | 'media' | 'alta' | 'urgente';
  notes?: string;
  createdAt: string;
}

export interface OfficeSettings {
  financialCategories: {
    receitas: string[];
    custosDiretos: string[];
    despesasOperacionais: string[];
  };
  actionMatrix: {
    comercial: { lead: boolean; cliente: boolean; projeto: boolean };
    operacao: { lead: boolean; cliente: boolean; projeto: boolean };
    financeiro: { lead: boolean; cliente: boolean; projeto: boolean };
  };
  actionTypes: {
    id: string;
    name: string;
    areas: string[];
  }[];
  leadStages: {
    id: string;
    name: string;
    status: 'Ativo' | 'Ganho' | 'Perdido';
    subsCount: number;
    enabled: boolean;
  }[];
  lossReasons: string[];
  acquisitionChannels: string[];
  tags: string[];
  projectTemplates?: {
    id: string;
    name: string;
    type: string;
    date: string;
    isSystem?: boolean;
    stages: string[];
  }[];
  projectTypes?: string[];
  projectStatuses?: {
    name: string;
    color: string;
  }[];
  templateBindings?: Record<string, string>;
}

export interface CollaboratorPermissions {
  portfolio: boolean;
  projects: boolean;
  deadlines: boolean;
  finance: boolean;
  clients: boolean;
  map?: boolean;
  goals: boolean;
  budget: boolean;
  today?: boolean;
  actions?: boolean;
  leads?: boolean;
  suppliers?: boolean;
  team?: boolean;
  health?: boolean;
}

export interface Collaborator {
  uid: string;
  email: string;
  invitedAt: string;
  joinedAt?: string;
  status: 'pending' | 'joined';
  permissions: CollaboratorPermissions;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
  roleTitle?: string;
  phone?: string;
  avatarUrl?: string;
  initials: string;
  color?: string;
  isCurrentUser?: boolean;
  status: 'active' | 'invited' | 'inactive';
  accessibleModulesCount?: number;
  permissions: {
    projects: boolean;
    actions: boolean;
    clients: boolean;
    suppliers: boolean;
    finance: boolean;
    deadlines: boolean;
    goals: boolean;
    budget: boolean;
    team: boolean;
    today?: boolean;
    leads?: boolean;
    health?: boolean;
    portfolio?: boolean;
  };
  joinedAt?: string;
}

export interface SupplierItem {
  id: string;
  name: string;
  tradeName?: string;
  category: string;
  contactPerson?: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  city?: string;
  address?: string;
  partnershipTerms?: string;
  rating: number;
  status: 'active' | 'evaluating' | 'inactive';
  notes?: string;
  isFavorite?: boolean;
  tags?: string[];
  createdAt: string;
}

export interface AppAction {
  id: string;
  type: string;
  area: 'Comercial' | 'Operação' | 'Financeiro';
  origin: 'Lead' | 'Cliente' | 'Projeto' | 'Interna';
  relatedId?: string;
  relatedTitle?: string;
  description: string;
  date: string;
  startDate?: string;
  endDate?: string;
  time?: string;
  effortHours?: number;
  effortMinutes?: number;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
  responsibleId?: string;
  responsibleName?: string;
  notes?: string;
  completedAt?: string;
  createdAt: string;
  isAppointment?: boolean;
}

// ==========================================
// CLIENT PORTAL (PORTAL DO CLIENTE) TYPES
// ==========================================

export type ClientProjectHealthStatus = 'no_prazo' | 'atencao' | 'atrasado' | 'concluido';

export interface ClientPortalStage {
  id: string;
  name: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  completedAt?: string;
  plannedDate?: string;
}

export interface ClientPortalProject {
  id: string;
  title: string;
  category?: string;
  description?: string;
  status: string;
  generalStatus: ClientProjectHealthStatus;
  currentStageName: string;
  currentStageIndex: number;
  progressPercent: number;
  stages: ClientPortalStage[];
  startDate: string;
  deliveryDate: string;
  contractTitle?: string;
  contractNumber?: string;
  contractStatus?: string;
  totalValue?: number;
  currency?: string;
}

export interface ClientPortalMessage {
  id: string;
  sender: 'office' | 'client';
  senderName: string;
  text: string;
  createdAt: string;
  read?: boolean;
}

export interface ClientPortalDocument {
  id: string;
  title: string;
  category: 'contrato' | 'relatorio' | 'entregavel' | 'planta' | 'outro';
  fileName: string;
  fileUrl?: string;
  date: string;
  size?: string;
}

export interface ClientPortalAccess {
  id: string; // Document ID
  officeUid: string;
  officeName: string;
  officeEmail?: string;
  officePhone?: string;
  officeLogo?: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  clientDocument?: string; // CPF or CNPJ
  accessCode: string; // Provisional password / access key
  status: 'active' | 'inactive';
  createdAt: string;
  lastLoginAt?: string;
  projects: ClientPortalProject[];
  messages: ClientPortalMessage[];
  documents: ClientPortalDocument[];
}



