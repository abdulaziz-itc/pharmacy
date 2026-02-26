
import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { createDoctor, getSpecialties, getDoctorCategories, getMedicalOrganizations, getRegions } from "../../../api/crm";
import { useParams } from "react-router-dom";
import { User, Phone, Mail, Calendar, MapPin, Stethoscope, Building2, Award } from "lucide-react";
import { DatePicker } from "../../../components/ui/date-picker";

// Fix Leaflet icon issue
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface AddDoctorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

function LocationMarker({ setPosition, position }: { setPosition: (pos: [number, number]) => void, position: [number, number] | null }) {
    useMapEvents({
        click(e) {
            setPosition([e.latlng.lat, e.latlng.lng]);
        },
    });

    return position === null ? null : (
        <Marker position={position}></Marker>
    );
}

export function AddDoctorModal({ isOpen, onClose, onSuccess }: AddDoctorModalProps) {
    const { id: medRepId } = useParams<{ id: string }>();

    // Form State
    const [fullName, setFullName] = useState("");
    const [contact1, setContact1] = useState("");
    const [contact2, setContact2] = useState("");
    const [email, setEmail] = useState("");
    const [birthDate, setBirthDate] = useState("");

    const [specialtyId, setSpecialtyId] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [medOrgId, setMedOrgId] = useState("");
    const [regionId, setRegionId] = useState("");

    const [position, setPosition] = useState<[number, number] | null>(null); // [lat, lng]
    const [address, setAddress] = useState("");

    // Data State
    const [specialties, setSpecialties] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [medOrgs, setMedOrgs] = useState<any[]>([]);
    const [regions, setRegions] = useState<any[]>([]);

    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [specs, cats, orgs, regs] = await Promise.all([
                    getSpecialties(),
                    getDoctorCategories(),
                    getMedicalOrganizations(),
                    getRegions()
                ]);
                const nonPharmacyOrgs = orgs.filter((org: any) => org.org_type !== 'pharmacy');
                setSpecialties(specs);
                setCategories(cats);
                setMedOrgs(nonPharmacyOrgs);
                setRegions(regs);

                // Set default region if org selected, or just first one
                if (regs.length > 0) setRegionId(regs[0].id.toString());
            } catch (error) {
                console.error("Failed to fetch form data", error);
            }
        };
        if (isOpen) {
            fetchData();
        }
    }, [isOpen]);

    const handleSubmit = async () => {
        if (!fullName || !specialtyId || !categoryId || !medOrgId || !regionId) {
            alert("Пожалуйста, заполните обязательные поля");
            return;
        }

        setIsSubmitting(true);
        try {
            await createDoctor({
                full_name: fullName,
                contact1: contact1,
                contact2: contact2,
                email: email,
                birth_date: birthDate ? new Date(birthDate).toISOString().split('T')[0] : null,
                latitude: position ? position[0] : null,
                longitude: position ? position[1] : null,
                address: address,

                specialty_id: parseInt(specialtyId),
                category_id: parseInt(categoryId),
                med_org_id: parseInt(medOrgId),
                region_id: parseInt(regionId),
                assigned_rep_id: medRepId ? parseInt(medRepId) : null
            });

            onSuccess();
            onClose();
            // Reset form
            setFullName("");
            setContact1("");
            setContact2("");
            setEmail("");
            setBirthDate("");
            setPosition(null);
            setAddress("");
        } catch (error) {
            console.error("Failed to create doctor", error);
            alert("Ошибка при создании врача");
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
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>

                    <div className="flex items-center gap-8">
                        <div className="w-24 h-24 rounded-3xl bg-blue-500 flex items-center justify-center text-white shadow-2xl shadow-blue-500/40 transform rotate-3 flex-shrink-0">
                            <Stethoscope className="w-10 h-10" />
                        </div>
                        <div className="space-y-2 flex-1">
                            <h2 className="text-3xl font-black text-white tracking-tight leading-tight">
                                Добавить врача
                            </h2>
                            <p className="text-blue-200/80 text-sm font-medium">Заполните информацию о новом специалисте</p>
                        </div>
                    </div>
                </div>

                {/* Content Section */}
                <div className="px-10 -mt-10 pb-10 space-y-8 relative z-10">

                    {/* Personal Info Grid */}
                    <div className="bg-white p-8 rounded-[36px] border border-slate-100 shadow-sm space-y-6">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                            <User className="w-3.5 h-3.5" />
                            Личная информация
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="md:col-span-2 relative group">
                                <Label className="sr-only">ФИО</Label>
                                <Input
                                    placeholder="ФИО Врача"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="pl-4 h-12 bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 rounded-2xl transition-all shadow-none font-bold text-slate-800"
                                />
                            </div>

                            <div className="relative group">
                                <Label className="sr-only">Телефон 1</Label>
                                <Input
                                    placeholder="Телефон (основной)"
                                    value={contact1}
                                    onChange={(e) => setContact1(e.target.value)}
                                    className="pl-4 h-12 bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 rounded-2xl transition-all shadow-none font-bold text-slate-800"
                                />
                            </div>

                            <div className="relative group">
                                <Label className="sr-only">Телефон 2</Label>
                                <Input
                                    placeholder="Телефон (доп.)"
                                    value={contact2}
                                    onChange={(e) => setContact2(e.target.value)}
                                    className="pl-4 h-12 bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 rounded-2xl transition-all shadow-none font-bold text-slate-800"
                                />
                            </div>

                            <div className="relative group">
                                <Label className="sr-only">Email</Label>
                                <Input
                                    placeholder="Email адрес"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="pl-4 h-12 bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 rounded-2xl transition-all shadow-none font-bold text-slate-800"
                                />
                            </div>

                            <div className="relative group flex items-center">
                                <Label className="sr-only">Дата рождения</Label>
                                <DatePicker
                                    date={birthDate ? new Date(birthDate) : undefined}
                                    setDate={(date) => setBirthDate(date ? date.toISOString().split('T')[0] : "")}
                                    placeholder="Дата рождения"
                                    className="h-12 w-full bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 rounded-2xl transition-all shadow-none font-bold text-slate-600 justify-start"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Professional Info Grid */}
                    <div className="bg-white p-8 rounded-[36px] border border-slate-100 shadow-sm space-y-6">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                            <Award className="w-3.5 h-3.5" />
                            Профессиональные данные
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <div className="relative">
                                <Select value={categoryId} onValueChange={setCategoryId}>
                                    <SelectTrigger className="h-12 bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl font-bold text-slate-600">
                                        <SelectValue placeholder="Категория" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-slate-100 shadow-xl">
                                        {categories.map((c) => (
                                            <SelectItem key={c.id} value={c.id.toString()} className="font-bold cursor-pointer rounded-xl mx-1 my-0.5 focus:bg-blue-50 focus:text-blue-600">{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="relative md:col-span-2">
                                <Select value={specialtyId} onValueChange={setSpecialtyId}>
                                    <SelectTrigger className="h-12 bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl font-bold text-slate-600">
                                        <SelectValue placeholder="Специальность" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-slate-100 shadow-xl">
                                        {specialties.map((s) => (
                                            <SelectItem key={s.id} value={s.id.toString()} className="font-bold cursor-pointer rounded-xl mx-1 my-0.5 focus:bg-blue-50 focus:text-blue-600">{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="relative md:col-span-3">
                                <Select value={medOrgId} onValueChange={setMedOrgId}>
                                    <SelectTrigger className="h-12 bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl font-bold text-slate-600">
                                        <SelectValue placeholder="Медицинская Организация" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-slate-100 shadow-xl max-h-[250px]">
                                        {medOrgs.map((m) => (
                                            <SelectItem key={m.id} value={m.id.toString()} className="font-bold cursor-pointer rounded-xl mx-1 my-0.5 focus:bg-blue-50 focus:text-blue-600">{m.name}</SelectItem>
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
                                                {position ? `${position[0].toFixed(5)}, ${position[1].toFixed(5)}` : "Не выбрано"}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="hidden sm:block h-8 w-[1px] bg-slate-200 mx-1 shrink-0"></div>
                                    <Input
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        placeholder="Введите адрес ориентира..."
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
                            {isSubmitting ? "Сохранение..." : "Добавить врача"}
                        </Button>
                    </div>

                </div>
            </DialogContent>
        </Dialog>
    );
}

