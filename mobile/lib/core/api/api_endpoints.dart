class ApiEndpoints {
  static const String baseUrl = 'https://backend.maax.uz/api/v1';

  // Auth
  static const String login = '/login/access-token';

  // Dashboard
  static const String dashboardStats = '/dashboard/stats';

  // Products
  static const String products = '/products';

  // Doctors
  static const String doctors = '/crm/doctors';
  static String doctorDetail(int id) => '/crm/doctors/$id';
  static String doctorPlans(int id) => '/crm/doctors/$id/plans';

  // Medical Organizations
  static const String medOrgs = '/crm/med-orgs';

  // Reservations
  static const String reservations = '/sales/reservations';
  static String reservationDetail(int id) => '/sales/reservations/$id';

  // Visit Plans
  static const String visitPlans = '/visit-plans';
  static String visitPlanDetail(int id) => '/visit-plans/$id';

  // Sales Plans
  static const String salesPlans = '/sales/plans';

  // Bonus & Balance
  static const String bonusBalance = '/sales/bonus-balance';

  // Notifications
  static const String notifications = '/notifications';
  static String markNotificationRead(int id) => '/notifications/$id/read';

  // Invoices & Debt
  static const String invoices = '/sales/invoices/';
  static String invoiceDetail(int id) => '/sales/invoices/$id';

  // User Visits
  static String userVisits(int userId) => '/users/$userId/visits';
}
