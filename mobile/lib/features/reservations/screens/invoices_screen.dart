import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/models/invoice_model.dart';
import '../../../shared/widgets/empty_view.dart';
import '../../../shared/widgets/error_view.dart';
import '../../../shared/widgets/loading_shimmer.dart';
import '../providers/invoices_provider.dart';

class InvoicesScreen extends ConsumerStatefulWidget {
  final bool initialShowDebts;
  final int? year;
  final int? month;

  const InvoicesScreen({
    super.key,
    this.initialShowDebts = false,
    this.year,
    this.month,
  });

  @override
  ConsumerState<InvoicesScreen> createState() => _InvoicesScreenState();
}

class _InvoicesScreenState extends ConsumerState<InvoicesScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final List<String> _tabs = ['Все', 'Долги'];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(
      length: _tabs.length,
      vsync: this,
      initialIndex: widget.initialShowDebts ? 1 : 0,
    );
    _tabController.addListener(() {
      if (!_tabController.indexIsChanging) {
        _loadData();
      }
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadData();
    });
  }

  void _loadData() {
    ref.read(invoicesProvider.notifier).loadInvoices(
          hasDebt: _tabController.index == 1,
          year: widget.year,
          month: widget.month,
        );
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(invoicesProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Фактуры'),
        backgroundColor: AppColors.surface,
        bottom: TabBar(
          controller: _tabController,
          labelStyle: GoogleFonts.inter(
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
          unselectedLabelStyle: GoogleFonts.inter(
            fontSize: 14,
            fontWeight: FontWeight.normal,
          ),
          labelColor: AppColors.primary,
          unselectedLabelColor: AppColors.textSecondary,
          indicatorColor: AppColors.primary,
          indicatorWeight: 3,
          tabs: _tabs.map((t) => Tab(text: t)).toList(),
        ),
      ),
      body: _buildContent(state),
    );
  }

  Widget _buildContent(InvoicesState state) {
    if (state.status == InvoicesLoadStatus.loading) {
      return const ShimmerList(count: 6);
    }

    if (state.status == InvoicesLoadStatus.error && state.invoices.isEmpty) {
      return ErrorView(
        message: state.errorMessage ?? 'Xatolik',
        onRetry: _loadData,
        fullScreen: true,
      );
    }

    if (state.invoices.isEmpty) {
      return const EmptyView(
        title: 'Фактуры не найдены',
        icon: Icons.receipt_long_outlined,
      );
    }

    return RefreshIndicator(
      onRefresh: () async => _loadData(),
      color: AppColors.primary,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(vertical: 8),
        itemCount: state.invoices.length,
        itemBuilder: (context, index) => _buildInvoiceCard(state.invoices[index]),
      ),
    );
  }

  Widget _buildInvoiceCard(InvoiceModel invoice) {
    final formatter = NumberFormat('#,##0', 'en_US');
    return GestureDetector(
      onTap: () => context.push('/invoices/${invoice.id}'),
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.divider),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.02),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                        invoice.facturaNumber ?? 'Фактура #${invoice.id}',
                      style: GoogleFonts.poppins(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    Text(
                      invoice.date.split('T')[0],
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        color: AppColors.textHint,
                      ),
                    ),
                  ],
                ),
                _buildStatusBadge(invoice),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                const Icon(Icons.business_rounded, size: 16, color: AppColors.textHint),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    invoice.customerName ?? 'Неизвестная организация',
                    style: GoogleFonts.inter(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: AppColors.textPrimary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            const Divider(height: 1),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Общая сумма',
                      style: GoogleFonts.inter(fontSize: 11, color: AppColors.textHint),
                    ),
                    Text(
                      '${formatter.format(invoice.totalAmount)} сум',
                      style: GoogleFonts.poppins(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ],
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      invoice.hasDebt ? 'Долг' : 'Оплачено',
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        color: invoice.hasDebt ? AppColors.error : AppColors.success,
                      ),
                    ),
                    Text(
                      '${formatter.format(invoice.hasDebt ? invoice.debt : invoice.paidAmount)} сум',
                      style: GoogleFonts.poppins(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: invoice.hasDebt ? AppColors.error : AppColors.success,
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

  Widget _buildStatusBadge(InvoiceModel invoice) {
    Color color;
    switch (invoice.status.toLowerCase()) {
      case 'paid':
        color = AppColors.success;
      case 'partial':
        color = const Color(0xFFFBBF24);
      case 'unpaid':
        color = AppColors.error;
      case 'cancelled':
        color = AppColors.textHint;
      default:
        color = AppColors.primary;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        invoice.displayStatus,
        style: GoogleFonts.inter(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
    );
  }
}
