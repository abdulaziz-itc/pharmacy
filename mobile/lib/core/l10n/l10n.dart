import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

class S {
  final Locale locale;
  S(this.locale);

  static final Map<String, Map<String, String>> _values = {
    'ru': {
      'products': 'Продукты',
      'doctors': 'Врачи',
      'plan': 'План',
      'organizations': 'Организации',
      'notifications': 'Уведомления',
      'reports': 'Отчеты',
      'profile': 'Профиль',
      'settings': 'Настройки',
      'language': 'Язык',
      'theme': 'Тема',
      'dark_mode': 'Темный режим',
      'change_password': 'Изменить пароль',
      'logout': 'Выйти',
      'app_about': 'О приложении',
      'version': 'Версия',
      'cancel': 'Отмена',
      'save': 'Сохранить',
      'current_password': 'Текущий пароль',
      'new_password': 'Новый пароль',
      'confirm_password': 'Подтвердите пароль',
      'password_changed': 'Пароль успешно изменен',
      'error': 'Ошибка',
      'update': 'Обновить',
    },
    'uz': {
      'products': 'Mahsulotlar',
      'doctors': 'Shifokorlar',
      'plan': 'Reja',
      'organizations': 'Tashkilotlar',
      'notifications': 'Bildirishnomalar',
      'reports': 'Hisobotlar',
      'profile': 'Profil',
      'settings': 'Sozlamalar',
      'language': 'Til',
      'theme': 'Mavzu',
      'dark_mode': 'Tungi rejim',
      'change_password': 'Parolni o\'zgartirish',
      'logout': 'Chiqish',
      'app_about': 'Ilova haqida',
      'version': 'Versiya',
      'cancel': 'Bekor qilish',
      'save': 'Saqlash',
      'current_password': 'Joriy parol',
      'new_password': 'Yangi parol',
      'confirm_password': 'Parolni tasdiqlang',
      'password_changed': 'Parol muvaffaqiyatli o\'zgartirildi',
      'error': 'Xato',
      'update': 'Yangilash',
    },
  };

  String translate(String key) => _values[locale.languageCode]?[key] ?? key;

  String get products => translate('products');
  String get doctors => translate('doctors');
  String get plan => translate('plan');
  String get organizations => translate('organizations');
  String get notifications => translate('notifications');
  String get reports => translate('reports');
  String get profile => translate('profile');
  String get settings => translate('settings');
  String get language => translate('language');
  String get theme => translate('theme');
  String get darkMode => translate('dark_mode');
  String get changePassword => translate('change_password');
  String get logout => translate('logout');
  String get appAbout => translate('app_about');
  String get version => translate('version');
  String get cancel => translate('cancel');
  String get save => translate('save');
  String get error => translate('error');
  String get update => translate('update');
}

final localeProvider = StateNotifierProvider<LocaleNotifier, Locale>((ref) {
  return LocaleNotifier();
});

class LocaleNotifier extends StateNotifier<Locale> {
  LocaleNotifier() : super(const Locale('uz')) {
    _loadLocale();
  }

  Future<void> _loadLocale() async {
    final prefs = await SharedPreferences.getInstance();
    final langCode = prefs.getString('languageCode') ?? 'uz';
    state = Locale(langCode);
  }

  Future<void> setLocale(String langCode) async {
    final prefs = await SharedPreferences.getInstance();
    state = Locale(langCode);
    await prefs.setString('languageCode', langCode);
  }
}

extension LocaleExtension on BuildContext {
  S get l10n => S(ProviderScope.containerOf(this).read(localeProvider));
}
