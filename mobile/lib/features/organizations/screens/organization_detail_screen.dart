import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/models/med_org_model.dart';
import '../../../shared/models/doctor_model.dart';
import '../../../shared/widgets/empty_view.dart';
import '../../../shared/widgets/error_view.dart';
import '../../../shared/widgets/loading_shimmer.dart';
import '../providers/organizations_provider.dart';
import '../../doctors/providers/doctors_provider.dart';
import '../../reservations/screens/create_reservation_screen.dart';

class OrganizationDetailScreen extends ConsumerStatefulWidget {
  final int orgId;

  const OrganizationDetailScreen({super.key, required this.orgId});

  @override
  ConsumerState<OrganizationDetailScreen> createState() => _OrganizationDetailScreenState();
}

class _OrganizationDetailScreenState extends ConsumerState<OrganizationDetailScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(organizationsProvider.notifier).loadOrgDetails(widget.orgId);
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _showAttachDoctorDialog() async {
    // 1. Load all doctors (not just in this org)
    await ref.read(doctorsProvider.notifier).loadDoctors();
    
    if (!mounted) return;
    
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _AttachDoctorBottomSheet(orgId: widget.orgId),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(organizationsProvider);
    final org = state.selectedOrg;
    final l10n = context.l10n;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text(
          org?.name ?? l10n.organizations,
          style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppColors.primary,
          indicatorWeight: 3,
          indicatorSize: TabBarIndicatorSize.tab,
          labelColor: AppColors.primary,
          unselectedLabelColor: AppColors.textHint,
          labelStyle: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.bold),
          unselectedLabelStyle: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w500),
          dividerColor: Theme.of(context).dividerColor,
          tabs: [
            Tab(text: l10n.organizationDetails),
            Tab(text: l10n.doctorsTab),
            Tab(text: l10n.stockTab),
          ],
        ),
      ),
      body: state.status == OrgsLoadStatus.loading && org == null
          ? const ShimmerList(count: 5)
          : state.status == OrgsLoadStatus.error
              ? ErrorView(
                  message: state.errorMessage ?? l10n.loadingError,
                  onRetry: () => ref.read(organizationsProvider.notifier).loadOrgDetails(widget.orgId),
                )
              : TabBarView(
                  controller: _tabController,
                  children: [
                    _buildGeneralInfo(org!, l10n),
                    _buildDoctorsList(state.orgDoctors, l10n),
                    _buildStockList(state.orgStock, l10n),
                  ],
                ),
      bottomNavigationBar: org != null ? _buildBottomActions(org, l10n) : null,
    );
  }

  Widget _buildGeneralInfo(MedOrgModel org, S l10n) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          _buildInfoItem(Icons.business_rounded, l10n.nameLabel, org.name),
          _buildInfoItem(Icons.category_rounded, l10n.typeLabel, org.displayType),
          _buildInfoItem(Icons.location_on_rounded, l10n.regionLabel, org.regionName ?? l10n.notSpecified),
          _buildInfoItem(Icons.map_rounded, l10n.addressLabel, org.address ?? l10n.notSpecified),
          if (org.doctorsCount != null)
            _buildInfoItem(Icons.people_alt_rounded, l10n.doctorsCountLabel, org.doctorsCount.toString()),
        ],
      ),
    );
  }

  Widget _buildInfoItem(IconData icon, String label, String value) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Theme.of(context).dividerColor),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: AppColors.primary, size: 20),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label.toUpperCase(),
                  style: GoogleFonts.inter(
                    fontSize: 10,
                    color: AppColors.textHint,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  value,
                  style: GoogleFonts.inter(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDoctorsList(List<DoctorModel> doctors, S l10n) {
    if (doctors.isEmpty) {
      return Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.people_outline_rounded, size: 64, color: AppColors.textHint.withValues(alpha: 0.2)),
            const SizedBox(height: 24),
            Text(
              l10n.doctorsNotFound,
              style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
            ),
            const SizedBox(height: 8),
            Text(
              l10n.noDoctorsAttached,
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(fontSize: 14, color: AppColors.textSecondary),
            ),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              height: 54,
              child: ElevatedButton.icon(
                onPressed: _showAttachDoctorDialog,
                icon: const Icon(Icons.add_rounded),
                label: Text(l10n.attachDoctor),
              ),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(20),
      itemCount: doctors.length + 1,
      itemBuilder: (context, index) {
        if (index == doctors.length) {
          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 16),
            child: Center(
              child: TextButton.icon(
                onPressed: _showAttachDoctorDialog,
                icon: const Icon(Icons.add_rounded),
                label: Text(l10n.attachAnotherDoctor),
                style: TextButton.styleFrom(
                  foregroundColor: AppColors.primary,
                  textStyle: GoogleFonts.inter(fontWeight: FontWeight.bold),
                ),
              ),
            ),
          );
        }
        final doctor = doctors[index];
        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          decoration: BoxDecoration(
            color: Theme.of(context).cardColor,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Theme.of(context).dividerColor),
          ),
          child: ListTile(
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            leading: CircleAvatar(
              radius: 22,
              backgroundColor: AppColors.primary.withValues(alpha: 0.1),
              child: Text(
                doctor.initials,
                style: GoogleFonts.inter(color: AppColors.primary, fontSize: 13, fontWeight: FontWeight.bold),
              ),
            ),
            title: Text(
              doctor.fullName,
              style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 15),
            ),
            subtitle: Text(
              doctor.specialty?.name ?? l10n.specialtyNotSpecified,
              style: GoogleFonts.inter(fontSize: 12, color: AppColors.textHint),
            ),
            trailing: const Icon(Icons.chevron_right_rounded, color: AppColors.textHint, size: 24),
            onTap: () {
              // Option to view doctor detail
            },
          ),
        );
      },
    );
  }

  Widget _buildStockList(List<Map<String, dynamic>> stock, S l10n) {
    if (stock.isEmpty) {
      return Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.inventory_2_outlined, size: 64, color: AppColors.textHint.withValues(alpha: 0.2)),
            const SizedBox(height: 24),
            Text(
              l10n.stockNotFound,
              style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
            ),
            const SizedBox(height: 8),
            Text(
              l10n.noStockItems,
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(fontSize: 14, color: AppColors.textSecondary),
            ),
          ],
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(20),
      itemCount: stock.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final item = stock[index];
        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Theme.of(context).cardColor,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Theme.of(context).dividerColor),
          ),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.medication_rounded, color: AppColors.primary, size: 22),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item['product_name'] ?? l10n.unknownProduct,
                      style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                    if (item['category'] != null)
                      Text(
                        item['category'],
                        style: GoogleFonts.inter(fontSize: 12, color: AppColors.textHint),
                      ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: AppColors.success.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '${item['quantity']} ${l10n.pcs}',
                  style: GoogleFonts.inter(
                    color: AppColors.success,
                    fontWeight: FontWeight.w900,
                    fontSize: 12,
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildBottomActions(MedOrgModel org, S l10n) {
    return Container(
      padding: EdgeInsets.fromLTRB(20, 16, 20, 16 + MediaQuery.of(context).padding.bottom),
      decoration: BoxDecoration(
        color: Theme.of(context).secondaryHeaderColor,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.2),
            blurRadius: 15,
            offset: const Offset(0, -5),
          ),
        ],
      ),
      child: SizedBox(
        width: double.infinity,
        height: 56,
        child: ElevatedButton(
          onPressed: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => CreateReservationScreen(
                  orgId: widget.orgId,
                  orgName: org.name,
                ),
              ),
            );
          },
          child: Text(l10n.createReservation),
        ),
      ),
    );
  }
}

class _AttachDoctorBottomSheet extends ConsumerStatefulWidget {
  final int orgId;

  const _AttachDoctorBottomSheet({required this.orgId});

  @override
  ConsumerState<_AttachDoctorBottomSheet> createState() => _AttachDoctorBottomSheetState();
}

class _AttachDoctorBottomSheetState extends ConsumerState<_AttachDoctorBottomSheet> {
  final _searchController = TextEditingController();
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final doctorsState = ref.watch(doctorsProvider);
    final allDoctors = doctorsState.doctors;
    final l10n = context.l10n;
    
    final filtered = allDoctors.where((d) => 
      d.fullName.toLowerCase().contains(_query.toLowerCase()) && 
      d.medOrg?.id != widget.orgId
    ).toList();

    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      decoration: BoxDecoration(
        color: Theme.of(context).scaffoldBackgroundColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          Container(
            margin: const EdgeInsets.symmetric(vertical: 12),
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: Theme.of(context).dividerColor,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 8, 12, 16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  l10n.attachDoctor,
                  style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.bold),
                ),
                IconButton(
                  icon: const Icon(Icons.close_rounded),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: l10n.searchDoctorHint,
                prefixIcon: const Icon(Icons.search_rounded, color: AppColors.primary),
                filled: true,
                fillColor: Theme.of(context).cardColor,
              ),
              onChanged: (val) => setState(() => _query = val),
            ),
          ),
          const SizedBox(height: 16),
          Expanded(
            child: filtered.isEmpty
                ? EmptyView(
                    title: l10n.doctorsNotFound,
                    subtitle: l10n.searchParamsEmpty,
                    icon: Icons.person_search_rounded,
                  )
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                    itemCount: filtered.length,
                    itemBuilder: (context, index) {
                      final doctor = filtered[index];
                      return Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        decoration: BoxDecoration(
                          color: Theme.of(context).cardColor,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: Theme.of(context).dividerColor),
                        ),
                        child: ListTile(
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          leading: CircleAvatar(
                            radius: 20,
                            backgroundColor: AppColors.primary.withValues(alpha: 0.1),
                            child: Text(
                              doctor.initials,
                              style: GoogleFonts.inter(color: AppColors.primary, fontSize: 12, fontWeight: FontWeight.bold),
                            ),
                          ),
                          title: Text(
                            doctor.fullName,
                            style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 14),
                          ),
                          subtitle: Text(
                            doctor.specialty?.name ?? l10n.specialtyNotSpecified,
                            style: GoogleFonts.inter(fontSize: 12, color: AppColors.textHint),
                          ),
                          trailing: const Icon(Icons.add_circle_outline_rounded, color: AppColors.primary, size: 28),
                          onTap: () async {
                            final success = await ref.read(organizationsProvider.notifier)
                                .attachDoctorToOrg(doctor.id, widget.orgId);
                            if (success && mounted) {
                              Navigator.pop(context);
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(l10n.doctorAttachedSuccess),
                                  backgroundColor: AppColors.success,
                                ),
                              );
                            } else if (mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(l10n.doctorAttachError),
                                  backgroundColor: AppColors.error,
                                ),
                              );
                            }
                          },
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
