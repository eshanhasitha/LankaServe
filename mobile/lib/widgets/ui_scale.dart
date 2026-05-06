import 'dart:math' as math;

import 'package:flutter/widgets.dart';

class UiScale {
  UiScale._();

  static double factor(
    BuildContext context, {
    double baseWidth = 390,
    double min = 0.84,
    double max = 1.08,
  }) {
    final width = MediaQuery.sizeOf(context).width;
    final raw = width / baseWidth;
    return raw.clamp(min, max).toDouble();
  }

  static double size(
    BuildContext context,
    double value, {
    double min = 0,
    double max = double.infinity,
    double baseWidth = 390,
  }) {
    final scaled = value * factor(context, baseWidth: baseWidth);
    return math.max(min, math.min(max, scaled));
  }
}
