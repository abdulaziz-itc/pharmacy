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

interface DashboardStats {
    total_sales: number;
    total_sales_change: string;
    active_doctors: number;
    active_doctors_change: string;
    pending_reservations: number;
    pending_reservations_label: string;
    total_debt: number;
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
    const { data: stats, isLoading } = useQuery<DashboardStats>({
        queryKey: ['dashboard-stats'],
        queryFn: async () => {
            const response = await api.get('/domain/analytics/dashboard/global');
            const data = response.data;
            return {
                total_sales: data.total_revenue,
                total_sales_change: "+12.5%", // These would be calculated if we passed previous month param
                active_doctors: data.total_items_sold, // Mapping items sold to second card for demonstration
                active_doctors_change: "+4.2%",
                pending_reservations: data.total_bonus_accrued,
                pending_reservations_label: "БОНУСЫ НАЧИСЛЕНЫ",
                total_debt: 0,
                total_debt_change: "-2.1%",
                revenue_forecast: [],
                recent_activities: [],
                growth_peak: "0%",
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

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Transparent Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
                        Обзор <span className="text-gradient">аналитики</span>
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">Мониторинг фармацевтических показателей в реальном времени.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative w-64 hidden lg:block">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input placeholder="Поиск метрик..." className="pl-9 bg-white/50 border-slate-200 rounded-xl" />
                    </div>
                    <Button variant="outline" size="icon" className="rounded-xl relative">
                        <Bell className="w-4 h-4" />
                        <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white shadow-sm" />
                    </Button>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-600/20 px-6 font-semibold">
                        Создать отчет
                    </Button>
                </div>
            </div>

            {/* High Impact Metrics Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                    title="Общие продажи"
                    value={`${stats?.total_sales.toLocaleString()} сум`}
                    change={stats?.total_sales_change}
                    isUp={true}
                    icon={TrendingUp}
                    color="blue"
                />
                <MetricCard
                    title="Количество проданных товаров"
                    value={stats?.active_doctors.toLocaleString()}
                    change={stats?.active_doctors_change}
                    isUp={true}
                    icon={Users}
                    color="indigo"
                />
                <MetricCard
                    title="Начисленные бонусы"
                    value={`${stats?.pending_reservations.toLocaleString()} сум`}
                    change={stats?.pending_reservations_label}
                    isUp={false}
                    icon={CalendarClock}
                    color="orange"
                    isStatic={true}
                />
                <MetricCard
                    title="Дебиторская задолженность"
                    value={`${stats?.total_debt.toLocaleString()} сум`}
                    change={stats?.total_debt_change}
                    isUp={false}
                    icon={Wallet}
                    color="rose"
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
                            <p className="text-4xl font-black text-blue-600 drop-shadow-sm tracking-tight">{stats?.growth_peak}</p>
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
                            {stats?.recent_activities.map((activity, index) => (
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

function MetricCard({ title, value, change, isUp, icon: Icon, color, isStatic }: any) {
    const colorClasses: any = {
        blue: "bg-blue-600/10 text-blue-600",
        indigo: "bg-indigo-600/10 text-indigo-600",
        orange: "bg-orange-600/10 text-orange-600",
        rose: "bg-rose-600/10 text-rose-600",
    };

    return (
        <Card className="border-none shadow-xl shadow-slate-200/40 group hover-lift overflow-hidden">
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


