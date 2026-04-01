import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../l10n/l10n.dart';
import '../../features/auth/providers/auth_provider.dart';
import '../../features/auth/screens/login_screen.dart';
import '../../features/auth/screens/splash_screen.dart';
import '../../features/doctors/screens/doctor_detail_screen.dart';
import '../../features/main/screens/main_screen.dart';
import '../../features/notifications/screens/notifications_screen.dart';
import '../../features/organizations/screens/organizations_screen.dart';
import '../../features/organizations/screens/organization_detail_screen.dart';
import '../../features/reservations/screens/reservations_screen.dart';
import '../../features/reservations/screens/invoices_screen.dart';
import '../../features/reservations/screens/invoice_detail_screen.dart';
import '../../features/reservations/screens/reservation_detail_screen.dart';
import '../../features/reservations/screens/create_reservation_screen.dart';
import '../../features/visits/screens/create_visit_screen.dart';
import '../../features/main/providers/main_provider.dart';
import '../../features/bonus/screens/bonus_screen.dart';
import '../../features/doctors/screens/create_doctor_screen.dart';
import '../../features/organizations/screens/create_organization_screen.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/splash',
    debugLogDiagnostics: false,
    redirect: (context, state) {
      final isInitial = authState.status == AuthStatus.initial;
      final isAuthenticated = authState.status == AuthStatus.authenticated;
      final location = state.matchedLocation;

      // Show splash while checking auth
      if (isInitial) {
        return location == '/splash' ? null : '/splash';
      }

      // Not authenticated → go to login
      if (!isAuthenticated) {
        return location == '/login' ? null : '/login';
      }

      // Authenticated → go to home (skip splash and login)
      if (location == '/splash' || location == '/login') {
        return '/';
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/splash',
        pageBuilder: (context, state) => _fadeTransition(state, const SplashScreen()),
      ),
      GoRoute(
        path: '/login',
        name: 'login',
        pageBuilder: (context, state) => _fadeTransition(state, const LoginScreen()),
      ),
      GoRoute(
        path: '/',
        name: 'home',
        pageBuilder: (context, state) {
          final indexStr = state.uri.queryParameters['index'];
          final index = int.tryParse(indexStr ?? '');
          return _fadeTransition(state, MainScreen(initialIndex: index));
        },
      ),
      GoRoute(
        path: '/doctors/create',
        name: 'doctor_create',
        pageBuilder: (context, state) => _fadeTransition(state, const CreateDoctorScreen()),
      ),
      GoRoute(
        path: '/doctors/:id',
        name: 'doctor_detail',
        pageBuilder: (context, state) {
          final id = int.tryParse(state.pathParameters['id'] ?? '') ?? 0;
          return _fadeTransition(state, DoctorDetailScreen(doctorId: id));
        },
      ),
      GoRoute(
        path: '/reservations',
        name: 'reservations',
        pageBuilder: (context, state) {
          final year = int.tryParse(state.uri.queryParameters['year'] ?? '');
          final month = int.tryParse(state.uri.queryParameters['month'] ?? '');
          return _fadeTransition(state, ReservationsScreen(year: year, month: month));
        },
      ),
      GoRoute(
        path: '/reservations/create',
        name: 'reservation_create',
        pageBuilder: (context, state) {
          final orgId = int.tryParse(state.uri.queryParameters['orgId'] ?? '');
          final orgName = state.uri.queryParameters['orgName'];
          return _fadeTransition(state, CreateReservationScreen(orgId: orgId, orgName: orgName));
        },
      ),
      GoRoute(
        path: '/reservations/:id',
        name: 'reservation_detail',
        pageBuilder: (context, state) {
          final id = int.tryParse(state.pathParameters['id'] ?? '') ?? 0;
          return _fadeTransition(state, ReservationDetailScreen(reservationId: id));
        },
      ),
      GoRoute(
        path: '/invoices',
        name: 'invoices',
        pageBuilder: (context, state) {
          final showDebts = state.uri.queryParameters['showDebts'] == 'true';
          final year = int.tryParse(state.uri.queryParameters['year'] ?? '');
          final month = int.tryParse(state.uri.queryParameters['month'] ?? '');
          return _fadeTransition(state, InvoicesScreen(
            initialShowDebts: showDebts,
            year: year,
            month: month,
          ));
        },
      ),
      GoRoute(
        path: '/invoices/:id',
        name: 'invoice_detail',
        pageBuilder: (context, state) {
          final id = int.tryParse(state.pathParameters['id'] ?? '') ?? 0;
          return _fadeTransition(state, InvoiceDetailScreen(invoiceId: id));
        },
      ),
      GoRoute(
        path: '/visits/create',
        name: 'visit_create',
        pageBuilder: (context, state) => _fadeTransition(state, const CreateVisitScreen()),
      ),
      GoRoute(
        path: '/notifications',
        name: 'notifications',
        pageBuilder: (context, state) => _fadeTransition(state, const NotificationsScreen()),
      ),
      GoRoute(
        path: '/organizations',
        name: 'organizations',
        pageBuilder: (context, state) => _fadeTransition(state, const OrganizationsScreen()),
      ),
      GoRoute(
        path: '/organizations/create',
        name: 'organization_create',
        pageBuilder: (context, state) => _fadeTransition(state, const CreateOrganizationScreen()),
      ),
      GoRoute(
        path: '/organizations/:id',
        name: 'organization_detail',
        pageBuilder: (context, state) {
          final id = int.tryParse(state.pathParameters['id'] ?? '') ?? 0;
          return _fadeTransition(state, OrganizationDetailScreen(orgId: id));
        },
      ),
      GoRoute(
        path: '/bonus',
        name: 'bonus',
        pageBuilder: (context, state) => _fadeTransition(state, const BonusScreen()),
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text('${context.l10n.pageNotFound}: ${state.matchedLocation}'),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => context.go('/'),
              child: Text(context.l10n.goHome),
            ),
          ],
        ),
      ),
    ),
  );
});

CustomTransitionPage _fadeTransition(GoRouterState state, Widget child) {
  return CustomTransitionPage(
    key: state.pageKey,
    child: child,
    transitionsBuilder: (context, animation, secondaryAnimation, child) {
      return FadeTransition(
        opacity: CurveTween(curve: Curves.easeInOut).animate(animation),
        child: child,
      );
    },
    transitionDuration: const Duration(milliseconds: 300),
  );
}
