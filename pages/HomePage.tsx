import React from 'react';
import { useNavigate } from 'react-router-dom';
import HeaderSimple from '../components/HeaderSimple';
import AuthModal from '../components/AuthModal';
import { useApp } from '../context/AppContext';
import { useState } from 'react';

const HomePage: React.FC = () => {
    const navigate = useNavigate();

    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const { user, signOut } = useApp();

    const handleAction = (path: string) => {
        if (!user) {
            setIsAuthModalOpen(true);
        } else {
            navigate(path);
        }
    };

    return (
        <div className="bg-gradient-to-br from-white to-indigo-50 dark:from-background-dark dark:to-neutral-dark min-h-screen text-neutral-dark dark:text-white font-display overflow-hidden flex flex-col">
            <HeaderSimple />

            <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

            <main className="flex-1 flex flex-col items-center justify-center relative w-full px-4 overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-secondary/5 rounded-full blur-3xl -z-10"></div>

                <div className="max-w-4xl w-full flex flex-col items-center text-center gap-4 md:gap-10 animate-fade-in-up">
                    <div className="flex flex-col gap-1">
                        <h2 className="text-3xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-secondary to-primary tracking-tighter drop-shadow-sm">
                            ¿Qué vamos a crear hoy?
                        </h2>
                        <p className="text-sm md:text-2xl text-neutral-gray dark:text-slate-300 font-bold max-w-xl mx-auto px-4 leading-tight opacity-90">
                            Ingeniería financiera simple para tus desayunos sorpresa.
                        </p>
                    </div>

                    <div className="flex flex-col items-center gap-6 md:gap-12 mt-2">
                        {/* Botón Principal - Ultra Optimizada Proporción */}
                        <div className="relative group cursor-pointer scale-100 hover:scale-105 transition-transform duration-500 ease-out" onClick={() => handleAction('/costing-engine')}>

                            {/* Glow Effects - Tighter */}
                            <div className="absolute -inset-3 rounded-full bg-gradient-to-tr from-secondary/40 to-primary/40 opacity-30 blur-lg animate-pulse group-hover:opacity-50 transition-opacity duration-500"></div>
                            <div className="absolute -inset-[4px] md:-inset-[6px] rounded-full bg-[conic-gradient(from_0deg,transparent_0_180deg,#a855f7_360deg)] opacity-70 blur-md animate-[spin_4s_linear_infinite] transition-opacity duration-500 group-hover:opacity-100"></div>

                            {/* Botón Físico - Smaller on Mobile */}
                            <button
                                className="relative z-10 flex flex-col items-center justify-center w-40 h-40 md:w-72 md:h-72 rounded-full bg-gradient-to-br from-secondary to-[#502bb5] text-white border-[3px] md:border-[5px] border-white/10 group-hover:border-white/40 active:scale-95 transition-all duration-300 shadow-xl shadow-indigo-500/30">
                                <div className="absolute inset-0 rounded-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                                <span className="material-symbols-outlined text-[50px] md:text-[90px] mb-0.5 group-hover:rotate-12 transition-transform duration-300 drop-shadow-md">add_circle</span>
                                <span className="text-base md:text-3xl font-black tracking-wide uppercase drop-shadow-sm leading-none">COSTEAR</span>
                                <span className="text-xs md:text-lg font-bold tracking-wide uppercase drop-shadow-sm text-indigo-200 leading-none mt-0.5">PRODUCTO</span>
                            </button>
                        </div>

                        <button
                            onClick={() => handleAction('/inventory')}
                            className="flex items-center gap-2 px-5 py-2.5 md:px-8 md:py-4 rounded-full bg-white/60 dark:bg-white/5 border border-secondary/20 text-secondary dark:text-indigo-300 font-bold tracking-wide hover:bg-secondary hover:text-white hover:border-secondary hover:shadow-lg transition-all duration-300 backdrop-blur-md group text-xs md:text-base">
                            <span className="material-symbols-outlined text-[16px] md:text-[20px] group-hover:animate-pulse">inventory_2</span>
                            VER MI INVENTARIO
                        </button>
                    </div>
                </div>
            </main>
            <footer className="w-full py-3 md:py-4 text-center text-xs md:text-sm text-neutral-gray/60 dark:text-slate-500 bg-white/30 dark:bg-black/10 backdrop-blur-sm">
                <p>Moneda: <span className="font-bold text-secondary">COP $</span> • Medidas: <span className="font-bold">Gramos / Mililitros</span></p>
            </footer>
        </div>
    );
};

export default HomePage;