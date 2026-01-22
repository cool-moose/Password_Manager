import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface PasswordEntry {
  id: string;
  site: string;
  username: string;
  password: string;
  note: string;
  category: string;
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
}

interface VaultContextType {
  passwords: PasswordEntry[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  addPassword: (entry: Omit<PasswordEntry, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updatePassword: (id: string, entry: Partial<PasswordEntry>) => void;
  deletePassword: (id: string) => void;
  toggleFavorite: (id: string) => void;
  filteredPasswords: PasswordEntry[];
  categories: string[];
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
  loading: boolean;        // nowy stan
  error: string | null;    // opcjonalnie: obsługa błędów
  refreshData: () => Promise<void>;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export const VaultProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [passwords, setPasswords] = useState<PasswordEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Helper to reload data from backend
  const loadVaultData = async () => {
    try {
      setLoading(true);
      setError(null);

      const data: PasswordEntry[] = await window.electronAPI.getvaultdata();
      setPasswords(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load vault data:', err);
      setError(err.message || 'Failed to load passwords');
      setPasswords([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadVaultData();
  }, []);

  const categories = [...new Set(passwords.map(p => p.category))];

  const filteredPasswords = passwords.filter(p => {
    const matchesSearch = searchQuery === '' ||
      p.site.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.note.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === null || p.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Updated addPassword – calls backend and then refreshes
  const addPassword = async (entry: Omit<PasswordEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setLoading(true); // optional: show loading during add

      await window.electronAPI.addvaultentry(
        entry.site,
        entry.username,
        entry.password,
        entry.note,
        entry.category,
        entry.favorite ?? false
      );

      // Reload fresh data from backend
      await loadVaultData();
    } catch (err: any) {
      console.error('Failed to add password:', err);
      setError(err.message || 'Failed to add password');
      throw err; // re-throw so UI components can handle error if needed
    } finally {
      setLoading(false);
    }
  };

  // Updated updatePassword
  const updatePassword = async (id: string, updates: Partial<PasswordEntry>) => {
    try {
      setLoading(true);

      await window.electronAPI.editvaultentry(
        id,
        updates.username ?? null,
        updates.password ?? null,
        updates.site ?? null,
        updates.note ?? null,
        updates.category ?? null,
        updates.favorite ?? null
      );

      await loadVaultData();
    } catch (err: any) {
      console.error('Failed to update password:', err);
      setError(err.message || 'Failed to update password');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Updated deletePassword
  const deletePassword = async (id: string) => {
    try {
      setLoading(true);

      await window.electronAPI.removevaultentry(id);

      await loadVaultData();
    } catch (err: any) {
      console.error('Failed to delete password:', err);
      setError(err.message || 'Failed to delete password');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // toggleFavorite can be optimized to use editvaultentry
  const toggleFavorite = async (id: string) => {
    const password = passwords.find(p => p.id === id);
    if (!password) return;

    try {
      setLoading(true);

      await window.electronAPI.editvaultentry(
        id,
        null, null, null, null, null,
        !password.favorite
      );

      await loadVaultData();
    } catch (err: any) {
      console.error('Failed to toggle favorite:', err);
      setError(err.message || 'Failed to toggle favorite');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <VaultContext.Provider value={{
      passwords,
      searchQuery,
      setSearchQuery,
      addPassword,
      updatePassword,
      deletePassword,
      toggleFavorite,
      filteredPasswords,
      categories,
      selectedCategory,
      setSelectedCategory,
      loading,
      error,
      refreshData: loadVaultData
    }}>
      {children}
    </VaultContext.Provider>
  );
};

export const useVault = () => {
  const context = useContext(VaultContext);

  if (context === undefined) {
    throw new Error('useVault must be used within a VaultProvider');
  }
  return context;
};
