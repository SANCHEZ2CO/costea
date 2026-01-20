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
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-xl transition-opacity animate-[fadeIn_0.5s_ease-out]"
                onClick={onClose}
            ></div>

            {/* Modal Container with AI Arc Glow */}
            <div className="relative w-full max-w-sm group animate-[scaleIn_0.4s_cubic-bezier(0.16,1,0.3,1)]">
                {/* AI Arc Glow Effect */}
                <div className="absolute inset-[-2px] rounded-[34px] overflow-hidden opacity-100">
                    <div
                        className={`absolute inset-[-100%] bg-[conic-gradient(from_var(--shimmer-angle),${type === 'error'
                            ? "theme('colors.red.400'),theme('colors.pink.500'),theme('colors.red.600')"
                            : type === 'success'
                                ? "theme('colors.green.400'),theme('colors.emerald.500'),theme('colors.green.600')"
                                : type === 'warning'
                                    ? "theme('colors.orange.400'),theme('colors.amber.500'),theme('colors.orange.600')"
                                    : "theme('colors.blue.400'),theme('colors.indigo.500'),theme('colors.blue.600')"
                            },${type === 'error' ? "theme('colors.red.400')" : type === 'success' ? "theme('colors.green.400')" : type === 'warning' ? "theme('colors.orange.400')" : "theme('colors.blue.400')"
                            })] animate-[spin_4s_linear_infinite] blur-md will-change-transform`}
                        style={{ '--shimmer-angle': '0deg' } as React.CSSProperties}
                    />
                </div>

                <div className="relative bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-2xl border border-white/40 dark:border-white/10 overflow-hidden flex flex-col items-center text-center">

                    {/* Icon */}
                    <div className={`mb-6 size-20 rounded-[24px] flex items-center justify-center shadow-inner border transition-all ${getColorClass()} relative group`}>
                        <div className="absolute inset-0 bg-white/20 dark:bg-white/5 rounded-[24px] blur-sm opacity-50" />
                        <span className="material-symbols-outlined text-4xl font-black relative z-10 transition-transform group-hover:scale-110">
                            {getIcon()}
                        </span>
                    </div>

                    <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2 tracking-tighter uppercase">
                        {title}
                    </h3>

                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-8 leading-relaxed max-w-[280px]">
                        {message}
                    </p>

                    <div className="flex flex-col gap-3 w-full">
                        <button
                            onClick={onConfirm || onClose}
                            className={`group relative overflow-hidden py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 text-white
                                ${type === 'error'
                                    ? 'bg-red-600 shadow-red-500/30'
                                    : type === 'success'
                                        ? 'bg-green-600 shadow-green-500/30'
                                        : 'bg-slate-900 shadow-indigo-500/20'
                                }
                            `}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                            {confirmText}
                            <span className="material-symbols-outlined text-lg">arrow_forward</span>
                        </button>

                        {showCancel && (
                            <button
                                onClick={onClose}
                                className="py-4 rounded-2xl font-black text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-amber-200 transition-all uppercase tracking-[0.2em]"
                            >
                                {cancelText}
                            </button>
                        )}
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
