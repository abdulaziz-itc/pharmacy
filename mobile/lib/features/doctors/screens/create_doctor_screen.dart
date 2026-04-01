import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/app_theme.dart';
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
    final l10n = context.l10n;
    if (!_formKey.currentState!.validate()) return;
    if (_selectedRegionId == null || _selectedSpecialtyId == null || _selectedOrgId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(l10n.fillRequiredFields),
          backgroundColor: AppColors.error,
          behavior: SnackBarBehavior.floating,
        ),
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
            SnackBar(
              content: Text(l10n.doctorAddedSuccess),
              backgroundColor: AppColors.success,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(l10n.doctorCreateError),
              backgroundColor: AppColors.error,
              behavior: SnackBarBehavior.floating,
            ),
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
    final l10n = context.l10n;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text(
          l10n.addDoctorTitle,
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
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildSectionTitle(l10n.mainInfoSection),
              const SizedBox(height: 16),
              _buildTextField(
                controller: _nameController,
                label: '${l10n.doctorFullNameLabel} *',
                icon: Icons.person_outline_rounded,
                validator: (v) => v == null || v.isEmpty ? l10n.enterFullNameHint : null,
              ),
              const SizedBox(height: 16),
              _buildTextField(
                controller: _contactController,
                label: l10n.contactPhoneLabel,
                icon: Icons.phone_outlined,
                keyboardType: TextInputType.phone,
              ),
              const SizedBox(height: 32),
              _buildSectionTitle(l10n.categorizationSection),
              const SizedBox(height: 16),
              
              specialtiesAsync.when(
                data: (list) => _buildDropdown<int>(
                  label: '${l10n.specialtyLabel} *',
                  value: _selectedSpecialtyId,
                  items: list.map((e) => DropdownMenuItem(value: e.id, child: Text(e.name))).toList(),
                  onChanged: (v) => setState(() => _selectedSpecialtyId = v),
                  icon: Icons.medical_services_outlined,
                ),
                loading: () => const LinearProgressIndicator(color: AppColors.primary, backgroundColor: Colors.transparent),
                error: (_, __) => Text(l10n.specialtiesLoadError, style: GoogleFonts.inter(color: AppColors.error, fontSize: 12)),
              ),
              const SizedBox(height: 16),

              categoriesAsync.when(
                data: (list) => _buildDropdown<int>(
                  label: l10n.categoryLabel,
                  value: _selectedCategoryId,
                  items: list.map((e) => DropdownMenuItem(value: e.id, child: Text(e.name))).toList(),
                  onChanged: (v) => setState(() => _selectedCategoryId = v),
                  icon: Icons.star_outline_rounded,
                ),
                loading: () => const LinearProgressIndicator(color: AppColors.primary, backgroundColor: Colors.transparent),
                error: (_, __) => Text(l10n.categoriesLoadError, style: GoogleFonts.inter(color: AppColors.error, fontSize: 12)),
              ),
              const SizedBox(height: 32),

              _buildSectionTitle(l10n.locationWorkSection),
              const SizedBox(height: 16),

              regionsAsync.when(
                data: (list) => _buildDropdown<int>(
                  label: '${l10n.regionLabel} *',
                  value: _selectedRegionId,
                  items: list.map((e) => DropdownMenuItem(value: e.id, child: Text(e.name))).toList(),
                  onChanged: (v) => setState(() => _selectedRegionId = v),
                  icon: Icons.map_outlined,
                ),
                loading: () => const LinearProgressIndicator(color: AppColors.primary, backgroundColor: Colors.transparent),
                error: (_, __) => Text(l10n.regionsLoadError, style: GoogleFonts.inter(color: AppColors.error, fontSize: 12)),
              ),
              const SizedBox(height: 16),

              _buildDropdown<int>(
                label: '${l10n.organization} *',
                value: _selectedOrgId,
                items: organizationsState.organizations.map((e) => DropdownMenuItem(value: e.id, child: Text(e.name))).toList(),
                onChanged: (v) => setState(() => _selectedOrgId = v),
                icon: Icons.business_outlined,
              ),
              
              const SizedBox(height: 48),
              
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: _isSubmitting ? null : _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    elevation: 0,
                  ),
                  child: _isSubmitting
                      ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : Text(
                          l10n.saveAction.toUpperCase(),
                          style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.bold, letterSpacing: 1),
                        ),
                ),
              ),
              const SizedBox(height: 32),
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
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      child: TextFormField(
        controller: controller,
        keyboardType: keyboardType,
        validator: validator,
        style: GoogleFonts.inter(color: AppColors.textPrimary, fontSize: 15),
        decoration: InputDecoration(
          labelText: label,
          labelStyle: GoogleFonts.inter(color: AppColors.textHint),
          prefixIcon: Icon(icon, color: AppColors.primary, size: 22),
          border: InputBorder.none,
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
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Theme.of(context).dividerColor),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      child: DropdownButtonFormField<T>(
        value: value,
        items: items,
        onChanged: onChanged,
      ),
    );
  }
}
