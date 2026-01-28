import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useApp } from '../../context/AppContext';

interface IngredientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (item: any) => void;
    initialName?: string;
    editingIngredient?: any | null; // If present, we are in EDIT mode
}

// Unit code options with display labels
const UNIT_OPTIONS = [
    { code: 'g', label: 'Gramos (g)' },
    { code: 'kg', label: 'Kilogramos (kg)' },
    { code: 'ml', label: 'Mililitros (ml)' },
    { code: 'L', label: 'Litros (L)' },
    { code: 'cm3', label: 'Centímetros³ (cm³)' },
    { code: 'und', label: 'Unidades (und)' },
];

/**
 * NEW BUSINESS LOGIC:
 * - INSUMO = Solo definición del producto (nombre, unidad, presentación)
 * - INVENTARIO = Solo se mueve con COMPRAS
 * - Stock inicial = Siempre 0
 * - Precio Base = Valor de referencia para costeos (opcional pero recomendado)
 */

const IngredientModal: React.FC<IngredientModalProps> = ({ isOpen, onClose, onSuccess, initialName = '', editingIngredient = null }) => {
    const { user } = useApp();

    // Atomic fields for product definition
    const [baseName, setBaseName] = useState('');
    const [unitCode, setUnitCode] = useState('g');
    const [presentationQty, setPresentationQty] = useState('');

    // Base price (reference value for costings - NOT inventory)
    const [basePrice, setBasePrice] = useState('');

    // Internal unit mapping
    const [unit, setUnit] = useState('Und');

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Generate the final display name from atomic fields
    const generatedName = useMemo(() => {
        if (baseName && unitCode && presentationQty) {
            return `${baseName} x ${presentationQty} ${unitCode}`;
        }
        return '';
    }, [baseName, unitCode, presentationQty]);

    // Calculate unit cost for preview
    const unitCost = useMemo(() => {
        if (basePrice && presentationQty) {
            const price = parseFloat(basePrice);
            const qty = parseFloat(presentationQty);
            if (price > 0 && qty > 0) {
                return price / qty;
            }
        }
        return 0;
    }, [basePrice, presentationQty]);

    useEffect(() => {
        if (isOpen) {
            if (editingIngredient) {
                // Edit Mode - load existing data
                if (editingIngredient.base_name && editingIngredient.unit_code && editingIngredient.presentation_qty) {
                    setBaseName(editingIngredient.base_name);
                    setUnitCode(editingIngredient.unit_code);
                    setPresentationQty(editingIngredient.presentation_qty.toString());
                } else {
                    // Legacy ingredient - use name as base_name
                    setBaseName(editingIngredient.name);
                    setUnitCode('g');
                    setPresentationQty('');
                }
                setBasePrice(editingIngredient.purchase_price?.toString() || '');
                setUnit(editingIngredient.purchase_unit || 'Und');
            } else {
                // Create Mode - reset everything
                setBaseName(initialName);
                setUnitCode('g');
                setPresentationQty('');
                setBasePrice('');
                setUnit('Und');
            }
        }
    }, [isOpen, initialName, editingIngredient]);

    // Sync unit from unitCode
    useEffect(() => {
        if (unitCode) {
            const unitMap: { [key: string]: string } = {
                'g': 'Gr',
                'kg': 'Kg',
                'ml': 'Ml',
                'L': 'Lt',
                'cm3': 'Ml',
                'und': 'Und'
            };
            setUnit(unitMap[unitCode] || 'Und');
        }
    }, [unitCode]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !baseName || !unitCode || !presentationQty) return;

        setIsSubmitting(true);
        try {
            // Build payload - Stock always starts at 0 for new items!
            const payload: any = {
                user_id: user.id,
                base_name: baseName,
                unit_code: unitCode,
                presentation_qty: parseFloat(presentationQty),
                name: generatedName,
                purchase_price: parseFloat(basePrice) || 0, // Base price for reference
                purchase_quantity: editingIngredient ? editingIngredient.purchase_quantity : 0, // Stock = 0 for new, keep for edit
                purchase_unit: unit
            };

            let resultItem;

            if (editingIngredient) {
                // UPDATE - preserve existing stock
                const { data, error } = await supabase
                    .from('ingredients')
                    .update(payload)
                    .eq('id', editingIngredient.id)
                    .select()
                    .single();
                if (error) throw error;
                resultItem = data;
            } else {
                // CREATE - stock starts at 0
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
    const canSubmit = baseName && unitCode && presentationQty;

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
                                    {isEdit ? 'Editar Detalle' : 'Nuevo Insumo'}
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

                    <form onSubmit={handleSubmit} className="p-6 md:p-8 flex flex-col gap-5 relative z-10 overflow-y-auto custom-scrollbar">

                        {/* Nombre Base */}
                        <div className="group space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Nombre Base del Insumo</label>
                            <div className="relative">
                                <input
                                    autoFocus
                                    placeholder="Ej: Aceite de Soya, Harina, Arroz..."
                                    className="w-full bg-white/50 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 rounded-2xl px-5 py-4 text-base font-bold text-slate-800 dark:text-white focus:border-blue-500 dark:focus:border-blue-500/50 outline-none transition-all placeholder:text-slate-200 dark:placeholder:text-slate-700"
                                    value={baseName}
                                    onChange={e => setBaseName(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Unidad de Medida y Contenido por Presentación */}
                        <div className="grid grid-cols-2 gap-4">
                            {/* Unidad de Medida */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Unidad de Medida</label>
                                <select
                                    className="w-full bg-white/50 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 rounded-2xl px-4 py-4 text-base font-bold text-slate-800 dark:text-white focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer"
                                    value={unitCode}
                                    onChange={e => setUnitCode(e.target.value)}
                                >
                                    {UNIT_OPTIONS.map(opt => (
                                        <option key={opt.code} value={opt.code}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Contenido por Presentación */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Contenido x Unidad</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        placeholder="Ej: 3000"
                                        className="w-full bg-white/50 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 rounded-2xl px-5 py-4 text-xl font-black text-slate-800 dark:text-white focus:border-blue-500 outline-none transition-all text-center"
                                        value={presentationQty}
                                        onChange={e => setPresentationQty(e.target.value)}
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-blue-500 uppercase">{unitCode}</span>
                                </div>
                            </div>
                        </div>

                        {/* Generated Name Preview */}
                        {generatedName && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-500/20 rounded-2xl p-4 animate-fade-in">
                                <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Nombre Generado</p>
                                <p className="text-lg font-black text-blue-600 dark:text-blue-400 tracking-tight">{generatedName}</p>
                                <p className="text-[10px] text-slate-400 mt-1">📦 Stock inicial: 0 unidades</p>
                            </div>
                        )}

                        {/* Precio Base (Referencia) */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Precio Base de Referencia</label>
                                <span className="text-[9px] text-amber-600 font-bold bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">Opcional</span>
                            </div>
                            <div className="relative group/price">
                                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xl font-black text-blue-500 opacity-50">$</span>
                                <input
                                    type="number"
                                    placeholder="0"
                                    className="w-full bg-white/50 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 rounded-2xl px-5 py-4 pl-10 text-xl font-black text-slate-800 dark:text-white focus:border-blue-500 outline-none transition-all"
                                    value={basePrice}
                                    onChange={e => setBasePrice(e.target.value)}
                                />
                            </div>
                            <p className="text-[10px] text-slate-400 ml-1 italic">💡 Este precio es solo una referencia inicial. El costo real se calculará con las compras.</p>
                        </div>

                        {/* Unit Cost Preview Card */}
                        {unitCost > 0 && (
                            <div className="bg-slate-900 dark:bg-black/40 p-6 rounded-[24px] flex justify-between items-center shadow-xl relative overflow-hidden group/preview ring-1 ring-white/10">
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent opacity-0 group-hover/preview:opacity-100 transition-opacity" />
                                <div className="relative z-10">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Costo x Unidad Base</p>
                                    <p className="text-xs text-amber-400/70 font-medium italic">⚡ Valor de referencia</p>
                                </div>
                                <div className="text-right relative z-10">
                                    <span className="block text-4xl font-black text-blue-400 tracking-tighter">
                                        ${unitCost.toFixed(2)}
                                    </span>
                                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">por {unitCode}</span>
                                </div>
                            </div>
                        )}

                        {/* Info Banner - New Business Logic */}
                        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl p-4">
                            <div className="flex items-start gap-3">
                                <span className="material-symbols-outlined text-emerald-600 text-xl">info</span>
                                <div>
                                    <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">¿Cómo funciona el inventario?</p>
                                    <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/70 mt-1">
                                        El stock de este insumo empezará en <strong>0</strong>. Para agregar unidades al inventario,
                                        usa el botón <strong>"Registrar Entrada"</strong> desde la página de Inventario.
                                    </p>
                                </div>
                            </div>
                        </div>

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
                                disabled={isSubmitting || !canSubmit}
                                className={`flex-[1.8] group relative overflow-hidden py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                                    ${canSubmit ? 'bg-blue-600 text-white shadow-blue-500/30' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}
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
                                        <span className="material-symbols-outlined text-lg">{isEdit ? 'save' : 'add_circle'}</span>
                                        {isEdit ? 'GUARDAR CAMBIOS' : 'CREAR INSUMO'}
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
