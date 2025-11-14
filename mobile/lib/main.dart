import 'package:flutter/material.dart';
import 'screens/login.dart';

void main() => runApp(const LankaServeApp());

class LankaServeApp extends StatelessWidget {
  const LankaServeApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'LankaServe.AI',
      theme: ThemeData(primarySwatch: Colors.teal),
      home: const LoginScreen(),
    );
  }
}
