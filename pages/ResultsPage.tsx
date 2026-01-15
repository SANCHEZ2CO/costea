import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useNavigate } from 'react-router-dom';
import HeaderSimple from '../components/HeaderSimple';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../constants';
import { InventoryItem, ItemType } from '../types';

const ResultsPage: React.FC = () => {
    const navigate = useNavigate();
    const { project, updateProfitMargin, saveToInventory, resetProject } = useApp();

    const totalCost = project.items.reduce((acc, item) => acc + item.cost, 0);
    const costWithFactorQ = project.factorQ ? totalCost * 1.05 : totalCost;

    // Formula: Price = Cost + (Cost * Margin%)
    const profitAmount = costWithFactorQ * (project.profitMargin / 100);
    const salePrice = costWithFactorQ + profitAmount;

    const [isSaving, setIsSaving] = useState(false);
    const { user } = useApp(); // Need user for RLS

    const handleSaveAndFinish = async () => {
        if (!project.name) {
            alert("Por favor asigna un nombre a tu proyecto antes de guardar.");
            return;
        }
        if (!user) {
            alert("Debes iniciar sesión para guardar.");
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
                    profit_margin: project.profitMargin
                })
                .select()
                .single();

            if (dishError) throw dishError;

            const dishId = dishData.id;

            // 2. Preparar ingredientes para guardar
            // Mapeamos los items del proyecto a la estructura de dish_ingredients
            const ingredientsToInsert = project.items.map(item => ({
                dish_id: dishId,
                name: item.name,
                cost_snapshot: item.cost, // Costo calculado para este plato
                used_quantity: item.usedQty,
                used_unit: item.usedUnit || 'Und' // Fallback
            }));

            // 3. Insertar ingredientes
            const { error: ingError } = await supabase
                .from('dish_ingredients')
                .insert(ingredientsToInsert);

            if (ingError) throw ingError;

            // 4. Éxito
            alert("¡Proyecto guardado exitosamente!");
            resetProject();
            navigate('/inventory');

        } catch (error: any) {
            console.error('Error saving project:', error);
            alert("Error al guardar: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-200 font-display min-h-screen flex flex-col transition-colors duration-200">
            <HeaderSimple />

            <main className="flex-1 w-full max-w-[1440px] mx-auto p-4 md:p-8 flex flex-col items-center">

                {/* BOTÓN REGRESAR PERSISTENTE */}
                <div className="w-full max-w-5xl mb-4">
                    <button
                        onClick={() => navigate('/costing-engine')}
                        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors font-bold text-sm group"
                    >
                        <div className="p-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm group-hover:border-secondary group-hover:text-secondary transition-all">
                            <span className="material-symbols-outlined text-[18px] block group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
                        </div>
                        <span>Volver a Insumos</span>
                    </button>
                </div>

                <section className="flex flex-col gap-6 w-full max-w-5xl">

                    {/* RESUMEN DEL PROYECTO (CARD SUPERIOR) */}
                    <div className="w-full bg-surface-light dark:bg-surface-dark p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <div className="size-14 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20 shrink-0">
                                <span className="material-symbols-outlined text-3xl">restaurant_menu</span>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">Resultado Final para</label>
                                <h1 className="text-2xl font-black text-slate-900 dark:text-white leading-none">{project.name || 'Nuevo Proyecto'}</h1>
                            </div>
                        </div>
                        <div className="flex items-center gap-6 w-full md:w-auto bg-gray-50 dark:bg-gray-900/40 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Costo Base {project.factorQ && '(+5% Factor Q)'}</p>
                                <p className="text-xl font-bold text-slate-700 dark:text-slate-300">{formatCurrency(costWithFactorQ)}</p>
                            </div>
                            <div className="h-8 w-px bg-gray-200 dark:bg-gray-700"></div>
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Items</p>
                                <p className="text-xl font-bold text-slate-700 dark:text-slate-300">{project.items.length}</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                        {/* COLUMNA IZQUIERDA: SLIDER DE GANANCIA */}
                        <div className="lg:col-span-7 flex flex-col gap-6">
                            <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 relative overflow-hidden h-full">
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-secondary"></div>

                                <div className="flex justify-between items-end mb-8">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="flex items-center justify-center size-6 rounded-full bg-secondary/10 text-secondary text-xs font-bold">3</span>
                                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Define tu Ganancia</h2>
                                        </div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
                                            Desliza para ajustar el margen de ganancia deseado sobre el costo total.
                                        </p>
                                    </div>
                                    <div className="bg-secondary/10 text-secondary px-4 py-2 rounded-xl border border-secondary/20">
                                        <span className="text-3xl font-black tracking-tighter">{project.profitMargin}%</span>
                                    </div>
                                </div>

                                <div className="relative py-4 px-2 mb-8">
                                    <input
                                        className="w-full slider-filled-track"
                                        id="profit-slider"
                                        max="200"
                                        min="0"
                                        type="range"
                                        value={project.profitMargin}
                                        onChange={(e) => updateProfitMargin(Number(e.target.value))}
                                    />
                                    <div className="flex justify-between text-[10px] font-bold text-gray-400 mt-4 uppercase tracking-widest">
                                        <span>0% (Costo)</span>
                                        <span>Rentabilidad</span>
                                        <span>200%</span>
                                    </div>
                                </div>

                                <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg p-4 border border-blue-100 dark:border-blue-800/30 flex gap-3 items-start">
                                    <span className="material-symbols-outlined text-blue-500 mt-0.5">tips_and_updates</span>
                                    <div>
                                        <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">Tip de Experto</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                            La industria gastronómica suele manejar márgenes entre el <strong>30% y 40%</strong>. Si tu producto es exclusivo o artesanal, puedes aspirar a un <strong>50% o más</strong>.
                                        </p>
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
                                <p className="text-xs text-gray-400 mt-2">Precio final recomendado al cliente.</p>
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
                                        <span className="text-xs font-bold">Rentabilidad del {project.profitMargin}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="mt-4">
                        <button
                            disabled={isSaving}
                            className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary-light hover:to-secondary-dark text-white rounded-xl py-4 shadow-xl shadow-primary/20 transition-all transform hover:-translate-y-0.5 font-bold text-lg flex items-center justify-center gap-3 uppercase tracking-wide disabled:opacity-70 disabled:cursor-not-allowed"
                            onClick={handleSaveAndFinish}
                        >
                            {isSaving ? (
                                <span className="material-symbols-outlined animate-spin">refresh</span>
                            ) : (
                                <span className="material-symbols-outlined">save</span>
                            )}
                            {isSaving ? 'GUARDANDO...' : 'GUARDAR Y FINALIZAR PROYECTO'}
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