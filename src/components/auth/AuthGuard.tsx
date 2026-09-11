import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';

export const AuthGuard: React.FC<{ children: React.ReactNode; requireAdmin?: boolean }> = ({ children, requireAdmin }) => {
  const { user, profile, loading, isAdmin, isOwner } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#12100e] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#c58a4b] animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isSuperAdmin = isOwner || (isAdmin && user?.email?.toLowerCase() === 'lfquadrosdecorativos@gmail.com');

  if (requireAdmin && !isSuperAdmin) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
};
