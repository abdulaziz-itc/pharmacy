import React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "../../../components/ui/data-table";
import { Button } from "../../../components/ui/button";
import { Plus, Pencil, UserMinus, UserPlus, Trash2 } from "lucide-react";
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
                    {/* Delete button – only for inactive doctors */}
                    {!isActive && (() => {
                        const onDeleteClick = (table.options.meta as any)?.onDeleteClick;
                        return onDeleteClick ? (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-rose-400 hover:text-rose-700 hover:bg-rose-50"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteClick(row.original);
                                }}
                                title="O'chirish (bazadan)"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        ) : null;
                    })()}
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
    products?: any[];
}

export function MedRepDoctorsTable({ data, salesPlans, salesFacts, bonusPayments = [], products = [] }: MedRepDoctorsTableProps) {
    const [isAddOpen, setIsAddOpen] = React.useState(false);
    const [selectedDoctor, setSelectedDoctor] = React.useState<any>(null);
    const [isEditMode, setIsEditMode] = React.useState(false);
    const [activeTab, setActiveTab] = React.useState<'active' | 'archive'>('active');

    const currentUser = useAuthStore((state) => state.user);
    const canToggle = currentUser?.role && ['admin', 'director', 'deputy_director', 'product_manager'].includes(currentUser.role);

    const activeDoctors = React.useMemo(() => data.filter(d => d.rawDoctor?.is_active !== false), [data]);
    const archivedDoctors = React.useMemo(() => data.filter(d => d.rawDoctor?.is_active === false), [data]);

    const handleToggleActive = async (doctorData: any) => {
        try {
            const api = (await import('../../../api/axios')).default;
            const doctor = doctorData.rawDoctor;
            await api.put(`/crm/doctors/${doctor.id}`, {
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

    const handleDeleteDoctor = async (doctorData: any) => {
        const doctor = doctorData.rawDoctor;
        const confirmed = window.confirm(`"${doctor.full_name}" – bu vrach bazadan butunlay o'chiriladi. Davom etasizmi?`);
        if (!confirmed) return;
        try {
            const api = (await import('../../../api/axios')).default;
            await api.delete(`/crm/doctors/${doctor.id}`);
            toast.success("Vrach bazadan o'chirildi.");
            window.location.reload();
        } catch (error: any) {
            const msg = error.response?.data?.detail || "O'chirishda xato yuz berdi.";
            toast.error(msg);
        }
    };

    const tableMeta = {
        onEditClick: (doctor: any) => { setSelectedDoctor(doctor); setIsEditMode(true); },
        onToggleActive: canToggle ? handleToggleActive : undefined,
        onDeleteClick: canToggle ? handleDeleteDoctor : undefined,
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

            {/* Tabs */}
            <div className="flex border-b border-slate-100 bg-slate-50/30 px-4 pt-1">
                <button
                    onClick={() => setActiveTab('active')}
                    className={`px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors border-b-2 mr-2 ${activeTab === 'active'
                        ? 'text-blue-600 border-blue-500'
                        : 'text-slate-400 border-transparent hover:text-slate-600'
                        }`}
                >
                    Faol
                    <span className="ml-1.5 bg-blue-100 text-blue-700 text-[9px] font-black px-1.5 py-0.5 rounded-full">
                        {activeDoctors.length}
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab('archive')}
                    className={`px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'archive'
                        ? 'text-slate-700 border-slate-500'
                        : 'text-slate-400 border-transparent hover:text-slate-600'
                        }`}
                >
                    Arxiv
                    {archivedDoctors.length > 0 && (
                        <span className="ml-1.5 bg-slate-200 text-slate-600 text-[9px] font-black px-1.5 py-0.5 rounded-full">
                            {archivedDoctors.length}
                        </span>
                    )}
                </button>
            </div>

            <div className="flex-1">
                <DataTable
                    columns={columns}
                    data={activeTab === 'active' ? activeDoctors : archivedDoctors}
                    onRowClick={(doctor: any) => {
                        setSelectedDoctor(doctor);
                        setIsEditMode(false);
                    }}
                    meta={tableMeta}
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
                products={products}
                defaultEditMode={isEditMode}
            />
        </div>
    );
}
