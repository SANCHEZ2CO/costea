import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import HeaderSimple from '../components/HeaderSimple';
import { useApp } from '../context/AppContext';
import { ItemType, CostItem } from '../types';
import { formatCurrency } from '../constants';

const CostingEnginePage: React.FC = () => {
    const navigate = useNavigate();
    const { project, updateProjectName, addItem, removeItem, toggleFactorQ } = useApp();

    // Local form state
    const [searchQuery, setSearchQuery] = useState('');
    const [itemType, setItemType] = useState<ItemType>(ItemType.INSUMO);
    
    // Simplified Inputs
    const [buyPrice, setBuyPrice] = useState<string>(''); // Costo total del paquete/unidad
    const [yieldQty, setYieldQty] = useState<string>(''); // Rendimiento (para cuántos alcanza)

    // Recipe Builder State
    const [recipeName, setRecipeName] = useState('');
    const [tempRecipeIngredients, setTempRecipeIngredients] = useState<CostItem[]>([]);

    const isRecipeMode = itemType === ItemType.RECETA;

    const handleAddIngredientOrItem = () => {
        if (!searchQuery) return;

        const price = parseFloat(buyPrice) || 0;
        const yieldAmount = parseFloat(yieldQty) || 1; // Default to 1 to avoid division by zero

        // Simplified Logic: Cost = Total Price / Yield
        // Example: Bag of balloons $5000 / 50 balloons = $100 per balloon
        const calculatedCost = price / yieldAmount;

        const newItem: CostItem = {
            id: Date.now().toString(),
            name: searchQuery,
            type: isRecipeMode ? ItemType.INSUMO : itemType, 
            cost: calculatedCost,
            // Storing raw data for display
            boughtPrice: price,
            usedQty: yieldAmount, 
            boughtUnit: 'Und', // Generic unit for simplified view
            usedUnit: 'Und'
        };

        if (isRecipeMode) {
            setTempRecipeIngredients([...tempRecipeIngredients, newItem]);
            setSearchQuery('');
            setBuyPrice('');
            setYieldQty('');
        } else {
            addItem(newItem);
            setSearchQuery('');
            setBuyPrice('');
            setYieldQty('');
        }
    };

    const handleFinalizeRecipe = () => {
        if (tempRecipeIngredients.length === 0 || !recipeName) return;

        const totalRecipeCost = tempRecipeIngredients.reduce((acc, item) => acc + item.cost, 0);

        const recipeItem: CostItem = {
            id: Date.now().toString(),
            name: recipeName,
            type: ItemType.RECETA,
            cost: totalRecipeCost,
            boughtPrice: totalRecipeCost, // For display consistency
            usedQty: 1
        };

        addItem(recipeItem);
        
        setTempRecipeIngredients([]);
        setRecipeName('');
        setSearchQuery('');
        setBuyPrice('');
        setYieldQty('');
    };

    const removeTempIngredient = (id: string) => {
        setTempRecipeIngredients(prev => prev.filter(i => i.id !== id));
    };

    const totalCost = project.items.reduce((acc, item) => acc + item.cost, 0);
    const finalCost = project.factorQ ? totalCost * 1.05 : totalCost;

    return (
        <div className="bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-200 font-display min-h-screen flex flex-col transition-colors duration-200">
            <HeaderSimple />
            <main className="flex-1 w-full max-w-[1440px] mx-auto p-4 md:p-8 flex flex-col items-center">
                
                {/* BOTÓN REGRESAR PERSISTENTE */}
                <div className="w-full max-w-5xl mb-4">
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

                <section className="flex flex-col gap-6 w-full max-w-5xl">
                    <div className="w-full bg-surface-light dark:bg-surface-dark p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                        <div className="flex justify-between items-center mb-2">
                             <label className="text-xs font-bold text-primary dark:text-primary-light uppercase tracking-wider block">Nombre del Menú a Costear</label>
                        </div>
                        <div className="relative">
                            <input 
                                className="w-full text-3xl font-black text-slate-900 dark:text-white bg-transparent border-0 border-b-2 border-gray-200 dark:border-gray-700 focus:border-primary dark:focus:border-primary focus:ring-0 px-0 py-2 placeholder-gray-300 transition-colors" 
                                placeholder="Ej: Desayuno Sorpresa Aniversario" 
                                type="text" 
                                value={project.name}
                                onChange={(e) => updateProjectName(e.target.value)}
                            />
                            <span className="material-symbols-outlined absolute right-0 top-1/2 -translate-y-1/2 text-gray-300 text-3xl">edit</span>
                        </div>
                    </div>

                    <div className={`bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm relative overflow-hidden group transition-all duration-300 ${isRecipeMode ? 'ring-2 ring-orange-400/50' : ''}`}>
                        <div className={`absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b ${isRecipeMode ? 'from-orange-400 to-red-500' : 'from-primary to-secondary'}`}></div>
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <span className={`flex items-center justify-center size-8 rounded-full ${isRecipeMode ? 'bg-orange-100 text-orange-600' : 'bg-primary/10 text-primary'} dark:bg-white/10 dark:text-white text-sm font-bold`}>
                                    {isRecipeMode ? <span className="material-symbols-outlined text-sm">bakery_dining</span> : '2'}
                                </span>
                                <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
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

                            {/* RECIPE NAME INPUT (Only in Recipe Mode) */}
                            {isRecipeMode && (
                                <div className="mb-4 animate-fade-in-up">
                                    <label className="section-label text-orange-600 dark:text-orange-400">Nombre de la Receta (Ej: Waffles)</label>
                                    <div className="relative group-focus-within:ring-2 ring-orange-400/20 rounded-lg transition-all">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-300 material-symbols-outlined text-[20px]">edit_note</span>
                                        <input 
                                            className="w-full bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-lg py-3 px-4 pl-10 text-sm focus:ring-2 focus:ring-orange-400/20 focus:border-orange-400 outline-none transition-all font-bold text-slate-800 dark:text-white" 
                                            placeholder="Nombre de la receta que estás creando..." 
                                            type="text"
                                            value={recipeName}
                                            onChange={(e) => setRecipeName(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* MAIN INPUTS ROW */}
                            <div className="flex flex-col lg:flex-row gap-6 mb-6">
                                <div className="flex-1">
                                    <label className="section-label">{isRecipeMode ? '¿Qué producto lleva la receta?' : 'Nombre del Insumo'}</label>
                                    <div className="relative group-focus-within:ring-2 ring-primary/10 rounded-lg transition-all">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-[20px]">{isRecipeMode ? 'grocery' : 'search'}</span>
                                        <input 
                                            className="w-full bg-gray-50 dark:bg-background-dark border border-gray-300 dark:border-gray-700 rounded-lg py-3 px-4 pl-10 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" 
                                            placeholder={isRecipeMode ? "Ej: Harina de Trigo..." : "Ej: Caja Kraft, Moño..."}
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex flex-col xl:flex-row items-end gap-4">
                                <div className="flex flex-col md:flex-row gap-2 w-full bg-gray-50 dark:bg-gray-900/40 p-3 rounded-xl border border-gray-100 dark:border-gray-800 items-center">
                                    
                                    {/* UNIFIED INPUTS FOR BOTH MODES */}
                                    <div className="flex-1 w-full">
                                        <label className="section-label text-primary dark:text-primary-light">Costo de Compra (Lo que pagaste)</label>
                                        <div className="relative">
                                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                                            <input 
                                                className="w-full bg-white dark:bg-background-dark border border-gray-300 dark:border-gray-700 rounded-md compact-input pl-6 text-center focus:border-primary outline-none" 
                                                placeholder="Precio Total" 
                                                type="number"
                                                value={buyPrice}
                                                onChange={(e) => setBuyPrice(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="text-gray-300 dark:text-gray-600 px-2">
                                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                    </div>
                                    
                                    <div className="flex-1 w-full">
                                        <label className="section-label text-secondary dark:text-blue-300">Rendimiento (Unidades/Porciones)</label>
                                        <input 
                                            className="w-full bg-white dark:bg-background-dark border border-blue-200 dark:border-blue-900 rounded-md compact-input text-center focus:border-secondary outline-none ring-1 ring-blue-500/10" 
                                            placeholder="¿Para cuánto alcanza?" 
                                            type="number"
                                            value={yieldQty}
                                            onChange={(e) => setYieldQty(e.target.value)}
                                        />
                                    </div>
                                
                                </div>
                                
                                <div className="w-full xl:w-auto">
                                    <button 
                                        onClick={handleAddIngredientOrItem}
                                        className={`w-full xl:h-[76px] px-8 py-3 rounded-xl text-sm font-bold uppercase tracking-wide flex items-center justify-center gap-2 transition-all shadow-lg whitespace-nowrap group ${isRecipeMode ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-200' : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-primary hover:text-white shadow-slate-200 dark:shadow-none'}`}
                                    >
                                        <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">{isRecipeMode ? 'playlist_add' : 'add_circle'}</span> 
                                        {isRecipeMode ? 'Agregar Ingrediente' : 'Agregar'}
                                    </button>
                                </div>
                            </div>

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
                                                <button 
                                                    onClick={() => removeItem(item.id)}
                                                    className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20">
                                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                                </button>
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
                        <div className="border-t border-gray-200 dark:border-gray-800 p-5 bg-gray-50 dark:bg-gray-900/30 flex items-center justify-between mt-auto">
                            <div className="flex items-center gap-4">
                                <div className="p-2 rounded-lg bg-secondary/10 text-secondary">
                                    <span className="material-symbols-outlined text-[22px]">science</span>
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Factor Q (+5%)</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-none mt-1">Colchón de seguridad para mermas</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    className="sr-only peer" 
                                    type="checkbox" 
                                    checked={project.factorQ}
                                    onChange={toggleFactorQ}
                                />
                                <div className="w-12 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-secondary"></div>
                            </label>
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
                                    Costo Total: <span className="font-bold">{formatCurrency(finalCost)}</span>
                                </span>
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={() => navigate('/results')}
                        className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary-light hover:to-secondary-dark text-white rounded-xl py-5 shadow-xl shadow-primary/20 transition-all transform hover:-translate-y-0.5 font-bold text-lg flex items-center justify-center gap-3">
                        <span>VER MI COSTO TOTAL</span>
                        <span className="material-symbols-outlined">arrow_forward</span>
                    </button>
                </section>
            </main>
            <footer className="w-full py-4 text-center text-sm text-neutral-gray/60 dark:text-slate-500 mt-auto">
                <p>Moneda: <span className="font-bold text-secondary">COP $</span> • Medidas: <span className="font-bold">Gramos / Mililitros</span></p>
            </footer>
        </div>
    );
};

export default CostingEnginePage;