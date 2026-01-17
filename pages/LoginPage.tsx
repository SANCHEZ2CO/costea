import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';

const LoginPage: React.FC = () => {
    const { signInWithEmail, signUpWithEmail, signInWithGoogle, loading, user } = useApp();
    const navigate = useNavigate();

    // Toggle between Sign up and Sign in
    const [activeTab, setActiveTab] = useState<'signup' | 'signin'>('signin');
    const [showPassword, setShowPassword] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        resetEmail: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // Redirect if logged in
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
            if (activeTab === 'signin') {
                // LOGIN
                const { error } = await signInWithEmail(formData.email, formData.password);
                if (error) throw error;
            } else {
                // SIGN UP
                if (formData.password.length < 6) {
                    throw new Error("La contraseña debe tener al menos 6 caracteres.");
                }
                const fullName = `${formData.firstName} ${formData.lastName}`.trim();
                const { error } = await signUpWithEmail(formData.email, formData.password, fullName);
                if (error) throw error;

                setSuccessMsg("¡Cuenta creada! Revisa tu correo para confirmar.");
                setActiveTab('signin');
            }
        } catch (error: any) {
            let msg = error.message;
            if (msg.includes("Invalid login")) msg = "Credenciales incorrectas.";
            if (msg.includes("User already registered")) msg = "Este correo ya está registrado.";
            setErrorMsg(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGoogleSignIn = async () => {
        try {
            setErrorMsg('');
            const { error } = await signInWithGoogle();
            if (error) throw error;
            // Redirect will happen automatically after OAuth flow
        } catch (error: any) {
            setErrorMsg(error.message || 'Error al iniciar sesión con Google');
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrorMsg('');
        setSuccessMsg('');

        try {
            const { error } = await (window as any).supabase.auth.resetPasswordForEmail(formData.resetEmail, {
                redirectTo: `${window.location.origin}/reset-password`
            });
            if (error) throw error;
            setSuccessMsg("Te enviamos un enlace de recuperación al correo.");
            setTimeout(() => setShowForgotPassword(false), 3000);
        } catch (error: any) {
            setErrorMsg(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#0f0920] via-[#2d1b5e] to-[#1a0f3f] p-4 font-display relative overflow-hidden">

            {/* Enhanced Animated Background Glow */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-30%] left-[-15%] w-[700px] h-[700px] bg-gradient-to-br from-purple-600/40 to-fuchsia-600/40 rounded-full blur-[140px] animate-pulse" />
                <div className="absolute bottom-[-30%] right-[-15%] w-[700px] h-[700px] bg-gradient-to-br from-blue-600/40 to-cyan-500/40 rounded-full blur-[140px] animate-pulse" style={{ animationDelay: '1.5s' }} />
                <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '3s' }} />
            </div>

            {/* Main Auth Modal */}
            <div className="relative z-10 w-full max-w-md">

                {/* Modal Card - Enhanced Liquid Glass */}
                <div className="bg-white/5 dark:bg-white/10 backdrop-blur-3xl border border-white/20 rounded-3xl shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] overflow-hidden">

                    {/* Header with Tabs */}
                    <div className="p-6 pb-4">
                        {/* Logo */}
                        <div className="flex justify-center mb-6">
                            <div className="p-2 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10">
                                <img src="/images/logos/sanchez2-logo.png" alt="Logo" className="h-8 opacity-90" />
                            </div>
                        </div>

                        {/* Tab Toggle - REVERSED ORDER: Iniciar Sesión first */}
                        <div className="inline-flex w-full bg-white/5 backdrop-blur-md rounded-2xl p-1.5 border border-white/10 mb-6">
                            <button
                                onClick={() => {
                                    setActiveTab('signin');
                                    setErrorMsg('');
                                    setSuccessMsg('');
                                }}
                                className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all duration-300 ${activeTab === 'signin'
                                        ? 'bg-white/10 text-white shadow-lg'
                                        : 'text-white/50 hover:text-white/70'
                                    }`}>
                                Iniciar Sesión
                            </button>
                            <button
                                onClick={() => {
                                    setActiveTab('signup');
                                    setErrorMsg('');
                                    setSuccessMsg('');
                                }}
                                className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all duration-300 ${activeTab === 'signup'
                                        ? 'bg-white/10 text-white shadow-lg'
                                        : 'text-white/50 hover:text-white/70'
                                    }`}>
                                Crear Cuenta
                            </button>
                        </div>

                        {/* Title */}
                        <h2 className="text-3xl font-bold text-white mb-6">
                            {showForgotPassword ? 'Recuperar contraseña' : activeTab === 'signup' ? 'Crea tu cuenta' : 'Bienvenido de nuevo'}
                        </h2>
                    </div>

                    {/* Form Area */}
                    <div className="px-6 pb-6">

                        {successMsg && (
                            <div className="mb-4 p-4 bg-green-500/20 backdrop-blur-md border border-green-500/30 text-green-100 rounded-2xl text-sm flex gap-3 items-start animate-fade-in-up">
                                <span className="material-symbols-outlined text-lg shrink-0 mt-0.5">check_circle</span>
                                <p>{successMsg}</p>
                            </div>
                        )}

                        {errorMsg && (
                            <div className="mb-4 p-4 bg-red-500/20 backdrop-blur-md border border-red-500/30 text-red-100 text-sm rounded-2xl flex items-center gap-3 animate-shake">
                                <span className="material-symbols-outlined text-lg">error</span>
                                {errorMsg}
                            </div>
                        )}

                        {showForgotPassword ? (
                            /* FORGOT PASSWORD FORM */
                            <form onSubmit={handleForgotPassword} className="space-y-4">
                                <div>
                                    <div className="relative group">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-white/70 transition-colors">
                                            <span className="material-symbols-outlined text-[20px]">alternate_email</span>
                                        </span>
                                        <input
                                            type="email"
                                            name="resetEmail"
                                            required
                                            value={formData.resetEmail}
                                            onChange={handleChange}
                                            placeholder="Ingresa tu correo"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder:text-white/30 text-sm font-medium outline-none focus:bg-white/10 focus:border-white/30 transition-all duration-300"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-purple-500/30 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                    {isSubmitting ? (
                                        <span className="material-symbols-outlined animate-spin text-xl">refresh</span>
                                    ) : (
                                        'Enviar enlace de recuperación'
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setShowForgotPassword(false)}
                                    className="w-full text-center text-sm text-white/60 hover:text-white transition-colors">
                                    Volver al inicio de sesión
                                </button>
                            </form>
                        ) : (
                            /* MAIN AUTH FORM */
                            <form onSubmit={handleSubmit} className="space-y-4">

                                {activeTab === 'signup' && (
                                    <div className="grid grid-cols-2 gap-3 animate-fade-in-up">
                                        <input
                                            type="text"
                                            name="firstName"
                                            required={activeTab === 'signup'}
                                            value={formData.firstName}
                                            onChange={handleChange}
                                            placeholder="Nombre"
                                            className="bg-white/5 border border-white/10 rounded-xl py-3.5 px-4 text-white placeholder:text-white/30 text-sm font-medium outline-none focus:bg-white/10 focus:border-white/30 transition-all duration-300"
                                        />
                                        <input
                                            type="text"
                                            name="lastName"
                                            required={activeTab === 'signup'}
                                            value={formData.lastName}
                                            onChange={handleChange}
                                            placeholder="Apellido"
                                            className="bg-white/5 border border-white/10 rounded-xl py-3.5 px-4 text-white placeholder:text-white/30 text-sm font-medium outline-none focus:bg-white/10 focus:border-white/30 transition-all duration-300"
                                        />
                                    </div>
                                )}

                                <div>
                                    <div className="relative group">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-white/70 transition-colors">
                                            <span className="material-symbols-outlined text-[20px]">alternate_email</span>
                                        </span>
                                        <input
                                            type="email"
                                            name="email"
                                            required
                                            value={formData.email}
                                            onChange={handleChange}
                                            placeholder="Ingresa tu correo"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder:text-white/30 text-sm font-medium outline-none focus:bg-white/10 focus:border-white/30 transition-all duration-300"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <div className="relative group">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-white/70 transition-colors">
                                            <span className="material-symbols-outlined text-[20px]">lock</span>
                                        </span>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            name="password"
                                            required
                                            minLength={6}
                                            value={formData.password}
                                            onChange={handleChange}
                                            placeholder="Ingresa tu contraseña"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-12 text-white placeholder:text-white/30 text-sm font-medium outline-none focus:bg-white/10 focus:border-white/30 transition-all duration-300"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors">
                                            <span className="material-symbols-outlined text-[20px]">
                                                {showPassword ? 'visibility_off' : 'visibility'}
                                            </span>
                                        </button>
                                    </div>
                                </div>

                                {activeTab === 'signin' && (
                                    <div className="text-right">
                                        <button
                                            type="button"
                                            onClick={() => setShowForgotPassword(true)}
                                            className="text-xs text-white/60 hover:text-white transition-colors font-medium">
                                            ¿Olvidaste tu contraseña?
                                        </button>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="mt-2 w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-[1.02] active:scale-95 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                    {isSubmitting ? (
                                        <span className="material-symbols-outlined animate-spin text-xl">refresh</span>
                                    ) : (
                                        activeTab === 'signup' ? 'Crear cuenta' : 'Iniciar sesión'
                                    )}
                                </button>
                            </form>
                        )}

                        {!showForgotPassword && (
                            <>
                                {/* Divider */}
                                <div className="flex items-center gap-3 my-6">
                                    <div className="flex-1 h-px bg-white/10"></div>
                                    <span className="text-xs text-white/40 font-medium uppercase tracking-wider">O continúa con</span>
                                    <div className="flex-1 h-px bg-white/10"></div>
                                </div>

                                {/* Social Button - Google ENABLED */}
                                <div className="w-full">
                                    <button
                                        type="button"
                                        onClick={handleGoogleSignIn}
                                        className="w-full flex items-center justify-center gap-3 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all duration-300 hover:border-white/20 active:scale-95">
                                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                        </svg>
                                        <span className="text-white/70 font-medium text-sm">Continuar con Google</span>
                                    </button>
                                </div>

                                {/* Terms */}
                                <p className="text-center text-xs text-white/40 mt-6 leading-relaxed">
                                    Al crear una cuenta, aceptas nuestros{' '}
                                    <button className="text-white/60 hover:text-white transition-colors underline">Términos y Condiciones</button>
                                </p>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
