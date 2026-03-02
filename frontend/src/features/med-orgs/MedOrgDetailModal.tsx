import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
} from "../../components/ui/dialog";
import { Building2, MapPin, User, Globe, Tag, Info, X, Edit2, Check, Package, Users, Phone } from "lucide-react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import type { MedicalOrganization } from "../../store/medOrgStore";
import { useMedOrgStore } from "../../store/medOrgStore";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { getDoctors, updateDoctor } from "../../api/crm";
import { DoctorDetailModal } from "../med-reps/components/DoctorDetailModal";
import { getPlans, getSaleFacts, getBonusPayments } from "../../api/sales";

// Fix Leaflet icon issue
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

interface MedOrgDetailModalProps {
    org: MedicalOrganization | null;
    isOpen: boolean;
    onClose: () => void;
}

export function MedOrgDetailModal({ org, isOpen, onClose }: MedOrgDetailModalProps) {
    const { updateMedOrg, fetchOrgStock, fetchOrgDoctors } = useMedOrgStore();

    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState<Partial<MedicalOrganization>>({});
    const [isSaving, setIsSaving] = useState(false);

    const [stock, setStock] = useState<any[]>([]);
    const [doctors, setDoctors] = useState<any[]>([]);
    const [allDoctors, setAllDoctors] = useState<any[]>([]);
    const [isAttachOpen, setIsAttachOpen] = useState(false);
    const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
    const [isAttaching, setIsAttaching] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(false);

    // Profile view states
    const [selectedViewDoctor, setSelectedViewDoctor] = useState<any>(null);
    const [viewDoctorPlans, setViewDoctorPlans] = useState<any[]>([]);
    const [viewDoctorFacts, setViewDoctorFacts] = useState<any[]>([]);
    const [viewDoctorBonuses, setViewDoctorBonuses] = useState<any[]>([]);
    const [isLoadingDocView, setIsLoadingDocView] = useState(false);

    useEffect(() => {
        if (org && isOpen) {
            setEditData({
                name: org.name || '',
                address: org.address || '',
                org_type: org.org_type || 'pharmacy',
                brand: org.brand || '',
                contact_phone: org.contact_phone || '',
                director_name: org.director_name || '',
            });
            setIsEditing(false);

            // Fetch extra data
            setIsLoadingData(true);
            Promise.all([
                fetchOrgStock(org.id),
                fetchOrgDoctors(org.id),
                getDoctors()
            ]).then(([stockData, docsData, allDocsData]) => {
                setStock(stockData);
                setDoctors(docsData);
                setAllDoctors(allDocsData || []);
            }).finally(() => {
                setIsLoadingData(false);
            });
        }
    }, [org, isOpen, fetchOrgStock, fetchOrgDoctors]);

    const handleAttachDoctor = async () => {
        if (!selectedDoctorId || !org) return;
        setIsAttaching(true);
        try {
            // Find existing doctor data to send full update payload if API requires it,
            // or just rely on backend allowing partial updates (fastapi might accept partial if Pydantic permits).
            // Usually update fields can be sparse. Let's send med_org_id.
            await updateDoctor(parseInt(selectedDoctorId), { med_org_id: org.id });

            // Refresh attached doctors
            const docsData = await fetchOrgDoctors(org.id);
            setDoctors(docsData || []);
            setSelectedDoctorId("");
            setIsAttachOpen(false);
        } catch (error) {
            console.error("Failed to attach doctor", error);
            alert("Ошибка при прикреплении врача");
        } finally {
            setIsAttaching(false);
        }
    };

    const handleDoctorClick = async (doc: any) => {
        setIsLoadingDocView(true);
        try {
            // First open modal with empty arrays to show the skeleton or basic info quickly
            setSelectedViewDoctor(doc);

            // Try fetching specific data if he has an assigned rep
            // If the user has permission to fetch all, we just pass no med_rep_id
            const plans = await getPlans();
            const facts = await getSaleFacts();
            const bonuses = await getBonusPayments();

            setViewDoctorPlans(plans.filter((p: any) => p.doctor_id === doc.id));
            setViewDoctorFacts(facts.filter((f: any) => f.doctor_id === doc.id));
            setViewDoctorBonuses(bonuses.filter((b: any) => b.doctor_id === doc.id));
        } catch (error) {
            console.error("Failed to fetch doctor details", error);
        } finally {
            setIsLoadingDocView(false);
        }
    };

    if (!org) return null;

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateMedOrg(org.id, editData);
            setIsEditing(false);
            // Optionally onClose() if we want to close it, but usually just turning off edit mode is better.
        } catch (error) {
            console.error("Failed to update organization", error);
        } finally {
            setIsSaving(false);
        }
    };

    // Default position if no coordinates
    const position: [number, number] = [41.2995, 69.2401];

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[900px] p-0 border-0 shadow-3xl rounded-[40px] overflow-hidden bg-slate-50 max-h-[90vh] overflow-y-auto">
                {/* Header Section */}
                <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 p-10 pb-20 shrink-0">
                    <div className="absolute top-6 right-6 flex gap-2">
                        {!isEditing ? (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="p-2 rounded-full bg-blue-500/20 hover:bg-blue-500/40 text-blue-300 hover:text-white transition-all flex items-center gap-2 px-4 shadow-sm"
                            >
                                <Edit2 className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase tracking-wider">Редактировать</span>
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all shadow-sm"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="p-2 rounded-full bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 hover:text-emerald-100 transition-all flex items-center gap-2 px-4 shadow-sm"
                                >
                                    <Check className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase tracking-wider">{isSaving ? 'Сохранение...' : 'Сохранить'}</span>
                                </button>
                            </>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all ml-2"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex items-center gap-8">
                        <div className="w-24 h-24 rounded-3xl bg-blue-500 flex items-center justify-center text-white shadow-2xl shadow-blue-500/40 transform rotate-3 flex-shrink-0">
                            <span className="text-4xl font-black">
                                {(editData.name || org.name).substring(0, 2).toUpperCase()}
                            </span>
                        </div>
                        <div className="space-y-4 flex-1">
                            {isEditing ? (
                                <Input
                                    value={editData.name as string}
                                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                    className="text-2xl font-black text-slate-800 bg-white border-0 h-12 w-full max-w-md rounded-xl"
                                    placeholder="Название организации"
                                />
                            ) : (
                                <h2 className="text-3xl font-black text-white tracking-tight leading-tight">
                                    {org.name}
                                </h2>
                            )}

                            <div className="flex items-center gap-3">
                                {isEditing ? (
                                    <Select
                                        value={editData.org_type as string}
                                        onValueChange={(val) => setEditData({ ...editData, org_type: val })}
                                    >
                                        <SelectTrigger className="h-8 px-3 rounded-full bg-blue-500/20 border-blue-500/30 text-blue-300 text-[10px] font-black uppercase tracking-widest w-[200px]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="pharmacy">Аптека</SelectItem>
                                            <SelectItem value="clinic">Клиника</SelectItem>
                                            <SelectItem value="hospital">Больница</SelectItem>
                                            <SelectItem value="lechebniy">Лечебное Учреждение</SelectItem>
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest border border-blue-500/30">
                                        {org.org_type === 'pharmacy' ? 'Аптека' : org.org_type === 'clinic' ? 'Клиника' : org.org_type === 'hospital' ? 'Больница' : 'Леч. Учреждение'}
                                    </span>
                                )}
                                <span className="flex items-center gap-1.5 text-slate-400 text-xs font-bold uppercase tracking-widest">
                                    <MapPin className="w-4 h-4 text-blue-500" />
                                    {org.region?.name || "Регион не указан"}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Section */}
                <div className="px-10 -mt-10 pb-10 space-y-8 relative z-10">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { label: "Бренд", field: 'brand', icon: Tag, color: "text-emerald-600", bg: "bg-emerald-50" },
                            { label: "Директор", field: 'director_name', icon: User, color: "text-blue-600", bg: "bg-blue-50" },
                            { label: "Телефон", field: 'contact_phone', icon: Phone, color: "text-indigo-600", bg: "bg-indigo-50" },
                            { label: "Представитель", value: org.assigned_reps?.[0]?.full_name || 'Не назначен', icon: Globe, color: "text-amber-600", bg: "bg-amber-50" },
                        ].map((item, i) => (
                            <div key={i} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm transition-all duration-300 group">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className={`p-2 rounded-xl ${item.bg} ${item.color} group-hover:scale-110 transition-transform`}>
                                        <item.icon className="w-4 h-4" />
                                    </div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</span>
                                </div>
                                {isEditing && item.field ? (
                                    <Input
                                        value={(editData as any)[item.field] || ''}
                                        onChange={(e) => setEditData({ ...editData, [item.field]: e.target.value })}
                                        className="h-8 text-xs font-bold text-slate-800"
                                        placeholder={`Введите ${item.label.toLowerCase()}`}
                                    />
                                ) : (
                                    <div className="text-xs font-bold text-slate-800 line-clamp-1">
                                        {item.field ? ((org as any)[item.field] || "—") : item.value}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                        {/* Left Column: Address Map & Warehouse Stock */}
                        <div className="space-y-8">
                            {/* Address & Info */}
                            <div className="bg-white p-8 rounded-[36px] border border-slate-100 shadow-sm relative overflow-hidden group">
                                <MapContainer
                                    center={position}
                                    zoom={14}
                                    style={{ height: "100%", width: "100%", position: 'absolute', top: 0, left: 0, opacity: 0.2, zIndex: 0 }}
                                    zoomControl={false}
                                    attributionControl={false}
                                >
                                    <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                                </MapContainer>

                                <div className="relative z-10">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                        <Info className="w-3.5 h-3.5" />
                                        Информация о локации
                                    </div>
                                    <div className="space-y-6">
                                        <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-100/50">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Точный адрес</p>
                                            {isEditing ? (
                                                <Input
                                                    value={editData.address as string}
                                                    onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                                                    className="font-bold text-slate-800"
                                                />
                                            ) : (
                                                <p className="text-sm font-bold text-slate-800 leading-relaxed">{org.address || "Адрес не указан"}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Warehouse Stock */}
                            <div className="bg-white p-8 rounded-[36px] border border-slate-100 shadow-sm h-auto max-h-[400px] flex flex-col">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <Package className="w-3.5 h-3.5" />
                                    Остаток на складе (Аптека)
                                </div>
                                <div className="overflow-y-auto pr-2 space-y-3 flex-1 custom-scrollbar">
                                    {isLoadingData ? (
                                        <p className="text-xs text-slate-400 font-medium animate-pulse">Загрузка склада...</p>
                                    ) : stock.length > 0 ? (
                                        stock.map((item, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-100 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-[10px]">
                                                        {item.product_name.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <span className="font-bold text-slate-800 text-sm">{item.product_name}</span>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-xs font-black text-slate-500 uppercase">Остаток</span>
                                                    <span className={`font-black ${item.quantity > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{item.quantity} шт</span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-8">
                                            <Package className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                            <p className="text-xs font-bold text-slate-400">Склад пуст или не привязан</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Doctors */}
                        <div className="bg-white p-8 rounded-[36px] border border-slate-100 shadow-sm flex flex-col h-[750px]">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Users className="w-3.5 h-3.5" />
                                    Прикрепленные врачи
                                </div>
                                {isAttachOpen ? (
                                    <div className="flex items-center gap-2 bg-white border border-slate-200 p-1 rounded-xl shadow-sm z-50">
                                        <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
                                            <SelectTrigger className="h-7 w-[200px] text-xs border-0 bg-slate-50 focus:ring-0">
                                                <SelectValue placeholder="Выберите врача..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {allDoctors.filter(d => d.med_org_id !== org.id).map(doc => (
                                                    <SelectItem key={doc.id} value={doc.id.toString()}>{doc.full_name}</SelectItem>
                                                ))}
                                                {allDoctors.filter(d => d.med_org_id !== org.id).length === 0 && (
                                                    <div className="p-2 text-xs text-slate-500 text-center">Нет доступных врачей</div>
                                                )}
                                            </SelectContent>
                                        </Select>
                                        <button
                                            onClick={handleAttachDoctor}
                                            disabled={isAttaching || !selectedDoctorId}
                                            className="bg-blue-600 hover:bg-blue-700 text-white p-1.5 rounded-lg disabled:opacity-50 transition-colors"
                                        >
                                            <Check className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsAttachOpen(false);
                                                setSelectedDoctorId("");
                                            }}
                                            className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-1.5 rounded-lg transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg">{doctors.length}</span>
                                        <button
                                            onClick={() => setIsAttachOpen(true)}
                                            className="text-[10px] font-bold uppercase tracking-widest text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors border border-blue-200 flex items-center gap-1"
                                        >
                                            Прикрепить врача
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="overflow-y-auto pr-2 space-y-3 flex-1 custom-scrollbar">
                                {isLoadingData ? (
                                    <p className="text-xs text-slate-400 font-medium animate-pulse">Загрузка врачей...</p>
                                ) : doctors.length > 0 ? (
                                    doctors.map((doc, idx) => (
                                        <div
                                            key={idx}
                                            className="p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-md hover:border-blue-200 transition-all group cursor-pointer"
                                            onClick={() => handleDoctorClick(doc)}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm shadow-sm">
                                                    {doc.full_name?.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-slate-800 text-sm leading-tight flex items-center gap-2">
                                                        {doc.full_name}
                                                    </h4>
                                                    <div className="flex items-center gap-3 mt-1 text-[10px] font-semibold text-slate-500">
                                                        {doc.specialty?.name && (
                                                            <span className="flex items-center gap-1">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
                                                                {doc.specialty.name}
                                                            </span>
                                                        )}
                                                        {doc.contact1 && (
                                                            <span className="flex items-center gap-1">
                                                                <Phone className="w-3 h-3 text-slate-400" />
                                                                {doc.contact1}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-12">
                                        <Users className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                                        <p className="text-sm font-bold text-slate-400">Нет прикрепленных врачей</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>

            <DoctorDetailModal
                isOpen={!!selectedViewDoctor}
                onClose={() => setSelectedViewDoctor(null)}
                doctor={selectedViewDoctor}
                salesPlans={viewDoctorPlans}
                salesFacts={viewDoctorFacts}
                bonusPayments={viewDoctorBonuses}
            />
        </Dialog>
    );
}
