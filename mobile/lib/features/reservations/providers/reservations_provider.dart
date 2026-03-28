import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import '../../../shared/models/reservation_model.dart';
import '../../../shared/models/product_model.dart';
import '../../../shared/models/warehouse_model.dart';

enum ReservationsLoadStatus { initial, loading, loaded, error }

class CartItem {
  final ProductModel product;
  int quantity;
  double price;

  CartItem({required this.product, required this.quantity, required this.price});

  double get total => quantity * price;

  CartItem copyWith({int? quantity, double? price}) {
    return CartItem(
      product: product,
      quantity: quantity ?? this.quantity,
      price: price ?? this.price,
    );
  }
}

class ReservationsState {
  final ReservationsLoadStatus status;
  final List<ReservationModel> reservations;
  final String? errorMessage;
  final ReservationModel? selectedReservation;
  final bool isCreating;
  
  // New fields for creation flow
  final List<WarehouseModel> warehouses;
  final List<ProductModel> availableProducts;
  final List<CartItem> cart;
  final WarehouseModel? selectedWarehouse;

  const ReservationsState({
    required this.status,
    required this.reservations,
    this.errorMessage,
    this.selectedReservation,
    required this.isCreating,
    this.warehouses = const [],
    this.availableProducts = const [],
    this.cart = const [],
    this.selectedWarehouse,
  });

  const ReservationsState.initial()
      : this(
          status: ReservationsLoadStatus.initial,
          reservations: const [],
          isCreating: false,
          warehouses: const [],
          availableProducts: const [],
          cart: const [],
        );

  double get cartTotal => cart.fold(0, (sum, item) => sum + item.total);

  ReservationsState copyWith({
    ReservationsLoadStatus? status,
    List<ReservationModel>? reservations,
    String? errorMessage,
    ReservationModel? selectedReservation,
    bool? isCreating,
    List<WarehouseModel>? warehouses,
    List<ProductModel>? availableProducts,
    List<CartItem>? cart,
    WarehouseModel? selectedWarehouse,
  }) {
    return ReservationsState(
      status: status ?? this.status,
      reservations: reservations ?? this.reservations,
      errorMessage: errorMessage,
      selectedReservation: selectedReservation ?? this.selectedReservation,
      isCreating: isCreating ?? this.isCreating,
      warehouses: warehouses ?? this.warehouses,
      availableProducts: availableProducts ?? this.availableProducts,
      cart: cart ?? this.cart,
      selectedWarehouse: selectedWarehouse ?? this.selectedWarehouse,
    );
  }
}

class ReservationsNotifier extends StateNotifier<ReservationsState> {
  final ApiClient _apiClient;

  ReservationsNotifier(this._apiClient)
      : super(const ReservationsState.initial());

  Future<void> loadReservations() async {
    state = state.copyWith(
        status: ReservationsLoadStatus.loading, errorMessage: null);
    try {
      final response = await _apiClient.get(
        ApiEndpoints.reservations,
        queryParameters: {'limit': 50},
      );
      List<ReservationModel> reservations = [];
      final data = response.data;
      if (data is List) {
        reservations = data
            .map((e) => ReservationModel.fromJson(e as Map<String, dynamic>))
            .toList();
      } else if (data is Map && data.containsKey('items')) {
        reservations = (data['items'] as List)
            .map((e) => ReservationModel.fromJson(e as Map<String, dynamic>))
            .toList();
      }
      state = state.copyWith(
        status: ReservationsLoadStatus.loaded,
        reservations: reservations,
      );
    } catch (e) {
      state = state.copyWith(
        status: ReservationsLoadStatus.error,
        errorMessage: e.toString(),
      );
    }
  }

  Future<void> loadReservationDetail(int id) async {
    try {
      final response =
          await _apiClient.get(ApiEndpoints.reservationDetail(id));
      final reservation = ReservationModel.fromJson(
          response.data as Map<String, dynamic>);
      state = state.copyWith(selectedReservation: reservation);
    } catch (e) {
      // ignore detail errors
    }
  }

  // creation flow methods
  Future<void> loadWarehouses() async {
    try {
      final response = await _apiClient.get('/warehouse/warehouses/');
      if (response.data is List) {
        final list = (response.data as List)
            .map((e) => WarehouseModel.fromJson(e as Map<String, dynamic>))
            .toList();
        state = state.copyWith(warehouses: list);
        if (list.isNotEmpty && state.selectedWarehouse == null) {
          state = state.copyWith(selectedWarehouse: list[0]);
        }
      }
    } catch (e) {
      // log error
    }
  }

  Future<void> searchProducts(String query) async {
    if (query.length < 2) {
      state = state.copyWith(availableProducts: []);
      return;
    }
    try {
      final response = await _apiClient.get('/products/', queryParameters: {'name': query});
      if (response.data is List) {
        final list = (response.data as List)
            .map((e) => ProductModel.fromJson(e as Map<String, dynamic>))
            .toList();
        state = state.copyWith(availableProducts: list);
      }
    } catch (e) {
      // log error
    }
  }

  void selectWarehouse(WarehouseModel warehouse) {
    state = state.copyWith(selectedWarehouse: warehouse);
  }

  void addToCart(ProductModel product) {
    final existingIndex = state.cart.indexWhere((item) => item.product.id == product.id);
    if (existingIndex != -1) {
      final newCart = List<CartItem>.from(state.cart);
      newCart[existingIndex].quantity += 1;
      state = state.copyWith(cart: newCart);
    } else {
      state = state.copyWith(cart: [...state.cart, CartItem(product: product, quantity: 1, price: product.price)]);
    }
  }

  void updateCartQuantity(int productId, int delta) {
    final newCart = state.cart.map((item) {
      if (item.product.id == productId) {
        final newQty = item.quantity + delta;
        return newQty > 0 ? item.copyWith(quantity: newQty) : null;
      }
      return item;
    }).whereType<CartItem>().toList();
    state = state.copyWith(cart: newCart);
  }

  void updateCartPrice(int productId, double price) {
    final newCart = state.cart.map((item) {
      if (item.product.id == productId) {
        return item.copyWith(price: price);
      }
      return item;
    }).toList();
    state = state.copyWith(cart: newCart);
  }

  void clearCart() {
    state = state.copyWith(cart: [], availableProducts: []);
  }

  Future<bool> createReservation({
    required String customerName,
    int? medOrgId,
  }) async {
    if (state.cart.isEmpty || state.selectedWarehouse == null) return false;

    state = state.copyWith(isCreating: true);
    try {
      final payload = {
        'customer_name': customerName,
        'med_org_id': medOrgId,
        'warehouse_id': state.selectedWarehouse!.id,
        'items': state.cart.map((item) => {
          'product_id': item.product.id,
          'quantity': item.quantity,
          'price': item.price,
        }).toList(),
        'nds_percent': 12.0, // Default NDS
      };

      final response = await _apiClient.post(
        ApiEndpoints.reservations,
        data: payload,
      );
      
      final newReservation = ReservationModel.fromJson(
          response.data as Map<String, dynamic>);
      
      state = state.copyWith(
        reservations: [newReservation, ...state.reservations],
        isCreating: false,
        cart: [], // Clear cart after success
      );
      return true;
    } catch (e) {
      state = state.copyWith(isCreating: false);
      return false;
    }
  }
}

final reservationsProvider =
    StateNotifierProvider<ReservationsNotifier, ReservationsState>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return ReservationsNotifier(apiClient);
});
