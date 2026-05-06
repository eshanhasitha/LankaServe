import 'api_service.dart';

class ProviderService {
  ProviderService({ApiService? apiService}) : _api = apiService ?? ApiService();

  final ApiService _api;

  Future<List<Map<String, dynamic>>> searchProviders({
    String? category,
    bool? verified,
    int page = 1,
    int limit = 20,
  }) async {
    final query = <String, dynamic>{'page': page, 'limit': limit};
    if (category != null && category.isNotEmpty) {
      query['category'] = category;
    }
    if (verified != null) {
      query['verified'] = verified;
    }
    final res = await _api.get('/providers', query: query);
    return _asList(res['data']);
  }

  Future<Map<String, dynamic>> getPublicProviderProfile(
    String providerUserId,
  ) async {
    final res = await _api.get('/providers/$providerUserId');
    return (res['data'] as Map<String, dynamic>?) ?? <String, dynamic>{};
  }

  Future<Map<String, dynamic>> getProviderDashboard() async {
    final res = await _api.get('/providers/dashboard');
    return (res['data'] as Map<String, dynamic>?) ?? <String, dynamic>{};
  }

  Future<Map<String, dynamic>> getProviderMe() async {
    final res = await _api.get('/providers/me');
    return (res['data'] as Map<String, dynamic>?) ?? <String, dynamic>{};
  }

  Future<Map<String, dynamic>> getProviderEarnings({
    int page = 1,
    int limit = 20,
    int periodMonths = 6,
  }) async {
    final res = await _api.get(
      '/providers/earnings',
      query: {'page': page, 'limit': limit, 'periodMonths': periodMonths},
    );
    return (res['data'] as Map<String, dynamic>?) ?? <String, dynamic>{};
  }

  Future<List<Map<String, dynamic>>> getProviderJobs({
    String? status,
    int page = 1,
    int limit = 20,
  }) async {
    final query = <String, dynamic>{'page': page, 'limit': limit};
    if (status != null && status.isNotEmpty) query['status'] = status;
    final res = await _api.get('/providers/jobs', query: query);
    return _asList(res['data']);
  }

  Future<List<Map<String, dynamic>>> getJobRequests({
    int page = 1,
    int limit = 20,
  }) async {
    final res = await _api.get(
      '/providers/job-requests',
      query: {'page': page, 'limit': limit},
    );
    return _asList(res['data']);
  }

  Future<List<Map<String, dynamic>>> getBrowseJobs({
    int page = 1,
    int limit = 20,
  }) async {
    final res = await _api.get(
      '/providers/browse-jobs',
      query: {'page': page, 'limit': limit},
    );
    return _asList(res['data']);
  }

  Future<Map<String, dynamic>> getJobQr(String jobId) async {
    final res = await _api.get('/providers/$jobId/qr');
    return (res['data'] as Map<String, dynamic>?) ?? <String, dynamic>{};
  }

  Future<Map<String, dynamic>> updateProviderProfile(
    Map<String, dynamic> payload,
  ) async {
    final res = await _api.put('/providers/me', body: payload);
    return (res['data'] as Map<String, dynamic>?) ?? <String, dynamic>{};
  }

  Future<Map<String, dynamic>> setAvailability({
    required bool isAvailable,
  }) async {
    final res = await _api.put(
      '/providers/availability',
      body: {'availability': isAvailable ? 'online' : 'offline'},
    );
    return (res['data'] as Map<String, dynamic>?) ?? <String, dynamic>{};
  }

  List<Map<String, dynamic>> _asList(dynamic value) {
    if (value is List) {
      return value.whereType<Map<String, dynamic>>().toList();
    }
    if (value is Map<String, dynamic> && value['items'] is List) {
      return (value['items'] as List)
          .whereType<Map<String, dynamic>>()
          .toList();
    }
    return <Map<String, dynamic>>[];
  }
}
