import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { formatCurrency } from '../constants';
import LiquidLoader from './LiquidLoader';

interface SaleDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    saleId: string | null;
    onUpdate: () => void; // Refresh movements list
}

const SaleDetailModal: React.FC<SaleDetailModalProps> = ({ isOpen, onClose, saleId, onUpdate }) => {
    const [loading, setLoading] = useState(true);
    const [sale, setSale] = useState<any>(null);
    const [items, setItems] = useState<any[]>([]);

    // Edit States
    const [isEditing, setIsEditing] = useState(false);
    const [customerName, setCustomerName] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('');
    const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen && saleId) {
            fetchSaleDetails();
            fetchPaymentMethods();
        } else {
            setSale(null);
            setItems([]);
            setIsEditing(false);
        }
    }, [isOpen, saleId]);

    const fetchPaymentMethods = async () => {
        const { data } = await supabase.from('payment_methods').select('*').eq('active', true);
        if (data) setPaymentMethods(data);
    };

    const fetchSaleDetails = async () => {
        setLoading(true);
        try {
            // Fetch Sale
            const { data: saleData, error: saleError } = await supabase
                .from('sales')
                .select(`
                    *,
                    customers ( name )
                `)
                .eq('id', saleId)
                .single();

            if (saleError) throw saleError;
            setSale(saleData);
            setCustomerName(saleData.customers?.name || 'Cliente General');
            setPaymentMethod(saleData.payment_method || 'Efectivo');

            // Fetch Items
            const { data: itemsData, error: itemsError } = await supabase
                .from('sale_items')
                .select(`
                    *,
                    dishes ( name )
                `)
                .eq('sale_id', saleId);

            if (itemsError) throw itemsError;
            setItems(itemsData || []);
        } catch (err) {
            console.error('Error details:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Find customer ID if name matches existing customer? 
            // The RPC `update_sale` expects a customer_id. 
            // In the simple `register_sale` (and current SalesPage), we might store name directly or link a customer.
            // SalesPage stores `customer_name` string AND uses `selectedCustomerId`.
            // Let's try to find if a customer exists with this name, or keep the existing ID if name didn't change enough to invalidate it.
            // For MVP, we pass the existing `sale.customer_id` if defined, or we might need to implement a customer picker here too.
            // Simplification: Ask user to pick customer ONLY if they want to change it? 
            // For this version: We will just update Payment Method and Notes/Customer Name string if that's what `update_sale` needs.
            // Warning: `update_sale` RPC I wrote REQUIRES `p_customer_id`.
            // We need to fetch the current customer_id from `sales` table? Or `movements` table?
            // The `sale` object has `customer_id` if we modify the select query.
            // Update fetchSaleDetails to select customer_id from sales if it exists (it wasn't in my select * above implicitly if it's not in DB schema yet? 
            // Wait, schema has `customer_name`, `customer_phone`, but NO `customer_id` column in `sales` table in schema.sql?
            // Checking schema.sql: "customer_name text, customer_phone text". NO customer_id in `sales`.
            // BUT `movements` table has `customer_id`.
            // My `update_sale` RPC signature: `p_customer_id UUID`.
            // If `sales` table doesn't have `customer_id`, where do I get it?
            // Answer: `movements` table.

            // Let's get customer_id from related movement first.
            // const { data: movementData } = await supabase.from('movements').select('customer_id').eq('sale_id', saleId).single();
            // const currentCustomerId = movementData?.customer_id;

            const { error } = await supabase.rpc('update_sale', {
                p_sale_id: saleId,
                p_customer_name: customerName, // Ignored by RPC but kept for signature
                p_customer_id: sale.customer_id || null, // Preserve existing customer ID
                p_payment_method: paymentMethod,
                p_items: null, // Not updating items yet
                p_status: 'CONFIRMADO' // Maintain status
            });

            if (error) throw error;

            setIsEditing(false);
            onUpdate();
            onClose();

        } catch (err: any) {
            console.error(err);
            alert('Error al guardar: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleVoid = async () => {
        if (!confirm('¿Seguro que deseas ANULAR esta venta? El inventario será devuelto.')) return;
        setSaving(true);
        try {
            const { error } = await supabase.rpc('update_sale', {
                p_sale_id: saleId,
                p_customer_name: customerName,
                p_customer_id: sale.customer_id || null, // Preserve customer even if voided
                p_payment_method: paymentMethod,
                p_items: null,
                p_status: 'ANULADO'
            });

            if (error) throw error;
            onUpdate();
            onClose();
        } catch (err: any) {
            console.error(err);
            alert('Error al anular: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose}></div>

            <div className="relative w-full max-w-2xl bg-white dark:bg-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-scale-in">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-white dark:bg-slate-800 z-10">
                    <div className="flex items-center gap-4">
                        <div className="size-12 rounded-2xl bg-green-50 dark:bg-green-900/20 text-green-600 flex items-center justify-center">
                            <span className="material-symbols-outlined text-2xl">receipt_long</span>
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 dark:text-white">
                                Detalle de Venta
                            </h2>
                            <p className="text-slate-400 font-bold text-xs uppercase tracking-wider">
                                {saleId ? `#${saleId.slice(0, 8)}` : 'Cargando...'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="size-10 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {loading ? (
                        <div className="py-20 flex justify-center">
                            <LiquidLoader />
                        </div>
                    ) : !sale ? (
                        <div className="text-center text-slate-400">Venta no encontrada</div>
                    ) : (
                        <div className="space-y-8">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                                    <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Total</p>
                                    <p className="text-lg font-black text-green-600">{formatCurrency(sale.total)}</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                                    <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Fecha</p>
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                        {new Date(sale.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 col-span-2">
                                    <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Cliente</p>
                                    {isEditing ? (
                                        <input
                                            value={customerName}
                                            onChange={e => setCustomerName(e.target.value)}
                                            className="w-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 text-sm font-bold outline-none focus:border-blue-500"
                                        />
                                    ) : (
                                        <p className="text-sm font-bold text-slate-700 dark:text-white truncate">
                                            {sale.customer_name || 'Cliente Mostrador'}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Payment Method */}
                            <div>
                                <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-slate-400">payments</span>
                                    Método de Pago
                                </h3>
                                {isEditing ? (
                                    <div className="flex flex-wrap gap-2">
                                        {paymentMethods.map(pm => (
                                            <button
                                                key={pm.id}
                                                onClick={() => setPaymentMethod(pm.name)}
                                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${paymentMethod === pm.name
                                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                                    : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200'}`}
                                            >
                                                {pm.name}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 font-bold text-sm">
                                        <span>{sale.payment_methods?.name || 'Efectivo'}</span>
                                    </div>
                                )}
                            </div>

                            {/* Items List */}
                            <div>
                                <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-slate-400">shopping_cart</span>
                                    Productos Vendidos
                                </h3>
                                <div className="bg-slate-50 dark:bg-white/5 rounded-2xl overflow-hidden border border-slate-100 dark:border-white/5">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-100 dark:bg-white/5">
                                            <tr>
                                                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Producto</th>
                                                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase text-right">Cant.</th>
                                                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase text-right">Precio</th>
                                                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase text-right">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                            {items.map(item => (
                                                <tr key={item.id}>
                                                    <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-200 text-sm">
                                                        {item.dishes?.name}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-sm text-right">
                                                        {item.quantity}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-sm text-right">
                                                        {formatCurrency(item.unit_price)}
                                                    </td>
                                                    <td className="px-4 py-3 font-bold text-slate-800 dark:text-white text-sm text-right">
                                                        {formatCurrency(item.quantity * item.unit_price)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Extras / Delivery */}
                            {(sale.delivery_fee > 0 || sale.extras_amount > 0) && (
                                <div className="border-t border-slate-100 dark:border-white/5 pt-4 space-y-2">
                                    {sale.delivery_fee > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Domicilio</span>
                                            <span className="font-bold text-slate-800 dark:text-white">{formatCurrency(sale.delivery_fee)}</span>
                                        </div>
                                    )}
                                    {sale.extras_amount > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Extras ({sale.extras_details})</span>
                                            <span className="font-bold text-slate-800 dark:text-white">{formatCurrency(sale.extras_amount)}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>
                    )}
                </div>

                {/* Footer Buttons */}
                <div className="p-6 bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-white/5 flex justify-between gap-4">
                    {!isEditing ? (
                        <>
                            <button
                                onClick={() => handleVoid()}
                                className="px-6 py-3 rounded-xl bg-red-50 text-red-600 font-bold hover:bg-red-100 transition-colors flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined">block</span>
                                Anular Venta
                            </button>
                            <button
                                onClick={() => setIsEditing(true)}
                                className="px-8 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined">edit</span>
                                Editar
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => { setIsEditing(false); setCustomerName(sale.customer_name); }}
                                className="px-6 py-3 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-300 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-8 py-3 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 transition-colors shadow-lg shadow-green-500/30 flex items-center gap-2"
                            >
                                {saving ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : <span className="material-symbols-outlined">save</span>}
                                Guardar Cambios
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SaleDetailModal;
