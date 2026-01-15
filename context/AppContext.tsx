import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ProjectState, CostItem, InventoryItem } from '../types';

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
            resetProject 
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