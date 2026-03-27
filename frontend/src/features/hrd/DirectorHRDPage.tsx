import { useState, useEffect, useMemo } from 'react';
import { PageContainer } from '../../components/PageContainer';
import { PageHeader } from '../../components/PageHeader';
import { DataTable } from '../../components/ui/data-table';
import { hrdUserColumns } from './hrdUserColumns';
import { useUserStore, type User } from '../../store/userStore';
import { UserModal } from './UserModal';
import axiosInstance from '../../api/axios';
import { toast } from 'sonner';

export default function DirectorHRDPage() {
    const { users, fetchUsers, isLoading } = useUserStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleEdit = (user: User) => {
        setSelectedUser(user);
        setIsModalOpen(true);
    };

    const handleToggleActive = async (user: User) => {
        try {
            await axiosInstance.put(`/users/${user.id}`, {
                is_active: !user.is_active
            });
            await fetchUsers();
            toast.success(`Пользователь ${user.is_active ? 'деактивирован' : 'активирован'}`);
        } catch (error: any) {
            console.error("Failed to toggle user status", error);
            const msg = error.response?.data?.detail || "Ошибка при изменении статуса.";
            toast.error(msg);
        }
    };

    const columns = useMemo(() => hrdUserColumns(handleEdit, handleToggleActive), [fetchUsers]);
    
    // Filter only HRD accounts for the director
    const hrdUsers = useMemo(() => {
        return users.filter(u => u.role === 'hrd');
    }, [users]);

    return (
        <PageContainer>
            <PageHeader
                title="Директор отдела кадров"
                description="Создание и управление учетными записями HR директора."
                buttonLabel="Создать HR"
                onButtonClick={() => {
                    setSelectedUser(null);
                    setIsModalOpen(true);
                }}
            />

            <UserModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedUser(null);
                }}
                user={selectedUser}
                defaultRole="hrd"
                lockRole={true}
            />

            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border overflow-hidden hover-lift transition-all duration-500">
                <DataTable
                    columns={columns}
                    data={hrdUsers}
                    searchColumn="full_name"
                />
            </div>
        </PageContainer>
    );
}
