
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-surface-dark w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 transform transition-all scale-100">
                <div className="p-6 text-center bg-gradient-to-r from-secondary to-primary relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/10 opacity-50 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                    <h3 className="text-2xl font-black text-white relative z-10 mb-1">¡Bienvenido!</h3>
                    <p className="text-indigo-100 text-sm relative z-10">Ingresa tu correo para guardar tus recetas</p>
                    <button onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 flex flex-col gap-6">
                    <div>
                        <label className="section-label">Tu Correo Electrónico</label>
                        <div className="relative group-focus-within:ring-2 ring-primary/20 rounded-xl transition-all">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined">mail</span>
                            <input
                                type="email"
                                className="w-full bg-gray-50 dark:bg-background-dark border border-gray-200 dark:border-gray-700 rounded-xl py-4 pl-12 pr-4 text-slate-800 dark:text-white font-medium focus:border-primary outline-none transition-all placeholder:text-gray-400"
                                placeholder="ejemplo@costea.app"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-secondary hover:bg-secondary-dark text-white font-bold py-4 rounded-xl shadow-lg shadow-secondary/30 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <>
                                <span className="material-symbols-outlined animate-spin">refresh</span>
                                Enviando enlace...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined">magic_button</span>
                                ENVIAR ENLACE MÁGICO
                            </>
                        )}
                    </button>

                    <p className="text-xs text-center text-gray-400">
                        Te enviaremos un link de acceso seguro a tu correo. <br />Sin contraseñas que recordar.
                    </p>
                </form>
            </div>
        </div>
    );
};

export default AuthModal;
