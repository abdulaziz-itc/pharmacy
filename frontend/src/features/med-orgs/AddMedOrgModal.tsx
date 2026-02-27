import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useMedRepStore } from "../../store/medRepStore";
import { useRegionStore } from "../../store/regionStore";
import { useMedOrgStore } from "../../store/medOrgStore";
import { Building2, MapPin, Building, Phone, Users, X } from "lucide-react";

// Fix Leaflet icon issue
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

interface AddMedOrgModalProps {
    isOpen: boolean;
    onClose: () => void;
    defaultRepId?: string;
    defaultOrgType?: string;
}

function LocationMarker({ setPosition, position }: { setPosition: (pos: [number, number]) => void, position: [number, number] | null }) {
    useMapEvents({
        click(e) {
            setPosition([e.latlng.lat, e.latlng.lng]);
        },
    });

    return position === null ? null : (
        <Marker position={position} icon={DefaultIcon}></Marker>
    );
}

export function AddMedOrgModal({ isOpen, onClose, defaultRepId, defaultOrgType }: AddMedOrgModalProps) {
    const { regions, fetchRegions } = useRegionStore();
    const { medReps, fetchMedReps } = useMedRepStore();
    const { createMedOrg } = useMedOrgStore();

    // Form State
    const [name, setName] = useState("");
    const [orgType, setOrgType] = useState(defaultOrgType || "pharmacy");
    const [brand, setBrand] = useState("");
    const [contactPhone, setContactPhone] = useState("");
    const [assignedRepId, setAssignedRepId] = useState(defaultRepId || "");
    const [regionId, setRegionId] = useState("");
    const [address, setAddress] = useState("");
    const [position, setPosition] = useState<[number, number] | null>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchRegions();
            fetchMedReps("med_rep");
        }
    }, [isOpen, fetchRegions, fetchMedReps]);

    const handleSubmit = async () => {
        if (!name || !regionId) {
            alert("Пожалуйста, заполните обязательные поля (Название и Регион)");
            return;
        }

        setIsSubmitting(true);
        try {
            await createMedOrg({
                name,
                org_type: orgType,
                brand: brand || undefined,
                contact_phone: contactPhone || undefined,
                assigned_rep_ids: assignedRepId ? [parseInt(assignedRepId)] : [],
                region_id: parseInt(regionId),
                address,
            });

            onClose();
            // Reset form
            setName("");
            setOrgType(defaultOrgType || "pharmacy");
            setBrand("");
            setContactPhone("");
            setAssignedRepId(defaultRepId || "");
            setRegionId("");
            setAddress("");
            setPosition(null);
        } catch (error) {
            console.error("Failed to create medical organization", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[800px] p-0 border-0 shadow-3xl rounded-[40px] overflow-hidden bg-slate-50 max-h-[90vh] overflow-y-auto custom-scrollbar">
                {/* Header Section */}
                <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 p-10 pb-20 shrink-0">
                    <div className="absolute top-6 right-6 flex gap-2">
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all shadow-sm"
                        >
                            <span className="sr-only">Закрыть</span>
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex items-center gap-8">
                        <div className="w-24 h-24 rounded-3xl bg-blue-500 flex items-center justify-center text-white shadow-2xl shadow-blue-500/40 transform -rotate-3 flex-shrink-0">
                            <Building2 className="w-10 h-10" />
                        </div>
                        <div className="space-y-2 flex-1">
                            <h2 className="text-3xl font-black text-white tracking-tight leading-tight">
                                Добавить организацию
                            </h2>
                            <p className="text-blue-200/80 text-sm font-medium">Заполните информацию о новом медицинском учреждении</p>
                        </div>
                    </div>
                </div>

                {/* Content Section */}
                <div className="px-10 -mt-10 pb-10 space-y-8 relative z-10">

                    {/* Main Info Grid */}
                    <div className="bg-white p-8 rounded-[36px] border border-slate-100 shadow-sm space-y-6">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                            <Building className="w-3.5 h-3.5" />
                            Основная информация
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="relative">
                                <Select value={orgType} onValueChange={setOrgType}>
                                    <SelectTrigger className="h-12 bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl font-bold text-slate-600">
                                        <SelectValue placeholder="Тип организации" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-slate-100 shadow-xl overflow-hidden">
                                        <SelectItem value="pharmacy" className="font-bold cursor-pointer rounded-xl mx-1 my-0.5 focus:bg-blue-50 focus:text-blue-600">Аптека</SelectItem>
                                        <SelectItem value="clinic" className="font-bold cursor-pointer rounded-xl mx-1 my-0.5 focus:bg-blue-50 focus:text-blue-600">Клиника</SelectItem>
                                        <SelectItem value="hospital" className="font-bold cursor-pointer rounded-xl mx-1 my-0.5 focus:bg-blue-50 focus:text-blue-600">Больница / Госпиталь</SelectItem>
                                        <SelectItem value="lechebniy" className="font-bold cursor-pointer rounded-xl mx-1 my-0.5 focus:bg-blue-50 focus:text-blue-600">Лечебное Учреждение</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="relative group">
                                <Label className="sr-only">Регион</Label>
                                <Select value={regionId} onValueChange={setRegionId}>
                                    <SelectTrigger className="h-12 bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl font-bold text-slate-600">
                                        <SelectValue placeholder="Выберите регион" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-slate-100 shadow-xl overflow-hidden">
                                        {regions.map((region) => (
                                            <SelectItem key={region.id} value={region.id.toString()} className="font-bold cursor-pointer rounded-xl mx-1 my-0.5 focus:bg-blue-50 focus:text-blue-600">
                                                {region.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="md:col-span-2 relative group">
                                <Label className="sr-only">Название</Label>
                                <Input
                                    placeholder="Название организации"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="pl-4 h-12 bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 rounded-2xl transition-all shadow-none font-bold text-slate-800"
                                />
                            </div>

                            <div className="relative group">
                                <Label className="sr-only">Бренд</Label>
                                <Input
                                    placeholder="Бренд (аптечная сеть/франшиза)"
                                    value={brand}
                                    onChange={(e) => setBrand(e.target.value)}
                                    className="pl-4 h-12 bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 rounded-2xl transition-all shadow-none font-bold text-slate-800"
                                />
                            </div>

                            <div className="relative group flex items-center">
                                <Phone className="w-4 h-4 text-slate-400 absolute left-4" />
                                <Label className="sr-only">Контактный телефон</Label>
                                <Input
                                    placeholder="Контактный телефон"
                                    value={contactPhone}
                                    onChange={(e) => setContactPhone(e.target.value)}
                                    className="pl-10 h-12 bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 rounded-2xl transition-all shadow-none font-bold text-slate-800"
                                />
                            </div>

                            <div className="md:col-span-2 relative group">
                                <Label className="text-[10px] font-black text-slate-400 flex items-center gap-1.5 uppercase tracking-widest mb-2 ml-1">
                                    <Users className="w-3 h-3" /> Представитель
                                </Label>
                                <Select value={assignedRepId} onValueChange={setAssignedRepId}>
                                    <SelectTrigger className="h-12 bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl font-bold text-slate-600">
                                        <SelectValue placeholder="Назначить медицинского представителя (опционально)" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-slate-100 shadow-xl overflow-hidden max-h-[200px]">
                                        <SelectItem value="none" className="font-bold text-slate-400 italic cursor-pointer rounded-xl mx-1 my-0.5 focus:bg-slate-100">Не назначать</SelectItem>
                                        {medReps.filter(rep => rep.is_active).map((rep) => (
                                            <SelectItem key={rep.id} value={rep.id.toString()} className="font-bold cursor-pointer rounded-xl mx-1 my-0.5 focus:bg-blue-50 focus:text-blue-600">
                                                {rep.full_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Location Section */}
                    <div className="bg-white p-8 rounded-[36px] border border-slate-100 shadow-sm space-y-6">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                            <MapPin className="w-3.5 h-3.5" />
                            Локация
                        </div>

                        <div className="bg-slate-50 p-2 rounded-3xl border border-slate-100 relative group overflow-hidden">
                            <div className="h-[240px] w-full rounded-2xl overflow-hidden relative z-0">
                                <MapContainer
                                    center={[41.2995, 69.2401]}
                                    zoom={13}
                                    style={{ height: "100%", width: "100%" }}
                                    zoomControl={false}
                                    attributionControl={false}
                                >
                                    <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                                    <LocationMarker setPosition={setPosition} position={position} />
                                </MapContainer>

                                {/* Floating Address Input */}
                                <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md p-3 rounded-2xl shadow-lg border border-white/50 flex flex-col sm:flex-row sm:items-center gap-3 z-[1000] transition-all">
                                    <div className="flex items-center gap-3 shrink-0">
                                        <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                                            <MapPin className="h-5 w-5" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Координаты</span>
                                            <span className="text-xs font-bold text-slate-800">
                                                {position ? `${position[0].toFixed(5)}, ${position[1].toFixed(5)}` : "Кликните по карте"}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="hidden sm:block h-8 w-[1px] bg-slate-200 mx-1 shrink-0"></div>
                                    <Input
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        placeholder="Введите полный адрес или ориентир..."
                                        className="h-10 border-none bg-slate-50 focus:bg-blue-50/50 rounded-xl focus-visible:ring-0 text-sm font-bold text-slate-800 placeholder:text-slate-400 w-full transition-colors"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-4 pt-4">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="flex-1 rounded-2xl font-black uppercase text-xs tracking-widest h-14 border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all border-2"
                        >
                            Отмена
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-xs tracking-widest h-14 rounded-2xl shadow-xl shadow-blue-500/20 transition-all"
                        >
                            {isSubmitting ? "Сохранение..." : "Добавить организацию"}
                        </Button>
                    </div>

                </div>
            </DialogContent>
        </Dialog>
    );
}
