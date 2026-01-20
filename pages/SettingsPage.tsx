import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HeaderSimple from '../components/HeaderSimple';
import { useApp, THEME_CONFIGS } from '../context/AppContext';
import LiquidModal from '../components/LiquidModal';
import { ThemeName } from '../types';

const SettingsPage: React.FC = () => {
    const navigate = useNavigate();
    const { settings, organization, updateSettings, updateOrganization, theme, setTheme } = useApp();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Local state for form handling before saving
    const [localOrg, setLocalOrg] = useState(organization);
    const [localSettings, setLocalSettings] = useState(settings);
    const [isDirty, setIsDirty] = useState(false);

    // Modal State
    const [modal, setModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'success' | 'error' | 'warning' | 'info';
    }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info'
    });

    const closeModal = () => setModal(prev => ({ ...prev, isOpen: false }));

    // Sync from context if it changes externally
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

    const handleThemeChange = (newTheme: ThemeName) => {
        setTheme(newTheme);
    };

    const handleSave = () => {
        updateOrganization(localOrg);
        updateSettings(localSettings);
        setIsDirty(false);
        setModal({
            isOpen: true,
            title: "Cambios Guardados",
            message: "La configuración ha sido actualizada correctamente.",
            type: "success"
        });
    };

    // Get theme-specific accent colors
    const getThemeAccentClasses = () => {
        switch (theme) {
            case 'feminine':
                return {
                    accent: 'text-pink-500',
                    accentBg: 'bg-pink-50',
                    accentBorder: 'border-pink-200',
                    accentRing: 'ring-pink-500/20',
                    gradient: 'from-pink-500 to-rose-600'
                };
            case 'galaxy':
                return {
                    accent: 'text-purple-400',
                    accentBg: 'bg-purple-900/30',
                    accentBorder: 'border-purple-500/30',
                    accentRing: 'ring-purple-500/20',
                    gradient: 'from-purple-500 to-violet-600'
                };
            case 'dark':
                return {
                    accent: 'text-violet-400',
                    accentBg: 'bg-violet-900/30',
                    accentBorder: 'border-violet-600',
                    accentRing: 'ring-violet-500/20',
                    gradient: 'from-violet-500 to-purple-600'
                };
            default:
                return {
                    accent: 'text-indigo-500',
                    accentBg: 'bg-indigo-50',
                    accentBorder: 'border-indigo-200',
                    accentRing: 'ring-indigo-500/20',
                    gradient: 'from-indigo-500 to-violet-600'
                };
        }
    };

    const themeAccent = getThemeAccentClasses();

    return (
        <div className="min-h-screen font-display flex flex-col transition-all duration-500" style={{ backgroundColor: 'var(--theme-bg-primary)', color: 'var(--theme-text-primary)' }}>
            <HeaderSimple showProfile={true} />

            <LiquidModal
                isOpen={modal.isOpen}
                title={modal.title}
                message={modal.message}
                type={modal.type}
                onClose={closeModal}
                onConfirm={closeModal}
            />

            <main className="flex-1 w-full max-w-5xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <button onClick={() => navigate(-1)} className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/10 border border-transparent hover:border-white/20 transition-all" style={{ color: 'var(--theme-text-secondary)' }}>
                            <span className="material-symbols-outlined">arrow_back</span>
                        </button>
                        <div>
                            <h2 className="text-2xl md:text-3xl font-black tracking-tight" style={{ color: 'var(--theme-text-primary)' }}>Ajustes</h2>
                            <p className="text-sm font-medium" style={{ color: 'var(--theme-text-secondary)' }}>Personaliza tu negocio y preferencias.</p>
                        </div>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={!isDirty}
                        className={`px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all duration-200 shadow-lg ${isDirty ? `bg-gradient-to-r ${themeAccent.gradient} text-white hover:shadow-xl active:scale-95 cursor-pointer` : 'bg-slate-200 dark:bg-slate-700 text-slate-400 shadow-none cursor-not-allowed'}`}
                    >
                        <span className="material-symbols-outlined text-[20px]">save</span>
                        Guardar
                    </button>
                </div>

                {/* Theme Selector Section */}
                <section className="glass-card rounded-3xl p-6 border transition-all duration-500" style={{ backgroundColor: 'var(--theme-bg-card)', borderColor: 'var(--theme-border)' }}>
                    <div className="flex items-center gap-3 mb-6">
                        <div className={`size-10 rounded-xl ${themeAccent.accentBg} ${themeAccent.accent} flex items-center justify-center`}>
                            <span className="material-symbols-outlined">palette</span>
                        </div>
                        <div>
                            <h3 className="font-bold" style={{ color: 'var(--theme-text-primary)' }}>Apariencia</h3>
                            <p className="text-xs font-medium" style={{ color: 'var(--theme-text-secondary)' }}>Selecciona el tema visual de la aplicación</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {THEME_CONFIGS.map((themeConfig) => (
                            <button
                                key={themeConfig.name}
                                onClick={() => handleThemeChange(themeConfig.name)}
                                className={`theme-selector-card relative group rounded-2xl p-4 border-2 transition-all duration-300 overflow-hidden ${theme === themeConfig.name
                                        ? 'border-[var(--theme-accent)] ring-4 ring-[var(--theme-accent)]/20 selected'
                                        : 'border-transparent hover:border-white/20'
                                    }`}
                                style={{
                                    backgroundColor: themeConfig.preview.bg,
                                }}
                            >
                                {/* Theme Preview */}
                                <div className="relative z-10 flex flex-col items-center gap-3">
                                    {/* Icon Circle */}
                                    <div
                                        className="w-12 h-12 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                                        style={{
                                            backgroundColor: themeConfig.preview.accent,
                                            boxShadow: themeConfig.name === 'galaxy' ? `0 0 20px ${themeConfig.preview.accent}60` : 'none'
                                        }}
                                    >
                                        <span
                                            className="material-symbols-outlined text-white text-[24px]"
                                            style={{
                                                filter: themeConfig.name === 'galaxy' ? 'drop-shadow(0 0 8px white)' : 'none'
                                            }}
                                        >
                                            {themeConfig.icon}
                                        </span>
                                    </div>

                                    {/* Theme Name */}
                                    <div className="text-center">
                                        <h4
                                            className="font-bold text-sm"
                                            style={{ color: themeConfig.preview.text }}
                                        >
                                            {themeConfig.label}
                                        </h4>
                                        <p
                                            className="text-[10px] font-medium mt-0.5 opacity-70"
                                            style={{ color: themeConfig.preview.text }}
                                        >
                                            {themeConfig.description}
                                        </p>
                                    </div>

                                    {/* Selected Indicator */}
                                    {theme === themeConfig.name && (
                                        <div
                                            className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                                            style={{ backgroundColor: themeConfig.preview.accent }}
                                        >
                                            <span className="material-symbols-outlined text-white text-[14px]">check</span>
                                        </div>
                                    )}
                                </div>

                                {/* Galaxy Theme Special Glow */}
                                {themeConfig.name === 'galaxy' && (
                                    <>
                                        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-blue-900/20 pointer-events-none" />
                                        <div className="absolute top-2 left-3 w-1 h-1 bg-white rounded-full opacity-60" />
                                        <div className="absolute top-5 right-4 w-0.5 h-0.5 bg-white rounded-full opacity-40" />
                                        <div className="absolute bottom-6 left-5 w-0.5 h-0.5 bg-white rounded-full opacity-50" />
                                        <div className="absolute bottom-3 right-6 w-1 h-1 bg-white rounded-full opacity-30" />
                                    </>
                                )}

                                {/* Feminine Theme Soft Gradient */}
                                {themeConfig.name === 'feminine' && (
                                    <div className="absolute inset-0 bg-gradient-to-br from-pink-100/50 via-transparent to-rose-100/30 pointer-events-none" />
                                )}
                            </button>
                        ))}
                    </div>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* Left Column */}
                    <div className="md:col-span-2 flex flex-col gap-6">

                        {/* Business Profile Card */}
                        <section className="glass-card rounded-3xl p-6 border relative overflow-hidden group transition-all duration-500" style={{ backgroundColor: 'var(--theme-bg-card)', borderColor: 'var(--theme-border)' }}>

                            <div className="flex items-center gap-3 mb-6">
                                <span className={`material-symbols-outlined ${themeAccent.accent}`}>storefront</span>
                                <h3 className="font-bold" style={{ color: 'var(--theme-text-primary)' }}>Perfil de Negocio</h3>
                            </div>

                            <div className="flex flex-col sm:flex-row items-start gap-6 relative z-10">
                                <div className="relative group/logo cursor-pointer shrink-0" onClick={handleLogoClick}>
                                    <div className={`w-24 h-24 rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden transition-all ${themeAccent.accentBorder} hover:border-[var(--theme-accent)]`} style={{ backgroundColor: 'var(--theme-bg-secondary)' }}>
                                        {localOrg.logo ? (
                                            <img alt="Logo" className="h-full w-full object-cover" src={localOrg.logo} />
                                        ) : (
                                            <span className="material-symbols-outlined text-3xl transition-colors" style={{ color: 'var(--theme-text-secondary)' }}>add_photo_alternate</span>
                                        )}
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/logo:opacity-100 transition-opacity">
                                            <span className="material-symbols-outlined text-white">edit</span>
                                        </div>
                                    </div>
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoChange} />
                                </div>

                                <div className="flex-1 w-full space-y-4">
                                    <div className="group/input">
                                        <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 ml-1" style={{ color: 'var(--theme-text-secondary)' }}>Nombre del Negocio</label>
                                        <input
                                            className={`w-full border rounded-xl px-4 py-3 font-bold focus:ring-2 ${themeAccent.accentRing} transition-all outline-none`}
                                            style={{ backgroundColor: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border)', color: 'var(--theme-text-primary)' }}
                                            placeholder="Ej: Sabor Casero"
                                            type="text"
                                            value={localOrg.name}
                                            onChange={(e) => handleOrgChange('name', e.target.value)}
                                        />
                                    </div>
                                    <div className="group/input">
                                        <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 ml-1" style={{ color: 'var(--theme-text-secondary)' }}>Eslogan</label>
                                        <input
                                            className={`w-full border rounded-xl px-4 py-3 font-medium focus:ring-2 ${themeAccent.accentRing} transition-all outline-none`}
                                            style={{ backgroundColor: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border)', color: 'var(--theme-text-primary)' }}
                                            placeholder="Ej: Calidad que enamora"
                                            type="text"
                                            value={localOrg.slogan}
                                            onChange={(e) => handleOrgChange('slogan', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* General & Currency */}
                        <section className="glass-card rounded-3xl p-6 border transition-all duration-500" style={{ backgroundColor: 'var(--theme-bg-card)', borderColor: 'var(--theme-border)' }}>
                            <div className="flex items-center gap-3 mb-6">
                                <span className={`material-symbols-outlined ${theme === 'feminine' ? 'text-pink-400' : 'text-teal-500'}`}>settings</span>
                                <h3 className="font-bold" style={{ color: 'var(--theme-text-primary)' }}>Regionalización</h3>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 ml-1" style={{ color: 'var(--theme-text-secondary)' }}>Moneda</label>
                                    <div className="relative">
                                        <select
                                            className="w-full appearance-none border rounded-xl px-4 py-3 pl-11 font-bold cursor-pointer outline-none"
                                            style={{ backgroundColor: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border)', color: 'var(--theme-text-primary)' }}
                                            value={localSettings.currency}
                                            onChange={(e) => handleSettingsChange('currency', e.target.value)}
                                        >
                                            <option value="COP $">COP $ (Peso Colombiano)</option>
                                            <option value="USD $">USD $ (Dólar)</option>
                                            <option value="EUR €">EUR € (Euro)</option>
                                        </select>
                                        <span className={`material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${theme === 'feminine' ? 'text-pink-400' : 'text-teal-500'}`}>payments</span>
                                        <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-sm" style={{ color: 'var(--theme-text-secondary)' }}>expand_more</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 ml-1" style={{ color: 'var(--theme-text-secondary)' }}>Idioma</label>
                                    <div className="relative">
                                        <select
                                            className="w-full appearance-none border rounded-xl px-4 py-3 pl-11 font-bold cursor-pointer outline-none"
                                            style={{ backgroundColor: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border)', color: 'var(--theme-text-primary)' }}
                                            value={localSettings.language}
                                            onChange={(e) => handleSettingsChange('language', e.target.value)}
                                        >
                                            <option value="Español">Español</option>
                                            <option value="English">English</option>
                                        </select>
                                        <span className={`material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${theme === 'feminine' ? 'text-pink-400' : 'text-teal-500'}`}>language</span>
                                        <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-sm" style={{ color: 'var(--theme-text-secondary)' }}>expand_more</span>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Labor Cost Section */}
                        <section className="glass-card rounded-3xl p-6 border relative overflow-hidden transition-all duration-500" style={{ backgroundColor: 'var(--theme-bg-card)', borderColor: 'var(--theme-border)' }}>
                            <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl -z-10" style={{ backgroundColor: theme === 'feminine' ? 'rgba(236, 72, 153, 0.1)' : 'rgba(59, 130, 246, 0.1)' }}></div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className={`size-8 rounded-full ${theme === 'feminine' ? 'bg-pink-50 text-pink-500' : 'bg-blue-50 text-blue-500'} flex items-center justify-center`}>
                                    <span className="material-symbols-outlined text-[18px]">engineering</span>
                                </div>
                                <h3 className="font-bold" style={{ color: 'var(--theme-text-primary)' }}>Mano de Obra Base</h3>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center gap-6">
                                <p className="text-sm font-medium flex-1" style={{ color: 'var(--theme-text-secondary)' }}>
                                    Este valor se usará para calcular el costo por minuto de tu trabajo en cada receta. <br />
                                    <span className="text-xs mt-1 block" style={{ opacity: 0.7 }}>*Incluye salario + prestaciones.</span>
                                </p>
                                <div className="w-full sm:w-48">
                                    <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 ml-1" style={{ color: 'var(--theme-text-secondary)' }}>Salario Mensual</label>
                                    <div className="relative">
                                        <span className={`material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[20px] ${theme === 'feminine' ? 'text-pink-500' : 'text-blue-500'}`}>attach_money</span>
                                        <input
                                            className="w-full border rounded-xl px-4 py-3 pl-10 font-black text-right outline-none"
                                            style={{ backgroundColor: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border)', color: 'var(--theme-text-primary)' }}
                                            type="number"
                                            min="0"
                                            value={localSettings.monthlySalary}
                                            onChange={(e) => handleSettingsChange('monthlySalary', parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>

                    </div>

                    {/* Right Column */}
                    <div className="md:col-span-1">

                        {/* Factor Q Card */}
                        <section className="glass-card rounded-3xl p-6 border h-full flex flex-col relative overflow-hidden group transition-all duration-500" style={{ backgroundColor: 'var(--theme-bg-card)', borderColor: 'var(--theme-border)' }}>

                            {/* Decorative Blob */}
                            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl group-hover:opacity-100 transition-colors duration-500" style={{ backgroundColor: theme === 'feminine' ? 'rgba(236, 72, 153, 0.15)' : 'rgba(168, 85, 247, 0.15)' }}></div>

                            <div className="flex items-center gap-3 mb-6 relative z-10">
                                <div className={`size-10 rounded-xl ${theme === 'feminine' ? 'bg-pink-50 text-pink-600' : 'bg-purple-50 text-purple-600'} flex items-center justify-center`}>
                                    <span className="material-symbols-outlined">science</span>
                                </div>
                                <div>
                                    <h3 className="font-bold leading-none" style={{ color: 'var(--theme-text-primary)' }}>Factor Q</h3>
                                    <p className={`text-[10px] uppercase font-bold tracking-wider mt-1 ${theme === 'feminine' ? 'text-pink-500' : 'text-purple-500'}`}>Margen de Error</p>
                                </div>
                            </div>

                            <p className="text-sm font-medium mb-8 flex-1 relative z-10" style={{ color: 'var(--theme-text-secondary)' }}>
                                Un porcentaje de seguridad para cubrir gastos "invisibles" (sal, condimentos, mermas no calculadas).
                            </p>

                            <div className="mb-8 relative z-10">
                                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 ml-1" style={{ color: 'var(--theme-text-secondary)' }}>Porcentaje Global</label>
                                <div className="relative flex items-center">
                                    <input
                                        className={`w-full border rounded-2xl px-4 py-4 text-center text-4xl font-black ${theme === 'feminine' ? 'text-pink-600 border-pink-100 focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10' : 'text-purple-600 border-purple-100 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10'} outline-none transition-all`}
                                        style={{ backgroundColor: 'var(--theme-bg-secondary)' }}
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={localSettings.factorQPercentage}
                                        onChange={(e) => handleSettingsChange('factorQPercentage', parseFloat(e.target.value) || 0)}
                                    />
                                    <span className={`absolute right-6 text-xl font-bold pointer-events-none ${theme === 'feminine' ? 'text-pink-300' : 'text-purple-300'}`}>%</span>
                                </div>
                            </div>

                            <div className={`rounded-xl p-4 border relative z-10 ${theme === 'feminine' ? 'bg-pink-50 border-pink-100' : 'bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800/30'}`}>
                                <div className={`flex gap-2 ${theme === 'feminine' ? 'text-pink-700' : 'text-purple-700 dark:text-purple-300'}`}>
                                    <span className="material-symbols-outlined text-[18px] shrink-0">info</span>
                                    <p className="text-xs font-bold leading-tight">Recomendamos mantenerlo entre el 3% y el 5% para no inflar precios.</p>
                                </div>
                            </div>
                        </section>

                    </div>
                </div>

            </main>
        </div>
    );
};

export default SettingsPage;