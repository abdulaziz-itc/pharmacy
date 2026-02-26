import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { authService } from '../../api/auth';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '../../components/ui/card';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '../../components/ui/form';

const formSchema = z.object({
    username: z.string().min(1, 'Имя пользователя обязательно'),
    password: z.string().min(1, 'Пароль обязателен'),
});

export default function LoginPage() {
    const navigate = useNavigate();
    const setAuth = useAuthStore((state) => state.setAuth);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            username: '',
            password: '',
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        setError('');
        try {
            const data = await authService.login(values.username, values.password);
            localStorage.setItem('token', data.access_token);

            const user = await authService.getMe();
            setAuth(user, data.access_token);

            navigate('/dashboard');
        } catch (err) {
            setError('Неверное имя пользователя или пароль');
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-950 relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 -left-20 w-96 h-96 bg-blue-600 rounded-full blur-[120px] opacity-20 animate-pulse" />
            <div className="absolute bottom-0 -right-20 w-96 h-96 bg-indigo-600 rounded-full blur-[120px] opacity-20 animate-pulse" />

            <div className="w-full max-w-md px-6 animate-fade-in">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-blue-600 mb-6 shadow-2xl shadow-blue-500/40 rotate-12 hover:rotate-0 transition-transform duration-500">
                        <Package className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tight leading-none">
                        Pharma <span className="text-blue-500">ERP+CRM</span>
                    </h1>
                    <p className="text-slate-400 mt-4 font-medium">Корпоративная система управления фармацевтикой</p>
                </div>

                <Card className="glass-dark border-slate-800/50 shadow-2xl rounded-[2rem] overflow-hidden">
                    <CardHeader className="pt-10 pb-4 px-10">
                        <CardTitle className="text-2xl font-bold text-white tracking-tight">С возвращением</CardTitle>
                        <CardDescription className="text-slate-400 font-medium">Пожалуйста, введите свои учетные данные</CardDescription>
                    </CardHeader>
                    <CardContent className="px-10 pb-10 pt-6">
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <FormField
                                    control={form.control}
                                    name="username"
                                    render={({ field }: { field: any }) => (
                                        <FormItem className="space-y-2">
                                            <FormLabel className="text-slate-300 font-semibold uppercase text-[10px] tracking-widest pl-1">Имя пользователя</FormLabel>
                                            <FormControl>
                                                <div className="relative group">
                                                    <div className="absolute left-3.5 top-3 text-slate-500 group-focus-within:text-blue-400 transition-colors">
                                                        <Users className="w-4 h-4" />
                                                    </div>
                                                    <Input
                                                        placeholder="admin"
                                                        className="bg-slate-900/50 border-slate-800 text-white placeholder:text-slate-700 pl-10 h-12 rounded-xl focus:ring-blue-500/20 focus:border-blue-500/50 transition-all"
                                                        {...field}
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage className="text-[10px] uppercase font-bold text-red-400" />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={({ field }: { field: any }) => (
                                        <FormItem className="space-y-2">
                                            <FormLabel className="text-slate-300 font-semibold uppercase text-[10px] tracking-widest pl-1">Пароль</FormLabel>
                                            <FormControl>
                                                <div className="relative group">
                                                    <div className="absolute left-3.5 top-3 text-slate-500 group-focus-within:text-blue-400 transition-colors">
                                                        <Loader2 className="w-4 h-4" />
                                                    </div>
                                                    <Input
                                                        type="password"
                                                        placeholder="••••••••"
                                                        className="bg-slate-900/50 border-slate-800 text-white placeholder:text-slate-700 pl-10 h-12 rounded-xl focus:ring-blue-500/20 focus:border-blue-500/50 transition-all"
                                                        {...field}
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage className="text-[10px] uppercase font-bold text-red-400" />
                                        </FormItem>
                                    )}
                                />
                                {error && (
                                    <div className="text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 py-3 rounded-xl text-center uppercase tracking-tighter">
                                        {error}
                                    </div>
                                )}
                                <Button
                                    type="submit"
                                    className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xl shadow-blue-600/20 font-bold text-base transition-all active:scale-[0.98]"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                    ) : (
                                        "Авторизовать доступ"
                                    )}
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>

                <p className="text-center text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-8">
                    &copy; 2026 Pharma System &bull; Безопасный терминал
                </p>
            </div>
        </div>
    );
}

import { Package, Users } from 'lucide-react';
