import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import '../../../shared/models/notification_model.dart';

enum NotifLoadStatus { initial, loading, loaded, error }

class NotificationsState {
  final NotifLoadStatus status;
  final List<NotificationModel> notifications;
  final String? errorMessage;

  const NotificationsState({
    required this.status,
    required this.notifications,
    this.errorMessage,
  });

  const NotificationsState.initial()
      : this(
          status: NotifLoadStatus.initial,
          notifications: const [],
        );

  NotificationsState copyWith({
    NotifLoadStatus? status,
    List<NotificationModel>? notifications,
    String? errorMessage,
  }) {
    return NotificationsState(
      status: status ?? this.status,
      notifications: notifications ?? this.notifications,
      errorMessage: errorMessage,
    );
  }

  int get unreadCount =>
      notifications.where((n) => n.isUnread).length;
}

class NotificationsNotifier extends StateNotifier<NotificationsState> {
  final ApiClient _apiClient;

  NotificationsNotifier(this._apiClient)
      : super(const NotificationsState.initial());

  Future<void> loadNotifications() async {
    state = state.copyWith(
        status: NotifLoadStatus.loading, errorMessage: null);
    try {
      final response = await _apiClient.get(
        ApiEndpoints.notifications,
        queryParameters: {'skip': 0, 'limit': 100},
      );
      List<NotificationModel> notifications = [];
      final data = response.data;
      if (data is List) {
        notifications = data
            .map((e) => NotificationModel.fromJson(e as Map<String, dynamic>))
            .toList();
      } else if (data is Map && data.containsKey('items')) {
        notifications = (data['items'] as List)
            .map((e) => NotificationModel.fromJson(e as Map<String, dynamic>))
            .toList();
      }
      state = state.copyWith(
        status: NotifLoadStatus.loaded,
        notifications: notifications,
      );
    } catch (e) {
      state = state.copyWith(
        status: NotifLoadStatus.error,
        errorMessage: e.toString(),
      );
    }
  }

  Future<void> markAsRead(int id) async {
    try {
      await _apiClient.put(ApiEndpoints.markNotificationRead(id));
      final updated = state.notifications.map((n) {
        if (n.id == id) {
          return n.copyWith(status: 'read');
        }
        return n;
      }).toList();
      state = state.copyWith(notifications: updated);
    } catch (e) {
      // silently fail
    }
  }

  Future<void> markAllAsRead() async {
    final unread = state.notifications.where((n) => n.isUnread).toList();
    for (final n in unread) {
      await markAsRead(n.id);
    }
  }
}

final notificationsProvider =
    StateNotifierProvider<NotificationsNotifier, NotificationsState>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return NotificationsNotifier(apiClient);
});

final unreadNotifCountProvider = Provider<int>((ref) {
  return ref.watch(notificationsProvider).unreadCount;
});
