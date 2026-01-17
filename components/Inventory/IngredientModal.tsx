import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useApp } from '../../context/AppContext';

interface IngredientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (ingredient: any) => void;
    initialName: string;
}

const IngredientModal: React.FC<IngredientModalProps> = ({ isOpen, onClose, onSuccess, initialName }) => {
    const { user } = useApp();
    const [name, setName] = useState(initialName);
    const [price, setPrice] = useState('');
    const [qty, setQty] = useState('');
    const [unit, setUnit] = useState('Und');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setName(initialName);
            setPrice('');
            setQty('');
            setUnit('Und');
        }
    }, [isOpen, initialName]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !name || !price || !qty) return;

        setIsSubmitting(true);
        try {
            const newIng = {
                user_id: user.id,
                name,
                purchase_price: parseFloat(price),
                purchase_quantity: parseFloat(qty),
                purchase_unit: unit
            };

            const { data, error } = await supabase
                .from('ingredients')
                .insert(newIng)
                .select()
                .single();

            if (error) throw error;

            onSuccess(data);
            onClose();
        } catch (error: any) {
            console.error("Error creating ingredient:", error);
            alert("Error al crear insumo: " + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 transform transition-all scale-100 animate-fade-in-up">

                {/* Header */}
                <div className="p-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-secondary">add_circle</span>
                        Crear Nuevo Insumo
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">

                    {/* Nombre */}
                    <div>
                        <label className="section-label">Nombre del Insumo</label>
                        <input
                            autoFocus
                            placeholder="Ej: Harina de Trigo, Caja 20x20..."
                            className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-700 rounded-xl p-3.5 text-sm font-medium focus:border-secondary outline-none transition-all placeholder:text-gray-400"
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Precio */}
                        <div>
                            <label className="section-label">Costo de Compra</label>
                            <div className="relative group-focus-within:text-secondary">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold group-focus-within:text-secondary transition-colors">$</span>
                                <input
                                    type="number"
                                    placeholder="0"
                                    className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-700 rounded-xl p-3.5 pl-7 text-sm font-bold focus:border-secondary outline-none transition-all"
                                    value={price}
                                    onChange={e => setPrice(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Cantidad / Rendimiento */}
                        <div>
                            <label className="section-label">Cantidad Paquete</label>
                            <input
                                type="number"
                                placeholder="0"
                                className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-700 rounded-xl p-3.5 text-sm font-bold focus:border-secondary outline-none transition-all text-center"
                                value={qty}
                                onChange={e => setQty(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Unidades */}
                    <div>
                        <label className="section-label mb-2 block">Unidad de Medida</label>
                        <div className="grid grid-cols-5 gap-2 bg-gray-100 dark:bg-black/20 p-1.5 rounded-xl">
                            {['Und', 'Gr', 'Ml', 'Kg', 'Lt'].map(u => (
                                <button
                                    key={u}
                                    type="button"
                                    onClick={() => setUnit(u)}
                                    className={`py-2 rounded-lg text-xs font-bold transition-all ${unit === u
                                        ? 'bg-white dark:bg-slate-800 text-secondary shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                                        : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                                        }`}
                                >
                                    {u}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting || !name || !price || !qty}
                        className="mt-2 w-full bg-secondary hover:bg-secondary-dark text-white font-bold py-4 rounded-xl shadow-lg shadow-secondary/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <span className="material-symbols-outlined animate-spin text-xl">refresh</span>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-xl">save</span>
                                CREAR Y USAR
                            </>
                        )}
                    </button>

                </form>
            </div>
            <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>
        </div>
    );
};

export default IngredientModal;
