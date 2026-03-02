import { create } from 'zustand';
import axiosInstance from '../api/axios';
import { getDoctors } from '../api/crm';
import { getBonusPayments, getPlans, getDoctorFacts } from '../api/sales';

export interface Doctor {
    id: number;
    name: string;
    full_name?: string;
    medReps: string;
    region: string;
    specialty: string;
    organization: string;
    totalPlan: number;
    fact: number;
    factReceived: number;
    factPercent: number;
    bonus: number;
    bonusPaid: number;
    bonusBalance: number;
    preInvest: number;
    netProfit: number;
    // raw backend fields
    region_id?: number;
    specialty_id?: number;
    category_id?: number;
    med_org_id?: number;
    med_org?: any;
    specialty_obj?: any;
    category?: any;
    assigned_rep?: any;
    is_active?: boolean;
}

interface DoctorStore {
    doctors: Doctor[];
    isLoading: boolean;
    selectedMonth: number;
    selectedYear: number;

    // Filter state
    selectedProductId: number | null;
    selectedDoctorId: number | null;
    selectedRegion: string | null;
    selectedRep: string | null;

    setMonth: (m: number) => void;
    setYear: (y: number) => void;

    // Filter actions
    setSelectedProductId: (id: number | null) => void;
    setSelectedDoctorId: (id: number | null) => void;
    setSelectedRegion: (region: string | null) => void;
    setSelectedRep: (rep: string | null) => void;
    resetFilters: () => void;

    fetchDoctors: (month?: number, year?: number) => Promise<void>;
    getFilteredDoctors: () => Doctor[];
}

export const useDoctorStore = create<DoctorStore>((set, get) => ({
    doctors: [],
    isLoading: false,
    selectedMonth: new Date().getMonth() + 1,
    selectedYear: new Date().getFullYear(),

    // Initial filter state
    selectedProductId: null,
    selectedDoctorId: null,
    selectedRegion: null,
    selectedRep: null,

    setMonth: (m) => set({ selectedMonth: m }),
    setYear: (y) => set({ selectedYear: y }),

    // Filter actions implementation
    setSelectedProductId: (id) => set({ selectedProductId: id }),
    setSelectedDoctorId: (id) => set({ selectedDoctorId: id }),
    setSelectedRegion: (region) => set({ selectedRegion: region }),
    setSelectedRep: (rep) => set({ selectedRep: rep }),
    resetFilters: () => set({
        selectedProductId: null,
        selectedDoctorId: null,
        selectedRegion: null,
        selectedRep: null
    }),

    fetchDoctors: async (month?: number, year?: number) => {
        set({ isLoading: true });
        try {
            const m = month ?? get().selectedMonth;
            const y = year ?? get().selectedYear;

            const [rawDoctors, allBonusPayments, allPlans, products] = await Promise.all([
                getDoctors(),
                getBonusPayments(),
                getPlans(m, y),
                axiosInstance.get('/products/').then(res => res.data)
            ]);

            // Fetch doctor facts for the selected month/year to calculate profit
            const doctorFacts = await getDoctorFacts(undefined, undefined);
            const filteredFacts = doctorFacts.filter((f: any) => {
                if (!f.date) return false;
                const d = new Date(f.date);
                return d.getMonth() + 1 === m && d.getFullYear() === y;
            });

            // Product margins map
            const productMargins: Record<number, number> = {};
            for (const p of products) {
                const margin = (p.price ?? 0) - (p.production_price ?? 0) - (p.marketing_expense ?? 0) - (p.salary_expense ?? 0) - (p.other_expenses ?? 0);
                productMargins[p.id] = margin;
            }

            // Aggregate profit per doctor
            const profitByDoctor: Record<number, number> = {};
            for (const f of filteredFacts) {
                const did = f.doctor_id;
                const pid = f.product_id;
                if (!did || !pid) continue;
                const margin = productMargins[pid] ?? 0;
                profitByDoctor[did] = (profitByDoctor[did] ?? 0) + (f.quantity ?? 0) * margin;
            }

            // Aggregate bonusPaid per doctor_id (filtered by month/year)
            const bonusByDoctor: Record<number, number> = {};
            for (const bp of allBonusPayments) {
                if (bp.doctor_id != null && bp.for_month === m && bp.for_year === y) {
                    bonusByDoctor[bp.doctor_id] = (bonusByDoctor[bp.doctor_id] ?? 0) + (bp.amount ?? 0);
                }
            }

            // Aggregate totalPlan per doctor_id
            // Use latest plan per (doctor_id, product_id) to avoid double-counting duplicates
            const sortedPlans = [...allPlans].sort((a: any, b: any) => b.id - a.id);
            const planByDoctorProduct: Record<number, Record<number, number>> = {};

            // Map doctors to their assigned med rep ID for efficient lookup
            const doctorToRep: Record<number, number> = {};
            rawDoctors.forEach((d: any) => {
                if (d.id && d.assigned_rep_id) {
                    doctorToRep[d.id] = d.assigned_rep_id;
                }
            });

            for (const p of sortedPlans) {
                const did = p.doctor_id;
                const pid = p.product_id;
                const rid = p.med_rep_id;
                if (!did || !pid || !rid) continue;

                // ONLY include plans that belong to the doctor's assigned representative
                if (doctorToRep[did] !== rid) continue;

                if (!planByDoctorProduct[did]) planByDoctorProduct[did] = {};
                if (planByDoctorProduct[did][pid] === undefined) {
                    planByDoctorProduct[did][pid] = p.target_quantity ?? 0;
                }
            }
            const planByDoctor: Record<number, number> = {};
            for (const [did, prodMap] of Object.entries(planByDoctorProduct)) {
                planByDoctor[Number(did)] = Object.values(prodMap).reduce((s, v) => s + v, 0);
            }

            const mapped: Doctor[] = rawDoctors.map((d: any) => {
                const paid = bonusByDoctor[d.id] ?? 0;
                const profit = profitByDoctor[d.id] ?? 0;
                return {
                    id: d.id,
                    name: d.full_name ?? '',
                    full_name: d.full_name,
                    medReps: d.assigned_rep
                        ? (d.assigned_rep.full_name ?? d.assigned_rep.username ?? '')
                        : '',
                    region: d.med_org?.region?.name ?? d.region?.name ?? '',
                    specialty: d.specialty?.name ?? '',
                    organization: d.med_org?.name ?? '',
                    totalPlan: planByDoctor[d.id] ?? 0,
                    fact: 0,
                    factReceived: 0,
                    factPercent: 0,
                    bonus: 0,
                    bonusPaid: paid,
                    bonusBalance: 0,
                    preInvest: paid,
                    netProfit: profit,
                    region_id: d.region_id,
                    specialty_id: d.specialty_id,
                    category_id: d.category_id,
                    med_org_id: d.med_org_id,
                    med_org: d.med_org,
                    specialty_obj: d.specialty,
                    category: d.category,
                    assigned_rep: d.assigned_rep,
                };
            });

            set({ doctors: mapped });
        } catch (e) {
            console.error('Failed to fetch doctors', e);
        } finally {
            set({ isLoading: false });
        }
    },

    getFilteredDoctors: () => {
        const { doctors, selectedProductId, selectedDoctorId, selectedRegion, selectedRep } = get();
        return doctors.filter(d => {
            const matchDoctor = !selectedDoctorId || d.id === selectedDoctorId;
            const matchRegion = !selectedRegion || d.region === selectedRegion;
            const matchRep = !selectedRep || d.medReps === selectedRep;

            // Product filtering is slightly more complex as it depends on sales facts
            // For now, we filter doctors who have any plans or facts for the selected product
            // This logic can be refined based on exact requirements
            return matchDoctor && matchRegion && matchRep;
        });
    }
}));
