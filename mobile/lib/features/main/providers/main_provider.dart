import 'package:flutter_riverpod/flutter_riverpod.dart';

// Provider to control the current tab in MainScreen
final mainScreenTabIndexProvider = StateProvider<int>((ref) => 2); // Default to "Plan" tab (index 2)
