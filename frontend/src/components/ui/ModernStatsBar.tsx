import React from 'react';
import { TrendingUp, CheckCircle, DollarSign, PieChart, Package } from 'lucide-react';

interface ModernStatsBarProps {
    stats: {
        totalAmount: number;
        paidAmount: number;
        debtAmount: number;
        resCount: number;
        tovarSkidkaCount?: number;
        tovarSkidkaAmount?: number;
    };
    promoAmount: number;
    countLabel?: string;
    showPromo?: boolean;
    totalLabel?: string;
    showFinancials?: boolean;
}

export const ModernStatsBar: React.FC<ModernStatsBarProps> = ({ 
    stats, 
    promoAmount, 
    countLabel = "Кол-во (Брони)", 
    showPromo = true,
    totalLabel = "Общая продажа",
    showFinancials = true
}) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            {/* Total Realization */}
            <div className="relative overflow-hidden bg-white rounded-3xl p-5 border border-slate-100 shadow-sm group hover:shadow-md transition-all duration-300">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-slate-50 rounded-full transition-transform group-hover:scale-110 duration-500" />
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg shadow-slate-900/20">
                            <TrendingUp className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-inter">{totalLabel}</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-slate-900 font-inter">{stats.totalAmount.toLocaleString()}</span>
                        <span className="text-[10px] font-bold text-slate-400 font-inter">СУМ</span>
                    </div>
                </div>
            </div>

            {/* Paid Amount */}
            {showFinancials && (
                <div className="relative overflow-hidden bg-white rounded-3xl p-5 border border-slate-100 shadow-sm group hover:shadow-md transition-all duration-300">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-50 rounded-full transition-transform group-hover:scale-110 duration-500" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                <CheckCircle className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-inter">Оплачено</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-emerald-600 font-inter">{stats.paidAmount.toLocaleString()}</span>
                            <span className="text-[10px] font-bold text-slate-400 font-inter">СУМ</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Debt Amount */}
            {showFinancials && (
                <div className="relative overflow-hidden bg-white rounded-3xl p-5 border border-slate-100 shadow-sm group hover:shadow-md transition-all duration-300">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-rose-50 rounded-full transition-transform group-hover:scale-110 duration-500" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-2xl bg-rose-500 flex items-center justify-center shadow-lg shadow-rose-500/20">
                                <DollarSign className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-inter">Задолженность</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-rose-600 font-inter">{stats.debtAmount.toLocaleString()}</span>
                            <span className="text-[10px] font-bold text-slate-400 font-inter">СУМ</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Promo Amount */}
            <div className="relative overflow-hidden bg-white rounded-3xl p-5 border border-slate-100 shadow-sm group hover:shadow-md transition-all duration-300">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-50 rounded-full transition-transform group-hover:scale-110 duration-500" />
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-2xl bg-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                            <PieChart className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-inter">Расходы на промо</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-purple-600 font-inter">{promoAmount.toLocaleString()}</span>
                        <span className="text-[10px] font-bold text-slate-400 font-inter">СУМ</span>
                    </div>
                </div>
            </div>

            {/* Resource Count */}
            <div className="relative overflow-hidden bg-white rounded-3xl p-5 border border-slate-100 shadow-sm group hover:shadow-md transition-all duration-300">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-50 rounded-full transition-transform group-hover:scale-110 duration-500" />
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Package className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-inter">{countLabel}</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-blue-600 font-inter">{stats.resCount}</span>
                        <span className="text-[10px] font-bold text-slate-400 font-inter">ШТ.</span>
                    </div>
                </div>
            </div>

            {/* Tovar Skidka Stats (Conditionally shown) */}
            {stats.tovarSkidkaCount !== undefined && (
                <div className="relative overflow-hidden bg-white rounded-3xl p-5 border border-slate-100 shadow-sm group hover:shadow-md transition-all duration-300 col-span-full lg:col-span-1">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-orange-50 rounded-full transition-transform group-hover:scale-110 duration-500" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                                <DollarSign className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-[#f97316] font-inter">Товарная скидка</span>
                        </div>
                        <div className="flex flex-col">
                            <div className="flex items-baseline gap-1">
                                <span className="text-xl font-black text-slate-900 font-inter">{(stats.tovarSkidkaAmount || 0).toLocaleString()}</span>
                                <span className="text-[9px] font-bold text-slate-400 tracking-tighter font-inter">СУМ</span>
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-sm font-black text-orange-600 font-inter">{stats.tovarSkidkaCount}</span>
                                <span className="text-[9px] font-bold text-slate-400 font-inter">ШТ.</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
