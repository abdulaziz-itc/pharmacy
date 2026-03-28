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
                      color: AppColors.statusPending.withValues(alpha: 0.2),
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
                      color: AppColors.statusApproved.withValues(alpha: 0.2),
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
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
        border: Border.all(
          color: isPending ? AppColors.divider : AppColors.statusApproved.withValues(alpha: 0.2),
        ),
      ),
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
                  color: (visit.isCompleted ? AppColors.statusApproved : AppColors.primary).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  visit.doctor != null ? Icons.person_rounded : Icons.business_rounded,
                  color: visit.isCompleted ? AppColors.statusApproved : AppColors.primary,
                  size: 24,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      visit.doctor?.fullName ?? visit.subject ?? 'Nomsiz tashrif',
                      style: GoogleFonts.inter(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      visit.displayVisitType,
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
              if (isPending)
                _buildVisitActions(visit),
            ],
          ),
          if (visit.notes != null && visit.notes!.isNotEmpty) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppColors.background,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  const Icon(Icons.sticky_note_2_outlined, size: 14, color: AppColors.textHint),
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
    );
  }

  Widget _buildVisitActions(VisitPlanModel visit) {
    return PopupMenuButton<String>(
      onSelected: (value) async {
        if (value == 'complete') {
          final success = await ref.read(visitsProvider.notifier).completeVisit(visit.id);
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(success ? 'Tashrif bajarildi!' : 'Xatolik yuz berdi'),
                backgroundColor: success ? AppColors.statusApproved : AppColors.error,
              ),
            );
          }
        } else if (value == 'delete') {
          await ref.read(visitsProvider.notifier).deleteVisit(visit.id);
        }
      },
      itemBuilder: (context) => [
        const PopupMenuItem(
          value: 'complete',
          child: Row(
            children: [
              Icon(Icons.check_circle_outline, size: 18, color: AppColors.statusApproved),
              SizedBox(width: 8),
              Text('Bajarildi'),
            ],
          ),
        ),
        const PopupMenuItem(
          value: 'delete',
          child: Row(
            children: [
              Icon(Icons.delete_outline, size: 18, color: AppColors.error),
              SizedBox(width: 8),
              Text('O\'chirish'),
            ],
          ),
        ),
      ],
      offset: const Offset(0, 40),
      child: const Icon(Icons.more_vert_rounded, color: AppColors.textHint, size: 20),
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
