import { ChevronDown } from 'lucide-react';
import { useDoctorStore } from '../../store/doctorStore';
import { useProductStore } from '../../store/productStore';

const MONTHS_RU = [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
];

interface DoctorFiltersProps {
    month: number;
    year: number;
    onMonthChange: (m: number) => void;
    onYearChange: (y: number) => void;
}

export default function DoctorFilters({ month, year, onMonthChange, onYearChange }: DoctorFiltersProps) {
    const {
        doctors,
        selectedProductId, setSelectedProductId,
        selectedDoctorId, setSelectedDoctorId,
        selectedRegion, setSelectedRegion,
        selectedRep, setSelectedRep
    } = useDoctorStore();

    const { products } = useProductStore();

    // Derive unique lists from doctors
    const uniqueDoctors = Array.from(new Map(doctors.map(d => [d.id, d.name])).entries())
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name));

    const uniqueRegions = Array.from(new Set(doctors.map(d => d.region).filter(Boolean)))
        .sort((a, b) => a.localeCompare(b));

    const uniqueReps = Array.from(new Set(doctors.map(d => d.medReps).filter(Boolean)))
        .sort((a, b) => a.localeCompare(b));

    return (
        <div className="flex flex-wrap items-center gap-2">
            {/* Month */}
            <div className="relative min-w-[110px]">
                <select
                    value={month}
                    onChange={(e) => onMonthChange(parseInt(e.target.value))}
                    className="w-full h-9 px-3 pr-8 rounded-xl border border-slate-200 bg-white text-[11px] font-bold text-slate-700 outline-none appearance-none cursor-pointer hover:border-blue-400 transition-colors shadow-sm"
                >
                    {MONTHS_RU.map((m, i) => (
                        <option key={i + 1} value={i + 1}>{m}</option>
                    ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>

            {/* Year */}
            <div className="min-w-[70px]">
                <input
                    type="number"
                    min={2020}
                    max={2099}
                    value={year}
                    onChange={(e) => onYearChange(parseInt(e.target.value))}
                    className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-[11px] font-bold text-slate-700 outline-none w-full hover:border-blue-400 transition-colors shadow-sm"
                />
            </div>

            {/* Product */}
            <div className="relative min-w-[130px]">
                <select
                    value={selectedProductId || ""}
                    onChange={(e) => setSelectedProductId(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full h-9 px-3 pr-8 rounded-xl border border-slate-200 bg-white text-[11px] font-bold text-slate-700 outline-none appearance-none cursor-pointer hover:border-blue-400 transition-colors shadow-sm"
                >
                    <option value="">Все продукты</option>
                    {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>

            {/* Doctor */}
            <div className="relative min-w-[130px]">
                <select
                    value={selectedDoctorId || ""}
                    onChange={(e) => setSelectedDoctorId(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full h-9 px-3 pr-8 rounded-xl border border-slate-200 bg-white text-[11px] font-bold text-slate-700 outline-none appearance-none cursor-pointer hover:border-blue-400 transition-colors shadow-sm"
                >
                    <option value="">Все доктора</option>
                    {uniqueDoctors.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>

            {/* Region */}
            <div className="relative min-w-[130px]">
                <select
                    value={selectedRegion || ""}
                    onChange={(e) => setSelectedRegion(e.target.value || null)}
                    className="w-full h-9 px-3 pr-8 rounded-xl border border-slate-200 bg-white text-[11px] font-bold text-slate-700 outline-none appearance-none cursor-pointer hover:border-blue-400 transition-colors shadow-sm"
                >
                    <option value="">Все регионы</option>
                    {uniqueRegions.map(r => (
                        <option key={r} value={r}>{r}</option>
                    ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>

            {/* Med Reps */}
            <div className="relative min-w-[140px]">
                <select
                    value={selectedRep || ""}
                    onChange={(e) => setSelectedRep(e.target.value || null)}
                    className="w-full h-9 px-3 pr-8 rounded-xl border border-slate-200 bg-white text-[11px] font-bold text-slate-700 outline-none appearance-none cursor-pointer hover:border-blue-400 transition-colors shadow-sm"
                >
                    <option value="">Все представители</option>
                    {uniqueReps.map(r => (
                        <option key={r} value={r}>{r}</option>
                    ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
        </div>
    );
}
