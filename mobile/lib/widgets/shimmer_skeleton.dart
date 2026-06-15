import 'package:flutter/material.dart';

/// A shimmer animation wrapper. All [ShimmerBox] children within this widget
/// share the same animation controller so they pulse in sync.
class ShimmerContainer extends StatefulWidget {
  const ShimmerContainer({super.key, required this.child});

  final Widget child;

  @override
  State<ShimmerContainer> createState() => _ShimmerContainerState();
}

class _ShimmerContainerState extends State<ShimmerContainer>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return _ShimmerScope(controller: _controller, child: widget.child);
  }
}

class _ShimmerScope extends InheritedWidget {
  const _ShimmerScope({required this.controller, required super.child});

  final AnimationController controller;

  static AnimationController? of(BuildContext context) {
    return context.dependOnInheritedWidgetOfExactType<_ShimmerScope>()?.controller;
  }

  @override
  bool updateShouldNotify(_ShimmerScope oldWidget) =>
      controller != oldWidget.controller;
}

/// A single animated skeleton box. If placed inside a [ShimmerContainer],
/// it uses the shared animation; otherwise it creates its own.
class ShimmerBox extends StatefulWidget {
  const ShimmerBox({
    super.key,
    required this.height,
    this.width,
    this.borderRadius,
    this.baseColor,
    this.highlightColor,
  });

  final double height;
  final double? width;
  final BorderRadius? borderRadius;
  final Color? baseColor;
  final Color? highlightColor;

  @override
  State<ShimmerBox> createState() => _ShimmerBoxState();
}

class _ShimmerBoxState extends State<ShimmerBox>
    with SingleTickerProviderStateMixin {
  AnimationController? _ownController;

  AnimationController _resolveController() {
    final inherited = _ShimmerScope.of(context);
    if (inherited != null) return inherited;
    _ownController ??= AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat();
    return _ownController!;
  }

  @override
  void dispose() {
    _ownController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final controller = _resolveController();
    final base = widget.baseColor ?? const Color(0xFFE8EDF4);
    final highlight = widget.highlightColor ?? const Color(0xFFF5F7FC);
    final radius = widget.borderRadius ?? BorderRadius.circular(14);

    return AnimatedBuilder(
      animation: controller,
      builder: (context, child) {
        final value = controller.value;
        final translateX = -1.0 + (2.0 * value);

        return Container(
          height: widget.height,
          width: widget.width,
          decoration: BoxDecoration(
            borderRadius: radius,
            gradient: LinearGradient(
              begin: Alignment(translateX - 0.6, 0),
              end: Alignment(translateX + 0.6, 0),
              colors: [base, highlight, base],
              stops: const [0.0, 0.5, 1.0],
            ),
          ),
        );
      },
    );
  }
}
