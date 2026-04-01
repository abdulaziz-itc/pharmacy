import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/models/reservation_model.dart';
import '../../../shared/widgets/status_badge.dart';
import '../providers/reservations_provider.dart';

class ReservationDetailScreen extends ConsumerStatefulWidget {
  final int reservationId;

  const ReservationDetailScreen({super.key, required this.reservationId});

  @override
  ConsumerState<ReservationDetailScreen> createState() =>
      _ReservationDetailScreenState();
}

class _ReservationDetailScreenState
    extends ConsumerState<ReservationDetailScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref
          .read(reservationsProvider.notifier)
          .loadReservationDetail(widget.reservationId);
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(reservationsProvider);
    final reservation = state.selectedReservation;
    final l10n = context.l10n;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text('${l10n.reservationNumber}${widget.reservationId}'),
      ),
      body: reservation == null
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            )
          : _buildContent(reservation, l10n),
    );
  }

  Widget _buildContent(ReservationModel reservation, S l10n) {
    final formatter = NumberFormat('#,##0', 'en_US');

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header card
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [AppColors.primary, Color(0xFF6366F1)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(24),
              boxShadow: [
                BoxShadow(
                  color: AppColors.primary.withValues(alpha: 0.3),
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
                      '${l10n.reservationNumber}${reservation.id}',
                      style: GoogleFonts.inter(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                        letterSpacing: 0.5,
                      ),
                    ),
                    StatusBadge(status: reservation.status),
                  ],
                ),
                const SizedBox(height: 20),
                Text(
                  '${formatter.format(reservation.totalAmount)} ${l10n.sumCurrency}',
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
              ],
            ),
          ),
          const SizedBox(height: 24),
          // Details
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Theme.of(context).dividerColor),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  l10n.detailsTitleLabel.toUpperCase(),
                  style: GoogleFonts.inter(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    color: AppColors.textHint,
                    letterSpacing: 1.2,
                  ),
                ),
                const SizedBox(height: 20),
                _buildDetailRow(
                  Icons.person_outline_rounded,
                  l10n.clientLabel,
                  reservation.customerName,
                ),
                _buildDetailRow(
                  Icons.calendar_today_rounded,
                  l10n.date,
                  reservation.date,
                ),
                if (reservation.invoice != null)
                  _buildDetailRow(
                    Icons.receipt_outlined,
                    l10n.invoiceLabel,
                    reservation.invoice!,
                  ),
                if (reservation.notes != null && reservation.notes!.isNotEmpty)
                  _buildDetailRow(
                    Icons.note_outlined,
                    l10n.comment,
                    reservation.notes!,
                    isLast: true,
                  ),
              ],
            ),
          ),
          if (reservation.items.isNotEmpty) ...[
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Theme.of(context).cardColor,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Theme.of(context).dividerColor),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        l10n.productsLabel.toUpperCase(),
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          color: AppColors.textHint,
                          letterSpacing: 1.2,
                        ),
                      ),
                      Text(
                        '${reservation.items.length} ${l10n.countSuffix}',
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          color: AppColors.primary,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  ...reservation.items.asMap().entries.map((entry) {
                    final item = entry.value;
                    final isLast = entry.key == reservation.items.length - 1;
                    return Container(
                      padding: EdgeInsets.only(bottom: isLast ? 0 : 16),
                      margin: EdgeInsets.only(bottom: isLast ? 0 : 16),
                      decoration: isLast
                          ? null
                          : BoxDecoration(
                              border: Border(
                                bottom: BorderSide(color: Theme.of(context).dividerColor),
                              ),
                            ),
                      child: Row(
                        children: [
                          Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: AppColors.primary.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(
                              Icons.medication_outlined,
                              color: AppColors.primary,
                              size: 22,
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  item.productName,
                                  style: GoogleFonts.inter(
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.textPrimary,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  '${item.quantity} ${l10n.pcs} × ${formatter.format(item.price)} ${l10n.sumCurrency}',
                                  style: GoogleFonts.inter(
                                    fontSize: 12,
                                    color: AppColors.textHint,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Text(
                            '${formatter.format(item.totalAmount)}',
                            style: GoogleFonts.inter(
                              fontSize: 14,
                              fontWeight: FontWeight.w900,
                              color: AppColors.textPrimary,
                            ),
                          ),
                        ],
                      ),
                    );
                  }),
                ],
              ),
            ),
          ],
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildDetailRow(
    IconData icon,
    String label,
    String value, {
    bool isLast = false,
  }) {
    return Container(
      padding: EdgeInsets.only(bottom: isLast ? 0 : 16),
      margin: EdgeInsets.only(bottom: isLast ? 0 : 16),
      decoration: isLast
          ? null
          : BoxDecoration(
              border: Border(
                bottom: BorderSide(color: Theme.of(context).dividerColor),
              ),
            ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: AppColors.primary, size: 20),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label.toUpperCase(),
                  style: GoogleFonts.inter(
                    fontSize: 10,
                    color: AppColors.textHint,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
