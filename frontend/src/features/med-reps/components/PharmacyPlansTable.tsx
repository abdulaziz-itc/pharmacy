import React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "../../../components/ui/data-table";
import { Button } from "../../../components/ui/button";
import { Trash2, Plus } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../../../components/ui/select";
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
import { DatePicker } from "../../../components/ui/date-picker";


const columns: ColumnDef<any>[] = [
    {
        accessorKey: "id",
        header: "#",
        cell: ({ row }) => <span className="text-slate-500">{row.index + 1}</span>
    },
    {
        accessorKey: "pharmacyName",
        header: "АПТЕКА",
        cell: ({ row }) => <span className="font-medium text-slate-900">{row.original.pharmacyName}</span>
    },
    {
        accessorKey: "date",
        header: "ДАТА",
        cell: ({ row }) => <span className="text-slate-600">{row.original.date}</span>
    },
    {
        accessorKey: "status",
        header: "СТАТУС",
        cell: ({ row }) => {
            const status = row.original.status;
            return (
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${status === "Выполнен" ? "bg-emerald-100 text-emerald-700" :
                    status === "В ожидании" ? "bg-amber-100 text-amber-700" :
                        "bg-slate-100 text-slate-700"
                    }`}>
                    {status}
                </span>
            );
        }
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

interface PharmacyPlansTableProps {
    data: any[];
}

export function PharmacyPlansTable({ data }: PharmacyPlansTableProps) {
    const [month, setMonth] = React.useState("february");
    const [isAddOpen, setIsAddOpen] = React.useState(false);

    const months = [
        { value: "january", label: "Январь" },
        { value: "february", label: "Февраль" },
        { value: "march", label: "Март" },
        { value: "april", label: "Апрель" },
        { value: "may", label: "Май" },
        { value: "june", label: "Июнь" },
    ];

    return (
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/60 overflow-hidden h-full flex flex-col">
            <div className="p-6 border-b border-slate-100/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/30">
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Планы посещений аптек</h3>
                <div className="flex gap-2 items-center">
                    <Select value={month} onValueChange={setMonth}>
                        <SelectTrigger className="w-[130px] h-9 border-slate-200 bg-white rounded-xl text-xs font-bold text-slate-600 shadow-sm focus:ring-blue-500/20">
                            <span className="text-[10px] text-slate-400 uppercase tracking-tighter mr-1">Месяц</span>
                            <SelectValue placeholder="Месяц" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200">
                            {months.map((m) => (
                                <SelectItem key={m.value} value={m.value} className="text-xs font-medium">
                                    {m.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="font-bold text-blue-600 border-blue-200 hover:bg-blue-50 rounded-xl px-4 uppercase text-[10px] tracking-widest shadow-sm h-9">
                                <Plus className="w-3.5 h-3.5 mr-1" />
                                ДОБАВИТЬ
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px] rounded-3xl">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-black text-slate-900">Добавить план аптеки</DialogTitle>
                                <DialogDescription className="text-slate-500 text-xs">
                                    Создайте новый план визита в аптеку. Заполните все необходимые поля.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="pharmacy" className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Аптека</Label>
                                    <Input id="pharmacy" placeholder="Выберите аптеку" className="rounded-xl border-slate-200" />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="date" className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Дата визита</Label>
                                    <DatePicker className="rounded-xl border-slate-200" date={undefined} setDate={() => { }} placeholder="Выберите дату" />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest h-10 shadow-lg shadow-blue-500/20" onClick={() => setIsAddOpen(false)}>
                                    Сохранить план
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
            <div className="flex-1">
                <DataTable columns={columns} data={data} searchColumn="pharmacyName" />
            </div>
        </div>
    );
}
