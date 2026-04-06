import React from 'react';
import { ChevronDown } from 'lucide-react';
import { useRegionStore } from '../../store/regionStore';
import { useMedOrgStore } from '../../store/medOrgStore';

export default function MedOrgFilters() {
    const { regions, fetchRegions } = useRegionStore();
    const { fetchMedOrgs } = useMedOrgStore();

    React.useEffect(() => {
        fetchRegions();
    }, [fetchRegions]);

    const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        fetchMedOrgs(value ? parseInt(value) : undefined);
    };

    return (
        <>
            <div className="flex flex-col gap-1.5 min-w-[200px]">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                    Регион
                </label>
                <div className="relative group">
                    <select
                        onChange={handleRegionChange}
                        className="w-full h-10 px-4 pr-10 rounded-xl border border-slate-200 bg-slate-50/50 text-[11px] font-bold text-slate-700 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all appearance-none cursor-pointer hover:bg-white"
                    >
                        <option value="">Все регионы</option>
                        {regions.map((region) => (
                            <option key={region.id} value={region.id}>
                                {region.name}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors pointer-events-none" />
                </div>
            </div>
        </>
    );
}
