import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabaseClient';
import { useNavigate } from 'react-router-dom';
import HeaderSimple from '../components/HeaderSimple';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../constants';
import LiquidModal from '../components/LiquidModal';
import LiquidLoader from '../components/LiquidLoader';
import { OutflowType, ExpenseCategory, PaymentMethod, PurchaseResult } from '../types';

// Types for this page
interface Provider {
    id: string;
    name: string;
    phone?: string;
    category?: string;
}

const OutflowPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useApp();

    // View State
    const [activeTab, setActiveTab] = useState<OutflowType>('COMPRA');
    const [loading, setLoading] = useState(false);

    // Data
    const [ingredients, setIngredients] = useState<any[]>([]);
    const [providers, setProviders] = useState<Provider[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [categories, setCategories] = useState<ExpenseCategory[]>([]);

    // Common Form Fields
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedProviderId, setSelectedProviderId] = useState('');
    const [providerName, setProviderName] = useState('');
    const [paymentMethodId, setPaymentMethodId] = useState('');

    // Provider Search & Create States
    const [providerSearch, setProviderSearch] = useState('');
    const [showProviderDropdown, setShowProviderDropdown] = useState(false);
    const [showCreateProvider, setShowCreateProvider] = useState(false);
    const [newProviderName, setNewProviderName] = useState('');
    const [newProviderPhone, setNewProviderPhone] = useState('');
    const [newProviderCategory, setNewProviderCategory] = useState('');

    // Purchase Form
    const [selectedIngredientId, setSelectedIngredientId] = useState('');
    const [ingredientSearch, setIngredientSearch] = useState('');
    const [purchaseQuantity, setPurchaseQuantity] = useState('');
    const [purchaseCost, setPurchaseCost] = useState('');
    const [showCreateIngredient, setShowCreateIngredient] = useState(false);
    const [newIngredientName, setNewIngredientName] = useState('');
    const [newIngredientUnit, setNewIngredientUnit] = useState('Kg');

    // Expense Form
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [expenseAmount, setExpenseAmount] = useState('');
    const [expenseNotes, setExpenseNotes] = useState('');
    const [showCreateCategory, setShowCreateCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');

    // Services for expense beneficiaries (maps to TercerosPage -> SERVICIOS)
    const [services, setServices] = useState<any[]>([]);
    const [serviceTypes, setServiceTypes] = useState<any[]>([]);
    const [selectedServiceId, setSelectedServiceId] = useState('');
    const [serviceSearch, setServiceSearch] = useState('');
    const [showServiceDropdown, setShowServiceDropdown] = useState(false);
    const [showCreateService, setShowCreateService] = useState(false);
    const [newServiceName, setNewServiceName] = useState('');
    const [newServiceTypeId, setNewServiceTypeId] = useState('');

    // Success State
    const [showSuccess, setShowSuccess] = useState(false);
    const [lastResult, setLastResult] = useState<{ type: OutflowType; result?: PurchaseResult } | null>(null);

    // Fetch Data
    useEffect(() => {
        if (!user) return;
        fetchData();
    }, [user]);

    const fetchData = async () => {
        setLoading(true);

        // Fetch ingredients
        const { data: ingData } = await supabase.from('ingredients').select('*').order('name');
        if (ingData) setIngredients(ingData);

        // Fetch providers
        const { data: provData } = await supabase.from('providers').select('*').order('name');
        if (provData) setProviders(provData);

        // Fetch payment methods
        const { data: pmData } = await supabase.from('payment_methods').select('*').eq('active', true);
        if (pmData) {
            setPaymentMethods(pmData);
            if (pmData.length > 0) setPaymentMethodId(pmData[0].id);
        }

        // Fetch expense categories
        const { data: catData } = await supabase.from('expense_categories').select('*').order('name');
        if (catData) setCategories(catData);

        // Fetch services (beneficiaries for expenses - maps to TercerosPage SERVICIOS)
        const { data: servData } = await supabase.from('services').select('*, service_types(name)').order('name');
        if (servData) {
            setServices(servData.map((s: any) => ({
                ...s,
                service_type_name: s.service_types?.name || ''
            })));
        }

        // Fetch service types
        const { data: stData } = await supabase.from('service_types').select('*').order('name');
        if (stData) setServiceTypes(stData);

        setLoading(false);
    };

    // Computed
    const selectedIngredient = useMemo(() => {
        return ingredients.find(i => i.id === selectedIngredientId);
    }, [selectedIngredientId, ingredients]);

    const filteredIngredients = useMemo(() => {
        if (!ingredientSearch.trim()) return ingredients;
        return ingredients.filter(i => i.name.toLowerCase().includes(ingredientSearch.toLowerCase()));
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
        return { old: currentStock, new: currentStock + addQty, unit: selectedIngredient.purchase_unit };
    }, [selectedIngredient, purchaseQuantity]);

    // Filter providers based on search
    const filteredProviders = useMemo(() => {
        if (!providerSearch.trim()) return providers;
        return providers.filter(p => p.name.toLowerCase().includes(providerSearch.toLowerCase()));
    }, [providers, providerSearch]);

    // Get selected provider object
    const selectedProviderObj = useMemo(() => {
        return providers.find(p => p.id === selectedProviderId);
    }, [providers, selectedProviderId]);

    // Create new provider handler
    const handleCreateProvider = async () => {
        if (!newProviderName.trim()) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('providers')
                .insert({
                    name: newProviderName.trim(),
                    phone: newProviderPhone.trim() || null,
                    category: newProviderCategory.trim() || null
                })
                .select()
                .single();

            if (error) throw error;

            // Add to local state and select the new provider
            setProviders(prev => [...prev, data]);
            setSelectedProviderId(data.id);
            setProviderName(data.name);

            // Reset create form
            setNewProviderName('');
            setNewProviderPhone('');
            setNewProviderCategory('');
            setShowCreateProvider(false);
            setProviderSearch('');
            setShowProviderDropdown(false);
        } catch (err: any) {
            console.error('Error creating provider:', err);
            alert('Error al crear proveedor: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // Filter services based on search (for GASTO beneficiaries)
    const filteredServices = useMemo(() => {
        if (!serviceSearch.trim()) return services;
        return services.filter(s => s.name.toLowerCase().includes(serviceSearch.toLowerCase()));
    }, [services, serviceSearch]);

    // Get selected service object
    const selectedServiceObj = useMemo(() => {
        return services.find(s => s.id === selectedServiceId);
    }, [services, selectedServiceId]);

    // Create new service handler (creates in TercerosPage -> SERVICIOS)
    const handleCreateService = async () => {
        if (!newServiceName.trim()) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('services')
                .insert({
                    name: newServiceName.trim(),
                    service_type_id: newServiceTypeId || null
                })
                .select('*, service_types(name)')
                .single();

            if (error) throw error;

            // Add to local state with service_type_name
            const newService = {
                ...data,
                service_type_name: data.service_types?.name || ''
            };
            setServices(prev => [...prev, newService]);
            setSelectedServiceId(data.id);

            // Reset create form
            setNewServiceName('');
            setNewServiceTypeId('');
            setShowCreateService(false);
            setServiceSearch('');
            setShowServiceDropdown(false);
        } catch (err: any) {
            console.error('Error creating service:', err);
            alert('Error al crear servicio: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // Reset form after successful submission
    const resetForm = () => {
        setSelectedIngredientId('');
        setIngredientSearch('');
        setPurchaseQuantity('');
        setPurchaseCost('');
        setProviderName('');
        setSelectedProviderId('');
        setProviderSearch('');
        setSelectedCategoryId('');
        setExpenseAmount('');
        setExpenseNotes('');
        setSelectedServiceId('');
        setServiceSearch('');
        setDate(new Date().toISOString().split('T')[0]);
    };

    // Handlers
    const handleCreateIngredient = async () => {
        if (!newIngredientName.trim()) return;
        setLoading(true);
        try {
            const { data: userData } = await supabase.auth.getUser();
            const { data, error } = await supabase
                .from('ingredients')
                .insert({
                    user_id: userData.user?.id,
                    name: newIngredientName.trim(),
                    purchase_price: 0,
                    purchase_unit: newIngredientUnit,
                    purchase_quantity: 0
                })
                .select()
                .single();

            if (error) throw error;

            setIngredients(prev => [...prev, data]);
            setSelectedIngredientId(data.id);
            setNewIngredientName('');
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
                .insert({ name: newCategoryName.trim(), icon: '💰' })
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
            // Create provider if new
            let finalProviderId = selectedProviderId;
            if (!finalProviderId && providerName.trim()) {
                await handleCreateProvider();
                // Use latest state after creation
            }

            if (activeTab === 'COMPRA') {
                if (!selectedIngredientId || !purchaseQuantity) {
                    throw new Error('Selecciona un insumo y cantidad');
                }

                const { data, error } = await supabase.rpc('register_purchase', {
                    p_ingredient_id: selectedIngredientId,
                    p_quantity: parseFloat(purchaseQuantity),
                    p_cost: parseFloat(purchaseCost) || 0,
                    p_date: new Date(date).toISOString(),
                    p_provider: providerName || null
                });

                if (error) throw error;

                // Create movement for accounting
                await supabase.rpc('create_purchase_movement', {
                    p_provider_id: selectedProviderId || null,
                    p_ingredient_id: selectedIngredientId,
                    p_quantity: parseFloat(purchaseQuantity),
                    p_cost: parseFloat(purchaseCost) || 0,
                    p_date: new Date(date).toISOString(),
                    p_notes: null
                });

                const result: PurchaseResult = data?.[0] || {
                    old_stock: newStockPreview?.old || 0,
                    new_stock: newStockPreview?.new || 0,
                    old_unit_cost: 0,
                    new_unit_cost: calculatedUnitCost
                };

                setLastResult({ type: 'COMPRA', result });
            } else {
                if (!selectedCategoryId || !expenseAmount) {
                    throw new Error('Selecciona una categoría y monto');
                }

                const { error } = await supabase.rpc('register_expense', {
                    p_category_id: selectedCategoryId,
                    p_amount: parseFloat(expenseAmount),
                    p_provider: selectedServiceObj?.name || providerName || null,
                    p_payment_method_id: paymentMethodId || null,
                    p_date: new Date(date).toISOString(),
                    p_notes: expenseNotes || null
                });

                if (error) throw error;

                // Create movement for accounting - now with service_id linking to TercerosPage SERVICIOS
                await supabase.rpc('create_expense_movement', {
                    p_service_id: selectedServiceId || null, // Links to TercerosPage -> SERVICIOS
                    p_category_id: selectedCategoryId,
                    p_amount: parseFloat(expenseAmount),
                    p_date: new Date(date).toISOString(),
                    p_notes: expenseNotes || null,
                    p_expense_id: null
                });

                setLastResult({ type: 'GASTO' });
            }

            setShowSuccess(true);
            resetForm();
            fetchData(); // Refresh data after submission
            setTimeout(() => setShowSuccess(false), 4000);

        } catch (err: any) {
            console.error('Submit error:', err);
            alert('Error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-[#F8F9FB] dark:bg-slate-900 min-h-screen text-slate-800 dark:text-white font-display flex flex-col transition-colors duration-300">
            <HeaderSimple />

            {/* Success Overlay */}
            {showSuccess && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 p-10 rounded-[32px] shadow-2xl flex flex-col items-center gap-4 relative overflow-hidden animate-bounce-in">
                        <div className={`absolute inset-0 bg-gradient-to-br ${lastResult?.type === 'COMPRA' ? 'from-blue-500/10 to-cyan-500/10' : 'from-amber-500/10 to-orange-500/10'}`} />
                        <div className={`size-24 rounded-full flex items-center justify-center mb-2 shadow-lg ${lastResult?.type === 'COMPRA' ? 'bg-blue-100 dark:bg-blue-500/20 shadow-blue-500/20' : 'bg-amber-100 dark:bg-amber-500/20 shadow-amber-500/20'}`}>
                            <span className="text-6xl">{lastResult?.type === 'COMPRA' ? '📦' : '💸'}</span>
                        </div>
                        <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
                            {lastResult?.type === 'COMPRA' ? '¡Compra Registrada!' : '¡Gasto Registrado!'}
                        </h2>
                        {lastResult?.type === 'COMPRA' && lastResult?.result && (
                            <div className="bg-blue-50 dark:bg-blue-900/30 px-6 py-3 rounded-xl border border-blue-100 dark:border-blue-500/20">
                                <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                    Stock: {lastResult.result.old_stock.toFixed(1)} → {lastResult.result.new_stock.toFixed(1)}
                                </p>
                            </div>
                        )}
                        {lastResult?.type === 'GASTO' && (
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Registrado en contabilidad</p>
                        )}
                        {/* Confetti */}
                        <div className={`absolute top-5 left-1/4 w-2 h-2 rounded-full animate-ping ${lastResult?.type === 'COMPRA' ? 'bg-blue-500' : 'bg-amber-500'}`} />
                        <div className={`absolute top-10 right-1/4 w-3 h-3 rounded-full animate-ping delay-100 ${lastResult?.type === 'COMPRA' ? 'bg-cyan-500' : 'bg-orange-500'}`} />
                        <div className={`absolute bottom-10 left-10 w-2 h-2 rounded-full animate-ping delay-200 ${lastResult?.type === 'COMPRA' ? 'bg-indigo-500' : 'bg-yellow-500'}`} />
                    </div>
                </div>
            )}

            <main className="flex-1 overflow-y-auto px-4 py-8 md:px-8">
                <div className="max-w-4xl mx-auto">

                    {/* Header */}
                    <div className="mb-8">
                        <button onClick={() => navigate('/home')} className="group flex items-center gap-2 text-slate-400 hover:text-emerald-500 mb-4 transition-all font-black text-[10px] uppercase tracking-[0.2em]">
                            <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-1 transition-transform">arrow_back</span>
                            Panel Principal
                        </button>
                        <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
                            💰 Registro de Salidas
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">
                            Compras de inventario y gastos operativos
                        </p>
                    </div>

                    {/* Main Mode Selector - Two Big Buttons */}
                    <div className="grid grid-cols-2 gap-6 mb-10">
                        {/* Compra Button */}
                        <button
                            onClick={() => setActiveTab('COMPRA')}
                            className={`relative p-8 rounded-[32px] border-2 transition-all overflow-hidden group ${activeTab === 'COMPRA'
                                ? 'bg-gradient-to-br from-blue-500 to-indigo-600 border-blue-500 text-white shadow-2xl shadow-blue-500/30 scale-[1.02]'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-blue-400 hover:shadow-lg'
                                }`}
                        >
                            {activeTab === 'COMPRA' && (
                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
                            )}
                            <div className="relative z-10 flex flex-col items-center text-center">
                                <div className={`size-20 rounded-[24px] flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${activeTab === 'COMPRA' ? 'bg-white/20' : 'bg-blue-50 dark:bg-blue-900/30'}`}>
                                    <span className="text-5xl">📦</span>
                                </div>
                                <h3 className={`text-xl font-black mb-2 ${activeTab === 'COMPRA' ? 'text-white' : 'text-slate-800 dark:text-white'}`}>
                                    Compra de Inventario
                                </h3>
                                <p className={`text-sm font-medium ${activeTab === 'COMPRA' ? 'text-blue-100' : 'text-slate-400'}`}>
                                    Afecta el stock de insumos
                                </p>
                            </div>
                            {activeTab === 'COMPRA' && (
                                <div className="absolute top-4 right-4 size-8 rounded-full bg-white/20 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-white">check</span>
                                </div>
                            )}
                        </button>

                        {/* Gasto Button */}
                        <button
                            onClick={() => setActiveTab('GASTO')}
                            className={`relative p-8 rounded-[32px] border-2 transition-all overflow-hidden group ${activeTab === 'GASTO'
                                ? 'bg-gradient-to-br from-amber-500 to-orange-600 border-amber-500 text-white shadow-2xl shadow-amber-500/30 scale-[1.02]'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-amber-400 hover:shadow-lg'
                                }`}
                        >
                            {activeTab === 'GASTO' && (
                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
                            )}
                            <div className="relative z-10 flex flex-col items-center text-center">
                                <div className={`size-20 rounded-[24px] flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${activeTab === 'GASTO' ? 'bg-white/20' : 'bg-amber-50 dark:bg-amber-900/30'}`}>
                                    <span className="text-5xl">💸</span>
                                </div>
                                <h3 className={`text-xl font-black mb-2 ${activeTab === 'GASTO' ? 'text-white' : 'text-slate-800 dark:text-white'}`}>
                                    Gasto Operativo
                                </h3>
                                <p className={`text-sm font-medium ${activeTab === 'GASTO' ? 'text-amber-100' : 'text-slate-400'}`}>
                                    Solo afecta contabilidad
                                </p>
                            </div>
                            {activeTab === 'GASTO' && (
                                <div className="absolute top-4 right-4 size-8 rounded-full bg-white/20 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-white">check</span>
                                </div>
                            )}
                        </button>
                    </div>

                    {/* Form Card */}
                    <div className="relative">
                        {/* AI Arc Glow */}
                        <div className="absolute inset-[-2px] rounded-[34px] overflow-hidden opacity-50 pointer-events-none">
                            <div
                                className="absolute inset-[-100%] animate-[spin_6s_linear_infinite] blur-lg will-change-transform"
                                style={{
                                    background: activeTab === 'COMPRA'
                                        ? 'conic-gradient(from 0deg, #3b82f6, #8b5cf6, #06b6d4, #3b82f6)'
                                        : 'conic-gradient(from 0deg, #f59e0b, #ef4444, #ec4899, #f59e0b)'
                                }}
                            />
                        </div>

                        <div className="relative bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-[32px] p-8 shadow-2xl border border-white/40 dark:border-white/10">

                            {/* Common Fields */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                {/* Date */}
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Fecha</label>
                                    <input
                                        type="date"
                                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 transition-all text-slate-700 dark:text-white"
                                        value={date}
                                        onChange={e => setDate(e.target.value)}
                                    />
                                </div>

                                {/* Provider */}
                                <div className="relative">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">
                                        {activeTab === 'COMPRA' ? 'Proveedor' : 'Beneficiario'}
                                    </label>

                                    {/* Search Input */}
                                    <div className="relative group">
                                        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 opacity-0 group-focus-within:opacity-100 transition-opacity blur p-[2px]"></div>
                                        <div className="relative bg-white dark:bg-slate-900 rounded-xl">
                                            <input
                                                type="text"
                                                placeholder={selectedProviderObj ? selectedProviderObj.name : (activeTab === 'COMPRA' ? "Buscar o crear proveedor..." : "Buscar o crear beneficiario...")}
                                                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 pr-10 text-sm font-bold outline-none focus:border-orange-500 transition-all text-slate-700 dark:text-white"
                                                value={providerSearch}
                                                onChange={e => {
                                                    setProviderSearch(e.target.value);
                                                    setShowProviderDropdown(true);
                                                }}
                                                onFocus={() => setShowProviderDropdown(true)}
                                            />
                                            {selectedProviderObj ? (
                                                <button
                                                    onClick={() => {
                                                        setSelectedProviderId('');
                                                        setProviderName('');
                                                        setProviderSearch('');
                                                    }}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-lg">close</span>
                                                </button>
                                            ) : (
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 pointer-events-none text-lg">storefront</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Selected Provider Badge */}
                                    {selectedProviderObj && (
                                        <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700/30 rounded-lg">
                                            <span className="material-symbols-outlined text-orange-600 dark:text-orange-400 text-lg">storefront</span>
                                            <span className="text-xs font-bold text-orange-700 dark:text-orange-400">{selectedProviderObj.name}</span>
                                            {selectedProviderObj.phone && <span className="text-xs text-slate-400">• {selectedProviderObj.phone}</span>}
                                        </div>
                                    )}

                                    {/* Dropdown */}
                                    {showProviderDropdown && !showCreateProvider && (
                                        <div className="absolute z-50 mt-2 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl max-h-64 overflow-y-auto">
                                            {/* Sin proveedor Option */}
                                            <button
                                                onClick={() => {
                                                    setSelectedProviderId('');
                                                    setProviderName('');
                                                    setProviderSearch('');
                                                    setShowProviderDropdown(false);
                                                }}
                                                className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border-b border-slate-100 dark:border-white/5"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="size-8 rounded-lg bg-slate-100 dark:bg-white/10 flex items-center justify-center">
                                                        <span className="material-symbols-outlined text-slate-400 text-sm">store</span>
                                                    </div>
                                                    <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Sin especificar</span>
                                                </div>
                                            </button>

                                            {/* Filtered Providers */}
                                            {filteredProviders.map(p => (
                                                <button
                                                    key={p.id}
                                                    onClick={() => {
                                                        setSelectedProviderId(p.id);
                                                        setProviderName(p.name);
                                                        setProviderSearch('');
                                                        setShowProviderDropdown(false);
                                                    }}
                                                    className="w-full text-left px-4 py-3 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors border-b border-slate-100 dark:border-white/5 last:border-0"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="size-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                                                            <span className="material-symbols-outlined text-orange-600 dark:text-orange-400 text-sm">storefront</span>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-700 dark:text-white">{p.name}</p>
                                                            {p.phone && <p className="text-xs text-slate-400">{p.phone}</p>}
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}

                                            {/* Create New Provider Option */}
                                            <button
                                                onClick={() => {
                                                    setShowCreateProvider(true);
                                                    setNewProviderName(providerSearch);
                                                }}
                                                className="w-full text-left px-4 py-3 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors bg-gradient-to-r from-green-50/50 to-transparent dark:from-green-900/10"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="size-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                                        <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-sm">add_business</span>
                                                    </div>
                                                    <span className="text-sm font-bold text-green-600 dark:text-green-400">
                                                        + Crear Nuevo {activeTab === 'COMPRA' ? 'Proveedor' : 'Beneficiario'} {providerSearch.trim() && `"${providerSearch}"`}
                                                    </span>
                                                </div>
                                            </button>
                                        </div>
                                    )}

                                    {/* Create Provider Form */}
                                    {showCreateProvider && (
                                        <div className="absolute z-50 mt-2 w-full p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/30 rounded-xl shadow-xl space-y-3">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="material-symbols-outlined text-green-600 dark:text-green-400">add_business</span>
                                                <span className="text-sm font-bold text-green-700 dark:text-green-400">
                                                    Nuevo {activeTab === 'COMPRA' ? 'Proveedor' : 'Beneficiario'}
                                                </span>
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="Nombre *"
                                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm font-medium outline-none focus:border-green-500 transition-all text-slate-700 dark:text-white"
                                                value={newProviderName}
                                                onChange={e => setNewProviderName(e.target.value)}
                                                autoFocus
                                            />
                                            <input
                                                type="tel"
                                                placeholder="Teléfono (opcional)"
                                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm font-medium outline-none focus:border-green-500 transition-all text-slate-700 dark:text-white"
                                                value={newProviderPhone}
                                                onChange={e => setNewProviderPhone(e.target.value)}
                                            />
                                            <input
                                                type="text"
                                                placeholder="Categoría (opcional)"
                                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm font-medium outline-none focus:border-green-500 transition-all text-slate-700 dark:text-white"
                                                value={newProviderCategory}
                                                onChange={e => setNewProviderCategory(e.target.value)}
                                            />
                                            <div className="flex gap-2 pt-1">
                                                <button
                                                    onClick={handleCreateProvider}
                                                    disabled={!newProviderName.trim() || loading}
                                                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white py-2 px-4 rounded-lg text-xs font-bold uppercase tracking-wide transition-all flex items-center justify-center gap-2"
                                                >
                                                    {loading ? (
                                                        <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                                                    ) : (
                                                        <>
                                                            <span className="material-symbols-outlined text-sm">check</span>
                                                            Crear
                                                        </>
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setShowCreateProvider(false);
                                                        setNewProviderName('');
                                                        setNewProviderPhone('');
                                                        setNewProviderCategory('');
                                                    }}
                                                    className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold uppercase tracking-wide hover:bg-slate-300 dark:hover:bg-slate-600 transition-all"
                                                >
                                                    Cancelar
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Click outside to close dropdown */}
                                    {showProviderDropdown && !showCreateProvider && (
                                        <div
                                            className="fixed inset-0 z-40"
                                            onClick={() => setShowProviderDropdown(false)}
                                        />
                                    )}
                                </div>

                                {/* Payment Method */}
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Método de Pago</label>
                                    <select
                                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer text-slate-700 dark:text-white"
                                        value={paymentMethodId}
                                        onChange={e => setPaymentMethodId(e.target.value)}
                                    >
                                        <option value="">Seleccionar...</option>
                                        {paymentMethods.map(pm => <option key={pm.id} value={pm.id}>{pm.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <hr className="border-slate-100 dark:border-white/5 mb-8" />

                            {/* Purchase Form */}
                            {activeTab === 'COMPRA' && (
                                <div className="space-y-6 animate-fade-in">
                                    <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                                        <span className="size-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-lg">inventory_2</span>
                                        </span>
                                        Datos de la Compra
                                    </h3>

                                    {/* Ingredient Search */}
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Insumo a Comprar</label>

                                        {selectedIngredient ? (
                                            <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/30 rounded-xl px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <span className="size-10 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-xl">📦</span>
                                                    <div>
                                                        <span className="font-bold text-blue-800 dark:text-blue-300">{selectedIngredient.name}</span>
                                                        <span className="text-xs text-blue-500 ml-2">({selectedIngredient.purchase_unit})</span>
                                                        <p className="text-xs text-blue-400">Stock actual: {selectedIngredient.purchase_quantity} {selectedIngredient.purchase_unit}</p>
                                                    </div>
                                                </div>
                                                <button onClick={() => setSelectedIngredientId('')} className="text-blue-400 hover:text-red-500 transition-colors p-2">
                                                    <span className="material-symbols-outlined">close</span>
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400">search</span>
                                                <input
                                                    type="text"
                                                    placeholder="Buscar insumo..."
                                                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm font-bold outline-none focus:border-blue-500 transition-all text-slate-700 dark:text-white"
                                                    value={ingredientSearch}
                                                    onChange={e => setIngredientSearch(e.target.value)}
                                                />

                                                {ingredientSearch && (
                                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto">
                                                        {filteredIngredients.length > 0 ? (
                                                            filteredIngredients.slice(0, 6).map(ing => (
                                                                <button
                                                                    key={ing.id}
                                                                    onClick={() => { setSelectedIngredientId(ing.id); setIngredientSearch(''); }}
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
                                                                    onClick={() => { setNewIngredientName(ingredientSearch); setShowCreateIngredient(true); }}
                                                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-black uppercase hover:bg-blue-700 transition-colors"
                                                                >
                                                                    + Crear "{ingredientSearch}"
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Create Modal for Ingredient (Nested) */}
                                                <LiquidModal
                                                    isOpen={showCreateIngredient}
                                                    onClose={() => setShowCreateIngredient(false)}
                                                    title="Nuevo Insumo"
                                                >
                                                    <div className="space-y-4">
                                                        <input
                                                            type="text"
                                                            placeholder="Nombre del insumo"
                                                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none"
                                                            value={newIngredientName}
                                                            onChange={e => setNewIngredientName(e.target.value)}
                                                        />
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-400 mb-2 block">Unidad de Compra</label>
                                                            <div className="flex gap-2">
                                                                {['Kg', 'L', 'Unidad', 'Paquete'].map(u => (
                                                                    <button
                                                                        key={u}
                                                                        onClick={() => setNewIngredientUnit(u)}
                                                                        className={`flex-1 py-2 rounded-lg text-xs font-bold border ${newIngredientUnit === u ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-500'}`}
                                                                    >
                                                                        {u}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={handleCreateIngredient}
                                                            className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold"
                                                        >
                                                            Crear Insumo
                                                        </button>
                                                    </div>
                                                </LiquidModal>
                                            </div>
                                        )}
                                    </div>

                                    {/* Calculations */}
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Cantidad</label>
                                            <input
                                                type="number"
                                                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 transition-all text-slate-700 dark:text-white"
                                                placeholder="0.00"
                                                value={purchaseQuantity}
                                                onChange={e => setPurchaseQuantity(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Costo Total ($)</label>
                                            <input
                                                type="number"
                                                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 transition-all text-slate-700 dark:text-white"
                                                placeholder="$ 0"
                                                value={purchaseCost}
                                                onChange={e => setPurchaseCost(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {/* Preview Card */}
                                    {newStockPreview && (
                                        <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4 flex items-center justify-between border border-slate-100 dark:border-white/5">
                                            <div className="text-xs">
                                                <p className="text-slate-400 font-bold uppercase tracking-wider">Nuevo Costo Unitario</p>
                                                <p className="text-lg font-black text-slate-700 dark:text-white">{formatCurrency(calculatedUnitCost)} / {newStockPreview.unit}</p>
                                            </div>
                                            <div className="text-right text-xs">
                                                <p className="text-slate-400 font-bold uppercase tracking-wider">Nuevo Stock</p>
                                                <div className="flex items-center gap-2 justify-end">
                                                    <span className="text-slate-500 line-through">{newStockPreview.old}</span>
                                                    <span className="material-symbols-outlined text-xs text-blue-500">arrow_forward</span>
                                                    <span className="text-lg font-black text-blue-600 dark:text-blue-400">{newStockPreview.new} {newStockPreview.unit}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Submit Button */}
                                    <button
                                        onClick={handleSubmit}
                                        disabled={loading || !selectedIngredient || !purchaseQuantity}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-500/30 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                                    >
                                        {loading ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : <span className="material-symbols-outlined">inventory_2</span>}
                                        Registrar Compra
                                    </button>
                                </div>
                            )}

                            {/* Expense Form */}
                            {activeTab === 'GASTO' && (
                                <div className="space-y-6 animate-fade-in">
                                    <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                                        <span className="size-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-600 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-lg">account_balance_wallet</span>
                                        </span>
                                        Datos del Gasto
                                    </h3>

                                    {/* Category Selector */}
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Categoría de Gasto</label>
                                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                            {categories.map(cat => (
                                                <button
                                                    key={cat.id}
                                                    onClick={() => setSelectedCategoryId(cat.id)}
                                                    className={`p-3 rounded-xl border text-left transition-all flex flex-col items-center gap-2 ${selectedCategoryId === cat.id
                                                        ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-500 text-orange-700 dark:text-orange-400'
                                                        : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 hover:border-orange-300'
                                                        }`}
                                                >
                                                    <span className="text-2xl">{cat.icon}</span>
                                                    <span className="text-xs font-bold">{cat.name}</span>
                                                </button>
                                            ))}
                                            <button
                                                onClick={() => { setShowCreateCategory(true); setNewCategoryName(''); }}
                                                className="p-3 rounded-xl border border-dashed border-slate-300 dark:border-white/20 text-slate-400 hover:border-orange-400 hover:text-orange-500 transition-all flex flex-col items-center justify-center gap-1"
                                            >
                                                <span className="material-symbols-outlined">add</span>
                                                <span className="text-[10px] font-black uppercase">Nueva</span>
                                            </button>
                                        </div>

                                        {/* Create Category Modal */}
                                        <LiquidModal
                                            isOpen={showCreateCategory}
                                            onClose={() => setShowCreateCategory(false)}
                                            title="Nueva Categoría"
                                        >
                                            <div className="space-y-4">
                                                <input
                                                    type="text"
                                                    placeholder="Nombre de la categoría"
                                                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none"
                                                    value={newCategoryName}
                                                    onChange={e => setNewCategoryName(e.target.value)}
                                                />
                                                <button
                                                    onClick={handleCreateCategory}
                                                    disabled={!newCategoryName.trim()}
                                                    className="w-full bg-orange-600 text-white py-3 rounded-xl font-bold"
                                                >
                                                    Guardar
                                                </button>
                                            </div>
                                        </LiquidModal>
                                    </div>

                                    {/* Amount */}
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Monto Total ($)</label>
                                        <input
                                            type="number"
                                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-lg font-black outline-none focus:border-orange-500 transition-all text-slate-700 dark:text-white"
                                            placeholder="$ 0"
                                            value={expenseAmount}
                                            onChange={e => setExpenseAmount(e.target.value)}
                                        />
                                    </div>

                                    {/* Notes */}
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Notas / Detalles</label>
                                        <textarea
                                            rows={2}
                                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-orange-500 transition-all text-slate-700 dark:text-white resize-none"
                                            placeholder="Detalles adicionales del gasto..."
                                            value={expenseNotes}
                                            onChange={e => setExpenseNotes(e.target.value)}
                                        />
                                    </div>

                                    {/* Submit Button */}
                                    <button
                                        onClick={handleSubmit}
                                        disabled={loading || !selectedCategoryId || !expenseAmount}
                                        className="w-full bg-orange-600 hover:bg-orange-700 text-white py-4 rounded-xl font-black uppercase tracking-[0.2em] shadow-xl shadow-orange-500/30 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                                    >
                                        {loading ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : <span className="material-symbols-outlined">payments</span>}
                                        Registrar Gasto
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default OutflowPage;
