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

class VisitPlanModel {
  final int id;
  final String plannedDate;
  final DoctorRef? doctor;
  final String? subject;
  final bool isCompleted;
  final String? visitType;
  final String? notes;
  final String? completedAt;

  const VisitPlanModel({
    required this.id,
    required this.plannedDate,
    this.doctor,
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
      if (subject != null) 'subject': subject,
      'is_completed': isCompleted,
      if (visitType != null) 'visit_type': visitType,
      if (notes != null) 'notes': notes,
    };
  }

  String get displayVisitType {
    switch (visitType?.toLowerCase()) {
      case 'field':
        return 'Dala tashrifi';
      case 'office':
        return 'Ofis tashrifi';
      case 'online':
        return 'Online';
      default:
        return visitType ?? 'Tashrifot';
    }
  }
}
