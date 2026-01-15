import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import HeaderSimple from '../components/HeaderSimple';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../constants';

const InventoryPage: React.FC = () => {
    const navigate = useNavigate();
    const { inventory, resetProject } = useApp();
    const [filterType, setFilterType] = useState<'PRODUCTO' | 'RECETA'>('PRODUCTO');

    const filteredItems = inventory.filter(item => item.type === filterType);

    const handleNewProject = () => {
        resetProject();
        navigate('/costing-engine');
    };

    return (
        <div className="bg-gradient-to-br from-indigo-50 to-white dark:from-background-dark dark:to-neutral-dark min-h-screen text-neutral-dark dark:text-white font-display flex flex-col">
            <HeaderSimple />
            <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-8">
                
                {/* BOTÓN REGRESAR PERSISTENTE */}
                <div className="w-full mb-6">
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
                        <p className="text-neutral-gray dark:text-gray-400 mt-1">Gestiona tus productos terminados y recetas base.</p>
                    </div>
                    <button onClick={handleNewProject} className="bg-secondary hover:bg-deep-purple text-white px-6 py-3 rounded-xl shadow-lg shadow-secondary/20 flex items-center gap-2 transition-all active:scale-95 font-medium">
                        <span className="material-symbols-outlined">add</span>
                        Nuevo Producto
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 border-b border-gray-200 dark:border-gray-800 mb-8">
                    <button 
                        onClick={() => setFilterType('PRODUCTO')}
                        className={`pb-3 px-1 text-sm font-bold tracking-wide transition-colors relative ${filterType === 'PRODUCTO' ? 'text-secondary dark:text-white' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        MENÚS Y PRODUCTOS
                        {filterType === 'PRODUCTO' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-secondary"></span>}
                    </button>
                    <button 
                        onClick={() => setFilterType('RECETA')}
                        className={`pb-3 px-1 text-sm font-bold tracking-wide transition-colors relative ${filterType === 'RECETA' ? 'text-secondary dark:text-white' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        RECETAS BASE
                        {filterType === 'RECETA' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-secondary"></span>}
                    </button>
                </div>

                {/* Grid */}
                {filteredItems.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in-up">
                         {filteredItems.map((item) => (
                            <div key={item.id} className="group bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                                <div className={`h-40 relative overflow-hidden flex items-center justify-center ${item.type === 'RECETA' ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-blue-50 dark:bg-blue-900/20'}`}>
                                    <div className={`absolute top-3 right-3 backdrop-blur-sm px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1 ${
                                        item.type === 'RECETA' 
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
                )}

            </main>
            <footer className="w-full py-4 text-center text-sm text-neutral-gray/60 dark:text-slate-500 mt-auto">
                <p>Moneda: <span className="font-bold text-secondary">COP $</span> • Medidas: <span className="font-bold">Gramos / Mililitros</span></p>
            </footer>
        </div>
    );
};

export default InventoryPage;