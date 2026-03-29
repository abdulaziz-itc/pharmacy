import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/theme/app_theme.dart';
import '../../../features/organizations/screens/organization_detail_screen.dart';
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

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(
          title: Text(
            'Организации',
            style: GoogleFonts.poppins(
              fontWeight: FontWeight.w600,
              fontSize: 20,
              color: AppColors.textPrimary,
            ),
          ),
          backgroundColor: AppColors.surface,
          elevation: 0,
          centerTitle: false,
          bottom: PreferredSize(
            preferredSize: const Size.fromHeight(50),
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              height: 40,
              decoration: BoxDecoration(
                color: AppColors.divider.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(12),
              ),
              child: TabBar(
                indicatorPadding: const EdgeInsets.all(3),
                indicator: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(9),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.05),
                      blurRadius: 4,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                labelColor: AppColors.primary,
                unselectedLabelColor: AppColors.textSecondary,
                labelStyle: GoogleFonts.inter(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
                dividerColor: Colors.transparent,
                tabs: const [
                  Tab(text: 'Больницы'),
                  Tab(text: 'Аптеки'),
                ],
              ),
            ),
          ),
        ),
        body: Column(
          children: [
            Container(
              color: AppColors.surface,
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
              child: TextField(
                controller: _searchController,
                style: GoogleFonts.inter(fontSize: 14),
                decoration: InputDecoration(
                  hintText: 'Поиск организации...',
                  hintStyle: GoogleFonts.inter(color: AppColors.textHint, fontSize: 14),
                  prefixIcon: const Icon(
                    Icons.search_rounded,
                    color: AppColors.textHint,
                    size: 20,
                  ),
                  suffixIcon: _searchController.text.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear_rounded, size: 18),
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
                    borderRadius: BorderRadius.circular(14),
                    borderSide: BorderSide.none,
                  ),
                  filled: true,
                  fillColor: AppColors.background,
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 10,
                  ),
                ),
                onChanged: (value) {
                  setState(() {});
                  ref.read(organizationsProvider.notifier).search(value);
                },
              ),
            ),
            Expanded(
              child: TabBarView(
                children: [
                  _buildContent(
                    state,
                    filteredOrgs.where((o) => 
                      o.orgType?.toLowerCase() != 'pharmacy' && 
                      o.orgType?.toLowerCase() != 'wholesale'
                    ).toList(),
                  ),
                  _buildContent(
                    state,
                    filteredOrgs.where((o) => 
                      o.orgType?.toLowerCase() == 'pharmacy' ||
                      o.orgType?.toLowerCase() == 'wholesale'
                    ).toList(),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContent(OrganizationsState state, List<MedOrgModel> orgs) {
    if (state.status == OrgsLoadStatus.loading) {
      return const ShimmerList(count: 6);
    }

    if (state.status == OrgsLoadStatus.error && orgs.isEmpty) {
      return ErrorView(
        message: state.errorMessage ?? 'Ошибка загрузки',
        onRetry: () =>
            ref.read(organizationsProvider.notifier).loadOrganizations(),
        fullScreen: true,
      );
    }

    if (orgs.isEmpty) {
      return const EmptyView(
        title: 'Организации не найдены',
        subtitle: 'Попробуйте изменить параметры поиска',
        icon: Icons.business_rounded,
      );
    }

    return RefreshIndicator(
      onRefresh: () =>
          ref.read(organizationsProvider.notifier).loadOrganizations(),
      color: AppColors.primary,
      backgroundColor: Colors.white,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(vertical: 8),
        physics: const AlwaysScrollableScrollPhysics(),
        itemCount: orgs.length,
        itemBuilder: (context, index) => _buildOrgCard(orgs[index]),
      ),
    );
  }

  Widget _buildOrgCard(MedOrgModel org) {
    final typeColors = {
      'hospital': const Color(0xFFEF4444), // Modern Red
      'clinic': const Color(0xFF8B5CF6),    // Modern Purple
      'pharmacy': const Color(0xFF10B981),  // Modern Emerald
      'polyclinic': const Color(0xFF3B82F6), // Modern Blue
      'wholesale': const Color(0xFFF59E0B),  // Modern Amber
    };
    final color = typeColors[org.orgType?.toLowerCase()] ?? AppColors.primary;

    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => OrganizationDetailScreen(orgId: org.id),
          ),
        );
      },
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppColors.divider.withValues(alpha: 0.5)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.03),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              width: 50,
              height: 50,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(
                org.orgType?.toLowerCase() == 'pharmacy' 
                    ? Icons.local_pharmacy_rounded 
                    : Icons.local_hospital_rounded,
                color: color,
                size: 24,
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
                    maxLines: 1,
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
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      if (org.address != null || org.regionName != null)
                        Expanded(
                          child: Row(
                            children: [
                              const Icon(
                                Icons.location_on_rounded,
                                size: 12,
                                color: AppColors.textHint,
                              ),
                              const SizedBox(width: 2),
                              Expanded(
                                child: Text(
                                  org.regionName ?? org.address ?? '',
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
                        ),
                    ],
                  ),
                ],
              ),
            ),
            const Icon(
              Icons.chevron_right_rounded,
              color: AppColors.textHint,
              size: 22,
            ),
          ],
        ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => GoRouter.of(context).push('/organizations/create'),
        backgroundColor: const Color(0xFF10B981),
        child: const Icon(Icons.add_rounded, color: Colors.white, size: 28),
      ),
    );
  }
}
