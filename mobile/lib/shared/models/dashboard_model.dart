class RevenueForecastPoint {
  final String label;
  final double value;

  const RevenueForecastPoint({required this.label, required this.value});

  factory RevenueForecastPoint.fromJson(Map<String, dynamic> json) {
    return RevenueForecastPoint(
      label: json['label'] as String? ?? json['month'] as String? ?? '',
      value: (json['value'] as num?)?.toDouble() ??
          (json['amount'] as num?)?.toDouble() ?? 0.0,
    );
  }
}

class DashboardStatsModel {
  final double totalSales;
  final int activeDoctors;
  final int pendingReservations;
  final double totalDebt;
  final double totalOverdueDebt;
  final List<RevenueForecastPoint> revenueForecast;
  final int completedVisits;
  final int plannedVisits;
  final double bonusBalance;

  const DashboardStatsModel({
    required this.totalSales,
    required this.activeDoctors,
    required this.pendingReservations,
    required this.totalDebt,
    required this.totalOverdueDebt,
    required this.revenueForecast,
    required this.completedVisits,
    required this.plannedVisits,
    required this.bonusBalance,
  });

  factory DashboardStatsModel.fromJson(Map<String, dynamic> json) {
    final forecastList = json['revenue_forecast'] as List<dynamic>? ?? [];
    return DashboardStatsModel(
      totalSales: (json['total_sales'] as num?)?.toDouble() ?? 0.0,
      activeDoctors: json['active_doctors'] as int? ?? 0,
      pendingReservations: json['pending_reservations'] as int? ?? 0,
      totalDebt: (json['total_debt'] as num?)?.toDouble() ?? 0.0,
      totalOverdueDebt: (json['total_overdue_debt'] as num?)?.toDouble() ?? 0.0,
      revenueForecast: forecastList
          .map((e) => RevenueForecastPoint.fromJson(e as Map<String, dynamic>))
          .toList(),
      completedVisits: json['completed_visits'] as int? ?? 0,
      plannedVisits: json['planned_visits'] as int? ?? 0,
      bonusBalance: (json['bonus_balance'] as num?)?.toDouble() ?? 0.0,
    );
  }

  factory DashboardStatsModel.empty() {
    return const DashboardStatsModel(
      totalSales: 0,
      activeDoctors: 0,
      pendingReservations: 0,
      totalDebt: 0,
      totalOverdueDebt: 0,
      revenueForecast: [],
      completedVisits: 0,
      plannedVisits: 0,
      bonusBalance: 0,
    );
  }
}
