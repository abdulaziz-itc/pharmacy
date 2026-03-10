import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { createPayment } from '@/api/orders-management';

interface AddPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoice: any;
    onSuccess: () => void;
}

export const AddPaymentModal: React.FC<AddPaymentModalProps> = ({ isOpen, onClose, invoice, onSuccess }) => {
    const [amount, setAmount] = useState<string>("");
    const [paymentType, setPaymentType] = useState<string>("bank");
    const [comment, setComment] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!amount || parseFloat(amount) <= 0) {
            toast.error("Введите корректную сумму");
            return;
        }
        try {
            setIsSubmitting(true);
            await createPayment({
                invoice_id: invoice.id,
                amount: parseFloat(amount),
                payment_type: paymentType,
                comment: comment
            });
            toast.success("Платёж успешно добавлен");
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Ошибка при сохранении платежа");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!invoice) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Поступление (INV-{invoice.id})</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="flex justify-between text-sm py-2 border-b">
                        <span className="text-muted-foreground">Общая сумма:</span>
                        <span className="font-bold">{invoice.total_amount.toLocaleString()} UZS</span>
                    </div>
                    <div className="flex justify-between text-sm py-2 border-b">
                        <span className="text-muted-foreground">Остаток:</span>
                        <span className="font-bold text-red-600">{(invoice.total_amount - (invoice.paid_amount || 0)).toLocaleString()} UZS</span>
                    </div>

                    <div className="grid gap-2">
                        <label className="text-sm font-medium">Сумма платежа</label>
                        <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 px-4 text-[10px] font-bold border-blue-200 text-blue-700 hover:bg-blue-50 rounded-lg"
                                onClick={() => setAmount(invoice.total_amount.toString())}
                            >
                                100%
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 px-4 text-[10px] font-bold border-blue-200 text-blue-700 hover:bg-blue-50 rounded-lg"
                                onClick={() => setAmount((invoice.total_amount * 0.5).toString())}
                            >
                                50%
                            </Button>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <label className="text-sm font-medium">Тип оплаты</label>
                        <Select value={paymentType} onValueChange={setPaymentType}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="bank">Банковский перевод</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <label className="text-sm font-medium">Комментарий</label>
                        <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Пример: Чек #12345" />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Отмена</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? "Сохранение..." : "Подтвердить"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
