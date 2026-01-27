import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import HeaderSimple from '../components/HeaderSimple';
import AuthModal from '../components/AuthModal';
import { useApp } from '../context/AppContext';
import { ShootingStars } from '../App';
import { supabase } from '../services/supabaseClient';
import { formatCurrency } from '../constants';

// Simple types for Dashboard Data
interface DashboardData {
    todaySales: number;
    todayProfit: number; // Est. based on (Price - Cost)
    monthlyFixedCosts: number;
    topProduct: { name: string; count: number } | null;
    last7Days: { date: string; total: number }[];
    recentSales: any[];
}

const HomePage: React.FC = () => {
    const navigate = useNavigate();
    const { user, theme } = useApp();
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

    // Dashboard State
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<DashboardData>({
        todaySales: 0,
        todayProfit: 0,
        monthlyFixedCosts: 0,
        topProduct: null,
        last7Days: [],
        recentSales: []
    });
    const [paymentMethodsMap, setPaymentMethodsMap] = useState<Map<string, string>>(new Map());

    const handleAction = (path: string) => {
        if (!user) {
            setIsAuthModalOpen(true);
        } else {
            navigate(path);
        }
    };

    // --- Computed Theme Colors ---
    const themeColors = useMemo(() => {
        switch (theme) {
            case 'feminine': return { accent: 'text-pink-500', bg: 'bg-pink-500', gradient: 'from-pink-500 to-rose-500', soft: 'bg-pink-50' };
            case 'galaxy': return { accent: 'text-purple-400', bg: 'bg-purple-500', gradient: 'from-purple-500 to-indigo-500', soft: 'bg-purple-500/10' };
            case 'dark': return { accent: 'text-indigo-400', bg: 'bg-indigo-500', gradient: 'from-indigo-500 to-blue-600', soft: 'bg-indigo-500/10' };
            default: return { accent: 'text-blue-600', bg: 'bg-blue-600', gradient: 'from-blue-600 to-indigo-600', soft: 'bg-blue-50' };
        }
    }, [theme]);

    // --- Data Fetching ---
    useEffect(() => {
        if (!user) return; // Only fetch if logged in

        const fetchDashboard = async () => {
            setLoading(true);
            try {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const todayIso = today.toISOString();

                // 1. Fetch Today's Sales
                const { data: salesToday } = await supabase
                    .from('sales')
                    .select('total_sale, net_profit')
                    .gte('created_at', todayIso);

                let totalSales = 0;
                let grossProfit = 0;

                if (salesToday) {
                    salesToday.forEach((sale: any) => {
                        totalSales += sale.total_sale || 0;
                        grossProfit += sale.net_profit || 0;
                    });
                }

                // 2. Monthly Fixed Costs
                const { data: expenses } = await supabase.from('fixed_expenses').select('amount');
                const monthlyFixed = expenses?.reduce((acc, curr) => acc + curr.amount, 0) || 0;
                const dailyFixed = monthlyFixed / 30;

                const realProfit = grossProfit - dailyFixed;

                // 3. Last 7 Days Trend
                const info7Days: { date: string; total: number }[] = [];
                for (let i = 6; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    d.setHours(0, 0, 0, 0);
                    const start = d.toISOString();
                    const end = new Date(d);
                    end.setHours(23, 59, 59, 999);

                    const { data: daySales } = await supabase
                        .from('sales')
                        .select('total_sale')
                        .gte('created_at', start)
                        .lte('created_at', end.toISOString());

                    const dayTotal = daySales?.reduce((sum, s) => sum + (s.total_sale || 0), 0) || 0;
                    info7Days.push({
                        date: d.toLocaleDateString('es-CO', { weekday: 'short' }),
                        total: dayTotal
                    });
                }

                // 4. Recent Sales
                const { data: recent } = await supabase
                    .from('sales')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(5);

                // Fetch PMs for names
                const { data: pms } = await supabase.from('payment_methods').select('id, name');
                const pmMap = new Map<string, string>();
                pms?.forEach(pm => pmMap.set(pm.id, pm.name));
                setPaymentMethodsMap(pmMap);

                setData({
                    todaySales: totalSales,
                    todayProfit: realProfit,
                    monthlyFixedCosts: monthlyFixed,
                    topProduct: null,
                    last7Days: info7Days,
                    recentSales: recent || []
                });

            } catch (err) {
                console.error("Dashboard Error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboard();
    }, [user]);

    // Max value for Chart scaling
    const maxChartValue = useMemo(() => {
        return Math.max(...data.last7Days.map(d => d.total), 1000); // Min 1000 to avoid div/0
    }, [data.last7Days]);


    return (
        <div className="min-h-screen font-display flex flex-col transition-all duration-500 overflow-hidden"
            style={{ backgroundColor: 'var(--theme-bg-primary)' }}>

            <HeaderSimple />
            <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

            {/* Background Elements (Galaxy) */}
            {theme === 'galaxy' && <ShootingStars />}

            <main className="flex-1 overflow-y-auto px-4 py-8 pb-24 md:px-8">
                <div className="max-w-6xl mx-auto animate-fade-in-up">

                    {/* Welcome Header */}
                    <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight mb-2">
                                Hola, {user?.email ? user.email.split('@')[0] : 'Emprendedor'} 👋
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">
                                Aquí está el pulso de tu negocio hoy.
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <span className={`px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest border border-current ${themeColors.accent} opacity-60`}>
                                {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </span>
                        </div>
                    </div>

                    {/* KPI Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                        {/* Card 1: Sales */}
                        <div className="glass-panel p-6 rounded-3xl relative overflow-hidden group">
                            <div className={`absolute top-0 right-0 p-4 opacity-10 ${themeColors.accent}`}>
                                <span className="material-symbols-outlined text-8xl">attach_money</span>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 font-bold text-sm uppercase tracking-wider mb-1">Ventas de Hoy</p>
                            <h3 className="text-4xl font-black text-slate-800 dark:text-white mb-2 tracking-tight">
                                {loading ? '...' : formatCurrency(data.todaySales)}
                            </h3>
                            <div className="flex items-center gap-1 text-green-500 text-xs font-bold bg-green-500/10 self-start inline-flex px-2 py-1 rounded-lg">
                                <span className="material-symbols-outlined text-sm">trending_up</span>
                                <span>En tiempo real</span>
                            </div>
                        </div>

                        {/* Card 2: Profit */}
                        <div className="glass-panel p-6 rounded-3xl relative overflow-hidden">
                            <div className={`absolute top-0 right-0 p-4 opacity-10 text-emerald-500`}>
                                <span className="material-symbols-outlined text-8xl">savings</span>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 font-bold text-sm uppercase tracking-wider mb-1">Utilidad Real (Hoy)</p>
                            <h3 className={`text-4xl font-black mb-2 tracking-tight ${data.todayProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {loading ? '...' : formatCurrency(data.todayProfit)}
                            </h3>
                            <p className="text-xs text-slate-400">Bruta - (Gastos Fijos / 30)</p>
                        </div>

                        {/* Card 3: Fixed Costs */}
                        <div className="glass-panel p-6 rounded-3xl relative overflow-hidden">
                            <div className={`absolute top-0 right-0 p-4 opacity-10 text-rose-500`}>
                                <span className="material-symbols-outlined text-8xl">account_balance_wallet</span>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 font-bold text-sm uppercase tracking-wider mb-1">Gastos Fijos (Mes)</p>
                            <h3 className="text-4xl font-black text-slate-800 dark:text-white mb-2 tracking-tight">
                                {loading ? '...' : formatCurrency(data.monthlyFixedCosts)}
                            </h3>
                            <p className="text-xs text-slate-400">Proyección mensual</p>
                        </div>
                    </div>

                    {/* Main Section: Chart & Quick Actions */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                        {/* Chart Area */}
                        <div className="glass-panel p-8 rounded-3xl flex flex-col h-80">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-black text-slate-800 dark:text-white">Tendencia de Ventas</h3>
                                <div className="flex gap-2">
                                    <span className="size-2 rounded-full bg-blue-500"></span>
                                    <span className="text-xs text-slate-400 font-bold uppercase">Últimos 7 días</span>
                                </div>
                            </div>

                            {/* CSS Bar Chart */}
                            <div className="flex-1 flex items-end justify-between gap-2 px-2">
                                {data.last7Days.map((day, i) => (
                                    <div key={i} className="flex flex-col items-center gap-2 flex-1 group cursor-pointer">
                                        <div className="relative w-full flex justify-end flex-col h-40">
                                            {/* Tooltip */}
                                            <div className="opacity-0 group-hover:opacity-100 absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs font-bold py-1 px-2 rounded-lg pointer-events-none transition-opacity whitespace-nowrap z-10">
                                                {formatCurrency(day.total)}
                                            </div>
                                            {/* Bar */}
                                            <div
                                                className={`w-full rounded-t-xl transition-all duration-500 hover:opacity-80 ${day.total === 0 ? 'bg-slate-100 dark:bg-white/5 h-1' : `bg-gradient-to-t ${themeColors.gradient}`}`}
                                                style={{ height: `${Math.max((day.total / maxChartValue) * 100, 2)}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">{day.date}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Smart Actions Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* POS CTA */}
                            <button
                                onClick={() => handleAction('/sales')}
                                className="col-span-1 sm:col-span-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white p-6 rounded-3xl shadow-xl shadow-blue-500/20 group relative overflow-hidden transition-all hover:-translate-y-1"
                            >
                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                                <div className="relative z-10 flex flex-col items-start h-full justify-between">
                                    <div className="bg-white/20 p-3 rounded-2xl mb-4 backdrop-blur-sm group-hover:scale-110 transition-transform">
                                        <span className="material-symbols-outlined text-3xl">point_of_sale</span>
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black mb-1">Nueva Venta</h3>
                                        <p className="text-blue-100 text-sm font-medium">Registrar pedido y facturar</p>
                                    </div>
                                </div>
                            </button>

                            {/* Inventory */}
                            <button
                                onClick={() => handleAction('/inventory')}
                                className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-white/5 hover:border-purple-500/50 hover:shadow-lg transition-all group flex flex-col justify-between h-40"
                            >
                                <div className="size-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 flex items-center justify-center">
                                    <span className="material-symbols-outlined">inventory_2</span>
                                </div>
                                <div className="text-left">
                                    <h4 className="font-bold text-slate-800 dark:text-white">Inventario</h4>
                                    <p className="text-xs text-slate-400 mt-1">Ver Stock y Compras</p>
                                </div>
                            </button>

                            {/* Costing */}
                            <button
                                onClick={() => handleAction('/costing-engine')}
                                className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-white/5 hover:border-pink-500/50 hover:shadow-lg transition-all group flex flex-col justify-between h-40"
                            >
                                <div className="size-10 rounded-xl bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-300 flex items-center justify-center">
                                    <span className="material-symbols-outlined">calculate</span>
                                </div>
                                <div className="text-left">
                                    <h4 className="font-bold text-slate-800 dark:text-white">Costear</h4>
                                    <p className="text-xs text-slate-400 mt-1">Crear Receta</p>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Recent Transactions List (New) */}
                    <div className="glass-panel rounded-3xl p-6 mt-8 overflow-hidden">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-slate-800 dark:text-white">Transacciones Recientes</h3>
                            <button onClick={() => navigate('/sales')} className="text-xs text-blue-500 font-bold hover:underline">Ver Todo</button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-white/5">
                                        <th className="py-3 font-bold">Hora</th>
                                        <th className="py-3 font-bold">Cliente</th>
                                        <th className="py-3 font-bold">Método</th>
                                        <th className="py-3 font-bold text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                                    {data.recentSales.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="py-8 text-center text-slate-400 text-sm">
                                                No hay ventas registradas aún.
                                            </td>
                                        </tr>
                                    ) : (
                                        data.recentSales.map((sale) => (
                                            <tr key={sale.id} className="group hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                                <td className="py-3 text-xs font-bold text-slate-500">
                                                    {new Date(sale.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                                <td className="py-3 text-sm font-bold text-slate-700 dark:text-gray-200">
                                                    {sale.customer_name || 'Cliente Mostrador'}
                                                </td>
                                                <td className="py-3">
                                                    <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300">
                                                        {paymentMethodsMap.get(sale.payment_method_id) || '---'}
                                                    </span>
                                                </td>
                                                <td className="py-3 text-right font-black text-slate-800 dark:text-white text-sm">
                                                    {formatCurrency(sale.total_sale)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
};

export default HomePage;