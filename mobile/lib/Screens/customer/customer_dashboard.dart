import 'package:flutter/material.dart';
import '../../config/routes.dart';
import '../../services/api_service.dart';
import '../../services/job_service.dart';
import '../../services/notification_service.dart';
import '../../services/provider_service.dart';
import '../../widgets/customer_bottom_nav.dart';
import '../../widgets/ui_scale.dart';

class CustomerDashboard extends StatefulWidget {
  const CustomerDashboard({super.key});

  @override
  State<CustomerDashboard> createState() => _CustomerDashboardState();
}

class _CustomerDashboardState extends State<CustomerDashboard> {
  final ApiService _apiService = ApiService();
  final JobService _jobService = JobService();
  final ProviderService _providerService = ProviderService();
  final NotificationService _notificationService = NotificationService();

  bool _loading = true;
  String? _error;
  bool _hasUnreadNotification = false;
  Map<String, dynamic> _me = <String, dynamic>{};
  List<Map<String, dynamic>> _jobs = <Map<String, dynamic>>[];
  List<Map<String, dynamic>> _providers = <Map<String, dynamic>>[];

  @override
  void initState() {
    super.initState();
    _loadDashboard();
  }

  Future<void> _loadDashboard() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final results = await Future.wait<dynamic>([
        _fetchMeSafe(),
        _jobService.fetchJobs(limit: 100),
        _providerService.searchProviders(limit: 20),
        _notificationService.fetchNotifications(),
      ]);

      final me = (results[0] as Map<String, dynamic>?) ?? <String, dynamic>{};
      final jobs = (results[1] as List<dynamic>)
          .whereType<Map<String, dynamic>>()
          .toList();
      final providers = (results[2] as List<dynamic>)
          .whereType<Map<String, dynamic>>()
          .toList();
      final notifications = (results[3] as List<dynamic>)
          .whereType<Map<String, dynamic>>()
          .toList();

      if (!mounted) return;
      setState(() {
        _me = me;
        _jobs = jobs;
        _providers = providers;
        _hasUnreadNotification = notifications.any(_isNotificationUnread);
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

  Future<Map<String, dynamic>> _fetchMeSafe() async {
    try {
      final res = await _apiService.get('/users/me');
      return (res['data'] as Map<String, dynamic>?) ?? <String, dynamic>{};
    } catch (_) {
      return <String, dynamic>{};
    }
  }

  bool _isNotificationUnread(Map<String, dynamic> item) {
    final isRead = item['isRead'];
    if (isRead is bool) return !isRead;
    final read = item['read'];
    if (read is bool) return !read;
    final status = item['status']?.toString().toLowerCase();
    return status == 'unread' || status == 'new';
  }

  double _asDouble(dynamic value) {
    if (value is double) return value;
    if (value is num) return value.toDouble();
    return double.tryParse(value?.toString() ?? '0') ?? 0;
  }

  String _displayName() {
    final name = _me['name']?.toString().trim() ?? '';
    return name.isEmpty ? 'Customer' : name;
  }

  String _avatarUrl() => _me['profileImage']?.toString() ?? '';

  double _customerRating() {
    final direct = _asDouble(_me['averageRating']);
    if (direct > 0) return direct;

    final stats = _me['stats'];
    if (stats is Map<String, dynamic>) {
      final value = _asDouble(stats['averageRating']);
      if (value > 0) return value;
    }

    final completed = _jobs.where((j) {
      final status = (j['status']?.toString() ?? '').toLowerCase();
      return status == 'completed' || status == 'paid';
    }).length;
    return completed > 0 ? 4.9 : 0;
  }

  Map<String, dynamic>? _ongoingJob() {
    const statuses = <String>{'accepted', 'arrived', 'ongoing', 'in_progress'};
    for (final job in _jobs) {
      final status = (job['status']?.toString() ?? '').toLowerCase();
      if (statuses.contains(status)) return job;
    }
    return null;
  }

  String _statusPillLabel(String status) {
    switch (status) {
      case 'accepted':
      case 'arrived':
      case 'ongoing':
      case 'in_progress':
        return 'ONGOING';
      case 'completed':
      case 'paid':
        return 'COMPLETED';
      case 'cancelled':
        return 'CANCELLED';
      default:
        return 'REVIEWING';
    }
  }

  String _serviceId(Map<String, dynamic> job) {
    final explicit = job['serviceId']?.toString().trim() ?? '';
    if (explicit.isNotEmpty) return explicit;
    final id = job['_id']?.toString() ?? '';
    if (id.isEmpty) return '#LS-0000';
    final suffix = id.length > 4 ? id.substring(id.length - 4) : id;
    return '#LS-${suffix.toUpperCase()}';
  }

  String _providerNameFromJob(Map<String, dynamic> job) {
    final provider = job['providerId'];
    if (provider is! Map<String, dynamic>) return 'Provider pending';

    final direct = provider['name']?.toString().trim() ?? '';
    if (direct.isNotEmpty) return direct;

    final user = provider['userId'];
    if (user is Map<String, dynamic>) {
      final userName = user['name']?.toString().trim() ?? '';
      if (userName.isNotEmpty) return userName;
    }
    return 'Service Provider';
  }

  String _providerAvatarFromJob(Map<String, dynamic> job) {
    final provider = job['providerId'];
    if (provider is! Map<String, dynamic>) return '';

    final direct = provider['profileImage']?.toString() ?? '';
    if (direct.isNotEmpty) return direct;

    final user = provider['userId'];
    if (user is Map<String, dynamic>) {
      return user['profileImage']?.toString() ?? '';
    }
    return '';
  }

  String _providerRoleFromJob(Map<String, dynamic> job) {
    final category = job['category']?.toString().trim() ?? '';
    if (category.isEmpty) return 'Service Provider';
    return 'Professional ${_titleCase(category)}';
  }

  String _titleCase(String text) {
    return text
        .split(RegExp(r'\s+'))
        .where((w) => w.isNotEmpty)
        .map((w) => '${w[0].toUpperCase()}${w.substring(1).toLowerCase()}')
        .join(' ');
  }

  String _providerIdFromJob(Map<String, dynamic> job) {
    final provider = job['providerId'];
    if (provider is! Map<String, dynamic>) return '';

    final user = provider['userId'];
    if (user is Map<String, dynamic>) {
      final userId = user['_id']?.toString() ?? '';
      if (userId.isNotEmpty) return userId;
    }
    return provider['_id']?.toString() ?? '';
  }

  Future<void> _openOngoingChat(Map<String, dynamic> job) async {
    final counterpartId = _providerIdFromJob(job);
    if (counterpartId.isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Provider details are not available yet.'),
        ),
      );
      return;
    }

    Navigator.pushNamed(
      context,
      AppRoutes.chatConversation,
      arguments: <String, dynamic>{
        'counterpartId': counterpartId,
        'counterpartName': _providerNameFromJob(job),
        'counterpartAvatar': _providerAvatarFromJob(job),
        'threadId': job['threadId']?.toString(),
        'jobId': job['_id']?.toString(),
      },
    );
  }

  void _openProviderProfile(Map<String, dynamic> provider) {
    final user = provider['userId'];
    final providerUserId = user is Map<String, dynamic>
        ? user['_id']?.toString() ?? ''
        : '';
    if (providerUserId.isEmpty) return;

    Navigator.pushNamed(
      context,
      AppRoutes.providerProfile,
      arguments: providerUserId,
    );
  }

  IconData _categoryIcon(String category) {
    final c = category.toLowerCase();
    if (c.contains('plumb')) return Icons.plumbing_rounded;
    if (c.contains('electric')) return Icons.electrical_services_rounded;
    if (c.contains('clean')) return Icons.cleaning_services_rounded;
    if (c.contains('ac')) return Icons.ac_unit_rounded;
    if (c.contains('paint')) return Icons.format_paint_rounded;
    if (c.contains('move')) return Icons.local_shipping_rounded;
    return Icons.handyman_rounded;
  }

  Color _categoryIconColor(String category) {
    final c = category.toLowerCase();
    if (c.contains('electric')) return const Color(0xFFF97316);
    if (c.contains('plumb')) return const Color(0xFF0EA5E9);
    if (c.contains('clean')) return const Color(0xFF22C55E);
    return const Color(0xFF3C5ECC);
  }

  @override
  Widget build(BuildContext context) {
    final compactScale = UiScale.factor(context, min: 0.76, max: 0.90);
    final ongoingJob = _ongoingJob();
    final rating = _customerRating();

    return Scaffold(
      backgroundColor: const Color(0xFFF3F4F7),
      body: SafeArea(
        child: MediaQuery(
          data: MediaQuery.of(
            context,
          ).copyWith(textScaler: TextScaler.linear(compactScale)),
          child: Column(
            children: [
              _TopBar(
                avatarUrl: _avatarUrl(),
                hasUnreadNotification: _hasUnreadNotification,
              ),
              Expanded(
                child: RefreshIndicator(
                  onRefresh: _loadDashboard,
                  child: CustomScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    slivers: [
                      const SliverToBoxAdapter(child: SizedBox(height: 10)),
                      if (_loading)
                        const SliverFillRemaining(
                          hasScrollBody: false,
                          child: Center(
                            child: CircularProgressIndicator(
                              color: Color(0xFF273D98),
                            ),
                          ),
                        )
                      else if (_error != null)
                        SliverToBoxAdapter(
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 18),
                            child: _InfoTile(
                              message: _error!,
                              actionLabel: 'Retry',
                              onAction: _loadDashboard,
                            ),
                          ),
                        )
                      else ...[
                        SliverToBoxAdapter(
                          child: _WelcomeCard(name: _displayName()),
                        ),
                        const SliverToBoxAdapter(child: SizedBox(height: 10)),
                        SliverToBoxAdapter(
                          child: _StatRow(
                            jobCount: _jobs.length,
                            ratingLabel: rating > 0
                                ? rating.toStringAsFixed(1)
                                : '-',
                          ),
                        ),
                        const SliverToBoxAdapter(child: SizedBox(height: 10)),
                        SliverToBoxAdapter(
                          child: _SectionTitle(
                            title: 'Ongoing Service',
                            action: 'View All',
                            onTap: () => Navigator.pushNamed(
                              context,
                              AppRoutes.jobStatus,
                            ),
                          ),
                        ),
                        const SliverToBoxAdapter(child: SizedBox(height: 10)),
                        SliverToBoxAdapter(
                          child: _OngoingCard(
                            job: ongoingJob,
                            statusLabel: ongoingJob == null
                                ? ''
                                : _statusPillLabel(
                                    (ongoingJob['status']?.toString() ?? '')
                                        .toLowerCase(),
                                  ),
                            title:
                                ongoingJob?['title']?.toString() ??
                                'No ongoing service right now',
                            serviceId: ongoingJob == null
                                ? ''
                                : _serviceId(ongoingJob),
                            eta: 'ETA: 15 mins',
                            providerName: ongoingJob == null
                                ? ''
                                : _providerNameFromJob(ongoingJob),
                            providerRole: ongoingJob == null
                                ? ''
                                : _providerRoleFromJob(ongoingJob),
                            providerAvatar: ongoingJob == null
                                ? ''
                                : _providerAvatarFromJob(ongoingJob),
                            icon: _categoryIcon(
                              ongoingJob?['category']?.toString() ?? '',
                            ),
                            iconColor: _categoryIconColor(
                              ongoingJob?['category']?.toString() ?? '',
                            ),
                            onTrack: ongoingJob == null
                                ? null
                                : () => Navigator.pushNamed(
                                    context,
                                    AppRoutes.review,
                                    arguments: ongoingJob['_id']?.toString(),
                                  ),
                            onChat: ongoingJob == null
                                ? null
                                : () => _openOngoingChat(ongoingJob),
                          ),
                        ),
                        const SliverToBoxAdapter(child: SizedBox(height: 10)),
                        SliverToBoxAdapter(
                          child: _SearchBox(
                            onTap: () => Navigator.pushNamed(
                              context,
                              AppRoutes.providerList,
                            ),
                          ),
                        ),
                        const SliverToBoxAdapter(child: SizedBox(height: 10)),
                        SliverToBoxAdapter(
                          child: _SectionTitle(
                            title: 'Recommended Nearby',
                            action: 'See Map',
                            onTap: () =>
                                Navigator.pushNamed(context, AppRoutes.heatmap),
                          ),
                        ),
                        const SliverToBoxAdapter(child: SizedBox(height: 10)),
                        SliverToBoxAdapter(
                          child: _RecommendedRow(
                            providers: _providers,
                            onProviderTap: _openProviderProfile,
                          ),
                        ),
                        const SliverToBoxAdapter(child: SizedBox(height: 10)),
                        SliverToBoxAdapter(
                          child: _MapPanel(
                            activeProviders: _providers.length,
                            onShowList: () => Navigator.pushNamed(
                              context,
                              AppRoutes.providerList,
                            ),
                          ),
                        ),
                        const SliverToBoxAdapter(child: SizedBox(height: 12)),
                        const SliverToBoxAdapter(
                          child: _SectionTitle(title: 'Popular Services'),
                        ),
                        const SliverToBoxAdapter(child: SizedBox(height: 12)),
                        const SliverPadding(
                          padding: EdgeInsets.symmetric(horizontal: 24),
                          sliver: SliverGrid(
                            delegate: SliverChildListDelegate.fixed([
                              _ServiceTile(
                                title: 'Cleaning',
                                icon: Icons.cleaning_services_rounded,
                                bg: Color(0xFFE6ECF6),
                                iconColor: Color(0xFF3D5FD2),
                              ),
                              _ServiceTile(
                                title: 'Renovation',
                                icon: Icons.handyman_rounded,
                                bg: Color(0xFFE8F1EC),
                                iconColor: Color(0xFF16A34A),
                              ),
                              _ServiceTile(
                                title: 'Pest Control',
                                icon: Icons.bug_report_rounded,
                                bg: Color(0xFFF0EAF6),
                                iconColor: Color(0xFFA855F7),
                              ),
                              _ServiceTile(
                                title: 'Moving',
                                icon: Icons.trending_up_rounded,
                                bg: Color(0xFFF3EDE4),
                                iconColor: Color(0xFFF97316),
                              ),
                            ]),
                            gridDelegate:
                                SliverGridDelegateWithFixedCrossAxisCount(
                                  crossAxisCount: 2,
                                  crossAxisSpacing: 14,
                                  mainAxisSpacing: 14,
                                  childAspectRatio: 1.06,
                                ),
                          ),
                        ),
                        const SliverToBoxAdapter(child: SizedBox(height: 92)),
                      ],
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
      bottomNavigationBar: const CustomerBottomNav(activeIndex: 0),
    );
  }
}

class _TopBar extends StatelessWidget {
  const _TopBar({required this.avatarUrl, required this.hasUnreadNotification});

  final String avatarUrl;
  final bool hasUnreadNotification;

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
          const Text(
            'Dashboard',
            style: TextStyle(
              color: Color(0xFF121C33),
              fontSize: 19,
              fontWeight: FontWeight.w800,
            ),
          ),
          const Spacer(),
          _CircleIconButton(
            icon: Icons.notifications_none_rounded,
            dot: hasUnreadNotification,
            onTap: () => Navigator.pushNamed(
              context,
              AppRoutes.notifications,
              arguments: const {'fromProvider': false},
            ),
          ),
          const SizedBox(width: 8),
          GestureDetector(
            onTap: () => Navigator.pushNamed(context, AppRoutes.profile),
            child: Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: const Color(0xFFEBE2D5), width: 2),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(24),
                child: avatarUrl.isNotEmpty
                    ? Image.network(
                        avatarUrl,
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) =>
                            const ColoredBox(
                              color: Color(0xFFF1F4F8),
                              child: Icon(
                                Icons.person_outline_rounded,
                                color: Color(0xFF8EA0B8),
                                size: 22,
                              ),
                            ),
                      )
                    : const ColoredBox(
                        color: Color(0xFFF1F4F8),
                        child: Icon(
                          Icons.person_outline_rounded,
                          color: Color(0xFF8EA0B8),
                          size: 22,
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

class _WelcomeCard extends StatelessWidget {
  const _WelcomeCard({required this.name});

  final String name;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 18),
      child: Container(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(24),
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF4365D8), Color(0xFF2E4CAD)],
          ),
          boxShadow: const [
            BoxShadow(
              color: Color(0x33345DCC),
              blurRadius: 26,
              offset: Offset(0, 12),
            ),
          ],
        ),
        child: Stack(
          children: [
            Positioned(
              top: -18,
              right: -10,
              child: Container(
                width: 96,
                height: 96,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [Color(0x4F7894F8), Color(0x006D8BF5)],
                  ),
                ),
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Welcome back,',
                  style: TextStyle(
                    color: Color(0xFFD8E2FF),
                    fontSize: 20 / 1.45,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  name,
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 23,
                    fontWeight: FontWeight.w800,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 12),
                GestureDetector(
                  onTap: () => Navigator.pushNamed(context, AppRoutes.postJob),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.add_circle_rounded,
                          color: Color(0xFF3C5ECC),
                          size: 20,
                        ),
                        SizedBox(width: 8),
                        Text(
                          'Post a Service',
                          style: TextStyle(
                            color: Color(0xFF3C5ECC),
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _StatRow extends StatelessWidget {
  const _StatRow({required this.jobCount, required this.ratingLabel});

  final int jobCount;
  final String ratingLabel;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 18),
      child: Row(
        children: [
          Expanded(
            child: _StatCard(
              icon: Icons.work_outline_rounded,
              iconBg: Color(0xFFE9EFFB),
              iconColor: Color(0xFF3B5CCC),
              label: 'My Jobs',
              value: '$jobCount',
              onTap: () => Navigator.pushNamed(context, AppRoutes.jobStatus),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: _StatCard(
              icon: Icons.star_border_rounded,
              iconBg: Color(0xFFE8F3EC),
              iconColor: Color(0xFF22C55E),
              label: 'Rating',
              value: ratingLabel,
            ),
          ),
          const SizedBox(width: 10),
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.icon,
    required this.iconBg,
    required this.iconColor,
    required this.label,
    required this.value,
    this.onTap,
  });

  final IconData icon;
  final Color iconBg;
  final Color iconColor;
  final String label;
  final String value;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final card = Container(
      height: 118,
      padding: const EdgeInsets.symmetric(vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE7EBF2)),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(color: iconBg, shape: BoxShape.circle),
            child: Icon(icon, color: iconColor, size: 24),
          ),
          const SizedBox(height: 6),
          Text(
            label,
            style: const TextStyle(
              color: Color(0xFF66758E),
              fontSize: 12.5,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(
              color: Color(0xFF121C33),
              fontSize: 16,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
    if (onTap == null) return card;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        child: card,
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.title, this.action = '', this.onTap});

  final String title;
  final String action;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 18),
      child: Row(
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
      ),
    );
  }
}

class _OngoingCard extends StatelessWidget {
  const _OngoingCard({
    required this.job,
    required this.statusLabel,
    required this.title,
    required this.serviceId,
    required this.eta,
    required this.providerName,
    required this.providerRole,
    required this.providerAvatar,
    required this.icon,
    required this.iconColor,
    this.onTrack,
    this.onChat,
  });

  final Map<String, dynamic>? job;
  final String statusLabel;
  final String title;
  final String serviceId;
  final String eta;
  final String providerName;
  final String providerRole;
  final String providerAvatar;
  final IconData icon;
  final Color iconColor;
  final VoidCallback? onTrack;
  final VoidCallback? onChat;

  @override
  Widget build(BuildContext context) {
    final hasData = job != null;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 18),
      child: Container(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: const Color(0xFFE7EBF2)),
        ),
        child: hasData
            ? Column(
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 50,
                        height: 50,
                        decoration: BoxDecoration(
                          color: const Color(0xFFF6E5D1),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Icon(icon, color: iconColor, size: 26),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              title,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: Color(0xFF131E35),
                                fontSize: 16.5,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            const SizedBox(height: 3),
                            Text(
                              'Service ID: $serviceId',
                              style: const TextStyle(
                                color: Color(0xFF66758E),
                                fontSize: 12.5,
                                fontWeight: FontWeight.w500,
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
                          color: const Color(0xFFDCE8FF),
                          borderRadius: BorderRadius.circular(18),
                        ),
                        child: Text(
                          statusLabel,
                          style: const TextStyle(
                            color: Color(0xFF2F62D5),
                            fontSize: 10.5,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF4F6F9),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 38,
                          height: 38,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(22),
                            color: const Color(0xFFEDEFF4),
                          ),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(22),
                            child: providerAvatar.isNotEmpty
                                ? Image.network(
                                    providerAvatar,
                                    fit: BoxFit.cover,
                                    errorBuilder:
                                        (context, error, stackTrace) =>
                                            const Icon(
                                              Icons.person_outline_rounded,
                                              color: Color(0xFF8EA0B8),
                                            ),
                                  )
                                : const Icon(
                                    Icons.person_outline_rounded,
                                    color: Color(0xFF8EA0B8),
                                  ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                providerName,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  color: Color(0xFF1A243C),
                                  fontSize: 14.5,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                providerRole,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  color: Color(0xFF66758E),
                                  fontSize: 12,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ),
                        GestureDetector(
                          onTap: onChat,
                          child: Container(
                            width: 34,
                            height: 34,
                            decoration: BoxDecoration(
                              color: const Color(0xFF3C5ECC),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(
                              Icons.call_rounded,
                              color: Colors.white,
                              size: 18,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      const Icon(
                        Icons.schedule_rounded,
                        color: Color(0xFF7B8BA3),
                        size: 18,
                      ),
                      const SizedBox(width: 5),
                      Text(
                        eta,
                        style: const TextStyle(
                          color: Color(0xFF66758E),
                          fontSize: 12.5,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const Spacer(),
                      GestureDetector(
                        onTap: onTrack,
                        child: const Row(
                          children: [
                            Text(
                              'Track Provider',
                              style: TextStyle(
                                color: Color(0xFF3E5FD0),
                                fontSize: 14.5,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            SizedBox(width: 2),
                            Icon(
                              Icons.chevron_right_rounded,
                              color: Color(0xFF3E5FD0),
                              size: 20,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              )
            : const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Text(
                  'No ongoing services right now.',
                  style: TextStyle(
                    color: Color(0xFF6E7F98),
                    fontSize: 14.5,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
      ),
    );
  }
}

class _SearchBox extends StatelessWidget {
  const _SearchBox({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 18),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Container(
          height: 54,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            color: const Color(0xFFF8F9FB),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: const Color(0xFFE5EAF1)),
          ),
          child: const Row(
            children: [
              Icon(Icons.search_rounded, color: Color(0xFF94A2B8), size: 24),
              SizedBox(width: 8),
              Text(
                'Search for plumbers, painters...',
                style: TextStyle(
                  color: Color(0xFF6C7A92),
                  fontSize: 13.5,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RecommendedRow extends StatelessWidget {
  const _RecommendedRow({required this.providers, required this.onProviderTap});

  final List<Map<String, dynamic>> providers;
  final ValueChanged<Map<String, dynamic>> onProviderTap;

  double _asDouble(dynamic value) {
    if (value is double) return value;
    if (value is num) return value.toDouble();
    return double.tryParse(value?.toString() ?? '0') ?? 0;
  }

  String _name(Map<String, dynamic> provider) {
    final user = provider['userId'];
    if (user is Map<String, dynamic>) {
      final name = user['name']?.toString().trim() ?? '';
      if (name.isNotEmpty) return name;
    }
    return 'Service Provider';
  }

  String _avatar(Map<String, dynamic> provider) {
    final user = provider['userId'];
    if (user is Map<String, dynamic>) {
      return user['profileImage']?.toString() ?? '';
    }
    return '';
  }

  String _category(Map<String, dynamic> provider) {
    final categories = provider['categories'];
    if (categories is List && categories.isNotEmpty) {
      final first = categories.first.toString().trim();
      if (first.isNotEmpty) return '$first Expert';
    }
    return 'Service Expert';
  }

  @override
  Widget build(BuildContext context) {
    if (providers.isEmpty) {
      return const Padding(
        padding: EdgeInsets.symmetric(horizontal: 18),
        child: _InfoTile(message: 'No recommended providers yet.'),
      );
    }

    return SizedBox(
      height: 176,
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: 18),
        scrollDirection: Axis.horizontal,
        itemBuilder: (context, index) {
          final provider = providers[index];
          final stats = provider['stats'] as Map<String, dynamic>?;
          final rating = _asDouble(stats?['averageRating']);
          final reviewCount =
              stats?['totalReviews'] ?? stats?['completedJobs'] ?? 0;
          return _ProviderCard(
            main: index == 0,
            name: _name(provider),
            category: _category(provider),
            avatar: _avatar(provider),
            rating: rating > 0 ? rating.toStringAsFixed(1) : '-',
            reviewCount: '$reviewCount',
            onTap: () => onProviderTap(provider),
          );
        },
        separatorBuilder: (context, index) => const SizedBox(width: 10),
        itemCount: providers.length.clamp(1, 5),
      ),
    );
  }
}

class _ProviderCard extends StatelessWidget {
  const _ProviderCard({
    required this.main,
    required this.name,
    required this.category,
    required this.avatar,
    required this.rating,
    required this.reviewCount,
    required this.onTap,
  });

  final bool main;
  final String name;
  final String category;
  final String avatar;
  final String rating;
  final String reviewCount;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: main ? 304 : 174,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE7EBF2)),
      ),
      child: main
          ? Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Stack(
                      clipBehavior: Clip.none,
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(16),
                          child: avatar.isNotEmpty
                              ? Image.network(
                                  avatar,
                                  width: 62,
                                  height: 62,
                                  fit: BoxFit.cover,
                                  errorBuilder: (context, error, stackTrace) =>
                                      _avatarFallback(62),
                                )
                              : _avatarFallback(62),
                        ),
                        Positioned(
                          right: -3,
                          bottom: -3,
                          child: Container(
                            width: 18,
                            height: 18,
                            decoration: BoxDecoration(
                              color: const Color(0xFF22C55E),
                              border: Border.all(color: Colors.white, width: 2),
                              shape: BoxShape.circle,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            name,
                            style: TextStyle(
                              color: Color(0xFF131E35),
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          SizedBox(height: 2),
                          Text(
                            category,
                            style: TextStyle(
                              color: Color(0xFF66758E),
                              fontSize: 12.5,
                              fontWeight: FontWeight.w500,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          SizedBox(height: 4),
                          Row(
                            children: [
                              Icon(
                                Icons.star_rounded,
                                color: Color(0xFFFACC15),
                                size: 18,
                              ),
                              SizedBox(width: 2),
                              Text(
                                rating,
                                style: TextStyle(
                                  color: Color(0xFF27364F),
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              SizedBox(width: 4),
                              Text(
                                '($reviewCount)',
                                style: TextStyle(
                                  color: Color(0xFF90A0B7),
                                  fontSize: 12,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const Spacer(),
                GestureDetector(
                  onTap: onTap,
                  child: Container(
                    width: 110,
                    height: 44,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: const Color(0xFFE7EBF2),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Text(
                      'Hire Now',
                      style: TextStyle(
                        color: Color(0xFF36465E),
                        fontSize: 13.5,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ),
              ],
            )
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Stack(
                  clipBehavior: Clip.none,
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: avatar.isNotEmpty
                          ? Image.network(
                              avatar,
                              width: 60,
                              height: 60,
                              fit: BoxFit.cover,
                              errorBuilder: (context, error, stackTrace) =>
                                  _avatarFallback(60),
                            )
                          : _avatarFallback(60),
                    ),
                    Positioned(
                      right: -3,
                      bottom: -3,
                      child: Container(
                        width: 18,
                        height: 18,
                        decoration: BoxDecoration(
                          color: const Color(0xFF22C55E),
                          border: Border.all(color: Colors.white, width: 2),
                          shape: BoxShape.circle,
                        ),
                      ),
                    ),
                  ],
                ),
                const Spacer(),
                GestureDetector(
                  onTap: onTap,
                  child: Container(
                    width: 100,
                    height: 44,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: const Color(0xFFE7EBF2),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Text(
                      'Hire Now',
                      style: TextStyle(
                        color: Color(0xFF36465E),
                        fontSize: 13.5,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ),
              ],
            ),
    );
  }

  Widget _avatarFallback(double size) {
    return Container(
      width: size,
      height: size,
      color: const Color(0xFFE8EDF5),
      child: const Icon(Icons.person_outline_rounded, color: Color(0xFF8EA0B8)),
    );
  }
}

class _MapPanel extends StatelessWidget {
  const _MapPanel({required this.activeProviders, required this.onShowList});

  final int activeProviders;
  final VoidCallback onShowList;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 18),
      child: Container(
        height: 196,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(28),
          boxShadow: const [
            BoxShadow(
              color: Color(0x2A000000),
              blurRadius: 14,
              offset: Offset(0, 10),
            ),
          ],
        ),
        child: Stack(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(28),
              child: Image.network(
                'https://lh3.googleusercontent.com/aida-public/AB6AXuBtonxW5-KgXe6kWkTGc0FeTCxwXVgXyDwLxrs9I2_V-UWUytP1MniG-_lGdhmKstttWRdbuRy9l6kaMoF_NIssn8uDYNCQrzPVIJRTnxMDP0AD6y_anAYKEbCweshlpEe_PLXL7-Uieg-9Ljb4W7VH7uth1pMZLigWpQp0ckr9hRAEYuFyxSbn-KoZBgmHfoF5wJfuLvbeM58hS8-QSAvbALzjv49YEqeAWxMGEDSA2DPwHH5Szkl8CYeGxTwas1mBGHrsm1DclsRz',
                fit: BoxFit.cover,
                width: double.infinity,
                height: double.infinity,
              ),
            ),
            Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(28),
                gradient: const LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Color(0x08FFFFFF), Color(0x55000000)],
                ),
              ),
            ),
            const Positioned(top: 32, left: 82, child: _Marker(label: 'PR')),
            const Positioned(top: 66, right: 74, child: _Marker(label: 'PR')),
            const Positioned(
              bottom: 78,
              left: 152,
              child: _Marker(label: 'PR'),
            ),
            Positioned(
              left: 14,
              right: 14,
              bottom: 12,
              child: Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xF5FFFFFF),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 38,
                      height: 38,
                      decoration: BoxDecoration(
                        color: const Color(0xFFE9EFFB),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: const Icon(
                        Icons.explore_rounded,
                        color: Color(0xFF3C5ECC),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '$activeProviders Providers Active',
                            style: TextStyle(
                              color: Color(0xFF131E35),
                              fontSize: 14.5,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          SizedBox(height: 2),
                          Text(
                            'Within 5km of your location',
                            style: TextStyle(
                              color: Color(0xFF66758E),
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                    GestureDetector(
                      onTap: onShowList,
                      child: const Text(
                        'Show List',
                        style: TextStyle(
                          color: Color(0xFF3E5FD0),
                          fontSize: 12.5,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Marker extends StatelessWidget {
  const _Marker({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 40,
      height: 40,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: const Color(0xFF3F5ED0),
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white, width: 3),
      ),
      child: Text(
        label,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 12.5,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}

class _ServiceTile extends StatelessWidget {
  const _ServiceTile({
    required this.title,
    required this.icon,
    required this.bg,
    required this.iconColor,
  });

  final String title;
  final IconData icon;
  final Color bg;
  final Color iconColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(22),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 58,
            height: 58,
            decoration: const BoxDecoration(
              color: Color(0xFFF8F9FB),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: iconColor, size: 28),
          ),
          const SizedBox(height: 10),
          Text(
            title,
            style: const TextStyle(
              color: Color(0xFF121E35),
              fontSize: 15.5,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

class _CircleIconButton extends StatelessWidget {
  const _CircleIconButton({
    required this.icon,
    required this.onTap,
    this.dot = false,
  });

  final IconData icon;
  final VoidCallback onTap;
  final bool dot;

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
        if (dot)
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

class _InfoTile extends StatelessWidget {
  const _InfoTile({required this.message, this.actionLabel, this.onAction});

  final String message;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE7EBF2)),
      ),
      child: Column(
        children: [
          Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: Color(0xFF6E7F98),
              fontSize: 14.5,
              fontWeight: FontWeight.w500,
            ),
          ),
          if (actionLabel != null && onAction != null) ...[
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: onAction,
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFF273D98),
                side: const BorderSide(color: Color(0xFFD1DAE8)),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: Text(actionLabel!),
            ),
          ],
        ],
      ),
    );
  }
}
