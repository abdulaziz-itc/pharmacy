import { PageContainer } from '../../components/PageContainer';
import { PageHeader } from '../../components/PageHeader';
import { FileText } from 'lucide-react';

export default function InvoicesPage() {
    return (
        <PageContainer>
            <PageHeader
                title="Счета-фактуры"
                description="Просмотр записей «Счетов-фактур», цифровых подписей и статуса соответствия налоговым требованиям."
                buttonLabel="Создать инвойс"
            />

            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border p-12 text-center hover-lift transition-all duration-500">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-50 text-slate-600 mb-4">
                    <FileText className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Финансовые документы</h3>
                <p className="text-slate-500 mt-2 max-w-sm mx-auto">Система генерации и архивации счетов-фактур синхронизируется с центральной книгой. Ожидается проверка.</p>
            </div>
        </PageContainer>
    );
}
