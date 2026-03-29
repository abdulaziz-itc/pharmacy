import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import '../models/product.dart';

final productsProvider = FutureProvider<List<Product>>((ref) async {
  final apiClient = ref.watch(apiClientProvider);
  final response = await apiClient.get(ApiEndpoints.products);
  
  if (response.data is List) {
    return (response.data as List)
        .map((json) => Product.fromJson(json))
        .toList();
  }
  return [];
});

final searchQueryProvider = StateProvider<String>((ref) => '');

final filteredProductsProvider = Provider<AsyncValue<List<Product>>>((ref) {
  final productsAsync = ref.watch(productsProvider);
  final query = ref.watch(searchQueryProvider).toLowerCase();

  return productsAsync.whenData((products) {
    if (query.isEmpty) return products;
    return products.where((p) {
      return p.name.toLowerCase().contains(query) ||
             (p.categoryName?.toLowerCase().contains(query) ?? false);
    }).toList();
  });
});
