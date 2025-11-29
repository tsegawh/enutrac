import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import axios, { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
  createdAt: string;
  subscription?: {
    id: string;
    status: string;
    endDate: string;
    plan: {
      id: string;
      name: string;
      deviceLimit: number;
      price: number;
    };
  };
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string,rememberMe?: boolean) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  refreshUser: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Axios defaults
axios.defaults.baseURL = '/api';
axios.defaults.withCredentials = true; // send cookies automatically

// Axios response interceptor for better error handling
axios.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Don't log 401 errors as they're normal for unauthenticated users
    if (error.response?.status !== 401) {
      console.error('API Error:', error.response?.status, error.response?.data);
    }
    return Promise.reject(error);
  }
);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const didInit = useRef(false);
  const navigate = useNavigate();

  // Initialize user on app mount
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    const initAuth = async () => {
      try {
         // Try refreshing access token first
      await axios.post('/auth/refresh', {}, { withCredentials: true });

        const response = await axios.get('/auth/me');
        
        setUser(response.data.user);
      } catch (error: any) {
        // 401 is expected when no user is logged in - don't treat as error
        if (error.response?.status === 401) {
          console.log('No user logged in (expected)');
        
        } else {
          console.error('Auth check failed:', error);
        }
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Login function
  const login = async (email: string, password: string,rememberMe: boolean = true) => {
    try {
      setLoading(true);
      const response = await axios.post<{ user: User; message: string ;token: string}>('/auth/login', { email, password ,rememberMe},{ withCredentials: true } );
      const { user: userData } = response.data;
      setUser(userData);


      toast.success(`Welcome back, ${userData.name}!`);
      
      // Navigate based on role
      if (userData.role === 'ADMIN') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (error: any) {
      const status = error.response?.status;
      const message = error.response?.data?.message || 'Login failed';

      if (status === 429) {
        toast.error(message || 'Too many login attempts. Please try again later.');
      } else if (status === 400 || status === 401) {
        //toast.error(message || 'Invalid email or password');
      } else if (status === 403) {
        toast.error('Access forbidden');
      } else {
        toast.error('Login failed. Please try again.');
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const register = async (email: string, password: string, name: string) => {
    try {
      setLoading(true);
      const response = await axios.post<{ user: User; message: string }>('/auth/register', { 
        email, 
        password, 
        name 
      });
      const { user: userData } = response.data;
      setUser(userData);

      toast.success(`Welcome to Enutrac Subscriptions, ${userData.name}!`);
      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      const status = error.response?.status;
      let message = error.response?.data?.error || 'Registration failed';

      // Provide more specific error messages
      if (status === 409) {
        message = 'User already exists with this email';
      } else if (status === 400) {
        message = 'Invalid registration data';
      }

      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    setLoading(true);
    try {
      await axios.post('/auth/logout', {}, { withCredentials: true });
      setUser(null);
    } catch (err) {
      console.warn('Server logout failed, continuing locally');
    } finally {
      setLoading(false);
      // Clear any potential stale state
      //localStorage.removeItem('user-storage'); // if you use any local storage
      //sessionStorage.clear();
      
      toast.success('Logged out successfully');
      navigate('/login', { replace: true });
    }
  };

  // Refresh current user data
  const refreshUser = async () => {
    try {
      const response = await axios.get<{ user: User }>('/auth/me');
      setUser(response.data.user);
    } catch (error: any) {
      console.error('Failed to refresh user:', error);
      // If refresh fails with 401, user is logged out
      if (error.response?.status === 401) {
        setUser(null);
      }
    }
  };

  const value: AuthContextType = {
    user,
    login,
    register,
    logout,
    loading,
    refreshUser,
    setUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Optional: Protected route hook
export function useRequireAuth(redirectTo: string = '/login') {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate(redirectTo, { replace: true });
    }
  }, [user, loading, navigate, redirectTo]);

  return { user, loading };
}

// Optional: Admin role check hook
export function useRequireAdmin(redirectTo: string = '/dashboard') {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user?.role !== 'ADMIN') {
      navigate(redirectTo, { replace: true });
    }
  }, [user, loading, navigate, redirectTo]);

  return { user, loading };
}