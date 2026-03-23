import React from 'react';
import { useParams } from 'react-router-dom';
import { PageContainer } from '../../components/PageContainer';
import { DoctorPlansTable } from './components/DoctorPlansTable';
import { PharmacyPlansTable } from './components/PharmacyPlansTable';
import { MedRepDoctorsTable } from './components/MedRepDoctorsTable';
import { MedRepPharmaciesTable } from './components/MedRepPharmaciesTable';
import { MedRepNotificationsTable } from './components/MedRepNotificationsTable';
import { ProductPlanCard } from './components/ProductPlanCard';
import { BonusPaymentsCard } from './components/BonusPaymentsCard';
import { ReassignUserModal } from './ReassignUserModal';
import { MedRepBonusDashboard } from './components/MedRepBonusDashboard';
import { Button } from '../../components/ui/button';
import { ArrowRightLeft, Wallet, TrendingUp } from 'lucide-react';
import { getDoctors, getMedOrgs } from '../../api/crm';
import { getPlans, getSaleFacts, createDoctorFact, getBonusPayments, createBonusPayment, updateBonusPayment, getInvoices } from '../../api/sales';
import { getMedRepBonusBalance } from '../../api/orders-management';
import { getUsers } from '../../api/user';
import { getVisitPlans } from '../../api/visit-plans';
import { getNotifications } from '../../api/notifications';
import { useProductStore } from '../../store/productStore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'sonner';
import { ModernStatsBar } from '../../components/ui/ModernStatsBar';
import { useMemo } from 'react';

export default function MedRepDetailPage() {
    const { id } = useParams<{ id: string }>();
    const [isLoading, setIsLoading] = React.useState(true);
    const [medRep, setMedRep] = React.useState<any>(null);
    const [doctors, setDoctors] = React.useState<any[]>([]);
    const [pharmacies, setPharmacies] = React.useState<any[]>([]);
    const [doctorPlans, setDoctorPlans] = React.useState<any[]>([]);
    const [pharmacyPlans, setPharmacyPlans] = React.useState<any[]>([]);
    const [notifications, setNotifications] = React.useState<any[]>([]);
    const [salesPlans, setSalesPlans] = React.useState<any[]>([]);
    const [salesFacts, setSalesFacts] = React.useState<any[]>([]);
    const [bonusPayments, setBonusPayments] = React.useState<any[]>([]);
    const [bonusBalance, setBonusBalance] = React.useState<number>(0);
    const [invoices, setInvoices] = React.useState<any[]>([]);
    const [isReassignModalOpen, setIsReassignModalOpen] = React.useState(false);
    const { products, fetchProducts } = useProductStore();

    React.useEffect(() => { fetchProducts(); }, [fetchProducts]);

    React.useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            setIsLoading(true);
            try {
                const repId = parseInt(id);
                const currentUser = useAuthStore.getState().user;

                // Fetch Med Rep Info
                if (currentUser && currentUser.id === repId) {
                    setMedRep(currentUser);
                } else {
                    try {
                        const allUsers = await getUsers();
                        const currentRep = allUsers.find((u: any) => u.id === repId);
                        setMedRep(currentRep);
                    } catch (e) {
                        console.error("Failed to fetch med reps list:", e);
                        // If we are a med rep, we probably can't getUsers(). 
                        // But if we are here and id doesn't match currentUser.id, something is wrong or we are a manager.
                    }
                }

                // Fetch Doctors & filter by assigned_rep_id
                const repDoctors = await getDoctors({ rep_id: repId, limit: 1000 });
                setDoctors(repDoctors);

                // Fetch Med Orgs & filter by assigned_reps array and type
                const allOrgs = await getMedOrgs({ rep_id: repId, limit: 1000 });
                const repPharmacies = allOrgs.filter((o: any) => o.org_type === 'pharmacy');
                setPharmacies(repPharmacies);

                // Fetch Visit Plans
                const visits = await getVisitPlans(repId);

                setDoctorPlans(visits.filter((v: any) => v.doctor_id !== null).map((p: any) => ({
                    id: p.id,
                    doctorName: p.doctor?.full_name || "Unknown Doctor",
                    date: p.planned_date.split('T')[0],
                    status: p.status === 'confirmed' ? 'Выполнен' : 'В ожидании', // Map status
                    visit_type: p.visit_type,
                    subject: p.subject
                })));

                setPharmacyPlans(visits.filter((v: any) => v.med_org_id !== null).map((p: any) => ({
                    id: p.id,
                    pharmacyName: p.med_org?.name || "Unknown Pharmacy",
                    date: p.planned_date.split('T')[0],
                    status: p.status === 'confirmed' ? 'Выполнен' : 'В ожидании',
                    visit_type: p.visit_type,
                    subject: p.subject
                })));

                // Fetch Notifications (Current User for now)
                const notifs = await getNotifications();
                setNotifications(notifs);

                // Fetch Sales Plans and Facts
                const plans = await getPlans(undefined, undefined, repId);
                setSalesPlans(plans);

                const facts = await getSaleFacts(repId);
                setSalesFacts(facts);

                const bonuses = await getBonusPayments(repId);
                setBonusPayments(bonuses);

                const balanceData = await getMedRepBonusBalance(repId);
                setBonusBalance(balanceData.balance);

                const invs = await getInvoices({ med_rep_id: repId, limit: 1000 });
                setInvoices(invs);

            } catch (error) {
                console.error("Failed to fetch Med Rep details:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const statsData = useMemo(() => {
        const total = invoices.reduce((acc: number, inv: any) => acc + (inv.total_amount || 0), 0);
        const paid = invoices.reduce((acc: number, inv: any) => acc + (inv.paid_amount || 0), 0);
        
        const tovarSkidka = invoices.filter((r: any) => r.reservation?.is_tovar_skidka);
        const tovarSkidkaAmount = tovarSkidka.reduce((acc: number, r: any) => acc + (r.total_amount || 0), 0);
        const tovarSkidkaCount = tovarSkidka.length;

        // Calculate promo from associated reservations
        let totalPromo = 0;
        invoices.forEach((inv: any) => {
            const res = inv.reservation;
            if (res && res.is_bonus_eligible) {
                (res.items || []).forEach((item: any) => {
                    const marketingExpense = item.marketing_amount !== undefined && item.marketing_amount !== null 
                        ? item.marketing_amount 
                        : (item.product?.marketing_expense || 0);
                    totalPromo += (item.quantity * marketingExpense);
                });
            }
        });

        return {
            stats: {
                totalAmount: total,
                paidAmount: paid,
                debtAmount: total - paid,
                resCount: invoices.length,
                tovarSkidkaAmount,
                tovarSkidkaCount
            },
            promoAmount: totalPromo
        };
    }, [invoices]);

    if (isLoading) {
        return (
            <PageContainer>
                <div className="flex items-center justify-center h-64">
                    <p className="text-slate-400">Загрузка...</p>
                </div>
            </PageContainer>
        );
    }

    return (
        <PageContainer>
            {/* Enhanced Profile Header */}
            <div className="relative -mx-6 -mt-6 mb-8 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-indigo-600/5 to-transparent pointer-events-none" />
                <div className="px-6 py-8 border-b border-slate-200/60 backdrop-blur-md bg-white/40 sticky top-0 z-10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-xl shadow-blue-500/20 transform -rotate-3 hover:rotate-0 transition-transform duration-500">
                                <span className="text-2xl font-bold">
                                    {medRep?.full_name?.split(' ').map((n: any) => n[0]).join('') || "МП"}
                                </span>
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">
                                    {medRep?.full_name || "Медицинский представитель"}
                                </h2>
                                <div className="flex items-center gap-3 mt-2">
                                    <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wider">
                                        Medical Rep
                                    </span>
                                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                                    <span className="text-slate-500 text-sm font-medium">ID: {id}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <Button
                                variant="outline"
                                className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-bold rounded-xl shadow-sm h-11 px-5"
                                onClick={() => {
                                    const bonusTab = document.querySelector('[value="bonus"]');
                                    if (bonusTab) (bonusTab as HTMLElement).click();
                                    window.scrollTo({ top: 400, behavior: 'smooth' });
                                }}
                            >
                                <Wallet className="w-4 h-4 mr-2" />
                                Бонус: {bonusBalance.toLocaleString('ru-RU')} UZS
                            </Button>

                            <Button
                                onClick={() => setIsReassignModalOpen(true)}
                                className="bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 font-bold rounded-xl shadow-sm h-11 px-5"
                            >
                                <ArrowRightLeft className="w-4 h-4 mr-2" />
                                Передать территорию
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <ReassignUserModal
                isOpen={isReassignModalOpen}
                onClose={() => {
                    setIsReassignModalOpen(false);
                    // Reload data to reflect changes
                    window.location.reload();
                }}
                fromUserId={parseInt(id || "0")}
                fromUserName={medRep?.full_name || "Unknown"}
                role="med_rep"
            />

            <div className="mb-8">
                <ModernStatsBar 
                    stats={statsData.stats}
                    promoAmount={statsData.promoAmount}
                    countLabel="Кол-во (Фактуры)"
                />
            </div>

            <div className="pb-20">
                <Tabs defaultValue="overview" className="space-y-6">
                    <TabsList className="bg-slate-100/50 p-1 rounded-xl h-auto flex flex-wrap gap-2 w-full justify-start overflow-x-auto border border-blue-100 shadow-sm">
                        <TabsTrigger value="overview" className="rounded-lg px-4 py-2.5 text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-md transition-all whitespace-nowrap">Управление</TabsTrigger>
                        <TabsTrigger value="bonus" className="rounded-lg px-4 py-2.5 text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-md transition-all whitespace-nowrap">Личный бонусный баланс</TabsTrigger>
                        <TabsTrigger value="doctors" className="rounded-lg px-4 py-2.5 text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-md transition-all whitespace-nowrap">Врачи</TabsTrigger>
                        <TabsTrigger value="pharmacies" className="rounded-lg px-4 py-2.5 text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-md transition-all whitespace-nowrap">Аптеки</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="m-0 focus-visible:outline-none focus-visible:ring-0">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* 1. Doctors Plan */}
                            <div className="transition-all duration-300 hover:translate-y-[-4px]">
                                <DoctorPlansTable data={doctorPlans} />
                            </div>

                            {/* 2. Pharmacy Plan */}
                            <div className="transition-all duration-300 hover:translate-y-[-4px]">
                                <PharmacyPlansTable data={pharmacyPlans} />
                            </div>

                            {/* Product Plan */}
                            <div className="lg:col-span-2 transition-all duration-300 hover:translate-y-[-4px]">
                                <ProductPlanCard
                                    plans={salesPlans}
                                    facts={salesFacts}
                                    doctors={doctors}
                                    onAddPlan={async (planData) => {
                                        try {
                                            const repId = parseInt(id || "0");
                                            await import('../../api/sales').then(m => m.createPlan({
                                                med_rep_id: repId,
                                                product_id: planData.product_id,
                                                doctor_id: planData.doctor_id,
                                                target_quantity: planData.target_quantity,
                                                target_amount: planData.target_amount,
                                                month: planData.month,
                                                year: planData.year
                                            }));
                                            const updatedPlans = await import('../../api/sales').then(m => m.getPlans(undefined, undefined, repId));
                                            setSalesPlans(updatedPlans);
                                        } catch (e) {
                                            console.error(e);
                                            alert("Ошибка сохранения плана");
                                        }
                                    }}
                                    onEditPlan={async (planId, planData) => {
                                        try {
                                            const repId = parseInt(id || "0");
                                            await import('../../api/sales').then(m => m.updatePlan(planId, {
                                                target_quantity: planData.target_quantity,
                                                target_amount: planData.target_amount,
                                                month: planData.month,
                                                year: planData.year
                                            }));
                                            const updatedPlans = await import('../../api/sales').then(m => m.getPlans(undefined, undefined, repId));
                                            setSalesPlans(updatedPlans);
                                        } catch (e) {
                                            console.error(e);
                                            alert("Ошибка обновления плана");
                                        }
                                    }}
                                    onAssignFact={async (factData) => {
                                        try {
                                            const repId = parseInt(id || "0");
                                            await createDoctorFact({
                                                med_rep_id: repId,
                                                doctor_id: factData.doctor_id,
                                                product_id: factData.product_id,
                                                quantity: factData.quantity,
                                                month: factData.month,
                                                year: factData.year
                                            });
                                            const updatedFacts = await getSaleFacts(repId);
                                            setSalesFacts(updatedFacts);

                                            // Update bonus balance after assigning fact
                                            const balanceData = await getMedRepBonusBalance(repId);
                                            setBonusBalance(balanceData.balance);
                                        } catch (e) {
                                            console.error(e);
                                            alert("Ошибка назначения факта");
                                        }
                                    }}
                                    bonusBalance={bonusBalance}
                                />
                            </div>

                            {/* Notifications */}
                            <div className="lg:col-span-2 transition-all duration-300 hover:translate-y-[-4px]">
                                <MedRepNotificationsTable data={notifications.map((n: any) => ({
                                    id: n.id,
                                    topic: n.topic,
                                    date: n.created_at.split('T')[0],
                                    status: n.status === 'read' ? 'Прочитано' : 'Новое',
                                    doctorPharmacy: n.related_entity_name || "-"
                                }))} />
                            </div>

                            {/* Bonus Payments Card */}
                            <div className="lg:col-span-2 transition-all duration-300 hover:translate-y-[-4px]">
                                <BonusPaymentsCard
                                    bonusPayments={bonusPayments}
                                    salesFacts={salesFacts}
                                    salesPlans={salesPlans}
                                    doctors={doctors.map((d: any) => ({ id: d.id, full_name: d.full_name }))}
                                    products={products.filter(p => p.is_active).map(p => ({ id: p.id, name: p.name }))}
                                    onAddBonusPayment={async (data) => {
                                        try {
                                            const repId = parseInt(id || "0");
                                            await createBonusPayment({
                                                med_rep_id: repId,
                                                amount: data.amount,
                                                for_month: data.for_month,
                                                for_year: data.for_year,
                                                paid_date: data.paid_date,
                                                doctor_id: data.doctor_id,
                                                product_id: data.product_id,
                                                notes: data.notes
                                            });
                                            const updated = await getBonusPayments(repId);
                                            setBonusPayments(updated);
                                        } catch (e) {
                                            console.error(e);
                                            alert("Ошибка записи выплаты бонуса");
                                        }
                                    }}
                                    onEditBonusPayment={async (bpId, data) => {
                                        try {
                                            const repId = parseInt(id || "0");
                                            await updateBonusPayment(bpId, data);
                                            const updated = await getBonusPayments(repId);
                                            setBonusPayments(updated);
                                        } catch (e) {
                                            console.error(e);
                                            alert("Ошибка обновления выплаты");
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="bonus" className="m-0 focus-visible:outline-none focus-visible:ring-0">
                        <MedRepBonusDashboard doctors={doctors} medRepId={parseInt(id || "0")} />
                    </TabsContent>

                    <TabsContent value="doctors" className="m-0 focus-visible:outline-none focus-visible:ring-0">
                        <MedRepDoctorsTable
                            data={doctors.map(d => ({
                                id: d.id,
                                fullName: d.full_name,
                                specialty: d.specialty?.name || "",
                                organization: d.med_org?.name || "",
                                category: d.category?.name || "A",
                                rawDoctor: d // Pass the original object for the modal
                            }))}
                            salesPlans={salesPlans}
                            salesFacts={salesFacts} // Pass facts down here
                            bonusPayments={bonusPayments}
                            products={products}
                        />
                    </TabsContent>

                    <TabsContent value="pharmacies" className="m-0 focus-visible:outline-none focus-visible:ring-0">
                        <MedRepPharmaciesTable data={pharmacies} medRepId={id} />
                    </TabsContent>
                </Tabs>
            </div>
            <div className="transition-all duration-300 hover:translate-y-[-4px]">

            </div>
        </PageContainer >
    );
}
