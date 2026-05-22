import 'dart:io';

import 'api_service.dart';

class JobService {
  JobService({ApiService? apiService}) : _api = apiService ?? ApiService();

  final ApiService _api;

  Future<List<Map<String, dynamic>>> fetchJobs({
    String? status,
    int page = 1,
    int limit = 20,
  }) async {
    final query = <String, dynamic>{'page': page, 'limit': limit};
    if (status != null && status.isNotEmpty) query['status'] = status;
    final res = await _api.get('/jobs', query: query);
    return _asList(res['data']);
  }

  Future<Map<String, dynamic>> getJobById(String jobId) async {
    final res = await _api.get('/jobs/$jobId');
    return (res['data'] as Map<String, dynamic>?) ?? <String, dynamic>{};
  }

  Future<Map<String, dynamic>> createJob({
    required String title,
    required String description,
    required String category,
    required double price,
    required List<double> coordinates,
    List<String> images = const [],
    String? preferredProviderId,
  }) async {
    final body = <String, dynamic>{
      'title': title,
      'description': description,
      'category': category,
      'price': price,
      'images': images,
      'location': {'type': 'Point', 'coordinates': coordinates},
    };
    if (preferredProviderId != null && preferredProviderId.isNotEmpty) {
      body['preferredProviderId'] = preferredProviderId;
    }
    final res = await _api.post('/jobs', body: body);
    return (res['data'] as Map<String, dynamic>?) ?? <String, dynamic>{};
  }

  Future<List<Map<String, dynamic>>> fetchProviderJobRequests() async {
    final res = await _api.get('/providers/job-requests');
    return _asList(res['data']);
  }

  Future<List<Map<String, dynamic>>> fetchProviderBrowseJobs() async {
    final res = await _api.get('/providers/browse-jobs');
    return _asList(res['data']);
  }

  Future<Map<String, dynamic>> acceptJob(String jobId) async {
    final res = await _api.put('/jobs/$jobId/accept');
    final data = res['data'];
    if (data is Map<String, dynamic> && data['job'] is Map<String, dynamic>) {
      return data['job'] as Map<String, dynamic>;
    }
    return (data as Map<String, dynamic>?) ?? <String, dynamic>{};
  }

  Future<Map<String, dynamic>> rejectJob(String jobId) async {
    final res = await _api.put('/jobs/$jobId/reject');
    return (res['data'] as Map<String, dynamic>?) ?? <String, dynamic>{};
  }

  Future<Map<String, dynamic>> cancelJob(String jobId) async {
    final res = await _api.put('/jobs/$jobId/cancel');
    return (res['data'] as Map<String, dynamic>?) ?? <String, dynamic>{};
  }

  Future<Map<String, dynamic>> startJob(String jobId) async {
    final res = await _api.put('/jobs/$jobId/start');
    return (res['data'] as Map<String, dynamic>?) ?? <String, dynamic>{};
  }

  Future<Map<String, dynamic>> confirmProviderCompletion(String jobId) async {
    final res = await _api.put('/jobs/$jobId/complete/provider');
    return (res['data'] as Map<String, dynamic>?) ?? <String, dynamic>{};
  }

  Future<Map<String, dynamic>> confirmCustomerCompletion(String jobId) async {
    final res = await _api.put('/jobs/$jobId/complete/customer');
    return (res['data'] as Map<String, dynamic>?) ?? <String, dynamic>{};
  }

  Future<Map<String, dynamic>> finalizeCompletion(String jobId) async {
    final res = await _api.put('/jobs/$jobId/complete/finalize');
    return (res['data'] as Map<String, dynamic>?) ?? <String, dynamic>{};
  }

  Future<Map<String, dynamic>> scanArrival({
    required String jobId,
    required String token,
  }) async {
    final res = await _api.put(
      '/jobs/$jobId/arrival/scan',
      body: {'token': token},
    );
    return (res['data'] as Map<String, dynamic>?) ?? <String, dynamic>{};
  }

  Future<String> uploadServiceImage(File file) async {
    final res = await _api.postMultipart('/uploads/profile-image', file: file);
    final data = (res['data'] as Map<String, dynamic>?) ?? <String, dynamic>{};
    final url = data['url']?.toString().trim() ?? '';
    if (url.isEmpty) {
      throw ApiException('Upload failed: missing image URL');
    }
    return url;
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
