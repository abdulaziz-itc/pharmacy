import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import '../../../shared/models/doctor_model.dart';

final regionsProvider = FutureProvider<List<RegionModel>>((ref) async {
  final apiClient = ref.watch(apiClientProvider);
  final response = await apiClient.get(ApiEndpoints.regions);
  final List<dynamic> data = response.data as List<dynamic>;
  return data.map((e) => RegionModel.fromJson(e as Map<String, dynamic>)).toList();
});

final specialtiesProvider = FutureProvider<List<SpecialtyModel>>((ref) async {
  final apiClient = ref.watch(apiClientProvider);
  final response = await apiClient.get(ApiEndpoints.doctorSpecialties);
  final List<dynamic> data = response.data as List<dynamic>;
  return data.map((e) => SpecialtyModel.fromJson(e as Map<String, dynamic>)).toList();
});

final doctorCategoriesProvider = FutureProvider<List<CategoryModel>>((ref) async {
  final apiClient = ref.watch(apiClientProvider);
  final response = await apiClient.get(ApiEndpoints.doctorCategories);
  final List<dynamic> data = response.data as List<dynamic>;
  return data.map((e) => CategoryModel.fromJson(e as Map<String, dynamic>)).toList();
});
