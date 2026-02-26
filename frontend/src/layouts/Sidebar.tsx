import { useState, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    Package,
    Map,
    Building2,
    Stethoscope,
    CalendarRange,
    FileText,
    CreditCard,
    Wallet,
    PieChart,
    Factory,
    UserCheck,
    ChevronLeft,
    ChevronRight,
    ImagePlus,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuthStore } from '../store/authStore';

const sidebarItems = [
    { icon: LayoutDashboard, label: 'Дашборд', href: '/dashboard' },
    { icon: UserCheck, label: 'Менеджеры продукта', href: '/product-managers' },
    { icon: Users, label: 'Мед представители', href: '/med-reps' },
    { icon: Package, label: 'Продукты', href: '/products' },
    { icon: Map, label: 'Регионы', href: '/regions' },
    { icon: Building2, label: 'Организации', href: '/med-orgs' },
    { icon: Factory, label: 'Производители', href: '/manufacturers' },
    { icon: Stethoscope, label: 'Врачи', href: '/doctors' },
    { icon: CalendarRange, label: 'Брони', href: '/reservations' },
    { icon: FileText, label: 'Инвойсы', href: '/invoices' },
    { icon: Wallet, label: 'Платежи', href: '/payments' },
    { icon: CreditCard, label: 'Дебиторы', href: '/debtors' },
    { icon: PieChart, label: 'Статистика', href: '/stats' },
];

export function Sidebar() {
    const location = useLocation();
    const user = useAuthStore((state) => state.user);
    const [collapsed, setCollapsed] = useState(false);
    const [logoUrl, setLogoUrl] = useState<string | null>(() => {
        return localStorage.getItem('sidebar-logo');
    });
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                setLogoUrl(result);
                localStorage.setItem('sidebar-logo', result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleLogoClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div
            className={cn(
                "flex flex-col h-full shrink-0 z-20 transition-all duration-500 ease-in-out relative",
                "bg-gradient-to-b from-[#0f172a] via-[#1e1b4b] to-[#0f172a]",
                "shadow-[4px_0_24px_-2px_rgba(99,102,241,0.15)]",
                collapsed ? "w-20" : "w-64"
            )}
        >
            {/* Subtle decorative glow */}
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-violet-500/5 to-transparent pointer-events-none" />

            {/* Collapse toggle */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className={cn(
                    "absolute -right-3 top-20 z-30 w-6 h-6 rounded-full",
                    "bg-gradient-to-br from-indigo-500 to-violet-600",
                    "flex items-center justify-center",
                    "shadow-lg shadow-indigo-500/30",
                    "hover:shadow-indigo-500/50 hover:scale-110",
                    "transition-all duration-300",
                    "border-2 border-[#0f172a]"
                )}
            >
                {collapsed
                    ? <ChevronRight className="w-3 h-3 text-white" />
                    : <ChevronLeft className="w-3 h-3 text-white" />
                }
            </button>

            {/* Logo / Brand */}
            <div className={cn("p-6 relative z-10", collapsed ? "px-3" : "p-6")}>
                <div className={cn(
                    "flex items-center gap-3 transition-all duration-300",
                    collapsed && "justify-center"
                )}>
                    {/* Logo area - clickable to change */}
                    <div
                        onClick={handleLogoClick}
                        className={cn(
                            "relative group cursor-pointer shrink-0",
                            "w-11 h-11 rounded-xl overflow-hidden",
                            "bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600",
                            "flex items-center justify-center",
                            "shadow-lg shadow-indigo-500/40",
                            "hover:shadow-indigo-400/60 hover:scale-105",
                            "transition-all duration-300",
                            "ring-2 ring-white/10"
                        )}
                        title="Нажмите чтобы загрузить логотип"
                    >
                        {logoUrl ? (
                            <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                            <Package className="w-6 h-6 text-white" />
                        )}
                        {/* Overlay on hover */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                            <ImagePlus className="w-4 h-4 text-white" />
                        </div>
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoChange}
                    />

                    {!collapsed && (
                        <div className="overflow-hidden transition-all duration-300">
                            <h1 className="text-lg font-bold tracking-tight text-white leading-none whitespace-nowrap">
                                Pharma ERP
                            </h1>
                            <p className="text-[10px] text-indigo-300 font-semibold uppercase tracking-wider mt-1 whitespace-nowrap">
                                {user?.role === 'admin' ? 'Админ' : user?.role || 'Гость'}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Divider */}
            <div className={cn("mx-4 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent", collapsed && "mx-2")} />

            {/* Navigation */}
            <nav className={cn(
                "flex-1 py-4 space-y-0.5 overflow-y-auto custom-scrollbar",
                collapsed ? "px-2" : "px-3"
            )}>
                {sidebarItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname.startsWith(item.href);

                    return (
                        <Link
                            key={item.href}
                            to={item.href}
                            title={collapsed ? item.label : undefined}
                            className={cn(
                                "group flex items-center rounded-xl transition-all duration-300 relative",
                                collapsed ? "px-0 py-3 justify-center" : "px-4 py-2.5",
                                isActive
                                    ? "bg-gradient-to-r from-indigo-600/90 to-violet-600/80 text-white shadow-lg shadow-indigo-600/25"
                                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                            )}
                        >
                            <Icon className={cn(
                                "shrink-0 transition-all duration-300",
                                collapsed ? "w-5 h-5" : "w-5 h-5 mr-3",
                                isActive
                                    ? "text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.4)]"
                                    : "text-slate-500 group-hover:text-indigo-400"
                            )} />
                            {!collapsed && (
                                <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
                            )}
                            {isActive && (
                                <div className={cn(
                                    "rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]",
                                    collapsed
                                        ? "absolute -right-0.5 top-1/2 -translate-y-1/2 w-1 h-4 rounded-l-full"
                                        : "ml-auto w-1.5 h-1.5"
                                )} />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            {!collapsed && (
                <div className="p-5 mt-auto relative z-10">
                    <div className="p-3 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm">
                        <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-0.5">Версия</p>
                        <p className="text-xs text-indigo-300 font-medium">v4.2.0-stable</p>
                    </div>
                    <div className="mt-3 text-[10px] text-center text-slate-600 font-medium">
                        &copy; 2026 Pharma System
                    </div>
                </div>
            )}
        </div>
    );
}
