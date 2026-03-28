import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import '../../../core/storage/secure_storage.dart';
import '../../../shared/models/user_model.dart';

enum AuthStatus { initial, loading, authenticated, unauthenticated, error }

class AuthState {
  final AuthStatus status;
  final UserModel? user;
  final String? errorMessage;

  const AuthState({
    required this.status,
    this.user,
    this.errorMessage,
  });

  const AuthState.initial() : this(status: AuthStatus.initial);

  AuthState copyWith({
    AuthStatus? status,
    UserModel? user,
    String? errorMessage,
  }) {
    return AuthState(
      status: status ?? this.status,
      user: user ?? this.user,
      errorMessage: errorMessage,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final ApiClient _apiClient;
  final SecureStorage _storage;

  AuthNotifier(this._apiClient, this._storage) : super(const AuthState.initial()) {
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    final hasToken = await _storage.hasToken();
    if (hasToken) {
      final info = await _storage.getUserInfo();
      final userId = int.tryParse(info['userId'] ?? '');
      if (userId != null) {
        state = AuthState(
          status: AuthStatus.authenticated,
          user: UserModel(
            id: userId,
            fullName: info['fullName'] ?? '',
            username: info['username'] ?? '',
            role: info['role'] ?? '',
            isActive: true,
          ),
        );
      } else {
        state = const AuthState(status: AuthStatus.unauthenticated);
      }
    } else {
      state = const AuthState(status: AuthStatus.unauthenticated);
    }
  }

  Future<bool> login(String username, String password) async {
    state = state.copyWith(status: AuthStatus.loading, errorMessage: null);
    try {
      final response = await _apiClient.post(
        ApiEndpoints.login,
        data: FormData.fromMap({
          'username': username,
          'password': password,
          'grant_type': 'password',
        }),
        options: Options(
          contentType: 'application/x-www-form-urlencoded',
        ),
      );

      final data = response.data as Map<String, dynamic>;
      final token = data['access_token'] as String?;

      if (token == null) {
        state = state.copyWith(
          status: AuthStatus.error,
          errorMessage: 'Token olinmadi',
        );
        return false;
      }

      await _storage.saveToken(token);

      // Try to get user info from token response or default
      final userData = data['user'] as Map<String, dynamic>?;
      if (userData != null) {
        final user = UserModel.fromJson(userData);
        await _storage.saveUserInfo(
          userId: user.id,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
        );
        state = AuthState(status: AuthStatus.authenticated, user: user);
      } else {
        // Save minimal info
        await _storage.saveUserInfo(
          userId: 0,
          username: username,
          fullName: username,
          role: 'med_rep',
        );
        state = AuthState(
          status: AuthStatus.authenticated,
          user: UserModel(
            id: 0,
            fullName: username,
            username: username,
            role: 'med_rep',
            isActive: true,
          ),
        );
      }
      return true;
    } on DioException catch (e) {
      String message = 'Login yoki parol noto\'g\'ri';
      if (e.response?.statusCode == 401 || e.response?.statusCode == 400) {
        message = 'Login yoki parol noto\'g\'ri';
      } else if (e.type == DioExceptionType.connectionError ||
          e.type == DioExceptionType.connectionTimeout) {
        message = 'Internet ulanishini tekshiring';
      } else {
        message = e.message ?? 'Noma\'lum xatolik';
      }
      state = state.copyWith(
        status: AuthStatus.error,
        errorMessage: message,
      );
      return false;
    } catch (e) {
      state = state.copyWith(
        status: AuthStatus.error,
        errorMessage: e.toString(),
      );
      return false;
    }
  }

  Future<void> logout() async {
    await _storage.clearAll();
    state = const AuthState(status: AuthStatus.unauthenticated);
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  final storage = ref.watch(secureStorageProvider);
  return AuthNotifier(apiClient, storage);
});
