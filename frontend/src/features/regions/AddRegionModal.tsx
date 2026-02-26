import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useRegionStore } from "../../store/regionStore";
import axiosInstance from "../../api/axios";

interface AddRegionModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AddRegionModal({ isOpen, onClose }: AddRegionModalProps) {
    const { fetchRegions } = useRegionStore();
    const [name, setName] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!name.trim()) {
            alert("Пожалуйста, введите название региона");
            return;
        }

        setIsSubmitting(true);
        try {
            await axiosInstance.post('/crm/regions/', { name });
            await fetchRegions();
            onClose();
            setName("");
        } catch (error) {
            console.error("Failed to create region", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogTitle>Добавить регион</DialogTitle>
                <div className="grid gap-4 py-4 mt-2">
                    <div className="grid gap-2">
                        <Input
                            placeholder="Название региона"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? "Сохранение..." : "Добавить"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
