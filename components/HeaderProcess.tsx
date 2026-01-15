import React from 'react';
import { Link } from 'react-router-dom';

interface HeaderProcessProps {
    stepText: string;
    activeStep: string;
}

const HeaderProcess: React.FC<HeaderProcessProps> = ({ stepText, activeStep }) => {
    return (
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-surface-light/95 dark:bg-surface-dark/95 backdrop-blur px-6 py-3 shadow-sm">
            <Link to="/" className="flex items-center gap-4">
                <img alt="Sanchez2 Logo" className="h-10 w-auto object-contain" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDlhpBzJ1r32u4dH6Kex0vgTg36Yg7Xga5Z0kiM9PUVnMGYQuUCPFFvmWjHK_OZWpMIIn_wBgV5jYUQD6HWe2OFQ3-dIzxzaIoQZLQdyP58n0oCciUuCzoxBOu7sqlMjWjyafQcqUatNLfxj3ZmLtrWV0V_1y59DpODzPETg__wLp-nUcm721-4eFiUE-ZN7ruyis0zbGxeoGZz1jKdtIU7OejiwO0BE7MV-m6_WhzWf66TTEPrKT69N9RO-xXtK71quGD1aL175gSD"/>
                <div className="h-6 w-px bg-gray-300 dark:bg-gray-700 mx-1"></div>
                <div>
                    <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white leading-tight">COSTEA</h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Nuevo Proyecto</p>
                </div>
            </Link>
            <div className="hidden md:flex items-center gap-3 bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700">
                <span className="text-xs font-semibold text-gray-400 dark:text-gray-500">{activeStep}</span>
                <div className="flex items-center gap-1.5">
                    <div className="size-2 rounded-full bg-primary/20"></div>
                    <div className="size-2.5 rounded-full bg-primary ring-2 ring-primary/30 animate-pulse"></div>
                    <div className="size-2 rounded-full bg-primary/20"></div>
                </div>
                <span className="text-xs font-bold text-primary dark:text-white">{stepText}</span>
            </div>
            <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-300">
                    <span className="material-symbols-outlined text-[18px]">history</span>
                    Historial
                </button>
                <button className="flex items-center gap-2 px-4 py-1.5 rounded-md bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white text-xs font-bold transition-all shadow-md shadow-primary/20">
                    <span className="material-symbols-outlined text-[18px]">save</span>
                    Guardar
                </button>
                <div className="size-8 rounded-full bg-cover bg-center border border-gray-200 dark:border-gray-700 ml-2" style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBypRm45_Y3Tu354h3XulcDgMn2NrTITwff0IuK3CUgfxdu4ZYa_TadeTKjhP-EETLvE8vziHqavjkjU-bDEEeHzNdR-TgqpFSUNfb8OV6IA8u9_yx8UWLjpYxlE9uhN1P1WBmtNbH5jcv16q8ItgNcGP3-yeV2z0vE8K9uaBkBvc8mvDKT91yQiqMbukdgfz_0tyHVe2IQaXLMEyrN8xGwfU1cZ2OMrL-SvYCh8wEzoFXXNSOdggaZddP38IKT9wNUFhdr0FJzZaiD")'}}></div>
            </div>
        </header>
    );
};

export default HeaderProcess;
