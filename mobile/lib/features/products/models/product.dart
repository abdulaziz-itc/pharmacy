class Product {
  final int id;
  final String name;
  final double price;
  final String? categoryName;
  final List<String>? manufacturers;

  Product({
    required this.id,
    required this.name,
    required this.price,
    this.categoryName,
    this.manufacturers,
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
    );
  }
}
