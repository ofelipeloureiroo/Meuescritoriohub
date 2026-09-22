import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';
import { TeamMember } from '../types';

export interface SimpleTeamMember {
  id: string;
  name: string;
  role?: string;
  roleTitle?: string;
  email?: string;
  hourlyRate?: number;
  isOwner?: boolean;
}

export function useTeamMembers(): {
  teamMembers: SimpleTeamMember[];
  fullTeamMembers: TeamMember[];
} {
  const { user, profile } = useAuth();
  const { architectProfile } = useFinance();

  const targetUid = user?.joinedOwnerUid || user?.uid || 'guest';

  const getMembersFromStorage = (): TeamMember[] => {
    const defaultOwnerName =
      architectProfile?.ownerName ||
      architectProfile?.name ||
      profile?.name ||
      profile?.companyName ||
      user?.displayName ||
      (user?.email ? user.email.split('@')[0] : 'Responsável do Escritório');
    const defaultOwnerEmail = user?.email || profile?.email || 'contato@escritorio.com';

    const initials = defaultOwnerName
      .split(' ')
      .filter(Boolean)
      .map((w: string) => w[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'RE';

    const defaultOwner: TeamMember = {
      id: 'member_owner',
      name: defaultOwnerName,
      email: defaultOwnerEmail,
      role: 'admin',
      roleTitle: 'Responsável do Escritório',
      hourlyRate: 150,
      initials: initials,
      color: '#b8a38b',
      isCurrentUser: true,
      status: 'active',
      accessibleModulesCount: 13,
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
        timetracker: true,
      },
      joinedAt: new Date().toISOString().split('T')[0],
    };

    try {
      const saved =
        localStorage.getItem(`meu_escritorio_equipe_v1_${targetUid}`) ||
        localStorage.getItem('meu_escritorio_equipe_v1');

      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          let hasOwner = false;
          const mapped = parsed.map((m: TeamMember) => {
            if (m.isCurrentUser || m.id === 'member_owner' || m.role === 'admin') {
              hasOwner = true;
              return {
                ...m,
                name: defaultOwnerName || m.name,
                email: defaultOwnerEmail || m.email,
                roleTitle: m.roleTitle || 'Responsável do Escritório',
              };
            }
            return m;
          });

          if (!hasOwner) {
            return [defaultOwner, ...mapped];
          }
          return mapped;
        }
      }
    } catch {}

    return [defaultOwner];
  };

  const [members, setMembers] = useState<TeamMember[]>(getMembersFromStorage);

  useEffect(() => {
    const handleUpdate = () => {
      const next = getMembersFromStorage();
      setMembers((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(next)) {
          return prev;
        }
        return next;
      });
    };

    handleUpdate();

    window.addEventListener('team_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('team_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [
    targetUid,
    architectProfile?.ownerName,
    architectProfile?.name,
    profile?.companyName,
    profile?.name,
    user?.displayName,
    user?.email,
  ]);

  const teamMembers = useMemo<SimpleTeamMember[]>(() => {
    const list: SimpleTeamMember[] = [];
    const seenNames = new Set<string>();

    members.forEach((m) => {
      const trimmedName = m.name?.trim();
      if (trimmedName && !seenNames.has(trimmedName.toLowerCase())) {
        seenNames.add(trimmedName.toLowerCase());
        list.push({
          id: m.id,
          name: trimmedName,
          role: m.role,
          roleTitle: m.roleTitle,
          email: m.email,
          hourlyRate: m.hourlyRate || 150,
          isOwner: m.isCurrentUser || m.id === 'member_owner' || m.role === 'admin',
        });
      }
    });

    if (profile?.collaborators) {
      profile.collaborators.forEach((c) => {
        const cName = (c.name || c.email?.split('@')[0] || 'Colaborador').trim();
        if (cName && !seenNames.has(cName.toLowerCase())) {
          seenNames.add(cName.toLowerCase());
          list.push({
            id: c.uid,
            name: cName,
            role: 'member',
            roleTitle: 'Membro da Equipe',
            email: c.email,
            isOwner: false,
          });
        }
      });
    }

    return list;
  }, [members, profile?.collaborators]);

  return { teamMembers, fullTeamMembers: members };
}
