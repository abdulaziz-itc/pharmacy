import React from 'react';
import { ChevronDown, ChevronRight, Package, MapPin, User as UserIcon } from 'lucide-react';
import { useMedOrgStore } from '../../store/medOrgStore';

export const PharmacyStockTable: React.FC = () => {
    const { pharmacyStocks, fetchPharmacyStocks, isLoading } = useMedOrgStore();
    const [expandedRows, setExpandedRows] = React.useState<Record<number, boolean>>({});

    React.useEffect(() => {
        fetchPharmacyStocks();
    }, [fetchPharmacyStocks]);

    const toggleRow = (id: number) => {
        setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
    };

    if (isLoading && pharmacyStocks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-white/50 backdrop-blur-sm rounded-[32px] border border-white/20 shadow-xl">
                <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4" />
                <p className="text-slate-400 font-medium animate-pulse">Ma'lumotlar yuklanmoqda...</p>
            </div>
        );
    }

    if (pharmacyStocks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-white/50 backdrop-blur-sm rounded-[32px] border border-white/20 shadow-xl">
                <div className="p-4 bg-slate-50 rounded-full mb-4">
                    <Package className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-slate-500 font-medium">Aptekalarda tovar qoldiqlari topilmadi</p>
            </div>
        );
    }

    return (
        <div className="bg-white/70 backdrop-blur-md rounded-[32px] border border-white/40 shadow-2xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-separate border-spacing-0">
                    <thead>
                        <tr className="bg-slate-50/50">
                            <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-12">#</th>
                            <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-10"></th>
                            <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Kontragent</th>
                            <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Region</th>
                            <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Medpred</th>
                            <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right whitespace-nowrap">Obshch. Kol</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {pharmacyStocks.map((stock, idx) => (
                            <React.Fragment key={stock.id}>
                                <tr
                                    className={`group hover:bg-blue-50/50 transition-colors cursor-pointer ${expandedRows[stock.id] ? 'bg-blue-50/30' : ''}`}
                                    onClick={() => toggleRow(stock.id)}
                                >
                                    <td className="px-6 py-4 text-sm text-slate-500 font-medium">{idx + 1}</td>
                                    <td className="px-6 py-4">
                                        <div className="p-1 rounded-lg bg-slate-100 group-hover:bg-blue-100 transition-colors">
                                            {expandedRows[stock.id] ? (
                                                <ChevronDown className="w-4 h-4 text-slate-500 group-hover:text-blue-500" />
                                            ) : (
                                                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-blue-500" />
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold text-slate-700 leading-none mb-1">{stock.name}</span>
                                            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Apteka</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <MapPin className="w-3.5 h-3.5 text-blue-400" />
                                            <span className="text-sm font-medium">{stock.region}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <UserIcon className="w-3.5 h-3.5 text-purple-400" />
                                            <span className="text-sm font-medium">{stock.med_rep}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 font-bold text-sm border border-blue-100/50">
                                            {stock.total_quantity.toLocaleString()}
                                        </div>
                                    </td>
                                </tr>

                                {expandedRows[stock.id] && (
                                    <tr className="bg-slate-50/30">
                                        <td colSpan={6} className="px-12 py-4">
                                            <div className="space-y-3 p-4 bg-white/60 rounded-2xl border border-slate-100 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                                                {stock.items.map((item: any) => (
                                                    <div key={item.product_id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 bg-blue-50 rounded-lg">
                                                                <Package className="w-4 h-4 text-blue-500" />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-bold text-slate-700">{item.product_name}</span>
                                                                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Preparat</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Miqdor:</span>
                                                            <span className="text-sm font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md min-w-[40px] text-center">
                                                                {item.quantity} шт.
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
