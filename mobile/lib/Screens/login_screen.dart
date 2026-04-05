import 'package:flutter/material.dart';
import '../api_service.dart';
import '../session.dart';
import '../provider_jobs_page.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final controller = TextEditingController(
    text: 'dev:provider@lanka.com:Provider One:provider',
  );

  Future<void> submit() async {
    final result = await ApiService.login(controller.text);
    Session.accessToken = result['accessToken'];
    Session.user = result['user'];
    if (!mounted) return;
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (_) => const ProviderJobsPage()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          children: [
            TextField(controller: controller),
            ElevatedButton(onPressed: submit, child: const Text('Login')),
          ],
        ),
      ),
    );
  }
}