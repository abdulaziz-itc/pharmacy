import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import '../../../shared/models/doctor_model.dart';
import '../../../shared/models/med_org_model.dart';
import '../../../shared/models/reservation_model.dart';

enum OrgsLoadStatus { initial, loading, loaded, error }

class OrganizationsState {
  final OrgsLoadStatus status;
  final List<MedOrgModel> organizations;
  final String? errorMessage;
  final String searchQuery;
  final MedOrgModel? selectedOrg;
  final List<DoctorModel> orgDoctors;
  final List<Map<String, dynamic>> orgStock;

  const OrganizationsState({
    required this.status,
    required this.organizations,
    this.errorMessage,
    required this.searchQuery,
    this.selectedOrg,
    this.orgDoctors = const [],
    this.orgStock = const [],
  });

  const OrganizationsState.initial()
      : this(
          status: OrgsLoadStatus.initial,
          organizations: const [],
          searchQuery: '',
          orgDoctors: const [],
          orgStock: const [],
        );

  OrganizationsState copyWith({
    OrgsLoadStatus? status,
    List<MedOrgModel>? organizations,
    String? errorMessage,
    String? searchQuery,
    MedOrgModel? selectedOrg,
    List<DoctorModel>? orgDoctors,
    List<Map<String, dynamic>>? orgStock,
  }) {
    return OrganizationsState(
      status: status ?? this.status,
      organizations: organizations ?? this.organizations,
      errorMessage: errorMessage,
      searchQuery: searchQuery ?? this.searchQuery,
      selectedOrg: selectedOrg ?? this.selectedOrg,
      orgDoctors: orgDoctors ?? this.orgDoctors,
      orgStock: orgStock ?? this.orgStock,
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

  Future<void> loadOrgDetails(int id) async {
    state = state.copyWith(status: OrgsLoadStatus.loading);
    try {
      // 1. Get Org Info
      final orgResponse = await _apiClient.get('${ApiEndpoints.medOrgs}/$id/');
      final org = MedOrgModel.fromJson(orgResponse.data as Map<String, dynamic>);
      
      // 2. Get Doctors in this org
      final doctorsResponse = await _apiClient.get(
        ApiEndpoints.doctors,
        queryParameters: {'med_org_id': id},
      );
      List<DoctorModel> doctors = [];
      if (doctorsResponse.data is List) {
        doctors = (doctorsResponse.data as List)
            .map((e) => DoctorModel.fromJson(e as Map<String, dynamic>))
            .toList();
      }
      
      // 3. Get Stock for this org
      final stockResponse = await _apiClient.get('${ApiEndpoints.medOrgs}/$id/stock/');
      List<Map<String, dynamic>> stock = [];
      if (stockResponse.data is List) {
        stock = (stockResponse.data as List).cast<Map<String, dynamic>>();
      }
      
      state = state.copyWith(
        status: OrgsLoadStatus.loaded,
        selectedOrg: org,
        orgDoctors: doctors,
        orgStock: stock,
      );
    } catch (e) {
      state = state.copyWith(
        status: OrgsLoadStatus.error,
        errorMessage: e.toString(),
      );
    }
  }

  Future<bool> attachDoctorToOrg(int doctorId, int orgId) async {
    try {
      await _apiClient.put(
        '${ApiEndpoints.doctors}/$doctorId',
        data: {'med_org_id': orgId},
      );
      // Reload details to show updated doctor list
      await loadOrgDetails(orgId);
      return true;
    } catch (e) {
      return false;
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
