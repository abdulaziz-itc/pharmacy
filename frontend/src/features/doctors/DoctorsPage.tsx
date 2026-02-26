import { useEffect } from 'react';
import { DataTable } from '../../components/ui/data-table';
import { columns } from './doctorColumns';
import { useDoctorStore } from '../../store/doctorStore';
import DoctorStats from './DoctorStats';
import DoctorFilters from './DoctorFilters';
import { useProductStore } from '../../store/productStore';
import { DoctorRowExpanded } from './DoctorRowExpanded';
import { PageContainer } from '../../components/PageContainer';
import { PageHeader } from '../../components/PageHeader';

export default function DoctorsPage() {
    const {
        fetchDoctors,
        selectedMonth,
        selectedYear,
        setMonth,
        setYear,
        getFilteredDoctors
    } = useDoctorStore();
    const { fetchProducts } = useProductStore();

    const filteredDoctors = getFilteredDoctors();

    // Fetch on mount and whenever month/year changes
    useEffect(() => {
        fetchDoctors(selectedMonth, selectedYear);
        fetchProducts(); // Added fetchProducts call
    }, [fetchDoctors, fetchProducts, selectedMonth, selectedYear]);

    const handleMonthChange = (m: number) => {
        setMonth(m);
    };

    const handleYearChange = (y: number) => {
        if (y >= 2020 && y <= 2099) setYear(y);
    };

    return (
        <PageContainer>
            <PageHeader
                title="Врачи"
                description="Управление связями с врачами и мониторинг выполнения планов."
            />

            <DataTable
                columns={columns}
                data={filteredDoctors}
                searchColumn="name"
                topContent={<DoctorStats />}
                filters={
                    <DoctorFilters
                        month={selectedMonth}
                        year={selectedYear}
                        onMonthChange={handleMonthChange}
                        onYearChange={handleYearChange}
                    />
                }
                renderSubComponent={({ row }) => (
                    <DoctorRowExpanded
                        doctor={row.original}
                        month={selectedMonth}
                        year={selectedYear}
                    />
                )}
            />
        </PageContainer>
    );
}
