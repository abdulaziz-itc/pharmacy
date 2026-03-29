import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/empty_view.dart';
import '../../../shared/widgets/loading_shimmer.dart';
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
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(
          backgroundColor: AppColors.surface,
          elevation: 0,
          title: Text(
            'План',
            style: GoogleFonts.poppins(
              fontSize: 22,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
          bottom: TabBar(
            indicatorColor: const Color(0xFFFBBF24),
            labelColor: const Color(0xFFFBBF24),
            unselectedLabelColor: AppColors.textSecondary,
            labelStyle: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 13),
            indicatorSize: TabBarIndicatorSize.tab,
            tabs: const [
              Tab(text: 'Визиты'),
              Tab(text: 'Продажи'),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            _buildDailyVisitsSection(),
            const SalesPlansScreen(),
          ],
        ),
        floatingActionButton: Builder(
          builder: (context) {
            // Only show FAB on the first tab (Visits)
            final tabController = DefaultTabController.of(context);
            return AnimatedBuilder(
              animation: tabController,
              builder: (context, child) {
                if (tabController.index != 0) return const SizedBox.shrink();
                return FloatingActionButton(
                  onPressed: () => Navigator.push(
                    context,
                    MaterialPageRoute(builder: (context) => const CreateVisitScreen()),
                  ),
                  elevation: 4,
                  highlightElevation: 8,
                  backgroundColor: const Color(0xFFFBBF24), // Yellow FAB
                  child: const Icon(Icons.add, color: Colors.black, size: 30),
                );
              },
            );
          }
        ),
      ),
    );
  }

  Widget _buildDailyVisitsSection() {
    final visitsState = ref.watch(visitsProvider);
    
    // Filter visits by date and type
    final selectedDateStr = DateFormat('yyyy-MM-dd').format(_selectedDate);
    final dayVisits = visitsState.visits.where((v) => v.plannedDate.startsWith(selectedDateStr)).toList();
    
    final doctorVisits = dayVisits.where((v) => v.doctor != null).toList();
    final orgVisits = dayVisits.where((v) => v.doctor == null).toList();

    return Column(
      children: [
        WeeklyCalendar(
          selectedDate: _selectedDate,
          onDateSelected: (date) => setState(() => _selectedDate = date),
        ),
        _buildTabs(), // Inner tabs for Doctors/Orgs
        Expanded(
          child: TabBarView(
            controller: _tabController,
            children: [
              _buildVisitList(doctorVisits, 'Врачи'),
              _buildVisitList(orgVisits, 'Организации'),
            ],
          ),
        ),
      ],
    );
  }


  Widget _buildTabs() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      height: 44,
      decoration: BoxDecoration(
        color: AppColors.divider.withValues(alpha: 0.3),
        borderRadius: BorderRadius.circular(14),
      ),
      child: TabBar(
        controller: _tabController,
        indicatorPadding: const EdgeInsets.all(4),
        indicator: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(10),
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
        labelStyle: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 13),
        dividerColor: Colors.transparent,
        tabs: const [
          Tab(text: 'Врачи'),
          Tab(text: 'Организации'),
        ],
      ),
    );
  }

  Widget _buildVisitList(List<dynamic> visits, String type) {
    if (visits.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.event_note_rounded, size: 64, color: AppColors.textHint.withValues(alpha: 0.5)),
            const SizedBox(height: 16),
            Text(
              'На сегодня нет визитов ($type)',
              style: GoogleFonts.inter(
                fontSize: 14,
                color: AppColors.textSecondary,
                fontWeight: FontWeight.w400,
              ),
            ),
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
        
        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.divider),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.03),
                blurRadius: 8,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: (visit.isCompleted ? AppColors.statusApproved : AppColors.primary).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  isDoc ? Icons.person_rounded : Icons.business_rounded,
                  color: visit.isCompleted ? AppColors.statusApproved : AppColors.primary,
                  size: 22,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isDoc ? visit.doctor!.fullName : (visit.subject ?? 'Организация'),
                      style: GoogleFonts.inter(
                        fontSize: 14,
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
                      ),
                    ),
                  ],
                ),
              ),
              if (visit.isCompleted)
                const Icon(Icons.check_circle_rounded, color: AppColors.statusApproved, size: 20)
              else
                const Icon(Icons.chevron_right_rounded, color: AppColors.textHint, size: 20),
            ],
          ),
        );
      },
    );
  }
}
