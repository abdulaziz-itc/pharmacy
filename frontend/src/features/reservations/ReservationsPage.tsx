import { PageContainer } from '../../components/PageContainer';
import { PageHeader } from '../../components/PageHeader';
import { CalendarCheck } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { DataTable } from '../../components/ui/data-table';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { ReservationModal } from './ReservationModal';

export default function ReservationsPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const { data: reservations, isLoading, refetch } = useQuery({
        queryKey: ['reservations'],
        queryFn: async () => {
            const response = await api.get('/sales/reservations/');
            return response.data;
        }
    });

    const columns = [
        { header: 'ID', accessor: 'id' },
        {
            header: 'Тип',
            accessor: (row: any) => row.med_org_id ? 'Складской отпуск' : 'Свободная продажа'
        },
        {
            header: 'Получатель',
            accessor: (row: any) => row.med_org?.name || row.doctor?.full_name || 'Не указан'
        },
        {
            header: 'Создал',
            accessor: (row: any) => row.med_rep?.username || 'Система'
        },
        {
            header: 'Статус',
            accessor: (row: any) => {
                const statusMap: any = {
                    pending: "Ожидает",
                    confirmed: "Подтверждено",
                    cancelled: "Отменено"
                };
                return statusMap[row.status] || row.status;
            }
        },
        {
            header: 'Дата создания',
            accessor: (row: any) => new Date(row.created_at).toLocaleDateString('ru-RU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
        }
    ];
    return (
        <PageContainer>
            <PageHeader
                title="Журнал продаж и удержаний"
                description="Отслеживание заявок на бронь, ожидающих одобрения, инвойсов и удержания запасов."
                buttonLabel="Оформить заказ"
                onButtonClick={() => setIsModalOpen(true)}
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
                            searchColumn="id"
                        />
                    </div>
                )}
            </div>

            <ReservationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={() => refetch()}
            />
        </PageContainer>
    );
}
