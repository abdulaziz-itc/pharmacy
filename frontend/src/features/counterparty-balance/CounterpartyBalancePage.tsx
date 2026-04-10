import { useState } from 'react';
import { PageContainer } from '../../components/PageContainer';
import { PageHeader } from '../../components/PageHeader';
import { DataTable } from '../../components/ui/data-table';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { formatMoney } from '../../components/ui/MoneyInput';
import { Search, History, Banknote, Landmark } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { TopUpModal } from './TopUpModal';
import { OrganizationFinancialCard } from './OrganizationFinancialCard';

export default function CounterpartyBalancePage() {
    const [search, setSearch] = useState('');
    const [selectedOrgForTopUp, setSelectedOrgForTopUp] = useState<any | null>(null);
    const [selectedOrgForHistory, setSelectedOrgForHistory] = useState<any | null>(null);

    const { data: balances = [], isLoading, refetch } = useQuery({
        queryKey: ['counterparty-balances', search],
        queryFn: async () => {
            const response = await api.get('/sales/organizations/balances', {
                params: { search }
            });
            return response.data;
        }
    });

    const columns: any[] = [
        {
            accessorKey: 'name',
            header: 'Организация',
            cell: ({ row }: any) => (
                <div className="flex flex-col">
                    <span className="font-bold text-slate-800">{row.original.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">ИНН: {row.original.inn || '—'}</span>
                </div>
            )
        },
        {
            accessorKey: 'region',
            header: 'Регион',
        },
        {
            accessorKey: 'current_debt',
            header: 'Дебиторка (Долг)',
            cell: ({ row }: any) => (
                <span className={row.original.current_debt > 0 ? "text-rose-600 font-black" : "text-slate-400"}>
                    {formatMoney(row.original.current_debt)} UZS
                </span>
            )
        },
        {
            accessorKey: 'current_surplus',
            header: 'Кредиторка (Аванс)',
            cell: ({ row }: any) => (
                <span className={row.original.current_surplus > 0 ? "text-indigo-600 font-black" : "text-slate-400"}>
                    {formatMoney(row.original.current_surplus)} UZS
                </span>
            )
        },
        {
            accessorKey: 'total_balance',
            header: 'Общий баланс',
            cell: ({ row }: any) => {
                const isPositive = row.original.total_balance > 0;
                const isNegative = row.original.total_balance < 0;
                return (
                    <div className={`inline-flex items-center px-3 py-1 rounded-full font-black text-xs ${
                        isPositive ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                        isNegative ? "bg-rose-50 text-rose-600 border border-rose-100" :
                        "bg-slate-50 text-slate-400 border border-slate-100"
                    }`}>
                        {formatMoney(row.original.total_balance)} UZS
                    </div>
                );
            }
        },
        {
            id: 'actions',
            header: 'Действия',
            cell: ({ row }: any) => (
                <div className="flex items-center gap-2">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => setSelectedOrgForHistory(row.original)}
                    >
                        <History className="w-4 h-4 mr-1" />
                        История
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                        onClick={() => setSelectedOrgForTopUp(row.original)}
                    >
                        <Banknote className="w-4 h-4 mr-1" />
                        Пополнение
                    </Button>
                </div>
            )
        }
    ];

    return (
        <PageContainer>
            <PageHeader 
                title="Баланс контрагентов"
                description="Финансовый контроль взаиморасчетов: дебиторская задолженность, авансовые платежи и история транзакций."
            />

            <div className="mb-6 flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text"
                        placeholder="Поиск по названию или ИНН..."
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Всего организаций</span>
                        <span className="text-xl font-black text-slate-800">{balances.length}</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
                        <Landmark className="w-5 h-5" />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border overflow-hidden">
                <DataTable 
                    columns={columns}
                    data={balances}
                    isLoading={isLoading}
                    onRowClick={(row) => setSelectedOrgForHistory(row)}
                />
            </div>

            <TopUpModal 
                isOpen={!!selectedOrgForTopUp}
                onClose={() => setSelectedOrgForTopUp(null)}
                organization={selectedOrgForTopUp}
                onSuccess={() => refetch()}
            />

            {selectedOrgForHistory && (
                <OrganizationFinancialCard 
                    isOpen={!!selectedOrgForHistory}
                    onClose={() => setSelectedOrgForHistory(null)}
                    organizationId={selectedOrgForHistory.id}
                    organizationName={selectedOrgForHistory.name}
                    currentBalance={selectedOrgForHistory.total_balance}
                />
            )}
        </PageContainer>
    );
}
