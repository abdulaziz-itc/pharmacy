import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/models/notification_model.dart';
import '../../../shared/widgets/empty_view.dart';
import '../../../shared/widgets/error_view.dart';
import '../../../shared/widgets/loading_shimmer.dart';
import '../providers/notifications_provider.dart';

class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});

  @override
  ConsumerState<NotificationsScreen> createState() =>
      _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(notificationsProvider.notifier).loadNotifications();
    });
  }

  String _formatDate(String dateStr) {
    try {
      final date = DateTime.parse(dateStr);
      final now = DateTime.now();
      final diff = now.difference(date);
      if (diff.inMinutes < 60) {
        return '${diff.inMinutes} daqiqa oldin';
      } else if (diff.inHours < 24) {
        return '${diff.inHours} soat oldin';
      } else if (diff.inDays < 7) {
        return '${diff.inDays} kun oldin';
      }
      return DateFormat('dd.MM.yyyy').format(date);
    } catch (e) {
      return dateStr;
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(notificationsProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Row(
          children: [
            const Text('Bildirishnomalar'),
            if (state.unreadCount > 0) ...[
              const SizedBox(width: 8),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: AppColors.error,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '${state.unreadCount}',
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
              ),
            ],
          ],
        ),
        backgroundColor: AppColors.surface,
        actions: [
          if (state.unreadCount > 0)
            TextButton(
              onPressed: () =>
                  ref.read(notificationsProvider.notifier).markAllAsRead(),
              child: Text(
                'Barchasini o\'qi',
                style: GoogleFonts.inter(
                  fontSize: 13,
                  color: AppColors.accent,
                ),
              ),
            ),
        ],
      ),
      body: _buildContent(state),
    );
  }

  Widget _buildContent(NotificationsState state) {
    if (state.status == NotifLoadStatus.loading) {
      return const ShimmerList(count: 6);
    }

    if (state.status == NotifLoadStatus.error && state.notifications.isEmpty) {
      return ErrorView(
        message: state.errorMessage ?? 'Xatolik',
        onRetry: () =>
            ref.read(notificationsProvider.notifier).loadNotifications(),
        fullScreen: true,
      );
    }

    if (state.notifications.isEmpty) {
      return const EmptyView(
        title: 'Bildirishnomalar yo\'q',
        subtitle: 'Yangi bildirishnomalar kelganda bu yerda ko\'rinadi',
        icon: Icons.notifications_none_rounded,
      );
    }

    return RefreshIndicator(
      onRefresh: () =>
          ref.read(notificationsProvider.notifier).loadNotifications(),
      color: AppColors.primary,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(vertical: 8),
        itemCount: state.notifications.length,
        itemBuilder: (context, index) {
          return _buildNotificationCard(state.notifications[index]);
        },
      ),
    );
  }

  Widget _buildNotificationCard(NotificationModel notification) {
    return GestureDetector(
      onTap: () {
        if (notification.isUnread) {
          ref
              .read(notificationsProvider.notifier)
              .markAsRead(notification.id);
        }
      },
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: notification.isUnread
              ? AppColors.accent.withOpacity(0.05)
              : AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: notification.isUnread
                ? AppColors.accent.withOpacity(0.3)
                : AppColors.divider,
          ),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: notification.isUnread
                    ? AppColors.accent.withOpacity(0.15)
                    : AppColors.surfaceVariant,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                _getNotificationIcon(notification.topic),
                color: notification.isUnread
                    ? AppColors.accent
                    : AppColors.textHint,
                size: 22,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          notification.topic,
                          style: GoogleFonts.inter(
                            fontSize: 13,
                            fontWeight: notification.isUnread
                                ? FontWeight.w700
                                : FontWeight.w600,
                            color: AppColors.textPrimary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (notification.isUnread)
                        Container(
                          width: 8,
                          height: 8,
                          decoration: const BoxDecoration(
                            color: AppColors.accent,
                            shape: BoxShape.circle,
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    notification.message,
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      color: AppColors.textSecondary,
                      height: 1.4,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 6),
                  Text(
                    _formatDate(notification.createdAt),
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      color: AppColors.textHint,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  IconData _getNotificationIcon(String topic) {
    final lower = topic.toLowerCase();
    if (lower.contains('bron') || lower.contains('reservation')) {
      return Icons.receipt_long_rounded;
    } else if (lower.contains('tashrif') || lower.contains('visit')) {
      return Icons.calendar_today_rounded;
    } else if (lower.contains('bonus') || lower.contains('payment')) {
      return Icons.account_balance_wallet_rounded;
    } else if (lower.contains('shifokor') || lower.contains('doctor')) {
      return Icons.medical_services_rounded;
    }
    return Icons.notifications_rounded;
  }
}
