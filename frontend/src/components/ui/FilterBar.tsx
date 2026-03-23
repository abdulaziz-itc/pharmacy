import React, { useEffect, useState } from 'react';
import { DateInput } from './date-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Input } from './input';
import { Button } from './button';
import { Search } from 'lucide-react';
import api from '@/api/axios';
import { useAuthStore } from '@/store/authStore';

export interface FilterValues {
    dateStart: string;
    dateEnd: string;
    selectedMedRep: string;
    selectedCompany: string;
    selectedType: string;
    selectedInvoiceType: string;
    invNumSearch: string;
}

interface FilterBarProps {
    values: FilterValues;
    onChange: (values: FilterValues) => void;
    onSearch: () => void;
}

const FILTER_ORG_TYPES = [
    { label: 'Аптека', value: 'pharmacy' },
    { label: 'Клиника', value: 'clinic' },
    { label: 'Больница', value: 'hospital' },
    { label: 'Прочее', value: 'other' },
];

export const FilterBar: React.FC<FilterBarProps> = ({ values, onChange, onSearch }) => {
    const user = useAuthStore((state) => state.user);
    const isMedRep = user?.role === 'med_rep';

    const [medReps, setMedReps] = useState<string[]>([]);
    const [companies, setCompanies] = useState<string[]>([]);

    useEffect(() => {
        const loadOptions = async () => {
            // Med Orgs
            try {
                const orgsRes = await api.get('/crm/med-orgs/', { params: { limit: 1000 } });
                const orgs = Array.isArray(orgsRes.data) ? orgsRes.data : (orgsRes.data?.items || []);
                setCompanies(orgs.map((o: any) => o.name).filter(Boolean));
            } catch (error) {
                console.error("Failed to load company options", error);
            }

            // Users (only if permitted roles)
            const permittedRoles = ['admin', 'director', 'deputy_director', 'head_of_orders', 'product_manager', 'field_force_manager', 'regional_manager'];
            if (user?.role && permittedRoles.includes(user.role)) {
                try {
                    const usersRes = await api.get('/users/', { params: { limit: 1000 } });
                    const users = Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data?.items || []);
                    const medRepNames = users
                        .filter((u: any) => u.role === 'med_rep')
                        .map((u: any) => u.full_name || u.username)
                        .filter(Boolean);
                    setMedReps(medRepNames);
                } catch (error) {
                    console.error("Failed to load med rep options", error);
                }
            } else if (isMedRep && user?.full_name) {
                // For Med Rep, they only see themselves
                setMedReps([user.full_name]);
            }
        };
        loadOptions();
    }, [user, isMedRep]);

    // Effect to lock Med Rep if user is med_rep
    useEffect(() => {
        if (isMedRep && user?.full_name && values.selectedMedRep !== user.full_name) {
            onChange({ ...values, selectedMedRep: user.full_name });
        }
    }, [isMedRep, user, values.selectedMedRep, onChange, values]);

    const handleChange = (field: keyof FilterValues, value: string) => {
        onChange({ ...values, [field]: value });
    };

    return (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4 items-end">
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

                {/* Med Rep */}
                <div className="flex flex-col space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">МЕД. РЕП</p>
                    <Select 
                        value={values.selectedMedRep} 
                        onValueChange={(val) => handleChange('selectedMedRep', val)}
                        disabled={isMedRep}
                    >
                        <SelectTrigger className="w-full bg-slate-50/50 border-slate-100 rounded-xl font-bold text-slate-700 h-10 shadow-sm focus:ring-orange-500/10">
                            <SelectValue placeholder="Все" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Все</SelectItem>
                            {medReps.map(rep => (
                                <SelectItem key={rep} value={rep}>{rep}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Company */}
                <div className="flex flex-col space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">КОМПАНИЯ</p>
                    <Select 
                        value={values.selectedCompany} 
                        onValueChange={(val) => handleChange('selectedCompany', val)}
                    >
                        <SelectTrigger className="w-full bg-slate-50/50 border-slate-100 rounded-xl font-bold text-slate-700 h-10 shadow-sm focus:ring-orange-500/10">
                            <SelectValue placeholder="Все" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Все</SelectItem>
                            {companies.map(c => (
                                <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Type */}
                <div className="flex flex-col space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ТИП</p>
                    <Select 
                        value={values.selectedType} 
                        onValueChange={(val) => handleChange('selectedType', val)}
                    >
                        <SelectTrigger className="w-full bg-slate-50/50 border-slate-100 rounded-xl font-bold text-slate-700 h-10 shadow-sm focus:ring-orange-500/10">
                            <SelectValue placeholder="Все" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Все</SelectItem>
                            {FILTER_ORG_TYPES.map(t => (
                                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Invoice Type */}
                <div className="flex flex-col space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ТИП ФАКТУРЫ</p>
                    <Select 
                        value={values.selectedInvoiceType} 
                        onValueChange={(val) => handleChange('selectedInvoiceType', val)}
                    >
                        <SelectTrigger className="w-full bg-slate-50/50 border-slate-100 rounded-xl font-bold text-slate-700 h-10 shadow-sm focus:ring-orange-500/10">
                            <SelectValue placeholder="Все" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Все</SelectItem>
                            <SelectItem value="regular">Обычная</SelectItem>
                            <SelectItem value="tovar_skidka">Товарная скидка</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Account Number / Search Action */}
                <div className="flex flex-col md:flex-row gap-2">
                    <div className="flex flex-col space-y-1 flex-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">НОМЕР СЧЕТА</p>
                        <Input 
                            value={values.invNumSearch} 
                            onChange={(e) => handleChange('invNumSearch', e.target.value)}
                            placeholder="000"
                            className="h-10 border-slate-100 bg-slate-50/50 rounded-xl font-bold text-slate-700 placeholder:text-slate-300 focus:bg-white focus:border-orange-500 transition-all"
                        />
                    </div>
                    <Button 
                        onClick={onSearch}
                        className="h-10 px-6 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg shadow-slate-900/10 transition-all flex items-center gap-2"
                    >
                        <Search className="w-4 h-4" />
                        поиск
                    </Button>
                </div>
            </div>
        </div>
    );
};
