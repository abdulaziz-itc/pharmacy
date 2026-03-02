import React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "../../../components/ui/data-table";
import { Button } from "../../../components/ui/button";
import { Plus, Pencil, UserMinus, UserPlus } from "lucide-react";
import { AddDoctorModal } from "./AddDoctorModal";
import { DoctorDetailModal } from "./DoctorDetailModal";
import { useAuthStore } from "../../../store/authStore";
import { toast } from "sonner";


const columns: ColumnDef<any>[] = [
    {
        accessorKey: "id",
        header: "#",
        cell: ({ row }) => <span className="text-slate-500">{row.index + 1}</span>
    },
    {
        accessorKey: "fullName",
        header: "ПОЛНОЕ ИМЯ",
        cell: ({ row }) => (
            <span className={`font-bold ${row.original.rawDoctor?.is_active === false ? 'text-slate-400 opacity-70' : 'text-slate-900'}`}>
                {row.original.fullName} {row.original.rawDoctor?.is_active === false && "(Faol emas)"}
            </span>
        )
    },
    {
        accessorKey: "specialty",
        header: "СПЕЦИАЛЬНОСТЬ",
        cell: ({ row }) => <span className="font-medium text-slate-700">{row.original.specialty}</span>
    },
    {
        accessorKey: "organization",
        header: "МЕДИЦИНСКАЯ ОРГАНИЗАЦИЯ",
        cell: ({ row }) => <span className="font-bold text-slate-700">{row.original.organization}</span>
    },
    {
        accessorKey: "category",
        header: "КАТЕГОРИЯ",
        cell: ({ row }) => <span className="font-bold text-slate-900">{row.original.category}</span>
    },
    {
        id: "actions",
        header: "ДЕЙСТВИЯ",
        cell: ({ row, table }) => {
            const onEditClick = (table.options.meta as any)?.onEditClick;
            const onToggleActive = (table.options.meta as any)?.onToggleActive;
            const isActive = row.original.rawDoctor?.is_active !== false;

            return (
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                        onClick={(e) => {
                            e.stopPropagation();
                            onEditClick && onEditClick(row.original);
                        }}
                    >
                        <Pencil className="h-4 w-4" />
                    </Button>
                    {onToggleActive && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 ${isActive ? 'text-red-400 hover:text-red-600 hover:bg-red-50' : 'text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleActive(row.original);
                            }}
                            title={isActive ? "Деактивировать" : "Активировать"}
                        >
                            {isActive ? <UserMinus className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                        </Button>
                    )}
                </div>
            );
        }
    }
];

interface MedRepDoctorsTableProps {
    data: any[];
    salesPlans: any[];
    salesFacts: any[];
    bonusPayments?: any[];
}

export function MedRepDoctorsTable({ data, salesPlans, salesFacts, bonusPayments = [] }: MedRepDoctorsTableProps) {
    const [isAddOpen, setIsAddOpen] = React.useState(false);
    const [selectedDoctor, setSelectedDoctor] = React.useState<any>(null);
    const [isEditMode, setIsEditMode] = React.useState(false);

    const currentUser = useAuthStore((state) => state.user);
    const canToggle = currentUser?.role && ['admin', 'director', 'deputy_director', 'product_manager'].includes(currentUser.role);

    const handleToggleActive = async (doctorData: any) => {
        try {
            const api = (await import('../../../api/axios')).default;
            const doctor = doctorData.rawDoctor;
            await api.put(`/doctors/${doctor.id}`, {
                is_active: doctor.is_active === false ? true : false
            });
            toast.success("Статус успешно изменен.");
            window.location.reload();
        } catch (error: any) {
            console.error("Failed to toggle active status:", error);
            if (error.response?.data?.detail) {
                toast.error(error.response.data.detail);
            } else {
                toast.error("Ошибка при изменении статуса.");
            }
        }
    };

    return (
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/60 overflow-hidden h-full flex flex-col">
            <div className="p-6 border-b border-slate-100/80 flex justify-between items-center bg-slate-50/30">
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Врачи</h3>
                <Button
                    variant="outline"
                    size="sm"
                    className="font-bold text-blue-600 border-blue-200 hover:bg-blue-50 rounded-xl px-4 uppercase text-[10px] tracking-widest shadow-sm"
                    onClick={() => setIsAddOpen(true)}
                >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    ДОБАВИТЬ
                </Button>
                <AddDoctorModal
                    isOpen={isAddOpen}
                    onClose={() => setIsAddOpen(false)}
                    onSuccess={() => window.location.reload()}
                />
            </div>
            <div className="flex-1">
                <DataTable
                    columns={columns}
                    data={data}
                    onRowClick={(doctor: any) => {
                        setSelectedDoctor(doctor);
                        setIsEditMode(false);
                    }}
                    meta={{
                        onEditClick: (doctor: any) => {
                            setSelectedDoctor(doctor);
                            setIsEditMode(true);
                        },
                        onToggleActive: canToggle ? handleToggleActive : undefined
                    }}
                />
            </div>

            {/* Doctor Detail Modal */}
            <DoctorDetailModal
                isOpen={!!selectedDoctor}
                onClose={() => {
                    setSelectedDoctor(null);
                    setIsEditMode(false);
                }}
                onSuccess={() => window.location.reload()}
                doctor={selectedDoctor?.rawDoctor}
                salesPlans={salesPlans}
                salesFacts={salesFacts}
                bonusPayments={bonusPayments}
                defaultEditMode={isEditMode}
            />
        </div>
    );
}
