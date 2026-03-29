import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/models/doctor_model.dart';
import '../../visits/screens/create_visit_screen.dart';
import '../providers/doctors_provider.dart';

class DoctorDetailScreen extends ConsumerStatefulWidget {
  final int doctorId;

  const DoctorDetailScreen({super.key, required this.doctorId});

  @override
  ConsumerState<DoctorDetailScreen> createState() => _DoctorDetailScreenState();
}

class _DoctorDetailScreenState extends ConsumerState<DoctorDetailScreen> {
  late int _selectedMonth;
  late int _selectedYear;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _selectedMonth = now.month;
    _selectedYear = now.year;
    
    // Defer loading so ref is available
    Future.microtask(() {
      ref.read(doctorsProvider.notifier).loadDoctorDetail(widget.doctorId);
    });
  }

  void _callDoctor(String phone) async {
    final Uri url = Uri.parse('tel:$phone');
    if (await canLaunchUrl(url)) {
      await launchUrl(url);
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(doctorsProvider);
    final doctor = state.selectedDoctor;

    if (state.status == DoctorsLoadStatus.error && doctor == null) {
      return _buildErrorView(state.errorMessage);
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      body: doctor == null
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : _buildContent(doctor),
    );
  }

  Widget _buildErrorView(String? error) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(backgroundColor: Colors.transparent, elevation: 0),
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
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 32),
              child: Text(
                error ?? 'Произошла непредвиденная ошибка. Пожалуйста, убедитесь, что сервер обновлен.',
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(color: AppColors.textSecondary),
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: () => ref.read(doctorsProvider.notifier).loadDoctorDetail(widget.doctorId),
              child: Text('Повторить', style: GoogleFonts.inter(fontWeight: FontWeight.w600)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContent(DoctorModel doctor) {
    return CustomScrollView(
      slivers: [
        _buildAppBar(doctor),
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 24, 16, 32),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildQuickActions(doctor),
                const SizedBox(height: 32),
                _buildPlanHeader(),
                const SizedBox(height: 12),
                _buildMonthYearSelector(),
                const SizedBox(height: 16),
                _buildPlanExecutionList(),
                const SizedBox(height: 40),
                _buildSectionTitle('ИНФОРМАЦИЯ', Icons.info_outline_rounded),
                const SizedBox(height: 12),
                _buildInfoCard(doctor),
                const SizedBox(height: 24),
                _buildSectionTitle('КОНТАКТЫ', Icons.alternate_email_rounded),
                const SizedBox(height: 12),
                _buildContactCard(doctor),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildAppBar(DoctorModel doctor) {
    return SliverAppBar(
      expandedHeight: 220,
      pinned: true,
      stretch: true,
      backgroundColor: AppColors.primary,
      flexibleSpace: FlexibleSpaceBar(
        stretchModes: const [StretchMode.zoomBackground],
        background: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [AppColors.primary, AppColors.accent],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
          child: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const SizedBox(height: 40),
                Hero(
                  tag: 'doctor_avatar_${doctor.id}',
                  child: Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.2),
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white.withOpacity(0.4), width: 2),
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
                ),
                const SizedBox(height: 12),
                Text(
                  doctor.fullName,
                  style: GoogleFonts.poppins(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
                Text(
                  doctor.specialty?.name ?? 'Врач',
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    color: Colors.white.withOpacity(0.8),
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
      iconTheme: const IconThemeData(color: Colors.white),
    );
  }

  Widget _buildQuickActions(DoctorModel doctor) {
    return Row(
      children: [
        if (doctor.contact1 != null)
          Expanded(
            child: _buildActionButton(
              icon: Icons.phone_in_talk_rounded,
              label: 'Позвонить',
              onTap: () => _callDoctor(doctor.contact1!),
              color: AppColors.statusApproved,
            ),
          ),
        if (doctor.contact1 != null) const SizedBox(width: 12),
        Expanded(
          child: _buildActionButton(
            icon: Icons.event_available_rounded,
            label: 'Визит',
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => CreateVisitScreen(
                  doctorId: doctor.id,
                  doctorName: doctor.fullName,
                ),
              ),
            ),
            color: AppColors.accent,
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
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: color.withOpacity(0.08),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withOpacity(0.2)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(width: 8),
            Text(
              label,
              style: GoogleFonts.inter(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title, IconData icon) {
    return Row(
      children: [
        Icon(icon, size: 18, color: AppColors.textSecondary),
        const SizedBox(width: 8),
        Text(
          title,
          style: GoogleFonts.poppins(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: AppColors.textSecondary,
            letterSpacing: 1.2,
          ),
        ),
      ],
    );
  }

  Widget _buildPlanHeader() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        _buildSectionTitle('ВЫПОЛНЕНИЕ ПЛАНОВ', Icons.analytics_rounded),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: AppColors.primary.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Text(
            '$_selectedYear',
            style: GoogleFonts.poppins(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: AppColors.primary,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildMonthYearSelector() {
    final List<String> months = [
      'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
      'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'
    ];

    return SizedBox(
      height: 42,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: 12,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final monthIdx = index + 1;
          final isSelected = _selectedMonth == monthIdx;
          return GestureDetector(
            onTap: () => setState(() => _selectedMonth = monthIdx),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                color: isSelected ? AppColors.primary : AppColors.surface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isSelected ? AppColors.primary : AppColors.divider,
                ),
                boxShadow: isSelected ? [
                  BoxShadow(
                    color: AppColors.primary.withOpacity(0.3),
                    blurRadius: 8,
                    offset: const Offset(0, 4),
                  )
                ] : null,
              ),
              child: Center(
                child: Text(
                  months[index],
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                    color: isSelected ? Colors.white : AppColors.textPrimary,
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildPlanExecutionList() {
    final plansAsync = ref.watch(doctorPlansProvider(DoctorPlansParams(
      id: widget.doctorId,
      month: _selectedMonth,
      year: _selectedYear,
    )));

    return plansAsync.when(
      data: (plans) {
        if (plans.isEmpty) {
          return _buildEmptyPlansState();
        }
        return ListView.separated(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          padding: EdgeInsets.zero,
          itemCount: plans.length,
          separatorBuilder: (_, __) => const SizedBox(height: 12),
          itemBuilder: (context, index) => _buildModernPlanCard(plans[index]),
        );
      },
      loading: () => const Center(
        child: Padding(
          padding: EdgeInsets.all(40.0),
          child: CircularProgressIndicator(strokeWidth: 2.5),
        ),
      ),
      error: (err, _) => _buildPlansErrorState(),
    );
  }

  Widget _buildEmptyPlansState() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.divider.withOpacity(0.5)),
      ),
      child: Column(
        children: [
          Icon(Icons.assignment_turned_in_rounded, size: 48, color: AppColors.divider),
          const SizedBox(height: 12),
          Text(
            'На этот месяц планов не найдено',
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(color: AppColors.textSecondary, fontSize: 13),
          ),
        ],
      ),
    );
  }

  Widget _buildPlansErrorState() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppColors.error.withOpacity(0.05),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.error.withOpacity(0.1)),
      ),
      child: Column(
        children: [
          const Icon(Icons.cloud_off_rounded, color: AppColors.error),
          const SizedBox(height: 8),
          Text(
            'Ошибка загрузки планов.\nПожалуйста, обновите сервер.',
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(color: AppColors.error, fontSize: 13, fontWeight: FontWeight.w500),
          ),
        ],
      ),
    );
  }

  Widget _buildModernPlanCard(DoctorPlan plan) {
    final double percent = plan.percentage;
    final Color color = percent >= 100 
        ? AppColors.statusApproved 
        : percent >= 50 
            ? AppColors.primary 
            : AppColors.statusCancelled;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.divider),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      plan.productName,
                      style: GoogleFonts.poppins(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                        height: 1.2,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Ежемесячный план по продукту',
                      style: GoogleFonts.inter(fontSize: 11, color: AppColors.textSecondary),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  '${percent.toInt()}%',
                  style: GoogleFonts.poppins(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: color,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Stack(
            children: [
              Container(
                height: 8,
                width: double.infinity,
                decoration: BoxDecoration(
                  color: AppColors.divider.withOpacity(0.3),
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
              AnimatedContainer(
                duration: const Duration(milliseconds: 800),
                curve: Curves.easeOutCubic,
                height: 8,
                width: (MediaQuery.of(context).size.width - 72) * (percent > 100 ? 1 : percent / 100),
                decoration: BoxDecoration(
                  gradient: LinearGradient(colors: [color.withOpacity(0.7), color]),
                  borderRadius: BorderRadius.circular(10),
                  boxShadow: [
                    BoxShadow(color: color.withOpacity(0.2), blurRadius: 6, offset: const Offset(0, 2))
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              _buildModernStat('ПЛАН', plan.targetQuantity.toString(), Icons.outlined_flag_rounded),
              const Spacer(),
              _buildModernStat('ФАКТ', plan.factQuantity.toString(), Icons.check_circle_outline_rounded, color: color),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildModernStat(String label, String value, IconData icon, {Color? color}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, size: 12, color: AppColors.textSecondary),
            const SizedBox(width: 4),
            Text(
              label,
              style: GoogleFonts.inter(
                fontSize: 10,
                fontWeight: FontWeight.w700,
                color: AppColors.textSecondary,
                letterSpacing: 0.5,
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: GoogleFonts.poppins(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: color ?? AppColors.textPrimary,
          ),
        ),
      ],
    );
  }

  Widget _buildInfoCard(DoctorModel doctor) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.divider),
      ),
      child: Column(
        children: [
          _buildPrettyRow(Icons.business_rounded, 'Организация', doctor.medOrg?.name ?? 'Не указано'),
          _buildDivider(),
          _buildPrettyRow(Icons.category_rounded, 'Категория', doctor.category?.name ?? 'VIP'),
          _buildDivider(),
          _buildPrettyRow(Icons.place_rounded, 'Регион', doctor.region?.name ?? 'Ташкент'),
          _buildPrettyRow(Icons.verified_user_rounded, 'Статус', doctor.isActive ? 'Активен' : 'Неактивен', 
            valColor: doctor.isActive ? AppColors.statusApproved : AppColors.textSecondary),
        ],
      ),
    );
  }

  Widget _buildContactCard(DoctorModel doctor) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.divider),
      ),
      child: Column(
        children: [
          if (doctor.contact1 != null)
            _buildPrettyRow(Icons.phone_iphone_rounded, 'Основной', doctor.contact1!, isPhone: true),
        ],
      ),
    );
  }

  Widget _buildPrettyRow(IconData icon, String label, String value, {Color? valColor, bool isPhone = false}) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.05),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, size: 16, color: AppColors.primary),
          ),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: GoogleFonts.inter(fontSize: 10, color: AppColors.textSecondary, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: GoogleFonts.inter(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: valColor ?? AppColors.textPrimary,
                  decoration: isPhone ? TextDecoration.underline : null,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildDivider() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Divider(height: 1, color: AppColors.divider),
    );
  }
}
