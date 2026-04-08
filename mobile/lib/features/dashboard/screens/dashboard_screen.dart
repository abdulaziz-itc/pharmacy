import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/l10n/l10n.dart';
import '../../../features/auth/providers/auth_provider.dart';
import '../../../shared/models/dashboard_model.dart';
import '../../../shared/widgets/error_view.dart';
import '../../../shared/widgets/loading_shimmer.dart';
import '../../../shared/widgets/notification_action.dart';
import '../providers/dashboard_provider.dart';
import '../../main/providers/main_provider.dart';
import '../../../core/utils/currency_formatter.dart';

class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(dashboardProvider.notifier).loadStats();
    });
  }

  String _formatAmount(double amount) {
    return CurrencyFormatter.format(amount);
  }

  String _getMonthName(int month, S l10n) {
    switch (month) {
      case 1: return l10n.january;
      case 2: return l10n.february;
      case 3: return l10n.march;
      case 4: return l10n.april;
      case 5: return l10n.may;
      case 6: return l10n.june;
      case 7: return l10n.july;
      case 8: return l10n.august;
      case 9: return l10n.september;
      case 10: return l10n.october;
      case 11: return l10n.november;
      case 12: return l10n.december;
      default: return '';
    }
  }

  void _showFilterPicker(BuildContext context, WidgetRef ref, DashboardState state, S l10n) {
    int tempYear = state.selectedYear;
    int tempMonth = state.selectedMonth;

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => Container(
          height: MediaQuery.of(context).size.height * 0.7,
          decoration: BoxDecoration(color: Theme.of(context).scaffoldBackgroundColor, borderRadius: const BorderRadius.vertical(top: Radius.circular(30))),
          child: Column(
            children: [
              const SizedBox(height: 12),
              Container(width: 40, height: 4, decoration: BoxDecoration(color: AppColors.divider, borderRadius: BorderRadius.circular(2))),
              Padding(
                padding: const EdgeInsets.all(24),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(l10n.selectPeriod, style: GoogleFonts.poppins(fontSize: 20, fontWeight: FontWeight.bold)),
                    IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close_rounded, color: AppColors.textHint)),
                  ],
                ),
              ),
              Expanded(
                child: Row(
                  children: [
                    Expanded(
                      child: ListWheelScrollView.useDelegate(
                        itemExtent: 50, physics: const FixedExtentScrollPhysics(),
                        onSelectedItemChanged: (index) => setModalState(() => tempYear = 2023 + index),
                        childDelegate: ListWheelChildBuilderDelegate(
                          childCount: 10,
                          builder: (context, index) {
                            final year = 2023 + index;
                            final isSelected = year == tempYear;
                            return Center(child: Text(year.toString(), style: GoogleFonts.poppins(fontSize: isSelected ? 22 : 18, fontWeight: isSelected ? FontWeight.bold : FontWeight.normal, color: isSelected ? AppColors.accent : AppColors.textHint)));
                          },
                        ),
                      ),
                    ),
                    Expanded(
                      flex: 2,
                      child: ListWheelScrollView.useDelegate(
                        itemExtent: 50, physics: const FixedExtentScrollPhysics(),
                        onSelectedItemChanged: (index) => setModalState(() => tempMonth = index + 1),
                        childDelegate: ListWheelChildBuilderDelegate(
                          childCount: 12,
                          builder: (context, index) {
                            final month = index + 1;
                            final isSelected = month == tempMonth;
                            return Center(child: Text(_getMonthName(month, l10n), style: GoogleFonts.poppins(fontSize: isSelected ? 20 : 16, fontWeight: isSelected ? FontWeight.bold : FontWeight.normal, color: isSelected ? AppColors.accent : AppColors.textHint)));
                          },
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(24),
                child: SizedBox(
                  width: double.infinity, height: 56,
                  child: ElevatedButton(
                    onPressed: () {
                      ref.read(dashboardProvider.notifier).updateFilter(tempYear, tempMonth);
                      Navigator.pop(context);
                    },
                    child: Text(l10n.apply),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final dashboardState = ref.watch(dashboardProvider);
    final l10n = context.l10n;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text(l10n.reports),
        centerTitle: false,
        actions: [
          const NotificationAction(),
          IconButton(
            onPressed: () => _showFilterPicker(context, ref, dashboardState, l10n),
            icon: const Icon(Icons.calendar_month_rounded, color: AppColors.accent),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.read(dashboardProvider.notifier).refresh(),
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            if (dashboardState.status == DashboardLoadStatus.loading) const SliverToBoxAdapter(child: ShimmerDashboard())
            else if (dashboardState.status == DashboardLoadStatus.error)
              SliverToBoxAdapter(child: ErrorView(message: dashboardState.errorMessage ?? l10n.error, onRetry: () => ref.read(dashboardProvider.notifier).loadStats()))
            else if (dashboardState.stats != null) SliverToBoxAdapter(child: _buildDashboardContent(dashboardState.stats!, dashboardState, l10n))
            else const SliverToBoxAdapter(child: ShimmerDashboard()),
          ],
        ),
      ),
    );
  }

  Widget _buildDashboardContent(DashboardStatsModel stats, DashboardState state, S l10n) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildHeroCard(stats, state, l10n),
          const SizedBox(height: 24),
          Text(l10n.indicators, style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.w600)),
          const SizedBox(height: 14),
          GridView.count(
            shrinkWrap: true, padding: EdgeInsets.zero, physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: 2, crossAxisSpacing: 12, mainAxisSpacing: 12, childAspectRatio: 1.4,
            children: [
              _buildStatCard(l10n.activeDoctors, stats.activeDoctors.toString(), Icons.people_alt_rounded, const Color(0xFF6366F1), onTap: () => ref.read(mainScreenTabIndexProvider.notifier).state = 1),
              _buildStatCard(l10n.pendingReservations, stats.pendingReservations.toString(), Icons.receipt_long_rounded, const Color(0xFFF59E0B), onTap: () => context.push('/reservations?year=${state.selectedYear}&month=${state.selectedMonth}')),
              _buildStatCard(l10n.totalDebt, _formatAmount(stats.totalDebt), Icons.account_balance_wallet_rounded, const Color(0xFFEF4444), 
                onTap: () => context.push('/invoices?showDebts=true&year=${state.selectedYear}&month=${state.selectedMonth}'),
                subValue: stats.totalOverdueDebt > 0 ? _formatAmount(stats.totalOverdueDebt) : null,
                subLabel: l10n.ofWhichOverdue,
              ),
              _buildStatCard(l10n.completedVisits, stats.completedVisits.toString(), Icons.check_circle_outline_rounded, AppColors.success, onTap: () => ref.read(mainScreenTabIndexProvider.notifier).state = 2),
            ],
          ),
          const SizedBox(height: 24),
          if (stats.revenueForecast.isNotEmpty) ...[
            Text(l10n.revenueForecast, style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.w600)),
            const SizedBox(height: 14),
            _buildRevenueChart(stats.revenueForecast),
          ],
          const SizedBox(height: 24),
          _buildVisitProgress(stats, l10n),
          const SizedBox(height: 30),
        ],
      ),
    );
  }

  Widget _buildHeroCard(DashboardStatsModel stats, DashboardState state, S l10n) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(gradient: AppColors.primaryGradient, borderRadius: BorderRadius.circular(24), boxShadow: [BoxShadow(color: AppColors.primary.withValues(alpha: 0.2), blurRadius: 20, offset: const Offset(0, 10))]),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(l10n.totalSales, style: GoogleFonts.inter(fontSize: 12, color: Colors.white70, fontWeight: FontWeight.w500)),
              Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4), decoration: BoxDecoration(color: Colors.white12, borderRadius: BorderRadius.circular(20)), child: Text('${_getMonthName(state.selectedMonth, l10n)} ${state.selectedYear}', style: GoogleFonts.inter(fontSize: 10, color: Colors.white, fontWeight: FontWeight.w600))),
            ],
          ),
          const SizedBox(height: 10),
          Text('${_formatAmount(stats.totalSales)} сум', style: GoogleFonts.poppins(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.white)),
          const Padding(padding: EdgeInsets.symmetric(vertical: 20), child: Divider(color: Colors.white12, height: 1)),
          Row(
            children: [
              GestureDetector(onTap: () => context.push('/bonus'), child: _buildHeroStat(l10n.bonusBalance, '${_formatAmount(stats.bonusBalance)} сум', Icons.stars_rounded)),
              const SizedBox(width: 30),
              _buildHeroStat(l10n.plannedVisits, '${stats.plannedVisits}', Icons.calendar_today_rounded),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildHeroStat(String label, String value, IconData icon) {
    return Row(
      children: [
        Icon(icon, color: Colors.white70, size: 18),
        const SizedBox(width: 10),
        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: GoogleFonts.inter(fontSize: 10, color: Colors.white60)),
          Text(value, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.white)),
        ]),
      ],
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon, Color color, {VoidCallback? onTap, String? subValue, String? subLabel}) {
    return GestureDetector(
      onTap: onTap,
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(padding: const EdgeInsets.all(6), decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)), child: Icon(icon, color: color, size: 18)),
                  if (subValue != null) 
                    Container(
                      padding: const EdgeInsets.all(4),
                      decoration: const BoxDecoration(color: Color(0xFFFFF1F2), shape: BoxShape.circle),
                      child: const Icon(Icons.priority_high_rounded, color: Color(0xFFE11D48), size: 10),
                    ),
                ],
              ),
              const Spacer(),
              Text(value, style: GoogleFonts.poppins(fontSize: 15, fontWeight: FontWeight.bold), maxLines: 1, overflow: TextOverflow.ellipsis),
              const SizedBox(height: 2),
              Text(title, style: GoogleFonts.inter(fontSize: 10, color: AppColors.textSecondary), maxLines: 1, overflow: TextOverflow.ellipsis),
              if (subValue != null) ...[
                const SizedBox(height: 6),
                const Divider(height: 1, thickness: 0.5),
                const SizedBox(height: 6),
                Text(subValue, style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.bold, color: const Color(0xFFE11D48))),
                Text(subLabel ?? '', style: GoogleFonts.inter(fontSize: 8, color: AppColors.textHint), maxLines: 1),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRevenueChart(List<RevenueForecastPoint> data) {
    return Container(
      padding: const EdgeInsets.fromLTRB(10, 24, 20, 16),
      decoration: BoxDecoration(color: Theme.of(context).cardColor, borderRadius: BorderRadius.circular(20), border: Border.all(color: AppColors.divider.withValues(alpha: 0.5))),
      child: AspectRatio(
        aspectRatio: 1.7,
        child: LineChart(
          LineChartData(
            gridData: const FlGridData(show: true, drawVerticalLine: false),
            titlesData: FlTitlesData(
              show: true, rightTitles: const AxisTitles(), topTitles: const AxisTitles(),
              bottomTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, getTitlesWidget: (val, meta) => indexToLabel(val.toInt(), data))),
              leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, reservedSize: 40, getTitlesWidget: (val, meta) => Text(_formatAmount(val), style: GoogleFonts.inter(fontSize: 9)))),
            ),
            borderData: FlBorderData(show: false),
            lineBarsData: [LineChartBarData(spots: data.asMap().entries.map((e) => FlSpot(e.key.toDouble(), e.value.value)).toList(), isCurved: true, color: AppColors.accent, barWidth: 3, belowBarData: BarAreaData(show: true, color: AppColors.accent.withValues(alpha: 0.1)))],
          ),
        ),
      ),
    );
  }
  
  Widget indexToLabel(int index, List<RevenueForecastPoint> data) {
    if (index < 0 || index >= data.length) return const Text('');
    return Padding(padding: const EdgeInsets.only(top: 8), child: Text(data[index].label, style: GoogleFonts.inter(fontSize: 9)));
  }

  Widget _buildVisitProgress(DashboardStatsModel stats, S l10n) {
    final progress = stats.plannedVisits > 0 ? stats.completedVisits / stats.plannedVisits : 0.0;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(color: Theme.of(context).cardColor, borderRadius: BorderRadius.circular(20), border: Border.all(color: AppColors.divider.withValues(alpha: 0.5))),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(l10n.visitCompletion, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600)),
              Text('${stats.completedVisits} / ${stats.plannedVisits}', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.accent)),
            ],
          ),
          const SizedBox(height: 16),
          ClipRRect(borderRadius: BorderRadius.circular(10), child: LinearProgressIndicator(value: progress.clamp(0, 1), backgroundColor: AppColors.divider.withValues(alpha: 0.3), color: AppColors.success, minHeight: 10)),
          const SizedBox(height: 10),
          Text('${(progress * 100).toStringAsFixed(0)}% ${l10n.completed}', style: GoogleFonts.inter(fontSize: 12, color: AppColors.textSecondary)),
        ],
      ),
    );
  }
}
