import { useEffect, useState } from 'react';
import { PageContainer } from '../../components/PageContainer';
import { PageHeader } from '../../components/PageHeader';
import {
    BarChart3, TrendingUp, Users, Package, Wallet,
    ArrowUpRight, Target, LayoutDashboard, Coins, 
    HandCoins, Receipt, Banknote, ChevronRight
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    Legend, ResponsiveContainer
} from 'recharts';
import { getComprehensiveStats } from '../../api/sales';
import { useProductStore } from '../../store/productStore';
import { useMedRepStore } from '../../store/medRepStore';
import { useDoctorStore } from '../../store/doctorStore';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU').format(Math.round(value)) + ' UZS';
};

export default function StatsPage() {
    const { fetchProducts } = useProductStore();
    const { fetchMedReps } = useMedRepStore();
    const { fetchDoctors } = useDoctorStore();

    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState<any>(null);
    const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('month');
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [currentQuarter, setCurrentQuarter] = useState(Math.floor(new Date().getMonth() / 3) + 1);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState<{ title: string; type: string; data: any[] }>({ title: '', type: '', data: [] });

    const openDetails = (title: string, type: string) => {
        let data: any[] = [];
        if (type === 'bonus') {
            data = stats?.bonus_details || [];
        } else if (type === 'sales') {
            data = stats?.sales_details || [];
        } else if (type === 'debt') {
            data = stats?.debt_details || [];
        }
        setModalContent({ title, type, data });
        setIsModalOpen(true);
    };

    useEffect(() => {
        const loadInit = async () => {
            await Promise.all([fetchProducts(), fetchMedReps(), fetchDoctors()]);
        };
        loadInit();
    }, [fetchProducts, fetchMedReps, fetchDoctors]);

    useEffect(() => {
        const loadStats = async () => {
            setIsLoading(true);
            try {
                const params: any = { year: currentYear };
                if (selectedPeriod === 'month') params.month = currentMonth;
                if (selectedPeriod === 'quarter') params.quarter = currentQuarter;
                
                const data = await getComprehensiveStats(params);
                setStats(data);
            } catch (error) {
                console.error("Error loading analytics data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadStats();
    }, [selectedPeriod, currentMonth, currentYear, currentQuarter]);

    if (isLoading && !stats) {
        return (
            <PageContainer>
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            </PageContainer>
        );
    }

    const kpis = stats?.kpis || {};

    return (
        <PageContainer>
            <PageHeader
                title="Kengaytirilgan tahlillar"
                description="Moliyaviy ko'rsatkichlar va savdo dinamikasi"
            />

            {/* Filter Section */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-8 flex flex-wrap items-center gap-4">
                <div className="flex p-1 bg-slate-100 rounded-xl">
                    <button 
                        onClick={() => setSelectedPeriod('month')}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${selectedPeriod === 'month' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
                    >
                        Oy
                    </button>
                    <button 
                        onClick={() => setSelectedPeriod('quarter')}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${selectedPeriod === 'quarter' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
                    >
                        Kvartal
                    </button>
                    <button 
                        onClick={() => setSelectedPeriod('year')}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${selectedPeriod === 'year' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
                    >
                        Yil
                    </button>
                </div>

                {selectedPeriod === 'month' && (
                    <select 
                        value={currentMonth}
                        onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
                        className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                            <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('uz-UZ', { month: 'long' })}</option>
                        ))}
                    </select>
                )}

                {selectedPeriod === 'quarter' && (
                    <select 
                        value={currentQuarter}
                        onChange={(e) => setCurrentQuarter(parseInt(e.target.value))}
                        className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value={1}>1-kvartal</option>
                        <option value={2}>2-kvartal</option>
                        <option value={3}>3-kvartal</option>
                        <option value={4}>4-kvartal</option>
                    </select>
                )}

                <select 
                    value={currentYear}
                    onChange={(e) => setCurrentYear(parseInt(e.target.value))}
                    className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
                    {[2024, 2025, 2026].map(y => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>
            </div>

            {/* Main KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <KpiCard
                    title="Sotuv rejasi (Summa)"
                    value={formatCurrency(kpis.sales_plan_amount)}
                    icon={<Target className="w-6 h-6 text-indigo-600" />}
                    colorClass="bg-indigo-50"
                    onClick={() => openDetails("Sotuv rejasi", "plan")}
                />
                <KpiCard
                    title="Haqiqiy tushum (Fakt)"
                    value={formatCurrency(kpis.sales_fact_received_amount)}
                    icon={<HandCoins className="w-6 h-6 text-emerald-600" />}
                    colorClass="bg-emerald-50"
                    trend={`${kpis.sales_plan_amount > 0 ? ((kpis.sales_fact_received_amount / kpis.sales_plan_amount) * 100).toFixed(1) : 0}% bajarildi`}
                    trendUp={kpis.sales_fact_received_amount >= kpis.sales_plan_amount}
                    onClick={() => openDetails("Haqiqiy tushum", "sales")}
                />
                <KpiCard
                    title="Sof foyda"
                    value={formatCurrency(kpis.net_profit)}
                    icon={<TrendingUp className="w-6 h-6 text-blue-600" />}
                    colorClass="bg-blue-50"
                    onClick={() => openDetails("Sof foyda", "profit")}
                />
                <KpiCard
                    title="Kreditorka (Debitorlik)"
                    value={formatCurrency(kpis.receivables)}
                    icon={<Receipt className="w-6 h-6 text-orange-600" />}
                    colorClass="bg-orange-50"
                    onClick={() => openDetails("Kreditorka", "debt")}
                />

                <KpiCard
                    title="Hisoblangan bonus"
                    value={formatCurrency(kpis.bonus_accrued)}
                    icon={<Coins className="w-6 h-6 text-purple-600" />}
                    colorClass="bg-purple-50"
                    onClick={() => openDetails("Hisoblangan bonus", "bonus")}
                />
                <KpiCard
                    title="Vrachlarga bo'lingan"
                    value={formatCurrency(kpis.bonus_allocated)}
                    icon={<Users className="w-6 h-6 text-sky-600" />}
                    colorClass="bg-sky-50"
                    onClick={() => openDetails("Bo'lingan bonus", "allocated")}
                />
                <KpiCard
                    title="Bonus qoldig'i (To'lanishi k.)"
                    value={formatCurrency(kpis.bonus_balance)}
                    icon={<Wallet className="w-6 h-6 text-amber-600" />}
                    colorClass="bg-amber-50"
                    onClick={() => openDetails("Bonus qoldig'i", "balance")}
                />
                <KpiCard
                    title="Predinvest"
                    value={formatCurrency(kpis.total_predinvest)}
                    icon={<Banknote className="w-6 h-6 text-rose-600" />}
                    colorClass="bg-rose-50"
                    onClick={() => openDetails("Predinvest", "predinvest")}
                />
            </div>

            {/* Detail Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[80vh] overflow-hidden shadow-2xl flex flex-col">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-slate-800">{modalContent.title}</h3>
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                            >
                                <ChevronRight className="w-6 h-6 rotate-180" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <div className="bg-slate-50 rounded-2xl p-8 text-center text-slate-500">
                                <LayoutDashboard className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                <p className="font-medium">Detallashtirilgan ro'yxat tez orada qo'shiladi...</p>
                                <p className="text-xs mt-1">Ushbu ko'rsatkich bo'yicha barcha tranzaksiyalar va tahlillar shu yerda aks etadi.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mb-8">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Package className="w-5 h-5 text-blue-500" />
                            Mahsulotlar kesimida: Reja vs Fakt
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
                                    tick={{ fill: '#334155', fontSize: 13, fontWeight: 'medium' }}
                                    width={140}
                                />
                                <RechartsTooltip 
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value: any) => [formatCurrency(value || 0), ""]}
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                <Bar dataKey="plan_uzs" name="Reja (UZS)" fill="#e2e8f0" radius={[0, 4, 4, 0]} maxBarSize={30} />
                                <Bar dataKey="fact_uzs" name="Fakt (UZS)" fill="#3b82f6" radius={[0, 4, 4, 0]} maxBarSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </PageContainer>
    );
}

function KpiCard({ title, value, icon, colorClass, trend, trendUp, onClick }: {
    title: string;
    value: string;
    icon: React.ReactNode;
    colorClass: string;
    trend?: string;
    trendUp?: boolean;
    onClick?: () => void;
}) {
    return (
        <div 
            onClick={onClick}
            className={`bg-white rounded-2xl p-6 shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all cursor-pointer ${onClick ? 'hover:border-blue-200 active:scale-95' : ''}`}
        >
            <div className="flex justify-between items-start z-10 relative">
                <div className="flex-1">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
                    <h4 className="text-xl font-extrabold text-slate-800 mb-2 truncate" title={value}>{value}</h4>
                    {trend && (
                        <div className={`mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold ${trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                            {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            {trend}
                        </div>
                    )}
                </div>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${colorClass}`}>
                    {icon}
                </div>
            </div>
            
            {/* Hover Decor */}
            <div className="absolute right-[-10px] bottom-[-10px] opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-500 transform rotate-[-15deg]">
                {icon}
            </div>
            
            {/* Click affordance indicator */}
            <div className="absolute left-6 bottom-3 opacity-0 group-hover:opacity-100 transition-all duration-300">
                <span className="text-[9px] text-blue-500 font-bold flex items-center gap-0.5">
                    BATAFSIL <ChevronRight className="w-2.5 h-2.5" />
                </span>
            </div>
        </div>
    );
}
