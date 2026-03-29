import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
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
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: AppColors.primary,
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      setState(() => _selectedDate = picked);
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedDoctorId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Выберите врача'),
          backgroundColor: AppColors.error,
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
          const SnackBar(
            content: Text('План визита создан!'),
            backgroundColor: AppColors.statusApproved,
          ),
        );
        Navigator.of(context).pop();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Произошла ошибка'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final visitsState = ref.watch(visitsProvider);
    final doctorsState = ref.watch(doctorsProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('План визита'),
        backgroundColor: AppColors.surface,
        actions: [
          TextButton(
            onPressed: visitsState.isSubmitting ? null : _submit,
            child: Text(
              'Сохранить',
              style: GoogleFonts.inter(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: AppColors.primary,
              ),
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Doctor selector
              _buildSectionTitle('Выбор врача'),
              const SizedBox(height: 8),
              GestureDetector(
                onTap: () => _showDoctorPicker(doctorsState.doctors),
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.person_outline_rounded,
                        color: AppColors.textHint,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          _selectedDoctorName ?? 'Выберите врача',
                          style: GoogleFonts.inter(
                            fontSize: 14,
                            color: _selectedDoctorName != null
                                ? AppColors.textPrimary
                                : AppColors.textHint,
                          ),
                        ),
                      ),
                      const Icon(
                        Icons.arrow_drop_down_rounded,
                        color: AppColors.textHint,
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),
              // Date picker
              _buildSectionTitle('Дата визита'),
              const SizedBox(height: 8),
              GestureDetector(
                onTap: _pickDate,
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.calendar_today_rounded,
                        color: AppColors.primary,
                      ),
                      const SizedBox(width: 12),
                      Text(
                        DateFormat('dd MMMM yyyy', 'ru').format(_selectedDate),
                        style: GoogleFonts.inter(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),
              // Visit type
              _buildSectionTitle('Тип визита'),
              const SizedBox(height: 8),
              Row(
                children: _visitTypes.map((type) {
                  final isSelected = _visitType == type['value'];
                  return Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _visitType = type['value']!),
                      child: Container(
                        margin: EdgeInsets.only(
                          right: type != _visitTypes.last ? 8 : 0,
                        ),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          color: isSelected
                              ? AppColors.primary
                              : AppColors.surface,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: isSelected
                                ? AppColors.primary
                                : AppColors.border,
                          ),
                        ),
                        child: Text(
                          type['label']!,
                          textAlign: TextAlign.center,
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            fontWeight: FontWeight.w500,
                            color: isSelected
                                ? Colors.white
                                : AppColors.textSecondary,
                          ),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 20),
              // Subject
              _buildSectionTitle('Тема'),
              const SizedBox(height: 8),
              TextFormField(
                controller: _subjectController,
                decoration: const InputDecoration(
                  hintText: 'Цель визита...',
                  prefixIcon: Icon(Icons.subject_rounded, color: AppColors.textHint),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Введите тему';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 20),
              // Notes
              _buildSectionTitle('Комментарий (опционально)'),
              const SizedBox(height: 8),
              TextFormField(
                controller: _notesController,
                maxLines: 3,
                decoration: const InputDecoration(
                  hintText: 'Дополнительная информация...',
                  alignLabelWithHint: true,
                ),
              ),
              const SizedBox(height: 32),
              // Submit button
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: visitsState.isSubmitting ? null : _submit,
                  child: visitsState.isSubmitting
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(
                            color: Colors.white,
                            strokeWidth: 2.5,
                          ),
                        )
                      : const Text('Сохранить план'),
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
        fontSize: 13,
        fontWeight: FontWeight.w600,
        color: AppColors.textSecondary,
      ),
    );
  }

  void _showDoctorPicker(List doctors) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return DraggableScrollableSheet(
          initialChildSize: 0.7,
          maxChildSize: 0.9,
          minChildSize: 0.4,
          expand: false,
          builder: (context, scrollController) {
            return Column(
              children: [
                Container(
                  margin: const EdgeInsets.only(top: 8),
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.divider,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text(
                    'Выбор врача',
                    style: GoogleFonts.poppins(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                Expanded(
                  child: ListView.builder(
                    controller: scrollController,
                    itemCount: doctors.length,
                    itemBuilder: (context, index) {
                      final doctor = doctors[index];
                      return ListTile(
                        leading: CircleAvatar(
                          backgroundColor: AppColors.accent.withValues(alpha: 0.2),
                          child: Text(
                            doctor.initials,
                            style: GoogleFonts.inter(
                              color: AppColors.primary,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        title: Text(
                          doctor.fullName,
                          style: GoogleFonts.inter(
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        subtitle: doctor.specialty != null
                            ? Text(
                                doctor.specialty!.name,
                                style: GoogleFonts.inter(
                                  fontSize: 12,
                                  color: AppColors.accent,
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
        );
      },
    );
  }
}
