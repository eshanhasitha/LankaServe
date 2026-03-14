import 'package:flutter/material.dart';
import 'provider_dashboard.dart';

class LoginScreen extends StatelessWidget {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text("Login"),
      ),
      body: Center(
        child: ElevatedButton(
          onPressed: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => ProviderDashboard(),
              ),
            );
          },
          child: Text("Go to Dashboard"),
        ),
      ),
    );
  }
}