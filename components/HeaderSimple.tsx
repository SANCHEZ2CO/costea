import React from 'react';
import { Link } from 'react-router-dom';

interface HeaderProps {
    showProfile?: boolean;
}

const HeaderSimple: React.FC<HeaderProps> = ({ showProfile = true }) => {
    return (
        <header className="w-full py-6 px-4 md:px-8 flex justify-between items-center z-10 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-md sticky top-0 border-b border-gray-100 dark:border-white/5">
            <Link to="/" className="flex items-center gap-3 group">
                <div className="h-10 w-10 relative transition-transform group-hover:scale-105">
                    <img alt="S2CO Logo" className="h-full w-full object-contain" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAWAsy8wcOb3JNIsqGGANh8KnY6uc4RQviFqv_GHNBGZr8lZdLM0LElZCqRjOUWrfV89aHha22CUVdfjaObwO3FkzNDDiHB4NExDiTY9dvI423sotCywOAdVQ8_FVwM_y2tJECFVObMU6dhIa1NTj-JV8eU2gXlwhD21CTUbr8WU1cASqas1TFETkXMrWTHO5lm-6ghhHc1cQrm3z9q_P9zb60k75LOqxFL9ZeTWr2eFdxTQIZZZfh94b6mOVvtXW6NwZPrlAI-pzQf"/>
                </div>
                <div className="flex flex-col">
                    <h1 className="text-neutral-dark dark:text-white text-xl font-bold tracking-tight leading-none">S2CO</h1>
                    <p className="text-xs text-secondary font-bold tracking-wider">COSTEA</p>
                </div>
            </Link>
            <div className="flex items-center gap-4">
                <Link to="/settings" className="flex items-center justify-center h-10 w-10 rounded-full bg-secondary/10 text-secondary hover:bg-secondary/20 transition-colors cursor-pointer" title="Configuración">
                    <span className="material-symbols-outlined">settings</span>
                </Link>
                {showProfile && (
                    <div className="hidden md:flex items-center gap-2 bg-white dark:bg-white/10 px-3 py-1.5 rounded-full border border-gray-200 dark:border-white/10 shadow-sm">
                        <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-secondary to-primary flex items-center justify-center text-[10px] font-bold text-white shadow-sm">S</div>
                        <span className="text-sm font-medium text-neutral-dark dark:text-white mr-1">Santiago</span>
                    </div>
                )}
            </div>
        </header>
    );
};

export default HeaderSimple;