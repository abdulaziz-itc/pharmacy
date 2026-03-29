import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import '../../../shared/models/bonus_model.dart';

enum BonusLoadStatus { initial, loading, loaded, error }

class BonusState {
  final BonusLoadStatus status;
  final BonusBalanceModel? bonusBalance;
  final String? errorMessage;

  const BonusState({
    required this.status,
    this.bonusBalance,
    this.errorMessage,
  });

  const BonusState.initial() : this(status: BonusLoadStatus.initial);

  BonusState copyWith({
    BonusLoadStatus? status,
    BonusBalanceModel? bonusBalance,
    String? errorMessage,
  }) {
    return BonusState(
      status: status ?? this.status,
      bonusBalance: bonusBalance ?? this.bonusBalance,
      errorMessage: errorMessage,
    );
  }
}

class BonusNotifier extends StateNotifier<BonusState> {
  final ApiClient _apiClient;

  BonusNotifier(this._apiClient) : super(const BonusState.initial());

  Future<void> loadBonusBalance() async {
    state = state.copyWith(
        status: BonusLoadStatus.loading, errorMessage: null);
    try {
      final response = await _apiClient.get(ApiEndpoints.bonusBalance);
      final bonus = BonusBalanceModel.fromJson(
          response.data as Map<String, dynamic>);
      state = state.copyWith(
        status: BonusLoadStatus.loaded,
        bonusBalance: bonus,
      );
    } catch (e) {
      state = state.copyWith(
        status: BonusLoadStatus.error,
        errorMessage: e.toString(),
      );
    }
  }

  Future<bool> allocateBonus({
    required int doctorId,
    required int productId,
    required double amount,
    required int month,
    required int year,
    String? notes,
  }) async {
    try {
      await _apiClient.post(
        '/sales/allocate-bonus/',
        data: {
          'doctor_id': doctorId,
          'product_id': productId,
          'quantity': 1, // Assuming 1 for logic where amount is direct
          'amount_per_unit': amount,
          'target_month': month,
          'target_year': year,
          'notes': notes,
        },
      );
      await loadBonusBalance();
      return true;
    } catch (e) {
      return false;
    }
  }
}

final bonusProvider =
    StateNotifierProvider<BonusNotifier, BonusState>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return BonusNotifier(apiClient);
});

class DoctorBonusParams {
  final int id;
  final int month;
  final int year;

  DoctorBonusParams({required this.id, required this.month, required this.year});

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is DoctorBonusParams &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          month == other.month &&
          year == other.year;

  @override
  int get hashCode => id.hashCode ^ month.hashCode ^ year.hashCode;
}

final doctorBonusStatsProvider =
    FutureProvider.family<BonusBalanceModel, DoctorBonusParams>((ref, params) async {
  final apiClient = ref.watch(apiClientProvider);
  final response = await apiClient.get(
    ApiEndpoints.bonusBalance,
    queryParameters: {
      'doctor_id': params.id,
      'month': params.month,
      'year': params.year,
    },
  );
  return BonusBalanceModel.fromJson(response.data as Map<String, dynamic>);
});
