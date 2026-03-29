import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
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
  final List<String> _statuses = ['Все', 'Ожидание', 'Подтверждено', 'Завершено', 'Отменено'];
  final List<String?> _statusValues = [null, 'pending', 'approved', 'completed', 'cancelled'];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _statuses.length, vsync: this);
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

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Бронирования'),
        backgroundColor: AppColors.surface,
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          tabAlignment: TabAlignment.start,
          labelStyle: GoogleFonts.inter(
            fontSize: 12,
            fontWeight: FontWeight.w600,
          ),
          unselectedLabelStyle: GoogleFonts.inter(
            fontSize: 12,
            fontWeight: FontWeight.normal,
          ),
          labelColor: AppColors.primary,
          unselectedLabelColor: AppColors.textSecondary,
          indicatorColor: AppColors.primary,
          indicatorWeight: 2.5,
          tabs: _statuses.map((s) => Tab(text: s)).toList(),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_rounded),
            onPressed: () => context.push('/reservations/create'),
          ),
        ],
      ),
      body: _buildContent(state),
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.push('/reservations/create'),
        child: const Icon(Icons.add_rounded),
      ),
    );
  }

  Widget _buildContent(ReservationsState state) {
    if (state.status == ReservationsLoadStatus.loading) {
      return const ShimmerList(count: 6);
    }

    if (state.status == ReservationsLoadStatus.error && state.reservations.isEmpty) {
      return ErrorView(
        message: state.errorMessage ?? 'Ошибка',
        onRetry: () =>
            ref.read(reservationsProvider.notifier).loadReservations(),
        fullScreen: true,
      );
    }

    return TabBarView(
      controller: _tabController,
      children: _statuses.asMap().entries.map((entry) {
        final filtered = _getFilteredReservations(
            state.reservations, _statusValues[entry.key]);
        if (filtered.isEmpty) {
          return const EmptyView(
            title: 'Бронирования не найдены',
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
            padding: const EdgeInsets.symmetric(vertical: 8),
            itemCount: filtered.length,
            itemBuilder: (context, index) =>
                _buildReservationCard(filtered[index]),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildReservationCard(ReservationModel reservation) {
    final formatter = NumberFormat('#,##0', 'en_US');
    return GestureDetector(
      onTap: () => context.push('/reservations/${reservation.id}'),
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 5),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.divider),
        ),
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
                    fontWeight: FontWeight.w600,
                    color: AppColors.primary,
                  ),
                ),
                StatusBadge(status: reservation.status),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(
                  Icons.person_outline_rounded,
                  size: 14,
                  color: AppColors.textHint,
                ),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    reservation.customerName,
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      color: AppColors.textPrimary,
                      fontWeight: FontWeight.w500,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(
                      Icons.calendar_today_outlined,
                      size: 13,
                      color: AppColors.textHint,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      reservation.date,
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
                Text(
                  '${formatter.format(reservation.totalAmount)} so\'m',
                  style: GoogleFonts.poppins(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
              ],
            ),
            if (reservation.items.isNotEmpty) ...[
              const SizedBox(height: 8),
              const Divider(height: 1),
              const SizedBox(height: 8),
              Text(
                '${reservation.items.length} ta mahsulot',
                style: GoogleFonts.inter(
                  fontSize: 11,
                  color: AppColors.textSecondary,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
