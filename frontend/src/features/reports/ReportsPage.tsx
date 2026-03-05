import React from 'react';
import { PageContainer } from '../../components/PageContainer';
import { Button } from '../../components/ui/button';
import {
    Download,
    Calendar,
    BarChart3,
    TrendingUp,
    Users,
    Wallet,
    ArrowUpRight,
    Search
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import {
    format,
    startOfDay,
    endOfDay,
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    startOfQuarter,
    endOfQuarter,
    startOfYear,
    endOfYear
} from 'date-fns';
import { ru } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { DataTable } from '../../components/ui/data-table';
import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '../../components/ui/badge';

type ReportItem = {
    doctor_id: number;
    doctor_name: string;
    plan_quantity: number;
    plan_amount: number;
    fact_quantity: number;
    fact_amount: number;
    earned_bonus: number;
    predinvest_given: number;
    predinvest_paid_off: number;
};

type ReportsResponse = {
    period: string;
    start_date: string;
    end_date: string;
    data: ReportItem[];
};

export default function ReportsPage() {
    const [period, setPeriod] = React.useState<'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'>('monthly');
    const [searchQuery, setSearchQuery] = React.useState('');

    const dateRange = React.useMemo(() => {
        const now = new Date();
        switch (period) {
            case 'daily': return { start: startOfDay(now), end: endOfDay(now) };
            case 'weekly': return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
            case 'monthly': return { start: startOfMonth(now), end: endOfMonth(now) };
            case 'quarterly': return { start: startOfQuarter(now), end: endOfQuarter(now) };
            case 'yearly': return { start: startOfYear(now), end: endOfYear(now) };
            default: return { start: startOfMonth(now), end: endOfMonth(now) };
        }
    }, [period]);

    const { data, isLoading } = useQuery<ReportsResponse>({
        queryKey: ['reports', period, dateRange],
        queryFn: async () => {
            const response = await api.get('/domain/analytics/reports', {
                params: {
                    start_date: format(dateRange.start, 'yyyy-MM-dd'),
                    end_date: format(dateRange.end, 'yyyy-MM-dd'),
                    period: period
                }
            });
            return response.data;
        }
    });

    const exportToExcel = () => {
        if (!data?.data) return;

        const worksheet = XLSX.utils.json_to_sheet(data.data.map(item => ({
            'Врач': item.doctor_name,
            'План (кол-во)': item.plan_quantity,
            'План (сумма)': item.plan_amount,
            'Факт (кол-во)': item.fact_quantity,
            'Факт (сумма)': item.fact_amount,
            'Выполнение (%)': item.plan_amount > 0 ? ((item.fact_amount / item.plan_amount) * 100).toFixed(1) + '%' : '0%',
            'Бонусы': item.earned_bonus,
            'Прединвест (выдано)': item.predinvest_given,
            'Преdinvest (погашено)': item.predinvest_paid_off
        })));

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Отчет");
        XLSX.writeFile(workbook, `Report_${period}_${format(new Date(), 'yyyyMMdd')}.xlsx`);
    };

    const columns: ColumnDef<ReportItem>[] = [
        {
            accessorKey: 'doctor_name',
            header: 'Врач',
            cell: ({ row }) => <span className="font-semibold text-slate-900">{row.original.doctor_name}</span>
        },
        {
            accessorKey: 'plan_amount',
            header: 'План/Факт (сум)',
            cell: ({ row }) => {
                const plan = row.original.plan_amount ?? 0;
                const fact = row.original.fact_amount ?? 0;
                const percent = plan > 0 ? (fact / plan) * 100 : 0;
                return (
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                            <span className="text-slate-400">П: {plan.toLocaleString()}</span>
                            <span className="text-blue-600">Ф: {fact.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full ${percent >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                                style={{ width: `${Math.min(percent, 100)}%` }}
                            />
                        </div>
                    </div>
                );
            }
        },
        {
            accessorKey: 'earned_bonus',
            header: 'Бонусы',
            cell: ({ row }) => (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    {(row.original.earned_bonus ?? 0).toLocaleString()}
                </Badge>
            )
        },
        {
            accessorKey: 'predinvest_given',
            header: 'Прединвест',
            cell: ({ row }) => (
                <div className="text-xs">
                    <div className="text-red-500 font-bold">-{(row.original.predinvest_given ?? 0).toLocaleString()}</div>
                    <div className="text-green-600 font-bold">+{(row.original.predinvest_paid_off ?? 0).toLocaleString()}</div>
                </div>
            )
        }
    ];

    const stats = React.useMemo(() => {
        if (!data?.data) return { totalPlan: 0, totalFact: 0, totalBonus: 0, totalPredinvest: 0 };
        return data.data.reduce((acc, curr) => ({
            totalPlan: acc.totalPlan + curr.plan_amount,
            totalFact: acc.totalFact + curr.fact_amount,
            totalBonus: acc.totalBonus + curr.earned_bonus,
            totalPredinvest: acc.totalPredinvest + curr.predinvest_given
        }), { totalPlan: 0, totalFact: 0, totalBonus: 0, totalPredinvest: 0 });
    }, [data]);

    const filteredData = React.useMemo(() => {
        if (!data?.data) return [];
        return data.data.filter(item =>
            item.doctor_name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [data, searchQuery]);

    return (
        <PageContainer>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                        Расширенные отчеты
                        <Badge className="bg-blue-600 text-white border-none py-1 px-3">Director Mode</Badge>
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">
                        Анализ эффективности за {format(dateRange.start, 'd MMMM', { locale: ru })} - {format(dateRange.end, 'd MMMM yyyy', { locale: ru })}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={exportToExcel}
                        className="bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm h-12 rounded-2xl px-6 font-bold flex items-center gap-2 transition-all active:scale-95"
                    >
                        <Download className="w-5 h-5 text-green-600" />
                        Экспорт Excel
                    </Button>
                </div>
            </div>

            {/* Timeframe Selector */}
            <div className="bg-slate-100 p-1.5 rounded-[2rem] flex items-center gap-1 mb-8 w-fit shadow-inner">
                {[
                    { id: 'daily', label: 'День' },
                    { id: 'weekly', label: 'Неделя' },
                    { id: 'monthly', label: 'Месяц' },
                    { id: 'quarterly', label: 'Квартал' },
                    { id: 'yearly', label: 'Год' }
                ].map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setPeriod(t.id as any)}
                        className={`px-6 py-3 rounded-3xl font-bold text-sm transition-all ${period === t.id
                            ? 'bg-white text-blue-600 shadow-md'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {[
                    { label: 'Общий План', value: stats.totalPlan, color: 'blue', icon: BarChart3 },
                    { label: 'Общий Факт', value: stats.totalFact, color: 'green', icon: TrendingUp },
                    { label: 'Всего Бонусов', value: stats.totalBonus, color: 'amber', icon: Wallet },
                    { label: 'Прединвесты', value: stats.totalPredinvest, color: 'red', icon: Users }
                ].map((card, i) => (
                    <div key={i} className="bg-white p-6 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden group hover:shadow-2xl transition-all duration-500">
                        <div className={`absolute top-0 right-0 w-32 h-32 bg-${card.color}-100/30 rounded-full -mr-16 -mt-16 blur-3xl group-hover:scale-150 transition-transform duration-700`} />
                        <div className="relative z-10">
                            <div className={`w-12 h-12 rounded-2xl bg-${card.color}-100 flex items-center justify-center mb-4`}>
                                <card.icon className={`w-6 h-6 text-${card.color}-600`} />
                            </div>
                            <h3 className="text-slate-500 text-xs font-black uppercase tracking-widest pl-0.5">{card.label}</h3>
                            <div className="flex items-baseline gap-2 mt-2">
                                <span className="text-2xl font-black text-slate-900">{(card.value ?? 0).toLocaleString()}</span>
                                <span className="text-xs font-bold text-slate-400">UZS</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex items-center gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Поиск по врачу..."
                        className="w-full h-12 bg-white border border-slate-200 rounded-2xl pl-11 pr-4 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all font-medium"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
                <DataTable
                    columns={columns}
                    data={filteredData}
                />
                {!isLoading && filteredData.length === 0 && (
                    <div className="py-20 text-center">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-slate-200">
                            <ArrowUpRight className="w-8 h-8 text-slate-300" />
                        </div>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Данные не найдены</p>
                    </div>
                )}
            </div>
        </PageContainer>
    );
}

// Inline custom implementation for the cards if tailwind safe lists are not complete
// But assuming standard tailwind colors are available.
