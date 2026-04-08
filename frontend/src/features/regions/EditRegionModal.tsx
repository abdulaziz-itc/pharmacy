import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useRegionStore } from "../../store/regionStore";
import type { Region } from "../../store/regionStore";
import axiosInstance from "../../api/axios";

interface EditRegionModalProps {
    isOpen: boolean;
    onClose: () => void;
    region: Region | null;
}

export function EditRegionModal({ isOpen, onClose, region }: EditRegionModalProps) {
    const { fetchRegions } = useRegionStore();
    const [name, setName] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (region) {
            setName(region.name);
        }
    }, [region]);

    const handleSubmit = async () => {
        if (!region) return;
        if (!name.trim()) {
            alert("Пожалуйста, введите название региона");
            return;
        }

        // Check if name is being changed and for dependencies
        if (name.trim() !== region.name) {
            setIsSubmitting(true);
            try {
                const depResp = await axiosInstance.get(`/crm/regions/${region.id}/dependencies`);
                const deps = depResp.data;
                
                if (deps.total > 0) {
                    const message = `Внимание! Данный регион уже используется в системе:\n` +
                        `- Врачей: ${deps.doctors}\n` +
                        `- Организаций: ${deps.med_orgs}\n` +
                        `- Менеджеров: ${deps.users}\n\n` +
                        `Вы точно хотите изменить название региона? Это изменение коснется всех привязанных к нему объектов.`;
                    
                    if (!window.confirm(message)) {
                        setIsSubmitting(false);
                        return;
                    }
                }
            } catch (error) {
                console.error("Failed to check dependencies", error);
            } finally {
                setIsSubmitting(false);
            }
        }

        setIsSubmitting(true);
        try {
            await axiosInstance.put(`/crm/regions/${region.id}`, { name });
            await fetchRegions();
            onClose();
        } catch (error) {
            console.error("Failed to update region", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogTitle>Изменить регион</DialogTitle>
                <div className="grid gap-4 py-4 mt-2">
                    <div className="grid gap-2">
                        <Input
                            placeholder="Название региона"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? "Сохранение..." : "Сохранить"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
