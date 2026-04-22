import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
    Plus, RefreshCw, Receipt, CheckCircle, Trash2,
    DollarSign, Factory, CalendarRange, FileText, Building2, PieChart,
    CreditCard, TrendingUp, TrendingDown, Wallet, Warehouse, Search, ChevronLeft, ChevronRight, Package, Pencil,
    History, List, Download, User as UserIcon, MapPin, Eye, Edit3, AlertTriangle, RotateCcw,
    ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';
import { getWarehouses, fulfillStock, setStock, activateReservation, deleteReservation, getReservations, getInvoices, createWarehouse } from '@/api/orders-management';
import { useProductStore } from '@/store/productStore';
import { AddPaymentModal } from './AddPaymentModal';
import { CreateReservationModal } from './CreateReservationModal';
import { DateInput } from '@/components/ui/date-input';
import { toast } from 'sonner';
import { format } from 'date-fns';
import axiosInstance from '@/api/axios';
import { ModernStatsBar } from '@/components/ui/ModernStatsBar';
import { formatMoney } from '@/components/ui/MoneyInput';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { SearchableProductSelect } from '@/components/SearchableProductSelect';
import * as XLSX from 'xlsx';
import { ru } from 'date-fns/locale';
import { useAuthStore } from '@/store/authStore';
import { deletePayment } from '@/api/sales';




const useDragScroll = () => {
    const ref = React.useRef<HTMLDivElement>(null);
    const isPressed = React.useRef(false);
    const startX = React.useRef(0);
    const startScrollLeft = React.useRef(0);
    const [isDragging, setIsDragging] = React.useState(false);

    const onMouseDown = (e: React.MouseEvent) => {
        if (!ref.current || e.button !== 0) return;
        isPressed.current = true;
        startX.current = e.pageX - ref.current.offsetLeft;
        startScrollLeft.current = ref.current.scrollLeft;
    };

    const onMouseLeave = () => {
        isPressed.current = false;
        setIsDragging(false);
    };

    const onMouseUp = () => {
        isPressed.current = false;
        setIsDragging(false);
    };

    const onMouseMove = (e: React.MouseEvent) => {
        if (!isPressed.current || !ref.current) return;
        const x = e.pageX - ref.current.offsetLeft;
        const deltaX = x - startX.current;
        // Only activate drag after moving more than 5px to avoid interfering with clicks
        if (Math.abs(deltaX) > 5) {
            e.preventDefault();
            setIsDragging(true);
            ref.current.scrollLeft = startScrollLeft.current - deltaX * 2;
        }
    };

    return {
        ref,
        onMouseDown,
        onMouseLeave,
        onMouseUp,
        onMouseMove,
        isDragging
    };
};


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
    const SortHeader = ({ label, sortKey, currentSort, onSort, className = "" }: any) => {
        const isActive = currentSort?.key === sortKey;
        return (
            <th
                className={`sticky top-0 z-30 bg-white px-3 py-3 text-left font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${className}`}
                onClick={() => onSort(sortKey)}
            >
                <div className={`flex items-center gap-1 ${className.includes('text-center') ? 'justify-center' : ''}`}>
                    <span>{label}</span>
                    <div className="flex-shrink-0">
                        {isActive ? (
                            currentSort.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />
                        ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-20 group-hover:opacity-100 transition-opacity" />
                        )}
                    </div>
                </div>
            </th>
        );
    };

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
    const [selectedWholesaleOrg, setSelectedWholesaleOrg] = useState<any>(null);
    const [orgSearch, setOrgSearch] = useState('');

    // ----- Filter option lists (loaded independently from API so they work even with empty DB) -----
    const [filterMedReps, setFilterMedReps] = useState<{id: number, name: string}[]>([]);
    const [filterCompanies, setFilterCompanies] = useState<{id: number, name: string}[]>([]);
    // Org types are a fixed enum — hardcoded so they never depend on data
    const FILTER_ORG_TYPES: { value: string; label: string }[] = [
        { value: 'clinic', label: 'Клиника' },
        { value: 'pharmacy', label: 'Аптека' },
        { value: 'hospital', label: 'Больница' },
        { value: 'lechebniy', label: 'ЛПУ' },
        { value: 'wholesale', label: 'Оптовик' },
    ].sort((a, b) => a.label.localeCompare(b.label));

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

    // Confirmation for activation
    const [showActivateConfirm, setShowActivateConfirm] = useState<number | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
    const [showOverpaidModal, setShowOverpaidModal] = useState(false);
    const user = useAuthStore(state => state.user);
    const [isDeletingPayment, setIsDeletingPayment] = useState<number | null>(null);
    const canManagePayments = user?.role && ['accountant', 'investor', 'admin', 'director'].includes(user.role.toLowerCase());

    const handleDeletePayment = async (paymentId: number) => {
        if (!window.confirm('Haqiqatan ham ushbu to\'lovni bekor qilmoqchimisiz? Bu moliyaviy hisobotlarga ta’sir qiladi.')) return;

        setIsDeletingPayment(paymentId);
        try {
            const result = await deletePayment(paymentId);
            toast.success(result.message || "To'lov muvaffaqiyatli bekor qilindi");
            
            // Refresh ALL data sources since a reversal can affect multiple entities
            loadInvoices();
            loadReservations();
            
            // If the history modal is open for a reservation, the data inside it 
            // should also be updated on the next open or via re-fetching.
        } catch (error: any) {
            console.error("Failed to delete payment", error);
            const detail = error.response?.data?.detail || "Xatolik yuz berdi";
            toast.error(detail);
        } finally {
            setIsDeletingPayment(null);
        }
    };


    // Filter states
    const [dateStart, setDateStart] = useState('');
    const [dateEnd, setDateEnd] = useState('');
    const [selectedMedRep, setSelectedMedRep] = useState('all');
    const [selectedCompany, setSelectedCompany] = useState('all');
    const [selectedType, setSelectedType] = useState('all');
    const [selectedInvoiceType, setSelectedInvoiceType] = useState('all'); // 'all', 'regular', 'tovar_skidka'
    const [invNumSearch, setInvNumSearch] = useState('');
    const [selectedWhFilter, setSelectedWhFilter] = useState('all');

    // Sort states
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'date', direction: 'desc' });

    const handleSort = (key: string) => {
        setSortConfig(prev => {
            if (prev?.key === key) {
                return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'asc' };
        });
    };

    const exportToExcel = (data: any[], filename: string) => {
        if (!data || data.length === 0) {
            toast.error("Нет данных для экспорта");
            return;
        }

        const dataRows = data.map((inv: any) => {
            const date = inv.realization_date || inv.date || inv.created_at;
            const res = inv.reservation || {};
            const medOrg = res.med_org;
            const amount = Number(inv.total_amount) || 0;
            const paid = Number(inv.paid_amount) || 0;
            const debt = amount - paid;

            return {
                'Месяц': date ? format(new Date(date), 'MMMM', { locale: ru }) : '—',
                'ДАТА отгрузки': date ? format(new Date(date), 'dd.MM.yyyy') : '—',
                'Контрагент': medOrg?.name || res.customer_name || '—',
                'ИНН': medOrg?.inn || '—',
                'ЭСФ': inv.factura_number || inv.id,
                'РЕГИОН': medOrg?.region?.name || '—',
                'Ответственный': medOrg?.assigned_reps?.[0]?.full_name || '—',
                'Сумма по счет фактуре': amount,
                'Поступление': paid,
                'Дебиторская задолженность': debt
            };
        });

        // Calculate Totals for the Summary Row
        const totalAmount = dataRows.reduce((sum: number, row: any) => sum + row['Сумма по счет фактуре'], 0);
        const totalPaid = dataRows.reduce((sum: number, row: any) => sum + row['Поступление'], 0);
        const totalDebt = dataRows.reduce((sum: number, row: any) => sum + row['Дебиторская задолженность'], 0);

        const summaryRow = {
            'Месяц': dataRows[0]['Месяц'],
            'ДАТА отгрузки': format(new Date(), 'yyyy'),
            'Контрагент': '',
            'ИНН': '',
            'ЭСФ': '',
            'РЕГИОН': '',
            'Ответственный': '',
            'Сумма по счет фактуре': totalAmount,
            'Поступление': totalPaid,
            'Дебиторская задолженность': totalDebt
        };

        const worksheet = XLSX.utils.json_to_sheet([summaryRow, ...dataRows]);
        const wscols = [
            { wch: 15 }, { wch: 15 }, { wch: 35 }, { wch: 12 }, { wch: 15 },
            { wch: 15 }, { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 20 }
        ];
        worksheet['!cols'] = wscols;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Данные");
        XLSX.writeFile(workbook, `${filename}_${format(new Date(), 'dd.MM.yyyy')}.xlsx`);
    };

    const sortData = (data: any[]) => {
        if (!sortConfig) return data;
        const { key, direction } = sortConfig;

        return [...data].sort((a, b) => {
            let valA: any = '';
            let valB: any = '';

            // Map keys to actual values
            switch (key) {
                case 'date':
                    valA = a.realization_date || a.invoice?.realization_date || a.date || a.created_at;
                    valB = b.realization_date || b.invoice?.realization_date || b.date || b.created_at;
                    break;
                case 'factura':
                    valA = (a.factura_number || a.invoice?.factura_number || '').toLowerCase();
                    valB = (b.factura_number || b.invoice?.factura_number || '').toLowerCase();
                    break;
                case 'client':
                    valA = (a.med_org?.name || '').toLowerCase();
                    valB = (b.med_org?.name || '').toLowerCase();
                    break;
                case 'region':
                    valA = (a.med_org?.region?.name || '').toLowerCase();
                    valB = (b.med_org?.region?.name || '').toLowerCase();
                    break;
                case 'total':
                    valA = Number(a.total_amount) || 0;
                    valB = Number(b.total_amount) || 0;
                    break;
                case 'paid':
                    valA = Number(a.paid_amount || a.invoice?.paid_amount) || 0;
                    valB = Number(b.paid_amount || b.invoice?.paid_amount) || 0;
                    break;
                case 'debt':
                    valA = (Number(a.total_amount) || 0) - (Number(a.paid_amount || a.invoice?.paid_amount) || 0);
                    valB = (Number(b.total_amount) || 0) - (Number(b.paid_amount || b.invoice?.paid_amount) || 0);
                    break;
                case 'salary':
                    valA = (a.items || []).reduce((s: number, it: any) => s + (it.quantity || 0) * (it.salary_amount || 0), 0);
                    valB = (b.items || []).reduce((s: number, it: any) => s + (it.quantity || 0) * (it.salary_amount || 0), 0);
                    break;
                case 'promo':
                    valA = calculatePromo(a.reservation || a);
                    valB = calculatePromo(b.reservation || b);
                    break;
                case 'discount':
                    valA = a.items?.[0]?.discount_percent || 0;
                    valB = b.items?.[0]?.discount_percent || 0;
                    break;
                case 'mp':
                    valA = (a.med_org?.assigned_reps?.[0]?.full_name || '').toLowerCase();
                    valB = (b.med_org?.assigned_reps?.[0]?.full_name || '').toLowerCase();
                    break;
                default:
                    return 0;
            }

            if (valA < valB) return direction === 'asc' ? -1 : 1;
            if (valA > valB) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    };

    const resetFilters = () => {
        setDateStart('');
        setDateEnd('');
        setSelectedMedRep('all');
        setSelectedCompany('all');
        setSelectedType('all');
        setSelectedInvoiceType('all');
        setInvNumSearch('');
        setSelectedWhFilter('all');
    };

    const [loading, setLoading] = useState(false);
    const { products, fetchProducts } = useProductStore();

    const reservationsScroll = useDragScroll();
    const invoicesScroll = useDragScroll();

    const filteredReservationsPending = reservations.filter(r => {
        // Only show pending status in Reservations tab
        const isPending = !['approved', 'partial', 'paid'].includes(r.status);
        if (!isPending) return false;

        const matchesSearch = (r.med_org?.name || '').toLowerCase().includes(resSearch.toLowerCase()) ||
            (r.invoice?.invoice_number || '').toLowerCase().includes(resSearch.toLowerCase());
        return matchesSearch;
    });
    const sortedReservationsPending = React.useMemo(() => sortData(filteredReservationsPending), [filteredReservationsPending, sortConfig]);

    // --- Helper: Calculate Promo for a reservation ---
    const calculatePromo = (res: any) => {
        if (!res?.is_bonus_eligible) return 0;
        return (res.items || []).reduce((acc: number, item: any) => {
            // Use the item-level marketing_amount if set, otherwise fall back to product's marketing_expense
            const marketingExpense = item.marketing_amount ?? item.product?.marketing_expense ?? 0;
            return acc + (item.quantity * marketingExpense);
        }, 0);
    };

    const prixodMfrProducts = prixodMfr
        ? (products || []).filter((p: any) =>
            p.manufacturers?.some((m: any) => m.id == prixodMfr.id) ||
            p.manufacturer_id == prixodMfr.id
        )
        : [];

    // Filter option aliases (same lists reused for both invoices and reservations tabs)
    const medReps = filterMedReps;
    const companiesList = filterCompanies;
    const orgTypes = FILTER_ORG_TYPES.map(t => t.value);
    const resMedReps = filterMedReps;
    const resCompanies = filterCompanies;
    const resOrgTypes = FILTER_ORG_TYPES.map(t => t.value);

    // Load filter dropdowns once on mount — independent of tab/data so they survive empty DB
    useEffect(() => {
        const loadFilterOptions = async () => {
            try {
                // Med Reps
                const usersRes = await axiosInstance.get('/users/', { params: { limit: 1000 } });
                const users: any[] = usersRes.data?.items || usersRes.data || [];
                const medRepOptions = users
                    .filter((u: any) => u.role === 'med_rep')
                    .map((u: any) => ({ id: u.id, name: u.full_name || u.username }))
                    .filter(u => u.name)
                    .sort((a, b) => a.name.localeCompare(b.name));
                setFilterMedReps(medRepOptions);
            } catch { /* silently ignore */ }

            try {
                // Companies (Med Orgs)
                const orgsRes = await axiosInstance.get('/crm/med-orgs/', { params: { limit: 1000 } });
                const orgs: any[] = orgsRes.data?.items || orgsRes.data || [];
                setFilterCompanies(
                    orgs.map((o: any) => ({ id: o.id, name: o.name }))
                        .filter(o => o.name)
                        .sort((a, b) => a.name.localeCompare(b.name))
                );
            } catch { /* silently ignore */ }
        };
        loadFilterOptions();
    }, []);

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
            const sortedWh = wh.sort((a: any, b: any) => a.name.localeCompare(b.name));
            setWarehouses(sortedWh);
            // Auto-select first warehouse if none selected
            if (!selectedWarehouse && sortedWh.length > 0) setSelectedWarehouse(sortedWh[0]);
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
        try { 
            const whId = selectedWhFilter !== 'all' ? Number(selectedWhFilter) : undefined;
            setReservations(await getReservations('pending', whId)); 
        }
        catch { toast.error("Ошибка загрузки броней"); }
        finally { setLoading(false); }
    };

    const handleDownloadFactura = async (res: any) => {
        try {
            const orgName = (res.med_org?.name || res.customer_name) || 'nomalum_korxona';
            const orgInn = res.med_org?.inn || 'inn_yoq';
            const rawDate = res.invoice?.realization_date || res.date;
            const dateStr = rawDate ? format(new Date(rawDate), 'dd.MM.yyyy') : 'sana_yoq';

            const sanitizedOrgName = orgName.replace(/[/\\:*?"<>|]/g, '').trim();
            const filename = `${sanitizedOrgName}_${orgInn}_${dateStr}.xlsx`;

            const response = await axiosInstance.get(`/sales/reservations/${res.id}/export`, {
                responseType: 'blob'
            });

            // Try to get filename from server headers first
            const disposition = response.headers['content-disposition'];
            let finalFilename = filename;
            if (disposition && disposition.indexOf('filename*=UTF-8\'\'') !== -1) {
                finalFilename = decodeURIComponent(disposition.split('filename*=UTF-8\'\'')[1]);
            } else if (disposition && disposition.indexOf('filename=') !== -1) {
                finalFilename = disposition.split('filename=')[1].replace(/['"]/g, '');
            }

            const blob = new Blob([response.data], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = finalFilename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => window.URL.revokeObjectURL(url), 200);
        } catch (error) {
            toast.error("Ошибка при скачивании файла");
            console.error(error);
        }
    };

    const loadInvoices = async () => {
        setLoading(true);
        try { 
            const whId = selectedWhFilter !== 'all' ? Number(selectedWhFilter) : undefined;
            setInvoices(await getInvoices(whId)); 
        }
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
            const res = await axiosInstance.get('/crm/med-orgs/?limit=300');
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
        setLoading(true);
        try {
            await activateReservation(id);
            toast.success("Бронь активирована ✅");
            setShowActivateConfirm(null);
            loadReservations();
            loadInvoices();
        }
        catch (e: any) { toast.error(e.response?.data?.detail || "Ошибка"); }
        finally { setLoading(false); }
    };

    const handleDeleteRes = async (id: number) => {
        setShowDeleteConfirm(id);
    };

    const confirmDeleteRes = async () => {
        if (!showDeleteConfirm) return;
        const id = showDeleteConfirm;
        setShowDeleteConfirm(null);
        try {
            const res = await deleteReservation(id);
            toast.success(res.message || "Бронь удалена, товары возвращены на склад. ✅");
            loadReservations();
        } catch (e: any) {
            toast.error(e?.response?.data?.detail || "Ошибка при удалении");
        }
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
            toast.error("Укажите количество для возврата");
            return;
        }

        setReturnLoading(true);
        try {
            await axiosInstance.post(`/sales/reservations/${selectedResForReturn.id}/return`, { items: itemsToReturn });
            toast.success("Ожидает одобрения заведующего складом");
            setShowReturnModal(false);
            setReturnQuantities({});
            loadReservations();
            loadInvoices(); // Refund impacts total sums
        } catch (e: any) {
            toast.error(e.response?.data?.detail || "Ошибка оформления возврата");
        } finally {
            setReturnLoading(false);
        }
    };

    const handleOpenEdit = (p: any) => {
        const currentQty = selectedWarehouse?.stocks?.find((s: any) => s.product_id === p.id)?.quantity || 0;
        setEditProduct(p);
        setEditQty(currentQty.toString());
    };

    const handleSaveEdit = async () => {
        if (!editProduct || editQty === '') return;
        const qty = parseInt(editQty);
        if (isNaN(qty) || qty < 0) { toast.error('Введите корректное количество'); return; }
        const whId = selectedWarehouse?.id ?? (warehouses.length > 0 ? warehouses[0].id : null);
        if (!whId) { toast.error('Склад не найден'); return; }
        setEditLoading(true);
        try {
            await setStock(whId, editProduct.id, qty);
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

    const allFilteredReservations = reservations.filter(res => {
        // Date Filter (using res.date or created_at)
        const resDate = res.date || res.created_at;
        if (dateStart && new Date(resDate) < new Date(dateStart)) return false;
        if (dateEnd && new Date(resDate) > new Date(dateEnd)) return false;

        // Med Rep Filter
        if (selectedMedRep !== 'all') {
            const isCreator = res.created_by_id?.toString() === selectedMedRep;
            const isAssigned = res.med_org?.assigned_reps?.some((r: any) => r.id.toString() === selectedMedRep);
            if (!isCreator && !isAssigned) return false;
        }

        // Company Filter
        if (selectedCompany !== 'all' && res.med_org_id?.toString() !== selectedCompany) return false;

        // Type Filter
        if (selectedType !== 'all' && res.med_org?.org_type !== selectedType) return false;

        // Invoice Type Filter
        if (selectedInvoiceType === 'regular' && res.is_tovar_skidka) return false;
        if (selectedInvoiceType === 'tovar_skidka' && !res.is_tovar_skidka) return false;
        if (selectedInvoiceType === 'through_wholesale' && !res.warehouse?.is_wholesale) return false;

        // Warehouse Filter
        if (selectedWhFilter !== 'all' && res.warehouse_id?.toString() !== selectedWhFilter) return false;

        return true;
    });

    const filteredInv = invoices.filter(inv => {
        const res = inv.reservation;
        if (!res) return false;

        // Date Filter (using realization_date if available, else created date)
        const realizationDate = inv.realization_date || inv.created_at;
        if (dateStart && new Date(realizationDate) < new Date(dateStart)) return false;
        if (dateEnd && new Date(realizationDate) > new Date(dateEnd)) return false;

        // Med Rep Filter
        if (selectedMedRep !== 'all') {
            const isCreator = res.created_by_id?.toString() === selectedMedRep;
            const isAssigned = res.med_org?.assigned_reps?.some((r: any) => r.id.toString() === selectedMedRep);
            if (!isCreator && !isAssigned) return false;
        }

        // Company Filter
        if (selectedCompany !== 'all' && res.med_org_id?.toString() !== selectedCompany) return false;

        // Type Filter
        if (selectedType !== 'all' && res.med_org?.org_type !== selectedType) return false;

        // Invoice Type Filter
        if (selectedInvoiceType === 'regular' && res.is_tovar_skidka) return false;
        if (selectedInvoiceType === 'tovar_skidka' && !res.is_tovar_skidka) return false;
        if (selectedInvoiceType === 'through_wholesale' && !res.warehouse?.is_wholesale) return false;

        // Search Filter
        const matchesSearch = invNumSearch ? (inv.factura_number || '').toLowerCase().includes(invNumSearch.toLowerCase()) : true;
        if (!matchesSearch) return false;

        // Warehouse Filter
        if (selectedWhFilter !== 'all' && res.warehouse_id?.toString() !== selectedWhFilter) return false;

        return true;
    });

    const sortedInvoices = React.useMemo(() => sortData(filteredInv), [filteredInv, sortConfig]);

    const filteredDebitorka = filteredInv.filter(inv => {
        const debt = (Number(inv.total_amount) || 0) - (Number(inv.paid_amount) || 0);
        return Math.round(debt) > 0;
    });

    const sortedDebitorka = React.useMemo(() => sortData(filteredDebitorka), [filteredDebitorka, sortConfig]);

    // --- Stats Calculation ---
    // Use ALL filtered items for global stats, but tab-specific for table view
    const stats = {
        totalAmount: filteredInv.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0),
        paidAmount: filteredInv.reduce((sum, inv) => {
            return sum + (Number(inv.paid_amount) || 0);
        }, 0),
        debtAmount: filteredInv.reduce((sum, inv) => {
            const total = Number(inv.total_amount) || 0;
            const paid = Number(inv.paid_amount) || 0;
            return sum + Math.max(0, total - paid);
        }, 0),
        creditAmount: filteredInv.reduce((sum, inv) => {
            const total = Number(inv.total_amount) || 0;
            const paid = Number(inv.paid_amount) || 0;
            return sum + Math.max(0, paid - total);
        }, 0),
        resCount: allFilteredReservations.length,
        resPendingCount: allFilteredReservations.filter(r => r.status === 'pending').length,
        resActiveCount: allFilteredReservations.filter(r => ['approved', 'partial', 'paid'].includes(r.status)).length,
        paidInvoicesCount: filteredInv.filter(i => i.status === 'paid').length,
        partialInvoicesCount: filteredInv.filter(i => i.status === 'partial').length,
        tovarSkidkaCount: allFilteredReservations.filter(r => r.is_tovar_skidka).length,
        tovarSkidkaAmount: allFilteredReservations.filter(r => r.is_tovar_skidka).reduce((sum, r) => sum + (r.total_amount || 0), 0),
        pendingResTotal: filteredReservationsPending.reduce((sum, r) => sum + (r.total_amount || 0), 0),
        overdueAmount: filteredInv.reduce((sum, inv) => {
            const d = inv.realization_date || inv.date || inv.created_at;
            if (!d) return sum;
            const diff = new Date().getTime() - new Date(d).getTime();
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            if (days > 30) {
                const debt = (Number(inv.total_amount) || 0) - (Number(inv.paid_amount) || 0);
                return sum + Math.max(0, debt);
            }
            return sum;
        }, 0),
    };



    const filteredOrgs = medOrgs.filter(o =>
        o.org_type === 'wholesale' &&
        o.name?.toLowerCase().includes(orgSearch.toLowerCase())
    );

    const getWhLabel = (whId: string) => {
        if (!whId || whId === 'all') return 'СКЛАД';
        const wh = warehouses.find(w => w.id.toString() === whId);
        if (!wh) return 'СКЛАД';
        const name = wh.name.toUpperCase().trim();
        const regular = ['HEARTLY', 'ZUMA', 'UZGERMED', 'SAMO', 'FAZO', 'HEARLT'];
        return regular.includes(name) ? 'СКЛАД' : 'ОПТ СКЛАД';
    };

    const formatWhName = (name: string) => {
        if (!name) return "";
        const n = name.toUpperCase().trim();
        const regular = ['HEARTLY', 'ZUMA', 'UZGERMED', 'SAMO', 'FAZO', 'HEARLT'];
        if (regular.includes(n)) return name;
        if (name.toUpperCase().startsWith("ОПТ СКЛАД")) return name;
        return `ОПТ СКЛАД ${name}`;
    };

    return (
        <div className="min-h-screen bg-white">
            {/* ---- TABS ---- */}
            <div className="bg-slate-900 px-4 pt-3">
                <div className="flex gap-1">
                    {[
                        { key: 'manufacturers', icon: Warehouse, label: 'Склады' },
                        { key: 'reservations', icon: CalendarRange, label: 'Брони' },
                        { key: 'invoices', icon: FileText, label: 'Фактуры' },
                        { key: 'debitorka', icon: CreditCard, label: 'Дебиторка' },
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
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                {selectedWarehouse ? getWhLabel(selectedWarehouse.id.toString()) : 'Склады'}
                            </span>
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
                                    {formatWhName(wh.name)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* BOTTOM: Products in selected warehouse */}
                    {selectedWarehouse ? (
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-xl font-bold text-slate-800">
                                    {getWhLabel(selectedWarehouse.id.toString())}: <span className="text-blue-700">{formatWhName(selectedWarehouse.name)}</span>
                                </h2>
                                {!selectedWarehouse.is_wholesale && (
                                    <Button
                                        onClick={() => {
                                            const currentWhName = selectedWarehouse?.name.toLowerCase().trim();
                                            const matchingMfr = manufacturers.find(m => m.name.toLowerCase().trim() === currentWhName);
                                            setPrixodMfr(matchingMfr || null);
                                            setPrixodProd('');
                                            setPrixodQty('');
                                            setShowPrixodModal(true);
                                        }}
                                        className="bg-transparent border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold uppercase tracking-wide text-xs px-6"
                                        variant="outline"
                                    >
                                        ДОБАВИТЬ
                                    </Button>
                                )}
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
                                            const sortedStocks = [...whStocks].sort((a, b) => {
                                                const prodA = products.find((p: any) => p.id === a.product_id)?.name || "";
                                                const prodB = products.find((p: any) => p.id === b.product_id)?.name || "";
                                                return prodA.localeCompare(prodB);
                                            });

                                            return sortedStocks.map((stock: any, idx: number) => {
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
                                                            {formatMoney(prod?.price || 0)}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm">
                                                            <span className={`font-bold ${stock.quantity > 0 ? 'text-slate-800' : 'text-red-400'}`}>
                                                                {formatMoney(stock.quantity)}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {!selectedWarehouse.is_wholesale && prod && (
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
                            <div className="grid grid-cols-1 md:grid-cols-8 gap-3 items-end">
                                {/* Date Start */}
                                <div className="flex flex-col">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ДАТА НАЧАЛА</p>
                                    <DateInput value={dateStart} onChange={setDateStart} placeholder="Начало" />
                                </div>
                                {/* Date End */}
                                <div className="flex flex-col">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ДАТА КОНЦА</p>
                                    <DateInput value={dateEnd} onChange={setDateEnd} placeholder="Конец" />
                                </div>
                                {/* Med Rep */}
                                <div className="flex flex-col">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">МЕД. РЕП</p>
                                    <SearchableSelect
                                        options={resMedReps.map(mr => ({ value: mr.id.toString(), label: mr.name }))}
                                        value={selectedMedRep}
                                        onChange={setSelectedMedRep}
                                        placeholder="Все"
                                    />
                                </div>
                                {/* Company */}
                                <div className="flex flex-col">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">КОМПАНИЯ</p>
                                    <SearchableSelect
                                        options={resCompanies.map(c => ({ value: c.id.toString(), label: c.name }))}
                                        value={selectedCompany}
                                        onChange={setSelectedCompany}
                                        placeholder="Все"
                                    />
                                </div>
                                {/* Type */}
                                <div className="flex flex-col">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ТИП</p>
                                    <SearchableSelect
                                        options={FILTER_ORG_TYPES}
                                        value={selectedType}
                                        onChange={setSelectedType}
                                        placeholder="Все"
                                    />
                                </div>
                                {/* Invoice Type Filter */}
                                <div className="flex flex-col">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ТИП ФАКТУРЫ</p>
                                    <SearchableSelect
                                        options={[
                                            { value: 'regular', label: 'Обычная' },
                                            { value: 'tovar_skidka', label: 'Товарная скидка' },
                                            { value: 'through_wholesale', label: 'Через оптовик' },
                                        ]}
                                        value={selectedInvoiceType}
                                        onChange={setSelectedInvoiceType}
                                        placeholder="Все"
                                    />
                                </div>
                                {/* Invoice number search */}
                                <div className="flex flex-col">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">НОМЕР СЧЕТА</p>
                                    <Input
                                        value={invNumSearch}
                                        onChange={e => setInvNumSearch(e.target.value)}
                                        placeholder="000"
                                        className="w-full bg-white border-slate-200 rounded-xl font-bold text-slate-700 h-10 shadow-sm"
                                    />
                                </div>
                                {/* Warehouse Filter */}
                                <div className="flex flex-col">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{getWhLabel(selectedWhFilter)}</p>
                                    <SearchableSelect
                                        options={warehouses.map(wh => ({ value: wh.id.toString(), label: wh.name }))}
                                        value={selectedWhFilter}
                                        onChange={setSelectedWhFilter}
                                        placeholder="Все"
                                    />
                                </div>
                                <div className="flex gap-2 mt-auto">
                                    <Button onClick={loadReservations} className="h-10 bg-slate-800 hover:bg-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest flex-1 shadow-sm">ПОИСК</Button>
                                    {isAdmin && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-10 gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                            onClick={() => {
                                                setShowRepairModal(true);
                                                runDiagnostic(false);
                                            }}
                                        >
                                            <AlertTriangle className="w-4 h-4" />
                                            <span>Tozalash #427</span>
                                        </Button>
                                    )}
                                    <Button onClick={() => { resetFilters(); loadReservations(); }} variant="outline" className="h-10 rounded-xl text-[10px] font-black uppercase tracking-widest border-rose-200 text-rose-500 hover:bg-rose-50 px-3 shadow-sm">Сбросить</Button>
                                </div>
                            </div>
                        </div>

                        <ModernStatsBar
                            stats={{
                                ...stats,
                                totalAmount: stats.pendingResTotal,
                                resCount: filteredReservationsPending.length
                            }}
                            promoAmount={filteredReservationsPending.reduce((s, r) => s + calculatePromo(r), 0)}
                            totalLabel="ОБЩАЯ СУММА БРОНИ"
                            showFinancials={false}
                        />

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

                        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl shadow-slate-200/50 mb-4">
                            <div
                                ref={reservationsScroll.ref}
                                onMouseDown={reservationsScroll.onMouseDown}
                                onMouseLeave={reservationsScroll.onMouseLeave}
                                onMouseUp={reservationsScroll.onMouseUp}
                                onMouseMove={reservationsScroll.onMouseMove}
                                className={`overflow-auto max-h-[70vh] ${reservationsScroll.isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
                            >
                                <table className="min-w-[1500px] w-full text-[10px] whitespace-nowrap border-separate border-spacing-0">
                                    <thead className="sticky top-0 z-30">
                                        <tr>
                                            <th className="sticky top-0 z-30 bg-white px-3 py-3 text-left font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 italic">#</th>
                                            <SortHeader label="ДАТА РЕАЛИЗАЦИИ" sortKey="date" currentSort={sortConfig} onSort={handleSort} />
                                            <SortHeader label="НОМЕР С/Ф" sortKey="factura" currentSort={sortConfig} onSort={handleSort} />
                                            <SortHeader label="КОНТРАГЕНТ" sortKey="client" currentSort={sortConfig} onSort={handleSort} />
                                            <SortHeader label="РЕГИОН" sortKey="region" currentSort={sortConfig} onSort={handleSort} />
                                            <th className="sticky top-0 z-30 bg-white px-3 py-3 text-left font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">ИНН</th>
                                            <SortHeader label="СУММА С/Ф" sortKey="total" currentSort={sortConfig} onSort={handleSort} className="text-center" />
                                            <SortHeader label="ПОСТУПЛЕНИЕ" sortKey="paid" currentSort={sortConfig} onSort={handleSort} className="text-center" />
                                            <SortHeader label="ДЕБИТОР" sortKey="debt" currentSort={sortConfig} onSort={handleSort} className="text-center" />
                                            <SortHeader label="СКИДКА %" sortKey="discount" currentSort={sortConfig} onSort={handleSort} className="text-center" />
                                            <th className="sticky top-0 z-30 bg-white px-3 py-3 text-left font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">ДАТА БРОНИ</th>
                                            <th className="sticky top-0 z-30 bg-white px-3 py-3 text-center font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">ОДОБРЕНО</th>
                                            <th className="sticky top-0 z-30 bg-white px-3 py-3 text-left font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">ПРОИЗВОДИТЕЛЬ</th>
                                            <SortHeader label="ПРОМО" sortKey="promo" currentSort={sortConfig} onSort={handleSort} className="text-center" />
                                            <SortHeader label="ЗАРПЛАТА" sortKey="salary" currentSort={sortConfig} onSort={handleSort} className="text-center" />
                                            <th className="sticky top-0 z-30 bg-white px-3 py-3 text-center font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">ВОЗВРАТ</th>
                                            <th className="sticky top-0 z-30 bg-white px-3 py-3 text-center font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">ДЕЙСТВИЯ</th>
                                            <th className="sticky top-0 z-30 bg-white px-3 py-3 text-center font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">ИСТОРИЯ</th>
                                            <th className="sticky top-0 z-30 bg-white px-3 py-3 text-center font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">СПИСОК</th>
                                            <th className="sticky top-0 z-30 bg-white px-3 py-3 text-center font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">СКАЧАТЬ</th>
                                            <th className="sticky top-0 z-30 bg-white px-3 py-3 text-center font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-rose-500">УДАЛИТЬ</th>
                                            <th className="sticky top-0 z-30 bg-white px-3 py-3 text-left font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">МП</th>
                                            <th className="sticky top-0 z-30 bg-white px-3 py-3 text-left font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">ТИП</th>
                                            <th className="sticky top-0 z-30 bg-white px-3 py-3 text-left font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">ТИП К/А</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedReservationsPending.length === 0 ? (
                                            <tr>
                                                <td colSpan={23} className="text-center py-20 bg-white">
                                                    <div className="flex flex-col items-center gap-3 opacity-20">
                                                        <Search className="w-8 h-8" />
                                                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Брони ne naydeni</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : sortedReservationsPending.map((res, idx) => {
                                            const discount = res.items?.[0]?.discount_percent || 0;
                                            const manufacturer = res.items?.[0]?.product?.manufacturers?.[0]?.name || '—';
                                            const region = res.med_org?.region?.name || '—';
                                            const paidAmount = res.invoice?.paid_amount || 0;
                                            const totalAmount = res.invoice?.total_amount || res.total_amount || 0;
                                            const debt = totalAmount - paidAmount;
                                            const medRepName = res.med_org?.assigned_reps?.[0]?.full_name || '—';
                                            const promoVal = calculatePromo(res);
                                            const inn = res.med_org?.inn || '—';
                                            const orgType = res.med_org?.org_type || '—';

                                            return (
                                                <tr key={res.id} className={`border-b transition-colors group ${res.is_deletion_pending || res.invoice?.is_deletion_pending || res.is_return_pending ? 'bg-yellow-100/70 hover:bg-yellow-100 border-yellow-200' : 'border-slate-50 hover:bg-slate-50/80'}`}>
                                                    <td className="px-3 py-4 font-medium text-slate-400 group-hover:text-blue-600 transition-colors italic text-center">{idx + 1}</td>
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
                                                    <td className="px-3 py-4 font-black">
                                                        <div className="flex items-center gap-1 text-slate-800 tracking-tight">
                                                            <span>{res.med_org?.name || '—'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-4 font-black text-slate-600 tracking-tight">{region}</td>
                                                    <td className="px-3 py-4 font-black text-slate-600 tracking-tight">{inn}</td>
                                                    <td className="px-3 py-4 font-black text-slate-700 tracking-tight text-center">{formatMoney(totalAmount)}</td>
                                                    <td className="px-3 py-4 font-black text-emerald-600 text-center">{formatMoney(paidAmount)}</td>
                                                    <td className="px-3 py-4 font-black text-rose-600 text-center">{formatMoney(debt)}</td>
                                                    <td className="px-3 py-4 font-black text-center">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <span className="text-slate-700">{discount}%</span>
                                                            <Pencil onClick={() => handleOpenInvoiceEdit(res, 'discount')} className="w-3 h-3 text-slate-300 hover:text-blue-500 cursor-pointer transition-colors" />
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-4 font-bold text-slate-500 text-center">{res.date ? format(new Date(res.date), 'dd/MM/yyyy') : '—'}</td>
                                                    <td className="px-3 py-4 text-center">
                                                        <div className="flex justify-center flex-col items-center gap-1">
                                                            <button
                                                                onClick={() => setShowActivateConfirm(res.id)}
                                                                className={`w-8 h-4 rounded-full relative transition-colors ${res.status === 'approved' ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                                            >
                                                                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all shadow-sm ${res.status === 'approved' ? 'right-0.5' : 'left-0.5'}`} />
                                                            </button>
                                                            {(res.is_deletion_pending || res.invoice?.is_deletion_pending) && (
                                                                <span className="text-[8px] font-black text-amber-600 uppercase tracking-tighter">Ожидает удаления</span>
                                                            )}
                                                            {res.is_return_pending && (
                                                                <span className="text-[8px] font-black text-purple-600 uppercase tracking-tighter">Ожидает возврата</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-4 font-black text-slate-700 uppercase">{manufacturer}</td>
                                                    <td className="px-3 py-4 text-center font-black text-slate-700 italic opacity-50">{promoVal.toLocaleString()}</td>
                                                    <td className="px-3 py-4 text-center font-black text-indigo-600">
                                                        {(() => {
                                                            const totalSal = (res.items || []).reduce((s: number, it: any) => s + (it.quantity || 0) * (it.salary_amount || 0), 0);
                                                            if (totalSal === 0) return '—';
                                                            if (res.is_salary_enabled === false) {
                                                                return (
                                                                    <div className="flex flex-col items-center opacity-40" title="Начисление зарплаты отключено">
                                                                        <span className="text-[7px] text-rose-500 uppercase leading-none mb-0.5">Off</span>
                                                                        <span className="line-through decoration-rose-300 decoration-1 text-slate-500">{formatMoney(totalSal)}</span>
                                                                    </div>
                                                                );
                                                            }
                                                            return formatMoney(totalSal);
                                                        })()}
                                                    </td>
                                                    <td className="px-3 py-4 text-center">
                                                        <button
                                                            onClick={() => { setSelectedResForReturn(res); setReturnQuantities({}); setShowReturnModal(true); }}
                                                            className="p-1.5 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-all"
                                                        >
                                                            <RefreshCw className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                    <td className="px-3 py-4 text-center">
                                                        <Button
                                                            onClick={() => { setSelectedInvoice(res.invoice); setIsPaymentModalOpen(true); }}
                                                            disabled={(res.is_deletion_pending || res.invoice?.is_deletion_pending) || (res.status !== 'approved' && res.status !== 'paid' && res.status !== 'partial')}
                                                            className="h-8 bg-slate-100 hover:bg-blue-600 text-slate-600 hover:text-white rounded-xl text-[9px] font-black uppercase transition-all px-4 disabled:opacity-50"
                                                        >
                                                            {res.is_deletion_pending || res.invoice?.is_deletion_pending ? 'Ждёт удаления' : `ПОСТУПЛЕНИЕ ${res.status !== 'approved' && res.status !== 'paid' && res.status !== 'partial' ? '(Ждёт одобрения)' : ''}`}
                                                        </Button>
                                                    </td>
                                                    <td className="px-3 py-4 text-center">
                                                        <button onClick={() => { setSelectedResForHistory(res.invoice || res); setShowPaymentHistoryModal(true); }} className="p-1.5 hover:bg-indigo-100 hover:text-indigo-600 rounded-lg transition-colors text-slate-400">
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
                                                    <td className="px-3 py-4 text-center">
                                                        <button
                                                            onClick={(e) => { 
                                                                e.stopPropagation(); 
                                                                if (paidAmount > 0) {
                                                                    toast.error("Невозможно удалить: по этой накладной уже есть оплата.");
                                                                } else if (res.is_deletion_pending) {
                                                                    toast.info("Заявка на удаление уже отправлена.");
                                                                } else {
                                                                    handleDeleteRes(res.id); 
                                                                }
                                                            }}
                                                            className={`p-1.5 rounded-lg transition-all ${(paidAmount > 0 || res.is_deletion_pending) ? 'text-slate-300 cursor-not-allowed' : 'hover:bg-rose-100 text-slate-400 hover:text-rose-600'}`}
                                                            title={paidAmount > 0 ? "Невозможно удалить оплаченную фактуру" : "Удалить бронь"}
                                                            disabled={paidAmount > 0 || res.is_deletion_pending}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                    <td className="px-3 py-4 font-black text-slate-800 tracking-tight">{medRepName}</td>
                                                    <td className="px-3 py-4">
                                                        <span className={`px-2 py-1 rounded-lg font-black text-[9px] uppercase tracking-wider ${res.is_tovar_skidka ? 'bg-orange-100 text-orange-700' : res.warehouse?.is_wholesale ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'}`}>
                                                            {res.is_tovar_skidka ? 'Товарная скидка' : res.warehouse?.is_wholesale ? 'Через оптовик' : 'Обычная'}
                                                        </span>
                                                    </td>
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

            {/* Dialogs end */}
        </div>
    );
};
            {
                tab === 'invoices' && (
                    <div className="bg-slate-50/50">
                        <div className="flex items-center justify-between mb-4 px-2">
                            <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                                <Receipt className="w-5 h-5 text-blue-500" />
                                Фактуры (Одобрено)
                            </h2>
                            <div className="flex items-center gap-3">
                                <Button 
                                    onClick={() => exportToExcel(sortedInvoices, 'Vedomost_Faktur')} 
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-600/20 px-4 h-10 font-black uppercase text-[10px] tracking-widest gap-2"
                                >
                                    <Download className="w-4 h-4" /> Excel
                                </Button>
                                <Button onClick={loadInvoices} variant="outline" size="sm" className="rounded-xl border-slate-200 h-10 px-4">
                                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> ОБНОВИТЬ
                                </Button>
                                <div className="relative w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input
                                        value={invSearch}
                                        onChange={e => setInvSearch(e.target.value)}
                                        placeholder="Поиск..."
                                        className="pl-9 rounded-xl border-slate-200 bg-white shadow-sm h-10 font-bold"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* FILTER BAR */}
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-4">
                            <div className="grid grid-cols-1 md:grid-cols-8 gap-3 items-end">
                                {/* Date Start */}
                                <div className="space-y-1.5">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ДАТА НАЧАЛА</p>
                                    <DateInput value={dateStart} onChange={setDateStart} placeholder="Начало" />
                                </div>
                                {/* Date End */}
                                <div className="space-y-1.5">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ДАТА КОНЦА</p>
                                    <DateInput value={dateEnd} onChange={setDateEnd} placeholder="Конец" />
                                </div>
                                {/* Med Rep */}
                                <div className="flex flex-col">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">МЕД. ПРЕДСТАВИТЕЛЬ</p>
                                    <SearchableSelect
                                        options={medReps.map(mr => ({ value: mr.id.toString(), label: mr.name }))}
                                        value={selectedMedRep}
                                        onChange={setSelectedMedRep}
                                        placeholder="Все"
                                    />
                                </div>
                                {/* Company */}
                                <div className="flex flex-col">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ВЫБЕРИТЕ КОМПАНИЮ</p>
                                    <SearchableSelect
                                        options={companiesList.map(c => ({ value: c.id.toString(), label: c.name }))}
                                        value={selectedCompany}
                                        onChange={setSelectedCompany}
                                        placeholder="Все"
                                    />
                                </div>
                                {/* Type */}
                                <div className="flex flex-col">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ТИП</p>
                                    <SearchableSelect
                                        options={FILTER_ORG_TYPES}
                                        value={selectedType}
                                        onChange={setSelectedType}
                                        placeholder="Все"
                                    />
                                </div>
                                {/* Invoice Type Filter */}
                                <div className="flex flex-col">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ТИП ФАКТУРЫ</p>
                                    <SearchableSelect
                                        options={[
                                            { value: 'regular', label: 'Обычная' },
                                            { value: 'tovar_skidka', label: 'Товарная скидка' },
                                            { value: 'through_wholesale', label: 'Через оптовик' },
                                        ]}
                                        value={selectedInvoiceType}
                                        onChange={setSelectedInvoiceType}
                                        placeholder="Все"
                                    />
                                </div>
                                {/* Account Number */}
                                <div className="flex flex-col">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">НОМЕР СЧЕТА</p>
                                    <Input
                                        value={invNumSearch}
                                        onChange={e => setInvNumSearch(e.target.value)}
                                        placeholder="000"
                                        className="w-full bg-white border-slate-200 rounded-xl font-bold text-slate-700 h-10 shadow-sm"
                                    />
                                </div>
                                {/* Warehouse Filter */}
                                <div className="flex flex-col">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{getWhLabel(selectedWhFilter)}</p>
                                    <SearchableSelect
                                        options={warehouses.map(wh => ({ value: wh.id.toString(), label: wh.name }))}
                                        value={selectedWhFilter}
                                        onChange={setSelectedWhFilter}
                                        placeholder="Все"
                                    />
                                </div>
                                <div className="flex gap-2 mt-auto">
                                    <Button onClick={loadInvoices} className="h-10 bg-slate-800 hover:bg-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest flex-1 shadow-sm">ПОИСК</Button>
                                    <Button onClick={() => { resetFilters(); loadInvoices(); }} variant="outline" className="h-10 rounded-xl text-[10px] font-black uppercase tracking-widest border-rose-200 text-rose-500 hover:bg-rose-50 px-3 shadow-sm">Сбросить</Button>
                                </div>
                            </div>
                        </div>

                        <ModernStatsBar
                            stats={{
                                ...stats,
                                resCount: filteredInv.length,
                                tovarSkidkaCount: filteredInv.filter(i => i.reservation?.is_tovar_skidka).length,
                                tovarSkidkaAmount: filteredInv.filter(i => i.reservation?.is_tovar_skidka).reduce((sum, i) => sum + (i.total_amount || 0), 0)
                            }}
                            promoAmount={filteredInv.reduce((s, inv) => s + calculatePromo(inv.reservation), 0)}
                            countLabel="Кол-во (Фактуры)"
                            showPromo={false}
                            totalLabel="ОБЩАЯ ПРОДАЖА"
                            onCreditClick={() => setShowOverpaidModal(true)}
                        />
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl mx-4 mb-4">
                            <div
                                ref={invoicesScroll.ref}
                                onMouseDown={invoicesScroll.onMouseDown}
                                onMouseLeave={invoicesScroll.onMouseLeave}
                                onMouseUp={invoicesScroll.onMouseUp}
                                onMouseMove={invoicesScroll.onMouseMove}
                                className={`overflow-auto max-h-[70vh] ${invoicesScroll.isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
                            >
                                <table className="min-w-[1500px] w-full text-[10px] whitespace-nowrap border-separate border-spacing-0">
                                    <thead className="sticky top-0 z-30">
                                        <tr>
                                            <th className="sticky top-0 z-30 bg-white px-3 py-3 text-left font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 italic">#</th>
                                            <SortHeader label="ДАТА РЕАЛИЗАЦИИ" sortKey="date" currentSort={sortConfig} onSort={handleSort} />
                                            <th className="sticky top-0 z-30 bg-white px-3 py-3 text-center font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">ПРОСРОЧКА</th>
                                            <SortHeader label="НОМЕР С/Ф" sortKey="factura" currentSort={sortConfig} onSort={handleSort} />
                                            <SortHeader label="КОНТРАГЕНТ" sortKey="client" currentSort={sortConfig} onSort={handleSort} />
                                            <SortHeader label="РЕГИОН" sortKey="region" currentSort={sortConfig} onSort={handleSort} />
                                            <th className="sticky top-0 z-30 bg-white px-3 py-3 text-left font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">ИНН</th>
                                            <SortHeader label="СУММА С/Ф" sortKey="total" currentSort={sortConfig} onSort={handleSort} className="text-center" />
                                            <SortHeader label="ПОСТУПЛЕНИЕ" sortKey="paid" currentSort={sortConfig} onSort={handleSort} className="text-center" />
                                            <SortHeader label="ДЕБИТОР" sortKey="debt" currentSort={sortConfig} onSort={handleSort} className="text-center" />
                                            <SortHeader label="СКИДКА %" sortKey="discount" currentSort={sortConfig} onSort={handleSort} className="text-center" />
                                            <th className="sticky top-0 z-30 bg-white px-3 py-3 text-left font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">ДАТА БРОНИ</th>
                                            <th className="sticky top-0 z-30 bg-white px-3 py-3 text-center font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">ОДОБРЕНО</th>
                                            <th className="sticky top-0 z-30 bg-white px-3 py-3 text-left font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">ПРОИЗВОДИТЕЛЬ</th>
                                            <SortHeader label="ПРОМО" sortKey="promo" currentSort={sortConfig} onSort={handleSort} className="text-center" />
                                            <SortHeader label="ЗАРПЛАТА" sortKey="salary" currentSort={sortConfig} onSort={handleSort} className="text-center" />
                                            <th className="sticky top-0 z-30 bg-white px-3 py-3 text-center font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">ВОЗВРАТ</th>
                                            <th className="sticky top-0 z-30 bg-white px-3 py-3 text-center font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">ДЕЙСТВИЯ</th>
                                            <th className="sticky top-0 z-30 bg-white px-3 py-3 text-center font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">ИСТОРИЯ</th>
                                            <th className="sticky top-0 z-30 bg-white px-3 py-3 text-center font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">СПИСОК</th>
                                            <th className="sticky top-0 z-30 bg-white px-3 py-3 text-center font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">СКАЧАТЬ</th>
                                            <th className="sticky top-0 z-30 bg-white px-3 py-3 text-center font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-rose-500">УДАЛИТЬ</th>
                                            <th className="sticky top-0 z-30 bg-white px-3 py-3 text-left font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">МП</th>
                                            <th className="sticky top-0 z-30 bg-white px-3 py-3 text-left font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">ТИП</th>
                                            <th className="sticky top-0 z-30 bg-white px-3 py-3 text-left font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">ТИП К/А</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedInvoices.length === 0 ? (
                                            <tr>
                                                <td colSpan={24} className="py-20 text-center">
                                                    <div className="flex flex-col items-center gap-3 opacity-20">
                                                        <Receipt className="w-12 h-12" />
                                                        <p className="font-black uppercase tracking-tighter text-xl text-slate-900">Фактуры отсутствуют</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (sortedInvoices as any[]).map((inv, idx) => {
                                            const res = inv.reservation || {};
                                            const paidAmount = inv.paid_amount || 0;
                                            const debt = (inv.total_amount || 0) - paidAmount;
                                            const discount = res.items?.[0]?.discount_percent || 0;
                                            const region = res.med_org?.region?.name || '—';
                                            const medRepName = res.med_org?.assigned_reps?.[0]?.full_name || '—';
                                            const orgType = res.med_org?.org_type || '—';
                                            const manufacturer = res.items?.[0]?.product?.manufacturers?.[0]?.name || '—';
                                            const inn = res.med_org?.inn || '—';
                                            const promoVal = calculatePromo(res);

                                            return (
                                                <tr key={inv.id} className={`border-b transition-colors group 
                                                    ${res?.is_deletion_pending || inv.is_deletion_pending || res?.is_return_pending 
                                                        ? 'bg-yellow-100/70 hover:bg-yellow-100 border-yellow-200' 
                                                        : 'border-slate-50 hover:bg-slate-50/80'
                                                    }`}>
                                                    <td className="px-3 py-4 font-medium text-slate-400 group-hover:text-blue-600 transition-colors italic">{idx + 1}</td>
                                                    <td className="px-3 py-4">
                                                        <div className="flex items-center gap-1">
                                                            <span className="font-black text-slate-700 tracking-tight">{inv.realization_date ? format(new Date(inv.realization_date), 'dd/MM/yyyy') : (inv.created_at ? format(new Date(inv.created_at), 'dd/MM/yyyy') : '—')}</span>
                                                            <Pencil onClick={() => handleOpenInvoiceEdit(res, 'date')} className="w-3 h-3 text-slate-300 hover:text-blue-500 cursor-pointer transition-colors" />
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-4 text-center">
                                                        {(() => {
                                                            const d = inv.realization_date || inv.date || inv.created_at;
                                                            if (!d) return '—';
                                                            const diff = new Date().getTime() - new Date(d).getTime();
                                                            const days = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
                                                            return (
                                                                <span className={`font-black text-[10px] ${days > 30 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                                    {days} дн.
                                                                </span>
                                                            );
                                                        })()}
                                                    </td>
                                                    <td className="px-3 py-4">
                                                        <div className="flex items-center gap-1">
                                                            <span className="font-black text-slate-700 tracking-tight">{inv.factura_number || '—'}</span>
                                                            <Pencil onClick={() => handleOpenInvoiceEdit(res, 'factura')} className="w-3 h-3 text-slate-300 hover:text-blue-500 cursor-pointer transition-colors" />
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-4 font-black">
                                                        <div className="flex items-center gap-1 text-slate-800 tracking-tight">
                                                            <span>{res.med_org?.name || '—'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-4 font-black text-slate-600 tracking-tight">{region}</td>
                                                    <td className="px-3 py-4 font-black text-slate-600 tracking-tight">{inn}</td>
                                                    <td className="px-3 py-4 font-black text-slate-700 tracking-tight text-center">{formatMoney(inv.total_amount || 0)}</td>
                                                    <td className="px-3 py-4 font-black text-emerald-600 text-center">{formatMoney(paidAmount)}</td>
                                                    <td className="px-3 py-4 font-black text-rose-600 text-center">{formatMoney(debt)}</td>
                                                    <td className="px-3 py-4 font-black text-center">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <span className="text-slate-700">{discount}%</span>
                                                            <Pencil onClick={() => handleOpenInvoiceEdit(res, 'discount')} className="w-3 h-3 text-slate-300 hover:text-blue-500 cursor-pointer transition-colors" />
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-4 font-bold text-slate-500 text-center">{res.date ? format(new Date(res.date), 'dd/MM/yyyy') : '—'}</td>
                                                    <td className="px-3 py-4 text-center">
                                                        <div className="flex justify-center">
                                                            <button
                                                                className={`w-8 h-4 rounded-full relative transition-colors ${res.status === 'approved' || res.status === 'paid' || res.status === 'partial' ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                                            >
                                                                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all shadow-sm ${res.status === 'approved' || res.status === 'paid' || res.status === 'partial' ? 'right-0.5' : 'left-0.5'}`} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-4 font-black text-slate-700 uppercase">{manufacturer}</td>
                                                    <td className="px-3 py-4 text-center font-black text-slate-700 italic opacity-50">{promoVal.toLocaleString()}</td>
                                                    <td className="px-3 py-4 text-center font-black text-indigo-600">
                                                        {(() => {
                                                            const totalSal = (res.items || []).reduce((s: number, it: any) => s + (it.quantity || 0) * (it.salary_amount || 0), 0);
                                                            if (totalSal === 0) return '—';
                                                            if (res.is_salary_enabled === false) {
                                                                return (
                                                                    <div className="flex flex-col items-center opacity-40" title="Начисление зарплаты отключено">
                                                                        <span className="text-[7px] text-rose-500 uppercase leading-none mb-0.5">Off</span>
                                                                        <span className="line-through decoration-rose-300 decoration-1 text-slate-500">{formatMoney(totalSal)}</span>
                                                                    </div>
                                                                );
                                                            }
                                                            return formatMoney(totalSal);
                                                        })()}
                                                    </td>
                                                    <td className="px-3 py-4 text-center">
                                                        {res.is_return_pending ? (
                                                            <div className="flex items-center justify-center gap-1.5 p-1.5 rounded-lg bg-purple-50 text-purple-600 border border-purple-100/50" title="Ожидает возврата">
                                                                <AlertTriangle className="w-4 h-4" />
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => { setSelectedResForReturn(res); setReturnQuantities({}); setShowReturnModal(true); }}
                                                                className="p-1.5 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-all"
                                                                title="Возврат"
                                                            >
                                                                <RefreshCw className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-4 text-center">
                                                        <Button
                                                            onClick={() => { setSelectedInvoice(inv); setIsPaymentModalOpen(true); }}
                                                            className="h-8 bg-slate-100 hover:bg-blue-600 text-slate-600 hover:text-white rounded-xl text-[9px] font-black uppercase transition-all px-4"
                                                        >
                                                            ПОСТУПЛЕНИЕ
                                                        </Button>
                                                    </td>
                                                    <td className="px-3 py-4 text-center">
                                                        <button onClick={() => { setSelectedResForHistory(inv); setShowPaymentHistoryModal(true); }} className="p-1.5 hover:bg-indigo-100 hover:text-indigo-600 rounded-lg transition-colors text-slate-400">
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
                                                    <td className="px-3 py-4 text-center">
                                                        <button
                                                            onClick={(e) => { 
                                                                e.stopPropagation(); 
                                                                if (paidAmount > 0) {
                                                                    toast.error("Невозможно удалить: по этой накладной уже есть оплата.");
                                                                } else if (res?.is_deletion_pending || inv.is_deletion_pending) {
                                                                    toast.info("Заявка на удаление уже отправлена.");
                                                                } else {
                                                                    handleDeleteRes(res.id); 
                                                                }
                                                            }}
                                                            className={`p-1.5 rounded-lg transition-all ${(paidAmount > 0 || res?.is_deletion_pending || inv.is_deletion_pending) ? 'text-slate-300 cursor-not-allowed' : 'hover:bg-rose-100 text-slate-400 hover:text-rose-600'}`}
                                                            title={paidAmount > 0 ? "Невозможно удалить оплаченную фактуру" : "Удалить бронь"}
                                                            disabled={paidAmount > 0 || res?.is_deletion_pending || inv.is_deletion_pending}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                    <td className="px-3 py-4 font-black text-slate-800 tracking-tight">{medRepName}</td>
                                                    <td className="px-3 py-4">
                                                        <span className={`px-2 py-1 rounded-lg font-black text-[9px] uppercase tracking-wider ${res.is_tovar_skidka ? 'bg-orange-100 text-orange-700' : res.warehouse?.is_wholesale ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'}`}>
                                                            {res.is_tovar_skidka ? 'Товарная скидка' : res.warehouse?.is_wholesale ? 'Через оптовик' : 'Обычная'}
                                                        </span>
                                                    </td>
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

            {/* ============================================================
                TAB 3.5: ДЕБИТОРКА
            ============================================================ */}
            {
                tab === 'debitorka' && (
                    <div className="bg-slate-50/50">
                        <div className="flex items-center justify-between mb-4 px-2">
                            <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                                <Wallet className="w-5 h-5 text-rose-500" />
                                Дебиторка
                            </h2>
                            <div className="flex items-center gap-3">
                                <Button 
                                    onClick={() => exportToExcel(sortedDebitorka, 'Debitorka')} 
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-600/20 px-4 h-10 font-black uppercase text-[10px] tracking-widest gap-2"
                                >
                                    <Download className="w-4 h-4" /> Excel
                                </Button>
                                <Button onClick={loadInvoices} variant="outline" size="sm" className="rounded-xl border-slate-200 h-10 px-4">
                                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> ОБНОВИТЬ
                                </Button>
                                <div className="relative w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input
                                        value={invSearch}
                                        onChange={e => setInvSearch(e.target.value)}
                                        placeholder="Поиск..."
                                        className="pl-9 rounded-xl border-slate-200 bg-white shadow-sm h-10 font-bold"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* FILTER BAR FOR DEBITORKA */}
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-4">
                            <div className="flex flex-wrap gap-3 items-end">
                                {/* Date Start */}
                                <div className="space-y-1.5">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ДАТА НАЧАЛА</p>
                                    <DateInput value={dateStart} onChange={setDateStart} placeholder="Начало" />
                                </div>
                                {/* Date End */}
                                <div className="space-y-1.5">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ДАТА КОНЦА</p>
                                    <DateInput value={dateEnd} onChange={setDateEnd} placeholder="Конец" />
                                </div>
                                {/* Med Rep */}
                                <div className="flex flex-col">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">МЕД. ПРЕДСТАВИТЕЛЬ</p>
                                    <SearchableSelect
                                        options={medReps.map(mr => ({ value: mr.id.toString(), label: mr.name }))}
                                        value={selectedMedRep}
                                        onChange={setSelectedMedRep}
                                        placeholder="Все"
                                    />
                                </div>
                                {/* Company */}
                                <div className="flex flex-col">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ВЫБЕРИТЕ КОМПАНИЮ</p>
                                    <SearchableSelect
                                        options={companiesList.map(c => ({ value: c.id.toString(), label: c.name }))}
                                        value={selectedCompany}
                                        onChange={setSelectedCompany}
                                        placeholder="Все"
                                    />
                                </div>
                                {/* Type */}
                                <div className="flex flex-col">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ТИП</p>
                                    <SearchableSelect
                                        options={FILTER_ORG_TYPES}
                                        value={selectedType}
                                        onChange={setSelectedType}
                                        placeholder="Все"
                                    />
                                </div>
                                {/* Invoice Type */}
                                <div className="flex flex-col">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ТИП ФАКТУРЫ</p>
                                    <SearchableSelect
                                        options={[
                                            { value: 'regular', label: 'Обычная' },
                                            { value: 'tovar_skidka', label: 'Товарная скидка' },
                                            { value: 'through_wholesale', label: 'Через оптовик' },
                                        ]}
                                        value={selectedInvoiceType}
                                        onChange={setSelectedInvoiceType}
                                        placeholder="Все"
                                    />
                                </div>
                                {/* Account Number */}
                                <div className="flex flex-col">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">НОМЕР СЧЕТА</p>
                                    <Input
                                        value={invNumSearch}
                                        onChange={e => setInvNumSearch(e.target.value)}
                                        placeholder="000"
                                        className="w-full bg-white border-slate-200 rounded-xl font-bold text-slate-700 h-10 shadow-sm"
                                    />
                                </div>
                                {/* Warehouse Filter */}
                                <div className="flex flex-col">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{getWhLabel(selectedWhFilter)}</p>
                                    <SearchableSelect
                                        options={warehouses.map(wh => ({ value: wh.id.toString(), label: wh.name }))}
                                        value={selectedWhFilter}
                                        onChange={setSelectedWhFilter}
                                        placeholder="Все"
                                    />
                                </div>
                                <div className="flex gap-2 mt-auto">
                                    <Button onClick={loadInvoices} className="h-10 bg-slate-800 hover:bg-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest flex-1 shadow-sm">ПОИСК</Button>
                                    <Button onClick={() => { resetFilters(); loadInvoices(); }} variant="outline" className="h-10 rounded-xl text-[10px] font-black uppercase tracking-widest border-rose-200 text-rose-500 hover:bg-rose-50 px-3 shadow-sm">Сбросить</Button>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 mx-4">
                            <div className="bg-gradient-to-br from-rose-500 to-rose-700 rounded-3xl p-6 text-white shadow-xl shadow-rose-600/20 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-700" />
                                <div className="flex justify-between items-start mb-4 relative z-10">
                                    <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                                        <TrendingDown className="w-6 h-6 text-white" />
                                    </div>
                                    <span className="text-xs font-black text-rose-100 uppercase tracking-[0.2em] italic">ОБЩАЯ ЗАДОЛЖЕННОСТЬ</span>
                                </div>
                                <div className="flex items-baseline gap-2 relative z-10">
                                    <span className="text-4xl font-black tracking-tighter text-white tabular-nums">
                                        {formatMoney(filteredDebitorka.reduce((s, i) => s + ((i.total_amount || 0) - (i.paid_amount || 0)), 0))}
                                    </span>
                                    <span className="text-lg font-bold text-rose-200">UZS</span>
                                </div>
                                <div className="mt-1 relative z-10 flex flex-col">
                                    <span className="text-[10px] font-black text-rose-100/70 uppercase tracking-widest">Из них просроченная задолженность:</span>
                                    <span className="text-sm font-black text-white tracking-tight">{formatMoney(stats.overdueAmount)} UZS</span>
                                </div>
                                <div className="mt-4 flex items-center gap-2 relative z-10 bg-white/10 w-fit px-3 py-1.5 rounded-full border border-white/10">
                                    <div className="w-2 h-2 rounded-full bg-rose-300 animate-pulse" />
                                    <span className="text-xs font-bold text-rose-100">{filteredDebitorka.length} неоплаченных фактур</span>
                                </div>
                            </div>

                            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xl shadow-slate-200/50">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-emerald-50 rounded-2xl">
                                        <Wallet className="w-6 h-6 text-emerald-600" />
                                    </div>
                                    <span className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] italic">УЖЕ ОПЛАЧЕНО</span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-black tracking-tighter text-slate-900 tabular-nums">
                                        {formatMoney(filteredDebitorka.reduce((s, i) => s + (i.paid_amount || 0), 0))}
                                    </span>
                                    <span className="text-lg font-bold text-slate-300">UZS</span>
                                </div>
                                <div className="mt-6 flex items-center gap-4">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ВСЕГО ПРОДАЖ ПО ДЕБИТОРАМ</span>
                                        <span className="text-sm font-bold text-slate-600">
                                            {formatMoney(filteredDebitorka.reduce((s, i) => s + (i.total_amount || 0), 0))} UZS
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl mx-4 mb-4">
                            <div
                                ref={invoicesScroll.ref}
                                onMouseDown={invoicesScroll.onMouseDown}
                                onMouseLeave={invoicesScroll.onMouseLeave}
                                onMouseUp={invoicesScroll.onMouseUp}
                                onMouseMove={invoicesScroll.onMouseMove}
                                className={`overflow-auto max-h-[70vh] ${invoicesScroll.isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
                            >
                                <table className="min-w-[1500px] w-full text-[10px] whitespace-nowrap border-separate border-spacing-0">
                                    <thead className="sticky top-0 z-30">
                                        <tr>
                                            <th className="sticky top-0 z-30 bg-white px-3 py-3 text-left font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 italic">#</th>
                                            <SortHeader label="ДАТА РЕАЛИЗАЦИИ" sortKey="date" currentSort={sortConfig} onSort={handleSort} />
                                            <th className="sticky top-0 z-30 bg-white px-3 py-3 text-center font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">ПРОСРОЧКА</th>
                                            <SortHeader label="НОМЕР С/Ф" sortKey="factura" currentSort={sortConfig} onSort={handleSort} />
                                            <SortHeader label="КОНТРАГЕНТ" sortKey="client" currentSort={sortConfig} onSort={handleSort} />
                                            <SortHeader label="РЕГИОН" sortKey="region" currentSort={sortConfig} onSort={handleSort} />
                                            <th className="sticky top-0 z-30 bg-white px-3 py-3 text-left font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">ИНН</th>
                                            <SortHeader label="СУММА С/Ф" sortKey="total" currentSort={sortConfig} onSort={handleSort} className="text-center" />
                                            <SortHeader label="ПОСТУПЛЕНИЕ" sortKey="paid" currentSort={sortConfig} onSort={handleSort} className="text-center" />
                                            <SortHeader label="ДЕБИТОР" sortKey="debt" currentSort={sortConfig} onSort={handleSort} className="text-center text-rose-500" />
                                            <SortHeader label="СКИДКА %" sortKey="discount" currentSort={sortConfig} onSort={handleSort} className="text-center" />
                                            <th className="sticky top-0 z-30 bg-white px-3 py-3 text-left font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">ДАТА БРОНИ</th>
                                            <th className="sticky top-0 z-30 bg-white px-3 py-3 text-center font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">ОДОБРЕНО</th>
                                            <th className="sticky top-0 z-30 bg-white px-3 py-3 text-left font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">ПРОИЗВОДИТЕЛЬ</th>
                                            <SortHeader label="ПРОМО" sortKey="promo" currentSort={sortConfig} onSort={handleSort} className="text-center" />
                                            <th className="sticky top-0 z-30 bg-white px-3 py-3 text-center font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-slate-300">ВОЗВРАТ</th>
                                            <th className="sticky top-0 z-30 bg-white px-3 py-3 text-center font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">ДЕЙСТВИЯ</th>
                                            <th className="sticky top-0 z-30 bg-white px-3 py-3 text-center font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">ИСТОРИЯ</th>
                                            <th className="sticky top-0 z-30 bg-white px-3 py-3 text-center font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">СПИСОК</th>
                                            <th className="sticky top-0 z-30 bg-white px-3 py-3 text-center font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">СКАЧАТЬ</th>
                                            <th className="sticky top-0 z-30 bg-white px-3 py-3 text-center font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-rose-500">УДАЛИТЬ</th>
                                            <th className="sticky top-0 z-30 bg-white px-3 py-3 text-left font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">МП</th>
                                            <th className="sticky top-0 z-30 bg-white px-3 py-3 text-left font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">ТИП</th>
                                            <th className="sticky top-0 z-30 bg-white px-3 py-3 text-left font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">ТИП К/А</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedDebitorka.length === 0 ? (
                                            <tr>
                                                <td colSpan={24} className="py-20 text-center">
                                                    <div className="flex flex-col items-center gap-3 opacity-20">
                                                        <Receipt className="w-12 h-12" />
                                                        <p className="font-black uppercase tracking-tighter text-xl text-slate-900">Задолженностей нет</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (sortedDebitorka as any[]).map((inv, idx) => {
                                            const res = inv.reservation || {};
                                            const paidAmount = inv.paid_amount || 0;
                                            const debt = (inv.total_amount || 0) - paidAmount;
                                            const discount = res.items?.[0]?.discount_percent || 0;
                                            const medRepName = res.med_org?.assigned_reps?.[0]?.full_name || '—';
                                            const manufacturer = res.items?.[0]?.product?.manufacturers?.[0]?.name || '—';
                                            const region = res.med_org?.region?.name || '—';
                                            const inn = res.med_org?.inn || '—';
                                            const promoVal = res ? calculatePromo(res) : 0;
                                            const orgType = res.med_org?.org_type || '—';

                                            return (
                                                <tr key={inv.id} className={`border-b transition-colors group 
                                                    ${res?.is_deletion_pending || inv.is_deletion_pending || res?.is_return_pending 
                                                        ? 'bg-yellow-100/70 hover:bg-yellow-100 border-yellow-200' 
                                                        : (() => {
                                                            const d = inv.realization_date || inv.date || inv.created_at;
                                                            if (d) {
                                                                const diff = new Date().getTime() - new Date(d).getTime();
                                                                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                                                                return days > 30;
                                                            }
                                                            return false;
                                                        })() ? 'bg-rose-50 hover:bg-rose-100 border-rose-100' : 'border-slate-50 hover:bg-slate-50/80'
                                                    }`}>
                                                    <td className="px-3 py-4 font-medium text-slate-400 group-hover:text-blue-600 transition-colors italic">{idx + 1}</td>
                                                    <td className="px-3 py-4">
                                                        <span className="font-black text-slate-700 tracking-tight">{inv.realization_date ? format(new Date(inv.realization_date), 'dd/MM/yyyy') : (inv.created_at ? format(new Date(inv.created_at), 'dd/MM/yyyy') : '—')}</span>
                                                    </td>
                                                    <td className="px-3 py-4 text-center">
                                                        {(() => {
                                                            const d = inv.realization_date || inv.date || inv.created_at;
                                                            if (!d) return '—';
                                                            const diff = new Date().getTime() - new Date(d).getTime();
                                                            const days = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
                                                            return (
                                                                <span className={`font-black text-[10px] ${days > 30 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                                    {days} дн.
                                                                </span>
                                                            );
                                                        })()}
                                                    </td>
                                                    <td className="px-3 py-4">
                                                        <span className="font-black text-slate-700 tracking-tight">{inv.factura_number || `INV-${inv.id}`}</span>
                                                    </td>
                                                    <td className="px-3 py-4 font-black">
                                                        <span className="text-slate-800 tracking-tight">{res.med_org?.name || '—'}</span>
                                                    </td>
                                                    <td className="px-3 py-4 font-black text-slate-600 tracking-tight">{region}</td>
                                                    <td className="px-3 py-4 font-black text-slate-600 tracking-tight">{inn}</td>
                                                    <td className="px-3 py-4 font-black text-slate-700 tracking-tight text-center">{formatMoney(inv.total_amount || 0)}</td>
                                                    <td className="px-3 py-4 font-black text-emerald-600 text-center">{formatMoney(paidAmount)}</td>
                                                    <td className="px-3 py-4 font-black text-rose-600 text-center">{formatMoney(debt)}</td>
                                                    <td className="px-3 py-4 font-black text-center">
                                                        <span className="text-slate-700">{discount}%</span>
                                                    </td>
                                                    <td className="px-3 py-4 font-bold text-slate-500 text-center">{res.date ? format(new Date(res.date), 'dd/MM/yyyy') : '—'}</td>
                                                    <td className="px-3 py-4 text-center">
                                                        <div className="flex justify-center">
                                                            <button className="w-8 h-4 rounded-full relative transition-colors bg-emerald-500">
                                                                <div className="absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all shadow-sm right-0.5" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-4 font-black text-slate-700 uppercase">{manufacturer}</td>
                                                    <td className="px-3 py-4 text-center font-black text-slate-700 italic opacity-50">{promoVal.toLocaleString()}</td>
                                                    <td className="px-3 py-4 text-center">
                                                        <button disabled className="p-1.5 opacity-20 text-slate-400">
                                                            <RefreshCw className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                    <td className="px-3 py-4 text-center">
                                                        <Button
                                                            onClick={() => { setSelectedInvoice(inv); setIsPaymentModalOpen(true); }}
                                                            className="h-8 bg-slate-100 hover:bg-blue-600 text-slate-600 hover:text-white rounded-xl text-[9px] font-black uppercase transition-all px-4"
                                                        >
                                                            ПОСТУПЛЕНИЕ
                                                        </Button>
                                                    </td>
                                                    <td className="px-3 py-4 text-center">
                                                        <button onClick={() => { setSelectedResForHistory(inv); setShowPaymentHistoryModal(true); }} className="p-1.5 hover:bg-indigo-100 hover:text-indigo-600 rounded-lg transition-colors text-slate-400">
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
                                                    <td className="px-3 py-4 text-center">
                                                        <button disabled className="p-1.5 opacity-20 text-slate-400">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                    <td className="px-3 py-4 font-black text-slate-800 tracking-tight">{medRepName}</td>
                                                    <td className="px-3 py-4">
                                                        <span className={`px-2 py-1 rounded-lg font-black text-[9px] uppercase tracking-wider ${res.is_tovar_skidka ? 'bg-orange-100 text-orange-700' : res.warehouse?.is_wholesale ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'}`}>
                                                            {res.is_tovar_skidka ? 'Товарная скидка' : res.warehouse?.is_wholesale ? 'Через оптовик' : 'Обычная'}
                                                        </span>
                                                    </td>
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
                                    <div className="flex items-start justify-between mb-3 border-b border-slate-50 pb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                                                <Building2 className="w-5 h-5 text-indigo-600" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-800 text-sm">{org.name}</p>
                                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{org.org_type || 'Организация'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1.5 mt-2">
                                        <p className="text-xs text-slate-500 flex items-center gap-1">
                                            <span className="opacity-50">📞</span> {org.contact_phone || '—'}
                                        </p>
                                        {org.credit_balance > 0 && (
                                            <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 w-fit">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                <span className="text-[10px] font-black uppercase tracking-wider">Кредиторка: {formatMoney(org.credit_balance || 0)} UZS</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between mt-4">
                                        <div className="flex items-center gap-2">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{org.inn ? `ИНН: ${org.inn}` : ''}</p>
                                        </div>
                                        <Button size="sm" variant="outline"
                                            className="border-blue-200 text-blue-600 hover:bg-blue-50 text-[10px] font-bold uppercase tracking-wider h-8"
                                            onClick={() => {
                                                setSelectedWholesaleOrg(org);
                                                setIsReservationModalOpen(true);
                                            }}>
                                            <Plus className="w-3 h-3 mr-1" /> ВЫДАТЬ НА ОТВЕТ ХРАН.
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
                                { label: 'Всего броней', value: stats.resCount, sub: `Ожидает: ${stats.resPendingCount}  |  Актив.: ${stats.resActiveCount}`, color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-100', Icon: CalendarRange },
                                { label: "Всего оплат", value: `${formatMoney(stats.paidAmount)} UZS`, sub: `${stats.paidInvoicesCount} полностью оплачено`, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100', Icon: DollarSign },
                                { label: 'Задолженность', value: `${formatMoney(stats.debtAmount)} UZS`, sub: `${stats.partialInvoicesCount} частично оплачено`, color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-100', Icon: TrendingUp },
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
                                                    <span className="text-slate-500">
                                                        {s.product?.name || products.find((p: any) => p.id === s.product_id)?.name || `Продукт #${s.product_id}`}
                                                    </span>
                                                    <span className="font-bold text-slate-800 tracking-tight">{s.quantity} шт.</span>
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
                    <DialogTitle className="sr-only">Изменить количество</DialogTitle>
                    <DialogDescription className="sr-only">Модальное окно для изменения количества продуктов.</DialogDescription>
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
                                    Текущий остаток на складе: <span className="font-bold text-white">
                                        {formatMoney(selectedWarehouse?.stocks?.find((s: any) => s.product_id === editProduct.id)?.quantity || 0)} шт
                                    </span>
                                    {stockMap[editProduct.id] > (selectedWarehouse?.stocks?.find((s: any) => s.product_id === editProduct.id)?.quantity || 0) && (
                                        <span className="block text-[10px] text-white/50 mt-1 italic italic-normal">
                                            (Общий остаток по всем складам: {formatMoney(stockMap[editProduct.id] || 0)} шт)
                                        </span>
                                    )}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="px-6 py-5 space-y-4">
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Количество (шт)</label>
                            <Input
                                type="number"
                                min={0}
                                value={editQty}
                                onChange={e => setEditQty(e.target.value)}
                                placeholder="Введите общее количество"
                                className="border-slate-200 rounded-xl h-11 text-lg font-semibold"
                                autoFocus
                            />
                        </div>
                        {editProduct && editQty !== '' && (
                            <div className="text-sm text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <p>
                                    Текущий остаток: <span className="font-bold text-slate-700">{formatMoney(selectedWarehouse?.stocks?.find((s: any) => s.product_id === editProduct.id)?.quantity || 0)} шт</span>
                                </p>
                                <p className="mt-1">
                                    Станет после сохранения: <span className={`font-bold ${parseInt(editQty) > (selectedWarehouse?.stocks?.find((s: any) => s.product_id === editProduct.id)?.quantity || 0) ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {formatMoney(parseInt(editQty || '0'))} шт
                                    </span>
                                </p>
                                <p className="text-[10px] text-slate-400 mt-2 italic">
                                    * Будет создана запись о {parseInt(editQty || '0') > (selectedWarehouse?.stocks?.find((s: any) => s.product_id === editProduct.id)?.quantity || 0) ? 'пополнении' : 'корректировке'} на {Math.abs(parseInt(editQty || '0') - (selectedWarehouse?.stocks?.find((s: any) => s.product_id === editProduct.id)?.quantity || 0))} шт.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 px-6 pb-5">
                        <Button variant="outline" className="rounded-xl" onClick={() => { setEditProduct(null); setEditQty(''); }}>Отмена</Button>
                        <Button
                            className="bg-slate-800 hover:bg-slate-900 text-white rounded-xl px-6"
                            onClick={handleSaveEdit}
                            disabled={editLoading || editQty === '' || parseInt(editQty) < 0}
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
                    <DialogTitle className="sr-only">Приход Товара</DialogTitle>
                    <DialogDescription className="sr-only">Окно для оформления прихода товара от производителя.</DialogDescription>
                    {/* Header */}
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 px-6 py-5 text-white">
                        <div className="flex items-center gap-2 mb-1">
                            <Package className="w-5 h-5 opacity-80" />
                            <h2 className="text-lg font-bold">Приёмка товара на склад</h2>
                        </div>
                        {(selectedWarehouse || warehouses[0]) && (
                            <p className="text-white/70 text-xs">Склад: <span className="text-white font-semibold">{(selectedWarehouse || warehouses[0]).name}</span></p>
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
                            <SearchableProductSelect
                                products={prixodMfrProducts}
                                selectedId={prixodProd}
                                onSelect={setPrixodProd}
                                stockMap={stockMap}
                                placeholder={prixodMfr ? 'Выберите препарат...' : 'Сначала выберите производителя'}
                                className="border-slate-200 rounded-xl h-10 text-sm"
                                disabled={!prixodMfr}
                            />
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
                onClose={() => {
                    setIsReservationModalOpen(false);
                    setSelectedWholesaleOrg(null);
                }}
                onSuccess={loadReservations}
                initialOrgId={selectedWholesaleOrg?.id}
                initialOrgType={selectedWholesaleOrg?.org_type}
                initialMedRepId={selectedWholesaleOrg?.assigned_reps?.[0]?.id}
            />

            {/* Confirmation for Activation */}
            <Dialog open={!!showActivateConfirm} onOpenChange={v => { if (!v) setShowActivateConfirm(null); }}>
                <DialogContent className="max-w-md rounded-2xl shadow-2xl p-0 overflow-hidden border-0">
                    <DialogTitle className="sr-only">Подтверждение активации</DialogTitle>
                    <DialogDescription className="sr-only">Вы действительно хотите активировать эту бронь?</DialogDescription>
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                                <CheckCircle className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Подтвердите активацию</h3>
                                <p className="text-sm text-slate-500">Вы действительно хотите активировать эту бронь? Это действие создаст фактуру и заблокирует товар на складе.</p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <Button variant="outline" className="rounded-xl" onClick={() => setShowActivateConfirm(null)} disabled={loading}>
                                Отмена
                            </Button>
                            <Button
                                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6"
                                onClick={() => showActivateConfirm && handleActivate(showActivateConfirm)}
                                disabled={loading}
                            >
                                {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                                Да, активировать
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Confirmation for Delete */}
            <Dialog open={!!showDeleteConfirm} onOpenChange={v => { if (!v) setShowDeleteConfirm(null); }}>
                <DialogContent className="max-w-md rounded-2xl shadow-2xl p-0 overflow-hidden border-0">
                    <DialogTitle className="sr-only">Удаление брони</DialogTitle>
                    <DialogDescription className="sr-only">Подтвердите удаление брони</DialogDescription>
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                                <Trash2 className="w-6 h-6 text-red-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Удаление брони</h3>
                                <p className="text-sm text-slate-500 mt-0.5">
                                    Бронь #{showDeleteConfirm} будет удалена. Bce товары <span className="font-semibold text-slate-700">будут возвращены на склад</span>.
                                    Это действие нельзя отменить.
                                </p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <Button variant="outline" className="rounded-xl" onClick={() => setShowDeleteConfirm(null)}>
                                Отмена
                            </Button>
                            <Button
                                className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-6"
                                onClick={confirmDeleteRes}
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Да, удалить
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ============================================================
                HISTORY OF RECEIPTS MODAL
            ============================================================ */}
            <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
                <DialogContent className="max-w-2xl rounded-3xl p-0 overflow-hidden border-0 shadow-2xl">
                    <DialogTitle className="sr-only">Оформить Отгрузку</DialogTitle>
                    <DialogDescription className="sr-only">Модальное окно для оформления отгрузки.</DialogDescription>
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
                    <DialogTitle className="sr-only">Список продуктов брони</DialogTitle>
                    <DialogDescription className="sr-only">Просмотр списка заказанных продуктов.</DialogDescription>
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
                                        <th className="px-4 py-3 text-right font-black text-slate-400 uppercase tracking-widest">Бонус</th>
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
                                                <td className="px-4 py-4 text-right font-bold text-slate-600">{formatMoney(item.product?.price || 0)}</td>
                                                <td className="px-4 py-4 text-right">
                                                    <div className="flex flex-col items-end">
                                                        <span className="font-black text-purple-600">
                                                            {formatMoney(actualQty * (item.marketing_amount || item.default_marketing_amount || 0))}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-bold mt-1">
                                                            {actualQty} * {formatMoney(item.marketing_amount || item.default_marketing_amount || 0)}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    <div className="flex flex-col items-end">
                                                        <span className="px-2 py-1 bg-emerald-50 text-emerald-600 font-black rounded-lg">
                                                            {formatMoney(totalDisplay)}
                                                        </span>
                                                        {item.returned_quantity > 0 && (
                                                            <span className="text-[10px] text-rose-500 font-bold mt-1 line-through">
                                                                {formatMoney(item.quantity * (item.product?.price || 0))}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}

                                    {selectedResItems.length === 0 && (
                                        <tr>
                                            <td className="px-4 py-12 text-center text-slate-400 font-bold uppercase tracking-widest" colSpan={5}>
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
                    <DialogTitle className="sr-only">Возврат товара</DialogTitle>
                    <DialogDescription className="sr-only">Модальное окно оформления возврата продуктов.</DialogDescription>
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
                                    Номер накладной: {selectedResForHistory?.invoice_number || selectedResForHistory?.invoice?.invoice_number || '—'}
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
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Кто принимал</th>
                                        {canManagePayments && (
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amallar</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {((selectedResForHistory?.payments || selectedResForHistory?.invoice?.payments) || []).length > 0 ? (
                                        ((selectedResForHistory?.payments || selectedResForHistory?.invoice?.payments) || []).map((p: any, i: number) => (
                                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <span className="text-sm font-black text-emerald-600">
                                                        {formatMoney(p.amount)} UZS
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2 py-1 rounded-lg bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-wider">
                                                        {p.payment_type === 'bank' ? 'Bank orqali' : p.payment_type}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-xs font-bold text-slate-500">
                                                    {(p.payment_date || p.date) ? format(new Date(p.payment_date || p.date), 'dd.MM.yyyy HH:mm') : '—'}
                                                </td>
                                                <td className="px-6 py-4 text-xs font-bold text-slate-700">
                                                    {p.processed_by?.full_name || '—'}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {canManagePayments && (
                                                        <button 
                                                            onClick={() => handleDeletePayment(p.id)}
                                                            disabled={isDeletingPayment === p.id}
                                                            className="p-2 rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all border border-transparent hover:border-rose-100"
                                                            title="Bekor qilish"
                                                        >
                                                            {isDeletingPayment === p.id ? (
                                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <Trash2 className="w-4 h-4" />
                                                            )}
                                                        </button>
                                                    )}
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
                    <DialogTitle className="sr-only">Детали фактуры</DialogTitle>
                    <DialogDescription className="sr-only">Изменение данных счет-фактуры.</DialogDescription>
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
                                <DateInput
                                    value={editRealizationDate ? String(editRealizationDate).substring(0, 10) : ''}
                                    onChange={(val) => setEditRealizationDate(val)}
                                    placeholder="Дата реализации"
                                    className="h-12 rounded-2xl border-slate-100 bg-slate-50/50"
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


            {/* Overpaid Invoices Modal */}
            <Dialog open={showOverpaidModal} onOpenChange={setShowOverpaidModal}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 border-none bg-slate-50/95 backdrop-blur-xl">
                    <DialogHeader className="p-6 bg-white border-b border-slate-100">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                <Plus className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-black text-slate-800 tracking-tight italic">Кредиторка</DialogTitle>
                                <DialogDescription className="text-slate-400 font-medium">Список фактур с избыточной оплатой (переплаты)</DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>
                    
                    <div className="p-6">
                        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                                        <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Номер фактуры</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Клиент</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">МП</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 text-right">Сумма</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 text-right">Оплачено</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 text-right">Переплата</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredInv
                                        .filter(inv => (Number(inv.paid_amount) || 0) > (Number(inv.total_amount) || 0))
                                        .map(inv => {
                                            const overpayment = (Number(inv.paid_amount) || 0) - (Number(inv.total_amount) || 0);
                                            return (
                                                <TableRow key={inv.id} className="hover:bg-indigo-50/30 transition-colors border-slate-100">
                                                    <TableCell className="font-bold text-slate-700">{inv.factura_number || `INV-${inv.id}`}</TableCell>
                                                    <TableCell className="font-medium text-slate-600">{inv.reservation?.med_org?.name || inv.reservation?.customer_name || '—'}</TableCell>
                                                    <TableCell className="text-slate-500 text-xs italic">
                                                        {inv.reservation?.med_org?.assigned_reps?.[0]?.full_name || '—'}
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium text-slate-500">{formatMoney(inv.total_amount || 0)}</TableCell>
                                                    <TableCell className="text-right font-bold text-slate-700">{formatMoney(inv.paid_amount || 0)}</TableCell>
                                                    <TableCell className="text-right">
                                                        <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-lg font-black text-xs">
                                                            +{formatMoney(overpayment)}
                                                        </span>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    {filteredInv.filter(inv => (Number(inv.paid_amount) || 0) > (Number(inv.total_amount) || 0)).length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-32 text-center text-slate-400 italic">
                                                Переплат не найдено
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                    
                    <DialogFooter className="p-6 bg-slate-50 border-t border-slate-200">
                        <div className="flex items-center justify-between w-full">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ИТОГО КРЕДИТОРКА</span>
                                <span className="text-xl font-black text-indigo-600 tracking-tight">{formatMoney(stats.creditAmount)} UZS</span>
                            </div>
                            <Button onClick={() => setShowOverpaidModal(false)} className="bg-slate-800 hover:bg-slate-900 text-white rounded-xl px-8 font-bold uppercase tracking-widest text-[10px] h-11">
                                Закрыть
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div >
    );
};

export default HeadOfOrdersPage;
