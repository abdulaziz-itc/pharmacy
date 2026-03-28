import 'package:flutter/foundation.dart';

@immutable
class ProductModel {
  final int id;
  final String name;
  final double price;
  final double productionPrice;
  final String? categoryName;
  final int? categoryId;
  final double marketingExpense;
  final bool isActive;

  const ProductModel({
    required this.id,
    required this.name,
    required this.price,
    required this.productionPrice,
    this.categoryName,
    this.categoryId,
    this.marketingExpense = 0.0,
    this.isActive = true,
  });

  factory ProductModel.fromJson(Map<String, dynamic> json) {
    return ProductModel(
      id: json['id'] as int? ?? 0,
      name: json['name'] as String? ?? '',
      price: (json['price'] as num?)?.toDouble() ?? 0.0,
      productionPrice: (json['production_price'] as num?)?.toDouble() ?? 0.0,
      categoryName: json['category'] is Map 
          ? (json['category'] as Map<String, dynamic>)['name'] as String? 
          : null,
      categoryId: json['category_id'] as int?,
      marketingExpense: (json['marketing_expense'] as num?)?.toDouble() ?? 0.0,
      isActive: json['is_active'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'price': price,
      'production_price': productionPrice,
      'category_id': categoryId,
      'marketing_expense': marketingExpense,
      'is_active': isActive,
    };
  }
}
