import 'package:flutter/foundation.dart';

@immutable
class WarehouseModel {
  final int id;
  final String name;
  final String warehouseType;
  final bool isWholesale;

  const WarehouseModel({
    required this.id,
    required this.name,
    required this.warehouseType,
    this.isWholesale = false,
  });

  factory WarehouseModel.fromJson(Map<String, dynamic> json) {
    return WarehouseModel(
      id: json['id'] as int? ?? 0,
      name: json['name'] as String? ?? '',
      warehouseType: json['warehouse_type'] as String? ?? '',
      isWholesale: json['is_wholesale'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'warehouse_type': warehouseType,
      'is_wholesale': isWholesale,
    };
  }
}
