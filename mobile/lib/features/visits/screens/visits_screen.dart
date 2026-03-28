import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
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

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Tashriflar'),
        backgroundColor: AppColors.surface,
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppColors.primary,
          unselectedLabelColor: AppColors.textSecondary,
          indicatorColor: AppColors.primary,
          labelStyle: GoogleFonts.inter(
            fontSize: 13,
            fontWeight: FontWeight.w600,
          ),
          tabs: [
            Tab(
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text('Rejalangan'),
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 6, vertical: 1),
                    decoration: BoxDecoration(
                      color: AppColors.statusPending.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      '${state.pendingVisits.length}',
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: AppColors.statusPending,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Tab(
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text('Bajarilgan'),
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 6, vertical: 1),
                    decoration: BoxDecoration(
                      color: AppColors.statusApproved.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      '${state.completedVisits.length}',
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: AppColors.statusApproved,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.push('/visits/create'),
        child: const Icon(Icons.add_rounded),
      ),
      body: _buildContent(state),
    );
  }

  Widget _buildContent(VisitsState state) {
    if (state.status == VisitsLoadStatus.loading) {
      return const ShimmerList(count: 5);
    }

    if (state.status == VisitsLoadStatus.error && state.visits.isEmpty) {
      return ErrorView(
        message: state.errorMessage ?? 'Xatolik',
        onRetry: () => ref.read(visitsProvider.notifier).loadVisits(),
        fullScreen: true,
      );
    }

    return TabBarView(
      controller: _tabController,
      children: [
        _buildVisitsList(state.pendingVisits, isPending: true),
        _buildVisitsList(state.completedVisits, isPending: false),
      ],
    );
  }

  Widget _buildVisitsList(List<VisitPlanModel> visits,
      {required bool isPending}) {
    if (visits.isEmpty) {
      return EmptyView(
        title: isPending
            ? 'Rejalangan tashriflar yo\'q'
            : 'Bajarilgan tashriflar yo\'q',
        subtitle:
            isPending ? 'Yangi tashrif qo\'shing' : '',
        icon: Icons.calendar_today_outlined,
        onAction: isPending
            ? () => context.push('/visits/create')
            : null,
        actionLabel: isPending ? 'Tashrif qo\'shish' : null,
      );
    }

    return RefreshIndicator(
      onRefresh: () => ref.read(visitsProvider.notifier).loadVisits(),
      color: AppColors.primary,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(vertical: 8),
        itemCount: visits.length,
        itemBuilder: (context, index) =>
            _buildVisitCard(visits[index], isPending: isPending),
      ),
    );
  }

  Widget _buildVisitCard(VisitPlanModel visit, {required bool isPending}) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 5),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isPending
              ? AppColors.divider
              : AppColors.statusApproved.withOpacity(0.3),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: isPending
                      ? AppColors.statusPending.withOpacity(0.1)
                      : AppColors.statusApproved.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  isPending
                      ? Icons.schedule_rounded
                      : Icons.check_circle_rounded,
                  color: isPending
                      ? AppColors.statusPending
                      : AppColors.statusApproved,
                  size: 22,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      visit.doctor?.fullName ?? 'Shifokor ko\'rsatilmagan',
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      visit.displayVisitType,
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        color: AppColors.accent,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
              if (isPending)
                PopupMenuButton<String>(
                  onSelected: (value) async {
                    if (value == 'complete') {
                      final success = await ref
                          .read(visitsProvider.notifier)
                          .completeVisit(visit.id);
                      if (mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(success
                                ? 'Tashrif bajarildi!'
                                : 'Xatolik yuz berdi'),
                            backgroundColor: success
                                ? AppColors.statusApproved
                                : AppColors.error,
                          ),
                        );
                      }
                    } else if (value == 'delete') {
                      await ref
                          .read(visitsProvider.notifier)
                          .deleteVisit(visit.id);
                    }
                  },
                  itemBuilder: (context) => [
                    const PopupMenuItem(
                      value: 'complete',
                      child: Row(
                        children: [
                          Icon(Icons.check_circle_outline, size: 18,
                              color: AppColors.statusApproved),
                          SizedBox(width: 8),
                          Text('Bajarildi deb belgilash'),
                        ],
                      ),
                    ),
                    const PopupMenuItem(
                      value: 'delete',
                      child: Row(
                        children: [
                          Icon(Icons.delete_outline, size: 18,
                              color: AppColors.error),
                          SizedBox(width: 8),
                          Text('O\'chirish'),
                        ],
                      ),
                    ),
                  ],
                  icon: const Icon(
                    Icons.more_vert_rounded,
                    color: AppColors.textHint,
                  ),
                ),
            ],
          ),
          const SizedBox(height: 10),
          const Divider(height: 1),
          const SizedBox(height: 10),
          Row(
            children: [
              _buildChip(
                Icons.calendar_today_rounded,
                visit.plannedDate,
              ),
              if (visit.subject != null) ...[
                const SizedBox(width: 8),
                Expanded(
                  child: _buildChip(
                    Icons.subject_rounded,
                    visit.subject!,
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
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
