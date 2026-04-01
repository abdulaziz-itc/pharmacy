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
import '../../../shared/widgets/notification_action.dart';
import '../../../shared/providers/ui_provider.dart';
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
    final isEmbedded = ref.watch(isEmbeddedProvider);

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: isEmbedded ? null : AppBar(
        title: Text(l10n.doctors),
        backgroundColor: Colors.transparent,
        actions: [NotificationAction()],
      ),
      body: ListView(
        controller: _scrollController,
        padding: EdgeInsets.zero,
        children: <Widget>[
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
            child: Container(
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
              child: TextField(
                controller: _searchController,
                style: GoogleFonts.inter(fontSize: 14, color: Theme.of(context).textTheme.bodyLarge?.color),
                decoration: InputDecoration(
                  hintText: '${l10n.searchDoctor}...',
                  hintStyle: GoogleFonts.inter(color: AppColors.textHint),
                  prefixIcon: const Icon(Icons.search_rounded, color: AppColors.primary, size: 22),
                  suffixIcon: _searchController.text.isNotEmpty 
                    ? IconButton(
                        icon: const Icon(Icons.clear_rounded, size: 18, color: AppColors.textHint),
                        onPressed: () {
                          _searchController.clear();
                          ref.read(doctorsProvider.notifier).search('');
                          setState(() {});
                        },
                      )
                    : null,
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
                ),
                onChanged: (value) {
                  setState(() {});
                  if (value.isEmpty || value.length >= 2) {
                    ref.read(doctorsProvider.notifier).search(value);
                  }
                },
              ),
            ),
          ),
          _buildContent(state, l10n),
        ],
      ),
      floatingActionButton: isEmbedded ? null : FloatingActionButton(
        heroTag: 'doctors_fab',
        onPressed: () => context.push('/doctors/create'),
        child: const Icon(Icons.add_rounded, size: 28),
      ),
    );
  }

  Widget _buildContent(DoctorsState state, S l10n) {
    if (state.status == DoctorsLoadStatus.loading) return const ShimmerList(count: 6);
    if (state.status == DoctorsLoadStatus.error) {
      return ErrorView(
        message: state.errorMessage ?? l10n.errorOccurred, 
        onRetry: () => ref.read(doctorsProvider.notifier).loadDoctors(refresh: true), 
        fullScreen: true
      );
    }
    if (state.doctors.isEmpty) {
      return EmptyView(
        title: l10n.nothingFound, 
        icon: Icons.person_search_rounded
      );
    }

    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.only(bottom: 24),
      itemCount: state.doctors.length + (state.hasMore ? 1 : 0),
      itemBuilder: (context, index) {
        if (index >= state.doctors.length) {
          return const Padding(
            padding: EdgeInsets.symmetric(vertical: 24), 
            child: Center(child: CircularProgressIndicator(strokeWidth: 2.5, color: AppColors.primary))
          );
        }
        final doctor = state.doctors[index];
        return Container(
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
          decoration: BoxDecoration(
            color: Theme.of(context).cardColor,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Theme.of(context).dividerColor),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.2),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: () => context.push('/doctors/${doctor.id}'),
              borderRadius: BorderRadius.circular(16),
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Row(
                  children: [
                    Hero(
                      tag: 'doctor_avatar_${doctor.id}',
                      child: Container(
                        width: 52,
                        height: 52,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [AppColors.primary, AppColors.primary.withValues(alpha: 0.7)],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          doctor.initials,
                          style: GoogleFonts.inter(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            doctor.fullName,
                            style: GoogleFonts.inter(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                              color: Theme.of(context).textTheme.titleLarge?.color,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              doctor.specialty?.name ?? l10n.specialtyLabel,
                              style: GoogleFonts.inter(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: AppColors.primary,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Icon(Icons.chevron_right_rounded, color: AppColors.textHint, size: 22),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
