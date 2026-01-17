import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

interface HeaderProps {
    showProfile?: boolean;
}

const HeaderSimple: React.FC<HeaderProps> = ({ showProfile = true }) => {
    const { user, signOut, organization } = useApp();
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const handleLogout = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsMenuOpen(false);
        try {
            await signOut();
            navigate('/login');
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Get user initials or email initial
    const getInitials = () => {
        if (!user || (!user.email && !user.user_metadata.full_name)) return 'U';
        const name = user.user_metadata.full_name || user.email;
        return name.charAt(0).toUpperCase();
    };

    const getDisplayName = () => {
        if (!user) return '';
        if (user.user_metadata.full_name) return user.user_metadata.full_name;
        return user.email?.split('@')[0];
    };

    return (
        <header className="w-full py-2 px-4 md:px-8 flex justify-between items-center z-20 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-md sticky top-0 border-b border-gray-100 dark:border-white/5">
            <Link to="/" className="flex items-center gap-3 group">
                <div className="h-10 w-10 relative transition-transform group-hover:scale-105">
                    <img alt={organization?.name || "Logo"} className="h-full w-full object-contain" src={organization?.logo || "/images/logos/sanchez2-logo.png"} />
                </div>
            </Link>

            <div className="flex items-center gap-4">
                {showProfile && user ? (
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="flex items-center gap-2 bg-white dark:bg-white/10 px-3 py-1.5 rounded-full border border-gray-200 dark:border-white/10 shadow-sm hover:shadow-md transition-all active:scale-95"
                        >
                            <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-secondary to-primary flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
                                {getInitials()}
                            </div>
                            <span className="text-sm font-medium text-neutral-dark dark:text-white mr-1 max-w-[100px] truncate md:max-w-none">
                                {getDisplayName()}
                            </span>
                            <span className="material-symbols-outlined text-[16px] text-gray-400">expand_more</span>
                        </button>

                        {/* Dropdown Menu */}
                        {isMenuOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-surface-dark rounded-xl shadow-xl border border-gray-100 dark:border-white/10 py-2 animate-fade-in-up origin-top-right overflow-hidden">
                                <div className="px-4 py-2 border-b border-gray-50 dark:border-white/5 mb-1">
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Cuenta</p>
                                    <p className="text-sm text-slate-800 dark:text-white font-medium truncate" title={user.email}>{user.email}</p>
                                </div>
                                <Link
                                    to="/settings"
                                    className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    <span className="material-symbols-outlined text-[18px]">settings</span>
                                    Ajustes
                                </Link>
                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[18px]">logout</span>
                                    Cerrar Sesión
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <Link to="/login" className="text-sm font-bold text-secondary hover:underline">
                        Iniciar Sesión
                    </Link>
                )}
            </div>
        </header>
    );
};

export default HeaderSimple;