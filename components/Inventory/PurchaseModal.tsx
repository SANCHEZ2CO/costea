import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import LiquidModal from '../LiquidModal';

interface PurchaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    ingredients: any[];
}

const PurchaseModal: React.FC<PurchaseModalProps> = ({ isOpen, onClose, onSuccess, ingredients }) => {
    const [loading, setLoading] = useState(false);
    const [purchaseForm, setPurchaseForm] = useState({
        ingredientId: '',
        quantity: '',
        cost: '', // Costo Total
        date: new Date().toISOString().split('T')[0]
    });
    const [selectedIngredient, setSelectedIngredient] = useState<any>(null);

    // Reset form when opening/closing
    useEffect(() => {
        if (!isOpen) {
            setPurchaseForm({
                ingredientId: '',
                quantity: '',
                cost: '',
                date: new Date().toISOString().split('T')[0]
            });
            setSelectedIngredient(null);
        }
    }, [isOpen]);

    // Update selected ingredient details
    useEffect(() => {
        if (purchaseForm.ingredientId) {
            const ing = ingredients.find(i => i.id === purchaseForm.ingredientId);
            setSelectedIngredient(ing || null);
        } else {
            setSelectedIngredient(null);
        }
    }, [purchaseForm.ingredientId, ingredients]);

    const handlePurchase = async () => {
        if (!purchaseForm.ingredientId || !purchaseForm.quantity) return;
        setLoading(true);
        try {
            const { error } = await supabase.rpc('register_purchase', {
                p_ingredient_id: purchaseForm.ingredientId,
                p_quantity: parseFloat(purchaseForm.quantity),
                p_cost: parseFloat(purchaseForm.cost) || 0,
                p_date: new Date(purchaseForm.date).toISOString()
            });

            if (error) throw error;

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error(err);
            alert("Error al registrar compra: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden relative border border-white/20">
                {/* Header */}
                <div className="bg-slate-50 dark:bg-white/5 p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
                    <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-blue-600">shopping_cart_checkout</span>
                        Registrar Entrada
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5">

                    {/* Ingredient Selector */}
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block ml-1">Insumo</label>
                        <div className="relative group">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 group-focus-within:text-blue-500 transition-colors">search</span>
                            <select
                                className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl pl-12 pr-4 py-3 text-sm font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none cursor-pointer text-slate-700 dark:text-slate-200"
                                value={purchaseForm.ingredientId}
                                onChange={e => setPurchaseForm({ ...purchaseForm, ingredientId: e.target.value })}
                            >
                                <option value="">Seleccionar...</option>
                                {ingredients.map(ing => (
                                    <option key={ing.id} value={ing.id}>{ing.name} ({ing.purchase_unit})</option>
                                ))}
                            </select>
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 pointer-events-none">expand_more</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Quantity */}
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block ml-1">Cantidad (+)</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-700 dark:text-slate-200"
                                    value={purchaseForm.quantity}
                                    onChange={e => setPurchaseForm({ ...purchaseForm, quantity: e.target.value })}
                                />
                                {selectedIngredient && (
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase">{selectedIngredient.purchase_unit}</span>
                                )}
                            </div>
                        </div>

                        {/* Date */}
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block ml-1">Fecha</label>
                            <input
                                type="date"
                                className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-700 dark:text-slate-200"
                                value={purchaseForm.date}
                                onChange={e => setPurchaseForm({ ...purchaseForm, date: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Cost (Optional) */}
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block ml-1">Costo Total Compra (Opcional)</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                            <input
                                type="number"
                                placeholder="0.00"
                                className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl pl-8 pr-4 py-3 text-sm font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-700 dark:text-slate-200"
                                value={purchaseForm.cost}
                                onChange={e => setPurchaseForm({ ...purchaseForm, cost: e.target.value })}
                            />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 ml-1">Si se deja vacío, no se recalculará el costo promedio.</p>
                    </div>

                    {/* Preview Info */}
                    {selectedIngredient && purchaseForm.quantity && (
                        <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl p-3 flex items-center justify-between border border-blue-100 dark:border-blue-500/20">
                            <div>
                                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Nuevo Stock Estimado</p>
                                <p className="text-xl font-black text-blue-600 dark:text-blue-400">
                                    {(parseFloat(selectedIngredient.purchase_quantity || 0) + parseFloat(purchaseForm.quantity)).toFixed(2)} {selectedIngredient.purchase_unit}
                                </p>
                            </div>
                            <span className="material-symbols-outlined text-blue-300">update</span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-white/5 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors uppercase tracking-wider text-xs"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handlePurchase}
                        disabled={loading || !purchaseForm.ingredientId || !purchaseForm.quantity}
                        className="flex-[2] bg-slate-900 dark:bg-white text-white dark:text-blue-900 rounded-xl px-6 py-3 font-black uppercase tracking-[0.1em] hover:bg-black dark:hover:bg-indigo-50 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                    >
                        {loading ? 'Guardando...' : 'Confirmar Ingreso'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PurchaseModal;
