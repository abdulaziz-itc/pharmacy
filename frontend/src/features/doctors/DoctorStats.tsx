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
        <div className="flex flex-wrap items-center gap-4 p-3 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase shadow-sm overflow-x-auto whitespace-nowrap">
            <div className="flex items-center gap-2 px-3 border-r border-slate-200">
                <span className="text-slate-400">КОЛ-ВО:</span>
                <span className="text-slate-900 text-sm">{count}</span>
            </div>
            <div className="flex items-center gap-2 px-3 border-r border-slate-200">
                <span className="text-slate-400">ПЛАН ОБЩ:</span>
                <span className="text-slate-900 text-sm">{totalPlan.toLocaleString()} уп.</span>
            </div>
            <div className="flex items-center gap-2 px-3 border-r border-slate-200">
                <span className="text-slate-400">ФАКТ ОБЩ:</span>
                <div className="flex flex-col">
                    <span className="text-slate-900 text-sm">{totalFact.toLocaleString()} уп.</span>
                    <span className="text-[10px] text-emerald-600 font-bold">{factPercent.toFixed(1)}% выполнено</span>
                </div>
            </div>

            <div className="flex items-center gap-3 ml-auto">
                <div className="px-3 py-1.5 bg-yellow-400 text-black rounded-xl shadow-sm border border-yellow-500/20 flex flex-col items-center min-w-[100px]">
                    <span className="text-[9px] opacity-70 leading-none mb-1">БОНУС</span>
                    <span className="text-sm leading-none">{totalBonus.toLocaleString()}</span>
                </div>
                <div className="px-3 py-1.5 bg-emerald-500 text-white rounded-xl shadow-sm border border-emerald-600/20 flex flex-col items-center min-w-[100px]">
                    <span className="text-[9px] opacity-80 leading-none mb-1">ВЫПЛАЧЕНО</span>
                    <span className="text-sm leading-none">{totalPaid.toLocaleString()}</span>
                </div>
                <div className="px-3 py-1.5 bg-orange-500 text-white rounded-xl shadow-sm border border-orange-600/20 flex flex-col items-center min-w-[100px]">
                    <span className="text-[9px] opacity-80 leading-none mb-1">ОСТАТОК</span>
                    <span className="text-sm leading-none">{totalBalance.toLocaleString()}</span>
                </div>
                <div className="px-3 py-1.5 bg-blue-600 text-white rounded-xl shadow-sm border border-blue-700/20 flex flex-col items-center min-w-[110px]">
                    <span className="text-[9px] opacity-80 leading-none mb-1">ПРЕДИНВЕСТ</span>
                    <span className="text-sm leading-none">{totalPreInvest.toLocaleString()}</span>
                </div>
                <div className="px-4 py-2 bg-indigo-600 text-white rounded-xl shadow-md border border-indigo-700/20 flex flex-col items-center min-w-[140px] scale-110 origin-right transition-transform hover:scale-115">
                    <span className="text-[10px] opacity-90 leading-none mb-1">ЧИСТАЯ ПРИБЫЛЬ</span>
                    <span className="text-base leading-none font-black">{totalNetProfit.toLocaleString()}</span>
                </div>
            </div>
        </div>
    );
}
