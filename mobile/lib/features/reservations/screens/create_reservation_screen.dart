import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/l10n/l10n.dart';
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
    final l10n = context.l10n;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text(
          l10n.createReservation,
          style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        centerTitle: false,
      ),
      body: Column(
        children: [
          _buildTopSection(l10n, state),
          _buildSearchSection(l10n),
          Expanded(child: _buildCartOrResults(l10n, state)),
        ],
      ),
      bottomNavigationBar: _buildBottomBar(l10n, state),
    );
  }

  Widget _buildTopSection(S l10n, ReservationsState state) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Theme.of(context).secondaryHeaderColor,
        border: Border(bottom: BorderSide(color: Theme.of(context).dividerColor, width: 0.5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            l10n.selectWarehouse.toUpperCase(),
            style: GoogleFonts.inter(
              fontSize: 11,
              fontWeight: FontWeight.w800,
              color: AppColors.textHint,
              letterSpacing: 1.2,
            ),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Theme.of(context).dividerColor),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<WarehouseModel>(
                value: state.selectedWarehouse,
                isExpanded: true,
                dropdownColor: Theme.of(context).cardColor,
                hint: Text(l10n.selectWarehouse, style: GoogleFonts.inter(fontSize: 14, color: AppColors.textHint)),
                items: state.warehouses.map((w) {
                  return DropdownMenuItem(
                    value: w,
                    child: Text(w.name, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w500)),
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

  Widget _buildSearchSection(S l10n) {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
      color: Theme.of(context).secondaryHeaderColor,
      child: TextField(
        controller: _searchController,
        style: GoogleFonts.inter(fontSize: 14),
        decoration: InputDecoration(
          hintText: l10n.searchProduct,
          prefixIcon: const Icon(Icons.search_rounded, color: AppColors.primary, size: 20),
          filled: true,
          fillColor: Theme.of(context).cardColor,
        ),
        onChanged: (val) => ref.read(reservationsProvider.notifier).searchProducts(val),
      ),
    );
  }

  Widget _buildCartOrResults(S l10n, ReservationsState state) {
    if (state.availableProducts.isNotEmpty) {
      return ListView.separated(
        padding: const EdgeInsets.all(20),
        itemCount: state.availableProducts.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (context, index) {
          final product = state.availableProducts[index];
          return _buildProductSearchResult(l10n, product);
        },
      );
    }

    if (state.cart.isEmpty) {
      return EmptyView(
        title: l10n.cartEmpty,
        subtitle: l10n.searchHint,
        icon: Icons.shopping_basket_outlined,
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(20),
      itemCount: state.cart.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final item = state.cart[index];
        return _buildCartItem(l10n, item);
      },
    );
  }

  Widget _buildProductSearchResult(S l10n, ProductModel product) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Theme.of(context).dividerColor),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  product.name,
                  style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 14),
                ),
                const SizedBox(height: 4),
                Text(
                  '${product.price.toStringAsFixed(0)} ${l10n.sumCurrency}',
                  style: GoogleFonts.inter(color: AppColors.primary, fontSize: 13, fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.add_circle_outline_rounded, color: AppColors.primary, size: 28),
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

  Widget _buildCartItem(S l10n, CartItem item) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 10,
            offset: const Offset(0, 4),
          )
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: Text(item.product.name, style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 14)),
              ),
              const SizedBox(width: 12),
              Text(
                '${item.total.toStringAsFixed(0)} ${l10n.sumCurrency}',
                style: GoogleFonts.inter(fontWeight: FontWeight.w800, fontSize: 14),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '${l10n.priceLabel}: ${item.price.toStringAsFixed(0)}',
                style: GoogleFonts.inter(fontSize: 12, color: AppColors.textHint, fontWeight: FontWeight.w500),
              ),
              Container(
                decoration: BoxDecoration(
                  color: Theme.of(context).scaffoldBackgroundColor,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Theme.of(context).dividerColor),
                ),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.remove_rounded, size: 20, color: AppColors.primary),
                      onPressed: () => ref.read(reservationsProvider.notifier).updateCartQuantity(item.product.id, -1),
                    ),
                    Text(
                      '${item.quantity}',
                      style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 15),
                    ),
                    IconButton(
                      icon: const Icon(Icons.add_rounded, size: 20, color: AppColors.primary),
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

  Widget _buildBottomBar(S l10n, ReservationsState state) {
    if (state.cart.isEmpty) return const SizedBox.shrink();

    return Container(
      padding: EdgeInsets.fromLTRB(24, 16, 24, 16 + MediaQuery.of(context).padding.bottom),
      decoration: BoxDecoration(
        color: Theme.of(context).secondaryHeaderColor,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.2),
            blurRadius: 15,
            offset: const Offset(0, -5),
          )
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(l10n.total + ':', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textHint)),
              Text(
                '${state.cartTotal.toStringAsFixed(0)} ${l10n.sumCurrency}',
                style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w900, color: AppColors.primary),
              ),
            ],
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            height: 56,
            child: ElevatedButton(
              onPressed: state.isCreating ? null : _submit,
              child: state.isCreating
                  ? const SizedBox(height: 24, width: 24, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                  : Text(l10n.createReservation),
            ),
          ),
        ],
      ),
    );
  }
}
