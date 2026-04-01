import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/models/bonus_model.dart';
import '../../../shared/widgets/error_view.dart';
import '../../../shared/widgets/loading_shimmer.dart';
import '../../doctors/providers/doctors_provider.dart';
import '../providers/bonus_provider.dart';
import '../widgets/allocation_dialog.dart';

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
        message: state.errorMessage ?? 'Ошибка',
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
    final remainderToPay = bonus.totalAccrued - bonus.totalPaid;

    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Grid of 5 Stat Cards
              GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: 2,
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: 1.6,
                children: [
                  _buildStatCard(
                    'ВСЕГО НАЧИСЛЕНО',
                    '${_formatAmount(bonus.totalAccrued)} UZS',
                    'Общая заработанная сумма',
                    const Color(0xFFF8FAFC),
                    const Color(0xFF64748B),
                    Icons.payments_outlined,
                    onTap: () => _showFilteredHistorySheet(
                      context,
                      'Начислено',
                      bonus.history.where((h) => h.type == 'accrual').toList(),
                    ),
                  ),
                  _buildStatCard(
                    'ВСЕГО ВЫПЛАЧЕНО',
                    '${_formatAmount(bonus.totalPaid)} UZS',
                    'Сумма переведенная на ваш баланс',
                    const Color(0xFFE8F5E9),
                    const Color(0xFF2E7D32),
                    Icons.check_circle_outline,
                    onTap: () => _showFilteredHistorySheet(
                      context,
                      'Выплачено',
                      bonus.history.where((h) => h.type == 'accrual' && h.isPaid).toList(),
                    ),
                  ),
                  _buildStatCard(
                    'ОСТАТОК К ВЫПЛАТЕ',
                    '${_formatAmount(remainderToPay > 0 ? remainderToPay : 0)} UZS',
                    'Ожидает утверждения директором',
                    const Color(0xFFF3E5F5),
                    const Color(0xFF7B1FA2),
                    Icons.info_outline,
                    onTap: () => _showFilteredHistorySheet(
                      context,
                      'К выплате',
                      bonus.history.where((h) => h.type == 'accrual' && !h.isPaid).toList(),
                    ),
                  ),
                  _buildStatCard(
                    'РАСПРЕДЕЛЕННЫЕ БОНУСЫ',
                    '${_formatAmount(bonus.totalAllocated)} UZS',
                    'Прикреплено к врачам',
                    const Color(0xFFFFF3E0),
                    const Color(0xFFE65100),
                    Icons.people_outline,
                    onTap: () => _showFilteredHistorySheet(
                      context,
                      'Распределено',
                      bonus.history.where((h) => h.isAllocation).toList(),
                    ),
                  ),
                  _buildStatCard(
                    'ОСТАТОК НА БАЛАНСЕ',
                    '${_formatAmount(bonus.balance)} UZS',
                    'Доступно для распределения',
                    const Color(0xFFF3E5F5),
                    const Color(0xFF6200EA),
                    Icons.balance_outlined,
                    onTap: () {}, // Current balance is just a total
                  ),
                ],
              ),
              const SizedBox(height: 24),
              
              // History Section
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'История',
                    style: GoogleFonts.poppins(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: null,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              if (bonus.history.isEmpty) ...[
                const SizedBox(height: 40),
                Center(
                  child: Text(
                    'История пуста',
                    style: GoogleFonts.inter(color: AppColors.textSecondary),
                  ),
                ),
              ] else
                Container(
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.divider),
                  ),
                  child: ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: bonus.history.length > 10 ? 10 : bonus.history.length,
                    separatorBuilder: (_, __) =>
                        const Divider(height: 1, indent: 16, endIndent: 16),
                    itemBuilder: (context, index) {
                      final item = bonus.history[index];
                      return _buildHistoryItem(item);
                    },
                  ),
                ),
              const SizedBox(height: 24),
            ],
          ),
        ),
        
        // Distribution Action Bar - FIX OVERFLOW
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFF2563EB), Color(0xFF3B82F6)],
            ),
          ),
          child: SafeArea(
            top: false,
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.account_balance_wallet_outlined, color: Colors.white, size: 14),
                          const SizedBox(width: 6),
                          Flexible(
                            child: Text(
                              'Мой баланс',
                              style: GoogleFonts.inter(
                                color: Colors.white.withValues(alpha: 0.9),
                                fontSize: 13,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      FittedBox(
                        child: Text(
                          '${_formatAmount(bonus.balance)} UZS',
                          style: GoogleFonts.poppins(
                            color: Colors.white,
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                ElevatedButton(
                  onPressed: () => _showAllocationDialog(context),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white.withValues(alpha: 0.2),
                    foregroundColor: Colors.white,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  child: const Text('Прикрепить', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildStatCard(
    String label, 
    String value, 
    String subtitle, 
    Color bgColor, 
    Color textColor,
    IconData icon, {
    VoidCallback? onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.03),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Stack(
          children: [
            Positioned(
              right: 0,
              top: 0,
              child: Icon(
                icon,
                color: textColor.withValues(alpha: 0.1),
                size: 48,
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  label,
                  style: GoogleFonts.inter(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: textColor.withValues(alpha: 0.8),
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Text(
                        value,
                        style: GoogleFonts.poppins(
                          fontSize: 17,
                          fontWeight: FontWeight.bold,
                          color: Colors.black87,
                        ),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: GoogleFonts.inter(
                        fontSize: 9,
                        color: Colors.black54,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
                Row(
                  children: [
                    Icon(Icons.touch_app_outlined, size: 10, color: Colors.blue.shade700),
                    const SizedBox(width: 4),
                    Text(
                      'Детали',
                      style: GoogleFonts.inter(
                        fontSize: 8,
                        color: Colors.blue.shade700,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _showFilteredHistorySheet(BuildContext context, String title, List<BonusHistoryItem> items) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.75,
        decoration: const BoxDecoration(
          color: AppColors.background,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          children: [
            const SizedBox(height: 12),
            Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2))),
            Padding(
              padding: const EdgeInsets.all(20),
              child: Row(
                children: [
                  Text(
                    title,
                    style: GoogleFonts.poppins(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  const Spacer(),
                  Text(
                    '${items.length} записей',
                    style: GoogleFonts.inter(fontSize: 13, color: AppColors.textSecondary),
                  ),
                ],
              ),
            ),
            Expanded(
              child: items.isEmpty 
                ? Center(child: Text('Записей не найдено', style: GoogleFonts.inter(color: AppColors.textSecondary)))
                : ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
                    itemCount: items.length,
                    separatorBuilder: (_, __) => const Divider(height: 24),
                    itemBuilder: (context, index) {
                      final item = items[index];
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                item.date.length > 10 ? item.date.substring(0, 10) : item.date,
                                style: GoogleFonts.inter(fontSize: 12, color: AppColors.textHint, fontWeight: FontWeight.w500),
                              ),
                              Text(
                                '${item.amount > 0 ? '+' : ''}${_formatAmount(item.amount)} UZS',
                                style: GoogleFonts.poppins(
                                  fontSize: 15, 
                                  fontWeight: FontWeight.bold, 
                                  color: item.isAllocation ? Colors.orange : (item.isAccrual ? Colors.green : Colors.red),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          if (item.invoiceId != null)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 4),
                              child: Text(
                                'Счет-фактура: #${item.invoiceId}',
                                style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600),
                              ),
                            ),
                          if (item.doctorName != null)
                            Text(
                              'Врач: ${item.doctorName}',
                              style: GoogleFonts.inter(fontSize: 13, color: AppColors.textSecondary),
                            ),
                          if (item.productName != null)
                            Text(
                              'Продукт: ${item.productName}',
                              style: GoogleFonts.inter(fontSize: 13, color: AppColors.textSecondary),
                            ),
                          if (item.description != null && item.description!.isNotEmpty)
                            Padding(
                              padding: const EdgeInsets.only(top: 4),
                              child: Text(
                                item.description!,
                                style: GoogleFonts.inter(fontSize: 12, color: AppColors.textHint, fontStyle: FontStyle.italic),
                              ),
                            ),
                        ],
                      );
                    },
                  ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHistoryItem(BonusHistoryItem item) {
    return ListTile(
      leading: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: (item.isAllocation ? Colors.orange : (item.isAccrual ? Colors.green : Colors.red))
              .withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(
          item.isAllocation 
              ? Icons.people_outline 
              : (item.isAccrual ? Icons.add_circle_outline : Icons.remove_circle_outline),
          color: item.isAllocation ? Colors.orange : (item.isAccrual ? Colors.green : Colors.red),
          size: 20,
        ),
      ),
      title: Text(
        item.displayType,
        style: GoogleFonts.inter(
          fontSize: 14,
          fontWeight: FontWeight.w600,
        ),
      ),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (item.doctorName != null)
            Text(
              'Врач: ${item.doctorName}',
              style: GoogleFonts.inter(fontSize: 12),
            ),
          if (item.productName != null)
            Text(
              'Продукт: ${item.productName}',
              style: GoogleFonts.inter(fontSize: 12, color: AppColors.textSecondary),
            ),
          Text(
            item.description ?? item.date,
            style: GoogleFonts.inter(fontSize: 11, color: AppColors.textSecondary),
          ),
        ],
      ),
      trailing: Text(
        '${item.amount > 0 ? '+' : ''}${_formatAmount(item.amount)} UZS',
        style: GoogleFonts.poppins(
          fontSize: 14,
          fontWeight: FontWeight.bold,
          color: item.isAllocation ? Colors.orange : (item.isAccrual ? Colors.green : Colors.red),
        ),
      ),
    );
  }

  void _showAllocationDialog(BuildContext context) {
    final balance = ref.read(bonusProvider).bonusBalance?.balance ?? 0.0;
    
    // Pre-load doctors if not already loaded
    ref.read(doctorsProvider.notifier).loadDoctors(refresh: true);
    
    showDialog(
      context: context,
      builder: (context) => AllocationDialog(availableBalance: balance),
    );
  }
}
