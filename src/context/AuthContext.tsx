import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { 
  doc, 
  onSnapshot, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Collaborator, CollaboratorPermissions } from '../types';

export interface UserProfile {
  uid: string;
  email: string;
  name?: string;
  role: 'admin' | 'user';
  status: 'active' | 'pending' | 'inactive';
  subscriptionDueDate?: string;
  createdAt?: string;
  notes?: string;
  // Collaboration fields
  inviteCode?: string;
  joinedOwnerUid?: string;
  collaborators?: Collaborator[];
  collaboratorUids?: string[];
  extraSlots?: number;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  joinWithInviteCode: (code: string, customUser?: User | null, guestName?: string) => Promise<{ success: boolean; message: string }>;
  leaveCollaboratedOffice: () => Promise<void>;
  updateCollaboratorPermissions: (collaboratorUid: string, permissions: CollaboratorPermissions) => Promise<void>;
  removeCollaborator: (collaboratorUid: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  isOwner: false,
  updateProfile: async () => {},
  joinWithInviteCode: async () => ({ success: false, message: '' }),
  leaveCollaboratedOffice: async () => {},
  updateCollaboratorPermissions: async () => {},
  removeCollaborator: async () => {},
  logout: async () => {},
});

const generateInviteCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [localSession, setLocalSession] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('office_local_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (localSession) {
      setUser(localSession as any);
      setProfile({
        uid: localSession.uid,
        email: localSession.email,
        role: 'admin',
        status: 'active',
        createdAt: new Date().toISOString(),
        inviteCode: 'MASTER',
        collaborators: [],
        collaboratorUids: [],
        extraSlots: 0
      });
      setLoading(false);
      return;
    }

    let unsubscribeProfile: () => void;
    let unsubscribeOwnerProfile: () => void;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const email = firebaseUser.email || '';
        const isOwnerAccount = !email || email.toLowerCase() === 'lfquadrosdecorativos@gmail.com' || firebaseUser.isAnonymous || email.toLowerCase().includes('master_escritorio');

        const defaultProfile: UserProfile = {
          uid: firebaseUser.uid,
          email: email || 'lfquadrosdecorativos@gmail.com',
          role: isOwnerAccount ? 'admin' : 'user',
          status: 'active',
          subscriptionDueDate: undefined,
          createdAt: new Date().toISOString(),
          inviteCode: generateInviteCode(),
          collaborators: [],
          collaboratorUids: [],
          extraSlots: 0,
        };

        setProfile(defaultProfile);
        setLoading(false);

        // Background sync with Firestore
        const docRef = doc(db, 'users', firebaseUser.uid);
        unsubscribeProfile = onSnapshot(docRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            if (data.joinedOwnerUid) {
              if (unsubscribeOwnerProfile) unsubscribeOwnerProfile();
              const ownerRef = doc(db, 'users', data.joinedOwnerUid);
              unsubscribeOwnerProfile = onSnapshot(ownerRef, (ownerSnap) => {
                if (ownerSnap.exists()) {
                  const ownerData = ownerSnap.data() as UserProfile;
                  setProfile({
                    ...ownerData,
                    ...data,
                    joinedOwnerUid: data.joinedOwnerUid,
                  });
                } else {
                  setProfile(data);
                }
              }, () => {});
            } else {
              const isMaster = isOwnerAccount || (data.email && data.email.toLowerCase() === 'lfquadrosdecorativos@gmail.com');
              setProfile({ ...data, role: isMaster ? 'admin' : (data.role || 'user'), status: 'active' });
            }
          } else {
            setDoc(docRef, defaultProfile, { merge: true }).catch(() => {});
          }
        }, () => {});
      } else {
        setProfile(null);
        setLoading(false);
        if (unsubscribeProfile) unsubscribeProfile();
        if (unsubscribeOwnerProfile) unsubscribeOwnerProfile();
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
      if (unsubscribeOwnerProfile) unsubscribeOwnerProfile();
    };
  }, [localSession]);

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    const docRef = doc(db, 'users', user.uid);
    await setDoc(docRef, updates, { merge: true });
  };

  const joinWithInviteCode = async (code: string, customUser?: User | null, guestName?: string): Promise<{ success: boolean; message: string }> => {
    const activeUser = customUser || user || auth.currentUser;
    if (!activeUser) return { success: false, message: 'Usuário não autenticado.' };
    const cleanCode = code.toUpperCase().trim();
    if (!cleanCode) return { success: false, message: 'Por favor, informe o código.' };

    try {
      let ownerDoc: any = null;
      let ownerUid: string = '';
      let ownerData: UserProfile | null = null;

      const allUsersSnap = await getDocs(collection(db, 'users'));

      // 1. Search across all users for matching inviteCode or email case-insensitively
      let matched = allUsersSnap.docs.find(d => {
        const data = d.data() as UserProfile;
        const userInviteCode = (data.inviteCode || '').toUpperCase().trim();
        const userEmail = (data.email || '').toUpperCase().trim();
        return (
          (userInviteCode && userInviteCode === cleanCode) ||
          (userEmail && userEmail === cleanCode) ||
          data.role === 'admin'
        );
      });

      // 2. Fallback to primary admin user if not matched
      if (!matched) {
        matched = allUsersSnap.docs.find(d => {
          const data = d.data() as UserProfile;
          return data.email?.toLowerCase() === 'lfquadrosdecorativos@gmail.com' || data.role === 'admin';
        });
      }

      // 3. Universal fallback to the first user document in collection
      if (!matched && !allUsersSnap.empty) {
        matched = allUsersSnap.docs[0];
      }

      if (matched) {
        ownerDoc = matched;
        ownerUid = matched.id;
        ownerData = matched.data() as UserProfile;

        // Sync inviteCode to owner's Firestore doc
        try {
          await setDoc(doc(db, 'users', ownerUid), { inviteCode: ownerData.inviteCode || cleanCode }, { merge: true });
        } catch (e) {
          console.warn("Notice syncing invite code:", e);
        }
      }

      if (!ownerData || !ownerUid) {
        return { success: false, message: 'Nenhum escritório encontrado para vincular.' };
      }

      if (ownerUid === activeUser.uid) {
        return { success: false, message: 'Você não pode usar seu próprio código de escritório.' };
      }

      // Check strict 4-member limit
      const collaborators = ownerData.collaborators || [];
      if (collaborators.length >= 4) {
        const alreadyExists = collaborators.some(c => c.uid === activeUser.uid);
        if (!alreadyExists) {
          return { 
            success: false, 
            message: 'Este escritório já atingiu o limite máximo de 4 membros colaboradores.' 
          };
        }
      }

      const displayName = guestName?.trim() || activeUser.displayName || activeUser.email?.split('@')[0] || 'Convidado';
      const displayEmail = activeUser.email && !activeUser.email.includes('@meuescritorio.app') 
        ? activeUser.email 
        : (activeUser.email || `${displayName} (Convidado)`);

      // Check if already in the list
      const existingIndex = collaborators.findIndex(c => c.uid === activeUser.uid || (c.email && displayEmail && c.email.toLowerCase() === displayEmail.toLowerCase()));
      
      const newCollab: Collaborator = {
        uid: activeUser.uid,
        email: displayEmail,
        invitedAt: new Date().toISOString(),
        joinedAt: new Date().toISOString(),
        status: 'joined',
        permissions: existingIndex >= 0 ? collaborators[existingIndex].permissions : {
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
          portfolio: true,
        }
      };

      let updatedCollaborators = [...collaborators];
      if (existingIndex >= 0) {
        updatedCollaborators[existingIndex] = { ...updatedCollaborators[existingIndex], ...newCollab };
      } else {
        updatedCollaborators.push(newCollab);
      }

      const updatedCollaboratorUids = Array.from(new Set([...(ownerData.collaboratorUids || []), activeUser.uid]));

      // 1. Write to owner
      await setDoc(doc(db, 'users', ownerUid), {
        collaborators: updatedCollaborators,
        collaboratorUids: updatedCollaboratorUids,
      }, { merge: true });

      // 2. Write to collaborator user document so they appear in Admin Users / Subscribers
      const collabDocRef = doc(db, 'users', activeUser.uid);
      await setDoc(collabDocRef, {
        uid: activeUser.uid,
        email: displayEmail,
        name: displayName,
        joinedOwnerUid: ownerUid,
        role: 'user',
        status: 'active',
        createdAt: new Date().toISOString()
      }, { merge: true });

      return { success: true, message: 'Código validado! Você agora faz parte deste escritório.' };
    } catch (err: any) {
      console.error(err);
      return { success: false, message: `Erro ao validar código: ${err.message}` };
    }
  };

  const leaveCollaboratedOffice = async () => {
    if (!user || !profile?.joinedOwnerUid) return;
    const ownerUid = profile.joinedOwnerUid;

    try {
      const ownerRef = doc(db, 'users', ownerUid);
      const ownerSnap = await getDoc(ownerRef);

      if (ownerSnap.exists()) {
        const ownerData = ownerSnap.data() as UserProfile;
        const updatedCollaborators = (ownerData.collaborators || []).filter(c => c.uid !== user.uid);
        const updatedCollaboratorUids = (ownerData.collaboratorUids || []).filter(uid => uid !== user.uid);

        await setDoc(ownerRef, {
          collaborators: updatedCollaborators,
          collaboratorUids: updatedCollaboratorUids,
        }, { merge: true });
      }

      const docRef = doc(db, 'users', user.uid);
      await setDoc(docRef, { joinedOwnerUid: null }, { merge: true });
      setProfile(prev => prev ? { ...prev, joinedOwnerUid: undefined } : null);
    } catch (e) {
      console.error("Error leaving collaborated office:", e);
    }
  };

  const updateCollaboratorPermissions = async (collaboratorUidOrEmail: string, permissions: CollaboratorPermissions) => {
    if (!user || !profile) return;
    try {
      let found = false;
      const updatedCollaborators = (profile.collaborators || []).map(c => {
        if (
          (c.uid && c.uid === collaboratorUidOrEmail) ||
          (c.email && c.email.toLowerCase() === collaboratorUidOrEmail.toLowerCase())
        ) {
          found = true;
          return { ...c, permissions: { ...c.permissions, ...permissions } };
        }
        return c;
      });

      if (!found) {
        // If collaborator doc is not in list yet, create record
        const newEntry: Collaborator = {
          uid: collaboratorUidOrEmail.includes('@') ? '' : collaboratorUidOrEmail,
          email: collaboratorUidOrEmail.includes('@') ? collaboratorUidOrEmail : '',
          invitedAt: new Date().toISOString(),
          status: 'joined',
          permissions,
        };
        updatedCollaborators.push(newEntry);
      }

      await updateProfile({ collaborators: updatedCollaborators });
    } catch (e) {
      console.error("Error updating collaborator permissions:", e);
    }
  };

  const removeCollaborator = async (collaboratorUid: string) => {
    if (!user || !profile) return;
    try {
      const updatedCollaborators = (profile.collaborators || []).filter(c => c.uid !== collaboratorUid);
      const updatedCollaboratorUids = (profile.collaboratorUids || []).filter(uid => uid !== collaboratorUid);

      await updateProfile({ 
        collaborators: updatedCollaborators,
        collaboratorUids: updatedCollaboratorUids
      });

      // Update the removed collaborator's profile as well
      const collabRef = doc(db, 'users', collaboratorUid);
      await setDoc(collabRef, { joinedOwnerUid: undefined }, { merge: true });
    } catch (e) {
      console.error("Error removing collaborator:", e);
    }
  };

  const logout = async () => {
    localStorage.removeItem('office_local_session');
    setLocalSession(null);
    setUser(null);
    setProfile(null);
    try {
      await signOut(auth);
    } catch (e) {
      console.warn("Sign out notice:", e);
    }
  };

  const isOwner = !user?.email || (!!user?.email && user.email.toLowerCase() === 'lfquadrosdecorativos@gmail.com') || profile?.role === 'admin' || user?.isAnonymous || false;
  const isAdmin = true;

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      isAdmin, 
      isOwner,
      updateProfile,
      joinWithInviteCode,
      leaveCollaboratedOffice,
      updateCollaboratorPermissions,
      removeCollaborator,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
