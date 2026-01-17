import React from 'react';

const LiquidLoader: React.FC = () => {
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden">
            {/* Background with blur and dark overlay */}
            <div className="absolute inset-0 bg-background-light/80 dark:bg-background-dark/90 backdrop-blur-3xl transition-colors duration-500"></div>

            {/* Decorative gradients */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/30 rounded-full blur-[128px] animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/30 rounded-full blur-[128px] animate-pulse" style={{ animationDelay: '1s' }}></div>

            {/* Content Container - Glass Effect */}
            <div className="relative z-10 flex flex-col items-center p-12 rounded-3xl bg-white/10 dark:bg-white/5 border border-white/20 shadow-2xl backdrop-blur-md">

                {/* Logo Animation */}
                <div className="relative w-32 h-32 mb-6">
                    {/* Ripples */}
                    <div className="absolute inset-0 rounded-full border-4 border-primary/30 animate-[ping_3s_linear_infinite]"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-secondary/30 animate-[ping_3s_linear_infinite]" style={{ animationDelay: '1.5s' }}></div>

                    <div className="relative z-10 w-full h-full flex items-center justify-center bg-white dark:bg-slate-900 rounded-full shadow-glow p-4">
                        <img
                            src="/images/logos/sanchez2-logo.png"
                            alt="Loading..."
                            className="w-full h-full object-contain animate-[pulse_3s_ease-in-out_infinite]"
                        />
                    </div>
                </div>

                <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-widest uppercase mb-2">
                    Guardando
                </h3>
                <p className="text-secondary font-bold text-sm animate-pulse">
                    Procesando tu proyecto...
                </p>

                {/* Liquid Loading Bar */}
                <div className="w-48 h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-6 overflow-hidden relative">
                    <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-secondary w-full animate-[shimmer_2s_infinite] origin-left scale-x-50"></div>
                </div>
            </div>

            <style>{`
        @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
        }
      `}</style>
        </div>
    );
};

export default LiquidLoader;
