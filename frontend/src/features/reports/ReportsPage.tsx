import React, { useState, useMemo, useEffect } from 'react';
import { PageContainer } from '../../components/PageContainer';
import { 
    Download, 
    Search, 
    FilterX, 
    MapPin, 
    UserCheck, 
    Briefcase, 
    Package, 
    Target,
    BarChart3,
    TrendingUp,
    TrendingDown,
    Wallet,
    DollarSign,
    Users,
    ArrowUpRight,
    PieChart
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { DataTable } from '../../components/ui/data-table';
import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '../../components/ui/badge';
import { useMedRepStore } from '../../store/medRepStore';
import { useDoctorStore } from '../../store/doctorStore';
import { getComprehensiveStats } from '../../api/sales';
import { DrilldownModal } from '../../components/analytics/DrilldownModal';
import { motion, AnimatePresence } from 'framer-motion';
import { PremiumKpiCard } from '../../components/analytics/PremiumKpiCard';

import { 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer
} from 'recharts';

type ReportItem = {
    doctor_id: number;
    doctor_name: string;
    med_rep_name: string;
    region: string;
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
    // 1. State for Filters
    const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year' | 'all'>('month');
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [currentQuarter, setCurrentQuarter] = useState(Math.floor((new Date().getMonth() + 3) / 3));

    const [selectedRegionId, setSelectedRegionId] = useState<number | string>('');
    const [selectedPMId, setSelectedPMId] = useState<number | string>('');
    const [selectedMedRepId, setSelectedMedRepId] = useState<number | string>('');
    const [selectedProductId, setSelectedProductId] = useState<number | string>('');
    
    const [searchQuery, setSearchQuery] = useState('');

    const [drilldownMetric, setDrilldownMetric] = useState<{ id: string, label: string } | null>(null);

    // 2. Fetch Data from Stores
    const { medReps, fetchMedReps } = useMedRepStore();
    const { doctors, fetchDoctors } = useDoctorStore();
    const [products, setProducts] = useState<any[]>([]);

    useEffect(() => {
        fetchMedReps();
        fetchDoctors();
        api.get('/products/')
            .then(res => setProducts(res.data || []))
            .catch(() => {});
    }, [fetchMedReps, fetchDoctors]);

    // 3. Computed Filter Options
    const productManagers = useMemo(() => medReps.filter(u => u.role === 'product_manager'), [medReps]);
    const filteredMedReps = useMemo(() => {
        if (!selectedPMId) return medReps.filter(u => u.role === 'med_rep');
        return medReps.filter(u => u.role === 'med_rep' && Number(u.manager_id) === Number(selectedPMId));
    }, [medReps, selectedPMId]);

    const regions = useMemo(() => {
        const unique = new Map<number, string>();
        doctors.forEach(d => {
            if (d.region && d.region_id) unique.set(d.region_id, d.region);
        });
        return Array.from(unique.entries()).map(([id, name]) => ({ id, name }));
    }, [doctors]);

    // 4. Fetch Comprehensive Stats (Top Banner & Cards & Trends)
    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['comp-stats', selectedPeriod, currentMonth, currentYear, currentQuarter, selectedRegionId, selectedPMId, selectedMedRepId, selectedProductId],
        queryFn: () => getComprehensiveStats({
            period: selectedPeriod,
            month: selectedPeriod === 'month' ? currentMonth : undefined,
            year: selectedPeriod === 'all' ? undefined : currentYear,
            quarter: selectedPeriod === 'quarter' ? currentQuarter : undefined,
            region_id: selectedRegionId ? Number(selectedRegionId) : undefined,
            product_id: selectedProductId ? Number(selectedProductId) : undefined,
            med_rep_id: selectedMedRepId ? Number(selectedMedRepId) : undefined,
            product_manager_id: selectedPMId ? Number(selectedPMId) : undefined
        })
    });

    // 5. Fetch Detailed Table Data
    const { data: reportData, isLoading: reportLoading } = useQuery<ReportsResponse>({
        queryKey: ['comprehensive-reports', selectedPeriod, currentMonth, currentYear, currentQuarter, selectedRegionId, selectedPMId, selectedMedRepId, selectedProductId],
        queryFn: async () => {
            let start = '', end = '';
            if (selectedPeriod === 'month') {
                start = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
                end = format(new Date(currentYear, currentMonth, 0), 'yyyy-MM-dd');
            } else if (selectedPeriod === 'quarter') {
                const startMonth = (currentQuarter - 1) * 3;
                start = format(new Date(currentYear, startMonth, 1), 'yyyy-MM-dd');
                end = format(new Date(currentYear, startMonth + 3, 0), 'yyyy-MM-dd');
            } else if (selectedPeriod === 'year') {
                start = `${currentYear}-01-01`;
                end = `${currentYear}-12-31`;
            }

            const res = await api.get('/domain/analytics/reports', {
                params: {
                    start_date: start || undefined,
                    end_date: end || undefined,
                    product_id: selectedProductId ? Number(selectedProductId) : undefined,
                    region_id: selectedRegionId ? Number(selectedRegionId) : undefined,
                    med_rep_id: selectedMedRepId ? Number(selectedMedRepId) : undefined,
                    product_manager_id: selectedPMId ? Number(selectedPMId) : undefined
                }
            });
            return res.data;
        }
    });

    // 6. Data Sanitization & Formatting
    const formatCurrency = (val: any) => {
        const num = Number(val) || 0;
        return new Intl.NumberFormat('ru-RU').format(num) + ' UZS';
    };

    const kpis = useMemo(() => stats?.kpis || {
        sales_plan_amount: 0,
        sales_fact_received_amount: 0,
        gross_profit: 0,
        total_expenses: 0,
        net_profit: 0,
        bonus_accrued: 0,
        bonus_paid: 0,
        bonus_balance: 0,
        total_predinvest: 0,
        receivables: 0
    }, [stats]);

    const clearFilters = () => {
        setSelectedPeriod('month');
        setCurrentMonth(new Date().getMonth() + 1);
        setCurrentYear(new Date().getFullYear());
        setSelectedRegionId('');
        setSelectedPMId('');
        setSelectedMedRepId('');
        setSelectedProductId('');
        setSearchQuery('');
    };

    const exportToExcel = () => {
        const wb = XLSX.utils.book_new();
        const fmt = (n: any) => Number(n) || 0;
        const fmtPct = (fact: any, plan: any) =>
            fmt(plan) > 0 ? ((fmt(fact) / fmt(plan)) * 100).toFixed(1) + '%' : '0%';

        // Period label
        let periodLabel = 'Все время';
        if (selectedPeriod === 'month') {
            const mn = new Date(currentYear, currentMonth - 1).toLocaleString('ru-RU', { month: 'long' });
            periodLabel = `${mn} ${currentYear}`;
        } else if (selectedPeriod === 'quarter') {
            periodLabel = `${currentQuarter}-й квартал ${currentYear}`;
        } else if (selectedPeriod === 'year') {
            periodLabel = `${currentYear} год`;
        }

        // SHEET 1 — KPI Summary
        const kpiRows: any[][] = [
            ['РАСШИРЕННЫЙ ФИНАНСОВЫЙ ОТЧЕТ'],
            [`Период: ${periodLabel}`],
            [`Сформирован: ${new Date().toLocaleString('ru-RU')}`],
            [],
            ['ПОКАЗАТЕЛЬ', 'ЗНАЧЕНИЕ (UZS)', 'ПРИМЕЧАНИЕ'],
            ['ПРОДАЖИ И ВЫРУЧКА', '', ''],
            ['План продаж', fmt(kpis.sales_plan_amount), ''],
            ['Факт поступлений', fmt(kpis.sales_fact_received_amount), ''],
            ['Выполнение плана', fmtPct(kpis.sales_fact_received_amount, kpis.sales_plan_amount), ''],
            ['Остаток плана', Math.max(0, fmt(kpis.sales_plan_amount) - fmt(kpis.sales_fact_received_amount)), ''],
            [],
            ['ПРИБЫЛЬ', '', ''],
            ['Валовая прибыль', fmt(kpis.gross_profit), 'Выручка - Себестоимость'],
            ['Прочие расходы', fmt(kpis.total_expenses), ''],
            ['Чистая прибыль', fmt(kpis.net_profit), 'Вал. прибыль - Прочие расходы'],
            [],
            ['ДЕБИТОРСКАЯ ЗАДОЛЖЕННОСТЬ', '', ''],
            ['Дебиторка (общая)', fmt(kpis.receivables), ''],
            [],
            ['БОНУСЫ МП', '', ''],
            ['Начислено бонусов', fmt(kpis.bonus_accrued), ''],
            ['Всего выплачено (бонус)', fmt(kpis.bonus_paid), ''],
            ['Остаток бонуса', Math.max(0, fmt(kpis.bonus_accrued) - fmt(kpis.bonus_paid)), ''],
            ['Прединвест (аванс)', fmt(kpis.total_predinvest), ''],
        ];
        const ws1 = XLSX.utils.aoa_to_sheet(kpiRows);
        ws1['!cols'] = [{ wch: 40 }, { wch: 25 }, { wch: 35 }];
        ws1['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];
        XLSX.utils.book_append_sheet(wb, ws1, 'Общая сводка');

        // SHEET 2 — By Doctors
        const doctorsData = reportData?.data || [];
        const doctorRows: any[][] = [
            [`Детализация по врачам — ${periodLabel}`],
            [],
            ['№', 'Врач', 'МП', 'Регион', 'План (сум)', 'Факт (сум)', 'Выполнение %', 'Кол-во план', 'Кол-во факт', 'Бонус начислен', 'Прединвест выдан', 'Прединвест погашен'],
        ];
        doctorsData.forEach((d: ReportItem, i: number) => {
            doctorRows.push([
                i + 1,
                d.doctor_name || '—',
                (d as any).med_rep_name || '—',
                (d as any).region || '—',
                fmt(d.plan_amount),
                fmt(d.fact_amount),
                fmtPct(d.fact_amount, d.plan_amount),
                fmt(d.plan_quantity),
                fmt(d.fact_quantity),
                fmt(d.earned_bonus),
                fmt(d.predinvest_given),
                fmt(d.predinvest_paid_off),
            ]);
        });
        const sumCol = (key: keyof ReportItem) =>
            doctorsData.reduce((s: number, d: ReportItem) => s + fmt(d[key]), 0);
        doctorRows.push([
            '', 'ИТОГО', '', '',
            sumCol('plan_amount'), sumCol('fact_amount'),
            fmtPct(sumCol('fact_amount'), sumCol('plan_amount')),
            sumCol('plan_quantity'), sumCol('fact_quantity'),
            sumCol('earned_bonus'), sumCol('predinvest_given'), sumCol('predinvest_paid_off'),
        ]);
        const ws2 = XLSX.utils.aoa_to_sheet(doctorRows);
        ws2['!cols'] = [
            { wch: 4 }, { wch: 32 }, { wch: 22 }, { wch: 18 },
            { wch: 18 }, { wch: 18 }, { wch: 14 },
            { wch: 14 }, { wch: 14 },
            { wch: 18 }, { wch: 18 }, { wch: 18 },
        ];
        ws2['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 11 } }];
        XLSX.utils.book_append_sheet(wb, ws2, 'По врачам');

        // SHEET 3 — By Products
        const productStats: any[] = stats?.product_stats || [];
        const prodRows: any[][] = [
            [`Детализация по препаратам — ${periodLabel}`],
            [],
            ['№', 'Препарат', 'План (сум)', 'Факт (сум)', 'Выполнение %', 'План (шт)', 'Факт (шт)'],
        ];
        productStats.forEach((p: any, i: number) => {
            prodRows.push([
                i + 1,
                p.name || p.product_name || '—',
                fmt(p.plan_uzs),
                fmt(p.fact_uzs),
                fmtPct(p.fact_uzs, p.plan_uzs),
                fmt(p.plan_qty),
                fmt(p.fact_qty),
            ]);
        });
        if (productStats.length === 0) prodRows.push(['', 'Нет данных', '', '', '', '', '']);
        const ws3 = XLSX.utils.aoa_to_sheet(prodRows);
        ws3['!cols'] = [{ wch: 4 }, { wch: 35 }, { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
        ws3['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }];
        XLSX.utils.book_append_sheet(wb, ws3, 'По препаратам');

        // SHEET 4 — Trends / Dynamics
        // For monthly view: show cumulative fact vs total monthly plan
        const trends: any[] = stats?.trends || [];
        const totalPlan = fmt(kpis.sales_plan_amount);
        const trendRows: any[][] = [
            [`Динамика продаж — ${periodLabel}`],
            [`Общий план: ${totalPlan.toLocaleString('ru-RU')} UZS | Итого факт: ${fmt(kpis.sales_fact_received_amount).toLocaleString('ru-RU')} UZS`],
            [],
            ['Период', 'Факт (UZS)', 'Кумулятивный факт (UZS)', 'Кум. выполнение %'],
        ];
        let cumFact = 0;
        trends.forEach((t: any) => {
            cumFact += fmt(t.fact);
            trendRows.push([
                t.label || '—',
                fmt(t.fact),
                cumFact,
                totalPlan > 0 ? ((cumFact / totalPlan) * 100).toFixed(1) + '%' : '0%',
            ]);
        });
        if (trends.length === 0) trendRows.push(['Нет данных', '', '', '']);
        const ws4 = XLSX.utils.aoa_to_sheet(trendRows);
        ws4['!cols'] = [{ wch: 12 }, { wch: 22 }, { wch: 26 }, { wch: 20 }];
        ws4['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
            { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
        ];
        XLSX.utils.book_append_sheet(wb, ws4, 'Динамика');

        XLSX.writeFile(wb, `Расширенный_Отчет_${periodLabel.replace(/ /g, '_')}_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
    };


    const columns: ColumnDef<ReportItem>[] = [
        {
            accessorKey: 'doctor_name',
            header: 'Врач',
            cell: ({ row }) => <span className="font-semibold text-slate-900">{row.original.doctor_name || '—'}</span>
        },
        {
            accessorKey: 'med_rep_name',
            header: 'МП',
            cell: ({ row }) => <span className="text-slate-600 text-sm">{row.original.med_rep_name || '—'}</span>
        },
        {
            accessorKey: 'region',
            header: 'Регион',
            cell: ({ row }) => (
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                    {row.original.region || '—'}
                </span>
            )
        },
        {
            accessorKey: 'plan_amount',
            header: 'План / Факт (сум)',
            cell: ({ row }) => {
                const plan = Number(row.original.plan_amount) || 0;
                const fact = Number(row.original.fact_amount) || 0;
                const percent = plan > 0 ? (fact / plan) * 100 : 0;
                return (
                    <div className="space-y-1 w-48">
                        <div className="flex justify-between text-[10px] font-bold">
                            <span className="text-slate-400">П: {plan.toLocaleString()}</span>
                            <span className="text-blue-600">Ф: {fact.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-500 ${percent >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                 style={{ width: `${Math.min(percent, 100)}%` }} />
                        </div>
                        <div className={`text-[10px] font-black text-right ${percent >= 100 ? 'text-emerald-600' : 'text-blue-500'}`}>
                            {percent.toFixed(1)}%
                        </div>
                    </div>
                );
            }
        },
        {
            id: 'qty',
            header: 'Кол-во (план/факт)',
            cell: ({ row }) => (
                <div className="text-xs font-bold space-y-0.5">
                    <div className="text-slate-400">П: {(Number(row.original.plan_quantity) || 0).toLocaleString()} шт</div>
                    <div className="text-blue-600">Ф: {(Number(row.original.fact_quantity) || 0).toLocaleString()} шт</div>
                </div>
            )
        },
        {
            accessorKey: 'earned_bonus',
            header: 'Бонусы',
            cell: ({ row }) => <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">{(Number(row.original.earned_bonus) || 0).toLocaleString()}</Badge>
        },
        {
            accessorKey: 'predinvest_given',
            header: 'Прединвест',
            cell: ({ row }) => (
                <div className="text-[10px] font-black">
                    <div className="text-rose-500">−{(Number(row.original.predinvest_given) || 0).toLocaleString()}</div>
                    <div className="text-emerald-500">+{(Number(row.original.predinvest_paid_off) || 0).toLocaleString()}</div>
                </div>
            )
        }
    ];

    const filteredTableData = useMemo(() => {
        if (!reportData?.data) return [];
        const q = (searchQuery || '').toLowerCase();
        return reportData.data.filter(item =>
            (item.doctor_name || '').toLowerCase().includes(q) ||
            (item.med_rep_name || '').toLowerCase().includes(q) ||
            (item.region || '').toLowerCase().includes(q)
        );
    }, [reportData, searchQuery]);


    const isLoading = statsLoading || reportLoading;

    return (
        <PageContainer>
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                        Расширенные отчеты
                        <div className="px-3 py-1 bg-blue-600 text-[10px] font-black text-white rounded-full tracking-widest uppercase">Director Mode</div>
                    </h1>
                    <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Мониторинг эффективности и финансовая диагностика</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={exportToExcel} className="flex items-center gap-2 px-6 h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-emerald-100">
                        <Download className="w-5 h-5" /> Экспорт Excel
                    </button>
                </div>
            </div>

            {/* Filter Section */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-slate-200/50 border border-slate-100 mb-8 space-y-8">
                <div className="flex flex-wrap items-center gap-4 border-b border-slate-50 pb-6">
                    <div className="flex p-1 bg-slate-100 rounded-xl">
                        {['month', 'quarter', 'year', 'all'].map((p) => (
                            <button 
                                key={p}
                                onClick={() => setSelectedPeriod(p as any)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${selectedPeriod === p ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                {p === 'month' ? 'Месяц' : p === 'quarter' ? 'Квартал' : p === 'year' ? 'Год' : 'Все'}
                            </button>
                        ))}
                    </div>

                    {selectedPeriod !== 'all' && (
                        <div className="flex gap-2">
                            {selectedPeriod === 'month' && (
                                <select value={currentMonth} onChange={(e) => setCurrentMonth(parseInt(e.target.value))} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500">
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                        <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('ru-RU', { month: 'long' })}</option>
                                    ))}
                                </select>
                            )}
                            {selectedPeriod === 'quarter' && (
                                <select value={currentQuarter} onChange={(e) => setCurrentQuarter(parseInt(e.target.value))} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500">
                                    {[1,2,3,4].map(q => <option key={q} value={q}>{q}-й квартал</option>)}
                                </select>
                            )}
                            <select value={currentYear} onChange={(e) => setCurrentYear(parseInt(e.target.value))} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500">
                                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y} год</option>)}
                            </select>
                        </div>
                    )}
                    <button onClick={clearFilters} className="ml-auto flex items-center gap-2 px-4 py-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-all text-xs font-bold uppercase tracking-wider">
                        <FilterX className="w-4 h-4" /> Очистить
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <FilterSelect label="Регион" icon={MapPin} value={selectedRegionId} onChange={setSelectedRegionId} options={regions} />
                    <FilterSelect label="Продакт-менеджер" icon={Briefcase} value={selectedPMId} onChange={(v: string) => { setSelectedPMId(v); setSelectedMedRepId(''); }} options={productManagers.map(u => ({ id: u.id, name: u.full_name }))} />
                    <FilterSelect label="Медпредставитель" icon={UserCheck} value={selectedMedRepId} onChange={setSelectedMedRepId} options={filteredMedReps.map(u => ({ id: u.id, name: u.full_name }))} />
                    <FilterSelect label="Препарат" icon={Package} value={selectedProductId} onChange={setSelectedProductId} options={products} />
                </div>
            </div>

            {/* Performance Banner */}
            {!statsLoading && (
                <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-[32px] p-8 mb-8 shadow-xl shadow-blue-200 relative overflow-hidden group scale-in-center">
                    <div className="absolute top-0 right-0 p-12 opacity-10 transform translate-x-1/4 -translate-y-1/4 group-hover:scale-110 transition-transform duration-1000">
                        <Target className="w-64 h-64 text-white" />
                    </div>
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8 text-white">
                        <div className="space-y-2">
                            <h2 className="text-white/70 text-xs font-black uppercase tracking-[0.2em]">Общий показатель эффективности</h2>
                            <div className="flex items-baseline gap-3">
                                <span className="text-4xl md:text-5xl font-black tracking-tighter">
                                    {(Number(kpis.sales_plan_amount) > 0 ? ((Number(kpis.sales_fact_received_amount) / Number(kpis.sales_plan_amount)) * 100).toFixed(1) : '0.0')}%
                                </span>
                                <span className="text-white/80 text-lg font-bold">выполнено</span>
                            </div>
                        </div>
                        <div className="flex-1 max-w-2xl">
                            <div className="flex justify-between items-end mb-3">
                                <div className="space-y-1">
                                    <p className="text-white/60 text-[10px] font-bold uppercase tracking-wider">Факт поступлений vs План</p>
                                    <p className="font-bold text-sm">
                                        {formatCurrency(kpis.sales_fact_received_amount)} / <span className="text-white/50">{formatCurrency(kpis.sales_plan_amount)}</span>
                                    </p>
                                </div>
                                <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full backdrop-blur-sm border border-white/10">
                                    <div className={`w-2 h-2 rounded-full animate-pulse ${Number(kpis.sales_fact_received_amount) >= Number(kpis.sales_plan_amount) ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                                    <span className="text-white/90 text-[10px] font-black uppercase tracking-widest">Real-time</span>
                                </div>
                            </div>
                            <div className="h-6 bg-white/10 rounded-2xl p-1 backdrop-blur-sm border border-white/5 overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 rounded-xl relative overflow-hidden transition-all duration-1000"
                                     style={{ width: `${Math.min(100, (Number(kpis.sales_plan_amount) > 0 ? (Number(kpis.sales_fact_received_amount) / Number(kpis.sales_plan_amount)) * 100 : 0))}%` }}>
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-full animate-progress-shimmer" />
                                </div>
                            </div>
                        </div>
                        <div className="hidden lg:block pl-8 border-l border-white/10 min-w-[150px]">
                            <p className="text-white/50 text-[9px] font-black uppercase mb-1">Остаток плана</p>
                            <p className="text-white text-sm font-bold truncate">
                                {formatCurrency(Math.max(0, (Number(kpis.sales_plan_amount) - Number(kpis.sales_fact_received_amount))))}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* KPI Cards Grid - Staggered Entrance */}
            <motion.div 
                initial="hidden"
                animate="show"
                variants={{
                    hidden: { opacity: 0 },
                    show: {
                        opacity: 1,
                        transition: { staggerChildren: 0.05 }
                    }
                }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
            >
                <PremiumKpiCard 
                    label="План продаж" 
                    value={kpis.sales_plan_amount} 
                    icon={BarChart3} 
                    color="blue" 
                    onClick={() => setDrilldownMetric({ id: 'sales_plan', label: 'План продаж' })} 
                />
                <PremiumKpiCard 
                    label="Факт поступлений" 
                    value={kpis.sales_fact_received_amount} 
                    icon={TrendingUp} 
                    color="emerald" 
                    badge={Number(kpis.sales_plan_amount) > 0 ? `${((Number(kpis.sales_fact_received_amount) / Number(kpis.sales_plan_amount)) * 100).toFixed(0)}% выполнено` : undefined}
                    onClick={() => setDrilldownMetric({ id: 'cash_in', label: 'Факт поступлений' })} 
                />
                <PremiumKpiCard 
                    label="Валовая прибыль" 
                    value={kpis.gross_profit} 
                    icon={DollarSign} 
                    color="indigo" 
                    onClick={() => setDrilldownMetric({ id: 'gross_profit', label: 'Валовая прибыль' })} 
                />
                <PremiumKpiCard 
                    label="Прочие расходы" 
                    value={kpis.total_expenses} 
                    icon={TrendingDown} 
                    color="rose" 
                    onClick={() => setDrilldownMetric({ id: 'expenses', label: 'Прочие расходы' })} 
                />
                <PremiumKpiCard label="Чистая прибыль" value={kpis.net_profit} icon={PieChart} color="violet" />
                <PremiumKpiCard 
                    label="Дебиторка" 
                    value={kpis.receivables} 
                    icon={Wallet} 
                    color="rose" 
                    onClick={() => setDrilldownMetric({ id: 'receivables', label: 'Дебиторка' })} 
                />
                <PremiumKpiCard 
                    label="Начислено бонуса" 
                    value={kpis.bonus_accrued} 
                    icon={PieChart} 
                    color="amber" 
                    onClick={() => setDrilldownMetric({ id: 'bonus_accrued', label: 'Начислено бонуса' })} 
                />
                <PremiumKpiCard 
                    label="Всего выплачено (Бонус)" 
                    value={kpis.bonus_paid} 
                    icon={UserCheck} 
                    color="emerald" 
                    onClick={() => setDrilldownMetric({ id: 'bonus_paid', label: 'Всего выплачено (Бонус)' })} 
                />
                <PremiumKpiCard label="Остаток бонуса" value={Number(kpis.bonus_accrued) - Number(kpis.bonus_paid)} icon={Wallet} color="blue" />
                <PremiumKpiCard 
                    label="Прединвест" 
                    value={kpis.total_predinvest} 
                    icon={Users} 
                    color="rose" 
                    onClick={() => setDrilldownMetric({ id: 'preinvest', label: 'Прединвест' })} 
                />
            </motion.div>

            {drilldownMetric && (
                <DrilldownModal 
                    isOpen={!!drilldownMetric}
                    onClose={() => setDrilldownMetric(null)}
                    metric={drilldownMetric.id}
                    metricLabel={drilldownMetric.label}
                    filters={{
                        period: selectedPeriod,
                        month: selectedPeriod === 'month' ? currentMonth : undefined,
                        year: selectedPeriod === 'all' ? undefined : currentYear,
                        quarter: selectedPeriod === 'quarter' ? currentQuarter : undefined,
                        region_id: selectedRegionId ? Number(selectedRegionId) : undefined,
                        product_id: selectedProductId ? Number(selectedProductId) : undefined,
                        med_rep_id: selectedMedRepId ? Number(selectedMedRepId) : undefined,
                        product_manager_id: selectedPMId ? Number(selectedPMId) : undefined
                    }}
                />
            )}

            {/* Sales Dynamics Chart */}
            {!statsLoading && stats?.trends && stats.trends.length > 0 && (
                <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-slate-200/50 border border-slate-100 mb-8 scale-in-center">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                                <TrendingUp className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                                <h3 className="text-slate-900 font-black text-lg">Динамика продаж и планов</h3>
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Визуализация прогресса по времени</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-blue-500 shadow-sm shadow-blue-200" />
                                <span className="text-slate-600 text-xs font-bold font-mono uppercase tracking-wider">План</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200" />
                                <span className="text-slate-600 text-xs font-bold font-mono uppercase tracking-wider">Факт</span>
                            </div>
                        </div>
                    </div>

                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.trends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorPlan" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorFact" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis 
                                    dataKey="label" 
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                                    dy={10}
                                />
                                <YAxis 
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                                    tickFormatter={(val) => `${(val / 1000000).toFixed(0)}M`}
                                />
                                <Tooltip 
                                    content={<CustomTooltip />}
                                    cursor={{ stroke: '#e2e8f0', strokeWidth: 2 }}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="plan" 
                                    stroke="#3b82f6" 
                                    strokeWidth={4}
                                    fillOpacity={1} 
                                    fill="url(#colorPlan)" 
                                    animationDuration={2000}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="fact" 
                                    stroke="#10b981" 
                                    strokeWidth={4}
                                    fillOpacity={1} 
                                    fill="url(#colorFact)" 
                                    animationDuration={2000}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Search & Table */}
            <div className="space-y-6">
                <div className="relative">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Поиск по врачу..." 
                        className="w-full h-16 bg-white border border-slate-200 rounded-[1.25rem] pl-16 pr-8 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all font-bold text-slate-700 shadow-xl shadow-slate-100"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
                    {isLoading ? (
                        <div className="py-20 flex flex-col items-center gap-4">
                            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                            <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Загрузка отчета...</p>
                        </div>
                    ) : (
                        <DataTable columns={columns} data={filteredTableData} />
                    )}
                    {!isLoading && filteredTableData.length === 0 && (
                        <div className="py-20 text-center">
                            <ArrowUpRight className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Данные отсутствуют</p>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes progress-shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                .animate-progress-shimmer {
                    animation: progress-shimmer 2s infinite linear;
                }
                .scale-in-center {
                    animation: scale-in-center 0.4s cubic-bezier(0.250, 0.460, 0.450, 0.940) both;
                }
                @keyframes scale-in-center {
                    0% { transform: scale(0.95); opacity: 0; }
                    100% { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </PageContainer>
    );
}

function CustomTooltip({ active, payload, label }: any) {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-slate-100 min-w-[200px]">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">{label}</p>
                <div className="space-y-2">
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                <span className="text-slate-600 text-[10px] font-bold uppercase tracking-wider">{entry.name === 'plan' ? 'План' : 'Факт'}</span>
                            </div>
                            <span className="text-slate-900 text-xs font-black">
                                {(Number(entry.value) || 0).toLocaleString()} <span className="text-[10px]">UZS</span>
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
}

function FilterSelect({ label, icon: Icon, value, onChange, options }: any) {
    return (
        <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2 flex items-center gap-2">
                <Icon className="w-3.5 h-3.5 text-slate-300" /> {label}
            </label>
            <div className="relative">
                <select 
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-black text-slate-700 outline-none hover:bg-slate-100 transition-all cursor-pointer appearance-none"
                >
                    <option value="">Все</option>
                    {options.map((opt: any) => (
                        <option key={opt.id} value={opt.id}>{opt.name}</option>
                    ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-20">
                    <ArrowUpRight className="w-4 h-4 rotate-45" />
                </div>
            </div>
        </div>
    );
}

