import { useEffect, useState, useMemo } from 'react';
import { PageContainer } from '../../components/PageContainer';
import { PageHeader } from '../../components/PageHeader';
import {
    BarChart3, TrendingUp, Users, Package, Wallet,
    ArrowUpRight, Target, LayoutDashboard, Coins, 
    HandCoins, Receipt, Banknote, ChevronRight,
    MapPin, UserCheck, Briefcase, FilterX, Search,
    Activity, Boxes
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    Legend, ResponsiveContainer
} from 'recharts';
import { getComprehensiveStats } from '../../api/sales';
import { useProductStore } from '../../store/productStore';
import { useMedRepStore } from '../../store/medRepStore';
import { useDoctorStore } from '../../store/doctorStore';
import { useRegionStore } from '../../store/regionStore';
import { DrilldownModal } from '../../components/analytics/DrilldownModal';
import { motion, AnimatePresence } from 'framer-motion';
import { PremiumKpiCard } from '../../components/analytics/PremiumKpiCard';
import { formatMoney } from '../../components/ui/MoneyInput';

const formatCurrency = (value: number) => {
    return formatMoney(Math.round(value)) + ' UZS';
};

export default function StatsPage() {
    const { products, fetchProducts } = useProductStore();
    const { medReps, fetchMedReps } = useMedRepStore();
    const { doctors, fetchDoctors } = useDoctorStore();
    const { regions: storeRegions, fetchRegions } = useRegionStore();

    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState<any>(null);
    
    // Period States
    const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year' | 'all'>('month');
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [currentQuarter, setCurrentQuarter] = useState(Math.floor(new Date().getMonth() / 3) + 1);

    // Advanced Filter States
    const [selectedRegionId, setSelectedRegionId] = useState<number | string>('');
    const [selectedPMId, setSelectedPMId] = useState<number | string>('');
    const [selectedMedRepId, setSelectedMedRepId] = useState<number | string>('');
    const [selectedProductId, setSelectedProductId] = useState<number | string>('');

    const [searchQuery, setSearchQuery] = useState('');
    const [drilldownMetric, setDrilldownMetric] = useState<{ id: string, label: string } | null>(null);

    // Computed Data for Filters
    const productManagers = useMemo(() => {
        return medReps.filter(u => u.role === 'product_manager');
    }, [medReps]);

    const filteredMedReps = useMemo(() => {
        if (!selectedPMId) return medReps.filter(u => u.role === 'med_rep');
        return medReps.filter(u => u.role === 'med_rep' && u.manager_id === Number(selectedPMId));
    }, [medReps, selectedPMId]);

    const regions = useMemo(() => {
        if (storeRegions.length > 0) return storeRegions;
        // Fallback to doctor's regions if store is empty
        const unique = new Map<number, string>();
        doctors.forEach(d => {
            if (d.region && d.region_id) unique.set(d.region_id, d.region);
        });
        return Array.from(unique.entries()).map(([id, name]) => ({ id, name }));
    }, [storeRegions, doctors]);

    const clearFilters = () => {
        setSelectedPeriod('month');
        setCurrentMonth(new Date().getMonth() + 1);
        setCurrentYear(new Date().getFullYear());
        setSelectedRegionId('');
        setSelectedPMId('');
        setSelectedMedRepId('');
        setSelectedProductId('');
    };


    useEffect(() => {
        const loadInit = async () => {
            await Promise.all([
                fetchProducts(), 
                fetchMedReps('all'), 
                fetchDoctors(),
                fetchRegions()
            ]);
        };
        loadInit();
    }, [fetchProducts, fetchMedReps, fetchDoctors, fetchRegions]);

    useEffect(() => {
        const loadStats = async () => {
            setIsLoading(true);
            try {
                const params: any = {};
                // Time params
                if (selectedPeriod !== 'all') {
                    params.year = currentYear;
                    if (selectedPeriod === 'month') params.month = currentMonth;
                    if (selectedPeriod === 'quarter') params.quarter = currentQuarter;
                }
                
                // Filter params
                if (selectedRegionId) params.region_id = selectedRegionId;
                if (selectedPMId) params.product_manager_id = selectedPMId;
                if (selectedMedRepId) params.med_rep_id = selectedMedRepId;
                if (selectedProductId) params.product_id = selectedProductId;

                const data = await getComprehensiveStats(params);
                setStats(data);
            } catch (error) {
                console.error("Error loading analytics data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadStats();
    }, [selectedPeriod, currentMonth, currentYear, currentQuarter, selectedRegionId, selectedPMId, selectedMedRepId, selectedProductId]);

    const kpis = stats?.kpis || {};

    return (
        <PageContainer>
            <PageHeader
                title="Расширенная аналитика"
                description="Финансовые показатели и динамика продаж"
            />

            {/* Filter Section */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-8 space-y-6">
                {/* Time Filters */}
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
                        <>
                            {selectedPeriod === 'month' && (
                                <select 
                                    value={currentMonth}
                                    onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
                                    className="bg-slate-50 border-none rounded-xl px-4 py-2 text-sm font-semibold outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500"
                                >
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                        <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('ru-RU', { month: 'long' })}</option>
                                    ))}
                                </select>
                            )}

                            {selectedPeriod === 'quarter' && (
                                <select 
                                    value={currentQuarter}
                                    onChange={(e) => setCurrentQuarter(parseInt(e.target.value))}
                                    className="bg-slate-50 border-none rounded-xl px-4 py-2 text-sm font-semibold outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value={1}>1-квартал</option>
                                    <option value={2}>2-квартал</option>
                                    <option value={3}>3-квартал</option>
                                    <option value={4}>4-квартал</option>
                                </select>
                            )}

                            <select 
                                value={currentYear}
                                onChange={(e) => setCurrentYear(parseInt(e.target.value))}
                                className="bg-slate-50 border-none rounded-xl px-4 py-2 text-sm font-semibold outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500"
                            >
                                {[2024, 2025, 2026].map(y => (
                                    <option key={y} value={y}>{y}-год</option>
                                ))}
                            </select>
                        </>
                    )}

                    <button 
                        onClick={clearFilters}
                        className="ml-auto flex items-center gap-2 px-4 py-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-all text-xs font-bold uppercase tracking-wider"
                    >
                        <FilterX className="w-4 h-4" />
                        Очистить
                    </button>
                </div>

                {/* Advanced Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> Region
                        </label>
                        <select 
                            value={selectedRegionId}
                            onChange={(e) => setSelectedRegionId(e.target.value)}
                            className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm font-medium outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 appearance-none"
                        >
                            <option value="">Все</option>
                            {regions.map(r => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 flex items-center gap-1">
                            <Briefcase className="w-3 h-3" /> Product Manager
                        </label>
                        <select 
                            value={selectedPMId}
                            onChange={(e) => {
                                setSelectedPMId(e.target.value);
                                setSelectedMedRepId(''); // Reset rep on PM change
                            }}
                            className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm font-medium outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 appearance-none"
                        >
                            <option value="">Все</option>
                            {productManagers.map(u => (
                                <option key={u.id} value={u.id}>{u.full_name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 flex items-center gap-1">
                            <UserCheck className="w-3 h-3" /> MedRep
                        </label>
                        <select 
                            value={selectedMedRepId}
                            onChange={(e) => setSelectedMedRepId(e.target.value)}
                            className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm font-medium outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 appearance-none"
                        >
                            <option value="">Все</option>
                            {filteredMedReps.map(u => (
                                <option key={u.id} value={u.id}>{u.full_name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 flex items-center gap-1">
                            <Package className="w-3 h-3" /> Продукт (Лекарство)
                        </label>
                        <select 
                            value={selectedProductId}
                            onChange={(e) => setSelectedProductId(e.target.value)}
                            className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm font-medium outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 appearance-none"
                        >
                            <option value="">Все</option>
                            {products.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Overall Progress Banner */}
            {!isLoading && stats && (
                <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-[32px] p-8 mb-8 shadow-xl shadow-blue-200 relative overflow-hidden group">
                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 p-12 opacity-10 transform translate-x-1/4 -translate-y-1/4 group-hover:scale-110 transition-transform duration-1000">
                        <Target className="w-64 h-64 text-white" />
                    </div>
                    
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                        <div className="space-y-2">
                            <h2 className="text-white/70 text-xs font-black uppercase tracking-[0.2em]">Общий показатель за период</h2>
                            <div className="flex items-baseline gap-3">
                                <span className="text-4xl md:text-5xl font-black text-white tracking-tighter">
                                    {(kpis.sales_plan_amount > 0 ? ((kpis.sales_fact_received_amount / kpis.sales_plan_amount) * 100).toFixed(1) : 0)}%
                                </span>
                                <span className="text-white/80 text-lg font-bold">выполнеno</span>
                            </div>
                        </div>

                        <div className="flex-1 max-w-2xl">
                            <div className="flex justify-between items-end mb-3">
                                <div className="space-y-1">
                                    <p className="text-white/60 text-[10px] font-bold uppercase tracking-wider">Факт поступлений vs План</p>
                                    <p className="text-white font-bold text-sm">
                                        {formatCurrency(kpis.sales_fact_received_amount)} / <span className="text-white/50">{formatCurrency(kpis.sales_plan_amount)}</span>
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full backdrop-blur-sm">
                                        <div className={`w-2 h-2 rounded-full animate-pulse ${kpis.sales_fact_received_amount >= kpis.sales_plan_amount ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                                        <span className="text-white/90 text-[10px] font-black uppercase">В реальном времени</span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Progress Bar Container */}
                            <div className="h-6 bg-white/10 rounded-2xl p-1 backdrop-blur-sm border border-white/5">
                                <div 
                                    className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 rounded-xl relative group"
                                    style={{ width: `${Math.min(100, (kpis.sales_plan_amount > 0 ? (kpis.sales_fact_received_amount / kpis.sales_plan_amount) * 100 : 0))}%` }}
                                >
                                    {/* Shimmer effect */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-full animate-progress-shimmer" />
                                </div>
                            </div>
                        </div>

                        <div className="hidden lg:flex items-center gap-4 pl-8 border-l border-white/10">
                            <div className="text-center bg-white/5 p-4 rounded-3xl backdrop-blur-sm border border-white/5 min-w-[120px]">
                                <p className="text-white/50 text-[9px] font-black uppercase mb-1">Остаток суммы</p>
                                <p className="text-white text-sm font-bold truncate">
                                    {formatCurrency(Math.max(0, kpis.sales_plan_amount - kpis.sales_fact_received_amount))}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isLoading && !stats ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            ) : (
                <>
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
                        className="flex flex-col gap-6 mb-8"
                    >
                        {/* ROW 1: Sales Performance - Masculine Slate/Blue */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10 p-6 rounded-[2.5rem] bg-slate-50/80 border border-slate-200 shadow-sm">
                            <PremiumKpiCard
                                variant="minimal"
                                label="ПЛАН ПРОДАЖ"
                                value={kpis.sales_plan_amount}
                                icon={Target}
                                color="navy"
                                onClick={() => setDrilldownMetric({ id: 'sales_plan', label: 'План Продаж' })}
                            />
                            <PremiumKpiCard
                                variant="minimal"
                                label="ФАКТ ОТГРУЗКА"
                                value={kpis.total_invoice_sum}
                                subValue={kpis.total_items_sold}
                                subLabel="Количество товаров"
                                subSuffix="шт"
                                icon={Receipt}
                                color="indigo"
                                onClick={() => setDrilldownMetric({ id: 'receivables', label: 'Факт Отгрузки' })}
                            />
                            <PremiumKpiCard
                                variant="minimal"
                                label="ФАКТ ПОСТУПЛЕНИЙ"
                                value={kpis.sales_fact_received_amount}
                                icon={HandCoins}
                                color="emerald"
                                badge={kpis.sales_plan_amount > 0 ? `${((kpis.sales_fact_received_amount / kpis.sales_plan_amount) * 100).toFixed(0)}% ВЫПОЛНЕНО` : undefined}
                                onClick={() => setDrilldownMetric({ id: 'cash_in', label: 'Факт Поступления' })}
                            />
                            <PremiumKpiCard
                                variant="minimal"
                                label="ВАЛОВАЯ ПРИБЫЛЬ"
                                value={kpis.gross_profit}
                                icon={TrendingUp}
                                color="indigo"
                            />
                        </div>

                        {/* ROW 2: Incentive Programs - Bold Indigo */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10 p-6 rounded-[2.5rem] bg-indigo-100/30 border border-indigo-200/30 shadow-sm">
                            <PremiumKpiCard
                                variant="minimal"
                                label="НАЧИСЛЕНО БОНУСА"
                                value={kpis.bonus_accrued}
                                icon={Coins}
                                color="indigo"
                                onClick={() => setDrilldownMetric({ id: 'bonus_accrued', label: 'Начислено Бонуса' })}
                            />
                            <PremiumKpiCard
                                variant="minimal"
                                label="ВСЕГО ВЫПЛАЧЕНО (БОНУС)"
                                value={kpis.bonus_paid}
                                icon={Users}
                                color="navy"
                                onClick={() => setDrilldownMetric({ id: 'bonus_paid', label: 'Всего Выплачено' })}
                            />
                            <PremiumKpiCard
                                variant="minimal"
                                label="ОСТАТОК БОНУСА"
                                value={kpis.bonus_balance}
                                icon={Wallet}
                                color="amber"
                            />
                            <PremiumKpiCard
                                variant="minimal"
                                label="ПРЕДИНВЕСТ"
                                value={kpis.total_predinvest}
                                icon={Banknote}
                                color="emerald"
                                onClick={() => setDrilldownMetric({ id: 'preinvest', label: 'Прединвест' })}
                            />
                        </div>

                        {/* ROW 3: Financial Health - Modern Emerald/Slate */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-6 rounded-[2.5rem] bg-emerald-100/20 border border-emerald-200/20 shadow-sm">
                            <PremiumKpiCard
                                variant="minimal"
                                label="ДЕБИТОРКА"
                                value={kpis.receivables}
                                icon={Receipt}
                                color="indigo"
                                onClick={() => setDrilldownMetric({ id: 'receivables', label: 'Дебиторка' })}
                            />
                            <PremiumKpiCard
                                variant="minimal"
                                label="ПРОСРОЧЕННАЯ ДЕБИТОРКА"
                                value={kpis.overdue_receivables}
                                icon={FilterX}
                                color="navy"
                                onClick={() => setDrilldownMetric({ id: 'receivables', label: 'Просроченная Дебиторка' })}
                            />
                            <PremiumKpiCard
                                variant="minimal"
                                label="МАРКЕТИНГ/ПРОЧИЕ"
                                value={kpis.total_expenses}
                                icon={Activity}
                                color="slate"
                            />
                            <PremiumKpiCard
                                variant="minimal"
                                label="ЧИСТАЯ ПРИБЫЛЬ"
                                value={kpis.net_profit}
                                icon={BarChart3}
                                color="emerald"
                                onClick={() => setDrilldownMetric({ id: 'net_profit', label: 'Чистая Прибыль — Детализация' })}
                            />
                        </div>

                        {/* ROW 4: MP Payroll & Logistics - Soft Amber */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-4 rounded-[2.5rem] bg-amber-50/20 border border-amber-100/10">
                            <PremiumKpiCard
                                variant="minimal"
                                label="МП ЗАРПЛАТА"
                                value={kpis.salary_accrued}
                                icon={Coins}
                                color="indigo"
                                onClick={() => setDrilldownMetric({ id: 'salary_accrued', label: 'МП Зарплата (Начислено)' })}
                            />
                            <PremiumKpiCard
                                variant="minimal"
                                label="МП ЗАРПЛАТА ВЫПЛАЧЕНО"
                                value={kpis.salary_paid}
                                icon={Users}
                                color="blue"
                                onClick={() => setDrilldownMetric({ id: 'salary_paid', label: 'МП Зарплата (Выплачено)' })}
                            />
                            <PremiumKpiCard
                                variant="minimal"
                                label="МП ЗАРПЛАТА ОСТАТОК"
                                value={kpis.salary_balance}
                                icon={Wallet}
                                color="amber"
                                onClick={() => setDrilldownMetric({ id: 'salary_balance', label: 'МП Зарплата (Остаток)' })}
                            />
                            <PremiumKpiCard
                                variant="minimal"
                                label="ТОВАРЫ (ШТ)"
                                value={kpis.total_items_sold}
                                icon={Boxes}
                                color="violet"
                                suffix=""
                                onClick={() => setDrilldownMetric({ id: 'sold_items', label: 'Проданные Товары (шт)' })}
                            />
                        </div>
                    </motion.div>

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mb-8">
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-xl font-extrabold text-slate-800 flex items-center gap-3">
                                    <div className="p-2 bg-blue-50 rounded-xl">
                                        <Package className="w-5 h-5 text-blue-600" />
                                    </div>
                                    Динамика продуктов
                                </h3>
                            </div>
                            <div className="h-[500px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart 
                                        data={stats?.product_stats || []} 
                                        layout="vertical"
                                        margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                        <XAxis type="number" hide />
                                        <YAxis 
                                            dataKey="name" 
                                            type="category" 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{ fill: '#64748b', fontSize: 12, fontWeight: 'bold' }}
                                            width={140}
                                        />
                                        <RechartsTooltip 
                                            cursor={{ fill: '#f8fafc' }}
                                            contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                                            formatter={(value: any) => [formatCurrency(value || 0), ""]}
                                        />
                                        <Legend wrapperStyle={{ paddingTop: '30px' }} />
                                        <Bar dataKey="plan_uzs" name="План (UZS)" fill="#e2e8f0" radius={[0, 8, 8, 0]} maxBarSize={30} />
                                        <Bar dataKey="fact_uzs" name="Факт (UZS)" fill="#3b82f6" radius={[0, 8, 8, 0]} maxBarSize={30} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </>
            )}

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

            <style>{`
                .scale-in-center {
                    animation: scale-in-center 0.3s cubic-bezier(0.250, 0.460, 0.450, 0.940) both;
                }
                @keyframes scale-in-center {
                    0% { transform: scale(0.9); opacity: 0; }
                    100% { transform: scale(1); opacity: 1; }
                }
                @keyframes progress-shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                .animate-progress-shimmer {
                    animation: progress-shimmer 2s infinite linear;
                }
            `}</style>
        </PageContainer>
    );
}

// Old KpiCard removed
