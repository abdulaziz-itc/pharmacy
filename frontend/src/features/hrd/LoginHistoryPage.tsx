import { useEffect, useState } from 'react';
import { PageContainer } from '../../components/PageContainer';
import { PageHeader } from '../../components/PageHeader';
import { DataTable } from '../../components/ui/data-table';
import { loginHistoryColumns } from './loginHistoryColumns';
import { useUserStore } from '../../store/userStore';
import { Button } from '../../components/ui/button';
import { Trash2, FilterX, Calendar } from 'lucide-react';
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "../../components/ui/select";
import { toast } from "sonner";

const MONTHS = [
    { value: 1, label: "Январь" },
    { value: 2, label: "Февраль" },
    { value: 3, label: "Март" },
    { value: 4, label: "Апрель" },
    { value: 5, label: "Май" },
    { value: 6, label: "Июнь" },
    { value: 7, label: "Июль" },
    { value: 8, label: "Август" },
    { value: 9, label: "Сентябрь" },
    { value: 10, label: "Октябрь" },
    { value: 11, label: "Ноябрь" },
    { value: 12, label: "Декабрь" },
];

const YEARS = [2024, 2025, 2026, 2027];

export default function LoginHistoryPage() {
    const { loginHistory, fetchLoginHistory, clearLoginHistory, isLoading } = useUserStore();
    
    // Default to current month and year
    const now = new Date();
    const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());

    useEffect(() => {
        fetchLoginHistory(selectedMonth, selectedYear);
    }, [fetchLoginHistory, selectedMonth, selectedYear]);

    const handleClearHistory = async () => {
        if (window.confirm('Вы уверены, что хотите очистить всю историю входов? Bu amalni ortga qaytarib bo\'lmaydi.')) {
            try {
                await clearLoginHistory();
                toast.success('История успешно очищена');
            } catch (err) {
                toast.error('Ошибка при очистке истории');
            }
        }
    };

    const resetFilters = () => {
        setSelectedMonth(now.getMonth() + 1);
        setSelectedYear(now.getFullYear());
    };

    return (
        <PageContainer>
            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 mb-10">
                <PageHeader
                    title="История входов"
                    description="Мониторинг активности пользователей: время входа, IP-адрес и используемые устройства."
                    className="mb-0"
                />
                
                <div className="flex flex-wrap items-center gap-4 bg-white/40 backdrop-blur-md p-2 rounded-[2rem] border border-white/40 shadow-sm">
                    {/* Month/Year Filters */}
                    <div className="flex items-center gap-3 px-2">
                        <div className="flex items-center gap-3">
                            <Calendar className="w-4 h-4 text-indigo-500 ml-1" />
                            
                            <Select 
                                value={selectedMonth.toString()} 
                                onValueChange={(val) => setSelectedMonth(parseInt(val))}
                            >
                                <SelectTrigger className="w-[140px] h-11 rounded-2xl border-none bg-white/50 shadow-sm hover:shadow-md transition-all font-bold text-slate-700">
                                    <SelectValue placeholder="Месяц" />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-slate-100 shadow-2xl">
                                    {MONTHS.map((m) => (
                                        <SelectItem key={m.value} value={m.value.toString()} className="rounded-xl font-bold">
                                            {m.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select 
                                value={selectedYear.toString()} 
                                onValueChange={(val) => setSelectedYear(parseInt(val))}
                            >
                                <SelectTrigger className="w-[110px] h-11 rounded-2xl border-none bg-white/50 shadow-sm hover:shadow-md transition-all font-bold text-slate-700">
                                    <SelectValue placeholder="Год" />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-slate-100 shadow-2xl">
                                    {YEARS.map((y) => (
                                        <SelectItem key={y} value={y.toString()} className="rounded-xl font-bold">
                                            {y}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {(selectedMonth !== now.getMonth() + 1 || selectedYear !== now.getFullYear()) && (
                            <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={resetFilters}
                                className="h-11 w-11 rounded-2xl hover:bg-rose-50 hover:text-rose-500 text-slate-400 transition-colors"
                                title="Сбросить к текущему месяцу"
                            >
                                <FilterX className="h-5 w-5" />
                            </Button>
                        )}
                    </div>

                    <div className="h-8 w-px bg-slate-200/50 hidden md:block" />

                    {/* Clear Button */}
                    <Button
                        variant="destructive"
                        onClick={handleClearHistory}
                        className="h-11 px-6 rounded-2xl bg-gradient-to-br from-rose-500 via-rose-600 to-red-600 hover:from-rose-600 hover:to-red-700 shadow-lg shadow-rose-500/20 border-none font-bold transition-all active:scale-95 flex gap-2 group"
                        disabled={isLoading}
                    >
                        <Trash2 className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                        <span>Очистить историю</span>
                    </Button>
                </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)] border border-white/60 overflow-hidden hover-lift transition-all duration-700">
                <DataTable
                    columns={loginHistoryColumns}
                    data={loginHistory}
                    searchColumn="user.full_name"
                    isLoading={isLoading}
                />
            </div>
        </PageContainer>
    );
}
