import 'package:flutter/material.dart';
import 'api_service.dart';
import 'session.dart';

class ProviderJobsPage extends StatefulWidget {
  const ProviderJobsPage({super.key});

  @override
  State<ProviderJobsPage> createState() => _ProviderJobsPageState();
}

class _ProviderJobsPageState extends State<ProviderJobsPage> {
  List jobs = [];

  @override
  void initState() {
    super.initState();
    loadJobs();
  }

  Future<void> loadJobs() async {
    final result = await ApiService.getJobs(Session.accessToken!);
    setState(() => jobs = result);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Provider Jobs')),
      body: ListView.builder(
        itemCount: jobs.length,
        itemBuilder: (_, i) => ListTile(
          title: Text(jobs[i]['title'] ?? ''),
          subtitle: Text(jobs[i]['status'] ?? ''),
        ),
      ),
    );
  }
}