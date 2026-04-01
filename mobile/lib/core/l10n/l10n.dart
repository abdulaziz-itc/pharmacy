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
      'clients': 'Клиенты',
      'hospitals': 'Больницы',
      'pharmacies': 'Аптеки',
      'search_organization': 'Поиск организации',
      'total_sales': 'Общие продажи',
      'bonus_balance': 'Бонусный баланс',
      'planned_visits': 'Запланированные визиты',
      'indicators': 'Показатели',
      'active_doctors': 'Активные врачи',
      'pending_reservations': 'Ожидаемые брони',
      'total_debt': 'Общая задолженность',
      'completed_visits': 'Выполненные визиты',
      'revenue_forecast': 'Прогноз выручки',
      'visit_completion': 'Выполнение визитов',
      'completed': 'завершено',
      'visits': 'Визиты',
      'sales': 'Продажи',
      'no_visits_today': 'На сегодня нет визитов',
      'nothing_found': 'Ничего не найдено',
      'search_doctor': 'Поиск врача',
      'retry': 'Повторить',
      'search_medicine': 'Поиск лекарств',
      'price': 'Цена',
      'select_period': 'Выберите период',
      'apply': 'Применить',
      'select_month': 'Выберите месяц',
      'select_year': 'Выберите год',
      'logout_confirmation': 'Вы действительно хотите выйти?',
      'passwords_no_match': 'Пароли не совпадают',
      'medicine_name': 'Название лекарства',
      'try_changing_search': 'Попробуйте изменить запрос поиска',
      'username': 'Имя пользователя',
      'password': 'Пароль',
      'login': 'Войти',
      'welcome_back': 'С возвращением',
      'enter_credentials': 'Введите свои учетные данные, чтобы продолжить',
      'invalid_credentials': 'Неверное имя пользователя или пароль',
      'loading': 'Загрузка...',
      'for_med_reps': 'Для мед. представителей',
      'enter_username': 'Введите имя пользователя',
      'enter_password': 'Введите пароль',
      'password_too_short': 'Пароль должен содержать минимум 4 символа',
      'home': 'Главная',
      'visits_nav': 'Визиты',
      'reservations_nav': 'Брони',
      'organizations_nav': 'Организации',
      'profile_nav': 'Профиль',
      'add': 'Добавить',
      'edit': 'Изменить',
      'delete': 'Удалить',
      'info': 'Информация',
      'confirm': 'Подтвердить',
      'yes': 'Да',
      'no': 'Нет',
      'statistics': 'Статистика',
      'my_plans': 'Мои планы',
      'active_reservations': 'Активные брони',
      'recent_visits': 'Недавние визиты',
      'view_all': 'Посмотреть все',
      'pending': 'В ожидании',
      'accepted': 'Принято',
      'rejected': 'Отклонено',
      'delivered': 'Доставлено',
      'cancelled': 'Отменено',
      'phone_number': 'Номер телефона',
      'address': 'Адрес',
      'date': 'Дата',
      'time': 'Время',
      'description': 'Описание',
      'notes': 'Заметки',
      'january': 'Январь',
      'february': 'Февраль',
      'march': 'Март',
      'april': 'Апрель',
      'may': 'Май',
      'june': 'Июнь',
      'july': 'Июль',
      'august': 'Август',
      'september': 'Сентябрь',
      'october': 'Октябрь',
      'november': 'Ноябрь',
      'december': 'Декабрь',
      'visits_title': 'Визиты',
      'planned': 'Запланировано',
      'completed_status': 'Выполнено',
      'no_planned_visits': 'Нет запланированных визитов',
      'no_completed_visits': 'Нет выполненных визитов',
      'add_new_visit': 'Добавьте новый визит',
      'add_visit': 'Добавить визит',
      'unnamed_visit': 'Визит без названия',
      'visit_completed_msg': 'Визит выполнен!',
      'error_occurred': 'Произошла ошибка',
      'field_visit': 'Визит в регион',
      'office_visit': 'Офисный визит',
      'online_visit': 'Онлайн',
      'select_doctor': 'Выберите врача',
      'select_product': 'Выберите продукт',
      'enter_amount': 'Введите сумму',
      'available_balance': 'Доступно',
      'submit_allocation': 'Подтвердить распределение',
      'allocation_success': 'Бонус успешно распределен',
      'allocation_error': 'Ошибка при распределении бонуса',
      'select_doctor_product_error': 'Пожалуйста, выберите врача и продукт',
      'notes_placeholder': 'Напишите что-нибудь...',
      'period_label': 'Период (Месяц/Год)',
      'attach_to_doctor_title': 'Прикрепить к врачу',
      'create_visit_plan': 'План визита',
      'save_plan': 'Сохранить план',
      'visit_date': 'Дата визита',
      'visit_type': 'Тип визита',
      'visit_subject': 'Тема',
      'enter_subject': 'Введите тему',
      'comment_optional': 'Комментарий (опционально)',
      'visit_plan_created': 'План визита создан!',
      'reservations_title': 'Бронирования',
      'fill_required_fields': 'Пожалуйста, заполните обязательные поля (Регион, Специальность, Организация)',
      'doctor_added_success': 'Врач успешно добавлен',
      'doctor_create_error': 'Ошибка при создании врача',
      'add_doctor_title': 'Добавить врача',
      'main_info_section': 'ОСНОВНАЯ ИНФОРМАЦИЯ',
      'doctor_full_name_label': 'ФИО Врача',
      'enter_full_name_hint': 'Введите ФИО',
      'contact_phone_label': 'Контактный телефон',
      'categorization_section': 'КАТЕГОРИЗАЦИЯ',
      'specialties_load_error': 'Ошибка загрузки специальностей',
      'categories_load_error': 'Ошибка загрузки категорий',
      'location_work_section': 'ЛОКАЦИЯ И МЕСТО РАБОТЫ',
      'regions_load_error': 'Ошибка загрузки регионов',
      'splash_slogan': 'С сердечной заботой о Вас!',
      'page_not_found': 'Страница не найдена',
      'go_home': 'На главную',
      'minutes_ago': 'мин. назад',
      'hours_ago': 'ч. назад',
      'days_ago': 'дн. назад',
      'read_all_action': 'Прочитать все',
      'no_notifications': 'Уведомлений нет',
      'no_notifications_subtitle': 'Ваши новые уведомления появятся здесь',
      'unread_label': 'Непрочитанные',
      'error_loading': 'Ошибка загрузки',
      'load_data_error': 'Ошибка загрузки данных',
      'unexpected_error': 'Произошла непредвиденная ошибка. Пожалуйста, убедитесь, что сервер обновлен.',
      'retry': 'Повторить',
      'info_section': 'ИНФОРМАЦИЯ',
      'contacts_section': 'КОНТАКТЫ',
      'doctor_label': 'Врач',
      'call_action': 'Позвонить',
      'visit_action': 'Визит',
      'plan_execution': 'ВЫПОЛНЕНИЕ ПЛАНОВ',
      'jan': 'Янв', 'feb': 'Фев', 'mar': 'Мар', 'apr': 'Апр', 'may': 'Май', 'jun': 'Июн',
      'jul': 'Июл', 'aug': 'Авг', 'sep': 'Сен', 'oct': 'Окт', 'nov': 'Ноя', 'dec': 'Дек',
      'no_plans_found': 'На этот месяц планов не найдено',
      'plans_load_error': 'Ошибка загрузки планов. Пожалуйста, обновите сервер.',
      'monthly_product_plan': 'Ежемесячный план по продукту',
      'plan_target': 'ПЛАН',
      'plan_fact': 'ФАКТ',
      'category_label': 'Категория',
      'region_label': 'Регион',
      'active_status': 'Активен',
      'inactive_status': 'Неактивен',
      'primary_contact': 'Основной',
      'bonuses_period': 'БОНУСЫ ЗА ПЕРИОД',
      'accrued_label': 'Начислено',
      'paid_bonus_label': 'Выплачено',
      'bonus_load_error': 'Ошибка загрузки бонусов',
      'debt_remainder': 'Остаток долга',
      'payment_history': 'История платежей',
      'no_payments': 'Нет платежей',
      'no_payments_subtitle': 'По этой фактуре платежей не было',
      'invoice_number_label': 'Номер фактуры',
      'realization_date_label': 'Дата реализации',
      'linked_reservation_label': 'Связанная бронь',
      'reservation_number': 'Бронь #',
      'total_amount_label': 'Общая сумма',
      'details_title': 'Детали',
      'client_label': 'Клиент',
      'invoice_label': 'Счет-фактура',
      'products_label': 'Продукты',
      'count_suffix': 'шт',
      'invoices_title': 'Фактуры',
      'debts_tab': 'Долги',
      'paid_label': 'Оплачено',
      'debt_label': 'Долг',
      'unknown_organization': 'Неизвестная организация',
      'search_doctor': 'Поиск врача',
      'specialty_label': 'Специальность',
      'nothing_found': 'Ничего не найдено',
      'organization_details': 'Информация',
      'doctors_tab': 'Врачи',
      'stock_tab': 'Склад',
      'loading_error': 'Ошибка загрузки',
      'name_label': 'Название',
      'type_label': 'Тип',
      'not_specified': 'Не указан',
      'address_label': 'Адрес',
      'doctors_count': 'Количество врачей',
      'doctors_not_found': 'Врачи не найдены',
      'no_doctors_attached': 'К этой организации еще не прикреплено ни одного врача',
      'attach_doctor': 'Прикрепить врача',
      'attach_another_doctor': 'Прикрепить еще врача',
      'specialty_not_specified': 'Специальность не указана',
      'stock_not_found': 'Остатки не найдены',
      'no_stock_items': 'В данной организации отсутствуют товары на складе',
      'unknown_product': 'Неизвестный товар',
      'pcs': 'шт',
      'search_doctor_hint': 'Поиск врача...',
      'search_params_empty': 'Попробуйте изменить параметры поиска',
      'doctor_attached_success': 'Врач успешно прикреплен',
      'doctor_attach_error': 'Ошибка при прикреплении врача',
      'add_organization': 'Добавить организацию',
      'basic_info_title': 'ОСНОВНАЯ ИНФОРМАЦИЯ',
      'organization_name_req': 'Название организации *',
      'enter_name': 'Введите название',
      'organization_type_req': 'Тип организации *',
      'clinic_type': 'Клиника',
      'hospital_type': 'Больница',
      'lechebniy_type': 'Лечебное заведение',
      'wholesale_type': 'Оптовик (Wholesale)',
      'region_req': 'Регион *',
      'regions_load_error': 'Ошибка загрузки регионов',
      'contacts_details_title': 'КОНТАКТЫ И ДЕТАЛИ',
      'inn_brand': 'ИНН / Бренд',
      'director_name': 'Имя директора',
      'phone_label': 'Телефон',
      'organization_added_success': 'Организация успешно добавлена',
      'organization_create_error': 'Ошибка при создании организации',
      'pharmacy': 'Аптека',
      'organization': 'Организация',
      'select_region_type_warning': 'Пожалуйста, выберите Регион и Тип организации',
      'create_reservation': 'Создание брони',
      'select_warehouse': 'Выберите склад',
      'search_product': 'Поиск товара...',
      'cart_empty': 'Корзина пуста',
      'search_hint': 'Найдите нужные продукты через поиск',
      'total': 'Итого',
      'price_label': 'Цена',
      'sum_currency': 'сум',
      'reservation_created': 'Бронь успешно создана',
      'reservation_error': 'Ошибка при создании брони',
      'all_filter': 'Все',
      'waiting_status': 'Ожидание',
      'confirmed_status': 'Подтверждено',
      'reservations_not_found': 'Бронирования не найдены',
      'items_count': 'продуктов',
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
      'clients': 'Mijozlar',
      'hospitals': 'Kasalxonalar',
      'pharmacies': 'Dorixonalar',
      'search_organization': 'Tashkilotni qidirish',
      'total_sales': 'Umumiy savdo',
      'bonus_balance': 'Bonus balansi',
      'planned_visits': 'Rejalashtirilgan tashriflar',
      'active_doctors': 'Faol shifokorlar',
      'pending_reservations': 'Kutilayotgan bronlar',
      'total_debt': 'Umumiy qarzdorlik',
      'completed_visits': 'Yakunlangan tashriflar',
      'revenue_forecast': 'Daromad prognozi',
      'visit_completion': 'Tashriflar ijrosi',
      'completed': 'yakunlandi',
      'visits': 'Tashriflar',
      'sales': 'Savdolar',
      'no_visits_today': 'Bugun uchun tashriflar yo\'q',
      'nothing_found': 'Hech narsa topilmadi',
      'search_doctor': 'Shifokorni qidirish',
      'retry': 'Qayta urinish',
      'search_medicine': 'Dorilarni qidirish',
      'price': 'Narxi',
      'select_period': 'Davrni tanlang',
      'apply': 'Qo\'llash',
      'select_month': 'Oyni tanlang',
      'select_year': 'Yilni tanlang',
      'logout_confirmation': 'Haqiqatan ham tizimdan chiqmoqchimisiz?',
      'passwords_no_match': 'Parollar mos kelmadi',
      'medicine_name': 'Dori nomi',
      'try_changing_search': 'Qidiruv so\'rovini o\'zgartirib ko\'ring',
      'username': 'Foydalanuvchi nomi',
      'password': 'Parol',
      'login': 'Kirish',
      'welcome_back': 'Xush kelibsiz',
      'enter_credentials': 'Davom etish uchun ma\'lumotlaringizni kiriting',
      'invalid_credentials': 'Foydalanuvchi nomi yoki parol xato',
      'loading': 'Yuklanmoqda...',
      'for_med_reps': 'Tibbiy vakillar uchun',
      'enter_username': 'Foydalanuvchi nomini kiriting',
      'enter_password': 'Parolni kiriting',
      'password_too_short': 'Parol kamida 4 ta belgidan iborat bo\'lishi kerak',
      'home': 'Bosh sahifa',
      'visits_nav': 'Tashriflar',
      'reservations_nav': 'Bronlar',
      'organizations_nav': 'Tashkilotlar',
      'profile_nav': 'Profil',
      'add': 'Qo\'shish',
      'edit': 'Tahrirlash',
      'delete': 'O\'chirish',
      'info': 'Ma\'lumot',
      'confirm': 'Tasdiqlash',
      'yes': 'Ha',
      'no': 'Yo\'q',
      'statistics': 'Statistika',
      'my_plans': 'Mening rejalarim',
      'active_reservations': 'Faol bronlar',
      'recent_visits': 'Yaqindagi tashriflar',
      'view_all': 'Hammasini ko\'rish',
      'pending': 'Kutilmoqda',
      'accepted': 'Qabul qilindi',
      'rejected': 'Rad etildi',
      'delivered': 'Yetkazildi',
      'cancelled': 'Bekor qilindi',
      'phone_number': 'Telefon raqami',
      'address': 'Manzil',
      'date': 'Sana',
      'time': 'Vaqt',
      'description': 'Tavsif',
      'notes': 'Eslatmalar',
      'january': 'Yanvar',
      'february': 'Fevral',
      'march': 'Mart',
      'april': 'Aprel',
      'may': 'May',
      'june': 'Iyun',
      'july': 'Iyul',
      'august': 'Avgust',
      'september': 'Sentabr',
      'october': 'Oktabr',
      'november': 'Noyabr',
      'december': 'Dekabr',
      'visits_title': 'Tashriflar',
      'planned': 'Rejalashtirilgan',
      'completed_status': 'Bajarildi',
      'no_planned_visits': 'Rejalashtirilgan tashriflar yo\'q',
      'no_completed_visits': 'Bajarilgan tashriflar yo\'q',
      'add_new_visit': 'Yangi tashrif qo\'shing',
      'add_visit': 'Tashrif qo\'shish',
      'unnamed_visit': 'Nomsiz tashrif',
      'visit_completed_msg': 'Tashrif yakunlandi!',
      'error_occurred': 'Xatolik yuz berdi',
      'field_visit': 'Hududdagi tashrif',
      'office_visit': 'Ofis tashrifi',
      'online_visit': 'Onlayn',
      'select_doctor': 'Shifokorni tanlang',
      'select_product': 'Mahsulotni tanlang',
      'enter_amount': 'Summani kiriting',
      'available_balance': 'Mavjud',
      'submit_allocation': 'Biriktirishni tasdiqlash',
      'allocation_success': 'Bonus muvaffaqiyatli biriktirildi',
      'allocation_error': 'Bonusni biriktirishda xatolik yuz berdi',
      'select_doctor_product_error': 'Iltimos, shifokor va mahsulotni tanlang',
      'notes_placeholder': 'Izoh qoldiring...',
      'period_label': 'Davr (Oy/Yil)',
      'attach_to_doctor_title': 'Shifokorga biriktirish',
      'create_visit_plan': 'Tashrif rejasi',
      'save_plan': 'Rejani saqlash',
      'visit_date': 'Tashrif sanasi',
      'visit_type': 'Tashrif turi',
      'visit_subject': 'Mavzu',
      'enter_subject': 'Mavzuni kiriting',
      'comment_optional': 'Izoh (ixtiyoriy)',
      'visit_plan_created': 'Tashrif rejasi yaratildi!',
      'reservations_title': 'Bronlar',
      'fill_required_fields': 'Iltimos, barcha majburiy maydonlarni to\'ldiring (Hudud, Mutaxassislik, Tashkilot)',
      'doctor_added_success': 'Shifokor muvaffaqiyatli qo\'shildi',
      'doctor_create_error': 'Shifokorni yaratishda xatolik',
      'add_doctor_title': 'Shifokor qo\'shish',
      'main_info_section': 'ASOSIY MA\'LUMOTLAR',
      'doctor_full_name_label': 'Shifokor F.I.Sh.',
      'enter_full_name_hint': 'F.I.Sh. kiriting',
      'contact_phone_label': 'Bog\'lanish telefoni',
      'categorization_section': 'TOIFALASH',
      'specialties_load_error': 'Mutaxassisliklarni yuklashda xatolik',
      'categories_load_error': 'Toifalarni yuklashda xatolik',
      'location_work_section': 'LOKATSIYA VA ISH JOYI',
      'regions_load_error': 'Hududlarni yuklashda xatolik',
      'splash_slogan': 'Sizga ko\'ngil qanoti bilan!',
      'page_not_found': 'Sahifa topilmadi',
      'go_home': 'Asosiyga',
      'minutes_ago': 'daq. oldin',
      'hours_ago': 'soat oldin',
      'days_ago': 'kun oldin',
      'read_all_action': 'Barchasini o\'qish',
      'no_notifications': 'Bildirishnomalar yo\'q',
      'no_notifications_subtitle': 'Yangi bildirishnomalaringiz shu yerda paydo bo\'ladi',
      'unread_label': 'O\'qilmagan',
      'error_loading': 'Yuklashda xatolik',
      'load_data_error': 'Ma\'lumotlarni yuklashda xatolik',
      'unexpected_error': 'Kutilmagan xatolik yuz berdi. Iltimos, server yangilanganligiga ishonch hosil qiling.',
      'info_section': 'MA\'LUMOT',
      'contacts_section': 'KONTAKTLAR',
      'doctor_label': 'Shifokor',
      'call_action': 'Qo\'ng\'iroq qilish',
      'visit_action': 'Tashrif',
      'plan_execution': 'REJALARNI BAJARILISHI',
      'jan': 'Yan', 'feb': 'Fev', 'mar': 'Mar', 'apr': 'Apr', 'may': 'May', 'jun': 'Iyun',
      'jul': 'Iyul', 'aug': 'Avg', 'sep': 'Sen', 'oct': 'Okt', 'nov': 'Noy', 'dec': 'Dek',
      'no_plans_found': 'Ushbu oy uchun rejalar topilmadi',
      'plans_load_error': 'Rejalarni yuklashda xatolik. Iltimos, serverni yangilang.',
      'monthly_product_plan': 'Mahsulot bo\'yicha oylik reja',
      'plan_target': 'REJA',
      'plan_fact': 'FAKT',
      'category_label': 'Toifa',
      'region_label': 'Hudud',
      'active_status': 'Faol',
      'inactive_status': 'Nofaol',
      'primary_contact': 'Asosiy',
      'bonuses_period': 'DAVR UCHUN BONUSLAR',
      'accrued_label': 'Hisoblangan',
      'paid_bonus_label': 'To\'langan',
      'bonus_load_error': 'Bonuslarni yuklashda xatolik',
      'debt_remainder': 'Qarz qoldig\'i',
      'payment_history': 'To\'lovlar tarixi',
      'no_payments': 'To\'lovlar yo\'q',
      'no_payments_subtitle': 'To\'lovlar amalga oshirilmagan',
      'invoice_number_label': 'Faktura raqami',
      'realization_date_label': 'Amalga oshirilgan sana',
      'linked_reservation_label': 'Bog\'langan bron',
      'reservation_number': 'Bron #',
      'total_amount_label': 'Umumiy summa',
      'details_title': 'Tafsilotlar',
      'client_label': 'Mijoz',
      'invoice_label': 'Hisob-faktura',
      'products_label': 'Mahsulotlar',
      'count_suffix': 'ta',
      'invoices_title': 'Fakturalar',
      'debts_tab': 'Qarzlar',
      'paid_label': 'To\'langan',
      'debt_label': 'Qarz',
      'unknown_organization': 'Noma\'lum tashkilot',
      'specialty_label': 'Mutaxassislik',
      'organization_details': 'Ma\'lumot',
      'doctors_tab': 'Shifokorlar',
      'stock_tab': 'Ombor',
      'loading_error': 'Yuklashda xatolik',
      'name_label': 'Nomi',
      'type_label': 'Turi',
      'not_specified': 'Ko\'rsatilmagan',
      'address_label': 'Manzil',
      'doctors_count': 'Shifokorlar soni',
      'doctors_not_found': 'Shifokorlar topilmadi',
      'no_doctors_attached': 'Ushbu tashkilotga hali birorta ham shifokor biriktirilmagan',
      'attach_doctor': 'Shifokorni biriktirish',
      'attach_another_doctor': 'Yana shifokor biriktirish',
      'specialty_not_specified': 'Mutaxassislik ko\'rsatilmagan',
      'stock_not_found': 'Qoldiqlar topilmadi',
      'no_stock_items': 'Ushbu tashkilot omborida mahsulotlar yo\'q',
      'unknown_product': 'Noma\'lum mahsulot',
      'pcs': 'dona',
      'search_doctor_hint': 'Shifokorni qidirish...',
      'search_params_empty': 'Qidiruv parametrlarini o\'zgartirib ko\'ring',
      'doctor_attached_success': 'Shifokor muvaffaqiyatli biriktirildi',
      'doctor_attach_error': 'Shifokorni biriktirishda xatolik yuz berdi',
      'add_organization': 'Tashkilot qo\'shish',
      'basic_info_title': 'ASOSIY MA\'LUMOTLAR',
      'organization_name_req': 'Tashkilot nomi *',
      'enter_name': 'Nomini kiriting',
      'organization_type_req': 'Tashkilot turi *',
      'clinic_type': 'Klinika',
      'hospital_type': 'Shifoxona',
      'lechebniy_type': 'Davolash muassasasi',
      'wholesale_type': 'Ulgurji savdo (Wholesale)',
      'region_req': 'Hudud *',
      'contacts_details_title': 'KONTAKTLAR VA TAFSILOTLAR',
      'inn_brand': 'STIR / Brend',
      'director_name': 'Direktor ismi',
      'phone_label': 'Telefon',
      'organization_added_success': 'Tashkilot muvaffaqiyatli qo\'shildi',
      'organization_create_error': 'Tashkilot yaratishda xatolik yuz berdi',
      'pharmacy': 'Dorixona',
      'organization': 'Tashkilot',
      'select_region_type_warning': 'Iltimos, hudud va tashkilot turini tanlang',
      'create_reservation': 'Bron yaratish',
      'select_warehouse': 'Omborni tanlang',
      'search_product': 'Mahsulot qidirish...',
      'cart_empty': 'Savat bo\'sh',
      'search_hint': 'Mahsulotlarni qidiruv orqali toping',
      'total': 'Jami',
      'price_label': 'Narxi',
      'sum_currency': 'so\'m',
      'reservation_created': 'Bron muvaffaqiyatli yaratildi',
      'reservation_error': 'Bron yaratishda xatolik yuz berdi',
      'all_filter': 'Hammasi',
      'waiting_status': 'Kutilmoqda',
      'confirmed_status': 'Tasdiqlangan',
      'reservations_not_found': 'Bronlar topilmadi',
      'items_count': 'ta mahsulot',
      'status': 'Status',
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
  String get clients => translate('clients');
  String get hospitals => translate('hospitals');
  String get pharmacies => translate('pharmacies');
  String get searchOrganization => translate('search_organization');
  String get totalSales => translate('total_sales');
  String get bonusBalance => translate('bonus_balance');
  String get plannedVisits => translate('planned_visits');
  String get indicators => translate('indicators');
  String get activeDoctors => translate('active_doctors');
  String get pendingReservations => translate('pending_reservations');
  String get totalDebt => translate('total_debt');
  String get completedVisits => translate('completed_visits');
  String get revenueForecast => translate('revenue_forecast');
  String get visitCompletion => translate('visit_completion');
  String get completedLabel => translate('completed');
  String get visitsLabel => translate('visits');
  String get salesLabel => translate('sales');
  String get noVisitsToday => translate('no_visits_today');
  String get nothingFound => translate('nothing_found');
  String get searchDoctor => translate('search_doctor');
  String get retryLabel => translate('retry');
  String get searchMedicine => translate('search_medicine');
  String get priceLabel => translate('price');
  String get selectYear => translate('select_year');
  String get logoutConfirmation => translate('logout_confirmation');
  String get passwordsNoMatch => translate('passwords_no_match');
  String get medicineName => translate('medicine_name');
  String get tryChangingSearch => translate('try_changing_search');
  String get newPassword => translate('new_password');
  String get confirmPassword => translate('confirm_password');
  String get passwordChanged => translate('password_changed');
  String get username => translate('username');
  String get password => translate('password');
  String get login => translate('login');
  String get welcomeBack => translate('welcome_back');
  String get enterCredentials => translate('enter_credentials');
  String get invalidCredentials => translate('invalid_credentials');
  String get loading => translate('loading');
  String get forMedReps => translate('for_med_reps');
  String get homeNav => translate('home');
  String get visitsNav => translate('visits_nav');
  String get reservationsNav => translate('reservations_nav');
  String get organizationsNav => translate('organizations_nav');
  String get profileNav => translate('profile_nav');
  String get addLabel => translate('add');
  String get editLabel => translate('edit');
  String get deleteLabel => translate('delete');
  String get infoLabel => translate('info');
  String get confirmLabel => translate('confirm');
  String get yesLabel => translate('yes');
  String get noLabel => translate('no');
  String get statistics => translate('statistics');
  String get myPlans => translate('my_plans');
  String get activeReservations => translate('active_reservations');
  String get recentVisits => translate('recent_visits');
  String get viewAll => translate('view_all');
  String get pendingStatus => translate('pending');
  String get acceptedStatus => translate('accepted');
  String get rejectedStatus => translate('rejected');
  String get deliveredStatus => translate('delivered');
  String get cancelledStatus => translate('cancelled');
  String get completed => translate('completed');
  String get pending => translate('pending');
  String get accepted => translate('accepted');
  String get rejected => translate('rejected');
  String get delivered => translate('delivered');
  String get cancelled => translate('cancelled');
  String get planned => translate('planned');
  String get selectPeriod => translate('select_period');
  String get apply => translate('apply');
  String get enterUsername => translate('enter_username');
  String get enterPassword => translate('enter_password');
  String get passwordTooShort => translate('password_too_short');
  String get organization => translate('organization');
  String get saveAction => translate('save');
  String get date => translate('date');
  String get home => translate('home');
  String get comment => translate('comment_optional');
  String get phoneNumber => translate('phone_number');
  String get address => translate('address');
  String get dateLabel => translate('date');
  String get timeLabel => translate('time');
  String get descriptionLabel => translate('description');
  String get notesLabel => translate('notes');
  String get january => translate('january');
  String get february => translate('february');
  String get march => translate('march');
  String get april => translate('april');
  String get may => translate('may');
  String get june => translate('june');
  String get july => translate('july');
  String get august => translate('august');
  String get september => translate('september');
  String get october => translate('october');
  String get november => translate('november');
  String get december => translate('december');
  String get visitsTitle => translate('visits_title');
  String get plannedStatus => translate('planned');
  String get completedStatus => translate('completed_status');
  String get noPlannedVisits => translate('no_planned_visits');
  String get noCompletedVisits => translate('no_completed_visits');
  String get addNewVisit => translate('add_new_visit');
  String get addVisit => translate('add_visit');
  String get unnamedVisit => translate('unnamed_visit');
  String get visitCompletedMsg => translate('visit_completed_msg');
  String get errorOccurred => translate('error_occurred');
  String get fieldVisit => translate('field_visit');
  String get officeVisit => translate('office_visit');
  String get onlineVisit => translate('online_visit');
  String get selectDoctor => translate('select_doctor');
  String get createVisitPlan => translate('create_visit_plan');
  String get savePlan => translate('save_plan');
  String get visitDate => translate('visit_date');
  String get visitType => translate('visit_type');
  String get visitSubject => translate('visit_subject');
  String get enterSubject => translate('enter_subject');
  String get commentOptional => translate('comment_optional');
  String get visitPlanCreated => translate('visit_plan_created');
  String get reservationsTitle => translate('reservations_title');
  String get fillRequiredFields => translate('fill_required_fields');
  String get doctorAddedSuccess => translate('doctor_added_success');
  String get doctorCreateError => translate('doctor_create_error');
  String get addDoctorTitle => translate('add_doctor_title');
  String get mainInfoSection => translate('main_info_section');
  String get doctorFullNameLabel => translate('doctor_full_name_label');
  String get enterFullNameHint => translate('enter_full_name_hint');
  String get contactPhoneLabel => translate('contact_phone_label');
  String get categorizationSection => translate('categorization_section');
  String get specialtiesLoadError => translate('specialties_load_error');
  String get categoriesLoadError => translate('categories_load_error');
  String get locationWorkSection => translate('location_work_section');
  String get regionsLoadError => translate('regions_load_error');
  String get splashSlogan => translate('splash_slogan');
  String get pageNotFound => translate('page_not_found');
  String get goHome => translate('go_home');
  String get minutesAgo => translate('minutes_ago');
  String get hoursAgo => translate('hours_ago');
  String get daysAgo => translate('days_ago');
  String get readAllAction => translate('read_all_action');
  String get noNotifications => translate('no_notifications');
  String get noNotificationsSubtitle => translate('no_notifications_subtitle');
  String get unreadLabel => translate('unread_label');
  String get errorLoading => translate('error_loading');
  String get loadDataError => translate('load_data_error');
  String get unexpectedError => translate('unexpected_error');

  String get infoSection => translate('info_section');
  String get contactsSection => translate('contacts_section');
  String get doctorLabel => translate('doctor_label');
  String get callAction => translate('call_action');
  String get visitAction => translate('visit_action');
  String get planExecution => translate('plan_execution');
  String get jan => translate('jan');
  String get feb => translate('feb');
  String get mar => translate('mar');
  String get apr => translate('apr');

  String get jun => translate('jun');
  String get jul => translate('jul');
  String get aug => translate('aug');
  String get sep => translate('sep');
  String get oct => translate('oct');
  String get nov => translate('nov');
  String get dec => translate('dec');
  String get noPlansFound => translate('no_plans_found');
  String get plansLoadError => translate('plans_load_error');
  String get monthlyProductPlan => translate('monthly_product_plan');
  String get planTarget => translate('plan_target');
  String get planFact => translate('plan_fact');
  String get categoryLabel => translate('category_label');
  String get regionLabel => translate('region_label');
  String get status => translate('status');
  String get activeStatus => translate('active_status');
  String get inactiveStatus => translate('inactive_status');
  String get primaryContact => translate('primary_contact');
  String get bonusesPeriod => translate('bonuses_period');
  String get accruedLabel => translate('accrued_label');
  String get paidBonusLabel => translate('paid_bonus_label');
  String get bonusLoadError => translate('bonus_load_error');
  String get debtRemainder => translate('debt_remainder');
  String get paymentHistory => translate('payment_history');
  String get noPayments => translate('no_payments');
  String get noPaymentsSubtitle => translate('no_payments_subtitle');
  String get invoiceNumberLabel => translate('invoice_number_label');
  String get realizationDateLabel => translate('realization_date_label');
  String get linkedReservationLabel => translate('linked_reservation_label');
  String get reservationNumber => translate('reservation_number');
  String get totalAmountLabel => translate('total_amount_label');
  String get detailsTitleLabel => translate('details_title');
  String get clientLabel => translate('client_label');
  String get invoiceLabel => translate('invoice_label');
  String get productsLabel => translate('products_label');
  String get countSuffix => translate('count_suffix');
  String get invoicesTitle => translate('invoices_title');
  String get debtsTab => translate('debts_tab');
  String get paidLabel => translate('paid_label');
  String get debtLabel => translate('debt_label');
  String get unknownOrganization => translate('unknown_organization');
  String get specialtyLabel => translate('specialty_label');

  String get organizationDetails => translate('organization_details');
  String get doctorsTab => translate('doctors_tab');
  String get stockTab => translate('stock_tab');
  String get loadingError => translate('loading_error');
  String get nameLabel => translate('name_label');
  String get typeLabel => translate('type_label');
  String get pharmacy => translate('pharmacy');
  String get notSpecified => translate('not_specified');
  String get addressLabel => translate('address_label');
  String get doctorsCountLabel => translate('doctors_count');
  String get doctorsNotFound => translate('doctors_not_found');
  String get noDoctorsAttached => translate('no_doctors_attached');
  String get attachDoctor => translate('attach_doctor');
  String get attachAnotherDoctor => translate('attach_another_doctor');
  String get specialtyNotSpecified => translate('specialty_not_specified');
  String get stockNotFound => translate('stock_not_found');
  String get noStockItems => translate('no_stock_items');
  String get unknownProduct => translate('unknown_product');
  String get pcs => translate('pcs');
  String get searchDoctorHint => translate('search_doctor_hint');
  String get searchParamsEmpty => translate('search_params_empty');
  String get doctorAttachedSuccess => translate('doctor_attached_success');
  String get doctorAttachError => translate('doctor_attach_error');
  String get addOrganization => translate('add_organization');
  String get basicInfoTitle => translate('basic_info_title');
  String get organizationNameReq => translate('organization_name_req');
  String get enterName => translate('enter_name');
  String get organizationTypeReq => translate('organization_type_req');
  String get clinicType => translate('clinic_type');
  String get hospitalType => translate('hospital_type');
  String get lechebniyType => translate('lechebniy_type');
  String get wholesaleTypeLabel => translate('wholesale_type');
  String get regionReq => translate('region_req');
  String get contactsDetailsTitle => translate('contacts_details_title');
  String get innBrand => translate('inn_brand');
  String get directorNameLabel => translate('director_name');
  String get phoneLabel => translate('phone_label');
  String get organizationAddedSuccess => translate('organization_added_success');
  String get organizationCreateError => translate('organization_create_error');
  String get selectRegionTypeWarning => translate('select_region_type_warning');
  String get createReservation => translate('create_reservation');
  String get selectWarehouse => translate('select_warehouse');
  String get searchProduct => translate('search_product');
  String get cartEmpty => translate('cart_empty');
  String get searchHint => translate('search_hint');
  String get total => translate('total');
  String get sumCurrency => translate('sum_currency');
  String get reservationCreated => translate('reservation_created');
  String get reservationError => translate('reservation_error');
  String get allFilter => translate('all_filter');
  String get waitingStatus => translate('waiting_status');
  String get confirmedStatus => translate('confirmed_status');
  String get reservationsNotFound => translate('reservations_not_found');
  String get itemsCountLabel => translate('items_count');

  String get selectProduct => translate('select_product');
  String get enterAmount => translate('enter_amount');
  String get availableBalance => translate('available_balance');
  String get submitAllocation => translate('submit_allocation');
  String get allocationSuccess => translate('allocation_success');
  String get allocationError => translate('allocation_error');
  String get selectDoctorProductError => translate('select_doctor_product_error');
  String get notesPlaceholder => translate('notes_placeholder');
  String get periodLabel => translate('period_label');
  String get attachToDoctorTitle => translate('attach_to_doctor_title');
  String get delete => translate('delete');
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
