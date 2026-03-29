class BonusHistoryItem {
  final int id;
  final String date;
  final double amount;
  final String type;
  final String? description;

  final int? doctorId;
  final String? doctorName;
  final int? productId;
  final String? productName;
  final int? targetMonth;
  final int? targetYear;
  final bool isPaid;
  final int? invoiceId;
  final int? reservationId;

  const BonusHistoryItem({
    required this.id,
    required this.date,
    required this.amount,
    required this.type,
    this.description,
    this.doctorId,
    this.doctorName,
    this.productId,
    this.productName,
    this.targetMonth,
    this.targetYear,
    this.isPaid = false,
    this.invoiceId,
    this.reservationId,
  });

  factory BonusHistoryItem.fromJson(Map<String, dynamic> json) {
    final doctor = json['doctor'] as Map<String, dynamic>?;
    final product = json['product'] as Map<String, dynamic>?;

    return BonusHistoryItem(
      id: json['id'] as int? ?? 0,
      date: json['date'] as String? ?? json['created_at'] as String? ?? '',
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      type: json['ledger_type'] as String? ?? json['type'] as String? ?? 'accrual',
      description: json['notes'] as String? ?? json['description'] as String?,
      doctorId: doctor != null ? doctor['id'] as int? : json['doctor_id'] as int?,
      doctorName: doctor != null ? doctor['full_name'] as String? : null,
      productId: product != null ? product['id'] as int? : json['product_id'] as int?,
      productName: product != null ? product['name'] as String? : null,
      targetMonth: json['target_month'] as int?,
      targetYear: json['target_year'] as int?,
      isPaid: json['is_paid'] as bool? ?? false,
      invoiceId: json['invoice_id'] as int?,
      reservationId: json['reservation_id'] as int?,
    );
  }

  bool get isAccrual => type.toLowerCase() == 'accrual' || (type.toLowerCase() == 'payment' && amount > 0);
  bool get isAllocation => type.toLowerCase() == 'offset';

  String get displayType {
    switch (type.toLowerCase()) {
      case 'accrual':
        return 'Начислено';
      case 'payment':
        return 'Выплачено';
      case 'offset':
        return 'Распределено';
      case 'reversal':
        return 'Возврат';
      default:
        return type;
    }
  }
}

class BonusBalanceModel {
  final double balance;
  final double totalAccrued;
  final double totalPaid;
  final double totalAllocated;
  final List<BonusHistoryItem> history;

  const BonusBalanceModel({
    required this.balance,
    required this.totalAccrued,
    required this.totalPaid,
    required this.totalAllocated,
    required this.history,
  });

  factory BonusBalanceModel.fromJson(Map<String, dynamic> json) {
    final historyList = json['history'] as List<dynamic>? ?? [];
    return BonusBalanceModel(
      balance: (json['balance'] as num?)?.toDouble() ?? 0.0,
      totalAccrued: (json['total_accrued'] as num?)?.toDouble() ?? 0.0,
      totalPaid: (json['total_paid'] as num?)?.toDouble() ?? 0.0,
      totalAllocated: (json['total_allocated'] as num?)?.toDouble() ?? 0.0,
      history: historyList
          .map((e) => BonusHistoryItem.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  factory BonusBalanceModel.empty() {
    return const BonusBalanceModel(
      balance: 0,
      totalAccrued: 0,
      totalPaid: 0,
      totalAllocated: 0,
      history: [],
    );
  }
}
