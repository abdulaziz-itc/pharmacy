import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "../../components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
} from "../../components/ui/form";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { useProductManagerStore } from '../../store/productManagerStore';
import type { UserCreate } from '../../api/user';

const formSchema = z.object({
    full_name: z.string().min(2, { message: "Минимум 2 символа" }),
    username: z.string().min(3, { message: "Минимум 3 символа" }),
    password: z.string().min(6, { message: "Минимум 6 символов" }),
});

interface AddProductManagerModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function AddProductManagerModal({ open, onOpenChange }: AddProductManagerModalProps) {
    const { addProductManager, isLoading } = useProductManagerStore();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            full_name: "",
            username: "",
            password: "",
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            await addProductManager({
                ...values,
                role: 'product_manager'
            } as UserCreate);
            form.reset();
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to add product manager:", error);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-none rounded-[32px] shadow-2xl">
                <DialogHeader className="bg-blue-600 p-10 pt-12 pb-12 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-700 opacity-50" />
                    <DialogTitle className="text-3xl font-bold text-white text-center relative z-10 tracking-tight">
                        Добавить менеджера по продукту
                    </DialogTitle>
                </DialogHeader>

                <div className="p-10 bg-white">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="full_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <Input
                                                placeholder="Полное имя"
                                                className="h-14 bg-slate-50 border-slate-100 rounded-2xl px-6 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all text-base placeholder:text-slate-400"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage className="pl-6 text-xs" />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="username"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <Input
                                                placeholder="Имя пользователя"
                                                className="h-14 bg-slate-50 border-slate-100 rounded-2xl px-6 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all text-base placeholder:text-slate-400"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage className="pl-6 text-xs" />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <Input
                                                type="password"
                                                placeholder="Пароль"
                                                className="h-14 bg-slate-50 border-slate-100 rounded-2xl px-6 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all text-base placeholder:text-slate-400"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage className="pl-6 text-xs" />
                                    </FormItem>
                                )}
                            />
                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm uppercase tracking-widest shadow-lg shadow-blue-500/30 transition-all active:scale-[0.98] mt-4"
                            >
                                {isLoading ? "Обработка..." : "ДОБАВИТЬ"}
                            </Button>
                        </form>
                    </Form>
                </div>
            </DialogContent>
        </Dialog>
    );
}
