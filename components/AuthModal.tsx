
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { signInWithEmail } = useApp();

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setIsSubmitting(true);
        try {
            await signInWithEmail(email);
            onClose();
        } catch (error) {
            console.error(error);
            alert("Error al iniciar sesión. Intenta depués.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-secondary/80 backdrop-blur-xl transition-opacity animate-[fadeIn_0.3s_ease-out]"
                onClick={onClose}
            ></div>

            {/* Modal Content - Liquid Glass Style */}
            <div className="relative w-full max-w-md bg-white/10 backdrop-blur-3xl rounded-3xl p-0 border border-white/20 shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] animate-[scaleIn_0.3s_cubic-bezier(0.16,1,0.3,1)] overflow-hidden">

                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/30 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/30 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

                <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors z-20">
                    <span className="material-symbols-outlined">close</span>
                </button>

                {/* Header Section */}
                <div className="p-8 pb-0 text-center relative z-10">
                    <div className="mb-4 inline-flex p-4 rounded-full border-2 border-white/20 bg-white/10 shadow-inner backdrop-blur-md">
                        <span className="material-symbols-outlined text-4xl text-white font-bold drop-shadow-md">magic_button</span>
                    </div>
                    <h3 className="text-3xl font-black text-white mb-2 drop-shadow-sm">¡Bienvenido!</h3>
                    <p className="text-indigo-100/90 text-sm font-medium">Ingresa tu correo para guardar tus recetas y acceder desde cualquier lugar.</p>
                </div>

                <form onSubmit={handleSubmit} className="p-8 pt-6 flex flex-col gap-6 relative z-10">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-indigo-100 uppercase tracking-wider ml-1">Tu Correo Electrónico</label>
                        <div className="relative group">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-300 material-symbols-outlined group-focus-within:text-white transition-colors">mail</span>
                            <input
                                type="email"
                                className="w-full bg-white/10 border-2 border-indigo-300/30 focus:border-white/50 rounded-2xl py-4 pl-12 pr-4 text-white font-bold placeholder:text-indigo-200/50 outline-none transition-all shadow-inner backdrop-blur-sm"
                                placeholder="ejemplo@costea.app"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting || !email}
                        className="w-full bg-white text-secondary hover:bg-indigo-50 font-black py-4 rounded-2xl shadow-lg shadow-black/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
                    >
                        {isSubmitting ? (
                            <>
                                <span className="material-symbols-outlined animate-spin text-secondary">refresh</span>
                                <span className="text-secondary">Enviando enlace...</span>
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined group-hover:-translate-y-0.5 transition-transform text-secondary">send</span>
                                <span className="text-secondary">ENVIAR ENLACE MÁGICO</span>
                            </>
                        )}
                    </button>

                    <p className="text-xs text-center text-indigo-200/60 leading-relaxed">
                        Te enviaremos un link de acceso seguro a tu correo. <br />Sin contraseñas que recordar.
                    </p>
                </form>
            </div>
            <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>
        </div>
    );
};

export default AuthModal;
