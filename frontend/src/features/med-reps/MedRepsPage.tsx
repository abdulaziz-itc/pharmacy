import React from 'react';
import { useMedRepStore } from '../../store/medRepStore';
import { medRepColumns } from './medRepColumns';
import { DataTable } from '../../components/ui/data-table';
import { PageContainer } from '../../components/PageContainer';
import { useNavigate } from 'react-router-dom';

export default function MedRepsPage() {
    const navigate = useNavigate();
    const { medReps, fetchMedReps, isLoading } = useMedRepStore();
    React.useEffect(() => {
        fetchMedReps("med_rep");
    }, [fetchMedReps]);

    if (isLoading && medReps.length === 0) {
        return (
            <PageContainer>
                <div className="flex items-center justify-center h-64">
                    <p className="text-slate-400">Загрузка...</p>
                </div>
            </PageContainer>
        )
    }

    return (
        <PageContainer>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Медицинские представители</h1>
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border overflow-hidden hover-lift transition-all duration-500">
                <DataTable
                    columns={medRepColumns}
                    data={medReps}
                    searchColumn="username"
                    onRowClick={(row) => navigate(`/med-reps/${row.id}`)}
                />
            </div>
        </PageContainer>
    );
}
