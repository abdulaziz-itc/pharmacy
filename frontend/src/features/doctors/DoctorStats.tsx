import { useDoctorStore } from '@/store/doctorStore';

export default function DoctorStats() {
    const { getFilteredDoctors } = useDoctorStore();
    const doctors = getFilteredDoctors();

    const count = doctors.length;
    const totalPlan = doctors.reduce((acc, doc) => acc + doc.totalPlan, 0);
    const totalFact = doctors.reduce((acc, doc) => acc + doc.fact, 0);
    const totalBonus = doctors.reduce((acc, doc) => acc + doc.bonus, 0);
    const totalPaid = doctors.reduce((acc, doc) => acc + doc.bonusPaid, 0);
    const totalBalance = doctors.reduce((acc, doc) => acc + doc.bonusBalance, 0);
    const totalPreInvest = doctors.reduce((acc, doc) => acc + doc.preInvest, 0);
    const totalNetProfit = doctors.reduce((acc, doc) => acc + doc.netProfit, 0);

    const factPercent = totalPlan > 0 ? (totalFact / totalPlan) * 100 : 0;

    return (
        <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6">
            {/* Left side stats */}
            <div className="flex flex-wrap items-center gap-6 lg:gap-8">
                <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Кол-во</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-slate-900 leading-none">{count}</span>
                    </div>
                </div>
                <div className="hidden lg:block w-px h-10 bg-slate-100"></div>
                <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">План Общ.</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-slate-900 leading-none">{totalPlan.toLocaleString()}</span>
                        <span className="text-xs text-slate-500 font-bold">уп.</span>
                    </div>
                </div>
                <div className="hidden lg:block w-px h-10 bg-slate-100"></div>
                <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">План Общ. (Сум)</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-slate-900 leading-none">{doctors.reduce((acc, doc) => acc + (doc.totalPlanSum || 0), 0).toLocaleString()}</span>
                        <span className="text-xs text-slate-500 font-bold">сум</span>
                    </div>
                </div>
                <div className="hidden lg:block w-px h-10 bg-slate-100"></div>
                <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Факт Общ.</span>
                    <div className="flex items-center gap-3">
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-slate-900 leading-none">{totalFact.toLocaleString()}</span>
                            <span className="text-xs text-slate-500 font-bold">уп.</span>
                        </div>
                        <div className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-100 flex flex-col items-center justify-center">
                            <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider leading-none mb-0.5">Выполнено</span>
                            <span className="text-[11px] text-emerald-700 font-black leading-none">{factPercent.toFixed(1)}%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right side financial stats */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col min-w-[110px]">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Бонус</span>
                    <span className="text-base font-black text-amber-600 leading-none">{totalBonus.toLocaleString()}</span>
                </div>
                <div className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col min-w-[110px]">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Выплачено</span>
                    <span className="text-base font-black text-emerald-600 leading-none">{totalPaid.toLocaleString()}</span>
                </div>
                <div className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col min-w-[110px]">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Остаток</span>
                    <span className="text-base font-black text-orange-600 leading-none">{totalBalance.toLocaleString()}</span>
                </div>
                <div className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col min-w-[110px]">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Прединвест</span>
                    <span className="text-base font-black text-blue-600 leading-none">{totalPreInvest.toLocaleString()}</span>
                </div>
                <div className="px-5 py-3 rounded-xl bg-indigo-50 border border-indigo-100 flex flex-col min-w-[140px]">
                    <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider mb-1">Чистая прибыль</span>
                    <span className="text-lg font-black text-indigo-700 leading-none">{totalNetProfit.toLocaleString()}</span>
                </div>
            </div>
        </div>
    );
}
