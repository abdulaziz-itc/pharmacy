import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../doctors/providers/doctors_provider.dart';
import '../../products/providers/products_provider.dart';
import '../providers/bonus_provider.dart';

class AllocationDialog extends ConsumerStatefulWidget {
  final double availableBalance;
  
  const AllocationDialog({super.key, required this.availableBalance});

  @override
  ConsumerState<AllocationDialog> createState() => _AllocationDialogState();
}

class _AllocationDialogState extends ConsumerState<AllocationDialog> {
  final _formKey = GlobalKey<FormState>();
  final _amountController = TextEditingController();
  final _notesController = TextEditingController();
  
  int? _selectedDoctorId;
  int? _selectedProductId;
  DateTime _selectedDate = DateTime.now();
  bool _isSubmitting = false;

  @override
  void dispose() {
    _amountController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final l10n = context.l10n;
    if (!_formKey.currentState!.validate()) return;
    if (_selectedDoctorId == null || _selectedProductId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.selectDoctorProductError)),
      );
      return;
    }

    setState(() => _isSubmitting = true);
    
    final success = await ref.read(bonusProvider.notifier).allocateBonus(
      doctorId: _selectedDoctorId!,
      productId: _selectedProductId!,
      amount: double.parse(_amountController.text),
      month: _selectedDate.month,
      year: _selectedDate.year,
      notes: _notesController.text,
    );

    if (mounted) {
      setState(() => _isSubmitting = false);
      if (success) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(l10n.allocationSuccess)),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(l10n.allocationError)),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final doctorsState = ref.watch(doctorsProvider);
    final productsAsync = ref.watch(productsProvider);
    final l10n = context.l10n;

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      l10n.attachToDoctorTitle,
                      style: GoogleFonts.poppins(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
                const Divider(),
                const SizedBox(height: 16),
                
                // Doctor Selection
                Text(l10n.selectDoctor, style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 13)),
                const SizedBox(height: 8),
                DropdownButtonFormField<int>(
                  decoration: _inputDecoration(l10n.searchDoctorHint),
                  items: doctorsState.doctors.map((d) {
                    return DropdownMenuItem(
                      value: d.id,
                      child: Text(d.fullName, style: const TextStyle(fontSize: 13)),
                    );
                  }).toList(),
                  onChanged: (val) => setState(() => _selectedDoctorId = val),
                  validator: (val) => val == null ? l10n.selectDoctor : null,
                ),
                const SizedBox(height: 16),

                // Product Selection
                Text(l10n.selectProduct, style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 13)),
                const SizedBox(height: 8),
                productsAsync.when(
                  data: (products) => DropdownButtonFormField<int>(
                    decoration: _inputDecoration(l10n.searchProduct),
                    items: products.map((p) {
                      return DropdownMenuItem(
                        value: p.id,
                        child: Text(p.name, style: const TextStyle(fontSize: 13)),
                      );
                    }).toList(),
                    onChanged: (val) => setState(() => _selectedProductId = val),
                    validator: (val) => val == null ? l10n.selectProduct : null,
                  ),
                  loading: () => const LinearProgressIndicator(),
                  error: (e, _) => Text('${l10n.errorLoading} $e'),
                ),
                const SizedBox(height: 16),

                // Amount
                Text('${l10n.enterAmount} (${l10n.availableBalance}: ${NumberFormat('#,##0').format(widget.availableBalance)} UZS)', 
                  style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 13)),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _amountController,
                  keyboardType: TextInputType.number,
                  decoration: _inputDecoration(l10n.enterAmount),
                  validator: (val) {
                    if (val == null || val.isEmpty) return l10n.enterAmount;
                    final amount = double.tryParse(val);
                    if (amount == null) return l10n.error;
                    if (amount > widget.availableBalance) return l10n.debtRemainder; // Reuse debtRemainder for insufficient funds
                    if (amount <= 0) return l10n.error;
                    return null;
                  },
                ),
                const SizedBox(height: 16),

                // Date Picker (Month/Year)
                Text(l10n.periodLabel, style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 13)),
                const SizedBox(height: 8),
                InkWell(
                  onTap: () async {
                    final date = await showDatePicker(
                      context: context,
                      initialDate: _selectedDate,
                      firstDate: DateTime(2020),
                      lastDate: DateTime(2100),
                    );
                    if (date != null) setState(() => _selectedDate = date);
                  },
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.grey.shade300),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.calendar_today, size: 16, color: Colors.blue),
                        const SizedBox(width: 8),
                        Text(DateFormat('MMMM yyyy', l10n.locale.languageCode).format(_selectedDate)),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // Notes
                Text(l10n.notesPlaceholder, style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 13)),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _notesController,
                  decoration: _inputDecoration(l10n.notesPlaceholder),
                  maxLines: 2,
                ),
                const SizedBox(height: 24),

                ElevatedButton(
                  onPressed: _isSubmitting ? null : _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2563EB),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: _isSubmitting 
                    ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : Text(l10n.submitAllocation),
                ),
shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: _isSubmitting 
                    ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Text('Подтвердить распределение'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  InputDecoration _inputDecoration(String hint) {
    return InputDecoration(
      hintText: hint,
      isDense: true,
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: BorderSide(color: Colors.grey.shade300),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: BorderSide(color: Colors.grey.shade300),
      ),
    );
  }
}
