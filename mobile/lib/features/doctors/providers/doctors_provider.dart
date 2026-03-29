import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import '../../../shared/models/doctor_model.dart';

enum DoctorsLoadStatus { initial, loading, loaded, error, loadingMore }

class DoctorsState {
  final DoctorsLoadStatus status;
  final List<DoctorModel> doctors;
  final String? errorMessage;
  final bool hasMore;
  final int currentPage;
  final String searchQuery;
  final DoctorModel? selectedDoctor;

  const DoctorsState({
    required this.status,
    required this.doctors,
    this.errorMessage,
    required this.hasMore,
    required this.currentPage,
    required this.searchQuery,
    this.selectedDoctor,
  });

  const DoctorsState.initial()
      : this(
          status: DoctorsLoadStatus.initial,
          doctors: const [],
          hasMore: true,
          currentPage: 0,
          searchQuery: '',
        );

  DoctorsState copyWith({
    DoctorsLoadStatus? status,
    List<DoctorModel>? doctors,
    String? errorMessage,
    bool? hasMore,
    int? currentPage,
    String? searchQuery,
    DoctorModel? selectedDoctor,
  }) {
    return DoctorsState(
      status: status ?? this.status,
      doctors: doctors ?? this.doctors,
      errorMessage: errorMessage,
      hasMore: hasMore ?? this.hasMore,
      currentPage: currentPage ?? this.currentPage,
      searchQuery: searchQuery ?? this.searchQuery,
      selectedDoctor: selectedDoctor ?? this.selectedDoctor,
    );
  }
}

class DoctorsNotifier extends StateNotifier<DoctorsState> {
  final ApiClient _apiClient;
  static const int _pageSize = 20;

  DoctorsNotifier(this._apiClient) : super(const DoctorsState.initial());

  Future<void> loadDoctors({bool refresh = false}) async {
    if (refresh) {
      state = state.copyWith(
        status: DoctorsLoadStatus.loading,
        doctors: [],
        currentPage: 0,
        hasMore: true,
        errorMessage: null,
      );
    } else if (state.status == DoctorsLoadStatus.loading ||
        state.status == DoctorsLoadStatus.loadingMore ||
        !state.hasMore) {
      return;
    } else {
      state = state.copyWith(status: DoctorsLoadStatus.loadingMore);
    }

    try {
      final params = <String, dynamic>{
        'skip': state.currentPage * _pageSize,
        'limit': _pageSize,
      };
      if (state.searchQuery.isNotEmpty) {
        params['name'] = state.searchQuery;
      }

      final response = await _apiClient.get(
        ApiEndpoints.doctors,
        queryParameters: params,
      );

      List<DoctorModel> newDoctors = [];
      final data = response.data;
      if (data is List) {
        newDoctors = data
            .map((e) => DoctorModel.fromJson(e as Map<String, dynamic>))
            .toList();
      } else if (data is Map && data.containsKey('items')) {
        newDoctors = (data['items'] as List)
            .map((e) => DoctorModel.fromJson(e as Map<String, dynamic>))
            .toList();
      }

      final allDoctors = refresh
          ? newDoctors
          : [...state.doctors, ...newDoctors];

      state = state.copyWith(
        status: DoctorsLoadStatus.loaded,
        doctors: allDoctors,
        hasMore: newDoctors.length >= _pageSize,
        currentPage: state.currentPage + 1,
      );
    } catch (e) {
      state = state.copyWith(
        status: DoctorsLoadStatus.error,
        errorMessage: e.toString(),
      );
    }
  }

  Future<void> search(String query) async {
    state = state.copyWith(
      searchQuery: query,
      doctors: [],
      currentPage: 0,
      hasMore: true,
    );
    await loadDoctors(refresh: true);
  }

  Future<void> loadDoctorDetail(int id) async {
    state = state.copyWith(selectedDoctor: null, status: DoctorsLoadStatus.loading);
    try {
      final response = await _apiClient.get(ApiEndpoints.doctorDetail(id));
      final doctor = DoctorModel.fromJson(response.data as Map<String, dynamic>);
      state = state.copyWith(selectedDoctor: doctor, status: DoctorsLoadStatus.loaded);
    } catch (e) {
      state = state.copyWith(
        status: DoctorsLoadStatus.error,
        errorMessage: e.toString(),
      );
    }
  }
}

final doctorsProvider =
    StateNotifierProvider<DoctorsNotifier, DoctorsState>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return DoctorsNotifier(apiClient);
});

final doctorPlansProvider = FutureProvider.family<List<DoctorPlan>, int>((ref, id) async {
  final apiClient = ref.watch(apiClientProvider);
  final response = await apiClient.get(ApiEndpoints.doctorPlans(id));
  final List<dynamic> data = response.data as List<dynamic>;
  return data.map((json) => DoctorPlan.fromJson(json as Map<String, dynamic>)).toList();
});
