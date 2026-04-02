import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/models/visit_plan_model.dart';
import '../../visits/providers/visits_provider.dart';

class VisitPlanDetailsSheet extends ConsumerWidget {
  final int visitId;
  
  const VisitPlanDetailsSheet({super.key, required this.visitId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final visitsState = ref.watch(visitsProvider);
    final l10n = context.l10n;
    
    final visitIndex = visitsState.visits.indexWhere((v) => v.id == visitId);
    if (visitIndex == -1) {
      return const SizedBox.shrink(); // Hide if deleted
    }
    final visit = visitsState.visits[visitIndex];

    final isDoc = visit.doctor != null;
    final name = isDoc ? visit.doctor!.fullName : (visit.medOrg?.name ?? visit.subject ?? l10n.organizations);
    final creatorName = visit.medRep?.fullName ?? 'N/A';
    
    DateTime? parsedDate;
    try {
      parsedDate = DateTime.parse(visit.plannedDate);
    } catch (_) {}

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      decoration: BoxDecoration(
        color: Theme.of(context).scaffoldBackgroundColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
      ),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Drag handle
            Center(
              child: Container(
                width: 40,
                height: 5,
                margin: const EdgeInsets.only(bottom: 24),
                decoration: BoxDecoration(
                  color: Theme.of(context).dividerColor,
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ),
            
            // Header
            Row(
              children: [
                Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    color: (visit.isCompleted ? AppColors.success : AppColors.primary).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Icon(
                    isDoc ? Icons.person_rounded : Icons.business_rounded, 
                    color: visit.isCompleted ? AppColors.success : AppColors.primary, 
                    size: 28
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        name,
                        style: GoogleFonts.inter(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                          color: Theme.of(context).colorScheme.onSurface,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        visit.displayVisitType,
                        style: GoogleFonts.inter(
                          fontSize: 14,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                if (visit.isCompleted)
                  const Icon(Icons.check_circle_rounded, color: AppColors.success, size: 28),
              ],
            ),
            
            const SizedBox(height: 32),
            
            // Info grid
            _buildDetailRow(
              context, 
              icon: Icons.calendar_today_rounded, 
              title: l10n.translate('date') ?? 'Sana', 
              value: parsedDate != null ? DateFormat('dd.MM.yyyy', l10n.locale.languageCode).format(parsedDate) : visit.plannedDate
            ),
            _buildDetailRow(
              context, 
              icon: Icons.person_outline_rounded, 
              title: l10n.translate('created_by') ?? 'Kim tomonidan yaratilgan', 
              value: creatorName
            ),
            if (visit.subject != null && visit.subject!.isNotEmpty)
              _buildDetailRow(
                context, 
                icon: Icons.track_changes_rounded, 
                title: l10n.translate('visit_subject') ?? 'Maqsad/Mavzu', 
                value: visit.subject!
              ),
            if (visit.notes != null && visit.notes!.isNotEmpty)
              _buildDetailRow(
                context, 
                icon: Icons.notes_rounded, 
                title: l10n.translate('comments') ?? 'Izohlar', 
                value: visit.notes!
              ),
              
            const SizedBox(height: 32),
            
            // Action button
            if (!visit.isCompleted)
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.success,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  onPressed: () async {
                    // Do NOT pop here immediately, let it update its state!
                    final success = await ref.read(visitsProvider.notifier).completeVisit(visit.id);
                    if (success && context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(l10n.visitCompletedMsg),
                          backgroundColor: AppColors.success,
                          behavior: SnackBarBehavior.floating,
                        ),
                      );
                    }
                  },
                  child: Text(
                    l10n.markCompleted,
                    style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700),
                  ),
                ),
              ),
            
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(BuildContext context, {required IconData icon, required String title, required String value}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: AppColors.textHint),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: GoogleFonts.inter(fontSize: 12, color: AppColors.textHint, fontWeight: FontWeight.w500),
                ),
                const SizedBox(height: 4),
                Text(
                  value,
                  style: GoogleFonts.inter(fontSize: 15, color: Theme.of(context).colorScheme.onSurface, fontWeight: FontWeight.w500),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
