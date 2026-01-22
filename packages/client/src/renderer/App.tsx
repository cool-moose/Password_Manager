import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { Dashboard } from './components/Dashboard';
import { AuthProvider, useAuth } from './context/AuthContext';
import { VaultProvider } from './context/VaultContext';
import { ActivityProvider, useActivity } from './context/ActivityContext';

type View = 'login' | 'register' | 'dashboard';

function AppContent() {
    const [currentView, setCurrentView] = useState<View>('login');
    const { isLoggedIn, logout } = useAuth();
    const { setOnAutoLock, addActivity } = useActivity();

    const handleLogout = () => {
        logout();
        setCurrentView('login');
    };

    // Connect auto-lock to logout
    useEffect(() => {
        if (isLoggedIn) {
            setOnAutoLock(() => handleLogout);
            addActivity('login', 'Vault Unlocked', 'Successful login');
        } else {
            setOnAutoLock(null);
        }
    }, [isLoggedIn]);

    // Auto switch to dashboard if logged in
    const activeView = isLoggedIn ? 'dashboard' : currentView;

    return (
        <>
            {activeView === 'login' && (
                <Login onNavigate={(view) => setCurrentView(view)} />
            )}
            {activeView === 'register' && (
                <Register onNavigate={(view) => setCurrentView(view)} />
            )}
            {activeView === 'dashboard' && (
                <VaultProvider>
                    <Dashboard onLogout={handleLogout} />
                </VaultProvider>
            )}
        </>
    );
}

function App() {
    return (
        <AuthProvider>
            <ActivityProvider>
                <Toaster
                    position="top-right"
                    toastOptions={{
                        duration: 3000,
                        style: {
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '12px',
                            padding: '16px',
                            boxShadow: 'var(--shadow-lg)',
                        },
                        success: {
                            iconTheme: {
                                primary: 'var(--success-color)',
                                secondary: 'white',
                            },
                        },
                        error: {
                            iconTheme: {
                                primary: 'var(--danger-color)',
                                secondary: 'white',
                            },
                        },
                    }}
                />
                <AppContent />
            </ActivityProvider>
        </AuthProvider>
    );
}

export default App;
