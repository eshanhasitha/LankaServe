import 'dart:async';

import 'package:flutter/material.dart';

import '../../config/constants.dart';
import '../../config/routes.dart';
import '../../services/api_service.dart';
import '../../services/job_service.dart';
import '../../services/notification_service.dart';
import '../../services/provider_service.dart';
import '../../widgets/provider_bottom_nav.dart';
import '../../widgets/shimmer_skeleton.dart';
import '../../widgets/ui_scale.dart';

class ProviderDashboard extends StatefulWidget {
  const ProviderDashboard({super.key});

  @override
  State<ProviderDashboard> createState() => _ProviderDashboardState();
}

class _ProviderDashboardState extends State<ProviderDashboard> {
  final ProviderService _providerService = ProviderService();
  final JobService _jobService = JobService();
  final NotificationService _notificationService = NotificationService();
  final ApiService _apiService = ApiService();

  bool _loading = true;
  bool _hasUnreadNotifications = false;
  String? _error;
  Map<String, dynamic> _dashboard = <String, dynamic>{};
  Map<String, dynamic> _profile = <String, dynamic>{};
  Map<String, dynamic> _me = <String, dynamic>{};
  List<Map<String, dynamic>> _requests = <Map<String, dynamic>>[];
  String? _acceptingJobId;
  Timer? _notificationTimer;

  @override
  void initState() {
    super.initState();
    _loadDashboard();
    _loadUnreadNotifications();
    _notificationTimer = Timer.periodic(
      const Duration(seconds: 20),
      (_) => _loadUnreadNotifications(),
    );
  }

  @override
  void dispose() {
    _notificationTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadDashboard() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final results = await Future.wait<dynamic>([
        _providerService.getProviderDashboard(),
        _providerService.getProviderMe(),
        _providerService.getJobRequests(limit: 10),
        _apiService.get('/users/me'),
      ]);

      final dashboard =
          (results[0] as Map<String, dynamic>?) ?? <String, dynamic>{};
      final profile =
          (results[1] as Map<String, dynamic>?) ?? <String, dynamic>{};
      var requests = (results[2] as List<dynamic>)
          .whereType<Map<String, dynamic>>()
          .toList();
      final meRes =
          (results[3] as Map<String, dynamic>?) ?? <String, dynamic>{};
      final me =
          (meRes['data'] as Map<String, dynamic>?) ?? <String, dynamic>{};

      if (requests.isEmpty) {
        requests = await _providerService.getBrowseJobs(limit: 10);
      }

      if (!mounted) return;
      setState(() {
        _dashboard = dashboard;
        _profile = profile;
        _requests = requests;
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

  int _asInt(dynamic value) {
    if (value is int) return value;
    if (value is num) return value.round();
    return int.tryParse(value?.toString() ?? '0') ?? 0;
  }

  double _asDouble(dynamic value) {
    if (value is double) return value;
    if (value is num) return value.toDouble();
    return double.tryParse(value?.toString() ?? '0') ?? 0;
  }

  String _formatCurrency(num amount) {
    final rounded = amount.round().toString();
    final buffer = StringBuffer();
    for (int i = 0; i < rounded.length; i++) {
      final reverseIndex = rounded.length - i;
      buffer.write(rounded[i]);
      if (reverseIndex > 1 && reverseIndex % 3 == 1) {
        buffer.write(',');
      }
    }
    return buffer.toString();
  }

  String _formatCompact(num amount) {
    if (amount >= 1000000) {
      final value = (amount / 1000000);
      return value >= 10
          ? '${value.toStringAsFixed(0)}m'
          : '${value.toStringAsFixed(1)}m';
    }
    if (amount >= 1000) {
      final value = (amount / 1000);
      return value >= 10
          ? '${value.toStringAsFixed(0)}k'
          : '${value.toStringAsFixed(1)}k';
    }
    return amount.toStringAsFixed(0);
  }

  String _providerName() {
    final name = _me['name']?.toString().trim() ?? '';
    if (name.isNotEmpty) return name;
    final user = _profile['userId'];
    if (user is Map) {
      final pName = user['name']?.toString().trim() ?? '';
      if (pName.isNotEmpty) return pName;
    }
    return 'Provider';
  }

  String _providerAvatarUrl() {
    final avatar = _me['profileImage']?.toString() ?? '';
    if (avatar.isNotEmpty) return AppConstants.normalizeUrl(avatar);
    final user = _profile['userId'];
    if (user is Map) {
      final uAvatar = user['profileImage']?.toString() ?? '';
      if (uAvatar.isNotEmpty) return AppConstants.normalizeUrl(uAvatar);
    }
    return '';
  }

  String _providerInitial() {
    final name = _providerName().trim();
    if (name.isEmpty || name.toLowerCase() == 'provider') return 'P';
    return String.fromCharCode(name.runes.first).toUpperCase();
  }

  Future<void> _loadUnreadNotifications() async {
    try {
      final notifications = await _notificationService.fetchNotifications();
      final hasUnread = notifications.any((item) {
        final read = item['isRead'];
        if (read is bool) return !read;
        return read?.toString().toLowerCase() != 'true';
      });
      if (!mounted) return;
      setState(() => _hasUnreadNotifications = hasUnread);
    } catch (_) {
      // Notification polling must not interrupt dashboard usage.
    }
  }

  Future<void> _acceptJob(Map<String, dynamic> job) async {
    final jobId = job['_id']?.toString() ?? '';
    if (jobId.isEmpty) return;

    setState(() => _acceptingJobId = jobId);
    try {
      final accepted = await _jobService.acceptJob(jobId);
      if (!mounted) return;

      final acceptedId = accepted['_id']?.toString() ?? jobId;
      setState(() {
        _requests.removeWhere((item) => item['_id']?.toString() == acceptedId);
      });

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Job accepted. You can show your QR now.'),
        ),
      );

      Navigator.pushNamed(context, AppRoutes.qrDisplay, arguments: acceptedId);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Failed to accept job: $e')));
    } finally {
      if (mounted) {
        setState(() => _acceptingJobId = null);
      }
    }
  }

  void _openDetails(Map<String, dynamic> job) {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: const Color(0xFFF8F9FB),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(18, 16, 18, 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  job['title']?.toString() ?? 'Job',
                  style: const TextStyle(
                    color: Color(0xFF141C34),
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  job['description']?.toString() ?? 'No description.',
                  style: const TextStyle(
                    color: Color(0xFF66758E),
                    fontSize: 14,
                    height: 1.4,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  'Budget: LKR ${_formatCurrency(_asDouble(job['price']))}',
                  style: const TextStyle(
                    color: Color(0xFF141C34),
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final compactScale = UiScale.factor(context, min: 0.76, max: 0.90);
    final accepted = _asInt(_dashboard['pending']);
    final ongoing = _asInt(_dashboard['ongoing']);
    final completed = _asInt(_dashboard['completed']);
    final rating = _asDouble(_dashboard['rating']);
    final earnings = _asDouble(_dashboard['earnings']);
    final activeJobs = accepted + ongoing;
    final growth = _asDouble(_dashboard['earningsContributionPercent']);

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
                avatarUrl: _providerAvatarUrl(),
                avatarInitial: _providerInitial(),
                hasUnreadNotifications: _hasUnreadNotifications,
                onAvatarTap: () async {
                  await Navigator.pushNamed(context, AppRoutes.profile);
                  if (mounted) _loadDashboard();
                },
                onNotificationTap: () async {
                  await Navigator.pushNamed(
                    context,
                    AppRoutes.notifications,
                    arguments: const {'fromProvider': true},
                  );
                  if (mounted) _loadUnreadNotifications();
                },
              ),
              Expanded(
                child: RefreshIndicator(
                  onRefresh: _loadDashboard,
                  child: ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.fromLTRB(18, 12, 18, 16),
                    children: [
                      if (_loading)
                        const _DashboardSkeleton()
                      else if (_error != null)
                        _InfoTile(message: _error!)
                      else ...[
                        _HeroCard(
                          name: _providerName(),
                          activeJobs: activeJobs,
                          rating: rating,
                        ),
                        const SizedBox(height: 12),
                        _StatsRow(
                          acceptedJobs: accepted,
                          ongoing: ongoing,
                          earnings: _formatCompact(earnings),
                        ),
                        const SizedBox(height: 12),
                        _WeeklyCard(
                          completedJobs: completed,
                          growthLabel:
                              '${growth >= 0 ? '+' : ''}${growth.toStringAsFixed(1)}%',
                        ),
                        const SizedBox(height: 14),
                        _SectionTitle(
                          title: 'Suggested Job Requests',
                          action: 'See All',
                          onTap: () => Navigator.pushNamed(
                            context,
                            AppRoutes.jobRequests,
                          ),
                        ),
                        const SizedBox(height: 10),
                        if (_requests.isEmpty)
                          const _InfoTile(message: 'No job requests available.')
                        else
                          ..._requests
                              .take(3)
                              .map(
                                (job) => Padding(
                                  padding: const EdgeInsets.only(bottom: 10),
                                  child: _RequestCard(
                                    job: job,
                                    accepting:
                                        _acceptingJobId ==
                                        (job['_id']?.toString() ?? ''),
                                    onViewDetails: () => _openDetails(job),
                                    onAccept: () => _acceptJob(job),
                                  ),
                                ),
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
      bottomNavigationBar: const ProviderBottomNav(activeIndex: 0),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({
    required this.avatarUrl,
    required this.avatarInitial,
    required this.hasUnreadNotifications,
    required this.onAvatarTap,
    required this.onNotificationTap,
  });

  final String avatarUrl;
  final String avatarInitial;
  final bool hasUnreadNotifications;
  final VoidCallback onAvatarTap;
  final VoidCallback onNotificationTap;

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
          const Expanded(
            child: Text(
              'Dashboard',
              style: TextStyle(
                color: Color(0xFF121C33),
                fontSize: 19,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
          _CircleIconButton(
            icon: Icons.notifications_none_rounded,
            showDot: hasUnreadNotifications,
            onTap: onNotificationTap,
          ),
          const SizedBox(width: 8),
          GestureDetector(
            onTap: onAvatarTap,
            child: Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: const Color(0xFFEBE2D5), width: 2),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(22),
                child: avatarUrl.isNotEmpty
                    ? Image.network(
                        avatarUrl,
                        width: 38,
                        height: 38,
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) => Container(
                          width: 38,
                          height: 38,
                          color: const Color(0xFFE8EDF4),
                          alignment: Alignment.center,
                          child: Text(
                            avatarInitial,
                            style: const TextStyle(
                              color: Color(0xFF273D98),
                              fontSize: 19,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      )
                    : Container(
                        width: 38,
                        height: 38,
                        color: const Color(0xFFE8EDF4),
                        alignment: Alignment.center,
                        child: Text(
                          avatarInitial,
                          style: const TextStyle(
                            color: Color(0xFF273D98),
                            fontSize: 19,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _DashboardSkeleton extends StatelessWidget {
  const _DashboardSkeleton();

  @override
  Widget build(BuildContext context) {
    return ShimmerContainer(
      child: Column(
        children: [
          ShimmerBox(height: 172, borderRadius: BorderRadius.circular(36)),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(child: ShimmerBox(height: 132, borderRadius: BorderRadius.circular(22))),
              const SizedBox(width: 12),
              Expanded(child: ShimmerBox(height: 132, borderRadius: BorderRadius.circular(22))),
              const SizedBox(width: 12),
              Expanded(child: ShimmerBox(height: 132, borderRadius: BorderRadius.circular(22))),
            ],
          ),
          const SizedBox(height: 12),
          ShimmerBox(height: 198, borderRadius: BorderRadius.circular(24)),
          const SizedBox(height: 14),
          ShimmerBox(height: 28, borderRadius: BorderRadius.circular(12)),
          const SizedBox(height: 10),
          ...List.generate(
            3,
            (_) => Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: ShimmerBox(height: 118, borderRadius: BorderRadius.circular(18)),
            ),
          ),
          const SizedBox(height: 86),
        ],
      ),
    );
  }
}

class _HeroCard extends StatelessWidget {
  const _HeroCard({
    required this.name,
    required this.activeJobs,
    required this.rating,
  });

  final String name;
  final int activeJobs;
  final double rating;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(36),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF3B5CCC), Color(0xFF1E3A8A)],
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x33345DCC),
            blurRadius: 18,
            offset: Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Welcome back,',
            style: TextStyle(
              color: Color(0xFFD8E2FF),
              fontSize: 13,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            name,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 22,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: _HeroStat(
                  title: 'ACTIVE JOBS',
                  value: activeJobs.toString().padLeft(2, '0'),
                ),
              ),
              Container(width: 1, height: 56, color: const Color(0x40FFFFFF)),
              const SizedBox(width: 14),
              Expanded(
                child: _HeroStat(
                  title: 'RATING',
                  value: rating.toStringAsFixed(1),
                  star: true,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _HeroStat extends StatelessWidget {
  const _HeroStat({
    required this.title,
    required this.value,
    this.star = false,
  });

  final String title;
  final String value;
  final bool star;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            color: Color(0xFFAEC2F8),
            fontSize: 10.5,
            fontWeight: FontWeight.w700,
            letterSpacing: 1.0,
          ),
        ),
        const SizedBox(height: 5),
        Row(
          children: [
            if (star) ...[
              const Icon(
                Icons.star_rounded,
                color: Color(0xFFFACC15),
                size: 21,
              ),
              const SizedBox(width: 3),
            ],
            Text(
              value,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 20,
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _StatsRow extends StatelessWidget {
  const _StatsRow({
    required this.acceptedJobs,
    required this.ongoing,
    required this.earnings,
  });

  final int acceptedJobs;
  final int ongoing;
  final String earnings;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _SmallStat(
            icon: Icons.list_alt_rounded,
            value: acceptedJobs.toString(),
            label: 'Accepted Jobs',
            iconBg: const Color(0xFFE8EFFB),
            iconColor: const Color(0xFF3D5FD2),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _SmallStat(
            icon: Icons.pending_actions_rounded,
            value: ongoing.toString(),
            label: 'Ongoing',
            iconBg: const Color(0xFFF8EFE3),
            iconColor: const Color(0xFFF97316),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _SmallStat(
            icon: Icons.account_balance_wallet_outlined,
            value: earnings,
            label: 'Earnings',
            iconBg: const Color(0xFFE8F3EC),
            iconColor: const Color(0xFF16A34A),
          ),
        ),
      ],
    );
  }
}

class _SmallStat extends StatelessWidget {
  const _SmallStat({
    required this.icon,
    required this.value,
    required this.label,
    required this.iconBg,
    required this.iconColor,
  });

  final IconData icon;
  final String value;
  final String label;
  final Color iconBg;
  final Color iconColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 124,
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
              color: iconBg,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(icon, color: iconColor, size: 24),
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: const TextStyle(
              color: Color(0xFF141C34),
              fontSize: 16.5,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: const TextStyle(
              color: Color(0xFF8EA0B8),
              fontSize: 12.2,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _WeeklyCard extends StatelessWidget {
  const _WeeklyCard({required this.completedJobs, required this.growthLabel});

  final int completedJobs;
  final String growthLabel;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFE7EBF2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Text(
                'Weekly Performance',
                style: TextStyle(
                  color: Color(0xFF141C34),
                  fontSize: 17.5,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const Spacer(),
              DecoratedBox(
                decoration: const BoxDecoration(
                  color: Color(0xFFE3F5EA),
                  borderRadius: BorderRadius.all(Radius.circular(999)),
                ),
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  child: Text(
                    growthLabel,
                    style: const TextStyle(
                      color: Color(0xFF16A34A),
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Container(
            height: 110,
            decoration: BoxDecoration(
              color: const Color(0xFFF2F5FA),
              borderRadius: BorderRadius.circular(14),
            ),
            alignment: Alignment.bottomCenter,
            padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                const _Bar(h: 42),
                const SizedBox(width: 7),
                const _Bar(h: 56),
                const SizedBox(width: 7),
                const _Bar(h: 50),
                const SizedBox(width: 7),
                const _Bar(h: 68),
                const SizedBox(width: 7),
                const _Bar(h: 46),
                const SizedBox(width: 7),
                _Bar(h: completedJobs > 0 ? 84 : 40, active: true),
                const SizedBox(width: 7),
                const _Bar(h: 62),
              ],
            ),
          ),
          const SizedBox(height: 8),
          const Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Mon',
                style: TextStyle(
                  color: Color(0xFF9BA9BE),
                  fontSize: 12.5,
                  fontWeight: FontWeight.w500,
                ),
              ),
              Text(
                'Tue',
                style: TextStyle(
                  color: Color(0xFF9BA9BE),
                  fontSize: 12.5,
                  fontWeight: FontWeight.w500,
                ),
              ),
              Text(
                'Wed',
                style: TextStyle(
                  color: Color(0xFF9BA9BE),
                  fontSize: 12.5,
                  fontWeight: FontWeight.w500,
                ),
              ),
              Text(
                'Thu',
                style: TextStyle(
                  color: Color(0xFF9BA9BE),
                  fontSize: 12.5,
                  fontWeight: FontWeight.w500,
                ),
              ),
              Text(
                'Fri',
                style: TextStyle(
                  color: Color(0xFF9BA9BE),
                  fontSize: 12.5,
                  fontWeight: FontWeight.w500,
                ),
              ),
              Text(
                'Sat',
                style: TextStyle(
                  color: Color(0xFF334155),
                  fontSize: 12.5,
                  fontWeight: FontWeight.w700,
                ),
              ),
              Text(
                'Sun',
                style: TextStyle(
                  color: Color(0xFF9BA9BE),
                  fontSize: 12.5,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Bar extends StatelessWidget {
  const _Bar({required this.h, this.active = false});

  final double h;
  final bool active;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        height: h,
        decoration: BoxDecoration(
          color: active ? const Color(0xFF3D5FD2) : const Color(0xFFDDE4EF),
          borderRadius: BorderRadius.circular(9),
        ),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({
    required this.title,
    required this.action,
    required this.onTap,
  });

  final String title;
  final String action;
  final VoidCallback onTap;

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
        GestureDetector(
          onTap: onTap,
          child: Text(
            action,
            style: const TextStyle(
              color: Color(0xFF3D5FD2),
              fontSize: 13.5,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
      ],
    );
  }
}

class _RequestCard extends StatelessWidget {
  const _RequestCard({
    required this.job,
    required this.accepting,
    required this.onViewDetails,
    required this.onAccept,
  });

  final Map<String, dynamic> job;
  final bool accepting;
  final VoidCallback onViewDetails;
  final VoidCallback onAccept;

  String _formatCurrency(num amount) {
    final rounded = amount.round().toString();
    final buffer = StringBuffer();
    for (int i = 0; i < rounded.length; i++) {
      final reverseIndex = rounded.length - i;
      buffer.write(rounded[i]);
      if (reverseIndex > 1 && reverseIndex % 3 == 1) {
        buffer.write(',');
      }
    }
    return buffer.toString();
  }

  String _locationLabel() {
    final customer = job['customerId'];
    if (customer is Map<String, dynamic>) {
      final district = customer['district']?.toString().trim() ?? '';
      final city = customer['city']?.toString().trim() ?? '';
      String base;
      if (district.isNotEmpty && city.isNotEmpty) {
        base = '$district • $city';
      } else if (district.isNotEmpty) {
        base = district;
      } else if (city.isNotEmpty) {
        base = city;
      } else {
        base = 'Colombo 03';
      }
      final distanceRaw = job['distanceKm'];
      final distance = distanceRaw is num
          ? distanceRaw.toDouble()
          : double.tryParse(distanceRaw?.toString() ?? '');
      if (distance != null && distance > 0) {
        return '$base • ${distance.toStringAsFixed(1)} km away';
      }
      return '$base • 2.4 km away';
    }
    return 'Colombo 03 • 2.4 km away';
  }

  IconData _iconForCategory() {
    final category = (job['category']?.toString() ?? '').toLowerCase();
    if (category.contains('plumb')) return Icons.plumbing_rounded;
    if (category.contains('electric')) return Icons.electrical_services_rounded;
    if (category.contains('clean')) return Icons.cleaning_services_rounded;
    if (category.contains('ac')) return Icons.ac_unit_rounded;
    if (category.contains('paint')) return Icons.format_paint_rounded;
    return Icons.handyman_rounded;
  }

  Color _iconColorForCategory() => const Color(0xFF94A3B8);

  String _budgetTypeLabel() {
    final raw = job['budgetType']?.toString().trim().toLowerCase() ?? '';
    if (raw == 'hourly') return 'Hourly Rate';
    if (raw == 'starting') return 'Starting Price';
    if (raw == 'fixed') return 'Fixed Budget';

    final title = (job['title']?.toString() ?? '').toLowerCase();
    if (title.contains('clean')) return 'Hourly Rate';
    if (title.contains('repair')) return 'Starting Price';
    return 'Fixed Budget';
  }

  @override
  Widget build(BuildContext context) {
    final title = job['title']?.toString() ?? 'Service Request';
    final amount = (job['price'] is num)
        ? job['price'] as num
        : num.tryParse(job['price']?.toString() ?? '0') ?? 0;

    return Container(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE7EBF2)),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  color: const Color(0xFFE8EDF7),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(
                  _iconForCategory(),
                  color: _iconColorForCategory(),
                  size: 28,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        color: Color(0xFF141C34),
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      _locationLabel(),
                      style: const TextStyle(
                        color: Color(0xFF66758E),
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    'LKR ${_formatCurrency(amount)}',
                    style: const TextStyle(
                      color: Color(0xFF141C34),
                      fontSize: 15.5,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    _budgetTypeLabel(),
                    style: const TextStyle(
                      color: Color(0xFF94A3B8),
                      fontSize: 9.5,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: InkWell(
                  onTap: onViewDetails,
                  borderRadius: BorderRadius.circular(14),
                  child: Container(
                    height: 40,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      border: Border.all(color: const Color(0xFFD4DCE8)),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Text(
                      'View Details',
                      style: TextStyle(
                        color: Color(0xFF43556F),
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: InkWell(
                  onTap: accepting ? null : onAccept,
                  borderRadius: BorderRadius.circular(14),
                  child: Container(
                    height: 40,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: const Color(0xFF253E97),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: accepting
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor: AlwaysStoppedAnimation<Color>(
                                Colors.white,
                              ),
                            ),
                          )
                        : const Text(
                            'Accept Job',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 14,
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

class _CircleIconButton extends StatelessWidget {
  const _CircleIconButton({
    required this.icon,
    required this.onTap,
    this.showDot = false,
  });

  final IconData icon;
  final VoidCallback onTap;
  final bool showDot;

  @override
  Widget build(BuildContext context) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        GestureDetector(
          onTap: onTap,
          child: Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: const Color(0xFFF3F5F8),
              borderRadius: BorderRadius.circular(21),
              border: Border.all(color: const Color(0xFFE6EBF2)),
            ),
            child: Icon(icon, color: const Color(0xFF4B5B74), size: 22),
          ),
        ),
        if (showDot)
          Positioned(
            right: 9,
            top: 8,
            child: Container(
              width: 7,
              height: 7,
              decoration: BoxDecoration(
                color: const Color(0xFFEF4444),
                shape: BoxShape.circle,
                border: Border.all(color: const Color(0xFFF3F5F8), width: 1),
              ),
            ),
          ),
      ],
    );
  }
}
