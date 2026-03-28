import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/models/bonus_model.dart';
import '../../../shared/widgets/error_view.dart';
import '../../../shared/widgets/loading_shimmer.dart';
import '../providers/bonus_provider.dart';

class BonusScreen extends ConsumerStatefulWidget {
  const BonusScreen({super.key});

  @override
  ConsumerState<BonusScreen> createState() => _BonusScreenState();
}

class _BonusScreenState extends ConsumerState<BonusScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(bonusProvider.notifier).loadBonusBalance();
    });
  }

  String _formatAmount(double amount) {
    return NumberFormat('#,##0', 'en_US').format(amount);
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(bonusProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Bonus & Balans'),
        backgroundColor: AppColors.surface,
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.read(bonusProvider.notifier).loadBonusBalance(),
        color: AppColors.primary,
        child: _buildContent(state),
      ),
    );
  }

  Widget _buildContent(BonusState state) {
    if (state.status == BonusLoadStatus.loading) {
      return const SingleChildScrollView(
        child: Column(
          children: [
            SizedBox(height: 16),
            ShimmerDashboard(),
          ],
        ),
      );
    }

    if (state.status == BonusLoadStatus.error) {
      return ErrorView(
        message: state.errorMessage ?? 'Xatolik',
        onRetry: () => ref.read(bonusProvider.notifier).loadBonusBalance(),
        fullScreen: true,
      );
    }

    if (state.bonusBalance == null) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.primary),
      );
    }

    final bonus = state.bonusBalance!;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Balance hero card
        Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xFF7C3AED), Color(0xFF4F46E5)],
            ),
            borderRadius: BorderRadius.circular(24),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF7C3AED).withOpacity(0.3),
                blurRadius: 20,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Column(
            children: [
              const Icon(
                Icons.account_balance_wallet_rounded,
                color: Colors.white,
                size: 36,
              ),
              const SizedBox(height: 12),
              Text(
                'Joriy balans',
                style: GoogleFonts.inter(
                  fontSize: 14,
                  color: Colors.white.withOpacity(0.8),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                '${_formatAmount(bonus.balance)} so\'m',
                style: GoogleFonts.poppins(
                  fontSize: 32,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    child: _buildBalanceStat(
                      'Jami hisoblandi',
                      '${_formatAmount(bonus.totalAccrued)} so\'m',
                      Icons.trending_up_rounded,
                    ),
                  ),
                  Container(
                    width: 1,
                    height: 40,
                    color: Colors.white.withOpacity(0.3),
                  ),
                  Expanded(
                    child: _buildBalanceStat(
                      'Jami to\'landi',
                      '${_formatAmount(bonus.totalPaid)} so\'m',
                      Icons.trending_down_rounded,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        // Pie chart
        if (bonus.totalAccrued > 0) ...[
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.divider),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Bonus taqsimoti',
                  style: GoogleFonts.poppins(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    SizedBox(
                      height: 120,
                      width: 120,
                      child: PieChart(
                        PieChartData(
                          sections: [
                            PieChartSectionData(
                              color: AppColors.statusApproved,
                              value: bonus.totalPaid,
                              title: '',
                              radius: 45,
                            ),
                            PieChartSectionData(
                              color: AppColors.accent,
                              value: bonus.balance,
                              title: '',
                              radius: 45,
                            ),
                          ],
                          centerSpaceRadius: 20,
                          sectionsSpace: 2,
                        ),
                      ),
                    ),
                    const SizedBox(width: 20),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildLegendItem(
                            'To\'langan',
                            AppColors.statusApproved,
                            '${_formatAmount(bonus.totalPaid)} so\'m',
                          ),
                          const SizedBox(height: 12),
                          _buildLegendItem(
                            'Qolgan balans',
                            AppColors.accent,
                            '${_formatAmount(bonus.balance)} so\'m',
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
        ],
        // History
        if (bonus.history.isNotEmpty) ...[
          Text(
            'Tarix',
            style: GoogleFonts.poppins(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 12),
          Container(
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.divider),
            ),
            child: ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: bonus.history.length,
              separatorBuilder: (_, __) =>
                  const Divider(height: 1, indent: 16, endIndent: 16),
              itemBuilder: (context, index) {
                final item = bonus.history[index];
                return _buildHistoryItem(item);
              },
            ),
          ),
        ],
        const SizedBox(height: 24),
      ],
    );
  }

  Widget _buildBalanceStat(String label, String value, IconData icon) {
    return Column(
      children: [
        Icon(icon, color: Colors.white, size: 18),
        const SizedBox(height: 4),
        Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 10,
            color: Colors.white.withOpacity(0.7),
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: GoogleFonts.inter(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: Colors.white,
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }

  Widget _buildLegendItem(String label, Color color, String value) {
    return Row(
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: GoogleFonts.inter(
                  fontSize: 12,
                  color: AppColors.textSecondary,
                ),
              ),
              Text(
                value,
                style: GoogleFonts.inter(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildHistoryItem(BonusHistoryItem item) {
    final isAccrual = item.isAccrual;
    return ListTile(
      leading: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: (isAccrual ? AppColors.statusApproved : AppColors.statusCancelled)
              .withOpacity(0.1),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(
          isAccrual
              ? Icons.arrow_downward_rounded
              : Icons.arrow_upward_rounded,
          color: isAccrual ? AppColors.statusApproved : AppColors.statusCancelled,
          size: 20,
        ),
      ),
      title: Text(
        item.displayType,
        style: GoogleFonts.inter(
          fontSize: 13,
          fontWeight: FontWeight.w600,
          color: AppColors.textPrimary,
        ),
      ),
      subtitle: Text(
        item.description ?? item.date,
        style: GoogleFonts.inter(
          fontSize: 12,
          color: AppColors.textSecondary,
        ),
      ),
      trailing: Text(
        '${isAccrual ? '+' : '-'}${_formatAmount(item.amount.abs())} so\'m',
        style: GoogleFonts.inter(
          fontSize: 13,
          fontWeight: FontWeight.w600,
          color: isAccrual ? AppColors.statusApproved : AppColors.statusCancelled,
        ),
      ),
    );
  }
}
