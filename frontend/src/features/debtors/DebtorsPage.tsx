import { PageContainer } from '../../components/PageContainer';
import { PageHeader } from '../../components/PageHeader';
import { Landmark } from 'lucide-react';

export default function DebtorsPage() {
    return (
        <PageContainer>
            <PageHeader
                title="Дебиторская задолженность"
                description="Мониторинг непогашенной задолженности, задержек платежей и назначений коллекторов."
                buttonLabel="Новая запись о долге"
            />

            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border p-12 text-center hover-lift transition-all duration-500">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 mb-4">
                    <Landmark className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Журнал взыскания долгов</h3>
                <p className="text-slate-500 mt-2 max-w-sm mx-auto">Анализ отчетов о сроках погашения и остатках задолженности. Сводки по консолидации долгов появятся в ближайшее время.</p>
            </div>
        </PageContainer>
    );
}
