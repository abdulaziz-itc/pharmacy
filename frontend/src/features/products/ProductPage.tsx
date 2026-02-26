import { useEffect, useState, useMemo } from 'react';
import { DataTable } from '../../components/ui/data-table';
import { createColumns } from './productColumns';
import { useProductStore, type Product } from '../../store/productStore';
import { PageContainer } from '../../components/PageContainer';
import ProductFilters from './ProductFilters';
import { AddManufacturerModal } from './AddManufacturerModal';
import { CategoryManagerModal } from './CategoryManagerModal';
import { EditProductModal } from './EditProductModal';
import { AddProductModal } from './AddProductModal';
import { Button } from '../../components/ui/button';
import { Factory, Layers, Plus } from 'lucide-react';

export default function ProductPage() {
    const { products, fetchProducts, isLoading, updateProduct } = useProductStore();
    const [isManufacturerModalOpen, setIsManufacturerModalOpen] = useState(false);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    const [selectedCategory, setSelectedCategory] = useState("all");
    const [selectedManufacturer, setSelectedManufacturer] = useState("all");

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const columns = useMemo(() => createColumns(
        (product) => setEditingProduct(product),
        (id, newStatus) => updateProduct(id, { is_active: newStatus === 'active' })
    ), [updateProduct]);

    const filteredProducts = useMemo(() => {
        return products.filter(product => {
            const matchesCategory = selectedCategory === "all" || product.category?.id.toString() === selectedCategory;

            let matchesManufacturer = selectedManufacturer === "all";
            if (selectedManufacturer !== "all") {
                matchesManufacturer = product.manufacturers?.some(m => m.id.toString() === selectedManufacturer) ?? false;
            }

            return matchesCategory && matchesManufacturer;
        });
    }, [products, selectedCategory, selectedManufacturer]);

    if (isLoading && products.length === 0) {
        return (
            <PageContainer>
                <div className="flex items-center justify-center h-64">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Загрузка данных...</p>
                    </div>
                </div>
            </PageContainer>
        );
    }

    return (
        <PageContainer>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Продукты</h1>
                    <p className="text-slate-500 font-medium mt-1">Управление фармацевтическими продуктами, уровнем запасов и ценами.</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        onClick={() => setIsCategoryModalOpen(true)}
                        variant="outline"
                        className="h-12 px-6 rounded-2xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold gap-2 shadow-sm transition-all"
                    >
                        <Layers className="w-5 h-5 text-emerald-500" />
                        Категория продуктов
                    </Button>
                    <Button
                        onClick={() => setIsManufacturerModalOpen(true)}
                        variant="outline"
                        className="h-12 px-6 rounded-2xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold gap-2 shadow-sm transition-all"
                    >
                        <Factory className="w-5 h-5 text-blue-500" />
                        Добавить производителя
                    </Button>
                    <Button
                        onClick={() => setIsProductModalOpen(true)}
                        className="h-12 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 shadow-lg shadow-blue-500/20 transition-all"
                    >
                        <Plus className="w-5 h-5" />
                        Добавить продукт
                    </Button>
                </div>
            </div>

            <div className="bg-white rounded-[40px] shadow-2xl shadow-slate-200/60 border border-slate-100 overflow-hidden hover-lift transition-all duration-500">
                <DataTable
                    columns={columns}
                    data={filteredProducts}
                    searchColumn="name"
                    filters={<ProductFilters
                        selectedCategory={selectedCategory}
                        onCategoryChange={setSelectedCategory}
                        selectedManufacturer={selectedManufacturer}
                        onManufacturerChange={setSelectedManufacturer}
                    />}
                />
            </div>

            <AddManufacturerModal
                isOpen={isManufacturerModalOpen}
                onClose={() => setIsManufacturerModalOpen(false)}
            />
            <CategoryManagerModal
                isOpen={isCategoryModalOpen}
                onClose={() => setIsCategoryModalOpen(false)}
            />
            <AddProductModal
                isOpen={isProductModalOpen}
                onClose={() => setIsProductModalOpen(false)}
            />
            <EditProductModal
                isOpen={!!editingProduct}
                onClose={() => setEditingProduct(null)}
                product={editingProduct}
            />
        </PageContainer>
    );
}
