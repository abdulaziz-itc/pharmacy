import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/l10n/l10n.dart';
import '../../dashboard/screens/daily_plan_screen.dart';
import '../../dashboard/screens/dashboard_screen.dart';
import '../../doctors/screens/doctors_screen.dart';
import '../../notifications/providers/notifications_provider.dart';
import '../../notifications/screens/notifications_screen.dart';
import '../../organizations/screens/organizations_screen.dart';
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
  final List<Widget> _screens = const [
    ProductsScreen(), // 0
    DoctorsScreen(), // 1
    DailyPlanScreen(), // 2
    OrganizationsScreen(), // 3
    NotificationsScreen(), // 4
    DashboardScreen(), // 5
    ProfileScreen(), // 6
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (widget.initialIndex != null) {
        ref.read(mainScreenTabIndexProvider.notifier).state = widget.initialIndex!;
      }
      ref.read(notificationsProvider.notifier).loadNotifications();
    });
  }

  @override
  Widget build(BuildContext context) {
    final currentIndex = ref.watch(mainScreenTabIndexProvider);
    final unreadCount = ref.watch(unreadNotificationsCountProvider);
    final l10n = context.l10n;

    return Scaffold(
      body: IndexedStack(
        index: currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: Theme.of(context).cardColor,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 10,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: SafeArea(
          child: Container(
            height: 70,
            padding: const EdgeInsets.symmetric(horizontal: 2),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _buildNavItem(index: 0, icon: Icons.grid_view_outlined, activeIcon: Icons.grid_view_rounded, label: l10n.products),
                _buildNavItem(index: 1, icon: Icons.person_outline_rounded, activeIcon: Icons.person_rounded, label: l10n.doctors),
                _buildNavItem(index: 2, icon: Icons.calendar_today_outlined, activeIcon: Icons.calendar_today_rounded, label: l10n.plan),
                _buildNavItem(index: 3, icon: Icons.business_outlined, activeIcon: Icons.business_rounded, label: l10n.organizations),
                _buildNavItemWithBadge(index: 4, icon: Icons.notifications_none_rounded, activeIcon: Icons.notifications_rounded, label: l10n.notifications, badgeCount: unreadCount),
                _buildNavItem(index: 5, icon: Icons.bar_chart_outlined, activeIcon: Icons.bar_chart_rounded, label: l10n.reports),
                _buildNavItem(index: 6, icon: Icons.account_circle_outlined, activeIcon: Icons.account_circle_rounded, label: l10n.profile),
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
        padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 4),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isActive ? const Color(0xFFFBBF24).withValues(alpha: 0.1) : Colors.transparent,
              ),
              child: Icon(isActive ? activeIcon : icon, color: isActive ? const Color(0xFFFBBF24) : AppColors.textHint, size: 20),
            ),
            const SizedBox(height: 2),
            Text(label, style: GoogleFonts.inter(fontSize: 8.5, fontWeight: isActive ? FontWeight.w600 : FontWeight.normal, color: isActive ? const Color(0xFFFBBF24) : AppColors.textHint), maxLines: 1, overflow: TextOverflow.ellipsis),
          ],
        ),
      ),
    );
  }

  Widget _buildNavItemWithBadge({required int index, required IconData icon, required IconData activeIcon, required String label, int badgeCount = 0}) {
    final currentIndex = ref.watch(mainScreenTabIndexProvider);
    final isActive = currentIndex == index;
    return GestureDetector(
      onTap: () => ref.read(mainScreenTabIndexProvider.notifier).state = index,
      behavior: HitTestBehavior.opaque,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Stack(
            clipBehavior: Clip.none,
            children: [
              Container(padding: const EdgeInsets.all(6), child: Icon(isActive ? activeIcon : icon, color: isActive ? const Color(0xFFFBBF24) : AppColors.textHint, size: 20)),
              if (badgeCount > 0)
                Positioned(
                  right: -2, top: -2,
                  child: Container(
                    padding: const EdgeInsets.all(2), constraints: const BoxConstraints(minWidth: 14, minHeight: 14),
                    decoration: const BoxDecoration(color: AppColors.error, shape: BoxShape.circle),
                    child: Text(badgeCount > 99 ? '99+' : '$badgeCount', style: GoogleFonts.inter(fontSize: 8, fontWeight: FontWeight.bold, color: Colors.white), textAlign: TextAlign.center),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 2),
          Text(label, style: GoogleFonts.inter(fontSize: 8.5, fontWeight: isActive ? FontWeight.w600 : FontWeight.normal, color: isActive ? const Color(0xFFFBBF24) : AppColors.textHint), maxLines: 1, overflow: TextOverflow.ellipsis),
        ],
      ),
    );
  }
}
