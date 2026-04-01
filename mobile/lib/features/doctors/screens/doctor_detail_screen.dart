import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/models/doctor_model.dart';
import '../../visits/screens/create_visit_screen.dart';
import '../providers/doctors_provider.dart';
import '../../bonus/providers/bonus_provider.dart';
import 'package:intl/intl.dart';

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
    final l10n = context.l10n;

    if (state.status == DoctorsLoadStatus.error && doctor == null) {
      return _buildErrorView(state.errorMessage, l10n);
    }

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: doctor == null
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : _buildContent(doctor, l10n),
    );
  }

  Widget _buildErrorView(String? error, S l10n) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(backgroundColor: Colors.transparent),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline_rounded, size: 64, color: AppColors.error),
            const SizedBox(height: 16),
            Text(
              l10n.loadDataError,
              style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 40),
              child: Text(
                error ?? l10n.unexpectedError,
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(color: AppColors.textSecondary, fontSize: 13),
              ),
            ),
            const SizedBox(height: 32),
            ElevatedButton(
              onPressed: () => ref.read(doctorsProvider.notifier).loadDoctorDetail(widget.doctorId),
              child: Text(l10n.retryLabel.toUpperCase()),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContent(DoctorModel doctor, S l10n) {
    return CustomScrollView(
      physics: const BouncingScrollPhysics(),
      slivers: [
        _buildAppBar(doctor, l10n),
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildQuickActions(doctor, l10n),
                const SizedBox(height: 32),
                _buildDoctorBonusSection(doctor, l10n),
                const SizedBox(height: 32),
                _buildPlanHeader(l10n),
                const SizedBox(height: 16),
                _buildMonthYearSelector(l10n),
                const SizedBox(height: 20),
                _buildPlanExecutionList(l10n),
                const SizedBox(height: 48),
                _buildSectionTitle(l10n.infoSection, Icons.info_outline_rounded),
                const SizedBox(height: 16),
                _buildInfoCard(doctor, l10n),
                const SizedBox(height: 32),
                _buildSectionTitle(l10n.contactsSection, Icons.alternate_email_rounded),
                const SizedBox(height: 16),
                _buildContactCard(doctor, l10n),
                const SizedBox(height: 40),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildAppBar(DoctorModel doctor, S l10n) {
    return SliverAppBar(
      expandedHeight: 240,
      pinned: true,
      stretch: true,
      backgroundColor: AppColors.primary,
      flexibleSpace: FlexibleSpaceBar(
        stretchModes: const [StretchMode.zoomBackground],
        background: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [AppColors.primary, Color(0xFF6366F1)],
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
                    width: 84,
                    height: 84,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.15),
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white.withValues(alpha: 0.3), width: 2),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.2),
                          blurRadius: 20,
                          offset: const Offset(0, 10),
                        ),
                      ],
                    ),
                    child: Center(
                      child: Text(
                        doctor.initials,
                        style: GoogleFonts.inter(
                          fontSize: 32,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  doctor.fullName,
                  style: GoogleFonts.inter(
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                    color: Colors.white,
                  ),
                ),
                Text(
                  doctor.specialty?.name ?? l10n.doctorLabel,
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    color: Colors.white.withValues(alpha: 0.8),
                    fontWeight: FontWeight.bold,
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

  Widget _buildQuickActions(DoctorModel doctor, S l10n) {
    return Row(
      children: [
        if (doctor.contact1 != null)
          Expanded(
            child: _buildActionButton(
              icon: Icons.phone_in_talk_rounded,
              label: l10n.callAction,
              onTap: () => _callDoctor(doctor.contact1!),
              color: AppColors.success,
            ),
          ),
        if (doctor.contact1 != null) const SizedBox(width: 12),
        Expanded(
          child: _buildActionButton(
            icon: Icons.event_available_rounded,
            label: l10n.visitAction,
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => CreateVisitScreen(
                  doctorId: doctor.id,
                  doctorName: doctor.fullName,
                ),
              ),
            ),
            color: AppColors.primary,
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
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Theme.of(context).dividerColor),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.1),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: color, size: 22),
            const SizedBox(width: 8),
            Text(
              label,
              style: GoogleFonts.inter(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: null,
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
        Icon(icon, size: 18, color: AppColors.primary),
        const SizedBox(width: 8),
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

  Widget _buildPlanHeader(S l10n) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        _buildSectionTitle(l10n.planExecution, Icons.analytics_rounded),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Text(
            '$_selectedYear',
            style: GoogleFonts.inter(
              fontSize: 12,
              fontWeight: FontWeight.w800,
              color: AppColors.primary,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildMonthYearSelector(S l10n) {
    final List<String> months = [
      l10n.jan, l10n.feb, l10n.mar, l10n.apr, l10n.may, l10n.jun,
      l10n.jul, l10n.aug, l10n.sep, l10n.oct, l10n.nov, l10n.dec
    ];

    return SizedBox(
      height: 44,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        itemCount: 12,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final monthIdx = index + 1;
          final isSelected = _selectedMonth == monthIdx;
          return GestureDetector(
            onTap: () => setState(() => _selectedMonth = monthIdx),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding: const EdgeInsets.symmetric(horizontal: 18),
              decoration: BoxDecoration(
                color: isSelected ? AppColors.primary : Theme.of(context).cardColor,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isSelected ? AppColors.primary : Theme.of(context).dividerColor,
                ),
                boxShadow: isSelected ? [
                  BoxShadow(
                    color: AppColors.primary.withValues(alpha: 0.3),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  )
                ] : null,
              ),
              child: Center(
                child: Text(
                  months[index],
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                    color: isSelected ? Colors.white : AppColors.textSecondary,
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildPlanExecutionList(S l10n) {
    final plansAsync = ref.watch(doctorPlansProvider(DoctorPlansParams(
      id: widget.doctorId,
      month: _selectedMonth,
      year: _selectedYear,
    )));

    return plansAsync.when(
      data: (plans) {
        if (plans.isEmpty) {
          return _buildEmptyPlansState(l10n);
        }
        return ListView.separated(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          padding: EdgeInsets.zero,
          itemCount: plans.length,
          separatorBuilder: (_, __) => const SizedBox(height: 16),
          itemBuilder: (context, index) => _buildModernPlanCard(plans[index], l10n),
        );
      },
      loading: () => const Center(
        child: Padding(
          padding: EdgeInsets.all(40.0),
          child: CircularProgressIndicator(strokeWidth: 2.5),
        ),
      ),
      error: (err, _) => _buildPlansErrorState(l10n),
    );
  }

  Widget _buildEmptyPlansState(S l10n) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(40),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Theme.of(context).dividerColor),
      ),
      child: Column(
        children: [
          Icon(Icons.assignment_turned_in_rounded, size: 56, color: AppColors.textHint.withValues(alpha: 0.3)),
          const SizedBox(height: 16),
          Text(
            l10n.noPlansFound,
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(color: AppColors.textSecondary, fontSize: 14, fontWeight: FontWeight.w500),
          ),
        ],
      ),
    );
  }

  Widget _buildPlansErrorState(S l10n) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: AppColors.error.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.error.withValues(alpha: 0.1)),
      ),
      child: Column(
        children: [
          const Icon(Icons.cloud_off_rounded, color: AppColors.error, size: 40),
          const SizedBox(height: 12),
          Text(
            l10n.plansLoadError,
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(color: AppColors.error, fontSize: 13, fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }

  Widget _buildModernPlanCard(DoctorPlan plan, S l10n) {
    final double percent = plan.percentage;
    final Color color = percent >= 100 
        ? AppColors.success 
        : percent >= 50 
            ? AppColors.primary 
            : AppColors.error;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Theme.of(context).dividerColor),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.2),
            blurRadius: 15,
            offset: const Offset(0, 8),
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
                      style: GoogleFonts.inter(
                        fontSize: 17,
                        fontWeight: FontWeight.w900,
                        color: null,
                        height: 1.2,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      l10n.monthlyProductPlan,
                      style: GoogleFonts.inter(fontSize: 12, color: AppColors.textHint, fontWeight: FontWeight.w500),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: color.withValues(alpha: 0.2)),
                ),
                child: Text(
                  '${percent.toInt()}%',
                  style: GoogleFonts.inter(
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                    color: color,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          Stack(
            children: [
              Container(
                height: 10,
                width: double.infinity,
                decoration: BoxDecoration(
                  color: Theme.of(context).scaffoldBackgroundColor,
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
              AnimatedContainer(
                duration: const Duration(milliseconds: 1000),
                curve: Curves.elasticOut,
                height: 10,
                width: (MediaQuery.of(context).size.width - 80) * (percent > 100 ? 1 : percent / 100),
                decoration: BoxDecoration(
                  gradient: LinearGradient(colors: [color.withValues(alpha: 0.7), color]),
                  borderRadius: BorderRadius.circular(10),
                  boxShadow: [
                    BoxShadow(color: color.withValues(alpha: 0.3), blurRadius: 6, offset: const Offset(0, 2))
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          Row(
            children: [
              _buildModernStat(l10n.planTarget, plan.targetQuantity.toString(), Icons.outlined_flag_rounded),
              const Spacer(),
              _buildModernStat(l10n.planFact, plan.factQuantity.toString(), Icons.check_circle_outline_rounded, color: color),
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
            Icon(icon, size: 14, color: AppColors.textHint),
            const SizedBox(width: 6),
            Text(
              label,
              style: GoogleFonts.inter(
                fontSize: 11,
                fontWeight: FontWeight.w800,
                color: AppColors.textHint,
                letterSpacing: 0.5,
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        Text(
          value,
          style: GoogleFonts.inter(
            fontSize: 20,
            fontWeight: FontWeight.w900,
            color: color ?? AppColors.textPrimary,
          ),
        ),
      ],
    );
  }

  Widget _buildInfoCard(DoctorModel doctor, S l10n) {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Theme.of(context).dividerColor),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 15,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        children: [
          _buildPrettyRow(Icons.business_rounded, l10n.organization, doctor.medOrg?.name ?? l10n.notSpecified),
          _buildDivider(),
          _buildPrettyRow(Icons.category_rounded, l10n.categoryLabel, doctor.category?.name ?? 'VIP'),
          _buildDivider(),
          _buildPrettyRow(Icons.place_rounded, l10n.regionLabel, doctor.region?.name ?? '-'),
          _buildPrettyRow(Icons.verified_user_rounded, l10n.status, doctor.isActive ? l10n.activeStatus : l10n.inactiveStatus, 
            valColor: doctor.isActive ? AppColors.success : AppColors.textHint),
        ],
      ),
    );
  }

  Widget _buildContactCard(DoctorModel doctor, S l10n) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Theme.of(context).dividerColor),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 15,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        children: [
          if (doctor.contact1 != null)
            _buildPrettyRow(Icons.phone_iphone_rounded, l10n.primaryContact, doctor.contact1!, isPhone: true, isLast: true),
        ],
      ),
    );
  }

  Widget _buildPrettyRow(IconData icon, String label, String value, {Color? valColor, bool isPhone = false, bool isLast = false}) {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, size: 20, color: AppColors.primary),
          ),
          const SizedBox(width: 18),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label.toUpperCase(),
                  style: GoogleFonts.inter(fontSize: 10, color: AppColors.textHint, fontWeight: FontWeight.w800, letterSpacing: 0.5),
                ),
                const SizedBox(height: 4),
                Text(
                  value,
                  style: GoogleFonts.inter(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: valColor ?? AppColors.textPrimary,
                    decoration: isPhone ? TextDecoration.underline : null,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDivider() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Divider(height: 1, color: Theme.of(context).dividerColor),
    );
  }

  Widget _buildDoctorBonusSection(DoctorModel doctor, S l10n) {
    final bonusAsync = ref.watch(doctorBonusStatsProvider(DoctorBonusParams(
      id: widget.doctorId,
      month: _selectedMonth,
      year: _selectedYear,
    )));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionTitle(l10n.bonusesPeriod, Icons.stars_rounded),
        const SizedBox(height: 16),
        bonusAsync.when(
          data: (bonus) => Row(
            children: [
              Expanded(
                child: _buildSimpleBonusCard(
                  l10n.accruedLabel,
                  '${_formatAmount(bonus.totalAccrued)} ${l10n.sumCurrency}',
                  AppColors.success.withValues(alpha: 0.1),
                  AppColors.success,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: _buildSimpleBonusCard(
                  l10n.paidBonusLabel,
                  '${_formatAmount(bonus.totalPaid)} ${l10n.sumCurrency}',
                  AppColors.primary.withValues(alpha: 0.1),
                  AppColors.primary,
                ),
              ),
            ],
          ),
          loading: () => const LinearProgressIndicator(color: AppColors.primary, backgroundColor: Colors.transparent),
          error: (err, _) => Text(
            l10n.bonusLoadError,
            style: GoogleFonts.inter(color: AppColors.error, fontSize: 13, fontWeight: FontWeight.bold),
          ),
        ),
      ],
    );
  }

  Widget _buildSimpleBonusCard(String label, String value, Color bgColor, Color textColor) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: textColor.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label.toUpperCase(),
            style: GoogleFonts.inter(
              fontSize: 10,
              fontWeight: FontWeight.w800,
              color: textColor.withValues(alpha: 0.7),
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 8),
          FittedBox(
            child: Text(
              value,
              style: GoogleFonts.inter(
                fontSize: 18,
                fontWeight: FontWeight.w900,
                color: textColor,
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _formatAmount(double amount) {
    final formatter = NumberFormat('#,##0', 'en_US');
    return formatter.format(amount);
  }
}
