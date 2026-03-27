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
