import React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "../../../components/ui/data-table";
import { Button } from "../../../components/ui/button";
import { Pencil, Plus } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
    DialogFooter,
} from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { MedOrgDetailModal } from "../../med-orgs/MedOrgDetailModal";
import { AddMedOrgModal } from "../../med-orgs/AddMedOrgModal";


const columns: ColumnDef<any>[] = [
    {
        accessorKey: "id",
        header: "#",
        cell: ({ row }) => <span className="text-slate-500">{row.index + 1}</span>
    },
    {
        accessorKey: "name",
        header: "НАЗВАНИЕ КОМПАНИИ",
        cell: ({ row }) => <span className="font-bold text-slate-900">{row.original.name || "—"}</span>
    },
    {
        accessorKey: "brand",
        header: "БРЕНД",
        cell: ({ row }) => <span className="font-bold text-slate-900">{row.original.brand || "—"}</span>
    },
    {
        accessorKey: "director_name",
        header: "ДИРЕКТОР",
        cell: ({ row }) => <span className="font-bold text-slate-700 text-xs uppercase">{row.original.director_name || "—"}</span>
    },
    {
        id: "actions",
        header: "ДЕЙСТВИЯ",
        cell: () => (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-slate-50">
                <Pencil className="h-4 w-4" />
            </Button>
        )
    }
];

interface MedRepPharmaciesTableProps {
    data: any[];
    medRepId?: string;
}

export function MedRepPharmaciesTable({ data, medRepId }: MedRepPharmaciesTableProps) {
    const [isAddOpen, setIsAddOpen] = React.useState(false);
    const [selectedOrg, setSelectedOrg] = React.useState<any | null>(null);

    return (
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/60 overflow-hidden h-full flex flex-col">
            <div className="p-6 border-b border-slate-100/80 flex justify-between items-center bg-slate-50/30">
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Аптеки</h3>
                <Button
                    variant="outline"
                    size="sm"
                    className="font-bold text-blue-600 border-blue-200 hover:bg-blue-50 rounded-xl px-4 uppercase text-[10px] tracking-widest shadow-sm"
                    onClick={() => setIsAddOpen(true)}
                >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    ДОБАВИТЬ
                </Button>
                <AddMedOrgModal
                    isOpen={isAddOpen}
                    onClose={() => {
                        setIsAddOpen(false);
                        window.location.reload();
                    }}
                    defaultRepId={medRepId}
                    defaultOrgType="pharmacy"
                />
            </div>
            <div className="flex-1">
                <DataTable columns={columns} data={data} onRowClick={(row) => setSelectedOrg(row)} />
            </div>

            <MedOrgDetailModal
                org={selectedOrg}
                isOpen={!!selectedOrg}
                onClose={() => setSelectedOrg(null)}
            />
        </div>
    );
}
