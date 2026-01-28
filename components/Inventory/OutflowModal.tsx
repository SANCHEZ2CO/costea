import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../services/supabaseClient';
import { OutflowType, ExpenseCategory, PaymentMethod, PurchaseResult } from '../../types';
import { formatCurrency } from '../../constants';

interface OutflowModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (type: OutflowType, result?: PurchaseResult) => void;
    ingredients: any[];
}

const OutflowModal: React.FC<OutflowModalProps> = ({ isOpen, onClose, onSuccess, ingredients }) => {
    // --- State ---
    const [loading, setLoading] = useState(false);
    const [outflowType, setOutflowType] = useState<OutflowType>('COMPRA');

    // Common Fields
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [provider, setProvider] = useState('');
    const [paymentMethodId, setPaymentMethodId] = useState<string>('');

    // Purchase Mode State
    const [selectedIngredientId, setSelectedIngredientId] = useState('');
    const [purchaseQuantity, setPurchaseQuantity] = useState('');
    const [purchaseCost, setPurchaseCost] = useState('');
    const [ingredientSearch, setIngredientSearch] = useState('');
    const [showCreateIngredient, setShowCreateIngredient] = useState(false);
    const [newIngredientUnit, setNewIngredientUnit] = useState('Kg');

    // Expense Mode State
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [expenseAmount, setExpenseAmount] = useState('');
    const [expenseNotes, setExpenseNotes] = useState('');
    const [showCreateCategory, setShowCreateCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');

    // Data
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [categories, setCategories] = useState<ExpenseCategory[]>([]);
    const [frequentProviders, setFrequentProviders] = useState<string[]>([]);

    // --- Effects ---
    useEffect(() => {
        if (isOpen) {
            fetchPaymentMethods();
            fetchCategories();
            fetchFrequentProviders();
        } else {
            resetForm();
        }
    }, [isOpen]);

    const fetchPaymentMethods = async () => {
        const { data } = await supabase.from('payment_methods').select('*').eq('active', true);
        if (data) {
            setPaymentMethods(data);
            if (data.length > 0) setPaymentMethodId(data[0].id);
        }
    };

    const fetchCategories = async () => {
        const { data } = await supabase.from('expense_categories').select('*').order('name');
        if (data) setCategories(data);
    };

    const fetchFrequentProviders = async () => {
        // Get distinct providers from recent purchases and expenses
        const { data: purchaseProviders } = await supabase
            .from('inventory_movements')
            .select('provider')
            .not('provider', 'is', null)
            .order('date', { ascending: false })
            .limit(10);

        const { data: expenseProviders } = await supabase
            .from('expenses')
            .select('provider')
            .not('provider', 'is', null)
            .order('date', { ascending: false })
            .limit(10);

        const allProviders = [
            ...(purchaseProviders?.map(p => p.provider) || []),
            ...(expenseProviders?.map(p => p.provider) || [])
        ].filter((v, i, a) => a.indexOf(v) === i);

        setFrequentProviders(allProviders);
    };

    const resetForm = () => {
        setOutflowType('COMPRA');
        setDate(new Date().toISOString().split('T')[0]);
        setProvider('');
        setPaymentMethodId('');
        setSelectedIngredientId('');
        setPurchaseQuantity('');
        setPurchaseCost('');
        setIngredientSearch('');
        setShowCreateIngredient(false);
        setSelectedCategoryId('');
        setExpenseAmount('');
        setExpenseNotes('');
        setShowCreateCategory(false);
        setNewCategoryName('');
    };

    // --- Computed ---
    const selectedIngredient = useMemo(() => {
        return ingredients.find(i => i.id === selectedIngredientId);
    }, [selectedIngredientId, ingredients]);

    const filteredIngredients = useMemo(() => {
        if (!ingredientSearch.trim()) return ingredients;
        return ingredients.filter(i =>
            i.name.toLowerCase().includes(ingredientSearch.toLowerCase())
        );
    }, [ingredients, ingredientSearch]);

    const calculatedUnitCost = useMemo(() => {
        const qty = parseFloat(purchaseQuantity);
        const cost = parseFloat(purchaseCost);
        if (qty > 0 && cost > 0) return cost / qty;
        return 0;
    }, [purchaseQuantity, purchaseCost]);

    const newStockPreview = useMemo(() => {
        if (!selectedIngredient) return null;
        const currentStock = selectedIngredient.purchase_quantity || 0;
        const addQty = parseFloat(purchaseQuantity) || 0;
        return {
            old: currentStock,
            new: currentStock + addQty,
            unit: selectedIngredient.purchase_unit
        };
    }, [selectedIngredient, purchaseQuantity]);

    const noIngredientMatch = useMemo(() => {
        return ingredientSearch.trim() && filteredIngredients.length === 0;
    }, [ingredientSearch, filteredIngredients]);

    // --- Handlers ---
    const handleCreateIngredient = async () => {
        if (!ingredientSearch.trim()) return;
        setLoading(true);
        try {
            const { data: userData } = await supabase.auth.getUser();
            const { data, error } = await supabase
                .from('ingredients')
                .insert({
                    user_id: userData.user?.id,
                    name: ingredientSearch.trim(),
                    purchase_price: 0,
                    purchase_unit: newIngredientUnit,
                    purchase_quantity: 0
                })
                .select()
                .single();

            if (error) throw error;

            // Update local list and select the new ingredient
            setSelectedIngredientId(data.id);
            setIngredientSearch('');
            setShowCreateIngredient(false);
        } catch (err: any) {
            console.error('Error creating ingredient:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCategory = async () => {
        if (!newCategoryName.trim()) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('expense_categories')
                .insert({
                    name: newCategoryName.trim(),
                    icon: '💰'
                })
                .select()
                .single();

            if (error) throw error;

            setCategories(prev => [...prev, data]);
            setSelectedCategoryId(data.id);
            setNewCategoryName('');
            setShowCreateCategory(false);
        } catch (err: any) {
            console.error('Error creating category:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            if (outflowType === 'COMPRA') {
                // Validate
                if (!selectedIngredientId || !purchaseQuantity) {
                    throw new Error('Selecciona un insumo y cantidad');
                }

                const { data, error } = await supabase.rpc('register_purchase', {
                    p_ingredient_id: selectedIngredientId,
                    p_quantity: parseFloat(purchaseQuantity),
                    p_cost: parseFloat(purchaseCost) || 0,
                    p_date: new Date(date).toISOString(),
                    p_provider: provider || null
                });

                if (error) throw error;

                const result: PurchaseResult = data?.[0] || {
                    old_stock: newStockPreview?.old || 0,
                    new_stock: newStockPreview?.new || 0,
                    old_unit_cost: selectedIngredient?.purchase_price / selectedIngredient?.purchase_quantity || 0,
                    new_unit_cost: calculatedUnitCost
                };

                onSuccess('COMPRA', result);
            } else {
                // GASTO
                if (!selectedCategoryId || !expenseAmount) {
                    throw new Error('Selecciona una categoría y monto');
                }

                const { error } = await supabase.rpc('register_expense', {
                    p_category_id: selectedCategoryId,
                    p_amount: parseFloat(expenseAmount),
                    p_provider: provider || null,
                    p_payment_method_id: paymentMethodId || null,
                    p_date: new Date(date).toISOString(),
                    p_notes: expenseNotes || null
                });

                if (error) throw error;

                onSuccess('GASTO');
            }

            onClose();
        } catch (err: any) {
            console.error('Submit error:', err);
            alert('Error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in">
            <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden relative border border-white/30 dark:border-white/10">

                {/* AI Arc Glow */}
                <div className="absolute inset-[-2px] rounded-[34px] overflow-hidden opacity-60 pointer-events-none">
                    <div
                        className="absolute inset-[-100%] animate-[spin_6s_linear_infinite] blur-lg will-change-transform"
                        style={{
                            background: outflowType === 'COMPRA'
                                ? 'conic-gradient(from 0deg, #3b82f6, #8b5cf6, #06b6d4, #3b82f6)'
                                : 'conic-gradient(from 0deg, #f59e0b, #ef4444, #ec4899, #f59e0b)'
                        }}
                    />
                </div>

                {/* Header */}
                <div className="relative bg-white/80 dark:bg-slate-900/80 p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
                    <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tight">
                        <span className="size-10 rounded-xl bg-slate-900 dark:bg-white/10 text-white flex items-center justify-center shadow-lg">
                            <span className="material-symbols-outlined">payments</span>
                        </span>
                        Registrar Salida
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition-colors p-2">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Toggle Switch */}
                <div className="relative px-6 pt-6">
                    <div className="relative bg-slate-100 dark:bg-white/5 p-1.5 rounded-2xl flex">
                        {/* Animated Background */}
                        <div
                            className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] rounded-xl transition-all duration-300 ease-out shadow-lg ${outflowType === 'COMPRA'
                                    ? 'left-1.5 bg-blue-600'
                                    : 'left-[calc(50%+3px)] bg-amber-500'
                                }`}
                        />

                        <button
                            onClick={() => setOutflowType('COMPRA')}
                            className={`relative z-10 flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider transition-colors ${outflowType === 'COMPRA' ? 'text-white' : 'text-slate-400'
                                }`}
                        >
                            <span className="text-lg">📦</span>
                            Compra Inventario
                        </button>

                        <button
                            onClick={() => setOutflowType('GASTO')}
                            className={`relative z-10 flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider transition-colors ${outflowType === 'GASTO' ? 'text-white' : 'text-slate-400'
                                }`}
                        >
                            <span className="text-lg">💸</span>
                            Gasto Operativo
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="relative p-6 space-y-5 max-h-[60vh] overflow-y-auto">

                    {/* Common Fields */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Date */}
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block ml-1">Fecha</label>
                            <input
                                type="date"
                                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-700 dark:text-white"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                            />
                        </div>

                        {/* Payment Method */}
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block ml-1">Método Pago</label>
                            <select
                                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer text-slate-700 dark:text-white"
                                value={paymentMethodId}
                                onChange={e => setPaymentMethodId(e.target.value)}
                            >
                                <option value="">Seleccionar...</option>
                                {paymentMethods.map(pm => (
                                    <option key={pm.id} value={pm.id}>{pm.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Provider */}
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block ml-1">
                            {outflowType === 'COMPRA' ? 'Proveedor' : 'Beneficiario'}
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Ej: Proveedor XYZ"
                                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 transition-all text-slate-700 dark:text-white"
                                value={provider}
                                onChange={e => setProvider(e.target.value)}
                                list="provider-suggestions"
                            />
                            <datalist id="provider-suggestions">
                                {frequentProviders.map((p, i) => (
                                    <option key={i} value={p} />
                                ))}
                            </datalist>
                        </div>
                    </div>

                    {/* === PURCHASE MODE === */}
                    {outflowType === 'COMPRA' && (
                        <>
                            {/* Ingredient Search */}
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block ml-1">Insumo</label>
                                <div className="relative group">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 group-focus-within:text-blue-500 transition-colors">search</span>

                                    {selectedIngredient ? (
                                        <div className="w-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/30 rounded-xl pl-12 pr-4 py-3 flex items-center justify-between">
                                            <div>
                                                <span className="font-bold text-blue-800 dark:text-blue-300">{selectedIngredient.name}</span>
                                                <span className="text-xs text-blue-500 ml-2">({selectedIngredient.purchase_unit})</span>
                                            </div>
                                            <button
                                                onClick={() => setSelectedIngredientId('')}
                                                className="text-blue-400 hover:text-red-500 transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-lg">close</span>
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <input
                                                type="text"
                                                placeholder="Buscar insumo..."
                                                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm font-bold outline-none focus:border-blue-500 transition-all text-slate-700 dark:text-white"
                                                value={ingredientSearch}
                                                onChange={e => setIngredientSearch(e.target.value)}
                                            />

                                            {/* Dropdown Results */}
                                            {ingredientSearch && (
                                                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto">
                                                    {filteredIngredients.length > 0 ? (
                                                        filteredIngredients.slice(0, 6).map(ing => (
                                                            <button
                                                                key={ing.id}
                                                                onClick={() => {
                                                                    setSelectedIngredientId(ing.id);
                                                                    setIngredientSearch('');
                                                                }}
                                                                className="w-full px-4 py-3 text-left hover:bg-blue-50 dark:hover:bg-white/5 flex items-center justify-between transition-colors"
                                                            >
                                                                <span className="font-bold text-slate-700 dark:text-white">{ing.name}</span>
                                                                <span className="text-xs text-slate-400">{ing.purchase_quantity} {ing.purchase_unit}</span>
                                                            </button>
                                                        ))
                                                    ) : (
                                                        <div className="p-4 text-center">
                                                            <p className="text-slate-400 text-sm mb-3">No encontrado</p>
                                                            <button
                                                                onClick={() => setShowCreateIngredient(true)}
                                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-black uppercase tracking-wider hover:bg-blue-700 transition-colors"
                                                            >
                                                                + Crear "{ingredientSearch}"
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Inline Create Ingredient */}
                            {showCreateIngredient && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/30 rounded-xl p-4 animate-fade-in">
                                    <h4 className="text-xs font-black text-blue-800 dark:text-blue-300 uppercase tracking-wider mb-3">Crear Nuevo Insumo</h4>
                                    <div className="flex gap-3">
                                        <div className="flex-1">
                                            <label className="text-[9px] font-bold text-blue-500 uppercase mb-1 block">Nombre</label>
                                            <input
                                                type="text"
                                                className="w-full bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-500/30 rounded-lg px-3 py-2 text-sm font-bold"
                                                value={ingredientSearch}
                                                readOnly
                                            />
                                        </div>
                                        <div className="w-28">
                                            <label className="text-[9px] font-bold text-blue-500 uppercase mb-1 block">Unidad</label>
                                            <select
                                                className="w-full bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-500/30 rounded-lg px-3 py-2 text-sm font-bold"
                                                value={newIngredientUnit}
                                                onChange={e => setNewIngredientUnit(e.target.value)}
                                            >
                                                <option value="Kg">Kg</option>
                                                <option value="Lt">Lt</option>
                                                <option value="Und">Und</option>
                                                <option value="g">g</option>
                                                <option value="ml">ml</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 mt-3">
                                        <button
                                            onClick={() => setShowCreateIngredient(false)}
                                            className="flex-1 px-4 py-2 text-blue-500 text-xs font-bold uppercase"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={handleCreateIngredient}
                                            disabled={loading}
                                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-black uppercase hover:bg-blue-700 transition-colors disabled:opacity-50"
                                        >
                                            {loading ? 'Creando...' : 'Crear'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Quantity & Cost */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block ml-1">Cantidad (+)</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 transition-all text-slate-700 dark:text-white"
                                            value={purchaseQuantity}
                                            onChange={e => setPurchaseQuantity(e.target.value)}
                                        />
                                        {selectedIngredient && (
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase">
                                                {selectedIngredient.purchase_unit}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block ml-1">Costo Total</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                                        <input
                                            type="number"
                                            placeholder="0"
                                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-8 pr-4 py-3 text-sm font-bold outline-none focus:border-blue-500 transition-all text-slate-700 dark:text-white"
                                            value={purchaseCost}
                                            onChange={e => setPurchaseCost(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Calculated Unit Cost */}
                            {calculatedUnitCost > 0 && (
                                <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-3 flex items-center justify-between border border-slate-100 dark:border-white/5">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Costo Unitario Resultante</span>
                                    <span className="text-lg font-black text-slate-700 dark:text-white">
                                        {formatCurrency(calculatedUnitCost)}
                                        {selectedIngredient && <span className="text-xs text-slate-400 ml-1">/ {selectedIngredient.purchase_unit}</span>}
                                    </span>
                                </div>
                            )}

                            {/* Stock Preview Badge */}
                            {newStockPreview && parseFloat(purchaseQuantity) > 0 && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 flex items-center justify-between border border-blue-100 dark:border-blue-500/20 animate-fade-in">
                                    <div>
                                        <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Nuevo Stock Estimado</p>
                                        <p className="text-xl font-black text-blue-600 dark:text-blue-400">
                                            {newStockPreview.old.toFixed(2)} → {newStockPreview.new.toFixed(2)} {newStockPreview.unit}
                                        </p>
                                    </div>
                                    <div className="size-12 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-blue-500 text-2xl">inventory</span>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* === EXPENSE MODE === */}
                    {outflowType === 'GASTO' && (
                        <>
                            {/* Category Selector */}
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block ml-1">Categoría</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {categories.map(cat => (
                                        <button
                                            key={cat.id}
                                            onClick={() => setSelectedCategoryId(cat.id)}
                                            className={`p-3 rounded-xl border text-center transition-all ${selectedCategoryId === cat.id
                                                    ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/30'
                                                    : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-amber-400'
                                                }`}
                                        >
                                            <span className="text-xl block mb-1">{cat.icon}</span>
                                            <span className="text-[10px] font-black uppercase tracking-wider">{cat.name}</span>
                                        </button>
                                    ))}

                                    {/* Add New Category Button */}
                                    <button
                                        onClick={() => setShowCreateCategory(true)}
                                        className="p-3 rounded-xl border-2 border-dashed border-slate-200 dark:border-white/10 text-slate-400 hover:border-amber-400 hover:text-amber-500 transition-all flex flex-col items-center justify-center"
                                    >
                                        <span className="material-symbols-outlined text-xl mb-1">add</span>
                                        <span className="text-[10px] font-black uppercase tracking-wider">Nueva</span>
                                    </button>
                                </div>
                            </div>

                            {/* Inline Create Category */}
                            {showCreateCategory && (
                                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30 rounded-xl p-4 animate-fade-in">
                                    <h4 className="text-xs font-black text-amber-800 dark:text-amber-300 uppercase tracking-wider mb-3">Nueva Categoría</h4>
                                    <input
                                        type="text"
                                        placeholder="Nombre de categoría..."
                                        className="w-full bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-500/30 rounded-lg px-4 py-2 text-sm font-bold mb-3"
                                        value={newCategoryName}
                                        onChange={e => setNewCategoryName(e.target.value)}
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setShowCreateCategory(false)}
                                            className="flex-1 px-4 py-2 text-amber-500 text-xs font-bold uppercase"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={handleCreateCategory}
                                            disabled={loading || !newCategoryName.trim()}
                                            className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg text-xs font-black uppercase hover:bg-amber-600 transition-colors disabled:opacity-50"
                                        >
                                            {loading ? 'Creando...' : 'Crear'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Amount */}
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block ml-1">Monto Total</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-amber-500 text-xl">$</span>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-4 text-2xl font-black outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all text-slate-800 dark:text-white text-right"
                                        value={expenseAmount}
                                        onChange={e => setExpenseAmount(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block ml-1">Notas (Opcional)</label>
                                <textarea
                                    placeholder="Descripción del gasto..."
                                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-amber-500 transition-all text-slate-700 dark:text-white resize-none h-20"
                                    value={expenseNotes}
                                    onChange={e => setExpenseNotes(e.target.value)}
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="relative p-6 bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-white/5 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-6 py-4 rounded-xl font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors uppercase tracking-wider text-xs"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || (outflowType === 'COMPRA' ? (!selectedIngredientId || !purchaseQuantity) : (!selectedCategoryId || !expenseAmount))}
                        className={`flex-[2] rounded-xl px-6 py-4 font-black uppercase tracking-[0.1em] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2 text-white ${outflowType === 'COMPRA'
                                ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30'
                                : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/30'
                            }`}
                    >
                        {loading ? (
                            <span className="material-symbols-outlined animate-spin">progress_activity</span>
                        ) : (
                            <>
                                <span className="material-symbols-outlined">{outflowType === 'COMPRA' ? 'inventory' : 'payments'}</span>
                                Registrar Salida
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OutflowModal;
