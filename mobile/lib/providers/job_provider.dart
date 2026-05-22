import 'package:flutter/foundation.dart';

import '../services/job_service.dart';

class JobProvider extends ChangeNotifier {
  JobProvider({JobService? jobService}) : _jobService = jobService ?? JobService();

  final JobService _jobService;

  bool _loading = false;
  String? _error;
  List<Map<String, dynamic>> _jobs = <Map<String, dynamic>>[];

  bool get loading => _loading;
  String? get error => _error;
  List<Map<String, dynamic>> get jobs => List.unmodifiable(_jobs);
  int get jobCount => _jobs.length;

  Future<void> loadCustomerJobs({String? status}) async {
    _setLoading(true);
    try {
      _jobs = await _jobService.fetchJobs(status: status);
      _error = null;
    } catch (e) {
      _error = e.toString();
    } finally {
      _setLoading(false);
    }
  }

  Future<void> loadProviderJobRequests() async {
    _setLoading(true);
    try {
      _jobs = await _jobService.fetchProviderJobRequests();
      _error = null;
    } catch (e) {
      _error = e.toString();
    } finally {
      _setLoading(false);
    }
  }

  Future<void> acceptJob(String jobId) async {
    await _jobService.acceptJob(jobId);
    _jobs = _jobs.where((job) => job['_id']?.toString() != jobId).toList();
    notifyListeners();
  }

  Future<void> rejectJob(String jobId) async {
    await _jobService.rejectJob(jobId);
    _jobs = _jobs.where((job) => job['_id']?.toString() != jobId).toList();
    notifyListeners();
  }

  void _setLoading(bool value) {
    _loading = value;
    notifyListeners();
  }
}
