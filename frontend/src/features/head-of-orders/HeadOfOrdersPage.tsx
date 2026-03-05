import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
    Plus, RefreshCw, Receipt, CheckCircle, Trash2,
    DollarSign, Factory, CalendarRange, FileText, Building2, PieChart,
    TrendingUp, Warehouse, Search, ChevronLeft, ChevronRight, Package, Pencil,
    History, List, Download, User as UserIcon, MapPin, Eye, Edit3
} from 'lucide-react';
import { getWarehouses, fulfillStock, activateReservation, deleteReservation, getReservations, getInvoices, createWarehouse } from '@/api/orders-management';
import { useProductStore } from '@/store/productStore';
import { AddPaymentModal } from './AddPaymentModal';
import { CreateReservationModal } from './CreateReservationModal';
import { DatePicker } from '@/components/ui/date-picker';
import { toast } from 'sonner';
import { format } from 'date-fns';
import axiosInstance from '@/api/axios';

const ITEMS_PER_PAGE = 10;

const statusColor: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    draft: 'bg-gray-100 text-gray-700',
    partial: 'bg-blue-100 text-blue-800',
    paid: 'bg-emerald-100 text-emerald-800',
};

const HeadOfOrdersPage: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const tab = searchParams.get('tab') || 'manufacturers';
    const setTab = (val: string) => setSearchParams({ tab: val });

    // ----- Manufacturers tab -----
    const [manufacturers, setManufacturers] = useState<any[]>([]);
    const [selectedMfr, setSelectedMfr] = useState<any>(null);
    const [mfrProducts, setMfrProducts] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [stockMap, setStockMap] = useState<Record<number, number>>({}); // product_id → qty
    const [mfrPage, setMfrPage] = useState(1);
    const [mfrProductsLoading, setMfrProductsLoading] = useState(false);
    const [showPrixodModal, setShowPrixodModal] = useState(false);

    // Warehouse tab
    const [selectedWarehouse, setSelectedWarehouse] = useState<any>(null);
    const [showCreateWhModal, setShowCreateWhModal] = useState(false);
    const [newWhName, setNewWhName] = useState('');
    const [newWhLoading, setNewWhLoading] = useState(false);

    // Edit product (quantity adjustment) modal
    const [editProduct, setEditProduct] = useState<any>(null);
    const [editQty, setEditQty] = useState('');
    const [editLoading, setEditLoading] = useState(false);

    // Prixod form
    const [prixodMfr, setPrixodMfr] = useState<any>(null);
    const [prixodProd, setPrixodProd] = useState('');
    const [prixodQty, setPrixodQty] = useState('');
    const prixodWh = warehouses.length > 0 ? warehouses[0].id.toString() : '';

    // ----- Reservations tab -----
    const [reservations, setReservations] = useState<any[]>([]);
    const [resSearch, setResSearch] = useState('');

    // ----- Invoices tab -----
    const [invoices, setInvoices] = useState<any[]>([]);
    const [invSearch, setInvSearch] = useState('');

    // ----- Wholesale tab -----
    const [medOrgs, setMedOrgs] = useState<any[]>([]);
    const [orgSearch, setOrgSearch] = useState('');

    // ----- Modals -----
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
    const [selectedResItems, setSelectedResItems] = useState<any[]>([]);
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [selectedResForReturn, setSelectedResForReturn] = useState<any>(null);
    const [returnQuantities, setReturnQuantities] = useState<Record<number, number>>({});
    const [returnLoading, setReturnLoading] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [showProductListModal, setShowProductListModal] = useState(false);
    const [showPaymentHistoryModal, setShowPaymentHistoryModal] = useState(false);
    const [selectedResForHistory, setSelectedResForHistory] = useState<any>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedResToEdit, setSelectedResToEdit] = useState<any>(null);
    const [editFacturaNumber, setEditFacturaNumber] = useState('');
    const [editRealizationDate, setEditRealizationDate] = useState<Date | string | undefined>('');
    const [editDiscount, setEditDiscount] = useState(0);
    const [editMode, setEditMode] = useState<'factura' | 'date' | 'discount'>('factura');

    // Filter states
    const [dateStart, setDateStart] = useState('');
    const [dateEnd, setDateEnd] = useState('');
    const [selectedMedRep, setSelectedMedRep] = useState('all');
    const [selectedCompany, setSelectedCompany] = useState('all');
    const [selectedType, setSelectedType] = useState('all');
    const [invNumSearch, setInvNumSearch] = useState('');

    const [loading, setLoading] = useState(false);
    const { products, fetchProducts } = useProductStore();

    // products belonging to selected prixod manufacturer
    const prixodMfrProducts = prixodMfr
        ? (products || []).filter((p: any) =>
            p.manufacturers?.some((m: any) => m.id == prixodMfr.id) ||
            p.manufacturer_id == prixodMfr.id
        )
        : [];

    useEffect(() => {
        fetchProducts();
        loadWarehouses();
        if (tab === 'manufacturers') loadManufacturers();
        if (tab === 'reservations') loadReservations();
        if (tab === 'invoices') loadInvoices();
        if (tab === 'wholesale') loadMedOrgs();
        if (tab === 'reports') { loadReservations(); loadInvoices(); }
    }, [tab]);

    // Load stock map when warehouses change
    useEffect(() => {
        if (warehouses.length > 0) buildStockMap();
    }, [warehouses]);

    const buildStockMap = () => {
        const map: Record<number, number> = {};
        warehouses.forEach(wh => {
            (wh.stocks || []).forEach((s: any) => {
                map[s.product_id] = (map[s.product_id] || 0) + s.quantity;
            });
        });
        setStockMap(map);
    };

    const loadManufacturers = async () => {
        setLoading(true);
        try {
            const res = await axiosInstance.get('/manufacturers/');
            const data = res.data?.items || res.data || [];
            setManufacturers(data);
            if (data.length > 0 && !selectedMfr) {
                handleSelectMfr(data[0]);
            }
        } catch { toast.error("Ошибка загрузки производителей"); }
        finally { setLoading(false); }
    };

    const handleSelectMfr = async (mfr: any) => {
        setSelectedMfr(mfr);
        setMfrPage(1);
        setMfrProductsLoading(true);
        try {
            const res = await axiosInstance.get('/products/', {
                params: { manufacturer_id: mfr.id, limit: 200 }
            });
            const data = res.data?.items || res.data || [];
            setMfrProducts(data);
        } catch { toast.error("Ошибка загрузки товаров"); }
        finally { setMfrProductsLoading(false); }
    };

    const loadWarehouses = async () => {
        try {
            const wh = await getWarehouses();
            setWarehouses(wh);
            // Auto-select first warehouse if none selected
            if (!selectedWarehouse && wh.length > 0) setSelectedWarehouse(wh[0]);
        } catch { }
    };

    const handleCreateWarehouse = async () => {
        if (!newWhName.trim()) return;
        setNewWhLoading(true);
        try {
            const created = await createWarehouse({ name: newWhName.trim(), warehouse_type: 'central' });
            toast.success('Склад создан');
            setNewWhName('');
            setShowCreateWhModal(false);
            await loadWarehouses();
            setSelectedWarehouse(created);
        } catch (e: any) {
            toast.error(e.response?.data?.detail || 'Ошибка при создании склада');
        } finally {
            setNewWhLoading(false);
        }
    };

    const loadReservations = async () => {
        setLoading(true);
        try { setReservations(await getReservations()); }
        catch { toast.error("Ошибка загрузки броней"); }
        finally { setLoading(false); }
    };

    const handleDownloadFactura = async (res: any) => {
        try {
            const orgName = res.med_org?.name || 'nomalum_korxona';
            const orgInn = res.med_org?.inn || 'inn_yoq';
            const rawDate = res.invoice?.realization_date || res.invoice?.created_at;
            const dateStr = rawDate ? format(new Date(rawDate), 'dd.MM.yyyy') : 'sana_yoq';

            const sanitizedName = `${orgName}_${orgInn}_${dateStr}`.replace(/[\\/:*?"<>|]/g, '');
            const filename = `${sanitizedName}.xlsx`;

            const response = await axiosInstance.get(`/sales/reservations/${res.id}/export`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            toast.error("Ошибка при скачивании файла");
            console.error(error);
        }
    };

    const loadInvoices = async () => {
        setLoading(true);
        try { setInvoices(await getInvoices()); }
        catch { toast.error("Ошибка загрузки фактур"); }
        finally { setLoading(false); }
    };

    const handleOpenInvoiceEdit = (res: any, mode: 'factura' | 'date' | 'discount') => {
        setSelectedResToEdit(res);
        setEditMode(mode);
        if (mode === 'factura') setEditFacturaNumber(res.invoice?.factura_number || '');
        if (mode === 'date') setEditRealizationDate(res.invoice?.realization_date || '');
        if (mode === 'discount') setEditDiscount(res.items?.[0]?.discount_percent || 0);
        setShowEditModal(true);
    };

    const handleSaveInvoiceEdit = async () => {
        if (!selectedResToEdit) return;
        setLoading(true);
        console.log('Saving invoice edit:', {
            id: selectedResToEdit.id,
            mode: editMode,
            data: {
                factura_number: editFacturaNumber,
                realization_date: editRealizationDate,
                discount_percent: editDiscount
            }
        });
        try {
            await axiosInstance.patch(`/domain/orders/management/reservations/${selectedResToEdit.id}/data`, {
                factura_number: editMode === 'factura' ? editFacturaNumber : undefined,
                realization_date: editMode === 'date' ? (editRealizationDate ? new Date(editRealizationDate).toISOString() : null) : undefined,
                discount_percent: editMode === 'discount' ? editDiscount : undefined
            });
            toast.success("Данные успешно обновлены");
            setShowEditModal(false);
            loadReservations();
        } catch (error) {
            console.error('Error saving invoice edit:', error);
            toast.error("Ошибка при обновлении данных");
        } finally {
            setLoading(false);
        }
    };

    const loadMedOrgs = async () => {
        setLoading(true);
        try {
            const res = await axiosInstance.get('/crm/organizations/?limit=300');
            const data = res.data?.items || res.data || [];
            setMedOrgs(data);
        } catch { toast.error("Ошибка загрузки организаций"); }
        finally { setLoading(false); }
    };

    const handlePrixod = async () => {
        if (!prixodProd || !prixodQty) { toast.error('Выберите товар и укажите количество'); return; }
        const whId = selectedWarehouse?.id ?? (warehouses.length > 0 ? warehouses[0].id : null);
        if (!whId) { toast.error('Склад не найден'); return; }
        try {
            await fulfillStock(whId, parseInt(prixodProd), parseInt(prixodQty));
            toast.success('Товар успешно принят на склад');
            setPrixodQty(''); setPrixodProd(''); setPrixodMfr(null);
            setShowPrixodModal(false);
            const wh = await getWarehouses();
            setWarehouses(wh);
            // Re-select the same warehouse to refresh its stock list
            if (selectedWarehouse) {
                const updated = wh.find((w: any) => w.id === selectedWarehouse.id);
                if (updated) setSelectedWarehouse(updated);
            }
        } catch { toast.error('Произошла ошибка'); }
    };

    const handleActivate = async (id: number) => {
        try { await activateReservation(id); toast.success("Bron aktiv qilindi"); loadReservations(); }
        catch (e: any) { toast.error(e.response?.data?.detail || "Xatolik"); }
    };

    const handleDeleteRes = async (id: number) => {
        if (!confirm("O'chirishni tasdiqlaysizmi?")) return;
        try { await deleteReservation(id); toast.success("O'chirildi"); loadReservations(); }
        catch { toast.error("Ошибка при удалении"); }
    };

    // Pagination for manufacturer products
    const totalMfrPages = Math.max(1, Math.ceil(mfrProducts.length / ITEMS_PER_PAGE));
    const pagedMfrProducts = mfrProducts.slice((mfrPage - 1) * ITEMS_PER_PAGE, mfrPage * ITEMS_PER_PAGE);

    const handleReturnSubmit = async () => {
        if (!selectedResForReturn) return;
        const itemsToReturn = Object.entries(returnQuantities)
            .filter(([_, qty]) => qty > 0)
            .map(([pid, qty]) => ({ product_id: parseInt(pid), quantity: qty }));

        if (itemsToReturn.length === 0) {
            toast.error("Miqdorni kiriting (Укажите количество для возврата)");
            return;
        }

        setReturnLoading(true);
        try {
            await axiosInstance.post(`/sales/reservations/${selectedResForReturn.id}/return`, { items: itemsToReturn });
            toast.success("Возврат оформлен успешно (Возврат выполнен)");
            setShowReturnModal(false);
            setReturnQuantities({});
            loadReservations();
            loadInvoices(); // Refund impacts total sums
        } catch (e: any) {
            toast.error(e.response?.data?.detail || "Xatolik (Ошибка оформления возврата)");
        } finally {
            setReturnLoading(false);
        }
    };

    const handleOpenEdit = (p: any) => {
        setEditProduct(p);
        setEditQty('');
    };

    const handleSaveEdit = async () => {
        if (!editProduct || !editQty) return;
        const qty = parseInt(editQty);
        if (isNaN(qty) || qty <= 0) { toast.error('Введите корректное количество'); return; }
        const whId = selectedWarehouse?.id ?? (warehouses.length > 0 ? warehouses[0].id : null);
        if (!whId) { toast.error('Склад не найден'); return; }
        setEditLoading(true);
        try {
            await fulfillStock(whId, editProduct.id, qty);
            toast.success('Количество успешно обновлено');
            setEditProduct(null);
            setEditQty('');
            const wh = await getWarehouses();
            setWarehouses(wh);
            if (selectedWarehouse) {
                const updated = wh.find((w: any) => w.id === selectedWarehouse.id);
                if (updated) setSelectedWarehouse(updated);
            }
        } catch (e: any) {
            toast.error(e.response?.data?.detail || 'Ошибка при сохранении');
        } finally {
            setEditLoading(false);
        }
    };

    const filteredRes = reservations.filter(r =>
        (r.med_org?.name || '').toLowerCase().includes(resSearch.toLowerCase()) ||
        (r.invoice?.invoice_number || '').toLowerCase().includes(resSearch.toLowerCase())
    );
    const filteredInv = invoices.filter(i => String(i.id).includes(invSearch) || String(i.reservation_id).includes(invSearch));
    const filteredOrgs = medOrgs.filter(o => o.name?.toLowerCase().includes(orgSearch.toLowerCase()));

    return (
        <div className="flex flex-col h-full bg-white">
            {/* ---- TABS ---- */}
            <div className="bg-slate-900 px-4 pt-3">
                <div className="flex gap-1">
                    {[
                        { key: 'manufacturers', icon: Warehouse, label: 'Склады' },
                        { key: 'reservations', icon: CalendarRange, label: 'Брони' },
                        { key: 'invoices', icon: FileText, label: 'Фактуры' },
                        { key: 'wholesale', icon: Building2, label: 'Оптовые компании' },
                        { key: 'reports', icon: PieChart, label: 'Отчеты' },
                    ].map(t => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all ${tab === t.key
                                ? 'bg-white text-slate-900'
                                : 'text-slate-300 hover:text-white hover:bg-white/10'
                                }`}
                        >
                            <t.icon className="w-4 h-4" />
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ============================================================
                TAB 1: СКЛАД
            ============================================================ */}
            {tab === 'manufacturers' && (
                <div className="flex-1 overflow-y-auto bg-gray-50 p-6 space-y-4">

                    {/* TOP: Warehouse selector chips */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Склады</span>
                            <button
                                onClick={() => setShowCreateWhModal(true)}
                                className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors px-2 py-1 rounded hover:bg-blue-50"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Добавить
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2 p-3">
                            {warehouses.length === 0 ? (
                                <span className="text-slate-400 text-sm py-2 px-3">Склады не найдены</span>
                            ) : warehouses.map((wh: any) => (
                                <button
                                    key={wh.id}
                                    onClick={() => setSelectedWarehouse(wh)}
                                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all border
                                        ${selectedWarehouse?.id === wh.id
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200'
                                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700'
                                        }`}
                                >
                                    <Warehouse className="w-3.5 h-3.5 opacity-70" />
                                    {wh.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* BOTTOM: Products in selected warehouse */}
                    {selectedWarehouse ? (
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-xl font-bold text-slate-800">
                                    Склад: <span className="text-blue-700">{selectedWarehouse.name}</span>
                                </h2>
                                <Button
                                    onClick={() => { setPrixodMfr(null); setPrixodProd(''); setPrixodQty(''); setShowPrixodModal(true); }}
                                    className="bg-transparent border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold uppercase tracking-wide text-xs px-6"
                                    variant="outline"
                                >
                                    ДОБАВИТЬ
                                </Button>
                            </div>

                            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-100 bg-slate-50">
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-8">#</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Название продукта</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Категория</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Цена</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Количество</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-16">Действие</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(() => {
                                            // Products in this warehouse from its stocks list
                                            const whStocks: any[] = selectedWarehouse.stocks || [];
                                            if (whStocks.length === 0) return (
                                                <tr>
                                                    <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                                                        На этом складе нет товаров
                                                    </td>
                                                </tr>
                                            );
                                            return whStocks.map((stock: any, idx: number) => {
                                                const prod = products.find((p: any) => p.id === stock.product_id);
                                                return (
                                                    <tr key={stock.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                                        <td className="px-4 py-3 text-sm text-slate-400">{idx + 1}</td>
                                                        <td className="px-4 py-3 text-sm font-semibold text-slate-800">{prod?.name || `#${stock.product_id}`}</td>
                                                        <td className="px-4 py-3 text-sm">
                                                            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                                                                {prod?.category?.name || '—'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-slate-700">
                                                            {prod?.price?.toLocaleString() || '—'}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm">
                                                            <span className={`font-bold ${stock.quantity > 0 ? 'text-slate-800' : 'text-red-400'}`}>
                                                                {stock.quantity.toLocaleString()}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {prod && (
                                                                <button
                                                                    onClick={() => handleOpenEdit(prod)}
                                                                    className="p-1.5 rounded hover:bg-blue-50 text-blue-500 hover:text-blue-700 transition-colors"
                                                                    title="Изменить количество"
                                                                >
                                                                    <Pencil className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            });
                                        })()}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center py-20 text-slate-400">
                            <div className="text-center">
                                <Warehouse className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>Выберите склад выше</p>
                            </div>
                        </div>
                    )}
                </div>
            )}


            {/* ============================================================
                TAB 2: БРОНИ
            ============================================================ */}
            {
                tab === 'reservations' && (
                    <div className="flex-1 p-4 bg-slate-50/50 overflow-auto">
                        {/* --- MODERN FILTER BAR --- */}
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-4">
                            <div className="grid grid-cols-1 md:grid-cols-7 gap-3 items-end">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Дата начала</label>
                                    <Input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} className="h-9 text-xs rounded-xl border-slate-200" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Дата конца</label>
                                    <Input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} className="h-9 text-xs rounded-xl border-slate-200" />
                                </div>
                                <div className="flex flex-col">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">МЕД. ПРЕДСТАВИТЕЛЬ</p>
                                    <Select value={selectedMedRep} onValueChange={setSelectedMedRep}>
                                        <SelectTrigger className="w-[180px] bg-white border-slate-200 rounded-xl font-bold text-slate-700 h-10 shadow-sm">
                                            <SelectValue placeholder="Все" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Все</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Company Filter */}
                                <div className="flex flex-col">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ВЫБЕРИТЕ КОМПАНИЮ</p>
                                    <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                                        <SelectTrigger className="w-[180px] bg-white border-slate-200 rounded-xl font-bold text-slate-700 h-10 shadow-sm">
                                            <SelectValue placeholder="Все" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Все</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Type Filter */}
                                <div className="flex flex-col">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ТИП</p>
                                    <Select value={selectedType} onValueChange={setSelectedType}>
                                        <SelectTrigger className="w-[120px] bg-white border-slate-200 rounded-xl font-bold text-slate-700 h-10 shadow-sm">
                                            <SelectValue placeholder="Все" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Все</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Invoice Search */}
                                <div className="flex flex-col">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">НОМЕР СЧЕТА</p>
                                    <Input
                                        value={invNumSearch}
                                        onChange={e => setInvNumSearch(e.target.value)}
                                        placeholder="000"
                                        className="w-[120px] bg-white border-slate-200 rounded-xl font-bold text-slate-700 h-10 shadow-sm"
                                    />
                                </div>
                                <Button className="h-10 bg-slate-800 hover:bg-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest w-full shadow-sm mt-auto">ПОИСК</Button>
                            </div>
                        </div>

                        {/* --- MODERN STATS BAR --- */}
                        <div className="bg-slate-100/60 backdrop-blur-sm p-4 rounded-2xl border border-slate-200/50 mb-4 flex flex-wrap items-center gap-4 shadow-inner">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Кол-во С/Ф</span>
                                <span className="text-sm font-black text-slate-700">{filteredRes.length}</span>
                            </div>
                            <div className="h-8 w-px bg-slate-200 mx-2" />
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Общая сумма реализации</span>
                                <span className="text-sm font-black text-slate-700">0 сум</span>
                            </div>

                            <div className="flex-1" />

                            <div className="flex gap-2">
                                <div className="px-5 py-2.5 bg-emerald-500/15 border border-emerald-500/20 rounded-xl flex flex-col items-center min-w-[140px]">
                                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-tighter">ПОСТУПЛЕНИЕ: 0 СУМ</span>
                                </div>
                                <div className="px-5 py-2.5 bg-orange-500/15 border border-orange-500/20 rounded-xl flex flex-col items-center min-w-[140px]">
                                    <span className="text-[9px] font-black text-orange-600 uppercase tracking-tighter">ДЕБИТОР: 0 СУМ</span>
                                </div>
                                <div className="px-5 py-2.5 bg-purple-500/15 border border-purple-500/20 rounded-xl flex flex-col items-center min-w-[140px]">
                                    <span className="text-[9px] font-black text-purple-600 uppercase tracking-tighter">ПРОМО: 0 СУМ</span>
                                </div>
                                <div className="px-5 py-2.5 bg-blue-500/15 border border-blue-500/20 rounded-xl flex flex-col items-center min-w-[140px]">
                                    <span className="text-[9px] font-black text-blue-600 uppercase tracking-tighter">СУММА БРОНИ: 0 СУМ</span>
                                </div>
                                <div className="px-5 py-2.5 bg-rose-500/15 border border-rose-500/20 rounded-xl flex flex-col items-center min-w-[140px]">
                                    <span className="text-[9px] font-black text-rose-600 uppercase tracking-tighter">ПРОС ДЕБИТОРКА: 0 СУМ</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-black text-slate-800 tracking-tight">Брони</h2>
                            <div className="flex gap-2">
                                <Button onClick={loadReservations} variant="outline" size="sm" className="rounded-xl border-slate-200">
                                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Обновить
                                </Button>
                                <Button onClick={() => setIsReservationModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/20">
                                    <Plus className="w-4 h-4 mr-2" /> Новая Бронь
                                </Button>
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xl shadow-slate-200/50">
                            <div className="overflow-x-auto">
                                <table className="min-w-[1400px] w-full text-[10px] whitespace-nowrap border-separate border-spacing-0">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200">
                                            <th className="px-3 py-3 text-left font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 italic">#</th>
                                            <th className="px-3 py-3 text-left font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Дата реализации</th>
                                            <th className="px-3 py-3 text-left font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Номер С/Ф</th>
                                            <th className="px-3 py-3 text-left font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Сумма С/Ф</th>
                                            <th className="px-3 py-3 text-left font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Контрагент</th>
                                            <th className="px-3 py-3 text-left font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">ИНН</th>
                                            <th className="px-3 py-3 text-left font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Поступление</th>
                                            <th className="px-3 py-3 text-left font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Дебитор</th>
                                            <th className="px-3 py-3 text-left font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Скидка %</th>
                                            <th className="px-3 py-3 text-left font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Дата брони</th>
                                            <th className="px-3 py-3 text-center font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Одобрено</th>
                                            <th className="px-3 py-3 text-left font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Производитель</th>
                                            <th className="px-3 py-3 text-center font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Промо</th>
                                            <th className="px-3 py-3 text-left font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Возвратить</th>
                                            <th className="px-3 py-3 text-left font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Регион</th>
                                            <th className="px-3 py-3 text-center font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Поступление</th>
                                            <th className="px-3 py-3 text-center font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">История</th>
                                            <th className="px-3 py-3 text-center font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Список</th>
                                            <th className="px-3 py-3 text-center font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Скачать</th>
                                            <th className="px-3 py-3 text-left font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">МП</th>
                                            <th className="px-3 py-3 text-left font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Тип К/А</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredRes.length === 0 ? (
                                            <tr>
                                                <td colSpan={23} className="text-center py-20 bg-white">
                                                    <div className="flex flex-col items-center gap-3">
                                                        <div className="p-4 bg-slate-50 rounded-full text-slate-300">
                                                            <Search className="w-8 h-8" />
                                                        </div>
                                                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Брони не найдены</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : filteredRes.map((res, idx) => {
                                            const discount = res.items?.[0]?.discount_percent || 0;
                                            const manufacturer = res.items?.[0]?.product?.manufacturers?.[0]?.name || '—';
                                            const region = res.med_org?.region?.name || '—';
                                            const paidAmount = res.invoice?.paid_amount || 0;
                                            const totalAmount = res.invoice?.total_amount || 0;
                                            const debt = totalAmount - paidAmount;
                                            const medRepName = res.med_org?.assigned_reps?.[0]?.full_name || '—';
                                            const orgType = res.med_org?.org_type || '—';
                                            const inn = res.med_org?.inn || '—';

                                            return (
                                                <tr key={res.id} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors group">
                                                    <td className="px-3 py-4 font-medium text-slate-400 group-hover:text-blue-600 transition-colors italic">{idx + 1}</td>
                                                    <td className="px-3 py-4">
                                                        <div className="flex items-center gap-1">
                                                            <span className="font-black text-slate-700 tracking-tight">{res.invoice?.realization_date ? format(new Date(res.invoice.realization_date), 'dd/MM/yyyy') : (res.invoice?.created_at ? format(new Date(res.invoice.created_at), 'dd/MM/yyyy') : '—')}</span>
                                                            <Pencil onClick={() => handleOpenInvoiceEdit(res, 'date')} className="w-3 h-3 text-slate-300 hover:text-blue-500 cursor-pointer transition-colors" />
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-4">
                                                        <div className="flex items-center gap-1">
                                                            <span className="font-black text-slate-700 tracking-tight">{res.invoice?.factura_number || '—'}</span>
                                                            <Pencil onClick={() => handleOpenInvoiceEdit(res, 'factura')} className="w-3 h-3 text-slate-300 hover:text-blue-500 cursor-pointer transition-colors" />
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-4 font-black text-slate-700 tracking-tight text-center">{res.invoice?.total_amount?.toLocaleString() || 0}</td>
                                                    <td className="px-3 py-4 font-black">
                                                        <div className="flex items-center gap-1 text-slate-800 tracking-tight">
                                                            <span>{res.med_org?.name || '—'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-4 font-black text-slate-600 tracking-tight">{inn}</td>
                                                    <td className="px-3 py-4 font-black text-emerald-600 text-center">{paidAmount.toLocaleString()}</td>
                                                    <td className="px-3 py-4 font-black text-rose-600 text-center">{debt.toLocaleString()}</td>
                                                    <td className="px-3 py-4 font-black text-center">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <span className="text-slate-700">{discount}%</span>
                                                            <Pencil onClick={() => handleOpenInvoiceEdit(res, 'discount')} className="w-3 h-3 text-slate-300 hover:text-blue-500 cursor-pointer transition-colors" />
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-4 font-bold text-slate-500 text-center">{res.created_at ? format(new Date(res.created_at), 'dd/MM/yyyy') : '—'}</td>
                                                    <td className="px-3 py-4 text-center">
                                                        <div className="flex justify-center">
                                                            <button
                                                                onClick={() => handleActivate(res.id)}
                                                                className={`w-8 h-4 rounded-full relative transition-colors ${res.status === 'approved' ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                                            >
                                                                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all shadow-sm ${res.status === 'approved' ? 'right-0.5' : 'left-0.5'}`} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-4 font-black text-slate-700 uppercase">{manufacturer}</td>
                                                    <td className="px-3 py-4 text-center font-black text-slate-700 italic opacity-50">0</td>
                                                    <td className="px-3 py-4 text-center">
                                                        <button
                                                            onClick={() => { setSelectedResForReturn(res); setReturnQuantities({}); setShowReturnModal(true); }}
                                                            className="p-1.5 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-all"
                                                        >
                                                            <RefreshCw className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                    <td className="px-3 py-4 font-bold text-slate-600">{region}</td>
                                                    <td className="px-3 py-4 text-center">
                                                        <Button
                                                            onClick={() => { setSelectedInvoice(res.invoice); setIsPaymentModalOpen(true); }}
                                                            className="h-8 bg-slate-100 hover:bg-blue-600 text-slate-600 hover:text-white rounded-xl text-[9px] font-black uppercase transition-all px-4"
                                                        >
                                                            ПОСТУПЛЕНИЕ
                                                        </Button>
                                                    </td>
                                                    <td className="px-3 py-4 text-center">
                                                        <button onClick={() => { setSelectedResForHistory(res); setShowPaymentHistoryModal(true); }} className="p-1.5 hover:bg-indigo-100 hover:text-indigo-600 rounded-lg transition-colors text-slate-400">
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                    <td className="px-3 py-4 text-center">
                                                        <button onClick={() => { setSelectedResItems(res.items || []); setShowProductListModal(true); }} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400">
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                    <td className="px-3 py-4 text-center">
                                                        <button onClick={() => handleDownloadFactura(res)} className="p-1.5 hover:bg-emerald-100 hover:text-emerald-700 rounded-lg transition-colors text-slate-400 cursor-pointer">
                                                            <Download className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                    <td className="px-3 py-4 font-black text-slate-800 tracking-tight">{medRepName}</td>
                                                    <td className="px-3 py-4 font-black text-slate-600 uppercase text-[9px] tracking-widest italic">{orgType}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                tab === 'invoices' && (
                    <div className="flex-1 p-6 bg-white overflow-y-auto">
                        <div className="flex items-center justify-between mb-4 gap-4">
                            <h2 className="text-lg font-semibold text-slate-800 shrink-0">Фактуры</h2>
                            <div className="relative flex-1 max-w-sm">
                                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                <Input value={invSearch} onChange={e => setInvSearch(e.target.value)}
                                    placeholder="По ID..."
                                    className="pl-9 border-slate-200" />
                            </div>
                            <Button onClick={loadInvoices} variant="outline" size="sm" className="border-slate-200">
                                <RefreshCw className="w-4 h-4" />
                            </Button>
                        </div>

                        {/* Quick stats */}
                        <div className="grid grid-cols-3 gap-4 mb-6">
                            {[
                                { label: "Всего оплачено", value: `${invoices.filter(i => i.status === 'paid').length} шт.`, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                                { label: "Частично оплачено", value: `${invoices.filter(i => i.status === 'partial').length} шт.`, color: 'text-yellow-600', bg: 'bg-yellow-50' },
                                { label: "Всего фактур", value: `${invoices.length} шт.`, color: 'text-blue-600', bg: 'bg-blue-50' },
                            ].map(s => (
                                <div key={s.label} className={`${s.bg} rounded-xl p-4 border border-slate-100`}>
                                    <p className="text-xs text-slate-500 mb-1">{s.label}</p>
                                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                                </div>
                            ))}
                        </div>

                        <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">№ С/Ф</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">ID брони</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Итого</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Оплачено</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Остаток</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Статус</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Оплата</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredInv.length === 0 ? (
                                        <tr><td colSpan={7} className="text-center py-12 text-slate-400">Фактуры отсутствуют</td></tr>
                                    ) : filteredInv.map(inv => (
                                        <tr key={inv.id} className="border-b border-slate-50 hover:bg-slate-50">
                                            <td className="px-4 py-3 text-sm font-bold text-slate-800">INV-{inv.id}</td>
                                            <td className="px-4 py-3 text-sm text-slate-500">#{inv.reservation_id}</td>
                                            <td className="px-4 py-3 text-sm font-semibold">{inv.total_amount?.toLocaleString()} UZS</td>
                                            <td className="px-4 py-3 text-sm text-emerald-600 font-semibold">{inv.paid_amount?.toLocaleString()} UZS</td>
                                            <td className="px-4 py-3 text-sm text-red-500 font-semibold">
                                                {((inv.total_amount || 0) - (inv.paid_amount || 0)).toLocaleString()} UZS
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[inv.status] || 'bg-gray-100 text-gray-700'}`}>
                                                    {inv.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                                                    <Button size="sm"
                                                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                                                        onClick={() => { setSelectedInvoice(inv); setIsPaymentModalOpen(true); }}>
                                                        <DollarSign className="w-3 h-3 mr-1" /> Оплата
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            }

            {/* ============================================================
                TAB 4: ОПТОВЫЕ КОМПАНИИ
            ============================================================ */}
            {
                tab === 'wholesale' && (
                    <div className="flex-1 p-6 bg-white overflow-y-auto">
                        <div className="flex items-center justify-between mb-4 gap-4">
                            <h2 className="text-lg font-semibold text-slate-800 shrink-0">Оптовые компании</h2>
                            <div className="relative flex-1 max-w-sm">
                                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                <Input value={orgSearch} onChange={e => setOrgSearch(e.target.value)}
                                    placeholder="По названию..."
                                    className="pl-9 border-slate-200" />
                            </div>
                            <Button onClick={loadMedOrgs} variant="outline" size="sm" className="border-slate-200">
                                <RefreshCw className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredOrgs.map(org => (
                                <div key={org.id}
                                    className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                                                <Building2 className="w-5 h-5 text-indigo-600" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-800 text-sm">{org.name}</p>
                                                <p className="text-xs text-slate-400">{org.org_type || 'Организация'}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-slate-500">📞 {org.phone || '—'}</p>
                                        <Button size="sm" variant="outline"
                                            className="border-blue-200 text-blue-600 hover:bg-blue-50 text-xs"
                                            onClick={() => setIsReservationModalOpen(true)}>
                                            <Plus className="w-3 h-3 mr-1" /> Бронь
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            {filteredOrgs.length === 0 && !loading && (
                                <div className="col-span-3 text-center py-16 text-slate-400">
                                    Организации не найдены
                                </div>
                            )}
                        </div>
                    </div>
                )
            }

            {/* ============================================================
                TAB 5: ОТЧЕТЫ
            ============================================================ */}
            {
                tab === 'reports' && (
                    <div className="flex-1 p-6 bg-white overflow-y-auto">
                        <h2 className="text-lg font-semibold text-slate-800 mb-6">Отчеты</h2>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            {[
                                { label: 'Всего броней', value: reservations.length, sub: `Ожидает: ${reservations.filter(r => r.status === 'pending').length}  |  Актив.: ${reservations.filter(r => r.status === 'approved').length}`, color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-100', Icon: CalendarRange },
                                { label: "Всего оплат", value: `${invoices.reduce((s, i) => s + (i.paid_amount || 0), 0).toLocaleString()} UZS`, sub: `${invoices.filter(i => i.status === 'paid').length} полностью оплачено`, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100', Icon: DollarSign },
                                { label: 'Задолженность', value: `${invoices.reduce((s, i) => s + Math.max(0, (i.total_amount || 0) - (i.paid_amount || 0)), 0).toLocaleString()} UZS`, sub: `${invoices.filter(i => i.status === 'partial').length} частично оплачено`, color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-100', Icon: TrendingUp },
                            ].map(c => (
                                <div key={c.label} className={`${c.bg} ${c.border} border rounded-xl p-5`}>
                                    <div className="flex items-center gap-2 mb-3">
                                        <c.Icon className={`w-4 h-4 ${c.color}`} />
                                        <p className="text-sm text-slate-500">{c.label}</p>
                                    </div>
                                    <p className={`text-2xl font-bold ${c.color} mb-1`}>{c.value}</p>
                                    <p className="text-xs text-slate-400">{c.sub}</p>
                                </div>
                            ))}
                        </div>

                        {/* Warehouse stock */}
                        <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-3">
                            Состояние складов
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {warehouses.map(wh => (
                                <div key={wh.id} className="border border-slate-200 rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <Warehouse className="w-4 h-4 text-slate-500" />
                                            <p className="font-semibold text-slate-800">{wh.name}</p>
                                        </div>
                                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                                            {wh.warehouse_type === 'central' ? 'Центральный' : 'Филиал'}
                                        </span>
                                    </div>
                                    {wh.stocks?.length > 0 ? (
                                        <div className="space-y-1">
                                            {wh.stocks.map((s: any) => (
                                                <div key={s.id} className="flex justify-between text-sm border-b border-slate-50 pb-1 last:border-0">
                                                    <span className="text-slate-500">Продукт #{s.product_id}</span>
                                                    <span className="font-bold text-slate-800">{s.quantity} шт.</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-400 italic">Пусто</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )
            }

            {/* ============================================================
                EDIT PRODUCT MODAL
            ============================================================ */}
            <Dialog open={!!editProduct} onOpenChange={v => { if (!v) { setEditProduct(null); setEditQty(''); } }}>
                <DialogContent className="max-w-sm rounded-2xl shadow-2xl p-0 overflow-hidden border-0">
                    {/* Header */}
                    <div className="bg-gradient-to-br from-slate-700 to-slate-900 px-6 py-5 text-white">
                        <div className="flex items-center gap-2 mb-1">
                            <Package className="w-5 h-5 opacity-80" />
                            <h2 className="text-lg font-bold">Изменить количество</h2>
                        </div>
                        {editProduct && (
                            <div className="mt-2 space-y-0.5">
                                <p className="font-semibold text-white text-base">{editProduct.name}</p>
                                <p className="text-white/60 text-xs">
                                    {editProduct.category?.name && <span className="bg-white/10 px-2 py-0.5 rounded mr-2">{editProduct.category.name}</span>}
                                    Текущий остаток: <span className="font-bold text-white">{(stockMap[editProduct.id] || 0).toLocaleString()} шт</span>
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="px-6 py-5 space-y-4">
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Добавить количество (шт)</label>
                            <Input
                                type="number"
                                min={1}
                                value={editQty}
                                onChange={e => setEditQty(e.target.value)}
                                placeholder="0"
                                className="border-slate-200 rounded-xl h-11 text-lg font-semibold"
                                autoFocus
                            />
                        </div>
                        {editProduct && editQty && parseInt(editQty) > 0 && (
                            <p className="text-sm text-slate-500">
                                После сохранения остаток станет: <span className="font-bold text-slate-800">{((stockMap[editProduct.id] || 0) + parseInt(editQty || '0')).toLocaleString()} шт</span>
                            </p>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 px-6 pb-5">
                        <Button variant="outline" className="rounded-xl" onClick={() => { setEditProduct(null); setEditQty(''); }}>Отмена</Button>
                        <Button
                            className="bg-slate-800 hover:bg-slate-900 text-white rounded-xl px-6"
                            onClick={handleSaveEdit}
                            disabled={editLoading || !editQty || parseInt(editQty) <= 0}
                        >
                            {editLoading ? 'Сохранение...' : 'Сохранить'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ============================================================
                CREATE WAREHOUSE MODAL
            ============================================================ */}
            <Dialog open={showCreateWhModal} onOpenChange={v => { setShowCreateWhModal(v); if (!v) setNewWhName(''); }}>
                <DialogContent className="max-w-sm rounded-2xl shadow-2xl p-0 overflow-hidden border-0">
                    <div className="bg-gradient-to-br from-slate-700 to-slate-900 px-6 py-5 text-white">
                        <div className="flex items-center gap-2">
                            <Warehouse className="w-5 h-5 opacity-80" />
                            <h2 className="text-lg font-bold">Создать склад</h2>
                        </div>
                    </div>
                    <div className="px-6 py-5 space-y-4">
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Название склада</label>
                            <Input
                                value={newWhName}
                                onChange={e => setNewWhName(e.target.value)}
                                placeholder="Введите название..."
                                className="border-slate-200 rounded-xl h-11"
                                autoFocus
                                onKeyDown={e => { if (e.key === 'Enter') handleCreateWarehouse(); }}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 px-6 pb-5">
                        <Button variant="outline" className="rounded-xl" onClick={() => { setShowCreateWhModal(false); setNewWhName(''); }}>Отмена</Button>
                        <Button
                            className="bg-slate-800 hover:bg-slate-900 text-white rounded-xl px-6"
                            onClick={handleCreateWarehouse}
                            disabled={newWhLoading || !newWhName.trim()}
                        >
                            {newWhLoading ? 'Создание...' : 'Создать'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ============================================================
                PRIXOD MODAL
            ============================================================ */}

            <Dialog open={showPrixodModal} onOpenChange={(v) => { setShowPrixodModal(v); if (!v) { setPrixodMfr(null); setPrixodProd(''); setPrixodQty(''); } }}>
                <DialogContent className="max-w-md rounded-2xl shadow-2xl p-0 overflow-hidden border-0">
                    {/* Header */}
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 px-6 py-5 text-white">
                        <div className="flex items-center gap-2 mb-1">
                            <Package className="w-5 h-5 opacity-80" />
                            <h2 className="text-lg font-bold">Приёмка товара на склад</h2>
                        </div>
                        {warehouses[0] && (
                            <p className="text-white/70 text-xs">Склад: <span className="text-white font-semibold">{warehouses[0].name}</span></p>
                        )}
                    </div>

                    <div className="space-y-4 px-6 py-5">
                        {/* Manufacturer selector */}
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Производитель</label>
                            <div className="flex flex-wrap gap-2">
                                {manufacturers.map(m => (
                                    <button
                                        key={m.id}
                                        onClick={() => { setPrixodMfr(m); setPrixodProd(''); }}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all
                                            ${prixodMfr?.id === m.id
                                                ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-blue-300 hover:text-blue-700'}`}
                                    >
                                        <Factory className="w-3 h-3 opacity-70" />
                                        {m.name}
                                    </button>
                                ))}
                                {manufacturers.length === 0 && (
                                    <p className="text-slate-400 text-sm">Производители не найдены</p>
                                )}
                            </div>
                        </div>

                        {/* Product dropdown - only show after manufacturer selected */}
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Препарат</label>
                            <Select
                                onValueChange={setPrixodProd}
                                value={prixodProd}
                                disabled={!prixodMfr}
                            >
                                <SelectTrigger className="border-slate-200 rounded-xl h-10">
                                    <SelectValue placeholder={prixodMfr ? 'Выберите препарат...' : 'Сначала выберите производителя'} />
                                </SelectTrigger>
                                <SelectContent>
                                    {prixodMfrProducts.length === 0 ? (
                                        <SelectItem value="_" disabled>Препараты не найдены</SelectItem>
                                    ) : (prixodMfrProducts as any[]).map((p: any) => (
                                        <SelectItem key={p.id} value={p.id.toString()}>
                                            <div className="flex flex-col py-0.5">
                                                <span className="font-medium">{p.name}</span>
                                                <span className="text-[10px] text-slate-500 flex items-center gap-2">
                                                    {p.category?.name && (
                                                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                                                            {p.category.name}
                                                        </span>
                                                    )}
                                                    <span className="font-semibold text-blue-600">
                                                        {Number(p.price).toLocaleString()} UZS
                                                    </span>
                                                </span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Quantity */}
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Количество (штук)</label>
                            <Input
                                type="number"
                                min={1}
                                value={prixodQty}
                                onChange={e => setPrixodQty(e.target.value)}
                                placeholder="0"
                                className="border-slate-200 rounded-xl h-10"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 px-6 pb-5">
                        <Button variant="outline" className="rounded-xl" onClick={() => setShowPrixodModal(false)}>Отмена</Button>
                        <Button
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6"
                            onClick={handlePrixod}
                            disabled={!prixodMfr || !prixodProd || !prixodQty}
                        >
                            <Package className="w-4 h-4 mr-2" /> Принять
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Other Modals */}
            <AddPaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                invoice={selectedInvoice}
                onSuccess={loadInvoices}
            />
            <CreateReservationModal
                isOpen={isReservationModalOpen}
                onClose={() => setIsReservationModalOpen(false)}
                onSuccess={loadReservations}
            />
            {/* ============================================================
                HISTORY OF RECEIPTS MODAL
            ============================================================ */}
            <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
                <DialogContent className="max-w-2xl rounded-3xl p-0 overflow-hidden border-0 shadow-2xl">
                    <div className="bg-slate-900 px-6 py-5 text-white flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <History className="w-5 h-5 text-slate-400" />
                            <h2 className="text-lg font-bold">История поступлений</h2>
                        </div>
                    </div>
                    <div className="p-6">
                        <div className="rounded-2xl border border-slate-100 overflow-hidden">
                            <table className="w-full text-xs">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-black text-slate-400 uppercase tracking-widest">Дата</th>
                                        <th className="px-4 py-3 text-left font-black text-slate-400 uppercase tracking-widest">Сумма</th>
                                        <th className="px-4 py-3 text-left font-black text-slate-400 uppercase tracking-widest">Тип оплаты</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-4 text-slate-500 font-bold italic" colSpan={3}>Данных пока нет</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ============================================================
                PRODUCT LIST MODAL
            ============================================================ */}
            <Dialog open={showProductListModal} onOpenChange={setShowProductListModal}>
                <DialogContent className="max-w-3xl rounded-3xl p-0 overflow-hidden border-0 shadow-2xl">
                    <div className="bg-slate-900 px-6 py-5 text-white flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <List className="w-5 h-5 text-slate-400" />
                            <h2 className="text-lg font-bold">Список продуктов брони</h2>
                        </div>
                    </div>
                    <div className="p-6">
                        <div className="rounded-2xl border border-slate-100 overflow-hidden">
                            <table className="w-full text-xs">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-black text-slate-400 uppercase tracking-widest">Товар</th>
                                        <th className="px-4 py-3 text-center font-black text-slate-400 uppercase tracking-widest">Кол-во</th>
                                        <th className="px-4 py-3 text-right font-black text-slate-400 uppercase tracking-widest">Цена</th>
                                        <th className="px-4 py-3 text-right font-black text-slate-400 uppercase tracking-widest">Итого</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {selectedResItems.map((item, idx) => {
                                        const actualQty = item.quantity - (item.returned_quantity || 0);
                                        const totalDisplay = actualQty * (item.product?.price || 0);
                                        const returnedTotal = (item.returned_quantity || 0) * (item.product?.price || 0);

                                        return (
                                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-black text-slate-700">{item.product?.name || 'Продукт'}</span>
                                                        <span className="text-[10px] text-slate-400 uppercase font-bold">{item.product?.category?.name || 'Категория'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-center font-black text-slate-800 bg-slate-50/50">
                                                    {actualQty}
                                                    {item.returned_quantity > 0 && (
                                                        <div className="text-[10px] text-rose-500 mt-0.5">
                                                            возврат: {item.returned_quantity}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 text-right font-bold text-slate-600">{(item.product?.price || 0).toLocaleString()}</td>
                                                <td className="px-4 py-4 text-right">
                                                    <div className="flex flex-col items-end">
                                                        <span className="px-2 py-1 bg-emerald-50 text-emerald-600 font-black rounded-lg">
                                                            {totalDisplay.toLocaleString()}
                                                        </span>
                                                        {item.returned_quantity > 0 && (
                                                            <span className="text-[10px] text-rose-500 font-bold mt-1 line-through">
                                                                {(item.quantity * item.product.price).toLocaleString()}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}

                                    {selectedResItems.length === 0 && (
                                        <tr>
                                            <td className="px-4 py-12 text-center text-slate-400 font-bold uppercase tracking-widest" colSpan={4}>
                                                Данных нет
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ============================================================
                RETURN MODAL
            ============================================================ */}
            <Dialog open={showReturnModal} onOpenChange={setShowReturnModal}>
                <DialogContent className="max-w-3xl rounded-3xl p-0 overflow-hidden border-0 shadow-2xl">
                    <div className="bg-rose-600 px-6 py-5 text-white flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <RefreshCw className="w-5 h-5 text-rose-200" />
                            <h2 className="text-lg font-bold">Возврат товара</h2>
                        </div>
                    </div>
                    <div className="p-6">
                        <p className="text-sm text-slate-500 mb-4">Выберите товары и количество для возврата.</p>
                        <div className="rounded-2xl border border-slate-100 overflow-hidden mb-6">
                            <table className="w-full text-xs">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-black text-slate-400 uppercase tracking-widest">Товар</th>
                                        <th className="px-4 py-3 text-center font-black text-slate-400 uppercase tracking-widest">В заказе</th>
                                        <th className="px-4 py-3 text-right font-black text-slate-400 uppercase tracking-widest">Возврат</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {(selectedResForReturn?.items || []).map((item: any, idx: number) => {
                                        const returnedAlready = item.returned_quantity || 0;
                                        const maxReturn = item.quantity - returnedAlready;
                                        return (
                                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-4 font-black text-slate-700">
                                                    {item.product?.name}
                                                    {returnedAlready > 0 && <span className="ml-2 text-rose-500 text-xs">(уже возвращено: {returnedAlready})</span>}
                                                </td>
                                                <td className="px-4 py-4 text-center font-bold text-slate-500">{maxReturn}</td>
                                                <td className="px-4 py-4 text-right">
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        max={maxReturn}
                                                        value={returnQuantities[item.product_id] || ''}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value) || 0;
                                                            setReturnQuantities(prev => ({ ...prev, [item.product_id]: Math.min(val, maxReturn) }));
                                                        }}
                                                        className="w-20 ml-auto h-8 text-xs font-black text-rose-600 border-rose-100 focus:ring-rose-200"
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex justify-end gap-3">
                            <Button variant="outline" className="rounded-xl" onClick={() => setShowReturnModal(false)}>Отмена</Button>
                            <Button
                                className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl px-8 font-black uppercase tracking-widest shadow-lg shadow-rose-200"
                                onClick={handleReturnSubmit}
                                disabled={returnLoading}
                            >
                                {returnLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null} Подтвердить возврат
                            </Button>

                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ============================================================
                PAYMENT HISTORY MODAL
            ============================================================ */}
            <Dialog open={showPaymentHistoryModal} onOpenChange={setShowPaymentHistoryModal}>
                <DialogContent className="max-w-3xl rounded-[32px] p-0 overflow-hidden border-0 shadow-3xl bg-white">
                    <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-8 py-6 text-white flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                                <History className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black tracking-tight uppercase">История поступлений</h2>
                                <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-widest mt-0.5 opacity-80">
                                    Накладная: {selectedResForHistory?.invoice?.invoice_number || '—'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="p-8">
                        <div className="overflow-hidden rounded-3xl border border-slate-100 shadow-sm mb-2">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-100">
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Сумма</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Метод</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Дата</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Кассир</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {(selectedResForHistory?.invoice?.payments || []).length > 0 ? (
                                        selectedResForHistory.invoice.payments.map((p: any, i: number) => (
                                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <span className="text-sm font-black text-emerald-600">
                                                        {p.amount.toLocaleString()} UZS
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2 py-1 rounded-lg bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-wider">
                                                        {p.payment_method === 'cash' ? 'Наличные' : p.payment_method === 'card' ? 'Карта' : 'Перечисление'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-xs font-bold text-slate-500">
                                                    {format(new Date(p.payment_date), 'dd.MM.yyyy HH:mm')}
                                                </td>
                                                <td className="px-6 py-4 text-xs font-bold text-slate-700">
                                                    {p.processed_by?.full_name || '—'}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-200">
                                                        <Receipt className="w-6 h-6" />
                                                    </div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Платежей не найдено</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>



            {/* ============================================================
                EDIT INVOICE DATA MODAL
            ============================================================ */}
            <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
                <DialogContent className="max-w-md rounded-[32px] p-0 overflow-hidden border-0 shadow-3xl bg-white">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6 text-white flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                                <Edit3 className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black tracking-tight uppercase">
                                    {editMode === 'factura' && 'Номер С/Ф'}
                                    {editMode === 'date' && 'Дата реализации'}
                                    {editMode === 'discount' && 'Изменить скидку'}
                                </h2>
                                <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest mt-0.5 opacity-80">
                                    ID Брони: {selectedResToEdit?.id}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 flex flex-col gap-6">
                        {editMode === 'factura' && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Номер С/Ф</label>
                                <Input
                                    value={editFacturaNumber}
                                    onChange={(e) => setEditFacturaNumber(e.target.value)}
                                    className="h-12 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-bold px-4 text-sm"
                                    placeholder="Введите номер..."
                                />
                            </div>
                        )}

                        {editMode === 'date' && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Дата реализации</label>
                                <DatePicker
                                    date={editRealizationDate}
                                    setDate={(d) => setEditRealizationDate(d)}
                                    className="h-12 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-bold px-4"
                                />
                            </div>
                        )}

                        {editMode === 'discount' && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Скидка %</label>
                                <Input
                                    type="number"
                                    value={editDiscount}
                                    onChange={(e) => setEditDiscount(Number(e.target.value))}
                                    className="h-12 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-bold px-4 text-sm"
                                    min="0"
                                    max="100"
                                />
                            </div>
                        )}

                        <div className="flex gap-4 mt-2">
                            <Button
                                variant="outline"
                                onClick={() => setShowEditModal(false)}
                                className="flex-1 h-12 rounded-2xl border-slate-200 text-slate-500 font-bold hover:bg-slate-50 transition-all uppercase text-[10px] tracking-widest"
                            >
                                Отмена
                            </Button>
                            <Button
                                onClick={handleSaveInvoiceEdit}
                                disabled={loading}
                                className="flex-1 h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-lg shadow-blue-200 transition-all uppercase text-[10px] tracking-widest"
                            >
                                {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null} Сохранить
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

        </div >
    );
};

export default HeadOfOrdersPage;
