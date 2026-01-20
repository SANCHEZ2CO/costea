
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { useNavigate } from 'react-router-dom';
import HeaderSimple from '../components/HeaderSimple';
import { useApp } from '../context/AppContext';
import { ItemType, CostItem } from '../types';
import { formatCurrency } from '../constants';
import IngredientModal from '../components/Inventory/IngredientModal';
import LiquidModal from '../components/LiquidModal';

// --- COMPONENTS ---

// 1. Profit Ring Component (Visual Feedback)
const ProfitRing = ({ cost, labor, marginPercentage = 35 }: { cost: number, labor: number, marginPercentage?: number }) => {
    // Logic for "Health": In a Costing context, we assume a target margin. 
    // This visualization represents the "Construction" of the cost. 
    // As it fills, it shifts color. 
    const total = cost + labor;
    const progress = Math.min((total / 50000) * 100, 100);

    // Profit Health Colors
    let color = "#10B981"; // Green
    if (total > 20000) color = "#F59E0B"; // Yellow
    if (total > 50000) color = "#EF4444"; // Red

    const radius = 30;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <div className="relative size-20 flex items-center justify-center">
            {/* Background Circle */}
            <svg className="size-full rotate-[-90deg]">
                <circle cx="50%" cy="50%" r={radius} stroke="#E5E7EB" strokeWidth="6" fill="transparent" />
                <circle
                    cx="50%" cy="50%" r={radius}
                    stroke={color}
                    strokeWidth="6"
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center flex-col">
                <span className="text-[10px] font-bold text-gray-400">Margen</span>
                <span className="text-xs font-bold" style={{ color }}>{marginPercentage}%</span>
            </div>
        </div>
    );
};

const CostingEnginePage: React.FC = () => {
    const navigate = useNavigate();
    const { project, updateProjectName, addItem, updateItem, removeItem, toggleFactorQ, settings, updateLaborCost, user } = useApp();
    const [editingCostItem, setEditingCostItem] = useState<CostItem | null>(null);
    const [editingIngredient, setEditingIngredient] = useState<any | null>(null); // For IngredientModal

    // Labor State
    const [laborTimeMinutes, setLaborTimeMinutes] = useState<number>(project.laborTimeMinutes || 0);

    // Omni-Search State
    const [omniSearchQuery, setOmniSearchQuery] = useState('');
    const [omniResults, setOmniResults] = useState<any[]>([]);
    const [isOmniSearching, setIsOmniSearching] = useState(false);
    const [selectedOmniItem, setSelectedOmniItem] = useState<any | null>(null);
    const [showOmniDropdown, setShowOmniDropdown] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    // Yield Logic State (Replaces simple Qty)
    const [yieldAmount, setYieldAmount] = useState('');

    // Recipe Builder State
    const [itemType, setItemType] = useState<ItemType>(ItemType.INSUMO); // Default to standard mode, but can switch
    const [recipeName, setRecipeName] = useState('');
    const [tempRecipeIngredients, setTempRecipeIngredients] = useState<CostItem[]>([]);

    // UI States
    const [isFocusedName, setIsFocusedName] = useState(false);
    const [profitRingPulse, setProfitRingPulse] = useState(false);

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [validationModal, setValidationModal] = useState({ isOpen: false, title: '', message: '' });

    const isRecipeMode = itemType === ItemType.RECETA;
    const isEditingRecipe = isRecipeMode && recipeName !== ''; // Visual cue we are in builder

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowOmniDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Flash Effect on Ingredient Add (Gamification)
    useEffect(() => {
        if (project.items.length > 0 || tempRecipeIngredients.length > 0) {
            setProfitRingPulse(true);
            const t = setTimeout(() => setProfitRingPulse(false), 500);
            return () => clearTimeout(t);
        }
    }, [project.items.length, tempRecipeIngredients.length]);

    // Omni Search Logic
    useEffect(() => {
        const performSearch = async () => {
            if (omniSearchQuery.length < 2) {
                setOmniResults([]);
                // Keep dropdown open to show Creation options
                return;
            }
            setIsOmniSearching(true);
            setShowOmniDropdown(true);

            try {
                // Fetch Ingredients
                const { data: ingData } = await supabase
                    .from('ingredients')
                    .select('*')
                    .ilike('name', `%${omniSearchQuery}%`)
                    .limit(5);

                // Fetch Dishes (Recipes)
                const { data: dishData } = await supabase
                    .from('dishes')
                    .select('*')
                    .ilike('name', `%${omniSearchQuery}%`)
                    .limit(3);

                // Format & Combine
                const formattedIngs = (ingData || []).map(i => ({ ...i, category: 'INSUMO', typeIcon: 'inventory_2', typeColor: 'violet' }));
                const formattedDishes = (dishData || []).map(d => ({
                    ...d,
                    category: 'RECETA',
                    typeIcon: 'skillet',
                    typeColor: 'orange',
                    purchase_price: d.total_cost, // Map for consistent access
                    purchase_unit: 'Und',
                    purchase_quantity: 1
                }));

                setOmniResults([...formattedIngs, ...formattedDishes]);
            } catch (error) {
                console.error("Search error", error);
            } finally {
                setIsOmniSearching(false);
            }
        };

        const timeout = setTimeout(performSearch, 300);
        return () => clearTimeout(timeout);
    }, [omniSearchQuery]);

    // Handle Selection from Omni Bar
    const handleOmniSelect = (item: any) => {
        setSelectedOmniItem(item);
        setOmniSearchQuery(item.name);
        setYieldAmount('');
        setShowOmniDropdown(false);
        // Focus Yield input automatically
        setTimeout(() => document.getElementById('yield-input')?.focus(), 100);
    };

    const handleEditItem = async (item: CostItem) => {
        if (!item.db_id) return;

        if (item.type === ItemType.RECETA) {
            // For recipes, show a message (recipe editing would require navigating to a different flow)
            setValidationModal({
                isOpen: true,
                title: "Editar Receta",
                message: "Para editar una receta, ve a Inventario > Recetas y modifícala desde ahí. Los cambios se reflejarán automáticamente."
            });
            return;
        }

        const { data } = await supabase.from('ingredients').select('*').eq('id', item.db_id).single();
        if (data) {
            setEditingIngredient(data);
            setShowCreateModal(true);
        }
    };

    // Add Item to Project (or Temp Recipe)
    const handleAddItem = () => {
        if (!selectedOmniItem || !yieldAmount) return;

        const yieldVal = parseFloat(yieldAmount);
        if (yieldVal <= 0) return;

        // Yield Logic: Cost = Purchase Price / Yield
        // If I buy a pack for $10 and it Yields 10 units, cost is $1.
        const calculatedCost = selectedOmniItem.purchase_price / yieldVal;

        // Approximated used quantity for record (assuming linear usage of the whole pack)
        // Used Qty = Purchase Qty / Yield. 
        const approximatedUsedQty = selectedOmniItem.purchase_quantity / yieldVal;

        const isExistingRecipe = selectedOmniItem.category === 'RECETA';

        const newItem: CostItem = {
            id: Date.now().toString(),
            name: selectedOmniItem.name,
            type: isExistingRecipe ? ItemType.RECETA : (isRecipeMode ? ItemType.INSUMO : ItemType.INSUMO),
            cost: calculatedCost,
            db_id: selectedOmniItem.id,
            boughtPrice: selectedOmniItem.purchase_price,
            usedQty: approximatedUsedQty,
            usedUnit: selectedOmniItem.purchase_unit
        };

        if (isRecipeMode) {
            setTempRecipeIngredients([...tempRecipeIngredients, newItem]);
        } else {
            addItem(newItem);
        }

        // Reset
        setOmniSearchQuery('');
        setSelectedOmniItem(null);
        setYieldAmount('');
    };

    // Finalize New Recipe
    const handleFinalizeRecipe = async () => {
        if (tempRecipeIngredients.length === 0 || !recipeName) return;

        const totalCost = tempRecipeIngredients.reduce((acc, i) => acc + i.cost, 0);

        if (user) {
            try {
                // 1. Save Header
                const { data: dishData, error: dishError } = await supabase
                    .from('dishes')
                    .insert({
                        user_id: user.id,
                        name: recipeName,
                        total_cost: totalCost,
                        sale_price: 0,
                        profit_margin: 0
                    })
                    .select()
                    .single();

                if (dishData && !dishError) {
                    // 2. Save Details
                    const ingredientsToInsert = tempRecipeIngredients.map(item => ({
                        dish_id: dishData.id,
                        ingredient_id: item.db_id,
                        name: item.name,
                        used_quantity: item.usedQty,
                        used_unit: item.usedUnit || 'Und',
                        cost_snapshot: item.cost
                    }));

                    await supabase.from('dish_ingredients').insert(ingredientsToInsert);
                }
            } catch (err) {
                console.error("Error saving recipe:", err);
            }
        }

        // Add the finished recipe to the Main Project List
        addItem({
            id: Date.now().toString(),
            name: recipeName,
            type: ItemType.RECETA,
            cost: totalCost,
            boughtPrice: totalCost,
            usedQty: 1
        });

        // Exit Recipe Mode
        setItemType(ItemType.INSUMO);
        setRecipeName('');
        setTempRecipeIngredients([]);
    };

    // Labor Cost Logic (Live Calc)
    const monthlyMinutes = 30 * 8 * 60;
    const laborCostPerMinute = (settings?.monthlySalary || 0) / monthlyMinutes;
    const laborCostTotal = laborTimeMinutes * laborCostPerMinute;

    useEffect(() => {
        updateLaborCost(laborCostTotal, laborTimeMinutes);
    }, [laborTimeMinutes, laborCostTotal]);

    const totalMaterialsCost = isRecipeMode
        ? tempRecipeIngredients.reduce((acc, i) => acc + i.cost, 0)
        : project.items.reduce((acc, item) => acc + item.cost, 0);

    const factorQMultiplier = 1 + ((settings?.factorQPercentage || 0) / 100);
    const materialsWithFactorQ = project.factorQ ? totalMaterialsCost * factorQMultiplier : totalMaterialsCost;
    const finalCost = materialsWithFactorQ + laborCostTotal;

    // Status Badge Logic
    const healthStatus = finalCost === 0 ? "Borrador" : (laborTimeMinutes > 0 ? "Calculando..." : "Sin Mano de Obra");
    const healthColor = finalCost === 0 ? "bg-gray-100 text-gray-500" : "bg-green-100 text-green-700";

    // Progress Calculation (Gamification)
    let completeness = 0;
    if (project.name && project.name.length > 3) completeness += 20;
    if (project.items.length > 0) completeness += 40;
    if (laborTimeMinutes > 0) completeness += 20;
    if (finalCost > 0) completeness += 20;

    // For Recipe Mode
    if (isRecipeMode) {
        completeness = 0;
        if (recipeName.length > 2) completeness += 33;
        if (tempRecipeIngredients.length > 0) completeness += 33;
        if (tempRecipeIngredients.length > 2) completeness += 34; // Bonus for completion
    }

    return (
        <div className="bg-[#F8F9FB] dark:bg-slate-900 min-h-screen font-display text-slate-800 dark:text-gray-100 pb-20 transition-colors duration-500 relative">



            <HeaderSimple />

            <main className="max-w-4xl mx-auto px-4 md:px-0 pt-8 flex flex-col gap-8">

                {/* 1. Header & Project Name (Restored & Enhanced) */}
                <header className="flex flex-col gap-2 relative group mt-4">
                    <div className="flex items-center gap-3 mb-2">
                        <button onClick={() => navigate('/')} className="hover:bg-gray-200 dark:hover:bg-slate-800 p-3 md:p-2 rounded-full transition-colors active:scale-95">
                            <span className="material-symbols-outlined text-gray-400 dark:text-slate-500 text-[24px]">arrow_back</span>
                        </button>
                        <span className={`text-[10px] uppercase font-black tracking-widest px-2 py-1 rounded-md ${healthColor}`}>
                            {healthStatus}
                        </span>
                    </div>

                    <input
                        type="text"
                        value={project.name}
                        onChange={(e) => updateProjectName(e.target.value)}
                        placeholder="Nombre del Menú..."
                        className="text-3xl md:text-5xl font-black bg-transparent border-none focus:ring-0 p-0 placeholder-gray-300 text-slate-900 dark:text-white caret-violet-600 transition-all text-balance"
                        autoFocus
                    />
                    {/* Apple Intelligence Underline Effect */}
                    <div className="h-0.5 md:h-1 w-16 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-blue-500 rounded-full mt-2 group-focus-within:w-full transition-all duration-700 ease-out shadow-[0_0_15px_rgba(139,92,246,0.6)]"></div>
                </header>



                {/* 2. Omni-Power Bar */}
                <section ref={searchRef} className="relative z-50">
                    {/* Rotating Border Wrapper for Recipe Mode */}
                    <div className={`relative rounded-3xl transition-all duration-300 ${isRecipeMode ? 'p-[2px] overflow-hidden' : ''}`}>

                        {/* The Animated Gradient Background (Only visible in Recipe Mode due to padding) */}
                        {/* The Animated Gradient Background (Only visible in Recipe Mode due to padding - Now simplified for Glass effect) */}
                        {isRecipeMode && (
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-blue-500/10 backdrop-blur-3xl rounded-3xl border border-white/20 dark:border-white/10 ring-1 ring-white/10 shadow-lg" />
                        )}

                        <div className={`relative bg-white dark:bg-slate-800 rounded-3xl shadow-soft dark:shadow-none border border-slate-100 dark:border-slate-700 h-full overflow-hidden ${!isRecipeMode ? 'hover:shadow-lg focus-within:shadow-xl focus-within:ring-2 focus-within:ring-violet-500/20' : ''}`}>

                            {/* Status Indicator for Recipe Mode (Editable Name) */}
                            {/* Status Indicator for Recipe Mode (Editable Name - Liquid Glass Style) */}
                            {isRecipeMode && (
                                <div className="bg-orange-500/5 dark:bg-orange-500/[0.03] backdrop-blur-[40px] border-b border-white/20 text-slate-800 dark:text-white px-6 py-4 rounded-t-3xl flex justify-between items-center relative z-20 shadow-[0_4px_30px_rgba(0,0,0,0.05)] ring-1 ring-inset ring-white/10">
                                    <div className="flex items-center gap-4 flex-1 mr-4">

                                        {/* Frosted Glass Icon Container */}
                                        <div className="p-2.5 bg-orange-500/15 dark:bg-orange-400/10 rounded-2xl backdrop-blur-md border border-orange-500/20 dark:border-orange-400/20 shadow-inner flex items-center justify-center">
                                            <span className="material-symbols-outlined text-[24px] text-orange-600 dark:text-orange-400">skillet</span>
                                        </div>

                                        <div className="flex flex-col w-full relative group/input">
                                            <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 font-bold mb-1 ml-1 opacity-80">Nueva Receta</span>

                                            {/* Apple AI Arc Input Container - Glow removed (now on main container) */}
                                            <div className="relative">
                                                <input
                                                    value={recipeName}
                                                    onChange={(e) => setRecipeName(e.target.value)}
                                                    className="relative z-10 bg-transparent border-none focus:ring-0 p-0 text-slate-900 dark:text-white font-black placeholder-slate-400/50 w-full text-2xl leading-tight transition-all caret-orange-500"
                                                    placeholder="Nombra tu Creación..."
                                                    autoFocus
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => { setItemType(ItemType.INSUMO); setRecipeName(''); setTempRecipeIngredients([]); }}
                                        className="bg-slate-100/50 dark:bg-white/5 hover:bg-slate-200/50 dark:hover:bg-white/10 text-slate-400 dark:text-slate-300 p-3 rounded-full backdrop-blur-md transition-all active:scale-95 border border-white/20 hover:border-white/40 min-w-[44px] min-h-[44px] flex items-center justify-center"
                                        title="Cancelar Modo Receta"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">close</span>
                                    </button>
                                </div>
                            )}

                            <div className="flex items-center px-4 py-3 md:py-4 gap-3 relative z-10 bg-white dark:bg-slate-800 rounded-b-2xl">
                                <span className={`material-symbols-outlined text-[24px] ${isRecipeMode ? 'text-orange-500 animate-pulse' : 'text-violet-500'}`}>
                                    {isOmniSearching ? 'hourglass_top' : 'search'}
                                </span>
                                <input
                                    type="text"
                                    className="flex-1 bg-transparent border-none focus:ring-0 text-lg font-medium placeholder-slate-400 dark:text-white"
                                    placeholder={isRecipeMode ? "Agrega ingredientes a tu receta..." : "Busca insumos, recetas o crea algo nuevo..."}
                                    value={omniSearchQuery}
                                    onChange={(e) => { setOmniSearchQuery(e.target.value); setSelectedOmniItem(null); }}
                                    onFocus={() => setShowOmniDropdown(true)}
                                />
                                {selectedOmniItem && (
                                    <button onClick={() => { setSelectedOmniItem(null); setOmniSearchQuery(''); }} className="text-gray-300 hover:text-red-500">
                                        <span className="material-symbols-outlined">close</span>
                                    </button>
                                )}
                            </div>

                            {/* Yield Question UI (New Logic) */}
                            {selectedOmniItem && (
                                <div className="border-t border-slate-100 dark:border-slate-700 p-6 bg-white dark:bg-slate-800 rounded-b-2xl animate-fade-in flex flex-col gap-4 relative z-50">

                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-2xl">🤔</span>
                                        <p className="text-sm font-bold text-slate-700 dark:text-white leading-tight">
                                            ¿Para cuántos <span className="text-violet-600">{(isRecipeMode ? recipeName : project.name) || "Menús/Platos"}</span> te alcanza este insumo?
                                        </p>
                                    </div>

                                    <div className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-violet-500">inventory_2</span>
                                            <span className="font-bold">{selectedOmniItem.name}</span>
                                            <button
                                                onClick={() => {
                                                    if (selectedOmniItem.id) {
                                                        setEditingIngredient(selectedOmniItem);
                                                        setShowCreateModal(true);
                                                    }
                                                }}
                                                className="text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 p-1 rounded-md transition-colors ml-1"
                                                title="Editar Insumo"
                                            >
                                                <span className="material-symbols-outlined text-[14px]">edit</span>
                                            </button>
                                        </div>
                                        <span className="font-mono text-slate-400">{formatCurrency(selectedOmniItem.purchase_price)} (Total)</span>
                                    </div>

                                    <div className="flex flex-col md:flex-row gap-3 md:gap-2 md:items-center">
                                        <input
                                            id="yield-input"
                                            type="number"
                                            className="w-full md:flex-1 bg-violet-50 dark:bg-slate-900 border-2 border-violet-100 dark:border-slate-700 focus:border-violet-500 rounded-xl p-4 font-black text-xl text-center outline-none transition-colors"
                                            placeholder="Ej: 8"
                                            value={yieldAmount}
                                            onChange={e => setYieldAmount(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleAddItem()}
                                        />
                                        <button
                                            onClick={handleAddItem}
                                            disabled={!yieldAmount}
                                            className="h-14 md:h-[60px] px-6 md:px-8 w-full md:w-auto bg-violet-600 disabled:bg-slate-300 disabled:cursor-not-allowed hover:bg-violet-700 text-white font-black rounded-xl shadow-lg shadow-violet-200 dark:shadow-none active:scale-95 transition-all text-sm flex items-center justify-center gap-2"
                                        >
                                            <span className="material-symbols-outlined">add_circle</span>
                                            AGREGAR
                                        </button>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>

                    {/* Dropdown Results */}
                    {showOmniDropdown && !selectedOmniItem && (
                        <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-fade-in-up z-[60]">
                            {omniResults.length > 0 ? (
                                <>
                                    <div className="px-3 py-2 bg-slate-50 dark:bg-slate-700/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        Resultados Sugeridos
                                    </div>
                                    {omniResults.map((item, idx) => (
                                        <button
                                            key={`${item.id}-${idx}`}
                                            onClick={() => handleOmniSelect(item)}
                                            className="w-full text-left p-3 hover:bg-violet-50 dark:hover:bg-violet-900/10 transition-colors flex items-center justify-between group border-b border-slate-50 dark:border-slate-700/50 last:border-0"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`size-8 rounded-lg flex items-center justify-center ${item.category === 'RECETA' ? 'bg-orange-100 text-orange-600' : 'bg-violet-100 text-violet-600'}`}>
                                                    <span className="material-symbols-outlined text-[18px]">
                                                        {item.category === 'RECETA' ? 'skillet' : 'inventory_2'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm text-slate-800 dark:text-gray-200">{item.name}</p>
                                                    <p className="text-[10px] text-gray-400">{item.category}</p>
                                                </div>
                                            </div>
                                            <span className="material-symbols-outlined text-gray-300 group-hover:text-violet-500">add_circle</span>
                                        </button>
                                    ))}
                                </>
                            ) : (
                                <div className="p-2">
                                    {omniSearchQuery && (
                                        <div className="px-3 py-2 text-xs text-gray-400 text-center italic mb-2">No encontramos "{omniSearchQuery}"</div>
                                    )}
                                    <div className="flex flex-col gap-1">
                                        <button
                                            onClick={() => { setShowCreateModal(true); setShowOmniDropdown(false); }}
                                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 group w-full text-left transition-colors"
                                        >
                                            <div className="size-8 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <span className="material-symbols-outlined text-sm">add</span>
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-bold text-sm text-slate-800 dark:text-white">
                                                    {omniSearchQuery ? `Crear Insumo Individual: "${omniSearchQuery}"` : "Crear Nuevo Insumo"}
                                                </p>
                                                <p className="text-[10px] text-gray-400">Para ingredientes básicos como Huevos, Harina, Cajas...</p>
                                            </div>
                                        </button>

                                        {!isRecipeMode && (
                                            <button
                                                onClick={() => {
                                                    setItemType(ItemType.RECETA);
                                                    setRecipeName(omniSearchQuery);
                                                    setOmniSearchQuery(''); // Clear search to start adding ingredients
                                                    setShowOmniDropdown(false);
                                                }}
                                                className="flex items-center gap-3 p-3 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 group w-full text-left transition-colors"
                                            >
                                                <div className="size-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                    <span className="material-symbols-outlined text-sm">skillet</span>
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-bold text-sm text-slate-800 dark:text-white">
                                                        {omniSearchQuery ? `Crear Nueva Receta: "${omniSearchQuery}"` : "Crear Nueva Receta"}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400">Compuesta por múltiples ingredientes</p>
                                                </div>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </section>

                {/* 3. Recipe Builder active view (If Mode is Recipe) */}
                {/* 3. Recipe Builder Body (Apple Liquid Glass Style with Full Module AI Glow) */}
                {isRecipeMode && (
                    <div className="relative p-[3px] rounded-3xl overflow-hidden group isolate shadow-2xl shadow-orange-500/20">
                        {/* THE AI ARC GLOW EFFECT - Surrounds the entire module - INFINITE LOOP FIXED */}
                        <div className="absolute inset-[-100%] bg-[conic-gradient(from_var(--shimmer-angle),theme('colors.orange.500'),theme('colors.amber.400'),theme('colors.yellow.300'),theme('colors.orange.600'),theme('colors.orange.500'))] animate-[spin_4s_linear_infinite] opacity-100 blur-md will-change-transform" style={{ '--shimmer-angle': '0deg' } as React.CSSProperties} />

                        {/* Inner Content Container */}
                        <section className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl rounded-2xl p-8 relative z-10 h-full w-full">

                            <div className="flex justify-between items-end mb-8 relative z-10">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                        <span className="size-2 rounded-full bg-orange-500 animate-pulse"></span>
                                        Composición de la Receta
                                    </h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Agrega ingredientes arriba para construir tu plato.</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Costo Total</p>
                                    <p className="text-4xl font-black text-orange-600 dark:text-orange-400 tracking-tight">{formatCurrency(totalMaterialsCost)}</p>
                                </div>
                            </div>

                            {/* Temp List - Efficient List Style with Header */}
                            <div className="mb-8 relative z-10 flex flex-col bg-white/40 dark:bg-slate-800/20 rounded-2xl border border-white/40 dark:border-white/5 overflow-hidden">
                                {tempRecipeIngredients.length > 0 && (
                                    <div className="hidden md:grid grid-cols-[1.5fr,1fr,1.2fr,0.5fr] gap-4 px-6 py-3 bg-white/50 dark:bg-slate-900/40 border-b border-white/20 dark:border-white/5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        <div>Ingrediente</div>
                                        <div className="text-center">Cantidad</div>
                                        <div className="text-right">Costo Parcial</div>
                                        <div className="text-right">Acciones</div>
                                    </div>
                                )}

                                <div className="divide-y divide-white/20 dark:divide-white/5 min-h-[100px]">
                                    {tempRecipeIngredients.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-12">
                                            <div className="size-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                                                <span className="material-symbols-outlined text-slate-300">post_add</span>
                                            </div>
                                            <p className="text-slate-500 dark:text-slate-400 font-bold text-sm">Empieza agregando ingredientes</p>
                                            <p className="text-xs text-slate-400 mt-1">Busca arriba: "Huevos", "Harina", etc.</p>
                                        </div>
                                    ) : (
                                        tempRecipeIngredients.map(item => (
                                            <div key={item.id} className="flex justify-between items-center p-2.5 md:p-3 md:gap-4 md:px-6 md:grid md:grid-cols-[1.5fr,1fr,1.2fr,0.5fr] group hover:bg-white/60 dark:hover:bg-slate-800/60 transition-all border-b border-gray-100 dark:border-white/5 last:border-0 relative">

                                                {/* Left: Icon & Name & Mobile Qty */}
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="size-9 rounded-xl bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                                                        <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <p className="font-bold text-slate-800 dark:text-white text-xs md:text-sm truncate leading-tight text-balance">{item.name}</p>
                                                        {/* Mobile Quantity Badge */}
                                                        <div className="md:hidden flex items-center mt-0.5">
                                                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                                                {item.usedQty} {item.usedUnit}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Center: Desktop Quantity */}
                                                <div className="hidden md:flex justify-center text-center">
                                                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-700/50 py-1 px-3 rounded-full">
                                                        {item.usedQty} {item.usedUnit}
                                                    </span>
                                                </div>

                                                {/* Right: Cost & Mobile Actions */}
                                                <div className="flex flex-col md:block items-end gap-1">
                                                    <div className="font-black text-slate-700 dark:text-slate-200 text-sm md:text-sm whitespace-nowrap">
                                                        {formatCurrency(item.cost)}
                                                    </div>

                                                    {/* Mobile Actions: Inline small buttons */}
                                                    <div className="flex md:hidden items-center justify-end gap-3 mt-1">
                                                        <button
                                                            onClick={() => handleEditItem(item)}
                                                            className="text-slate-300 hover:text-blue-500 transition-colors"
                                                        >
                                                            <span className="material-symbols-outlined text-[18px]">edit_square</span>
                                                        </button>
                                                        <div className="h-3 w-[1px] bg-slate-200 dark:bg-slate-700"></div>
                                                        <button
                                                            onClick={() => setTempRecipeIngredients(prev => prev.filter(i => i.id !== item.id))}
                                                            className="text-slate-300 hover:text-red-500 transition-colors"
                                                        >
                                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Desktop: Actions */}
                                                <div className="hidden md:flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleEditItem(item)} className="size-9 rounded-full flex items-center justify-center text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:text-orange-500 transition-all active:scale-95" title="Editar">
                                                        <span className="material-symbols-outlined text-[18px]">edit</span>
                                                    </button>
                                                    <button onClick={() => setTempRecipeIngredients(prev => prev.filter(i => i.id !== item.id))} className="size-9 rounded-full flex items-center justify-center text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:text-red-500 transition-all active:scale-95" title="Eliminar">
                                                        <span className="material-symbols-outlined text-[18px]">close</span>
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={handleFinalizeRecipe}
                                disabled={tempRecipeIngredients.length === 0}
                                className="w-full py-4 bg-orange-600 dark:bg-slate-950 text-white font-bold rounded-2xl shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 group relative overflow-hidden active:scale-[0.98]"
                            >
                                <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none"></div>
                                {/* Liquid glass sheen effect */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></div>

                                <div className="relative z-10 flex items-center justify-center gap-3">
                                    <span className="material-symbols-outlined">check_circle</span>
                                    <span>FINALIZAR RECETA</span>
                                </div>
                            </button>
                        </section>
                    </div>
                )}

                {/* 4. Main List (Clean Table) - MOVED UP AS REQUESTED */}
                <section className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden min-h-[300px] flex flex-col">
                    <div className="px-6 py-5 border-b border-slate-50 dark:border-slate-700/50 flex justify-between items-center">
                        <h3 className="font-bold text-sm text-slate-800 dark:text-white uppercase tracking-wider">Materiales & Desglose</h3>
                        <span className="bg-slate-100 dark:bg-slate-700 text-slate-500 text-xs font-bold px-3 py-1 rounded-full">{project.items.length} Items</span>
                    </div>

                    <div className="flex-1 overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-[10px] text-gray-400 uppercase tracking-wider border-b border-slate-50 dark:border-slate-700/50">
                                    <th className="pl-6 py-4 font-bold">Item</th>
                                    <th className="px-4 py-4 font-bold text-center">Tipo</th>
                                    <th className="px-4 py-4 font-bold text-right">Cantidad</th>
                                    <th className="px-6 py-4 font-bold text-right">Costo Total</th>
                                    <th className="w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
                                {project.items.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-12 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="size-16 rounded-full bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center text-slate-300">
                                                    <span className="material-symbols-outlined text-3xl">post_add</span>
                                                </div>
                                                <p className="text-slate-400 font-medium text-sm">Lista vacía. Comienza agregando insumos arriba.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    project.items.map((item) => (
                                        <tr key={item.id} className="group hover:bg-violet-50/30 dark:hover:bg-violet-900/5 transition-colors">
                                            <td className="pl-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <span className={`material-symbols-outlined text-[20px] ${item.type === ItemType.RECETA ? 'text-orange-400' : 'text-slate-400'}`}>
                                                        {item.type === ItemType.RECETA ? 'skillet' : 'inventory_2'}
                                                    </span>
                                                    <span className="font-bold text-slate-700 dark:text-gray-200 text-sm">{item.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <span className={`text-[9px] font-bold px-2 py-1 rounded-full ${item.type === ItemType.RECETA ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-500'}`}>
                                                    {item.type}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <span className="text-xs font-mono text-gray-500">{item.usedQty} {item.usedUnit || 'Und'}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="font-bold text-slate-900 dark:text-white text-sm">{formatCurrency(item.cost)}</span>
                                            </td>
                                            <td className="pr-4 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleEditItem(item)}
                                                        className="size-11 rounded-full flex items-center justify-center text-gray-300 hover:bg-blue-50 hover:text-blue-500 transition-all active:scale-95"
                                                        title="Editar"
                                                    >
                                                        <span className="material-symbols-outlined text-[20px]">edit</span>
                                                    </button>
                                                    <button
                                                        onClick={() => removeItem(item.id)}
                                                        className="size-11 rounded-full flex items-center justify-center text-gray-300 hover:bg-red-50 hover:text-red-500 transition-all active:scale-95"
                                                        title="Eliminar"
                                                    >
                                                        <span className="material-symbols-outlined text-[20px]">close</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* 5. Bento Grid (Config) - MOVED DOWN, BELOW LIST */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Labor Card */}
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4 hover:border-violet-200 transition-colors group">
                        <div className="size-12 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined">timer</span>
                        </div>
                        <div className="flex-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tiempo de Mano de Obra</label>
                            <div className="flex items-center gap-2 mt-1">
                                <input
                                    type="number"
                                    value={laborTimeMinutes}
                                    onChange={(e) => setLaborTimeMinutes(parseFloat(e.target.value) || 0)}
                                    className="w-20 font-black text-xl bg-transparent border-0 border-b-2 border-gray-100 focus:border-blue-500 p-0 text-slate-800 dark:text-white focus:ring-0"
                                    placeholder="0"
                                />
                                <span className="text-sm font-bold text-gray-400">Min</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-md">
                                + {formatCurrency(laborCostTotal)}
                            </p>
                        </div>
                    </div>

                    {/* Factor Q Card */}
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4 hover:border-violet-200 transition-colors group">
                        <div className="size-12 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined">science</span>
                        </div>
                        <div className="flex-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Factor Q ({settings?.factorQPercentage}%)</label>
                            <div className="flex items-center gap-2 mt-2">
                                <button
                                    onClick={toggleFactorQ}
                                    className={`relative w-12 h-6 transition rounded-full duration-200 ease-in-out ${project.factorQ ? 'bg-purple-500' : 'bg-gray-200 dark:bg-slate-600'}`}
                                >
                                    <span className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out ${project.factorQ ? 'translate-x-6' : 'translate-x-0'} shadow-sm`} />
                                </button>
                                <span className="text-xs font-medium text-gray-500">{project.factorQ ? 'Activado' : 'Desactivado'}</span>
                            </div>
                        </div>
                        <div className="text-right">
                            {project.factorQ && (
                                <p className="text-[10px] font-bold text-purple-500 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded-md">
                                    + {formatCurrency(totalMaterialsCost * ((settings?.factorQPercentage || 0) / 100))}
                                </p>
                            )}
                        </div>
                    </div>
                </section>

                {/* 6. Summary & Profit Hub with Integrated Progress */}
                <div className="flex flex-col gap-4">
                    {/* Premium Progress Bar */}
                    {/* Premium Progress Bar (Thicker & Visual) */}
                    <div className="w-full flex flex-col gap-2 px-1">
                        <div className="flex justify-between items-end px-1">
                            <span className="text-[10px] font-black text-slate-400/80 uppercase tracking-widest">Nivel de Completitud</span>
                            <span className={`text-xs font-black transition-colors duration-500 ${completeness === 100 ? 'text-[#05fa86] drop-shadow-[0_0_8px_rgba(5,250,134,0.5)]' : 'text-violet-600 dark:text-violet-400'}`}>
                                {completeness}%
                            </span>
                        </div>
                        <div className="h-6 w-full bg-slate-100 dark:bg-slate-800/80 rounded-full p-1 shadow-inner border border-slate-200 dark:border-slate-700/50">
                            <div
                                className={`h-full rounded-full transition-all duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)] relative ${completeness === 100 ? 'bg-[#05fa86] shadow-[0_0_15px_#05fa86]' : 'bg-gradient-to-r from-violet-500 via-fuchsia-500 to-blue-500 shadow-md shadow-violet-500/20'}`}
                                style={{ width: `${completeness}%` }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent rounded-full"></div>
                            </div>
                        </div>
                    </div>

                    <section className="bg-slate-900 dark:bg-black rounded-3xl p-6 md:p-8 text-white shadow-2xl shadow-slate-900/20 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-violet-600/30 transition-all duration-1000"></div>
                        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">

                            {/* Summary Data */}
                            <div className="flex items-center gap-6">
                                <ProfitRing cost={totalMaterialsCost} labor={laborCostTotal} />
                                <div>
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Costo Total Estimado</p>
                                    <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white mb-2">
                                        {formatCurrency(finalCost)}
                                    </h2>
                                    <div className="flex gap-4 text-xs font-medium text-slate-400">
                                        <span className="flex items-center gap-1"><div className="size-2 rounded-full bg-violet-500"></div> Mat: {formatCurrency(materialsWithFactorQ)}</span>
                                        <span className="flex items-center gap-1"><div className="size-2 rounded-full bg-blue-500"></div> MO: {formatCurrency(laborCostTotal)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Action Button */}
                            <button
                                onClick={() => {
                                    if (project.name.trim() === "") {
                                        setValidationModal({ isOpen: true, title: "Nombre Faltante", message: "Asigna un nombre a tu menú antes de ver los resultados." });
                                        return;
                                    }
                                    navigate('/results');
                                }}
                                className="bg-white text-slate-900 hover:bg-gray-100 px-8 py-4 rounded-xl font-bold text-sm tracking-wide shadow-lg shadow-white/10 transform transition-all hover:-translate-y-1 active:scale-95 flex items-center gap-3 w-full md:w-auto justify-center"
                            >
                                VER RESULTADOS
                                <span className="material-symbols-outlined">arrow_forward</span>
                            </button>
                        </div>
                    </section>
                </div>

            </main >

            {/* Modals */}
            <IngredientModal
                isOpen={showCreateModal}
                onClose={() => { setShowCreateModal(false); setEditingIngredient(null); }}
                onSuccess={(ing) => {
                    // If we were editing, update items in the lists
                    if (editingIngredient && ing) {
                        // Update tempRecipeIngredients if matching
                        setTempRecipeIngredients(prev => prev.map(i => {
                            if (i.db_id !== ing.id) return i;

                            // Recalculate cost proportionally to the new price
                            const oldPrice = i.boughtPrice || ing.purchase_price;
                            const newPrice = ing.purchase_price;
                            const priceRatio = oldPrice > 0 ? newPrice / oldPrice : 1;

                            return {
                                ...i,
                                name: ing.name,
                                boughtPrice: newPrice,
                                cost: (i.cost || 0) * priceRatio,
                                usedUnit: ing.purchase_unit
                            };
                        }));

                        // Update project.items if matching
                        project.items.forEach(item => {
                            if (item.db_id === ing.id) {
                                const oldPrice = item.boughtPrice || ing.purchase_price;
                                const newPrice = ing.purchase_price;
                                const priceRatio = oldPrice > 0 ? newPrice / oldPrice : 1;

                                updateItem(item.id, {
                                    name: ing.name,
                                    boughtPrice: newPrice,
                                    cost: (item.cost || 0) * priceRatio,
                                    usedUnit: ing.purchase_unit
                                });
                            }
                        });

                        // Update selectedOmniItem if it matches
                        if (selectedOmniItem && selectedOmniItem.id === ing.id) {
                            setSelectedOmniItem({
                                ...selectedOmniItem,
                                name: ing.name,
                                purchase_price: ing.purchase_price,
                                purchase_quantity: ing.purchase_quantity,
                                purchase_unit: ing.purchase_unit,
                                category: 'INSUMO'
                            });
                        }

                        setEditingIngredient(null);
                        setShowCreateModal(false);
                        return;
                    }
                    // If creating new, format and select
                    if (ing && ing.name) {
                        const formattedItem = {
                            ...ing,
                            category: 'INSUMO',
                            typeIcon: 'inventory_2',
                            typeColor: 'violet'
                        };
                        handleOmniSelect(formattedItem);
                    }
                }}
                initialName={omniSearchQuery}
                editingIngredient={editingIngredient}
            />

            <LiquidModal
                isOpen={validationModal.isOpen}
                title={validationModal.title}
                message={validationModal.message}
                type="warning"
                onClose={() => setValidationModal({ ...validationModal, isOpen: false })}
                onConfirm={() => setValidationModal({ ...validationModal, isOpen: false })}
            />

        </div >
    );
};

export default CostingEnginePage;