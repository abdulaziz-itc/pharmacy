import React, { useState } from 'react';
import { useMedRepStore } from '../../store/medRepStore';
import { medRepColumns } from './medRepColumns';
import { DataTable } from '../../components/ui/data-table';
import { PageContainer } from '../../components/PageContainer';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { ReassignUserModal } from './ReassignUserModal';
import { Button } from "../../components/ui/button";

import { toast } from 'sonner';

import { useAuthStore } from '../../store/authStore';
import { CreateMedRepModal } from '../product-managers/components/CreateMedRepModal';

export default function MedRepsPage() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { medReps, fetchMedReps, isLoading } = useMedRepStore();
    const [rmList, setRmList] = useState<any[]>([]);

    // Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isReassignOpen, setIsReassignOpen] = useState(false);
    const [reassignUserId, setReassignUserId] = useState<number>(0);
    const [reassignUserName, setReassignUserName] = useState<string>('');
    const [activeTab, setActiveTab] = useState("active");
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const fetchRMList = React.useCallback(async () => {
        try {
            const api = (await import('../../api/axios')).default;
            const res = await api.get('/users/med-reps?role=regional_manager');
            setRmList(res.data);
        } catch (error) {
            console.error("Failed to fetch RM list:", error);
        }
    }, []);

    React.useEffect(() => {
        fetchMedReps("med_rep");
        if (user?.role !== 'regional_manager') {
            fetchRMList();
        }
    }, [fetchMedReps, fetchRMList, user?.role]);

    const handleReassignOpen = (id: number, name: string) => {
        setReassignUserId(id);
        setReassignUserName(name);
        setIsReassignOpen(true);
    };

    const handleToggleActive = async (medRep: any) => {
        try {
            setIsSubmitting(true);
            const api = (await import('../../api/axios')).default;
            await api.put(`/users/${medRep.id}`, {
                is_active: !medRep.is_active
            });
            await fetchMedReps("med_rep");
            toast.success("Статус успешно изменен.");
        } catch (error: any) {
            console.error("Failed to toggle active status:", error);
            if (error.response?.data?.detail) {
                toast.error(error.response.data.detail);
            } else {
                toast.error("Ошибка при изменении статуса.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading && medReps.length === 0) {
        return (
            <PageContainer>
                <div className="flex items-center justify-center h-64">
                    <p className="text-slate-400">Загрузка...</p>
                </div>
            </PageContainer>
        )
    }

    const activeReps = medReps.filter(r => r.is_active);
    const inactiveReps = medReps.filter(r => !r.is_active);

    return (
        <PageContainer>
            <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Медицинские представители</h1>
                </div>
                {['admin', 'investor', 'director', 'deputy_director', 'product_manager', 'regional_manager'].includes(user?.role || '') && (
                    <Button 
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl h-11 px-6 shadow-lg shadow-indigo-100 transition-all active:scale-95"
                    >
                        Добавить
                    </Button>
                )}
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className={`space-y-6 ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}>
                <TabsList className="bg-slate-100/50 p-1 border border-slate-200/50 rounded-2xl">
                    <TabsTrigger
                        value="active"
                        className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm px-6 font-bold"
                    >
                        Активные ({activeReps.length})
                    </TabsTrigger>
                    <TabsTrigger
                        value="archive"
                        className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm px-6 font-bold"
                    >
                        Архив ({inactiveReps.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="mt-0 outline-none">
                    <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border overflow-hidden hover-lift transition-all duration-500">
                        <DataTable
                            columns={medRepColumns(handleReassignOpen, undefined, handleToggleActive)}
                            data={activeReps}
                            searchColumn="username"
                            onRowClick={(row) => navigate(`/med-reps/${row.id}`)}
                        />
                    </div>
                </TabsContent>

                <TabsContent value="archive" className="mt-0 outline-none">
                    <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border overflow-hidden hover-lift transition-all duration-500">
                        <DataTable
                            columns={medRepColumns(handleReassignOpen, undefined, handleToggleActive)}
                            data={inactiveReps}
                            searchColumn="username"
                            onRowClick={(row) => navigate(`/med-reps/${row.id}`)}
                        />
                    </div>
                </TabsContent>
            </Tabs>

            <CreateMedRepModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={() => fetchMedReps("med_rep")}
                rmList={rmList}
            />

            <ReassignUserModal
                isOpen={isReassignOpen}
                onClose={() => setIsReassignOpen(false)}
                fromUserId={reassignUserId}
                fromUserName={reassignUserName}
                role="med_rep"
            />
        </PageContainer>
    );
}
