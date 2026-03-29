import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../providers/organizations_provider.dart';
import '../../doctors/providers/crm_lookups_provider.dart';

class CreateOrganizationScreen extends ConsumerStatefulWidget {
  const CreateOrganizationScreen({super.key});

  @override
  ConsumerState<CreateOrganizationScreen> createState() => _CreateOrganizationScreenState();
}

class _CreateOrganizationScreenState extends ConsumerState<CreateOrganizationScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _addressController = TextEditingController();
  final _innController = TextEditingController();
  final _directorController = TextEditingController();
  final _phoneController = TextEditingController();
  
  String? _selectedOrgType;
  int? _selectedRegionId;

  bool _isSubmitting = false;

  final List<Map<String, String>> _orgTypes = [
    {'value': 'clinic', 'label': 'Клиника'},
    {'value': 'pharmacy', 'label': 'Аптека'},
    {'value': 'hospital', 'label': 'Больница'},
    {'value': 'lechebniy', 'label': 'Лечебное заведение'},
    {'value': 'wholesale', 'label': 'Оптовик (Wholesale)'},
  ];

  @override
  void dispose() {
    _nameController.dispose();
    _addressController.dispose();
    _innController.dispose();
    _directorController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedRegionId == null || _selectedOrgType == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Пожалуйста, выберите Регион и Тип организации')),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final success = await ref.read(organizationsProvider.notifier).createOrganization({
        'name': _nameController.text.trim(),
        'org_type': _selectedOrgType,
        'region_id': _selectedRegionId,
        'address': _addressController.text.trim(),
        'inn': _innController.text.trim(),
        'director_name': _directorController.text.trim(),
        'contact_phone': _phoneController.text.trim(),
      });

      if (success) {
        if (mounted) {
          context.pop();
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Организация успешно добавлена')),
          );
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Ошибка при создании организации')),
          );
        }
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final regionsAsync = ref.watch(regionsProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Text(
          'Добавить организацию',
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
                label: 'Название организации *',
                icon: Icons.business_outlined,
                validator: (v) => v == null || v.isEmpty ? 'Введите название' : null,
              ),
              const SizedBox(height: 16),
              
              _buildDropdown<String>(
                label: 'Тип организации *',
                value: _selectedOrgType,
                items: _orgTypes.map((t) => DropdownMenuItem(value: t['value'], child: Text(t['label']!))).toList(),
                onChanged: (v) => setState(() => _selectedOrgType = v),
                icon: Icons.category_outlined,
              ),
              const SizedBox(height: 16),

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
              const SizedBox(height: 24),

              _buildSectionTitle('КОНТАКТЫ И ДЕТАЛИ'),
              const SizedBox(height: 12),
              _buildTextField(
                controller: _addressController,
                label: 'Адрес',
                icon: Icons.location_on_outlined,
              ),
              const SizedBox(height: 16),
              _buildTextField(
                controller: _innController,
                label: 'ИНН / Бренд',
                icon: Icons.info_outline,
              ),
              const SizedBox(height: 16),
              _buildTextField(
                controller: _directorController,
                label: 'Имя директора',
                icon: Icons.person_outline,
              ),
              const SizedBox(height: 16),
              _buildTextField(
                controller: _phoneController,
                label: 'Телефон',
                icon: Icons.phone_outlined,
                keyboardType: TextInputType.phone,
              ),
              
              const SizedBox(height: 40),
              
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: _isSubmitting ? null : _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF10B981),
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
          prefixIcon: Icon(icon, color: const Color(0xFF10B981), size: 20),
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
          prefixIcon: Icon(icon, color: const Color(0xFF10B981), size: 20),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
          filled: true,
          fillColor: Colors.white,
        ),
      ),
    );
  }
}
