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
    user_id?: string;
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    notes?: string;
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
    cost_unit?: number;
    provider?: string;
}

export interface FixedExpense {
    id: string;
    name: string;
    amount: number;
    frequency: 'mensual' | 'quincenal' | 'anual';
    category?: string;
}

// Outflow Modal Types
export type OutflowType = 'COMPRA' | 'GASTO';

export interface ExpenseCategory {
    id: string;
    name: string;
    icon: string;
    user_id?: string;
}

export interface Expense {
    id: string;
    user_id?: string;
    category_id: string;
    category_name?: string;
    amount: number;
    provider?: string;
    payment_method_id?: string;
    date: string;
    notes?: string;
}

export interface PurchaseResult {
    old_stock: number;
    new_stock: number;
    old_unit_cost: number;
    new_unit_cost: number;
}

// Providers (Proveedores)
export interface Provider {
    id: string;
    user_id?: string;
    name: string;
    nit?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    category?: string;
    notes?: string;
}

// Service Types (Tipos de Servicio)
export interface ServiceType {
    id: string;
    user_id?: string;
    name: string;
    is_default?: boolean;
}

// Services (Servicios/Gastos Operativos)
export interface Service {
    id: string;
    user_id?: string;
    name: string;
    service_type_id?: string;
    service_type_name?: string;
}

// Movement Types
export type MovementType = 'COMPRA' | 'VENTA' | 'GASTO' | 'AJUSTE';
export type MovementStatus = 'BORRADOR' | 'CONFIRMADO' | 'ANULADO' | 'COMPLETADO';

// Movement (Documento cabecera de transacción)
export interface Movement {
    id: string;
    user_id?: string;
    type: MovementType;
    document_number: string;
    date: string;
    customer_id?: string;
    customer_name?: string;
    provider_id?: string;
    provider_name?: string;
    service_id?: string;
    service_name?: string;
    status: MovementStatus;
    subtotal: number;
    total: number;
    notes?: string;
    attachment_url?: string;
    sale_id?: string;
    expense_id?: string;
    created_at: string;
    updated_at?: string;
    lines?: MovementLine[];
}

// Movement Lines (Líneas de detalle)
export interface MovementLine {
    id: string;
    movement_id: string;
    ingredient_id?: string;
    ingredient_name?: string;
    dish_id?: string;
    dish_name?: string;
    expense_category_id?: string;
    category_name?: string;
    description?: string;
    quantity: number;
    unit_cost: number;
    unit_price: number;
    line_total: number;
}