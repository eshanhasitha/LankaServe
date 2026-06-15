import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../../config/constants.dart';
import '../../services/api_service.dart';
import '../../services/provider_service.dart';
import '../../widgets/provider_bottom_nav.dart';
import '../../widgets/ui_scale.dart';

class ProviderProfileEdit extends StatefulWidget {
  const ProviderProfileEdit({super.key});

  @override
  State<ProviderProfileEdit> createState() => _ProviderProfileEditState();
}

class _ProviderProfileEditState extends State<ProviderProfileEdit> {
  final ApiService _apiService = ApiService();
  final ProviderService _providerService = ProviderService();
  final ImagePicker _imagePicker = ImagePicker();

  bool _loading = true;
  bool _uploadingAvatar = false;
  String? _error;
  Map<String, dynamic> _profile = <String, dynamic>{};
  Map<String, dynamic> _publicProfile = <String, dynamic>{};
  Map<String, dynamic> _dashboard = <String, dynamic>{};
  Map<String, dynamic> _me = <String, dynamic>{};
  List<dynamic> _badges = <dynamic>[];

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
        _providerService.getProviderBadges(),
        _apiService.get('/users/me'),
      ]);

      final profile =
          (results[0] as Map<String, dynamic>?) ?? <String, dynamic>{};
      final dashboard =
          (results[1] as Map<String, dynamic>?) ?? <String, dynamic>{};
      final badgesRes =
          (results[2] as Map<String, dynamic>?) ?? <String, dynamic>{};
      final activeList = (badgesRes['active'] as List?) ?? [];
      final lockedList = (badgesRes['locked'] as List?) ?? [];
      final List<Map<String, dynamic>> badges = [];
      for (final item in activeList) {
        if (item is Map) {
          badges.add({
            ...Map<String, dynamic>.from(item),
            'unlocked': true,
          });
        }
      }
      for (final item in lockedList) {
        if (item is Map) {
          badges.add({
            ...Map<String, dynamic>.from(item),
            'unlocked': false,
          });
        }
      }

      Map<String, dynamic> publicProfile = <String, dynamic>{};
      final user = profile['userId'];
      final providerUserId = user is Map
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

      final meRes =
          (results[3] as Map<String, dynamic>?) ?? <String, dynamic>{};
      final me =
          (meRes['data'] as Map<String, dynamic>?) ?? <String, dynamic>{};

      if (!mounted) return;
      setState(() {
        _profile = profile;
        _dashboard = dashboard;
        _publicProfile = publicProfile;
        _badges = badges;
        _me = me;
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
    final meName = _me['name']?.toString().trim() ?? '';
    if (meName.isNotEmpty) return meName;
    final user = _profile['userId'];
    if (user is Map) {
      final value = user['name']?.toString().trim() ?? '';
      if (value.isNotEmpty) return value;
    }
    final publicUser = _publicProfile['userId'];
    if (publicUser is Map) {
      final value = publicUser['name']?.toString().trim() ?? '';
      if (value.isNotEmpty) return value;
    }
    return 'Provider';
  }

  String _avatarUrl() {
    final meAvatar = _me['profileImage']?.toString() ?? '';
    if (meAvatar.isNotEmpty) return AppConstants.normalizeUrl(meAvatar);
    final user = _profile['userId'];
    if (user is Map) {
      final value = user['profileImage']?.toString() ?? '';
      if (value.isNotEmpty) return AppConstants.normalizeUrl(value);
    }
    final publicUser = _publicProfile['userId'];
    if (publicUser is Map) {
      final value = publicUser['profileImage']?.toString() ?? '';
      if (value.isNotEmpty) return AppConstants.normalizeUrl(value);
    }
    return '';
  }

  String _avatarInitial() {
    final name = _providerName().trim();
    if (name.isEmpty || name.toLowerCase() == 'provider') return 'P';
    return String.fromCharCode(name.runes.first).toUpperCase();
  }

  Future<void> _changeProfilePhoto() async {
    if (_uploadingAvatar) return;

    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
      ),
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 8),
            const Text(
              'Change Profile Photo',
              style: TextStyle(
                color: Color(0xFF121C33),
                fontSize: 17,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 6),
            ListTile(
              leading: const Icon(Icons.photo_library_outlined),
              title: const Text('Choose from gallery'),
              onTap: () => Navigator.pop(context, ImageSource.gallery),
            ),
            ListTile(
              leading: const Icon(Icons.photo_camera_outlined),
              title: const Text('Take a photo'),
              onTap: () => Navigator.pop(context, ImageSource.camera),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );

    if (source == null) return;

    try {
      final picked = await _imagePicker.pickImage(
        source: source,
        imageQuality: 82,
        maxWidth: 1200,
      );
      if (picked == null) return;
      if (!mounted) return;

      setState(() => _uploadingAvatar = true);
      final upload = await _apiService.postMultipart(
        '/uploads/profile-image',
        file: File(picked.path),
      );
      final data =
          (upload['data'] as Map<String, dynamic>?) ?? <String, dynamic>{};
      final imageUrl = data['url']?.toString().trim() ?? '';
      if (imageUrl.isEmpty) {
        throw ApiException('Profile image upload did not return a URL.');
      }

      await _apiService.put('/users/me', body: {'profileImage': imageUrl});
      if (!mounted) return;
      await _load();
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Profile photo updated')));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to update profile photo: $e')),
      );
    } finally {
      if (mounted) setState(() => _uploadingAvatar = false);
    }
  }

  Future<void> _openEditNameAndBio() async {
    final result = await showModalBottomSheet<Map<String, String>>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _EditNameAndBioSheet(
        initialName: _providerName(),
        initialBio: _profile['bio']?.toString() ?? _publicProfile['bio']?.toString() ?? '',
      ),
    );

    if (result == null) return;

    final name = result['name'] ?? '';
    final bio = result['bio'] ?? '';

    bool updated = false;
    try {
      if (name != _providerName()) {
        await _apiService.put('/users/me', body: {'name': name});
        updated = true;
      }
      if (bio != (_profile['bio']?.toString() ?? _publicProfile['bio']?.toString() ?? '')) {
        await _providerService.updateProviderProfile({'bio': bio});
        updated = true;
      }

      if (updated) {
        if (!mounted) return;
        await _load();
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Profile updated successfully')),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to update profile: $e')),
      );
    }
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
              _Header(
                onBack: () => Navigator.maybePop(context),
                onEditTap: _openEditNameAndBio,
              ),
              Expanded(
                child: RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.fromLTRB(18, 12, 18, 16),
                    children: [
                      if (_loading)
                        const _ProviderProfileSkeleton()
                      else if (_error != null)
                        _InfoTile(message: _error!)
                      else ...[
                        _ProfileCard(
                          name: _providerName(),
                          subtitle: _titleLine(),
                          avatarUrl: _avatarUrl(),
                          initial: _avatarInitial(),
                          uploadingAvatar: _uploadingAvatar,
                          onAvatarTap: _changeProfilePhoto,
                          verified: verified,
                          rating: avgRating,
                          reviews: totalReviews,
                        ),
                        const SizedBox(height: 14),
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
                        if (_badges.isNotEmpty) ...[
                          const SizedBox(height: 14),
                          _SectionTitle(
                            'Achievements & Badges',
                            action: 'View All',
                            onActionTap: () => Navigator.pushNamed(context, '/provider/badges'),
                          ),
                          const SizedBox(height: 8),
                          _AchievementRow(badges: _badges),
                        ],
                        const SizedBox(height: 14),
                        const _SectionTitle('About'),
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
  const _Header({required this.onBack, this.onEditTap});

  final VoidCallback onBack;
  final VoidCallback? onEditTap;

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
          if (onEditTap != null)
            InkWell(
              borderRadius: BorderRadius.circular(20),
              onTap: onEditTap,
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

class _ProviderProfileSkeleton extends StatelessWidget {
  const _ProviderProfileSkeleton();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        const _SkeletonBox(height: 248, radius: 24),
        const SizedBox(height: 14),
        Row(
          children: const [
            Expanded(child: _SkeletonBox(height: 86, radius: 16)),
            SizedBox(width: 10),
            Expanded(child: _SkeletonBox(height: 86, radius: 16)),
          ],
        ),
        const SizedBox(height: 12),
        const _SkeletonBox(height: 122, radius: 18),
        const SizedBox(height: 12),
        const _SkeletonBox(height: 162, radius: 18),
        const SizedBox(height: 86),
      ],
    );
  }
}

class _SkeletonBox extends StatelessWidget {
  const _SkeletonBox({required this.height, required this.radius});

  final double height;
  final double radius;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      decoration: BoxDecoration(
        color: const Color(0xFFE8EDF4),
        borderRadius: BorderRadius.circular(radius),
      ),
    );
  }
}

class _ProfileCard extends StatelessWidget {
  const _ProfileCard({
    required this.name,
    required this.subtitle,
    required this.avatarUrl,
    required this.initial,
    required this.uploadingAvatar,
    required this.onAvatarTap,
    required this.verified,
    required this.rating,
    required this.reviews,
  });

  final String name;
  final String subtitle;
  final String avatarUrl;
  final String initial;
  final bool uploadingAvatar;
  final VoidCallback onAvatarTap;
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
          GestureDetector(
            onTap: uploadingAvatar ? null : onAvatarTap,
            child: SizedBox(
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
                        ? Center(
                            child: Text(
                              initial,
                              style: const TextStyle(
                                color: Color(0xFF273D98),
                                fontSize: 32,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          )
                        : null,
                  ),
                  Positioned(
                    right: 2,
                    bottom: 2,
                    child: Container(
                      width: 28,
                      height: 28,
                      decoration: BoxDecoration(
                        color: const Color(0xFF273D98),
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 2),
                      ),
                      child: uploadingAvatar
                          ? const Padding(
                              padding: EdgeInsets.all(7),
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Icon(
                              Icons.camera_alt_rounded,
                              size: 15,
                              color: Colors.white,
                            ),
                    ),
                  ),
                  if (verified)
                    Positioned(
                      left: 2,
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
  const _SectionTitle(this.title, {this.action, this.onActionTap});

  final String title;
  final String? action;
  final VoidCallback? onActionTap;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          title,
          style: const TextStyle(
            color: Color(0xFF131E35),
            fontSize: 19,
            fontWeight: FontWeight.w800,
          ),
        ),
        if (action != null && onActionTap != null)
          GestureDetector(
            onTap: onActionTap,
            child: Text(
              action!,
              style: const TextStyle(
                color: Color(0xFF2F4DA0),
                fontSize: 14,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
      ],
    );
  }
}

class _AchievementRow extends StatelessWidget {
  const _AchievementRow({required this.badges});

  final List<dynamic> badges;

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
    return SizedBox(
      height: 64,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: badges.length,
        separatorBuilder: (context, index) => const SizedBox(width: 10),
        itemBuilder: (context, index) {
          final badge = badges[index] as Map;
          final name = badge['name']?.toString() ?? '';
          final iconName = badge['icon']?.toString();
          final accent = badge['accent']?.toString();
          final unlocked = badge['unlocked'] == true;

          final icon = _getBadgeIcon(iconName);
          final color = _getBadgeColor(accent);
          final bgColor = _getBadgeBgColor(accent);

          return _AchievementCard(
            name: name,
            icon: icon,
            color: color,
            bgColor: bgColor,
            unlocked: unlocked,
          );
        },
      ),
    );
  }
}

class _AchievementCard extends StatelessWidget {
  const _AchievementCard({
    required this.name,
    required this.icon,
    required this.color,
    required this.bgColor,
    required this.unlocked,
  });

  final String name;
  final IconData icon;
  final Color color;
  final Color bgColor;
  final bool unlocked;

  @override
  Widget build(BuildContext context) {
    final cardContent = Row(
      children: [
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: unlocked ? bgColor : const Color(0xFFF1F5F9),
            shape: BoxShape.circle,
          ),
          child: Icon(
            unlocked ? icon : Icons.lock_outline_rounded,
            color: unlocked ? color : const Color(0xFF94A3B8),
            size: 18,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            name,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: Color(0xFF141C34),
              fontSize: 12,
              fontWeight: FontWeight.w800,
              height: 1.1,
            ),
          ),
        ),
      ],
    );

    final mainContainer = Container(
      width: 154,
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: unlocked
            ? Border.all(color: const Color(0xFFE7EBF2))
            : null,
      ),
      child: Opacity(
        opacity: unlocked ? 1.0 : 0.55,
        child: cardContent,
      ),
    );

    if (unlocked) {
      return mainContainer;
    }

    return CustomPaint(
      painter: DashedRectPainter(
        color: const Color(0xFFCAD4E0),
        strokeWidth: 1.5,
        gap: 3.0,
        dashLength: 4.0,
        radius: 16,
      ),
      child: mainContainer,
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

class _EditNameAndBioSheet extends StatefulWidget {
  const _EditNameAndBioSheet({
    required this.initialName,
    required this.initialBio,
  });

  final String initialName;
  final String initialBio;

  @override
  State<_EditNameAndBioSheet> createState() => _EditNameAndBioSheetState();
}

class _EditNameAndBioSheetState extends State<_EditNameAndBioSheet> {
  late final TextEditingController nameController;
  late final TextEditingController bioController;

  @override
  void initState() {
    super.initState();
    nameController = TextEditingController(text: widget.initialName);
    bioController = TextEditingController(text: widget.initialBio);
  }

  @override
  void dispose() {
    nameController.dispose();
    bioController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.viewInsetsOf(context).bottom;
    return SafeArea(
      top: false,
      child: Padding(
        padding: EdgeInsets.only(bottom: bottomInset),
        child: Container(
          padding: const EdgeInsets.fromLTRB(18, 14, 18, 18),
          decoration: const BoxDecoration(
            color: Color(0xFFF8F9FB),
            borderRadius: BorderRadius.vertical(top: Radius.circular(26)),
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 42,
                    height: 4,
                    decoration: BoxDecoration(
                      color: const Color(0xFFD5DCE8),
                      borderRadius: BorderRadius.circular(99),
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                const Text(
                  'Edit Profile Info',
                  style: TextStyle(
                    color: Color(0xFF121C33),
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 12),
                _SheetField(
                  label: 'Full Name',
                  controller: nameController,
                  textInputAction: TextInputAction.next,
                ),
                const SizedBox(height: 10),
                _SheetField(
                  label: 'About Me',
                  controller: bioController,
                  maxLines: 4,
                  keyboardType: TextInputType.multiline,
                  textInputAction: TextInputAction.newline,
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => Navigator.pop(context),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFF2F4DA0),
                          side: const BorderSide(color: Color(0xFFD1DAE8)),
                          padding: const EdgeInsets.symmetric(vertical: 13),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(13),
                          ),
                        ),
                        child: const Text(
                          'Cancel',
                          style: TextStyle(fontWeight: FontWeight.w800),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () {
                          Navigator.pop(context, <String, String>{
                            'name': nameController.text.trim(),
                            'bio': bioController.text.trim(),
                          });
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF2F4DA0),
                          foregroundColor: Colors.white,
                          elevation: 0,
                          padding: const EdgeInsets.symmetric(vertical: 13),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(13),
                          ),
                        ),
                        child: const Text(
                          'Save',
                          style: TextStyle(fontWeight: FontWeight.w800),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _SheetField extends StatelessWidget {
  const _SheetField({
    required this.label,
    this.controller,
    this.maxLines = 1,
    this.keyboardType,
    this.textInputAction,
  });

  final String label;
  final TextEditingController? controller;
  final int maxLines;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      maxLines: maxLines,
      keyboardType: keyboardType,
      textInputAction: textInputAction,
      decoration: InputDecoration(
        labelText: label,
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(13),
          borderSide: const BorderSide(color: Color(0xFFD9E2EF)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(13),
          borderSide: const BorderSide(color: Color(0xFFD9E2EF)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(13),
          borderSide: const BorderSide(color: Color(0xFF2F4DA0), width: 1.4),
        ),
        labelStyle: const TextStyle(color: Color(0xFF6C7B94)),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 12,
          vertical: 12,
        ),
      ),
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
