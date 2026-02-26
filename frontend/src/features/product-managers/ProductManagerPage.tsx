import React from 'react';
import { DataTable } from '../../components/ui/data-table';
import { columns } from './productManagerColumns';
import { useProductManagerStore } from '../../store/productManagerStore';
import { PageContainer } from '../../components/PageContainer';
import { PageHeader } from '../../components/PageHeader';
import AddProductManagerModal from './AddProductManagerModal';

export default function ProductManagerPage() {
    const { productManagers, fetchProductManagers } = useProductManagerStore();
    const [isModalOpen, setIsModalOpen] = React.useState(false);

    React.useEffect(() => {
        fetchProductManagers();
    }, [fetchProductManagers]);

    return (
        <PageContainer>
            <PageHeader
                title="Менеджеры по продукту"
                description="Управление списком менеджеров по продукции и их ролями."
                buttonLabel="ДОБАВИТЬ"
                onButtonClick={() => setIsModalOpen(true)}
            />

            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border overflow-hidden hover-lift transition-all duration-500">
                <DataTable columns={columns} data={productManagers} searchColumn="name" />
            </div>

            <AddProductManagerModal
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
            />
        </PageContainer>
    );
}
