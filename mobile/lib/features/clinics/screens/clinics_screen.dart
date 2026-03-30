import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/l10n/l10n.dart';
import '../../../shared/providers/ui_provider.dart';
import '../../doctors/screens/doctors_screen.dart';
import '../../organizations/screens/organizations_screen.dart';

class ClinicsScreen extends ConsumerStatefulWidget {
  const ClinicsScreen({super.key});

  @override
  ConsumerState<ClinicsScreen> createState() => _ClinicsScreenState();
}

class _ClinicsScreenState extends ConsumerState<ClinicsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.translate('clients') ?? 'Клиенты'),
        bottom: TabBar(
          controller: _tabController,
          tabs: [
            Tab(text: l10n.doctors),
            Tab(text: l10n.organizations),
          ],
        ),
      ),
      body: ProviderScope(
        overrides: [
          isEmbeddedProvider.overrideWith((ref) => true),
        ],
        child: TabBarView(
          controller: _tabController,
          children: [
            const DoctorsScreen(),
            const OrganizationsScreen(),
          ],
        ),
      ),
    );
  }
}
