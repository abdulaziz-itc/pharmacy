class SpecialtyModel {
  final int id;
  final String name;

  const SpecialtyModel({required this.id, required this.name});

  factory SpecialtyModel.fromJson(Map<String, dynamic> json) {
    return SpecialtyModel(
      id: json['id'] as int? ?? 0,
      name: json['name'] as String? ?? '',
    );
  }
}

class CategoryModel {
  final int id;
  final String name;

  const CategoryModel({required this.id, required this.name});

  factory CategoryModel.fromJson(Map<String, dynamic> json) {
    return CategoryModel(
      id: json['id'] as int? ?? 0,
      name: json['name'] as String? ?? '',
    );
  }
}

class RegionModel {
  final int id;
  final String name;

  const RegionModel({required this.id, required this.name});

  factory RegionModel.fromJson(Map<String, dynamic> json) {
    return RegionModel(
      id: json['id'] as int? ?? 0,
      name: json['name'] as String? ?? '',
    );
  }
}

class MedOrgRef {
  final int id;
  final String name;

  const MedOrgRef({required this.id, required this.name});

  factory MedOrgRef.fromJson(Map<String, dynamic> json) {
    return MedOrgRef(
      id: json['id'] as int? ?? 0,
      name: json['name'] as String? ?? '',
    );
  }
}

class DoctorModel {
  final int id;
  final String fullName;
  final String? contact1;
  final String? contact2;
  final SpecialtyModel? specialty;
  final CategoryModel? category;
  final MedOrgRef? medOrg;
  final RegionModel? region;
  final bool isActive;

  const DoctorModel({
    required this.id,
    required this.fullName,
    this.contact1,
    this.contact2,
    this.specialty,
    this.category,
    this.medOrg,
    this.region,
    required this.isActive,
  });

  factory DoctorModel.fromJson(Map<String, dynamic> json) {
    return DoctorModel(
      id: json['id'] as int? ?? 0,
      fullName: json['full_name'] as String? ?? '',
      contact1: json['contact1'] as String?,
      contact2: json['contact2'] as String?,
      specialty: json['specialty'] != null
          ? SpecialtyModel.fromJson(json['specialty'] as Map<String, dynamic>)
          : null,
      category: json['category'] != null
          ? CategoryModel.fromJson(json['category'] as Map<String, dynamic>)
          : null,
      medOrg: json['med_org'] != null
          ? MedOrgRef.fromJson(json['med_org'] as Map<String, dynamic>)
          : null,
      region: json['region'] != null
          ? RegionModel.fromJson(json['region'] as Map<String, dynamic>)
          : null,
      isActive: json['is_active'] as bool? ?? true,
    );
  }

  String get initials {
    final parts = fullName.trim().split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    } else if (parts.isNotEmpty && parts[0].isNotEmpty) {
      return parts[0][0].toUpperCase();
    }
    return '?';
  }
}

class DoctorPlan {
  final int id;
  final String productName;
  final int targetQuantity;
  final int factQuantity;
  final int month;
  final int year;
  final DoctorModel? doctor;
  final MedOrgRef? medOrg;

  const DoctorPlan({
    required this.id,
    required this.productName,
    required this.targetQuantity,
    required this.factQuantity,
    required this.month,
    required this.year,
    this.doctor,
    this.medOrg,
  });

  factory DoctorPlan.fromJson(Map<String, dynamic> json) {
    return DoctorPlan(
      id: json['id'] as int? ?? 0,
      productName: json['product']?['name'] as String? ?? 'N/A',
      targetQuantity: json['target_quantity'] as int? ?? 0,
      factQuantity: json['fact_quantity'] as int? ?? 0,
      month: json['month'] as int? ?? 0,
      year: json['year'] as int? ?? 0,
      doctor: json['doctor'] != null ? DoctorModel.fromJson(json['doctor'] as Map<String, dynamic>) : null,
      medOrg: json['med_org'] != null ? MedOrgRef.fromJson(json['med_org'] as Map<String, dynamic>) : null,
    );
  }

  double get percentage => targetQuantity > 0 
      ? (factQuantity / targetQuantity) * 100 
      : 0.0;
}
