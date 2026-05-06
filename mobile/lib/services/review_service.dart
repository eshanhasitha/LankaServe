import 'api_service.dart';

class ReviewService {
  ReviewService({ApiService? apiService}) : _api = apiService ?? ApiService();

  final ApiService _api;

  Future<List<Map<String, dynamic>>> fetchProviderReviews(String providerId) async {
    final res = await _api.get('/reviews/provider/$providerId');
    final data = res['data'];
    if (data is List) return data.whereType<Map<String, dynamic>>().toList();
    return <Map<String, dynamic>>[];
  }

  Future<Map<String, dynamic>> createReview({
    required String jobId,
    required int rating,
    String comment = '',
  }) async {
    final res = await _api.post('/reviews', body: {
      'jobId': jobId,
      'rating': rating,
      'comment': comment,
    });
    return (res['data'] as Map<String, dynamic>?) ?? <String, dynamic>{};
  }
}
