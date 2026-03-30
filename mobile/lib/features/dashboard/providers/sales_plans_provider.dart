import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import '../../../shared/models/doctor_model.dart';

enum SalesPlansStatus { initial, loading, loaded, error }

class SalesPlansState {
  final SalesPlansStatus status;
  final List<DoctorPlan> plans;
  final String? errorMessage;
  final int selectedYear;
  final int selectedMonth;

  const SalesPlansState({
    required this.status,
    required this.plans,
    this.errorMessage,
    required this.selectedYear,
    required this.selectedMonth,
  });

  factory SalesPlansState.initial() {
    final now = DateTime.now();
    return SalesPlansState(
      status: SalesPlansStatus.initial,
      plans: [],
      selectedYear: now.year,
      selectedMonth: now.month,
    );
  }

  SalesPlansState copyWith({
    SalesPlansStatus? status,
    List<DoctorPlan>? plans,
    String? errorMessage,
    int? selectedYear,
    int? selectedMonth,
  }) {
    return SalesPlansState(
      status: status ?? this.status,
      plans: plans ?? this.plans,
      errorMessage: errorMessage,
      selectedYear: selectedYear ?? this.selectedYear,
      selectedMonth: selectedMonth ?? this.selectedMonth,
    );
  }

  // Helper to group plans by product
  Map<String, List<DoctorPlan>> get groupedByProduct {
    final Map<String, List<DoctorPlan>> groups = {};
    for (var plan in plans) {
      final key = plan.productName;
      if (!groups.containsKey(key)) {
        groups[key] = [];
      }
      groups[key]!.add(plan);
    }
    return groups;
  }
}

class SalesPlansNotifier extends StateNotifier<SalesPlansState> {
  final ApiClient _apiClient;

  SalesPlansNotifier(this._apiClient) : super(SalesPlansState.initial());

  Future<void> loadPlans({int? year, int? month}) async {
    final targetYear = year ?? state.selectedYear;
    final targetMonth = month ?? state.selectedMonth;

    state = state.copyWith(
      status: SalesPlansStatus.loading,
      errorMessage: null,
      selectedYear: targetYear,
      selectedMonth: targetMonth,
    );

    try {
      final response = await _apiClient.get(
        ApiEndpoints.salesPlans,
        queryParameters: {
          'year': targetYear,
          'month': targetMonth,
        },
      );
      
      final List<dynamic> data = response.data;
      final plans = data.map((json) => DoctorPlan.fromJson(json)).toList();
      
      state = state.copyWith(
        status: SalesPlansStatus.loaded,
        plans: plans,
      );
    } catch (e) {
      state = state.copyWith(
        status: SalesPlansStatus.error,
        errorMessage: e.toString(),
      );
    }
  }

  Future<bool> assignPlanToDoctor({
    required int doctorId,
    required int productId,
    required int targetQuantity,
    required int month,
    required int year,
    required int medRepId,
  }) async {
    try {
      await _apiClient.post(
        ApiEndpoints.salesPlans,
        data: {
          'med_rep_id': medRepId,
          'doctor_id': doctorId,
          'product_id': productId,
          'target_quantity': targetQuantity,
          'target_amount': 0, // Backend expects target_amount, but we'll focus on quantity
          'month': month,
          'year': year,
        },
      );
      await loadPlans(); // Refresh plans
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<void> updateFilter(int year, int month) async {
    await loadPlans(year: year, month: month);
  }

  Future<void> refresh() async {
    await loadPlans();
  }
}

final salesPlansProvider =
    StateNotifierProvider<SalesPlansNotifier, SalesPlansState>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return SalesPlansNotifier(apiClient);
});
