import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HeaderSimple from '../components/HeaderSimple';
import { useApp } from '../context/AppContext';

const SettingsPage: React.FC = () => {
    const navigate = useNavigate();
    const { settings, organization, updateSettings, updateOrganization } = useApp();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Local state for form handling before saving
    const [localOrg, setLocalOrg] = useState(organization);
    const [localSettings, setLocalSettings] = useState(settings);
    const [isDirty, setIsDirty] = useState(false);

    // Sync from context if it changes externally (optional, but good practice)
    useEffect(() => {
        setLocalOrg(organization);
        setLocalSettings(settings);
    }, [organization, settings]);

    const handleOrgChange = (field: keyof typeof localOrg, value: string) => {
        setLocalOrg(prev => ({ ...prev, [field]: value }));
        setIsDirty(true);
    };

    const handleSettingsChange = (field: keyof typeof localSettings, value: any) => {
        setLocalSettings(prev => ({ ...prev, [field]: value }));
        setIsDirty(true);
    };

    const handleLogoClick = () => {
        fileInputRef.current?.click();
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                handleOrgChange('logo', result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = () => {
        updateOrganization(localOrg);
        updateSettings(localSettings);
        setIsDirty(false);
        // Could show a toast here
        alert('Configuración guardada exitosamente');
    };

    return (
        <div className="bg-gradient-to-br from-white to-indigo-50 dark:from-background-dark dark:to-neutral-dark min-h-screen text-neutral-dark dark:text-white font-display overflow-hidden flex flex-col">
            <HeaderSimple showProfile={true} />
            <main className="flex-1 flex flex-col items-center justify-start relative w-full px-4 overflow-y-auto overflow-x-hidden py-4">
                <div className="absolute top-1/4 left-0 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-secondary/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>
                <div className="absolute bottom-0 right-0 translate-x-1/3 translate-y-1/3 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>

                <div className="max-w-4xl w-full flex flex-col gap-4 animate-fade-in-up pb-6">
                    <div className="flex items-center gap-4 mb-1">
                        <button onClick={() => navigate(-1)} className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-neutral-dark dark:text-white">
                            <span className="material-symbols-outlined">arrow_back</span>
                        </button>
                        <div>
                            <h2 className="text-2xl md:text-3xl font-bold text-neutral-dark dark:text-white">Ajustes y Configuración</h2>
                            <p className="text-neutral-gray text-sm md:text-base">Personaliza tu experiencia en COSTEA</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="lg:col-span-2 space-y-4">
                            {/* Business Profile Section */}
                            <div className="bg-white/70 dark:bg-white/5 backdrop-blur-md rounded-2xl border border-white/40 dark:border-white/10 shadow-soft p-4 md:p-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <span className="material-symbols-outlined text-secondary">storefront</span>
                                    <h3 className="text-lg font-bold text-neutral-dark dark:text-white">Perfil de Negocio</h3>
                                </div>
                                <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                                    <div className="relative group cursor-pointer" onClick={handleLogoClick}>
                                        <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-white/5 border-2 border-dashed border-gray-300 dark:border-white/20 flex items-center justify-center overflow-hidden hover:border-secondary transition-colors relative">
                                            {localOrg.logo ? (
                                                <img alt="Logo actual" className="h-full w-full object-cover" src={localOrg.logo} />
                                            ) : (
                                                <span className="material-symbols-outlined text-gray-400 text-3xl">add_photo_alternate</span>
                                            )}

                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="material-symbols-outlined text-white">edit</span>
                                            </div>
                                        </div>
                                        <span className="text-xs text-center block mt-2 text-neutral-gray">Editar Logo</span>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleLogoChange}
                                        />
                                    </div>
                                    <div className="flex-1 w-full space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-neutral-gray mb-1">Nombre del Negocio</label>
                                            <input
                                                className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-neutral-dark dark:text-white focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-all outline-none"
                                                placeholder="Ingresa el nombre de tu empresa"
                                                type="text"
                                                value={localOrg.name}
                                                onChange={(e) => handleOrgChange('name', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-neutral-gray mb-1">Eslogan (Opcional)</label>
                                            <input
                                                className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-neutral-dark dark:text-white focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-all outline-none"
                                                type="text"
                                                value={localOrg.slogan}
                                                onChange={(e) => handleOrgChange('slogan', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* General Config Section */}
                            <div className="bg-white/70 dark:bg-white/5 backdrop-blur-md rounded-2xl border border-white/40 dark:border-white/10 shadow-soft p-4 md:p-6">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary dark:text-white dark:bg-white/10">
                                        <span className="material-symbols-outlined text-2xl">tune</span>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-neutral-dark dark:text-white leading-tight">Configuración General</h3>
                                        <p className="text-sm text-neutral-gray mt-0.5">Preferencias de moneda e idioma</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="group">
                                        <label className="block text-sm font-bold text-neutral-gray mb-2 ml-1 uppercase tracking-wide text-[10px]">Moneda Principal</label>
                                        <div className="relative">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-gray group-focus-within:text-primary transition-colors pointer-events-none z-10 flex items-center">
                                                <span className="material-symbols-outlined text-[20px]">payments</span>
                                            </div>
                                            <select
                                                className="w-full appearance-none bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl pl-12 pr-10 py-4 text-neutral-dark dark:text-white font-medium focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none cursor-pointer hover:bg-white dark:hover:bg-white/5 hover:border-gray-300 dark:hover:border-white/20 hover:shadow-sm bg-none"
                                                value={localSettings.currency}
                                                onChange={(e) => handleSettingsChange('currency', e.target.value)}
                                            >
                                                <option value="COP $">🇨🇴 COP $ (Peso Colombiano)</option>
                                                <option value="USD $">🇺🇸 USD $ (Dólar Americano)</option>
                                                <option value="EUR €">🇪🇺 EUR € (Euro)</option>
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-gray group-hover:text-primary transition-colors flex items-center">
                                                <span className="material-symbols-outlined text-[20px]">expand_more</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="group">
                                        <label className="block text-sm font-bold text-neutral-gray mb-2 ml-1 uppercase tracking-wide text-[10px]">Idioma</label>
                                        <div className="relative">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-gray group-focus-within:text-primary transition-colors pointer-events-none z-10 flex items-center">
                                                <span className="material-symbols-outlined text-[20px]">language</span>
                                            </div>
                                            <select
                                                className="w-full appearance-none bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl pl-12 pr-10 py-4 text-neutral-dark dark:text-white font-medium focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none cursor-pointer hover:bg-white dark:hover:bg-white/5 hover:border-gray-300 dark:hover:border-white/20 hover:shadow-sm bg-none"
                                                value={localSettings.language}
                                                onChange={(e) => handleSettingsChange('language', e.target.value)}
                                            >
                                                <option value="Español">🇪🇸 Español</option>
                                                <option value="English">🇺🇸 English</option>
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-gray group-hover:text-primary transition-colors flex items-center">
                                                <span className="material-symbols-outlined text-[20px]">expand_more</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>


                            {/* Labor Cost Section - MOVED HERE */}
                            <div className="bg-white/70 dark:bg-white/5 backdrop-blur-md rounded-2xl border border-white/40 dark:border-white/10 shadow-soft p-4 md:p-6 flex flex-col relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-2xl -z-10"></div>
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center text-green-600 dark:text-green-400">
                                        <span className="material-symbols-outlined text-[24px]">engineering</span>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-neutral-dark dark:text-white leading-tight">Mano de Obra</h3>
                                        <p className="text-sm text-neutral-gray mt-0.5">Base salarial para calcular tus tiempos</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                                    <div>
                                        <p className="text-sm text-neutral-dark dark:text-gray-300 font-medium leading-relaxed mb-2">
                                            Define el salario mensual base. Se usará para calcular automáticamente cuánto vale cada minuto de tu trabajo en las recetas.
                                        </p>
                                        <p className="text-[10px] text-gray-400 italic">
                                            *Incluye todas las prestaciones de ley y seguridad social si aplica.
                                        </p>
                                    </div>
                                    <div className="group">
                                        <label className="block text-sm font-bold text-neutral-gray mb-2 ml-1 uppercase tracking-wide text-[10px]">Salario Mensual</label>
                                        <div className="relative">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-gray group-focus-within:text-primary transition-colors pointer-events-none z-10 flex items-center">
                                                <span className="material-symbols-outlined text-[20px]">attach_money</span>
                                            </div>
                                            <input
                                                className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl pl-12 pr-4 py-4 text-neutral-dark dark:text-white font-medium focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none hover:bg-white dark:hover:bg-white/5 hover:border-gray-300 dark:hover:border-white/20 hover:shadow-sm"
                                                type="number"
                                                min="0"
                                                placeholder="Ej: 2000000"
                                                value={localSettings.monthlySalary}
                                                onChange={(e) => handleSettingsChange('monthlySalary', parseFloat(e.target.value) || 0)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-1">
                            {/* Factor Q Section */}
                            <div className="bg-gradient-to-br from-white to-indigo-50/50 dark:from-neutral-dark dark:to-secondary/20 backdrop-blur-md rounded-2xl border-2 border-secondary/20 dark:border-secondary/30 shadow-glow p-4 md:p-6 flex flex-col relative overflow-hidden">
                                <div className="absolute -top-10 -right-10 w-32 h-32 bg-secondary/10 rounded-full blur-2xl"></div>
                                <div className="flex items-center gap-3 mb-4 z-10">
                                    <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
                                        <span className="material-symbols-outlined">shield_moon</span>
                                    </div>
                                    <h3 className="text-xl font-extrabold text-secondary dark:text-indigo-300">Factor Q</h3>
                                </div>
                                <p className="text-sm text-neutral-dark dark:text-gray-200 font-medium leading-relaxed mb-6 z-10">
                                    Conocido como el "Margen de Error". Este porcentaje se añade automáticamente al final de cada costeo.
                                </p>
                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4 border border-blue-100 dark:border-blue-800/30">
                                    <div className="flex gap-2">
                                        <span className="material-symbols-outlined text-primary text-sm mt-0.5">info</span>
                                        <p className="text-xs text-neutral-gray dark:text-blue-200 leading-snug">
                                            Cubre gastos pequeños difíciles de calcular individualmente como: <span className="font-bold text-primary dark:text-blue-300">sal, servilletas, cinta adhesiva o gas.</span>
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-4 mb-6 z-10">
                                    <div className="group">
                                        <label className="block text-sm font-bold text-neutral-gray mb-2 ml-1 uppercase tracking-wide text-[10px]">Porcentaje (%)</label>
                                        <div className="relative">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-gray group-focus-within:text-primary transition-colors pointer-events-none z-10 flex items-center">
                                                <span className="material-symbols-outlined text-[20px]">percent</span>
                                            </div>
                                            <input
                                                className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl pl-12 pr-4 py-4 text-neutral-dark dark:text-white font-medium focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none hover:bg-white dark:hover:bg-white/5 hover:border-gray-300 dark:hover:border-white/20 hover:shadow-sm"
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={localSettings.factorQPercentage}
                                                onChange={(e) => handleSettingsChange('factorQPercentage', parseFloat(e.target.value) || 0)}
                                            />
                                        </div>
                                    </div>

                                </div>

                                <div className="mt-auto pt-4 border-t border-gray-100 dark:border-white/10">
                                    <p className="text-xs text-center text-neutral-gray italic">
                                        "Un buen Factor Q protege tu ganancia real."
                                    </p>
                                </div>
                            </div>

                        </div>
                    </div>

                    <div className="flex justify-end items-center gap-4 mt-4 pt-6 border-t border-gray-200/50 dark:border-white/10">
                        <button
                            onClick={() => navigate(-1)}
                            className="px-6 py-2.5 rounded-xl text-neutral-gray font-semibold hover:text-neutral-dark dark:hover:text-white transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!isDirty}
                            className={`px-8 py-2.5 rounded-xl bg-gradient-to-r from-secondary to-primary text-white font-bold shadow-lg shadow-indigo-500/20 flex items-center gap-2 transition-all duration-200 ${isDirty ? 'hover:from-[#502bb5] hover:to-blue-600 transform hover:-translate-y-0.5 cursor-pointer' : 'opacity-70 cursor-not-allowed'}`}
                        >
                            <span className="material-symbols-outlined text-[20px]">save</span>
                            Guardar Cambios
                        </button>
                    </div>
                </div>
            </main>
            <footer className="w-full py-2 text-center text-sm text-neutral-gray/60 dark:text-slate-500 mt-auto">
                <p>© 2026 COSTEA • Hecho con <span className="text-red-400">❤</span> para emprendedores</p>
            </footer>
        </div>
    );
};

export default SettingsPage;