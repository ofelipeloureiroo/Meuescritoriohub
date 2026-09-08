import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { 
  doc, 
  onSnapshot, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  updateDoc
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Collaborator, CollaboratorPermissions } from '../types';

export interface UserProfile {
  uid: string;
  email: string;
  role: 'admin' | 'user';
  status: 'active' | 'pending' | 'inactive';
  subscriptionDueDate?: string;
  createdAt?: string;
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

  useEffect(() => {
    let unsubscribeProfile: () => void;
    let unsubscribeOwnerProfile: () => void;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const email = firebaseUser.email || '';
        const isOwnerAccount = email.toLowerCase() === 'lfquadrosdecorativos@gmail.com';

        // Fast fallback profile so app never freezes in null state
        const defaultProfile: UserProfile = {
          uid: firebaseUser.uid,
          email: email,
          role: isOwnerAccount ? 'admin' : 'user',
          status: isOwnerAccount ? 'active' : 'pending',
          subscriptionDueDate: isOwnerAccount ? undefined : new Date(Date.now() + 7 * 86400000).toISOString(),
          createdAt: new Date().toISOString(),
          inviteCode: generateInviteCode(),
          collaborators: [],
          collaboratorUids: [],
          extraSlots: 0,
        };

        const docRef = doc(db, 'users', firebaseUser.uid);
        unsubscribeProfile = onSnapshot(docRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            let updatedData = { ...data };
            let needsUpdate = false;

            // Generate invite code if not exists
            if (!data.inviteCode) {
              updatedData.inviteCode = generateInviteCode();
              needsUpdate = true;
            }
            if (!data.collaborators) {
              updatedData.collaborators = [];
              needsUpdate = true;
            }
            if (!data.collaboratorUids) {
              updatedData.collaboratorUids = [];
              needsUpdate = true;
            }
            if (data.extraSlots === undefined) {
              updatedData.extraSlots = 0;
              needsUpdate = true;
            }

            if (needsUpdate) {
              try {
                await setDoc(docRef, updatedData, { merge: true });
              } catch (e) {
                console.error("Error setting default fields on snapshot update:", e);
              }
            }

            if (updatedData.joinedOwnerUid) {
              if (unsubscribeOwnerProfile) unsubscribeOwnerProfile();

              const ownerRef = doc(db, 'users', updatedData.joinedOwnerUid);
              unsubscribeOwnerProfile = onSnapshot(ownerRef, (ownerSnap) => {
                if (ownerSnap.exists()) {
                  const ownerData = ownerSnap.data() as UserProfile;
                  setProfile({
                    ...ownerData,
                    joinedOwnerUid: updatedData.joinedOwnerUid,
                    uid: firebaseUser.uid, // keep own uid
                    email: firebaseUser.email || updatedData.email, // keep own email
                    role: updatedData.role, // keep own role
                    status: updatedData.status, // keep own status
                  });
                } else {
                  setProfile(updatedData);
                }
                setLoading(false);
              }, (err) => {
                console.warn("Snapshot error fetching owner profile:", err);
                setProfile(updatedData);
                setLoading(false);
              });
            } else {
              if (unsubscribeOwnerProfile) {
                unsubscribeOwnerProfile();
                unsubscribeOwnerProfile = undefined as any;
              }

              if (isOwnerAccount && (updatedData.role !== 'admin' || updatedData.status !== 'active')) {
                setProfile({ ...updatedData, role: 'admin', status: 'active' });
              } else {
                setProfile(updatedData);
              }
              setLoading(false);
            }
          } else {
            // Profile document does not exist yet; try creating it or set default in memory
            try {
              await setDoc(docRef, defaultProfile, { merge: true });
            } catch (err) {
              console.warn("Could not write default profile to Firestore, using fallback in state:", err);
            }
            setProfile(defaultProfile);
            setLoading(false);
          }
        }, (error) => {
          console.warn("Snapshot error fetching profile:", error);
          setProfile(defaultProfile);
          setLoading(false);
        });
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
  }, []);

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
      const q = query(collection(db, 'users'), where('inviteCode', '==', cleanCode));
      const querySnap = await getDocs(q);

      if (querySnap.empty) {
        return { success: false, message: 'Código de convite inválido ou não encontrado.' };
      }

      const ownerDoc = querySnap.docs[0];
      const ownerUid = ownerDoc.id;
      const ownerData = ownerDoc.data() as UserProfile;

      if (ownerUid === activeUser.uid) {
        return { success: false, message: 'Você não pode usar seu próprio código.' };
      }

      // Check strict 4-member limit
      const collaborators = ownerData.collaborators || [];
      if (collaborators.length >= 4) {
        return { 
          success: false, 
          message: 'Este escritório já atingiu o limite máximo de 4 membros colaboradores.' 
        };
      }

      // Check if already in the list
      const isAlreadyCollaborator = collaborators.some(c => c.uid === activeUser.uid);
      if (isAlreadyCollaborator) {
        // Just update user's profile pointer
        const collabDocRef = doc(db, 'users', activeUser.uid);
        await setDoc(collabDocRef, { joinedOwnerUid: ownerUid, status: 'active' }, { merge: true });
        return { success: true, message: 'Conectado com sucesso ao escritório!' };
      }

      const displayName = guestName?.trim() || activeUser.displayName || 'Convidado';
      const displayEmail = activeUser.email && !activeUser.email.includes('@meuescritorio.app') 
        ? activeUser.email 
        : `${displayName} (Convidado)`;

      const newCollab: Collaborator = {
        uid: activeUser.uid,
        email: displayEmail,
        invitedAt: new Date().toISOString(),
        joinedAt: new Date().toISOString(),
        status: 'joined',
        permissions: {
          portfolio: true,
          projects: true,
          deadlines: true,
          finance: true,
          clients: true,
          goals: true,
          budget: true,
        }
      };

      // Add to owner
      const updatedCollaborators = [...collaborators, newCollab];
      const updatedCollaboratorUids = [...(ownerData.collaboratorUids || []), activeUser.uid];

      await setDoc(doc(db, 'users', ownerUid), {
        collaborators: updatedCollaborators,
        collaboratorUids: updatedCollaboratorUids,
      }, { merge: true });

      // Point collaborator to owner and write their profile record
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

      await updateProfile({ joinedOwnerUid: undefined });
    } catch (e) {
      console.error("Error leaving collaborated office:", e);
    }
  };

  const updateCollaboratorPermissions = async (collaboratorUid: string, permissions: CollaboratorPermissions) => {
    if (!user || !profile) return;
    try {
      const updatedCollaborators = (profile.collaborators || []).map(c => {
        if (c.uid === collaboratorUid) {
          return { ...c, permissions };
        }
        return c;
      });

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

  const isOwner = !!(user?.email && user.email.toLowerCase() === 'lfquadrosdecorativos@gmail.com');
  const isAdmin = isOwner || profile?.role === 'admin';

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
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
