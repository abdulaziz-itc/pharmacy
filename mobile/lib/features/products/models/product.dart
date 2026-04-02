class Product {
  final int id;
  final String name;
  final double price;
  final String? categoryName;
  final List<String>? manufacturers;

  final double marketingExpense;

  Product({
    required this.id,
    required this.name,
    required this.price,
    this.categoryName,
    this.manufacturers,
    this.marketingExpense = 0.0,
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: json['id'],
      name: json['name'],
      price: (json['price'] as num).toDouble(),
      categoryName: json['category'] != null ? json['category']['name'] : null,
      manufacturers: json['manufacturers'] != null
          ? (json['manufacturers'] as List)
              .map((m) => m['name'] as String)
              .toList()
          : null,
      marketingExpense: (json['marketing_expense'] as num?)?.toDouble() ?? 0.0,
    );
  }
}
