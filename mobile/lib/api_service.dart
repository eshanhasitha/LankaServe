import 'package:dio/dio.dart';

class ApiService {
  static final dio = Dio(BaseOptions(baseUrl: 'http://10.0.2.2:5000/api'));

  static Future<void> scanArrival(String jobId, String token, String accessToken) async {
    await dio.put('/jobs/$jobId/arrival/scan',
      data: {'token': token},
      options: Options(headers: {'Authorization': 'Bearer $accessToken'}));
  }
}