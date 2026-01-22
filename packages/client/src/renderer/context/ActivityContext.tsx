import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import toast from 'react-hot-toast';

// Activity types
export interface ActivityItem {
    id: string;
    type: 'add' | 'edit' | 'delete' | 'login' | 'sync' | 'export' | 'import';
    title: string;
    subtitle: string;
    time: Date;
}

interface ActivityContextType {
    // Recent activity
    recentActivity: ActivityItem[];
    addActivity: (type: ActivityItem['type'], title: string, subtitle: string) => void;
    clearActivity: () => void;

    // Auto-lock
    autoLockMinutes: number;
    setAutoLockMinutes: (minutes: number) => void;
    resetInactivityTimer: () => void;
    onAutoLock: (() => void) | null;
    setOnAutoLock: (callback: (() => void) | null) => void;
}

const ActivityContext = createContext<ActivityContextType | undefined>(undefined);

// Helper to format relative time
export function formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString();
}

export const ActivityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Recent activity state - persisted in localStorage
    const [recentActivity, setRecentActivity] = useState<ActivityItem[]>(() => {
        try {
            const saved = localStorage.getItem('vault_recent_activity');
            if (saved) {
                const parsed = JSON.parse(saved);
                // Convert date strings back to Date objects
                return parsed.map((item: any) => ({
                    ...item,
                    time: new Date(item.time)
                })).slice(0, 20); // Keep only last 20 items
            }
        } catch {
            // Ignore parse errors
        }
        return [];
    });

    // Auto-lock state
    const [autoLockMinutes, setAutoLockMinutesState] = useState<number>(() => {
        const saved = localStorage.getItem('vault_auto_lock_minutes');
        return saved ? parseInt(saved, 10) : 5; // Default 5 minutes
    });

    const [onAutoLock, setOnAutoLock] = useState<(() => void) | null>(null);

    // Timer refs
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const lastActivityRef = useRef<number>(Date.now());

    // Save activity to localStorage when it changes
    useEffect(() => {
        localStorage.setItem('vault_recent_activity', JSON.stringify(recentActivity));
    }, [recentActivity]);

    // Save auto-lock setting to localStorage
    const setAutoLockMinutes = useCallback((minutes: number) => {
        setAutoLockMinutesState(minutes);
        localStorage.setItem('vault_auto_lock_minutes', minutes.toString());
    }, []);

    // Add activity
    const addActivity = useCallback((type: ActivityItem['type'], title: string, subtitle: string) => {
        const newActivity: ActivityItem = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type,
            title,
            subtitle,
            time: new Date()
        };

        setRecentActivity(prev => [newActivity, ...prev].slice(0, 20));
    }, []);

    // Clear activity
    const clearActivity = useCallback(() => {
        setRecentActivity([]);
    }, []);

    // Reset inactivity timer
    const resetInactivityTimer = useCallback(() => {
        lastActivityRef.current = Date.now();
    }, []);

    // Auto-lock timer effect
    useEffect(() => {
        // Clear existing timer
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }

        // If auto-lock is disabled (0 minutes) or no callback, do nothing
        if (autoLockMinutes === 0 || !onAutoLock) {
            return;
        }

        // Check every 10 seconds
        timerRef.current = setInterval(() => {
            const inactiveMs = Date.now() - lastActivityRef.current;
            const inactiveMinutes = inactiveMs / 60000;

            if (inactiveMinutes >= autoLockMinutes) {
                toast('Vault locked due to inactivity', { icon: '🔒' });
                onAutoLock();
            }
        }, 10000);

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [autoLockMinutes, onAutoLock]);

    // Track user activity (mouse movement, keyboard, clicks)
    useEffect(() => {
        const handleActivity = () => {
            lastActivityRef.current = Date.now();
        };

        window.addEventListener('mousemove', handleActivity);
        window.addEventListener('keydown', handleActivity);
        window.addEventListener('click', handleActivity);
        window.addEventListener('scroll', handleActivity);

        return () => {
            window.removeEventListener('mousemove', handleActivity);
            window.removeEventListener('keydown', handleActivity);
            window.removeEventListener('click', handleActivity);
            window.removeEventListener('scroll', handleActivity);
        };
    }, []);

    return (
        <ActivityContext.Provider value={{
            recentActivity,
            addActivity,
            clearActivity,
            autoLockMinutes,
            setAutoLockMinutes,
            resetInactivityTimer,
            onAutoLock,
            setOnAutoLock
        }}>
            {children}
        </ActivityContext.Provider>
    );
};

export const useActivity = () => {
    const context = useContext(ActivityContext);
    if (context === undefined) {
        throw new Error('useActivity must be used within an ActivityProvider');
    }
    return context;
};
