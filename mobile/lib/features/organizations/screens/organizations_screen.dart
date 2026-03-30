import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/l10n/l10n.dart';
import '../../../shared/models/med_org_model.dart';
import '../../../shared/widgets/empty_view.dart';
import '../../../shared/widgets/error_view.dart';
import '../../../shared/widgets/loading_shimmer.dart';
import '../../../shared/widgets/notification_action.dart';
import '../../../shared/providers/ui_provider.dart';
import '../providers/organizations_provider.dart';

class OrganizationsScreen extends ConsumerStatefulWidget {
  const OrganizationsScreen({super.key});

  @override
  ConsumerState<OrganizationsScreen> createState() => _OrganizationsScreenState();
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
    final l10n = context.l10n;
    final isEmbedded = ref.watch(isEmbeddedProvider);

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        appBar: isEmbedded ? null : AppBar(
          title: Text(l10n.organizations),
          actions: const [NotificationAction()],
          bottom: PreferredSize(
            preferredSize: const Size.fromHeight(50),
            child: _buildOrgTabs(l10n),
          ),
        ),
        body: Flex(
          direction: Axis.vertical,
          children: <Widget>[
            if (isEmbedded) _buildOrgTabs(l10n),
            Container(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
              child: TextField(
                controller: _searchController,
                decoration: InputDecoration(
                  hintText: '${l10n.get('search_organization') ?? 'Поиск организации'}...',
                  prefixIcon: const Icon(Icons.search_rounded),
                ),
                onChanged: (value) {
                  setState(() {});
                  ref.read(organizationsProvider.notifier).search(value);
                },
              ),
            ),
            Expanded(
              child: TabBarView(
                children: <Widget>[
                  _buildContent(state, filteredOrgs.where((o) => o.orgType?.toLowerCase() != 'pharmacy' && o.orgType?.toLowerCase() != 'wholesale').toList(), l10n),
                  _buildContent(state, filteredOrgs.where((o) => o.orgType?.toLowerCase() == 'pharmacy' || o.orgType?.toLowerCase() == 'wholesale').toList(), l10n),
                ],
              ),
            ),
          ],
        ),
        floatingActionButton: isEmbedded ? null : FloatingActionButton(
          heroTag: 'orgs_fab',
          onPressed: () => context.push('/organizations/create'),
          child: const Icon(Icons.add, size: 28),
        ),
      ),
    );
  }

  Widget _buildOrgTabs(S l10n) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      height: 40,
      decoration: BoxDecoration(
        color: AppColors.divider.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: TabBar(
        indicatorPadding: const EdgeInsets.all(3),
        indicator: BoxDecoration(
          color: Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(9),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 4, offset: const Offset(0, 2))],
        ),
        labelColor: AppColors.accent,
        unselectedLabelColor: AppColors.textSecondary,
        labelStyle: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600),
        dividerColor: Colors.transparent,
        tabs: [
          Tab(text: l10n.get('hospitals') ?? 'Больницы'),
          Tab(text: l10n.get('pharmacies') ?? 'Аптеки'),
        ],
      ),
    );
  }

  Widget _buildContent(OrganizationsState state, List<MedOrgModel> orgs, S l10n) {
    if (state.status == OrgsLoadStatus.loading) return const ShimmerList(count: 6);
    if (state.status == OrgsLoadStatus.error) return ErrorView(message: state.errorMessage ?? l10n.error, onRetry: () => ref.read(organizationsProvider.notifier).loadOrganizations());
    if (orgs.isEmpty) return EmptyView(title: l10n.get('nothing_found') ?? 'Ничего не найдено', icon: Icons.business_rounded);

    return RefreshIndicator(
      onRefresh: () => ref.read(organizationsProvider.notifier).loadOrganizations(),
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(vertical: 8),
        itemCount: orgs.length,
        itemBuilder: (context, index) => _buildOrgCard(orgs[index]),
      ),
    );
  }

  Widget _buildOrgCard(MedOrgModel org) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      child: ListTile(
        onTap: () => context.push('/organizations/${org.id}'),
        leading: CircleAvatar(
          backgroundColor: AppColors.primary.withValues(alpha: 0.1),
          child: Icon(org.orgType?.toLowerCase() == 'pharmacy' ? Icons.local_pharmacy_rounded : Icons.local_hospital_rounded, color: AppColors.primary, size: 20),
        ),
        title: Text(org.name, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600)),
        subtitle: Text(org.displayType, style: GoogleFonts.inter(fontSize: 12)),
        trailing: const Icon(Icons.chevron_right_rounded, size: 20),
      ),
    );
  }
}
