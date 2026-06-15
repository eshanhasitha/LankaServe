import 'api_service.dart';

class MessageService {
  MessageService({ApiService? apiService}) : _api = apiService ?? ApiService();

  final ApiService _api;

  Future<List<Map<String, dynamic>>> fetchConversations() async {
    final res = await _api.get('/messages/conversations');
    final data = res['data'];
    if (data is List) {
      return data.whereType<Map<String, dynamic>>().toList();
    }
    return <Map<String, dynamic>>[];
  }

  Future<List<Map<String, dynamic>>> fetchThread({
    required String otherUserId,
    String? jobId,
    int page = 1,
    int limit = 30,
  }) async {
    final query = <String, dynamic>{'page': page, 'limit': limit};
    if (jobId != null && jobId.isNotEmpty) {
      query['jobId'] = jobId;
    }
    final res = await _api.get('/messages/thread/$otherUserId', query: query);
    final data = res['data'];
    if (data is List) {
      return data.whereType<Map<String, dynamic>>().toList();
    }
    return <Map<String, dynamic>>[];
  }

  Future<Map<String, dynamic>> sendMessage({
    required String receiverId,
    required String content,
    String? jobId,
  }) async {
    final body = <String, dynamic>{
      'receiverId': receiverId,
      'content': content,
      'jobId': jobId,
    };
    final res = await _api.post('/messages/send', body: body);
    return (res['data'] as Map<String, dynamic>?) ?? <String, dynamic>{};
  }

  Future<Map<String, dynamic>> contactSupportAgent({
    required String content,
  }) async {
    final res = await _api.post(
      '/messages/contact-agent',
      body: {'content': content},
    );
    return (res['data'] as Map<String, dynamic>?) ?? <String, dynamic>{};
  }

  Future<void> markThreadRead(String threadId) async {
    await _api.put('/messages/read/$threadId');
  }

  Future<void> markAllAsRead() async {
    await _api.put('/messages/read-all');
  }
}
