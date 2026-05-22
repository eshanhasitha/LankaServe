import 'dart:convert';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'api_service.dart';

class AuthSession {
  const AuthSession({
    required this.accessToken,
    required this.refreshToken,
    required this.user,
  });

  final String accessToken;
  final String refreshToken;
  final Map<String, dynamic> user;
}

class AuthService {
  factory AuthService({ApiService? apiService}) {
    _instance ??= AuthService._internal(apiService: apiService);
    return _instance!;
  }

  AuthService._internal({ApiService? apiService})
    : _api = apiService ?? ApiService();

  static AuthService? _instance;

  final ApiService _api;
  String? _refreshToken;
  Map<String, dynamic> _user = <String, dynamic>{};

  static const String _accessTokenStorageKey = 'auth_access_token';
  static const String _refreshTokenStorageKey = 'auth_refresh_token';
  static const String _userStorageKey = 'auth_user';

  ApiService get api => _api;
  String? get refreshToken => _refreshToken;
  Map<String, dynamic> get user => Map<String, dynamic>.unmodifiable(_user);

  Future<AuthSession> loginWithFirebase({
    required String firebaseIdToken,
  }) async {
    final res = await _api.post(
      '/auth/login',
      body: {'firebaseIdToken': firebaseIdToken},
    );
    return await _saveSessionFromResponse(res);
  }

  Future<AuthSession> registerWithFirebase({
    required String firebaseIdToken,
    String role = 'customer',
    Map<String, dynamic>? providerProfile,
  }) async {
    final payload = <String, dynamic>{
      'firebaseIdToken': firebaseIdToken,
      'role': role,
    };
    if (providerProfile != null) payload['providerProfile'] = providerProfile;
    final res = await _api.post('/auth/register', body: payload);
    return await _saveSessionFromResponse(res);
  }

  Future<AuthSession> refreshSession() async {
    final token = _refreshToken;
    if (token == null || token.isEmpty) {
      throw ApiException('No refresh token available');
    }
    final res = await _api.post('/auth/refresh', body: {'refreshToken': token});
    final data = (res['data'] as Map<String, dynamic>?) ?? <String, dynamic>{};
    final accessToken = data['accessToken']?.toString() ?? '';
    final refreshToken = data['refreshToken']?.toString() ?? '';
    if (accessToken.isEmpty || refreshToken.isEmpty) {
      throw ApiException('Missing auth tokens in refresh response');
    }

    _api.setAccessToken(accessToken);
    final user = await _fetchCurrentUserOrFallback();
    if (user.isEmpty) {
      throw ApiException('Missing user data while refreshing session');
    }

    return _saveSession(
      accessToken: accessToken,
      refreshToken: refreshToken,
      user: user,
    );
  }

  Future<AuthSession?> restoreSession() async {
    SharedPreferences prefs;
    try {
      prefs = await SharedPreferences.getInstance();
    } catch (e) {
      debugPrint('Session restore skipped (storage unavailable): $e');
      return null;
    }

    final accessToken = prefs.getString(_accessTokenStorageKey)?.trim() ?? '';
    final refreshToken = prefs.getString(_refreshTokenStorageKey)?.trim() ?? '';
    final user = _decodeStoredUser(prefs.getString(_userStorageKey));

    if (accessToken.isEmpty || refreshToken.isEmpty || user.isEmpty) {
      await _clearLocalSession();
      return null;
    }

    _api.setAccessToken(accessToken);
    _refreshToken = refreshToken;
    _user = user;

    return AuthSession(
      accessToken: accessToken,
      refreshToken: refreshToken,
      user: Map<String, dynamic>.from(_user),
    );
  }

  Future<void> logout() async {
    final token = _refreshToken;
    try {
      if (token != null && token.isNotEmpty) {
        await _api.post('/auth/logout', body: {'refreshToken': token});
      }
    } catch (e) {
      debugPrint('Logout API failed, clearing local session anyway: $e');
    } finally {
      await _clearLocalSession();
      await _signOutIdentityProviders();
    }
  }

  // Temporary compatibility method for existing login UI.
  Future<bool> login({required String email, required String password}) async {
    if (password.isEmpty) return false;
    await loginWithFirebase(firebaseIdToken: password);
    return true;
  }

  Future<AuthSession> _saveSessionFromResponse(Map<String, dynamic> res) async {
    final data = (res['data'] as Map<String, dynamic>?) ?? <String, dynamic>{};
    final accessToken = data['accessToken']?.toString() ?? '';
    final refreshToken = data['refreshToken']?.toString() ?? '';
    var user = (data['user'] as Map<String, dynamic>?) ?? <String, dynamic>{};
    if (accessToken.isEmpty || refreshToken.isEmpty) {
      throw ApiException('Missing auth tokens in response');
    }

    if (user.isEmpty) {
      _api.setAccessToken(accessToken);
      user = await _fetchCurrentUserOrFallback();
    }
    if (user.isEmpty) {
      throw ApiException('Missing user data in auth response');
    }

    return _saveSession(
      accessToken: accessToken,
      refreshToken: refreshToken,
      user: user,
    );
  }

  Future<AuthSession> _saveSession({
    required String accessToken,
    required String refreshToken,
    required Map<String, dynamic> user,
  }) async {
    _refreshToken = refreshToken;
    _user = Map<String, dynamic>.from(user);
    _api.setAccessToken(accessToken);

    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_accessTokenStorageKey, accessToken);
      await prefs.setString(_refreshTokenStorageKey, refreshToken);
      await prefs.setString(_userStorageKey, jsonEncode(_user));
    } catch (e) {
      debugPrint('Session persistence skipped (storage unavailable): $e');
    }

    return AuthSession(
      accessToken: accessToken,
      refreshToken: refreshToken,
      user: Map<String, dynamic>.from(_user),
    );
  }

  Future<Map<String, dynamic>> _fetchCurrentUserOrFallback() async {
    try {
      final meRes = await _api.get('/users/me');
      final me =
          (meRes['data'] as Map<String, dynamic>?) ?? <String, dynamic>{};
      if (me.isNotEmpty) {
        return me;
      }
    } catch (_) {
      // Keep existing user when offline or if /users/me is temporarily unavailable.
    }
    return Map<String, dynamic>.from(_user);
  }

  Future<void> _clearLocalSession() async {
    _refreshToken = null;
    _user = <String, dynamic>{};
    _api.setAccessToken(null);

    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_accessTokenStorageKey);
      await prefs.remove(_refreshTokenStorageKey);
      await prefs.remove(_userStorageKey);
    } catch (e) {
      debugPrint('Session clear skipped (storage unavailable): $e');
    }
  }

  Future<void> _signOutIdentityProviders() async {
    final googleSignIn = GoogleSignIn();
    try {
      await googleSignIn.signOut();
    } catch (_) {
      // Ignore: user may already be signed out.
    }

    try {
      await googleSignIn.disconnect();
    } catch (_) {
      // Ignore: no existing Google session to disconnect.
    }

    try {
      await FirebaseAuth.instance.signOut();
    } catch (_) {
      // Ignore: Firebase user may already be signed out.
    }
  }

  Map<String, dynamic> _decodeStoredUser(String? rawUserJson) {
    if (rawUserJson == null || rawUserJson.isEmpty) {
      return <String, dynamic>{};
    }
    try {
      final decoded = jsonDecode(rawUserJson);
      if (decoded is Map<String, dynamic>) {
        return decoded;
      }
      if (decoded is Map) {
        return decoded.map((key, value) => MapEntry(key.toString(), value));
      }
    } catch (_) {
      // Ignore malformed cache and treat as no session.
    }
    return <String, dynamic>{};
  }
}
