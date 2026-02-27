import React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "../../../components/ui/data-table";
import { Button } from "../../../components/ui/button";
import { Plus, Pencil } from "lucide-react";
import { AddDoctorModal } from "./AddDoctorModal";
import { DoctorDetailModal } from "./DoctorDetailModal";


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
            return (
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
            );
        }
    }
];

interface MedRepDoctorsTableProps {
    data: any[];
    salesPlans: any[];
    salesFacts: any[];
}

export function MedRepDoctorsTable({ data, salesPlans, salesFacts }: MedRepDoctorsTableProps) {
    const [isAddOpen, setIsAddOpen] = React.useState(false);
    const [selectedDoctor, setSelectedDoctor] = React.useState<any>(null);
    const [isEditMode, setIsEditMode] = React.useState(false);

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
                        }
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
                defaultEditMode={isEditMode}
            />
        </div>
    );
}
