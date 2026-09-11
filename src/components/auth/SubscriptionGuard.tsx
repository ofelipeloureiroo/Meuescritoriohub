import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { Loader2, CreditCard, Lock, Building2, CheckCircle2, PieChart, FolderKanban, Users, LogOut } from 'lucide-react';

export const SubscriptionGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};
