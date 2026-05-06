import 'package:flutter/material.dart';

class AppTheme {
  AppTheme._();

  static const Color brandBlue = Color(0xFF25429A);
  static const Color lightBackground = Color(0xFFF4F5F8);

  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      scaffoldBackgroundColor: lightBackground,
      colorScheme: const ColorScheme.light(
        primary: brandBlue,
        surface: lightBackground,
      ),
      fontFamily: 'Inter',
    );
  }
}
