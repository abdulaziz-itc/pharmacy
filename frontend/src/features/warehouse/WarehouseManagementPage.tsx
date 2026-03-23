import { useState, useEffect } from 'react';
import { PageContainer } from '../../components/PageContainer';
import { Button } from '../../components/ui/button';
import { Plus, Package, Warehouse as WarehouseIcon, RefreshCcw } from 'lucide-react';
import { warehouseApi, type Warehouse } from '../../api/warehouse';
import { AddWarehouseModal } from './AddWarehouseModal';
import { AddStockModal } from './AddStockModal';
import { useProductStore } from '../../store/productStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

export default function WarehouseManagementPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddWarehouseModalOpen, setIsAddWarehouseModalOpen] = useState(false);
  const [isAddStockModalOpen, setIsAddStockModalOpen] = useState(false);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(null);
  const { products, fetchProducts } = useProductStore();

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await warehouseApi.getWarehouses();
      setWarehouses(data);
      await fetchProducts();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getProductName = (productId: number) => {
    return products.find(p => p.id === productId)?.name || `Продукт #${productId}`;
  };

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Управление складами</h1>
          <p className="text-slate-500 font-medium mt-1">Просмотр остатков и пополнение запасов на складах.</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={loadData}
            variant="outline"
            className="h-12 px-4 rounded-2xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm"
          >
            <RefreshCcw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            onClick={() => setIsAddWarehouseModalOpen(true)}
            className="h-12 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 shadow-lg shadow-blue-500/20 transition-all"
          >
            <Plus className="w-5 h-5" />
            Создать склад
          </Button>
        </div>
      </div>

      {isLoading && warehouses.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Загрузка складов...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {warehouses.map((warehouse) => (
            <Card key={warehouse.id} className="rounded-[32px] border-none shadow-xl shadow-slate-200/50 overflow-hidden hover-lift transition-all">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                      <WarehouseIcon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-900">{warehouse.name}</CardTitle>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        {warehouse.warehouse_type === 'main' ? 'Основной' : 'Региональный'}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 rounded-lg hover:bg-blue-50 text-blue-600"
                    onClick={() => {
                      setSelectedWarehouseId(warehouse.id);
                      setIsAddStockModalOpen(true);
                    }}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  {warehouse.stocks && warehouse.stocks.length > 0 ? (
                    warehouse.stocks.map((stock) => (
                      <div key={stock.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-bold text-slate-700 truncate max-w-[150px]">
                            {getProductName(stock.product_id)}
                          </span>
                        </div>
                        <span className="text-sm font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">
                          {stock.quantity}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6">
                      <Package className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Нет запасов</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {warehouses.length === 0 && !isLoading && (
        <div className="bg-white rounded-[40px] p-20 text-center shadow-2xl shadow-slate-200/60 border border-slate-100">
          <div className="w-20 h-20 bg-slate-50 rounded-[30px] flex items-center justify-center mx-auto mb-6">
            <WarehouseIcon className="w-10 h-10 text-slate-300" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Склады не найдены</h3>
          <p className="text-slate-500 mb-8 max-w-md mx-auto font-medium">Пока нет созданных складов. Создайте первый склад, чтобы начать управлять запасами.</p>
          <Button
            onClick={() => setIsAddWarehouseModalOpen(true)}
            className="h-12 px-8 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 shadow-lg shadow-blue-500/20 transition-all"
          >
            <Plus className="w-5 h-5" />
            Создать первый склад
          </Button>
        </div>
      )}

      <AddWarehouseModal
        isOpen={isAddWarehouseModalOpen}
        onClose={() => setIsAddWarehouseModalOpen(false)}
        onSuccess={loadData}
      />
      
      <AddStockModal
        isOpen={isAddStockModalOpen}
        onClose={() => {
          setIsAddStockModalOpen(false);
          setSelectedWarehouseId(null);
        }}
        onSuccess={loadData}
        warehouseId={selectedWarehouseId}
        warehouseName={warehouses.find(w => w.id === selectedWarehouseId)?.name}
      />
    </PageContainer>
  );
}
