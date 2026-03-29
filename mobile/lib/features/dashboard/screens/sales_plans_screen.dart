import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/models/doctor_model.dart';
import '../../../shared/widgets/error_view.dart';
import '../../../shared/widgets/loading_shimmer.dart';
import '../providers/sales_plans_provider.dart';

class SalesPlansScreen extends ConsumerStatefulWidget {
  const SalesPlansScreen({super.key});

  @override
  ConsumerState<SalesPlansScreen> createState() => _SalesPlansScreenState();
}

class _SalesPlansScreenState extends ConsumerState<SalesPlansScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(salesPlansProvider.notifier).loadPlans();
    });
  }

  String _getMonthName(int month) {
    const months = [
      'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    return months[month - 1];
  }

  void _showFilterPicker(BuildContext context, WidgetRef ref, SalesPlansState state) {
    int tempYear = state.selectedYear;
    int tempMonth = state.selectedMonth;

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => Container(
          height: MediaQuery.of(context).size.height * 0.6,
          decoration: const BoxDecoration(
            color: AppColors.background,
            borderRadius: BorderRadius.vertical(top: Radius.circular(30)),
          ),
          child: Column(
            children: [
              const SizedBox(height: 12),
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.divider,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(24),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Даврни танланг',
                      style: GoogleFonts.poppins(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.close_rounded),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: Row(
                  children: [
                    Expanded(
                      child: ListWheelScrollView.useDelegate(
                        itemExtent: 50,
                        physics: const FixedExtentScrollPhysics(),
                        onSelectedItemChanged: (index) {
                          setModalState(() {
                            tempYear = 2023 + index;
                          });
                        },
                        childDelegate: ListWheelChildBuilderDelegate(
                          childCount: 10,
                          builder: (context, index) {
                            final year = 2023 + index;
                            final isSelected = year == tempYear;
                            return Center(
                              child: Text(
                                year.toString(),
                                style: GoogleFonts.poppins(
                                  fontSize: isSelected ? 22 : 18,
                                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                  color: isSelected ? AppColors.primary : AppColors.textSecondary,
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                    ),
                    Expanded(
                      child: ListWheelScrollView.useDelegate(
                        itemExtent: 50,
                        physics: const FixedExtentScrollPhysics(),
                        onSelectedItemChanged: (index) {
                          setModalState(() {
                            tempMonth = index + 1;
                          });
                        },
                        childDelegate: ListWheelChildBuilderDelegate(
                          childCount: 12,
                          builder: (context, index) {
                            final month = index + 1;
                            final isSelected = month == tempMonth;
                            return Center(
                              child: Text(
                                _getMonthName(month),
                                style: GoogleFonts.poppins(
                                  fontSize: isSelected ? 20 : 16,
                                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                  color: isSelected ? AppColors.primary : AppColors.textSecondary,
                                ),
                              ),
                            );
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
                  width: double.infinity,
                  height: 56,
                  child: ElevatedButton(
                    onPressed: () {
                      ref.read(salesPlansProvider.notifier).updateFilter(tempYear, tempMonth);
                      Navigator.pop(context);
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                    child: Text(
                      'Применить',
                      style: GoogleFonts.inter(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
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
    final state = ref.watch(salesPlansProvider);

    return Scaffold(
      backgroundColor: Colors.transparent, // Handled by parent container
      body: Column(
        children: [
          _buildMonthHeader(state),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () => ref.read(salesPlansProvider.notifier).refresh(),
              color: AppColors.primary,
              child: _buildContent(state),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMonthHeader(SalesPlansState state) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 10, 20, 10),
      child: GestureDetector(
        onTap: () => _showFilterPicker(context, ref, state),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.divider.withValues(alpha: 0.5)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.02),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(Icons.calendar_month_rounded, color: AppColors.primary, size: 20),
                  const SizedBox(width: 12),
                  Text(
                    '${_getMonthName(state.selectedMonth)} ${state.selectedYear}',
                    style: GoogleFonts.inter(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ],
              ),
              const Icon(Icons.keyboard_arrow_down_rounded, color: AppColors.textHint),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildContent(SalesPlansState state) {
    if (state.status == SalesPlansStatus.loading) {
      return const Padding(
        padding: EdgeInsets.all(20),
        child: ShimmerDashboard(), // Reusing dashboard shimmer for generic loading
      );
    }

    if (state.status == SalesPlansStatus.error) {
      return ErrorView(
        message: state.errorMessage ?? 'Ошибки при загрузке данных',
        onRetry: () => ref.read(salesPlansProvider.notifier).loadPlans(),
      );
    }

    if (state.plans.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.assignment_turned_in_outlined, size: 64, color: AppColors.textHint.withValues(alpha: 0.3)),
            const SizedBox(height: 16),
            Text(
              'На этот месяц планов нет',
              style: GoogleFonts.inter(
                fontSize: 14,
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
      );
    }

    final grouped = state.groupedByProduct;
    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
      itemCount: grouped.length,
      itemBuilder: (context, index) {
        final productName = grouped.keys.elementAt(index);
        final productPlans = grouped[productName]!;
        
        // Calculate product totals
        int totalTarget = 0;
        int totalFact = 0;
        for (var p in productPlans) {
          totalTarget += p.targetQuantity;
          totalFact += p.factQuantity;
        }

        return _buildProductPlanCard(productName, totalTarget, totalFact, productPlans);
      },
    );
  }

  Widget _buildProductPlanCard(String name, int target, int fact, List<DoctorPlan> detailedPlans) {
    final percentage = target > 0 ? (fact / target) * 100 : 0.0;
    final color = percentage >= 100 ? Colors.green : (percentage > 50 ? AppColors.primary : Colors.orange);

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.divider.withValues(alpha: 0.5)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          tilePadding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                name,
                style: GoogleFonts.poppins(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Исполнение: $fact / $target',
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: AppColors.textSecondary,
                    ),
                  ),
                  Text(
                    '${percentage.toStringAsFixed(1)}%',
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: color,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: LinearProgressIndicator(
                  value: (percentage / 100).clamp(0, 1),
                  backgroundColor: AppColors.background,
                  color: color,
                  minHeight: 8,
                ),
              ),
            ],
          ),
          children: [
            const Divider(height: 1),
            ...detailedPlans.map((p) => _buildDoctorRow(p)).toList(),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }

  Widget _buildDoctorRow(DoctorPlan p) {
    final percentage = p.targetQuantity > 0 ? (p.factQuantity / p.targetQuantity) * 100 : 0.0;
    final doctorName = p.doctor?.fullName ?? (p.medOrg?.name ?? 'Общий план');

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  doctorName,
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: AppColors.textPrimary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 8),
              Text(
                '${p.factQuantity} / ${p.targetQuantity}',
                style: GoogleFonts.inter(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textSecondary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              Expanded(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: (percentage / 100).clamp(0, 1),
                    backgroundColor: AppColors.background,
                    color: percentage >= 100 ? Colors.green.withValues(alpha: 0.5) : AppColors.primary.withValues(alpha: 0.5),
                    minHeight: 4,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              SizedBox(
                width: 35,
                child: Text(
                  '${percentage.toStringAsFixed(0)}%',
                  textAlign: TextAlign.right,
                  style: GoogleFonts.inter(
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                    color: AppColors.textHint,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
