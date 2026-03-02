import { useEffect } from 'react';
import { DataTable } from '../../components/ui/data-table';
import { getDoctorColumns } from './doctorColumns';
import { useDoctorStore } from '../../store/doctorStore';
import DoctorStats from './DoctorStats';
import DoctorFilters from './DoctorFilters';
import { useProductStore } from '../../store/productStore';
import { DoctorRowExpanded } from './DoctorRowExpanded';
import { PageContainer } from '../../components/PageContainer';
import { PageHeader } from '../../components/PageHeader';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'sonner';
import { useMemo, useState } from 'react';
import type { Doctor } from '../../store/doctorStore';

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

    const currentUser = useAuthStore((state) => state.user);
    const canToggle = currentUser?.role && ['admin', 'director', 'deputy_director', 'product_manager'].includes(currentUser.role);
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    const handleToggleActive = async (doctor: Doctor) => {
        try {
            setIsSubmitting(true);
            const api = (await import('../../api/axios')).default;
            await api.put(`/doctors/${doctor.id}`, {
                is_active: doctor.is_active === false ? true : false
            });
            await fetchDoctors(selectedMonth, selectedYear);
            toast.success("Статус успешно изменен.");
        } catch (error: any) {
            console.error("Failed to toggle active status:", error);
            if (error.response?.data?.detail) {
                toast.error(error.response.data.detail);
            } else {
                toast.error("Ошибка при изменении статуса.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const doctorTableColumns = useMemo(() => getDoctorColumns(
        canToggle ? handleToggleActive : undefined
    ), [canToggle, selectedMonth, selectedYear]);

    return (
        <PageContainer>
            <PageHeader
                title="Врачи"
                description="Управление связями с врачами и мониторинг выполнения планов."
            />

            <DataTable
                columns={doctorTableColumns}
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
