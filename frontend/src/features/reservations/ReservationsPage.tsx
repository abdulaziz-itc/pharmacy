import { PageContainer } from '../../components/PageContainer';
import { PageHeader } from '../../components/PageHeader';
import { CalendarCheck, AlertTriangle, Receipt, DollarSign, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { DataTable } from '../../components/ui/data-table';
import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { ReservationModal } from './ReservationModal';
import { useAuthStore } from '../../store/authStore';
import { ModernStatsBar } from '../../components/ui/ModernStatsBar';
import { FilterBar } from '../../components/ui/FilterBar';
import type { FilterValues } from '../../components/ui/FilterBar';
import { ReservationDetailsModal } from './ReservationDetailsModal';
import { useSearchParams } from 'react-router-dom';

export default function ReservationsPage() {
    const [searchParams] = useSearchParams();
    const user = useAuthStore((state) => state.user);
    const isMedRep = user?.role === 'med_rep';
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedReservationForView, setSelectedReservationForView] = useState<any | null>(null);
    const isAdmin = user?.role && ['admin', 'director', 'head_of_orders'].includes(user.role.toLowerCase());

    // --- Repair #427 logic ---
    const [showRepairModal, setShowRepairModal] = useState(false);
    const [repairResults, setRepairResults] = useState<any>(null);
    const [repairLoading, setRepairLoading] = useState(false);

    const runDiagnostic = async (shouldRepair = false) => {
        setRepairLoading(true);
        try {
            const res = await api.get('/finance/research-tx-427', {
                params: {
                    secret_key: 'AG_RESEARCH_ACCESS_2026',
                    repair: shouldRepair
                }
            });
            setRepairResults(res.data);
            if (shouldRepair && res.data.status === 'REPAIRED') {
                alert(res.data.message);
                refetch();
            }
        } catch (error: any) {
            alert(error.response?.data?.detail || "Diagnostic error");
        } finally {
            setRepairLoading(false);
        }
    };

    const [filterValues, setFilterValues] = useState<FilterValues>({
        dateStart: '',
        dateEnd: '',
        selectedMedRep: 'all',
        selectedRegion: 'all',
        selectedCompany: 'all',
        selectedType: 'all',
        selectedInvoiceType: 'all',
        invNumSearch: searchParams.get('inv_num') || '',
    });

    useEffect(() => {
        const invNum = searchParams.get('inv_num');
        if (invNum) {
            setFilterValues(prev => ({ ...prev, invNumSearch: invNum }));
        }
    }, [searchParams]);

    const { data: reservations = [], isLoading, refetch } = useQuery({
        queryKey: ['reservations', filterValues],
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
            creditAmount: 0,
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
                if (row.original.is_deletion_pending) return <span className="text-amber-600 font-black">Ожидает удаления</span>;
                if (row.original.is_return_pending) return <span className="text-purple-600 font-black">Ожидает возврата</span>;
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
                const isPending = row.original.status === 'pending' || row.original.is_deletion_pending;
                if (row.original.is_deletion_pending) return <span className="text-[10px] text-amber-500 font-bold">Удаление запрошено</span>;
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
                onReset={() => {
                    setFilterValues({ dateStart: '', dateEnd: '', selectedMedRep: 'all', selectedRegion: 'all', selectedCompany: 'all', selectedType: 'all', selectedInvoiceType: 'all', invNumSearch: '' });
                    refetch();
                }}
            />

            {isAdmin && (
                <div className="mb-6 flex justify-end">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-10 gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 shadow-sm rounded-xl"
                        onClick={() => {
                            setShowRepairModal(true);
                            runDiagnostic(false);
                        }}
                    >
                        <AlertTriangle className="w-4 h-4" />
                        <span>Tozalash #427</span>
                    </Button>
                </div>
            )}

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
                            onRowClick={(row) => setSelectedReservationForView(row)}
                            getRowClassName={(row: any) => row.is_deletion_pending || row.is_return_pending ? 'bg-yellow-100/70 hover:bg-yellow-100' : ''}
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

            {/* Repair #427 Modal */}
            <Dialog open={showRepairModal} onOpenChange={setShowRepairModal}>
                <DialogContent className="max-w-2xl border-0 shadow-2xl overflow-hidden p-0 bg-slate-50/95 backdrop-blur-xl">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500" />
                    
                    <DialogHeader className="p-8 pb-4">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center">
                                <AlertTriangle className="w-6 h-6 text-red-600" />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-bold text-slate-900">#427 Balans tozalash</DialogTitle>
                                <DialogDescription className="text-slate-500">
                                    O'chirilgan tranzaksiyadan qolgan "yetim" to'lovlarni tozalash vositasi.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="p-8 pt-0 space-y-6">
                        {repairLoading ? (
                            <div className="py-12 flex flex-col items-center justify-center gap-4">
                                <RefreshCw className="w-10 h-10 text-red-500 animate-spin" />
                                <p className="text-slate-500 animate-pulse">Ma'lumotlar tekshirilmoqda...</p>
                            </div>
                        ) : repairResults ? (
                            <div className="space-y-4">
                                <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3">
                                    <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                                        <Receipt className="w-4 h-4 text-blue-500" />
                                        Topilgan "yetim" to'lovlar
                                    </h4>
                                    <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                                        {repairResults.found_orphaned_payments?.length > 0 ? (
                                            repairResults.found_orphaned_payments.map((p: any) => (
                                                <div key={p.id} className="flex justify-between items-center p-2 rounded-lg bg-slate-50 text-sm border border-slate-100">
                                                    <span className="font-mono text-slate-500">ID: {p.id} (Faktura: #{p.invoice_id})</span>
                                                    <span className="font-bold text-red-600">-{p.amount.toLocaleString()} UZS</span>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-sm text-slate-400 italic">To'lovlar topilmadi.</p>
                                        )}
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3">
                                    <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                                        <DollarSign className="w-4 h-4 text-emerald-500" />
                                        Topilgan "yetim" bonuslar
                                    </h4>
                                    <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                                        {repairResults.found_orphaned_bonuses?.length > 0 ? (
                                            repairResults.found_orphaned_bonuses.map((b: any) => (
                                                <div key={b.id} className="p-2 rounded-lg bg-slate-50 text-sm border border-slate-100">
                                                    <div className="flex justify-between">
                                                        <span className="font-mono text-slate-500">ID: {b.id}</span>
                                                        <span className="font-bold text-red-600">-{b.amount.toLocaleString()} UZS</span>
                                                    </div>
                                                    {b.notes && <p className="text-xs text-slate-400 mt-1">{b.notes}</p>}
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-sm text-slate-400 italic">Bonuslar topilmadi.</p>
                                        )}
                                    </div>
                                </div>

                                {repairResults.status === "REPAIRED" ? (
                                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm font-medium animate-in fade-in slide-in-from-top-1">
                                        ✅ Muvaffaqiyatli tozalandi! Balanslar qayta hisoblandi.
                                    </div>
                                ) : (
                                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 text-amber-700 text-xs flex gap-3">
                                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                        <p>
                                            Diqqat! "Tozalashni boshlash" tugmasini bossangiz, yuqoridagi to'lovlar o'chiriladi va faktura qarzdorligi mos ravishda ko'payadi.
                                        </p>
                                    </div>
                                )}
                            </div>
                        ) : null}
                    </div>

                    <DialogFooter className="p-6 bg-white border-t border-slate-100 gap-3">
                        <Button variant="ghost" className="rounded-xl h-12 px-6" onClick={() => setShowRepairModal(false)}>
                            Yopish
                        </Button>
                        {!repairResults?.deleted_payments?.length && repairResults?.found_orphaned_payments?.length > 0 && (
                            <Button 
                                className="rounded-xl h-12 px-8 bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200 text-white"
                                onClick={() => runDiagnostic(true)}
                                disabled={repairLoading}
                            >
                                {repairLoading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                                Tozalashni boshlash
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </PageContainer>
    );
}
