import { useEffect, useState, useMemo } from 'react';
import { PageContainer } from '../../components/PageContainer';
import { PageHeader } from '../../components/PageHeader';
import {
    BarChart3, TrendingUp, Users, Package, Wallet,
    ArrowUpRight, Target, LayoutDashboard, Coins, 
    HandCoins, Receipt, Banknote, ChevronRight,
    MapPin, UserCheck, Briefcase, FilterX, Search
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
    const { products, fetchProducts } = useProductStore();
    const { medReps, fetchMedReps } = useMedRepStore();
    const { doctors, fetchDoctors } = useDoctorStore();

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

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState<{ title: string; type: string; data: any[] }>({ title: '', type: '', data: [] });

    // Computed Data for Filters
    const productManagers = useMemo(() => {
        return medReps.filter(u => u.role === 'product_manager');
    }, [medReps]);

    const filteredMedReps = useMemo(() => {
        if (!selectedPMId) return medReps.filter(u => u.role === 'med_rep');
        return medReps.filter(u => u.role === 'med_rep' && u.manager_id === Number(selectedPMId));
    }, [medReps, selectedPMId]);

    const regions = useMemo(() => {
        const unique = new Map();
        doctors.forEach(d => {
            if (d.region) unique.set(d.region.id, d.region.name);
        });
        return Array.from(unique.entries()).map(([id, name]) => ({ id, name }));
    }, [doctors]);

    const clearFilters = () => {
        setSelectedPeriod('month');
        setCurrentMonth(new Date().getMonth() + 1);
        setCurrentYear(new Date().getFullYear());
        setSelectedRegionId('');
        setSelectedPMId('');
        setSelectedMedRepId('');
        setSelectedProductId('');
    };

    const openDetails = (title: string, type: string) => {
        let data: any[] = [];
        // Placeholder for details
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
                title="Kengaytirilgan tahlillar"
                description="Moliyaviy ko'rsatkichlar va savdo dinamikasi"
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
                                {p === 'month' ? 'Oy' : p === 'quarter' ? 'Kvartal' : p === 'year' ? 'Yil' : 'Barchasi'}
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
                                        <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('uz-UZ', { month: 'long' })}</option>
                                    ))}
                                </select>
                            )}

                            {selectedPeriod === 'quarter' && (
                                <select 
                                    value={currentQuarter}
                                    onChange={(e) => setCurrentQuarter(parseInt(e.target.value))}
                                    className="bg-slate-50 border-none rounded-xl px-4 py-2 text-sm font-semibold outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500"
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
                                className="bg-slate-50 border-none rounded-xl px-4 py-2 text-sm font-semibold outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500"
                            >
                                {[2024, 2025, 2026].map(y => (
                                    <option key={y} value={y}>{y}-yil</option>
                                ))}
                            </select>
                        </>
                    )}

                    <button 
                        onClick={clearFilters}
                        className="ml-auto flex items-center gap-2 px-4 py-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-all text-xs font-bold uppercase tracking-wider"
                    >
                        <FilterX className="w-4 h-4" />
                        Tozalash
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
                            <option value="">Barchasi</option>
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
                            <option value="">Barchasi</option>
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
                            <option value="">Barchasi</option>
                            {filteredMedReps.map(u => (
                                <option key={u.id} value={u.id}>{u.full_name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 flex items-center gap-1">
                            <Package className="w-3 h-3" /> Mahsulot (Dori)
                        </label>
                        <select 
                            value={selectedProductId}
                            onChange={(e) => setSelectedProductId(e.target.value)}
                            className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm font-medium outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 appearance-none"
                        >
                            <option value="">Barchasi</option>
                            {products.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {isLoading && !stats ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            ) : (
                <>
                    {/* Main KPI Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <KpiCard
                            title="Sotuv rejasi"
                            value={formatCurrency(kpis.sales_plan_amount)}
                            icon={<Target className="w-6 h-6 text-indigo-600" />}
                            colorClass="bg-indigo-50"
                            onClick={() => openDetails("Sotuv rejasi", "plan")}
                        />
                        <KpiCard
                            title="Haqiqiy tushum"
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
                            title="Kreditorka"
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
                            title="Bonus qoldig'i"
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

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mb-8">
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-xl font-extrabold text-slate-800 flex items-center gap-3">
                                    <div className="p-2 bg-blue-50 rounded-xl">
                                        <Package className="w-5 h-5 text-blue-600" />
                                    </div>
                                    Mahsulotlar dinamikasi
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
                                        <Bar dataKey="plan_uzs" name="Reja (UZS)" fill="#e2e8f0" radius={[0, 8, 8, 0]} maxBarSize={30} />
                                        <Bar dataKey="fact_uzs" name="Fakt (UZS)" fill="#3b82f6" radius={[0, 8, 8, 0]} maxBarSize={30} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Detail Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                    <div className="bg-white rounded-[40px] w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col scale-in-center">
                        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                            <h3 className="text-2xl font-black text-slate-800 tracking-tight">{modalContent.title}</h3>
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="p-3 hover:bg-slate-100 rounded-2xl transition-all group"
                            >
                                <ChevronRight className="w-8 h-8 rotate-180 text-slate-400 group-hover:text-slate-800" />
                            </button>
                        </div>
                        <div className="p-10 overflow-y-auto">
                            <div className="bg-slate-50/50 rounded-[32px] p-12 text-center text-slate-500 border-2 border-dashed border-slate-100">
                                <LayoutDashboard className="w-16 h-16 mx-auto mb-6 text-slate-200" />
                                <p className="text-lg font-bold text-slate-700">Detallashtirilgan tahlil</p>
                                <p className="text-sm mt-2 leading-relaxed max-w-sm mx-auto">Filtrlangan ma'lumotlar asosida batafsil ro'yxat va sub-tahlillar tez orada shu yerga ulanadi.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .scale-in-center {
                    animation: scale-in-center 0.3s cubic-bezier(0.250, 0.460, 0.450, 0.940) both;
                }
                @keyframes scale-in-center {
                    0% { transform: scale(0.9); opacity: 0; }
                    100% { transform: scale(1); opacity: 1; }
                }
            `}</style>
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
            className={`bg-white rounded-3xl p-7 shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 cursor-pointer ${onClick ? 'hover:border-blue-200 active:scale-[0.98]' : ''}`}
        >
            <div className="flex justify-between items-start z-10 relative">
                <div className="flex-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] mb-2">{title}</p>
                    <h4 className="text-2xl font-black text-slate-800 mb-2 truncate" title={value}>{value}</h4>
                    {trend && (
                        <div className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black ${trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                            {trendUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            {trend}
                        </div>
                    )}
                </div>
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform duration-500 ${colorClass}`}>
                    {icon}
                </div>
            </div>
            
            {/* Hover Decor */}
            <div className="absolute right-[-10px] bottom-[-10px] opacity-[0.03] group-hover:opacity-[0.1] transition-all duration-700 transform rotate-[-15deg] group-hover:rotate-[0deg] group-hover:scale-150">
                {icon}
            </div>
            
            {/* Visual indicator for interactive state */}
            <div className="absolute bottom-4 right-7 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                <ChevronRight className="w-4 h-4 text-blue-500" />
            </div>
        </div>
    );
}
