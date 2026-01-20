import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useApp } from '../../context/AppContext';

interface IngredientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (item: any) => void;
    initialName?: string;
    editingIngredient?: any | null; // If present, we are in EDIT mode
}

const IngredientModal: React.FC<IngredientModalProps> = ({ isOpen, onClose, onSuccess, initialName = '', editingIngredient = null }) => {
    const { user } = useApp();
    const [name, setName] = useState(initialName);
    const [price, setPrice] = useState('');
    const [qty, setQty] = useState('');
    const [unit, setUnit] = useState('Und');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (editingIngredient) {
                // Edit Mode
                setName(editingIngredient.name);
                setPrice(editingIngredient.purchase_price.toString());
                setQty(editingIngredient.purchase_quantity.toString());
                setUnit(editingIngredient.purchase_unit);
            } else {
                // Create Mode
                setName(initialName);
                setPrice('');
                setQty('');
                setUnit('Und');
            }
        }
    }, [isOpen, initialName, editingIngredient]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !name || !price || !qty) return;

        setIsSubmitting(true);
        try {
            const payload = {
                user_id: user.id,
                name,
                purchase_price: parseFloat(price),
                purchase_quantity: parseFloat(qty),
                purchase_unit: unit
            };

            let resultItem;

            if (editingIngredient) {
                // UPDATE
                const { data, error } = await supabase
                    .from('ingredients')
                    .update(payload)
                    .eq('id', editingIngredient.id)
                    .select()
                    .single();
                if (error) throw error;
                resultItem = data;
            } else {
                // CREATE
                const { data, error } = await supabase
                    .from('ingredients')
                    .insert(payload)
                    .select()
                    .single();
                if (error) throw error;
                resultItem = data;
            }

            onSuccess(resultItem);
            onClose();
        } catch (error: any) {
            console.error("Error saving ingredient:", error);
            alert("Error al guardar: " + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const isEdit = !!editingIngredient;
    const themeColor = 'blue'; // Insumos use Blue theme

    return (
        <div className="fixed inset-0 z-[300] flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/40 backdrop-blur-xl animate-fade-in">
            {/* Main Modal Container with AI Arc Glow */}
            <div className="relative w-full max-w-md group">
                {/* AI Arc Glow Effect (Blue Theme) */}
                <div className="absolute inset-[-2px] rounded-[34px] overflow-hidden opacity-100">
                    <div
                        className="absolute inset-[-100%] bg-[conic-gradient(from_var(--shimmer-angle),theme('colors.blue.400'),theme('colors.cyan.400'),theme('colors.indigo.400'),theme('colors.blue.600'),theme('colors.blue.400'))] animate-[spin_4s_linear_infinite] blur-md will-change-transform"
                        style={{ '--shimmer-angle': '0deg' } as React.CSSProperties}
                    />
                </div>

                <div className="relative bg-white dark:bg-slate-900 rounded-t-[30px] rounded-b-none md:rounded-[32px] shadow-2xl overflow-hidden border border-white/40 dark:border-white/10 animate-slider-up flex flex-col w-full max-h-[90vh]">

                    {/* Header */}
                    <div className={`px-6 py-4 md:p-8 md:pb-4 border-b border-white/40 dark:border-white/5 flex justify-between items-center relative z-10 ${isEdit ? 'bg-blue-50/30' : ''}`}>
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-2xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                                <span className={`material-symbols-outlined ${isEdit ? 'text-blue-600' : 'text-slate-400'}`}>
                                    {isEdit ? 'edit_square' : 'add_shopping_cart'}
                                </span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase tracking-[0.2em] text-blue-500 dark:text-blue-400/70 font-bold leading-none mb-1">Registro de Insumo</span>
                                <h3 className="text-lg md:text-xl font-black text-slate-800 dark:text-white tracking-tight">
                                    {isEdit ? 'Editar Detalle' : 'Nuevo Ingrese'}
                                </h3>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="size-10 rounded-full flex items-center justify-center bg-slate-100/50 hover:bg-red-50 dark:bg-slate-800/50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 transition-all font-bold"
                        >
                            <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 md:p-8 flex flex-col gap-6 relative z-10 overflow-y-auto custom-scrollbar">
                        {/* Nombre */}
                        <div className="group space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Nombre del Componente</label>
                            <div className="relative">
                                <input
                                    autoFocus
                                    placeholder="Ej: Harina de Trigo..."
                                    className="w-full bg-white/50 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 rounded-2xl px-5 py-4 text-base font-bold text-slate-800 dark:text-white focus:border-blue-500 dark:focus:border-blue-500/50 outline-none transition-all placeholder:text-slate-200 dark:placeholder:text-slate-700"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Precio */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Costo Compra</label>
                                <div className="relative group/price">
                                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xl font-black text-blue-500 opacity-50">$</span>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        className="w-full bg-white/50 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 rounded-2xl px-5 py-4 pl-10 text-xl font-black text-slate-800 dark:text-white focus:border-blue-500 outline-none transition-all"
                                        value={price}
                                        onChange={e => setPrice(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Cantidad / Rendimiento */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Rendimiento</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        placeholder="0"
                                        className="w-full bg-white/50 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 rounded-2xl px-5 py-4 text-xl font-black text-slate-800 dark:text-white focus:border-blue-500 outline-none transition-all text-center"
                                        value={qty}
                                        onChange={e => setQty(e.target.value)}
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase">Cant</span>
                                </div>
                            </div>
                        </div>

                        {/* Unidades Segmented Picker */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Unidad de Medida Fundamental</label>
                            <div className="flex p-1.5 bg-slate-100/50 dark:bg-black/30 rounded-2xl border border-slate-200 dark:border-white/5 gap-1">
                                {['Und', 'Gr', 'Ml', 'Kg', 'Lt'].map(u => (
                                    <button
                                        key={u}
                                        type="button"
                                        onClick={() => setUnit(u)}
                                        className={`flex-1 py-3 rounded-xl text-[11px] font-black uppercase transition-all transform active:scale-95 ${unit === u
                                            ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-lg shadow-blue-500/10 ring-1 ring-black/5 dark:ring-white/10'
                                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                            }`}
                                    >
                                        {u}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Unit Cost Preview Card */}
                        {price && qty && (
                            <div className="bg-slate-900 dark:bg-black/40 p-6 rounded-[24px] flex justify-between items-center shadow-xl relative overflow-hidden group/preview ring-1 ring-white/10">
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent opacity-0 group-hover/preview:opacity-100 transition-opacity" />
                                <div className="relative z-10">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Costo x Unidad</p>
                                    <p className="text-xs text-slate-400 font-medium italic">Referencia para recetas</p>
                                </div>
                                <div className="text-right relative z-10">
                                    <span className="block text-4xl font-black text-blue-400 tracking-tighter">
                                        ${(parseFloat(price) / parseFloat(qty)).toFixed(0)}
                                    </span>
                                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">por {unit}</span>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-4 pt-4 relative z-10">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-5 rounded-2xl font-black text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-white/5 transition-all text-xs uppercase tracking-widest"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting || !name || !price || !qty}
                                className={`flex-[1.8] group relative overflow-hidden py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                                    ${name && price && qty ? 'bg-blue-600 text-white shadow-blue-500/30' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}
                                `}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                {isSubmitting ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                                        <span>PROCESANDO</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center gap-2">
                                        <span className="material-symbols-outlined text-lg">{"\u2728"}</span>
                                        {isEdit ? 'GUARDAR ACTUALIZACIÓN' : 'CONFIRMAR INGRESO'}
                                    </div>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default IngredientModal;
