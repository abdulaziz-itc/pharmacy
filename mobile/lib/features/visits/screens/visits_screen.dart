import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/models/visit_plan_model.dart';
import '../../../shared/widgets/empty_view.dart';
import '../../../shared/widgets/error_view.dart';
import '../../../shared/widgets/loading_shimmer.dart';
import '../providers/visits_provider.dart';

class VisitsScreen extends ConsumerStatefulWidget {
  const VisitsScreen({super.key});

  @override
  ConsumerState<VisitsScreen> createState() => _VisitsScreenState();
}

class _VisitsScreenState extends ConsumerState<VisitsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(visitsProvider.notifier).loadVisits();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(visitsProvider);
    final l10n = context.l10n;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text(l10n.visitsTitle),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(50),
          child: _buildTabBar(l10n, state),
        ),
      ),
      floatingActionButton: FloatingActionButton(
        heroTag: 'visits_fab',
        onPressed: () => context.push('/visits/create'),
        child: const Icon(Icons.add_rounded, size: 28),
      ),
      body: _buildContent(state, l10n),
    );
  }

  Widget _buildTabBar(S l10n, VisitsState state) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      height: 42,
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Theme.of(context).dividerColor),
      ),
      child: TabBar(
        controller: _tabController,
        indicatorSize: TabBarIndicatorSize.tab,
        indicatorPadding: const EdgeInsets.all(4),
        indicator: BoxDecoration(
          color: AppColors.primary,
          borderRadius: BorderRadius.circular(8),
          boxShadow: [
            BoxShadow(
              color: AppColors.primary.withValues(alpha: 0.3),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        labelColor: Colors.white,
        unselectedLabelColor: AppColors.textSecondary,
        labelStyle: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.bold),
        unselectedLabelStyle: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w500),
        dividerColor: Colors.transparent,
        tabs: [
          Tab(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(l10n.planned),
                const SizedBox(width: 8),
                _buildBadge(state.pendingVisits.length, AppColors.statusPending),
              ],
            ),
          ),
          Tab(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(l10n.completedStatus),
                const SizedBox(width: 8),
                _buildBadge(state.completedVisits.length, AppColors.statusApproved),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBadge(int count, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(
        '$count',
        style: GoogleFonts.inter(
          fontSize: 11,
          fontWeight: FontWeight.bold,
          color: color,
        ),
      ),
    );
  }

  Widget _buildContent(VisitsState state, S l10n) {
    if (state.status == VisitsLoadStatus.loading) {
      return const ShimmerList(count: 5);
    }

    if (state.status == VisitsLoadStatus.error) {
      return ErrorView(
        message: state.errorMessage ?? l10n.errorOccurred,
        onRetry: () => ref.read(visitsProvider.notifier).loadVisits(),
        fullScreen: true,
      );
    }

    return TabBarView(
      controller: _tabController,
      children: [
        _buildVisitsList(state.pendingVisits, l10n, isPending: true),
        _buildVisitsList(state.completedVisits, l10n, isPending: false),
      ],
    );
  }

  Widget _buildVisitsList(List<VisitPlanModel> visits, S l10n, {required bool isPending}) {
    if (visits.isEmpty) {
      return EmptyView(
        title: isPending ? l10n.noPlannedVisits : l10n.noCompletedVisits,
        subtitle: isPending ? l10n.addNewVisit : '',
        icon: Icons.calendar_today_outlined,
        onAction: isPending ? () => context.push('/visits/create') : null,
        actionLabel: isPending ? l10n.addVisit : null,
      );
    }

    return RefreshIndicator(
      onRefresh: () => ref.read(visitsProvider.notifier).loadVisits(),
      color: AppColors.primary,
      child: ListView.builder(
        padding: const EdgeInsets.only(top: 8, bottom: 24),
        itemCount: visits.length,
        itemBuilder: (context, index) => _buildVisitCard(visits[index], l10n, isPending: isPending),
      ),
    );
  }

  Widget _buildVisitCard(VisitPlanModel visit, S l10n, {required bool isPending}) {
    final statusColor = visit.isCompleted ? AppColors.statusApproved : AppColors.primary;
    
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Theme.of(context).dividerColor),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.2),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {}, // Detail view if exists
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: statusColor.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(
                        visit.doctor != null ? Icons.person_rounded : Icons.business_rounded,
                        color: statusColor,
                        size: 24,
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            visit.doctor?.fullName ?? visit.subject ?? l10n.unnamedVisit,
                            style: GoogleFonts.inter(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withValues(alpha: 0.05),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              visit.displayVisitType,
                              style: GoogleFonts.inter(
                                fontSize: 11,
                                color: AppColors.primary,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (isPending) _buildVisitActions(visit, l10n),
                  ],
                ),
                if (visit.notes != null && visit.notes!.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Theme.of(context).scaffoldBackgroundColor.withValues(alpha: 0.5),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: Theme.of(context).dividerColor.withValues(alpha: 0.5)),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.sticky_note_2_outlined, size: 14, color: AppColors.textHint),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            visit.notes!,
                            style: GoogleFonts.inter(fontSize: 12, color: AppColors.textSecondary),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildVisitActions(VisitPlanModel visit, S l10n) {
    return PopupMenuButton<String>(
      onSelected: (value) async {
        if (value == 'complete') {
          final success = await ref.read(visitsProvider.notifier).completeVisit(visit.id);
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(success ? l10n.visitCompletedMsg : l10n.errorOccurred),
                backgroundColor: success ? AppColors.statusApproved : AppColors.error,
              ),
            );
          }
        } else if (value == 'delete') {
          await ref.read(visitsProvider.notifier).deleteVisit(visit.id);
        }
      },
      itemBuilder: (context) => [
        PopupMenuItem(
          value: 'complete',
          child: Row(
            children: [
              const Icon(Icons.check_circle_outline, size: 18, color: AppColors.statusApproved),
              const SizedBox(width: 12),
              Text(l10n.completedStatus),
            ],
          ),
        ),
        PopupMenuItem(
          value: 'delete',
          child: Row(
            children: [
              const Icon(Icons.delete_outline, size: 18, color: AppColors.error),
              const SizedBox(width: 12),
              Text(l10n.delete),
            ],
          ),
        ),
      ],
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      offset: const Offset(0, 40),
      child: Icon(Icons.more_horiz_rounded, color: AppColors.textHint, size: 24),
    );
  }
}

  Widget _buildChip(IconData icon, String text) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 12, color: AppColors.textHint),
        const SizedBox(width: 4),
        Text(
          text,
          style: GoogleFonts.inter(
            fontSize: 11,
            color: AppColors.textSecondary,
          ),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
      ],
    );
  }
}
