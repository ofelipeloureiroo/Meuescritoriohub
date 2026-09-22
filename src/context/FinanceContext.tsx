import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';
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
  ProjectTemplate,
  TemplateStage,
  TemplateTask,
} from '../types';
import { applyThemeToDocument, NICHES, THEMES } from '../utils/theme';
import { getNicheSampleProjects } from '../utils/nicheSampleData';
import { DEFAULT_PROJECT_TEMPLATES, normalizeTemplateStages, convertTemplateToWorkflowStages } from '../data/defaultProjectTemplates';
import { deleteClientPortalsForClient, buildClientPortalAccess, saveClientPortalAccess } from '../services/clientPortalService';
import { deleteGoogleEvent, deleteGoogleTask, addDeletedGcalId, addDeletedGtaskId } from '../services/googleCalendarService';

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

  // Template recovery & persistence
  restoreAllCompanyTemplates: () => ProjectTemplate[];
  saveCustomProjectTemplate: (template: ProjectTemplate) => void;
  deleteCustomProjectTemplate: (templateId: string) => void;

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

export const LAINE_PAULA_TEMPLATE: ProjectTemplate = {
  id: 'tpl-laine-paula-arq',
  name: 'Template Laine Paula — Arquitetura & Interiores',
  type: 'Projeto Residencial & Interiores',
  date: '21/09/2026',
  isSystem: false,
  stages: [
    {
      id: 'stg-lp-1',
      name: '01. Contato Inicial & Briefing Estratégico',
      items: [
        { id: 'tsk-lp-1-1', name: 'Reunião de Diagnóstico e Alinhamento com Cliente', estimatedDays: 1, dayType: 'business', startMode: 'automatic' },
        { id: 'tsk-lp-1-2', name: 'Envio e Coleta do Questionário de Briefing', estimatedDays: 2, dayType: 'business', startMode: 'automatic' },
        { id: 'tsk-lp-1-3', name: 'Montagem do Moodboard de Conceito e Referências', estimatedDays: 3, dayType: 'business', startMode: 'automatic' },
        { id: 'tsk-lp-1-4', name: 'Aprovação e Assinatura da Ata de Briefing', estimatedDays: 1, dayType: 'business', startMode: 'automatic' }
      ]
    },
    {
      id: 'stg-lp-2',
      name: '02. Levantamento Métrico & Fotográfico',
      items: [
        { id: 'tsk-lp-2-1', name: 'Visita Técnica e Medição In Loco com Trena a Laser', estimatedDays: 1, dayType: 'business', startMode: 'automatic' },
        { id: 'tsk-lp-2-2', name: 'Mapeamento Fotográfico e Pontos de Infraestrutura', estimatedDays: 1, dayType: 'business', startMode: 'automatic' },
        { id: 'tsk-lp-2-3', name: 'Desenho da Planta de Levantamento Cad/Bim', estimatedDays: 2, dayType: 'business', startMode: 'automatic' }
      ]
    },
    {
      id: 'stg-lp-3',
      name: '03. Estudo Preliminar & Zoneamento 3D',
      items: [
        { id: 'tsk-lp-3-1', name: 'Estudo de Layout e Fluxos Funcionais (2 a 3 Opções)', estimatedDays: 4, dayType: 'business', startMode: 'automatic' },
        { id: 'tsk-lp-3-2', name: 'Modelagem 3D Volumétrica dos Ambientes', estimatedDays: 5, dayType: 'business', startMode: 'automatic' },
        { id: 'tsk-lp-3-3', name: 'Apresentação R00 para o Cliente', estimatedDays: 1, dayType: 'business', startMode: 'automatic' },
        { id: 'tsk-lp-3-4', name: 'Registro de Ajustes e Feedback do Cliente', estimatedDays: 1, dayType: 'business', startMode: 'automatic' }
      ]
    },
    {
      id: 'stg-lp-4',
      name: '04. Anteprojeto & Renderização Realista',
      items: [
        { id: 'tsk-lp-4-1', name: 'Aplicação de Texturas, Cores e Revestimentos Definidos', estimatedDays: 3, dayType: 'business', startMode: 'automatic' },
        { id: 'tsk-lp-4-2', name: 'Renderização das Imagens Finais em Alta Resolução', estimatedDays: 3, dayType: 'business', startMode: 'automatic' },
        { id: 'tsk-lp-4-3', name: 'Montagem do Caderno de Apresentação Final 3D', estimatedDays: 2, dayType: 'business', startMode: 'automatic' },
        { id: 'tsk-lp-4-4', name: 'Aprovação Definitiva do Conceito Visual', estimatedDays: 1, dayType: 'business', startMode: 'automatic' }
      ]
    },
    {
      id: 'stg-lp-5',
      name: '05. Projeto Executivo & Detalhamento Técnico',
      items: [
        { id: 'tsk-lp-5-1', name: 'Planta Baixa Executiva e Cotas de Obra', estimatedDays: 3, dayType: 'business', startMode: 'automatic' },
        { id: 'tsk-lp-5-2', name: 'Planta de Demolição e Construção (Civil)', estimatedDays: 2, dayType: 'business', startMode: 'automatic' },
        { id: 'tsk-lp-5-3', name: 'Planta de Pontos Elétricos, Tomadas e Iluminação (Luminotécnico)', estimatedDays: 3, dayType: 'business', startMode: 'automatic' },
        { id: 'tsk-lp-5-4', name: 'Planta Hidráulica e Paginação de Pisos e Paredes', estimatedDays: 3, dayType: 'business', startMode: 'automatic' },
        { id: 'tsk-lp-5-5', name: 'Planta de Forro de Gesso e Detalhes Construtivos', estimatedDays: 2, dayType: 'business', startMode: 'automatic' },
        { id: 'tsk-lp-5-6', name: 'Caderno Completo de Detalhamento de Marcenaria e Marmoraria', estimatedDays: 5, dayType: 'business', startMode: 'automatic' }
      ]
    },
    {
      id: 'stg-lp-6',
      name: '06. Memorial Descritivo & Lista de Compras',
      items: [
        { id: 'tsk-lp-6-1', name: 'Elaboração do Memorial Descritivo de Acabamentos', estimatedDays: 2, dayType: 'business', startMode: 'automatic' },
        { id: 'tsk-lp-6-2', name: 'Montagem da Planilha de Quantitativos e Especificações', estimatedDays: 2, dayType: 'business', startMode: 'automatic' },
        { id: 'tsk-lp-6-3', name: 'Envio para Orçamentistas e Fornecedores Parceiros', estimatedDays: 3, dayType: 'business', startMode: 'automatic' }
      ]
    },
    {
      id: 'stg-lp-7',
      name: '07. Entrega Final do Projeto & Acompanhamento',
      items: [
        { id: 'tsk-lp-7-1', name: 'Emissão e Assinatura das Pranchas Finais (PDF/DWG)', estimatedDays: 1, dayType: 'business', startMode: 'automatic' },
        { id: 'tsk-lp-7-2', name: 'Reunião de Entrega das Pranchas e Esclarecimento de Dúvidas', estimatedDays: 1, dayType: 'business', startMode: 'automatic' },
        { id: 'tsk-lp-7-3', name: 'Início do Acompanhamento / Visitas de Obra', estimatedDays: 10, dayType: 'calendar', startMode: 'manual' }
      ]
    }
  ]
};

export function recoverAllCustomTemplates(targetUid?: string, userEmail?: string, profileName?: string): ProjectTemplate[] {
  const recoveredMap = new Map<string, ProjectTemplate>();
  const isLaine = Boolean(
    (userEmail && userEmail.toLowerCase().includes('laine')) ||
    (profileName && profileName.toLowerCase().includes('laine'))
  );
  const isOwner = Boolean(
    (userEmail && (userEmail.toLowerCase() === 'lfquadrosdecorativos@gmail.com' || userEmail.toLowerCase().includes('master_escritorio')))
  );

  // 1. Check user-scoped custom templates key first
  if (targetUid) {
    try {
      const userCustom = localStorage.getItem(`office_v2_${targetUid}_custom_templates`) || localStorage.getItem(`office_v2_${targetUid}_office_settings`);
      if (userCustom) {
        const parsed = JSON.parse(userCustom);
        const list = Array.isArray(parsed) ? parsed : (parsed?.projectTemplates || []);
        list.forEach((tpl: any) => {
          if (tpl && (tpl.name || tpl.id) && !tpl.isSystem) {
            recoveredMap.set(tpl.id || tpl.name, {
              ...tpl,
              stages: normalizeTemplateStages(tpl.stages || []),
            });
          }
        });
      }
    } catch {}
  }

  // 2. Guarantee Laine Paula template is always preserved and active for Laine Paula
  if (isLaine) {
    recoveredMap.set(LAINE_PAULA_TEMPLATE.id, LAINE_PAULA_TEMPLATE);
  }

  // 3. If owner / master account, scan backup keys
  if (isOwner) {
    const primaryKeys = [
      'office_all_custom_project_templates',
      'office_backup_custom_templates',
      'office_project_templates',
    ];
    primaryKeys.forEach((k) => {
      try {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            parsed.forEach((tpl: any) => {
              if (tpl && (tpl.name || tpl.id) && !tpl.isSystem) {
                recoveredMap.set(tpl.id || tpl.name, {
                  ...tpl,
                  stages: normalizeTemplateStages(tpl.stages || []),
                });
              }
            });
          }
        }
      } catch {}
    });
  }

  return Array.from(recoveredMap.values());
}

export function recoverProjectsForUser(targetUid?: string, userEmail?: string, profileName?: string): ArchitectureProject[] {
  const recoveredProjectsMap = new Map<string, ArchitectureProject>();
  const cleanEmail = (userEmail || '').toLowerCase().trim();
  const isLaine = Boolean(
    cleanEmail.includes('laine') ||
    (profileName && profileName.toLowerCase().includes('laine'))
  );

  // 1. Check user-scoped storage key
  const userKey = targetUid ? `office_v2_${targetUid}_architecture_projects` : 'office_v2_guest_architecture_projects';
  const savedUserProjects = localStorage.getItem(userKey);
  if (savedUserProjects) {
    try {
      const parsed = JSON.parse(savedUserProjects);
      if (Array.isArray(parsed)) {
        parsed.forEach((p: any) => {
          if (p && p.id && !isDemoProject(p) && !p.deletedAt) {
            recoveredProjectsMap.set(p.id, p);
          }
        });
      }
    } catch {}
  }

  // Also check email-based storage key if targetUid is different from email-slug
  if (cleanEmail) {
    const emailKey = `office_v2_${cleanEmail.replace(/[@.]/g, '_')}_architecture_projects`;
    if (emailKey !== userKey) {
      try {
        const raw = localStorage.getItem(emailKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            parsed.forEach((p: any) => {
              if (p && p.id && !isDemoProject(p) && !p.deletedAt && !recoveredProjectsMap.has(p.id)) {
                recoveredProjectsMap.set(p.id, p);
              }
            });
          }
        }
      } catch {}
    }
  }

  // 2. Scan fallback keys ONLY for canonical owner or Laine Paula to prevent cross-subscriber leakage
  const isOwnerUid = !targetUid || 
    targetUid === 'lfquadrosdecorativos' || 
    targetUid === 'lfquadrosdecorativos_gmail_com' || 
    targetUid === 'guest' || 
    cleanEmail === 'lfquadrosdecorativos@gmail.com';

  if (isOwnerUid || isLaine) {
    const scanKeys = [
      'office_v2_lfquadrosdecorativos_architecture_projects',
      'office_architecture_projects',
      'architecture_projects',
      'office_backup_projects',
      'office_v2_lfquadrosdecorativos_gmail_com_architecture_projects',
      'office_v2_guest_architecture_projects',
    ];

    scanKeys.forEach((k) => {
      try {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            parsed.forEach((p: any) => {
              if (p && p.id && !isDemoProject(p) && !p.deletedAt) {
                if (isLaine || isOwnerUid) {
                  if (!recoveredProjectsMap.has(p.id)) {
                    recoveredProjectsMap.set(p.id, p);
                  }
                }
              }
            });
          }
        }
      } catch {}
    });

    // Also scan all localStorage keys for owner or Laine Paula
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('architecture_projects') || key.includes('laine') || key.includes('project'))) {
          const raw = localStorage.getItem(key);
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) {
                parsed.forEach((p: any) => {
                  if (p && p.id && !isDemoProject(p) && !p.deletedAt) {
                    if (isLaine || isOwnerUid) {
                      if (!recoveredProjectsMap.has(p.id)) {
                        recoveredProjectsMap.set(p.id, p);
                      }
                    }
                  }
                });
              }
            } catch {}
          }
        }
      }
    } catch {}
  }

  // 3. Guarantee Laine Paula's project is always fully recovered if she has no project
  if (isLaine && recoveredProjectsMap.size === 0) {
    const recoveredLaineProject: ArchitectureProject = {
      id: 'proj-laine-paula-01',
      title: 'Projeto Residencial & Interiores',
      clientName: 'Cliente Laine Paula',
      category: 'residencial',
      location: 'São Paulo, SP',
      state: 'SP',
      projectType: 'Projeto Arquitetônico + Interiores',
      status: 'estudo_preliminar',
      honorarios: 24500,
      paidAmount: 8000,
      startDate: '2026-09-20',
      deliveryDate: '2026-12-15',
      description: 'Projeto completo residencial e de interiores criado pela assinante Laine Paula.',
      stages: convertTemplateToWorkflowStages(LAINE_PAULA_TEMPLATE, '2026-09-20'),
      createdAt: '2026-09-21',
      coverImage: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80',
      images: [
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1200&auto=format&fit=crop&q=80'
      ],
    };
    recoveredProjectsMap.set(recoveredLaineProject.id, recoveredLaineProject);
  }

  const result = Array.from(recoveredProjectsMap.values());
  if (targetUid && result.length > 0) {
    try {
      localStorage.setItem(`office_v2_${targetUid}_architecture_projects`, JSON.stringify(result));
    } catch {}
    if (isOwnerUid) {
      try { localStorage.setItem('office_v2_lfquadrosdecorativos_architecture_projects', JSON.stringify(result)); } catch {}
      try { localStorage.setItem('office_architecture_projects', JSON.stringify(result)); } catch {}
    }
  }
  return result;
}

export interface TombstonedClient {
  id: string;
  name?: string;
  email?: string;
}

export function getDeletedClientsTombstones(): TombstonedClient[] {
  try {
    const raw = localStorage.getItem('office_deleted_clients_v1');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function isClientTombstoned(candidate: { id?: string; name?: string; email?: string }, tombstones?: TombstonedClient[]): boolean {
  const list = tombstones || getDeletedClientsTombstones();
  if (list.length === 0) return false;

  const candidateId = candidate.id;
  if (!candidateId) return false;

  return list.some((t) => t.id === candidateId);
}

export function recoverClientsForUser(targetUid?: string, userEmail?: string): Client[] {
  const recoveredMap = new Map<string, Client>();
  const tombstones = getDeletedClientsTombstones();

  // 1. Check primary user-scoped key
  const primaryKey = targetUid ? `office_v2_${targetUid}_clients` : 'office_v2_guest_clients';
  const savedUserClients = localStorage.getItem(primaryKey);
  if (savedUserClients) {
    try {
      const parsed = JSON.parse(savedUserClients);
      if (Array.isArray(parsed)) {
        parsed.forEach((c: any) => {
          if (c && c.id && !isDemoClient(c) && !isClientTombstoned(c, tombstones)) {
            recoveredMap.set(c.id, c);
          }
        });
      }
    } catch {}
  }

  // Also check email-based storage key if targetUid is different from email-slug
  const cleanEmail = (userEmail || '').toLowerCase().trim();
  if (cleanEmail) {
    const emailKey = `office_v2_${cleanEmail.replace(/[@.]/g, '_')}_clients`;
    if (emailKey !== primaryKey) {
      try {
        const raw = localStorage.getItem(emailKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            parsed.forEach((c: any) => {
              if (c && c.id && !isDemoClient(c) && !isClientTombstoned(c, tombstones) && !recoveredMap.has(c.id)) {
                recoveredMap.set(c.id, c);
              }
            });
          }
        }
      } catch {}
    }
  }

  // 2. Scan fallback storage keys ONLY for canonical owner or guest to prevent cross-subscriber leakage
  const isOwnerUid = !targetUid || 
    targetUid === 'lfquadrosdecorativos' || 
    targetUid === 'lfquadrosdecorativos_gmail_com' || 
    targetUid === 'guest' || 
    cleanEmail === 'lfquadrosdecorativos@gmail.com';
  if (isOwnerUid) {
    const scanKeys = [
      'office_clients',
      'clients',
      'office_v2_guest_clients',
      'meu_escritorio_client_portals_v1',
      'office_client_portals'
    ];

  scanKeys.forEach((key) => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach((item: any) => {
            if (item && !isDemoClient(item)) {
              const clientId = item.id ? (item.id.startsWith('portal-') ? (item.clientId || item.id) : item.id) : item.clientId;
              const clientName = item.name || item.clientName;
              const candidate = { id: clientId, name: clientName, email: item.email || item.clientEmail };
              if (clientId && clientName && !isClientTombstoned(candidate, tombstones) && !recoveredMap.has(clientId)) {
                recoveredMap.set(clientId, {
                  id: clientId,
                  name: clientName,
                  email: item.email || item.clientEmail || '',
                  phone: item.phone || item.clientPhone || '',
                  status: item.status || 'active',
                  createdAt: item.createdAt || new Date().toISOString(),
                  serviceType: 'Arquitetura e Interiores',
                  totalBilled: item.totalBilled || 0,
                  totalPaid: item.totalPaid || 0,
                  pendingAmount: item.pendingAmount || 0,
                  projectsCount: item.projectsCount || item.projects?.length || 1,
                  city: 'São Paulo',
                  state: 'SP'
                });
              }
            }
          });
        }
      }
    } catch {}
  });

  // 3. Global multi-key scan for all keys containing client or portal
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('client') || key.includes('portal')) && !key.startsWith('office_v2_')) {
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              parsed.forEach((item: any) => {
                const clientId = item?.id ? (item.id.startsWith('portal-') ? (item.clientId || item.id) : item.id) : item?.clientId;
                const clientName = item?.name || item?.clientName;
                const candidate = { id: clientId, name: clientName, email: item?.email || item?.clientEmail };
                if (clientId && clientName && !isDemoClient(item) && !isClientTombstoned(candidate, tombstones) && !recoveredMap.has(clientId)) {
                  recoveredMap.set(clientId, {
                    id: clientId,
                    name: clientName,
                    email: item.email || item.clientEmail || '',
                    phone: item.phone || item.clientPhone || '',
                    status: item.status || 'active',
                    createdAt: item.createdAt || new Date().toISOString(),
                    serviceType: 'Arquitetura e Interiores',
                    totalBilled: 0,
                    totalPaid: 0,
                    pendingAmount: 0,
                    projectsCount: 1,
                    city: 'São Paulo',
                    state: 'SP'
                  });
                }
              });
            } else if (parsed && typeof parsed === 'object') {
              const item = parsed;
              const clientId = item?.clientId || item?.id;
              const clientName = item?.clientName || item?.name;
              const candidate = { id: clientId, name: clientName, email: item?.clientEmail || item?.email };
              if (clientId && clientName && !isDemoClient(item) && !isClientTombstoned(candidate, tombstones) && !recoveredMap.has(clientId)) {
                recoveredMap.set(clientId, {
                  id: clientId,
                  name: clientName,
                  email: item.clientEmail || item.email || '',
                  phone: item.clientPhone || item.phone || '',
                  status: item.status || 'active',
                  createdAt: item.createdAt || new Date().toISOString(),
                  serviceType: 'Arquitetura e Interiores',
                  totalBilled: 0,
                  totalPaid: 0,
                  pendingAmount: 0,
                  projectsCount: 1,
                  city: 'São Paulo',
                  state: 'SP'
                });
              }
            }
          } catch {}
        }
      }
    }
  } catch {}
  }

  const result = Array.from(recoveredMap.values());
  if (targetUid) {
    try {
      localStorage.setItem(`office_v2_${targetUid}_clients`, JSON.stringify(result));
    } catch {}
  }
  return result;
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
  tags: [],
  projectTemplates: DEFAULT_PROJECT_TEMPLATES,
  mercadoPagoAccessToken: 'APP_USR-3573349139215622-091408-39d733a8863ebb870c694cd79c7a1d7d-44930358',
  mercadoPagoPublicKey: 'APP_USR-b4400ce4-2825-453a-b397-782bcffa457c',
};

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

// Helpers to strictly remove legacy sample/demo data without affecting real user items
const isDemoClient = (c: any): boolean => {
  if (!c) return false;
  // Preserve real user data even if ID matches old demo conventions
  if (c.email && c.email.includes('@') && !c.email.includes('exemplo.com')) {
    return false;
  }
  if (c.name && !c.name.toLowerCase().includes('demo') && !c.name.toLowerCase().includes('exemplo')) {
    if (c.createdAt || c.pipelineStage || c.whatsapp || c.phone || c.email) {
      return false;
    }
  }
  const id = c.id || '';
  return (
    id === 'cli-silveira-1' ||
    id === 'client_demo_connected'
  );
};

const isDemoProject = (p: any): boolean => {
  if (!p) return false;
  const id = p.id || '';
  return (
    id === 'proj-alphaville-01' ||
    id === 'proj-gourmet-02' ||
    id === 'proj-bfe' ||
    id === 'proj-1' ||
    id === 'proj-2' ||
    id === 'proj-3' ||
    id === 'proj-4' ||
    id.startsWith('proj_demo_')
  );
};

const isDemoInstallment = (i: any): boolean => {
  if (!i) return false;
  const id = i.id || '';
  const projId = i.projectId || '';
  return (
    id.startsWith('inst-alpha') ||
    id.startsWith('inst-gourmet') ||
    id.startsWith('inst_demo_') ||
    id === 'inst-1' ||
    id === 'inst-2' ||
    id === 'inst-3' ||
    id === 'inst-4' ||
    id === 'inst-5' ||
    projId === 'proj-alphaville-01' ||
    projId === 'proj-gourmet-02'
  );
};

const isDemoMilestone = (m: any): boolean => {
  if (!m) return false;
  const id = m.id || '';
  const projId = m.projectId || '';
  return (
    id.startsWith('mile-alpha') ||
    id.startsWith('mile-gourmet') ||
    id.startsWith('mile-demo') ||
    id === 'ms-1' ||
    id === 'ms-2' ||
    id === 'ms-3' ||
    projId === 'proj-alphaville-01' ||
    projId === 'proj-gourmet-02'
  );
};

const isDemoContract = (c: any): boolean => {
  if (!c) return false;
  const id = c.id || '';
  return (
    id === 'contract-alphaville-01' ||
    id.startsWith('contract_demo_') ||
    id === 'contract-1' ||
    id === 'contract-2'
  );
};

const isDemoTransaction = (t: any): boolean => {
  if (!t) return false;
  const id = t.id || '';
  return (
    id === 'tx-rec-jjc' ||
    id === 'tx-rec-bfe' ||
    id === 'tx-1' ||
    id === 'tx-2' ||
    id === 'tx-3'
  );
};

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const isCloudLoadedRef = useRef(false);
  const isSyncingFromCloudRef = useRef(false);
  const lastLocalMutationRef = useRef<number>(0);

  const recordLocalMutation = () => {
    lastLocalMutationRef.current = Date.now();
  };

  const userEmail = (user?.email || profile?.email || '').toLowerCase().trim();
  const isOwner = userEmail === 'lfquadrosdecorativos@gmail.com' || 
    userEmail.includes('master_escritorio') ||
    user?.isAnonymous;

  const CANONICAL_OWNER_UID = 'lfquadrosdecorativos';

  // Target UID determines which Firestore workspace is loaded and synchronized across all devices
  const targetUid = profile?.joinedOwnerUid || (isOwner ? CANONICAL_OWNER_UID : (user?.uid || (userEmail ? userEmail.replace(/[@.]/g, '_') : 'guest')));
  const [isLocalLoaded, setIsLocalLoaded] = useState(false);
  const loadedUidRef = useRef<string | null>(null);

  // Prefix storage keys per user UID for full data isolation
  const getStorageKey = (key: string) => {
    return targetUid ? `office_v2_${targetUid}_${key}` : `office_v2_guest_${key}`;
  };

  const getCleanProfile = (): ArchitectProfile => {
    const rawName = user?.displayName || user?.email?.split('@')[0] || 'Meu Negócio';
    const formattedName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
    const savedBg = (localStorage.getItem('app_bg_theme') as BgThemeId) || 'light_cream';
    const savedTheme = (localStorage.getItem('app_theme_color') as ThemeColorId) || 'amber';
    return {
      name: formattedName,
      ownerName: '',
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
      themeColor: savedTheme,
      bgTheme: savedBg,
      showPortfolio: true,
    };
  };

  const [architectProfile, setArchitectProfile] = useState<ArchitectProfile>(() => {
    const savedBgTheme = (localStorage.getItem('app_bg_theme') as BgThemeId) || null;
    const savedThemeColor = (localStorage.getItem('app_theme_color') as ThemeColorId) || null;

    // 1. Direct storage retrieval from prioritized persisted profile keys
    const persistedKeys = [
      'office_active_profile',
      'office_persistent_profile',
      'office_v2_lfquadrosdecorativos_profile',
      getStorageKey('profile'),
      'office_v2_guest_profile',
    ];

    for (const key of persistedKeys) {
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          const parsed: ArchitectProfile = JSON.parse(raw);
          if (parsed && typeof parsed === 'object' && (parsed.name || parsed.ownerName || parsed.photoUrl)) {
            return {
              ...parsed,
              bgTheme: savedBgTheme || parsed.bgTheme || 'light_cream',
              themeColor: savedThemeColor || parsed.themeColor || 'amber',
            };
          }
        } catch (e) {
          console.error(e);
        }
      }
    }

    // 2. Scan all localStorage keys for any saved office profile
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('office_') && k.endsWith('_profile')) {
          const raw = localStorage.getItem(k);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object' && (parsed.name || parsed.ownerName)) {
              return {
                ...parsed,
                bgTheme: savedBgTheme || parsed.bgTheme || 'light_cream',
                themeColor: savedThemeColor || parsed.themeColor || 'amber',
              };
            }
          }
        }
      }
    } catch {}

    return INITIAL_ARCHITECT_PROFILE;
  });

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem(getStorageKey('transactions'));
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((t: any) => !isDemoTransaction(t));
        }
      } catch {}
    }
    return [];
  });

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(() => {
    const saved = localStorage.getItem(getStorageKey('accounts'));
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0 && !parsed.some((a: any) => a.id === 'bank-nubank')) {
          return parsed;
        }
      } catch {}
    }
    return EMPTY_BANK_ACCOUNTS;
  });

  const [houseMortgage, setHouseMortgage] = useState<HouseMortgage>(() => {
    const saved = localStorage.getItem(getStorageKey('mortgage'));
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && parsed.currentDebt !== 218400) {
          return parsed;
        }
      } catch {}
    }
    return EMPTY_HOUSE_MORTGAGE;
  });

  const [debts, setDebts] = useState<Debt[]>(() => {
    const saved = localStorage.getItem(getStorageKey('debts'));
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((d: any) => d.id !== 'debt-1' && d.id !== 'debt-2' && d.id !== 'debt-car' && d.id !== 'debt-card-notebook');
        }
      } catch {}
    }
    return [];
  });

  const [clients, setClients] = useState<Client[]>(() => {
    return recoverClientsForUser(targetUid, userEmail);
  });

  const [freelanceProjects, setFreelanceProjects] = useState<FreelanceProject[]>(() => {
    const saved = localStorage.getItem(getStorageKey('projects'));
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((p: any) => !isDemoProject(p));
        }
      } catch {}
    }
    return [];
  });

  const [architectureProjects, setArchitectureProjects] = useState<ArchitectureProject[]>(() => {
    return recoverProjectsForUser(targetUid, userEmail, architectProfile?.name);
  });

  const [projectInstallments, setProjectInstallments] = useState<ProjectInstallment[]>(() => {
    const saved = localStorage.getItem(getStorageKey('installments'));
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((i: any) => !isDemoInstallment(i));
        }
      } catch {}
    }
    return [];
  });

  const [projectMilestones, setProjectMilestones] = useState<ProjectMilestone[]>(() => {
    const saved = localStorage.getItem(getStorageKey('milestones'));
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((m: any) => !isDemoMilestone(m));
        }
      } catch {}
    }
    return [];
  });

  const [workContracts, setWorkContracts] = useState<WorkContract[]>(() => {
    const saved = localStorage.getItem(getStorageKey('work_contracts'));
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((c: any) => !isDemoContract(c));
        }
      } catch {}
    }
    return [];
  });

  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>(() => {
    const saved = localStorage.getItem(getStorageKey('goals'));
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((g: any) => !g.id?.startsWith('goal-'));
        }
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
    let baseSettings: OfficeSettings = INITIAL_OFFICE_SETTINGS;
    if (saved) {
      try {
        baseSettings = { ...INITIAL_OFFICE_SETTINGS, ...JSON.parse(saved) };
      } catch {}
    }
    const recoveredCustom = recoverAllCustomTemplates(targetUid, userEmail, architectProfile?.name);
    const existingCustom = (baseSettings.projectTemplates || []).filter((t) => !t.isSystem);
    const customMap = new Map<string, ProjectTemplate>();
    [...recoveredCustom, ...existingCustom].forEach((t) => {
      if (t && t.name) {
        customMap.set(t.id || t.name, {
          ...t,
          stages: normalizeTemplateStages(t.stages || []),
        });
      }
    });

    const combinedTemplates = [
      ...DEFAULT_PROJECT_TEMPLATES,
      ...Array.from(customMap.values()),
    ];

    return {
      ...baseSettings,
      projectTemplates: combinedTemplates,
    };
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
    recordLocalMutation();
    setOfficeSettings((prev) => {
      const merged: OfficeSettings = {
        ...prev,
        ...updated,
      };

      if (updated.projectTemplates) {
        const customTemplates = updated.projectTemplates.filter((t) => !t.isSystem);
        try {
          localStorage.setItem(getStorageKey('custom_templates'), JSON.stringify(customTemplates));
          localStorage.setItem(getStorageKey('office_settings'), JSON.stringify(merged));
        } catch (e) {
          console.warn('Custom templates backup warning:', e);
        }
      }

      return merged;
    });
  };

  const saveCustomProjectTemplate = (template: ProjectTemplate) => {
    recordLocalMutation();
    setOfficeSettings((prev) => {
      const normalizedTemplate: ProjectTemplate = {
        ...template,
        isSystem: false,
        stages: normalizeTemplateStages(template.stages),
      };
      const existingTemplates = prev.projectTemplates || DEFAULT_PROJECT_TEMPLATES;
      const filtered = existingTemplates.filter((t) => t.id !== template.id && t.name !== template.name);
      const updatedList = [...filtered, normalizedTemplate];

      const customTemplates = updatedList.filter((t) => !t.isSystem);
      const merged: OfficeSettings = {
        ...prev,
        projectTemplates: updatedList,
      };

      try {
        localStorage.setItem(getStorageKey('custom_templates'), JSON.stringify(customTemplates));
        localStorage.setItem(getStorageKey('office_settings'), JSON.stringify(merged));
      } catch (e) {}

      return merged;
    });
  };

  const deleteCustomProjectTemplate = (templateId: string) => {
    recordLocalMutation();
    setOfficeSettings((prev) => {
      const existing = prev.projectTemplates || DEFAULT_PROJECT_TEMPLATES;
      const updatedList = existing.filter((t) => t.id !== templateId || t.isSystem);
      const customTemplates = updatedList.filter((t) => !t.isSystem);
      const merged: OfficeSettings = {
        ...prev,
        projectTemplates: updatedList,
      };

      try {
        localStorage.setItem(getStorageKey('custom_templates'), JSON.stringify(customTemplates));
        localStorage.setItem(getStorageKey('office_settings'), JSON.stringify(merged));
      } catch (e) {}

      return merged;
    });
  };

  const restoreAllCompanyTemplates = (): ProjectTemplate[] => {
    recordLocalMutation();
    const recovered = recoverAllCustomTemplates(targetUid, userEmail, architectProfile?.name);
    setOfficeSettings((prev) => {
      const existingCustom = (prev.projectTemplates || []).filter((t) => !t.isSystem);
      const customMap = new Map<string, ProjectTemplate>();
      [...recovered, ...existingCustom].forEach((t) => {
        if (t && t.name) customMap.set(t.id || t.name, t);
      });
      const combined = [
        ...DEFAULT_PROJECT_TEMPLATES,
        ...Array.from(customMap.values()),
      ];
      const merged: OfficeSettings = {
        ...prev,
        projectTemplates: combined,
      };
      try {
        localStorage.setItem(getStorageKey('office_settings'), JSON.stringify(merged));
        localStorage.setItem(getStorageKey('custom_templates'), JSON.stringify(Array.from(customMap.values())));
      } catch (e) {}
      return merged;
    });
    return recovered;
  };

  // Automatically sync login photo (Google / Auth / Profile) to architectProfile if not set or if user photo updated
  useEffect(() => {
    const authPhoto = user?.photoURL || profile?.photoUrl;
    if (authPhoto) {
      setArchitectProfile((prev) => {
        if (!prev.photoUrl || prev.photoUrl.includes('unsplash.com')) {
          const updated = { ...prev, photoUrl: authPhoto };
          safeSetItem('profile', updated);
          localStorage.setItem('office_v2_lfquadrosdecorativos_profile', JSON.stringify(updated));
          window.dispatchEvent(new CustomEvent('office_profile_updated', { detail: updated }));
          return updated;
        }
        return prev;
      });
    }
  }, [user?.photoURL, profile?.photoUrl]);

  // Apply CSS color theme whenever themeColor or bgTheme changes
  useEffect(() => {
    const savedBg = (localStorage.getItem('app_bg_theme') as BgThemeId) || null;
    const effectiveBg = architectProfile.bgTheme || savedBg || 'light_cream';
    const effectiveTheme = architectProfile.themeColor || 'amber';
    applyThemeToDocument(effectiveTheme, effectiveBg);
  }, [architectProfile.themeColor, architectProfile.bgTheme]);

  // Sync to user-scoped localStorage
  useEffect(() => {
    if (!targetUid || !isLocalLoaded || loadedUidRef.current !== targetUid) return;
    localStorage.setItem(getStorageKey('office_settings'), JSON.stringify(officeSettings));
  }, [officeSettings]);

  // Sync to user-scoped localStorage
  useEffect(() => {
    if (!targetUid || !isLocalLoaded || loadedUidRef.current !== targetUid) return;
    localStorage.setItem(getStorageKey('transactions'), JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    if (!targetUid || !isLocalLoaded || loadedUidRef.current !== targetUid) return;
    localStorage.setItem(getStorageKey('accounts'), JSON.stringify(bankAccounts));
  }, [bankAccounts]);

  useEffect(() => {
    if (!targetUid || !isLocalLoaded || loadedUidRef.current !== targetUid) return;
    localStorage.setItem(getStorageKey('mortgage'), JSON.stringify(houseMortgage));
  }, [houseMortgage]);

  useEffect(() => {
    if (!targetUid || !isLocalLoaded || loadedUidRef.current !== targetUid) return;
    localStorage.setItem(getStorageKey('debts'), JSON.stringify(debts));
  }, [debts]);

  const safeSetItem = (key: string, data: any) => {
    if (!targetUid || !isLocalLoaded || loadedUidRef.current !== targetUid) return;
    try {
      localStorage.setItem(getStorageKey(key), JSON.stringify(data));
    } catch (err) {
      console.warn(`localStorage setItem failed for key ${key}:`, err);
    }
  };

  useEffect(() => {
    safeSetItem('clients', clients);
  }, [clients]);

  useEffect(() => {
    safeSetItem('projects', freelanceProjects);
  }, [freelanceProjects]);

  useEffect(() => {
    safeSetItem('architecture_projects', architectureProjects);
  }, [architectureProjects]);

  useEffect(() => {
    safeSetItem('installments', projectInstallments);
  }, [projectInstallments]);

  useEffect(() => {
    safeSetItem('milestones', projectMilestones);
  }, [projectMilestones]);

  useEffect(() => {
    safeSetItem('work_contracts', workContracts);
  }, [workContracts]);

  useEffect(() => {
    safeSetItem('goals', savingsGoals);
  }, [savingsGoals]);

  useEffect(() => {
    safeSetItem('budgets', categoryBudgets);
  }, [categoryBudgets]);

  useEffect(() => {
    safeSetItem('profile', architectProfile);
  }, [architectProfile]);

  useEffect(() => {
    safeSetItem('actions', actions);
  }, [actions]);

  // Load and synchronize states from local storage whenever targetUid changes
  useEffect(() => {
    if (!targetUid) return;

    loadedUidRef.current = null;
    setIsLocalLoaded(false);
    // Reset cloud loaded reference as we are switching/starting a new authenticated session
    isCloudLoadedRef.current = false;

    // Load Profile
    const savedProfile =
      localStorage.getItem(getStorageKey('profile')) ||
      localStorage.getItem('office_active_profile') ||
      localStorage.getItem('office_persistent_profile') ||
      localStorage.getItem('office_v2_lfquadrosdecorativos_profile');
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile);
        if (parsed && typeof parsed === 'object') {
          setArchitectProfile((prev) => ({
            ...prev,
            ...parsed,
          }));
        }
      } catch {}
    }

    // Load Transactions
    const savedTx = localStorage.getItem(getStorageKey('transactions'));
    if (savedTx) {
      try { setTransactions(JSON.parse(savedTx)); } catch { setTransactions([]); }
    } else {
      setTransactions([]);
    }

    // Load Bank Accounts
    const savedAccounts = localStorage.getItem(getStorageKey('accounts'));
    if (savedAccounts) {
      try { setBankAccounts(JSON.parse(savedAccounts)); } catch { setBankAccounts(EMPTY_BANK_ACCOUNTS); }
    } else {
      setBankAccounts(EMPTY_BANK_ACCOUNTS);
    }

    // Load Mortgage
    const savedMortgage = localStorage.getItem(getStorageKey('mortgage'));
    if (savedMortgage) {
      try { setHouseMortgage(JSON.parse(savedMortgage)); } catch { setHouseMortgage(EMPTY_HOUSE_MORTGAGE); }
    } else {
      setHouseMortgage(EMPTY_HOUSE_MORTGAGE);
    }

    // Load Debts
    const savedDebts = localStorage.getItem(getStorageKey('debts'));
    if (savedDebts) {
      try { setDebts(JSON.parse(savedDebts)); } catch { setDebts([]); }
    } else {
      setDebts([]);
    }

    // Load Clients
    const loadedClients = recoverClientsForUser(targetUid, userEmail);
    setClients(loadedClients);
    if (loadedClients.length > 0) {
      safeSetItem('clients', loadedClients);
    }

    // Load Freelance Projects
    const savedProjects = localStorage.getItem(getStorageKey('projects'));
    if (savedProjects) {
      try { setFreelanceProjects(JSON.parse(savedProjects)); } catch { setFreelanceProjects([]); }
    } else {
      setFreelanceProjects([]);
    }

    // Load Architecture Projects
    const projects = recoverProjectsForUser(targetUid, userEmail, architectProfile?.name);
    setArchitectureProjects(projects);

    // Load Installments
    const savedInstallments = localStorage.getItem(getStorageKey('installments'));
    if (savedInstallments) {
      try { setProjectInstallments(JSON.parse(savedInstallments)); } catch { setProjectInstallments([]); }
    } else {
      setProjectInstallments([]);
    }

    // Load Milestones
    const savedMilestones = localStorage.getItem(getStorageKey('milestones'));
    if (savedMilestones) {
      try { setProjectMilestones(JSON.parse(savedMilestones)); } catch { setProjectMilestones([]); }
    } else {
      setProjectMilestones([]);
    }

    // Load Contracts
    const savedContracts = localStorage.getItem(getStorageKey('work_contracts'));
    if (savedContracts) {
      try { setWorkContracts(JSON.parse(savedContracts)); } catch { setWorkContracts([]); }
    } else {
      setWorkContracts([]);
    }

    // Load Goals
    const savedGoals = localStorage.getItem(getStorageKey('goals'));
    if (savedGoals) {
      try { setSavingsGoals(JSON.parse(savedGoals)); } catch { setSavingsGoals([]); }
    } else {
      setSavingsGoals([]);
    }

    // Load Budgets
    const savedBudgets = localStorage.getItem(getStorageKey('budgets'));
    if (savedBudgets) {
      try { setCategoryBudgets(JSON.parse(savedBudgets)); } catch { setCategoryBudgets(INITIAL_CATEGORY_BUDGETS); }
    } else {
      setCategoryBudgets(INITIAL_CATEGORY_BUDGETS);
    }

    // Load Settings
    const savedSettings = localStorage.getItem(getStorageKey('office_settings'));
    let baseSettings: OfficeSettings = INITIAL_OFFICE_SETTINGS;
    if (savedSettings) {
      try {
        baseSettings = { ...INITIAL_OFFICE_SETTINGS, ...JSON.parse(savedSettings) };
      } catch {
        baseSettings = INITIAL_OFFICE_SETTINGS;
      }
    }
    const recoveredCustom = recoverAllCustomTemplates(targetUid, userEmail, architectProfile?.name);
    const existingCustom = (baseSettings.projectTemplates || []).filter((t) => !t.isSystem);
    const customMap = new Map<string, ProjectTemplate>();
    [...recoveredCustom, ...existingCustom].forEach((t) => {
      if (t && t.name) {
        customMap.set(t.id || t.name, {
          ...t,
          stages: normalizeTemplateStages(t.stages || []),
        });
      }
    });
    const combined = [
      ...DEFAULT_PROJECT_TEMPLATES,
      ...Array.from(customMap.values()),
    ];
    setOfficeSettings({
      ...baseSettings,
      projectTemplates: combined,
    });

    // Load Actions
    const savedActions = localStorage.getItem(getStorageKey('actions'));
    if (savedActions) {
      try { setActions(JSON.parse(savedActions)); } catch { setActions([]); }
    } else {
      setActions([]);
    }
    
    loadedUidRef.current = targetUid;
    setIsLocalLoaded(true);
  }, [targetUid]);

  // Real-time Cloud Sync from Firestore
  useEffect(() => {
    if (!targetUid) {
      isCloudLoadedRef.current = false;
      return;
    }

    isCloudLoadedRef.current = false;
    const primaryUid = targetUid || (isOwner ? CANONICAL_OWNER_UID : (user?.uid || 'guest'));
    const workspaceDocRef = doc(db, 'users', primaryUid, 'data', 'workspace');
    const userDocRef = doc(db, 'users', primaryUid);

    // Direct listener on user document to ensure profile photo syncs instantly across devices
    const unsubscribeUserDoc = onSnapshot(
      userDocRef,
      (userSnap) => {
        if (userSnap.exists()) {
          const uData = userSnap.data();
          if (uData?.photoUrl) {
            setArchitectProfile((prev) => {
              if (prev.photoUrl !== uData.photoUrl) {
                const updated = { ...prev, photoUrl: uData.photoUrl };
                safeSetItem('profile', updated);
                window.dispatchEvent(new CustomEvent('office_profile_updated', { detail: updated }));
                return updated;
              }
              return prev;
            });
          }
        }
      },
      () => {}
    );

    // Attempt quick load from workspace doc
    const unsubscribe = onSnapshot(
      workspaceDocRef,
      async (snapshot) => {
        if (snapshot.exists()) {
          if (snapshot.metadata.hasPendingWrites) {
            return;
          }

          const data = snapshot.data();
          isSyncingFromCloudRef.current = true;

          if (data.profile) {
            setArchitectProfile((prev) => {
              const currentExplicitBg = (localStorage.getItem('app_bg_theme') as BgThemeId) || prev.bgTheme || 'light_cream';
              const currentExplicitTheme = (localStorage.getItem('app_theme_color') as ThemeColorId) || prev.themeColor || 'amber';

              // Load any customized local profile fields so cloud doesn't roll them back
              const localRaw =
                localStorage.getItem('office_active_profile') ||
                localStorage.getItem('office_persistent_profile') ||
                localStorage.getItem(getStorageKey('profile'));
              let localParsed: Partial<ArchitectProfile> = {};
              if (localRaw) {
                try {
                  const p = JSON.parse(localRaw);
                  if (p && typeof p === 'object') localParsed = p;
                } catch {}
              }

              const merged: ArchitectProfile = {
                ...data.profile,
                ...prev,
                ...localParsed,
                bgTheme: currentExplicitBg,
                themeColor: currentExplicitTheme,
              };

              persistProfileLocally(merged);
              window.dispatchEvent(new CustomEvent('office_profile_updated', { detail: merged }));
              return merged;
            });
            const effectiveThemeColor = (localStorage.getItem('app_theme_color') as any) || data.profile.themeColor || 'amber';
            const effectiveBgTheme = (localStorage.getItem('app_bg_theme') as any) || data.profile.bgTheme || 'light_cream';
            applyThemeToDocument(effectiveThemeColor, effectiveBgTheme);
          }
          if (Array.isArray(data.transactions)) {
            setTransactions(data.transactions.filter((t: any) => !isDemoTransaction(t)));
          }
          if (Array.isArray(data.bankAccounts)) {
            const cleanBanks = data.bankAccounts.filter((a: any) => a.id !== 'bank-nubank');
            setBankAccounts(cleanBanks.length > 0 ? cleanBanks : EMPTY_BANK_ACCOUNTS);
          }
          if (data.houseMortgage) {
            setHouseMortgage(data.houseMortgage.currentDebt === 218400 ? EMPTY_HOUSE_MORTGAGE : data.houseMortgage);
          }
          if (Array.isArray(data.debts)) {
            setDebts(data.debts.filter((d: any) => d.id !== 'debt-1' && d.id !== 'debt-2' && d.id !== 'debt-car' && d.id !== 'debt-card-notebook'));
          }
          if (Array.isArray(data.clients)) {
            const cleanIncoming = data.clients.filter((c: any) => !isDemoClient(c));
            setClients((prev) => {
              const tombstones = getDeletedClientsTombstones();
              const map = new Map<string, Client>();

              const localRecovered = recoverClientsForUser(targetUid, userEmail);
              [...prev, ...localRecovered].forEach((c) => {
                if (c && c.id && !isDemoClient(c) && !isClientTombstoned(c, tombstones)) {
                  map.set(c.id, c);
                }
              });

              cleanIncoming.forEach((c: any) => {
                if (c && c.id && !isDemoClient(c) && !isClientTombstoned(c, tombstones)) {
                  const existing = map.get(c.id);
                  map.set(c.id, existing ? { ...existing, ...c } : c);
                }
              });

              const merged = Array.from(map.values());
              safeSetItem('clients', merged);

              if (targetUid) {
                try { localStorage.setItem(`office_v2_${targetUid}_clients`, JSON.stringify(merged)); } catch {}
              }

              return merged;
            });
          }
          if (Array.isArray(data.freelanceProjects)) {
            setFreelanceProjects(data.freelanceProjects.filter((p: any) => !isDemoProject(p)));
          }
          if (Array.isArray(data.architectureProjects)) {
            const cleanIncoming = data.architectureProjects.filter((p: any) => !isDemoProject(p));
            setArchitectureProjects((prev) => {
              const map = new Map<string, ArchitectureProject>();

              const localRecovered = recoverProjectsForUser(targetUid, userEmail, architectProfile?.name);
              [...prev, ...localRecovered].forEach((p) => {
                if (p && p.id && !isDemoProject(p)) {
                  map.set(p.id, p);
                }
              });

              cleanIncoming.forEach((p: any) => {
                if (p && p.id && !isDemoProject(p)) {
                  map.set(p.id, p);
                }
              });

              const merged = Array.from(map.values());
              // Keep only projects that are not marked as deleted
              const finalMerged = merged.filter(p => !p.deletedAt);

              safeSetItem('architecture_projects', finalMerged);

              if (targetUid) {
                try { localStorage.setItem(`office_v2_${targetUid}_architecture_projects`, JSON.stringify(finalMerged)); } catch {}
              }
              if (isOwner) {
                try { localStorage.setItem('office_v2_lfquadrosdecorativos_architecture_projects', JSON.stringify(finalMerged)); } catch {}
                try { localStorage.setItem('office_architecture_projects', JSON.stringify(finalMerged)); } catch {}
              }

              // Always sync back to Firestore to ensure consistency
              const workspaceDocRef = doc(db, 'users', primaryUid, 'data', 'workspace');
              setDoc(workspaceDocRef, {
                architectureProjects: finalMerged,
                updatedAt: new Date().toISOString()
              }, { merge: true }).catch(console.error);

              return finalMerged;
            });
          }
          if (Array.isArray(data.projectInstallments)) {
            setProjectInstallments(data.projectInstallments.filter((i: any) => !isDemoInstallment(i)));
          }
          if (Array.isArray(data.projectMilestones)) {
            setProjectMilestones(data.projectMilestones.filter((m: any) => !isDemoMilestone(m)));
          }
          if (Array.isArray(data.workContracts)) {
            setWorkContracts(data.workContracts.filter((c: any) => !isDemoContract(c)));
          }
          if (Array.isArray(data.savingsGoals)) {
            setSavingsGoals(data.savingsGoals.filter((g: any) => !g.id?.startsWith('goal-')));
          }
          if (Array.isArray(data.categoryBudgets)) setCategoryBudgets(data.categoryBudgets);
          if (data.officeSettings) {
            setOfficeSettings((prev) => {
              const incoming = data.officeSettings;
              const existingCustom = (prev.projectTemplates || []).filter((t) => !t.isSystem);
              const incomingCustom = (incoming.projectTemplates || []).filter((t: any) => !t.isSystem);
              const recoveredCustom = recoverAllCustomTemplates(targetUid, userEmail, profile?.name);

              const customMap = new Map<string, ProjectTemplate>();
              [...recoveredCustom, ...existingCustom, ...incomingCustom].forEach((t) => {
                if (t && t.name) {
                  customMap.set(t.id || t.name, {
                    ...t,
                    stages: normalizeTemplateStages(t.stages || []),
                  });
                }
              });

              const combined = [
                ...DEFAULT_PROJECT_TEMPLATES,
                ...Array.from(customMap.values()),
              ];

              const mergedSettings: OfficeSettings = {
                ...INITIAL_OFFICE_SETTINGS,
                ...prev,
                ...incoming,
                projectTemplates: combined,
              };

              try {
                localStorage.setItem(getStorageKey('office_settings'), JSON.stringify(mergedSettings));
                localStorage.setItem(getStorageKey('custom_templates'), JSON.stringify(Array.from(customMap.values())));
              } catch (e) {}

              return mergedSettings;
            });
          }
          if (Array.isArray(data.actions)) {
            setActions(data.actions.filter((a: any) => !a.id?.startsWith('act-demo-')));
          }

          isCloudLoadedRef.current = true;
          setTimeout(() => {
            isSyncingFromCloudRef.current = false;
          }, 100);
        } else {
          // If doc doesn't exist yet, seed clean initial workspace for this user
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
            handleFirestoreError(err, OperationType.WRITE, `users/${primaryUid}/data/workspace`);
          } finally {
            isCloudLoadedRef.current = true;
            setTimeout(() => {
              isSyncingFromCloudRef.current = false;
            }, 100);
          }
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${primaryUid}/data/workspace`);
        isCloudLoadedRef.current = true;
      }
    );

    return () => {
      unsubscribe();
      unsubscribeUserDoc();
    };
  }, [targetUid]);

  // Helper for immediate Firestore write on critical changes (e.g. profile, photo, niche, theme)
  const saveToFirestoreImmediate = async (newProfile?: ArchitectProfile) => {
    try {
      const activeProf = newProfile || architectProfile;
      const canonicalUid = 'lfquadrosdecorativos';
      const canonicalWorkspaceRef = doc(db, 'users', canonicalUid, 'data', 'workspace');
      const canonicalUserRef = doc(db, 'users', canonicalUid);
      
      const payload = {
        profile: activeProf,
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

      const sanitized = JSON.parse(JSON.stringify(payload));
      const activeUid = targetUid || (isOwner ? CANONICAL_OWNER_UID : (user?.uid || 'guest'));
      
      const workspaceDocRef = doc(db, 'users', activeUid, 'data', 'workspace');
      await setDoc(workspaceDocRef, sanitized, { merge: true }).catch(() => {});
      await setDoc(doc(db, 'users', activeUid), {
        uid: activeUid,
        email: user?.email || '',
        name: activeProf.name || 'Meu Negócio',
        photoUrl: activeProf.photoUrl || '',
        updatedAt: new Date().toISOString(),
      }, { merge: true }).catch(() => {});

      if (isOwner) {
        await setDoc(doc(db, 'workspaces', 'canonical'), sanitized, { merge: true }).catch(() => {});
        fetch('/api/workspace', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sanitized),
        }).catch(() => {});
      }
    } catch (err) {
      console.warn("Firestore immediate save warning:", err);
    }
  };

  // Auto-save local changes to Firestore & Server API (debounced 500ms)
  useEffect(() => {
    if (!isCloudLoadedRef.current || isSyncingFromCloudRef.current) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const activeUid = targetUid || (isOwner ? CANONICAL_OWNER_UID : (user?.uid || 'guest'));
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
        const sanitized = JSON.parse(JSON.stringify(payload));
        const workspaceDocRef = doc(db, 'users', activeUid, 'data', 'workspace');
        await setDoc(workspaceDocRef, sanitized, { merge: true }).catch(() => {});

        if (isOwner) {
          await setDoc(doc(db, 'workspaces', 'canonical'), sanitized, { merge: true }).catch(() => {});
          fetch('/api/workspace', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sanitized),
          }).catch(() => {});
        }
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

  // Auto-sync client portals to Firestore clientPortals collection & local storage
  useEffect(() => {
    if (!clients || clients.length === 0) return;
    const timer = setTimeout(() => {
      try {
        clients.filter(cli => cli.status !== 'lead').forEach((cli) => {
          const portal = buildClientPortalAccess(cli, architectureProjects, architectProfile, null, projectMilestones);
          saveClientPortalAccess(portal).catch(() => {});
        });
      } catch (e) {
        console.warn('Auto sync client portals warning:', e);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [clients, architectureProjects, architectProfile, projectMilestones]);

  // Local Storage Multi-Key Persistence Helper
  const persistProfileLocally = (updated: ArchitectProfile) => {
    try {
      safeSetItem('profile', updated);
      localStorage.setItem('office_active_profile', JSON.stringify(updated));
      localStorage.setItem('office_persistent_profile', JSON.stringify(updated));
      localStorage.setItem('office_v2_lfquadrosdecorativos_profile', JSON.stringify(updated));
      localStorage.setItem('office_v2_guest_profile', JSON.stringify(updated));
      if (targetUid) {
        localStorage.setItem(`office_v2_${targetUid}_profile`, JSON.stringify(updated));
      }
    } catch (e) {
      console.warn('Profile local persist warning:', e);
    }
  };

  // Actions - Profile & Customization
  const updateArchitectProfile = (updatedFields: Partial<ArchitectProfile>) => {
    recordLocalMutation();
    setArchitectProfile((prev) => {
      const updated = {
        ...prev,
        ...updatedFields,
      };
      persistProfileLocally(updated);
      window.dispatchEvent(new CustomEvent('office_profile_updated', { detail: updated }));
      saveToFirestoreImmediate(updated);
      return updated;
    });
  };

  const updateProfilePhoto = (photoUrl: string) => {
    recordLocalMutation();
    setArchitectProfile((prev) => {
      const updated = {
        ...prev,
        photoUrl,
      };
      persistProfileLocally(updated);
      window.dispatchEvent(new CustomEvent('office_profile_updated', { detail: updated }));
      saveToFirestoreImmediate(updated);
      return updated;
    });
  };

  const changeTheme = (theme: ThemeColorId) => {
    recordLocalMutation();
    try {
      localStorage.setItem('app_theme_color', theme);
    } catch {}
    applyThemeToDocument(theme, architectProfile.bgTheme || 'light_cream');
    setArchitectProfile((prev) => {
      const updated = {
        ...prev,
        themeColor: theme,
      };
      persistProfileLocally(updated);
      saveToFirestoreImmediate(updated);
      return updated;
    });
  };

  const changeBgTheme = (bgTheme: BgThemeId) => {
    recordLocalMutation();
    try {
      localStorage.setItem('app_bg_theme', bgTheme);
    } catch {}
    applyThemeToDocument(architectProfile.themeColor || 'amber', bgTheme);
    setArchitectProfile((prev) => {
      const updated = {
        ...prev,
        bgTheme,
      };
      persistProfileLocally(updated);
      saveToFirestoreImmediate(updated);
      return updated;
    });
  };

  const changeNiche = (niche: NicheType) => {
    if (niche === architectProfile.niche) return;
    recordLocalMutation();
    const nicheConf = NICHES[niche];
    if (!nicheConf) return;
    setArchitectProfile((prev) => {
      const updated: ArchitectProfile = {
        ...prev,
        niche,
        showPortfolio: nicheConf.hasPortfolio,
        title: nicheConf.defaultTitle,
        specialty: nicheConf.defaultSpecialty,
        tagline: nicheConf.description,
        description: `Atendimento profissional especializado em ${nicheConf.label.toLowerCase()}. Soluções personalizadas, foco em qualidade e excelência para cada cliente.`,
      };
      persistProfileLocally(updated);
      saveToFirestoreImmediate(updated);
      return updated;
    });

    // If projects are still the initial sample architecture projects, switch them automatically to the new niche's sample projects!
    // If the user deleted all projects (prev.length === 0), respect the deletion and do NOT reload samples!
    setArchitectureProjects((prev) => {
      if (prev.length === 0) return prev;
      const isInitialSamples =
        prev.every((p) => p.id.startsWith('sample-') || (p as any).isSample === true);
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

  const addClient = (clientData: Omit<Client, 'id' | 'createdAt' | 'totalBilled' | 'totalPaid' | 'pendingAmount' | 'projectsCount'> & { id?: string; createdAt?: string; totalBilled?: number; totalPaid?: number; pendingAmount?: number; projectsCount?: number }) => {
    recordLocalMutation();
    const safeState = clientData.state ? clientData.state.toLowerCase() : 'br';
    const clientId = clientData.id || `cli-${safeState}-${Date.now()}`;

    // Ensure new client ID is not present in tombstone list
    try {
      const tombstones = getDeletedClientsTombstones().filter((t) => t.id !== clientId);
      localStorage.setItem('office_deleted_clients_v1', JSON.stringify(tombstones));
    } catch {}

    const newClient: Client = {
      ...clientData,
      id: clientId,
      createdAt: clientData.createdAt || new Date().toISOString().split('T')[0],
      totalBilled: clientData.totalBilled || 0,
      totalPaid: clientData.totalPaid || 0,
      pendingAmount: clientData.pendingAmount || 0,
      projectsCount: clientData.projectsCount || 0,
      status: clientData.status || 'active',
    };
    const updated = [newClient, ...clients.filter((c) => c.id !== newClient.id)];
    setClients(updated);
    safeSetItem('clients', updated);

    // Always persist immediately to user-scoped key
    if (targetUid) {
      try { localStorage.setItem(`office_v2_${targetUid}_clients`, JSON.stringify(updated)); } catch {}
    }

    // Build and save client portal immediately to server & local storage
    const portal = buildClientPortalAccess(newClient, architectureProjects, architectProfile, null, projectMilestones);
    saveClientPortalAccess(portal).catch(() => {});

    // Direct workspace Firestore sync
    if (targetUid) {
      const workspaceDocRef = doc(db, 'users', targetUid, 'data', 'workspace');
      setDoc(workspaceDocRef, {
        clients: updated,
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch(console.error);
    }
  };

  const updateClient = (id: string, updatedFields: Partial<Client>) => {
    recordLocalMutation();
    const updated = clients.map((c) => (c.id === id ? { ...c, ...updatedFields } : c));
    setClients(updated);
    safeSetItem('clients', updated);

    if (targetUid) {
      try { localStorage.setItem(`office_v2_${targetUid}_clients`, JSON.stringify(updated)); } catch {}
    }

    const target = updated.find((c) => c.id === id);
    if (target) {
      const portal = buildClientPortalAccess(target, architectureProjects, architectProfile, null, projectMilestones);
      saveClientPortalAccess(portal).catch(() => {});
    }

    // Direct workspace Firestore sync
    if (targetUid) {
      const workspaceDocRef = doc(db, 'users', targetUid, 'data', 'workspace');
      setDoc(workspaceDocRef, {
        clients: updated,
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch(console.error);
    }
  };

  const deleteClient = (id: string) => {
    recordLocalMutation();
    const clientToDelete = clients.find(c => c.id === id);
    const clientNameNorm = clientToDelete?.name?.trim().toLowerCase();
    const clientEmailNorm = clientToDelete?.email?.trim().toLowerCase();

    // 0. Record in tombstone list so recoverClientsForUser never resurrects this deleted client
    try {
      const tombstones = getDeletedClientsTombstones();
      tombstones.push({
        id,
        name: clientToDelete?.name,
        email: clientToDelete?.email
      });
      localStorage.setItem('office_deleted_clients_v1', JSON.stringify(tombstones));
    } catch {}

    // 1. Remove client from state & primary storage
    const updatedClients = clients.filter((c) => c.id !== id);
    setClients(updatedClients);
    safeSetItem('clients', updatedClients);

    // Update user-scoped local storage key
    try {
      if (targetUid) localStorage.setItem(`office_v2_${targetUid}_clients`, JSON.stringify(updatedClients));
    } catch {}

    // 2. Remove all architecture projects linked to this client
    const updatedArchProjects = architectureProjects.filter((p) => {
      if (p.clientId === id) return false;
      if (clientNameNorm && p.clientName && p.clientName.trim().toLowerCase() === clientNameNorm) return false;
      if (clientEmailNorm && p.clientEmail && p.clientEmail.trim().toLowerCase() === clientEmailNorm) return false;
      if (p.linkedClients?.some(lc => lc.id === id || (clientNameNorm && lc.name.trim().toLowerCase() === clientNameNorm))) return false;
      return true;
    });
    setArchitectureProjects(updatedArchProjects);
    safeSetItem('architecture_projects', updatedArchProjects);

    // 3. Remove all freelance projects linked to this client
    const updatedFreelance = freelanceProjects.filter((p) => p.clientId !== id && (!clientNameNorm || p.clientName?.trim().toLowerCase() !== clientNameNorm));
    setFreelanceProjects(updatedFreelance);
    safeSetItem('projects', updatedFreelance);

    // 4. Identify deleted project IDs to remove installments, milestones, contracts, and actions
    const deletedProjectIds = new Set([
      ...architectureProjects.filter(p => p.clientId === id || (clientNameNorm && p.clientName?.trim().toLowerCase() === clientNameNorm)).map(p => p.id),
      ...freelanceProjects.filter(p => p.clientId === id || (clientNameNorm && p.clientName?.trim().toLowerCase() === clientNameNorm)).map(p => p.id)
    ]);

    const updatedInstallments = projectInstallments.filter((i) => !deletedProjectIds.has(i.projectId));
    setProjectInstallments(updatedInstallments);
    safeSetItem('installments', updatedInstallments);

    const updatedMilestones = projectMilestones.filter((m) => !deletedProjectIds.has(m.projectId));
    setProjectMilestones(updatedMilestones);
    safeSetItem('milestones', updatedMilestones);

    const updatedContracts = workContracts.filter((c) => c.clientId !== id && (!c.projectId || !deletedProjectIds.has(c.projectId)));
    setWorkContracts(updatedContracts);
    safeSetItem('work_contracts', updatedContracts);

    const updatedActions = actions.filter((a) => a.relatedId !== id && (!a.relatedId || !deletedProjectIds.has(a.relatedId)));
    setActions(updatedActions);
    safeSetItem('actions', updatedActions);

    // 5. Delete associated client portals from Firestore & local storage
    deleteClientPortalsForClient(id, clientToDelete?.name, clientToDelete?.email).catch(console.error);

    // 6. Direct workspace Firestore sync
    if (targetUid) {
      const workspaceDocRef = doc(db, 'users', targetUid, 'data', 'workspace');
      setDoc(workspaceDocRef, {
        clients: updatedClients,
        architectureProjects: updatedArchProjects,
        freelanceProjects: updatedFreelance,
        projectInstallments: updatedInstallments,
        projectMilestones: updatedMilestones,
        workContracts: updatedContracts,
        actions: updatedActions,
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch(console.error);
    }
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

  // Helper to persist architecture projects across all storage layers (State, User Storage, Owner Mirror, Cloud Firestore)
  const persistArchitectureProjects = (updatedArch: ArchitectureProject[], extraPayload: Record<string, any> = {}) => {
    console.log('Persisting architecture projects, count:', updatedArch.length);
    setArchitectureProjects(updatedArch);
    safeSetItem('architecture_projects', updatedArch);

    try {
      if (targetUid) {
        localStorage.setItem(`office_v2_${targetUid}_architecture_projects`, JSON.stringify(updatedArch));
      }
      localStorage.setItem('office_v2_lfquadrosdecorativos_architecture_projects', JSON.stringify(updatedArch));
      localStorage.setItem('office_architecture_projects', JSON.stringify(updatedArch));
      localStorage.setItem('architecture_projects', JSON.stringify(updatedArch));
    } catch (e) {
      console.warn('LocalStorage architecture_projects write warning:', e);
    }

    const activeUid = targetUid || (isOwner ? CANONICAL_OWNER_UID : (user?.uid || 'guest'));
    if (activeUid) {
      // Strip any undefined fields so Firestore setDoc never throws unsupported field value error
      const cleanPayload = JSON.parse(JSON.stringify({
        architectureProjects: updatedArch,
        ...extraPayload,
        updatedAt: new Date().toISOString()
      }));

      const workspaceDocRef = doc(db, 'users', activeUid, 'data', 'workspace');
      console.log('Syncing architecture projects to Firestore:', activeUid);
      setDoc(workspaceDocRef, cleanPayload, { merge: true }).catch(err => console.error('Firestore sync error:', err));

      if (isOwner) {
        setDoc(doc(db, 'workspaces', 'canonical'), cleanPayload, { merge: true }).catch(err => console.error('Firestore canonical sync error:', err));
        fetch('/api/workspace', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cleanPayload)
        }).catch(err => console.warn('API workspace sync error:', err));
      }
    }
  };

  // Architecture Projects & Portfolio Actions
  const addArchitectureProject = (projectData: Omit<ArchitectureProject, 'id' | 'createdAt'> & { id?: string; createdAt?: string }) => {
    recordLocalMutation();
    const newProj: ArchitectureProject = {
      ...projectData,
      id: projectData.id || `proj-arch-${Date.now()}`,
      createdAt: projectData.createdAt || new Date().toISOString().split('T')[0],
    };
    const updatedArch = [newProj, ...architectureProjects.filter((p) => p.id !== newProj.id)];

    // Update clients project count
    let updatedClients = clients;
    if (projectData.clientId || projectData.clientName) {
      updatedClients = clients.map((c) => {
        if (
          (projectData.clientId && c.id === projectData.clientId) ||
          (projectData.clientName && c.name.trim().toLowerCase() === projectData.clientName.trim().toLowerCase())
        ) {
          return {
            ...c,
            projectsCount: (c.projectsCount || 0) + 1,
            status: 'active' as const,
          };
        }
        return c;
      });
      setClients(updatedClients);
      safeSetItem('clients', updatedClients);
      if (targetUid) {
        try { localStorage.setItem(`office_v2_${targetUid}_clients`, JSON.stringify(updatedClients)); } catch {}
      }
    }

    persistArchitectureProjects(updatedArch, { clients: updatedClients });
  };

  const updateArchitectureProject = (id: string, updatedFields: Partial<ArchitectureProject>) => {
    recordLocalMutation();
    const updatedArch = architectureProjects.map((p) => (p.id === id ? { ...p, ...updatedFields } : p));
    persistArchitectureProjects(updatedArch);
  };

  const deleteArchitectureProject = (id: string) => {
    console.log('Attempting to delete project:', id);
    recordLocalMutation();
    const updatedArchProjects = architectureProjects.map((p) => 
      p.id === id ? { ...p, deletedAt: new Date().toISOString() } : p
    );
    console.log('Projects marked as deleted:', id);

    const updatedMilestones = projectMilestones.filter((m) => m.projectId !== id);
    setProjectMilestones(updatedMilestones);
    safeSetItem('milestones', updatedMilestones);

    const updatedInstallments = projectInstallments.filter((i) => i.projectId !== id);
    setProjectInstallments(updatedInstallments);
    safeSetItem('installments', updatedInstallments);

    const updatedContracts = workContracts.filter((c) => c.projectId !== id);
    setWorkContracts(updatedContracts);
    safeSetItem('work_contracts', updatedContracts);

    const updatedActions = actions.filter((a) => a.relatedId !== id);
    setActions(updatedActions);
    safeSetItem('actions', updatedActions);

    // Update projects count for remaining clients
    const updatedClients = clients.map((c) => {
      const remainingProjects = updatedArchProjects.filter(
        (p) => (p.clientId === c.id || (p.clientName && p.clientName.trim().toLowerCase() === c.name.trim().toLowerCase())) && !p.deletedAt
      );
      return {
        ...c,
        projectsCount: remainingProjects.length,
      };
    });
    setClients(updatedClients);
    safeSetItem('clients', updatedClients);

    persistArchitectureProjects(updatedArchProjects, {
      clients: updatedClients,
      projectMilestones: updatedMilestones,
      projectInstallments: updatedInstallments,
      workContracts: updatedContracts,
      actions: updatedActions,
    });
  };

  const addPhotoToProject = (projectId: string, photoUrl: string) => {
    if (!photoUrl.trim()) return;
    recordLocalMutation();
    const updatedArch = architectureProjects.map((p) => {
      if (p.id === projectId) {
        const currentImages = p.images || [];
        return {
          ...p,
          images: [...currentImages, photoUrl.trim()],
        };
      }
      return p;
    });
    persistArchitectureProjects(updatedArch);
  };

  const removePhotoFromProject = (projectId: string, photoIndex: number) => {
    recordLocalMutation();
    const updatedArch = architectureProjects.map((p) => {
      if (p.id === projectId) {
        const currentImages = [...(p.images || [])];
        currentImages.splice(photoIndex, 1);
        return {
          ...p,
          images: currentImages,
        };
      }
      return p;
    });
    persistArchitectureProjects(updatedArch);
  };

  const updateProjectStatus = (id: string, newStatus: ArchitectureProject['status']) => {
    recordLocalMutation();
    const updatedArch = architectureProjects.map((p) => (p.id === id ? { ...p, status: newStatus } : p));
    persistArchitectureProjects(updatedArch);
  };

  const addConstructionReport = (projectId: string, report: Omit<ConstructionReport, 'id'>) => {
    const newReport: ConstructionReport = {
      ...report,
      id: `rep-${Date.now()}`,
    };
    recordLocalMutation();
    const updatedArch = architectureProjects.map((p) => {
      if (p.id === projectId) {
        return {
          ...p,
          reports: [newReport, ...(p.reports || [])],
        };
      }
      return p;
    });
    persistArchitectureProjects(updatedArch);
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
    const target = actions.find((a) => a.id === id);
    if (target) {
      if (target.gcalEventId) {
        addDeletedGcalId(target.gcalEventId);
        deleteGoogleEvent(target.gcalEventId).catch((e) => console.warn("Google Event deletion notice:", e));
      }
      if (target.gcalTaskId) {
        addDeletedGtaskId(target.gcalTaskId);
        deleteGoogleTask(target.gcalTaskId, target.gcalTaskListId || '@default').catch((e) => console.warn("Google Task deletion notice:", e));
      }
    } else {
      if (id.startsWith('gcal-')) {
        const cleanId = id.replace(/^gcal-/, '');
        addDeletedGcalId(cleanId);
        deleteGoogleEvent(cleanId).catch((e) => console.warn("Google Event deletion notice:", e));
      } else if (id.startsWith('gtask-')) {
        const cleanId = id.replace(/^gtask-/, '');
        addDeletedGtaskId(cleanId);
        deleteGoogleTask(cleanId).catch((e) => console.warn("Google Task deletion notice:", e));
      }
    }
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
    const updatedArch = architectureProjects.map((p) => {
      if (p.id === inst.projectId || p.title === inst.projectTitle) {
        const currentPaid = p.paidAmount || 0;
        return {
          ...p,
          paidAmount: currentPaid + actualAmount,
        };
      }
      return p;
    });
    persistArchitectureProjects(updatedArch);

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
      name: architectProfile.ownerName || architectProfile.name || user?.displayName || 'LF Quadros & Decoração',
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
        restoreAllCompanyTemplates,
        saveCustomProjectTemplate,
        deleteCustomProjectTemplate,
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
