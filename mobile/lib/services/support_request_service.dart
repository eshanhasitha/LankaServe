import 'api_service.dart';

class SupportRequestService {
  SupportRequestService({ApiService? apiService})
    : _api = apiService ?? ApiService();

  final ApiService _api;

  Future<List<Map<String, dynamic>>> fetchMyRequests({int limit = 5}) async {
    final res = await _api.get('/support-requests/my', query: {'limit': limit});
    final data = res['data'];
    if (data is List) {
      return data.whereType<Map<String, dynamic>>().toList();
    }
    return <Map<String, dynamic>>[];
  }

  Future<Map<String, dynamic>> createRequest({
    required String category,
    required String subject,
    required String message,
  }) async {
    final res = await _api.post(
      '/support-requests',
      body: {
        'category': category,
        'subject': subject,
        'message': message,
        'attachments': <Map<String, dynamic>>[],
      },
    );
    return (res['data'] as Map<String, dynamic>?) ?? <String, dynamic>{};
  }
}
