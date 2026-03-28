class BonusHistoryItem {
  final int id;
  final String date;
  final double amount;
  final String type;
  final String? description;

  const BonusHistoryItem({
    required this.id,
    required this.date,
    required this.amount,
    required this.type,
    this.description,
  });

  factory BonusHistoryItem.fromJson(Map<String, dynamic> json) {
    return BonusHistoryItem(
      id: json['id'] as int? ?? 0,
      date: json['date'] as String? ?? json['created_at'] as String? ?? '',
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      type: json['type'] as String? ?? 'accrual',
      description: json['description'] as String?,
    );
  }

  bool get isAccrual => type.toLowerCase() == 'accrual' || amount > 0;

  String get displayType {
    switch (type.toLowerCase()) {
      case 'accrual':
        return 'Hisoblandi';
      case 'payment':
        return 'To\'landi';
      case 'deduction':
        return 'Ayirildi';
      default:
        return type;
    }
  }
}

class BonusBalanceModel {
  final double balance;
  final double totalAccrued;
  final double totalPaid;
  final List<BonusHistoryItem> history;

  const BonusBalanceModel({
    required this.balance,
    required this.totalAccrued,
    required this.totalPaid,
    required this.history,
  });

  factory BonusBalanceModel.fromJson(Map<String, dynamic> json) {
    final historyList = json['history'] as List<dynamic>? ?? [];
    return BonusBalanceModel(
      balance: (json['balance'] as num?)?.toDouble() ?? 0.0,
      totalAccrued: (json['total_accrued'] as num?)?.toDouble() ?? 0.0,
      totalPaid: (json['total_paid'] as num?)?.toDouble() ?? 0.0,
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
      history: [],
    );
  }
}
