import React from 'react';
import { useParams } from 'react-router-dom';
import { User } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { DataTable } from '../../components/ui/data-table';
import { getSubordinateColumns, type SubordinateUser } from './subordinateColumns';
import { PageContainer } from '../../components/PageContainer';
import { getUserHierarchy } from '../../api/userHierarchy';
import { CreateFFMModal } from './components/CreateFFMModal';
import { CreateRMModal } from './components/CreateRMModal';
import { CreateMedRepModal } from './components/CreateMedRepModal';
import { EditSubordinateModal } from './components/EditSubordinateModal';

export default function ProductManagerDetailPage() {
    const { id } = useParams<{ id: string }>();
    const [hierarchyData, setHierarchyData] = React.useState<any>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
    const [isCreateRMModalOpen, setIsCreateRMModalOpen] = React.useState(false);
    const [isCreateMedRepModalOpen, setIsCreateMedRepModalOpen] = React.useState(false);
    const [editingUser, setEditingUser] = React.useState<SubordinateUser | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);

    const fetchHierarchy = React.useCallback(async () => {
        if (!id) return;
        try {
            console.log("Fetching hierarchy for user ID:", id);
            const data = await getUserHierarchy(parseInt(id));
            console.log("Hierarchy data received:", data);
            setHierarchyData(data);
        } catch (error: any) {
            console.error("Failed to fetch hierarchy:", error);
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    React.useEffect(() => {
        fetchHierarchy();
    }, [fetchHierarchy]);

    const columns = React.useMemo(() => getSubordinateColumns((user) => {
        setEditingUser(user);
    }), []);

    if (isLoading) {
        return (
            <PageContainer>
                <div className="flex items-center justify-center h-64">
                    <p className="text-slate-400">Загрузка...</p>
                </div>
            </PageContainer>
        );
    }

    if (!hierarchyData) {
        return (
            <PageContainer>
                <div className="flex items-center justify-center h-64">
                    <p className="text-slate-400">Данные не найдены</p>
                </div>
            </PageContainer>
        );
    }

    return (
        <PageContainer>
            {/* User Profile Header */}
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border p-8 mb-6">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                        <User className="w-8 h-8 text-slate-400" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">
                            {hierarchyData.user.full_name}
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                            Менеджер по продукту • {hierarchyData.user.username}
                        </p>
                    </div>
                </div>
            </div>

            {/* Tabs for Hierarchical Structure */}
            <Tabs defaultValue="field_force" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-slate-100 p-1 rounded-2xl h-auto">
                    <TabsTrigger
                        value="field_force"
                        className="rounded-xl py-3 text-xs font-bold uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-md transition-all"
                    >
                        Менеджеры полевых персоналов
                    </TabsTrigger>
                    <TabsTrigger
                        value="regional"
                        className="rounded-xl py-3 text-xs font-bold uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-md transition-all"
                    >
                        Региональные менеджеры
                    </TabsTrigger>
                    <TabsTrigger
                        value="med_reps"
                        className="rounded-xl py-3 text-xs font-bold uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-md transition-all"
                    >
                        Медицинские представители
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="field_force" className="mt-6">
                    <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border overflow-hidden">
                        <div className="p-6 border-b flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-900">
                                Менеджеры полевых персоналов
                            </h3>
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="px-6 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-blue-700 transition-colors"
                            >
                                Добавить
                            </button>
                        </div>
                        <DataTable
                            columns={columns}
                            data={hierarchyData.field_force_managers || []}
                        />
                    </div>
                </TabsContent>

                <TabsContent value="regional" className="mt-6">
                    <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border overflow-hidden">
                        <div className="p-6 border-b flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-900">
                                Региональные менеджеры
                            </h3>
                            <button
                                onClick={() => setIsCreateRMModalOpen(true)}
                                className="px-6 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-blue-700 transition-colors"
                            >
                                Добавить
                            </button>
                        </div>
                        <DataTable
                            columns={columns}
                            data={hierarchyData.regional_managers || []}
                        />
                    </div>
                </TabsContent>

                <TabsContent value="med_reps" className="mt-6">
                    <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border overflow-hidden">
                        <div className="p-6 border-b flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-900">
                                Медицинские представители
                            </h3>
                            <button
                                onClick={() => setIsCreateMedRepModalOpen(true)}
                                className="px-6 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-blue-700 transition-colors"
                            >
                                Добавить
                            </button>
                        </div>
                        <DataTable
                            columns={columns}
                            data={hierarchyData.med_reps || []}
                        />
                    </div>
                </TabsContent>
            </Tabs>

            {id && (
                <>
                    <CreateFFMModal
                        isOpen={isCreateModalOpen}
                        onClose={() => setIsCreateModalOpen(false)}
                        onSuccess={fetchHierarchy}
                        managerId={parseInt(id)}
                    />
                    <CreateRMModal
                        isOpen={isCreateRMModalOpen}
                        onClose={() => setIsCreateRMModalOpen(false)}
                        onSuccess={fetchHierarchy}
                        ffmList={hierarchyData.field_force_managers || []}
                    />
                    <CreateMedRepModal
                        isOpen={isCreateMedRepModalOpen}
                        onClose={() => setIsCreateMedRepModalOpen(false)}
                        onSuccess={fetchHierarchy}
                        rmList={hierarchyData.regional_managers || []}
                    />
                    <EditSubordinateModal
                        isOpen={!!editingUser}
                        onClose={() => setEditingUser(null)}
                        onSuccess={fetchHierarchy}
                        user={editingUser}
                    />
                </>
            )}
        </PageContainer>
    );
}
