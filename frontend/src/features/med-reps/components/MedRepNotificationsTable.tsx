import React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "../../../components/ui/data-table";
import { Button } from "../../../components/ui/button";
import { Trash2, Plus } from "lucide-react";
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

type Notification = {
    id: number;
    topic: string;
    date: string;
    status: string;
    doctorPharmacy: string;
};


const columns: ColumnDef<Notification>[] = [
    {
        accessorKey: "id",
        header: "#",
        cell: ({ row }) => <span className="text-slate-500">{row.index + 1}</span>
    },
    {
        accessorKey: "topic",
        header: "ТЕМА",
        cell: ({ row }) => <span className="font-bold text-slate-900">{row.original.topic}</span>
    },
    {
        accessorKey: "date",
        header: "ДАТА",
        cell: ({ row }) => <span className="text-slate-600">{row.original.date}</span>
    },
    {
        accessorKey: "status",
        header: "СТАТУС",
        cell: ({ row }) => <span className="font-medium text-slate-700">{row.original.status}</span>
    },
    {
        accessorKey: "doctorPharmacy",
        header: "ДОКТОР/АПТЕКА/ОПТОВАЯ КОМПАНИЯ",
        cell: ({ row }) => <span className="font-medium text-slate-700">{row.original.doctorPharmacy}</span>
    },
    {
        id: "actions",
        header: "УДАЛИТЬ",
        cell: () => (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50">
                <Trash2 className="h-4 w-4" />
            </Button>
        )
    }
];

export function MedRepNotificationsTable({ data = [] }: { data?: Notification[] }) {
    const [isAddOpen, setIsAddOpen] = React.useState(false);

    return (
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/60 overflow-hidden h-full flex flex-col">
            <div className="p-6 border-b border-slate-100/80 flex justify-between items-center bg-slate-50/30">
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Уведомления</h3>
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="font-bold text-blue-600 border-blue-200 hover:bg-blue-50 rounded-xl px-4 uppercase text-[10px] tracking-widest shadow-sm">
                            <Plus className="w-3.5 h-3.5 mr-1" />
                            ДОБАВИТЬ
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px] rounded-3xl">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-black text-slate-900">Новое уведомление</DialogTitle>
                            <DialogDescription className="text-slate-500 text-xs">
                                Отправьте уведомление представителю или в организацию.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="topic" className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Тема</Label>
                                <Input id="topic" placeholder="Тема уведомления" className="rounded-xl border-slate-200" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="recipient" className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Получатель</Label>
                                <Input id="recipient" placeholder="Доктор или Аптека" className="rounded-xl border-slate-200" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest h-10 shadow-lg shadow-blue-500/20" onClick={() => setIsAddOpen(false)}>
                                Отправить
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
            <div className="flex-1">
                <DataTable columns={columns} data={data} />
            </div>
        </div>
    );
}
