import '../api_service.dart';

class NotificationService {
  NotificationService({ApiService? apiService}) : _api = apiService ?? ApiService();
  final ApiService _api;

  Future<List<Map<String, dynamic>>> fetchNotifications() async {
    final res = await _api.get('/notifications/my');
    final data = res['data'];
    if (data is! List) return <Map<String, dynamic>>[];
    final seen = <String>{};
    return data.whereType<Map<String, dynamic>>().where((e) {
      final id = e['_id']?.toString() ?? '';
      if (id.isEmpty || seen.contains(id)) return false;
      seen.add(id);
      return true;
    }).toList();
  }

  Future<void> markAsRead(String id) async => _api.put('/notifications/read/$id');
}