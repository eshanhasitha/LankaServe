import 'package:flutter/foundation.dart';

import '../services/auth_service.dart';

class AuthProvider extends ChangeNotifier {
  AuthProvider({AuthService? authService}) : _authService = authService ?? AuthService();

  final AuthService _authService;

  bool _authenticated = false;
  bool _loading = false;
  String? _error;
  Map<String, dynamic>? _user;

  bool get authenticated => _authenticated;
  bool get loading => _loading;
  String? get error => _error;
  Map<String, dynamic>? get user => _user;

  Future<bool> loginWithFirebaseToken(String firebaseIdToken) async {
    _setLoading(true);
    try {
      final session = await _authService.loginWithFirebase(firebaseIdToken: firebaseIdToken);
      _authenticated = true;
      _user = session.user;
      _error = null;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      _authenticated = false;
      notifyListeners();
      return false;
    } finally {
      _setLoading(false);
    }
  }

  Future<bool> registerWithFirebaseToken({
    required String firebaseIdToken,
    required String role,
    Map<String, dynamic>? providerProfile,
  }) async {
    _setLoading(true);
    try {
      final session = await _authService.registerWithFirebase(
        firebaseIdToken: firebaseIdToken,
        role: role,
        providerProfile: providerProfile,
      );
      _authenticated = true;
      _user = session.user;
      _error = null;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      _authenticated = false;
      notifyListeners();
      return false;
    } finally {
      _setLoading(false);
    }
  }

  Future<void> logout() async {
    _setLoading(true);
    try {
      await _authService.logout();
    } finally {
      _authenticated = false;
      _user = null;
      _setLoading(false);
      notifyListeners();
    }
  }

  void _setLoading(bool value) {
    _loading = value;
    notifyListeners();
  }
}
