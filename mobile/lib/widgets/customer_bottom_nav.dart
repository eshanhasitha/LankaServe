import 'dart:async';

import 'package:flutter/material.dart';

import '../config/routes.dart';
import '../services/message_badge_service.dart';
import 'ui_scale.dart';

class CustomerBottomNav extends StatefulWidget {
  const CustomerBottomNav({super.key, required this.activeIndex});

  final int activeIndex;

  @override
  State<CustomerBottomNav> createState() => _CustomerBottomNavState();
}

class _CustomerBottomNavState extends State<CustomerBottomNav> {
  Timer? _pollTimer;

  @override
  void initState() {
    super.initState();
    MessageBadgeService.instance.refreshUnread();
    _pollTimer = Timer.periodic(
      const Duration(seconds: 12),
      (_) => MessageBadgeService.instance.refreshUnread(),
    );
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final scale = UiScale.factor(context, min: 0.76, max: 0.90);
    final bottomInset = MediaQuery.paddingOf(context).bottom;
    final navHeight = (84 * scale).clamp(74, 90).toDouble();
    final qrSize = (70 * scale).clamp(58, 72).toDouble();
    final qrOffset = (22 * scale).clamp(18, 24).toDouble();
    final qrBorder = (4 * scale).clamp(3, 4).toDouble();

    return SizedBox(
      height: navHeight + bottomInset,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Positioned.fill(
            child: Container(
              padding: EdgeInsets.only(bottom: bottomInset),
              decoration: const BoxDecoration(
                color: Colors.white,
                border: Border(top: BorderSide(color: Color(0xFFD8DEE8))),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: _navItem(
                      context,
                      0,
                      Icons.grid_view_rounded,
                      'Home',
                      AppRoutes.customerDashboard,
                    ),
                  ),
                  Expanded(
                    child: _navItem(
                      context,
                      1,
                      Icons.search_rounded,
                      'Search',
                      AppRoutes.providerList,
                    ),
                  ),
                  const Expanded(child: SizedBox()),
                  Expanded(
                    child: _navItem(
                      context,
                      3,
                      Icons.work_outline_rounded,
                      'Jobs',
                      AppRoutes.jobStatus,
                    ),
                  ),
                  Expanded(
                    child: ValueListenableBuilder<bool>(
                      valueListenable: MessageBadgeService.instance.hasUnread,
                      builder: (context, hasUnread, _) {
                        return _navItem(
                          context,
                          4,
                          Icons.chat_bubble_outline_rounded,
                          'Messages',
                          AppRoutes.chat,
                          dot: hasUnread && widget.activeIndex != 4,
                          routeArgs: const {'fromProvider': false},
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
          ),
          Positioned(
            left: 0,
            right: 0,
            top: -qrOffset,
            child: Center(
              child: GestureDetector(
                onTap: () {
                  if (widget.activeIndex != 2) {
                    Navigator.pushReplacementNamed(
                      context,
                      AppRoutes.customerQrScan,
                    );
                  }
                },
                child: Container(
                  width: qrSize,
                  height: qrSize,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: const Color(0xFF223B97),
                    border: Border.all(
                      color: const Color(0xFFF3F4F7),
                      width: qrBorder,
                    ),
                  ),
                  child: Icon(
                    Icons.qr_code_scanner_rounded,
                    color: Colors.white,
                    size: (30 * scale).clamp(22, 28).toDouble(),
                  ),
                ),
              ),
            ),
          ),
          Positioned(
            left: 0,
            right: 0,
            bottom: (4 * scale).clamp(2, 6).toDouble() + bottomInset,
            child: IgnorePointer(
              child: Center(
                child: Text(
                  'QR Scan',
                  style: TextStyle(
                    color: widget.activeIndex == 2
                        ? const Color(0xFF3E5DD0)
                        : const Color(0xFF93A1B7),
                    fontSize: (12 * scale).clamp(10, 12).toDouble(),
                    fontWeight: widget.activeIndex == 2
                        ? FontWeight.w800
                        : FontWeight.w700,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _navItem(
    BuildContext context,
    int index,
    IconData icon,
    String label,
    String route, {
    bool dot = false,
    Object? routeArgs,
  }) {
    final active = index == widget.activeIndex;
    final scale = UiScale.factor(context, min: 0.76, max: 0.90);
    return InkWell(
      onTap: () {
        if (!active) {
          Navigator.pushReplacementNamed(context, route, arguments: routeArgs);
        }
      },
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Stack(
            clipBehavior: Clip.none,
            children: [
              Icon(
                icon,
                color: active
                    ? const Color(0xFF3E5DD0)
                    : const Color(0xFF93A1B7),
                size: (26 * scale).clamp(20, 26).toDouble(),
              ),
              if (dot)
                Positioned(
                  top: -2,
                  right: -6,
                  child: Container(
                    width: (9 * scale).clamp(7, 9).toDouble(),
                    height: (9 * scale).clamp(7, 9).toDouble(),
                    decoration: const BoxDecoration(
                      color: Color(0xFFEF4444),
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
            ],
          ),
          SizedBox(height: (2 * scale).clamp(1, 3).toDouble()),
          Text(
            label,
            style: TextStyle(
              color: active ? const Color(0xFF3E5DD0) : const Color(0xFF93A1B7),
              fontSize: (12 * scale).clamp(10, 12).toDouble(),
              fontWeight: active ? FontWeight.w800 : FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}
