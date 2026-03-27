import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogHeader,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Switch } from "../../components/ui/switch";
import { Label } from "../../components/ui/label";
import { type User, useUserStore } from "../../store/userStore";
import { useRegionStore } from "../../store/regionStore";
import { Checkbox } from "../../components/ui/checkbox";
import axiosInstance from "../../api/axios";
import { toast } from "sonner";

interface UserModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User | null;
    defaultRole?: string;
    lockRole?: boolean;
    onSuccess?: () => void;
}

const ROLES = [
    { value: 'investor', label: 'Инвестор (Владелец)' },
    { value: 'admin', label: 'Администратор' },
    { value: 'director', label: 'Директор' },
    { value: 'deputy_director', label: 'Зам. директора' },
    { value: 'hrd', label: 'HRD' },
    { value: 'head_of_orders', label: 'Менеджер по закупкам' },
    { value: 'head_of_warehouse', label: 'Завсклад' },
    { value: 'wholesale_manager', label: 'Оптовый менеджер' },
    { value: 'product_manager', label: 'Продукт менеджер' },
    { value: 'field_force_manager', label: 'Field Force Manager' },
    { value: 'regional_manager', label: 'Региональный менеджер' },
    { value: 'med_rep', label: 'Мед представитель' },
];

export function UserModal({ isOpen, onClose, user, defaultRole, lockRole, onSuccess }: UserModalProps) {
    const { fetchUsers, users } = useUserStore();
    const { regions, fetchRegions } = useRegionStore();
    const [fullName, setFullName] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState(defaultRole || "med_rep");
    const [managerId, setManagerId] = useState<string>("none");
    const [selectedRegions, setSelectedRegions] = useState<number[]>([]);
    const [isActive, setIsActive] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchRegions();
    }, [fetchRegions, isOpen]);

    useEffect(() => {
        if (user) {
            setFullName(user.full_name);
            setUsername(user.username);
            setPassword("");
            setRole(user.role);
            setManagerId(user.manager_id ? user.manager_id.toString() : "none");
            setSelectedRegions(user.region_ids || []);
            setIsActive(user.is_active);
        } else {
            setFullName("");
            setUsername("");
            setPassword("");
            setRole(defaultRole || "med_rep");
            setManagerId("none");
            setSelectedRegions([]);
            setIsActive(true);
        }
    }, [user, isOpen]);

    const handleRegionToggle = (regionId: number) => {
        setSelectedRegions(prev => 
            prev.includes(regionId) 
                ? prev.filter(id => id !== regionId)
                : [...prev, regionId]
        );
    };

    const handleSubmit = async () => {
        if (!fullName.trim() || !username.trim() || (!user && !password)) {
            toast.error("Пожалуйста, заполните все обязательные поля.");
            return;
        }

        setIsSubmitting(true);
        try {
            const payload: any = {
                full_name: fullName,
                username,
                role,
                is_active: isActive,
                manager_id: managerId === "none" ? null : parseInt(managerId),
                region_ids: selectedRegions,
            };

            if (password) payload.password = password;

            if (user) {
                await axiosInstance.put(`/users/${user.id}`, payload);
                toast.success("Пользователь успешно обновлен.");
            } else {
                await axiosInstance.post('/users/', payload);
                toast.success("Пользователь успешно создан.");
            }
            
            if (onSuccess) {
                onSuccess();
            } else {
                await fetchUsers(); // Fallback to default
            }
            onClose();
        } catch (error: any) {
            console.error("Failed to save user", error);
            const msg = error.response?.data?.detail || "Ошибка при сохранении пользователя.";
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[500px] overflow-hidden rounded-3xl p-0 border-none shadow-2xl">
                <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-white">
                            {user ? 'Редактировать пользователя' : 'Создать пользователя'}
                        </DialogTitle>
                        <p className="text-indigo-100 text-sm opacity-90">
                            {user ? 'Измените данные учетной записи.' : 'Заполните данные для нового сотрудника.'}
                        </p>
                    </DialogHeader>
                </div>

                <div className="p-8 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 space-y-2">
                            <Label className="text-slate-600 font-bold ml-1">Полное имя (ФИО)</Label>
                            <Input
                                placeholder="Иванов Иван Иванович"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="rounded-xl border-slate-200 focus:ring-indigo-500 h-11"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-slate-600 font-bold ml-1">Имя пользователя (Логин)</Label>
                            <Input
                                placeholder="ivanov"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="rounded-xl border-slate-200 focus:ring-indigo-500 h-11"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-slate-600 font-bold ml-1">Пароль {user && '(оставьте пустым, если не меняете)'}</Label>
                            <Input
                                type="password"
                                placeholder={user ? "••••••••" : "Введите пароль"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="rounded-xl border-slate-200 focus:ring-indigo-500 h-11"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-slate-600 font-bold ml-1">Роль в системе</Label>
                            <Select value={role} onValueChange={setRole} disabled={lockRole}>
                                <SelectTrigger className="rounded-xl border-slate-200 h-11">
                                    <SelectValue placeholder="Выберите роль" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    {ROLES.map(role => (
                                        <SelectItem key={role.value} value={role.value}>
                                            {role.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {role !== 'hrd' && (
                            <div className="space-y-2">
                                <Label className="text-slate-600 font-bold ml-1">Руководитель</Label>
                                <Select value={managerId} onValueChange={setManagerId}>
                                    <SelectTrigger className="rounded-xl border-slate-200 h-11">
                                        <SelectValue placeholder="Выберите руководителя" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl max-h-[200px]">
                                        <SelectItem value="none">Без руководителя</SelectItem>
                                        {users.filter((u: User) => u.id !== user?.id).map((m: User) => (
                                            <SelectItem key={m.id} value={m.id.toString()}>
                                                {m.full_name} ({m.role})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {(role === 'regional_manager' || role === 'med_rep') && (
                            <div className="col-span-2 space-y-3">
                                <Label className="text-slate-600 font-bold ml-1">
                                    Закрепленные регионы {role === 'regional_manager' ? '(несколько)' : '(обычно один)'}
                                </Label>
                                <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 max-h-[160px] overflow-y-auto">
                                    {regions.map((region) => (
                                        <div key={region.id} className="flex items-center space-x-2 group cursor-pointer" onClick={() => handleRegionToggle(region.id)}>
                                            <Checkbox 
                                                id={`region-${region.id}`}
                                                checked={selectedRegions.includes(region.id)}
                                                onCheckedChange={() => handleRegionToggle(region.id)}
                                                className="rounded-md border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                                            />
                                            <label
                                                htmlFor={`region-${region.id}`}
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-slate-700 group-hover:text-indigo-600 transition-colors"
                                            >
                                                {region.name}
                                            </label>
                                        </div>
                                    ))}
                                    {regions.length === 0 && (
                                        <p className="col-span-2 text-sm text-slate-400 italic text-center p-2">Регионы не найдены.</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="space-y-0.5">
                            <Label className="text-slate-900 font-bold">Активный аккаунт</Label>
                            <p className="text-xs text-slate-500 italic">Позволяет пользователю входить в систему.</p>
                        </div>
                        <Switch checked={isActive} onCheckedChange={setIsActive} />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="flex-1 rounded-xl h-12 border-slate-200 font-bold hover:bg-slate-50"
                        >
                            Отмена
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="flex-1 rounded-xl h-12 bg-indigo-600 hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-200"
                        >
                            {isSubmitting ? "Сохранение..." : (user ? "Сохранить" : "Создать")}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
