import { PageContainer } from '../../components/PageContainer';
import { PageHeader } from '../../components/PageHeader';
import { Wallet, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { DataTable } from '../../components/ui/data-table';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { PaymentModal } from './PaymentModal';

export default function PaymentsPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Fetch invoices as they are the primary entities payments are mapped against
    const { data: invoices, isLoading, refetch } = useQuery({
        queryKey: ['invoices'],
        queryFn: async () => {
            const response = await api.get('/domain/payments/invoices/');
            return response.data;
        }
    });

    const columns = [
        { header: 'ID Инвойса', accessor: 'id' },
        {
            header: 'Организация',
            accessor: (row: any) => row.med_org?.name || 'Свободная продажа'
        },
        {
            header: 'Сумма Позиций',
            accessor: (row: any) => `${row.total_amount_due.toLocaleString()} сум`
        },
        {
            header: 'Статус Оплаты',
            accessor: (row: any) => {
                const statusMap: any = {
                    unpaid: <span className="text-red-600 font-bold bg-red-50 px-2 py-1 rounded-md">Неоплачен</span>,
                    partial: <span className="text-orange-600 font-bold bg-orange-50 px-2 py-1 rounded-md">Частично</span>,
                    paid: <span className="text-green-600 font-bold bg-green-50 px-2 py-1 rounded-md flex items-center gap-1 w-fit"><CheckCircle2 className="w-3 h-3" /> Оплачен</span>
                };
                return statusMap[row.status] || row.status;
            }
        },
        {
            header: 'Дата создания',
            accessor: (row: any) => new Date(row.created_at).toLocaleDateString('ru-RU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
        }
    ];

    return (
        <PageContainer>
            <PageHeader
                title="Журнал задолженностей и оплат"
                description="Управление финансовыми потоками, инвойсами и проводка поступлений («postupleniya»)."
                buttonLabel="Принять оплату"
                onButtonClick={() => setIsModalOpen(true)}
            />

            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border overflow-hidden hover-lift transition-all duration-500 min-h-[500px]">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-[500px] text-slate-400">
                        <div className="w-12 h-12 border-4 border-slate-200 border-t-green-500 rounded-full animate-spin mb-4" />
                        <p className="font-medium animate-pulse">Синхронизация финансов...</p>
                    </div>
                ) : !invoices || invoices.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[500px] text-center p-12">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-50 text-green-500 mb-6 shadow-inner">
                            <Wallet className="w-10 h-10" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight">Нет доступных инвойсов</h3>
                        <p className="text-slate-500 mt-3 max-w-sm font-medium">Для проводки поступлений необходимо сначала создать бронь (Reservation).</p>
                    </div>
                ) : (
                    <div className="p-1">
                        <DataTable
                            columns={columns}
                            data={invoices}
                            searchColumn="id"
                        />
                    </div>
                )}
            </div>

            <PaymentModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                availableInvoices={invoices?.filter((i: any) => i.status !== 'paid') || []}
                onSuccess={() => refetch()}
            />
        </PageContainer>
    );
}
