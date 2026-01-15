import React from 'react';
import { useNavigate } from 'react-router-dom';
import HeaderSimple from '../components/HeaderSimple';

const SettingsPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="bg-gradient-to-br from-white to-indigo-50 dark:from-background-dark dark:to-neutral-dark min-h-screen text-neutral-dark dark:text-white font-display overflow-hidden flex flex-col">
            <HeaderSimple showProfile={false} />
            <main className="flex-1 flex flex-col items-center justify-start relative w-full px-4 overflow-y-auto py-8">
                <div className="absolute top-1/4 left-0 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-secondary/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>
                <div className="absolute bottom-0 right-0 translate-x-1/3 translate-y-1/3 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>
                <div className="max-w-5xl w-full flex flex-col gap-6 animate-fade-in-up pb-12">
                    <div className="flex items-center gap-4 mb-2">
                        <button onClick={() => navigate(-1)} className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-neutral-dark dark:text-white">
                            <span className="material-symbols-outlined">arrow_back</span>
                        </button>
                        <div>
                            <h2 className="text-2xl md:text-3xl font-bold text-neutral-dark dark:text-white">Ajustes y Configuración</h2>
                            <p className="text-neutral-gray text-sm md:text-base">Personaliza tu experiencia en COSTEA</p>
                        </div>
                    </div>
                    {/* Simplified Settings Content for MVP */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-white/70 dark:bg-white/5 backdrop-blur-md rounded-2xl border border-white/40 dark:border-white/10 shadow-soft p-6 md:p-8">
                                <div className="flex items-center gap-3 mb-6">
                                    <span className="material-symbols-outlined text-secondary">storefront</span>
                                    <h3 className="text-lg font-bold text-neutral-dark dark:text-white">Perfil de Negocio</h3>
                                </div>
                                <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                                    <div className="relative group cursor-pointer">
                                        <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-white/5 border-2 border-dashed border-gray-300 dark:border-white/20 flex items-center justify-center overflow-hidden hover:border-secondary transition-colors">
                                            <img alt="Logo actual" className="h-16 w-16 object-contain opacity-80" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAWAsy8wcOb3JNIsqGGANh8KnY6uc4RQviFqv_GHNBGZr8lZdLM0LElZCqRjOUWrfV89aHha22CUVdfjaObwO3FkzNDDiHB4NExDiTY9dvI423sotCywOAdVQ8_FVwM_y2tJECFVObMU6dhIa1NTj-JV8eU2gXlwhD21CTUbr8WU1cASqas1TFETkXMrWTHO5lm-6ghhHc1cQrm3z9q_P9zb60k75LOqxFL9ZeTWr2eFdxTQIZZZfh94b6mOVvtXW6NwZPrlAI-pzQf"/>
                                        </div>
                                    </div>
                                    <div className="flex-1 w-full space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-neutral-gray mb-1">Nombre del Negocio</label>
                                            <input className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-neutral-dark dark:text-white focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-all outline-none" placeholder="Ingresa el nombre de tu empresa" type="text" defaultValue="S2CO Desayunos"/>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <footer className="w-full py-4 text-center text-sm text-neutral-gray/60 dark:text-slate-500 mt-auto">
                <p>Moneda: <span className="font-bold text-secondary">COP $</span> • Medidas: <span className="font-bold">Gramos / Mililitros</span></p>
            </footer>
        </div>
    );
};

export default SettingsPage;