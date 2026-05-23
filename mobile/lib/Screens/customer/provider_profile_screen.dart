import 'package:flutter/material.dart';

import '../../config/routes.dart';
import '../../config/ui_styles.dart';
import '../../services/job_service.dart';
import '../../services/provider_service.dart';
import '../../services/review_service.dart';
import '../../widgets/customer_bottom_nav.dart';
import '../../widgets/ui_scale.dart';

class ProviderProfileScreen extends StatefulWidget {
  const ProviderProfileScreen({super.key});

  @override
  State<ProviderProfileScreen> createState() => _ProviderProfileScreenState();
}

class _ProviderProfileScreenState extends State<ProviderProfileScreen> {
  final ProviderService _providerService = ProviderService();
  final ReviewService _reviewService = ReviewService();
  final JobService _jobService = JobService();

  String? _providerUserId;
  bool _loadedArgs = false;
  bool _loading = true;
  String? _error;
  Map<String, dynamic>? _profile;
  List<Map<String, dynamic>> _reviews = <Map<String, dynamic>>[];

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_loadedArgs) return;
    _loadedArgs = true;
    final args = ModalRoute.of(context)?.settings.arguments;
    if (args is String && args.isNotEmpty) {
      _providerUserId = args;
    }
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    final providerId = _providerUserId;
    if (providerId == null || providerId.isEmpty) {
      setState(() {
        _loading = false;
        _error = 'Provider ID not found.';
      });
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final profile = await _providerService.getPublicProviderProfile(
        providerId,
      );
      final reviews = await _reviewService.fetchProviderReviews(providerId);
      if (!mounted) return;
      setState(() {
        _profile = profile;
        _reviews = reviews;
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

  void _onHireNow() {
    Navigator.pushNamed(context, AppRoutes.postJob);
  }

  Future<void> _onMessage() async {
    final providerId = _providerUserId?.trim() ?? '';
    final profile = _profile ?? const <String, dynamic>{};
    final user = profile['userId'] as Map<String, dynamic>?;
    final providerName = user?['name']?.toString().trim().isNotEmpty == true
        ? user!['name'].toString().trim()
        : 'Provider';
    final providerAvatar = user?['profileImage']?.toString() ?? '';

    if (providerId.isEmpty) {
      _show('Provider is not available for chat.');
      return;
    }

    final jobsFuture = _fetchRelatedJobsForProvider(providerId);

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFFF8F9FC),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (sheetContext) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 18),
            child: FutureBuilder<List<Map<String, dynamic>>>(
              future: jobsFuture,
              builder: (context, snapshot) {
                final loading =
                    snapshot.connectionState == ConnectionState.waiting;
                final jobs = snapshot.data ?? const <Map<String, dynamic>>[];
                final hasJobs = jobs.isNotEmpty;

                return Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Message Provider',
                      style: TextStyle(
                        color: Color(0xFF141C34),
                        fontSize: 19,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Start a direct chat or continue a job related thread.',
                      style: TextStyle(
                        color: Color(0xFF6B7C96),
                        fontSize: 13.5,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 14),
                    _MessageOptionTile(
                      icon: Icons.forum_rounded,
                      title: 'Direct Chat',
                      subtitle: 'Send a general message',
                      onTap: () {
                        Navigator.of(sheetContext).pop();
                        _openChatConversation(
                          providerId: providerId,
                          providerName: providerName,
                          providerAvatar: providerAvatar,
                        );
                      },
                    ),
                    const SizedBox(height: 10),
                    const Text(
                      'Job Related Chats',
                      style: TextStyle(
                        color: Color(0xFF24324A),
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 8),
                    if (loading)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 14),
                        child: Center(
                          child: CircularProgressIndicator(
                            color: Color(0xFF2F4DA0),
                            strokeWidth: 2.5,
                          ),
                        ),
                      )
                    else if (!hasJobs)
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 12,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: const Color(0xFFE3E8F2)),
                        ),
                        child: const Text(
                          'No jobs found with this provider yet.',
                          style: TextStyle(
                            color: Color(0xFF6B7C96),
                            fontSize: 13.5,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      )
                    else
                      ...jobs
                          .take(4)
                          .map(
                            (job) => Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: _JobChatTile(
                                title: _jobTitle(job),
                                statusLabel: _jobStatusLabel(job),
                                onTap: () {
                                  Navigator.of(sheetContext).pop();
                                  _openChatConversation(
                                    providerId: providerId,
                                    providerName: providerName,
                                    providerAvatar: providerAvatar,
                                    jobId: job['_id']?.toString() ?? '',
                                  );
                                },
                              ),
                            ),
                          ),
                  ],
                );
              },
            ),
          ),
        );
      },
    );
  }

  Future<List<Map<String, dynamic>>> _fetchRelatedJobsForProvider(
    String providerUserId,
  ) async {
    final all = await _jobService.fetchJobs(limit: 100);
    final filtered = all.where((job) {
      final providerId = _extractId(job['providerId']);
      final preferredProviderId = _extractId(job['preferredProviderId']);
      return providerId == providerUserId ||
          preferredProviderId == providerUserId;
    }).toList();

    filtered.sort((a, b) {
      final aDate = DateTime.tryParse(a['createdAt']?.toString() ?? '');
      final bDate = DateTime.tryParse(b['createdAt']?.toString() ?? '');
      if (aDate == null && bDate == null) return 0;
      if (aDate == null) return 1;
      if (bDate == null) return -1;
      return bDate.compareTo(aDate);
    });

    return filtered;
  }

  String _extractId(dynamic value) {
    if (value == null) return '';
    if (value is String) return value.trim();
    if (value is Map<String, dynamic>) {
      final id = value['_id']?.toString().trim() ?? '';
      if (id.isNotEmpty) return id;
      final nestedUser = value['userId'];
      if (nestedUser is String) return nestedUser.trim();
      if (nestedUser is Map<String, dynamic>) {
        return nestedUser['_id']?.toString().trim() ?? '';
      }
    }
    return '';
  }

  String _jobTitle(Map<String, dynamic> job) {
    final title = job['title']?.toString().trim() ?? '';
    if (title.isNotEmpty) return title;
    final category = job['category']?.toString().trim() ?? '';
    if (category.isNotEmpty) return '$category Service';
    return 'Service Job';
  }

  String _jobStatusLabel(Map<String, dynamic> job) {
    final status = (job['status']?.toString() ?? 'pending').toLowerCase();
    switch (status) {
      case 'accepted':
        return 'Accepted';
      case 'arrived':
        return 'Arrived';
      case 'ongoing':
        return 'Ongoing';
      case 'completed':
      case 'paid':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Pending';
    }
  }

  void _openChatConversation({
    required String providerId,
    required String providerName,
    required String providerAvatar,
    String? jobId,
  }) {
    Navigator.pushNamed(
      context,
      AppRoutes.chatConversation,
      arguments: <String, dynamic>{
        'counterpartId': providerId,
        'counterpartName': providerName,
        'counterpartAvatar': providerAvatar,
        if (jobId != null && jobId.isNotEmpty) 'jobId': jobId,
      },
    );
  }

  void _show(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
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
              const _Header(),
              Expanded(
                child: _loading
                    ? const Center(
                        child: CircularProgressIndicator(
                          color: Color(0xFF273D98),
                        ),
                      )
                    : _error != null
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 24),
                          child: Text(
                            _error!,
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              color: Color(0xFF6E7F98),
                              fontSize: 14.5,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _loadProfile,
                        child: ListView(
                          padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                          children: [
                            _TopProfilePanel(
                              profile: _profile ?? const <String, dynamic>{},
                              onHireNow: _onHireNow,
                              onMessage: _onMessage,
                            ),
                            const SizedBox(height: 12),
                            _StatsRow(
                              profile: _profile ?? const <String, dynamic>{},
                            ),
                            const SizedBox(height: 12),
                            _AboutCard(
                              profile: _profile ?? const <String, dynamic>{},
                            ),
                            const SizedBox(height: 16),
                            const _SectionHeader(title: 'Customer Reviews'),
                            const SizedBox(height: 8),
                            ..._reviewCards(_reviews).map(
                              (card) => Padding(
                                padding: const EdgeInsets.only(bottom: 8),
                                child: card,
                              ),
                            ),
                          ],
                        ),
                      ),
              ),
            ],
          ),
        ),
      ),
      bottomNavigationBar: const CustomerBottomNav(activeIndex: 1),
    );
  }

  List<Widget> _reviewCards(List<Map<String, dynamic>> reviews) {
    if (reviews.isEmpty) {
      return const <Widget>[_EmptyReviewCard()];
    }
    return reviews.take(5).map((item) => _ReviewCard(review: item)).toList();
  }
}

class _Header extends StatelessWidget {
  const _Header();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 68,
      padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
      decoration: const BoxDecoration(
        color: Color(0xFFF8F9FB),
        border: Border(bottom: BorderSide(color: Color(0xFFE1E6EE))),
      ),
      child: Row(
        children: [
          InkWell(
            borderRadius: BorderRadius.circular(20),
            onTap: () => Navigator.of(context).maybePop(),
            child: const SizedBox(
              width: 40,
              height: 40,
              child: Icon(
                Icons.arrow_back_rounded,
                color: Color(0xFF1A2940),
                size: 32,
              ),
            ),
          ),
          const SizedBox(width: 8),
          const Expanded(
            child: Text(
              'Provider Profile',
              style: TextStyle(
                color: Color(0xFF222F46),
                fontSize: 20,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TopProfilePanel extends StatelessWidget {
  const _TopProfilePanel({
    required this.profile,
    required this.onHireNow,
    required this.onMessage,
  });

  final Map<String, dynamic> profile;
  final VoidCallback onHireNow;
  final VoidCallback onMessage;

  @override
  Widget build(BuildContext context) {
    final user = profile['userId'] as Map<String, dynamic>?;
    final name = user?['name']?.toString() ?? 'Service Provider';
    final avatar = user?['profileImage']?.toString() ?? '';
    final verified = profile['verified'] == true;
    final categories =
        (profile['categories'] as List?)
            ?.map((e) => e.toString().trim())
            .where((e) => e.isNotEmpty)
            .toList() ??
        <String>[];
    final category = categories.isNotEmpty
        ? categories.first
        : 'General Service';

    final yearsNum =
        (profile['yearsExperience'] as num?)?.toInt() ??
        int.tryParse(profile['yearsExperience']?.toString() ?? '') ??
        0;
    final years = yearsNum > 0 ? '$yearsNum+ Years' : 'New Provider';

    final city = profile['city']?.toString().trim() ?? '';
    final district = profile['district']?.toString().trim() ?? '';
    final location = city.isNotEmpty
        ? city
        : district.isNotEmpty
        ? district
        : 'Sri Lanka';

    final avgRatingNum =
        (profile['stats']?['averageRating'] as num?)?.toDouble() ?? 0;
    final totalReviews = (profile['totalReviews'] as num?)?.toInt() ?? 0;

    return Container(
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFE3E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Stack(
                clipBehavior: Clip.none,
                children: [
                  Container(
                    width: 86,
                    height: 86,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: const Color(0xFFE8EDF4),
                      image: DecorationImage(
                        image: NetworkImage(
                          avatar.isNotEmpty
                              ? avatar
                              : 'https://ui-avatars.com/api/?name=${Uri.encodeComponent(name)}',
                        ),
                        fit: BoxFit.cover,
                      ),
                    ),
                  ),
                  if (verified)
                    Positioned(
                      right: -2,
                      bottom: 2,
                      child: Container(
                        width: 24,
                        height: 24,
                        decoration: BoxDecoration(
                          color: const Color(0xFF10B981),
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 2.5),
                        ),
                        child: const Icon(
                          Icons.verified_rounded,
                          color: Colors.white,
                          size: 14,
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Color(0xFF141C34),
                        fontSize: 24,
                        fontWeight: FontWeight.w800,
                        height: 1.08,
                      ),
                    ),
                    const SizedBox(height: 10),
                    _MetaLine(
                      icon: Icons.home_repair_service_rounded,
                      value: category,
                    ),
                    const SizedBox(height: 4),
                    _MetaLine(icon: Icons.history_edu_rounded, value: years),
                    const SizedBox(height: 4),
                    _MetaLine(icon: Icons.location_on_rounded, value: location),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const Icon(
                          Icons.star_rounded,
                          color: Color(0xFFFACC15),
                          size: 20,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          avgRatingNum.toStringAsFixed(1),
                          style: const TextStyle(
                            color: Color(0xFF141C34),
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(width: 5),
                        Text(
                          '($totalReviews reviews)',
                          style: const TextStyle(
                            color: Color(0xFF8EA0B8),
                            fontSize: 13.5,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: SizedBox(
                  height: 48,
                  child: ElevatedButton(
                    onPressed: onHireNow,
                    style:
                        AppUiStyles.primaryButton(
                          height: 48,
                          radius: BorderRadius.circular(14),
                        ).copyWith(
                          backgroundColor: WidgetStateProperty.all(
                            const Color(0xFF2F4DA0),
                          ),
                        ),
                    child: const Text(
                      'Hire Now',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: SizedBox(
                  height: 48,
                  child: OutlinedButton(
                    onPressed: onMessage,
                    style:
                        AppUiStyles.neutralOutlineButton(
                          height: 48,
                          radius: BorderRadius.circular(14),
                        ).copyWith(
                          foregroundColor: WidgetStateProperty.all(
                            const Color(0xFF42526B),
                          ),
                          side: WidgetStateProperty.all(
                            const BorderSide(
                              color: Color(0xFFD4DEEB),
                              width: 1.6,
                            ),
                          ),
                        ),
                    child: const Text(
                      'Message',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _MetaLine extends StatelessWidget {
  const _MetaLine({required this.icon, required this.value});

  final IconData icon;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 16, color: const Color(0xFF8393AB)),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: Color(0xFF5C6D89),
              fontSize: 13.5,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    );
  }
}

class _StatsRow extends StatelessWidget {
  const _StatsRow({required this.profile});

  final Map<String, dynamic> profile;

  @override
  Widget build(BuildContext context) {
    final stats = profile['stats'] as Map<String, dynamic>?;
    final completedJobs =
        (stats?['completedJobs'] as num?)?.toInt() ??
        int.tryParse(stats?['completedJobs']?.toString() ?? '') ??
        0;
    final avgRating = (stats?['averageRating'] as num?)?.toDouble() ?? 0;
    final avgResponseMinutes =
        (stats?['avgResponseTimeMinutes'] as num?)?.toInt() ??
        int.tryParse(stats?['avgResponseTimeMinutes']?.toString() ?? '') ??
        0;

    String responseTime;
    if (avgResponseMinutes <= 0) {
      responseTime = 'N/A';
    } else if (avgResponseMinutes < 60) {
      responseTime = '< 1h';
    } else if (avgResponseMinutes < 180) {
      responseTime = '< 3h';
    } else {
      responseTime = '${(avgResponseMinutes / 60).round()}h';
    }

    return Row(
      children: [
        Expanded(
          child: _StatCard(value: '$completedJobs+', label: 'Completed Jobs'),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _StatCard(
            value: '${avgRating.toStringAsFixed(1)}/5',
            label: 'Avg Rating',
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _StatCard(value: responseTime, label: 'Response Time'),
        ),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({required this.value, required this.label});

  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE4EAF2)),
      ),
      child: Column(
        children: [
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: Color(0xFF19243C),
              fontSize: 16,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: Color(0xFF7A8CA8),
              fontSize: 11.5,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _AboutCard extends StatelessWidget {
  const _AboutCard({required this.profile});

  final Map<String, dynamic> profile;

  @override
  Widget build(BuildContext context) {
    final bio = profile['bio']?.toString().trim();
    final about = (bio != null && bio.isNotEmpty)
        ? bio
        : 'No provider bio available.';

    return Container(
      padding: const EdgeInsets.fromLTRB(14, 13, 14, 13),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE4EAF2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'About',
            style: TextStyle(
              color: Color(0xFF141C34),
              fontSize: 18,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            about,
            style: const TextStyle(
              color: Color(0xFF576A87),
              fontSize: 13.5,
              fontWeight: FontWeight.w500,
              height: 1.45,
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Text(
      title,
      style: const TextStyle(
        color: Color(0xFF141C34),
        fontSize: 19,
        fontWeight: FontWeight.w800,
      ),
    );
  }
}

class _MessageOptionTile extends StatelessWidget {
  const _MessageOptionTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFE3E8F2)),
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: const Color(0xFFEAF0FC),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: const Color(0xFF2F4DA0), size: 22),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      color: Color(0xFF1A2940),
                      fontSize: 14.5,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      color: Color(0xFF7385A0),
                      fontSize: 12.5,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(
              Icons.arrow_forward_ios_rounded,
              size: 15,
              color: Color(0xFF7E90AA),
            ),
          ],
        ),
      ),
    );
  }
}

class _JobChatTile extends StatelessWidget {
  const _JobChatTile({
    required this.title,
    required this.statusLabel,
    required this.onTap,
  });

  final String title;
  final String statusLabel;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFE3E8F2)),
        ),
        child: Row(
          children: [
            const Icon(
              Icons.work_outline_rounded,
              color: Color(0xFF6A7D99),
              size: 19,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: Color(0xFF1A2940),
                  fontSize: 13.8,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFFEAF0FC),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                statusLabel,
                style: const TextStyle(
                  color: Color(0xFF2F4DA0),
                  fontSize: 11.5,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ReviewCard extends StatelessWidget {
  const _ReviewCard({required this.review});

  final Map<String, dynamic> review;

  @override
  Widget build(BuildContext context) {
    final customer = review['customerId'] as Map<String, dynamic>?;
    final reviewerNameRaw = customer?['name']?.toString().trim() ?? '';
    final reviewerName = reviewerNameRaw.isNotEmpty
        ? reviewerNameRaw
        : 'Customer';
    final reviewerAvatar = customer?['profileImage']?.toString() ?? '';
    final ratingValue = (review['rating'] as num?)?.toDouble() ?? 0;
    final rating = ratingValue.toStringAsFixed(1);
    final commentRaw = review['comment']?.toString().trim() ?? '';
    final comment = commentRaw.isNotEmpty ? commentRaw : 'No comment provided.';
    final createdAt = DateTime.tryParse(review['createdAt']?.toString() ?? '');
    final age = _age(createdAt);

    return Container(
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE4EAF2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 21,
                backgroundColor: const Color(0xFFD9DFE8),
                backgroundImage: reviewerAvatar.isNotEmpty
                    ? NetworkImage(reviewerAvatar)
                    : null,
                child: reviewerAvatar.isEmpty
                    ? const Icon(
                        Icons.person_outline_rounded,
                        color: Color(0xFF8EA0B8),
                        size: 24,
                      )
                    : null,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  reviewerName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Color(0xFF141C34),
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              const Icon(
                Icons.star_rounded,
                color: Color(0xFFFACC15),
                size: 18,
              ),
              const SizedBox(width: 4),
              Text(
                rating,
                style: const TextStyle(
                  color: Color(0xFF141C34),
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            comment,
            style: const TextStyle(
              color: Color(0xFF4E5E78),
              fontSize: 13.5,
              fontWeight: FontWeight.w500,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            age,
            style: const TextStyle(
              color: Color(0xFF9AA8BD),
              fontSize: 12.5,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  String _age(DateTime? createdAt) {
    if (createdAt == null) return 'Recently';
    final diff = DateTime.now().difference(createdAt);
    if (diff.inDays >= 7) {
      final weeks = (diff.inDays / 7).floor();
      return weeks == 1 ? '1 week ago' : '$weeks weeks ago';
    }
    if (diff.inDays >= 1) return '${diff.inDays} days ago';
    if (diff.inHours >= 1) return '${diff.inHours} hours ago';
    return 'Today';
  }
}

class _EmptyReviewCard extends StatelessWidget {
  const _EmptyReviewCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE4EAF2)),
      ),
      child: const Text(
        'No reviews available yet.',
        textAlign: TextAlign.center,
        style: TextStyle(
          color: Color(0xFF6E7F98),
          fontSize: 14,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}
