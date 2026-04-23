import React, { createContext, useContext, useState, useEffect } from 'react';
import { getElectronAPI } from '../utils/mockAPI';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    if (!savedUser) {
      return null;
    }

    try {
      const parsedUser = JSON.parse(savedUser);
      return parsedUser && typeof parsedUser.id === 'string' ? parsedUser : null;
    } catch (error) {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);
  const electronAPI = getElectronAPI();

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const result = await electronAPI.login(username, password);
      
      if (result.success) {
        setUser(result.data);
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        message: 'Terjadi kesalahan saat login'
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
