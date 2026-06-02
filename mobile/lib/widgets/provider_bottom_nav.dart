import 'dart:async';

import 'package:flutter/material.dart';

import '../config/routes.dart';
import '../services/message_badge_service.dart';
import 'ui_scale.dart';

class ProviderBottomNav extends StatefulWidget {
  const ProviderBottomNav({super.key, required this.activeIndex});

  final int activeIndex;

  @override
  State<ProviderBottomNav> createState() => _ProviderBottomNavState();
}

class _ProviderBottomNavState extends State<ProviderBottomNav> {
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
    final scale = UiScale.factor(context, min: 0.82, max: 1.0);
    final bottomInset = MediaQuery.paddingOf(context).bottom;
    final navHeight = (66 * scale).clamp(62, 72).toDouble();

    return Container(
      height: navHeight + bottomInset,
      padding: EdgeInsets.fromLTRB(
        (8 * scale).clamp(6, 10).toDouble(),
        (6 * scale).clamp(4, 8).toDouble(),
        (8 * scale).clamp(6, 10).toDouble(),
        bottomInset + (6 * scale).clamp(4, 8).toDouble(),
      ),
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
              Icons.dashboard_rounded,
              'Dashboard',
              AppRoutes.providerDashboard,
            ),
          ),
          Expanded(
            child: _navItem(
              context,
              1,
              Icons.search_rounded,
              'Browse Jobs',
              AppRoutes.jobRequests,
            ),
          ),
          Expanded(
            child: _navItem(
              context,
              2,
              Icons.work_outline_rounded,
              'Jobs',
              AppRoutes.acceptedJobs,
            ),
          ),
          Expanded(
            child: _navItem(
              context,
              3,
              Icons.payments_outlined,
              'Earnings',
              AppRoutes.earnings,
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
                  routeArgs: const {'fromProvider': true},
                );
              },
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
    final scale = UiScale.factor(context, min: 0.82, max: 1.0);

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
                size: (30 * scale).clamp(20, 26).toDouble(),
              ),
              if (dot)
                Positioned(
                  top: -1,
                  right: -5,
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
          SizedBox(height: (2 * scale).clamp(1, 4).toDouble()),
          Text(
            label,
            style: TextStyle(
              color: active ? const Color(0xFF3E5DD0) : const Color(0xFF93A1B7),
              fontSize: (10 * scale).clamp(8.5, 10.5).toDouble(),
              fontWeight: active ? FontWeight.w800 : FontWeight.w700,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
