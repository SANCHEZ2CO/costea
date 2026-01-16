export enum ItemType {
    INSUMO = 'INSUMO',
    RECETA = 'RECETA',
    EMPAQUE = 'EMPAQUE'
}

export interface CostItem {
    id: string;
    name: string;
    type: ItemType;
    cost: number;
    // Details for editing later
    boughtQty?: number;
    boughtUnit?: string;
    boughtPrice?: number;
    usedQty?: number;
    usedUnit?: string;
}

export interface ProjectState {
    name: string;
    items: CostItem[];
    factorQ: boolean; // Safety buffer
    factorQPercentage: number;
    profitMargin: number;
}

export interface InventoryItem {
    id: string;
    name: string;
    type: 'PRODUCTO' | 'RECETA';
    totalCost: number;
    salePrice: number;
    profitMargin: number;
    itemsCount: number;
    date: number;
}

export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
    timestamp: number;
}

export interface AppSettings {
    currency: string;
    language: string;
    measurementSystem: 'metric' | 'imperial';
    factorQPercentage: number;
    monthlySalary: number;
}

export interface OrganizationSettings {
    name: string;
    slogan: string;
    logo: string;
}