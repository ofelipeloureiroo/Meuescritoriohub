import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  User,
  Plus,
  Pencil,
  Info,
  Check,
  X,
  Mail,
  Phone,
  Briefcase,
  CheckCircle2,
  Trash2,
  Lock,
  Copy,
  ExternalLink,
  Send,
  Sparkles,
  MessageCircle,
  Eye,
  RefreshCw,
  Key,
  Building2,
  Link as LinkIcon,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinanceContext';
import { TeamMember } from '../../types';

const INITIAL_TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'member_1',
    name: 'Laíne Paula Loureiro',
    email: 'laine@lparquitetura.com.br',
    role: 'admin',
    roleTitle: 'Arquiteta Titular & Sócia',
    initials: 'L',
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
    joinedAt: '2024-01-15',
  },
  {
    id: 'member_2',
    name: 'Maria Laura',
    email: 'marialaura@lparquitetura.com.br',
    role: 'member',
    roleTitle: 'Coordenadora de Projetos',
    initials: 'M',
    color: '#8c7456',
    isCurrentUser: false,
    status: 'active',
    accessibleModulesCount: 7,
    permissions: {
      projects: true,
      actions: true,
      clients: true,
      suppliers: true,
      finance: false,
      deadlines: true,
      goals: true,
      budget: false,
      team: false,
    },
    joinedAt: '2024-08-10',
  },
];

const MODULE_OPTIONS = [
  { key: 'today', label: 'Meu Dia & Agenda' },
  { key: 'actions', label: 'Central de Ações' },
  { key: 'leads', label: 'Leads Comercial' },
  { key: 'projects', label: 'Gestão de Projetos' },
  { key: 'suppliers', label: 'Fornecedores' },
  { key: 'team', label: 'Gestão de Equipe' },
  { key: 'clients', label: 'Clientes & Contratos' },
  { key: 'deadlines', label: 'Prazos & Cobranças' },
  { key: 'finance', label: 'Financeiro & Fluxo de Caixa' },
  { key: 'health', label: 'Saúde do Negócio' },
  { key: 'goals', label: 'Metas & Objetivos' },
  { key: 'budget', label: 'Orçamento & DRE' },
];

export const TeamTab: React.FC = () => {
  const { user, profile, updateCollaboratorPermissions, joinWithInviteCode } = useAuth();
  const { architectProfile } = useFinance();

  // Invite Code State
  const [inputInviteCode, setInputInviteCode] = useState('');
  const [isJoiningByCode, setIsJoiningByCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [joinMessage, setJoinMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [members, setMembers] = useState<TeamMember[]>(() => {
    const defaultOwner: TeamMember = {
      id: user?.uid || 'member_owner',
      name: architectProfile?.name || profile?.companyName || user?.displayName || 'LF Quadros & Decoração',
      email: user?.email || 'lfquadrosdecorativos@gmail.com',
      role: 'admin',
      roleTitle: 'Administrador / Gestor',
      initials: (user?.displayName || 'LF').substring(0, 2).toUpperCase(),
      color: '#b8a38b',
      isCurrentUser: true,
      status: 'active',
      accessibleModulesCount: 12,
      permissions: {
        today: true,
        actions: true,
        leads: true,
        projects: true,
        suppliers: true,
        team: true,
        clients: true,
        deadlines: true,
        finance: true,
        health: true,
        goals: true,
        budget: true,
      },
      joinedAt: new Date().toISOString().split('T')[0],
    };

    try {
      const saved = localStorage.getItem('meu_escritorio_equipe_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          Array.isArray(parsed) &&
          parsed.some(
            (m: any) =>
              m.id === 'member_1' ||
              m.id === 'member_2' ||
              m.name?.includes('Laíne') ||
              m.name?.includes('Maria Laura')
          )
        ) {
          localStorage.setItem('meu_escritorio_equipe_v1', JSON.stringify([defaultOwner]));
          return [defaultOwner];
        }
        return parsed;
      }
    } catch {
      // fallback
    }
    return [defaultOwner];
  });

  // Sync profile.collaborators into members state in real-time
  useEffect(() => {
    if (!profile?.collaborators || !Array.isArray(profile.collaborators)) return;

    setMembers((prev) => {
      let updated = [...prev];
      let hasChanges = false;

      profile.collaborators.forEach((collab) => {
        const existingIdx = updated.findIndex(
          (m) =>
            m.id === collab.uid ||
            (m.email && collab.email && m.email.toLowerCase() === collab.email.toLowerCase())
        );

        if (existingIdx >= 0) {
          const existing = updated[existingIdx];
          const mergedPerms = { ...existing.permissions, ...collab.permissions };
          if (JSON.stringify(existing.permissions) !== JSON.stringify(mergedPerms)) {
            updated[existingIdx] = {
              ...existing,
              permissions: mergedPerms,
              accessibleModulesCount: Object.values(mergedPerms).filter(Boolean).length,
            };
            hasChanges = true;
          }
        } else {
          // Add collaborator automatically when they joined by invite code
          const newMember: TeamMember = {
            id: collab.uid || `collab_${Date.now()}`,
            name: collab.email ? collab.email.split('@')[0] : 'Membro Colaborador',
            email: collab.email,
            roleTitle: 'Membro Colaborador',
            role: 'member',
            initials: (collab.email || 'MC').substring(0, 2).toUpperCase(),
            color: '#c58a4b',
            isCurrentUser: collab.uid === user?.uid,
            status: 'active',
            accessibleModulesCount: Object.values(collab.permissions || {}).filter(Boolean).length,
            permissions: {
              today: true,
              actions: true,
              leads: true,
              projects: true,
              suppliers: true,
              team: true,
              clients: true,
              deadlines: true,
              finance: false,
              health: false,
              goals: true,
              budget: false,
              ...(collab.permissions || {}),
            },
            joinedAt: collab.joinedAt || new Date().toISOString().split('T')[0],
          };
          updated.push(newMember);
          hasChanges = true;
        }
      });

      return hasChanges ? updated : prev;
    });
  }, [profile?.collaborators, user?.uid]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [isConfirmingMemberDelete, setIsConfirmingMemberDelete] = useState(false);

  // Invite Email Feedback Modal State
  const [inviteModalData, setInviteModalData] = useState<{
    isOpen: boolean;
    member: TeamMember | null;
    emailData?: {
      to: string;
      name: string;
      subject: string;
      html?: string;
      text?: string;
      accessUrl: string;
      mailtoUrl?: string;
    } | null;
    sentViaSmtp?: boolean;
    isNew?: boolean;
  }>({ isOpen: false, member: null });

  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [showHtmlPreview, setShowHtmlPreview] = useState(false);

  useEffect(() => {
    setIsConfirmingMemberDelete(false);
  }, [editingMember]);

  // Form states for Add / Edit
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRoleTitle, setFormRoleTitle] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRole, setFormRole] = useState<'admin' | 'member'>('member');
  const [formPermissions, setFormPermissions] = useState<TeamMember['permissions']>({
    today: true,
    actions: true,
    leads: true,
    projects: true,
    suppliers: true,
    team: true,
    clients: true,
    deadlines: true,
    finance: false,
    health: false,
    goals: true,
    budget: false,
  });

  useEffect(() => {
    try {
      localStorage.setItem('meu_escritorio_equipe_v1', JSON.stringify(members));
      window.dispatchEvent(new CustomEvent('team_updated'));
    } catch (e) {
      console.error('Failed to persist team members', e);
    }
  }, [members]);

  useEffect(() => {
    const handleTeamUpdated = () => {
      try {
        const saved = localStorage.getItem('meu_escritorio_equipe_v1');
        if (saved) {
          setMembers(JSON.parse(saved));
        }
      } catch {
        // fallback
      }
    };
    window.addEventListener('team_updated', handleTeamUpdated);
    window.addEventListener('storage', handleTeamUpdated);
    return () => {
      window.removeEventListener('team_updated', handleTeamUpdated);
      window.removeEventListener('storage', handleTeamUpdated);
    };
  }, []);

  const officeTitle =
    architectProfile?.name || profile?.companyName || user?.displayName || 'LF Quadros & Decoração';

  const handleSendInvite = async (member: TeamMember, isNew = false) => {
    setIsSendingInvite(true);
    setCopiedLink(false);
    setCopiedText(false);
    setShowHtmlPreview(false);

    const enabledModules = MODULE_OPTIONS
      .filter((m) => member.role === 'admin' || member.permissions[m.key as keyof TeamMember['permissions']])
      .map((m) => m.label);

    const accessUrl = window.location.origin;
    const sender = architectProfile?.name || profile?.companyName || user?.displayName || officeTitle;

    try {
      const res = await fetch('/api/team/invite-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberName: member.name,
          memberEmail: member.email,
          roleTitle: member.roleTitle,
          role: member.role,
          officeName: officeTitle,
          senderName: sender,
          accessUrl,
          modulesList: enabledModules,
        }),
      });

      const data = await res.json();

      setInviteModalData({
        isOpen: true,
        member,
        emailData: data.email || {
          to: member.email,
          name: member.name,
          subject: `🎉 Bem-vindo(a) à equipe de ${officeTitle}! Seu acesso ao Meu Escritório Online`,
          accessUrl,
          text: `Olá, ${member.name}!\n\nVocê agora faz parte oficial da equipe de ${officeTitle}!\n\nLink de acesso:\n${accessUrl}`,
        },
        sentViaSmtp: data.sentViaSmtp || false,
        isNew,
      });
    } catch (error) {
      console.error('Erro ao enviar e-mail de convite:', error);
      const subject = `🎉 Bem-vindo(a) à equipe de ${officeTitle}! Seu acesso ao Meu Escritório Online`;
      const text = `Olá, ${member.name}!\n\nVocê agora faz parte oficial da equipe de ${officeTitle}!\n\nCargo: ${member.roleTitle || 'Projetista'}\nLink de acesso: ${accessUrl}\n\nAgradecemos imensamente por fazer parte da nossa jornada!`;
      const mailtoUrl = `mailto:${member.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;

      setInviteModalData({
        isOpen: true,
        member,
        emailData: {
          to: member.email,
          name: member.name,
          subject,
          text,
          accessUrl,
          mailtoUrl,
        },
        sentViaSmtp: false,
        isNew,
      });
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleOpenAddModal = () => {
    setFormName('');
    setFormEmail('');
    setFormRoleTitle('Projetista');
    setFormPhone('');
    setFormRole('member');
    setFormPermissions({
      today: true,
      actions: true,
      leads: true,
      projects: true,
      suppliers: true,
      team: false,
      clients: true,
      deadlines: true,
      finance: false,
      health: false,
      goals: false,
      budget: false,
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (member: TeamMember) => {
    setEditingMember(member);
    setFormName(member.name);
    setFormEmail(member.email);
    setFormRoleTitle(member.roleTitle || '');
    setFormPhone(member.phone || '');
    setFormRole(member.role);
    setFormPermissions({ ...member.permissions });
  };

  const handleJoinOfficeByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputInviteCode.trim()) return;

    setIsJoiningByCode(true);
    setJoinMessage(null);

    try {
      const res = await joinWithInviteCode(inputInviteCode);
      if (res.success) {
        setJoinMessage({ text: res.message, type: 'success' });
        setInputInviteCode('');
      } else {
        setJoinMessage({ text: res.message, type: 'error' });
      }
    } catch (err: any) {
      setJoinMessage({ text: `Erro: ${err.message}`, type: 'error' });
    } finally {
      setIsJoiningByCode(false);
    }
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) return;

    const accessibleCount =
      formRole === 'admin'
        ? MODULE_OPTIONS.length
        : Object.values(formPermissions).filter(Boolean).length;

    if (editingMember) {
      const updatedMember: TeamMember = {
        ...editingMember,
        name: formName.trim(),
        email: formEmail.trim(),
        roleTitle: formRoleTitle.trim(),
        phone: formPhone.trim(),
        role: formRole,
        permissions: formPermissions,
        accessibleModulesCount: accessibleCount,
      };

      setMembers((prev) =>
        prev.map((m) => (m.id === editingMember.id ? updatedMember : m))
      );
      setEditingMember(null);

      // Save permissions to Firestore so collaborator profile updates in real-time
      if (updateCollaboratorPermissions) {
        await updateCollaboratorPermissions(updatedMember.id || updatedMember.email, formPermissions);
      }
    } else {
      const initials = formName
        .trim()
        .split(' ')
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

      const newMember: TeamMember = {
        id: `team_${Date.now()}`,
        name: formName.trim(),
        email: formEmail.trim(),
        roleTitle: formRoleTitle.trim() || 'Projetista',
        phone: formPhone.trim(),
        role: formRole,
        initials: initials || 'EQ',
        color: '#b8a38b',
        isCurrentUser: false,
        status: 'active',
        accessibleModulesCount: accessibleCount,
        permissions: formPermissions,
        joinedAt: new Date().toISOString().split('T')[0],
      };

      setMembers((prev) => [...prev, newMember]);
      setIsAddModalOpen(false);

      if (updateCollaboratorPermissions) {
        await updateCollaboratorPermissions(newMember.id || newMember.email, formPermissions);
      }

      // Automatically send welcome email with access link
      handleSendInvite(newMember, true);
    }
  };

  const handleDeleteMember = (id: string) => {
    if (confirm('Tem certeza que deseja remover este membro da equipe?')) {
      setMembers((prev) => prev.filter((m) => m.id !== id));
      setEditingMember(null);
    }
  };

  return (
    <div className="bg-[#fbf9f5] text-zinc-900 p-6 sm:p-8 rounded-3xl border border-[#ebe5dc] shadow-sm space-y-6 pb-16 max-w-5xl mx-auto animate-in fade-in duration-150">
      {/* Page Title & Subtitle */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight">
          Equipe
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Membros da equipe de {officeTitle}
        </p>
      </div>

      {/* Top Box: Office Info & Enterprise Plan Badge */}
      <div className="bg-white rounded-2xl border border-zinc-200/90 p-4 sm:p-5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-center text-zinc-600 shadow-xs">
            <Shield className="w-5 h-5 text-zinc-500" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-900 leading-tight">
              {officeTitle}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1.5">
              <span>Plano enterprise</span>
              <span>•</span>
              <span className="text-emerald-600 font-medium">Ativa</span>
            </p>
          </div>
        </div>
      </div>

      {/* Invite Code & Office Connection Box */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Box 1: Owner Share Office Code */}
        <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-xs flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Key className="w-4 h-4 text-[#8c7456]" />
              <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                Código do Escritório
              </h3>
            </div>
            <p className="text-xs text-zinc-500">
              Forneça este código aos membros da sua equipe para eles entrarem no seu escritório.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-zinc-100 border border-zinc-200 px-4 py-2 rounded-xl font-mono text-sm font-bold text-zinc-900 tracking-widest flex-1 text-center select-all">
              {profile?.inviteCode || 'CARLOS'}
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(profile?.inviteCode || '');
                setCopiedCode(true);
                setTimeout(() => setCopiedCode(false), 2000);
              }}
              className="px-3.5 py-2 bg-[#8c7456] hover:bg-[#786247] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedCode ? 'Copiado!' : 'Copiar'}</span>
            </button>
          </div>
        </div>

        {/* Box 2: Join Another Office By Code */}
        <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-xs flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                Entrar em Escritório por Código
              </h3>
            </div>
            <p className="text-xs text-zinc-500">
              Caso você seja colaborador, cole o código do escritório abaixo para vincular sua conta.
            </p>
          </div>

          <form onSubmit={handleJoinOfficeByCode} className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Ex: ABC123"
                maxLength={8}
                value={inputInviteCode}
                onChange={(e) => setInputInviteCode(e.target.value.toUpperCase())}
                className="bg-zinc-50 border border-zinc-200 px-3.5 py-2 rounded-xl text-xs text-zinc-800 font-mono tracking-widest uppercase focus:outline-none focus:border-[#8c7456] flex-1"
              />
              <button
                type="submit"
                disabled={isJoiningByCode || !inputInviteCode.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
              >
                {isJoiningByCode ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <LinkIcon className="w-3.5 h-3.5" />
                )}
                <span>Acessar</span>
              </button>
            </div>
            {joinMessage && (
              <p
                className={`text-[11px] font-medium ${
                  joinMessage.type === 'success' ? 'text-emerald-600' : 'text-red-500'
                }`}
              >
                {joinMessage.text}
              </p>
            )}
          </form>
        </div>
      </div>

      {/* Main Members Card (matching Image 2) */}
      <div className="bg-white rounded-3xl border border-zinc-200/90 shadow-xs overflow-hidden">
        {/* Card Header: Count & Add Button */}
        <div className="px-6 py-4.5 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-zinc-500" />
            <span className="text-sm font-bold text-zinc-800">
              {members.length} membros
            </span>
          </div>

          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 bg-[#b8a38b] hover:bg-[#a89178] text-white px-4 py-1.5 rounded-full text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar</span>
          </button>
        </div>

        {/* Member Rows */}
        <div className="divide-y divide-zinc-100">
          {members.map((member) => {
            const isOwner = member.isCurrentUser || member.role === 'admin';
            const modulesText =
              member.role === 'admin'
                ? 'Acesso total a todos os módulos'
                : `${member.accessibleModulesCount ?? 7} módulos com acesso`;

            return (
              <div
                key={member.id}
                className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-50/60 transition-colors"
              >
                {/* Left: Avatar & Names */}
                <div className="flex items-center gap-3.5">
                  <div className="relative">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-zinc-800 shadow-xs"
                      style={{ backgroundColor: '#c8b49e' }}
                    >
                      {member.initials}
                    </div>
                    {/* Verified badge if current user / admin */}
                    {member.isCurrentUser && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center ring-2 ring-white">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-zinc-900">
                        {member.name}
                      </span>
                      {member.isCurrentUser && (
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          Você
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {modulesText}
                    </p>
                  </div>
                </div>

                {/* Right: Role Badge & Action Buttons */}
                <div className="flex items-center gap-2.5 self-end sm:self-center">
                  {member.role === 'admin' ? (
                    <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50/80 border border-blue-200/80 px-3.5 py-1 rounded-full">
                      <Shield className="w-3 h-3 text-blue-600" />
                      <span>Admin</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 bg-zinc-100/90 border border-zinc-200 px-3.5 py-1 rounded-full">
                      <User className="w-3 h-3 text-zinc-500" />
                      <span>Membro</span>
                    </div>
                  )}

                  {/* Resend / Send Invite Email Button */}
                  <button
                    onClick={() => handleSendInvite(member, false)}
                    disabled={isSendingInvite}
                    className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-500 hover:text-[#8c7456] transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                    title="Enviar / Reenviar e-mail de boas-vindas com link de acesso"
                  >
                    {isSendingInvite && inviteModalData.member?.id === member.id ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#8c7456]" />
                    ) : (
                      <Mail className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {/* Edit Pencil Button */}
                  <button
                    onClick={() => handleOpenEditModal(member)}
                    className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800 transition-colors shadow-2xs cursor-pointer"
                    title="Editar permissões e dados"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Info Box: Sobre os papéis na empresa (matching Image 2) */}
      <div className="bg-white/80 rounded-2xl border border-zinc-200/90 p-4.5 flex items-start gap-3 shadow-xs">
        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-zinc-400">
          <Info className="w-4 h-4 text-zinc-500" />
        </div>
        <div className="space-y-1 text-xs">
          <h4 className="font-bold text-zinc-800">
            Sobre os papéis na empresa
          </h4>
          <p className="text-zinc-500 leading-relaxed">
            <strong className="text-zinc-700 font-semibold">Admin</strong> tem acesso total a todos os módulos e pode gerenciar a equipe. <strong className="text-zinc-700 font-semibold">Membros</strong> têm acesso apenas aos módulos configurados — clique no ícone de lápis para editar dados, papel e permissões de cada pessoa.
          </p>
        </div>
      </div>

      {/* Modal: Adicionar / Convidar Membro */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-zinc-200 p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#8c7456]" />
                <h3 className="font-bold text-sm text-zinc-900">
                  Adicionar membro à equipe
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Nome completo <span className="text-[#8c7456]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Ana Clara Martins"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-800 bg-white focus:outline-hidden focus:border-[#8c7456]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  E-mail de acesso <span className="text-[#8c7456]">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="ana@escritorio.com"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-800 bg-white focus:outline-hidden focus:border-[#8c7456]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Cargo / Função
                  </label>
                  <input
                    type="text"
                    value={formRoleTitle}
                    onChange={(e) => setFormRoleTitle(e.target.value)}
                    placeholder="Ex: Projetista"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-800 bg-white focus:outline-hidden focus:border-[#8c7456]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="(11) 99999-0000"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-800 bg-white focus:outline-hidden focus:border-[#8c7456]"
                  />
                </div>
              </div>

              {/* Papel na empresa */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Papel na empresa
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <div
                    onClick={() => setFormRole('member')}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                      formRole === 'member'
                        ? 'border-[#8c7456] bg-[#faf7f2]'
                        : 'border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-zinc-600" />
                      <span className="font-semibold text-xs text-zinc-800">Membro</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-1 leading-tight">
                      Acesso apenas aos módulos selecionados.
                    </p>
                  </div>

                  <div
                    onClick={() => setFormRole('admin')}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                      formRole === 'admin'
                        ? 'border-blue-500 bg-blue-50/40'
                        : 'border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-blue-600" />
                      <span className="font-semibold text-xs text-zinc-800">Admin</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-1 leading-tight">
                      Acesso total a todos os módulos e equipe.
                    </p>
                  </div>
                </div>
              </div>

              {/* Permissões por Módulo (quando membro) */}
              {formRole === 'member' && (
                <div className="space-y-1.5 pt-1">
                  <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    Módulos com acesso permitido
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-zinc-50/80 p-3 rounded-2xl border border-zinc-200">
                    {MODULE_OPTIONS.map((mod) => {
                      const isChecked = formPermissions[mod.key as keyof TeamMember['permissions']];
                      return (
                        <label
                          key={mod.key}
                          className="flex items-center gap-2 text-xs text-zinc-700 cursor-pointer select-none"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) =>
                              setFormPermissions((prev) => ({
                                ...prev,
                                [mod.key]: e.target.checked,
                              }))
                            }
                            className="rounded text-[#8c7456] focus:ring-[#8c7456]"
                          />
                          <span className="truncate">{mod.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-[#b8a38b] hover:bg-[#a89178] transition-colors cursor-pointer shadow-xs text-center"
                >
                  Salvar membro
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="py-2.5 px-4 rounded-xl text-xs font-semibold text-zinc-600 border border-zinc-200 hover:bg-zinc-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Membro & Permissões */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-zinc-200 p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-[#8c7456]" />
                <h3 className="font-bold text-sm text-zinc-900">
                  Editar permissões • {editingMember.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="p-1 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-800 bg-white focus:outline-hidden focus:border-[#8c7456]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Cargo / Função
                </label>
                <input
                  type="text"
                  value={formRoleTitle}
                  onChange={(e) => setFormRoleTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-800 bg-white focus:outline-hidden focus:border-[#8c7456]"
                />
              </div>

              {/* Papel */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Papel na empresa
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <div
                    onClick={() => setFormRole('member')}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                      formRole === 'member'
                        ? 'border-[#8c7456] bg-[#faf7f2]'
                        : 'border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-zinc-600" />
                      <span className="font-semibold text-xs text-zinc-800">Membro</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-1 leading-tight">
                      Acesso apenas aos módulos selecionados.
                    </p>
                  </div>

                  <div
                    onClick={() => setFormRole('admin')}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                      formRole === 'admin'
                        ? 'border-blue-500 bg-blue-50/40'
                        : 'border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-blue-600" />
                      <span className="font-semibold text-xs text-zinc-800">Admin</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-1 leading-tight">
                      Acesso total a todos os módulos e equipe.
                    </p>
                  </div>
                </div>
              </div>

              {/* Permissões */}
              {formRole === 'member' && (
                <div className="space-y-1.5 pt-1">
                  <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    Módulos com acesso permitido
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-zinc-50/80 p-3 rounded-2xl border border-zinc-200">
                    {MODULE_OPTIONS.map((mod) => {
                      const isChecked = formPermissions[mod.key as keyof TeamMember['permissions']];
                      return (
                        <label
                          key={mod.key}
                          className="flex items-center gap-2 text-xs text-zinc-700 cursor-pointer select-none"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) =>
                              setFormPermissions((prev) => ({
                                ...prev,
                                [mod.key]: e.target.checked,
                              }))
                            }
                            className="rounded text-[#8c7456] focus:ring-[#8c7456]"
                          />
                          <span className="truncate">{mod.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2 pt-3 border-t border-zinc-100">
                {!editingMember.isCurrentUser && (
                  isConfirmingMemberDelete ? (
                    <div className="flex items-center gap-1.5 animate-in fade-in zoom-in duration-100">
                      <button
                        type="button"
                        onClick={() => {
                          setMembers((prev) => prev.filter((m) => m.id !== editingMember.id));
                          setEditingMember(null);
                          setIsConfirmingMemberDelete(false);
                        }}
                        className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Confirmar Exclusão
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsConfirmingMemberDelete(false)}
                        className="px-2.5 py-1.5 rounded-xl text-[11px] font-medium text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsConfirmingMemberDelete(true)}
                      className="px-3 py-2 rounded-xl text-xs font-medium text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1.5 cursor-pointer animate-in fade-in duration-75"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remover</span>
                    </button>
                  )
                )}

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setEditingMember(null)}
                    className="py-2.5 px-4 rounded-xl text-xs font-semibold text-zinc-600 border border-zinc-200 hover:bg-zinc-50 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="py-2.5 px-5 rounded-xl text-xs font-bold text-white bg-[#b8a38b] hover:bg-[#a89178] transition-colors cursor-pointer shadow-xs"
                  >
                    Salvar alterações
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmação & Detalhes do E-mail de Boas-Vindas */}
      {inviteModalData.isOpen && inviteModalData.member && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-zinc-200 p-6 overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-2xs">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-zinc-900 leading-tight">
                    {inviteModalData.isNew ? 'Membro Adicionado & Convite Enviado!' : 'E-mail de Acesso & Boas-Vindas'}
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Notificação enviada para {inviteModalData.member.email}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInviteModalData({ isOpen: false, member: null })}
                className="p-1 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer rounded-lg hover:bg-zinc-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4 py-4 overflow-y-auto text-xs text-zinc-700 flex-1 pr-1">
              {/* Success notification banner */}
              <div className="bg-emerald-50/90 border border-emerald-200/80 rounded-2xl p-3.5 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold text-xs text-emerald-900">
                    {inviteModalData.sentViaSmtp
                      ? 'E-mail enviado via SMTP com sucesso!'
                      : 'E-mail de boas-vindas com link de acesso preparado!'}
                  </p>
                  <p className="text-[11px] text-emerald-700 leading-relaxed">
                    O convite foi registrado para <strong>{inviteModalData.member.name}</strong> ({inviteModalData.member.email}) com o cargo de <strong>{inviteModalData.member.roleTitle || 'Projetista'}</strong>.
                  </p>
                </div>
              </div>

              {/* Message Preview Box */}
              <div className="bg-[#faf7f2] border border-[#ebe3d7] rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#8c7456] uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Mensagem de Boas-Vindas & Agradecimento</span>
                </div>
                <p className="text-xs text-zinc-700 leading-relaxed italic bg-white/70 p-3 rounded-xl border border-[#ede5d8]">
                  "Olá, {inviteModalData.member.name}! É com imensa satisfação e alegria que comunicamos que você agora faz parte oficial da equipe de <strong>{officeTitle}</strong>! Agradecemos imensamente por sua dedicação e por se juntar à nossa jornada. Preparamos o ambiente de trabalho online para que seu dia a dia seja produtivo e organizado. Seja muito bem-vindo(a)!"
                </p>
              </div>

              {/* Direct Access Link Box with 1-Click Copy */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Link direto de acesso ao escritório
                </label>
                <div className="flex items-center gap-2 bg-zinc-50 p-2.5 rounded-xl border border-zinc-200">
                  <input
                    type="text"
                    readOnly
                    value={inviteModalData.emailData?.accessUrl || window.location.origin}
                    className="bg-transparent text-xs text-zinc-800 font-mono flex-1 outline-hidden select-all"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(inviteModalData.emailData?.accessUrl || window.location.origin);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2500);
                    }}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
                      copiedLink
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Quick Actions (WhatsApp, Mailto, Copy Text) */}
              <div className="space-y-1.5 pt-1">
                <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Ações Rápidas de Envio
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* WhatsApp Direct Share */}
                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                      `Olá ${inviteModalData.member.name}! 🎉 Você agora faz parte oficial da equipe de ${officeTitle}! Segue seu link de acesso à plataforma Meu Escritório Online: ${
                        inviteModalData.emailData?.accessUrl || window.location.origin
                      }\n\nAgradecemos imensamente por se juntar à nossa jornada!`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/60 text-emerald-800 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Enviar no WhatsApp</span>
                  </a>

                  {/* Mail Client (Gmail / Outlook) */}
                  <a
                    href={
                      inviteModalData.emailData?.mailtoUrl ||
                      `mailto:${inviteModalData.member.email}?subject=${encodeURIComponent(
                        `🎉 Bem-vindo(a) à equipe de ${officeTitle}! Seu acesso ao Meu Escritório Online`
                      )}&body=${encodeURIComponent(
                        inviteModalData.emailData?.text ||
                          `Olá, ${inviteModalData.member.name}!\n\nVocê agora faz parte oficial da equipe de ${officeTitle}!\nLink de acesso: ${window.location.origin}`
                      )}`
                    }
                    className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Abrir no App de E-mail</span>
                  </a>
                </div>

                {/* Copy Text Button */}
                <button
                  type="button"
                  onClick={() => {
                    const text =
                      inviteModalData.emailData?.text ||
                      `Olá, ${inviteModalData.member.name}!\n\nVocê agora faz parte oficial da equipe de ${officeTitle}!\n\nLink de acesso:\n${window.location.origin}\n\nAgradecemos imensamente por fazer parte da nossa jornada!`;
                    navigator.clipboard.writeText(text);
                    setCopiedText(true);
                    setTimeout(() => setCopiedText(false), 2500);
                  }}
                  className="w-full mt-2 py-2 px-3 rounded-xl border border-dashed border-zinc-300 hover:border-zinc-400 bg-white text-zinc-600 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedText ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-semibold">Texto completo copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Copiar texto completo da mensagem</span>
                    </>
                  )}
                </button>
              </div>

              {/* HTML Preview Toggle */}
              {inviteModalData.emailData?.html && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowHtmlPreview(!showHtmlPreview)}
                    className="text-[11px] text-[#8c7456] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3 h-3" />
                    <span>{showHtmlPreview ? 'Ocultar prévia do e-mail formatado' : 'Visualizar prévia visual do e-mail'}</span>
                  </button>

                  {showHtmlPreview && (
                    <div className="mt-2.5 p-3 rounded-2xl border border-zinc-200 bg-zinc-50 max-h-56 overflow-y-auto">
                      <div
                        className="bg-white rounded-xl shadow-xs overflow-hidden"
                        dangerouslySetInnerHTML={{ __html: inviteModalData.emailData.html }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-zinc-100 shrink-0 flex justify-end">
              <button
                type="button"
                onClick={() => setInviteModalData({ isOpen: false, member: null })}
                className="py-2.5 px-6 rounded-xl text-xs font-bold text-white bg-[#b8a38b] hover:bg-[#a89178] transition-colors cursor-pointer shadow-xs"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
