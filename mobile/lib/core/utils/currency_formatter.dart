import 'package:intl/intl.dart';

class CurrencyFormatter {
  static final NumberFormat _formatter = NumberFormat.currency(
    locale: 'uz_UZ',
    symbol: '',
    decimalDigits: 2,
  );

  static String format(dynamic value) {
    if (value == null) return '0,00';
    try {
      double amount;
      if (value is String) {
        // Strip out any non-numeric characters except comma/dot
        String clean = value.replaceAll(RegExp(r'[^0-9,.-]'), '').replaceAll('.', '').replaceAll(',', '.');
        amount = double.parse(clean);
      } else if (value is int) {
        amount = value.toDouble();
      } else if (value is double) {
        amount = value;
      } else {
        return '0,00';
      }
      
      return _formatter.format(amount).trim();
    } catch (e) {
      return '0,00';
    }
  }
}
