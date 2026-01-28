import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { useNavigate } from 'react-router-dom';
import HeaderSimple from '../components/HeaderSimple';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../constants';
import LiquidModal from '../components/LiquidModal';
import LiquidLoader from '../components/LiquidLoader';

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

    // -- POS STATE --
    const [dishes, setDishes] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
    const [loadingPOS, setLoadingPOS] = useState(true);

    // Cart & Transaction
    const [cart, setCart] = useState<CartItem[]>([]);

    // Customer State (First Priority)
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
    // Store full customer object to display name/phone nicely
    const [selectedCustomerObj, setSelectedCustomerObj] = useState<any | null>(null);
    const [customerSearch, setCustomerSearch] = useState('');
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

    // Create Customer Inline
    const [showCreateCustomer, setShowCreateCustomer] = useState(false);
    const [newCustName, setNewCustName] = useState('');
    const [newCustPhone, setNewCustPhone] = useState('');

    // Transaction Details
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('Efectivo');
    const [deliveryFee, setDeliveryFee] = useState<string>('');
    const [extrasAmount, setExtrasAmount] = useState<string>('');
    const [extrasDetails, setExtrasDetails] = useState('');

    // Product Search (Omni Bar)
    const [omniSearchQuery, setOmniSearchQuery] = useState('');
    const [showOmniDropdown, setShowOmniDropdown] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const customerRef = useRef<HTMLDivElement>(null);

    // Process States
    const [checkoutProcessing, setCheckoutProcessing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // Initial Fetch
    useEffect(() => {
        if (!user) return;
        fetchPOSData();
    }, [user]);

    // Click Outside Handlers
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowOmniDropdown(false);
            }
            if (customerRef.current && !customerRef.current.contains(event.target as Node)) {
                setShowCustomerDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchPOSData = async () => {
        setLoadingPOS(true);
        const [dishesRes, custRes, payRes] = await Promise.all([
            supabase.from('dishes').select('*').gt('sale_price', 0).order('name'),
            supabase.from('customers').select('*').order('name'),
            supabase.from('payment_methods').select('*').eq('active', true),
        ]);

        if (dishesRes.data) setDishes(dishesRes.data);
        if (custRes.data) setCustomers(custRes.data);
        if (payRes.data) {
            setPaymentMethods(payRes.data);
            if (payRes.data.length > 0) setSelectedPaymentMethod(payRes.data[0].name);
        }
        setLoadingPOS(false);
    };

    // --- COMPUTED ---
    const filteredDishes = useMemo(() => {
        if (!omniSearchQuery.trim()) return [];
        return dishes.filter(d => d.name.toLowerCase().includes(omniSearchQuery.toLowerCase()));
    }, [dishes, omniSearchQuery]);

    const filteredCustomers = useMemo(() => {
        if (!customerSearch.trim()) return customers;
        return customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()));
    }, [customers, customerSearch]);

    const cartTotal = useMemo(() => {
        const itemsTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        const extra = parseFloat(extrasAmount) || 0;
        const delivery = parseFloat(deliveryFee) || 0;
        return itemsTotal + extra + delivery;
    }, [cart, extrasAmount, deliveryFee]);

    // --- HANDLERS ---
    const addToCart = (dish: any) => {
        setCart(prev => {
            const existing = prev.find(i => i.dishId === dish.id);
            if (existing) {
                return prev.map(i => i.dishId === dish.id ? { ...i, quantity: i.quantity + 1 } : i);
            } else {
                return [...prev, { dishId: dish.id, name: dish.name, price: dish.sale_price, quantity: 1 }];
            }
        });
        setOmniSearchQuery('');
        setShowOmniDropdown(false);
    };

    const updateQuantity = (dishId: string, delta: number) => {
        setCart(prev => prev.map(i => {
            if (i.dishId === dishId) {
                const newQty = i.quantity + delta;
                return newQty >= 1 ? { ...i, quantity: newQty } : i;
            }
            return i;
        }));
    };

    const removeFromCart = (dishId: string) => setCart(prev => prev.filter(i => i.dishId !== dishId));

    const handleCreateCustomer = async () => {
        if (!newCustName.trim()) return;
        try {
            const { data, error } = await supabase.from('customers').insert({
                name: newCustName.trim(),
                phone: newCustPhone.trim() || null
            }).select().single();

            if (error) throw error;
            setCustomers(prev => [...prev, data]);

            // Auto Select
            setSelectedCustomerId(data.id);
            setSelectedCustomerObj(data);
            setCustomerSearch('');

            setShowCreateCustomer(false);
            setNewCustName('');
            setNewCustPhone('');
            setShowCustomerDropdown(false);
        } catch (err: any) {
            console.error(err);
            alert("Error al crear cliente: " + err.message);
        }
    };

    const handleSelectCustomer = (c: any) => {
        setSelectedCustomerId(c.id);
        setSelectedCustomerObj(c);
        setCustomerSearch(''); // Clear search to maybe show name instead? 
        setShowCustomerDropdown(false);
    };

    const handleClearCustomer = () => {
        setSelectedCustomerId('');
        setSelectedCustomerObj(null);
        setCustomerSearch('');
    };

    const handleCheckout = async () => {
        if (cart.length === 0) return;
        setCheckoutProcessing(true);

        try {
            const { error } = await supabase.rpc('register_sale', {
                p_sale_total: cartTotal,
                p_payment_method: selectedPaymentMethod,
                p_items: cart.map(i => ({ dish_id: i.dishId, quantity: i.quantity, price: i.price })),
                p_customer_id: selectedCustomerId || null,
                p_delivery_fee: parseFloat(deliveryFee) || 0,
                p_extras_amount: parseFloat(extrasAmount) || 0,
                p_extras_details: extrasDetails,
                p_user_id: user?.id
            });

            if (error) throw error;

            // Reset
            setCart([]);
            // Keep customer selected? Usually better to reset for next sale in POS
            handleClearCustomer();
            setDeliveryFee('');
            setExtrasAmount('');
            setExtrasDetails('');
            setShowSuccess(true);

            setTimeout(() => {
                setShowSuccess(false);
            }, 3000);

        } catch (err: any) {
            console.error(err);
            alert("Error al procesar venta: " + err.message);
        } finally {
            setCheckoutProcessing(false);
        }
    };

    return (
        <div className="bg-[#F8F9FB] dark:bg-slate-900 min-h-screen font-display text-slate-800 dark:text-gray-100 transition-colors duration-500 relative flex flex-col">
            <HeaderSimple />

            {/* Success Overlay */}
            {showSuccess && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 p-12 rounded-[40px] shadow-2xl flex flex-col items-center gap-6 animate-bounce-in relative overflow-hidden max-w-sm text-center">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-indigo-500/10"></div>
                        <div className="size-24 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center shadow-lg shadow-blue-500/30 relative z-10">
                            <span className="material-symbols-outlined text-6xl text-blue-600 dark:text-blue-400">check_circle</span>
                        </div>
                        <h2 className="text-3xl font-black text-slate-800 dark:text-white relative z-10">¡Venta Exitosa!</h2>
                        <p className="text-slate-500 font-bold relative z-10">La transacción ha sido registrada.</p>
                        <div className="absolute top-5 left-1/4 w-2 h-2 rounded-full bg-blue-500 animate-ping"></div>
                        <div className="absolute bottom-10 right-10 w-3 h-3 rounded-full bg-indigo-500 animate-ping delay-200"></div>
                    </div>
                </div>
            )}

            <main className="flex-1 max-w-4xl mx-auto w-full px-4 md:px-0 pt-8 pb-20 flex flex-col gap-8">

                {/* 1. Header & CUSTOMER SELECTION (Priority #1) */}
                <header className="flex flex-col gap-4 relative group mt-2" ref={customerRef}>
                    <div className="flex items-center justify-between mb-2">
                        <button onClick={() => navigate('/home')} className="flex items-center gap-2 text-slate-400 hover:text-blue-500 transition-colors">
                            <span className="material-symbols-outlined text-2xl">arrow_back</span>
                            <span className="text-[10px] uppercase font-black tracking-widest">Atrás</span>
                        </button>
                        <span className="text-[10px] uppercase font-black tracking-widest px-2 py-1 rounded-md bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                            Nueva Venta
                        </span>
                    </div>

                    {/* Customer Input - Replaces "Project Name" style */}
                    <div className="relative">
                        {selectedCustomerObj ? (
                            <div className="flex items-center gap-4 group/customer">
                                <div className="flex-1">
                                    <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                                        {selectedCustomerObj.name}
                                        <button
                                            onClick={handleClearCustomer}
                                            className="size-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all active:scale-95"
                                        >
                                            <span className="material-symbols-outlined text-sm">close</span>
                                        </button>
                                    </h1>
                                    {selectedCustomerObj.phone && (
                                        <p className="text-slate-400 font-bold text-lg mt-1 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-sm">call</span> {selectedCustomerObj.phone}
                                        </p>
                                    )}
                                </div>
                                <div className="absolute -left-6 top-1/2 -translate-y-1/2 text-blue-500 opacity-0 group-hover/customer:opacity-100 transition-opacity">
                                    <span className="material-symbols-outlined text-2xl">person</span>
                                </div>
                            </div>
                        ) : (
                            <div className="relative">
                                <input
                                    type="text"
                                    value={customerSearch}
                                    onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); }}
                                    onClick={() => setShowCustomerDropdown(true)}
                                    placeholder="Nombre del Cliente..."
                                    className="w-full text-3xl md:text-5xl font-black bg-transparent border-none focus:ring-0 p-0 placeholder-gray-300 text-slate-900 dark:text-white caret-blue-600 transition-all"
                                    autoFocus
                                />
                                {/* Underline Effect */}
                                <div className="h-0.5 md:h-1 w-24 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 rounded-full mt-2 transition-all duration-700 ease-out shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>

                                {/* Dropdown */}
                                {showCustomerDropdown && (
                                    <div className="absolute top-full left-0 mt-4 w-full md:w-96 bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-100 dark:border-white/10 overflow-hidden z-50 animate-fade-in-up">
                                        <div className="p-2">
                                            {filteredCustomers.length > 0 ? (
                                                <>
                                                    {filteredCustomers.slice(0, 5).map(c => (
                                                        <button
                                                            key={c.id}
                                                            onClick={() => handleSelectCustomer(c)}
                                                            className="w-full text-left p-4 rounded-2xl hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors flex items-center gap-3 group/item"
                                                        >
                                                            <div className="size-10 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-400 group-hover/item:text-blue-500 group-hover/item:bg-blue-100 dark:group-hover/item:bg-blue-500/20 transition-colors">
                                                                <span className="material-symbols-outlined">person</span>
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-slate-800 dark:text-white">{c.name}</p>
                                                                {c.phone && <p className="text-xs text-slate-400">{c.phone}</p>}
                                                            </div>
                                                        </button>
                                                    ))}
                                                    <div className="h-[1px] bg-slate-100 dark:bg-white/5 my-2"></div>
                                                </>
                                            ) : (
                                                <div className="p-4 text-center text-slate-400 italic text-sm">No encontrado</div>
                                            )}

                                            <button
                                                onClick={() => setShowCreateCustomer(true)}
                                                className="w-full text-left p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold transition-colors flex items-center gap-3"
                                            >
                                                <span className="material-symbols-outlined">add_circle</span>
                                                Crear "{customerSearch}"
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </header>

                {/* Create Customer Inline Modal */}
                {showCreateCustomer && (
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-xl border border-blue-100 dark:border-blue-900/30 animate-fade-in relative z-40">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-blue-500">person_add</span>
                                Nuevo Cliente
                            </h3>
                            <button onClick={() => setShowCreateCustomer(false)} className="text-slate-400 hover:text-slate-600"><span className="material-symbols-outlined">close</span></button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input
                                className="w-full bg-slate-50 dark:bg-white/5 border-transparent focus:border-blue-500 rounded-xl px-4 py-3 font-bold"
                                placeholder="Nombre Completo"
                                value={newCustName}
                                onChange={e => setNewCustName(e.target.value)}
                                autoFocus
                            />
                            <input
                                className="w-full bg-slate-50 dark:bg-white/5 border-transparent focus:border-blue-500 rounded-xl px-4 py-3 font-bold"
                                placeholder="Teléfono"
                                value={newCustPhone}
                                onChange={e => setNewCustPhone(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={handleCreateCustomer}
                            className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-xl shadow-lg shadow-blue-500/20 transition-all"
                        >
                            GUARDAR CLIENTE
                        </button>
                    </div>
                )}

                {/* 2. OMNI SEARCH BAR (Product Selector) */}
                <section ref={searchRef} className="relative z-30">
                    <div className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-soft dark:shadow-none border border-slate-100 dark:border-slate-700 overflow-hidden hover:shadow-lg focus-within:shadow-xl transition-all duration-300">
                        <div className="flex items-center px-6 py-4 gap-4">
                            <span className="material-symbols-outlined text-3xl text-blue-500">search</span>
                            <input
                                type="text"
                                className="flex-1 bg-transparent border-none focus:ring-0 text-xl font-medium placeholder-slate-300 dark:text-white"
                                placeholder="Buscar productos para la orden..."
                                value={omniSearchQuery}
                                onChange={(e) => { setOmniSearchQuery(e.target.value); setShowOmniDropdown(true); }}
                                onFocus={() => setShowOmniDropdown(true)}
                            />
                            {omniSearchQuery && (
                                <button onClick={() => setOmniSearchQuery('')} className="text-slate-300 hover:text-red-500">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Dropdown Results */}
                    {showOmniDropdown && omniSearchQuery.trim() && (
                        <div className="absolute top-full left-0 right-0 mt-3 bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden max-h-[350px] overflow-y-auto animate-fade-in-up z-50 p-2">
                            {filteredDishes.length > 0 ? (
                                <div className="space-y-1">
                                    {filteredDishes.map(dish => (
                                        <button
                                            key={dish.id}
                                            onClick={() => addToCart(dish)}
                                            className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors group text-left"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="size-12 rounded-xl bg-orange-100 dark:bg-orange-500/20 text-orange-600 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                                                    <span className="material-symbols-outlined">lunch_dining</span>
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-800 dark:text-white leading-tight">{dish.name}</h4>
                                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Producto</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="font-black text-slate-700 dark:text-white">{formatCurrency(dish.sale_price)}</span>
                                                <span className="material-symbols-outlined text-blue-300 group-hover:text-blue-600 text-2xl">add_circle</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-8 text-center text-slate-400">
                                    <span className="material-symbols-outlined text-4xl mb-2 text-slate-300">search_off</span>
                                    <p>No hay coincidencias</p>
                                </div>
                            )}
                        </div>
                    )}
                </section>

                {/* 3. CART & TOTALS LIST */}
                <section className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col">
                    {/* Cart Header */}
                    <div className="px-6 py-5 border-b border-slate-50 dark:border-white/5 flex justify-between items-center">
                        <h3 className="font-bold text-sm text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                            <span className="material-symbols-outlined text-slate-400">shopping_cart</span>
                            Items de la Venta
                        </h3>
                        <span className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-bold px-3 py-1 rounded-full">{cart.length}</span>
                    </div>

                    {/* List */}
                    <div className="min-h-[150px]">
                        {cart.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-300 dark:text-slate-600">
                                <span className="material-symbols-outlined text-5xl mb-3">remove_shopping_cart</span>
                                <p className="font-medium text-sm">Agrega productos desde el buscador</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-50 dark:divide-white/5">
                                {cart.map(item => (
                                    <div key={item.dishId} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group">
                                        <div className="flex items-center gap-4">
                                            {/* Qty Controls */}
                                            <div className="flex items-center bg-slate-100 dark:bg-white/5 rounded-xl p-1">
                                                <button onClick={() => updateQuantity(item.dishId, -1)} className="size-7 flex items-center justify-center hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-500 font-bold transition-all disabled:opacity-50">-</button>
                                                <span className="w-8 text-center font-bold text-sm text-slate-700 dark:text-white">{item.quantity}</span>
                                                <button onClick={() => updateQuantity(item.dishId, 1)} className="size-7 flex items-center justify-center hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-500 font-bold transition-all">+</button>
                                            </div>

                                            <div>
                                                <p className="font-bold text-slate-800 dark:text-white text-sm">{item.name}</p>
                                                <p className="text-xs text-slate-400">{formatCurrency(item.price)} unitario</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6">
                                            <p className="font-black text-slate-900 dark:text-white">{formatCurrency(item.price * item.quantity)}</p>
                                            <button
                                                onClick={() => removeFromCart(item.dishId)}
                                                className="size-8 rounded-full flex items-center justify-center text-slate-300 hover:bg-red-50 hover:text-red-500 transition-all active:scale-95"
                                            >
                                                <span className="material-symbols-outlined text-lg">delete</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer / Extras */}
                    <div className="bg-slate-50/50 dark:bg-slate-900/50 p-6 border-t border-slate-100 dark:border-white/5 space-y-4">

                        {/* Extras & Delivery Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Delivery */}
                            <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-white/5 flex items-center gap-3 focus-within:border-blue-300 transition-colors shadow-sm">
                                <div className="size-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-500">
                                    <span className="material-symbols-outlined">local_shipping</span>
                                </div>
                                <div className="flex-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Domicilio</label>
                                    <input
                                        type="number"
                                        className="w-full bg-transparent font-bold text-slate-800 dark:text-white outline-none"
                                        placeholder="0"
                                        value={deliveryFee}
                                        onChange={e => setDeliveryFee(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Extra */}
                            <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-white/5 flex items-center gap-3 focus-within:border-blue-300 transition-colors shadow-sm">
                                <div className="size-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-500">
                                    <span className="material-symbols-outlined">extension</span>
                                </div>
                                <div className="flex-1 flex gap-2">
                                    <div className="flex-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Valor Extra</label>
                                        <input
                                            type="number"
                                            className="w-full bg-transparent font-bold text-slate-800 dark:text-white outline-none"
                                            placeholder="0"
                                            value={extrasAmount}
                                            onChange={e => setExtrasAmount(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex-1 border-l border-slate-100 dark:border-white/10 pl-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Detalle</label>
                                        <input
                                            type="text"
                                            className="w-full bg-transparent font-medium text-sm text-slate-600 dark:text-slate-300 outline-none"
                                            placeholder="..."
                                            value={extrasDetails}
                                            onChange={e => setExtrasDetails(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <hr className="border-slate-200 dark:border-white/5" />

                        {/* Payment & Total */}
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">

                            {/* Payment Method Selector */}
                            <div className="flex gap-2 p-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-white/10">
                                {paymentMethods.map(pm => (
                                    <button
                                        key={pm.id}
                                        onClick={() => setSelectedPaymentMethod(pm.name)}
                                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${selectedPaymentMethod === pm.name ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5'}`}
                                    >
                                        {pm.name}
                                    </button>
                                ))}
                            </div>

                            <div className="text-right">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total a Pagar</p>
                                <p className="text-4xl font-black text-slate-900 dark:text-white leading-none">{formatCurrency(cartTotal)}</p>
                            </div>
                        </div>

                        {/* Checkout Button */}
                        <button
                            onClick={handleCheckout}
                            disabled={cart.length === 0 || checkoutProcessing}
                            className="w-full py-5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-lg font-black uppercase tracking-widest shadow-xl shadow-blue-500/30 active:scale-[0.99] transition-all disabled:opacity-50 disabled:grayscale relative overflow-hidden group"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></div>
                            {checkoutProcessing ? (
                                <span className="material-symbols-outlined animate-spin text-2xl">progress_activity</span>
                            ) : (
                                <div className="flex items-center justify-center gap-2">
                                    <span className="material-symbols-outlined">check_circle</span>
                                    <span>Confirmar Venta</span>
                                </div>
                            )}
                        </button>

                    </div>
                </section>

            </main>
        </div>
    );
};

export default SalesPage;
