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

            <main className="flex-1 flex flex-col items-center justify-start pt-12 md:pt-24 relative w-full px-4">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-secondary/5 rounded-full blur-3xl -z-10"></div>
                <div className="absolute top-1/4 right-1/4 w-[300px] h-[300px] bg-primary/10 rounded-full blur-3xl -z-10"></div>
                <div className="max-w-4xl w-full flex flex-col items-center text-center gap-8 md:gap-12 animate-fade-in-up">
                    <div className="flex flex-col gap-2">
                        <h2 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-secondary to-primary tracking-tighter">
                            ¿Qué vamos a crear hoy?
                        </h2>
                        <p className="text-xl md:text-2xl text-neutral-gray dark:text-slate-300 font-bold max-w-2xl mx-auto mt-2">
                            Ingeniería financiera simple para tus desayunos sorpresa.
                        </p>
                    </div>

                    <div className="flex flex-col items-center gap-10">
                        {/* Botón Principal con Efecto Manecillas/Radar Fluido Intensificado */}
                        <div className="relative group cursor-pointer scale-100 hover:scale-105 transition-transform duration-500 ease-out" onClick={() => handleAction('/costing-engine')}>

                            {/* Base de resplandor pulsante (Fondo general) */}
                            <div className="absolute -inset-4 rounded-full bg-gradient-to-tr from-secondary/40 to-primary/40 opacity-40 blur-2xl animate-pulse group-hover:opacity-60 transition-opacity duration-500"></div>

                            {/* Anillo 1: Haz de luz principal (Más intenso y definido - Violeta) */}
                            <div className="absolute -inset-[8px] rounded-full bg-[conic-gradient(from_0deg,transparent_0_180deg,#a855f7_360deg)] opacity-80 blur-lg animate-[spin_3s_linear_infinite] transition-opacity duration-500 group-hover:opacity-100"></div>

                            {/* Anillo 2: Contraste (Azul, rotación inversa, ligeramente desfasado) */}
                            <div className="absolute -inset-[8px] rounded-full bg-[conic-gradient(from_180deg,transparent_0_180deg,#3b82f6_360deg)] opacity-70 blur-lg animate-[spin_4s_linear_infinite_reverse] transition-opacity duration-500 group-hover:opacity-100"></div>

                            {/* Botón Físico */}
                            <button
                                className="relative z-10 flex flex-col items-center justify-center w-64 h-64 md:w-80 md:h-80 rounded-full bg-gradient-to-br from-secondary to-[#502bb5] text-white btn-glow border-[6px] border-white/10 group-hover:border-white/40 active:scale-95 transition-all duration-300 shadow-2xl shadow-indigo-500/50">
                                <div className="absolute inset-0 rounded-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                                <span className="material-symbols-outlined text-[80px] md:text-[100px] mb-2 group-hover:rotate-12 transition-transform duration-300 drop-shadow-lg">add_circle</span>
                                <span className="text-2xl md:text-3xl font-black tracking-wide uppercase drop-shadow-md">COSTEAR</span>
                                <span className="text-lg md:text-xl font-bold tracking-wide uppercase drop-shadow-md text-indigo-200">PRODUCTO</span>
                            </button>
                        </div>

                        <button
                            onClick={() => handleAction('/inventory')}
                            className="flex items-center gap-2 px-8 py-4 rounded-full bg-white/60 dark:bg-white/5 border border-secondary/20 text-secondary dark:text-indigo-300 font-bold tracking-wide hover:bg-secondary hover:text-white hover:border-secondary hover:shadow-lg transition-all duration-300 backdrop-blur-md group text-sm md:text-base">
                            <span className="material-symbols-outlined text-[20px] group-hover:animate-pulse">inventory_2</span>
                            VER MI INVENTARIO
                        </button>
                    </div>
                </div>
            </main>
            <footer className="w-full py-4 text-center text-sm text-neutral-gray/60 dark:text-slate-500 absolute bottom-0">
                <p>Moneda: <span className="font-bold text-secondary">COP $</span> • Medidas: <span className="font-bold">Gramos / Mililitros</span></p>
            </footer>
        </div>
    );
};

export default HomePage;