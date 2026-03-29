import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/providers/auth_provider.dart';
import '../../features/auth/screens/login_screen.dart';
import '../../features/auth/screens/splash_screen.dart';
import '../../features/doctors/screens/doctor_detail_screen.dart';
import '../../features/main/screens/main_screen.dart';
import '../../features/notifications/screens/notifications_screen.dart';
import '../../features/organizations/screens/organizations_screen.dart';
import '../../features/reservations/screens/reservations_screen.dart';
import '../../features/reservations/screens/invoices_screen.dart';
import '../../features/reservations/screens/invoice_detail_screen.dart';
import '../../features/reservations/screens/reservation_detail_screen.dart';
import '../../features/visits/screens/create_visit_screen.dart';
import '../../features/main/providers/main_provider.dart';

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
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: '/login',
        name: 'login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/',
        name: 'home',
        builder: (context, state) {
          final indexStr = state.uri.queryParameters['index'];
          final index = int.tryParse(indexStr ?? '');
          return MainScreen(initialIndex: index);
        },
      ),
      GoRoute(
        path: '/doctors/:id',
        name: 'doctor_detail',
        builder: (context, state) {
          final id = int.tryParse(state.pathParameters['id'] ?? '') ?? 0;
          return DoctorDetailScreen(doctorId: id);
        },
      ),
      GoRoute(
        path: '/reservations',
        name: 'reservations',
        builder: (context, state) => const ReservationsScreen(),
      ),
      GoRoute(
        path: '/reservations/create',
        name: 'reservation_create',
        builder: (context, state) => const _CreateReservationScreen(),
      ),
      GoRoute(
        path: '/reservations/:id',
        name: 'reservation_detail',
        builder: (context, state) {
          final id = int.tryParse(state.pathParameters['id'] ?? '') ?? 0;
          return ReservationDetailScreen(reservationId: id);
        },
      ),
      GoRoute(
        path: '/invoices',
        name: 'invoices',
        builder: (context, state) {
          final showDebts = state.uri.queryParameters['showDebts'] == 'true';
          return InvoicesScreen(initialShowDebts: showDebts);
        },
      ),
      GoRoute(
        path: '/invoices/:id',
        name: 'invoice_detail',
        builder: (context, state) {
          final id = int.tryParse(state.pathParameters['id'] ?? '') ?? 0;
          return InvoiceDetailScreen(invoiceId: id);
        },
      ),
      GoRoute(
        path: '/visits/create',
        name: 'visit_create',
        builder: (context, state) => const CreateVisitScreen(),
      ),
      GoRoute(
        path: '/notifications',
        name: 'notifications',
        builder: (context, state) => const NotificationsScreen(),
      ),
      GoRoute(
        path: '/organizations',
        name: 'organizations',
        builder: (context, state) => const OrganizationsScreen(),
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 48, color: Colors.red),
            const SizedBox(height: 16),
            Text('Sahifa topilmadi: ${state.matchedLocation}'),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => context.go('/'),
              child: const Text('Bosh sahifaga'),
            ),
          ],
        ),
      ),
    ),
  );
});

class _CreateReservationScreen extends StatelessWidget {
  const _CreateReservationScreen();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Bron yaratish')),
      body: const Center(child: Text('Tez kunda...')),
    );
  }
}
