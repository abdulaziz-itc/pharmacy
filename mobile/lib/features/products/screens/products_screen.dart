import 'package:flutter/material.dart';
import '../../../shared/widgets/empty_view.dart';

class ProductsScreen extends StatelessWidget {
  const ProductsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Mahsulotlar')),
      body: const EmptyView(
        title: 'Mahsulotlar bo\'limi',
        subtitle: 'Tez kunda barcha mahsulotlar ro\'yxati shu yerda bo\'ladi',
      ),
    );
  }
}
