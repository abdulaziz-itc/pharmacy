import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import {
    TrendingUp,
    Users,
    CalendarClock,
    Wallet,
    ArrowUpRight,
    ArrowDownRight,
    Search,
    Bell,
    Loader2
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { cn } from '../../lib/utils';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useEffect, useState } from 'react';
import { useRegionStore } from '../../store/regionStore';

interface DashboardStats {
    total_sales: number;
    total_sales_change: string;
    active_doctors: number;
    active_doctors_change: string;
    pending_reservations: number;
    pending_reservations_label: string;
    total_debt: number;
    total_overdue_debt?: number;
    total_debt_change: string;
    revenue_forecast: Array<{ month: string; value: number }>;
    recent_activities: Array<{
        title: string;
        desc: string;
        amount: string;
        time: string;
        color: string;
    }>;
    growth_peak: string;
}

export default function DashboardPage() {
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);
    const { regions, fetchRegions } = useRegionStore();

    const [selectedMonth, setSelectedMonth] = useState<number | undefined>(undefined);
    const [selectedYear, setSelectedYear] = useState<number | undefined>(undefined);
    const [selectedRegion, setSelectedRegion] = useState<string>('all');

    useEffect(() => {
        if (user?.role === 'med_rep') {
            navigate(`/med-reps/${user.id}`);
        }
        fetchRegions();
    }, [user, navigate, fetchRegions]);

    const { data: stats, isLoading, refetch } = useQuery<DashboardStats>({
        queryKey: ['dashboard-stats', selectedMonth, selectedYear, selectedRegion],
        queryFn: async () => {
            const params: any = { month: selectedMonth, year: selectedYear };
            if (selectedRegion !== 'all') {
                params.region_id = selectedRegion;
            }
            
            const isHRD = user?.role === 'hrd';
            const endpoint = isHRD ? '/dashboard/stats' : '/domain/analytics/dashboard/global';
            
            const response = await api.get(endpoint, {
                params
            });
            
            const data = response.data;
            
            // If it's HRD, the backend already returns the mapped DashboardStats
            if (isHRD) {
                return data;
            }
            
            // Otherwise, map the Global Analytics data to our DashboardStats interface
            // Now mapping the real dynamic values from backend
            return {
                total_sales: data.total_revenue,
                total_sales_change: data.revenue_change || "0%", 
                active_doctors: data.total_items_sold, 
                active_doctors_change: data.items_sold_change || "0%",
                pending_reservations: data.total_bonus_accrued,
                pending_reservations_label: "БОНУСЫ НАЧИСЛЕНЫ",
                total_debt: data.total_debt || 0,
                total_overdue_debt: data.total_overdue_debt || 0,
                total_debt_change: data.debt_change || "0%",
                revenue_forecast: [],
                recent_activities: data.recent_activities || [],
                growth_peak: data.growth_peak || "0%",
                completed_visits: 0,
                planned_visits: 0,
                bonus_balance: data.total_bonus_accrued
            };
        },
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-200px)]">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            </div>
        );
    }

    const months = [
        "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
        "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
    ];

    const canSeeAllRegions = ['director', 'deputy_director', 'admin', 'investor'].includes(user?.role || '');

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Transparent Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
                        Обзор <span className="text-gradient">аналитики</span>
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">
                        {(!selectedMonth || !selectedYear) 
                            ? "Мониторинг за все время." 
                            : `Мониторинг за ${months[selectedMonth-1]} ${selectedYear} года.`
                        }
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Region Filter */}
                    {(user?.role !== 'med_rep') && (
                        <select 
                            value={selectedRegion} 
                            onChange={(e) => setSelectedRegion(e.target.value)}
                            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                        >
                            <option value="all">{canSeeAllRegions ? "Все регионы" : "Мои регионы"}</option>
                            {regions.map((r) => (
                                <option key={r.id} value={r.id.toString()}>{r.name}</option>
                            ))}
                        </select>
                    )}

                    <select 
                        value={selectedMonth || ""} 
                        onChange={(e) => setSelectedMonth(e.target.value ? parseInt(e.target.value) : undefined)}
                        className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                    >
                        <option value="">Все месяцы</option>
                        {months.map((m, i) => (
                            <option key={i+1} value={i+1}>{m}</option>
                        ))}
                    </select>
                    <select 
                        value={selectedYear || ""} 
                        onChange={(e) => setSelectedYear(e.target.value ? parseInt(e.target.value) : undefined)}
                        className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                    >
                        <option value="">Все годы</option>
                        {[2024, 2025, 2026].map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>

                    <Button variant="outline" size="icon" className="rounded-xl relative">
                        <Bell className="w-4 h-4" />
                        <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white shadow-sm" />
                    </Button>
                    <Button 
                        onClick={async () => {
                            try {
                                const response = await api.get('/domain/analytics/dashboard/director-report-excel', {
                                    params: { month: selectedMonth, year: selectedYear },
                                    responseType: 'blob'
                                });
                                const url = window.URL.createObjectURL(new Blob([response.data]));
                                const link = document.createElement('a');
                                link.href = url;
                                link.setAttribute('download', `Director_Report_${selectedYear}_${selectedMonth}.xlsx`);
                                document.body.appendChild(link);
                                link.click();
                                link.remove();
                            } catch (error) {
                                console.error('Error downloading report:', error);
                            }
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-600/20 px-6 font-semibold"
                    >
                        Создать отчет
                    </Button>
                </div>
            </div>

            {/* High Impact Metrics Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                    title={user?.role === 'hrd' ? "Штат сотрудников" : "Общие продажи"}
                    value={user?.role === 'hrd' ? `${stats?.total_sales ?? 0}` : `${stats?.total_sales?.toLocaleString() ?? 0} сум`}
                    change={stats?.total_sales_change}
                    isUp={stats?.total_sales_change?.startsWith('+')}
                    icon={TrendingUp}
                    color="blue"
                    onClick={() => navigate(user?.role === 'hrd' ? '/hrd/users' : '/reports')}
                />
                <MetricCard
                    title={user?.role === 'hrd' ? "Охват врачей" : "Количество проданных товаров"}
                    value={stats?.active_doctors?.toLocaleString() ?? 0}
                    change={stats?.active_doctors_change}
                    isUp={stats?.active_doctors_change?.startsWith('+')}
                    icon={Users}
                    color="indigo"
                    onClick={() => navigate(user?.role === 'hrd' ? '/doctors' : '/reports')}
                />
                <MetricCard
                    title={user?.role === 'hrd' ? "Активность (24ч)" : "Начисленные бонусы"}
                    value={stats?.pending_reservations?.toLocaleString() ?? 0}
                    change={stats?.pending_reservations_label}
                    isUp={false}
                    icon={CalendarClock}
                    color="orange"
                    isStatic={true}
                    onClick={() => navigate(user?.role === 'hrd' ? '/hrd/login-history' : '/bonuses')}
                />
                <MetricCard
                    title={user?.role === 'hrd' ? "Выполнено визитов" : "Дебиторка"}
                    value={user?.role === 'hrd' ? stats?.total_debt?.toLocaleString() : `${stats?.total_debt?.toLocaleString() ?? 0} сум`}
                    change={stats?.total_debt_change}
                    isUp={!stats?.total_debt_change?.startsWith('+')} 
                    icon={Wallet}
                    color="rose"
                    onClick={() => navigate(user?.role === 'hrd' ? '/med-reps' : '/debtors')}
                    subValue={stats?.total_overdue_debt}
                    subLabel="Из них просрочено"
                />
            </div>

            <div className="grid gap-6 lg:grid-cols-7">
                {/* Visual Insight Section (Placeholder for Chart) */}
                <Card className="lg:col-span-4 border-none shadow-xl shadow-slate-200/50 overflow-hidden group hover-lift">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 bg-slate-50/50 border-b">
                        <div>
                            <CardTitle className="text-lg font-bold">Прогнозы выручки</CardTitle>
                            <p className="text-xs text-slate-500 font-medium">Квартальный прогноз продаж и рост</p>
                        </div>
                        <Button variant="ghost" size="sm" className="text-blue-600 font-bold hover:bg-blue-50">Подробнее</Button>
                    </CardHeader>
                    <CardContent className="h-[300px] flex items-center justify-center p-0 relative">
                        <div className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-blue-50 to-transparent opacity-50" />
                        <svg className="w-full h-full p-8" viewBox="0 0 400 150" preserveAspectRatio="none">
                            <defs>
                                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#2563eb" stopOpacity="0.4" />
                                    <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                                </linearGradient>
                            </defs>
                            <path
                                d="M0,120 Q50,60 100,90 T200,40 T300,70 T400,20 V150 H0 Z"
                                fill="url(#chartGradient)"
                            />
                            <path
                                d="M0,120 Q50,60 100,90 T200,40 T300,70 T400,20"
                                fill="none"
                                stroke="#2563eb"
                                strokeWidth="3"
                                className="drop-shadow-lg"
                            />
                        </svg>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                            <p className="text-4xl font-black text-blue-600 drop-shadow-sm tracking-tight">{stats?.growth_peak ?? "0%"}</p>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Пик роста</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Activity Feed Section */}
                <Card className="lg:col-span-3 border-none shadow-xl shadow-slate-200/50 hover-lift">
                    <CardHeader className="bg-slate-50/50 border-b">
                        <CardTitle className="text-lg font-bold">Последние события</CardTitle>
                        <p className="text-xs text-slate-500 font-medium tracking-tight">Журнал рыночной активности в реальном времени</p>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="space-y-6">
                            {stats?.recent_activities?.map((activity, index) => (
                                <ActivityItem
                                    key={index}
                                    title={activity.title}
                                    desc={activity.desc}
                                    amount={activity.amount}
                                    time={activity.time}
                                    color={activity.color}
                                />
                            ))}
                        </div>
                        <Button variant="outline" className="w-full mt-6 rounded-xl font-bold text-slate-600 hover:bg-slate-50">
                            Показать всю активность
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function MetricCard({ title, value, change, isUp, icon: Icon, color, isStatic, onClick, subValue, subLabel }: any) {
    const colorClasses: any = {
        blue: "bg-blue-600/10 text-blue-600",
        indigo: "bg-indigo-600/10 text-indigo-600",
        orange: "bg-orange-600/10 text-orange-600",
        rose: "bg-rose-600/10 text-rose-600",
    };

    return (
        <Card 
            onClick={onClick}
            className={cn(
                "border-none shadow-xl shadow-slate-200/40 group hover-lift overflow-hidden transition-all duration-300",
                onClick && "cursor-pointer hover:shadow-2xl hover:bg-slate-50/50"
            )}
        >
            <CardContent className="p-6 relative">
                <div className="flex justify-between items-start">
                    <div className={cn("p-3 rounded-2xl transition-transform duration-500 group-hover:rotate-12", colorClasses[color])}>
                        <Icon className="w-6 h-6" />
                    </div>
                    {!isStatic && (
                        <div className={cn(
                            "flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full",
                            isUp ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        )}>
                            {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {change}
                        </div>
                    )}
                    {isStatic && (
                        <div className="text-[10px] font-bold px-2 py-1 rounded-full bg-slate-100 text-slate-600 uppercase tracking-tighter">
                            {change}
                        </div>
                    )}
                </div>
                <div className="mt-6">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{title}</p>
                    <h3 className="text-3xl font-black text-slate-900 mt-1 tracking-tight">{value}</h3>
                    
                    {subLabel && subValue !== undefined && subValue > 0 && (
                        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col">
                            <span className="text-[10px] font-bold text-rose-500 uppercase tracking-tight">
                                {subLabel}:
                            </span>
                            <span className="text-sm font-black text-slate-700">
                                {subValue.toLocaleString()} сум
                            </span>
                        </div>
                    )}
                </div>
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-slate-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-700" />
            </CardContent>
        </Card>
    );
}

function ActivityItem({ title, desc, amount, time, color }: any) {
    const statusColors: any = {
        blue: "bg-blue-500",
        indigo: "bg-indigo-500",
        green: "bg-green-500",
        rose: "bg-rose-500",
        orange: "bg-orange-500",
    };

    return (
        <div className="flex items-center gap-4 group/item">
            <div className="relative">
                <div className={cn("w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-600 transition-colors group-hover/item:bg-slate-200")}>
                    {title.charAt(0)}
                </div>
                <div className={cn("absolute -bottom-1 -right-1 w-3.5 h-3.5 border-2 border-white rounded-full", statusColors[color] || "bg-slate-500")} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline gap-2">
                    <p className="text-sm font-bold text-slate-900 truncate tracking-tight">{title}</p>
                    <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">{time}</span>
                </div>
                <p className="text-xs text-slate-500 truncate mt-0.5">{desc}</p>
            </div>
            <div className={cn(
                "text-xs font-black tracking-tight ml-2",
                amount.includes('+') ? "text-green-600" : "text-slate-900"
            )}>
                {amount}
            </div>
        </div>
    );
}


