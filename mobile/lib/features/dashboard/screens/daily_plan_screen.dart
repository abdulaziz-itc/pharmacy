import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/empty_view.dart';
import '../../../core/l10n/l10n.dart';
import '../../../shared/widgets/loading_shimmer.dart';
import '../../../shared/widgets/notification_action.dart';
import '../../visits/providers/visits_provider.dart';
import '../../visits/screens/create_visit_screen.dart';
import '../../../shared/widgets/weekly_calendar.dart';
import 'sales_plans_screen.dart';

class DailyPlanScreen extends ConsumerStatefulWidget {
  const DailyPlanScreen({super.key});

  @override
  ConsumerState<DailyPlanScreen> createState() => _DailyPlanScreenState();
}

class _DailyPlanScreenState extends ConsumerState<DailyPlanScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  DateTime _selectedDate = DateTime.now();

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
    final l10n = context.l10n;
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        appBar: AppBar(
          elevation: 0,
          title: Text(l10n.plan),
          actions: const [NotificationAction()],
          bottom: TabBar(
            indicatorColor: const Color(0xFFFBBF24),
            labelColor: const Color(0xFFFBBF24),
            unselectedLabelColor: AppColors.textSecondary,
            labelStyle: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 13),
            indicatorSize: TabBarIndicatorSize.tab,
            tabs: [
              Tab(text: l10n.translate('visits') ?? 'Визиты'),
              Tab(text: l10n.translate('sales') ?? 'Продажи'),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            _buildDailyVisitsSection(l10n),
            const SalesPlansScreen(),
          ],
        ),
        floatingActionButton: Builder(
          builder: (context) {
            final tabController = DefaultTabController.of(context);
            return AnimatedBuilder(
              animation: tabController,
              builder: (context, child) {
                if (tabController.index != 0) return const SizedBox.shrink();
                return FloatingActionButton(
                  onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (context) => const CreateVisitScreen())),
                  backgroundColor: const Color(0xFFFBBF24),
                  child: const Icon(Icons.add, color: Colors.black, size: 30),
                );
              },
            );
          }
        ),
      ),
    );
  }

  Widget _buildDailyVisitsSection(S l10n) {
    final visitsState = ref.watch(visitsProvider);
    final selectedDateStr = DateFormat('yyyy-MM-dd').format(_selectedDate);
    final dayVisits = visitsState.visits.where((v) => v.plannedDate.startsWith(selectedDateStr)).toList();
    final doctorVisits = dayVisits.where((v) => v.doctor != null).toList();
    final orgVisits = dayVisits.where((v) => v.doctor == null).toList();

    return Flex(
      direction: Axis.vertical,
      children: <Widget>[
        WeeklyCalendar(selectedDate: _selectedDate, onDateSelected: (date) => setState(() => _selectedDate = date)),
        _buildTabs(l10n),
        Expanded(
          child: TabBarView(
            controller: _tabController,
            children: <Widget>[
              _buildVisitList(doctorVisits, l10n.doctors, l10n),
              _buildVisitList(orgVisits, l10n.organizations, l10n),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildTabs(S l10n) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      height: 44,
      decoration: BoxDecoration(color: AppColors.divider.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(14)),
      child: TabBar(
        controller: _tabController,
        indicatorPadding: const EdgeInsets.all(4),
        indicator: BoxDecoration(color: Theme.of(context).cardColor, borderRadius: BorderRadius.circular(10), boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 4, offset: const Offset(0, 2))]),
        labelColor: AppColors.accent,
        unselectedLabelColor: AppColors.textSecondary,
        labelStyle: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 13),
        dividerColor: Colors.transparent,
        tabs: [Tab(text: l10n.doctors), Tab(text: l10n.organizations)],
      ),
    );
  }

  Widget _buildVisitList(List<dynamic> visits, String type, S l10n) {
    if (visits.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.event_note_rounded, size: 64, color: AppColors.textHint.withValues(alpha: 0.3)),
            const SizedBox(height: 16),
            Text('${l10n.translate('no_visits_today') ?? 'На сегодня нет виizitov'} ($type)', style: GoogleFonts.inter(fontSize: 14, color: AppColors.textSecondary)),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      itemCount: visits.length,
      itemBuilder: (context, index) {
        final visit = visits[index];
        final isDoc = visit.doctor != null;
        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: ListTile(
            leading: Container(
              width: 44, height: 44,
              decoration: BoxDecoration(color: (visit.isCompleted ? AppColors.success : AppColors.primary).withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
              child: Icon(isDoc ? Icons.person_rounded : Icons.business_rounded, color: visit.isCompleted ? AppColors.success : AppColors.primary, size: 22),
            ),
            title: Text(isDoc ? visit.doctor!.fullName : (visit.subject ?? l10n.organizations), style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600)),
            subtitle: Text(visit.displayVisitType, style: GoogleFonts.inter(fontSize: 12)),
            trailing: visit.isCompleted ? const Icon(Icons.check_circle_rounded, color: AppColors.success, size: 20) : const Icon(Icons.chevron_right_rounded, size: 20),
          ),
        );
      },
    );
  }
}
