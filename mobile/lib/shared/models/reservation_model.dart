class ReservationItemModel {
  final int id;
  final String productName;
  final int quantity;
  final double price;
  final double totalAmount;

  const ReservationItemModel({
    required this.id,
    required this.productName,
    required this.quantity,
    required this.price,
    required this.totalAmount,
  });

  factory ReservationItemModel.fromJson(Map<String, dynamic> json) {
    return ReservationItemModel(
      id: json['id'] as int? ?? 0,
      productName: json['product_name'] as String? ??
          (json['product'] is Map
              ? (json['product'] as Map<String, dynamic>)['name'] as String? ?? ''
              : ''),
      quantity: json['quantity'] as int? ?? 0,
      price: (json['price'] as num?)?.toDouble() ?? 0.0,
      totalAmount: (json['total_amount'] as num?)?.toDouble() ?? 0.0,
    );
  }
}

class ReservationModel {
  final int id;
  final String date;
  final String status;
  final double totalAmount;
  final String customerName;
  final List<ReservationItemModel> items;
  final String? invoice;
  final String? notes;

  const ReservationModel({
    required this.id,
    required this.date,
    required this.status,
    required this.totalAmount,
    required this.customerName,
    required this.items,
    this.invoice,
    this.notes,
  });

  factory ReservationModel.fromJson(Map<String, dynamic> json) {
    final itemsList = json['items'] as List<dynamic>? ?? [];
    return ReservationModel(
      id: json['id'] as int? ?? 0,
      date: json['date'] as String? ?? '',
      status: json['status'] as String? ?? 'pending',
      totalAmount: (json['total_amount'] as num?)?.toDouble() ?? 0.0,
      customerName: json['customer_name'] as String? ??
          (json['customer'] is Map
              ? (json['customer'] as Map<String, dynamic>)['name'] as String? ?? ''
              : ''),
      items: itemsList
          .map((e) => ReservationItemModel.fromJson(e as Map<String, dynamic>))
          .toList(),
      invoice: json['invoice'] as String?,
      notes: json['notes'] as String?,
    );
  }

  String get displayStatus {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'Kutilmoqda';
      case 'approved':
        return 'Tasdiqlangan';
      case 'cancelled':
        return 'Bekor qilingan';
      case 'completed':
        return 'Yakunlangan';
      default:
        return status;
    }
  }
}
