class NotificationModel {
  final int id;
  final String topic;
  final String message;
  final String status;
  final String createdAt;

  const NotificationModel({
    required this.id,
    required this.topic,
    required this.message,
    required this.status,
    required this.createdAt,
  });

  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    return NotificationModel(
      id: json['id'] as int? ?? 0,
      topic: json['topic'] as String? ?? '',
      message: json['message'] as String? ?? '',
      status: json['status'] as String? ?? 'unread',
      createdAt: json['created_at'] as String? ?? '',
    );
  }

  bool get isUnread => status.toLowerCase() == 'unread';

  NotificationModel copyWith({
    int? id,
    String? topic,
    String? message,
    String? status,
    String? createdAt,
  }) {
    return NotificationModel(
      id: id ?? this.id,
      topic: topic ?? this.topic,
      message: message ?? this.message,
      status: status ?? this.status,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}
