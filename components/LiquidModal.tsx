import React, { useEffect } from 'react';

interface LiquidModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    type?: 'success' | 'error' | 'warning' | 'info';
    onClose?: () => void;
    onConfirm?: () => void;
    confirmText?: string;
    cancelText?: string;
    showCancel?: boolean;
}

const LiquidModal: React.FC<LiquidModalProps> = ({
    isOpen,
    title,
    message,
    type = 'info',
    onClose,
    onConfirm,
    confirmText = 'Aceptar',
    cancelText = 'Cancelar',
    showCancel = false
}) => {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'success': return 'check_circle';
            case 'error': return 'error';
            case 'warning': return 'warning';
            default: return 'info';
        }
    };

    const getColorClass = () => {
        switch (type) {
            case 'success': return 'text-green-500 bg-green-500/10 border-green-500/20';
            case 'error': return 'text-red-500 bg-red-500/10 border-red-500/20';
            case 'warning': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
            default: return 'text-primary bg-primary/10 border-primary/20';
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-background-light/60 dark:bg-background-dark/80 backdrop-blur-xl transition-opacity animate-[fadeIn_0.3s_ease-out]"
                onClick={onClose}
            ></div>

            {/* Modal Content - Liquid Glass Style */}
            <div className="relative w-full max-w-md bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl rounded-3xl p-8 border border-white/40 dark:border-white/10 shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] animate-[scaleIn_0.3s_cubic-bezier(0.16,1,0.3,1)] overflow-hidden">

                {/* Decor: Background Gradients */}
                <div className={`absolute -top-20 -right-20 w-40 h-40 rounded-full blur-[60px] opacity-40 ${type === 'error' ? 'bg-red-500' : 'bg-secondary'}`}></div>
                <div className={`absolute -bottom-20 -left-20 w-40 h-40 rounded-full blur-[60px] opacity-40 ${type === 'error' ? 'bg-red-500' : 'bg-primary'}`}></div>

                <div className="relative z-10 flex flex-col items-center text-center">
                    {/* Icon */}
                    <div className={`mb-6 p-4 rounded-full border-2 shadow-inner backdrop-blur-sm ${getColorClass()}`}>
                        <span className="material-symbols-outlined text-4xl font-bold">
                            {getIcon()}
                        </span>
                    </div>

                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3">
                        {title}
                    </h3>

                    <p className="text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
                        {message}
                    </p>

                    <div className="flex gap-4 w-full justify-center">
                        {showCancel && (
                            <button
                                onClick={onClose}
                                className="px-6 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-100 dark:hover:bg-white/5 transition-all w-full"
                            >
                                {cancelText}
                            </button>
                        )}
                        <button
                            onClick={onConfirm || onClose}
                            className={`px-6 py-3 rounded-xl text-white font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all w-full flex items-center justify-center gap-2
                        ${type === 'error'
                                    ? 'bg-gradient-to-r from-red-500 to-red-600 shadow-red-500/30'
                                    : 'bg-gradient-to-r from-primary to-secondary shadow-primary/30'
                                }
                    `}
                        >
                            {confirmText}
                            <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes scaleIn {
            from { opacity: 0; transform: scale(0.9) translateY(20px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
        </div>
    );
};

export default LiquidModal;
