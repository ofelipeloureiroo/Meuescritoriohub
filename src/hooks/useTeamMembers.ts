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
}

export function useTeamMembers(): {
  teamMembers: SimpleTeamMember[];
  fullTeamMembers: TeamMember[];
} {
  const { user, profile } = useAuth();
  const { architectProfile } = useFinance();

  const getMembersFromStorage = (): TeamMember[] => {
    const defaultOwnerName =
      architectProfile?.name || profile?.companyName || user?.displayName || 'LF Quadros & Decoração';
    const defaultOwnerEmail = user?.email || 'lfquadrosdecorativos@gmail.com';

    const defaultOwner: TeamMember = {
      id: 'member_owner',
      name: defaultOwnerName,
      email: defaultOwnerEmail,
      role: 'admin',
      roleTitle: 'Administrador / Gestor',
      initials: 'LF',
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
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((m: TeamMember) => {
            if (m.isCurrentUser || m.id === 'member_owner') {
              return {
                ...m,
                name: defaultOwnerName || m.name,
                email: defaultOwnerEmail || m.email,
              };
            }
            return m;
          });
        }
      }
    } catch {}

    return [defaultOwner];
  };

  const [members, setMembers] = useState<TeamMember[]>(getMembersFromStorage);

  useEffect(() => {
    const handleUpdate = () => {
      setMembers(getMembersFromStorage());
    };

    setMembers(getMembersFromStorage());

    window.addEventListener('team_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('team_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [architectProfile?.name, profile?.companyName, user?.displayName, user?.email]);

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
            roleTitle: 'Colaborador',
            email: c.email,
          });
        }
      });
    }

    return list;
  }, [members, profile?.collaborators]);

  return { teamMembers, fullTeamMembers: members };
}
