import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ProjectState, CostItem, InventoryItem } from '../types';
import { supabase } from '../services/supabaseClient';
import { Session, User } from '@supabase/supabase-js';

interface AppContextType {
    project: ProjectState;
    inventory: InventoryItem[];
    updateProjectName: (name: string) => void;
    addItem: (item: CostItem) => void;
    removeItem: (id: string) => void;
    toggleFactorQ: () => void;
    updateProfitMargin: (margin: number) => void;
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
    profitMargin: 35
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [project, setProject] = useState<ProjectState>(defaultState);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);

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
        return await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                },
            },
        });
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setInventory([]); // Clear local inventory on logout
    };

    const updateProjectName = (name: string) => {
        setProject(prev => ({ ...prev, name }));
    };

    const addItem = (item: CostItem) => {
        setProject(prev => ({ ...prev, items: [...prev.items, item] }));
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
            updateProjectName,
            addItem,
            removeItem,
            toggleFactorQ,
            updateProfitMargin,
            saveToInventory,
            resetProject,
            user,
            session,
            loading,
            signInWithEmail,
            signUpWithEmail,
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