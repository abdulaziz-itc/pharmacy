class UserModel {
  final int id;
  final String fullName;
  final String username;
  final String role;
  final bool isActive;

  const UserModel({
    required this.id,
    required this.fullName,
    required this.username,
    required this.role,
    required this.isActive,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] as int? ?? 0,
      fullName: json['full_name'] as String? ?? '',
      username: json['username'] as String? ?? '',
      role: json['role'] as String? ?? '',
      isActive: json['is_active'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'full_name': fullName,
      'username': username,
      'role': role,
      'is_active': isActive,
    };
  }

  UserModel copyWith({
    int? id,
    String? fullName,
    String? username,
    String? role,
    bool? isActive,
  }) {
    return UserModel(
      id: id ?? this.id,
      fullName: fullName ?? this.fullName,
      username: username ?? this.username,
      role: role ?? this.role,
      isActive: isActive ?? this.isActive,
    );
  }

  String get displayRole {
    switch (role.toLowerCase()) {
      case 'med_rep':
        return 'Medical Representative';
      case 'admin':
        return 'Administrator';
      case 'manager':
        return 'Manager';
      default:
        return role;
    }
  }
}
