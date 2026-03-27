import { useEffect, useState } from 'react';
import { PageContainer } from '../../components/PageContainer';
import { PageHeader } from '../../components/PageHeader';
import { DataTable } from '../../components/ui/data-table';
import { loginHistoryColumns } from './loginHistoryColumns';
import { useUserStore } from '../../store/userStore';
import { Button } from '../../components/ui/button';
import { Trash2, FilterX } from 'lucide-react';
import { DatePicker } from '../../components/ui/date-picker';
import { toast } from "sonner";

export default function LoginHistoryPage() {
    const { loginHistory, fetchLoginHistory, clearLoginHistory, isLoading } = useUserStore();
    const [startDate, setStartDate] = useState<Date | undefined>(undefined);
    const [endDate, setEndDate] = useState<Date | undefined>(undefined);

    useEffect(() => {
        // Format to YYYY-MM-DD to avoid toISOString() timezone shift to UTC
        const formatDate = (d: Date) => {
            const z = (n: number) => (n < 10 ? '0' : '') + n;
            return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
        };

        const start = startDate ? formatDate(startDate) : undefined;
        const end = endDate ? formatDate(endDate) : undefined;
        fetchLoginHistory(start, end);
    }, [fetchLoginHistory, startDate, endDate]);

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
        setStartDate(undefined);
        setEndDate(undefined);
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
                    {/* Date Filters */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-3">От</span>
                            <DatePicker 
                                date={startDate} 
                                setDate={setStartDate} 
                                placeholder="С даты"
                                className="w-[180px] rounded-2xl border-none shadow-sm hover:shadow-md transition-all"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">До</span>
                            <DatePicker 
                                date={endDate} 
                                setDate={setEndDate} 
                                placeholder="По дату"
                                className="w-[180px] rounded-2xl border-none shadow-sm hover:shadow-md transition-all"
                            />
                        </div>

                        {(startDate || endDate) && (
                            <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={resetFilters}
                                className="h-11 w-11 rounded-2xl hover:bg-rose-50 hover:text-rose-500 text-slate-400 transition-colors"
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
