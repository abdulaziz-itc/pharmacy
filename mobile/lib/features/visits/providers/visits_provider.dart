import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import '../../../shared/models/visit_plan_model.dart';

enum VisitsLoadStatus { initial, loading, loaded, error }

class VisitsState {
  final VisitsLoadStatus status;
  final List<VisitPlanModel> visits;
  final String? errorMessage;
  final bool isSubmitting;

  const VisitsState({
    required this.status,
    required this.visits,
    this.errorMessage,
    required this.isSubmitting,
  });

  const VisitsState.initial()
      : this(
          status: VisitsLoadStatus.initial,
          visits: const [],
          isSubmitting: false,
        );

  VisitsState copyWith({
    VisitsLoadStatus? status,
    List<VisitPlanModel>? visits,
    String? errorMessage,
    bool? isSubmitting,
  }) {
    return VisitsState(
      status: status ?? this.status,
      visits: visits ?? this.visits,
      errorMessage: errorMessage,
      isSubmitting: isSubmitting ?? this.isSubmitting,
    );
  }

  List<VisitPlanModel> get pendingVisits =>
      visits.where((v) => !v.isCompleted).toList();

  List<VisitPlanModel> get completedVisits =>
      visits.where((v) => v.isCompleted).toList();
}

class VisitsNotifier extends StateNotifier<VisitsState> {
  final ApiClient _apiClient;

  VisitsNotifier(this._apiClient) : super(const VisitsState.initial());

  Future<void> loadVisits() async {
    state = state.copyWith(status: VisitsLoadStatus.loading, errorMessage: null);
    try {
      final response = await _apiClient.get(
        ApiEndpoints.visitPlans,
        queryParameters: {'limit': 100},
      );
      List<VisitPlanModel> visits = [];
      final data = response.data;
      if (data is List) {
        visits = data
            .map((e) => VisitPlanModel.fromJson(e as Map<String, dynamic>))
            .toList();
      } else if (data is Map && data.containsKey('items')) {
        visits = (data['items'] as List)
            .map((e) => VisitPlanModel.fromJson(e as Map<String, dynamic>))
            .toList();
      }
      state = state.copyWith(
        status: VisitsLoadStatus.loaded,
        visits: visits,
      );
    } catch (e) {
      state = state.copyWith(
        status: VisitsLoadStatus.error,
        errorMessage: e.toString(),
      );
    }
  }

  Future<bool> createVisit(Map<String, dynamic> data) async {
    state = state.copyWith(isSubmitting: true);
    try {
      final response = await _apiClient.post(
        ApiEndpoints.visitPlans,
        data: data,
      );
      final newVisit = VisitPlanModel.fromJson(
          response.data as Map<String, dynamic>);
      state = state.copyWith(
        visits: [newVisit, ...state.visits],
        isSubmitting: false,
      );
      return true;
    } catch (e) {
      state = state.copyWith(isSubmitting: false);
      return false;
    }
  }

  Future<bool> completeVisit(int id) async {
    try {
      await _apiClient.put(
        ApiEndpoints.visitPlanDetail(id),
        data: {'is_completed': true, 'completed_at': DateTime.now().toIso8601String()},
      );
      final updatedVisits = state.visits.map((v) {
        if (v.id == id) {
          return VisitPlanModel(
            id: v.id,
            plannedDate: v.plannedDate,
            doctor: v.doctor,
            subject: v.subject,
            isCompleted: true,
            visitType: v.visitType,
            notes: v.notes,
            completedAt: DateTime.now().toIso8601String(),
          );
        }
        return v;
      }).toList();
      state = state.copyWith(visits: updatedVisits);
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<bool> deleteVisit(int id) async {
    try {
      await _apiClient.delete(ApiEndpoints.visitPlanDetail(id));
      state = state.copyWith(
        visits: state.visits.where((v) => v.id != id).toList(),
      );
      return true;
    } catch (e) {
      return false;
    }
  }
}

final visitsProvider =
    StateNotifierProvider<VisitsNotifier, VisitsState>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return VisitsNotifier(apiClient);
});
