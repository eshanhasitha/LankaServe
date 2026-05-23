import 'package:flutter/material.dart';

class AppUiStyles {
  AppUiStyles._();

  static const Color primary = Color(0xFF273D98);
  static const Color primarySoft = Color(0xFFDCE8FF);
  static const Color textPrimary = Color(0xFF141C34);
  static const Color textMuted = Color(0xFF6B7C95);
  static const Color border = Color(0xFFD2DBE8);
  static const Color surface = Colors.white;

  static BorderRadius get radiusMd => BorderRadius.circular(14);
  static BorderRadius get radiusLg => BorderRadius.circular(18);
  static BorderRadius get radiusXl => BorderRadius.circular(22);

  static ButtonStyle primaryButton({double height = 50, BorderRadius? radius}) {
    return ElevatedButton.styleFrom(
      minimumSize: Size.fromHeight(height),
      backgroundColor: primary,
      foregroundColor: Colors.white,
      disabledBackgroundColor: const Color(0xFF8B97B5),
      shape: RoundedRectangleBorder(borderRadius: radius ?? radiusLg),
      elevation: 0,
    );
  }

  static ButtonStyle dangerOutlineButton({
    double height = 50,
    BorderRadius? radius,
  }) {
    return OutlinedButton.styleFrom(
      minimumSize: Size.fromHeight(height),
      side: const BorderSide(color: Color(0xFFFDA4AF)),
      foregroundColor: const Color(0xFFDC2626),
      shape: RoundedRectangleBorder(borderRadius: radius ?? radiusLg),
    );
  }

  static ButtonStyle neutralOutlineButton({
    double height = 50,
    BorderRadius? radius,
  }) {
    return OutlinedButton.styleFrom(
      minimumSize: Size.fromHeight(height),
      side: const BorderSide(color: border),
      foregroundColor: const Color(0xFF41516A),
      shape: RoundedRectangleBorder(borderRadius: radius ?? radiusLg),
    );
  }

  static InputDecoration textFieldDecoration({
    required String hintText,
    Widget? suffixIcon,
  }) {
    return InputDecoration(
      hintText: hintText,
      filled: true,
      fillColor: surface,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: radiusMd,
        borderSide: const BorderSide(color: border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: radiusMd,
        borderSide: const BorderSide(color: border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: radiusMd,
        borderSide: const BorderSide(color: primary, width: 1.4),
      ),
      suffixIcon: suffixIcon,
    );
  }
}
