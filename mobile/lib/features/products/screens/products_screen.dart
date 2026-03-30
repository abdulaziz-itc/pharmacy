import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/empty_view.dart';
import '../providers/products_provider.dart';
import '../../../core/l10n/l10n.dart';

class ProductsScreen extends ConsumerWidget {
  const ProductsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final productsAsync = ref.watch(filteredProductsProvider);
    final l10n = context.l10n;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text(l10n.products),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () => ref.refresh(productsProvider),
          ),
        ],
      ),
      body: Column(
        children: [
          _buildSearchBar(ref, l10n),
          Expanded(
            child: productsAsync.when(
              data: (products) {
                if (products.isEmpty) {
                  return EmptyView(
                    title: l10n.get('nothing_found') ?? 'Ничего не найдено',
                    subtitle: l10n.get('try_changing_search') ?? 'Попробуйте изменить запрос поиска',
                  );
                }
                return RefreshIndicator(
                  onRefresh: () async => ref.refresh(productsProvider),
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    itemCount: products.length,
                    itemBuilder: (context, index) {
                      final product = products[index];
                      return _buildProductCard(context, product);
                    },
                  ),
                );
              },
              loading: () => const Center(
                child: CircularProgressIndicator(color: AppColors.primary),
              ),
              error: (err, stack) => Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.error_outline, size: 48, color: AppColors.error),
                    const SizedBox(height: 16),
                    Text(
                      l10n.error,
                      style: GoogleFonts.inter(fontWeight: FontWeight.w600),
                    ),
                    TextButton(
                      onPressed: () => ref.refresh(productsProvider),
                      child: Text(l10n.get('retry') ?? 'Повторить'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchBar(WidgetRef ref, S l10n) {
    return Container(
      padding: const EdgeInsets.all(16),
      color: Colors.transparent,
      child: TextField(
        onChanged: (value) => ref.read(searchQueryProvider.notifier).state = value,
        decoration: InputDecoration(
          hintText: '${l10n.get('search_medicine') ?? 'Поиск лекарств'}...',
          prefixIcon: const Icon(Icons.search_rounded),
        ),
      ),
    );
  }

  Widget _buildProductCard(BuildContext context, dynamic product) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Hero(
              tag: 'product_icon_${product.id}',
              child: Container(
                width: 48, height: 48,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.medical_services_outlined, color: AppColors.primary, size: 24),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    product.name,
                    style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  if (product.categoryName != null)
                    Text(
                      product.categoryName!,
                      style: GoogleFonts.inter(fontSize: 13, color: Theme.of(context).textTheme.bodySmall?.color),
                    ),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  context.l10n.get('price') ?? 'Цена',
                  style: GoogleFonts.inter(fontSize: 12, color: Theme.of(context).textTheme.labelSmall?.color),
                ),
                Text(
                  '${product.price.toStringAsFixed(0).replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]} ')} сум',
                  style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.accent),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
