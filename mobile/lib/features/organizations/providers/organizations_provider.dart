import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import '../../../shared/models/med_org_model.dart';

enum OrgsLoadStatus { initial, loading, loaded, error }

class OrganizationsState {
  final OrgsLoadStatus status;
  final List<MedOrgModel> organizations;
  final String? errorMessage;
  final String searchQuery;

  const OrganizationsState({
    required this.status,
    required this.organizations,
    this.errorMessage,
    required this.searchQuery,
  });

  const OrganizationsState.initial()
      : this(
          status: OrgsLoadStatus.initial,
          organizations: const [],
          searchQuery: '',
        );

  OrganizationsState copyWith({
    OrgsLoadStatus? status,
    List<MedOrgModel>? organizations,
    String? errorMessage,
    String? searchQuery,
  }) {
    return OrganizationsState(
      status: status ?? this.status,
      organizations: organizations ?? this.organizations,
      errorMessage: errorMessage,
      searchQuery: searchQuery ?? this.searchQuery,
    );
  }
}

class OrganizationsNotifier extends StateNotifier<OrganizationsState> {
  final ApiClient _apiClient;

  OrganizationsNotifier(this._apiClient)
      : super(const OrganizationsState.initial());

  Future<void> loadOrganizations() async {
    state = state.copyWith(
        status: OrgsLoadStatus.loading, errorMessage: null);
    try {
      final response = await _apiClient.get(ApiEndpoints.medOrgs);
      List<MedOrgModel> orgs = [];
      final data = response.data;
      if (data is List) {
        orgs = data
            .map((e) => MedOrgModel.fromJson(e as Map<String, dynamic>))
            .toList();
      } else if (data is Map && data.containsKey('items')) {
        orgs = (data['items'] as List)
            .map((e) => MedOrgModel.fromJson(e as Map<String, dynamic>))
            .toList();
      }
      state = state.copyWith(
        status: OrgsLoadStatus.loaded,
        organizations: orgs,
      );
    } catch (e) {
      state = state.copyWith(
        status: OrgsLoadStatus.error,
        errorMessage: e.toString(),
      );
    }
  }

  List<MedOrgModel> get filteredOrgs {
    if (state.searchQuery.isEmpty) return state.organizations;
    return state.organizations
        .where((o) =>
            o.name.toLowerCase().contains(state.searchQuery.toLowerCase()))
        .toList();
  }

  void search(String query) {
    state = state.copyWith(searchQuery: query);
  }
}

final organizationsProvider =
    StateNotifierProvider<OrganizationsNotifier, OrganizationsState>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return OrganizationsNotifier(apiClient);
});

final filteredOrgsProvider = Provider<List<MedOrgModel>>((ref) {
  final state = ref.watch(organizationsProvider);
  if (state.searchQuery.isEmpty) return state.organizations;
  return state.organizations
      .where((o) =>
          o.name.toLowerCase().contains(state.searchQuery.toLowerCase()))
      .toList();
});
