import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import HeaderSimple from '../components/HeaderSimple';
import AuthModal from '../components/AuthModal';
import { useApp } from '../context/AppContext';
import { ShootingStars } from '../App';

const HomePage: React.FC = () => {
    const navigate = useNavigate();

    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const { user, theme } = useApp();

    const handleAction = (path: string) => {
        if (!user) {
            setIsAuthModalOpen(true);
        } else {
            navigate(path);
        }
    };

    // Get theme-specific gradient colors
    const getThemeGradient = () => {
        switch (theme) {
            case 'feminine':
                return {
                    text: 'from-pink-500 to-rose-500',
                    button: 'from-pink-500 to-rose-600',
                    shadow: 'shadow-pink-500/40',
                    glow: 'from-pink-600/30 to-rose-600/30',
                    secondary: 'text-pink-200'
                };
            case 'galaxy':
                return {
                    text: 'from-purple-400 to-violet-400',
                    button: 'from-purple-500 to-violet-600',
                    shadow: 'shadow-purple-500/40',
                    glow: 'from-purple-600/30 to-violet-600/30',
                    secondary: 'text-violet-200'
                };
            case 'dark':
                return {
                    text: 'from-violet-400 to-indigo-400',
                    button: 'from-violet-500 to-indigo-600',
                    shadow: 'shadow-violet-500/40',
                    glow: 'from-violet-600/30 to-indigo-600/30',
                    secondary: 'text-indigo-200'
                };
            default:
                return {
                    text: 'from-violet-600 to-indigo-600',
                    button: 'from-violet-600 to-indigo-700',
                    shadow: 'shadow-indigo-500/40',
                    glow: 'from-violet-600/30 to-indigo-600/30',
                    secondary: 'text-indigo-200'
                };
        }
    };

    const themeGradient = getThemeGradient();

    return (
        <div className="min-h-screen font-display flex flex-col transition-all duration-500 overflow-hidden" style={{ backgroundColor: 'var(--theme-bg-primary)' }}>
            <HeaderSimple />

            <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

            {/* Shooting Stars - Only visible on Galaxy theme */}
            <ShootingStars />

            <main className="flex-1 flex flex-col items-center justify-center relative w-full px-4 overflow-hidden">
                {/* Background Blobs */}
                <div
                    className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-3xl -z-10 pointer-events-none transition-all duration-500 ${theme === 'feminine' ? 'bg-pink-500/10' :
                            theme === 'galaxy' ? 'bg-purple-500/10' :
                                'bg-violet-500/5'
                        }`}
                />

                <div className="max-w-4xl w-full flex flex-col items-center text-center gap-4 md:gap-10 animate-fade-in-up">

                    {/* Main Text */}
                    <div className="flex flex-col gap-2">
                        <h2 className={`text-4xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r ${themeGradient.text} tracking-tighter drop-shadow-sm leading-tight`} style={{ fontWeight: theme === 'feminine' ? 600 : 900 }}>
                            ¿Qué vamos a crear hoy?
                        </h2>
                        <p className="text-base md:text-2xl font-bold max-w-xl mx-auto px-4 leading-tight" style={{ color: 'var(--theme-text-secondary)' }}>
                            Ingeniería financiera simple para tus desayunos sorpresa.
                        </p>
                    </div>

                    <div className="flex flex-col items-center gap-8 md:gap-12 mt-4">

                        {/* Big Circle Button */}
                        <div className="relative group cursor-pointer scale-100 hover:scale-105 transition-transform duration-500 ease-out" onClick={() => handleAction('/costing-engine')}>

                            {/* Glow Effects */}
                            <div className={`absolute -inset-4 rounded-full bg-gradient-to-tr ${themeGradient.glow} opacity-40 blur-xl animate-pulse group-hover:opacity-60 transition-opacity duration-500`}></div>
                            <div
                                className={`absolute -inset-[3px] rounded-full opacity-60 blur-md animate-[spin_4s_linear_infinite] transition-opacity duration-500 group-hover:opacity-100`}
                                style={{
                                    background: theme === 'feminine'
                                        ? 'conic-gradient(from 0deg, transparent 0 180deg, #ec4899 360deg)'
                                        : theme === 'galaxy'
                                            ? 'conic-gradient(from 0deg, transparent 0 180deg, #a855f7 360deg)'
                                            : 'conic-gradient(from 0deg, transparent 0 180deg, #8b5cf6 360deg)'
                                }}
                            ></div>

                            {/* Physical Button */}
                            <button
                                className={`relative z-10 flex flex-col items-center justify-center w-48 h-48 md:w-72 md:h-72 rounded-full bg-gradient-to-br ${themeGradient.button} text-white border-[4px] border-white/10 group-hover:border-white/30 active:scale-95 transition-all duration-300 shadow-2xl ${themeGradient.shadow}`}
                            >
                                <span className="material-symbols-outlined text-[60px] md:text-[90px] mb-1 group-hover:rotate-12 transition-transform duration-300 drop-shadow-md" style={{ filter: theme === 'galaxy' ? 'drop-shadow(0 0 10px rgba(255,255,255,0.5))' : 'none' }}>add_circle</span>
                                <span className="text-lg md:text-3xl font-black tracking-wide uppercase drop-shadow-sm leading-none">COSTEAR</span>
                                <span className={`text-sm md:text-lg font-bold tracking-wide uppercase drop-shadow-sm ${themeGradient.secondary} leading-none mt-1`}>PRODUCTO</span>
                            </button>
                        </div>

                        {/* Secondary Button */}
                        <button
                            onClick={() => handleAction('/inventory')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-full border font-bold tracking-wide transition-all duration-300 shadow-sm group hover:shadow-md ${theme === 'galaxy'
                                    ? 'glass-card bg-white/5 border-purple-500/30 text-purple-200 hover:bg-purple-500/10 hover:text-white hover:border-purple-400'
                                    : theme === 'feminine'
                                        ? 'bg-white border-pink-200 text-pink-600 hover:bg-pink-50 hover:border-pink-300'
                                        : theme === 'dark'
                                            ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
                                            : 'bg-white border-slate-200 text-slate-600 hover:bg-violet-50 hover:text-violet-600 hover:border-violet-200'
                                }`}
                        >
                            <span className={`material-symbols-outlined text-[20px] transition-colors ${theme === 'galaxy' ? 'group-hover:text-purple-300' :
                                    theme === 'feminine' ? 'group-hover:text-pink-500' :
                                        'group-hover:text-violet-500'
                                }`}>inventory_2</span>
                            VER MI INVENTARIO
                        </button>
                    </div>
                </div>
            </main>

            <footer className="w-full py-4 text-center text-xs md:text-sm" style={{ color: 'var(--theme-text-secondary)' }}>
                <p>Moneda: <span className={`font-bold ${theme === 'feminine' ? 'text-pink-500' : 'text-violet-600'}`}>COP $</span> • Medidas: <span className="font-bold">Gramos / Mililitros</span></p>
            </footer>
        </div>
    );
};

export default HomePage;