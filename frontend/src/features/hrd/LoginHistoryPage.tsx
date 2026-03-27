import { useEffect } from 'react';
import { PageContainer } from '../../components/PageContainer';
import { PageHeader } from '../../components/PageHeader';
import { DataTable } from '../../components/ui/data-table';
import { loginHistoryColumns } from './loginHistoryColumns';
import { useUserStore } from '../../store/userStore';

export default function LoginHistoryPage() {
    const { loginHistory, fetchLoginHistory, isLoading } = useUserStore();

    useEffect(() => {
        fetchLoginHistory();
    }, [fetchLoginHistory]);

    return (
        <PageContainer>
            <PageHeader
                title="История входов"
                description="Мониторинг активности пользователей: время входа, IP-адрес и используемые устройства."
            />

            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border overflow-hidden hover-lift transition-all duration-500">
                <DataTable
                    columns={loginHistoryColumns}
                    data={loginHistory}
                    searchColumn="user.full_name"
                />
            </div>
        </PageContainer>
    );
}
