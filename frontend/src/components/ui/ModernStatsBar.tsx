import React from 'react';
import { TrendingUp, CheckCircle, DollarSign, PieChart, Package, Plus, Wallet, CheckSquare } from 'lucide-react';

interface ModernStatsBarProps {
    stats: {
        totalAmount: number;
        paidAmount: number;
        debtAmount: number;
        creditAmount?: number; // New: total of overpayments
        resCount: number;
        tovarSkidkaCount?: number;
        tovarSkidkaAmount?: number;
        salaryAmount?: number;
        paidSalaryAmount?: number;
    };
    promoAmount: number;
    countLabel?: string;
    showPromo?: boolean;
    totalLabel?: string;
    showFinancials?: boolean;
    onCreditClick?: () => void; // New: callback for clicking Kreditorka card
}

export const ModernStatsBar: React.FC<ModernStatsBarProps> = ({ 
    stats, 
    promoAmount, 
    countLabel = "Кол-во (Брони)", 
    showPromo = true,
    totalLabel = "Общая продажа",
    showFinancials = true,
    onCreditClick
}) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3 mb-6">
            {/* Total Realization */}
            <div className="relative overflow-hidden bg-white rounded-2xl p-3 border border-slate-100 shadow-sm group hover:shadow-md transition-all duration-300">
                <div className="absolute -right-4 -top-4 w-20 h-20 bg-slate-50 rounded-full transition-transform group-hover:scale-110 duration-500" />
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center shadow-lg shadow-slate-900/20">
                            <TrendingUp className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-inter line-clamp-1">{totalLabel}</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-slate-900 font-inter">{stats.totalAmount.toLocaleString()}</span>
                        <span className="text-[9px] font-bold text-slate-400 font-inter">СУМ</span>
                    </div>
                </div>
            </div>

            {/* Paid Amount */}
            {showFinancials && (
                <div className="relative overflow-hidden bg-white rounded-2xl p-3 border border-slate-100 shadow-sm group hover:shadow-md transition-all duration-300">
                    <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-50 rounded-full transition-transform group-hover:scale-110 duration-500" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                <CheckCircle className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-inter">Оплачено</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-xl font-black text-emerald-600 font-inter">{stats.paidAmount.toLocaleString()}</span>
                            <span className="text-[9px] font-bold text-slate-400 font-inter">СУМ</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Debt Amount */}
            {showFinancials && (
                <div className="relative overflow-hidden bg-white rounded-2xl p-3 border border-slate-100 shadow-sm group hover:shadow-md transition-all duration-300">
                    <div className="absolute -right-4 -top-4 w-20 h-20 bg-rose-50 rounded-full transition-transform group-hover:scale-110 duration-500" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-xl bg-rose-500 flex items-center justify-center shadow-lg shadow-rose-500/20">
                                <DollarSign className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-inter">Задолженность</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-xl font-black text-rose-600 font-inter">{stats.debtAmount.toLocaleString()}</span>
                            <span className="text-[9px] font-bold text-slate-400 font-inter">СУМ</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Salary Amount */}
            {showFinancials && stats.salaryAmount !== undefined && (
                <div className="relative overflow-hidden bg-white rounded-2xl p-3 border border-slate-100 shadow-sm group hover:shadow-md transition-all duration-300">
                    <div className="absolute -right-4 -top-4 w-20 h-20 bg-blue-50/50 rounded-full transition-transform group-hover:scale-110 duration-500" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
                                <Wallet className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-inter">Зарплата</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-xl font-black text-blue-700 font-inter">{(stats.salaryAmount || 0).toLocaleString()}</span>
                            <span className="text-[9px] font-bold text-slate-400 font-inter">СУМ</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Paid Salary Amount */}
            {showFinancials && stats.paidSalaryAmount !== undefined && (
                <div className="relative overflow-hidden bg-white rounded-2xl p-3 border border-slate-100 shadow-sm group hover:shadow-md transition-all duration-300">
                    <div className="absolute -right-4 -top-4 w-20 h-20 bg-cyan-50/50 rounded-full transition-transform group-hover:scale-110 duration-500" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-xl bg-cyan-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                                <CheckSquare className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-inter">Опл. Зарплата</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-xl font-black text-cyan-600 font-inter">{(stats.paidSalaryAmount || 0).toLocaleString()}</span>
                            <span className="text-[9px] font-bold text-slate-400 font-inter">СУМ</span>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Credit Amount (Kreditorka) */}
            {showFinancials && stats.creditAmount !== undefined && (
                <div 
                    onClick={onCreditClick}
                    className={`relative overflow-hidden bg-white rounded-2xl p-3 border border-slate-100 shadow-sm group hover:shadow-md transition-all duration-300 ${onCreditClick ? 'cursor-pointer' : ''}`}
                >
                    <div className="absolute -right-4 -top-4 w-20 h-20 bg-indigo-50 rounded-full transition-transform group-hover:scale-110 duration-500" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                <Plus className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-inter italic">Кредиторка</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-xl font-black text-indigo-600 font-inter">{stats.creditAmount.toLocaleString()}</span>
                            <span className="text-[9px] font-bold text-slate-400 font-inter">СУМ</span>
                        </div>
                        {onCreditClick && stats.creditAmount > 0 && (
                            <div className="mt-1 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                                <span className="text-[7px] font-black text-indigo-400 uppercase tracking-tighter">Нажмите для деталей</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Promo Amount */}
            <div className="relative overflow-hidden bg-white rounded-2xl p-3 border border-slate-100 shadow-sm group hover:shadow-md transition-all duration-300">
                <div className="absolute -right-4 -top-4 w-20 h-20 bg-purple-50 rounded-full transition-transform group-hover:scale-110 duration-500" />
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-xl bg-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                            <PieChart className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-inter">Расходы на промо</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-purple-600 font-inter">{promoAmount.toLocaleString()}</span>
                        <span className="text-[9px] font-bold text-slate-400 font-inter">СУМ</span>
                    </div>
                </div>
            </div>

            {/* Resource Count */}
            <div className="relative overflow-hidden bg-white rounded-2xl p-3 border border-slate-100 shadow-sm group hover:shadow-md transition-all duration-300">
                <div className="absolute -right-4 -top-4 w-20 h-20 bg-blue-50 rounded-full transition-transform group-hover:scale-110 duration-500" />
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Package className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-inter">{countLabel}</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-blue-600 font-inter">{stats.resCount}</span>
                        <span className="text-[9px] font-bold text-slate-400 font-inter">ШТ.</span>
                    </div>
                </div>
            </div>

            {/* Tovar Skidka Stats (Conditionally shown) */}
            {stats.tovarSkidkaCount !== undefined && (
                <div className="relative overflow-hidden bg-white rounded-2xl p-3 border border-slate-100 shadow-sm group hover:shadow-md transition-all duration-300">
                    <div className="absolute -right-4 -top-4 w-20 h-20 bg-orange-50 rounded-full transition-transform group-hover:scale-110 duration-500" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                                <DollarSign className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-inter">Товарная скидка</span>
                        </div>
                        <div className="flex flex-col">
                            <div className="flex items-baseline gap-1">
                                <span className="text-lg font-black text-slate-900 font-inter">{(stats.tovarSkidkaAmount || 0).toLocaleString()}</span>
                                <span className="text-[8px] font-bold text-slate-400 tracking-tighter font-inter">СУМ</span>
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-xs font-black text-orange-600 font-inter">{stats.tovarSkidkaCount}</span>
                                <span className="text-[8px] font-bold text-slate-400 font-inter">ШТ.</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
