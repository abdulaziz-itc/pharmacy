import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import '../../../shared/models/invoice_model.dart';

enum InvoicesLoadStatus { initial, loading, loaded, error }

class InvoicesState {
  final InvoicesLoadStatus status;
  final List<InvoiceModel> invoices;
  final String? errorMessage;
  final InvoiceModel? selectedInvoice;

  const InvoicesState({
    required this.status,
    required this.invoices,
    this.errorMessage,
    this.selectedInvoice,
  });

  const InvoicesState.initial()
      : this(
          status: InvoicesLoadStatus.initial,
          invoices: const [],
        );

  InvoicesState copyWith({
    InvoicesLoadStatus? status,
    List<InvoiceModel>? invoices,
    String? errorMessage,
    InvoiceModel? selectedInvoice,
  }) {
    return InvoicesState(
      status: status ?? this.status,
      invoices: invoices ?? this.invoices,
      errorMessage: errorMessage,
      selectedInvoice: selectedInvoice ?? this.selectedInvoice,
    );
  }
}

class InvoicesNotifier extends StateNotifier<InvoicesState> {
  final ApiClient _apiClient;

  InvoicesNotifier(this._apiClient) : super(const InvoicesState.initial());

  Future<void> loadInvoices({bool hasDebt = false, int? year, int? month}) async {
    state = state.copyWith(status: InvoicesLoadStatus.loading, errorMessage: null);
    try {
      final queryParams = <String, dynamic>{
        'limit': 50,
        'has_debt': hasDebt,
      };
      if (year != null) queryParams['year'] = year;
      if (month != null) queryParams['month'] = month;

      final response = await _apiClient.get(
        ApiEndpoints.invoices,
        queryParameters: queryParams,
      );
      
      List<InvoiceModel> invoices = [];
      final data = response.data;
      if (data is List) {
        invoices = data.map((e) => InvoiceModel.fromJson(e as Map<String, dynamic>)).toList();
      } else if (data is Map && data.containsKey('items')) {
        invoices = (data['items'] as List)
            .map((e) => InvoiceModel.fromJson(e as Map<String, dynamic>))
            .toList();
      }
      
      state = state.copyWith(
        status: InvoicesLoadStatus.loaded,
        invoices: invoices,
      );
    } catch (e) {
      state = state.copyWith(
        status: InvoicesLoadStatus.error,
        errorMessage: e.toString(),
      );
    }
  }

  Future<void> loadInvoiceDetail(int id) async {
    try {
      final response = await _apiClient.get(ApiEndpoints.invoiceDetail(id));
      final invoice = InvoiceModel.fromJson(response.data as Map<String, dynamic>);
      state = state.copyWith(selectedInvoice: invoice);
    } catch (e) {
      // ignore
    }
  }
}

final invoicesProvider = StateNotifierProvider<InvoicesNotifier, InvoicesState>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return InvoicesNotifier(apiClient);
});
