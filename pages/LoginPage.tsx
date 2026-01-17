import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';

const LoginPage: React.FC = () => {
    const { signInWithEmail, signUpWithEmail, loading, user } = useApp();
    const navigate = useNavigate();

    // Toggle between Login and Register mode
    const [isLoginMode, setIsLoginMode] = useState(true);

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        fullName: '' // Only used for registration
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // If session exists, redirect immediately
    React.useEffect(() => {
        if (user && !loading) {
            navigate('/home');
        }
    }, [user, loading, navigate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setErrorMsg('');
        setSuccessMsg('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrorMsg('');
        setSuccessMsg('');

        try {
            if (isLoginMode) {
                // LOGIN LOGIC
                const { error } = await signInWithEmail(formData.email, formData.password);
                if (error) throw error;
                // Redirect handled by useEffect
            } else {
                // REGISTRATION LOGIC
                if (formData.password.length < 6) throw new Error("La contraseña es muy corta (mínimo 6 caracteres).");
                const { error } = await signUpWithEmail(formData.email, formData.password, formData.fullName);
                if (error) throw error;

                setSuccessMsg("¡Cuenta creada! Por favor revisa tu correo para confirmar tu cuenta antes de iniciar sesión.");
                setIsLoginMode(true); // Switch to login view
            }
        } catch (error: any) {
            console.error(error);
            // Friendly error messages
            let msg = error.message;
            if (msg.includes("Invalid login")) msg = "Credenciales incorrectas.";
            if (msg.includes("User already registered")) msg = "Este correo ya está registrado.";
            setErrorMsg(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#0f0c29] bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] p-4 font-display relative overflow-hidden">

            {/* Background Ambient Glows */}
            <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />

            {/* Liquid Glass Card Container */}
            <div className="relative z-10 w-full max-w-5xl bg-white/10 dark:bg-black/20 backdrop-blur-2xl border border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] rounded-3xl overflow-hidden flex flex-col md:flex-row">

                {/* Form Section (Left) - Liquid Glass Content */}
                <div className="w-full md:w-6/12 p-6 md:p-12 flex flex-col justify-center relative">
                    {/* Inner subtle glow for the form area */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />

                    <div className="relative z-10">
                        {/* Logo subtle placement */}
                        <div className="mb-8 p-1 inline-flex rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 shadow-sm">
                            <img src="/images/logos/sanchez2-logo.png" alt="Sanchez2 Logo" className="h-8 md:h-10 opacity-90" />
                        </div>

                        <div className="text-left mb-6">
                            <h2 className="text-3xl md:text-4xl font-black text-white mb-2 tracking-tight drop-shadow-sm">
                                {isLoginMode ? 'Bienvenido' : 'Únete a nosotros'}
                            </h2>
                            <p className="text-blue-100/80 font-light text-base md:text-lg">
                                {isLoginMode
                                    ? 'Accede a tu panel de control.'
                                    : 'Comienza tu viaje de optimización hoy.'}
                            </p>
                        </div>

                        {successMsg && (
                            <div className="mb-6 p-4 bg-green-500/20 backdrop-blur-md border border-green-500/30 text-green-100 rounded-2xl text-sm flex gap-3 items-start animate-fade-in-up shadow-lg">
                                <span className="material-symbols-outlined text-lg shrink-0 mt-0.5">check_circle</span>
                                <p>{successMsg}</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

                            {!isLoginMode && (
                                <div className="animate-fade-in-up">
                                    <label className="block text-xs font-bold text-blue-200 uppercase tracking-widest mb-2 ml-1 opacity-80">Nombre Completo</label>
                                    <div className="relative group">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300/70 group-focus-within:text-white transition-colors duration-300">
                                            <span className="material-symbols-outlined text-[22px]">person</span>
                                        </span>
                                        <input
                                            type="text"
                                            name="fullName"
                                            required={!isLoginMode}
                                            value={formData.fullName}
                                            onChange={handleChange}
                                            placeholder="Tu nombre completo"
                                            className="w-full bg-black/20 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-white/30 font-medium outline-none focus:bg-black/30 focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all duration-300"
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-blue-200 uppercase tracking-widest mb-2 ml-1 opacity-80">Correo Electrónico</label>
                                <div className="relative group">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300/70 group-focus-within:text-white transition-colors duration-300">
                                        <span className="material-symbols-outlined text-[22px]">alternate_email</span>
                                    </span>
                                    <input
                                        type="email"
                                        name="email"
                                        required
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="tucorreo@ejemplo.com"
                                        className="w-full bg-black/20 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-white/30 font-medium outline-none focus:bg-black/30 focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all duration-300"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-blue-200 uppercase tracking-widest mb-2 ml-1 opacity-80">Contraseña</label>
                                <div className="relative group">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300/70 group-focus-within:text-white transition-colors duration-300">
                                        <span className="material-symbols-outlined text-[22px]">lock</span>
                                    </span>
                                    <input
                                        type="password"
                                        name="password"
                                        required
                                        minLength={6}
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="············"
                                        className="w-full bg-black/20 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-white/30 font-bold outline-none focus:bg-black/30 focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all duration-300"
                                    />
                                </div>
                            </div>

                            {errorMsg && (
                                <div className="p-4 bg-red-500/20 backdrop-blur-md border border-red-500/30 text-red-100 text-sm rounded-2xl flex items-center gap-3 animate-shake shadow-lg">
                                    <span className="material-symbols-outlined text-lg">error</span>
                                    {errorMsg}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="mt-4 w-full bg-white text-indigo-900 font-black py-4 rounded-2xl shadow-lg shadow-white/10 hover:shadow-white/20 hover:scale-[1.02] active:scale-95 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                            >
                                {isSubmitting ? (
                                    <span className="material-symbols-outlined animate-spin text-xl">refresh</span>
                                ) : (
                                    <>
                                        <span>{isLoginMode ? 'Iniciar Sesión' : 'Crear Cuenta'}</span>
                                        <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-8 pt-6 border-t border-white/10 text-center">
                            <p className="text-sm text-blue-100/70">
                                {isLoginMode ? "¿Aún no tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
                                <button
                                    onClick={() => { setIsLoginMode(!isLoginMode); setErrorMsg(''); setSuccessMsg(''); }}
                                    className="font-bold text-white hover:text-blue-200 transition-colors focus:outline-none underline decoration-2 decoration-transparent hover:decoration-white underline-offset-4"
                                >
                                    {isLoginMode ? "Regístrate ahora" : "Inicia sesión"}
                                </button>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Brand Sidebar (Right) - Visual Module */}
                <div className="hidden md:flex flex-col justify-center items-center w-6/12 bg-black/40 backdrop-blur-sm p-12 text-white relative overflow-hidden group">
                    {/* Animated Gradient Background on Hover or Static */}
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/30 to-purple-600/30 opacity-50 group-hover:opacity-70 transition-opacity duration-700" />

                    <div className="relative z-10 flex flex-col items-center text-center">
                        <div className="h-40 w-40 bg-white/10 backdrop-blur-xl rounded-3xl flex items-center justify-center mb-8 shadow-2xl border border-white/20 transform group-hover:scale-105 transition-transform duration-500 p-4">
                            <img
                                alt="Sanchez2 Logo"
                                className="h-full w-full object-contain drop-shadow-md"
                                src="/images/logos/sanchez2-logo.png"
                            />
                        </div>
                        <h2 className="text-5xl font-black mb-6 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-200 drop-shadow-lg">
                            SANCHEZ2
                        </h2>
                        <div className="w-16 h-1.5 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full mb-6"></div>
                        <p className="text-blue-50 text-xl font-light leading-relaxed max-w-sm">
                            Tu asistente inteligente para <span className="font-bold text-white">ventas</span> y <span className="font-bold text-white">costeo</span>.
                        </p>
                    </div>

                    {/* Decorative bottom lines */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                </div>

            </div>
        </div>
    );
};

export default LoginPage;
