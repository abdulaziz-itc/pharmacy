import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import '../../../shared/models/reservation_model.dart';

enum ReservationsLoadStatus { initial, loading, loaded, error }

class ReservationsState {
  final ReservationsLoadStatus status;
  final List<ReservationModel> reservations;
  final String? errorMessage;
  final ReservationModel? selectedReservation;
  final bool isCreating;

  const ReservationsState({
    required this.status,
    required this.reservations,
    this.errorMessage,
    this.selectedReservation,
    required this.isCreating,
  });

  const ReservationsState.initial()
      : this(
          status: ReservationsLoadStatus.initial,
          reservations: const [],
          isCreating: false,
        );

  ReservationsState copyWith({
    ReservationsLoadStatus? status,
    List<ReservationModel>? reservations,
    String? errorMessage,
    ReservationModel? selectedReservation,
    bool? isCreating,
  }) {
    return ReservationsState(
      status: status ?? this.status,
      reservations: reservations ?? this.reservations,
      errorMessage: errorMessage,
      selectedReservation: selectedReservation ?? this.selectedReservation,
      isCreating: isCreating ?? this.isCreating,
    );
  }
}

class ReservationsNotifier extends StateNotifier<ReservationsState> {
  final ApiClient _apiClient;

  ReservationsNotifier(this._apiClient)
      : super(const ReservationsState.initial());

  Future<void> loadReservations() async {
    state = state.copyWith(
        status: ReservationsLoadStatus.loading, errorMessage: null);
    try {
      final response = await _apiClient.get(
        ApiEndpoints.reservations,
        queryParameters: {'limit': 50},
      );
      List<ReservationModel> reservations = [];
      final data = response.data;
      if (data is List) {
        reservations = data
            .map((e) => ReservationModel.fromJson(e as Map<String, dynamic>))
            .toList();
      } else if (data is Map && data.containsKey('items')) {
        reservations = (data['items'] as List)
            .map((e) => ReservationModel.fromJson(e as Map<String, dynamic>))
            .toList();
      }
      state = state.copyWith(
        status: ReservationsLoadStatus.loaded,
        reservations: reservations,
      );
    } catch (e) {
      state = state.copyWith(
        status: ReservationsLoadStatus.error,
        errorMessage: e.toString(),
      );
    }
  }

  Future<void> loadReservationDetail(int id) async {
    try {
      final response =
          await _apiClient.get(ApiEndpoints.reservationDetail(id));
      final reservation = ReservationModel.fromJson(
          response.data as Map<String, dynamic>);
      state = state.copyWith(selectedReservation: reservation);
    } catch (e) {
      // ignore detail errors
    }
  }

  Future<bool> createReservation(Map<String, dynamic> data) async {
    state = state.copyWith(isCreating: true);
    try {
      final response = await _apiClient.post(
        ApiEndpoints.reservations,
        data: data,
      );
      final newReservation = ReservationModel.fromJson(
          response.data as Map<String, dynamic>);
      state = state.copyWith(
        reservations: [newReservation, ...state.reservations],
        isCreating: false,
      );
      return true;
    } catch (e) {
      state = state.copyWith(isCreating: false);
      return false;
    }
  }
}

final reservationsProvider =
    StateNotifierProvider<ReservationsNotifier, ReservationsState>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return ReservationsNotifier(apiClient);
});
