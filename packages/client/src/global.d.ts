import { PasswordEntry } from "./renderer/context/VaultContext";

export interface IElectronAPI {
  register: (user: string, masterPassword: string) => Promise<void>;
  login: (user: string, masterPassword: string) => Promise<any>;
  getvaultdata: () => Promise<PasswordEntry[]>;

  addvaultentry: (
    site: string,
    username: string,
    password: string,
    note: string,
    category: string,
    favorite: boolean,
  ) => Promise<void>;
  removevaultentry: (id: string) => Promise<void>;
  editvaultentry: (
    id: string,
    username: string | null,
    password: string | null,
    site: string | null,
    note: string | null,
    category: string | null,
    favorite: boolean | null,
  ) => Promise<void>;
  sync: () => Promise<{ success: boolean; message: string }>;
  exportCSV: () => Promise<string>;
  importCSV: (csvContent: string) => Promise<{ imported: number; errors: number }>;
  changeMasterPassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
}


declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
