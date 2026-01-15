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

    // Form State
    const [newIng, setNewIng] = useState({ name: '', price: '', qty: '', unit: 'Und' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch Data Effect
    React.useEffect(() => {
        if (!user) return;

        if (filterType === 'INSUMO') {
            fetchIngredients();
        } else {
            // For PRODUCTO and RECETA tabs, load dishes
            fetchDishes();
        }
    }, [user, filterType]);

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
                        {/* FORMULARIO DE CREACIÓN */}
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
                                                <span className="text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-500 px-2 py-1 rounded uppercase">{ing.purchase_unit}</span>
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

                                            {/* Costo Unitario Calculado (Helper Visual) */}
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
                ) : (
                    /* Grid (Dishes) */
                    loadingData ? (
                        <div className="flex items-center justify-center py-20">
                            <span className="material-symbols-outlined animate-spin text-4xl text-gray-300">progress_activity</span>
                        </div>
                    ) : displayItems.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in-up">
                            {displayItems.map((item) => (
                                <div key={item.id} className="group bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                                    <div className={`h-40 relative overflow-hidden flex items-center justify-center ${item.type === 'RECETA' ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-blue-50 dark:bg-blue-900/20'}`}>
                                        <div className={`absolute top-3 right-3 backdrop-blur-sm px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1 ${item.type === 'RECETA'
                                            ? 'bg-white/90 dark:bg-black/50 text-orange-600 border-orange-100 dark:border-orange-500/30'
                                            : 'bg-white/90 dark:bg-black/50 text-blue-600 border-blue-100 dark:border-blue-500/30'
                                            }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${item.type === 'RECETA' ? 'bg-orange-500' : 'bg-blue-500'}`}></span>
                                            {item.type}
                                        </div>
                                        <span className={`material-symbols-outlined text-6xl ${item.type === 'RECETA' ? 'text-orange-200 dark:text-orange-800/50' : 'text-blue-200 dark:text-blue-800/50'}`}>
                                            {item.type === 'RECETA' ? 'bakery_dining' : 'restaurant_menu'}
                                        </span>
                                    </div>
                                    <div className="p-5">
                                        <h3 className="font-bold text-lg text-neutral-dark dark:text-white leading-tight mb-4 truncate" title={item.name}>{item.name}</h3>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-neutral-gray dark:text-gray-400">Costo Producción</span>
                                                <span className="font-semibold text-neutral-dark dark:text-gray-200">{formatCurrency(item.totalCost)}</span>
                                            </div>
                                            {item.type === 'PRODUCTO' && (
                                                <>
                                                    <div className="flex justify-between items-center text-sm">
                                                        <span className="text-neutral-gray dark:text-gray-400">Precio Sugerido</span>
                                                        <span className="font-bold text-secondary text-lg">{formatCurrency(item.salePrice)}</span>
                                                    </div>
                                                    <div className="pt-3 border-t border-gray-100 dark:border-white/5 flex justify-between items-center">
                                                        <span className="text-xs font-medium text-neutral-gray uppercase tracking-wider">Margen</span>
                                                        <span className="px-2 py-1 rounded-md bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-xs font-bold border border-green-100 dark:border-green-800/30">{item.profitMargin}%</span>
                                                    </div>
                                                </>
                                            )}
                                            {item.type === 'RECETA' && (
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-neutral-gray dark:text-gray-400">Rendimiento Base</span>
                                                    <span className="font-bold text-orange-600 text-sm">1 Und</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl bg-gray-50/50 dark:bg-gray-900/50">
                            <div className="size-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 mb-4">
                                <span className="material-symbols-outlined text-3xl">
                                    {filterType === 'RECETA' ? 'no_meals' : 'inventory_2'}
                                </span>
                            </div>
                            <h3 className="text-lg font-bold text-neutral-dark dark:text-white">No tienes {filterType === 'RECETA' ? 'recetas' : 'productos'} aún</h3>
                            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mt-2 text-sm">
                                {filterType === 'RECETA'
                                    ? 'Las recetas que crees dentro del Costeador aparecerán aquí automáticamente.'
                                    : 'Comienza a costear un nuevo menú para llenarlo de productos rentables.'}
                            </p>
                            <button onClick={handleNewProject} className="mt-6 text-secondary font-bold hover:underline">
                                Ir al Costeador
                            </button>
                        </div>
                    )
                )}

            </main>
            <footer className="w-full py-4 text-center text-sm text-neutral-gray/60 dark:text-slate-500 mt-auto">
                <p>Moneda: <span className="font-bold text-secondary">COP $</span> • Medidas: <span className="font-bold">Gramos / Mililitros</span></p>
            </footer>
        </div>
    );
};

export default InventoryPage;