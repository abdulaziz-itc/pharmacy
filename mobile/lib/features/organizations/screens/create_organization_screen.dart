import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/app_theme.dart';
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

  @override
  Widget build(BuildContext context) {
    final regionsAsync = ref.watch(regionsProvider);
    final l10n = context.l10n;

    final List<Map<String, String>> localizedOrgTypes = [
      {'value': 'clinic', 'label': l10n.clinicType},
      {'value': 'pharmacy', 'label': l10n.pharmacy},
      {'value': 'hospital', 'label': l10n.hospitalType},
      {'value': 'lechebniy', 'label': l10n.lechebniyType},
      {'value': 'wholesale', 'label': l10n.wholesaleTypeLabel},
    ];

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text(
          l10n.addOrganization,
          style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        centerTitle: false,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildSectionTitle(l10n.basicInfoTitle),
              const SizedBox(height: 16),
              _buildTextField(
                controller: _nameController,
                label: l10n.organizationNameReq,
                icon: Icons.business_outlined,
                validator: (v) => v == null || v.isEmpty ? l10n.enterName : null,
              ),
              const SizedBox(height: 16),
              
              _buildDropdown<String>(
                label: l10n.organizationTypeReq,
                value: _selectedOrgType,
                items: localizedOrgTypes.map((t) => DropdownMenuItem(value: t['value'], child: Text(t['label']!))).toList(),
                onChanged: (v) => setState(() => _selectedOrgType = v),
                icon: Icons.category_outlined,
              ),
              const SizedBox(height: 16),

              regionsAsync.when(
                data: (list) => _buildDropdown<int>(
                  label: l10n.regionReq,
                  value: _selectedRegionId,
                  items: list.map((e) => DropdownMenuItem(value: e.id, child: Text(e.name))).toList(),
                  onChanged: (v) => setState(() => _selectedRegionId = v),
                  icon: Icons.map_outlined,
                ),
                loading: () => const LinearProgressIndicator(color: AppColors.primary, backgroundColor: Color(0xFF1E293B)),
                error: (_, __) => Text(l10n.regionsLoadError, style: GoogleFonts.inter(color: AppColors.error)),
              ),
              const SizedBox(height: 32),

              _buildSectionTitle(l10n.contactsDetailsTitle),
              const SizedBox(height: 16),
              _buildTextField(
                controller: _addressController,
                label: l10n.addressLabel,
                icon: Icons.location_on_outlined,
              ),
              const SizedBox(height: 16),
              _buildTextField(
                controller: _innController,
                label: l10n.innBrand,
                icon: Icons.info_outline,
              ),
              const SizedBox(height: 16),
              _buildTextField(
                controller: _directorController,
                label: l10n.directorNameLabel,
                icon: Icons.person_outline,
              ),
              const SizedBox(height: 16),
              _buildTextField(
                controller: _phoneController,
                label: l10n.phoneLabel,
                icon: Icons.phone_outlined,
                keyboardType: TextInputType.phone,
              ),
              
              const SizedBox(height: 48),
              
              SizedBox(
                width: double.infinity,
                height: 58,
                child: ElevatedButton(
                  onPressed: _isSubmitting ? null : () => _submit(l10n),
                  child: _isSubmitting
                      ? const SizedBox(height: 24, width: 24, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                      : Text(l10n.save.toUpperCase()),
                ),
              ),
              const SizedBox(height: 24),
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
        fontSize: 11,
        fontWeight: FontWeight.w800,
        color: AppColors.textHint,
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
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Theme.of(context).dividerColor),
      ),
      child: TextFormField(
        controller: controller,
        keyboardType: keyboardType,
        validator: validator,
        style: GoogleFonts.inter(fontSize: 14),
        decoration: InputDecoration(
          labelText: label,
          labelStyle: GoogleFonts.inter(color: AppColors.textHint),
          prefixIcon: Icon(icon, color: AppColors.primary, size: 20),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
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
      padding: const EdgeInsets.symmetric(horizontal: 4),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Theme.of(context).dividerColor),
      ),
      child: DropdownButtonFormField<T>(
        value: value,
        items: items,
        onChanged: onChanged,
        dropdownColor: Theme.of(context).cardColor,
        style: GoogleFonts.inter(fontSize: 14),
        decoration: InputDecoration(
          labelText: label,
          labelStyle: GoogleFonts.inter(color: AppColors.textHint),
          prefixIcon: Icon(icon, color: AppColors.primary, size: 20),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        ),
      ),
    );
  }

  Future<void> _submit(S l10n) async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedRegionId == null || _selectedOrgType == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.selectRegionTypeWarning)),
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
            SnackBar(
              content: Text(l10n.organizationAddedSuccess),
              backgroundColor: AppColors.success,
            ),
          );
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(l10n.organizationCreateError),
              backgroundColor: AppColors.error,
            ),
          );
        }
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }
}
