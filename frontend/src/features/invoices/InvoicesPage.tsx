import { PageContainer } from '../../components/PageContainer';
import { PageHeader } from '../../components/PageHeader';
import { FileText, Download } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { DataTable } from '../../components/ui/data-table';
import { Button } from '../../components/ui/button';
import { useAuthStore } from '../../store/authStore';
import { useMemo } from 'react';
import { ModernStatsBar } from '../../components/ui/ModernStatsBar';
import { useState } from 'react';
import { FilterBar } from '../../components/ui/FilterBar';
import type { FilterValues } from '../../components/ui/FilterBar';
import { ReservationDetailsModal } from '../reservations/ReservationDetailsModal';

export default function InvoicesPage() {
    const user = useAuthStore((state) => state.user);
    const isMedRep = user?.role === 'med_rep';

    const [filterValues, setFilterValues] = useState<FilterValues>({
        dateStart: '',
        dateEnd: '',
        selectedMedRep: 'all',
        selectedCompany: 'all',
        selectedType: 'all',
        selectedInvoiceType: 'all',
        invNumSearch: '',
    });

    const [selectedInvoiceForView, setSelectedInvoiceForView] = useState<any | null>(null);

    const { data: invoices = [], isLoading, refetch } = useQuery({
        queryKey: ['invoices', filterValues],
        queryFn: async () => {
            const params: any = {};
            if (filterValues.dateStart) params.date_from = filterValues.dateStart;
            if (filterValues.dateEnd) params.date_to = filterValues.dateEnd;
            if (filterValues.selectedMedRep !== 'all') params.med_rep_name = filterValues.selectedMedRep;
            if (filterValues.selectedCompany !== 'all') params.med_org_name = filterValues.selectedCompany;
            if (filterValues.selectedType !== 'all') params.med_org_type = filterValues.selectedType;
            if (filterValues.selectedInvoiceType !== 'all') {
                params.is_tovar_skidka = filterValues.selectedInvoiceType === 'tovar_skidka';
            }
            if (filterValues.invNumSearch) params.inv_num = filterValues.invNumSearch;

            const response = await api.get('/sales/invoices/', { params });
            return Array.isArray(response.data) ? response.data : (response.data?.items || response.data || []);
        }
    });

    const stats = useMemo(() => {
        const total = invoices.reduce((acc: number, inv: any) => acc + (inv.total_amount || 0), 0);
        const paid = invoices.reduce((acc: number, inv: any) => acc + (inv.paid_amount || 0), 0);
        
        const tovarSkidka = invoices.filter((r: any) => r.reservation?.is_tovar_skidka);
        const tovarSkidkaAmount = tovarSkidka.reduce((acc: number, r: any) => acc + (r.total_amount || 0), 0);
        const tovarSkidkaCount = tovarSkidka.length;

        // Calculate promo from associated reservations
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
            debtAmount: total - paid,
            resCount: invoices.length,
            promoAmount: totalPromo,
            tovarSkidkaAmount,
            tovarSkidkaCount
        };
    }, [invoices]);

    const columns: any[] = [
        {
            accessorKey: 'id',
            header: 'ID',
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
            accessorKey: 'status',
            header: 'Статус',
            cell: ({ row }: any) => {
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
            id: 'total_amount',
            header: 'Сумма',
            cell: ({ row }: any) => (row.original.total_amount || 0).toLocaleString() + ' UZS',
        },
        {
            id: 'paid_amount',
            header: 'Оплачено',
            cell: ({ row }: any) => (row.original.paid_amount || 0).toLocaleString() + ' UZS',
        },
        {
            id: 'actions',
            header: '',
            cell: ({ row }: any) => {
                const handleDownload = async () => {
                    try {
                        const res = row.original.reservation;
                        if (!res) return;
                        
                        const orgName = (res.med_org?.name || res.customer_name) || 'invoice';
                        const orgInn = res.med_org?.inn || 'inn';
                        const dateStr = new Date().toLocaleDateString('ru-RU');
                        const filename = `${orgName}_${orgInn}_${dateStr}.xlsx`;

                        const response = await api.get(`/sales/reservations/${res.id}/export`, {
                            responseType: 'blob'
                        });
                        const url = window.URL.createObjectURL(new Blob([response.data]));
                        const link = document.createElement('a');
                        link.href = url;
                        link.setAttribute('download', filename);
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
                title="Фактура"
                description="Просмотр записей «Счетов-фактур», цифровых подписей и статуса соответствия налоговым требованиям."
                buttonLabel={isMedRep ? undefined : "Создать фактуру"}
            />

            <ModernStatsBar 
                stats={stats}
                promoAmount={stats.promoAmount}
                countLabel="Всего фактур"
            />

            <FilterBar 
                values={filterValues}
                onChange={setFilterValues}
                onSearch={() => refetch()}
            />

            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border overflow-hidden hover-lift transition-all duration-500 min-h-[500px]">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-[500px] text-slate-400">
                        <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin mb-4" />
                        <p className="font-medium animate-pulse">Загрузка данных...</p>
                    </div>
                ) : !invoices || invoices.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[500px] text-center p-12">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-50 text-slate-400 mb-6 shadow-inner">
                            <FileText className="w-10 h-10" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight">Нет фактур</h3>
                        <p className="text-slate-500 mt-3 max-w-sm font-medium">Финансовые документы появятся здесь после подтверждения броней.</p>
                    </div>
                ) : (
                    <div className="p-1">
                        <DataTable
                            columns={columns}
                            data={invoices}
                            searchColumn="recipient"
                            onRowClick={(row) => setSelectedInvoiceForView(row)}
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
