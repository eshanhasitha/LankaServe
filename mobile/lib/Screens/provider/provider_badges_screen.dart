import 'package:flutter/material.dart';

import '../../widgets/provider_bottom_nav.dart';
import '../../widgets/ui_scale.dart';

class ProviderBadgesScreen extends StatelessWidget {
  const ProviderBadgesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final compactScale = UiScale.factor(context, min: 0.76, max: 0.90);
    final badges = _badgeItems();

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
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(18, 16, 18, 18),
                  children: [
                    const _HeroSummary(),
                    const SizedBox(height: 18),
                    for (final badge in badges) ...[
                      _BadgeCard(item: badge),
                      const SizedBox(height: 10),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
      bottomNavigationBar: const ProviderBottomNav(activeIndex: -1),
    );
  }

  List<_BadgeItem> _badgeItems() {
    return const <_BadgeItem>[
      _BadgeItem(
        title: 'Top Rated Provider',
        description:
            'Maintained a 4.9+ rating across 50+ completed service jobs.',
        awardedDate: 'AWARDED: OCT 12, 2023',
        icon: Icons.star_outline_rounded,
        showActive: true,
      ),
      _BadgeItem(
        title: 'Quick Responder',
        description:
            'Responded to 95% of customer inquiries within 15 minutes.',
        awardedDate: 'AWARDED: SEP 28, 2023',
        icon: Icons.bolt_rounded,
      ),
      _BadgeItem(
        title: 'Verified Hero',
        description:
            'Successfully completed the enhanced identity & background check.',
        awardedDate: 'AWARDED: AUG 15, 2023',
        icon: Icons.verified_user_outlined,
      ),
      _BadgeItem(
        title: 'Punctual Pro',
        description: 'Arrived exactly on time for 20 consecutive appointments.',
        awardedDate: 'AWARDED: NOV 05, 2023',
        icon: Icons.schedule_rounded,
      ),
      _BadgeItem(
        title: 'QR Master',
        description:
            '100% QR verification rate across all completed service sessions.',
        awardedDate: 'AWARDED: DEC 01, 2023',
        icon: Icons.qr_code_2_rounded,
      ),
      _BadgeItem(
        title: 'Elite Expert',
        description: 'Complete 500 jobs to unlock this prestigious badge.',
        awardedDate: '',
        icon: Icons.workspace_premium_outlined,
        locked: true,
      ),
    ];
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
          InkWell(
            borderRadius: BorderRadius.circular(20),
            onTap: () {},
            child: const SizedBox(
              width: 40,
              height: 40,
              child: Icon(
                Icons.info_outline_rounded,
                color: Color(0xFF4D5D77),
                size: 26,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _HeroSummary extends StatelessWidget {
  const _HeroSummary();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: const [
        SizedBox(height: 2),
        _HeroMedalIcon(),
        SizedBox(height: 14),
        Text(
          '8 Badges Earned',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: Color(0xFF131E35),
            fontSize: 29,
            fontWeight: FontWeight.w900,
          ),
        ),
        SizedBox(height: 6),
        Text(
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
  const _BadgeCard({required this.item});

  final _BadgeItem item;

  @override
  Widget build(BuildContext context) {
    final borderColor = item.locked
        ? const Color(0xFFDCE4F0)
        : const Color(0xFFE8EDF4);
    final bgColor = item.locked ? const Color(0xFFF6F8FC) : Colors.white;
    final titleColor = item.locked
        ? const Color(0xFFA9B5C8)
        : const Color(0xFF141C34);
    final bodyColor = item.locked
        ? const Color(0xFFA9B5C8)
        : const Color(0xFF60718C);
    final iconColor = item.locked
        ? const Color(0xFFB6C1D1)
        : const Color(0xFF3F4F69);

    return Container(
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: borderColor, width: item.locked ? 2 : 1),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: item.locked
                  ? const Color(0xFFEEF2F8)
                  : const Color(0xFFF3F6FB),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(item.icon, color: iconColor, size: 34),
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
                        item.title,
                        style: TextStyle(
                          color: titleColor,
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          height: 1.1,
                        ),
                      ),
                    ),
                    if (item.showActive)
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
                    else if (item.locked)
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
                  item.description,
                  style: TextStyle(
                    color: bodyColor,
                    fontSize: 14.5,
                    fontWeight: FontWeight.w500,
                    height: 1.3,
                  ),
                ),
                if (item.awardedDate.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(
                    item.awardedDate,
                    style: const TextStyle(
                      color: Color(0xFF96A4BA),
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.6,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _BadgeItem {
  const _BadgeItem({
    required this.title,
    required this.description,
    required this.awardedDate,
    required this.icon,
    this.showActive = false,
    this.locked = false,
  });

  final String title;
  final String description;
  final String awardedDate;
  final IconData icon;
  final bool showActive;
  final bool locked;
}
