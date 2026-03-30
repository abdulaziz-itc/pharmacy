import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/l10n/l10n.dart';
import '../../../shared/models/doctor_model.dart';
import '../../../shared/widgets/empty_view.dart';
import '../../../shared/widgets/error_view.dart';
import '../../../shared/widgets/loading_shimmer.dart';
import '../providers/doctors_provider.dart';

class DoctorsScreen extends ConsumerStatefulWidget {
  const DoctorsScreen({super.key});

  @override
  ConsumerState<DoctorsScreen> createState() => _DoctorsScreenState();
}

class _DoctorsScreenState extends ConsumerState<DoctorsScreen> {
  final _searchController = TextEditingController();
  final _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(doctorsProvider.notifier).loadDoctors(refresh: true);
    });
    _scrollController.addListener(_onScroll);
  }

  void _onScroll() {
    if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent - 200) {
      ref.read(doctorsProvider.notifier).loadDoctors();
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(doctorsProvider);
    final l10n = context.l10n;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text(l10n.doctors),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list_rounded),
            onPressed: () {},
          ),
        ],
      ),
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: '${l10n.get('search_doctor') ?? 'Поиск врача'}...',
                prefixIcon: const Icon(Icons.search_rounded),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, size: 18),
                        onPressed: () {
                          _searchController.clear();
                          ref.read(doctorsProvider.notifier).search('');
                        },
                      )
                    : null,
              ),
              onChanged: (value) {
                setState(() {});
                if (value.isEmpty || value.length >= 2) {
                  ref.read(doctorsProvider.notifier).search(value);
                }
              },
            ),
          ),
          if (state.status == DoctorsLoadStatus.loaded)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              alignment: Alignment.centerLeft,
              child: Text(
                '${l10n.get('found') ?? 'Найдено'} ${state.doctors.length} ${l10n.doctors.toLowerCase()}',
                style: GoogleFonts.inter(fontSize: 13, color: Theme.of(context).textTheme.bodySmall?.color),
              ),
            ),
          Expanded(child: _buildContent(state, l10n)),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        heroTag: 'doctors_fab',
        onPressed: () => context.push('/doctors/create'),
        child: const Icon(Icons.add_rounded, size: 28),
      ),
    );
  }

  Widget _buildContent(DoctorsState state, S l10n) {
    if (state.status == DoctorsLoadStatus.loading) return const ShimmerList(count: 6);
    if (state.status == DoctorsLoadStatus.error && state.doctors.isEmpty) {
      return ErrorView(message: state.errorMessage ?? l10n.error, onRetry: () => ref.read(doctorsProvider.notifier).loadDoctors(refresh: true), fullScreen: true);
    }
    if (state.doctors.isEmpty && state.status == DoctorsLoadStatus.loaded) {
      return EmptyView(title: l10n.get('nothing_found') ?? 'Врачи не найдены', subtitle: l10n.get('try_changing_search') ?? 'Попробуйте изменить параметры поиска', icon: Icons.person_search_rounded);
    }

    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.symmetric(vertical: 8),
      itemCount: state.doctors.length + (state.hasMore ? 1 : 0),
      itemBuilder: (context, index) {
        if (index >= state.doctors.length) {
          return const Padding(padding: EdgeInsets.all(16), child: Center(child: CircularProgressIndicator(strokeWidth: 2)));
        }
        return _buildDoctorCard(state.doctors[index]);
      },
    );
  }

  Widget _buildDoctorCard(DoctorModel doctor) {
    return GestureDetector(
      onTap: () => context.push('/doctors/${doctor.id}'),
      child: Card(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 5),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Hero(
                tag: 'doctor_avatar_${doctor.id}',
                child: Container(
                  width: 52, height: 52,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(colors: [AppColors.accent.withValues(alpha: 0.7), AppColors.primary.withValues(alpha: 0.7)]),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Center(
                    child: Text(doctor.initials, style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                  ),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(doctor.fullName, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600), maxLines: 1, overflow: TextOverflow.ellipsis),
                    const SizedBox(height: 4),
                    if (doctor.specialty != null) Text(doctor.specialty!.name, style: GoogleFonts.inter(fontSize: 12, color: AppColors.accent, fontWeight: FontWeight.w500)),
                    const SizedBox(height: 3),
                    if (doctor.medOrg != null)
                      Row(
                        children: [
                          const Icon(Icons.local_hospital_outlined, size: 12, color: AppColors.textHint),
                          const SizedBox(width: 4),
                          Expanded(child: Text(doctor.medOrg!.name, style: GoogleFonts.inter(fontSize: 11, color: Theme.of(context).textTheme.bodySmall?.color), maxLines: 1, overflow: TextOverflow.ellipsis)),
                        ],
                      ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right_rounded, color: AppColors.textHint, size: 20),
            ],
          ),
        ),
      ),
    );
  }
}
