import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/l10n/l10n.dart';
import '../../../features/auth/providers/auth_provider.dart';
import '../../../features/notifications/screens/notifications_screen.dart';
import '../../../features/organizations/screens/organizations_screen.dart';
import 'package:dio/dio.dart';
import '../../../core/api/api_client.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  bool _isUpdatingPassword = false;

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final user = authState.user;
    final l10n = context.l10n;
    final currentLocale = ref.watch(localeProvider);
    final themeMode = ref.watch(themeProvider);

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text(l10n.profile),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // Profile header
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(24, 24, 24, 32),
              decoration: const BoxDecoration(
                gradient: AppColors.cardGradient,
              ),
              child: Column(
                children: [
                  Hero(
                    tag: 'profile_avatar',
                    child: Container(
                      width: 88, height: 88,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.2),
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white.withValues(alpha: 0.4), width: 3),
                      ),
                      child: Center(
                        child: Text(
                          user?.fullName.isNotEmpty == true ? user!.fullName[0].toUpperCase() : '?',
                          style: GoogleFonts.poppins(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    user?.fullName ?? '',
                    style: GoogleFonts.poppins(fontSize: 20, fontWeight: FontWeight.w600, color: Colors.white),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '@${user?.username ?? ''}',
                    style: GoogleFonts.inter(fontSize: 14, color: Colors.white.withValues(alpha: 0.7)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            // Menu sections
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                children: [
                  _buildMenuSection(
                    title: l10n.settings,
                    items: [
                      _MenuItem(
                        icon: Icons.language_outlined,
                        label: '${l10n.language}: ${currentLocale.languageCode == 'uz' ? 'O\'zbek' : 'Русский'}',
                        color: AppColors.primary,
                        onTap: () => _showLanguageDialog(context),
                      ),
                      _MenuItem(
                        icon: themeMode == ThemeMode.dark ? Icons.dark_mode : Icons.light_mode,
                        label: l10n.darkMode,
                        color: AppColors.statusCompleted,
                        trailing: Switch.adaptive(
                          value: themeMode == ThemeMode.dark,
                          onChanged: (_) => ref.read(themeProvider.notifier).toggleTheme(),
                          activeColor: AppColors.accent,
                        ),
                        onTap: () => ref.read(themeProvider.notifier).toggleTheme(),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  _buildMenuSection(
                    title: l10n.profile,
                    items: [
                      _MenuItem(
                        icon: Icons.lock_outline_rounded,
                        label: l10n.changePassword,
                        color: AppColors.statusPending,
                        onTap: () => _showChangePasswordDialog(context),
                      ),
                      _MenuItem(
                        icon: Icons.logout_rounded,
                        label: l10n.logout,
                        color: AppColors.error,
                        isDestructive: true,
                        onTap: () => _showLogoutDialog(context, ref),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),
            Text('PharmaRep v1.1.0', style: GoogleFonts.inter(fontSize: 12, color: AppColors.textHint)),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildMenuSection({required String title, required List<_MenuItem> items}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 8),
          child: Text(title.toUpperCase(), style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.textSecondary, letterSpacing: 1.0)),
        ),
        Container(
          decoration: BoxDecoration(
            color: Theme.of(context).cardColor,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Theme.of(context).dividerColor),
          ),
          child: ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: items.length,
            separatorBuilder: (_, __) => const Divider(height: 1, indent: 56),
            itemBuilder: (context, index) {
              final item = items[index];
              return ListTile(
                leading: Container(
                  width: 36, height: 36,
                  decoration: BoxDecoration(color: item.color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
                  child: Icon(item.icon, color: item.color, size: 18),
                ),
                title: Text(item.label, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w500)),
                trailing: item.trailing ?? const Icon(Icons.chevron_right_rounded, size: 18),
                onTap: item.onTap,
              );
            },
          ),
        ),
      ],
    );
  }

  void _showLanguageDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(context.l10n.language),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              title: const Text('O\'zbek'),
              onTap: () { ref.read(localeProvider.notifier).setLocale('uz'); Navigator.pop(context); },
              trailing: ref.read(localeProvider).languageCode == 'uz' ? const Icon(Icons.check, color: AppColors.success) : null,
            ),
            ListTile(
              title: const Text('Русский'),
              onTap: () { ref.read(localeProvider.notifier).setLocale('ru'); Navigator.pop(context); },
              trailing: ref.read(localeProvider).languageCode == 'ru' ? const Icon(Icons.check, color: AppColors.success) : null,
            ),
          ],
        ),
      ),
    );
  }

  void _showChangePasswordDialog(BuildContext context) {
    final newPasswordController = TextEditingController();
    final confirmPasswordController = TextEditingController();
    final l10n = context.l10n;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text(l10n.changePassword),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: newPasswordController,
                obscureText: true,
                decoration: InputDecoration(labelText: l10n.translate('new_password')),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: confirmPasswordController,
                obscureText: true,
                decoration: InputDecoration(labelText: l10n.translate('confirm_password')),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: Text(l10n.cancel)),
            ElevatedButton(
              onPressed: _isUpdatingPassword ? null : () async {
                if (newPasswordController.text != confirmPasswordController.text) {
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Passwords do not match')));
                  return;
                }
                setDialogState(() => _isUpdatingPassword = true);
                try {
                  final apiClient = ref.read(apiClientProvider);
                  await apiClient.put('/users/me', data: {'password': newPasswordController.text});
                  if (context.mounted) {
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l10n.translate('password_changed'))));
                  }
                } catch (e) {
                  if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('${l10n.error}: $e')));
                } finally {
                  if (context.mounted) setDialogState(() => _isUpdatingPassword = false);
                }
              },
              child: _isUpdatingPassword ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : Text(l10n.save),
            ),
          ],
        ),
      ),
    );
  }

  void _showLogoutDialog(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(context.l10n.logout),
        content: const Text('Are you sure you want to logout?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: Text(context.l10n.cancel)),
          ElevatedButton(
            onPressed: () { Navigator.pop(context); ref.read(authProvider.notifier).logout(); },
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            child: Text(context.l10n.logout, style: const TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }
}

class _MenuItem {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;
  final Widget? trailing;
  final bool isDestructive;
  const _MenuItem({required this.icon, required this.label, required this.color, required this.onTap, this.trailing, this.isDestructive = false});
}
