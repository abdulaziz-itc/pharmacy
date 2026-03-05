import React from 'react';
import { DataTable } from '../../components/ui/data-table';
import { medOrgColumns } from './medOrgColumns';
import { useMedOrgStore } from '../../store/medOrgStore';
import MedOrgFilters from './MedOrgFilters';
import { PageContainer } from '../../components/PageContainer';
import { PageHeader } from '../../components/PageHeader';
import { AddMedOrgModal } from './AddMedOrgModal';
import { MedOrgDetailModal } from './MedOrgDetailModal';
import { PharmacyStockTable } from './PharmacyStockTable';
import type { MedicalOrganization } from '../../store/medOrgStore';

export default function MedOrgsPage() {
    const { medOrgs, fetchMedOrgs, isLoading } = useMedOrgStore();
    const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
    const [selectedOrg, setSelectedOrg] = React.useState<MedicalOrganization | null>(null);
    const [activeTab, setActiveTab] = React.useState<'list' | 'stocks'>('list');

    React.useEffect(() => {
        fetchMedOrgs();
    }, [fetchMedOrgs]);

    return (
        <PageContainer>
            <PageHeader
                title="Медицинские организации"
                description="Каталог больниц, клиник и пунктов распределения фармацевтических препаратов."
                buttonLabel="Добавить организацию"
                onButtonClick={() => setIsAddModalOpen(true)}
            />

            <div className="flex gap-2 mb-6 bg-slate-100/50 p-1.5 rounded-2xl w-fit border border-slate-200/50 backdrop-blur-sm">
                <button
                    onClick={() => setActiveTab('list')}
                    className={`px-6 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${activeTab === 'list'
                            ? 'bg-white text-blue-600 shadow-lg shadow-blue-500/10 border border-slate-200/50'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                        }`}
                >
                    СПИСОК ОРГАНИЗАЦИЙ
                </button>
                <button
                    onClick={() => setActiveTab('stocks')}
                    className={`px-6 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${activeTab === 'stocks'
                            ? 'bg-white text-blue-600 shadow-lg shadow-blue-500/10 border border-slate-200/50'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                        }`}
                >
                    ОСТАТКИ АПТЕК
                </button>
            </div>

            {activeTab === 'list' ? (
                <div className="bg-white rounded-[40px] shadow-2xl shadow-slate-200/60 border border-slate-100 overflow-hidden hover-lift transition-all duration-500 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <DataTable
                        columns={medOrgColumns}
                        data={medOrgs}
                        searchColumn="name"
                        filters={<MedOrgFilters />}
                        onRowClick={(row) => setSelectedOrg(row)}
                    />
                </div>
            ) : (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <PharmacyStockTable />
                </div>
            )}

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
