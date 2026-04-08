import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { getUnassignedSales, assignSaleToDoctor } from '@/api/orders-management';
import { toast } from 'sonner';
import { Package, UserPlus } from 'lucide-react';

interface UnassignedSalesSectionProps {
    medRepId: number;
    doctors: any[];
    onSuccess?: () => void;
}

export const UnassignedSalesSection: React.FC<UnassignedSalesSectionProps> = ({ medRepId, doctors, onSuccess }) => {
    const [sales, setSales] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSale, setSelectedSale] = useState<any>(null);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

    // Assignment State
    const [doctorId, setDoctorId] = useState<string>("");
    const [quantity, setQuantity] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        loadData();
    }, [medRepId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await getUnassignedSales();
            setSales(data);
        } catch (error) {
            toast.error("Ошибка при загрузке неоплаченных продаж");
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = async () => {
        if (!selectedSale || !doctorId || !quantity) {
            toast.error("Пожалуйста, заполните все поля");
            return;
        }
        try {
            setIsSubmitting(true);
            await assignSaleToDoctor(selectedSale.id, parseInt(doctorId), parseInt(quantity));
            toast.success("Успешно прикреплено. Начислен бонус!");
            setIsAssignModalOpen(false);
            loadData();
            if (onSuccess) onSuccess();
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Ошибка при прикреплении");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="border-blue-100 shadow-sm">
            <CardHeader className="bg-blue-50/20">
                <CardTitle className="text-lg flex items-center"><Package className="mr-2 h-5 w-5 text-blue-600" /> Оплаченные и нераспределенные продажи</CardTitle>
                <CardDescription>Товары, оплаченные клиентами, но еще не распределенные по врачам.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Продукт</TableHead>
                            <TableHead>Аптека</TableHead>
                            <TableHead>Фактура #</TableHead>
                            <TableHead>Оплачено (кол-во)</TableHead>
                            <TableHead>Прикреплено</TableHead>
                            <TableHead>Остаток</TableHead>
                            <TableHead className="text-right"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={7} className="text-center py-4">Загрузка...</TableCell></TableRow>
                        ) : sales.length === 0 ? (
                            <TableRow><TableCell colSpan={7} className="text-center py-4 text-muted-foreground">Нет нераспределенных товаров</TableCell></TableRow>
                        ) : (
                            sales.map(s => {
                                const payRatio = s.invoice ? (s.invoice.paid_amount / s.invoice.total_amount) * 100 : 0;
                                return (
                                    <TableRow key={s.id}>
                                        <TableCell>
                                            <div className="font-bold text-blue-900">{s.product?.name}</div>
                                            <div className="text-[10px] text-slate-400 uppercase tracking-tighter">ID: {s.product_id}</div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-medium text-slate-700">
                                                {s.invoice?.reservation?.med_org?.name || "-"}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                                                #{s.invoice_id}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-bold">{s.paid_quantity}</span>
                                                <span className={`text-[10px] font-bold ${payRatio >= 100 ? 'text-green-600' : 'text-orange-500'}`}>
                                                    {payRatio.toFixed(0)}% оплачено
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{s.assigned_quantity}</TableCell>
                                        <TableCell className="text-orange-600 font-bold">{s.paid_quantity - s.assigned_quantity}</TableCell>
                                        <TableCell className="text-right">
                                            <Button size="sm" variant="outline" onClick={() => { setSelectedSale(s); setQuantity((s.paid_quantity - s.assigned_quantity).toString()); setIsAssignModalOpen(true); }}>
                                                <UserPlus className="h-4 w-4 mr-1" /> Прикрепить
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </CardContent>

            <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Прикрепить к врачу</DialogTitle>
                    </DialogHeader>
                    {selectedSale && (
                        <div className="space-y-4 py-4">
                            <div className="p-3 bg-muted rounded-lg text-sm">
                                <div>Продукт: <b>{selectedSale.product?.name}</b></div>
                                <div>Оставшееся количество: <b>{selectedSale.paid_quantity - selectedSale.assigned_quantity} шт.</b></div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Выберите врача</label>
                                <Select value={doctorId} onValueChange={setDoctorId}>
                                    <SelectTrigger><SelectValue placeholder="Врач..." /></SelectTrigger>
                                    <SelectContent>
                                        {doctors.map(d => (
                                            <SelectItem key={d.id} value={d.id.toString()}>{d.full_name || d.fullName}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Количество для прикрепления</label>
                                <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsAssignModalOpen(false)}>Отмена</Button>
                        <Button onClick={handleAssign} disabled={isSubmitting}>
                            {isSubmitting ? "Сохранение..." : "Подтвердить"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
};
