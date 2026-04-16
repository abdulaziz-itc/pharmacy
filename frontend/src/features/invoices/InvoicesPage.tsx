import React, { useState, useEffect, useMemo } from 'react';
import { PageContainer } from '../../components/PageContainer';
import { PageHeader } from '../../components/PageHeader';
import { FileText, Download, FileDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale/ru';
import { DataTable } from '../../components/ui/data-table';
import { Button } from '../../components/ui/button';
import { useAuthStore } from '../../store/authStore';
import { ModernStatsBar } from '../../components/ui/ModernStatsBar';
import { useSearchParams } from 'react-router-dom';
import { FilterBar } from '../../components/ui/FilterBar';
import type { FilterValues } from '../../components/ui/FilterBar';
import { formatMoney } from '../../components/ui/MoneyInput';
import { ReservationDetailsModal } from '../reservations/ReservationDetailsModal';

export default function InvoicesPage() {
    const [searchParams] = useSearchParams();
    const user = useAuthStore((state) => state.user);
    const isMedRep = user?.role === 'med_rep';

    const [filterValues, setFilterValues] = useState<FilterValues>({
        dateStart: '',
        dateEnd: '',
        selectedMedRep: 'all',
        selectedRegion: 'all',
        selectedCompany: 'all',
        selectedType: 'all',
        selectedInvoiceType: 'all',
        invNumSearch: searchParams.get('inv_num') || '',
    });

    useEffect(() => {
        const invNum = searchParams.get('inv_num');
        if (invNum) {
            setFilterValues(prev => ({ ...prev, invNumSearch: invNum }));
        }
    }, [searchParams]);

    const [selectedInvoiceForView, setSelectedInvoiceForView] = useState<any | null>(null);

    const { data: invoices = [], isLoading, refetch } = useQuery({
        queryKey: ['invoices', filterValues],
        queryFn: async () => {
            const params: any = {};
            if (filterValues.dateStart) params.date_from = filterValues.dateStart;
            if (filterValues.dateEnd) params.date_to = filterValues.dateEnd;
            if (filterValues.selectedMedRep !== 'all') params.med_rep_id = filterValues.selectedMedRep;
            if (filterValues.selectedRegion !== 'all') params.region_id = filterValues.selectedRegion;
            if (filterValues.selectedCompany !== 'all') params.med_org_id = filterValues.selectedCompany;
            if (filterValues.selectedType !== 'all') params.med_org_type = filterValues.selectedType;
            if (filterValues.selectedInvoiceType !== 'all') {
                params.is_tovar_skidka = filterValues.selectedInvoiceType === 'tovar_skidka';
            }
            if (filterValues.invNumSearch) params.inv_num = filterValues.invNumSearch;

            const response = await api.get('/sales/invoices/', { params });
            return Array.isArray(response.data) ? response.data : (response.data?.items || response.data || []);
        }
    });

    const { data: globalStats, isLoading: isStatsLoading } = useQuery({
        queryKey: ['invoice-stats', filterValues],
        queryFn: async () => {
            const params: any = {};
            if (filterValues.dateStart) params.date_from = filterValues.dateStart;
            if (filterValues.dateEnd) params.date_to = filterValues.dateEnd;
            if (filterValues.selectedMedRep !== 'all') params.med_rep_id = filterValues.selectedMedRep;
            if (filterValues.selectedRegion !== 'all') params.region_id = filterValues.selectedRegion;
            if (filterValues.selectedCompany !== 'all') params.med_org_id = filterValues.selectedCompany;
            if (filterValues.selectedType !== 'all') params.med_org_type = filterValues.selectedType;
            if (filterValues.selectedInvoiceType !== 'all') {
                params.is_tovar_skidka = filterValues.selectedInvoiceType === 'tovar_skidka';
            }
            if (filterValues.invNumSearch) params.inv_num = filterValues.invNumSearch;

            const response = await api.get('/sales/invoices/stats', { params });
            return response.data;
        }
    });

    const stats = useMemo(() => {
        if (!globalStats) return {
            totalAmount: 0,
            paidAmount: 0,
            debtAmount: 0,
            creditAmount: 0,
            resCount: 0,
            salaryAmount: 0,
            paidSalaryAmount: 0,
            promoAmount: 0
        };

        return {
            totalAmount: globalStats.total_amount,
            paidAmount: globalStats.paid_amount,
            debtAmount: globalStats.debt_amount,
            creditAmount: globalStats.credit_amount,
            resCount: globalStats.count,
            salaryAmount: globalStats.salary_amount,
            paidSalaryAmount: globalStats.paid_salary_amount,
            promoAmount: globalStats.promo_amount
        };
    }, [globalStats]);

    const exportToExcel = () => {
        if (!invoices || invoices.length === 0) return;

        const dataRows = invoices.map((inv: any) => {
            const date = inv.realization_date || inv.date;
            const res = inv.reservation;
            const medOrg = res?.med_org;
            const amount = Number(inv.total_amount) || 0;
            const paid = Number(inv.paid_amount) || 0;
            const debt = amount - paid;

            return {
                'Месяц': date ? format(new Date(date), 'MMMM', { locale: ru }) : '—',
                'ДАТА отгрузки': date ? format(new Date(date), 'dd.MM.yyyy') : '—',
                'Контрагент': medOrg?.name || res?.customer_name || '—',
                'ИНН': medOrg?.inn || '—',
                'ЭСФ': inv.factura_number || inv.id,
                'РЕГИОН': medOrg?.region?.name || '—',
                'Ответственный': medOrg?.assigned_reps?.[0]?.full_name || '—',
                'Сумма по счет фактуре': amount,
                'Поступление': paid,
                'Дебиторская задолженность': debt
            };
        });

        // Calculate Totals for the Summary Row
        const totalAmount = dataRows.reduce((sum, row) => sum + row['Сумма по счет фактуре'], 0);
        const totalPaid = dataRows.reduce((sum, row) => sum + row['Поступление'], 0);
        const totalDebt = dataRows.reduce((sum, row) => sum + row['Дебиторская задолженность'], 0);

        const summaryRow = {
            'Месяц': dataRows[0]['Месяц'],
            'ДАТА отгрузки': format(new Date(), 'yyyy'),
            'Контрагент': '',
            'ИНН': '',
            'ЭСФ': '',
            'РЕГИОН': '',
            'Ответственный': '',
            'Сумма по счет фактуре': totalAmount,
            'Поступление': totalPaid,
            'Дебиторская задолженность': totalDebt
        };

        // Create worksheet
        const worksheet = XLSX.utils.json_to_sheet([summaryRow, ...dataRows]);
        
        // Adjust column widths
        const wscols = [
            { wch: 15 }, // Месяц
            { wch: 15 }, // Дата
            { wch: 35 }, // Контрагент
            { wch: 12 }, // ИНН
            { wch: 15 }, // ЭСФ
            { wch: 15 }, // Регион
            { wch: 25 }, // Ответственный
            { wch: 20 }, // Сумма
            { wch: 20 }, // Поступление
            { wch: 20 }  // Задолженность
        ];
        worksheet['!cols'] = wscols;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Фактуры");
        
        XLSX.writeFile(workbook, `Vedomost_Faktur_${format(new Date(), 'dd.MM.yyyy')}.xlsx`);
    };

    const columns: any[] = [
        {
            accessorKey: 'id',
            header: 'ID',
        },
        {
            accessorKey: 'medRep',
            header: 'МП',
            cell: ({ row }: any) => {
                const reps = row.original.reservation?.med_org?.assigned_reps || [];
                return reps[0]?.full_name || '—';
            },
        },
        {
            accessorKey: 'factura_number',
            header: 'Номер фактуры',
            cell: ({ row }: any) => row.original.factura_number || `INV-${row.original.id}`,
        },
        {
            id: 'recipient',
            header: 'Получатель',
            cell: ({ row }: any) => row.original.reservation?.med_org?.name || row.original.reservation?.customer_name || '—',
        },
        {
            id: 'region',
            header: 'Регион',
            cell: ({ row }: any) => row.original.reservation?.med_org?.region?.name || '—',
        },
        {
            accessorKey: 'status',
            header: 'Статус',
            cell: ({ row }: any) => {
                if (row.original.is_deletion_pending || row.original.reservation?.is_deletion_pending) return <span className="text-amber-600 font-black">Ожидает удаления</span>;
                if (row.original.reservation?.is_return_pending) return <span className="text-purple-600 font-black">Ожидает возврата</span>;
                const statusMap: any = {
                    pending: 'Ожидает',
                    partial: 'Частично',
                    paid: 'Оплачено',
                    cancelled: 'Отменено',
                };
                return statusMap[row.original.status] || row.original.status;
            },
        },
        {
            id: 'realization_date',
            header: 'Дата реализации',
            cell: ({ row }: any) => {
                const d = row.original.realization_date || row.original.date;
                if (!d) return '—';
                return new Date(d).toLocaleDateString('ru-RU');
            },
        },
        {
            id: 'delay_days',
            header: 'Просрочка',
            cell: ({ row }: any) => {
                const d = row.original.realization_date || row.original.date;
                if (!d) return '—';
                const diff = new Date().getTime() - new Date(d).getTime();
                const days = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
                const isOverdue = days > 30;
                return (
                    <span className={`font-black ${isOverdue ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {days} дн.
                    </span>
                );
            },
        },
        {
            id: 'total_amount',
            header: 'Сумма',
            cell: ({ row }: any) => formatMoney(row.original.total_amount || 0) + ' UZS',
        },
        {
            id: 'paid_amount',
            header: 'Оплачено',
            cell: ({ row }: any) => formatMoney(row.original.paid_amount || 0) + ' UZS',
        },
        {
            id: 'salary_expense',
            header: 'Зарплата',
            cell: ({ row }: any) => {
                const res = row.original.reservation;
                if (!res) return '—';
                if (res.is_salary_enabled === false) return '—';
                
                let totalSalary = 0;
                (res.items || []).forEach((item: any) => {
                    const salaryAmt = item.salary_amount || 0;
                    totalSalary += (item.quantity || 0) * salaryAmt;
                });
                
                return formatMoney(totalSalary) + ' UZS';
            },
        },
        {
            id: 'actions',
            header: '',
            cell: ({ row }: any) => {
                const handleDownload = async () => {
                    try {
                        const res = row.original.reservation;
                        if (!res) return;
                        
                        const orgName = (res.med_org?.name || res.customer_name) || 'invoice';
                        const orgInn = res.med_org?.inn || 'inn';
                        const dateStr = new Date().toLocaleDateString('ru-RU');
                        const filename = `${orgName}_${orgInn}_${dateStr}.xlsx`;

                        const response = await api.get(`/sales/reservations/${res.id}/export`, {
                            responseType: 'blob'
                        });
                        const url = window.URL.createObjectURL(new Blob([response.data]));
                        const link = document.createElement('a');
                        link.href = url;
                        link.setAttribute('download', filename);
                        document.body.appendChild(link);
                        link.click();
                        link.remove();
                    } catch (error) {
                        console.error('Download failed:', error);
                    }
                };

                return (
                    <Button variant="ghost" size="icon" onClick={handleDownload} title="Скачать фактуру">
                        <Download className="w-4 h-4 text-blue-500" />
                    </Button>
                );
            }
        }
    ];

    return (
        <PageContainer>
            <PageHeader
                title="Фактура"
                description="Просмотр записей «Счетов-фактур», цифровых подписей и статуса соответствия налоговым требованиям."
                buttonLabel={isMedRep ? undefined : "Создать фактуру"}
            />

            <ModernStatsBar 
                stats={stats}
                promoAmount={stats.promoAmount}
                countLabel="Всего фактур"
                totalLabel="Реализация (общая)"
            />

            <div className="flex justify-end gap-3 mb-4">
                 <Button 
                    onClick={exportToExcel}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-600/20 px-6 font-semibold gap-2"
                >
                    <FileDown className="w-4 h-4" />
                    Скачать в Excel
                </Button>
            </div>

            <FilterBar 
                values={filterValues}
                onChange={setFilterValues}
                onSearch={() => refetch()}
                onReset={() => {
                    setFilterValues({ dateStart: '', dateEnd: '', selectedMedRep: 'all', selectedRegion: 'all', selectedCompany: 'all', selectedType: 'all', selectedInvoiceType: 'all', invNumSearch: '' });
                    refetch();
                }}
            />

            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border overflow-hidden hover-lift transition-all duration-500 min-h-[500px]">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-[500px] text-slate-400">
                        <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin mb-4" />
                        <p className="font-medium animate-pulse">Загрузка данных...</p>
                    </div>
                ) : !invoices || invoices.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[500px] text-center p-12">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-50 text-slate-400 mb-6 shadow-inner">
                            <FileText className="w-10 h-10" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight">Нет фактур</h3>
                        <p className="text-slate-500 mt-3 max-w-sm font-medium">Финансовые документы появятся здесь после подтверждения броней.</p>
                    </div>
                ) : (
                    <div className="p-1">
                        <DataTable
                            columns={columns}
                            data={invoices}
                            onRowClick={(row) => setSelectedInvoiceForView(row)}
                            getRowClassName={(row: any) => {
                                if (row.is_deletion_pending || row.reservation?.is_deletion_pending || row.reservation?.is_return_pending) return 'bg-yellow-100/70 hover:bg-yellow-100';
                                
                                const debt = (row.total_amount || 0) - (row.paid_amount || 0);
                                if (debt > 0) {
                                    const d = row.realization_date || row.date;
                                    if (d) {
                                        const diff = new Date().getTime() - new Date(d).getTime();
                                        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                                        if (days > 30) return 'bg-rose-50 hover:bg-rose-100 transition-colors cursor-pointer';
                                    }
                                }
                                return '';
                            }}
                        />
                    </div>
                )}
            </div>

            <ReservationDetailsModal
                isOpen={!!selectedInvoiceForView}
                onClose={() => setSelectedInvoiceForView(null)}
                reservation={selectedInvoiceForView?.reservation}
            />
        </PageContainer>
    );
}
