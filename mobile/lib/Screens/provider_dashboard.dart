import 'package:flutter/material.dart';
class ProviderDashboard extends StatelessWidget {
  const ProviderDashboard({super.key});
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text("Provider Dashboard"),
      ),
      body: Center(
        child: Text(
          "Available Jobs",
          style: TextStyle(fontSize: 20),
        ),
      ),
    );
  }
}