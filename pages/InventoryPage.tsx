import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useNavigate } from 'react-router-dom';
import HeaderSimple from '../components/HeaderSimple';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../constants';
import { InventoryItem } from '../types';

const InventoryPage: React.FC = () => {
    const navigate = useNavigate();
    const { inventory, resetProject, user } = useApp();
    const [filterType, setFilterType] = useState<'PRODUCTO' | 'RECETA' | 'INSUMO'>('PRODUCTO'); // Added INSUMO

    // Supabase State
    const [ingredients, setIngredients] = useState<any[]>([]);
    const [dishes, setDishes] = useState<any[]>([]); // New state for dishes
    const [loadingData, setLoadingData] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newIng, setNewIng] = useState({ name: '', price: '', qty: '', unit: 'Und' });

    // Recipe Builder State (New)
    const [recipeName, setRecipeName] = useState('');
    const [tempRecipeIngredients, setTempRecipeIngredients] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedIngredient, setSelectedIngredient] = useState<any | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [useQty, setUseQty] = useState('');
    const [useUnit, setUseUnit] = useState('Und');
    const [manualPrice, setManualPrice] = useState('');
    const [manualYield, setManualYield] = useState('');

    // Modal & Action State
    const [editingItem, setEditingItem] = useState<any | null>(null);
    const [editingItemDish, setEditingItemDish] = useState<any | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ id: string, name: string, type: 'INSUMO' | 'PRODUCTO' | 'RECETA' } | null>(null);

    // Fetch Data Effect
    React.useEffect(() => {
        if (!user) return;

        if (filterType === 'INSUMO') {
            fetchIngredients();
        } else {
            fetchDishes();
        }
    }, [user, filterType]);

    // Search Effect (for Recipe Builder)
    React.useEffect(() => {
        if (filterType !== 'RECETA') return;
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
    }, [searchQuery, filterType]);

    const fetchIngredients = async () => {
        setLoadingData(true);
        const { data, error } = await supabase
            .from('ingredients')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error) setIngredients(data || []);
        else console.error(error);
        setLoadingData(false);
    };

    const fetchDishes = async () => {
        setLoadingData(true);
        const { data, error } = await supabase
            .from('dishes')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error) setDishes(data || []);
        else console.error(error);
        setLoadingData(false);
    };

    // Helper to map DB dishes to InventoryItem
    const getDisplayItems = () => {
        if (filterType === 'INSUMO') return [];

        // Map Supabase dishes to UI InventoryItems
        const dbItems: InventoryItem[] = dishes.map(d => ({
            id: d.id,
            name: d.name,
            type: d.sale_price > 0 ? 'PRODUCTO' : 'RECETA', // Simple heuristic: if it has a sale price, it's a product
            totalCost: d.total_cost,
            salePrice: d.sale_price,
            profitMargin: d.profit_margin,
            itemsCount: 0, // We can't know this without joining, keep 0 for now
            date: new Date(d.created_at).getTime()
        }));

        // Filter based on current tab
        return dbItems.filter(item => item.type === filterType);
    };

    const displayItems = getDisplayItems();

    const handleSaveIngredient = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return alert("Debes iniciar sesión");
        if (!newIng.name || !newIng.price || !newIng.qty) return;

        setIsSubmitting(true);
        const { error } = await supabase.from('ingredients').insert({
            user_id: user.id,
            name: newIng.name,
            purchase_price: parseFloat(newIng.price),
            purchase_quantity: parseFloat(newIng.qty),
            purchase_unit: newIng.unit
        });

        if (error) {
            alert("Error al guardar: " + error.message);
        } else {
            setNewIng({ name: '', price: '', qty: '', unit: 'Und' });
            fetchIngredients(); // Refresh list
        }
        setIsSubmitting(false);
    };

    const handleAddItemToRecipe = async () => {
        if (!searchQuery) return;

        let newItem: any;
        if (selectedIngredient) {
            const uQty = parseFloat(useQty) || 0;
            const pricePerUnit = selectedIngredient.purchase_price / selectedIngredient.purchase_quantity;
            newItem = {
                id: Date.now().toString(),
                name: selectedIngredient.name,
                cost: pricePerUnit * uQty,
                boughtPrice: selectedIngredient.purchase_price,
                usedQty: uQty
            };
        } else {
            const price = parseFloat(manualPrice) || 0;
            const yieldAmount = parseFloat(manualYield) || 1;
            const calcCost = price / yieldAmount;

            if (user) {
                await supabase.from('ingredients').insert({
                    user_id: user.id,
                    name: searchQuery,
                    purchase_price: price,
                    purchase_quantity: yieldAmount,
                    purchase_unit: useUnit
                });
            }

            newItem = {
                id: Date.now().toString(),
                name: searchQuery,
                cost: calcCost,
                boughtPrice: price,
                usedQty: 1
            };
        }

        setTempRecipeIngredients([...tempRecipeIngredients, newItem]);
        setSearchQuery('');
        setSelectedIngredient(null);
        setUseQty('');
        setManualPrice('');
    };

    const handleSaveRecipe = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !recipeName || tempRecipeIngredients.length === 0) return;

        setIsSubmitting(true);
        const totalCost = tempRecipeIngredients.reduce((acc, i) => acc + i.cost, 0);

        const { error } = await supabase.from('dishes').insert({
            user_id: user.id,
            name: recipeName,
            total_cost: totalCost,
            sale_price: 0,
            profit_margin: 0
        });

        if (error) {
            alert("Error al guardar receta: " + error.message);
        } else {
            setRecipeName('');
            setTempRecipeIngredients([]);
            fetchDishes();
        }
        setIsSubmitting(false);
    };

    const handleUpdateDish = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingItemDish || !user) return;

        setIsSubmitting(true);
        const { error } = await supabase
            .from('dishes')
            .update({
                name: editingItemDish.name,
                total_cost: parseFloat(editingItemDish.total_cost),
                sale_price: parseFloat(editingItemDish.sale_price || 0),
                profit_margin: parseFloat(editingItemDish.profit_margin || 0)
            })
            .eq('id', editingItemDish.id);

        if (error) {
            alert("Error al actualizar: " + error.message);
        } else {
            setEditingItemDish(null);
            fetchDishes();
        }
        setIsSubmitting(false);
    };

    const handleUpdateIngredient = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingItem || !user) return;

        setIsSubmitting(true);
        const { error } = await supabase
            .from('ingredients')
            .update({
                name: editingItem.name,
                purchase_price: parseFloat(editingItem.purchase_price),
                purchase_quantity: parseFloat(editingItem.purchase_quantity),
                purchase_unit: editingItem.purchase_unit
            })
            .eq('id', editingItem.id);

        if (error) {
            alert("Error al actualizar: " + error.message);
        } else {
            setEditingItem(null);
            fetchIngredients();
        }
        setIsSubmitting(false);
    };

    const handleDelete = async () => {
        if (!showDeleteConfirm || !user) return;

        try {
            const table = showDeleteConfirm.type === 'INSUMO' ? 'ingredients' : 'dishes';
            const { error } = await supabase
                .from(table)
                .delete()
                .eq('id', showDeleteConfirm.id);

            if (error) {
                if (error.message.includes('foreign key constraint')) {
                    alert("No se puede eliminar este ítem porque está siendo usado en una receta o producto.");
                } else {
                    throw error;
                }
            } else {
                if (showDeleteConfirm.type === 'INSUMO') fetchIngredients();
                else fetchDishes();
                setShowDeleteConfirm(null);
            }
        } catch (error: any) {
            alert("Error al eliminar: " + error.message);
        }
    };

    const handleNewProject = () => {
        resetProject();
        navigate('/costing-engine');
    };

    return (
        <div className="bg-gradient-to-br from-indigo-50 to-white dark:from-background-dark dark:to-neutral-dark min-h-screen text-neutral-dark dark:text-white font-display flex flex-col">
            <HeaderSimple />
            <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-8">

                {/* BOTÓN REGRESAR PERSISTENTE */}
                <div className="w-full mb-6 relative">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors font-bold text-sm group"
                    >
                        <div className="p-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm group-hover:border-secondary group-hover:text-secondary transition-all">
                            <span className="material-symbols-outlined text-[18px] block group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
                        </div>
                        <span>Regresar</span>
                    </button>
                </div>

                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div>
                        <h2 className="text-3xl font-bold text-neutral-dark dark:text-white tracking-tight">Mi Inventario</h2>
                        <p className="text-neutral-gray dark:text-gray-400 mt-1">Gestiona tus productos terminados, recetas base e insumos.</p>
                    </div>
                    {filterType !== 'INSUMO' && (
                        <button onClick={handleNewProject} className="bg-secondary hover:bg-deep-purple text-white px-6 py-3 rounded-xl shadow-lg shadow-secondary/20 flex items-center gap-2 transition-all active:scale-95 font-medium">
                            <span className="material-symbols-outlined">add</span>
                            Nuevo Producto
                        </button>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex gap-6 border-b border-gray-200 dark:border-gray-800 mb-8 overflow-x-auto">
                    <button
                        onClick={() => setFilterType('PRODUCTO')}
                        className={`pb-3 px-1 text-sm font-bold tracking-wide transition-colors relative whitespace-nowrap ${filterType === 'PRODUCTO' ? 'text-secondary dark:text-white' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        MENÚS Y PRODUCTOS
                        {filterType === 'PRODUCTO' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-secondary"></span>}
                    </button>
                    <button
                        onClick={() => setFilterType('RECETA')}
                        className={`pb-3 px-1 text-sm font-bold tracking-wide transition-colors relative whitespace-nowrap ${filterType === 'RECETA' ? 'text-secondary dark:text-white' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        RECETAS BASE
                        {filterType === 'RECETA' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-secondary"></span>}
                    </button>
                    <button
                        onClick={() => setFilterType('INSUMO')}
                        className={`pb-3 px-1 text-sm font-bold tracking-wide transition-colors relative whitespace-nowrap ${filterType === 'INSUMO' ? 'text-secondary dark:text-white' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        MIS INSUMOS
                        {filterType === 'INSUMO' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-secondary"></span>}
                    </button>
                </div>

                {/* CONTENIDO */}
                {filterType === 'INSUMO' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in-up">
                        {/* FORMULARIO DE CREACIÓN DE INSUMO */}
                        <div className="lg:col-span-1">
                            <div className="bg-white dark:bg-surface-dark p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 sticky top-4">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-secondary">add_circle</span>
                                    Nuevo Insumo
                                </h3>
                                <form onSubmit={handleSaveIngredient} className="flex flex-col gap-4">
                                    <div>
                                        <label className="section-label">Nombre del Insumo</label>
                                        <input
                                            placeholder="Ej: Harina Trigo, Fresas..."
                                            className="w-full bg-gray-50 dark:bg-background-dark border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm focus:border-secondary outline-none"
                                            value={newIng.name}
                                            onChange={e => setNewIng({ ...newIng, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="section-label">Precio Compra</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                                                <input
                                                    type="number"
                                                    placeholder="0"
                                                    className="w-full bg-gray-50 dark:bg-background-dark border border-gray-200 dark:border-gray-700 rounded-lg p-3 pl-6 text-sm focus:border-secondary outline-none"
                                                    value={newIng.price}
                                                    onChange={e => setNewIng({ ...newIng, price: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="section-label">Cantidad Paquete</label>
                                            <input
                                                type="number"
                                                placeholder="0"
                                                className="w-full bg-gray-50 dark:bg-background-dark border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm focus:border-secondary outline-none"
                                                value={newIng.qty}
                                                onChange={e => setNewIng({ ...newIng, qty: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="section-label">Unidad de Medida</label>
                                        <div className="flex gap-2 bg-gray-50 dark:bg-background-dark p-1 rounded-lg border border-gray-200 dark:border-gray-700">
                                            {['Und', 'Gr', 'Ml', 'Kg', 'Lt'].map(u => (
                                                <button
                                                    key={u}
                                                    type="button"
                                                    onClick={() => setNewIng({ ...newIng, unit: u })}
                                                    className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${newIng.unit === u ? 'bg-white dark:bg-gray-700 shadow-sm text-secondary' : 'text-gray-400 hover:text-gray-600'}`}
                                                >
                                                    {u}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="mt-2 w-full bg-secondary hover:bg-secondary-dark text-white font-bold py-3 rounded-xl shadow-lg shadow-secondary/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? <span className="material-symbols-outlined animate-spin text-sm">refresh</span> : 'GUARDAR INSUMO'}
                                    </button>
                                </form>
                            </div>
                        </div>

                        {/* LISTA DE INSUMOS */}
                        <div className="lg:col-span-2">
                            {loadingData ? (
                                <div className="text-center py-10">
                                    <span className="material-symbols-outlined animate-spin text-4xl text-gray-300">progress_activity</span>
                                    <p className="text-xs text-gray-400 mt-2">Cargando...</p>
                                </div>
                            ) : ingredients.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {ingredients.map(ing => (
                                        <div key={ing.id} className="bg-white dark:bg-surface-dark p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm hover:border-secondary/30 transition-colors group relative">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="size-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 flex items-center justify-center">
                                                        <span className="material-symbols-outlined text-sm">grocery</span>
                                                    </div>
                                                    <h4 className="font-bold text-slate-800 dark:text-white leading-tight">{ing.name}</h4>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => setEditingItem(ing)}
                                                        className="p-1 text-gray-400 hover:text-secondary rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">edit</span>
                                                    </button>
                                                    <button
                                                        onClick={() => setShowDeleteConfirm({ id: ing.id, name: ing.name, type: 'INSUMO' })}
                                                        className="p-1 text-gray-400 hover:text-red-500 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">delete</span>
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="flex items-end justify-between mt-3 text-sm">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase">Precio Compra</span>
                                                    <span className="font-semibold text-slate-700 dark:text-slate-300">{formatCurrency(ing.purchase_price)}</span>
                                                </div>
                                                <div className="h-6 w-px bg-gray-100 dark:bg-gray-800"></div>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase">Paquete de</span>
                                                    <span className="font-semibold text-slate-700 dark:text-slate-300">{ing.purchase_quantity} {ing.purchase_unit}</span>
                                                </div>
                                            </div>

                                            <div className="mt-3 pt-2 border-t border-gray-50 dark:border-gray-800 flex justify-between items-center">
                                                <span className="text-[10px] text-gray-400">Costo Unitario Aprox:</span>
                                                <span className="text-xs font-bold text-secondary">
                                                    {formatCurrency(ing.purchase_price / ing.purchase_quantity)} / {ing.purchase_unit}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl bg-gray-50/50 dark:bg-gray-900/50">
                                    <div className="size-16 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center text-gray-400 mb-4 shadow-sm">
                                        <span className="material-symbols-outlined text-3xl">kitchen</span>
                                    </div>
                                    <h3 className="text-sm font-bold text-neutral-dark dark:text-white">Tu despensa está vacía</h3>
                                    <p className="text-gray-500 dark:text-gray-400 max-w-xs mx-auto mt-1 text-xs">
                                        Agrega tus insumos frecuentes para costear más rápido.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : filterType === 'RECETA' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in-up">
                        {/* CONSTRUCTOR DE RECETAS BASE */}
                        <div className="lg:col-span-1">
                            <div className="bg-white dark:bg-surface-dark p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 sticky top-4">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-orange-500">bakery_dining</span>
                                    Constructor de Receta
                                </h3>

                                <div className="flex flex-col gap-4">
                                    <div>
                                        <label className="section-label">Nombre de la Receta</label>
                                        <input
                                            placeholder="Ej: Masa de Crepes, Salsa Base..."
                                            className="w-full bg-gray-50 dark:bg-background-dark border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm focus:border-orange-500 outline-none placeholder:text-gray-300 dark:placeholder:text-gray-600"
                                            value={recipeName}
                                            onChange={e => setRecipeName(e.target.value)}
                                        />
                                    </div>

                                    <div className="pt-4 border-t border-gray-50 dark:border-gray-800">
                                        <label className="section-label mb-2">Añadir Insumos</label>
                                        <div className="relative group/search mb-3">
                                            <input
                                                className="w-full bg-gray-50 dark:bg-background-dark border border-gray-200 dark:border-gray-700 rounded-xl py-3 px-4 pl-10 text-sm focus:border-orange-500 outline-none transition-all"
                                                placeholder="Buscar ingrediente..."
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                            />
                                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within/search:text-orange-500 transition-colors">search</span>

                                            {/* Resultados de búsqueda */}
                                            {searchResults.length > 0 && (
                                                <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in">
                                                    {searchResults.map((ing) => (
                                                        <button
                                                            key={ing.id}
                                                            onClick={() => { setSelectedIngredient(ing); setSearchQuery(ing.name); setSearchResults([]); }}
                                                            className="w-full text-left px-4 py-3 hover:bg-orange-50 dark:hover:bg-orange-900/20 flex items-center justify-between border-b border-gray-50 dark:border-gray-800 last:border-0"
                                                        >
                                                            <span className="font-bold text-slate-700 dark:text-gray-200 text-xs">{ing.name}</span>
                                                            <span className="text-[9px] bg-orange-100 dark:bg-orange-900/40 text-orange-600 px-2 py-0.5 rounded-full font-bold">INSUMO</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Inputs de cantidad/precio */}
                                        {selectedIngredient ? (
                                            <div className="bg-orange-50 dark:bg-orange-900/10 p-4 rounded-xl border border-orange-100 dark:border-orange-900/30 animate-fade-in">
                                                <div className="flex justify-between items-center mb-3">
                                                    <span className="text-[10px] font-bold text-orange-600 uppercase">Cantidad a Usar</span>
                                                    <button onClick={() => setSelectedIngredient(null)} className="text-orange-400 hover:text-orange-600 transition-colors">
                                                        <span className="material-symbols-outlined text-[18px]">close</span>
                                                    </button>
                                                </div>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="number"
                                                        placeholder="0"
                                                        className="flex-1 bg-white dark:bg-background-dark border border-orange-200 dark:border-orange-800 rounded-lg p-2.5 text-sm focus:border-orange-500 outline-none"
                                                        value={useQty}
                                                        onChange={e => setUseQty(e.target.value)}
                                                    />
                                                    <div className="w-20 bg-white dark:bg-background-dark border border-orange-200 dark:border-orange-800 rounded-lg p-2.5 text-sm flex items-center justify-center font-bold text-orange-600">
                                                        {selectedIngredient.purchase_unit}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : searchQuery.length >= 2 && (
                                            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-800 flex flex-col gap-3 animate-fade-in">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase">Item Nuevo - Definir Precio</p>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="relative">
                                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">$</span>
                                                        <input
                                                            type="number"
                                                            placeholder="Precio"
                                                            className="w-full bg-white dark:bg-background-dark border border-gray-200 dark:border-gray-700 rounded-lg p-2.5 pl-4 text-xs outline-none focus:border-secondary"
                                                            value={manualPrice}
                                                            onChange={e => setManualPrice(e.target.value)}
                                                        />
                                                    </div>
                                                    <input
                                                        type="number"
                                                        placeholder="Rinde"
                                                        className="w-full bg-white dark:bg-background-dark border border-gray-200 dark:border-gray-700 rounded-lg p-2.5 text-xs outline-none focus:border-secondary"
                                                        value={manualYield}
                                                        onChange={e => setManualYield(e.target.value)}
                                                    />
                                                </div>
                                                <div className="flex gap-1">
                                                    {['Und', 'Gr', 'Ml', 'Kg', 'Lt'].map(u => (
                                                        <button
                                                            key={u}
                                                            onClick={() => setUseUnit(u)}
                                                            className={`flex-1 py-1 rounded-md text-[9px] font-bold border transition-all ${useUnit === u ? 'bg-secondary text-white border-secondary' : 'bg-white dark:bg-gray-800 text-gray-400 border-gray-200 dark:border-gray-700'}`}
                                                        >
                                                            {u}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <button
                                            onClick={handleAddItemToRecipe}
                                            disabled={!searchQuery || (!selectedIngredient && (!manualPrice || !manualYield))}
                                            className="w-full mt-4 py-3 bg-slate-800 dark:bg-surface-light text-white dark:text-slate-900 rounded-xl font-bold text-xs hover:bg-black dark:hover:bg-white transition-all active:scale-95 disabled:opacity-50"
                                        >
                                            AÑADIR A RECETA
                                        </button>

                                        {/* INGREDIENTES EN LA RECETA ACTUAL */}
                                        {tempRecipeIngredients.length > 0 && (
                                            <div className="mt-6 pt-4 border-t border-gray-50 dark:border-gray-800 flex flex-col gap-2">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Insumos en esta receta</p>
                                                <div className="max-h-40 overflow-y-auto pr-1 flex flex-col gap-2">
                                                    {tempRecipeIngredients.map(item => (
                                                        <div key={item.id} className="flex justify-between items-center bg-gray-50 dark:bg-gray-800/40 p-2.5 rounded-lg text-[11px] animate-fade-in group/item">
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-slate-700 dark:text-gray-300 truncate max-w-[140px]">{item.name}</span>
                                                                <span className="text-[9px] text-gray-400">{formatCurrency(item.cost)}</span>
                                                            </div>
                                                            <button onClick={() => setTempRecipeIngredients(tempRecipeIngredients.filter(i => i.id !== item.id))} className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover/item:opacity-100">
                                                                <span className="material-symbols-outlined text-sm">close</span>
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="mt-4 p-4 bg-orange-500 rounded-2xl text-white text-center shadow-lg shadow-orange-500/20">
                                                    <p className="text-[10px] font-bold uppercase opacity-80">Costo Total Receta</p>
                                                    <p className="text-2xl font-black">{formatCurrency(tempRecipeIngredients.reduce((acc, i) => acc + i.cost, 0))}</p>
                                                </div>

                                                <button
                                                    onClick={handleSaveRecipe}
                                                    disabled={!recipeName || isSubmitting}
                                                    className="mt-2 w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black rounded-2xl active:scale-95 transition-all text-sm shadow-xl flex items-center justify-center gap-2"
                                                >
                                                    {isSubmitting ? <span className="material-symbols-outlined animate-spin">refresh</span> : 'GUARDAR RECETA BASE'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* LISTADO DE RECETAS GUARDADAS */}
                        <div className="lg:col-span-2">
                            {loadingData ? (
                                <div className="text-center py-10">
                                    <span className="material-symbols-outlined animate-spin text-4xl text-gray-300">progress_activity</span>
                                </div>
                            ) : displayItems.length > 0 ? (
                                <div className="flex flex-col gap-4">
                                    {displayItems.map((item) => (
                                        <div key={item.id} className="group bg-white dark:bg-surface-dark rounded-2xl md:rounded-xl shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden hover:shadow-md hover:border-orange-500/20 transition-all duration-300">
                                            <div className="flex items-center justify-between p-4 px-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="size-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-500 flex items-center justify-center">
                                                        <span className="material-symbols-outlined">bakery_dining</span>
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-800 dark:text-white text-sm">{item.name}</h4>
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase">Receta Base</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    <div className="text-right">
                                                        <p className="text-[9px] text-gray-400 font-bold uppercase">Costo Base</p>
                                                        <p className="font-black text-slate-700 dark:text-white text-base">{formatCurrency(item.totalCost)}</p>
                                                    </div>
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => {
                                                                const fullItem = dishes.find(d => d.id === item.id);
                                                                setEditingItemDish(fullItem);
                                                            }}
                                                            className="p-2 text-gray-400 hover:text-orange-500 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20"
                                                        >
                                                            <span className="material-symbols-outlined text-[20px]">edit</span>
                                                        </button>
                                                        <button
                                                            onClick={() => setShowDeleteConfirm({ id: item.id, name: item.name, type: 'RECETA' })}
                                                            className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10"
                                                        >
                                                            <span className="material-symbols-outlined text-[20px]">delete</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-3xl bg-gray-50/30">
                                    <span className="material-symbols-outlined text-4xl text-gray-300 mb-3">no_meals</span>
                                    <h3 className="text-sm font-bold text-neutral-dark dark:text-white">No tienes recetas base</h3>
                                    <p className="text-xs text-gray-400 max-w-[200px] mt-1">Usa el constructor de la izquierda para crear mezclas de ingredientes.</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* PRODUCTO (Lista simple) */
                    loadingData ? (
                        <div className="flex items-center justify-center py-20">
                            <span className="material-symbols-outlined animate-spin text-4xl text-gray-300">progress_activity</span>
                        </div>
                    ) : displayItems.length > 0 ? (
                        <div className="flex flex-col gap-4 animate-fade-in-up">
                            {/* Header del Listado (Desktop) */}
                            <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-gray-100/50 dark:bg-gray-800/30 rounded-xl text-[10px] font-bold text-gray-400 uppercase tracking-widest border border-transparent">
                                <div className="col-span-1">Tipo</div>
                                <div className="col-span-4">Nombre del Producto / Receta</div>
                                <div className="col-span-2 text-center">Costo Prod.</div>
                                <div className="col-span-2 text-center">Precio Venta</div>
                                <div className="col-span-1 text-center">Margen</div>
                                <div className="col-span-2 text-right">Acciones</div>
                            </div>

                            {displayItems.map((item) => (
                                <div key={item.id} className="group bg-white dark:bg-surface-dark rounded-2xl md:rounded-xl shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden hover:shadow-md hover:border-secondary/20 transition-all duration-300">
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center p-4 md:p-3">

                                        {/* TIPO & ICONO */}
                                        <div className="col-span-1 flex items-center justify-between md:justify-center">
                                            <div className="size-10 rounded-xl flex items-center justify-center bg-blue-50 dark:bg-blue-900/20 text-blue-500">
                                                <span className="material-symbols-outlined text-[22px]">restaurant_menu</span>
                                            </div>
                                            <div className="md:hidden px-2 py-1 rounded-md text-[9px] font-bold uppercase border bg-blue-50 text-blue-600 border-blue-100">PRODUCTO</div>
                                        </div>

                                        {/* NOMBRE */}
                                        <div className="col-span-4">
                                            <h4 className="font-bold text-slate-800 dark:text-white text-base md:text-sm truncate" title={item.name}>{item.name}</h4>
                                            <p className="text-[10px] text-gray-400 font-medium hidden md:block uppercase tracking-tight">PRODUCTO TERMINADO</p>
                                        </div>

                                        {/* COSTO */}
                                        <div className="col-span-2 flex md:flex-col justify-between md:items-center">
                                            <span className="md:hidden text-[10px] text-gray-400 font-bold uppercase">Costo</span>
                                            <span className="font-bold text-slate-700 dark:text-gray-300 text-sm">{formatCurrency(item.totalCost)}</span>
                                        </div>

                                        {/* PRECIO VENTA */}
                                        <div className="col-span-2 flex md:flex-col justify-between md:items-center">
                                            <span className="md:hidden text-[10px] text-gray-400 font-bold uppercase">Venta</span>
                                            <span className="font-black text-secondary text-base md:text-sm">{formatCurrency(item.salePrice)}</span>
                                        </div>

                                        {/* MARGEN */}
                                        <div className="col-span-1 flex md:flex-col justify-between md:items-center">
                                            <span className="md:hidden text-[10px] text-gray-400 font-bold uppercase">Margen</span>
                                            <span className="px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-[10px] font-black border border-green-100 dark:border-green-800/30">
                                                {item.profitMargin}%
                                            </span>
                                        </div>

                                        {/* ACCIONES */}
                                        <div className="col-span-2 flex justify-end items-center gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-gray-50 dark:border-gray-800">
                                            <button
                                                onClick={() => {
                                                    const fullItem = dishes.find(d => d.id === item.id);
                                                    setEditingItemDish(fullItem);
                                                }}
                                                className="flex-1 md:flex-none flex items-center justify-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 text-slate-500 hover:text-secondary rounded-lg md:rounded-md transition-all border border-gray-100 dark:border-gray-700 md:opacity-0 group-hover:opacity-100"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">edit</span>
                                            </button>
                                            <button
                                                onClick={() => setShowDeleteConfirm({ id: item.id, name: item.name, type: 'PRODUCTO' })}
                                                className="flex-1 md:flex-none flex items-center justify-center gap-2 p-2 bg-red-50 dark:bg-red-900/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg md:rounded-md transition-all border border-red-100/50 dark:border-red-900/30 md:opacity-0 group-hover:opacity-100"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">delete</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl bg-gray-50/50 dark:bg-gray-900/50">
                            <div className="size-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 mb-4">
                                <span className="material-symbols-outlined text-3xl">inventory_2</span>
                            </div>
                            <h3 className="text-lg font-bold text-neutral-dark dark:text-white">No tienes productos aún</h3>
                            <button onClick={handleNewProject} className="mt-6 text-secondary font-bold hover:underline">Ir al Costeador</button>
                        </div>
                    )
                )}

            </main>
            <footer className="w-full py-4 text-center text-sm text-neutral-gray/60 dark:text-slate-500 mt-auto">
                <p>Moneda: <span className="font-bold text-secondary">COP $</span> • Medidas: <span className="font-bold">Gramos / Mililitros</span></p>
            </footer>

            {/* MODAL: CONFIGURAICON DE ELIMINACION */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-surface-dark w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 transform transition-all scale-100 animate-fade-in-up">
                        <div className="p-6 text-center">
                            <div className="size-16 rounded-full bg-red-50 dark:bg-red-900/20 text-red-500 flex items-center justify-center mx-auto mb-4">
                                <span className="material-symbols-outlined text-3xl">delete_forever</span>
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">¿Confirmar eliminación?</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 px-4">
                                Estás a punto de eliminar <strong>"{showDeleteConfirm.name}"</strong>. Esta acción no se puede deshacer.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowDeleteConfirm(null)}
                                    className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                                >
                                    CANCELAR
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-500/20 transition-all active:scale-95"
                                >
                                    ELIMINAR
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: EDICIÓN DE INSUMO */}
            {editingItem && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-surface-dark w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 transform transition-all scale-100 animate-fade-in-up">
                        <div className="p-6 text-center bg-gradient-to-r from-secondary to-primary relative overflow-hidden">
                            <div className="absolute inset-0 bg-white/10 opacity-50 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                            <h3 className="text-2xl font-black text-white relative z-10 mb-1">Editar Insumo</h3>
                            <button onClick={() => setEditingItem(null)} className="absolute top-4 right-4 text-white/80 hover:text-white focus:outline-none">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleUpdateIngredient} className="p-8 flex flex-col gap-6">
                            <div>
                                <label className="section-label">Nombre del Insumo</label>
                                <input
                                    className="w-full bg-gray-50 dark:bg-background-dark border border-gray-200 dark:border-gray-700 rounded-xl py-4 px-4 text-slate-800 dark:text-white font-medium focus:border-secondary outline-none transition-all"
                                    value={editingItem.name}
                                    onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
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
                                            value={editingItem.purchase_price}
                                            onChange={e => setEditingItem({ ...editingItem, purchase_price: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="section-label">Cantidad Paquete</label>
                                    <input
                                        type="number"
                                        className="w-full bg-gray-50 dark:bg-background-dark border border-gray-200 dark:border-gray-700 rounded-xl py-4 px-4 text-slate-800 dark:text-white font-medium focus:border-secondary outline-none transition-all"
                                        value={editingItem.purchase_quantity}
                                        onChange={e => setEditingItem({ ...editingItem, purchase_quantity: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="section-label">Unidad de Medida</label>
                                <div className="flex gap-2 bg-gray-50 dark:bg-background-dark p-1 rounded-lg border border-gray-200 dark:border-gray-700">
                                    {['Und', 'Gr', 'Ml', 'Kg', 'Lt'].map(u => (
                                        <button
                                            key={u}
                                            type="button"
                                            onClick={() => setEditingItem({ ...editingItem, purchase_unit: u })}
                                            className={`flex-1 py-2 rounded-md text-xs font-bold transition-all ${editingItem.purchase_unit === u ? 'bg-white dark:bg-gray-700 shadow-sm text-secondary' : 'text-gray-400 hover:text-gray-600'}`}
                                        >
                                            {u}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-secondary hover:bg-secondary-dark font-bold text-white py-4 rounded-xl shadow-lg shadow-secondary/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? <span className="material-symbols-outlined animate-spin">refresh</span> : 'GUARDAR CAMBIOS'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: EDICIÓN DE MENÚ / PRODUCTO */}
            {editingItemDish && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-surface-dark w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 transform transition-all scale-100 animate-fade-in-up">
                        <div className={`p-6 text-center relative overflow-hidden ${editingItemDish.sale_price > 0 ? 'bg-gradient-to-r from-blue-600 to-indigo-600' : 'bg-gradient-to-r from-orange-500 to-amber-500'}`}>
                            <div className="absolute inset-0 bg-white/10 opacity-50 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                            <h3 className="text-2xl font-black text-white relative z-10 mb-1">Editar {editingItemDish.sale_price > 0 ? 'Producto' : 'Receta'}</h3>
                            <button onClick={() => setEditingItemDish(null)} className="absolute top-4 right-4 text-white/80 hover:text-white focus:outline-none">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleUpdateDish} className="p-8 flex flex-col gap-6">
                            <div>
                                <label className="section-label">Nombre del Menú</label>
                                <input
                                    className="w-full bg-gray-50 dark:bg-background-dark border border-gray-200 dark:border-gray-700 rounded-xl py-4 px-4 text-slate-800 dark:text-white font-medium focus:border-secondary outline-none transition-all"
                                    value={editingItemDish.name}
                                    onChange={e => setEditingItemDish({ ...editingItemDish, name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="section-label">Costo Producción</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                                        <input
                                            type="number"
                                            className="w-full bg-gray-50 dark:bg-background-dark border border-gray-200 dark:border-gray-700 rounded-xl py-4 pl-6 pr-4 text-slate-800 dark:text-white font-medium focus:border-secondary outline-none transition-all"
                                            value={editingItemDish.total_cost}
                                            onChange={e => setEditingItemDish({ ...editingItemDish, total_cost: e.target.value })}
                                        />
                                    </div>
                                </div>
                                {editingItemDish.sale_price > 0 && (
                                    <div>
                                        <label className="section-label">Precio Venta</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                                            <input
                                                type="number"
                                                className="w-full bg-gray-50 dark:bg-background-dark border border-gray-200 dark:border-gray-700 rounded-xl py-4 pl-6 pr-4 text-slate-800 dark:text-white font-medium focus:border-secondary outline-none transition-all"
                                                value={editingItemDish.sale_price}
                                                onChange={e => setEditingItemDish({ ...editingItemDish, sale_price: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {editingItemDish.sale_price > 0 && (
                                <div>
                                    <label className="section-label">Margen de Ganancia (%)</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            className="w-full bg-gray-50 dark:bg-background-dark border border-gray-200 dark:border-gray-700 rounded-xl py-4 px-4 text-slate-800 dark:text-white font-medium focus:border-secondary outline-none transition-all"
                                            value={editingItemDish.profit_margin}
                                            onChange={e => setEditingItemDish({ ...editingItemDish, profit_margin: e.target.value })}
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>
                                    </div>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`w-full font-bold text-white py-4 rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 ${editingItemDish.sale_price > 0 ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20' : 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20'}`}
                            >
                                {isSubmitting ? <span className="material-symbols-outlined animate-spin">refresh</span> : 'ACTUALIZAR MENÚ'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InventoryPage;