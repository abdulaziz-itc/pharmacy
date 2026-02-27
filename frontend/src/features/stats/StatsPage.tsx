import { useEffect, useState, useMemo } from 'react';
import { PageContainer } from '../../components/PageContainer';
import { PageHeader } from '../../components/PageHeader';
import {
    BarChart3, TrendingUp, Users, Package, Wallet,
    ArrowUpRight, Target
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { getDoctorFacts, getPlans } from '../../api/sales';
import { useProductStore } from '../../store/productStore';
import { useMedRepStore } from '../../store/medRepStore';
import { useDoctorStore } from '../../store/doctorStore';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU').format(Math.round(value)) + ' UZS';
};

const formatShortCurrency = (value: number) => {
    if (value >= 1000000000) return (value / 1000000000).toFixed(1) + ' млрд';
    if (value >= 1000000) return (value / 1000000).toFixed(1) + ' млн';
    return new Intl.NumberFormat('ru-RU').format(Math.round(value));
};

export default function StatsPage() {
    const { products, fetchProducts } = useProductStore();
    const { medReps, fetchMedReps } = useMedRepStore();
    const { doctors, fetchDoctors } = useDoctorStore();

    const [isLoading, setIsLoading] = useState(true);
    const [salesFacts, setSalesFacts] = useState<any[]>([]);
    const [salesPlans, setSalesPlans] = useState<any[]>([]);

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                await Promise.all([
                    fetchProducts(),
                    fetchMedReps(),
                    fetchDoctors()
                ]);
                const currentMonth = new Date().getMonth() + 1;
                const currentYear = new Date().getFullYear();

                const [factsRes, plansRes] = await Promise.all([
                    getDoctorFacts(),
                    getPlans(currentMonth, currentYear)
                ]);
                setSalesFacts(factsRes);
                setSalesPlans(plansRes);
            } catch (error) {
                console.error("Error loading analytics data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [fetchProducts, fetchMedReps, fetchDoctors]);

    // Data Aggregation
    const analytics = useMemo(() => {
        // Global KPIs
        let totalPlanSum = 0;
        let totalFactSum = 0;
        let totalProfitSum = 0;

        const productMargins: Record<number, number> = {};
        const productPrices: Record<number, number> = {};
        const productNames: Record<number, string> = {};

        products.forEach(p => {
            productNames[p.id] = p.name;
            productPrices[p.id] = p.price || 0;
            productMargins[p.id] = (p.price || 0) - (p.production_price || 0) - (p.marketing_expense || 0) - (p.salary_expense || 0) - (p.other_expenses || 0);
        });

        // Unique Latest Plans per rep-doctor-product to avoid duplicate plan additions
        // Use latest plan id
        const sortedPlans = [...salesPlans].sort((a, b) => b.id - a.id);
        const uniquePlans: Record<string, any> = {};
        sortedPlans.forEach(p => {
            const key = `${p.med_rep_id}-${p.doctor_id || 0}-${p.product_id}`;
            if (!uniquePlans[key]) {
                uniquePlans[key] = p;
                const quantity = p.target_quantity || 0;
                totalPlanSum += quantity * (productPrices[p.product_id] || 0);
            }
        });

        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();

        const filteredFacts = salesFacts.filter(f => {
            if (!f.date) return false;
            const d = new Date(f.date);
            return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear;
        });

        // Per Product Aggregation
        const productDataMap: Record<number, { name: string; planQty: number; factQty: number; planUzs: number; factUzs: number }> = {};

        // Per Rep Aggregation
        const repDataMap: Record<number, { name: string; planUzs: number; factUzs: number }> = {};

        // Region Distribution
        const regionMap: Record<string, number> = {};

        products.forEach(p => {
            productDataMap[p.id] = { name: p.name, planQty: 0, factQty: 0, planUzs: 0, factUzs: 0 };
        });

        medReps.forEach(r => {
            repDataMap[r.id] = { name: r.full_name || r.username, planUzs: 0, factUzs: 0 };
        });

        doctors.forEach(d => {
            if (d.region) {
                regionMap[d.region] = (regionMap[d.region] || 0) + 1;
            }
        });

        Object.values(uniquePlans).forEach(p => {
            const productVal = (p.target_quantity || 0) * (productPrices[p.product_id] || 0);
            if (productDataMap[p.product_id]) {
                productDataMap[p.product_id].planQty += (p.target_quantity || 0);
                productDataMap[p.product_id].planUzs += productVal;
            }
            if (repDataMap[p.med_rep_id]) {
                repDataMap[p.med_rep_id].planUzs += productVal;
            }
        });

        filteredFacts.forEach(f => {
            const qty = f.quantity || 0;
            const pid = f.product_id;
            const rid = f.med_rep_id;
            const price = productPrices[pid] || 0;
            const margin = productMargins[pid] || 0;

            const saleUzs = qty * price;
            const profitVal = qty * margin;

            totalFactSum += saleUzs;
            totalProfitSum += profitVal;

            if (productDataMap[pid]) {
                productDataMap[pid].factQty += qty;
                productDataMap[pid].factUzs += saleUzs;
            }
            if (rid && repDataMap[rid]) {
                repDataMap[rid].factUzs += saleUzs;
            }
        });

        const fulfillment = totalPlanSum > 0 ? (totalFactSum / totalPlanSum) * 100 : 0;

        const productChartData = Object.values(productDataMap).filter(d => d.planQty > 0 || d.factQty > 0);
        const repChartData = Object.values(repDataMap).filter(d => d.planUzs > 0 || d.factUzs > 0);
        const regionChartData = Object.keys(regionMap).map(k => ({ name: k, value: regionMap[k] }));

        return {
            totalPlanSum,
            totalFactSum,
            totalProfitSum,
            fulfillment: fulfillment.toFixed(1),
            productChartData,
            repChartData,
            regionChartData
        };

    }, [salesFacts, salesPlans, products, medReps, doctors]);

    if (isLoading) {
        return (
            <PageContainer>
                <PageHeader title="Аналитика рынка" description="Загрузка данных..." />
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            </PageContainer>
        );
    }

    return (
        <PageContainer>
            <PageHeader
                title="Аналитика рынка"
                description={`Показатели продаж и статистика за текущий месяц (${new Date().toLocaleString('ru-RU', { month: 'long', year: 'numeric' })})`}
                buttonLabel="Экспорт данных"
            />

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <KpiCard
                    title="Фактические продажи"
                    value={formatCurrency(analytics.totalFactSum)}
                    icon={<Wallet className="w-6 h-6 text-blue-600" />}
                    colorClass="bg-blue-50"
                    trend={`${analytics.fulfillment}% выполнения`}
                    trendUp={parseFloat(analytics.fulfillment) >= 100}
                />
                <KpiCard
                    title="План продаж"
                    value={formatCurrency(analytics.totalPlanSum)}
                    icon={<Target className="w-6 h-6 text-indigo-600" />}
                    colorClass="bg-indigo-50"
                />
                <KpiCard
                    title="Чистая прибыль"
                    value={formatCurrency(analytics.totalProfitSum)}
                    icon={<TrendingUp className="w-6 h-6 text-emerald-600" />}
                    colorClass="bg-emerald-50"
                />
                <KpiCard
                    title="Активная база врачей"
                    value={doctors.length.toString()}
                    icon={<Users className="w-6 h-6 text-purple-600" />}
                    colorClass="bg-purple-50"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Product Sales Chart */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 lg:col-span-2">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Package className="w-5 h-5 text-blue-500" />
                            Выполнение плана по продуктам (UZS)
                        </h3>
                    </div>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analytics.productChartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 12 }}
                                    tickFormatter={formatShortCurrency}
                                />
                                <RechartsTooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value: number | undefined) => [formatCurrency(value || 0), ""]}
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                <Bar dataKey="planUzs" name="План (UZS)" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                <Bar dataKey="factUzs" name="Факт (UZS)" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Region Distribution Pie Chart */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-slate-800">
                            Врачи по регионам
                        </h3>
                    </div>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={analytics.regionChartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={110}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {analytics.regionChartData.map((_entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend layout="vertical" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '12px', marginTop: '10px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Rep Performance Chart */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-indigo-500" />
                        Эффективность представителей (План vs Факт)
                    </h3>
                </div>
                <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={analytics.repChartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                            <defs>
                                <linearGradient id="colorFact" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 12 }}
                                tickFormatter={formatShortCurrency}
                            />
                            <RechartsTooltip
                                formatter={(value: number | undefined) => [formatCurrency(value || 0), ""]}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                            <Area type="monotone" dataKey="planUzs" name="План" stroke="#94a3b8" fill="transparent" strokeDasharray="5 5" strokeWidth={2} />
                            <Area type="monotone" dataKey="factUzs" name="Факт" stroke="#10b981" fillOpacity={1} fill="url(#colorFact)" strokeWidth={3} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </PageContainer>
    );
}

function KpiCard({ title, value, icon, colorClass, trend, trendUp }: {
    title: string;
    value: string;
    icon: React.ReactNode;
    colorClass: string;
    trend?: string;
    trendUp?: boolean;
}) {
    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start z-10 relative">
                <div>
                    <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
                    <h4 className="text-2xl font-bold text-slate-800">{value}</h4>
                    {trend && (
                        <p className={`text-xs font-medium mt-2 flex items-center gap-1 ${trendUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {trendUp ? <ArrowUpRight className="w-3 h-3" /> : null}
                            {trend}
                        </p>
                    )}
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClass}`}>
                    {icon}
                </div>
            </div>
            {/* Background design element */}
            <div className="absolute right-0 bottom-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 transform translate-x-1/4 translate-y-1/4">
                {icon}
            </div>
        </div>
    );
}
