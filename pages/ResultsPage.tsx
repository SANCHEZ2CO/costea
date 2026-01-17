import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useNavigate } from 'react-router-dom';
import HeaderSimple from '../components/HeaderSimple';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../constants';
import { InventoryItem, ItemType } from '../types';
import LiquidLoader from '../components/LiquidLoader';
import LiquidModal from '../components/LiquidModal';

const ResultsPage: React.FC = () => {
    const navigate = useNavigate();
    const { project, updateProfitMargin, saveToInventory, resetProject, settings } = useApp();

    const [roundingOption, setRoundingOption] = useState<number>(0);
    const [isSaving, setIsSaving] = useState(false);
    const { user } = useApp();

    // Modal State
    const [modal, setModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'success' | 'error' | 'warning' | 'info';
        onConfirm?: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info'
    });

    const closeModal = () => {
        setModal(prev => ({ ...prev, isOpen: false }));
        if (modal.onConfirm) {
            modal.onConfirm();
        }
    };

    const showModal = (
        title: string,
        message: string,
        type: 'success' | 'error' | 'warning' | 'info' = 'info',
        onConfirm?: () => void
    ) => {
        setModal({ isOpen: true, title, message, type, onConfirm });
    };

    // Factor Q Calculation using Global Settings
    const factorQVal = settings?.factorQPercentage || 5;
    const factorQMultiplier = 1 + (factorQVal / 100);

    const totalMaterialsCost = project.items.reduce((acc, item) => acc + item.cost, 0);
    const materialsWithFactorQ = project.factorQ ? totalMaterialsCost * factorQMultiplier : totalMaterialsCost;

    // Total Real (Materiales + Colchón + Mano de Obra)
    // We keep 'costWithFactorQ' name to minimize changes in DB insert and UI below, though it now represents "Total Base Cost"
    const costWithFactorQ = materialsWithFactorQ + (project.laborCost || 0);

    // NEW LOGIC: Sale Price = Cost / (1 - Margin%)
    const marginDecimal = project.profitMargin / 100;
    // Cap margin at 99% to avoid division by zero or infinite
    const effectiveMargin = Math.min(marginDecimal, 0.99);

    const rawSalePrice = costWithFactorQ / (1 - effectiveMargin);

    // Apply Rounding
    let salePrice = rawSalePrice;
    if (roundingOption > 0) {
        salePrice = Math.ceil(rawSalePrice / roundingOption) * roundingOption;
    }

    const profitAmount = salePrice - costWithFactorQ;
    // Calculate effective margin after rounding for display? Or keep target?
    // Let's keep using the calculated values derived from target margin + rounding.

    const handleSaveAndFinish = async () => {
        if (!project.name) {
            showModal("Nombre Requerido", "Por favor asigna un nombre a tu proyecto antes de guardar.", "warning");
            return;
        }
        if (!user) {
            showModal("Sesión Requerida", "Debes iniciar sesión para guardar tu proyecto.", "warning");
            return;
        }

        setIsSaving(true);

        try {
            // 1. Guardar el PLATO (Dish)
            const { data: dishData, error: dishError } = await supabase
                .from('dishes')
                .insert({
                    user_id: user.id,
                    name: project.name,
                    total_cost: costWithFactorQ,
                    sale_price: salePrice,
                    profit_margin: project.profitMargin // We save the target margin
                })
                .select()
                .single();

            if (dishError) throw dishError;

            const dishId = dishData.id;

            // 2. Preparar ingredientes para guardar
            const ingredientsToInsert = project.items.map(item => ({
                dish_id: dishId,
                name: item.name,
                cost_snapshot: item.cost,
                used_quantity: item.usedQty,
                used_unit: item.usedUnit || 'Und'
            }));

            // 3. Insertar ingredientes
            const { error: ingError } = await supabase
                .from('dish_ingredients')
                .insert(ingredientsToInsert);

            if (ingError) throw ingError;

            // 4. Éxito
            showModal(
                "¡Proyecto Guardado!",
                "Tu proyecto ha sido guardado exitosamente en el inventario.",
                "success",
                () => {
                    resetProject();
                    navigate('/inventory');
                }
            );

        } catch (error: any) {
            console.error('Error saving project:', error);
            showModal("Error al Guardar", error.message || "Ocurrió un error inesperado.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    // Helper for manual input
    const handleMarginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = parseFloat(e.target.value);
        if (isNaN(val)) val = 0;
        if (val > 99) val = 99; // Safety cap
        updateProfitMargin(val);
    };

    return (
        <div className="bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-200 font-display min-h-screen flex flex-col transition-colors duration-200">
            <HeaderSimple />

            {/* Custom Liquid Loader */}
            {isSaving && <LiquidLoader />}

            {/* Custom Liquid Modal */}
            <LiquidModal
                isOpen={modal.isOpen}
                title={modal.title}
                message={modal.message}
                type={modal.type}
                onClose={closeModal}
                onConfirm={closeModal}
                confirmText={modal.type === 'success' ? 'Finalizar' : 'Entendido'}
            />

            <main className="flex-1 w-full max-w-[1440px] mx-auto p-4 md:p-8 flex flex-col items-center">

                {/* BOTÓN REGRESAR PERSISTENTE */}
                <div className="w-full max-w-5xl mb-4">
                    <button
                        onClick={() => navigate('/costing-engine')}
                        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors font-bold text-xs md:text-sm group"
                    >
                        <div className="p-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm group-hover:border-secondary group-hover:text-secondary transition-all">
                            <span className="material-symbols-outlined text-[16px] md:text-[18px] block group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
                        </div>
                        <span>Volver a Insumos</span>
                    </button>
                </div>

                <section className="flex flex-col gap-4 md:gap-6 w-full max-w-5xl">

                    {/* RESUMEN DEL PROYECTO (CARD SUPERIOR) */}
                    <div className="w-full bg-surface-light dark:bg-surface-dark p-4 md:p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6">
                        <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto">
                            <div className="size-12 md:size-14 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20 shrink-0">
                                <span className="material-symbols-outlined text-2xl md:text-3xl">restaurant_menu</span>
                            </div>
                            <div>
                                <label className="text-[10px] md:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-0.5 md:mb-1">Resultado Final para</label>
                                <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-tight">{project.name || 'Nuevo Proyecto'}</h1>
                            </div>
                        </div>
                        <div className="flex items-center justify-around md:justify-start gap-4 md:gap-6 w-full md:w-auto bg-gray-50 dark:bg-gray-900/40 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                            <div className="text-center md:text-left">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5 md:mb-1">Costo Base {project.factorQ && `(+${factorQVal}%)`}</p>
                                <p className="text-lg md:text-xl font-bold text-slate-700 dark:text-slate-300 leading-none">{formatCurrency(costWithFactorQ)}</p>
                            </div>
                            <div className="h-8 w-px bg-gray-200 dark:bg-gray-700"></div>
                            <div className="text-center md:text-left">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5 md:mb-1">Items</p>
                                <p className="text-lg md:text-xl font-bold text-slate-700 dark:text-slate-300 leading-none">{project.items.length}</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">

                        {/* COLUMNA IZQUIERDA: SLIDER DE GANANCIA */}
                        <div className="lg:col-span-7 flex flex-col gap-6">
                            <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 relative overflow-hidden h-full">
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-secondary"></div>

                                <div className="flex justify-between items-start mb-8">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="flex items-center justify-center size-6 rounded-full bg-secondary/10 text-secondary text-xs font-bold">1</span>
                                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Margen Deseado (%)</h2>
                                        </div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
                                            ¿Qué porcentaje del precio de venta será tu ganancia neta?
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <div className="relative group">
                                            <input
                                                type="number"
                                                className="w-32 text-right bg-white dark:bg-slate-800 border-2 border-secondary/20 rounded-2xl py-3 pr-10 pl-4 text-3xl font-black text-secondary outline-none focus:border-secondary focus:ring-4 focus:ring-secondary/10 transition-all shadow-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                value={project.profitMargin}
                                                onChange={handleMarginChange}
                                                min="0"
                                                max="99"
                                                placeholder="0"
                                            />
                                            <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                                                <span className="text-secondary/60 font-bold text-xl">%</span>
                                            </div>
                                        </div>
                                        <span className="text-[10px] text-gray-400 mt-2 uppercase font-bold tracking-wider opacity-80">Editar Manual</span>
                                    </div>
                                </div>

                                <div className="relative py-4 px-2 mb-8">
                                    <input
                                        className="w-full slider-filled-track"
                                        id="profit-slider"
                                        max="90"
                                        min="0"
                                        step="1"
                                        type="range"
                                        value={project.profitMargin}
                                        onChange={(e) => updateProfitMargin(Number(e.target.value))}
                                    />
                                    <div className="flex justify-between text-[10px] font-bold text-gray-400 mt-4 uppercase tracking-widest">
                                        <span>0%</span>
                                        <span>Margen Objetivo</span>
                                        <span>90%</span>
                                    </div>
                                </div>

                                {/* Opciones de Redondeo */}
                                <div className="border-t border-gray-100 dark:border-gray-800 pt-6">
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Redondear Precio Final</p>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            { label: 'Exacto', val: 0 },
                                            { label: 'A $100', val: 100 },
                                            { label: 'A $500', val: 500 },
                                            { label: 'A $1.000', val: 1000 }
                                        ].map((opt) => (
                                            <button
                                                key={opt.val}
                                                onClick={() => setRoundingOption(opt.val)}
                                                className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${roundingOption === opt.val
                                                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                                                    : 'bg-white dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                                    }`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* COLUMNA DERECHA: RESULTADOS */}
                        <div className="lg:col-span-5 flex flex-col gap-4">
                            {/* PRECIO SUGERIDO */}
                            <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 relative group hover:border-primary/50 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Precio de Venta Sugerido</p>
                                    <span className="material-symbols-outlined text-gray-300 group-hover:text-primary transition-colors">sell</span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <h3 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">{formatCurrency(salePrice)}</h3>
                                    <span className="text-sm font-bold text-gray-400">COP</span>
                                </div>
                                <p className="text-xs text-gray-400 mt-2">
                                    {roundingOption > 0 ? `Redondeado al próximo $${roundingOption}` : 'Precio matemático exacto'}
                                </p>
                            </div>

                            {/* GANANCIA REAL */}
                            <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-primary dark:to-secondary rounded-xl p-6 shadow-xl text-white relative overflow-hidden">
                                <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 mb-3 opacity-80">
                                        <span className="material-symbols-outlined text-lg">savings</span>
                                        <p className="text-xs font-bold uppercase tracking-widest">Tu Ganancia Neta</p>
                                    </div>
                                    <h3 className="text-4xl font-black tracking-tight mb-4">{formatCurrency(profitAmount)}</h3>
                                    <div className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 backdrop-blur-sm">
                                        <span className="material-symbols-outlined text-sm">trending_up</span>
                                        <span className="text-xs font-bold">
                                            {/* Calculate real margin based on rounding */}
                                            Margen Real: {salePrice > 0 ? ((profitAmount / salePrice) * 100).toFixed(1) : 0}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="mt-4">
                        <button
                            disabled={isSaving}
                            className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary-light hover:to-secondary-dark text-white rounded-xl py-4 shadow-xl shadow-primary/20 transition-all transform hover:-translate-y-0.5 font-bold text-lg flex items-center justify-center gap-3 uppercase tracking-wide disabled:opacity-70 disabled:cursor-not-allowed group relative overflow-hidden"
                            onClick={handleSaveAndFinish}
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 backdrop-blur-sm"></div>

                            <span className="material-symbols-outlined relative z-10">save</span>
                            <span className="relative z-10">GUARDAR Y FINALIZAR PROYECTO</span>
                        </button>
                    </div>

                </section>
            </main>
            <footer className="w-full py-4 text-center text-sm text-neutral-gray/60 dark:text-slate-500 mt-auto">
                <p>Moneda: <span className="font-bold text-secondary">COP $</span> • Medidas: <span className="font-bold">Gramos / Mililitros</span></p>
            </footer>
        </div>
    );
};

export default ResultsPage;