import { PageContainer } from '../../components/PageContainer';
import { PageHeader } from '../../components/PageHeader';
import { FileText, Download, Wallet, TrendingDown, Landmark, Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { DataTable } from '../../components/ui/data-table';
import { Button } from '../../components/ui/button';
import { useAuthStore } from '../../store/authStore';
import { useMemo, useState } from 'react';
import { ModernStatsBar } from '../../components/ui/ModernStatsBar';
import { FilterBar } from '../../components/ui/FilterBar';
import type { FilterValues } from '../../components/ui/FilterBar';
import { formatMoney } from '../../components/ui/MoneyInput';
import { ReservationDetailsModal } from '../reservations/ReservationDetailsModal';

export default function DebtorsPage() {
    const user = useAuthStore((state) => state.user);
    const [filterValues, setFilterValues] = useState<FilterValues>({
        dateStart: '',
        dateEnd: '',
        selectedMedRep: 'all',
        selectedRegion: 'all',
        selectedCompany: 'all',
        selectedType: 'all',
        selectedInvoiceType: 'all',
        invNumSearch: '',
        onlyOverdue: false,
    });

    const [selectedInvoiceForView, setSelectedInvoiceForView] = useState<any | null>(null);

    const { data: invoices = [], isLoading, refetch } = useQuery({
        queryKey: ['invoices-debtors', filterValues],
        queryFn: async () => {
            const params: any = {};
            if (filterValues.dateStart) params.date_from = filterValues.dateStart;
            if (filterValues.dateEnd) params.date_to = filterValues.dateEnd;
            if (filterValues.selectedMedRep !== 'all') params.med_rep_id = filterValues.selectedMedRep;
            if (filterValues.selectedRegion !== 'all') params.region_id = filterValues.selectedRegion;
            if (filterValues.selectedCompany !== 'all') params.med_org_id = filterValues.selectedCompany;
            if (filterValues.selectedType !== 'all') params.med_org_type = filterValues.selectedType;
            if (filterValues.selectedInvoiceType !== 'all') {
                params.is_tovar_skidka = filterValues.selectedInvoiceType === 'tovar_skidka';
            }
            if (filterValues.invNumSearch) params.inv_num = filterValues.invNumSearch;
            params.has_debt = true;
            if (filterValues.onlyOverdue) params.only_overdue = true;

            const response = await api.get('/sales/invoices/', { params });
            return Array.isArray(response.data) ? response.data : (response.data?.items || response.data || []);
        }
    });

    const { data: globalStats } = useQuery({
        queryKey: ['debtors-global-stats', filterValues.selectedMedRep, filterValues.selectedRegion],
        queryFn: async () => {
            const params: any = {};
            if (filterValues.selectedMedRep !== 'all') params.med_rep_id = filterValues.selectedMedRep;
            if (filterValues.selectedRegion !== 'all') params.region_id = filterValues.selectedRegion;
            
            const response = await api.get('/analytics/stats/comprehensive', { params });
            return response.data;
        }
    });

    const stats = useMemo(() => {
        const total = invoices.reduce((acc: number, inv: any) => acc + (inv.total_amount || 0), 0);
        const paid = invoices.reduce((acc: number, inv: any) => acc + (inv.paid_amount || 0), 0);
        
        let totalPromo = 0;
        invoices.forEach((inv: any) => {
            const res = inv.reservation;
            if (res && res.is_bonus_eligible) {
                (res.items || []).forEach((item: any) => {
                    const marketingExpense = item.marketing_amount !== undefined && item.marketing_amount !== null 
                        ? item.marketing_amount 
                        : (item.product?.marketing_expense || 0);
                    totalPromo += (item.quantity * marketingExpense);
                });
            }
        });

        return {
            totalAmount: total,
            paidAmount: paid,
            debtAmount: invoices.reduce((acc: number, inv: any) => acc + Math.max(0, (inv.total_amount || 0) - (inv.paid_amount || 0)), 0),
            creditAmount: invoices.reduce((acc: number, inv: any) => acc + Math.max(0, (inv.paid_amount || 0) - (inv.total_amount || 0)), 0),
            resCount: invoices.length,
            promoAmount: totalPromo,
            tovarSkidkaAmount: 0,
            tovarSkidkaCount: 0,
            overdueAmount: invoices.reduce((sum: number, inv: any) => {
                const d = inv.realization_date || inv.date || inv.created_at;
                if (!d) return sum;
                const diff = new Date().getTime() - new Date(d).getTime();
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                if (days > 30) {
                    const debt = (Number(inv.total_amount) || 0) - (Number(inv.paid_amount) || 0);
                    return sum + Math.max(0, debt);
                }
                return sum;
            }, 0)
        };
    }, [invoices]);

    const columns: any[] = [
        {
            accessorKey: 'id',
            header: 'ID',
        },
        {
            accessorKey: 'medRep',
            header: 'МП',
            cell: ({ row }: any) => {
                const reps = row.original.reservation?.med_org?.assigned_reps || [];
                return reps[0]?.full_name || '—';
            },
        },
        {
            accessorKey: 'factura_number',
            header: 'Номер фактуры',
            cell: ({ row }: any) => row.original.factura_number || `INV-${row.original.id}`,
        },
        {
            id: 'recipient',
            header: 'Получатель',
            cell: ({ row }: any) => row.original.reservation?.med_org?.name || row.original.reservation?.customer_name || '—',
        },
        {
            id: 'region',
            header: 'Регион',
            cell: ({ row }: any) => row.original.reservation?.med_org?.region?.name || '—',
        },
        {
            accessorKey: 'status',
            header: 'Статус',
            cell: ({ row }: any) => {
                if (row.original.is_deletion_pending || row.original.reservation?.is_deletion_pending) return <span className="text-amber-600 font-black">Ожидает удаления</span>;
                if (row.original.reservation?.is_return_pending) return <span className="text-purple-600 font-black">Ожидает возврата</span>;
                const statusMap: any = {
                    pending: 'Ожидает',
                    partial: 'Частично',
                    paid: 'Оплачено',
                    cancelled: 'Отменено',
                };
                return statusMap[row.original.status] || row.original.status;
            },
        },
        {
            id: 'realization_date',
            header: 'Дата реализации',
            cell: ({ row }: any) => {
                const d = row.original.realization_date || row.original.date;
                if (!d) return '—';
                return new Date(d).toLocaleDateString('ru-RU');
            },
        },
        {
            id: 'delay_days',
            header: 'Просрочка',
            cell: ({ row }: any) => {
                const d = row.original.realization_date || row.original.date;
                if (!d) return '—';
                const diff = new Date().getTime() - new Date(d).getTime();
                const days = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
                const isOverdue = days > 30;
                return (
                    <span className={`font-black ${isOverdue ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {days} дн.
                    </span>
                );
            },
        },
        {
            id: 'total_amount',
            header: 'Сумма',
            cell: ({ row }: any) => formatMoney(row.original.total_amount || 0) + ' UZS',
        },
        {
            id: 'paid_amount',
            header: 'Оплачено',
            cell: ({ row }: any) => formatMoney(row.original.paid_amount || 0) + ' UZS',
        },
        {
            id: 'debt_amount',
            header: 'Дебитор',
            cell: ({ row }: any) => <span className="font-black text-rose-600 tracking-tight">{formatMoney((row.original.total_amount || 0) - (row.original.paid_amount || 0))} UZS</span>,
        },
        {
            id: 'actions',
            header: '',
            cell: ({ row }: any) => {
                const handleDownload = async () => {
                    try {
                        const res = row.original.reservation;
                        if (!res) return;
                        const response = await api.get(`/sales/reservations/${res.id}/export`, { responseType: 'blob' });
                        const url = window.URL.createObjectURL(new Blob([response.data]));
                        const link = document.createElement('a');
                        link.href = url;
                        link.setAttribute('download', `invoice_${row.original.id}.xlsx`);
                        document.body.appendChild(link);
                        link.click();
                        link.remove();
                    } catch (error) {
                        console.error('Download failed:', error);
                    }
                };

                return (
                    <Button variant="ghost" size="icon" onClick={handleDownload} title="Скачать фактуру">
                        <Download className="w-4 h-4 text-blue-500" />
                    </Button>
                );
            }
        }
    ];

    return (
        <PageContainer>
            <PageHeader
                title="Дебиторка (Долги)"
                description="Просмотр всех фактур с задолженностью и их общая сумма."
            />

            {/* HIGH-VISIBILITY TOTAL DEBT BANNER */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-[2rem] p-8 text-white shadow-2xl shadow-rose-200 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl group-hover:scale-110 transition-transform duration-700" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                                <TrendingDown className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-xs font-black uppercase tracking-[0.2em] opacity-80 italic">ОБЩАЯ ЗАДОЛЖЕННОСТЬ</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-5xl font-black tracking-tighter tabular-nums drop-shadow-lg">
                                {stats.debtAmount.toLocaleString()}
                            </span>
                            <span className="text-xl font-bold opacity-60">UZS</span>
                        </div>
                        <div className="mt-2 flex flex-col relative z-10">
                             <span className="text-[10px] font-black text-rose-100 uppercase tracking-widest opacity-80">Из них просроченная задолженность:</span>
                            <span className="text-lg font-black text-white tracking-tight drop-shadow-sm">
                                {globalStats ? globalStats.overdue_receivables.toLocaleString() : stats.overdueAmount.toLocaleString()} UZS
                            </span>
                        </div>
                        <div className="mt-6 flex items-center gap-2 text-rose-100/60 text-[10px] font-black uppercase tracking-widest">
                            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                            Основано на {invoices.filter((i: any) => (i.total_amount || 0) > (i.paid_amount || 0)).length} фактурах
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-[2rem] p-8 text-white shadow-2xl shadow-indigo-200 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl group-hover:scale-110 transition-transform duration-700" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                                <Plus className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-xs font-black uppercase tracking-[0.2em] opacity-80 italic">КРЕДИТОРКА</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-5xl font-black tracking-tighter tabular-nums drop-shadow-lg">
                                {stats.creditAmount.toLocaleString()}
                            </span>
                            <span className="text-xl font-bold opacity-60">UZS</span>
                        </div>
                        <div className="mt-6 flex items-center gap-2 text-indigo-100/60 text-[10px] font-black uppercase tracking-widest">
                            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                            Переплаты по {invoices.filter((i: any) => (i.paid_amount || 0) > (i.total_amount || 0)).length} фактурам
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-xl shadow-slate-200/50 relative overflow-hidden group">
                     <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full -mr-32 -mt-32 transition-transform group-hover:scale-110 duration-700" />
                     <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center">
                                <Wallet className="w-6 h-6 text-emerald-600" />
                            </div>
                            <span className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] italic">УЖЕ ОПЛАЧЕНО</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black tracking-tighter text-slate-900 tabular-nums">
                                {stats.paidAmount.toLocaleString()}
                            </span>
                            <span className="text-lg font-bold text-slate-300">UZS</span>
                        </div>
                        <div className="mt-6 flex items-center gap-4">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ВСЕГО ПРОДАЖ</span>
                                <span className="text-sm font-bold text-slate-600">{stats.totalAmount.toLocaleString()} UZS</span>
                            </div>
                        </div>
                     </div>
                </div>
            </div>

            <div className="flex items-center gap-4 mb-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                        type="checkbox" 
                        className="w-5 h-5 rounded border-slate-300 text-rose-600 focus:ring-rose-500 transition-all cursor-pointer"
                        checked={filterValues.onlyOverdue as boolean}
                        onChange={(e) => setFilterValues(prev => ({ ...prev, onlyOverdue: e.target.checked }))}
                    />
                    <span className="text-sm font-black text-slate-700 group-hover:text-rose-600 transition-colors uppercase tracking-tight">Только просроченные ( &gt; 30 дней )</span>
                </label>
            </div>

            <FilterBar 
                values={filterValues}
                onChange={setFilterValues}
                onSearch={() => refetch()}
                onReset={() => {
                    setFilterValues({ 
                        dateStart: '', 
                        dateEnd: '', 
                        selectedMedRep: 'all', 
                        selectedRegion: 'all', 
                        selectedCompany: 'all', 
                        selectedType: 'all', 
                        selectedInvoiceType: 'all', 
                        invNumSearch: '',
                        onlyOverdue: false
                    });
                    refetch();
                }}
            />

            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border overflow-hidden hover-lift transition-all duration-500 min-h-[500px]">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-[500px] text-slate-400">
                        <div className="w-12 h-12 border-4 border-slate-200 border-t-rose-500 rounded-full animate-spin mb-4" />
                        <p className="font-medium animate-pulse">Загрузка данных...</p>
                    </div>
                ) : !invoices || invoices.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[500px] text-center p-12">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-50 text-slate-400 mb-6 shadow-inner">
                            <Landmark className="w-10 h-10" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight">Задолженностей нет</h3>
                        <p className="text-slate-500 mt-3 max-w-sm font-medium">По выбранным фильтрам неоплаченных счетов не найдено.</p>
                    </div>
                ) : (
                    <div className="p-1">
                        <DataTable
                            columns={columns}
                            data={invoices}
                            onRowClick={(row) => setSelectedInvoiceForView(row)}
                            getRowClassName={(row: any) => {
                                if (row.is_deletion_pending || row.reservation?.is_deletion_pending || row.reservation?.is_return_pending) return 'bg-yellow-100/70 hover:bg-yellow-100';
                                
                                const d = row.realization_date || row.date;
                                if (d) {
                                    const diff = new Date().getTime() - new Date(d).getTime();
                                    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                                    if (days > 30) return 'bg-rose-50 hover:bg-rose-100 transition-colors cursor-pointer';
                                }
                                return '';
                            }}
                        />
                    </div>
                )}
            </div>

            <ReservationDetailsModal
                isOpen={!!selectedInvoiceForView}
                onClose={() => setSelectedInvoiceForView(null)}
                reservation={selectedInvoiceForView?.reservation}
            />
        </PageContainer>
    );
}
