import { useEffect, useState } from 'react';
import { DataTable } from '../../components/ui/data-table';
import { columns } from './manufacturerColumns';
import { useManufacturerStore } from '../../store/manufacturerStore';
import { PageContainer } from '../../components/PageContainer';
import { PageHeader } from '../../components/PageHeader';
import { AddManufacturerModal } from '../products/AddManufacturerModal';

export default function ManufacturerPage() {
    const { manufacturers, fetchManufacturers, isLoading } = useManufacturerStore();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    useEffect(() => {
        fetchManufacturers();
    }, [fetchManufacturers]);

    if (isLoading && manufacturers.length === 0) {
        return (
            <PageContainer>
                <div className="flex items-center justify-center h-64">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Загрузка данных...</p>
                    </div>
                </div>
            </PageContainer>
        )
    }

    return (
        <PageContainer>
            <PageHeader
                title="Производственные компании"
                description="Управление списком производственных и фармацевтических компаний."
                buttonLabel="Добавить производителя"
                onButtonClick={() => setIsAddModalOpen(true)}
            />

            <div className="bg-white rounded-[40px] shadow-2xl shadow-slate-200/60 border border-slate-100 overflow-hidden hover-lift transition-all duration-500">
                <DataTable
                    columns={columns}
                    data={manufacturers}
                    searchColumn="name"
                />
            </div>

            <AddManufacturerModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
            />
        </PageContainer>
    );
}
