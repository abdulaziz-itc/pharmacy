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
    required int quantity,
    required double amountPerUnit,
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
          'quantity': quantity,
          'amount_per_unit': amountPerUnit,
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
});
