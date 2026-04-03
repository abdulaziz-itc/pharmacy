import { useState, useRef, useEffect } from 'react';
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
    Activity,
    Warehouse,
    Shield,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuthStore } from '../store/authStore';
import { permissionsApi } from '../api/permissions';

const ALL_SIDEBAR_ITEMS = [
    { icon: LayoutDashboard, label: 'Дашборд', href: '/dashboard', sectionKey: 'dashboard' },
    { icon: Users, label: 'Управление пользователями', href: '/hrd/users', sectionKey: 'hrd' },
    { icon: UserCheck, label: 'Директор отдела кадров (HRD)', href: '/director/hrd', sectionKey: 'hrd' },
    { icon: Activity, label: 'История входов', href: '/hrd/login-history', sectionKey: 'login_history' },
    { icon: Wallet, label: 'Бонусы МП', href: '/bonuses', sectionKey: 'bonuses' },
    { icon: PieChart, label: 'Расширенные отчеты', href: '/reports', sectionKey: 'reports' },
    { icon: UserCheck, label: 'Зам. Директора', href: '/deputy-directors', sectionKey: 'deputy_directors' },
    { icon: UserCheck, label: 'Менеджеры по закупкам', href: '/head-of-orders-management', sectionKey: 'head_of_orders_mgmt' },
    { icon: UserCheck, label: 'Зав. складом', href: '/warehouse-users', sectionKey: 'warehouse_users' },
    { icon: UserCheck, label: 'Моя команда', href: '/product-managers/__USER_ID__', sectionKey: 'product_managers_team' },
    { icon: UserCheck, label: 'Менеджеры продукта', href: '/product-managers', sectionKey: 'product_managers' },
    { icon: Users, label: 'Мед представители', href: '/med-reps', sectionKey: 'med_reps' },
    { icon: Package, label: 'Продукты', href: '/products', sectionKey: 'products' },
    { icon: Map, label: 'Регионы', href: '/regions', sectionKey: 'regions' },
    { icon: Building2, label: 'Организации', href: '/med-orgs', sectionKey: 'med_orgs' },
    { icon: Factory, label: 'Производители', href: '/manufacturers', sectionKey: 'manufacturers' },
    { icon: Stethoscope, label: 'Врачи', href: '/doctors', sectionKey: 'doctors' },
    { icon: CalendarRange, label: 'Брони', href: '/reservations', sectionKey: 'reservations' },
    { icon: FileText, label: 'Фактура', href: '/invoices', sectionKey: 'invoices' },
    { icon: CreditCard, label: 'Дебиторка', href: '/debtors', sectionKey: 'debtors' },
    { icon: Wallet, label: 'Платежи', href: '/payments', sectionKey: 'payments' },
    { icon: PieChart, label: 'Статистика', href: '/stats', sectionKey: 'stats' },
    { icon: Activity, label: 'Журнал аудита', href: '/audit', sectionKey: 'audit' },
    // Head of Orders sections
    { icon: Factory, label: 'Произв. компании', href: '/head-of-orders?tab=manufacturers', sectionKey: 'head_of_orders_manufacturers' },
    { icon: CalendarRange, label: 'Брони', href: '/head-of-orders?tab=reservations', sectionKey: 'head_of_orders_reservations' },
    { icon: FileText, label: 'Фактура', href: '/head-of-orders?tab=invoices', sectionKey: 'head_of_orders_invoices' },
    { icon: CreditCard, label: 'Дебиторка', href: '/head-of-orders?tab=debitorka', sectionKey: 'head_of_orders_debitorka' },
    { icon: Building2, label: 'Оптовые компании', href: '/head-of-orders?tab=wholesale', sectionKey: 'head_of_orders_wholesale' },
    { icon: PieChart, label: 'Отчеты', href: '/head-of-orders?tab=reports', sectionKey: 'head_of_orders_reports' },
    // Warehouse
    { icon: Warehouse, label: 'Склады', href: '/warehouse', sectionKey: 'warehouse' },
    { icon: Activity, label: 'Удаление (План)', href: '/deletion-approval', sectionKey: 'deletion_approval' },
    { icon: Wallet, label: 'Бухгалтерия', href: '/accountant', sectionKey: 'accountant' },
];

// Investor-only items (always visible for investor, never shown in permission matrix)
const INVESTOR_ONLY_ITEMS = [
    { icon: Shield, label: 'Управление доступом', href: '/role-permissions', sectionKey: '__investor_only__' },
];


export function Sidebar() {
    const location = useLocation();
    const user = useAuthStore((state) => state.user);
    const [collapsed, setCollapsed] = useState(false);
    const [enabledSections, setEnabledSections] = useState<string[]>([]);
    const [permissionsLoaded, setPermissionsLoaded] = useState(false);
    const [logoUrl, setLogoUrl] = useState<string | null>(() => {
        return localStorage.getItem('sidebar-logo');
    });
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!user) return;
        // Try cache first for instant render
        const cached = localStorage.getItem(`permissions_${user.role}`);
        if (cached) {
            try {
                setEnabledSections(JSON.parse(cached));
                setPermissionsLoaded(true);
            } catch { /* ignore */ }
        }
        // Then fetch fresh from API
        permissionsApi.getMy().then(res => {
            setEnabledSections(res.sections);
            setPermissionsLoaded(true);
            localStorage.setItem(`permissions_${user.role}`, JSON.stringify(res.sections));
        }).catch(() => {
            // If API fails and no cache, show nothing
            if (!cached) setPermissionsLoaded(true);
        });
    }, [user?.id, user?.role]);

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

    const isInvestor = user?.role === 'investor';

    // Filter sidebar items based on enabled sections from backend
    const currentSidebarItems = permissionsLoaded
        ? [
            ...ALL_SIDEBAR_ITEMS
                .filter(item => {
                    // For accountant, force-enable common financial sections
                    if (user?.role === 'accountant') {
                        const accountantSections = ['dashboard', 'accountant', 'reports', 'stats', 'invoices', 'payments', 'debtors'];
                        if (accountantSections.includes(item.sectionKey)) return true;
                    }
                    return enabledSections.includes(item.sectionKey);
                })
                .map(item => ({
                    ...item,
                    href: item.href.replace('__USER_ID__', String(user?.id || '')),
                })),
            ...(isInvestor ? INVESTOR_ONLY_ITEMS : []),
          ]
        : [];


    return (
        <div
            className={cn(
                "flex flex-col h-full shrink-0 z-20 transition-all duration-500 ease-in-out relative overflow-hidden",
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
                "flex-1 py-4 space-y-0.5 overflow-y-auto sleek-scrollbar",
                collapsed ? "px-2" : "px-3"
            )}>
                {currentSidebarItems.map((item) => {
                    const Icon = item.icon;
                    const fullPath = location.pathname + location.search;
                    // For tab-based links (containing ?tab=), match full URL; otherwise match pathname prefix
                    const isCurrentlyActive = item.href.includes('?')
                        ? fullPath === item.href
                        : (item.href === '/product-managers'
                            ? location.pathname === item.href
                            : location.pathname.startsWith(item.href));

                    return (
                        <Link
                            key={item.href}
                            to={item.href}
                            title={collapsed ? item.label : undefined}
                            className={cn(
                                "group flex items-center rounded-xl transition-all duration-300 relative",
                                collapsed ? "px-0 py-3 justify-center" : "px-4 py-2.5",
                                isCurrentlyActive
                                    ? "bg-gradient-to-r from-indigo-600/90 to-violet-600/80 text-white shadow-lg shadow-indigo-600/25"
                                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                            )}
                        >
                            <Icon className={cn(
                                "shrink-0 transition-all duration-300",
                                collapsed ? "w-5 h-5" : "w-5 h-5 mr-3",
                                isCurrentlyActive
                                    ? "text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.4)]"
                                    : "text-slate-500 group-hover:text-indigo-400"
                            )} />
                            {!collapsed && (
                                <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
                            )}
                            {isCurrentlyActive && (
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
