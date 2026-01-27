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
    db_id?: string; // Supabase ID for ingredients
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
    laborCost: number; // Costo total de mano de obra
    laborTimeMinutes: number; // Tiempo en minutos
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

// Theme System Types
export type ThemeName = 'default' | 'dark' | 'feminine' | 'galaxy';

export interface ThemeConfig {
    name: ThemeName;
    label: string;
    description: string;
    icon: string;
    preview: {
        bg: string;
        accent: string;
        text: string;
    };
}

export interface FixedCost {
    id: string;
    name: string;
    amount: number;
    frequency: 'mensual' | 'quincenal';
    paymentDay: number;
}

export interface Customer {
    id: string;
    name: string;
    phone: string;
    email: string;
    city: string;
}

export interface Sale {
    id: string;
    created_at: string;
    total: number;
    paymentMethod: 'nequi' | 'daviplata' | 'efectivo' | 'transferencia';
    customer_id?: string;
    items: SaleItem[];
}

export interface SaleItem {
    id: string;
    sale_id: string;
    dish_id: string;
    quantity: number;
    price: number;
    extras?: string; // JSON string or simple text for now
}

export interface PaymentMethod {
    id: string;
    name: string;
    active: boolean;
}

export interface InventoryMovement {
    id: string;
    ingredient_id: string;
    type: 'COMPRA' | 'VENTA' | 'AJUSTE';
    quantity: number;
    date: string;
    description?: string;
}

export interface FixedExpense {
    id: string;
    name: string;
    amount: number;
    frequency: 'mensual' | 'quincenal' | 'anual';
    category?: string;
}