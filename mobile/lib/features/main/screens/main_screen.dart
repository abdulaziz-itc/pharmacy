import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/l10n/l10n.dart';
import '../../dashboard/screens/daily_plan_screen.dart';
import '../../dashboard/screens/dashboard_screen.dart';
import '../../clinics/screens/clinics_screen.dart';
import '../../products/screens/products_screen.dart';
import '../../profile/screens/profile_screen.dart';
import '../providers/main_provider.dart';

class MainScreen extends ConsumerStatefulWidget {
  final int? initialIndex;
  const MainScreen({super.key, this.initialIndex});

  @override
  ConsumerState<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends ConsumerState<MainScreen> {
  // Optimized 5-tab structure
  final List<Widget> _screens = [
    const DashboardScreen(),  // 0: Home / Stats
    const ClinicsScreen(),    // 1: Clients (Doctors + Orgs)
    const DailyPlanScreen(),  // 2: Plan
    const ProductsScreen(),   // 3: Products
    const ProfileScreen(),    // 4: Profile
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (widget.initialIndex != null) {
        ref.read(mainScreenTabIndexProvider.notifier).state = widget.initialIndex!;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final currentIndex = ref.watch(mainScreenTabIndexProvider);
    final l10n = context.l10n;

    return Scaffold(
      body: IndexedStack(index: currentIndex, children: _screens),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: Theme.of(context).cardColor,
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, -4))],
        ),
        child: SafeArea(
          child: Container(
            height: 65,
            padding: const EdgeInsets.symmetric(horizontal: 10),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _buildNavItem(index: 0, icon: Icons.bar_chart_outlined, activeIcon: Icons.bar_chart_rounded, label: l10n.reports),
                _buildNavItem(index: 1, icon: Icons.group_outlined, activeIcon: Icons.group_rounded, label: l10n.get('clients') ?? 'Клиенты'),
                _buildNavItem(index: 2, icon: Icons.calendar_today_outlined, activeIcon: Icons.calendar_today_rounded, label: l10n.plan),
                _buildNavItem(index: 3, icon: Icons.grid_view_outlined, activeIcon: Icons.grid_view_rounded, label: l10n.products),
                _buildNavItem(index: 4, icon: Icons.account_circle_outlined, activeIcon: Icons.account_circle_rounded, label: l10n.profile),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem({required int index, required IconData icon, required IconData activeIcon, required String label}) {
    final currentIndex = ref.watch(mainScreenTabIndexProvider);
    final isActive = currentIndex == index;
    return GestureDetector(
      onTap: () => ref.read(mainScreenTabIndexProvider.notifier).state = index,
      behavior: HitTestBehavior.opaque,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(shape: BoxShape.circle, color: isActive ? AppColors.accent.withValues(alpha: 0.1) : Colors.transparent),
              child: Icon(isActive ? activeIcon : icon, color: isActive ? AppColors.accent : AppColors.textHint, size: 22),
            ),
            const SizedBox(height: 2),
            Text(label, style: GoogleFonts.inter(fontSize: 10, fontWeight: isActive ? FontWeight.w600 : FontWeight.normal, color: isActive ? AppColors.accent : AppColors.textHint), maxLines: 1, overflow: TextOverflow.ellipsis),
          ],
        ),
      ),
    );
  }
}
