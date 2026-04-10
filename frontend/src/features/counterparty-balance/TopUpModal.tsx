import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "../../components/ui/dialog";
import { Button } from '../../components/ui/button';
import { MoneyInput } from '../../components/ui/MoneyInput';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import api from '../../api/axios';
import { Banknote, Calendar, FileText } from 'lucide-react';

interface TopUpModalProps {
    isOpen: boolean;
    onClose: () => void;
    organization: any;
    onSuccess: () => void;
}

export function TopUpModal({ isOpen, onClose, organization, onSuccess }: TopUpModalProps) {
    const [amount, setAmount] = useState(0);
    const [comment, setComment] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (amount <= 0) {
            toast.error('Сумма должна быть больше 0');
            return;
        }

        setIsSubmitting(true);
        try {
            await api.post(`/sales/organizations/${organization.id}/top-up`, {
                amount,
                comment,
                date: date // Now sending directly
            });
            toast.success('Баланс успешно пополнен');
            onSuccess();
            onClose();
            // Reset
            setAmount(0);
            setComment('');
        } catch (error) {
            console.error('Top-up failed:', error);
            toast.error('Ошибка при пополнении баланса');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!organization) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden rounded-3xl border-none shadow-2xl bg-white">
                <DialogHeader className="p-6 bg-indigo-600 text-white">
                    <DialogTitle className="text-xl font-black flex items-center gap-2">
                        <Banknote className="w-6 h-6" />
                        Пополнение баланса
                    </DialogTitle>
                </DialogHeader>

                <div className="p-6 space-y-6">
                    <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 flex justify-between items-center">
                        <div>
                            <p className="text-[10px] uppercase font-bold text-indigo-400 tracking-widest mb-1">Организация</p>
                            <p className="text-sm font-black text-indigo-900">{organization.name}</p>
                            <p className="text-xs text-indigo-600 mt-1">ИНН: {organization.inn || '—'} | {organization.region || ''}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">Текущее сальдо</p>
                            <p className={`text-sm font-black ${
                                organization.total_balance > 0 ? "text-emerald-600" :
                                organization.total_balance < 0 ? "text-rose-600" :
                                "text-slate-800"
                            }`}>
                                {formatMoney(organization.total_balance)} UZS
                            </p>
                        </div>
                    </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-slate-600">
                            <Banknote className="w-4 h-4 text-indigo-500" />
                            Сумма пополнения (UZS)
                        </Label>
                        <MoneyInput 
                            value={amount}
                            onChange={(val: string) => setAmount(Number(val))}
                            className="text-lg font-black h-12"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-slate-600">
                            <Calendar className="w-4 h-4 text-indigo-500" />
                            Дата поступления
                        </Label>
                        <Input 
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="bg-slate-50 border-slate-200 rounded-xl"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-slate-600">
                            <FileText className="w-4 h-4 text-indigo-500" />
                            Основание (комментарий)
                        </Label>
                        <textarea 
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all min-h-[100px]"
                            placeholder="Например: Платёжное поручение №123 от 08.04.2024..."
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex gap-3 pt-4">
                    <Button variant="ghost" className="flex-1 h-12 rounded-xl" onClick={onClose}>
                        Отмена
                    </Button>
                    <Button 
                        className="flex-1 h-12 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 transition-all"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Выполнение...' : 'Подтвердить пополнение'}
                    </Button>
                </div>
            </div>
            </DialogContent>
        </Dialog>
    );
}
