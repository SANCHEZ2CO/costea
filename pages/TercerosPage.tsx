import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabaseClient';
import { useNavigate } from 'react-router-dom';
import HeaderSimple from '../components/HeaderSimple';
import { useApp } from '../context/AppContext';
import LiquidModal from '../components/LiquidModal';
import LiquidLoader from '../components/LiquidLoader';
import { Customer, Provider, Service, ServiceType } from '../types';

type TercerosTab = 'CLIENTES' | 'PROVEEDORES' | 'SERVICIOS';

const TercerosPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useApp();
    const [activeTab, setActiveTab] = useState<TercerosTab>('CLIENTES');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);

    // Data states
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [providers, setProviders] = useState<Provider[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);

    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [saving, setSaving] = useState(false);

    // Form states - Customer
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [customerAddress, setCustomerAddress] = useState('');
    const [customerNotes, setCustomerNotes] = useState('');

    // Form states - Provider
    const [providerName, setProviderName] = useState('');
    const [providerNit, setProviderNit] = useState('');
    const [providerPhone, setProviderPhone] = useState('');
    const [providerEmail, setProviderEmail] = useState('');
    const [providerCategory, setProviderCategory] = useState('');
    const [providerNotes, setProviderNotes] = useState('');

    // Form states - Service
    const [serviceName, setServiceName] = useState('');
    const [serviceTypeId, setServiceTypeId] = useState('');

    // Fetch data
    useEffect(() => {
        if (!user) return;
        fetchData();
    }, [user]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [customersRes, providersRes, servicesRes, typesRes] = await Promise.all([
                supabase.from('customers').select('*').order('name'),
                supabase.from('providers').select('*').order('name'),
                supabase.from('services').select('*, service_types(name)').order('name'),
                supabase.from('service_types').select('*').order('name')
            ]);

            if (customersRes.data) setCustomers(customersRes.data);
            if (providersRes.data) setProviders(providersRes.data);
            if (servicesRes.data) {
                setServices(servicesRes.data.map((s: any) => ({
                    ...s,
                    service_type_name: s.service_types?.name || ''
                })));
            }
            if (typesRes.data) setServiceTypes(typesRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Filtered items based on search
    const filteredItems = useMemo(() => {
        const query = searchQuery.toLowerCase();
        if (activeTab === 'CLIENTES') {
            return customers.filter(c => c.name.toLowerCase().includes(query) || c.phone?.toLowerCase().includes(query));
        } else if (activeTab === 'PROVEEDORES') {
            return providers.filter(p => p.name.toLowerCase().includes(query) || p.nit?.toLowerCase().includes(query));
        } else {
            return services.filter(s => s.name.toLowerCase().includes(query) || s.service_type_name?.toLowerCase().includes(query));
        }
    }, [activeTab, customers, providers, services, searchQuery]);

    // Reset form
    const resetForm = () => {
        setCustomerName('');
        setCustomerPhone('');
        setCustomerEmail('');
        setCustomerAddress('');
        setCustomerNotes('');
        setProviderName('');
        setProviderNit('');
        setProviderPhone('');
        setProviderEmail('');
        setProviderCategory('');
        setProviderNotes('');
        setServiceName('');
        setServiceTypeId('');
        setEditingItem(null);
    };

    // Open modal for new/edit
    const openModal = (item?: any) => {
        resetForm();
        if (item) {
            setEditingItem(item);
            if (activeTab === 'CLIENTES') {
                setCustomerName(item.name || '');
                setCustomerPhone(item.phone || '');
                setCustomerEmail(item.email || '');
                setCustomerAddress(item.address || '');
                setCustomerNotes(item.notes || '');
            } else if (activeTab === 'PROVEEDORES') {
                setProviderName(item.name || '');
                setProviderNit(item.nit || '');
                setProviderPhone(item.phone || '');
                setProviderEmail(item.email || '');
                setProviderCategory(item.category || '');
                setProviderNotes(item.notes || '');
            } else {
                setServiceName(item.name || '');
                setServiceTypeId(item.service_type_id || '');
            }
        }
        setShowModal(true);
    };

    // Save handler
    const handleSave = async () => {
        setSaving(true);
        try {
            if (activeTab === 'CLIENTES') {
                if (!customerName.trim()) {
                    alert('El nombre es obligatorio');
                    setSaving(false);
                    return;
                }
                const data = {
                    name: customerName.trim(),
                    phone: customerPhone.trim() || null,
                    email: customerEmail.trim() || null,
                    address: customerAddress.trim() || null,
                    notes: customerNotes.trim() || null
                };
                if (editingItem) {
                    await supabase.from('customers').update(data).eq('id', editingItem.id);
                } else {
                    await supabase.from('customers').insert(data);
                }
            } else if (activeTab === 'PROVEEDORES') {
                if (!providerName.trim()) {
                    alert('El nombre es obligatorio');
                    setSaving(false);
                    return;
                }
                const data = {
                    name: providerName.trim(),
                    nit: providerNit.trim() || null,
                    phone: providerPhone.trim() || null,
                    email: providerEmail.trim() || null,
                    category: providerCategory.trim() || null,
                    notes: providerNotes.trim() || null
                };
                if (editingItem) {
                    await supabase.from('providers').update(data).eq('id', editingItem.id);
                } else {
                    await supabase.from('providers').insert(data);
                }
            } else {
                if (!serviceName.trim()) {
                    alert('El nombre es obligatorio');
                    setSaving(false);
                    return;
                }
                const data = {
                    name: serviceName.trim(),
                    service_type_id: serviceTypeId || null
                };
                if (editingItem) {
                    await supabase.from('services').update(data).eq('id', editingItem.id);
                } else {
                    await supabase.from('services').insert(data);
                }
            }
            setShowModal(false);
            resetForm();
            fetchData();
        } catch (error) {
            console.error('Error saving:', error);
            alert('Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    // Delete handler
    const handleDelete = async (id: string) => {
        const confirmMsg = activeTab === 'CLIENTES' ? '¿Eliminar cliente?' :
            activeTab === 'PROVEEDORES' ? '¿Eliminar proveedor?' : '¿Eliminar servicio?';
        if (!confirm(confirmMsg)) return;

        try {
            const table = activeTab === 'CLIENTES' ? 'customers' :
                activeTab === 'PROVEEDORES' ? 'providers' : 'services';
            await supabase.from(table).delete().eq('id', id);
            fetchData();
        } catch (error) {
            console.error('Error deleting:', error);
            alert('No se puede eliminar. Puede estar en uso.');
        }
    };

    // Tab config
    const tabConfig = {
        CLIENTES: { icon: 'person', label: 'Clientes', color: 'blue' },
        PROVEEDORES: { icon: 'local_shipping', label: 'Proveedores', color: 'green' },
        SERVICIOS: { icon: 'receipt_long', label: 'Servicios', color: 'purple' }
    };

    const getTabColor = (tab: TercerosTab, active: boolean) => {
        const colors = {
            CLIENTES: active ? 'bg-blue-600 text-white shadow-blue-500/30' : 'hover:bg-blue-50 dark:hover:bg-blue-500/10 text-blue-600 dark:text-blue-400',
            PROVEEDORES: active ? 'bg-green-600 text-white shadow-green-500/30' : 'hover:bg-green-50 dark:hover:bg-green-500/10 text-green-600 dark:text-green-400',
            SERVICIOS: active ? 'bg-purple-600 text-white shadow-purple-500/30' : 'hover:bg-purple-50 dark:hover:bg-purple-500/10 text-purple-600 dark:text-purple-400'
        };
        return colors[tab];
    };

    const getItemColors = () => {
        if (activeTab === 'CLIENTES') return { bg: 'bg-blue-50 dark:bg-blue-500/10', icon: 'text-blue-600', border: 'border-blue-200 dark:border-blue-500/30' };
        if (activeTab === 'PROVEEDORES') return { bg: 'bg-green-50 dark:bg-green-500/10', icon: 'text-green-600', border: 'border-green-200 dark:border-green-500/30' };
        return { bg: 'bg-purple-50 dark:bg-purple-500/10', icon: 'text-purple-600', border: 'border-purple-200 dark:border-purple-500/30' };
    };

    return (
        <div className="bg-[#F8F9FB] dark:bg-slate-900 min-h-screen text-slate-800 dark:text-white font-display flex flex-col transition-colors duration-300">
            <HeaderSimple />

            <main className="flex-1 max-w-6xl mx-auto w-full px-4 md:px-8 py-8">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <button onClick={() => navigate('/')} className="group flex items-center gap-2 text-slate-400 hover:text-blue-500 mb-2 transition-all font-black text-[10px] uppercase tracking-[0.2em]">
                            <span className="material-symbols-outlined text-[16px] group-hover:-translate-x-1 transition-transform">arrow_back</span>
                            Panel Principal
                        </button>
                        <h1 className="text-3xl font-black tracking-tight">Terceros</h1>
                        <p className="text-slate-400 font-medium text-sm mt-1">Gestiona clientes, proveedores y servicios</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    {(Object.keys(tabConfig) as TercerosTab[]).map(tab => (
                        <button
                            key={tab}
                            onClick={() => { setActiveTab(tab); setSearchQuery(''); }}
                            className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${getTabColor(tab, activeTab === tab)} ${activeTab === tab ? 'shadow-lg' : ''}`}
                        >
                            <span className="material-symbols-outlined text-lg">{tabConfig[tab].icon}</span>
                            {tabConfig[tab].label}
                        </button>
                    ))}
                </div>

                {/* Search + Add */}
                <div className="flex gap-4 mb-6">
                    <div className="flex-1 relative group">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 group-focus-within:text-blue-500 transition-colors">search</span>
                        <input
                            type="text"
                            placeholder={`Buscar ${tabConfig[activeTab].label.toLowerCase()}...`}
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl pl-12 pr-4 py-3 text-sm font-bold outline-none focus:border-blue-500 transition-all"
                        />
                    </div>
                    <button
                        onClick={() => openModal()}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-black uppercase tracking-wider transition-all shadow-lg ${activeTab === 'CLIENTES' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30' : activeTab === 'PROVEEDORES' ? 'bg-green-600 hover:bg-green-700 shadow-green-500/30' : 'bg-purple-600 hover:bg-purple-700 shadow-purple-500/30'} text-white`}
                    >
                        <span className="material-symbols-outlined">add</span>
                        Nuevo
                    </button>
                </div>

                {/* List */}
                {loading ? (
                    <div className="flex justify-center py-20">
                        <LiquidLoader />
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="text-center py-20 text-slate-400">
                        <span className="material-symbols-outlined text-5xl mb-4">
                            {activeTab === 'CLIENTES' ? 'person_off' : activeTab === 'PROVEEDORES' ? 'local_shipping' : 'receipt_long'}
                        </span>
                        <p className="text-sm font-bold uppercase">No hay {tabConfig[activeTab].label.toLowerCase()} registrados</p>
                        <button onClick={() => openModal()} className="mt-4 text-blue-500 hover:underline text-sm font-bold">
                            + Crear el primero
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredItems.map((item: any) => {
                            const colors = getItemColors();
                            return (
                                <div
                                    key={item.id}
                                    className={`bg-white dark:bg-slate-800 rounded-2xl p-4 border ${colors.border} hover:shadow-lg transition-all group cursor-pointer`}
                                    onClick={() => openModal(item)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`size-12 rounded-xl ${colors.bg} flex items-center justify-center`}>
                                            <span className={`material-symbols-outlined ${colors.icon}`}>
                                                {activeTab === 'CLIENTES' ? 'person' : activeTab === 'PROVEEDORES' ? 'store' : 'receipt_long'}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-slate-800 dark:text-white truncate">{item.name}</h3>
                                            <p className="text-sm text-slate-500 truncate">
                                                {activeTab === 'CLIENTES' && (item.phone || 'Sin teléfono')}
                                                {activeTab === 'PROVEEDORES' && (item.nit ? `NIT: ${item.nit}` : 'Sin NIT')}
                                                {activeTab === 'SERVICIOS' && (item.service_type_name || 'Sin tipo')}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); openModal(item); }}
                                                className="size-10 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-blue-100 dark:hover:bg-blue-500/20 flex items-center justify-center transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-slate-500 hover:text-blue-600">edit</span>
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                                                className="size-10 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-red-100 dark:hover:bg-red-500/20 flex items-center justify-center transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-slate-500 hover:text-red-600">delete</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Modal */}
            <LiquidModal
                isOpen={showModal}
                onClose={() => { setShowModal(false); resetForm(); }}
                title={`${editingItem ? 'Editar' : 'Nuevo'} ${activeTab === 'CLIENTES' ? 'Cliente' : activeTab === 'PROVEEDORES' ? 'Proveedor' : 'Servicio'}`}
            >
                <div className="space-y-4">
                    {activeTab === 'CLIENTES' && (
                        <>
                            <div>
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 block">Nombre *</label>
                                <input
                                    type="text"
                                    value={customerName}
                                    onChange={e => setCustomerName(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 transition-all"
                                    placeholder="Nombre del cliente"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 block">Teléfono</label>
                                    <input
                                        type="text"
                                        value={customerPhone}
                                        onChange={e => setCustomerPhone(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 transition-all"
                                        placeholder="300 123 4567"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 block">Email</label>
                                    <input
                                        type="email"
                                        value={customerEmail}
                                        onChange={e => setCustomerEmail(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 transition-all"
                                        placeholder="correo@ejemplo.com"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 block">Dirección</label>
                                <input
                                    type="text"
                                    value={customerAddress}
                                    onChange={e => setCustomerAddress(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 transition-all"
                                    placeholder="Dirección de entrega"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 block">Notas</label>
                                <textarea
                                    value={customerNotes}
                                    onChange={e => setCustomerNotes(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 transition-all resize-none"
                                    rows={2}
                                    placeholder="Notas adicionales..."
                                />
                            </div>
                        </>
                    )}

                    {activeTab === 'PROVEEDORES' && (
                        <>
                            <div>
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 block">Nombre *</label>
                                <input
                                    type="text"
                                    value={providerName}
                                    onChange={e => setProviderName(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-green-500 transition-all"
                                    placeholder="Nombre del proveedor"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 block">NIT / CC</label>
                                    <input
                                        type="text"
                                        value={providerNit}
                                        onChange={e => setProviderNit(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-green-500 transition-all"
                                        placeholder="900.123.456-7"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 block">Teléfono</label>
                                    <input
                                        type="text"
                                        value={providerPhone}
                                        onChange={e => setProviderPhone(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-green-500 transition-all"
                                        placeholder="300 123 4567"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 block">Email</label>
                                    <input
                                        type="email"
                                        value={providerEmail}
                                        onChange={e => setProviderEmail(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-green-500 transition-all"
                                        placeholder="correo@proveedor.com"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 block">Categoría</label>
                                    <input
                                        type="text"
                                        value={providerCategory}
                                        onChange={e => setProviderCategory(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-green-500 transition-all"
                                        placeholder="Alimentos, Empaques..."
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 block">Notas</label>
                                <textarea
                                    value={providerNotes}
                                    onChange={e => setProviderNotes(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-green-500 transition-all resize-none"
                                    rows={2}
                                    placeholder="Notas adicionales..."
                                />
                            </div>
                        </>
                    )}

                    {activeTab === 'SERVICIOS' && (
                        <>
                            <div>
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 block">Nombre del Servicio *</label>
                                <input
                                    type="text"
                                    value={serviceName}
                                    onChange={e => setServiceName(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-purple-500 transition-all"
                                    placeholder="Ej: Arriendo local"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 block">Tipo de Servicio</label>
                                <select
                                    value={serviceTypeId}
                                    onChange={e => setServiceTypeId(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-purple-500 transition-all appearance-none cursor-pointer"
                                >
                                    <option value="">Seleccionar tipo...</option>
                                    {serviceTypes.map(st => (
                                        <option key={st.id} value={st.id}>{st.name}</option>
                                    ))}
                                </select>
                            </div>
                        </>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={() => { setShowModal(false); resetForm(); }}
                            className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className={`flex-1 py-3 rounded-xl text-white font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'CLIENTES' ? 'bg-blue-600 hover:bg-blue-700' : activeTab === 'PROVEEDORES' ? 'bg-green-600 hover:bg-green-700' : 'bg-purple-600 hover:bg-purple-700'} disabled:opacity-50`}
                        >
                            {saving ? (
                                <span className="material-symbols-outlined animate-spin">progress_activity</span>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined">{editingItem ? 'save' : 'add'}</span>
                                    {editingItem ? 'Guardar' : 'Crear'}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </LiquidModal>
        </div>
    );
};

export default TercerosPage;
