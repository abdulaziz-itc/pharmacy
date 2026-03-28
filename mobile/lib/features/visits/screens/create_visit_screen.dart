import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../../../features/doctors/providers/doctors_provider.dart';
import '../providers/visits_provider.dart';

class CreateVisitScreen extends ConsumerStatefulWidget {
  const CreateVisitScreen({super.key});

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
    {'value': 'field', 'label': 'Dala tashrifi'},
    {'value': 'office', 'label': 'Ofis tashrifi'},
    {'value': 'online', 'label': 'Online'},
  ];

  @override
  void initState() {
    super.initState();
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
          content: Text('Shifokorni tanlang'),
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
            content: Text('Tashrif rejasi yaratildi!'),
            backgroundColor: AppColors.statusApproved,
          ),
        );
        Navigator.of(context).pop();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Xatolik yuz berdi'),
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
        title: const Text('Tashrif rejasi'),
        backgroundColor: AppColors.surface,
        actions: [
          TextButton(
            onPressed: visitsState.isSubmitting ? null : _submit,
            child: Text(
              'Saqlash',
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
              _buildSectionTitle('Shifokor tanlash'),
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
                          _selectedDoctorName ?? 'Shifokorni tanlang',
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
              _buildSectionTitle('Tashrif sanasi'),
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
                        DateFormat('dd MMMM yyyy').format(_selectedDate),
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
              _buildSectionTitle('Tashrif turi'),
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
              _buildSectionTitle('Mavzu'),
              const SizedBox(height: 8),
              TextFormField(
                controller: _subjectController,
                decoration: const InputDecoration(
                  hintText: 'Tashrif maqsadi...',
                  prefixIcon: Icon(Icons.subject_rounded, color: AppColors.textHint),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Mavzuni kiriting';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 20),
              // Notes
              _buildSectionTitle('Izoh (ixtiyoriy)'),
              const SizedBox(height: 8),
              TextFormField(
                controller: _notesController,
                maxLines: 3,
                decoration: const InputDecoration(
                  hintText: 'Qo\'shimcha ma\'lumot...',
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
                      : const Text('Rejani saqlash'),
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
                    'Shifokor tanlash',
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
                          backgroundColor: AppColors.accent.withOpacity(0.2),
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
