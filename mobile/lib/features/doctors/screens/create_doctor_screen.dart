import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../providers/doctors_provider.dart';
import '../providers/crm_lookups_provider.dart';
import '../../organizations/providers/organizations_provider.dart';

class CreateDoctorScreen extends ConsumerStatefulWidget {
  const CreateDoctorScreen({super.key});

  @override
  ConsumerState<CreateDoctorScreen> createState() => _CreateDoctorScreenState();
}

class _CreateDoctorScreenState extends ConsumerState<CreateDoctorScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _contactController = TextEditingController();
  
  int? _selectedSpecialtyId;
  int? _selectedCategoryId;
  int? _selectedRegionId;
  int? _selectedOrgId;

  bool _isSubmitting = false;

  @override
  void dispose() {
    _nameController.dispose();
    _contactController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedRegionId == null || _selectedSpecialtyId == null || _selectedOrgId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Пожалуйста, заполните обязательные поля (Регион, Специальность, Организация)')),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final success = await ref.read(doctorsProvider.notifier).createDoctor({
        'full_name': _nameController.text.trim(),
        'contact1': _contactController.text.trim(),
        'specialty_id': _selectedSpecialtyId,
        'category_id': _selectedCategoryId,
        'region_id': _selectedRegionId,
        'med_org_id': _selectedOrgId,
        'is_active': true,
      });

      if (success) {
        if (mounted) {
          context.pop();
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Врач успешно добавлен')),
          );
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Ошибка при создании врача')),
          );
        }
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final specialtiesAsync = ref.watch(specialtiesProvider);
    final categoriesAsync = ref.watch(doctorCategoriesProvider);
    final regionsAsync = ref.watch(regionsProvider);
    final organizationsState = ref.watch(organizationsProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Text(
          'Добавить врача',
          style: GoogleFonts.inter(fontWeight: FontWeight.bold, color: Colors.black87),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.black87),
          onPressed: () => context.pop(),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildSectionTitle('ОСНОВНАЯ ИНФОРМАЦИЯ'),
              const SizedBox(height: 12),
              _buildTextField(
                controller: _nameController,
                label: 'ФИО Врача *',
                icon: Icons.person_outline,
                validator: (v) => v == null || v.isEmpty ? 'Введите ФИО' : null,
              ),
              const SizedBox(height: 16),
              _buildTextField(
                controller: _contactController,
                label: 'Контактный телефон',
                icon: Icons.phone_outlined,
                keyboardType: TextInputType.phone,
              ),
              const SizedBox(height: 24),
              _buildSectionTitle('КАТЕГОРИЗАЦИЯ'),
              const SizedBox(height: 12),
              
              // Specialty Dropdown
              specialtiesAsync.when(
                data: (list) => _buildDropdown<int>(
                  label: 'Специальность *',
                  value: _selectedSpecialtyId,
                  items: list.map((e) => DropdownMenuItem(value: e.id, child: Text(e.name))).toList(),
                  onChanged: (v) => setState(() => _selectedSpecialtyId = v),
                  icon: Icons.medical_services_outlined,
                ),
                loading: () => const LinearProgressIndicator(),
                error: (_, __) => const Text('Ошибка загрузки специальностей'),
              ),
              const SizedBox(height: 16),

              // Category Dropdown
              categoriesAsync.when(
                data: (list) => _buildDropdown<int>(
                  label: 'Категория',
                  value: _selectedCategoryId,
                  items: list.map((e) => DropdownMenuItem(value: e.id, child: Text(e.name))).toList(),
                  onChanged: (v) => setState(() => _selectedCategoryId = v),
                  icon: Icons.star_outline,
                ),
                loading: () => const LinearProgressIndicator(),
                error: (_, __) => const Text('Ошибка загрузки категорий'),
              ),
              const SizedBox(height: 24),

              _buildSectionTitle('ЛОКАЦИЯ И МЕСТО РАБОТЫ'),
              const SizedBox(height: 12),

              // Region Dropdown
              regionsAsync.when(
                data: (list) => _buildDropdown<int>(
                  label: 'Регион *',
                  value: _selectedRegionId,
                  items: list.map((e) => DropdownMenuItem(value: e.id, child: Text(e.name))).toList(),
                  onChanged: (v) => setState(() => _selectedRegionId = v),
                  icon: Icons.map_outlined,
                ),
                loading: () => const LinearProgressIndicator(),
                error: (_, __) => const Text('Ошибка загрузки регионов'),
              ),
              const SizedBox(height: 16),

              // Organization Dropdown
              _buildDropdown<int>(
                label: 'Организация *',
                value: _selectedOrgId,
                items: organizationsState.organizations.map((e) => DropdownMenuItem(value: e.id, child: Text(e.name))).toList(),
                onChanged: (v) => setState(() => _selectedOrgId = v),
                icon: Icons.business_outlined,
              ),
              
              const SizedBox(height: 40),
              
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: _isSubmitting ? null : _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2563EB),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    elevation: 0,
                  ),
                  child: _isSubmitting
                      ? const CircularProgressIndicator(color: Colors.white)
                      : Text(
                          'СОХРАНИТЬ',
                          style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.bold, letterSpacing: 1),
                        ),
                ),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: GoogleFonts.inter(
        fontSize: 12,
        fontWeight: FontWeight.w800,
        color: Colors.blueGrey[400],
        letterSpacing: 1.2,
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    TextInputType? keyboardType,
    String? Function(String?)? validator,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      child: TextFormField(
        controller: controller,
        keyboardType: keyboardType,
        validator: validator,
        decoration: InputDecoration(
          labelText: label,
          prefixIcon: Icon(icon, color: const Color(0xFF2563EB), size: 20),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
          filled: true,
          fillColor: Colors.white,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        ),
      ),
    );
  }

  Widget _buildDropdown<T>({
    required String label,
    required T? value,
    required List<DropdownMenuItem<T>> items,
    required void Function(T?) onChanged,
    required IconData icon,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      child: DropdownButtonFormField<T>(
        value: value,
        items: items,
        onChanged: onChanged,
        decoration: InputDecoration(
          labelText: label,
          prefixIcon: Icon(icon, color: const Color(0xFF2563EB), size: 20),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
          filled: true,
          fillColor: Colors.white,
        ),
      ),
    );
  }
}
