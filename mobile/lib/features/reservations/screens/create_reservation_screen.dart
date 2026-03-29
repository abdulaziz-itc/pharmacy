import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/models/warehouse_model.dart';
import '../../../shared/models/product_model.dart';
import '../../../shared/widgets/empty_view.dart';
import '../../../shared/widgets/loading_shimmer.dart';
import '../providers/reservations_provider.dart';

class CreateReservationScreen extends ConsumerStatefulWidget {
  final int? orgId;
  final String? orgName;

  const CreateReservationScreen({super.key, this.orgId, this.orgName});

  @override
  ConsumerState<CreateReservationScreen> createState() => _CreateReservationScreenState();
}

class _CreateReservationScreenState extends ConsumerState<CreateReservationScreen> {
  final _searchController = TextEditingController();
  final _customerNameController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _customerNameController.text = widget.orgName ?? '';
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(reservationsProvider.notifier).loadWarehouses();
      ref.read(reservationsProvider.notifier).clearCart();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    _customerNameController.dispose();
    super.dispose();
  }

  void _submit() async {
    final success = await ref.read(reservationsProvider.notifier).createReservation(
      customerName: _customerNameController.text,
      medOrgId: widget.orgId,
    );

    if (success && mounted) {
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Бронь успешно создана'),
          backgroundColor: AppColors.statusApproved,
        ),
      );
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Ошибка при создании брони'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(reservationsProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(
          'Создание брони',
          style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.w600),
        ),
        backgroundColor: AppColors.surface,
        elevation: 0,
        centerTitle: false,
      ),
      body: Column(
        children: [
          _buildTopSection(state),
          _buildSearchSection(),
          Expanded(child: _buildCartOrResults(state)),
        ],
      ),
      bottomNavigationBar: _buildBottomBar(state),
    );
  }

  Widget _buildTopSection(ReservationsState state) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(bottom: BorderSide(color: AppColors.divider, width: 0.5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Выберите склад',
            style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textSecondary),
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(
              color: AppColors.background,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.divider),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<WarehouseModel>(
                value: state.selectedWarehouse,
                isExpanded: true,
                hint: const Text('Выберите склад'),
                items: state.warehouses.map((w) {
                  return DropdownMenuItem(
                    value: w,
                    child: Text(w.name, style: GoogleFonts.inter(fontSize: 14)),
                  );
                }).toList(),
                onChanged: (val) {
                  if (val != null) {
                    ref.read(reservationsProvider.notifier).selectWarehouse(val);
                  }
                },
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchSection() {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
      color: AppColors.surface,
      child: TextField(
        controller: _searchController,
        style: GoogleFonts.inter(fontSize: 14),
        decoration: InputDecoration(
          hintText: 'Поиск товара...',
          hintStyle: GoogleFonts.inter(color: AppColors.textHint),
          prefixIcon: const Icon(Icons.search_rounded, color: AppColors.textHint, size: 20),
          filled: true,
          fillColor: AppColors.background,
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        ),
        onChanged: (val) => ref.read(reservationsProvider.notifier).searchProducts(val),
      ),
    );
  }

  Widget _buildCartOrResults(ReservationsState state) {
    if (state.availableProducts.isNotEmpty) {
      return ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: state.availableProducts.length,
        itemBuilder: (context, index) {
          final product = state.availableProducts[index];
          return _buildProductSearchResult(product);
        },
      );
    }

    if (state.cart.isEmpty) {
      return const EmptyView(
        title: 'Корзина пуста',
        subtitle: 'Найдите нужные продукты через поиск',
        icon: Icons.add_shopping_cart_rounded,
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: state.cart.length,
      itemBuilder: (context, index) {
        final item = state.cart[index];
        return _buildCartItem(item);
      },
    );
  }

  Widget _buildProductSearchResult(ProductModel product) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.divider.withValues(alpha: 0.5)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('${product.price.toStringAsFixed(0)} сум', style: GoogleFonts.inter(color: AppColors.primary, fontSize: 12, fontWeight: FontWeight.bold)),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.add_circle_rounded, color: AppColors.primary),
            onPressed: () {
              ref.read(reservationsProvider.notifier).addToCart(product);
              _searchController.clear();
              ref.read(reservationsProvider.notifier).searchProducts('');
            },
          ),
        ],
      ),
    );
  }

  Widget _buildCartItem(CartItem item) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 8, offset: const Offset(0, 4))],
      ),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: Text(item.product.name, style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 14)),
              ),
              Text(
                '${item.total.toStringAsFixed(0)} сум',
                style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.textPrimary),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Цена: ${item.price.toStringAsFixed(0)}',
                style: GoogleFonts.inter(fontSize: 12, color: AppColors.textSecondary),
              ),
              Container(
                decoration: BoxDecoration(
                  color: AppColors.background,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.remove_rounded, size: 18),
                      onPressed: () => ref.read(reservationsProvider.notifier).updateCartQuantity(item.product.id, -1),
                    ),
                    Text('${item.quantity}', style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
                    IconButton(
                      icon: const Icon(Icons.add_rounded, size: 18),
                      onPressed: () => ref.read(reservationsProvider.notifier).updateCartQuantity(item.product.id, 1),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildBottomBar(ReservationsState state) {
    if (state.cart.isEmpty) return const SizedBox.shrink();

    return Container(
      padding: EdgeInsets.fromLTRB(20, 12, 20, 12 + MediaQuery.of(context).padding.bottom),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, -4))],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Итого:', style: GoogleFonts.inter(fontSize: 14, color: AppColors.textSecondary)),
              Text(
                '${state.cartTotal.toStringAsFixed(0)} сум',
                style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.primary),
              ),
            ],
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: state.isCreating ? null : _submit,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                elevation: 0,
              ),
              child: state.isCreating
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : Text('Создать бронь', style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
    );
  }
}
