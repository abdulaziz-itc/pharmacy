import React from 'react';
import { DataTable } from '../../components/ui/data-table';
import { medOrgColumns } from './medOrgColumns';
import { useMedOrgStore } from '../../store/medOrgStore';
import MedOrgFilters from './MedOrgFilters';
import { PageContainer } from '../../components/PageContainer';
import { PageHeader } from '../../components/PageHeader';
import { AddMedOrgModal } from './AddMedOrgModal';
import { MedOrgDetailModal } from './MedOrgDetailModal';
import type { MedicalOrganization } from '../../store/medOrgStore';

export default function MedOrgsPage() {
    const { medOrgs, fetchMedOrgs, isLoading } = useMedOrgStore();
    const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
    const [selectedOrg, setSelectedOrg] = React.useState<MedicalOrganization | null>(null);

    React.useEffect(() => {
        fetchMedOrgs();
    }, [fetchMedOrgs]);

    if (isLoading && medOrgs.length === 0) {
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
                title="Медицинские организации"
                description="Каталог больниц, клиник и пунктов распределения фармацевтических препаратов."
                buttonLabel="Добавить организацию"
                onButtonClick={() => setIsAddModalOpen(true)}
            />

            <div className="bg-white rounded-[40px] shadow-2xl shadow-slate-200/60 border border-slate-100 overflow-hidden hover-lift transition-all duration-500">
                <DataTable
                    columns={medOrgColumns}
                    data={medOrgs}
                    searchColumn="name"
                    filters={<MedOrgFilters />}
                    onRowClick={(row) => setSelectedOrg(row)}
                />
            </div>

            <AddMedOrgModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
            />

            <MedOrgDetailModal
                org={selectedOrg}
                isOpen={!!selectedOrg}
                onClose={() => setSelectedOrg(null)}
            />
        </PageContainer>
    );
}
