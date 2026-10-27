import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  quickLogin: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Quick test credentials for seamless role evaluation
export const TEST_ACCOUNTS: Record<UserRole, { email: string; pass: string; label: string }> = {
  SUPER_ADMIN: {
    email: 'superadmin@aicte-india.org',
    pass: 'Admin@AICTE2026!',
    label: 'Super Admin (Dr. R. K. Srivastav)',
  },
  VERIFICATION_OFFICER: {
    email: 'officer.sharma@aicte-india.org',
    pass: 'Officer@AICTE2026!',
    label: 'Verification Officer (Sunita Sharma)',
  },
  APPROVING_AUTHORITY: {
    email: 'approver.verma@aicte-india.org',
    pass: 'Approver@AICTE2026!',
    label: 'Approving Authority (Prof. Anil Verma)',
  },
  AUDITOR: {
    email: 'auditor.read@aicte-india.org',
    pass: 'Auditor@AICTE2026!',
    label: 'Auditor (Pooja Nair - Read-Only)',
  },
  INSTITUTION_ADMIN: {
    email: 'admin@delhi-tech.edu.in',
    pass: 'College@AICTE2026!',
    label: 'Institution Admin (Delhi Inst. of Tech)',
  },
  INSTITUTION_STAFF: {
    email: 'admin@mumbai-eng.edu.in',
    pass: 'College@AICTE2026!',
    label: 'Institution Admin (Mumbai College of Eng)',
  },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await api.getMe();
        if (res.success && res.data) {
          setUser(res.data);
        }
      } catch (err) {
        localStorage.removeItem('aicte_auth_token');
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    loadUser();
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await api.login({ email, password: pass });
      if (res.success && res.data) {
        localStorage.setItem('aicte_auth_token', res.data.token);
        setUser(res.data.user);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await api.logout();
    } catch (err) {
      // ignore
    } finally {
      localStorage.removeItem('aicte_auth_token');
      setUser(null);
      setIsLoading(false);
    }
  };

  const quickLogin = async (role: UserRole) => {
    const creds = TEST_ACCOUNTS[role];
    if (creds) {
      await login(creds.email, creds.pass);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, quickLogin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
