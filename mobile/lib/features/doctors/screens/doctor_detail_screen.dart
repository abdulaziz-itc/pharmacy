import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/models/doctor_model.dart';
import '../providers/doctors_provider.dart';

class DoctorDetailScreen extends ConsumerStatefulWidget {
  final int doctorId;

  const DoctorDetailScreen({super.key, required this.doctorId});

  @override
  ConsumerState<DoctorDetailScreen> createState() => _DoctorDetailScreenState();
}

class _DoctorDetailScreenState extends ConsumerState<DoctorDetailScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(doctorsProvider.notifier).loadDoctorDetail(widget.doctorId);
    });
  }

  Future<void> _callDoctor(String phone) async {
    final uri = Uri.parse('tel:$phone');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(doctorsProvider);
    final doctor = state.selectedDoctor;

    if (state.status == DoctorsLoadStatus.error && doctor == null) {
      return Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 64, color: AppColors.error),
              const SizedBox(height: 16),
              Text(
                'Ошибка загрузки данных',
                style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 8),
              Text(
                state.errorMessage ?? 'Произошла непредвиденная ошибка',
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(color: AppColors.textSecondary),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () => ref.read(doctorsProvider.notifier).loadDoctorDetail(widget.doctorId),
                child: const Text('Повторить'),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      body: doctor == null
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            )
          : _buildContent(doctor),
    );
  }

  Widget _buildContent(DoctorModel doctor) {
    return CustomScrollView(
      slivers: [
        SliverAppBar(
          expandedHeight: 220,
          pinned: true,
          flexibleSpace: FlexibleSpaceBar(
            background: Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [AppColors.primary, AppColors.accent],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const SizedBox(height: 60),
                  Container(
                    width: 70,
                    height: 70,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(
                        color: Colors.white.withValues(alpha: 0.4),
                        width: 2,
                      ),
                    ),
                    child: Center(
                      child: Text(
                        doctor.initials,
                        style: GoogleFonts.poppins(
                          fontSize: 28,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    doctor.fullName,
                    style: GoogleFonts.poppins(
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                      color: Colors.white,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  if (doctor.specialty != null)
                    Text(
                      doctor.specialty!.name,
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        color: Colors.white.withValues(alpha: 0.8),
                      ),
                    ),
                ],
              ),
            ),
          ),
          title: Text(
            doctor.fullName,
            style: GoogleFonts.poppins(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: Colors.white,
            ),
          ),
          iconTheme: const IconThemeData(color: Colors.white),
        ),
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                // Quick actions
                Row(
                  children: [
                    if (doctor.contact1 != null)
                      Expanded(
                        child: _buildActionButton(
                          icon: Icons.phone_rounded,
                          label: 'Qo\'ng\'iroq',
                          onTap: () => _callDoctor(doctor.contact1!),
                          color: AppColors.statusApproved,
                        ),
                      ),
                    if (doctor.contact1 != null) const SizedBox(width: 12),
                    Expanded(
                      child: _buildActionButton(
                        icon: Icons.calendar_today_rounded,
                        label: 'Tashrif',
                        onTap: () {},
                        color: AppColors.accent,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                // Plan execution section
                _buildPlanExecutionSection(),
                const SizedBox(height: 24),
                // Info card
                _buildInfoCard(doctor),
                const SizedBox(height: 16),
                // Contact card
                if (doctor.contact1 != null || doctor.contact2 != null)
                  _buildContactCard(doctor),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildPlanExecutionSection() {
    final plansAsync = ref.watch(doctorPlansProvider(widget.doctorId));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.trending_up, color: AppColors.primary, size: 20),
            const SizedBox(width: 8),
            Text(
              'ВЫПОЛНЕНИЕ ПЛАНОВ',
              style: GoogleFonts.poppins(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: AppColors.textSecondary,
                letterSpacing: 1.2,
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        plansAsync.when(
          data: (plans) {
            if (plans.isEmpty) {
              return Container(
                width: double.infinity,
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.divider),
                ),
                child: Center(
                  child: Text(
                    'Планов на текущий месяц нет',
                    style: GoogleFonts.inter(color: AppColors.textSecondary),
                  ),
                ),
              );
            }

            return ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              padding: EdgeInsets.zero,
              itemCount: plans.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final plan = plans[index];
                return _buildPlanCard(plan);
              },
            );
          },
          loading: () => const Center(
            child: Padding(
              padding: EdgeInsets.all(24.0),
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
          ),
          error: (err, _) => Center(
            child: Text(
              'Ошибка загрузки планов',
              style: GoogleFonts.inter(color: AppColors.error),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildPlanCard(DoctorPlan plan) {
    final double percent = plan.percentage;
    final Color progressColor = percent >= 100 
        ? AppColors.statusApproved 
        : percent >= 50 
            ? AppColors.primary 
            : AppColors.statusCancelled;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.divider),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  plan.productName,
                  style: GoogleFonts.poppins(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
              Text(
                '${percent.toInt()}%',
                style: GoogleFonts.poppins(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: progressColor,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: percent / 100,
              backgroundColor: AppColors.divider.withOpacity(0.3),
              valueColor: AlwaysStoppedAnimation<Color>(progressColor),
              minHeight: 6,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _buildPlanStat('ПЛАН', plan.targetQuantity.toString()),
              _buildPlanStat('ФАКТ', plan.factQuantity.toString()),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPlanStat(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.poppins(
            fontSize: 10,
            fontWeight: FontWeight.w700,
            color: AppColors.textSecondary,
            letterSpacing: 0.5,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: GoogleFonts.poppins(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary,
          ),
        ),
      ],
    );
  }

  Widget _buildActionButton({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    required Color color,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: color.withValues(alpha: 0.3)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(width: 8),
            Text(
              label,
              style: GoogleFonts.inter(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoCard(DoctorModel doctor) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.divider),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Ma\'lumotlar',
            style: GoogleFonts.poppins(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 16),
          _buildInfoRow(
            Icons.local_hospital_outlined,
            'Tashkilot',
            doctor.medOrg?.name ?? 'Ko\'rsatilmagan',
          ),
          _buildInfoRow(
            Icons.medical_services_outlined,
            'Mutaxassislik',
            doctor.specialty?.name ?? 'Ko\'rsatilmagan',
          ),
          _buildInfoRow(
            Icons.star_outline_rounded,
            'Kategoriya',
            doctor.category?.name ?? 'Ko\'rsatilmagan',
          ),
          _buildInfoRow(
            Icons.location_on_outlined,
            'Viloyat/Shahar',
            doctor.region?.name ?? 'Ko\'rsatilmagan',
          ),
          _buildInfoRow(
            Icons.circle_outlined,
            'Holat',
            doctor.isActive ? 'Faol' : 'Nofaol',
            isLast: true,
            valueColor: doctor.isActive
                ? AppColors.statusApproved
                : AppColors.textSecondary,
          ),
        ],
      ),
    );
  }

  Widget _buildContactCard(DoctorModel doctor) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.divider),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Aloqa',
            style: GoogleFonts.poppins(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 16),
          if (doctor.contact1 != null)
            _buildContactRow(doctor.contact1!, doctor.contact2 == null),
          if (doctor.contact2 != null)
            _buildContactRow(doctor.contact2!, true),
        ],
      ),
    );
  }

  Widget _buildContactRow(String phone, bool isLast) {
    return GestureDetector(
      onTap: () => _callDoctor(phone),
      child: Container(
        padding: EdgeInsets.only(bottom: isLast ? 0 : 12),
        margin: EdgeInsets.only(bottom: isLast ? 0 : 12),
        decoration: isLast
            ? null
            : const BoxDecoration(
                border: Border(
                  bottom: BorderSide(color: AppColors.divider),
                ),
              ),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: AppColors.statusApproved.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(
                Icons.phone_rounded,
                color: AppColors.statusApproved,
                size: 18,
              ),
            ),
            const SizedBox(width: 12),
            Text(
              phone,
              style: GoogleFonts.inter(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: AppColors.accent,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(
    IconData icon,
    String label,
    String value, {
    bool isLast = false,
    Color? valueColor,
  }) {
    return Container(
      padding: EdgeInsets.only(bottom: isLast ? 0 : 12),
      margin: EdgeInsets.only(bottom: isLast ? 0 : 12),
      decoration: isLast
          ? null
          : const BoxDecoration(
              border: Border(
                bottom: BorderSide(color: AppColors.divider),
              ),
            ),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: AppColors.primary, size: 18),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: GoogleFonts.inter(
                    fontSize: 11,
                    color: AppColors.textSecondary,
                  ),
                ),
                Text(
                  value,
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: valueColor ?? AppColors.textPrimary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
