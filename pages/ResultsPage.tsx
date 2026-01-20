import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useNavigate } from 'react-router-dom';
import HeaderSimple from '../components/HeaderSimple';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../constants';
import LiquidLoader from '../components/LiquidLoader';
import LiquidModal from '../components/LiquidModal';

const ResultsPage: React.FC = () => {
    const navigate = useNavigate();
    const { project, updateProfitMargin, resetProject, settings, user } = useApp();

    const [roundingOption, setRoundingOption] = useState<number>(0);
    const [isSaving, setIsSaving] = useState(false);
    const [isAnimated, setIsAnimated] = useState(false);
    const [salePriceInput, setSalePriceInput] = useState('');
    const [marginInput, setMarginInput] = useState('');
    const [editingField, setEditingField] = useState<'price' | 'margin' | null>(null);
    const [fixedSalePrice, setFixedSalePrice] = useState<number | null>(null); // Fixed price set by user

    // Modal State
    const [modal, setModal] = useState<{
        isOpen: boolean; title: string; message: string; type: 'success' | 'error' | 'warning' | 'info'; onConfirm?: () => void;
    }>({ isOpen: false, title: '', message: '', type: 'info' });

    const closeModal = () => {
        setModal(prev => ({ ...prev, isOpen: false }));
        if (modal.onConfirm) modal.onConfirm();
    };

    const showModal = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', onConfirm?: () => void) => {
        setModal({ isOpen: true, title, message, type, onConfirm });
    };

    // Trigger animation on mount
    useEffect(() => {
        const timer = setTimeout(() => setIsAnimated(true), 100);
        return () => clearTimeout(timer);
    }, []);

    // Calculations
    const factorQVal = settings?.factorQPercentage || 5;
    const factorQMultiplier = 1 + (factorQVal / 100);
    const totalMaterialsCost = project.items.reduce((acc, item) => acc + item.cost, 0);
    const materialsWithFactorQ = project.factorQ ? totalMaterialsCost * factorQMultiplier : totalMaterialsCost;
    const laborCost = project.laborCost || 0;
    const factorQAmount = project.factorQ ? totalMaterialsCost * (factorQVal / 100) : 0;
    const costWithFactorQ = materialsWithFactorQ + laborCost;

    const marginDecimal = project.profitMargin / 100;
    const effectiveMargin = Math.min(marginDecimal, 0.99);
    const rawSalePrice = costWithFactorQ / (1 - effectiveMargin);

    // Use fixed price if set, otherwise use calculated price
    let salePrice: number;
    if (fixedSalePrice !== null) {
        salePrice = fixedSalePrice;
    } else if (roundingOption > 0) {
        salePrice = Math.ceil(rawSalePrice / roundingOption) * roundingOption;
    } else {
        salePrice = rawSalePrice;
    }

    const profitAmount = salePrice - costWithFactorQ;

    // Calculate effective margin from actual sale price (for display consistency)
    const effectiveMarginPercent = salePrice > 0 ? ((salePrice - costWithFactorQ) / salePrice) * 100 : 0;

    // Profit Health (Gamification)
    const profitHealth = profitAmount > 0 ? Math.min((project.profitMargin / 50) * 100, 100) : 0;
    const getGlowIntensity = () => {
        if (project.profitMargin >= 40) return 'shadow-[0_0_60px_rgba(34,197,94,0.4)]';
        if (project.profitMargin >= 25) return 'shadow-[0_0_40px_rgba(34,197,94,0.3)]';
        return 'shadow-[0_0_20px_rgba(34,197,94,0.2)]';
    };

    // Handle inline editing for Sale Price
    const handlePriceEdit = () => {
        setEditingField('price');
        // Use the current displayed price (with or without rounding)
        setSalePriceInput(Math.round(salePrice).toString());
    };

    const handlePriceSubmit = () => {
        const newPrice = parseFloat(salePriceInput.replace(/[^0-9.-]/g, '')); // Clean input

        if (!isNaN(newPrice) && newPrice > 0) {
            // Set the fixed price - this will be used instead of calculated price
            setFixedSalePrice(newPrice);
            // Clear rounding since we're using a fixed price
            setRoundingOption(0);

            // Calculate and update the margin to match this price (so slider adapts)
            if (newPrice > costWithFactorQ) {
                const newMargin = ((newPrice - costWithFactorQ) / newPrice) * 100;
                const clampedMargin = Math.max(0, Math.min(95, Math.round(newMargin)));
                updateProfitMargin(clampedMargin);
            } else {
                updateProfitMargin(0);
            }
        }
        setEditingField(null);
    };

    // Handle inline editing for Margin
    const handleMarginEdit = () => {
        setEditingField('margin');
        setMarginInput(project.profitMargin.toString());
    };

    const handleMarginSubmit = () => {
        const newMargin = parseFloat(marginInput);
        if (!isNaN(newMargin) && newMargin >= 0 && newMargin <= 95) {
            updateProfitMargin(Math.round(newMargin));
            setFixedSalePrice(null); // Clear fixed price, go back to calculated mode
        }
        setEditingField(null);
    };

    const handleSaveAndFinish = async () => {
        if (!project.name) { showModal("Nombre Requerido", "Por favor asigna un nombre a tu proyecto.", "warning"); return; }
        if (!user) { showModal("Sesión Requerida", "Debes iniciar sesión.", "warning"); return; }

        setIsSaving(true);
        try {
            const { data: dishData, error: dishError } = await supabase.from('dishes').insert({
                user_id: user.id, name: project.name, total_cost: costWithFactorQ, sale_price: salePrice, profit_margin: project.profitMargin
            }).select().single();

            if (dishError) throw dishError;

            const ingredientsToInsert = project.items.map(item => ({
                dish_id: dishData.id, name: item.name, cost_snapshot: item.cost, used_quantity: item.usedQty, used_unit: item.usedUnit || 'Und'
            }));

            const { error: ingError } = await supabase.from('dish_ingredients').insert(ingredientsToInsert);
            if (ingError) throw ingError;

            showModal("¡Guardado!", "Tu proyecto está seguro en el inventario.", "success", () => {
                resetProject();
                navigate('/inventory');
            });
        } catch (error: any) {
            showModal("Error", error.message || "Error desconocido.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-[#F8F9FB] dark:bg-slate-900 min-h-screen text-slate-800 dark:text-white font-display flex flex-col transition-colors duration-500 pb-20">
            <HeaderSimple />
            {isSaving && <LiquidLoader />}

            <LiquidModal
                isOpen={modal.isOpen} title={modal.title} message={modal.message} type={modal.type}
                onClose={closeModal} onConfirm={closeModal} confirmText={modal.type === 'success' ? 'Finalizar' : 'Entendido'}
            />

            <main className="w-full max-w-5xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-8">

                {/* Header */}
                <header className="flex items-center gap-4">
                    <button onClick={() => navigate('/costing-engine')} className="size-12 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:border-violet-300 flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-sm">
                        <span className="material-symbols-outlined text-slate-400">arrow_back</span>
                    </button>
                    <div className="flex-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dashboard de Resultados</span>
                        <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-none tracking-tight text-balance">{project.name || 'Sin Nombre'}</h1>
                    </div>
                    <div className="hidden md:flex items-center gap-2 text-xs font-bold text-slate-400">
                        <span className="material-symbols-outlined text-[16px]">tips_and_updates</span>
                        <span>"Simplicity is the ultimate sophistication"</span>
                    </div>
                </header>

                {/* Bento Grid */}
                <section className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">

                    {/* Cost Breakdown Cards */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100/80 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="size-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 flex items-center justify-center">
                                <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Materiales</span>
                        </div>
                        <p className="text-2xl font-black text-slate-900 dark:text-white">{formatCurrency(totalMaterialsCost)}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{project.items.length} items</p>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100/80 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="size-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">
                                <span className="material-symbols-outlined text-[18px]">timer</span>
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Mano de Obra</span>
                        </div>
                        <p className="text-2xl font-black text-slate-900 dark:text-white">{formatCurrency(laborCost)}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{project.laborTimeMinutes || 0} min</p>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100/80 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="size-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center">
                                <span className="material-symbols-outlined text-[18px]">science</span>
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Factor Q ({factorQVal}%)</span>
                        </div>
                        <p className="text-2xl font-black text-slate-900 dark:text-white">{formatCurrency(factorQAmount)}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{project.factorQ ? 'Activo' : 'Inactivo'}</p>
                    </div>

                    <div className="bg-slate-900 dark:bg-black rounded-2xl p-5 border border-slate-800 dark:border-slate-700/50 shadow-lg">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="size-8 rounded-lg bg-white/10 text-white flex items-center justify-center">
                                <span className="material-symbols-outlined text-[18px]">payments</span>
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Costo Final</span>
                        </div>
                        <p className="text-2xl font-black text-white">{formatCurrency(costWithFactorQ)}</p>
                        <p className="text-[10px] text-slate-500 mt-1">Base para cálculos</p>
                    </div>

                </section>

                {/* Main Results Grid */}
                <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* Left: Pricing Controls */}
                    <div className="lg:col-span-7 flex flex-col gap-5">

                        {/* Sale Price Card (AI Arc Input) */}
                        <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-100/80 dark:border-slate-700/50 shadow-sm relative overflow-hidden group">
                            <div className="absolute inset-0 opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 pointer-events-none">
                                <div className="absolute inset-0 bg-[conic-gradient(from_0deg,rgba(139,92,246,0.1),rgba(236,72,153,0.1),rgba(59,130,246,0.1),rgba(139,92,246,0.1))] animate-[spin_8s_linear_infinite]"></div>
                            </div>

                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Precio de Venta</span>
                                    <span className="text-[10px] font-bold text-violet-500 bg-violet-50 dark:bg-violet-900/20 px-2 py-1 rounded-md">
                                        {roundingOption > 0 ? `Redondeado a $${roundingOption}` : 'Exacto'}
                                    </span>
                                </div>

                                {editingField === 'price' ? (
                                    <div className="flex items-center gap-3">
                                        <span className="text-4xl font-black text-slate-300">$</span>
                                        <input
                                            autoFocus
                                            type="number"
                                            value={salePriceInput}
                                            onChange={(e) => setSalePriceInput(e.target.value)}
                                            onBlur={handlePriceSubmit}
                                            onKeyDown={(e) => e.key === 'Enter' && handlePriceSubmit()}
                                            className="text-5xl font-black bg-transparent border-b-4 border-violet-500 focus:border-violet-600 outline-none w-full text-slate-900 dark:text-white animate-pulse"
                                        />
                                    </div>
                                ) : (
                                    <button onClick={handlePriceEdit} className="w-full text-left group/price">
                                        <span className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tight group-hover/price:text-violet-600 transition-colors">
                                            {formatCurrency(salePrice)}
                                        </span>
                                        <span className="material-symbols-outlined text-slate-300 group-hover/price:text-violet-500 ml-2 text-xl transition-colors">edit</span>
                                    </button>
                                )}

                                {/* Rounding Options */}
                                <div className="mt-6 pt-6 border-t border-slate-50 dark:border-slate-700/50">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Redondeo Inteligente</p>
                                    <div className="flex flex-wrap gap-2">
                                        {[0, 100, 500, 1000, 5000].map(val => (
                                            <button
                                                key={val}
                                                onClick={() => setRoundingOption(val)}
                                                className={`px-4 py-2.5 rounded-xl text-xs font-black border-2 transition-all ${roundingOption === val
                                                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white scale-105'
                                                    : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-100 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500'
                                                    }`}
                                            >
                                                {val === 0 ? 'Exacto' : `$${val.toLocaleString()}`}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Margin Slider (AI Arc Input) */}
                        <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-100/80 dark:border-slate-700/50 shadow-sm relative overflow-hidden group">
                            <div className="absolute inset-0 opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 pointer-events-none">
                                <div className="absolute inset-0 bg-[conic-gradient(from_180deg,rgba(34,197,94,0.1),rgba(16,185,129,0.1),rgba(34,197,94,0.1))] animate-[spin_8s_linear_infinite]"></div>
                            </div>

                            <div className="relative z-10">
                                <div className="flex justify-between items-end mb-8">
                                    <div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Margen de Ganancia</span>
                                        <p className="text-xs text-slate-500">Define cuánto quieres ganar</p>
                                    </div>

                                    {editingField === 'margin' ? (
                                        <div className="flex items-center gap-1">
                                            <input
                                                autoFocus
                                                type="number"
                                                value={marginInput}
                                                onChange={(e) => setMarginInput(e.target.value)}
                                                onBlur={handleMarginSubmit}
                                                onKeyDown={(e) => e.key === 'Enter' && handleMarginSubmit()}
                                                className="text-5xl font-black bg-transparent border-b-4 border-green-500 outline-none w-24 text-right text-slate-900 dark:text-white"
                                            />
                                            <span className="text-4xl font-black text-slate-300">%</span>
                                        </div>
                                    ) : (
                                        <button onClick={handleMarginEdit} className="text-right group/margin">
                                            <span className={`text-4xl md:text-5xl font-black transition-all ${project.profitMargin >= 30 ? 'text-green-500' : 'text-slate-900 dark:text-white'}`}>
                                                {project.profitMargin}%
                                            </span>
                                            <span className="material-symbols-outlined text-slate-300 group-hover/margin:text-green-500 ml-1 text-lg transition-colors">edit</span>
                                        </button>
                                    )}
                                </div>

                                {/* Custom Slider with Styled Thumb */}
                                <div className="relative">
                                    {/* Visual Track (behind the input) */}
                                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden pointer-events-none">
                                        <div
                                            className={`h-full rounded-full transition-all duration-300 ease-out ${project.profitMargin >= 40 ? 'bg-gradient-to-r from-green-400 to-emerald-500' : project.profitMargin >= 20 ? 'bg-gradient-to-r from-blue-400 to-violet-500' : 'bg-gradient-to-r from-slate-300 to-slate-400'}`}
                                            style={{ width: `${(project.profitMargin / 95) * 100}%` }}
                                        ></div>
                                    </div>

                                    {/* Native Range Input with Styled Thumb */}
                                    <input
                                        type="range"
                                        min="0" max="95" step="1"
                                        value={project.profitMargin}
                                        onChange={(e) => { updateProfitMargin(Number(e.target.value)); setFixedSalePrice(null); }}
                                        className={`relative w-full h-8 bg-transparent appearance-none cursor-pointer z-10
                                            [&::-webkit-slider-thumb]:appearance-none
                                            [&::-webkit-slider-thumb]:w-8
                                            [&::-webkit-slider-thumb]:h-8
                                            [&::-webkit-slider-thumb]:rounded-full
                                            [&::-webkit-slider-thumb]:bg-white
                                            [&::-webkit-slider-thumb]:shadow-xl
                                            [&::-webkit-slider-thumb]:border-4
                                            [&::-webkit-slider-thumb]:cursor-grab
                                            [&::-webkit-slider-thumb]:active:cursor-grabbing
                                            [&::-webkit-slider-thumb]:active:scale-110
                                            [&::-webkit-slider-thumb]:transition-all
                                            [&::-webkit-slider-thumb]:duration-150
                                            ${project.profitMargin >= 40
                                                ? '[&::-webkit-slider-thumb]:border-green-500 [&::-webkit-slider-thumb]:shadow-green-200'
                                                : project.profitMargin >= 20
                                                    ? '[&::-webkit-slider-thumb]:border-violet-500 [&::-webkit-slider-thumb]:shadow-violet-200'
                                                    : '[&::-webkit-slider-thumb]:border-slate-400 [&::-webkit-slider-thumb]:shadow-slate-200'
                                            }
                                            [&::-moz-range-thumb]:w-8
                                            [&::-moz-range-thumb]:h-8
                                            [&::-moz-range-thumb]:rounded-full
                                            [&::-moz-range-thumb]:bg-white
                                            [&::-moz-range-thumb]:border-4
                                            [&::-moz-range-thumb]:cursor-grab
                                            ${project.profitMargin >= 40
                                                ? '[&::-moz-range-thumb]:border-green-500'
                                                : project.profitMargin >= 20
                                                    ? '[&::-moz-range-thumb]:border-violet-500'
                                                    : '[&::-moz-range-thumb]:border-slate-400'
                                            }
                                        `}
                                    />
                                </div>

                                <div className="flex justify-between mt-3 text-[10px] font-bold text-slate-400">
                                    <span>0%</span>
                                    <span>25%</span>
                                    <span>50%</span>
                                    <span>75%</span>
                                    <span>95%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Net Profit & Actions */}
                    <div className="lg:col-span-5 flex flex-col gap-5">

                        {/* NET PROFIT - Crown Jewel */}
                        <div className={`relative rounded-3xl p-8 overflow-hidden transition-all duration-700 ${getGlowIntensity()}`}>
                            {/* Glassmorphism Background */}
                            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"></div>
                            <div className="absolute inset-0 backdrop-blur-xl bg-black/20"></div>
                            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-green-500/30 rounded-full blur-3xl animate-pulse"></div>
                            <div className="absolute -left-10 -top-10 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl"></div>

                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="size-10 rounded-xl bg-green-500/20 backdrop-blur-sm text-green-400 flex items-center justify-center">
                                        <span className="material-symbols-outlined">trending_up</span>
                                    </div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tu Ganancia NETA</span>
                                </div>

                                <p className={`text-4xl md:text-6xl font-black bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent tracking-tight transition-all duration-500 ${isAnimated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                                    {formatCurrency(profitAmount)}
                                </p>

                                {/* Margin Progress Bar */}
                                <div className="mt-6">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] font-bold text-slate-500">Salud del Margen</span>
                                        <span className={`text-[10px] font-black ${profitHealth >= 80 ? 'text-green-400' : profitHealth >= 50 ? 'text-yellow-400' : 'text-slate-500'}`}>
                                            {profitHealth >= 80 ? '¡Excelente!' : profitHealth >= 50 ? 'Bueno' : 'Bajo'}
                                        </span>
                                    </div>
                                    <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-1000 ease-out ${profitHealth >= 80 ? 'bg-gradient-to-r from-green-500 to-emerald-400' : profitHealth >= 50 ? 'bg-gradient-to-r from-yellow-500 to-amber-400' : 'bg-slate-500'}`}
                                            style={{ width: isAnimated ? `${profitHealth}%` : '0%' }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Summary Card */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100/80 dark:border-slate-700/50 shadow-sm">
                            <div className="space-y-3">
                                <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-700/50">
                                    <span className="text-xs font-bold text-slate-400">Costo Total</span>
                                    <span className="text-sm font-black text-slate-700 dark:text-slate-300">{formatCurrency(costWithFactorQ)}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-700/50">
                                    <span className="text-xs font-bold text-slate-400">Precio de Venta</span>
                                    <span className="text-sm font-black text-slate-700 dark:text-slate-300">{formatCurrency(salePrice)}</span>
                                </div>
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-xs font-bold text-green-500">Ganancia</span>
                                    <span className="text-sm font-black text-green-500">+ {formatCurrency(profitAmount)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={handleSaveAndFinish}
                                disabled={isSaving}
                                className="w-full py-5 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-700 hover:via-purple-700 hover:to-indigo-700 text-white font-black rounded-2xl shadow-lg shadow-violet-500/30 transition-all active:scale-[0.98] flex items-center justify-center gap-3 relative overflow-hidden group"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 opacity-0 group-hover:opacity-20 transition-opacity"></div>
                                <span className="material-symbols-outlined text-xl">save</span>
                                GUARDAR EN INVENTARIO
                            </button>

                            <button
                                className="w-full py-4 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-600 text-slate-700 dark:text-slate-300 font-bold rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-lg">download</span>
                                Exportar Cotización
                            </button>
                        </div>
                    </div>

                </section>

            </main>
        </div>
    );
};

export default ResultsPage;