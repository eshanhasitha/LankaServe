import 'package:flutter/material.dart';

import '../../config/routes.dart';
import '../../services/provider_service.dart';
import '../../widgets/provider_bottom_nav.dart';
import '../../widgets/ui_scale.dart';

class ProviderProfileEdit extends StatefulWidget {
  const ProviderProfileEdit({super.key});

  @override
  State<ProviderProfileEdit> createState() => _ProviderProfileEditState();
}

class _ProviderProfileEditState extends State<ProviderProfileEdit> {
  final ProviderService _providerService = ProviderService();

  bool _loading = true;
  String? _error;
  Map<String, dynamic> _profile = <String, dynamic>{};
  Map<String, dynamic> _publicProfile = <String, dynamic>{};
  Map<String, dynamic> _dashboard = <String, dynamic>{};

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
      final results = await Future.wait<dynamic>([
        _providerService.getProviderMe(),
        _providerService.getProviderDashboard(),
      ]);

      final profile =
          (results[0] as Map<String, dynamic>?) ?? <String, dynamic>{};
      final dashboard =
          (results[1] as Map<String, dynamic>?) ?? <String, dynamic>{};

      Map<String, dynamic> publicProfile = <String, dynamic>{};
      final user = profile['userId'];
      final providerUserId = user is Map<String, dynamic>
          ? user['_id']?.toString() ?? ''
          : user?.toString() ?? '';
      if (providerUserId.isNotEmpty) {
        try {
          publicProfile = await _providerService.getPublicProviderProfile(
            providerUserId,
          );
        } catch (_) {
          publicProfile = <String, dynamic>{};
        }
      }

      if (!mounted) return;
      setState(() {
        _profile = profile;
        _dashboard = dashboard;
        _publicProfile = publicProfile;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  double _asDouble(dynamic value) {
    if (value is num) return value.toDouble();
    return double.tryParse(value?.toString() ?? '0') ?? 0;
  }

  int _asInt(dynamic value) {
    if (value is int) return value;
    if (value is num) return value.round();
    return int.tryParse(value?.toString() ?? '0') ?? 0;
  }

  String _providerName() {
    final user = _profile['userId'];
    if (user is Map<String, dynamic>) {
      final value = user['name']?.toString().trim() ?? '';
      if (value.isNotEmpty) return value;
    }
    final publicUser = _publicProfile['userId'];
    if (publicUser is Map<String, dynamic>) {
      final value = publicUser['name']?.toString().trim() ?? '';
      if (value.isNotEmpty) return value;
    }
    return 'Provider';
  }

  String _avatarUrl() {
    final user = _profile['userId'];
    if (user is Map<String, dynamic>) {
      final value = user['profileImage']?.toString() ?? '';
      if (value.isNotEmpty) return value;
    }
    final publicUser = _publicProfile['userId'];
    if (publicUser is Map<String, dynamic>) {
      final value = publicUser['profileImage']?.toString() ?? '';
      if (value.isNotEmpty) return value;
    }
    return '';
  }

  String _titleLine() {
    final categories =
        (_profile['categories'] as List?)
            ?.map((e) => e.toString().trim())
            .where((e) => e.isNotEmpty)
            .toList() ??
        <String>[];
    if (categories.isNotEmpty) return categories.first;
    final publicCategories =
        (_publicProfile['categories'] as List?)
            ?.map((e) => e.toString().trim())
            .where((e) => e.isNotEmpty)
            .toList() ??
        <String>[];
    if (publicCategories.isNotEmpty) return publicCategories.first;
    return 'Service Provider';
  }

  String _aboutText() {
    final text = _profile['bio']?.toString().trim() ?? '';
    if (text.isNotEmpty) return text;
    final publicText = _publicProfile['bio']?.toString().trim() ?? '';
    if (publicText.isNotEmpty) return publicText;
    return 'Add your profile bio to improve trust with customers.';
  }

  String _serviceArea() {
    final city = (_profile['city']?.toString().trim().isNotEmpty == true)
        ? _profile['city']?.toString().trim() ?? ''
        : _publicProfile['city']?.toString().trim() ?? '';
    final district =
        (_profile['district']?.toString().trim().isNotEmpty == true)
        ? _profile['district']?.toString().trim() ?? ''
        : _publicProfile['district']?.toString().trim() ?? '';
    if (city.isNotEmpty && district.isNotEmpty) return '$city, $district';
    if (city.isNotEmpty) return city;
    if (district.isNotEmpty) return district;
    return 'Not set';
  }

  String _formatPercent(num value) => '${value.toStringAsFixed(0)}%';

  String _responseTimeLabel() {
    final mins = _asDouble(
      (_publicProfile['stats']
              as Map<String, dynamic>?)?['avgResponseTimeMinutes'] ??
          _profile['stats']?['avgResponseTimeMinutes'],
    );
    if (mins <= 0 || mins >= 9999) return '~ --';
    return mins < 1 ? '<1 min' : '~${mins.toStringAsFixed(0)} min';
  }

  List<Map<String, dynamic>> _badgeItems() {
    final badges =
        (_profile['badges'] as List?)
            ?.whereType<Map<String, dynamic>>()
            .toList() ??
        <Map<String, dynamic>>[];
    if (badges.isNotEmpty) return badges;
    return <Map<String, dynamic>>[
      {'name': 'Top Rated Provider'},
      {'name': 'Fast Responder'},
    ];
  }

  @override
  Widget build(BuildContext context) {
    final compactScale = UiScale.factor(context, min: 0.76, max: 0.90);
    final stats =
        (_publicProfile['stats'] as Map<String, dynamic>?) ??
        <String, dynamic>{};
    final avgRating = _asDouble(stats['averageRating'] ?? _dashboard['rating']);
    final totalReviews = _asInt(_publicProfile['totalReviews']);
    final completedJobs = _asInt(
      stats['completedJobs'] ?? _dashboard['completed'],
    );
    final successRate = _asDouble(_dashboard['successRate']);
    final years = _asInt(
      _profile['yearsExperience'] ?? _publicProfile['yearsExperience'],
    );
    final verified =
        (_profile['verified'] == true) || (_publicProfile['verified'] == true);

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
                  child: ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.fromLTRB(18, 12, 18, 16),
                    children: [
                      if (_loading)
                        const Padding(
                          padding: EdgeInsets.only(top: 80),
                          child: Center(
                            child: CircularProgressIndicator(
                              color: Color(0xFF273D98),
                            ),
                          ),
                        )
                      else if (_error != null)
                        _InfoTile(message: _error!)
                      else ...[
                        _ProfileCard(
                          name: _providerName(),
                          subtitle: _titleLine(),
                          avatarUrl: _avatarUrl(),
                          verified: verified,
                          rating: avgRating,
                          reviews: totalReviews,
                        ),
                        const SizedBox(height: 14),
                        _SectionTitle(
                          'Achievements & Badges',
                          'View All',
                          onActionTap: () => Navigator.pushNamed(
                            context,
                            AppRoutes.providerBadges,
                          ),
                        ),
                        const SizedBox(height: 10),
                        _AchievementRow(badges: _badgeItems()),
                        const SizedBox(height: 12),
                        _MetricRow(
                          leftValue: completedJobs.toString(),
                          leftLabel: 'Jobs Completed',
                          leftIcon: Icons.task_alt_rounded,
                          rightValue: _formatPercent(successRate),
                          rightLabel: 'Success Rate',
                          rightIcon: Icons.trending_up_rounded,
                        ),
                        const SizedBox(height: 10),
                        _MetricRow(
                          leftValue: _responseTimeLabel(),
                          leftLabel: 'Response Time',
                          leftIcon: Icons.schedule_rounded,
                          rightValue: years > 0 ? '$years Years' : '--',
                          rightLabel: 'Experience',
                          rightIcon: Icons.workspace_premium_outlined,
                        ),
                        const SizedBox(height: 14),
                        const _SectionTitle('About', ''),
                        const SizedBox(height: 8),
                        _AboutCard(
                          text: _aboutText(),
                          serviceArea: _serviceArea(),
                        ),
                        const SizedBox(height: 86),
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
              'My Profile',
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
                Icons.edit_outlined,
                color: Color(0xFF4D5D77),
                size: 24,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ProfileCard extends StatelessWidget {
  const _ProfileCard({
    required this.name,
    required this.subtitle,
    required this.avatarUrl,
    required this.verified,
    required this.rating,
    required this.reviews,
  });

  final String name;
  final String subtitle;
  final String avatarUrl;
  final bool verified;
  final double rating;
  final int reviews;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFE7EBF2)),
      ),
      child: Column(
        children: [
          SizedBox(
            width: 100,
            height: 100,
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                Container(
                  width: 100,
                  height: 100,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: const Color(0xFFE8EDF4),
                    image: avatarUrl.isNotEmpty
                        ? DecorationImage(
                            image: NetworkImage(avatarUrl),
                            fit: BoxFit.cover,
                          )
                        : null,
                  ),
                  child: avatarUrl.isEmpty
                      ? const Icon(
                          Icons.person,
                          size: 52,
                          color: Color(0xFF8EA0B8),
                        )
                      : null,
                ),
                Positioned(
                  right: 2,
                  bottom: 2,
                  child: Container(
                    width: 18,
                    height: 18,
                    decoration: BoxDecoration(
                      color: const Color(0xFF22C55E),
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 2),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),
          Text(
            name,
            style: const TextStyle(
              color: Color(0xFF141C34),
              fontSize: 29,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 3),
          Text(
            subtitle,
            style: const TextStyle(
              color: Color(0xFF66758E),
              fontSize: 16,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            alignment: WrapAlignment.center,
            children: [
              if (verified)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 5,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE8EEFA),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.verified_rounded,
                        color: Color(0xFF3F5DD0),
                        size: 15,
                      ),
                      SizedBox(width: 4),
                      Text(
                        'Verified',
                        style: TextStyle(
                          color: Color(0xFF3F5DD0),
                          fontSize: 12.5,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 5,
                ),
                decoration: BoxDecoration(
                  color: const Color(0xFFFDEDD9),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.star_rounded,
                      color: Color(0xFFFACC15),
                      size: 15,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '${rating.toStringAsFixed(1)} (${reviews.toString()} Reviews)',
                      style: const TextStyle(
                        color: Color(0xFFEA580C),
                        fontSize: 12.5,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.title, this.action, {this.onActionTap});

  final String title;
  final String action;
  final VoidCallback? onActionTap;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Text(
          title,
          style: const TextStyle(
            color: Color(0xFF131E35),
            fontSize: 19,
            fontWeight: FontWeight.w800,
          ),
        ),
        const Spacer(),
        if (action.isNotEmpty)
          InkWell(
            onTap: onActionTap,
            borderRadius: BorderRadius.circular(8),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
              child: Text(
                action,
                style: const TextStyle(
                  color: Color(0xFF3D5FD2),
                  fontSize: 13.5,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _AchievementRow extends StatelessWidget {
  const _AchievementRow({required this.badges});

  final List<Map<String, dynamic>> badges;

  @override
  Widget build(BuildContext context) {
    final left = badges.isNotEmpty
        ? badges.first['name']?.toString() ?? 'Achievement'
        : 'Achievement';
    final right = badges.length > 1
        ? badges[1]['name']?.toString() ?? 'Achievement'
        : 'Fast Responder';

    return Row(
      children: [
        Expanded(
          child: _AchievementCard(
            title: left,
            icon: Icons.emoji_events_outlined,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _AchievementCard(title: right, icon: Icons.bolt_rounded),
        ),
      ],
    );
  }
}

class _AchievementCard extends StatelessWidget {
  const _AchievementCard({required this.title, required this.icon});

  final String title;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 128,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE7EBF2)),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: const Color(0xFFF2F5F9),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(icon, color: const Color(0xFF3F4F69)),
          ),
          const SizedBox(height: 8),
          Text(
            title,
            textAlign: TextAlign.center,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: Color(0xFF141C34),
              fontSize: 13,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _MetricRow extends StatelessWidget {
  const _MetricRow({
    required this.leftValue,
    required this.leftLabel,
    required this.leftIcon,
    required this.rightValue,
    required this.rightLabel,
    required this.rightIcon,
  });

  final String leftValue;
  final String leftLabel;
  final IconData leftIcon;
  final String rightValue;
  final String rightLabel;
  final IconData rightIcon;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _Metric(value: leftValue, label: leftLabel, icon: leftIcon),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _Metric(value: rightValue, label: rightLabel, icon: rightIcon),
        ),
      ],
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric({required this.value, required this.label, required this.icon});

  final String value;
  final String label;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 100,
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE7EBF2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: const Color(0xFF6B7C97), size: 20),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(
              color: Color(0xFF141C34),
              fontSize: 18,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: const TextStyle(
              color: Color(0xFF8EA0B8),
              fontSize: 12.5,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

class _AboutCard extends StatelessWidget {
  const _AboutCard({required this.text, required this.serviceArea});

  final String text;
  final String serviceArea;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE7EBF2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            text,
            style: const TextStyle(
              color: Color(0xFF60718C),
              fontSize: 15,
              fontWeight: FontWeight.w500,
              height: 1.45,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            'Service area: $serviceArea',
            style: const TextStyle(
              color: Color(0xFF8EA0B8),
              fontSize: 12.5,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _InfoTile extends StatelessWidget {
  const _InfoTile({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE7EBF2)),
      ),
      child: Text(
        message,
        textAlign: TextAlign.center,
        style: const TextStyle(
          color: Color(0xFF6E7F98),
          fontSize: 14.5,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}
