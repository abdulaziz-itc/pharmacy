import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../../core/l10n/l10n.dart';
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

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(notificationsProvider);
    final l10n = context.l10n;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        centerTitle: false,
        title: Row(
          children: [
            Text(l10n.notifications),
            if (state.unreadCount > 0) ...[
              const SizedBox(width: 12),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: AppColors.error,
                  borderRadius: BorderRadius.circular(8),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.error.withValues(alpha: 0.3),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Text(
                  '${state.unreadCount}',
                  style: GoogleFonts.inter(
                    fontSize: 11,
                    fontWeight: FontWeight.w900,
                    color: Colors.white,
                  ),
                ),
              ),
            ],
          ],
        ),
        actions: [
          if (state.unreadCount > 0)
            TextButton(
              onPressed: () => ref.read(notificationsProvider.notifier).markAllAsRead(),
              child: Text(
                l10n.readAllAction.toUpperCase(),
                style: GoogleFonts.inter(
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                  color: AppColors.primary,
                  letterSpacing: 0.5,
                ),
              ),
            ),
        ],
      ),
      body: _buildContent(state, l10n),
    );
  }

  String _formatDate(String dateStr, S l10n) {
    try {
      final date = DateTime.parse(dateStr).toLocal();
      final now = DateTime.now();
      final diff = now.difference(date);
      if (diff.inMinutes < 60) {
        return '${diff.inMinutes} ${l10n.minutesAgo}';
      } else if (diff.inHours < 24) {
        return '${diff.inHours} ${l10n.hoursAgo}';
      } else if (diff.inDays < 7) {
        return '${diff.inDays} ${l10n.daysAgo}';
      }
      return DateFormat('dd.MM.yyyy').format(date);
    } catch (e) {
      return dateStr;
    }
  }

  Widget _buildContent(NotificationsState state, S l10n) {
    if (state.status == NotifLoadStatus.loading) {
      return const ShimmerList(count: 6);
    }

    if (state.status == NotifLoadStatus.error && state.notifications.isEmpty) {
      return ErrorView(
        message: state.errorMessage ?? l10n.errorLoading,
        onRetry: () => ref.read(notificationsProvider.notifier).loadNotifications(),
        fullScreen: true,
      );
    }

    if (state.notifications.isEmpty) {
      return EmptyView(
        title: l10n.noNotifications,
        subtitle: l10n.noNotificationsSubtitle,
        icon: Icons.notifications_none_rounded,
      );
    }

    return RefreshIndicator(
      onRefresh: () => ref.read(notificationsProvider.notifier).loadNotifications(),
      color: AppColors.primary,
      child: ListView.builder(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.symmetric(vertical: 16),
        itemCount: state.notifications.length,
        itemBuilder: (context, index) {
          return _buildNotificationCard(state.notifications[index], l10n);
        },
      ),
    );
  }

  Widget _buildNotificationCard(NotificationModel notification, S l10n) {
    return GestureDetector(
      onTap: () {
        if (notification.isUnread) {
          ref.read(notificationsProvider.notifier).markAsRead(notification.id);
        }
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: notification.isUnread
                ? AppColors.primary.withValues(alpha: 0.3)
                : Theme.of(context).dividerColor,
            width: notification.isUnread ? 1.5 : 1,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.2),
              blurRadius: 15,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                color: notification.isUnread
                    ? AppColors.primary.withValues(alpha: 0.1)
                    : Theme.of(context).scaffoldBackgroundColor,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Icon(
                _getNotificationIcon(notification.topic),
                color: notification.isUnread ? AppColors.primary : AppColors.textHint,
                size: 26,
              ),
            ),
            const SizedBox(width: 16),
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
                            fontSize: 14,
                            fontWeight: notification.isUnread ? FontWeight.w900 : FontWeight.w700,
                            color: AppColors.textPrimary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Text(
                        _formatDate(notification.createdAt, l10n),
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          color: AppColors.textHint,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    notification.message,
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      color: AppColors.textSecondary,
                      height: 1.5,
                      fontWeight: notification.isUnread ? FontWeight.w600 : FontWeight.w400,
                    ),
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
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
    if (lower.contains('bron') || lower.contains('бронь') || lower.contains('reservation')) {
      return Icons.receipt_long_rounded;
    } else if (lower.contains('visit') || lower.contains('визит') || lower.contains('tashrif')) {
      return Icons.calendar_today_rounded;
    } else if (lower.contains('bonus') || lower.contains('бонус') || lower.contains('payment') || lower.contains('оплата')) {
      return Icons.account_balance_wallet_rounded;
    } else if (lower.contains('врач') || lower.contains('doctor') || lower.contains('shifokor')) {
      return Icons.medical_services_rounded;
    }
    return Icons.notifications_rounded;
  }
}
