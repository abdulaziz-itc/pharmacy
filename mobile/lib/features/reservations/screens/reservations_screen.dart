import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/models/reservation_model.dart';
import '../../../shared/widgets/empty_view.dart';
import '../../../shared/widgets/error_view.dart';
import '../../../shared/widgets/loading_shimmer.dart';
import '../../../shared/widgets/status_badge.dart';
import '../providers/reservations_provider.dart';

class ReservationsScreen extends ConsumerStatefulWidget {
  final int? year;
  final int? month;

  const ReservationsScreen({super.key, this.year, this.month});

  @override
  ConsumerState<ReservationsScreen> createState() => _ReservationsScreenState();
}

class _ReservationsScreenState extends ConsumerState<ReservationsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final List<String?> _statusValues = [null, 'pending', 'approved', 'completed', 'cancelled'];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _statusValues.length, vsync: this);
    _tabController.addListener(() {
      setState(() {});
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(reservationsProvider.notifier).loadReservations(
            year: widget.year,
            month: widget.month,
          );
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  List<ReservationModel> _getFilteredReservations(
      List<ReservationModel> all, String? status) {
    if (status == null) return all;
    return all.where((r) => r.status.toLowerCase() == status).toList();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(reservationsProvider);
    final l10n = context.l10n;
    
    final List<String> localizedStatuses = [
      l10n.allFilter,
      l10n.waitingStatus,
      l10n.confirmedStatus,
      l10n.completed,
      l10n.cancelled,
    ];

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text(l10n.reservationsTitle),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_rounded),
            onPressed: () => context.push('/reservations/create'),
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(50),
          child: _buildTabBar(localizedStatuses),
        ),
      ),
      body: _buildContent(state, l10n, localizedStatuses),
      floatingActionButton: FloatingActionButton(
        heroTag: 'reservations_fab',
        onPressed: () => context.push('/reservations/create'),
        child: const Icon(Icons.add_rounded, size: 28),
      ),
    );
  }

  Widget _buildTabBar(List<String> statuses) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      height: 42,
      child: TabBar(
        controller: _tabController,
        isScrollable: true,
        tabAlignment: TabAlignment.start,
        indicatorSize: TabBarIndicatorSize.tab,
        indicatorPadding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
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
        tabs: statuses.map((s) => Tab(text: s)).toList(),
      ),
    );
  }

  Widget _buildContent(ReservationsState state, S l10n, List<String> localizedStatuses) {
    if (state.status == ReservationsLoadStatus.loading) {
      return const ShimmerList(count: 6);
    }

    if (state.status == ReservationsLoadStatus.error && state.reservations.isEmpty) {
      return ErrorView(
        message: state.errorMessage ?? l10n.errorOccurred,
        onRetry: () => ref.read(reservationsProvider.notifier).loadReservations(),
        fullScreen: true,
      );
    }

    return TabBarView(
      controller: _tabController,
      children: localizedStatuses.asMap().entries.map((entry) {
        final filtered = _getFilteredReservations(
            state.reservations, _statusValues[entry.key]);
        if (filtered.isEmpty) {
          return EmptyView(
            title: l10n.reservationsNotFound,
            icon: Icons.receipt_long_outlined,
          );
        }
        return RefreshIndicator(
          onRefresh: () =>
              ref.read(reservationsProvider.notifier).loadReservations(
                year: widget.year,
                month: widget.month,
              ),
          color: AppColors.primary,
          child: ListView.builder(
            padding: const EdgeInsets.only(top: 8, bottom: 24),
            itemCount: filtered.length,
            itemBuilder: (context, index) =>
                _buildReservationCard(filtered[index], l10n),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildReservationCard(ReservationModel reservation, S l10n) {
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
          onTap: () => context.push('/reservations/${reservation.id}'),
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      '#${reservation.id}',
                      style: GoogleFonts.poppins(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                      ),
                    ),
                    StatusBadge(status: reservation.status),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(
                        Icons.person_outline_rounded,
                        size: 16,
                        color: AppColors.primary,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        reservation.customerName,
                        style: GoogleFonts.inter(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(
                          Icons.calendar_today_outlined,
                          size: 14,
                          color: AppColors.textHint,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          reservation.date,
                          style: GoogleFonts.inter(
                            fontSize: 13,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                    Text(
                      '${formatter.format(reservation.totalAmount)} ${l10n.sumCurrency}',
                      style: GoogleFonts.poppins(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                        color: null,
                      ),
                    ),
                  ],
                ),
                if (reservation.items.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  const Divider(height: 1),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Icon(Icons.shopping_bag_outlined, size: 14, color: AppColors.textHint),
                      const SizedBox(width: 6),
                      Text(
                        '${reservation.items.length} ${l10n.itemsCountLabel}',
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
