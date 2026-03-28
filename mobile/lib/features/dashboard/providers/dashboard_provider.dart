import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import '../../../shared/models/dashboard_model.dart';

enum DashboardLoadStatus { initial, loading, loaded, error }

class DashboardState {
  final DashboardLoadStatus status;
  final DashboardStatsModel? stats;
  final String? errorMessage;

  const DashboardState({
    required this.status,
    this.stats,
    this.errorMessage,
  });

  const DashboardState.initial() : this(status: DashboardLoadStatus.initial);

  DashboardState copyWith({
    DashboardLoadStatus? status,
    DashboardStatsModel? stats,
    String? errorMessage,
  }) {
    return DashboardState(
      status: status ?? this.status,
      stats: stats ?? this.stats,
      errorMessage: errorMessage,
    );
  }
}

class DashboardNotifier extends StateNotifier<DashboardState> {
  final ApiClient _apiClient;

  DashboardNotifier(this._apiClient) : super(const DashboardState.initial());

  Future<void> loadStats() async {
    state = state.copyWith(status: DashboardLoadStatus.loading, errorMessage: null);
    try {
      final response = await _apiClient.get(ApiEndpoints.dashboardStats);
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

  Future<void> refresh() async {
    await loadStats();
  }
}

final dashboardProvider =
    StateNotifierProvider<DashboardNotifier, DashboardState>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return DashboardNotifier(apiClient);
});
