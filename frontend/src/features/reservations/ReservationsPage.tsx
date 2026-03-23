import { PageContainer } from '../../components/PageContainer';
import { PageHeader } from '../../components/PageHeader';
import { CalendarCheck } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { DataTable } from '../../components/ui/data-table';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { ReservationModal } from './ReservationModal';
import { useAuthStore } from '../../store/authStore';
import { ModernStatsBar } from '../../components/ui/ModernStatsBar';
import { FilterBar } from '../../components/ui/FilterBar';
import type { FilterValues } from '../../components/ui/FilterBar';
import { ReservationDetailsModal } from './ReservationDetailsModal';

export default function ReservationsPage() {
    const user = useAuthStore((state) => state.user);
    const isMedRep = user?.role === 'med_rep';
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedReservationForView, setSelectedReservationForView] = useState<any | null>(null);

    const [filterValues, setFilterValues] = useState<FilterValues>({
        dateStart: '',
        dateEnd: '',
        selectedMedRep: 'all',
        selectedCompany: 'all',
        selectedType: 'all',
        selectedInvoiceType: 'all',
        invNumSearch: '',
    });

    const { data: reservations = [], isLoading, refetch } = useQuery({
        queryKey: ['reservations', filterValues],
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
            params.status = 'pending';

            const response = await api.get('/sales/reservations/', { params });
            const data = Array.isArray(response.data) ? response.data : (response.data?.items || response.data || []);
            return data;
        }
    });

    const stats = useMemo(() => {
        // Obshaya summa broni - summary of all reservations
        const totalAmount = reservations.reduce((acc: number, r: any) => acc + (r.total_amount || 0), 0);
        
        const tovarSkidka = reservations.filter((r: any) => r.is_tovar_skidka);
        const tovarSkidkaAmount = tovarSkidka.reduce((acc: number, r: any) => acc + (r.total_amount || 0), 0);
        const tovarSkidkaCount = tovarSkidka.length;

        let totalPromo = 0;
        reservations.forEach((res: any) => {
            if (res.is_bonus_eligible) {
                (res.items || []).forEach((item: any) => {
                    const marketingExpense = item.marketing_amount !== undefined && item.marketing_amount !== null 
                        ? item.marketing_amount 
                        : (item.product?.marketing_expense || 0);
                    totalPromo += (item.quantity * marketingExpense);
                });
            }
        });

        return {
            totalAmount: totalAmount,
            paidAmount: 0,
            debtAmount: 0,
            resCount: reservations.length,
            promoAmount: totalPromo,
            tovarSkidkaAmount,
            tovarSkidkaCount
        };
    }, [reservations]);

    const columns: any[] = [
        {
            accessorKey: 'id',
            header: 'ID',
        },
        {
            id: 'type',
            header: 'Тип',
            cell: ({ row }: any) => row.original.med_org_id ? 'Складской отпуск' : 'Свободная продажа',
        },
        {
            id: 'recipient',
            header: 'Получатель',
            cell: ({ row }: any) => row.original.med_org?.name || row.original.doctor?.full_name || row.original.customer_name || 'Не указан',
        },
        {
            id: 'created_by',
            header: 'Создал',
            cell: ({ row }: any) => row.original.created_by?.full_name || row.original.created_by?.username || 'Система',
        },
        {
            accessorKey: 'status',
            header: 'Статус',
            cell: ({ row }: any) => {
                const statusMap: any = {
                    pending: 'Ожидает',
                    approved: 'Подтверждено',
                    confirmed: 'Подтверждено',
                    cancelled: 'Отменено',
                    paid: 'Оплачено',
                    partial: 'Частично'
                };
                return statusMap[row.original.status] || row.original.status;
            },
        },
        {
            id: 'date',
            header: 'Дата создания',
            cell: ({ row }: any) => {
                const d = row.original.date || row.original.created_at;
                if (!d) return '—';
                return new Date(d).toLocaleDateString('ru-RU', {
                    year: 'numeric', month: 'long', day: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                });
            },
        },
        {
            id: 'total',
            header: 'Сумма',
            cell: ({ row }: any) => (row.original.total_amount || 0).toLocaleString() + ' UZS',
        },
    ];

    if (!isMedRep) {
        columns.push({
            id: 'actions',
            header: '',
            cell: ({ row }: any) => {
                const isPending = row.original.status === 'pending';
                if (!isPending) return null;

                const handleCancel = async () => {
                    if (!confirm('Вы уверены, что хотите отменить эту бронь? Освобожденный товар вернется на склад.')) return;
                    try {
                        await api.delete(`/sales/reservations/${row.original.id}`);
                        refetch();
                    } catch (error) {
                        console.error('Failed to cancel reservation:', error);
                        alert('Ошибка при отмене брони.');
                    }
                };

                return (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={handleCancel}
                    >
                        Отменить
                    </Button>
                );
            }
        });
    }

    return (
        <PageContainer>
            <PageHeader
                title="Журнал продаж и удержаний"
                description="Отслеживание заявок на бронь, ожидающих одобрения, инвойсов и удержания запасов."
                buttonLabel="Оформить заказ"
                onButtonClick={() => setIsModalOpen(true)}
            />

            <ModernStatsBar 
                stats={stats}
                promoAmount={stats.promoAmount}
                countLabel="Всего заявок"
                totalLabel="Общая сумма брони"
                showFinancials={false}
            />

            <FilterBar 
                values={filterValues}
                onChange={setFilterValues}
                onSearch={() => refetch()}
            />

            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border overflow-hidden hover-lift transition-all duration-500 min-h-[500px]">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-[500px] text-slate-400">
                        <div className="w-12 h-12 border-4 border-slate-200 border-t-orange-500 rounded-full animate-spin mb-4" />
                        <p className="font-medium animate-pulse">Синхронизация с БД...</p>
                    </div>
                ) : !reservations || reservations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[500px] text-center p-12">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-orange-50 text-orange-500 mb-6 shadow-inner">
                            <CalendarCheck className="w-10 h-10" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight">Нет активных броней</h3>
                        <p className="text-slate-500 mt-3 max-w-sm font-medium">Блокировка запасов в реальном времени и очереди резервирования инициализируются для востребованных продуктов.</p>
                        <Button
                            onClick={() => setIsModalOpen(true)}
                            className="mt-8 bg-orange-50 text-orange-600 hover:bg-orange-100 font-bold px-8 h-12 rounded-xl transition-all"
                        >
                            Создать первую бронь
                        </Button>
                    </div>
                ) : (
                    <div className="p-1">
                        <DataTable
                            columns={columns}
                            data={reservations}
                            searchColumn="recipient"
                            onRowClick={(row) => setSelectedReservationForView(row)}
                        />
                    </div>
                )}
            </div>

            <ReservationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={() => refetch()}
            />

            <ReservationDetailsModal
                isOpen={!!selectedReservationForView}
                onClose={() => setSelectedReservationForView(null)}
                reservation={selectedReservationForView}
            />
        </PageContainer>
    );
}
