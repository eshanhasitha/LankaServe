import 'package:dio/dio.dart';

class ApiService {
  static final Dio dio = Dio(BaseOptions(
    baseUrl: 'http://10.0.2.2:5000/api',
    headers: {'Content-Type': 'application/json'},
  ));

  static Future<Map<String, dynamic>> login(String token) async {
    final res = await dio.post('/auth/login', data: {'firebaseIdToken': token});
    return res.data['data'];
  }

  static Future<List<dynamic>> getJobs(String accessToken) async {
    final res = await dio.get(
      '/jobs',
      options: Options(headers: {'Authorization': 'Bearer $accessToken'}),
    );
    return res.data['data'] ?? [];
  }

  static Future<void> acceptJob(String accessToken, String jobId) async {
    await dio.put(
      '/jobs/$jobId/accept',
      options: Options(headers: {'Authorization': 'Bearer $accessToken'}),
    );
  }

  static Future<void> rejectJob(String accessToken, String jobId) async {
    await dio.put(
      '/jobs/$jobId/reject',
      options: Options(headers: {'Authorization': 'Bearer $accessToken'}),
    );
  }
}