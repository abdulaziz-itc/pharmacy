import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import '../../../shared/models/dashboard_model.dart';

enum DashboardLoadStatus { initial, loading, loaded, error }

class DashboardState {
  final DashboardLoadStatus status;
  final DashboardStatsModel? stats;
  final String? errorMessage;
  final int selectedYear;
  final int selectedMonth;

  const DashboardState({
    required this.status,
    this.stats,
    this.errorMessage,
    required this.selectedYear,
    required this.selectedMonth,
  });

  factory DashboardState.initial() {
    final now = DateTime.now();
    return DashboardState(
      status: DashboardLoadStatus.initial,
      selectedYear: now.year,
      selectedMonth: now.month,
    );
  }

  DashboardState copyWith({
    DashboardLoadStatus? status,
    DashboardStatsModel? stats,
    String? errorMessage,
    int? selectedYear,
    int? selectedMonth,
  }) {
    return DashboardState(
      status: status ?? this.status,
      stats: stats ?? this.stats,
      errorMessage: errorMessage,
      selectedYear: selectedYear ?? this.selectedYear,
      selectedMonth: selectedMonth ?? this.selectedMonth,
    );
  }
}

class DashboardNotifier extends StateNotifier<DashboardState> {
  final ApiClient _apiClient;

  DashboardNotifier(this._apiClient) : super(DashboardState.initial());

  Future<void> loadStats({int? year, int? month}) async {
    final targetYear = year ?? state.selectedYear;
    final targetMonth = month ?? state.selectedMonth;

    state = state.copyWith(
      status: DashboardLoadStatus.loading,
      errorMessage: null,
      selectedYear: targetYear,
      selectedMonth: targetMonth,
    );

    try {
      final response = await _apiClient.get(
        ApiEndpoints.dashboardStats,
        queryParameters: {
          'year': targetYear,
          'month': targetMonth,
        },
      );
      final data = response.data as Map<String, dynamic>;
      final stats = DashboardStatsModel.fromJson(data);
      state = state.copyWith(
        status: DashboardLoadStatus.loaded,
        stats: stats,
      );
    } catch (e) {
      state = state.copyWith(
        status: DashboardLoadStatus.error,
        errorMessage: e.toString(),
      );
    }
  }

  Future<void> updateFilter(int year, int month) async {
    await loadStats(year: year, month: month);
  }

  Future<void> refresh() async {
    await loadStats();
  }
}

final dashboardProvider =
    StateNotifierProvider<DashboardNotifier, DashboardState>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return DashboardNotifier(apiClient);
});
