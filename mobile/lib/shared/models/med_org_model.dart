class MedOrgModel {
  final int id;
  final String name;
  final String? orgType;
  final String? address;
  final String? regionName;
  final int? doctorsCount;

  const MedOrgModel({
    required this.id,
    required this.name,
    this.orgType,
    this.address,
    this.regionName,
    this.doctorsCount,
  });

  factory MedOrgModel.fromJson(Map<String, dynamic> json) {
    return MedOrgModel(
      id: json['id'] as int? ?? 0,
      name: json['name'] as String? ?? '',
      orgType: json['org_type'] as String?,
      address: json['address'] as String?,
      regionName: json['region'] is Map
          ? (json['region'] as Map<String, dynamic>)['name'] as String?
          : json['region'] as String?,
      doctorsCount: json['doctors_count'] as int?,
    );
  }

  String get displayType {
    switch (orgType?.toLowerCase()) {
      case 'hospital':
        return 'Больница';
      case 'clinic':
        return 'Клиника';
      case 'pharmacy':
        return 'Аптека';
      case 'polyclinic':
        return 'Поликлиника';
      case 'wholesale':
        return 'Оптовик';
      default:
        return orgType ?? 'Другое';
    }
  }
}
