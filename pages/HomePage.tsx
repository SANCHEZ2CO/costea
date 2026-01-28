import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import HeaderSimple from '../components/HeaderSimple';
import AuthModal from '../components/AuthModal';
import { useApp } from '../context/AppContext';
import { ShootingStars } from '../App';

const HomePage: React.FC = () => {
    const navigate = useNavigate();
    const { user, theme } = useApp();
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

    const handleAction = (path: string) => {
        if (!user) {
            setIsAuthModalOpen(true);
        } else {
            navigate(path);
        }
    };


    return (
        <div className="min-h-screen font-display flex flex-col transition-all duration-500 overflow-hidden"
            style={{ backgroundColor: 'var(--theme-bg-primary)' }}>

            <HeaderSimple />
            <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

            {/* Background Elements (Galaxy) */}
            {theme === 'galaxy' && <ShootingStars />}

            <main className="flex-1 overflow-y-auto px-4 py-8 pb-24 md:px-8">
                <div className="max-w-6xl mx-auto animate-fade-in-up">

                    {/* Welcome Header */}
                    <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight mb-2">
                                Hola, {user?.email ? user.email.split('@')[0] : 'Emprendedor'} 👋
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">
                                Aquí está el pulso de tu negocio hoy.
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <span className="px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest border border-current text-blue-600 dark:text-blue-400 opacity-60">
                                {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </span>
                        </div>
                    </div>

                    {/* Quick Actions Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* POS CTA */}
                        <button
                            onClick={() => handleAction('/sales')}
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white p-6 rounded-3xl shadow-xl shadow-blue-500/20 group relative overflow-hidden transition-all hover:-translate-y-1"
                        >
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                            <div className="relative z-10 flex flex-col items-start h-full justify-between">
                                <div className="bg-white/20 p-3 rounded-2xl mb-4 backdrop-blur-sm group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-3xl">point_of_sale</span>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black mb-1">Nueva Venta</h3>
                                    <p className="text-blue-100 text-sm font-medium">Registrar pedido y facturar</p>
                                </div>
                            </div>
                        </button>

                        {/* Outflow CTA - Same Level */}
                        <button
                            onClick={() => handleAction('/outflow')}
                            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white p-6 rounded-3xl shadow-xl shadow-emerald-500/20 group relative overflow-hidden transition-all hover:-translate-y-1"
                        >
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                            <div className="relative z-10 flex flex-col items-start h-full justify-between">
                                <div className="bg-white/20 p-3 rounded-2xl mb-4 backdrop-blur-sm group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-3xl">payments</span>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black mb-1">Registrar Salida</h3>
                                    <p className="text-emerald-100 text-sm font-medium">Compras e inventario, Gastos</p>
                                </div>
                            </div>
                        </button>

                        {/* Inventory */}
                        <button
                            onClick={() => handleAction('/inventory')}
                            className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-white/5 hover:border-purple-500/50 hover:shadow-lg transition-all group flex flex-col justify-between h-40"
                        >
                            <div className="size-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 flex items-center justify-center">
                                <span className="material-symbols-outlined">inventory_2</span>
                            </div>
                            <div className="text-left">
                                <h4 className="font-bold text-slate-800 dark:text-white">Inventario</h4>
                                <p className="text-xs text-slate-400 mt-1">Ver Stock Actual</p>
                            </div>
                        </button>

                        {/* Costing */}
                        <button
                            onClick={() => handleAction('/costing-engine')}
                            className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-white/5 hover:border-pink-500/50 hover:shadow-lg transition-all group flex flex-col justify-between h-40"
                        >
                            <div className="size-10 rounded-xl bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-300 flex items-center justify-center">
                                <span className="material-symbols-outlined">calculate</span>
                            </div>
                            <div className="text-left">
                                <h4 className="font-bold text-slate-800 dark:text-white">Costear</h4>
                                <p className="text-xs text-slate-400 mt-1">Crear Receta</p>
                            </div>
                        </button>

                        {/* Terceros */}
                        <button
                            onClick={() => handleAction('/terceros')}
                            className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-white/5 hover:border-blue-500/50 hover:shadow-lg transition-all group flex flex-col justify-between h-40"
                        >
                            <div className="size-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 flex items-center justify-center">
                                <span className="material-symbols-outlined">group</span>
                            </div>
                            <div className="text-left">
                                <h4 className="font-bold text-slate-800 dark:text-white">Terceros</h4>
                                <p className="text-xs text-slate-400 mt-1">Clientes y Proveedores</p>
                            </div>
                        </button>
                    </div>

                </div>
            </main>
        </div>
    );
};

export default HomePage;