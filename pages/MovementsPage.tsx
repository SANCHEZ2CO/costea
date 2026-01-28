import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabaseClient';
import { useNavigate } from 'react-router-dom';
import HeaderSimple from '../components/HeaderSimple';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../constants';
import { Movement, MovementLine, MovementType, MovementStatus } from '../types';
import LiquidModal from '../components/LiquidModal';

// Type badge colors
const TYPE_COLORS: Record<MovementType, { bg: string; text: string; icon: string }> = {
    'VENTA': { bg: 'bg-emerald-100 dark:bg-emerald-500/20', text: 'text-emerald-700 dark:text-emerald-400', icon: 'point_of_sale' },
    'COMPRA': { bg: 'bg-blue-100 dark:bg-blue-500/20', text: 'text-blue-700 dark:text-blue-400', icon: 'inventory_2' },
    'GASTO': { bg: 'bg-amber-100 dark:bg-amber-500/20', text: 'text-amber-700 dark:text-amber-400', icon: 'receipt_long' },
    'AJUSTE': { bg: 'bg-slate-100 dark:bg-slate-500/20', text: 'text-slate-700 dark:text-slate-400', icon: 'tune' }
};

const STATUS_COLORS: Record<MovementStatus, { bg: string; text: string }> = {
    'CONFIRMADO': { bg: 'bg-green-100 dark:bg-green-500/20', text: 'text-green-700 dark:text-green-400' },
    'COMPLETADO': { bg: 'bg-green-100 dark:bg-green-500/20', text: 'text-green-700 dark:text-green-400' },
    'BORRADOR': { bg: 'bg-yellow-100 dark:bg-yellow-500/20', text: 'text-yellow-700 dark:text-yellow-400' },
    'ANULADO': { bg: 'bg-red-100 dark:bg-red-500/20', text: 'text-red-700 dark:text-red-400' }
};

type FilterType = 'ALL' | MovementType;

const MovementsPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useApp();

    // Filter states
    const [filterType, setFilterType] = useState<FilterType>('ALL');
    const [dateFrom, setDateFrom] = useState<string>('');
    const [dateTo, setDateTo] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');

    // Data states
    const [movements, setMovements] = useState<Movement[]>([]);
    const [loading, setLoading] = useState(true);

    // Detail modal
    const [selectedMovement, setSelectedMovement] = useState<Movement | null>(null);
    const [movementLines, setMovementLines] = useState<MovementLine[]>([]);
    const [loadingLines, setLoadingLines] = useState(false);

    // Fetch movements
    useEffect(() => {
        if (!user) return;
        fetchMovements();
    }, [user]);

    const fetchMovements = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('movements')
                .select(`
                    *,
                    customers (id, name, phone),
                    providers (id, name, phone),
                    services (id, name)
                `)
                .order('date', { ascending: false })
                .limit(200);

            if (error) throw error;
            setMovements(data || []);
        } catch (err) {
            console.error('Error fetching movements:', err);
        } finally {
            setLoading(false);
        }
    };

    // Fetch movement lines when detail modal opens
    const fetchMovementLines = async (movementId: string) => {
        setLoadingLines(true);
        try {
            const { data, error } = await supabase
                .from('movement_lines')
                .select(`
                    *,
                    ingredients (id, name),
                    dishes (id, name),
                    expense_categories (id, name)
                `)
                .eq('movement_id', movementId);

            if (error) throw error;
            setMovementLines(data || []);
        } catch (err) {
            console.error('Error fetching movement lines:', err);
        } finally {
            setLoadingLines(false);
        }
    };

    const handleViewDetails = async (movement: Movement) => {
        setSelectedMovement(movement);
        await fetchMovementLines(movement.id);
    };

    // Filtered movements
    const filteredMovements = useMemo(() => {
        let result = movements;

        // Type filter
        if (filterType !== 'ALL') {
            result = result.filter(m => m.type === filterType);
        }

        // Date range filter
        if (dateFrom) {
            const fromDate = new Date(dateFrom);
            result = result.filter(m => new Date(m.date) >= fromDate);
        }
        if (dateTo) {
            const toDate = new Date(dateTo);
            toDate.setHours(23, 59, 59, 999);
            result = result.filter(m => new Date(m.date) <= toDate);
        }

        // Search filter (by document number or third party name)
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(m => {
                const docNum = m.document_number?.toLowerCase() || '';
                const customerName = (m as any).customers?.name?.toLowerCase() || '';
                const providerName = (m as any).providers?.name?.toLowerCase() || '';
                const serviceName = (m as any).services?.name?.toLowerCase() || '';
                return docNum.includes(query) ||
                    customerName.includes(query) ||
                    providerName.includes(query) ||
                    serviceName.includes(query);
            });
        }

        return result;
    }, [movements, filterType, dateFrom, dateTo, searchQuery]);

    // Get third party name for display
    const getThirdPartyName = (movement: Movement): string => {
        const m = movement as any;
        if (m.customers?.name) return m.customers.name;
        if (m.providers?.name) return m.providers.name;
        if (m.services?.name) return m.services.name;
        return '—';
    };

    // Get third party type label
    const getThirdPartyLabel = (movement: Movement): string => {
        const m = movement as any;
        if (m.customers?.name) return 'Cliente';
        if (m.providers?.name) return 'Proveedor';
        if (m.services?.name) return 'Servicio';
        return '';
    };

    // Format date
    const formatDate = (dateStr: string): string => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-CO', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Get glow color based on filter
    const getGlowGradient = () => {
        switch (filterType) {
            case 'VENTA': return 'from-emerald-500, to-green-500, from-emerald-500';
            case 'COMPRA': return 'from-blue-500, to-cyan-500, from-blue-500';
            case 'GASTO': return 'from-amber-500, to-orange-500, from-amber-500';
            default: return 'from-indigo-500, via-purple-500, to-pink-500';
        }
    };

    return (
        <div className="bg-[#F8F9FB] dark:bg-slate-900 min-h-screen font-display text-slate-800 dark:text-gray-100 transition-colors duration-500 relative flex flex-col">
            <HeaderSimple />

            <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-8 pt-8 pb-20 flex flex-col gap-8">
                {/* Header */}
                <header className="flex flex-col gap-4 relative mt-2">
                    <div className="flex items-center justify-between mb-2">
                        <button onClick={() => navigate('/home')} className="flex items-center gap-2 text-slate-400 hover:text-indigo-500 transition-colors">
                            <span className="material-symbols-outlined text-2xl">arrow_back</span>
                            <span className="text-[10px] uppercase font-black tracking-widest">Panel Principal</span>
                        </button>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                        📊 Movimientos
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">
                        Registro consolidado de ingresos y egresos
                    </p>
                </header>

                {/* Filters Bar */}
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                    {/* Type Tabs */}
                    <div className="flex gap-2 p-1.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
                        {(['ALL', 'VENTA', 'COMPRA', 'GASTO'] as FilterType[]).map(type => (
                            <button
                                key={type}
                                onClick={() => setFilterType(type)}
                                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${filterType === type
                                        ? type === 'ALL'
                                            ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30'
                                            : type === 'VENTA'
                                                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                                                : type === 'COMPRA'
                                                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                                                    : 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                                        : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5'
                                    }`}
                            >
                                {type === 'ALL' ? 'Todos' : type === 'VENTA' ? 'Ventas' : type === 'COMPRA' ? 'Compras' : 'Gastos'}
                            </button>
                        ))}
                    </div>

                    {/* Date Filters & Search */}
                    <div className="flex flex-wrap gap-3 items-center">
                        <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-white/10 px-3 py-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Desde</span>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={e => setDateFrom(e.target.value)}
                                className="bg-transparent text-sm font-bold text-slate-700 dark:text-white outline-none"
                            />
                        </div>
                        <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-white/10 px-3 py-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Hasta</span>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={e => setDateTo(e.target.value)}
                                className="bg-transparent text-sm font-bold text-slate-700 dark:text-white outline-none"
                            />
                        </div>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-lg">search</span>
                            <input
                                type="text"
                                placeholder="Buscar..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm font-bold outline-none focus:border-indigo-500 transition-all w-48"
                            />
                        </div>
                    </div>
                </div>

                {/* Movements List */}
                <div className="relative group animate-fade-in-up">
                    {/* AI Arc Glow Effect */}
                    <div className="absolute inset-[-2px] rounded-[34px] overflow-hidden opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <div
                            className="absolute inset-[-100%] animate-[spin_4s_linear_infinite] blur-md will-change-transform"
                            style={{
                                background: `conic-gradient(${getGlowGradient()})`
                            }}
                        />
                    </div>

                    <div className="relative bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-[32px] shadow-2xl border border-white/20 dark:border-white/10 overflow-hidden min-h-[500px] flex flex-col">
                        {/* List Header */}
                        <div className="hidden md:grid grid-cols-[0.8fr,1fr,0.8fr,1.2fr,0.8fr,1fr,0.5fr] gap-4 px-8 py-5 bg-white/50 dark:bg-white/5 border-b border-white/40 dark:border-white/5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                            <div>Fecha</div>
                            <div>Documento</div>
                            <div>Tipo</div>
                            <div>Tercero</div>
                            <div>Estado</div>
                            <div className="text-right">Total</div>
                            <div className="text-right">Acciones</div>
                        </div>

                        <div className="flex-1 divide-y divide-slate-100 dark:divide-white/5">
                            {loading ? (
                                <div className="py-32 flex flex-col items-center justify-center text-slate-300 space-y-4">
                                    <span className="material-symbols-outlined text-5xl animate-spin text-indigo-500">progress_activity</span>
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em]">Cargando movimientos...</p>
                                </div>
                            ) : filteredMovements.length === 0 ? (
                                <div className="py-32 flex flex-col items-center justify-center text-slate-300 space-y-4">
                                    <span className="material-symbols-outlined text-6xl">inbox</span>
                                    <p className="text-sm font-bold">No hay movimientos registrados</p>
                                    <p className="text-xs text-slate-400">Las ventas, compras y gastos aparecerán aquí</p>
                                </div>
                            ) : (
                                filteredMovements.map(movement => {
                                    const typeStyle = TYPE_COLORS[movement.type];
                                    const statusStyle = STATUS_COLORS[movement.status];
                                    const isIncome = movement.type === 'VENTA';

                                    return (
                                        <div
                                            key={movement.id}
                                            className="grid grid-cols-[1fr,auto] md:grid-cols-[0.8fr,1fr,0.8fr,1.2fr,0.8fr,1fr,0.5fr] gap-3 px-4 py-4 md:px-8 md:py-4 items-center hover:bg-indigo-50/50 dark:hover:bg-indigo-500/5 transition-all"
                                        >
                                            {/* Date */}
                                            <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
                                                {formatDate(movement.date)}
                                            </div>

                                            {/* Document Number */}
                                            <div className="font-bold text-slate-800 dark:text-white">
                                                {movement.document_number || `#${movement.id.substring(0, 8)}`}
                                            </div>

                                            {/* Type Badge */}
                                            <div>
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold ${typeStyle.bg} ${typeStyle.text}`}>
                                                    <span className="material-symbols-outlined text-sm">{typeStyle.icon}</span>
                                                    {movement.type}
                                                </span>
                                            </div>

                                            {/* Third Party */}
                                            <div>
                                                <p className="font-bold text-slate-800 dark:text-white text-sm">{getThirdPartyName(movement)}</p>
                                                <p className="text-[10px] text-slate-400 font-medium">{getThirdPartyLabel(movement)}</p>
                                            </div>

                                            {/* Status */}
                                            <div>
                                                <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${statusStyle.bg} ${statusStyle.text}`}>
                                                    {movement.status}
                                                </span>
                                            </div>

                                            {/* Total */}
                                            <div className={`text-right font-black text-lg ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                                {isIncome ? '+' : '-'}{formatCurrency(Math.abs(movement.total))}
                                            </div>

                                            {/* Actions */}
                                            <div className="flex justify-end">
                                                <button
                                                    onClick={() => handleViewDetails(movement)}
                                                    className="size-9 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-500 hover:bg-indigo-100 hover:text-indigo-600 dark:hover:bg-indigo-500/20 dark:hover:text-indigo-400 transition-all"
                                                >
                                                    <span className="material-symbols-outlined text-lg">visibility</span>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Footer Stats */}
                        {!loading && filteredMovements.length > 0 && (
                            <div className="px-8 py-4 bg-slate-50/80 dark:bg-slate-800/50 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                                <p className="text-xs font-bold text-slate-400">
                                    {filteredMovements.length} movimiento{filteredMovements.length !== 1 ? 's' : ''}
                                </p>
                                <div className="flex gap-6">
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Ingresos</p>
                                        <p className="font-black text-emerald-600 dark:text-emerald-400">
                                            +{formatCurrency(filteredMovements.filter(m => m.type === 'VENTA').reduce((acc, m) => acc + m.total, 0))}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Egresos</p>
                                        <p className="font-black text-red-600 dark:text-red-400">
                                            -{formatCurrency(filteredMovements.filter(m => m.type !== 'VENTA').reduce((acc, m) => acc + m.total, 0))}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Detail Modal */}
            <LiquidModal
                isOpen={!!selectedMovement}
                onClose={() => { setSelectedMovement(null); setMovementLines([]); }}
                title={`Detalle de ${selectedMovement?.type || 'Movimiento'}`}
                size="lg"
            >
                {selectedMovement && (
                    <div className="space-y-6">
                        {/* Header Info */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Documento</p>
                                <p className="font-bold text-slate-800 dark:text-white">{selectedMovement.document_number}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Fecha</p>
                                <p className="font-bold text-slate-800 dark:text-white">{formatDate(selectedMovement.date)}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Estado</p>
                                <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${STATUS_COLORS[selectedMovement.status].bg} ${STATUS_COLORS[selectedMovement.status].text}`}>
                                    {selectedMovement.status}
                                </span>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Tercero</p>
                                <p className="font-bold text-slate-800 dark:text-white">{getThirdPartyName(selectedMovement)}</p>
                            </div>
                        </div>

                        {/* Notes */}
                        {selectedMovement.notes && (
                            <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-4">
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Notas</p>
                                <p className="text-sm text-slate-600 dark:text-slate-300">{selectedMovement.notes}</p>
                            </div>
                        )}

                        {/* Line Items */}
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-3">Detalle de Líneas</p>
                            {loadingLines ? (
                                <div className="py-8 flex justify-center">
                                    <span className="material-symbols-outlined animate-spin text-indigo-500">progress_activity</span>
                                </div>
                            ) : movementLines.length === 0 ? (
                                <p className="text-sm text-slate-400 italic py-4 text-center">Sin líneas de detalle</p>
                            ) : (
                                <div className="bg-slate-50 dark:bg-white/5 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-white/10">
                                    {movementLines.map(line => (
                                        <div key={line.id} className="flex items-center justify-between px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="size-8 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-indigo-600 dark:text-indigo-400 text-sm">
                                                        {(line as any).dishes ? 'lunch_dining' : (line as any).ingredients ? 'inventory_2' : 'receipt'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800 dark:text-white text-sm">
                                                        {line.description || (line as any).dishes?.name || (line as any).ingredients?.name || (line as any).expense_categories?.name || 'Item'}
                                                    </p>
                                                    <p className="text-xs text-slate-400">
                                                        {line.quantity} × {formatCurrency(line.unit_price || line.unit_cost || 0)}
                                                    </p>
                                                </div>
                                            </div>
                                            <p className="font-black text-slate-800 dark:text-white">
                                                {formatCurrency(line.line_total)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Total */}
                        <div className={`flex items-center justify-between px-6 py-4 rounded-2xl ${selectedMovement.type === 'VENTA' ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-red-50 dark:bg-red-500/10'}`}>
                            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Total</p>
                            <p className={`text-2xl font-black ${selectedMovement.type === 'VENTA' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                {selectedMovement.type === 'VENTA' ? '+' : '-'}{formatCurrency(selectedMovement.total)}
                            </p>
                        </div>
                    </div>
                )}
            </LiquidModal>
        </div>
    );
};

export default MovementsPage;
