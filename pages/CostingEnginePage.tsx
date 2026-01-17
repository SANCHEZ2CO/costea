import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useNavigate } from 'react-router-dom';
import HeaderSimple from '../components/HeaderSimple';
import { useApp } from '../context/AppContext';
import { ItemType, CostItem } from '../types';
import { formatCurrency } from '../constants';
import IngredientModal from '../components/Inventory/IngredientModal';
import LiquidModal from '../components/LiquidModal';

const CostingEnginePage: React.FC = () => {
    const navigate = useNavigate();
    const { project, updateProjectName, addItem, updateItem, removeItem, toggleFactorQ, settings, updateLaborCost } = useApp();
    const [editingCostItem, setEditingCostItem] = useState<CostItem | null>(null);
    const [laborTimeMinutes, setLaborTimeMinutes] = useState<number>(project.laborTimeMinutes || 0);

    // Recipe Search State
    const [recipeSearchResults, setRecipeSearchResults] = useState<any[]>([]);
    const [isSearchingRecipes, setIsSearchingRecipes] = useState(false);
    const { user } = useApp();

    // Supabase Integration State
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedIngredient, setSelectedIngredient] = useState<any | null>(null);
    const [isSearching, setIsSearching] = useState(false);

    // Inputs (Controlled)
    const [searchQuery, setSearchQuery] = useState('');
    const [useQty, setUseQty] = useState<string>('');
    const [useUnit, setUseUnit] = useState<string>('Und');

    // Recipe Builder State
    const [itemType, setItemType] = useState<ItemType>(ItemType.INSUMO);
    const [recipeName, setRecipeName] = useState('');
    const [tempRecipeIngredients, setTempRecipeIngredients] = useState<CostItem[]>([]);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [validationModal, setValidationModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
    }>({
        isOpen: false,
        title: '',
        message: ''
    });

    const isRecipeMode = itemType === ItemType.RECETA;

    // Recipe Search Effect (New)
    React.useEffect(() => {
        if (!isRecipeMode) return;
        const searchRecipes = async () => {
            if (recipeName.length < 2) {
                setRecipeSearchResults([]);
                return;
            }
            setIsSearchingRecipes(true);
            const { data } = await supabase
                .from('dishes')
                .select('*')
                .ilike('name', `%${recipeName}%`)
                .limit(5);
            setRecipeSearchResults(data || []);
            setIsSearchingRecipes(false);
        };
        const timeoutId = setTimeout(searchRecipes, 300);
        return () => clearTimeout(timeoutId);
    }, [recipeName, isRecipeMode]);

    // Search Effect (Ingredients)
    React.useEffect(() => {
        const search = async () => {
            if (searchQuery.length < 2) {
                setSearchResults([]);
                return;
            }
            setIsSearching(true);
            const { data } = await supabase
                .from('ingredients')
                .select('*')
                .ilike('name', `%${searchQuery}%`)
                .limit(5);
            setSearchResults(data || []);
            setIsSearching(false);
        };
        const timeoutId = setTimeout(search, 300);
        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    const selectIngredient = (ing: any) => {
        setSelectedIngredient(ing);
        setSearchQuery(ing.name);
        setSearchResults([]); // Hide dropdown
        setUseUnit(ing.purchase_unit);
    };

    const handleAddItem = async () => {
        if (!selectedIngredient) return;

        // LOGIC: Database Ingredient Only
        let cost = 0;
        const uQty = parseFloat(useQty) || 0;

        if (uQty > 0) {
            if (isRecipeMode) {
                // RECIPE MODE: Divide total price by yield quantity ("Para cuántos te alcanza")
                cost = selectedIngredient.purchase_price / uQty;
            } else {
                // MATERIAL MODE: Multiply unit price by usage quantity ("Cuantas unidades necesitas")
                const pricePerUnit = selectedIngredient.purchase_price / selectedIngredient.purchase_quantity;
                cost = pricePerUnit * uQty;
            }
        }

        const isExistingRecipe = selectedIngredient.isExistingRecipe === true;

        const newItem: CostItem = {
            id: Date.now().toString(),
            name: selectedIngredient.name,
            type: isExistingRecipe ? ItemType.RECETA : (isRecipeMode ? ItemType.INSUMO : itemType),
            cost: cost,
            db_id: selectedIngredient.id,
            boughtPrice: selectedIngredient.purchase_price,
            usedQty: uQty,
            usedUnit: selectedIngredient.purchase_unit
        };

        if (isRecipeMode && !isExistingRecipe) {
            setTempRecipeIngredients([...tempRecipeIngredients, newItem]);
        } else {
            addItem(newItem);
        }

        // Reset Form
        setSearchQuery('');
        setSelectedIngredient(null);
        setUseQty('');
    };

    const handleFinalizeRecipe = async () => {
        if (tempRecipeIngredients.length === 0 || !recipeName) return;

        const totalCost = tempRecipeIngredients.reduce((acc, i) => acc + i.cost, 0);

        // 1. Save Header to Supabase (Inventory)
        if (user) {
            try {
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

                if (dishError) {
                    console.error("Error saving recipe to DB:", dishError);
                } else if (dishData) {
                    // 2. Save Ingredients (Detail)
                    const ingredientsToInsert = tempRecipeIngredients.map(item => ({
                        dish_id: dishData.id,
                        ingredient_id: item.db_id,
                        name: item.name,
                        used_quantity: item.usedQty,
                        used_unit: item.usedUnit || 'Und',
                        cost_snapshot: item.cost
                    }));

                    const { error: detailError } = await supabase
                        .from('dish_ingredients')
                        .insert(ingredientsToInsert);

                    if (detailError) console.error("Error saving recipe details:", detailError);
                }
            } catch (err) {
                console.error("Error in finalize recipe flow:", err);
            }
        }

        const newRecipe: CostItem = {
            id: Date.now().toString(),
            name: recipeName,
            type: ItemType.RECETA,
            cost: totalCost,
            boughtPrice: totalCost,
            usedQty: 1
        };

        addItem(newRecipe);

        // Reset
        setItemType(ItemType.INSUMO);
        setRecipeName('');
        setTempRecipeIngredients([]);
    };

    const handleUpdateCostItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCostItem) return;

        // Recalculate cost based on new price and yield
        // Note: This needs to respect the mode logic, but for simple edit we might need to know context.
        // For now, assuming standard unit cost updates or simplistic manual override.
        const price = editingCostItem.boughtPrice || 0;
        const yieldQty = editingCostItem.usedQty || 1;

        let newCost = 0;
        // Naive check: if it was likely a recipe calculation (cost < price) or specific type? 
        // Ideally we store the calculation method. For now, defaulting to standard unit logic for updates 
        // unless it's clearly a yield division scenario.
        // Given complexity, let's just do price/yield for now as per previous standard, 
        // or simplistic override:
        const currentItem = project.items.find(i => i.id === editingCostItem.id);
        const currentUsage = currentItem ? currentItem.usedQty : 1;
        newCost = (price / yieldQty) * (currentUsage || 1);
        // Actually, simplest is to just trust the user edits the COST directly or we infer?
        // Let's stick to standard P/Q for edit for now to avoid breaking existing edit flow unexpectedly.
        const standardCost = (price / yieldQty);

        const updatedItem = {
            ...editingCostItem,
            cost: standardCost // Simplified for this context
        };

        updateItem(editingCostItem.id, updatedItem);
        setEditingCostItem(null);
    };

    const removeTempIngredient = (id: string) => {
        setTempRecipeIngredients(prev => prev.filter(i => i.id !== id));
    };

    const handleNavigateToResults = () => {
        if (!project.name || project.name.trim() === '') {
            setValidationModal({
                isOpen: true,
                title: 'Nombre Requerido',
                message: 'Por favor asigna un nombre a tu menú antes de continuar con el costeo.'
            });
            return;
        }
        navigate('/results');
    };

    // Labor Cost Calculation
    const monthlyMinutes = 30 * 8 * 60;
    const laborCostPerMinute = (settings?.monthlySalary || 0) / monthlyMinutes;
    const laborCostTotal = laborTimeMinutes * laborCostPerMinute;

    // Sync Labor Cost to Global State
    React.useEffect(() => {
        updateLaborCost(laborCostTotal, laborTimeMinutes);
    }, [laborTimeMinutes, laborCostTotal]);

    const totalMaterialsCost = project.items.reduce((acc, item) => acc + item.cost, 0);
    const factorQMultiplier = 1 + ((settings?.factorQPercentage || 0) / 100);
    const materialsWithFactorQ = project.factorQ ? totalMaterialsCost * factorQMultiplier : totalMaterialsCost;
    const finalCost = materialsWithFactorQ + laborCostTotal;

    return (
        <div className="bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-200 font-display min-h-screen flex flex-col transition-colors duration-200">
            <HeaderSimple />
            <main className="flex-1 w-full max-w-[1440px] mx-auto p-4 md:p-8 flex flex-col items-center">

                {/* BOTÓN REGRESAR PERSISTENTE */}
                <div className="w-full max-w-5xl mb-4">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors font-bold text-xs md:text-sm group"
                    >
                        <div className="p-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm group-hover:border-secondary group-hover:text-secondary transition-all">
                            <span className="material-symbols-outlined text-[16px] md:text-[18px] block group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
                        </div>
                        <span>Regresar</span>
                    </button>
                </div>

                <section className="flex flex-col gap-4 md:gap-6 w-full max-w-5xl">
                    <div className="w-full bg-surface-light dark:bg-surface-dark p-4 md:p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                        <div className="flex justify-between items-center mb-1 md:mb-2">
                            <label className="text-[10px] md:text-xs font-bold text-primary dark:text-primary-light uppercase tracking-wider block">Nombre del Menú a Costear</label>
                        </div>
                        <div className="relative">
                            <input
                                className="w-full text-xl md:text-3xl font-black text-slate-700 dark:text-white bg-transparent border-0 border-b-2 border-gray-200 dark:border-gray-700 focus:border-primary dark:focus:border-primary focus:ring-0 px-0 py-1 md:py-2 placeholder-gray-300 transition-colors"
                                placeholder="Ej: Desayuno Sorpresa Aniversario"
                                type="text"
                                value={project.name}
                                onChange={(e) => updateProjectName(e.target.value)}
                            />
                            <span className="material-symbols-outlined absolute right-0 top-1/2 -translate-y-1/2 text-gray-300 text-xl md:text-3xl">edit</span>
                        </div>
                    </div>

                    <div className={`bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm relative overflow-visible group transition-all duration-300 ${isRecipeMode ? 'ring-2 ring-orange-400/50' : ''}`}>
                        <div className={`absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b ${isRecipeMode ? 'from-orange-400 to-red-500' : 'from-primary to-secondary'}`}></div>
                        <div className="p-4 md:p-6">
                            <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
                                <span className={`flex items-center justify-center size-6 md:size-8 rounded-full ${isRecipeMode ? 'bg-orange-100 text-orange-600' : 'bg-primary/10 text-primary'} dark:bg-white/10 dark:text-white text-xs md:text-sm font-bold`}>
                                    {isRecipeMode ? <span className="material-symbols-outlined text-xs md:text-sm">bakery_dining</span> : '2'}
                                </span>
                                <h2 className="text-base md:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                                    {isRecipeMode ? 'Constructor de Recetas' : 'Agregar Insumos y Materiales'}
                                </h2>
                            </div>

                            {/* ITEM TYPE SELECTOR - SIMPLIFIED */}
                            <div className="mb-6">
                                <label className="section-label">Categoría del Item</label>
                                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-full max-w-sm">
                                    {/* Only INSUMO and RECETA now */}
                                    <label className="flex-1 cursor-pointer">
                                        <input
                                            checked={itemType === ItemType.INSUMO}
                                            onChange={() => setItemType(ItemType.INSUMO)}
                                            className="peer sr-only"
                                            name="item_type"
                                            type="radio"
                                        />
                                        <span className="flex items-center justify-center py-2.5 px-3 rounded-md text-xs font-bold text-gray-500 dark:text-gray-400 peer-checked:bg-white dark:peer-checked:bg-surface-light peer-checked:text-slate-900 dark:peer-checked:text-white peer-checked:shadow-sm transition-all hover:text-slate-700 dark:hover:text-gray-200">
                                            Insumo Individual
                                        </span>
                                    </label>
                                    <label className="flex-1 cursor-pointer">
                                        <input
                                            checked={itemType === ItemType.RECETA}
                                            onChange={() => setItemType(ItemType.RECETA)}
                                            className="peer sr-only"
                                            name="item_type"
                                            type="radio"
                                        />
                                        <span className="flex items-center justify-center py-2.5 px-3 rounded-md text-xs font-bold text-gray-500 dark:text-gray-400 peer-checked:bg-white dark:peer-checked:bg-surface-light peer-checked:text-slate-900 dark:peer-checked:text-white peer-checked:shadow-sm transition-all hover:text-slate-700 dark:hover:text-gray-200">
                                            Crear Receta
                                        </span>
                                    </label>
                                </div>
                            </div>

                            {/* RECIPE NAME INPUT (Searchable) */}
                            {isRecipeMode && (
                                <div className="mb-4 animate-fade-in-up relative z-[60]">
                                    <label className="section-label text-orange-600 dark:text-orange-400">Nombre de la Receta (Buscar o Crear)</label>
                                    <div className="relative group-focus-within:ring-2 ring-orange-400/20 rounded-lg transition-all">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-300 material-symbols-outlined text-[20px]">bakery_dining</span>
                                        <input
                                            className="w-full bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-lg py-3 px-4 pl-10 text-sm focus:ring-2 focus:ring-orange-400/20 focus:border-orange-400 outline-none transition-all font-bold text-slate-800 dark:text-white"
                                            placeholder="Nombre de la receta..."
                                            type="text"
                                            value={recipeName}
                                            onChange={(e) => setRecipeName(e.target.value)}
                                        />
                                        {isSearchingRecipes && (
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined animate-spin text-orange-400 text-sm">progress_activity</span>
                                        )}
                                    </div>

                                    {/* Recipe Search Results */}
                                    {recipeSearchResults.length > 0 && (
                                        <div className="absolute top-full left-0 w-full bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl mt-2 overflow-hidden z-[100] animate-fade-in-up">
                                            <div className="p-2 bg-orange-50 dark:bg-orange-900/20 border-b border-orange-100 dark:border-orange-800">
                                                <p className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">Recetas Existentes</p>
                                            </div>
                                            {recipeSearchResults.map((dish) => (
                                                <button
                                                    key={dish.id}
                                                    onClick={() => {
                                                        // AUTO ADD: existing recipe to main project
                                                        // Logic: If it is an Existing Recipe, we assume usage is 1 UNIT (the recipe itself)
                                                        // We skip the intermediate 'selectIngredient' step to avoid the "How much do you need?" question.

                                                        const newItem: CostItem = {
                                                            id: Date.now().toString(),
                                                            name: dish.name,
                                                            type: ItemType.RECETA,
                                                            cost: dish.total_cost, // Full recipe cost
                                                            db_id: dish.id,
                                                            boughtPrice: dish.total_cost,
                                                            usedQty: 1,
                                                            usedUnit: 'Und'
                                                        };

                                                        addItem(newItem);
                                                        setRecipeSearchResults([]);
                                                        setRecipeName('');
                                                    }}
                                                    className="w-full text-left p-3 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors flex justify-between items-center group border-b border-gray-50 dark:border-gray-800 last:border-0"
                                                >
                                                    <div>
                                                        <p className="font-bold text-slate-800 dark:text-white text-sm">{dish.name}</p>
                                                        <p className="text-xs text-gray-400">Total: {formatCurrency(dish.total_cost)}</p>
                                                    </div>
                                                    <span className="material-symbols-outlined text-gray-300 group-hover:text-orange-500">edit_note</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* MAIN INPUTS ROW */}
                            <div className="flex flex-col lg:flex-row gap-6 mb-6 relative">
                                <div className="flex-1 relative z-50">
                                    <label className="section-label">{isRecipeMode ? '¿Qué producto lleva la receta?' : 'Nombre del Insumo'}</label>
                                    <div className="relative group-focus-within:ring-2 ring-primary/10 rounded-lg transition-all">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-[20px]">{isRecipeMode ? 'grocery' : 'search'}</span>
                                        <input
                                            className="w-full bg-gray-50 dark:bg-background-dark border border-gray-300 dark:border-gray-700 rounded-lg py-3 px-4 pl-10 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                            placeholder={isRecipeMode ? "Ej: Harina de Trigo..." : "Ej: Caja Kraft, Moño..."}
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => {
                                                setSearchQuery(e.target.value);
                                                if (selectedIngredient) setSelectedIngredient(null);
                                            }}
                                        />
                                        {/* BUSCADOR: Spinner */}
                                        {isSearching && (
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined animate-spin text-gray-400 text-sm">progress_activity</span>
                                        )}
                                    </div>

                                    {/* DROPDOWN RESULTADOS */}
                                    {(searchResults.length > 0 || searchQuery.length > 1) && !selectedIngredient && (
                                        <div className="absolute top-full left-0 w-full bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl mt-2 overflow-hidden z-[100] animate-fade-in-up">
                                            <div className="p-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Resultados de búsqueda</p>
                                            </div>
                                            {searchResults.map((ing) => (
                                                <button
                                                    key={ing.id}
                                                    onClick={() => selectIngredient(ing)}
                                                    className="w-full text-left p-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors flex justify-between items-center group border-b border-gray-50 dark:border-gray-800 last:border-0"
                                                >
                                                    <div>
                                                        <p className="font-bold text-slate-800 dark:text-white text-sm">{ing.name}</p>
                                                        <p className="text-xs text-gray-400">
                                                            {formatCurrency(ing.purchase_price)} / {ing.purchase_quantity} {ing.purchase_unit}
                                                        </p>
                                                    </div>
                                                    <span className="material-symbols-outlined text-gray-300 group-hover:text-primary">add_circle</span>
                                                </button>
                                            ))}
                                            {/* OPCIÓN DE CREAR NUEVO */}
                                            {searchQuery.length > 0 && (
                                                <button
                                                    onClick={() => setShowModal(true)}
                                                    className="w-full text-left p-4 hover:bg-secondary/10 hover:text-secondary transition-colors flex items-center gap-3 group border-t border-gray-100 dark:border-gray-800"
                                                >
                                                    <div className="p-1.5 rounded-full bg-secondary/10 text-secondary group-hover:scale-110 transition-transform">
                                                        <span className="material-symbols-outlined text-lg">add</span>
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm text-slate-700 dark:text-gray-200">Agregar nuevo producto <span className="text-secondary">"{searchQuery}"</span></p>
                                                        <p className="text-[10px] text-gray-400">Se guardará en tus insumos</p>
                                                    </div>
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* ITEM DETAILS AND ADD BUTTON - VISIBLE ONLY WHEN SELECTED */}
                            {selectedIngredient && (
                                <div className="flex flex-col xl:flex-row items-end gap-4 animate-fade-in-up">
                                    <div className="flex flex-col md:flex-row gap-2 w-full bg-gray-50 dark:bg-gray-900/40 p-3 rounded-xl border border-gray-100 dark:border-gray-800 items-center min-h-[100px] justify-center">

                                        <div className="flex-1 w-full bg-indigo-100 dark:bg-indigo-900/30 p-2 rounded-lg border border-indigo-200 dark:border-indigo-800 flex items-center justify-between group/sel">
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => { setSelectedIngredient(null); setSearchQuery(''); }}
                                                    className="size-7 flex items-center justify-center rounded-full bg-white/50 hover:bg-red-500 hover:text-white text-indigo-500 transition-all shadow-sm active:scale-95"
                                                    title="Quitar ingrediente"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">close</span>
                                                </button>
                                                <div>
                                                    <p className="text-[10px] font-bold text-indigo-500 uppercase">Costo Base</p>
                                                    <p className="font-bold text-indigo-900 dark:text-indigo-200">{formatCurrency(selectedIngredient.purchase_price)} <span className="text-indigo-400">/ {selectedIngredient.purchase_quantity} {selectedIngredient.purchase_unit}</span></p>
                                                </div>
                                            </div>
                                            <span className="material-symbols-outlined text-indigo-400">inventory_2</span>
                                        </div>

                                        <div className="text-gray-300 dark:text-gray-600 px-2">
                                            <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                        </div>

                                        <div className="flex-1 w-full relative">
                                            <label className="section-label text-secondary dark:text-blue-300">
                                                {isRecipeMode ? 'Para cuántos te alcanza' : 'Cuantas unidades necesitas'}
                                            </label>
                                            <div className="relative">
                                                <input
                                                    className="w-full bg-white dark:bg-background-dark border-2 border-secondary/20 dark:border-secondary/40 rounded-md compact-input text-center focus:border-secondary outline-none font-bold text-lg"
                                                    placeholder="0"
                                                    type="number"
                                                    value={useQty}
                                                    onChange={(e) => setUseQty(e.target.value)}
                                                    autoFocus
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">{selectedIngredient.purchase_unit}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="w-full xl:w-auto text-right">
                                        <button
                                            onClick={handleAddItem}
                                            disabled={!selectedIngredient || !useQty}
                                            className={`w-full xl:h-[76px] px-8 py-3 rounded-xl text-sm font-bold uppercase tracking-wide flex items-center justify-center gap-2 transition-all shadow-lg whitespace-nowrap group disabled:opacity-50 disabled:cursor-not-allowed ${isRecipeMode ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-200' : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-primary hover:text-white shadow-slate-200 dark:shadow-none'}`}
                                        >
                                            <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">{isRecipeMode ? 'playlist_add' : 'add_circle'}</span>
                                            {isRecipeMode ? 'Agregar Ingrediente' : 'Agregar'}
                                        </button>
                                    </div>
                                </div>
                            )}
                            {/* RECIPE BUILDER TEMP LIST */}
                            {isRecipeMode && tempRecipeIngredients.length > 0 && (
                                <div className="mt-6 bg-orange-50/50 dark:bg-orange-900/10 rounded-xl border border-orange-100 dark:border-orange-900 p-4 animate-fade-in-up">
                                    <div className="flex justify-between items-center mb-3">
                                        <h4 className="text-xs font-bold text-orange-700 dark:text-orange-300 uppercase tracking-wide">Ingredientes de: {recipeName || 'Nueva Receta'}</h4>
                                        <span className="text-xs font-bold text-orange-600 bg-white dark:bg-orange-900/30 px-2 py-1 rounded-full">
                                            Total Actual: {formatCurrency(tempRecipeIngredients.reduce((acc, i) => acc + i.cost, 0))}
                                        </span>
                                    </div>
                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                        {tempRecipeIngredients.map((item) => (
                                            <div key={item.id} className="flex justify-between items-center bg-white dark:bg-surface-dark p-2 rounded-lg border border-orange-100 dark:border-orange-900/30 shadow-sm text-sm">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
                                                    <span className="font-medium text-slate-700 dark:text-slate-200">{item.name}</span>
                                                    <span className="text-xs text-gray-400">
                                                        (Gasté {formatCurrency(item.boughtPrice || 0)} / Rinde {item.usedQty})
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-bold text-slate-800 dark:text-white">{formatCurrency(item.cost)}</span>
                                                    <button onClick={() => removeTempIngredient(item.id)} className="text-gray-300 hover:text-red-500">
                                                        <span className="material-symbols-outlined text-[16px]">close</span>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-4 pt-3 border-t border-orange-200 dark:border-orange-800/30">
                                        <button
                                            onClick={handleFinalizeRecipe}
                                            className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg font-bold shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
                                        >
                                            <span className="material-symbols-outlined">check_circle</span>
                                            GUARDAR RECETA COMPLETA
                                        </button>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>

                    {/* MAIN LIST */}
                    <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex-1 flex flex-col min-h-[400px]">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/20">
                            <h3 className="font-bold text-sm text-gray-700 dark:text-gray-200 uppercase tracking-wide">Lista de Materiales</h3>
                            <span className="text-xs font-medium text-gray-400 bg-white dark:bg-gray-800 px-2 py-1 rounded border border-gray-200 dark:border-gray-700 shadow-sm">{project.items.length} items agregados</span>
                        </div>
                        <div className="overflow-x-auto flex-1">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-white dark:bg-surface-dark border-b border-gray-200 dark:border-gray-800">
                                    <tr>
                                        <th className="pl-6 pr-4 py-3 font-bold text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider w-[40%]">Detalle del Item</th>
                                        <th className="px-4 py-3 font-bold text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider text-center">Categoría</th>
                                        <th className="px-4 py-3 font-bold text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">Cálculo (Precio / Rendimiento)</th>
                                        <th className="px-6 py-3 font-bold text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider text-right">Costo Unit.</th>
                                        <th className="w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {project.items.map((item) => (
                                        <tr key={item.id} className="hover:bg-purple-50/50 dark:hover:bg-purple-900/10 transition-colors group">
                                            <td className="pl-6 pr-4 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`size-10 rounded-lg ${item.type === ItemType.RECETA ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'} flex items-center justify-center shrink-0`}>
                                                        <span className="material-symbols-outlined text-[20px]">
                                                            {item.type === ItemType.RECETA ? 'bakery_dining' : 'inventory_2'}
                                                        </span>
                                                    </div>
                                                    <div><p className="font-bold text-slate-800 dark:text-white text-[15px]">{item.name}</p></div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold border tracking-wide ${item.type === ItemType.RECETA ? 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300' : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300'}`}>{item.type}</span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                                    <span className="font-mono text-gray-400">{formatCurrency(item.boughtPrice || 0)}</span>
                                                    <span className="material-symbols-outlined text-[12px] text-gray-300">horizontal_rule</span>
                                                    <span className="font-mono font-bold text-secondary">Rinde: {item.usedQty}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right"><span className="font-bold text-slate-900 dark:text-white text-base">{formatCurrency(item.cost)}</span></td>
                                            <td className="px-4 py-4 text-right">
                                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => setEditingCostItem(item)}
                                                        className="text-gray-300 hover:text-secondary transition-colors p-1.5 rounded-full hover:bg-indigo-50 dark:hover:bg-indigo-900/20">
                                                        <span className="material-symbols-outlined text-[18px]">edit</span>
                                                    </button>
                                                    <button
                                                        onClick={() => removeItem(item.id)}
                                                        className="text-gray-300 hover:text-red-500 transition-colors p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20">
                                                        <span className="material-symbols-outlined text-[18px]">delete</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {project.items.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="py-8 text-center text-gray-400 text-sm">
                                                No hay ingredientes agregados aún. ¡Empieza arriba!
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="border-t border-gray-200 dark:border-gray-800 p-4 md:p-5 bg-gray-50 dark:bg-gray-900/30 flex flex-col md:flex-row items-stretch md:items-center justify-between mt-auto gap-4 md:gap-0">

                            {/* Labor Time Input */}
                            <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto">
                                <div className="p-2 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 shrink-0">
                                    <span className="material-symbols-outlined text-[20px] md:text-[22px]">timer</span>
                                </div>
                                <div className="flex-1 md:flex-none">
                                    <div className="flex items-center justify-between md:justify-start gap-2">
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">Tiempo de Mano de Obra</h4>
                                        {laborTimeMinutes > 0 && (
                                            <div className="md:hidden px-2 py-0.5 bg-green-100 dark:bg-green-900/30 rounded text-[10px] font-bold text-green-700 dark:text-green-300">
                                                + {formatCurrency(laborCostTotal)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <input
                                            type="number"
                                            min="0"
                                            className="w-16 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-xs font-bold focus:border-green-500 outline-none text-center transition-all"
                                            value={laborTimeMinutes}
                                            onChange={(e) => setLaborTimeMinutes(parseFloat(e.target.value) || 0)}
                                            placeholder="Min"
                                        />
                                        <span className="text-xs text-gray-500">minutos</span>
                                        {laborTimeMinutes > 0 && (
                                            <div className="hidden md:block ml-2 px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded text-xs font-bold text-green-700 dark:text-green-300">
                                                + {formatCurrency(laborCostTotal)}
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-1 hidden md:block">
                                        Basado en salario de {formatCurrency(settings?.monthlySalary || 0)}
                                    </p>
                                </div>
                            </div>

                            {/* Factor Q */}
                            <div className="flex items-center justify-between md:justify-start gap-3 md:gap-4 w-full md:w-auto border-t md:border-t-0 md:border-l border-gray-200 dark:border-gray-800 md:border-gray-200 dark:md:border-gray-700 pt-3 md:pt-0 md:pl-4 md:ml-auto">
                                <div className="flex items-center gap-3 md:gap-4">
                                    <div className="p-2 rounded-lg bg-secondary/10 text-secondary shrink-0">
                                        <span className="material-symbols-outlined text-[20px] md:text-[22px]">science</span>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">Factor Q (+{settings?.factorQPercentage || 5}%)</h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-none mt-1">Colchón de seguridad</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer ml-auto md:ml-2">
                                    <input
                                        className="sr-only peer"
                                        type="checkbox"
                                        checked={project.factorQ}
                                        onChange={toggleFactorQ}
                                    />
                                    <div className="w-11 h-6 md:w-12 md:h-7 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 md:after:h-6 md:after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-secondary"></div>
                                </label>
                            </div>
                        </div>
                    </div>
                    <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center sm:items-start text-center sm:text-left">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-full text-indigo-600 dark:text-indigo-400 shrink-0">
                            <span className="material-symbols-outlined text-[20px]">tips_and_updates</span>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-xs font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wide mb-1">Resumen Actual</h3>
                            <div className="flex flex-col sm:flex-row gap-x-6 gap-y-1 text-xs text-indigo-700 dark:text-indigo-300">
                                <span className="flex items-center gap-1.5 justify-center sm:justify-start">
                                    <span className="size-1.5 rounded-full bg-indigo-400"></span>
                                    <span className="font-bold">{formatCurrency(finalCost)}</span>
                                </span>
                                {laborTimeMinutes > 0 && (
                                    <span className="flex items-center gap-1.5 justify-center sm:justify-start text-green-600 dark:text-green-400">
                                        <span className="size-1.5 rounded-full bg-green-400"></span>
                                        Mano Obra: <span className="font-bold">{formatCurrency(laborCostTotal)}</span>
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleNavigateToResults}
                        className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary-light hover:to-secondary-dark text-white rounded-xl py-5 shadow-xl shadow-primary/20 transition-all transform hover:-translate-y-0.5 font-bold text-lg flex items-center justify-center gap-3">
                        <span>VER MI COSTO TOTAL</span>
                        <span className="material-symbols-outlined">arrow_forward</span>
                    </button>
                </section>
            </main>
            <footer className="w-full py-4 text-center text-sm text-neutral-gray/60 dark:text-slate-500 mt-auto">
                <p>Moneda: <span className="font-bold text-secondary">COP $</span> • Medidas: <span className="font-bold">Gramos / Mililitros</span></p>
            </footer>

            {/* MODAL: EDICIÓN DE ITEM EN LISTA */}
            {editingCostItem && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-surface-dark w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 transform transition-all scale-100 animate-fade-in-up">
                        <div className="p-6 text-center bg-gradient-to-r from-secondary to-primary relative overflow-hidden">
                            <div className="absolute inset-0 bg-white/10 opacity-50 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                            <h3 className="text-2xl font-black text-white relative z-10 mb-1">Editar Item</h3>
                            <button onClick={() => setEditingCostItem(null)} className="absolute top-4 right-4 text-white/80 hover:text-white focus:outline-none">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleUpdateCostItem} className="p-8 flex flex-col gap-6">
                            <div>
                                <label className="section-label">Nombre del Item</label>
                                <input
                                    className="w-full bg-gray-50 dark:bg-background-dark border border-gray-200 dark:border-gray-700 rounded-xl py-4 px-4 text-slate-800 dark:text-white font-medium focus:border-secondary outline-none transition-all"
                                    value={editingCostItem.name}
                                    onChange={e => setEditingCostItem({ ...editingCostItem, name: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="section-label">Precio Compra</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                                        <input
                                            type="number"
                                            className="w-full bg-gray-50 dark:bg-background-dark border border-gray-200 dark:border-gray-700 rounded-xl py-4 pl-6 pr-4 text-slate-800 dark:text-white font-medium focus:border-secondary outline-none transition-all"
                                            value={editingCostItem.boughtPrice}
                                            onChange={e => setEditingCostItem({ ...editingCostItem, boughtPrice: parseFloat(e.target.value) })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="section-label">Rendimiento</label>
                                    <input
                                        type="number"
                                        className="w-full bg-gray-50 dark:bg-background-dark border border-gray-200 dark:border-gray-700 rounded-xl py-4 px-4 text-slate-800 dark:text-white font-medium focus:border-secondary outline-none transition-all"
                                        value={editingCostItem.usedQty}
                                        onChange={e => setEditingCostItem({ ...editingCostItem, usedQty: parseFloat(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-secondary hover:bg-secondary-dark font-bold text-white py-4 rounded-xl shadow-lg shadow-secondary/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                ACTUALIZAR ITEM
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <IngredientModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                onSuccess={(ing) => selectIngredient(ing)}
                initialName={searchQuery}
            />

            <LiquidModal
                isOpen={validationModal.isOpen}
                title={validationModal.title}
                message={validationModal.message}
                type="warning"
                onClose={() => setValidationModal({ isOpen: false, title: '', message: '' })}
                onConfirm={() => setValidationModal({ isOpen: false, title: '', message: '' })}
                confirmText="Entendido"
            />
        </div>
    );
};

export default CostingEnginePage;