import 'api_service.dart';

class NotificationService {
  NotificationService({ApiService? apiService}) : _api = apiService ?? ApiService();

  final ApiService _api;

  Future<List<Map<String, dynamic>>> fetchNotifications() async {
    final res = await _api.get('/notifications/my');
    final data = res['data'];
    if (data is List) return data.whereType<Map<String, dynamic>>().toList();
    return <Map<String, dynamic>>[];
  }

  Future<void> markAsRead(String id) async {
    await _api.put('/notifications/read/$id');
  }
}
