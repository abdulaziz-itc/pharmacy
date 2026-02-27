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
    DialogTitle,
    DialogTrigger,
    DialogDescription,
    DialogFooter,
} from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { createVisitPlan } from "../../../api/visits";
import { getDoctors } from "../../../api/crm";
import { useParams } from "react-router-dom";
import { DatePicker } from "../../../components/ui/date-picker";


const columns: ColumnDef<any>[] = [
    {
        accessorKey: "id",
        header: "#",
        cell: ({ row }) => <span className="text-slate-500">{row.index + 1}</span>
    },
    {
        accessorKey: "doctorName",
        header: "ВРАЧ",
        cell: ({ row }) => <span className="font-medium text-slate-900">{row.original.doctorName}</span>
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

interface DoctorPlansTableProps {
    data: any[];
}

export function DoctorPlansTable({ data: initialData }: DoctorPlansTableProps) {
    const { id } = useParams<{ id: string }>();
    const [data, setData] = React.useState(initialData);
    const [month, setMonth] = React.useState("february");
    const [isAddOpen, setIsAddOpen] = React.useState(false);
    const [doctors, setDoctors] = React.useState<any[]>([]);

    // Form State
    const [subject, setSubject] = React.useState("");
    const [description, setDescription] = React.useState("");
    const [doctorId, setDoctorId] = React.useState("");
    const [date, setDate] = React.useState("");
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    React.useEffect(() => {
        setData(initialData);
    }, [initialData]);

    React.useEffect(() => {
        const fetchDoctors = async () => {
            if (id) {
                try {
                    const allDoctors = await getDoctors();
                    const repDoctors = allDoctors.filter((d: any) => d.assigned_rep_id === parseInt(id));
                    setDoctors(repDoctors);
                } catch (error) {
                    console.error("Failed to fetch doctors", error);
                }
            }
        };
        fetchDoctors();
    }, [id]);

    const handleCreatePlan = async () => {
        if (!subject || !doctorId || !date || !id) {
            alert("Пожалуйста, заполните все обязательные поля");
            return;
        }

        setIsSubmitting(true);
        try {
            await createVisitPlan({
                med_rep_id: parseInt(id),
                doctor_id: parseInt(doctorId),
                planned_date: new Date(date).toISOString(),
                subject: subject,
                description: description,
                visit_type: "Плановый"
            });

            window.location.reload();

            setIsAddOpen(false);
            setSubject("");
            setDescription("");
            setDoctorId("");
            setDate("");
        } catch (error) {
            console.error("Failed to create plan", error);
            alert("Ошибка при создании плана");
        } finally {
            setIsSubmitting(false);
        }
    };

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
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Планы посещений врачей</h3>
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
                        <DialogContent className="sm:max-w-[500px] rounded-3xl p-0 overflow-hidden border-0 shadow-2xl">
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
                                <DialogTitle className="text-xl font-black text-white tracking-tight">Добавить план врача</DialogTitle>
                                <DialogDescription className="text-blue-100 text-xs mt-1">
                                    Заполните детальную информацию для планирования визита
                                </DialogDescription>
                            </div>

                            <div className="grid gap-6 p-8">
                                <div className="grid gap-2">
                                    <Label htmlFor="subject" className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Тема визита</Label>
                                    <Input
                                        id="subject"
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                        placeholder="Например: Презентация нового препарата"
                                        className="h-12 rounded-xl border-slate-200 bg-slate-50 focus:bg-white transition-all font-medium"
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="description" className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Описание</Label>
                                    <Input
                                        id="description"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Детали и цели визита"
                                        className="h-12 rounded-xl border-slate-200 bg-slate-50 focus:bg-white transition-all font-medium"
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="doctor" className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Врач</Label>
                                    <Select value={doctorId} onValueChange={setDoctorId}>
                                        <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-slate-50 focus:bg-white transition-all font-bold text-slate-700">
                                            <SelectValue placeholder="Выберите врача" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-slate-200 shadow-xl max-h-[200px]">
                                            {doctors.map((doctor) => (
                                                <SelectItem key={doctor.id} value={doctor.id.toString()} className={`font-medium ${!doctor.is_active ? 'text-slate-400 opacity-70' : ''}`}>
                                                    {doctor.full_name} {!doctor.is_active && "(Faol emas)"} <span className="text-slate-400 text-xs ml-2">({doctor.specialty?.name})</span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="date" className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Выберите дату</Label>
                                    <div className="relative">
                                        <DatePicker
                                            date={date ? new Date(date) : undefined}
                                            setDate={(d) => setDate(d ? d.toISOString() : "")}
                                            placeholder="Выберите дату"
                                            className="h-12 rounded-xl border-slate-200 bg-slate-50 focus:bg-white transition-all font-bold text-slate-700 w-full pl-4"
                                        />
                                    </div>
                                </div>
                            </div>

                            <DialogFooter className="px-8 pb-8 sm:justify-between gap-4">
                                <Button variant="ghost" onClick={() => setIsAddOpen(false)} className="rounded-xl font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100">
                                    ОТМЕНА
                                </Button>
                                <Button
                                    type="submit"
                                    onClick={handleCreatePlan}
                                    disabled={isSubmitting}
                                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest h-12 shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    {isSubmitting ? "СОХРАНЕНИЕ..." : "ДОБАВИТЬ ПЛАН"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
            <div className="flex-1">
                <DataTable columns={columns} data={data} />
            </div>
        </div>
    );
}
