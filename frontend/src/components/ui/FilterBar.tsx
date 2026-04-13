import React, { useEffect, useState } from 'react';
import { DateInput } from './date-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Input } from './input';
import { Button } from './button';
import { Search, Check, ChevronDown } from 'lucide-react';
import api from '@/api/axios';
import { useAuthStore } from '@/store/authStore';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { cn } from '@/lib/utils';
import { SearchableSelect } from './searchable-select';

export interface FilterValues {
    dateStart: string;
    dateEnd: string;
    selectedMedRep: string;
    selectedRegion: string;
    selectedCompany: string;
    selectedType: string;
    selectedInvoiceType: string;
    invNumSearch: string;
    onlyOverdue?: boolean;
}

interface FilterBarProps {
    values: FilterValues;
    onChange: (values: FilterValues) => void;
    onSearch: () => void;
    onReset?: () => void;
}

const FILTER_ORG_TYPES = [
    { label: 'Аптека', value: 'pharmacy' },
    { label: 'Больница', value: 'hospital' },
    { label: 'Клиника', value: 'clinic' },
    { label: 'Прочее', value: 'other' },
].sort((a, b) => a.label.localeCompare(b.label));

export const FilterBar: React.FC<FilterBarProps> = ({ values, onChange, onSearch, onReset }) => {
    const user = useAuthStore((state) => state.user);
    const isMedRep = user?.role === 'med_rep';

    const [medReps, setMedReps] = useState<{id: number, name: string}[]>([]);
    const [companies, setCompanies] = useState<{id: number, name: string}[]>([]);
    const [regions, setRegions] = useState<{id: number, name: string}[]>([]);

    useEffect(() => {
        const loadOptions = async () => {
            // Regions
            try {
                const regionsRes = await api.get('/crm/regions/');
                const data = Array.isArray(regionsRes.data) ? regionsRes.data : [];
                setRegions(data.map((r: any) => ({ id: r.id, name: r.name })).sort((a: any, b: any) => a.name.localeCompare(b.name)));
            } catch (error) {
                console.error("Failed to load regions", error);
            }

            // Med Orgs
            try {
                const orgsRes = await api.get('/crm/med-orgs/', { params: { limit: 1000 } });
                const orgs = Array.isArray(orgsRes.data) ? orgsRes.data : (orgsRes.data?.items || []);
                setCompanies(orgs.map((o: any) => ({ id: o.id, name: o.name })).filter((o: any) => o.name).sort((a: any, b: any) => a.name.localeCompare(b.name)));
            } catch (error) {
                console.error("Failed to load company options", error);
            }

            // Users (only if permitted roles)
            const permittedRoles = ['admin', 'director', 'deputy_director', 'head_of_orders', 'product_manager', 'field_force_manager', 'regional_manager'];
            if (user?.role && permittedRoles.includes(user.role)) {
                try {
                    const usersRes = await api.get('/users/', { params: { limit: 1000 } });
                    const users = Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data?.items || []);
                    const medRepOptions = users
                        .filter((u: any) => u.role === 'med_rep')
                        .map((u: any) => ({ id: u.id, name: u.full_name || u.username }))
                        .filter((u: any) => u.name)
                        .sort((a: any, b: any) => a.name.localeCompare(b.name));
                    setMedReps(medRepOptions);
                } catch (error) {
                    console.error("Failed to load med rep options", error);
                }
            } else if (isMedRep && user?.full_name) {
                // For Med Rep, they only see themselves
                setMedReps([{ id: user.id || 0, name: user.full_name }]);
            }
        };
        loadOptions();
    }, [user, isMedRep]);

    // Effect to lock Med Rep if user is med_rep
    useEffect(() => {
        if (isMedRep && user?.id && values.selectedMedRep !== user.id.toString()) {
            onChange({ ...values, selectedMedRep: user.id.toString() });
        }
    }, [isMedRep, user, values.selectedMedRep, onChange, values]);

    const handleChange = (field: keyof FilterValues, value: string) => {
        onChange({ ...values, [field]: value });
    };

    return (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6">
            <div className="flex flex-wrap gap-4 items-end">
                {/* Date Start */}
                <div className="flex flex-col space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ДАТА НАЧАЛА</p>
                    <DateInput 
                        value={values.dateStart} 
                        onChange={(val) => handleChange('dateStart', val)} 
                        placeholder="Начало" 
                    />
                </div>

                {/* Date End */}
                <div className="flex flex-col space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ДАТА КОНЦА</p>
                    <DateInput 
                        value={values.dateEnd} 
                        onChange={(val) => handleChange('dateEnd', val)} 
                        placeholder="Конец" 
                    />
                </div>

                {/* Region */}
                {user?.role !== 'med_rep' && (
                    <div className="flex flex-col space-y-1 min-w-[140px] flex-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                            {['admin', 'director', 'deputy_director', 'investor'].includes(user?.role || '') ? "РЕГИОН" : "МОИ РЕГИОНЫ"}
                        </p>
                        <SearchableSelect
                            options={regions.map(r => ({ value: r.id.toString(), label: r.name }))}
                            value={values.selectedRegion}
                            onChange={(val) => handleChange('selectedRegion', val)}
                            placeholder="Все"
                        />
                    </div>
                )}

                {/* Med Rep */}
                <div className="flex flex-col space-y-1 min-w-[140px] flex-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">МЕД. РЕП</p>
                    <SearchableSelect
                        options={medReps.map(mr => ({ value: mr.id.toString(), label: mr.name }))}
                        value={values.selectedMedRep}
                        onChange={(val) => handleChange('selectedMedRep', val)}
                        disabled={isMedRep}
                        placeholder="Все"
                    />
                </div>

                {/* Company */}
                <div className="flex flex-col space-y-1 min-w-[140px] flex-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">КОМПАНИЯ</p>
                    <SearchableSelect
                        options={companies.map(c => ({ value: c.id.toString(), label: c.name }))}
                        value={values.selectedCompany}
                        onChange={(val) => handleChange('selectedCompany', val)}
                        placeholder="Все"
                    />
                </div>

                {/* Type */}
                <div className="flex flex-col space-y-1 min-w-[140px] flex-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ТИП</p>
                    <SearchableSelect
                        options={FILTER_ORG_TYPES}
                        value={values.selectedType}
                        onChange={(val) => handleChange('selectedType', val)}
                        placeholder="Все"
                    />
                </div>

                {/* Invoice Type */}
                <div className="flex flex-col space-y-1 min-w-[140px] flex-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ТИП ФАКТУРЫ</p>
                    <SearchableSelect
                        options={[
                            { label: 'Обычная', value: 'regular' },
                            { label: 'Товарная скидка', value: 'tovar_skidka' },
                        ]}
                        value={values.selectedInvoiceType}
                        onChange={(val) => handleChange('selectedInvoiceType', val)}
                        placeholder="Все"
                    />
                </div>

                {/* Account Number / Search Action */}
                <div className="flex flex-col gap-2 flex-1 min-w-[300px]">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">НОМЕР СЧЕТА И ДЕЙСТВИЯ</p>
                    <div className="flex gap-2">
                        <Input 
                            value={values.invNumSearch} 
                            onChange={(e) => handleChange('invNumSearch', e.target.value)}
                            placeholder="000"
                            className="h-10 border-slate-100 bg-slate-50/50 rounded-xl font-bold text-slate-700 placeholder:text-slate-300 focus:bg-white focus:border-orange-500 transition-all flex-1"
                        />
                        <Button 
                            onClick={onSearch}
                            className="h-10 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg shadow-slate-900/10 transition-all flex items-center gap-2 shrink-0"
                        >
                            <Search className="w-4 h-4" />
                            поиск
                        </Button>
                        {onReset && (
                            <Button
                                onClick={onReset}
                                variant="outline"
                                className="h-10 px-4 rounded-xl font-bold border-rose-200 text-rose-500 hover:bg-rose-50 transition-all shrink-0"
                            >
                                Сбросить
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
