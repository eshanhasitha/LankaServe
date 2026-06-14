import 'package:flutter/material.dart';

import '../../widgets/provider_bottom_nav.dart';
import '../../widgets/ui_scale.dart';
import '../../services/provider_service.dart';

class ProviderBadgesScreen extends StatefulWidget {
  const ProviderBadgesScreen({super.key});

  @override
  State<ProviderBadgesScreen> createState() => _ProviderBadgesScreenState();
}

class _ProviderBadgesScreenState extends State<ProviderBadgesScreen> {
  final ProviderService _providerService = ProviderService();
  bool _loading = true;
  String? _error;
  int _unlockedCount = 0;
  List<dynamic> _badges = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await _providerService.getProviderBadges();
      final summary = res['summary'] as Map?;
      final unlockedCount = summary?['unlockedCount'] as int? ?? 0;
      final active = (res['active'] as List?) ?? [];
      final locked = (res['locked'] as List?) ?? [];

      if (!mounted) return;
      setState(() {
        _unlockedCount = unlockedCount;
        _badges = [
          ...active.map((b) => {
                ...Map<String, dynamic>.from(b as Map),
                'isLocked': false,
              }),
          ...locked.map((b) => {
                ...Map<String, dynamic>.from(b as Map),
                'isLocked': true,
              }),
        ];
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final compactScale = UiScale.factor(context, min: 0.76, max: 0.90);

    return Scaffold(
      backgroundColor: const Color(0xFFF3F4F7),
      body: SafeArea(
        child: MediaQuery(
          data: MediaQuery.of(
            context,
          ).copyWith(textScaler: TextScaler.linear(compactScale)),
          child: Column(
            children: [
              _Header(onBack: () => Navigator.maybePop(context)),
              Expanded(
                child: RefreshIndicator(
                  onRefresh: _load,
                  child: _loading
                      ? const Center(child: CircularProgressIndicator(color: Color(0xFF2F4DA0)))
                      : _error != null
                          ? Center(
                              child: Padding(
                                padding: const EdgeInsets.all(24.0),
                                child: Text(
                                  'Error: $_error',
                                  textAlign: TextAlign.center,
                                  style: const TextStyle(color: Color(0xFF6B7C97)),
                                ),
                              ),
                            )
                          : ListView(
                              padding: const EdgeInsets.fromLTRB(18, 16, 18, 18),
                              physics: const AlwaysScrollableScrollPhysics(),
                              children: [
                                _HeroSummary(unlockedCount: _unlockedCount),
                                const SizedBox(height: 18),
                                for (final badge in _badges) ...[
                                  _BadgeCard(badge: badge),
                                  const SizedBox(height: 10),
                                ],
                              ],
                            ),
                ),
              ),
            ],
          ),
        ),
      ),
      bottomNavigationBar: const ProviderBottomNav(activeIndex: -1),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.onBack});

  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 64,
      padding: const EdgeInsets.fromLTRB(18, 12, 18, 12),
      decoration: const BoxDecoration(
        color: Color(0xFFF8F9FB),
        border: Border(bottom: BorderSide(color: Color(0xFFE1E6EE))),
      ),
      child: Row(
        children: [
          InkWell(
            borderRadius: BorderRadius.circular(20),
            onTap: onBack,
            child: const SizedBox(
              width: 40,
              height: 40,
              child: Icon(
                Icons.arrow_back_rounded,
                color: Color(0xFF1A2940),
                size: 30,
              ),
            ),
          ),
          const SizedBox(width: 6),
          const Expanded(
            child: Text(
              'Achievements & Badges',
              style: TextStyle(
                color: Color(0xFF141C34),
                fontSize: 19,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _HeroSummary extends StatelessWidget {
  const _HeroSummary({required this.unlockedCount});

  final int unlockedCount;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        const SizedBox(height: 2),
        const _HeroMedalIcon(),
        const SizedBox(height: 14),
        Text(
          unlockedCount == 1 ? '1 Badge Earned' : '$unlockedCount Badges Earned',
          textAlign: TextAlign.center,
          style: const TextStyle(
            color: Color(0xFF131E35),
            fontSize: 29,
            fontWeight: FontWeight.w900,
          ),
        ),
        const SizedBox(height: 6),
        const Text(
          'Keep providing excellent service to earn more!',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: Color(0xFF66758E),
            fontSize: 14.5,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}

class _HeroMedalIcon extends StatelessWidget {
  const _HeroMedalIcon();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 106,
      height: 106,
      decoration: const BoxDecoration(
        color: Color(0xFFE1E7F0),
        shape: BoxShape.circle,
      ),
      child: const Icon(
        Icons.workspace_premium_rounded,
        size: 48,
        color: Color(0xFF3F4F69),
      ),
    );
  }
}

class _BadgeCard extends StatelessWidget {
  const _BadgeCard({required this.badge});

  final Map<String, dynamic> badge;

  IconData _getBadgeIcon(String? iconName) {
    switch (iconName) {
      case 'workspace_premium':
        return Icons.workspace_premium_rounded;
      case 'verified':
        return Icons.verified_rounded;
      case 'speed':
        return Icons.speed_rounded;
      case 'shield_person':
        return Icons.shield_rounded;
      case 'military_tech':
        return Icons.military_tech_rounded;
      default:
        return Icons.emoji_events_rounded;
    }
  }

  Color _getBadgeColor(String? accent) {
    switch (accent) {
      case 'yellow':
        return const Color(0xFFF59E0B);
      case 'blue':
        return const Color(0xFF3B82F6);
      case 'orange':
        return const Color(0xFFF97316);
      case 'emerald':
        return const Color(0xFF10B981);
      case 'purple':
        return const Color(0xFF8B5CF6);
      default:
        return const Color(0xFF4F46E5);
    }
  }

  Color _getBadgeBgColor(String? accent) {
    switch (accent) {
      case 'yellow':
        return const Color(0xFFFEF3C7);
      case 'blue':
        return const Color(0xFFDBEAFE);
      case 'orange':
        return const Color(0xFFFFEDD5);
      case 'emerald':
        return const Color(0xFFD1FAE5);
      case 'purple':
        return const Color(0xFFEDE9FE);
      default:
        return const Color(0xFFEEF2F6);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isLocked = badge['isLocked'] == true;
    final name = badge['name']?.toString() ?? '';
    final description = badge['description']?.toString() ?? '';
    final requirementText = badge['requirementText']?.toString() ?? '';
    final iconName = badge['icon']?.toString();
    final accent = badge['accent']?.toString();
    final progress = badge['progress'] as Map?;
    final progressPercent = progress?['current'] as num? ?? 0;
    final progressDetail = progress?['detail']?.toString() ?? '';

    final borderColor = isLocked
        ? const Color(0xFFDCE4F0)
        : const Color(0xFFE8EDF4);
    final bgColor = isLocked ? const Color(0xFFF6F8FC) : Colors.white;
    final titleColor = isLocked
        ? const Color(0xFFA9B5C8)
        : const Color(0xFF141C34);
    final bodyColor = isLocked
        ? const Color(0xFFA9B5C8)
        : const Color(0xFF60718C);
    final iconColor = isLocked
        ? const Color(0xFFB6C1D1)
        : _getBadgeColor(accent);
    final iconBgColor = isLocked
        ? const Color(0xFFEEF2F8)
        : _getBadgeBgColor(accent);

    final cardContent = Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 64,
          height: 64,
          decoration: BoxDecoration(
            color: iconBgColor,
            borderRadius: BorderRadius.circular(14),
          ),
          child: Icon(_getBadgeIcon(iconName), color: iconColor, size: 34),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Text(
                      name,
                      style: TextStyle(
                        color: titleColor,
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        height: 1.1,
                      ),
                    ),
                  ),
                  if (!isLocked)
                    Container(
                      margin: const EdgeInsets.only(left: 8),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 5,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFFD9F8DF),
                        borderRadius: BorderRadius.circular(9),
                      ),
                      child: const Text(
                        'ACTIVE',
                        style: TextStyle(
                          color: Color(0xFF169542),
                          fontSize: 13,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    )
                  else
                    const Padding(
                      padding: EdgeInsets.only(left: 8, top: 1),
                      child: Icon(
                        Icons.lock_outline_rounded,
                        color: Color(0xFFB9C3D4),
                        size: 20,
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 5),
              Text(
                isLocked && requirementText.isNotEmpty ? 'Requirement: $requirementText' : description,
                style: TextStyle(
                  color: bodyColor,
                  fontSize: 14.5,
                  fontWeight: FontWeight.w500,
                  height: 1.3,
                ),
              ),
              if (isLocked && progressDetail.isNotEmpty) ...[
                const SizedBox(height: 10),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: progressPercent / 100.0,
                    backgroundColor: const Color(0xFFE8EDF4),
                    valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF3F5DD0)),
                    minHeight: 6,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  progressDetail,
                  style: const TextStyle(
                    color: Color(0xFF8EA0B8),
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    );

    final mainContainer = Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(22),
        border: isLocked ? null : Border.all(color: borderColor, width: 1),
      ),
      child: cardContent,
    );

    if (!isLocked) {
      return mainContainer;
    }

    return CustomPaint(
      painter: DashedRectPainter(
        color: borderColor,
        strokeWidth: 1.5,
        gap: 3.5,
        dashLength: 4.5,
        radius: 22,
      ),
      child: mainContainer,
    );
  }
}

class DashedRectPainter extends CustomPainter {
  DashedRectPainter({
    required this.color,
    required this.strokeWidth,
    required this.gap,
    required this.dashLength,
    required this.radius,
  });

  final Color color;
  final double strokeWidth;
  final double gap;
  final double dashLength;
  final double radius;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke;

    final path = Path()
      ..addRRect(RRect.fromRectAndRadius(
        Rect.fromLTWH(0, 0, size.width, size.height),
        Radius.circular(radius),
      ));

    final dashedPath = Path();
    double distance = 0.0;
    for (final metric in path.computeMetrics()) {
      while (distance < metric.length) {
        dashedPath.addPath(
          metric.extractPath(distance, distance + dashLength),
          Offset.zero,
        );
        distance += dashLength + gap;
      }
      distance = 0.0;
    }

    canvas.drawPath(dashedPath, paint);
  }

  @override
  bool shouldRepaint(covariant DashedRectPainter oldDelegate) {
    return oldDelegate.color != color ||
        oldDelegate.strokeWidth != strokeWidth ||
        oldDelegate.gap != gap ||
        oldDelegate.dashLength != dashLength ||
        oldDelegate.radius != radius;
  }
}
