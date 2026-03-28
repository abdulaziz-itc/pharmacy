import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/models/med_org_model.dart';
import '../../../shared/models/doctor_model.dart';
import '../../../shared/widgets/empty_view.dart';
import '../../../shared/widgets/error_view.dart';
import '../../../shared/widgets/loading_shimmer.dart';
import '../providers/organizations_provider.dart';
import '../../doctors/providers/doctors_provider.dart';
import '../../reservations/screens/create_reservation_screen.dart';

class OrganizationDetailScreen extends ConsumerStatefulWidget {
  final int orgId;

  const OrganizationDetailScreen({super.key, required this.orgId});

  @override
  ConsumerState<OrganizationDetailScreen> createState() => _OrganizationDetailScreenState();
}

class _OrganizationDetailScreenState extends ConsumerState<OrganizationDetailScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(organizationsProvider.notifier).loadOrgDetails(widget.orgId);
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _showAttachDoctorDialog() async {
    // 1. Load all doctors (not just in this org)
    await ref.read(doctorsProvider.notifier).loadDoctors();
    
    if (!mounted) return;
    
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _AttachDoctorBottomSheet(orgId: widget.orgId),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(organizationsProvider);
    final org = state.selectedOrg;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(
          org?.name ?? 'Организация',
          style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.w600),
        ),
        backgroundColor: AppColors.surface,
        elevation: 0,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppColors.primary,
          indicatorWeight: 3,
          labelColor: AppColors.primary,
          unselectedLabelColor: AppColors.textSecondary,
          labelStyle: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w700),
          unselectedLabelStyle: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w500),
          dividerColor: AppColors.divider.withValues(alpha: 0.5),
          tabs: const [
            Tab(text: 'Информация'),
            Tab(text: 'Врачи'),
            Tab(text: 'Склад'),
          ],
        ),
      ),
      body: state.status == OrgsLoadStatus.loading && org == null
          ? const ShimmerList(count: 5)
          : state.status == OrgsLoadStatus.error
              ? ErrorView(
                  message: state.errorMessage ?? 'Ошибка загрузки',
                  onRetry: () => ref.read(organizationsProvider.notifier).loadOrgDetails(widget.orgId),
                )
              : TabBarView(
                  controller: _tabController,
                  children: [
                    _buildGeneralInfo(org!),
                    _buildDoctorsList(state.orgDoctors),
                    _buildStockList(state.orgStock),
                  ],
                ),
      bottomNavigationBar: org != null ? _buildBottomActions(org) : null,
    );
  }

  Widget _buildGeneralInfo(MedOrgModel org) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          _buildInfoItem(Icons.business_rounded, 'Название', org.name),
          _buildInfoItem(Icons.category_rounded, 'Тип', org.displayType),
          _buildInfoItem(Icons.location_on_rounded, 'Регион', org.regionName ?? 'Не указан'),
          _buildInfoItem(Icons.map_rounded, 'Адрес', org.address ?? 'Не указан'),
          if (org.doctorsCount != null)
            _buildInfoItem(Icons.people_alt_rounded, 'Количество врачей', org.doctorsCount.toString()),
        ],
      ),
    );
  }

  Widget _buildInfoItem(IconData icon, String label, String value) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.divider.withValues(alpha: 0.5)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
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
              color: AppColors.primary.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: AppColors.primary, size: 20),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: GoogleFonts.inter(
                    fontSize: 11,
                    color: AppColors.textHint,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDoctorsList(List<DoctorModel> doctors) {
    if (doctors.isEmpty) {
      return Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
             Icon(Icons.people_outline_rounded, size: 64, color: AppColors.textHint.withValues(alpha: 0.4)),
            const SizedBox(height: 24),
            Text(
              'Врачи не найдены',
              style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
            ),
            const SizedBox(height: 8),
            Text(
              'К этой организации еще не прикреплено ни одного врача',
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(fontSize: 13, color: AppColors.textSecondary),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _showAttachDoctorDialog,
              icon: const Icon(Icons.add_rounded),
              label: const Text('Прикрепить врача'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: doctors.length + 1,
      itemBuilder: (context, index) {
        if (index == doctors.length) {
          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 16),
            child: Center(
              child: TextButton.icon(
                onPressed: _showAttachDoctorDialog,
                icon: const Icon(Icons.add_rounded),
                label: const Text('Прикрепить еще врача'),
                style: TextButton.styleFrom(foregroundColor: AppColors.primary),
              ),
            ),
          );
        }
        final doctor = doctors[index];
        return Container(
          margin: const EdgeInsets.only(bottom: 10),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.divider.withValues(alpha: 0.5)),
          ),
          child: ListTile(
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            leading: CircleAvatar(
              radius: 22,
              backgroundColor: AppColors.primary.withValues(alpha: 0.1),
              child: Text(
                doctor.initials,
                style: GoogleFonts.inter(color: AppColors.primary, fontSize: 13, fontWeight: FontWeight.bold),
              ),
            ),
            title: Text(
              doctor.fullName,
              style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 14),
            ),
            subtitle: Text(
              doctor.specialty?.name ?? 'Специальность не указана',
              style: GoogleFonts.inter(fontSize: 12, color: AppColors.textSecondary),
            ),
            trailing: const Icon(Icons.chevron_right_rounded, color: AppColors.textHint, size: 22),
            onTap: () {
              // Option to view doctor detail
            },
          ),
        );
      },
    );
  }

  Widget _buildStockList(List<Map<String, dynamic>> stock) {
    if (stock.isEmpty) {
      return Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.inventory_2_outlined, size: 64, color: AppColors.textHint.withValues(alpha: 0.4)),
            const SizedBox(height: 24),
            Text(
              'Остатки не найдены',
              style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
            ),
            const SizedBox(height: 8),
            Text(
              'В данной организации отсутствуют товары на складе',
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(fontSize: 13, color: AppColors.textSecondary),
            ),
          ],
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: stock.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (context, index) {
        final item = stock[index];
        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.divider.withValues(alpha: 0.5)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.02),
                blurRadius: 8,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.05),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.medication_rounded, color: AppColors.primary, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item['product_name'] ?? 'Неизвестный товар',
                      style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 13),
                    ),
                    if (item['category'] != null)
                      Text(
                        item['category'],
                        style: GoogleFonts.inter(fontSize: 11, color: AppColors.textHint),
                      ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '${item['quantity']} шт',
                  style: GoogleFonts.inter(
                    color: const Color(0xFF10B981),
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildBottomActions(MedOrgModel org) {
    return Container(
      padding: EdgeInsets.fromLTRB(20, 12, 20, 12 + MediaQuery.of(context).padding.bottom),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: ElevatedButton(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => CreateReservationScreen(
                orgId: widget.orgId,
                orgName: org.name,
              ),
            ),
          );
        },
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        ),
        child: Text(
          'Создать бронь',
          style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.bold),
        ),
      ),
    );
  }
}

class _AttachDoctorBottomSheet extends ConsumerStatefulWidget {
  final int orgId;

  const _AttachDoctorBottomSheet({required this.orgId});

  @override
  ConsumerState<_AttachDoctorBottomSheet> createState() => _AttachDoctorBottomSheetState();
}

class _AttachDoctorBottomSheetState extends ConsumerState<_AttachDoctorBottomSheet> {
  final _searchController = TextEditingController();
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final doctorsState = ref.watch(doctorsProvider);
    final allDoctors = doctorsState.doctors;
    
    final filtered = allDoctors.where((d) => 
      d.fullName.toLowerCase().contains(_query.toLowerCase()) && 
      d.medOrg?.id != widget.orgId
    ).toList();

    return Container(
      height: MediaQuery.of(context).size.height * 0.8,
      decoration: const BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          const SizedBox(height: 8),
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: AppColors.divider,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 12, 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Прикрепить врача',
                  style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                ),
                IconButton(
                  icon: const Icon(Icons.close_rounded, color: AppColors.textSecondary),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: TextField(
              controller: _searchController,
              style: GoogleFonts.inter(fontSize: 14),
              decoration: InputDecoration(
                hintText: 'Поиск врача...',
                hintStyle: GoogleFonts.inter(fontSize: 14, color: AppColors.textHint),
                prefixIcon: const Icon(Icons.search_rounded, color: AppColors.textHint, size: 20),
                filled: true,
                fillColor: Colors.white,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: BorderSide(color: AppColors.divider.withValues(alpha: 0.5)),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: BorderSide(color: AppColors.divider.withValues(alpha: 0.5)),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
                ),
              ),
              onChanged: (val) => setState(() => _query = val),
            ),
          ),
          const SizedBox(height: 16),
          Expanded(
            child: filtered.isEmpty
                ? const EmptyView(
                    title: 'Врачи не найдены',
                    subtitle: 'Попробуйте изменить параметры поиска',
                    icon: Icons.person_search_rounded,
                  )
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    itemCount: filtered.length,
                    itemBuilder: (context, index) {
                      final doctor = filtered[index];
                      return Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppColors.divider.withValues(alpha: 0.5)),
                        ),
                        child: ListTile(
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                          leading: CircleAvatar(
                            radius: 20,
                            backgroundColor: AppColors.primary.withValues(alpha: 0.1),
                            child: Text(
                              doctor.initials,
                              style: GoogleFonts.inter(color: AppColors.primary, fontSize: 12, fontWeight: FontWeight.bold),
                            ),
                          ),
                          title: Text(
                            doctor.fullName,
                            style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 14),
                          ),
                          subtitle: Text(
                            doctor.specialty?.name ?? 'Специальность не указана',
                            style: GoogleFonts.inter(fontSize: 12, color: AppColors.textSecondary),
                          ),
                          trailing: const Icon(Icons.add_circle_outline_rounded, color: AppColors.primary, size: 24),
                          onTap: () async {
                            final success = await ref.read(organizationsProvider.notifier)
                                .attachDoctorToOrg(doctor.id, widget.orgId);
                            if (success && mounted) {
                              Navigator.pop(context);
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Врач успешно прикреплен'),
                                  backgroundColor: AppColors.statusApproved,
                                ),
                              );
                            } else if (mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Ошибка при прикреплении врача'),
                                  backgroundColor: AppColors.error,
                                ),
                              );
                            }
                          },
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
