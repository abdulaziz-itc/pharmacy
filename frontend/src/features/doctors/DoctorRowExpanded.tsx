import React from 'react';
import type { Doctor } from '../../store/doctorStore';
import { getPlans, getDoctorFacts, getBonusPayments } from '../../api/sales';

interface DoctorRowExpandedProps {
    doctor: Doctor;
    month: number;
    year: number;
}

interface ProductRow {
    productId: number;
    productName: string;
    planQty: number;
    planSum: number;
    factQty: number;
    bonusPaid: number;
}

interface BonusRow {
    id: number;
    for_month: number;
    for_year: number;
    amount: number;
    paid_date: string;
    productName: string;
    notes?: string;
}

const MONTHS_RU = [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
];

export function DoctorRowExpanded({ doctor, month, year }: DoctorRowExpandedProps) {
    const [rows, setRows] = React.useState<ProductRow[]>([]);
    const [bonusRows, setBonusRows] = React.useState<BonusRow[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [tab, setTab] = React.useState<'plans' | 'bonuses'>('plans');

    React.useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [plans, facts, bonuses] = await Promise.all([
                    getPlans(month, year, undefined, doctor.id),
                    getDoctorFacts(undefined, doctor.id),
                    getBonusPayments(),
                ]);

                // All bonus payments for this doctor
                const doctorBonuses = bonuses.filter((bp: any) => bp.doctor_id === doctor.id);

                // Build bonus history rows (all months, not filtered)
                const bRows: BonusRow[] = doctorBonuses.map((bp: any) => ({
                    id: bp.id,
                    for_month: bp.for_month,
                    for_year: bp.for_year,
                    amount: bp.amount,
                    paid_date: String(bp.paid_date),
                    productName: bp.product?.name ?? (bp.product_id ? `Продукт #${bp.product_id}` : '—'),
                    notes: bp.notes,
                }));
                // Sort newest first
                bRows.sort((a, b) => b.for_year - a.for_year || b.for_month - a.for_month);
                setBonusRows(bRows);

                // Bonus per product for selected month/year
                const bonusByProduct: Record<number, number> = {};
                for (const bp of doctorBonuses) {
                    if (bp.product_id != null && bp.for_month === month && bp.for_year === year) {
                        bonusByProduct[bp.product_id] = (bonusByProduct[bp.product_id] ?? 0) + bp.amount;
                    }
                }

                // Plan map — use LATEST plan per product (avoid summing duplicates)
                const sortedPlans = [...plans].sort((a: any, b: any) => b.id - a.id);
                const planMap: Record<number, { name: string; planQty: number; planSum: number }> = {};
                for (const p of sortedPlans) {
                    const pid = p.product_id ?? p.product?.id;
                    if (!pid) continue;
                    const name = p.product?.name ?? `Продукт #${pid}`;
                    // overwrite: latest (highest id) plan wins — no double-counting
                    planMap[pid] = { name, planQty: p.target_quantity ?? 0, planSum: p.target_amount ?? 0 };
                }

                // Fact map (filter by month/year)
                const factMap: Record<number, number> = {};
                for (const f of facts) {
                    const pid = f.product_id;
                    if (!pid) continue;
                    if (f.date) {
                        const d = new Date(f.date);
                        if (d.getMonth() + 1 !== month || d.getFullYear() !== year) continue;
                    }
                    factMap[pid] = (factMap[pid] ?? 0) + (f.quantity ?? 0);
                }

                const productIds = [...new Set([
                    ...Object.keys(planMap).map(Number),
                    ...Object.keys(factMap).map(Number),
                ])];

                setRows(productIds.map(pid => ({
                    productId: pid,
                    productName: planMap[pid]?.name ?? `Продукт #${pid}`,
                    planQty: planMap[pid]?.planQty ?? 0,
                    planSum: planMap[pid]?.planSum ?? 0,
                    factQty: factMap[pid] ?? 0,
                    bonusPaid: bonusByProduct[pid] ?? 0,
                })));
            } catch (e) {
                console.error('DoctorRowExpanded fetch error', e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [doctor.id, month, year]);

    const fmt = (n: number) => new Intl.NumberFormat('ru-RU').format(n);
    const totalBonus = bonusRows.reduce((s, b) => s + b.amount, 0);

    return (
        <div className="bg-slate-50/50 p-6 shadow-inner border-y border-slate-100">
            <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-orange-400 to-orange-500 px-6 py-3 flex items-center gap-4 text-white shadow-sm">
                    <div className="bg-white/20 px-3 py-1.5 rounded-xl backdrop-blur-md">
                        <span className="font-black text-sm tracking-widest">{doctor.name}</span>
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-orange-50">Детализация</span>
                    <span className="ml-auto text-xs font-semibold text-orange-100 bg-white/10 px-3 py-1 rounded-lg">
                        {MONTHS_RU[month - 1]} {year}
                    </span>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-100">
                    <button
                        onClick={() => setTab('plans')}
                        className={`px-5 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${tab === 'plans' ? 'text-orange-500 border-b-2 border-orange-400' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        По препаратам
                    </button>
                    <button
                        onClick={() => setTab('bonuses')}
                        className={`px-5 py-3 text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2 ${tab === 'bonuses' ? 'text-fuchsia-600 border-b-2 border-fuchsia-400' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        История бонусов
                        {bonusRows.length > 0 && (
                            <span className="bg-fuchsia-100 text-fuchsia-700 text-[9px] font-black px-1.5 py-0.5 rounded-full">
                                {bonusRows.length}
                            </span>
                        )}
                    </button>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-sm text-slate-400 font-medium animate-pulse">Загрузка данных...</div>
                ) : tab === 'plans' ? (
                    // ── Plans tab ──
                    rows.length === 0 ? (
                        <div className="p-8 text-center text-sm text-slate-400 font-medium">Нет планов за {MONTHS_RU[month - 1]} {year}</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 border-b border-slate-100 text-[11px] font-black uppercase tracking-widest text-slate-400">
                                    <tr>
                                        <th className="px-6 py-3.5">№</th>
                                        <th className="px-6 py-3.5">Препарат</th>
                                        <th className="px-6 py-3.5 text-right">Мес. план (уп.)</th>
                                        <th className="px-6 py-3.5 text-right">Мес. план (сум)</th>
                                        <th className="px-6 py-3.5 text-right">Факт (уп.)</th>
                                        <th className="px-6 py-3.5 text-right">Выполн. %</th>
                                        <th className="px-6 py-3.5 text-right">Предынвест</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {rows.map((p, idx) => {
                                        const pct = p.planQty > 0 ? Math.round((p.factQty / p.planQty) * 100) : 0;
                                        return (
                                            <tr key={p.productId} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4 font-mono text-xs text-slate-400">{idx + 1}</td>
                                                <td className="px-6 py-4 font-bold text-slate-700 text-sm">{p.productName}</td>
                                                <td className="px-6 py-4 text-right font-bold text-slate-900 text-sm">{fmt(p.planQty)}</td>
                                                <td className="px-6 py-4 text-right font-semibold text-slate-500 text-sm">{fmt(p.planSum)}</td>
                                                <td className="px-6 py-4 text-right font-bold text-slate-900 text-sm">{fmt(p.factQty)}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className={`text-xs font-bold ${pct >= 100 ? 'text-emerald-600' : pct < 50 ? 'text-rose-500' : 'text-amber-500'}`}>{pct}%</span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {p.bonusPaid > 0 ? (
                                                        <span className="inline-flex px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-bold text-[10px] border border-amber-100">{fmt(p.bonusPaid)}</span>
                                                    ) : <span className="text-slate-300 text-xs">—</span>}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )
                ) : (
                    // ── Bonus history tab ──
                    bonusRows.length === 0 ? (
                        <div className="p-8 text-center text-sm text-slate-400 font-medium">Нет бонусных выплат для данного врача</div>
                    ) : (
                        <div>
                            {/* Total strip */}
                            <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-4 bg-fuchsia-50/50">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Итого выплачено</span>
                                <span className="text-base font-black text-fuchsia-700">{fmt(totalBonus)} UZS</span>
                                <span className="ml-2 text-[10px] font-semibold text-slate-400">за все периоды</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-auto min-w-full text-sm text-left table-auto">
                                    <colgroup>
                                        <col style={{ width: '130px' }} />
                                        <col style={{ width: '160px' }} />
                                        <col style={{ width: '140px' }} />
                                        <col style={{ width: '120px' }} />
                                        <col />
                                    </colgroup>
                                    <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        <tr>
                                            <th className="px-3 py-3">Период</th>
                                            <th className="px-3 py-3">Продукт</th>
                                            <th className="px-3 py-3 text-right">Сумма</th>
                                            <th className="px-3 py-3">Дата выплаты</th>
                                            <th className="px-3 py-3">Примечание</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {bonusRows.map(b => (
                                            <tr key={b.id} className="hover:bg-fuchsia-50/20 transition-colors">
                                                <td className="px-3 py-3">
                                                    <span className="font-bold text-fuchsia-700 text-xs">
                                                        {MONTHS_RU[b.for_month - 1]} {b.for_year}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3">
                                                    {b.productName !== '—' ? (
                                                        <span className="bg-violet-50 text-violet-700 border border-violet-200 rounded-lg px-2 py-0.5 text-[10px] font-semibold">
                                                            {b.productName}
                                                        </span>
                                                    ) : <span className="text-slate-300 text-xs">—</span>}
                                                </td>
                                                <td className="px-3 py-3 text-right font-black text-fuchsia-700">
                                                    {fmt(b.amount)}
                                                    <span className="text-[10px] text-slate-400 font-medium ml-1">UZS</span>
                                                </td>
                                                <td className="px-3 py-3 text-slate-500 text-xs">{b.paid_date}</td>
                                                <td className="px-3 py-3 text-slate-400 text-xs italic">{b.notes || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )
                )}
            </div>
        </div>
    );
}
