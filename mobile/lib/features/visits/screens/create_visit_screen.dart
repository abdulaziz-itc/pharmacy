import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/app_theme.dart';
import '../../../features/doctors/providers/doctors_provider.dart';
import '../providers/visits_provider.dart';

class CreateVisitScreen extends ConsumerStatefulWidget {
  final int? doctorId;
  final String? doctorName;

  const CreateVisitScreen({super.key, this.doctorId, this.doctorName});

  @override
  ConsumerState<CreateVisitScreen> createState() => _CreateVisitScreenState();
}

class _CreateVisitScreenState extends ConsumerState<CreateVisitScreen> {
  final _formKey = GlobalKey<FormState>();
  final _subjectController = TextEditingController();
  final _notesController = TextEditingController();
  DateTime _selectedDate = DateTime.now().add(const Duration(days: 1));
  String _visitType = 'field';
  int? _selectedDoctorId;
  String? _selectedDoctorName;

  final List<Map<String, String>> _visitTypes = [
    {'value': 'field', 'label': 'Полевой визит'},
    {'value': 'office', 'label': 'Офисный визит'},
    {'value': 'online', 'label': 'Онлайн'},
  ];

  @override
  void initState() {
    super.initState();
    _selectedDoctorId = widget.doctorId;
    _selectedDoctorName = widget.doctorName;
    
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final doctorsState = ref.read(doctorsProvider);
      if (doctorsState.doctors.isEmpty) {
        ref.read(doctorsProvider.notifier).loadDoctors(refresh: true);
      }
    });
  }

  @override
  void dispose() {
    _subjectController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 90)),
    );
    if (picked != null && picked != _selectedDate) {
      setState(() => _selectedDate = picked);
    }
  }

  @override
  Widget build(BuildContext context) {
    final visitsState = ref.watch(visitsProvider);
    final doctorsState = ref.watch(doctorsProvider);
    final l10n = context.l10n;

    final List<Map<String, String>> visitTypes = [
      {'value': 'field', 'label': l10n.fieldVisit},
      {'value': 'office', 'label': l10n.officeVisit},
      {'value': 'online', 'label': l10n.onlineVisit},
    ];

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text(l10n.createVisitPlan),
        actions: [
          TextButton(
            onPressed: visitsState.isSubmitting ? null : _submit,
            child: Text(
              l10n.saveAction.toUpperCase(),
              style: GoogleFonts.inter(
                fontSize: 13,
                fontWeight: FontWeight.w800,
                color: AppColors.primary,
                letterSpacing: 0.5,
              ),
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildSectionTitle(l10n.selectDoctor, Icons.person_search_rounded),
              const SizedBox(height: 12),
              _buildDoctorSelector(l10n, doctorsState.doctors),
              
              const SizedBox(height: 32),
              _buildSectionTitle(l10n.visitDate, Icons.calendar_today_rounded),
              const SizedBox(height: 12),
              _buildDatePicker(l10n),
              
              const SizedBox(height: 32),
              _buildSectionTitle(l10n.visitType, Icons.category_rounded),
              const SizedBox(height: 12),
              _buildTypeSelector(visitTypes),
              
              const SizedBox(height: 32),
              _buildSectionTitle(l10n.visitSubject, Icons.subject_rounded),
              const SizedBox(height: 12),
              TextFormField(
                controller: _subjectController,
                style: GoogleFonts.inter(color: Theme.of(context).colorScheme.onSurface, fontSize: 15),
                decoration: InputDecoration(
                  hintText: '${l10n.visitSubject}...',
                  hintStyle: GoogleFonts.inter(color: AppColors.textHint, fontSize: 14),
                  prefixIcon: const Icon(Icons.edit_note_rounded, color: AppColors.primary, size: 20),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return l10n.enterSubject;
                  }
                  return null;
                },
              ),
              
              const SizedBox(height: 32),
              _buildSectionTitle(l10n.commentOptional, Icons.notes_rounded),
              const SizedBox(height: 12),
              TextFormField(
                controller: _notesController,
                maxLines: 4,
                style: GoogleFonts.inter(color: Theme.of(context).colorScheme.onSurface, fontSize: 14),
                decoration: InputDecoration(
                  hintText: '${l10n.commentOptional}...',
                  hintStyle: GoogleFonts.inter(color: AppColors.textHint, fontSize: 14),
                  contentPadding: const EdgeInsets.all(16),
                ),
              ),
              
              const SizedBox(height: 48),
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: visitsState.isSubmitting ? null : _submit,
                  child: visitsState.isSubmitting
                      ? const SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                        )
                      : Text(l10n.savePlan.toUpperCase()),
                ),
              ),
              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _submit() async {
    final l10n = context.l10n;
    if (!_formKey.currentState!.validate()) return;
    if (_selectedDoctorId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(l10n.selectDoctor),
          backgroundColor: AppColors.error,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    final data = {
      'planned_date': DateFormat('yyyy-MM-dd').format(_selectedDate),
      'doctor_id': _selectedDoctorId,
      'subject': _subjectController.text.trim(),
      'visit_type': _visitType,
      'is_completed': false,
      if (_notesController.text.isNotEmpty)
        'notes': _notesController.text.trim(),
    };

    final success = await ref.read(visitsProvider.notifier).createVisit(data);
    if (mounted) {
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(l10n.visitPlanCreated),
            backgroundColor: AppColors.success,
            behavior: SnackBarBehavior.floating,
          ),
        );
        Navigator.of(context).pop();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(l10n.unexpectedError),
            backgroundColor: AppColors.error,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  Widget _buildSectionTitle(String title, [IconData? icon]) {
    return Row(
      children: [
        if (icon != null) ...[
          Icon(icon, size: 16, color: AppColors.primary),
          const SizedBox(width: 8),
        ],
        Text(
          title.toUpperCase(),
          style: GoogleFonts.inter(
            fontSize: 11,
            fontWeight: FontWeight.w800,
            color: AppColors.textHint,
            letterSpacing: 1.2,
          ),
        ),
      ],
    );
  }

  Widget _buildDoctorSelector(S l10n, List doctors) {
    return InkWell(
      onTap: () => _showDoctorPicker(doctors),
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Theme.of(context).dividerColor),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.1),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.person_search_rounded, color: AppColors.primary, size: 20),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Text(
                _selectedDoctorName ?? l10n.selectDoctor,
                style: GoogleFonts.inter(
                  fontSize: 15,
                  fontWeight: _selectedDoctorName != null ? FontWeight.w700 : FontWeight.w500,
                  color: _selectedDoctorName != null ? Theme.of(context).colorScheme.onSurface : AppColors.textHint,
                ),
              ),
            ),
            const Icon(Icons.keyboard_arrow_down_rounded, color: AppColors.textHint),
          ],
        ),
      ),
    );
  }

  Widget _buildDatePicker(S l10n) {
    return InkWell(
      onTap: _pickDate,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Theme.of(context).dividerColor),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.1),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppColors.statusPending.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.calendar_month_rounded, color: AppColors.statusPending, size: 20),
            ),
            const SizedBox(width: 16),
            Text(
              DateFormat('dd MMMM yyyy', l10n.locale.languageCode).format(_selectedDate),
              style: GoogleFonts.inter(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: Theme.of(context).colorScheme.onSurface,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTypeSelector(List<Map<String, String>> types) {
    return Row(
      children: types.map((type) {
        final isSelected = _visitType == type['value'];
        return Expanded(
          child: GestureDetector(
            onTap: () => setState(() => _visitType = type['value']!),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              margin: EdgeInsets.only(right: type != types.last ? 10 : 0),
              padding: const EdgeInsets.symmetric(vertical: 16),
              decoration: BoxDecoration(
                color: isSelected ? AppColors.primary : Theme.of(context).cardColor,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: isSelected ? AppColors.primary : Theme.of(context).dividerColor,
                ),
                boxShadow: isSelected ? [
                  BoxShadow(
                    color: AppColors.primary.withOpacity(0.3),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  )
                ] : null,
              ),
              child: Text(
                type['label']!,
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                  color: isSelected ? Colors.white : AppColors.textSecondary,
                ),
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  void _showDoctorPicker(List doctors) {
    final l10n = context.l10n;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return Container(
          decoration: BoxDecoration(
            color: Theme.of(context).scaffoldBackgroundColor,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.5),
                blurRadius: 40,
                offset: const Offset(0, -10),
              ),
            ],
          ),
          child: DraggableScrollableSheet(
            initialChildSize: 0.8,
            maxChildSize: 0.95,
            minChildSize: 0.5,
            expand: false,
            builder: (context, scrollController) {
              return Column(
                children: [
                  Container(
                    margin: const EdgeInsets.symmetric(vertical: 16),
                    width: 40,
                    height: 5,
                    decoration: BoxDecoration(
                      color: Theme.of(context).dividerColor,
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          l10n.selectDoctor,
                          style: GoogleFonts.inter(
                            fontSize: 20,
                            fontWeight: FontWeight.w900,
                            color: Theme.of(context).colorScheme.onSurface,
                          ),
                        ),
                        IconButton(
                          onPressed: () => Navigator.pop(context),
                          icon: const Icon(Icons.close_rounded),
                          style: IconButton.styleFrom(
                            backgroundColor: Theme.of(context).cardColor,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Expanded(
                    child: ListView.separated(
                      controller: scrollController,
                      padding: const EdgeInsets.fromLTRB(24, 0, 24, 48),
                      itemCount: doctors.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 12),
                      itemBuilder: (context, index) {
                        final doctor = doctors[index];
                        return ListTile(
                          contentPadding: const EdgeInsets.all(12),
                          tileColor: Theme.of(context).cardColor,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                            side: BorderSide(color: Theme.of(context).dividerColor),
                          ),
                          leading: Container(
                            width: 48,
                            height: 48,
                            decoration: BoxDecoration(
                              color: AppColors.primary.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Center(
                              child: Text(
                                doctor.initials,
                                style: GoogleFonts.inter(
                                  color: AppColors.primary,
                                  fontWeight: FontWeight.w900,
                                  fontSize: 14,
                                ),
                              ),
                            ),
                          ),
                          title: Text(
                            doctor.fullName,
                            style: GoogleFonts.inter(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                              color: Theme.of(context).colorScheme.onSurface,
                            ),
                          ),
                          subtitle: doctor.specialty != null
                              ? Text(
                                  doctor.specialty!.name,
                                  style: GoogleFonts.inter(
                                    fontSize: 13,
                                    color: AppColors.textHint,
                                    fontWeight: FontWeight.w500,
                                  ),
                                )
                              : null,
                          onTap: () {
                            setState(() {
                              _selectedDoctorId = doctor.id;
                              _selectedDoctorName = doctor.fullName;
                            });
                            Navigator.pop(context);
                          },
                        );
                      },
                    ),
                  ),
                ],
              );
            },
          ),
        );
      },
    );
  }
}
