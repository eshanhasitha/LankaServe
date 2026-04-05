import 'package:flutter/material.dart';

class CustomerDashboard extends StatelessWidget {
  const CustomerDashboard({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text("Customer Dashboard"),
      ),
      body: Center(
        child: Text(
          "Customer Dashboard",
          style: TextStyle(fontSize: 20),
        ),
      ),
    );
  }
}