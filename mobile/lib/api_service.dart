import 'package:dio/dio.dart';

class ApiService {
  static final dio = Dio(BaseOptions(
    baseUrl: 'http://10.0.2.2:5000/api',
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 10),
  ));

  Future<Map<String, dynamic>> get(String endpoint,
      {Map<String, dynamic>? query}) async {
    final response = await dio.get(endpoint, queryParameters: query);
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> put(String endpoint,
      {Map<String, dynamic>? data}) async {
    final response = await dio.put(endpoint, data: data);
    return response.data as Map<String, dynamic>;
  }

  static Future<void> scanArrival(
      String jobId, String token, String accessToken) async {
    await dio.put('/jobs/$jobId/arrival/scan',
        data: {'token': token},
        options:
            Options(headers: {'Authorization': 'Bearer $accessToken'}));
  }
}