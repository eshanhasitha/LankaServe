import 'package:flutter/foundation.dart';

import '../services/api_service.dart';

class UserProvider extends ChangeNotifier {
  UserProvider({ApiService? apiService}) : _apiService = apiService ?? ApiService();

  final ApiService _apiService;

  bool _loading = false;
  String? _error;
  Map<String, dynamic>? _profile;

  bool get loading => _loading;
  String? get error => _error;
  Map<String, dynamic>? get profile => _profile;
  String get userId => _profile?['_id']?.toString() ?? '';

  Future<void> loadMe() async {
    _setLoading(true);
    try {
      final res = await _apiService.get('/users/me');
      _profile = (res['data'] as Map<String, dynamic>?) ?? <String, dynamic>{};
      _error = null;
    } catch (e) {
      _error = e.toString();
    } finally {
      _setLoading(false);
    }
  }

  Future<void> updateMe(Map<String, dynamic> payload) async {
    _setLoading(true);
    try {
      final res = await _apiService.put('/users/me', body: payload);
      _profile = (res['data'] as Map<String, dynamic>?) ?? _profile;
      _error = null;
    } catch (e) {
      _error = e.toString();
    } finally {
      _setLoading(false);
    }
  }

  void _setLoading(bool value) {
    _loading = value;
    notifyListeners();
  }
}
