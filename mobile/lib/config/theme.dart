import 'package:flutter/material.dart';
import 'ui_styles.dart';

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
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 14,
        ),
        border: OutlineInputBorder(
          borderRadius: AppUiStyles.radiusMd,
          borderSide: const BorderSide(color: AppUiStyles.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: AppUiStyles.radiusMd,
          borderSide: const BorderSide(color: AppUiStyles.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: AppUiStyles.radiusMd,
          borderSide: const BorderSide(color: AppUiStyles.primary, width: 1.4),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: AppUiStyles.primaryButton(),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: AppUiStyles.neutralOutlineButton(),
      ),
      cardTheme: CardThemeData(
        color: Colors.white,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: AppUiStyles.radiusXl,
          side: const BorderSide(color: Color(0xFFE4EAF2)),
        ),
      ),
    );
  }
}
