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
            toast.error("To'lanmagan savdolarni yuklashda xatolik");
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = async () => {
        if (!selectedSale || !doctorId || !quantity) {
            toast.error("Barcha maydonlarni to'ldiring");
            return;
        }
        try {
            setIsSubmitting(true);
            await assignSaleToDoctor(selectedSale.id, parseInt(doctorId), parseInt(quantity));
            toast.success("Muvaffaqiyatli biriktirildi. Bonus hisoblandi!");
            setIsAssignModalOpen(false);
            loadData();
            if (onSuccess) onSuccess();
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Biriktirishda xatolik");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="border-blue-100 shadow-sm">
            <CardHeader className="bg-blue-50/20">
                <CardTitle className="text-lg flex items-center"><Package className="mr-2 h-5 w-5 text-blue-600" /> To'langan va Biriktirilmagan Savdolar</CardTitle>
                <CardDescription>Mijozlar to'lov qilgan, lekin hali doktorlarga biriktirilmagan tovarlar.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Mahsulot</TableHead>
                            <TableHead>To'langan Soni</TableHead>
                            <TableHead>Biriktirilgan</TableHead>
                            <TableHead>Qolgan</TableHead>
                            <TableHead className="text-right"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-4">Yuklanmoqda...</TableCell></TableRow>
                        ) : sales.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-4 text-muted-foreground">Biriktirilmagan tovarlar yo'q</TableCell></TableRow>
                        ) : (
                            sales.map(s => (
                                <TableRow key={s.id}>
                                    <TableCell className="font-medium">{s.product?.name}</TableCell>
                                    <TableCell>{s.paid_quantity}</TableCell>
                                    <TableCell>{s.assigned_quantity}</TableCell>
                                    <TableCell className="text-orange-600 font-bold">{s.paid_quantity - s.assigned_quantity}</TableCell>
                                    <TableCell className="text-right">
                                        <Button size="sm" variant="outline" onClick={() => { setSelectedSale(s); setQuantity((s.paid_quantity - s.assigned_quantity).toString()); setIsAssignModalOpen(true); }}>
                                            <UserPlus className="h-4 w-4 mr-1" /> Biriktirish
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>

            <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Doktorga Biriktirish</DialogTitle>
                    </DialogHeader>
                    {selectedSale && (
                        <div className="space-y-4 py-4">
                            <div className="p-3 bg-muted rounded-lg text-sm">
                                <div>Mahsulot: <b>{selectedSale.product?.name}</b></div>
                                <div>Qolgan miqdor: <b>{selectedSale.paid_quantity - selectedSale.assigned_quantity} dona</b></div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Doktirni tanlang</label>
                                <Select value={doctorId} onValueChange={setDoctorId}>
                                    <SelectTrigger><SelectValue placeholder="Doktor..." /></SelectTrigger>
                                    <SelectContent>
                                        {doctors.map(d => (
                                            <SelectItem key={d.id} value={d.id.toString()}>{d.full_name || d.fullName}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Biriktiriladigan soni</label>
                                <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsAssignModalOpen(false)}>Bekor qilish</Button>
                        <Button onClick={handleAssign} disabled={isSubmitting}>
                            {isSubmitting ? "Saqlanmoqda..." : "Tasdiqlash"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
};
