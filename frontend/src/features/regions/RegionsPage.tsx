import { useState, useEffect } from 'react';
import { PageContainer } from '../../components/PageContainer';
import { PageHeader } from '../../components/PageHeader';
import { AddRegionModal } from './AddRegionModal';
import { DataTable } from '../../components/ui/data-table';
import { columns } from './regionColumns';
import { useRegionStore } from '../../store/regionStore';

export default function RegionsPage() {
    const { regions, fetchRegions } = useRegionStore();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    useEffect(() => {
        fetchRegions();
    }, [fetchRegions]);
    return (
        <PageContainer>
            <PageHeader
                title="Регионы рынка"
                description="Определение географических границ и сегментация распределительных сетей."
                buttonLabel="Добавить регион"
                onButtonClick={() => setIsAddModalOpen(true)}
            />

            <AddRegionModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
            />

            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border overflow-hidden hover-lift transition-all duration-500">
                <DataTable
                    columns={columns}
                    data={regions}
                    searchColumn="name"
                />
            </div>
        </PageContainer>
    );
}
