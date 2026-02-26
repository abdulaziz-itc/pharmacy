import { PageContainer } from '../../components/PageContainer';
import { PageHeader } from '../../components/PageHeader';
import { BarChart3 } from 'lucide-react';

export default function StatsPage() {
    return (
        <PageContainer>
            <PageHeader
                title="Аналитика рынка"
                description="Агрегированные данные о результативности, анализ тенденций и стратегическое прогнозирование."
                buttonLabel="Экспорт данных"
            />

            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border p-12 text-center hover-lift transition-all duration-500">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 mb-4">
                    <BarChart3 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Центр продвинутой аналитики</h3>
                <p className="text-slate-500 mt-2 max-w-sm mx-auto">Обработка сезонных тенденций и показателей эффективности представителей. Интеллектуальная система прогнозирования запускается.</p>
            </div>
        </PageContainer>
    );
}
