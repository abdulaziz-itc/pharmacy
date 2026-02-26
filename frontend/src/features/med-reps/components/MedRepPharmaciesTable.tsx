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
}

export function MedRepPharmaciesTable({ data }: MedRepPharmaciesTableProps) {
    const [isAddOpen, setIsAddOpen] = React.useState(false);
    const [selectedOrg, setSelectedOrg] = React.useState<any | null>(null);

    return (
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/60 overflow-hidden h-full flex flex-col">
            <div className="p-6 border-b border-slate-100/80 flex justify-between items-center bg-slate-50/30">
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Аптеки</h3>
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="font-bold text-blue-600 border-blue-200 hover:bg-blue-50 rounded-xl px-4 uppercase text-[10px] tracking-widest shadow-sm">
                            <Plus className="w-3.5 h-3.5 mr-1" />
                            ДОБАВИТЬ
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px] rounded-3xl">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-black text-slate-900">Прикрепить аптеку</DialogTitle>
                            <DialogDescription className="text-slate-500 text-xs">
                                Выберите аптеку из списка для прикрепления к представителю.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="pharmacy" className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Аптека</Label>
                                <Input id="pharmacy" placeholder="Название аптеки" className="rounded-xl border-slate-200" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest h-10 shadow-lg shadow-blue-500/20" onClick={() => setIsAddOpen(false)}>
                                Прикрепить
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
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
