import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/models/med_org_model.dart';
import '../../../shared/widgets/empty_view.dart';
import '../../../shared/widgets/error_view.dart';
import '../../../shared/widgets/loading_shimmer.dart';
import '../providers/organizations_provider.dart';

class OrganizationsScreen extends ConsumerStatefulWidget {
  const OrganizationsScreen({super.key});

  @override
  ConsumerState<OrganizationsScreen> createState() =>
      _OrganizationsScreenState();
}

class _OrganizationsScreenState extends ConsumerState<OrganizationsScreen> {
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(organizationsProvider.notifier).loadOrganizations();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(organizationsProvider);
    final filteredOrgs = ref.watch(filteredOrgsProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Tibbiy tashkilotlar'),
        backgroundColor: AppColors.surface,
      ),
      body: Column(
        children: [
          Container(
            color: AppColors.surface,
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Tashkilot qidirish...',
                prefixIcon: const Icon(
                  Icons.search_rounded,
                  color: AppColors.textHint,
                ),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, size: 18),
                        onPressed: () {
                          _searchController.clear();
                          ref
                              .read(organizationsProvider.notifier)
                              .search('');
                          setState(() {});
                        },
                      )
                    : null,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
                filled: true,
                fillColor: AppColors.surfaceVariant,
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
              ),
              onChanged: (value) {
                setState(() {});
                ref.read(organizationsProvider.notifier).search(value);
              },
            ),
          ),
          Expanded(
            child: _buildContent(state, filteredOrgs),
          ),
        ],
      ),
    );
  }

  Widget _buildContent(OrganizationsState state, List<MedOrgModel> orgs) {
    if (state.status == OrgsLoadStatus.loading) {
      return const ShimmerList(count: 6);
    }

    if (state.status == OrgsLoadStatus.error && orgs.isEmpty) {
      return ErrorView(
        message: state.errorMessage ?? 'Xatolik',
        onRetry: () =>
            ref.read(organizationsProvider.notifier).loadOrganizations(),
        fullScreen: true,
      );
    }

    if (orgs.isEmpty) {
      return const EmptyView(
        title: 'Tashkilotlar topilmadi',
        subtitle: 'Qidiruv so\'zini o\'zgartiring',
        icon: Icons.business_outlined,
      );
    }

    return RefreshIndicator(
      onRefresh: () =>
          ref.read(organizationsProvider.notifier).loadOrganizations(),
      color: AppColors.primary,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(vertical: 8),
        itemCount: orgs.length,
        itemBuilder: (context, index) => _buildOrgCard(orgs[index]),
      ),
    );
  }

  Widget _buildOrgCard(MedOrgModel org) {
    final typeColors = {
      'hospital': AppColors.statusCancelled,
      'clinic': AppColors.accent,
      'pharmacy': AppColors.statusApproved,
      'polyclinic': AppColors.statusPending,
    };
    final color = typeColors[org.orgType?.toLowerCase()] ?? AppColors.primary;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 5),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.divider),
      ),
      child: Row(
        children: [
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(
              Icons.local_hospital_rounded,
              color: color,
              size: 26,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  org.name,
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: color.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        org.displayType,
                        style: GoogleFonts.inter(
                          fontSize: 10,
                          color: color,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
                if (org.address != null || org.regionName != null) ...[
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(
                        Icons.location_on_outlined,
                        size: 12,
                        color: AppColors.textHint,
                      ),
                      const SizedBox(width: 3),
                      Expanded(
                        child: Text(
                          [org.regionName, org.address]
                              .where((e) => e != null && e.isNotEmpty)
                              .join(', '),
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            color: AppColors.textSecondary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
          const Icon(
            Icons.chevron_right_rounded,
            color: AppColors.textHint,
            size: 20,
          ),
        ],
      ),
    );
  }
}
