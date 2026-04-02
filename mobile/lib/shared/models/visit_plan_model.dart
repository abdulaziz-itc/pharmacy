class DoctorRef {
  final int id;
  final String fullName;

  const DoctorRef({required this.id, required this.fullName});

  factory DoctorRef.fromJson(Map<String, dynamic> json) {
    return DoctorRef(
      id: json['id'] as int? ?? 0,
      fullName: json['full_name'] as String? ?? '',
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

class MedRepRef {
  final int id;
  final String fullName;

  const MedRepRef({required this.id, required this.fullName});

  factory MedRepRef.fromJson(Map<String, dynamic> json) {
    return MedRepRef(
      id: json['id'] as int? ?? 0,
      fullName: json['full_name'] as String? ?? '',
    );
  }
}

class VisitPlanModel {
  final int id;
  final String plannedDate;
  final DoctorRef? doctor;
  final MedOrgRef? medOrg;
  final MedRepRef? medRep;
  final String? subject;
  final bool isCompleted;
  final String? visitType;
  final String? notes;
  final String? completedAt;

  const VisitPlanModel({
    required this.id,
    required this.plannedDate,
    this.doctor,
    this.medOrg,
    this.medRep,
    this.subject,
    required this.isCompleted,
    this.visitType,
    this.notes,
    this.completedAt,
  });

  factory VisitPlanModel.fromJson(Map<String, dynamic> json) {
    return VisitPlanModel(
      id: json['id'] as int? ?? 0,
      plannedDate: json['planned_date'] as String? ?? '',
      doctor: json['doctor'] != null
          ? DoctorRef.fromJson(json['doctor'] as Map<String, dynamic>)
          : null,
      medOrg: json['med_org'] != null
          ? MedOrgRef.fromJson(json['med_org'] as Map<String, dynamic>)
          : null,
      medRep: json['med_rep'] != null
          ? MedRepRef.fromJson(json['med_rep'] as Map<String, dynamic>)
          : null,
      subject: json['subject'] as String?,
      isCompleted: json['is_completed'] as bool? ?? false,
      visitType: json['visit_type'] as String?,
      notes: json['notes'] as String?,
      completedAt: json['completed_at'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'planned_date': plannedDate,
      if (doctor != null) 'doctor_id': doctor!.id,
      if (medOrg != null) 'med_org_id': medOrg!.id,
      if (subject != null) 'subject': subject,
      'is_completed': isCompleted,
      if (visitType != null) 'visit_type': visitType,
      if (notes != null) 'notes': notes,
      if (completedAt != null) 'completed_at': completedAt,
    };
  }

  String get displayVisitType => visitType ?? 'Визит';
}
