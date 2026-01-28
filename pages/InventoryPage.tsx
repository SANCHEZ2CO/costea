import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useNavigate } from 'react-router-dom';
import HeaderSimple from '../components/HeaderSimple';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../constants';
import { InventoryItem, OutflowType, PurchaseResult } from '../types';
import LiquidModal from '../components/LiquidModal';
import IngredientModal from '../components/Inventory/IngredientModal';
import RecipeModal from '../components/Inventory/RecipeModal';
import PurchaseModal from '../components/Inventory/PurchaseModal';
import OutflowModal from '../components/Inventory/OutflowModal';

// --- Helper Components (Defined before usage to avoid hoisting issues) ---

// --- Helper Components ---
// PurchaseSection removed in favor of PurchaseModal


const InventoryList: React.FC<{
    filterType: 'PRODUCTO' | 'RECETA' | 'INSUMO';
    loadingData: boolean;
    filteredIngredients: any[];
    displayItems: any[];
    ingredients: any[];
    dishes: any[];
    formatCurrency: (value: number) => string;
    setEditingIngredient: (item: any) => void;
    setEditingRecipe: (item: any) => void;
    setShowDeleteConfirm: (item: any) => void;
}> = ({
    filterType,
    loadingData,
    filteredIngredients,
    displayItems,
    dishes,
    formatCurrency,
    setEditingIngredient,
    setEditingRecipe,
    setShowDeleteConfirm
}) => {
        return (
            <div className="relative group animate-fade-in-up md:delay-100">
                {/* AI Arc Glow Effect */}
                <div className="absolute inset-[-2px] rounded-[34px] overflow-hidden opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div
                        className="absolute inset-[-100%] animate-[spin_4s_linear_infinite] blur-md will-change-transform"
                        style={{
                            background: `conic-gradient(from 0deg, ${filterType === 'PRODUCTO'
                                ? "theme('colors.indigo.500'), theme('colors.purple.500'), theme('colors.pink.500'), theme('colors.indigo.600'), theme('colors.indigo.500')"
                                : filterType === 'RECETA'
                                    ? "theme('colors.orange.500'), theme('colors.amber.500'), theme('colors.yellow.400'), theme('colors.orange.600'), theme('colors.orange.500')"
                                    : "theme('colors.blue.500'), theme('colors.blue.400'), theme('colors.cyan.400'), theme('colors.blue.600'), theme('colors.blue.500')"
                                })`
                        }}
                    />
                </div>

                <div className="relative bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-[32px] shadow-2xl border border-white/20 dark:border-white/10 overflow-hidden min-h-[500px] flex flex-col">
                    {/* List Header Bar */}
                    <div className="hidden md:grid grid-cols-[1.5fr,1fr,1.2fr,1.2fr,0.6fr] gap-4 px-10 py-5 bg-white/50 dark:bg-white/5 border-b border-white/40 dark:border-white/5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] relative z-10 transition-colors">
                        <div>Ítem / Identificación</div>
                        <div className="text-center">{filterType === 'INSUMO' ? 'Rendimiento' : 'Eficiencia'}</div>
                        <div className="text-right">Inversión {filterType === 'PRODUCTO' ? 'Producc.' : filterType === 'INSUMO' ? 'Unitario' : ''}</div>
                        <div className="text-right">{filterType === 'PRODUCTO' ? 'Precio Público' : filterType === 'INSUMO' ? 'Compra Total' : 'Valor Total'}</div>
                        <div className="text-right">Gestión</div>
                    </div>

                    <div className="flex-1 divide-y divide-slate-100 dark:divide-white/5 relative z-10">
                        {loadingData ? (
                            <div className="py-32 flex flex-col items-center justify-center text-slate-300 space-y-4">
                                <span className="material-symbols-outlined text-5xl animate-spin text-indigo-500">progress_activity</span>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em]">Sincronizando con la nube...</p>
                            </div>
                        ) : filterType === 'INSUMO' ? (
                            filteredIngredients.length > 0 ? filteredIngredients.map(ing => (
                                <div key={ing.id} className="grid grid-cols-[1fr,auto] md:grid-cols-[1.5fr,1fr,1.2fr,1.2fr,0.6fr] gap-3 px-4 py-3 md:px-10 md:py-4 items-center group hover:bg-blue-50/50 dark:hover:bg-blue-500/5 transition-all animate-fade-in border-b border-slate-100 last:border-0 md:border-none">
                                    {/* Name & Icon */}
                                    <div className="flex items-center gap-3">
                                        <div className="size-10 md:size-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 shadow-sm border border-blue-100 dark:border-blue-500/20">
                                            <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                                        </div>
                                        <div className="truncate min-w-0">
                                            <h4 className="font-bold text-slate-800 dark:text-white text-sm truncate tracking-tight">{ing.name}</h4>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className={`px-1.5 py-0.5 text-[8px] font-black uppercase rounded tracking-widest ${ing.purchase_quantity < 5 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-blue-100 dark:bg-blue-500/20 text-blue-600'}`}>
                                                    {ing.purchase_quantity} {ing.purchase_unit}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Mobile Right Side: Cost & Actions */}
                                    <div className="flex flex-col items-end gap-1 md:hidden">
                                        <div className="text-right">
                                            <div className="text-sm font-black text-blue-600">{formatCurrency(ing.purchase_price)}</div>
                                        </div>
                                        <div className="flex justify-end gap-1">
                                            <button onClick={() => setEditingIngredient(ing)} className="size-8 rounded-lg bg-slate-50 text-slate-400 hover:text-blue-600 flex items-center justify-center">
                                                <span className="material-symbols-outlined text-[16px]">edit</span>
                                            </button>
                                            <button onClick={() => setShowDeleteConfirm({ id: ing.id, name: ing.name, type: 'INSUMO' })} className="size-8 rounded-lg bg-slate-50 text-slate-400 hover:text-red-500 flex items-center justify-center">
                                                <span className="material-symbols-outlined text-[16px]">delete</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Desktop Columns (Hidden on Mobile) */}
                                    <div className="hidden md:flex justify-center">
                                        {/* Low Stock Alert */}
                                        <div className={`py-1.5 px-4 rounded-full flex items-center gap-2 border transition-all ${ing.purchase_quantity < 5 ? 'bg-red-50 border-red-200 text-red-600 shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse' : 'bg-slate-100/50 dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-200'}`}>
                                            <span className="text-[11px] font-black uppercase tracking-tighter">{ing.purchase_quantity} {ing.purchase_unit}</span>
                                            {ing.purchase_quantity < 5 && <span className="material-symbols-outlined text-[14px]">priority_high</span>}
                                        </div>
                                    </div>

                                    <div className="hidden md:block text-right">
                                        <p className="text-sm font-black text-slate-900 dark:text-white">{formatCurrency(ing.purchase_price / (ing.purchase_quantity || 1))}</p>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">x {ing.purchase_unit}</p>
                                    </div>

                                    <div className="hidden md:block text-right">
                                        <div className="text-lg font-black text-blue-600 drop-shadow-sm">{formatCurrency(ing.purchase_price)}</div>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Invertido</p>
                                    </div>

                                    <div className="hidden md:flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                                        <button onClick={() => setEditingIngredient(ing)} className="size-10 rounded-xl bg-white dark:bg-slate-800 text-slate-400 hover:text-blue-600 shadow-sm border border-slate-100 dark:border-white/5 flex items-center justify-center transition-all hover:scale-110 active:scale-95">
                                            <span className="material-symbols-outlined text-[20px]">edit_note</span>
                                        </button>
                                        <button onClick={() => setShowDeleteConfirm({ id: ing.id, name: ing.name, type: 'INSUMO' })} className="size-10 rounded-xl bg-white dark:bg-slate-800 text-slate-400 hover:text-red-500 shadow-sm border border-slate-100 dark:border-white/5 flex items-center justify-center transition-all hover:scale-110 active:scale-95">
                                            <span className="material-symbols-outlined text-[20px]">delete</span>
                                        </button>
                                    </div>
                                </div>
                            )) : (
                                <div className="py-32 text-center text-slate-300 flex flex-col items-center gap-6">
                                    <div className="size-24 rounded-[32px] bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-200 border-2 border-dashed border-slate-100 dark:border-white/10">
                                        <span className="material-symbols-outlined text-5xl">inventory</span>
                                    </div>
                                    <p className="text-xs font-black uppercase tracking-[0.2em]">Depósito Vacío</p>
                                </div>
                            )
                        ) : filterType === 'RECETA' ? (
                            displayItems.length > 0 ? displayItems.map(item => (
                                <div key={item.id} className="grid grid-cols-[1fr,auto] md:grid-cols-[1.5fr,1fr,1.2fr,1.2fr,0.6fr] gap-3 px-4 py-3 md:px-10 md:py-5 items-center group hover:bg-orange-50/50 dark:hover:bg-orange-500/5 transition-all animate-fade-in border-b border-slate-100 last:border-0 md:border-none">
                                    <div className="flex items-center gap-3">
                                        <div className="size-10 md:size-12 rounded-xl md:rounded-2xl bg-orange-50 dark:bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0 shadow-sm border border-orange-100 dark:border-orange-500/20">
                                            <span className="material-symbols-outlined text-[18px] md:text-[20px]">skillet</span>
                                        </div>
                                        <div className="truncate min-w-0">
                                            <h4 className="font-bold text-slate-800 dark:text-white text-sm md:text-base truncate tracking-tight">{item.name}</h4>
                                            <span className="px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/40 text-orange-600 text-[8px] font-black uppercase rounded tracking-widest">Receta</span>
                                        </div>
                                    </div>

                                    {/* Mobile Right */}
                                    <div className="flex flex-col items-end paragraph md:hidden">
                                        <p className="text-sm font-black text-slate-800 dark:text-white">{formatCurrency(item.totalCost)}</p>
                                        <div className="flex gap-1 mt-1">
                                            <button onClick={() => { const full = dishes.find(d => d.id === item.id); setEditingRecipe(full); }} className="size-8 rounded-lg bg-orange-50/50 text-orange-600 flex items-center justify-center">
                                                <span className="material-symbols-outlined text-[16px]">edit</span>
                                            </button>
                                            <button onClick={() => setShowDeleteConfirm({ id: item.id, name: item.name, type: 'RECETA' })} className="size-8 rounded-lg bg-slate-50 text-slate-400 hover:text-red-500 flex items-center justify-center">
                                                <span className="material-symbols-outlined text-[16px]">delete</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="hidden md:block text-center">
                                        <span className="text-[9px] font-black bg-orange-500 text-white py-1.5 px-4 rounded-full tracking-widest uppercase">Estructural</span>
                                    </div>

                                    <div className="hidden md:block text-right">
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Insumos Consolidados</p>
                                    </div>

                                    <div className="hidden md:block text-right">
                                        <p className="text-lg font-black text-slate-800 dark:text-white drop-shadow-sm">{formatCurrency(item.totalCost)}</p>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Costo Técnico</p>
                                    </div>

                                    <div className="hidden md:flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                        <button onClick={() => { const full = dishes.find(d => d.id === item.id); setEditingRecipe(full); }} className="size-10 rounded-xl bg-white dark:bg-slate-800 text-slate-400 hover:text-orange-600 shadow-sm border border-slate-100 dark:border-white/5 flex items-center justify-center transition-all hover:scale-110 active:scale-95">
                                            <span className="material-symbols-outlined text-[20px]">edit_note</span>
                                        </button>
                                        <button onClick={() => setShowDeleteConfirm({ id: item.id, name: item.name, type: 'RECETA' })} className="size-10 rounded-xl bg-white dark:bg-slate-800 text-slate-400 hover:text-red-500 shadow-sm border border-slate-100 dark:border-white/5 flex items-center justify-center transition-all hover:scale-110 active:scale-95">
                                            <span className="material-symbols-outlined text-[20px]">delete</span>
                                        </button>
                                    </div>
                                </div>
                            )) : (
                                <div className="py-32 text-center text-slate-300 flex flex-col items-center gap-6">
                                    <div className="size-24 rounded-[32px] bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-200 border-2 border-dashed border-slate-100 dark:border-white/10">
                                        <span className="material-symbols-outlined text-5xl">skillet</span>
                                    </div>
                                    <p className="text-xs font-black uppercase tracking-[0.2em]">Sin Recetas Registradas</p>
                                </div>
                            )
                        ) : (
                            // PRODUCTOS
                            displayItems.length > 0 ? displayItems.map(item => (
                                <div key={item.id} className="grid grid-cols-[1fr,auto] md:grid-cols-[1.5fr,1fr,1.2fr,1.2fr,0.6fr] gap-3 px-4 py-4 md:px-10 md:py-6 items-center group hover:bg-slate-50/50 dark:hover:bg-white/5 transition-all animate-fade-in relative overflow-hidden border-b border-slate-100 last:border-0 md:border-none">
                                    <div className="flex items-center gap-3">
                                        <div className="size-10 md:size-12 rounded-xl md:rounded-2xl bg-slate-900 dark:bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 shadow-lg border border-slate-800 dark:border-white/10">
                                            <span className="material-symbols-outlined text-[18px] md:text-[20px]">restaurant_menu</span>
                                        </div>
                                        <div className="truncate min-w-0">
                                            <h4 className="font-black text-slate-800 dark:text-white text-sm md:text-lg tracking-tighter truncate">{item.name}</h4>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${item.profitMargin && item.profitMargin > 50 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                                    {item.profitMargin ? `${item.profitMargin.toFixed(0)}% Utilidad` : 'Catálogo'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Mobile Right */}
                                    <div className="flex flex-col items-end md:hidden">
                                        <p className="text-lg font-black text-slate-900 dark:text-white tracking-tighter">{formatCurrency(item.salePrice)}</p>
                                        <div className="flex gap-1 mt-1">
                                            <button onClick={() => { const full = dishes.find(d => d.id === item.id); setEditingRecipe(full); }} className="size-8 rounded-lg bg-slate-100 text-indigo-600 flex items-center justify-center">
                                                <span className="material-symbols-outlined text-[16px]">edit</span>
                                            </button>
                                            <button onClick={() => setShowDeleteConfirm({ id: item.id, name: item.name, type: 'PRODUCTO' })} className="size-8 rounded-lg bg-slate-50 text-slate-400 hover:text-red-500 flex items-center justify-center">
                                                <span className="material-symbols-outlined text-[16px]">delete</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="hidden md:block text-center">
                                        <div className={`inline-flex items-center px-4 py-1.5 rounded-full border text-[10px] font-black tracking-widest uppercase ${item.profitMargin && item.profitMargin > 50 ? 'bg-green-100/50 border-green-200 text-green-700 dark:bg-green-500/10 dark:border-green-500/30 dark:text-green-400' : 'bg-indigo-100/50 border-indigo-200 text-indigo-700 dark:bg-indigo-500/10 dark:border-indigo-500/30 dark:text-indigo-400'}`}>
                                            {(item.profitMargin || 0).toFixed(0)}% MARGEN
                                        </div>
                                    </div>

                                    <div className="hidden md:block text-right">
                                        <p className="text-sm font-black text-slate-500 dark:text-slate-400">{formatCurrency(item.totalCost)}</p>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Inversión</p>
                                    </div>

                                    <div className="hidden md:block text-right">
                                        <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter drop-shadow-sm">{formatCurrency(item.salePrice)}</p>
                                        <p className="text-[9px] text-indigo-500 font-black uppercase tracking-[0.2em]">Público Sugerido</p>
                                    </div>

                                    <div className="hidden md:flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                        <button onClick={() => { const full = dishes.find(d => d.id === item.id); setEditingRecipe(full); }} className="size-11 rounded-xl bg-white dark:bg-slate-800 text-slate-400 hover:text-indigo-600 shadow-sm border border-slate-100 dark:border-white/5 flex items-center justify-center transition-all hover:scale-110 active:scale-95">
                                            <span className="material-symbols-outlined text-[20px]">edit_note</span>
                                        </button>
                                        <button onClick={() => setShowDeleteConfirm({ id: item.id, name: item.name, type: 'PRODUCTO' })} className="size-11 rounded-xl bg-white dark:bg-slate-800 text-slate-400 hover:text-red-500 shadow-sm border border-slate-100 dark:border-white/5 flex items-center justify-center transition-all hover:scale-110 active:scale-95">
                                            <span className="material-symbols-outlined text-[20px]">delete</span>
                                        </button>
                                    </div>
                                </div>
                            )) : (
                                <div className="py-32 text-center text-slate-300 flex flex-col items-center gap-6">
                                    <div className="size-24 rounded-[32px] bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-200 border-2 border-dashed border-slate-100 dark:border-white/10">
                                        <span className="material-symbols-outlined text-5xl">restaurant_menu</span>
                                    </div>
                                    <p className="text-xs font-black uppercase tracking-[0.2em]">Menú no inicializado</p>
                                </div>
                            )
                        )}
                    </div>
                </div>
            </div>
        );
    }

// --- Main Page Component ---

const InventoryPage: React.FC = () => {
    const navigate = useNavigate();
    const { resetProject, user } = useApp();
    const [filterType, setFilterType] = useState<'PRODUCTO' | 'RECETA' | 'INSUMO'>('PRODUCTO');

    // viewMode removed: Always Inventory View now, Modal for Purchase


    // Supabase Data State
    const [ingredients, setIngredients] = useState<any[]>([]);
    const [dishes, setDishes] = useState<any[]>([]);
    const [loadingData, setLoadingData] = useState(false);

    // Modal Visibility States
    const [showNewRecipeModal, setShowNewRecipeModal] = useState(false);
    const [showNewIngredientModal, setShowNewIngredientModal] = useState(false);
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);
    const [showOutflowModal, setShowOutflowModal] = useState(false);

    // Success Animation States
    const [showPurchaseSuccess, setShowPurchaseSuccess] = useState(false);
    const [showExpenseSuccess, setShowExpenseSuccess] = useState(false);
    const [lastPurchaseResult, setLastPurchaseResult] = useState<PurchaseResult | null>(null);

    // Editing States
    const [editingIngredient, setEditingIngredient] = useState<any | null>(null);
    const [editingRecipe, setEditingRecipe] = useState<any | null>(null);

    // Filter / Search in List
    const [productSearchFilter, setProductSearchFilter] = useState('');
    const [recipeSearchFilter, setRecipeSearchFilter] = useState('');
    const [ingredientSearchFilter, setIngredientSearchFilter] = useState('');

    // Delete Confirmation Logic
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ id: string, name: string, type: 'INSUMO' | 'PRODUCTO' | 'RECETA' } | null>(null);

    // Generic Alerts
    const [alertModal, setAlertModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'success' | 'error' | 'warning' | 'info';
    }>({ isOpen: false, title: '', message: '', type: 'info' });

    const showAlert = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
        setAlertModal({ isOpen: true, title, message, type });
    };

    // --- Data Fetching ---

    const fetchIngredients = async () => {
        setLoadingData(true);
        const { data, error } = await supabase.from('ingredients').select('*').order('created_at', { ascending: false });
        if (!error) setIngredients(data || []);
        else console.error(error);
        setLoadingData(false);
    };

    const fetchDishes = async () => {
        setLoadingData(true);
        const { data, error } = await supabase.from('dishes').select('*').order('created_at', { ascending: false });
        if (!error) setDishes(data || []);
        else console.error(error);
        setLoadingData(false);
    };

    useEffect(() => {
        if (!user) return;
        fetchIngredients();
        fetchDishes();
    }, [user]);

    // --- Filtering Logic ---

    const getDisplayItems = () => {
        if (filterType === 'INSUMO') return [];
        const dbItems: InventoryItem[] = dishes.map(d => ({
            id: d.id,
            name: d.name,
            type: d.sale_price > 0 ? 'PRODUCTO' : 'RECETA',
            totalCost: d.total_cost,
            salePrice: d.sale_price,
            profitMargin: d.profit_margin,
            itemsCount: 0,
            date: new Date(d.created_at).getTime()
        }));

        let filteredItems = dbItems.filter(item => item.type === filterType);
        const searchFilter = filterType === 'PRODUCTO' ? productSearchFilter : recipeSearchFilter;
        if (searchFilter.trim()) {
            filteredItems = filteredItems.filter(item => item.name.toLowerCase().includes(searchFilter.toLowerCase()));
        }
        return filteredItems;
    };

    const getFilteredIngredients = () => {
        if (!ingredientSearchFilter.trim()) return ingredients;
        return ingredients.filter(ing => ing.name.toLowerCase().includes(ingredientSearchFilter.toLowerCase()));
    };

    const displayItems = getDisplayItems();
    const filteredIngredients = getFilteredIngredients();

    // --- Handlers ---

    const handleNewProject = () => {
        resetProject();
        navigate('/costing-engine');
    };

    const handleDelete = async () => {
        if (!showDeleteConfirm || !user) return;
        try {
            const table = showDeleteConfirm.type === 'INSUMO' ? 'ingredients' : 'dishes';
            const { error } = await supabase.from(table).delete().eq('id', showDeleteConfirm.id);
            if (error) {
                if (error.message.includes('foreign key constraint')) showAlert("No se puede eliminar", "Este ítem está siendo usado en una receta o producto.", "warning");
                else throw error;
            } else {
                if (showDeleteConfirm.type === 'INSUMO') fetchIngredients();
                else fetchDishes();
                setShowDeleteConfirm(null);
                showAlert("Eliminado", "El ítem ha sido eliminado correctamente.", "success");
            }
        } catch (error: any) {
            console.error(error);
            showAlert("Error", "Error al eliminar: " + error.message, "error");
        }
    };

    return (
        <div className="bg-[#F8F9FB] dark:bg-slate-900 min-h-screen text-slate-800 dark:text-white font-display flex flex-col transition-colors duration-300">
            <HeaderSimple />

            {/* --- MODALS --- */}

            <LiquidModal
                isOpen={alertModal.isOpen}
                title={alertModal.title}
                message={alertModal.message}
                type={alertModal.type}
                onClose={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
            />

            <LiquidModal
                isOpen={!!showDeleteConfirm}
                title="¿Confirmar eliminación?"
                message={showDeleteConfirm ? `Estás a punto de eliminar "${showDeleteConfirm.name}". Esta acción no se puede deshacer.` : ''}
                type="error"
                confirmText="Eliminar"
                showCancel
                onClose={() => setShowDeleteConfirm(null)}
                onConfirm={handleDelete}
            />

            {/* Create / Edit Modals */}
            <IngredientModal
                isOpen={showNewIngredientModal || !!editingIngredient}
                onClose={() => { setShowNewIngredientModal(false); setEditingIngredient(null); }}
                onSuccess={() => { fetchIngredients(); }}
                editingIngredient={editingIngredient}
            />

            <RecipeModal
                isOpen={showNewRecipeModal || !!editingRecipe}
                onClose={() => { setShowNewRecipeModal(false); setEditingRecipe(null); }}
                onSuccess={() => { fetchDishes(); }}
                editingRecipe={editingRecipe}
            />

            <PurchaseModal
                isOpen={showPurchaseModal}
                onClose={() => setShowPurchaseModal(false)}
                onSuccess={() => { fetchIngredients(); showAlert("Compra Registrada", "Inventario actualizado correctamente.", "success"); }}
                ingredients={ingredients}
            />

            {/* Outflow Modal (Unified Purchase/Expense) */}
            <OutflowModal
                isOpen={showOutflowModal}
                onClose={() => setShowOutflowModal(false)}
                onSuccess={(type: OutflowType, result?: PurchaseResult) => {
                    if (type === 'COMPRA') {
                        fetchIngredients();
                        if (result) setLastPurchaseResult(result);
                        setShowPurchaseSuccess(true);
                        setTimeout(() => setShowPurchaseSuccess(false), 3500);
                    } else {
                        setShowExpenseSuccess(true);
                        setTimeout(() => setShowExpenseSuccess(false), 3500);
                    }
                }}
                ingredients={ingredients}
            />

            {/* Purchase Success Animation */}
            {showPurchaseSuccess && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in pointer-events-none">
                    <div className="bg-white dark:bg-slate-800 p-10 rounded-[32px] shadow-2xl flex flex-col items-center gap-4 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10" />
                        <div className="size-24 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 flex items-center justify-center mb-2 shadow-lg shadow-blue-500/20">
                            <span className="text-6xl">📦</span>
                        </div>
                        <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">¡Compra Registrada!</h2>
                        {lastPurchaseResult && (
                            <div className="bg-blue-50 dark:bg-blue-900/30 px-6 py-3 rounded-xl border border-blue-100 dark:border-blue-500/20">
                                <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                    Stock: {lastPurchaseResult.old_stock.toFixed(1)} → {lastPurchaseResult.new_stock.toFixed(1)}
                                </p>
                            </div>
                        )}
                        {/* Confetti dots */}
                        <div className="absolute top-5 left-1/4 w-2 h-2 bg-blue-500 rounded-full animate-ping" />
                        <div className="absolute top-10 right-1/4 w-3 h-3 bg-cyan-500 rounded-full animate-ping delay-100" />
                        <div className="absolute bottom-10 left-10 w-2 h-2 bg-indigo-500 rounded-full animate-ping delay-200" />
                    </div>
                </div>
            )}

            {/* Expense Success Animation */}
            {showExpenseSuccess && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in pointer-events-none">
                    <div className="bg-white dark:bg-slate-800 p-10 rounded-[32px] shadow-2xl flex flex-col items-center gap-4 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-orange-500/10" />
                        <div className="size-24 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-600 flex items-center justify-center mb-2 shadow-lg shadow-amber-500/20">
                            <span className="text-6xl">💸</span>
                        </div>
                        <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">¡Gasto Registrado!</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Registrado en contabilidad</p>
                        {/* Confetti dots */}
                        <div className="absolute top-5 left-1/4 w-2 h-2 bg-amber-500 rounded-full animate-ping" />
                        <div className="absolute top-10 right-1/4 w-3 h-3 bg-orange-500 rounded-full animate-ping delay-100" />
                        <div className="absolute bottom-10 left-10 w-2 h-2 bg-yellow-500 rounded-full animate-ping delay-200" />
                    </div>
                </div>
            )}


            <main className="w-full max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-8">

                {/* 1. Page Header (Minimal) */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-1">
                        <button onClick={() => navigate('/')} className="group flex items-center gap-2 text-slate-400 hover:text-orange-500 mb-6 transition-all font-black text-[10px] uppercase tracking-[0.2em]">
                            <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-1 transition-transform">arrow_back</span>
                            Panel de Control
                        </button>
                        <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter text-balance">Inventario</h2>
                        <p className="text-slate-400 font-medium text-sm">Gestiona tus insumos y creaciones con precisión quirúrgica.</p>
                    </div>

                    {/* Show Action Buttons */}
                    <div className="flex flex-wrap gap-3">
                        {filterType === 'PRODUCTO' && (
                            <button onClick={handleNewProject} className="group relative overflow-hidden bg-slate-900 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-black text-xs uppercase tracking-[0.15em] transition-all active:scale-95 hover:bg-black">
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                <span className="material-symbols-outlined text-indigo-400 font-bold">add_circle</span>
                                Nuevo Costeo
                            </button>
                        )}
                        {filterType === 'RECETA' && (
                            <button onClick={() => setShowNewRecipeModal(true)} className="group relative overflow-hidden bg-orange-500 text-white px-8 py-4 rounded-2xl shadow-xl flex items-center gap-3 font-black text-xs uppercase tracking-[0.15em] transition-all active:scale-95 hover:bg-orange-600">
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                <span className="material-symbols-outlined font-bold">skillet</span>
                                Nueva Receta
                            </button>
                        )}
                        {filterType === 'INSUMO' && (
                            <>
                                <button onClick={() => setShowOutflowModal(true)} className="group relative overflow-hidden bg-emerald-500 text-white px-8 py-4 rounded-2xl shadow-xl flex items-center gap-3 font-black text-xs uppercase tracking-[0.15em] transition-all active:scale-95 hover:bg-emerald-600">
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                    <span className="material-symbols-outlined font-bold">payments</span>
                                    Registrar Salida
                                </button>
                                <button onClick={() => setShowNewIngredientModal(true)} className="group relative overflow-hidden bg-blue-600 text-white px-8 py-4 rounded-2xl shadow-xl flex items-center gap-3 font-black text-xs uppercase tracking-[0.15em] transition-all active:scale-95 hover:bg-blue-700">
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                    <span className="material-symbols-outlined font-bold">inventory_2</span>
                                    Nuevo Insumo
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* View Mode Tabs (Restored Logic) */}
                <div className="flex flex-col md:flex-row items-center gap-4 mb-2">
                    <div className="flex p-1.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm w-full md:w-auto overflow-x-auto">
                        <button
                            onClick={() => setFilterType('INSUMO')}
                            className={`flex-1 md:flex-none px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${filterType === 'INSUMO' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'}`}
                        >
                            <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                            Insumos (Input)
                        </button>
                        <button
                            onClick={() => setFilterType('RECETA')}
                            className={`flex-1 md:flex-none px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${filterType === 'RECETA' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'}`}
                        >
                            <span className="material-symbols-outlined text-[18px]">skillet</span>
                            Recetas (Process)
                        </button>
                        <button
                            onClick={() => setFilterType('PRODUCTO')}
                            className={`flex-1 md:flex-none px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${filterType === 'PRODUCTO' ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'}`}
                        >
                            <span className="material-symbols-outlined text-[18px]">restaurant_menu</span>
                            Menús (Output)
                        </button>
                    </div>

                    {/* Search Bars Dynamic */}
                    <div className="flex-1 w-full relative group">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 group-focus-within:text-blue-500 transition-colors">search</span>
                        <input
                            type="text"
                            placeholder={filterType === 'INSUMO' ? "Buscar insumo..." : filterType === 'RECETA' ? "Buscar receta..." : "Buscar menú..."}
                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-2xl pl-12 pr-4 py-3 text-sm font-bold outline-none focus:border-blue-500 transition-all shadow-sm text-slate-700 dark:text-white placeholder:text-slate-300"
                            value={filterType === 'INSUMO' ? ingredientSearchFilter : filterType === 'RECETA' ? recipeSearchFilter : productSearchFilter}
                            onChange={e => {
                                const val = e.target.value;
                                if (filterType === 'INSUMO') setIngredientSearchFilter(val);
                                else if (filterType === 'RECETA') setRecipeSearchFilter(val);
                                else setProductSearchFilter(val);
                            }}
                        />
                    </div>
                </div>


                {/* List Component (AI Arc Wrapper) */}
                <InventoryList
                    filterType={filterType}
                    loadingData={loadingData}
                    filteredIngredients={filteredIngredients}
                    displayItems={displayItems}
                    ingredients={ingredients}
                    dishes={dishes}
                    formatCurrency={formatCurrency}
                    setEditingIngredient={setEditingIngredient}
                    setEditingRecipe={setEditingRecipe}
                    setShowDeleteConfirm={setShowDeleteConfirm}
                />



            </main>
        </div >
    );
};

export default InventoryPage;