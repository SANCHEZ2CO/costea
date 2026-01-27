import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabaseClient';
import { useNavigate } from 'react-router-dom';
import HeaderSimple from '../components/HeaderSimple';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../constants';
import LiquidModal from '../components/LiquidModal';

// Types
interface CartItem {
    dishId: string;
    name: string;
    price: number;
    quantity: number;
}

const SalesPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useApp();
    const [dishes, setDishes] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
    const [ingredients, setIngredients] = useState<any[]>([]);
    const [dishIngredients, setDishIngredients] = useState<any[]>([]);

    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<string>('');
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('Efectivo'); // Default name or ID
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState<'ALL' | 'FOOD' | 'DRINK'>('ALL'); // Simple categorization simulation

    // Loading & Checkout States
    const [loading, setLoading] = useState(false);
    const [checkoutProcessing, setCheckoutProcessing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // New Fields for Enhanced POS
    const [customerPhone, setCustomerPhone] = useState('');
    const [extrasAmount, setExtrasAmount] = useState<string>('');
    const [extrasDetails, setExtrasDetails] = useState('');
    const [deliveryFee, setDeliveryFee] = useState<string>('');

    // --- Data Fetching ---
    useEffect(() => {
        if (!user) return;

        const fetchData = async () => {
            setLoading(true);
            // Fetch Dishes (Output Menus ONLY - sale_price > 0)
            const { data: dishesData } = await supabase
                .from('dishes')
                .select('*')
                .gt('sale_price', 0) // Only fetch sellable menus
                .order('name');
            if (dishesData) setDishes(dishesData);

            // Fetch Customers
            const { data: custData } = await supabase.from('customers').select('*').order('name');
            if (custData) setCustomers(custData);

            // Fetch Payment Methods
            const { data: payData } = await supabase.from('payment_methods').select('*').eq('active', true);
            if (payData) {
                setPaymentMethods(payData);
                if (payData.length > 0) setSelectedPaymentMethod(payData[0].name);
            }

            // Fetch Inventory Data for Validation
            const { data: ingData } = await supabase.from('ingredients').select('id, name, purchase_quantity, purchase_unit');
            if (ingData) setIngredients(ingData);

            const { data: diData } = await supabase.from('dish_ingredients').select('*');
            if (diData) setDishIngredients(diData);

            setLoading(false);
        };

        fetchData();
    }, [user]);

    // --- Computed ---
    const filteredDishes = useMemo(() => {
        let items = dishes;
        if (searchQuery.trim()) {
            items = items.filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()));
        }
        return items;
    }, [dishes, searchQuery]);

    const cartTotal = useMemo(() => {
        const itemsTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        const extra = parseFloat(extrasAmount) || 0;
        const delivery = parseFloat(deliveryFee) || 0;
        return itemsTotal + extra + delivery;
    }, [cart, extrasAmount, deliveryFee]);

    // --- Handlers ---
    const addToCart = (dish: any) => {
        setCart(prev => {
            const existing = prev.find(i => i.dishId === dish.id);
            if (existing) {
                return prev.map(i => i.dishId === dish.id ? { ...i, quantity: i.quantity + 1 } : i);
            } else {
                return [...prev, { dishId: dish.id, name: dish.name, price: dish.sale_price, quantity: 1 }];
            }
        });
        // Feedback sound or tiny vibration could go here
    };

    const removeFromCart = (dishId: string) => {
        setCart(prev => prev.filter(i => i.dishId !== dishId));
    };

    const updateQuantity = (dishId: string, delta: number) => {
        setCart(prev => {
            return prev.map(i => {
                if (i.dishId === dishId) {
                    const newQty = i.quantity + delta;
                    if (newQty <= 0) return i; // Don't remove, just stop at 1. Or remove if < 1? Let's stop at 1.
                    return { ...i, quantity: newQty };
                }
                return i;
            });
        });
    };

    const validateStock = (): { valid: boolean; missing: string[] } => {
        const tempStock = new Map(ingredients.map(i => [i.id, i.purchase_quantity]));
        const missingItems = new Set<string>();

        cart.forEach(cartItem => {
            const diList = dishIngredients.filter(di => di.dish_id === cartItem.dishId);
            diList.forEach(di => {
                const needed = di.used_quantity * cartItem.quantity;
                const current = (tempStock.get(di.ingredient_id) as number) || 0;
                if (current < needed) {
                    // Try to find ingredient name
                    const ingName = ingredients.find(i => i.id === di.ingredient_id)?.name || 'Desconocido';
                    missingItems.add(ingName);
                }
                // We deduct hypothetically even if negative to catch multiple shortages
                tempStock.set(di.ingredient_id, current - needed);
            });
        });

        return { valid: missingItems.size === 0, missing: Array.from(missingItems) };
    };

    const handleCheckout = async (force: boolean = false) => {
        if (cart.length === 0) return;

        // 1. Validate Stock (unless forced)
        if (!force) {
            const { valid, missing } = validateStock();
            if (!valid) {
                if (confirm(`⚠ Alerta de Stock Insuficiente:\n\nFaltan insumos: ${missing.join(', ')}\n\n¿Desea registrar la venta de todos modos (Stock Negativo)?`)) {
                    handleCheckout(true);
                }
                return;
            }
        }

        setCheckoutProcessing(true);

        try {
            const { error } = await supabase.rpc('register_sale', {
                p_sale_total: cartTotal,
                p_payment_method: selectedPaymentMethod,
                p_items: cart.map(i => ({ dish_id: i.dishId, quantity: i.quantity, price: i.price })),
                p_customer_name: customers.find(c => c.id === selectedCustomer)?.name || 'Cliente Mostrador', // Use selected ID to find name, or default
                p_customer_phone: customerPhone,
                p_delivery_fee: parseFloat(deliveryFee) || 0,
                p_extras_amount: parseFloat(extrasAmount) || 0,
                p_extras_details: extrasDetails
            });

            if (error) throw error;

            // Success!
            setCart([]);
            setSelectedCustomer('');
            setCustomerPhone('');
            setExtrasAmount('');
            setExtrasDetails('');
            setDeliveryFee('');
            setShowSuccess(true);

            // Refresh Stock Validation Data
            const { data: ingData } = await supabase.from('ingredients').select('id, name, purchase_quantity, purchase_unit');
            if (ingData) setIngredients(ingData);

            // Auto close success after 3s
            setTimeout(() => setShowSuccess(false), 3000);

        } catch (err: any) {
            console.error(err);
            alert("Error al procesar venta: " + err.message);
        } finally {
            setCheckoutProcessing(false);
        }
    };

    return (
        <div className="bg-[#F8F9FB] dark:bg-slate-900 min-h-screen text-slate-800 dark:text-white font-display flex flex-col overflow-hidden h-screen transition-colors duration-300">
            <HeaderSimple />

            {/* Success Modal Overlay */}
            {showSuccess && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 p-10 rounded-3xl shadow-2xl flex flex-col items-center gap-4 animate-bounce-in relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-blue-500/10"></div>
                        <div className="size-24 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-2 shadow-lg shadow-green-500/20">
                            <span className="material-symbols-outlined text-6xl animate-pulse">check_circle</span>
                        </div>
                        <h2 className="text-3xl font-black text-slate-800 dark:text-white">¡Venta Exitosa!</h2>
                        <p className="text-slate-500 font-medium">Inventario actualizado automáticamente.</p>
                        {/* Simple CSS Confetti (Dots) */}
                        <div className="absolute top-0 left-1/4 w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                        <div className="absolute top-10 right-1/4 w-3 h-3 bg-blue-500 rounded-full animate-ping delay-100"></div>
                        <div className="absolute bottom-10 left-10 w-2 h-2 bg-yellow-500 rounded-full animate-ping delay-200"></div>
                    </div>
                </div>
            )}

            <main className="flex-1 flex overflow-hidden">
                {/* LEFT COL: MENU (70%) */}
                <div className="flex-[0.7] flex flex-col border-r border-slate-200 dark:border-white/5 p-6 md:p-8 overflow-y-auto custom-scrollbar">

                    {/* Header & Search */}
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            {/* Back Button */}
                            <button onClick={() => navigate('/')} className="group flex items-center gap-2 text-slate-400 hover:text-blue-500 mb-2 transition-all font-black text-[10px] uppercase tracking-[0.2em]">
                                <span className="material-symbols-outlined text-[16px] group-hover:-translate-x-1 transition-transform">arrow_back</span>
                                Panel Principal
                            </button>
                            <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter">Punto de Venta</h2>
                            <p className="text-slate-400 font-medium text-sm">Selecciona productos para agregar a la orden.</p>
                        </div>
                        <div className="relative group w-72">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 group-focus-within:text-blue-500 transition-colors">search</span>
                            <input
                                type="text"
                                placeholder="Buscar plato..."
                                className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl pl-12 pr-4 py-3 text-sm font-bold outline-none focus:border-blue-500 transition-all text-slate-700 dark:text-white"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Filter Tabs (Visual Only for now) */}
                    <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
                        {['ALL', 'FOOD', 'DRINK'].map(cat => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat as any)}
                                className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeCategory === cat ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg' : 'bg-white dark:bg-white/5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'}`}
                            >
                                {cat === 'ALL' ? 'Todos' : cat === 'FOOD' ? 'Comidas' : 'Bebidas'}
                            </button>
                        ))}
                    </div>

                    {/* Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-20">
                        {loading ? (
                            [1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="h-40 bg-slate-100 dark:bg-white/5 rounded-3xl animate-pulse"></div>
                            ))
                        ) : filteredDishes.length > 0 ? (
                            filteredDishes.map(dish => (
                                <button
                                    key={dish.id}
                                    onClick={() => addToCart(dish)}
                                    className="bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-white/5 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col items-center text-center h-48 justify-between relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-50/50 dark:to-black/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

                                    <div className="mt-2 size-16 rounded-2xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-4xl shadow-inner mb-2 group-hover:scale-110 transition-transform duration-300">
                                        🍔
                                    </div>
                                    <div className="w-full relative z-10">
                                        <h4 className="font-bold text-slate-800 dark:text-white text-sm leading-tight line-clamp-2 min-h-[2.5em]">{dish.name}</h4>
                                        <div className="mt-2 bg-slate-100 dark:bg-white/10 rounded-lg py-1 px-3 text-xs font-black text-slate-600 dark:text-white group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                            {formatCurrency(dish.sale_price)}
                                        </div>
                                    </div>
                                </button>
                            ))
                        ) : (
                            <div className="col-span-full py-20 text-center text-slate-400">
                                <span className="material-symbols-outlined text-4xl mb-2">no_food</span>
                                <p className="text-sm font-bold uppercase">No se encontraron productos</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT COL: CART (30%) */}
                <div className="flex-[0.3] glass-panel border-l border-slate-200 dark:border-white/5 flex flex-col bg-white/50 dark:bg-slate-900/90 relative z-20 shadow-2xl">
                    {/* Cart Header */}
                    <div className="p-6 border-b border-slate-100 dark:border-white/5 bg-white/80 dark:bg-slate-900/90 backdrop-blur top-0 z-10">
                        <div className="flex items-center gap-3 text-slate-800 dark:text-white mb-4">
                            <div className="size-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
                                <span className="material-symbols-outlined">shopping_cart</span>
                            </div>
                            <h3 className="text-xl font-black tracking-tight">Orden Actual</h3>
                        </div>

                        {/* Customer Selector with AI Arc */}
                        <div className="relative group mb-4">
                            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-0 group-focus-within:opacity-100 transition-opacity blur p-[2px]"></div>
                            <div className="relative bg-white dark:bg-slate-900 rounded-xl">
                                <select
                                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-wide appearance-none outline-none focus:ring-0 text-slate-600 dark:text-slate-300 cursor-pointer relative z-10"
                                    value={selectedCustomer}
                                    onChange={e => setSelectedCustomer(e.target.value)}
                                >
                                    <option value="">Cliente Mostrador (Anónimo)</option>
                                    {customers.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 pointer-events-none text-sm z-10">expand_more</span>
                            </div>
                        </div>

                        {/* Customer Phone (New) */}
                        <div className="mb-4">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block ml-1">Teléfono / Contacto</label>
                            <input
                                type="text"
                                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:border-blue-500 transition-all text-slate-700 dark:text-white"
                                placeholder="300 123 4567"
                                value={customerPhone}
                                onChange={e => setCustomerPhone(e.target.value)}
                            />
                        </div>

                        {/* Payment Method Selector */}
                        <div className="mb-4">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-1">Método de Pago</label>
                            <div className="grid grid-cols-2 gap-2">
                                {paymentMethods.map(pm => (
                                    <button
                                        key={pm.id}
                                        onClick={() => setSelectedPaymentMethod(pm.name)}
                                        className={`px-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${selectedPaymentMethod === pm.name
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20'
                                            : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 hover:border-blue-400'}`}
                                    >
                                        {pm.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Cart Items */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                                <span className="material-symbols-outlined text-6xl mb-4">remove_shopping_cart</span>
                                <p className="text-xs font-black uppercase tracking-widest text-center">Tu carrito está vacío</p>
                            </div>
                        ) : (
                            cart.map(item => (
                                <div key={item.dishId} className="bg-white dark:bg-white/5 p-3 rounded-2xl flex items-center justify-between shadow-sm border border-slate-100 dark:border-white/5 animate-fade-in-left">
                                    <div className="flex-1">
                                        <p className="font-bold text-slate-800 dark:text-white text-sm line-clamp-1">{item.name}</p>
                                        <p className="text-xs text-slate-500 font-mono mt-0.5">{formatCurrency(item.price)}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center bg-slate-100 dark:bg-black/20 rounded-lg p-1">
                                            <button onClick={() => updateQuantity(item.dishId, -1)} className="size-6 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors">-</button>
                                            <span className="w-6 text-center text-xs font-black">{item.quantity}</span>
                                            <button onClick={() => updateQuantity(item.dishId, 1)} className="size-6 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors">+</button>
                                        </div>
                                        <button onClick={() => removeFromCart(item.dishId)} className="text-slate-300 hover:text-red-500 transition-colors">
                                            <span className="material-symbols-outlined text-lg">delete</span>
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Extras & Delivery Section (New) */}
                    <div className="p-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
                        {/* Extras */}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                className="flex-[2] bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs font-bold outline-none"
                                placeholder="Extras (Detalle)..."
                                value={extrasDetails}
                                onChange={e => setExtrasDetails(e.target.value)}
                            />
                            <div className="flex-1 relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                                <input
                                    type="number"
                                    className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg pl-5 pr-2 py-2 text-xs font-bold outline-none text-right"
                                    placeholder="0"
                                    value={extrasAmount}
                                    onChange={e => setExtrasAmount(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Delivery */}
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Domicilio</label>
                            <div className="w-24 relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                                <input
                                    type="number"
                                    className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg pl-5 pr-2 py-2 text-xs font-bold outline-none text-right"
                                    placeholder="0"
                                    value={deliveryFee}
                                    onChange={e => setDeliveryFee(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Footer / Total */}
                    <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-white/5 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-20">
                        <div className="flex justify-between items-end mb-6">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total a Pagar</span>
                            <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{formatCurrency(cartTotal)}</span>
                        </div>

                        <button
                            onClick={() => handleCheckout(false)}
                            disabled={cart.length === 0 || checkoutProcessing}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-500/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 relative overflow-hidden group"
                        >
                            {/* Shiny effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>

                            {checkoutProcessing ? (
                                <span className="material-symbols-outlined animate-spin">progress_activity</span>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined">payments</span>
                                    Cobrar
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default SalesPage;
