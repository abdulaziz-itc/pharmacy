import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/models/invoice_model.dart';
import '../providers/invoices_provider.dart';

class InvoiceDetailScreen extends ConsumerStatefulWidget {
  final int invoiceId;

  const InvoiceDetailScreen({super.key, required this.invoiceId});

  @override
  ConsumerState<InvoiceDetailScreen> createState() => _InvoiceDetailScreenState();
}

class _InvoiceDetailScreenState extends ConsumerState<InvoiceDetailScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(invoicesProvider.notifier).loadInvoiceDetail(widget.invoiceId);
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(invoicesProvider);
    final invoice = state.selectedInvoice;
    final l10n = context.l10n;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text('${l10n.invoiceLabel} #${widget.invoiceId}'),
      ),
      body: invoice == null
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : _buildContent(invoice, l10n),
    );
  }

  Widget _buildContent(InvoiceModel invoice, S l10n) {
    final formatter = NumberFormat('#,##0', 'en_US');

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Summary Card
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: invoice.hasDebt 
                    ? [const Color(0xFFEF4444), const Color(0xFFB91C1C)]
                    : [const Color(0xFF10B981), const Color(0xFF047857)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(24),
              boxShadow: [
                BoxShadow(
                  color: (invoice.hasDebt ? Colors.red : Colors.green).withValues(alpha: 0.3),
                  blurRadius: 20,
                  offset: const Offset(0, 10),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      invoice.displayStatus.toUpperCase(),
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        color: Colors.white.withValues(alpha: 0.9),
                        letterSpacing: 1,
                      ),
                    ),
                    const Icon(Icons.receipt_long_rounded, color: Colors.white, size: 22),
                  ],
                ),
                const SizedBox(height: 20),
                Text(
                  '${formatter.format(invoice.totalAmount)} ${l10n.sumCurrency}',
                  style: GoogleFonts.inter(
                    fontSize: 28,
                    fontWeight: FontWeight.w900,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  l10n.totalAmountLabel,
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    color: Colors.white.withValues(alpha: 0.8),
                    fontWeight: FontWeight.w500,
                  ),
                ),
                if (invoice.hasDebt) ...[
                  const SizedBox(height: 20),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          '${l10n.debtRemainder}:',
                          style: GoogleFonts.inter(fontSize: 13, color: Colors.white, fontWeight: FontWeight.bold),
                        ),
                        Text(
                          '${formatter.format(invoice.debt)} ${l10n.sumCurrency}',
                          style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w900, color: Colors.white),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 24),
          
          // Information Section
          _buildInfoSection(invoice, l10n),
          
          const SizedBox(height: 24),
          
          // Payments Section
          Text(
            l10n.paymentHistory.toUpperCase(),
            style: GoogleFonts.inter(
              fontSize: 11,
              fontWeight: FontWeight.w800,
              color: AppColors.textHint,
              letterSpacing: 1.2,
            ),
          ),
          const SizedBox(height: 16),
          if (invoice.payments.isNotEmpty) ...[
            ...invoice.payments.map((p) => _buildPaymentItem(p, formatter, l10n)),
          ] else
            EmptyView(
              title: l10n.noPayments,
              subtitle: l10n.noPaymentsSubtitle,
              icon: Icons.payment_outlined,
            ),
          
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildInfoSection(InvoiceModel invoice, S l10n) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Theme.of(context).dividerColor),
      ),
      child: Column(
        children: [
          _buildDetailRow(Icons.business_rounded, l10n.organization, invoice.customerName ?? l10n.unknownOrganization),
          _buildDetailRow(Icons.numbers_rounded, l10n.invoiceNumberLabel, invoice.facturaNumber ?? '-'),
          _buildDetailRow(Icons.calendar_today_rounded, l10n.date, invoice.date.split('T')[0]),
          if (invoice.realizationDate != null)
            _buildDetailRow(Icons.local_shipping_outlined, l10n.realizationDateLabel, invoice.realizationDate!.split('T')[0]),
          if (invoice.reservationId != null)
            _buildDetailRow(Icons.link_rounded, l10n.linkedReservationLabel, '#${invoice.reservationId}', isLast: true),
        ],
      ),
    );
  }

  Widget _buildDetailRow(IconData icon, String label, String value, {bool isLast = false}) {
    return Padding(
      padding: EdgeInsets.only(bottom: isLast ? 0 : 16),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 18, color: AppColors.primary),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label.toUpperCase(),
                  style: GoogleFonts.inter(fontSize: 10, color: AppColors.textHint, fontWeight: FontWeight.w800, letterSpacing: 0.5),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPaymentItem(PaymentModel payment, NumberFormat formatter, S l10n) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Theme.of(context).dividerColor),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppColors.success.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.check_rounded, color: AppColors.success, size: 20),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${formatter.format(payment.amount)} ${l10n.sumCurrency}',
                  style: GoogleFonts.inter(
                    fontSize: 15,
                    fontWeight: FontWeight.w900,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  payment.date.split('T')[0],
                  style: GoogleFonts.inter(fontSize: 12, color: AppColors.textSecondary),
                ),
              ],
            ),
          ),
          if (payment.type != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: Theme.of(context).scaffoldBackgroundColor,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Theme.of(context).dividerColor),
              ),
              child: Text(
                payment.type!.toUpperCase(),
                style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w800, color: AppColors.textHint, letterSpacing: 0.5),
              ),
            ),
        ],
      ),
    );
  }
}

class EmptyView extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;

  const EmptyView({super.key, required this.title, required this.subtitle, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 24),
        child: Column(
          children: [
            Icon(icon, size: 48, color: AppColors.textHint.withValues(alpha: 0.5)),
            const SizedBox(height: 12),
            Text(title, style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
            const SizedBox(height: 4),
            Text(subtitle, style: GoogleFonts.inter(fontSize: 13, color: AppColors.textHint), textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}
