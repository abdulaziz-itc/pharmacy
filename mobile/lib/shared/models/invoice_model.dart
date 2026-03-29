class PaymentModel {
  final int id;
  final double amount;
  final String date;
  final String? type;
  final String? comment;

  const PaymentModel({
    required this.id,
    required this.amount,
    required this.date,
    this.type,
    this.comment,
  });

  factory PaymentModel.fromJson(Map<String, dynamic> json) {
    return PaymentModel(
      id: json['id'] as int? ?? 0,
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      date: json['date'] as String? ?? '',
      type: json['payment_type'] as String?,
      comment: json['comment'] as String?,
    );
  }
}

class InvoiceModel {
  final int id;
  final String date;
  final double totalAmount;
  final double paidAmount;
  final String status;
  final int? reservationId;
  final String? facturaNumber;
  final String? realizationDate;
  final List<PaymentModel> payments;
  final String? customerName;

  const InvoiceModel({
    required this.id,
    required this.date,
    required this.totalAmount,
    required this.paidAmount,
    required this.status,
    this.reservationId,
    this.facturaNumber,
    this.realizationDate,
    this.payments = const [],
    this.customerName,
  });

  double get debt => totalAmount - paidAmount;
  bool get hasDebt => debt > 0 && status != 'paid' && status != 'cancelled';

  factory InvoiceModel.fromJson(Map<String, dynamic> json) {
    final paymentsList = json['payments'] as List<dynamic>? ?? [];
    return InvoiceModel(
      id: json['id'] as int? ?? 0,
      date: json['date'] as String? ?? '',
      totalAmount: (json['total_amount'] as num?)?.toDouble() ?? 0.0,
      paidAmount: (json['paid_amount'] as num?)?.toDouble() ?? 0.0,
      status: json['status'] as String? ?? 'unpaid',
      reservationId: json['reservation_id'] as int?,
      facturaNumber: json['factura_number'] as String?,
      realizationDate: json['realization_date'] as String?,
      payments: paymentsList
          .map((e) => PaymentModel.fromJson(e as Map<String, dynamic>))
          .toList(),
      customerName: json['customer_name'] as String? ?? 
          (json['reservation'] != null ? json['reservation']['customer_name'] as String? : null),
    );
  }

  String get displayStatus {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'To\'langan';
      case 'partial':
        return 'Qisman';
      case 'unpaid':
        return 'To\'lanmagan';
      case 'cancelled':
        return 'Bekor qilingan';
      case 'returned':
        return 'Qaytarilgan';
      default:
        return status;
    }
  }
}
