import React from 'react';
import { PageContainer } from '../../components/PageContainer';
import { DataTable } from '../../components/ui/data-table';
import { Button } from '../../components/ui/button';
import { UserPlus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { type User, UserRole } from '../../store/authStore';
import { getDeputyDirectorColumns } from './deputyDirectorColumns';
import { CreateDeputyDirectorModal } from './components/CreateDeputyDirectorModal';
import { EditManagerModal } from '../product-managers/EditManagerModal';

export default function DeputyDirectorsPage() {
    const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
    const [editingUser, setEditingUser] = React.useState<User | null>(null);

    const { data: deputyDirectors, isLoading, refetch } = useQuery<User[]>({
        queryKey: ['deputy-directors'],
        queryFn: async () => {
            // Fetch all users and filter by DEPUTY_DIRECTOR role
            const response = await api.get('/users/', { params: { limit: 1000 } });
            return response.data.filter((u: User) => u.role === UserRole.DEPUTY_DIRECTOR);
        },
    });

    const columns = React.useMemo(() => getDeputyDirectorColumns(
        (user: User) => setEditingUser(user),
        async (user: User) => {
            // activate/deactivate
            try {
                await api.put(`/users/${user.id}`, {
                    is_active: user.is_active === false ? true : false
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
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Заместители директора</h1>
                    <p className="text-slate-500 mt-1 font-medium">Управление заместителями и их правами</p>
                </div>
                <Button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 rounded-xl px-5 h-11 font-semibold"
                >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Добавить заместителя
                </Button>
            </div>

            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border overflow-hidden">
                <DataTable
                    columns={columns}
                    data={deputyDirectors || []}
                />
            </div>

            <CreateDeputyDirectorModal
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
