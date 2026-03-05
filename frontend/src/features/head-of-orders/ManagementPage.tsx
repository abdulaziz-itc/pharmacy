import React from 'react';
import { PageContainer } from '../../components/PageContainer';
import { DataTable } from '../../components/ui/data-table';
import { Button } from '../../components/ui/button';
import { UserPlus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { type User, UserRole } from '../../store/authStore';
import { getHeadOfOrdersColumns } from './headOfOrdersColumns';
import { CreateHeadOfOrdersModal } from './components/CreateHeadOfOrdersModal';
import { EditManagerModal } from '../product-managers/EditManagerModal';

export default function HeadOfOrdersManagementPage() {
    const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
    const [editingUser, setEditingUser] = React.useState<User | null>(null);

    const { data: managers, isLoading, refetch } = useQuery<User[]>({
        queryKey: ['head-of-orders-users'],
        queryFn: async () => {
            const response = await api.get('/users/', { params: { limit: 1000 } });
            return response.data.filter((u: User) => u.role === UserRole.HEAD_OF_ORDERS);
        },
    });

    const columns = React.useMemo(() => getHeadOfOrdersColumns(
        (user: User) => setEditingUser(user),
        async (user: User) => {
            try {
                await api.put(`/users/${user.id}`, {
                    is_active: !user.is_active
                });
                refetch();
            } catch (error) {
                console.error("Failed to toggle active status:", error);
            }
        }
    ), [refetch]);

    if (isLoading) {
        return (
            <PageContainer>
                <div className="flex items-center justify-center h-64">
                    <p className="text-slate-400 font-medium">Загрузка...</p>
                </div>
            </PageContainer>
        );
    }

    return (
        <PageContainer>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Склад-менеджеры</h1>
                    <p className="text-slate-500 mt-1 font-medium">Управление менеджерами склада и их доступом</p>
                </div>
                <Button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-slate-800 hover:bg-slate-900 text-white shadow-lg shadow-slate-800/20 rounded-xl px-5 h-11 font-semibold"
                >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Добавить менеджера
                </Button>
            </div>

            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border overflow-hidden">
                <DataTable
                    columns={columns}
                    data={managers || []}
                />
            </div>

            <CreateHeadOfOrdersModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={refetch}
            />

            <EditManagerModal
                isOpen={!!editingUser}
                onClose={() => setEditingUser(null)}
                onSuccess={refetch}
                manager={editingUser ? {
                    id: editingUser.id,
                    username: editingUser.username,
                    full_name: editingUser.full_name,
                    role: editingUser.role,
                    is_active: editingUser.is_active
                } : null}
            />
        </PageContainer>
    );
}
