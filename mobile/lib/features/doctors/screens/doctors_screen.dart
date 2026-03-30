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
        actions: [NotificationAction()],
      ),
      body: Flex(
        direction: Axis.vertical,
        children: <Widget>[
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: '${l10n.get('search_doctor') ?? 'Поиск врача'}...',
                prefixIcon: const Icon(Icons.search_rounded),
                suffixIcon: IconButton(
                  icon: const Icon(Icons.clear, size: 18),
                  onPressed: () {
                    _searchController.clear();
                    ref.read(doctorsProvider.notifier).search('');
                  },
                ),
              ),
              onChanged: (value) {
                setState(() {});
                if (value.isEmpty || value.length >= 2) {
                  ref.read(doctorsProvider.notifier).search(value);
                }
              },
            ),
          ),
          Expanded(child: _buildContent(state, l10n)),
        ],
      ),
      floatingActionButton: isEmbedded ? null : FloatingActionButton(
        heroTag: 'doctors_fab',
        onPressed: () => context.push('/doctors/create'),
        child: const Icon(Icons.add, size: 28),
      ),
    );
  }

  Widget _buildContent(DoctorsState state, S l10n) {
    if (state.status == DoctorsLoadStatus.loading) return const ShimmerList(count: 6);
    if (state.status == DoctorsLoadStatus.error) {
      return ErrorView(message: state.errorMessage ?? l10n.error, onRetry: () => ref.read(doctorsProvider.notifier).loadDoctors(refresh: true), fullScreen: true);
    }
    if (state.doctors.isEmpty) {
      return EmptyView(title: l10n.get('nothing_found') ?? 'Врачи не найдены', icon: Icons.person_search_rounded);
    }

    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.symmetric(vertical: 8),
      itemCount: state.doctors.length + (state.hasMore ? 1 : 0),
      itemBuilder: (context, index) {
        if (index >= state.doctors.length) {
          return const Padding(padding: EdgeInsets.all(16), child: Center(child: CircularProgressIndicator(strokeWidth: 2)));
        }
        final doctor = state.doctors[index];
        return Card(
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 5),
          child: ListTile(
            onTap: () => context.push('/doctors/${doctor.id}'),
            leading: Hero(
              tag: 'doctor_avatar_${doctor.id}',
              child: CircleAvatar(
                backgroundColor: AppColors.primary.withValues(alpha: 0.1),
                child: Text(doctor.initials),
              ),
            ),
            title: Text(doctor.fullName, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600)),
            subtitle: Text(doctor.specialty?.name ?? '', style: GoogleFonts.inter(fontSize: 12)),
            trailing: const Icon(Icons.chevron_right_rounded, size: 20),
          ),
        );
      },
    );
  }
}
