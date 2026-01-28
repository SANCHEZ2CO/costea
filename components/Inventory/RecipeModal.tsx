
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../constants';
import IngredientModal from './IngredientModal';
import LiquidModal from '../LiquidModal';

interface RecipeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    editingRecipe?: any | null;
}

const RecipeModal: React.FC<RecipeModalProps> = ({ isOpen, onClose, onSuccess, editingRecipe }) => {
    const { user } = useApp();

    // --- State Management ---
    const [recipeName, setRecipeName] = useState('');
    const [tempRecipeIngredients, setTempRecipeIngredients] = useState<any[]>([]);

    // Omni-Search State
    const [omniSearchQuery, setOmniSearchQuery] = useState('');
    const [omniResults, setOmniResults] = useState<any[]>([]);
    const [isOmniSearching, setIsOmniSearching] = useState(false);
    const [selectedOmniItem, setSelectedOmniItem] = useState<any | null>(null);
    const [showOmniDropdown, setShowOmniDropdown] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    // Yield Logic State
    const [yieldAmount, setYieldAmount] = useState('');

    // Auxiliary UI State
    const [showQuickCreate, setShowQuickCreate] = useState(false);
    const [confirmDeleteIdx, setConfirmDeleteIdx] = useState<number | null>(null);
    const [isFocusedName, setIsFocusedName] = useState(false);

    // --- Effects ---

    // 1. Initialize logic (Load recipe if editing)
    useEffect(() => {
        if (isOpen) {
            if (editingRecipe) {
                setRecipeName(editingRecipe.name);
                const fetchDetails = async () => {
                    const { data } = await supabase.from('dish_ingredients').select('*').eq('dish_id', editingRecipe.id);
                    if (data) {
                        setTempRecipeIngredients(data.map(d => ({
                            id: d.id, // unique key
                            db_id: d.ingredient_id,
                            name: d.name,
                            purchase_price: 0, // Not vital for display as we have valid snapshot cost
                            purchase_quantity: 0, // Stock is managed through purchases, not directly
                            purchase_unit: d.used_unit,
                            // Mapped to CostingEngine structure
                            cost: d.cost_snapshot,
                            usedQty: d.used_quantity,
                            usedUnit: d.used_unit
                        })));
                    }
                };
                fetchDetails();
            } else {
                setRecipeName('');
                setTempRecipeIngredients([]);
            }
            // Reset search states
            setOmniSearchQuery('');
            setOmniResults([]);
            setSelectedOmniItem(null);
            setYieldAmount('');
        }
    }, [isOpen, editingRecipe]);

    // 2. Click Outside Dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowOmniDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // 3. Omni Search Logic (Debounced)
    useEffect(() => {
        const performSearch = async () => {
            if (omniSearchQuery.length < 2) {
                setOmniResults([]);
                return;
            }
            // prevent searching if we just selected an item
            if (selectedOmniItem && selectedOmniItem.name === omniSearchQuery) return;

            setIsOmniSearching(true);
            setShowOmniDropdown(true);

            try {
                const { data: ingData } = await supabase
                    .from('ingredients')
                    .select('*')
                    .ilike('name', `%${omniSearchQuery}%`)
                    .limit(5);

                const formattedIngs = (ingData || []).map(i => ({
                    ...i,
                    category: 'INSUMO',
                    typeIcon: 'inventory_2',
                }));

                setOmniResults(formattedIngs);
            } catch (error) {
                console.error("Search error", error);
            } finally {
                setIsOmniSearching(false);
            }
        };

        const timeout = setTimeout(performSearch, 300);
        return () => clearTimeout(timeout);
    }, [omniSearchQuery, selectedOmniItem]);


    // --- Handlers ---

    const handleOmniSelect = (item: any) => {
        setSelectedOmniItem(item);
        setOmniSearchQuery(item.name);
        setYieldAmount('');
        setShowOmniDropdown(false);
        setTimeout(() => document.getElementById('yield-input-modal')?.focus(), 100);
    };

    const handleAddItem = () => {
        if (!selectedOmniItem || !yieldAmount) return;

        const yieldVal = parseFloat(yieldAmount);
        if (yieldVal <= 0) return;

        // Yield Logic: Cost = Purchase Price / Yield
        const calculatedCost = selectedOmniItem.purchase_price / yieldVal;
        const approximatedUsedQty = selectedOmniItem.purchase_quantity / yieldVal;

        const newItem = {
            id: Date.now(),
            db_id: selectedOmniItem.id,
            name: selectedOmniItem.name,
            cost: calculatedCost,
            usedQty: approximatedUsedQty,
            usedUnit: selectedOmniItem.purchase_unit
        };

        setTempRecipeIngredients([...tempRecipeIngredients, newItem]);

        // Reset Search
        setOmniSearchQuery('');
        setSelectedOmniItem(null);
        setYieldAmount('');
        // Focus back on search
        setTimeout(() => document.getElementById('recipe-omni-search')?.focus(), 100);
    };

    const handleRemoveItem = () => {
        if (confirmDeleteIdx === null) return;
        const newList = [...tempRecipeIngredients];
        newList.splice(confirmDeleteIdx, 1);
        setTempRecipeIngredients(newList);
        setConfirmDeleteIdx(null);
    };

    const handleSave = async () => {
        if (!user || !recipeName || tempRecipeIngredients.length === 0) return;

        const totalCost = tempRecipeIngredients.reduce((acc, i) => acc + (i.cost || 0), 0);

        try {
            let dishId;
            if (editingRecipe) {
                // Update Header
                await supabase.from('dishes').update({
                    name: recipeName,
                    total_cost: totalCost,
                    // Re-calculate margin if sale_price exists using the new cost
                    profit_margin: editingRecipe.sale_price > 0 ? ((editingRecipe.sale_price - totalCost) / editingRecipe.sale_price) * 100 : 0
                }).eq('id', editingRecipe.id);

                // clear old ingredients
                await supabase.from('dish_ingredients').delete().eq('dish_id', editingRecipe.id);
                dishId = editingRecipe.id;
            } else {
                // Create Header
                const { data } = await supabase.from('dishes').insert({
                    user_id: user.id,
                    name: recipeName,
                    total_cost: totalCost,
                    sale_price: 0,
                    profit_margin: 0
                }).select().single();

                if (!data) throw new Error("Error creating dish header");
                dishId = data.id;
            }

            // Insert Details
            const details = tempRecipeIngredients.map(i => ({
                dish_id: dishId,
                ingredient_id: i.db_id,
                name: i.name,
                used_quantity: i.usedQty,
                used_unit: i.usedUnit || 'Und',
                cost_snapshot: i.cost
            }));

            const { error: ingError } = await supabase.from('dish_ingredients').insert(details);
            if (ingError) throw ingError;

            onSuccess();
            onClose();

        } catch (e: any) {
            console.error(e);
            alert("Error: " + e.message);
        }
    };

    const totalCost = tempRecipeIngredients.reduce((acc, i) => acc + (i.cost || 0), 0);

    // If closed
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">

            {/* Quick Create Ingredient Modal (Nested) */}
            {showQuickCreate && (
                <div className="fixed inset-0 z-[300]">
                    <IngredientModal
                        isOpen={true}
                        onClose={() => setShowQuickCreate(false)}
                        initialName={omniSearchQuery}
                        onSuccess={() => { }}
                    />
                </div>
            )}

            {/* Confirm Delete Modal */}
            <LiquidModal
                isOpen={confirmDeleteIdx !== null}
                title="¿Quitar ingrediente?"
                message="Se eliminará de esta receta."
                type="warning"
                onClose={() => setConfirmDeleteIdx(null)}
                onConfirm={handleRemoveItem}
                confirmText="Quitar"
                showCancel
            />

            {/* Main Modal Container */}
            <div className="relative w-full max-w-2xl group outline-none">
                {/* AI Arc Glow Effect - Consistent with App */}
                <div className="absolute inset-[-2px] rounded-[34px] overflow-hidden opacity-100 pointer-events-none">
                    <div
                        className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,theme('colors.orange.500'),theme('colors.amber.500'),theme('colors.yellow.400'),theme('colors.orange.600'),theme('colors.orange.500'))] animate-[spin_4s_linear_infinite] blur-md will-change-transform"
                    />
                </div>

                <div className="relative bg-white dark:bg-slate-900 rounded-t-[30px] rounded-b-none md:rounded-[32px] shadow-2xl overflow-hidden border border-white/40 dark:border-white/10 flex flex-col h-[90vh] md:h-auto md:max-h-[90vh]">

                    {/* HEADER SECTION (Editable Name) */}
                    <div className="bg-orange-50/50 dark:bg-orange-500/[0.03] backdrop-blur-[40px] border-b border-orange-100 dark:border-white/5 px-6 py-4 md:px-8 md:py-6 relative z-20">
                        <div className="flex justify-between items-start mb-3 md:mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 md:p-2.5 bg-orange-100 dark:bg-orange-500/10 rounded-2xl flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[20px] md:text-[24px] text-orange-600 dark:text-orange-400">skillet</span>
                                </div>
                                <span className="text-[10px] uppercase tracking-[0.2em] text-orange-600 dark:text-orange-400 font-bold opacity-80 mt-1 block">
                                    {editingRecipe ? 'Editando Receta' : 'Nueva Receta'}
                                </span>
                            </div>
                            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors bg-white/50 p-1 rounded-full">
                                <span className="material-symbols-outlined text-lg">close</span>
                            </button>
                        </div>

                        {/* Name Input */}
                        <input
                            value={recipeName}
                            onChange={(e) => setRecipeName(e.target.value)}
                            onFocus={() => setIsFocusedName(true)}
                            onBlur={() => setIsFocusedName(false)}
                            className="bg-transparent border-none focus:ring-0 p-0 text-slate-900 dark:text-white font-black placeholder-slate-300 dark:placeholder-slate-600 w-full text-2xl md:text-4xl leading-tight transition-all caret-orange-500"
                            placeholder="Nombra tu Creación..."
                            autoFocus={!editingRecipe}
                        />
                        <div className={`h-[3px] bg-gradient-to-r from-orange-500 to-amber-300 rounded-full mt-2 transition-all duration-500 ease-out ${isFocusedName || recipeName ? 'w-full opacity-100 shadow-[0_0_10px_rgba(249,115,22,0.5)]' : 'w-12 opacity-50'}`}></div>
                    </div>

                    {/* SCROLLABLE BODY */}
                    <div className="overflow-y-auto custom-scrollbar p-6 md:p-8 flex flex-col gap-8 bg-[#F8F9FB] dark:bg-[#0B0F19]">

                        {/* 1. OMNI SEARCH BAR */}
                        <section ref={searchRef} className="relative z-50">
                            <div className={`relative bg-white dark:bg-slate-800 rounded-3xl shadow-soft dark:shadow-none border border-slate-200 dark:border-slate-700 overflow-visible transition-all group-focus-within:ring-4 group-focus-within:ring-orange-500/10 group-focus-within:border-orange-500/50`}>
                                <div className="flex items-center px-4 py-4 gap-3">
                                    <span className={`material-symbols-outlined text-[24px] ${isOmniSearching ? 'text-orange-500 animate-spin' : 'text-slate-400'}`}>
                                        {isOmniSearching ? 'progress_activity' : 'search'}
                                    </span>
                                    <input
                                        id="recipe-omni-search"
                                        type="text"
                                        className="flex-1 bg-transparent border-none focus:ring-0 text-lg font-bold placeholder-slate-400/70 text-slate-800 dark:text-white"
                                        placeholder="Agrega ingredientes a tu receta..."
                                        value={omniSearchQuery}
                                        onChange={(e) => { setOmniSearchQuery(e.target.value); setSelectedOmniItem(null); }}
                                        onFocus={() => setShowOmniDropdown(true)}
                                    />
                                    {selectedOmniItem && (
                                        <button onClick={() => { setSelectedOmniItem(null); setOmniSearchQuery(''); }} className="text-slate-300 hover:text-red-500">
                                            <span className="material-symbols-outlined">close</span>
                                        </button>
                                    )}
                                </div>

                                {/* YIELD QUESTION (Inline) */}
                                {selectedOmniItem && (
                                    <div className="border-t border-slate-100 dark:border-slate-700 p-6 bg-slate-50/50 dark:bg-slate-800/50 rounded-b-3xl animate-fade-in flex flex-col gap-4">

                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-2xl">🤔</span>
                                            <p className="text-sm font-bold text-slate-700 dark:text-white leading-tight">
                                                ¿Para cuántos <span className="text-orange-500">{recipeName || "platos"}</span> te alcanza este insumo?
                                            </p>
                                        </div>

                                        <div className="flex items-center justify-between text-xs text-slate-500 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined text-orange-500">inventory_2</span>
                                                <span className="font-bold text-slate-700 dark:text-slate-300">{selectedOmniItem.name}</span>
                                            </div>
                                            <span className="font-mono text-slate-400">{formatCurrency(selectedOmniItem.purchase_price)} (Costo Paquete)</span>
                                        </div>

                                        <div className="flex flex-col md:flex-row gap-3 md:gap-3 md:items-center">
                                            <input
                                                id="yield-input-modal"
                                                type="number"
                                                className="w-full md:flex-1 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 focus:border-orange-500 rounded-xl p-4 font-black text-xl text-center outline-none transition-colors shadow-inner"
                                                placeholder="Ej: 8"
                                                value={yieldAmount}
                                                onChange={e => setYieldAmount(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && handleAddItem()}
                                            />
                                            <button
                                                onClick={handleAddItem}
                                                disabled={!yieldAmount}
                                                className="h-14 md:h-[60px] px-6 md:px-8 w-full md:w-auto bg-orange-500 disabled:bg-slate-300 disabled:cursor-not-allowed hover:bg-orange-600 text-white font-black rounded-xl shadow-lg shadow-orange-500/20 active:scale-95 transition-all text-sm flex items-center justify-center gap-2"
                                            >
                                                <span className="material-symbols-outlined">add_circle</span>
                                                AGREGAR
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Dropdown Results */}
                            {showOmniDropdown && !selectedOmniItem && (
                                <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-fade-in-up z-[60]">
                                    {omniResults.length > 0 ? (
                                        <>
                                            <div className="px-4 py-2 bg-slate-50 dark:bg-slate-700/50 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                                Resultados Sugeridos
                                            </div>
                                            <div className="max-h-[250px] overflow-y-auto custom-scrollbar">
                                                {omniResults.map((item, idx) => (
                                                    <button
                                                        key={`${item.id}-${idx}`}
                                                        onClick={() => handleOmniSelect(item)}
                                                        className="w-full text-left p-3 hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-colors flex items-center justify-between group border-b border-slate-50 dark:border-slate-700/50 last:border-0"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="size-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                                                                <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-sm text-slate-800 dark:text-gray-200 group-hover:text-orange-600 transition-colors">{item.name}</p>
                                                                <p className="text-[10px] text-gray-400">{formatCurrency(item.purchase_price)} / {item.purchase_quantity} {item.purchase_unit}</p>
                                                            </div>
                                                        </div>
                                                        <span className="material-symbols-outlined text-gray-300 group-hover:text-orange-500">add_circle</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="p-4 text-center">
                                            {omniSearchQuery && (
                                                <div className="mb-4">
                                                    <p className="text-sm text-slate-500 italic">No encontramos "{omniSearchQuery}"</p>
                                                </div>
                                            )}
                                            <button
                                                onClick={() => { setShowQuickCreate(true); setShowOmniDropdown(false); }}
                                                className="w-full py-3 bg-slate-100 dark:bg-white/5 rounded-xl text-xs font-black text-slate-600 dark:text-slate-300 hover:bg-orange-500 hover:text-white transition-all"
                                            >
                                                + CREAR NUEVO INSUMO
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </section>


                        {/* 2. RECIPE COMPOSITION SECTION */}
                        <div className="relative">

                            {/* Section Header */}
                            <div className="flex justify-between items-end mb-4">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                        <span className="size-2 rounded-full bg-orange-500 animate-pulse"></span>
                                        Composición de la Receta
                                    </h2>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Agrega ingredientes arriba para construir tu plato.</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Costo Total</p>
                                    <p className="text-3xl font-black text-orange-600 dark:text-orange-400 tracking-tight">{formatCurrency(totalCost)}</p>
                                </div>
                            </div>

                            {/* Ingredients List */}
                            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm min-h-[150px]">
                                {tempRecipeIngredients.length > 0 && (
                                    <div className="hidden md:grid grid-cols-[1.5fr,1fr,1.2fr,0.5fr] gap-4 px-6 py-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                        <div>Ingrediente</div>
                                        <div className="text-center">Cantidad</div>
                                        <div className="text-right">Costo Parcial</div>
                                        <div className="text-right"></div>
                                    </div>
                                )}

                                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {tempRecipeIngredients.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-12 opacity-60">
                                            <div className="size-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mb-4">
                                                <span className="material-symbols-outlined text-slate-300 text-3xl">post_add</span>
                                            </div>
                                            <p className="text-slate-500 dark:text-slate-400 font-bold text-sm">Empieza agregando ingredientes</p>
                                            <p className="text-slate-400 text-xs mt-1">Busca "Huevos", "Harina", etc.</p>
                                        </div>
                                    ) : (
                                        tempRecipeIngredients.map((item, idx) => (
                                            <div key={idx} className="flex flex-col md:grid md:grid-cols-[1.5fr,1fr,1.2fr,0.5fr] gap-2 md:gap-4 px-6 py-4 items-start md:items-center hover:bg-orange-50/50 dark:hover:bg-orange-900/10 transition-colors group border-b border-slate-50 md:border-none last:border-0 relative">
                                                <div className="font-bold text-slate-700 dark:text-slate-200 text-sm truncate pr-8 md:pr-0 w-full">
                                                    {item.name}
                                                </div>
                                                <div className="flex justify-between items-center w-full md:contents">
                                                    <span className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-md text-slate-600 dark:text-slate-300 font-bold">
                                                        {parseFloat(item.usedQty).toFixed(2)} {item.usedUnit || 'Und'}
                                                    </span>
                                                    <div className="text-right font-black text-slate-800 dark:text-white text-sm">
                                                        {formatCurrency(item.cost)}
                                                    </div>
                                                </div>

                                                <div className="absolute top-4 right-4 md:static text-right">
                                                    <button
                                                        onClick={() => setConfirmDeleteIdx(idx)}
                                                        className="text-slate-300 hover:text-red-500 p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-all md:opacity-0 md:group-hover:opacity-100"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">delete</span>
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* FOOTER */}
                    <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-white/5 relative z-20">
                        <button
                            onClick={handleSave}
                            disabled={!recipeName || tempRecipeIngredients.length === 0}
                            className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-2
                                ${(!recipeName || tempRecipeIngredients.length === 0)
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    : 'bg-[#ECA785] hover:bg-[#E59770] text-white shadow-lg shadow-orange-500/20'}`
                            }
                        >
                            <span className="material-symbols-outlined text-lg">check_circle</span>
                            {editingRecipe ? 'Guardar Cambios' : 'Finalizar Receta'}
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default RecipeModal;
