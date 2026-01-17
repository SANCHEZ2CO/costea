import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ProjectState, CostItem, InventoryItem, AppSettings, OrganizationSettings } from '../types';
import { supabase } from '../services/supabaseClient';
import { Session, User } from '@supabase/supabase-js';

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
    updateItem: (id: string, updatedItem: CostItem) => void;
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

    const updateItem = (id: string, updatedItem: CostItem) => {
        setProject(prev => ({
            ...prev,
            items: prev.items.map(i => i.id === id ? updatedItem : i)
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
            signOut
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