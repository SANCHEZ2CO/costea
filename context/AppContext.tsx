import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ProjectState, CostItem, InventoryItem, AppSettings, OrganizationSettings, ThemeName, ThemeConfig } from '../types';
import { supabase } from '../services/supabaseClient';
import { Session, User } from '@supabase/supabase-js';

// Theme Configurations
export const THEME_CONFIGS: ThemeConfig[] = [
    {
        name: 'default',
        label: 'Standard',
        description: 'Minimalista y elegante',
        icon: 'light_mode',
        preview: { bg: '#F8F9FB', accent: '#4f46e5', text: '#1e293b' }
    },
    {
        name: 'dark',
        label: 'Dark Mode',
        description: 'Optimizado para la noche',
        icon: 'dark_mode',
        preview: { bg: '#020617', accent: '#8b5cf6', text: '#f8fafc' }
    },
    {
        name: 'feminine',
        label: 'Soft Rose',
        description: 'Sofisticado y elegante',
        icon: 'favorite',
        preview: { bg: '#FDF2F8', accent: '#DB2777', text: '#831843' }
    },
    {
        name: 'galaxy',
        label: 'Liquid Space',
        description: 'Glassmorphism extremo',
        icon: 'auto_awesome',
        preview: { bg: '#0f0f23', accent: '#a855f7', text: '#e2e8f0' }
    }
];

interface AppContextType {
    project: ProjectState;
    inventory: InventoryItem[];
    // Settings
    settings: AppSettings;
    organization: OrganizationSettings;
    updateSettings: (settings: Partial<AppSettings>) => void;
    updateOrganization: (org: Partial<OrganizationSettings>) => void;

    updateProjectName: (name: string) => void;
    addItem: (item: CostItem) => void;
    updateItem: (id: string, updates: Partial<CostItem>) => void;
    removeItem: (id: string) => void;
    toggleFactorQ: () => void;
    updateProfitMargin: (margin: number) => void;
    updateLaborCost: (cost: number, minutes: number) => void;
    saveToInventory: (item: InventoryItem) => void;
    resetProject: () => void;
    // Auth
    user: User | null;
    session: Session | null;
    loading: boolean;
    signInWithEmail: (email: string, password: string) => Promise<any>;
    signUpWithEmail: (email: string, password: string, fullName: string) => Promise<any>;
    signOut: () => Promise<void>;
    // Theme
    theme: ThemeName;
    setTheme: (theme: ThemeName) => void;
    themeClass: string;
    isTransitioning: boolean;
}

const defaultState: ProjectState = {
    name: '',
    items: [],
    factorQ: true,
    factorQPercentage: 5,
    profitMargin: 35,
    laborCost: 0,
    laborTimeMinutes: 0
};

const defaultSettings: AppSettings = {
    currency: 'COP $',
    language: 'Español',
    measurementSystem: 'metric',
    factorQPercentage: 10,
    monthlySalary: 2715500
};

const defaultOrganization: OrganizationSettings = {
    name: 'Sanchez2 Desayunos',
    slogan: 'Detalles que enamoran',
    logo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAWAsy8wcOb3JNIsqGGANh8KnY6uc4RQviFqv_GHNBGZr8lZdLM0LElZCqRjOUWrfV89aHha22CUVdfjaObwO3FkzNDDiHB4NExDiTY9dvI423sotCywOAdVQ8_FVwM_y2tJECFVObMU6dhIa1NTj-JV8eU2gXlwhD21CTUbr8WU1cASqas1TFETkXMrWTHO5lm-6ghhHc1cQrm3z9q_P9zb60k75LOqxFL9ZeTWr2eFdxTQIZZZfh94b6mOVvtXW6NwZPrlAI-pzQf'
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [project, setProject] = useState<ProjectState>(defaultState);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [settings, setSettings] = useState<AppSettings>(defaultSettings);
    const [organization, setOrganization] = useState<OrganizationSettings>(defaultOrganization);

    // Theme State
    const [theme, setThemeState] = useState<ThemeName>(() => {
        const saved = localStorage.getItem('costea-theme');
        return (saved as ThemeName) || 'default';
    });
    const [isTransitioning, setIsTransitioning] = useState(false);

    // Auth State
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    React.useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        // Listen for changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signInWithEmail = async (email: string, password: string) => {
        return await supabase.auth.signInWithPassword({ email, password });
    };

    const signUpWithEmail = async (email: string, password: string, fullName: string) => {
        // Determine the redirect URL based on environment
        const redirectUrl = window.location.hostname === 'costea.sanchez2.co'
            ? 'https://costea.sanchez2.co'
            : 'http://localhost:5173';

        return await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: redirectUrl,
                data: {
                    full_name: fullName,
                },
            },
        });
    };

    const signInWithGoogle = async () => {
        const redirectUrl = window.location.hostname === 'costea.sanchez2.co'
            ? 'https://costea.sanchez2.co/home'
            : 'http://localhost:5173/home';

        return await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectUrl
            }
        });
    };

    const signOut = async () => {
        try {
            await supabase.auth.signOut();
        } catch (error) {
            console.error("Error signing out:", error);
        } finally {
            // Force clean state immediately to trigger UI updates
            setSession(null);
            setUser(null);
            setInventory([]);
            setLoading(false);
        }
    };

    // Theme Functions
    const setTheme = useCallback((newTheme: ThemeName) => {
        setIsTransitioning(true);
        setTimeout(() => {
            setThemeState(newTheme);
            localStorage.setItem('costea-theme', newTheme);
            setTimeout(() => setIsTransitioning(false), 500);
        }, 250);
    }, []);

    // Generate theme class string
    const themeClass = theme === 'dark' ? 'dark theme-dark' :
        theme === 'feminine' ? 'theme-feminine' :
            theme === 'galaxy' ? 'dark theme-galaxy' : 'theme-default';

    // Apply theme to document
    useEffect(() => {
        const html = document.documentElement;
        html.classList.remove('light', 'dark', 'theme-default', 'theme-dark', 'theme-feminine', 'theme-galaxy');

        if (theme === 'dark' || theme === 'galaxy') {
            html.classList.add('dark');
        } else {
            html.classList.add('light');
        }
        html.classList.add(`theme-${theme}`);
    }, [theme]);

    const updateSettings = (newSettings: Partial<AppSettings>) => {
        setSettings(prev => ({ ...prev, ...newSettings }));
    };

    const updateOrganization = (newOrg: Partial<OrganizationSettings>) => {
        setOrganization(prev => ({ ...prev, ...newOrg }));
    };

    const updateProjectName = (name: string) => {
        setProject(prev => ({ ...prev, name }));
    };

    const addItem = (item: CostItem) => {
        setProject(prev => ({ ...prev, items: [...prev.items, item] }));
    };

    const updateItem = (id: string, updates: Partial<CostItem>) => {
        setProject(prev => ({
            ...prev,
            items: prev.items.map(i => i.id === id ? { ...i, ...updates } : i)
        }));
    };

    const removeItem = (id: string) => {
        setProject(prev => ({ ...prev, items: prev.items.filter(i => i.id !== id) }));
    };

    const toggleFactorQ = () => {
        setProject(prev => ({ ...prev, factorQ: !prev.factorQ }));
    };

    const updateProfitMargin = (margin: number) => {
        setProject(prev => ({ ...prev, profitMargin: margin }));
    };

    const updateLaborCost = (cost: number, minutes: number) => {
        setProject(prev => ({ ...prev, laborCost: cost, laborTimeMinutes: minutes }));
    };

    const saveToInventory = (item: InventoryItem) => {
        setInventory(prev => [item, ...prev]);
        // TODO: Persist to Supabase in next steps
    };

    const resetProject = () => {
        setProject(defaultState);
    };

    return (
        <AppContext.Provider value={{
            project,
            inventory,
            settings,
            organization,
            updateSettings,
            updateOrganization,
            updateProjectName,
            addItem,
            updateItem,
            removeItem,
            toggleFactorQ,
            updateProfitMargin,
            updateLaborCost,
            saveToInventory,
            resetProject,
            user,
            session,
            loading,
            signInWithEmail,
            signUpWithEmail,
            signInWithGoogle,
            signOut,
            theme,
            setTheme,
            themeClass,
            isTransitioning
        }}>
            {children}
        </AppContext.Provider>
    );
};

export const useApp = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("useApp must be used within AppProvider");
    return context;
};