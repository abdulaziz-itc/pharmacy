import { PageContainer } from '../../components/PageContainer';
import { PageHeader } from '../../components/PageHeader';
import { DataTable } from '../../components/ui/data-table';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { formatMoney } from '../../components/ui/MoneyInput';
import { FileText, TrendingUp, Filter } from 'lucide-react';
import { useState, useMemo } from 'react';

export default function KreditorkaPage() {
    const [search, setSearch] = useState('');

    const { data: invoices = [], isLoading } = useQuery({
        queryKey: ['kreditorka-invoices'],
        queryFn: async () => {
            // Fetch invoices with debt/credit info
            // In DebtorsPage we saw that fetching all invoices and filtering on frontend is common
            // Or we can use the new balance endpoint
            const response = await api.get('/sales/invoices/', {
                params: { limit: 1000 }
            });
            const all = Array.isArray(response.data) ? response.data : (response.data?.items || []);
            // Filter only overpaid ones
            return all.filter((inv: any) => inv.paid_amount > inv.total_amount);
        }
    });

    const filteredInvoices = useMemo(() => {
        if (!search) return invoices;
        const lowSearch = search.toLowerCase();
        return invoices.filter((inv: any) => {
            const orgName = inv.reservation?.med_org?.name?.toLowerCase() || '';
            const invNum = inv.factura_number?.toLowerCase() || '';
            return orgName.includes(lowSearch) || invNum.includes(lowSearch);
        });
    }, [invoices, search]);

    const stats = useMemo(() => {
        const totalOverpaid = invoices.reduce((acc: number, inv: any) => acc + (inv.paid_amount - inv.total_amount), 0);
        return {
            totalOverpaid,
            count: invoices.length
        };
    }, [invoices]);

    const columns: any[] = [
        {
            accessorKey: 'factura_number',
            header: 'Номер фактуры',
            cell: ({ row }: any) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500">
                        <FileText className="w-4 h-4" />
                    </div>
                    <span className="font-bold">{row.original.factura_number || `INV-${row.original.id}`}</span>
                </div>
            )
        },
        {
            id: 'organization',
            header: 'Организация',
            cell: ({ row }: any) => row.original.reservation?.med_org?.name || '—'
        },
        {
            id: 'realization_date',
            header: 'Дата реализации',
            cell: ({ row }: any) => {
                const d = row.original.realization_date || row.original.date;
                return d ? new Date(d).toLocaleDateString('ru-RU') : '—';
            }
        },
        {
            accessorKey: 'total_amount',
            header: 'Сумма счета',
            cell: ({ row }: any) => formatMoney(row.original.total_amount) + ' UZS'
        },
        {
            accessorKey: 'paid_amount',
            header: 'Оплачено',
            cell: ({ row }: any) => formatMoney(row.original.paid_amount) + ' UZS'
        },
        {
            id: 'excess',
            header: 'Переплата (Кредиторка)',
            cell: ({ row }: any) => (
                <span className="text-indigo-600 font-black">
                    +{formatMoney(row.original.paid_amount - row.original.total_amount)}
                </span>
            )
        }
    ];

    return (
        <PageContainer>
            <PageHeader 
                title="Кредиторка"
                description="Реестр счетов-фактур с избыточной оплатой. Эти средства доступны для зачета в будущие заказы."
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-6 text-white shadow-xl shadow-indigo-200">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded-full">Всего переплат</span>
                    </div>
                    <h3 className="text-3xl font-black mb-1">{formatMoney(stats.totalOverpaid)} UZS</h3>
                    <p className="text-sm font-medium opacity-80">Общая сумма избыточных средств</p>
                </div>

                <div className="bg-white rounded-3xl p-6 border shadow-sm flex flex-col justify-center">
                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">Количество фактур</p>
                    <p className="text-3xl font-black text-slate-800">{stats.count}</p>
                    <p className="text-sm text-slate-500 mt-1">Документов с сальдо в пользу клиента</p>
                </div>

                <div className="bg-white rounded-3xl p-6 border shadow-sm flex flex-col justify-center relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                        <Filter className="w-16 h-16" />
                    </div>
                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-2">Быстрый поиск</p>
                    <input 
                        type="text"
                        placeholder="Название или номер..."
                        className="w-full bg-slate-50 border-slate-100 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border overflow-hidden">
                <DataTable 
                    columns={columns}
                    data={filteredInvoices}
                    isLoading={isLoading}
                />
            </div>
        </PageContainer>
    );
}
