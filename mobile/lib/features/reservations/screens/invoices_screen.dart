import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../../core/l10n/l10n.dart';
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

  @override
  void initState() {
    super.initState();
    _tabController = TabController(
      length: 2,
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
    final l10n = context.l10n;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text(l10n.invoicesTitle),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(50),
          child: _buildTabBar(l10n),
        ),
      ),
      body: _buildContent(state, l10n),
    );
  }

  Widget _buildTabBar(S l10n) {
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
          Tab(text: l10n.allFilter),
          Tab(text: l10n.debtsTab),
        ],
      ),
    );
  }

  Widget _buildContent(InvoicesState state, S l10n) {
    if (state.status == InvoicesLoadStatus.loading) {
      return const ShimmerList(count: 6);
    }

    if (state.status == InvoicesLoadStatus.error && state.invoices.isEmpty) {
      return ErrorView(
        message: state.errorMessage ?? l10n.errorOccurred,
        onRetry: _loadData,
        fullScreen: true,
      );
    }

    if (state.invoices.isEmpty) {
      return EmptyView(
        title: l10n.nothingFound,
        icon: Icons.receipt_long_outlined,
      );
    }

    return RefreshIndicator(
      onRefresh: () async => _loadData(),
      color: AppColors.primary,
      child: ListView.builder(
        padding: const EdgeInsets.only(top: 8, bottom: 24),
        itemCount: state.invoices.length,
        itemBuilder: (context, index) => _buildInvoiceCard(state.invoices[index], l10n),
      ),
    );
  }

  Widget _buildInvoiceCard(InvoiceModel invoice, S l10n) {
    final formatter = NumberFormat('#,##0', 'en_US');
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
          onTap: () => context.push('/invoices/${invoice.id}'),
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            invoice.facturaNumber ?? '${l10n.invoiceLabel} #${invoice.id}',
                            style: GoogleFonts.inter(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                              color: AppColors.textPrimary,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              const Icon(Icons.calendar_today_outlined, size: 12, color: AppColors.textHint),
                              const SizedBox(width: 6),
                              Text(
                                invoice.date.split('T')[0],
                                style: GoogleFonts.inter(
                                  fontSize: 12,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    _buildStatusBadge(invoice),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(Icons.business_rounded, size: 16, color: AppColors.primary),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        invoice.customerName ?? l10n.unknownOrganization,
                        style: GoogleFonts.inter(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textPrimary,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Theme.of(context).scaffoldBackgroundColor.withValues(alpha: 0.5),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Theme.of(context).dividerColor.withValues(alpha: 0.5)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            l10n.totalAmountLabel.toUpperCase(),
                            style: GoogleFonts.inter(fontSize: 10, color: AppColors.textHint, fontWeight: FontWeight.w800, letterSpacing: 0.5),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${formatter.format(invoice.totalAmount)} ${l10n.sumCurrency}',
                            style: GoogleFonts.inter(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: AppColors.textPrimary,
                            ),
                          ),
                        ],
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            (invoice.hasDebt ? l10n.debtLabel : l10n.paidLabel).toUpperCase(),
                            style: GoogleFonts.inter(
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.5,
                              color: invoice.hasDebt ? AppColors.error : AppColors.success,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${formatter.format(invoice.hasDebt ? invoice.debt : invoice.paidAmount)} ${l10n.sumCurrency}',
                            style: GoogleFonts.inter(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: invoice.hasDebt ? AppColors.error : AppColors.success,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
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
        color = AppColors.primary;
      case 'unpaid':
        color = AppColors.error;
      case 'cancelled':
        color = AppColors.textHint;
      default:
        color = AppColors.primary;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Text(
        invoice.displayStatus,
        style: GoogleFonts.inter(
          fontSize: 11,
          fontWeight: FontWeight.bold,
          color: color,
        ),
      ),
    );
  }
}
