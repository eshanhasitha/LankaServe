import 'package:flutter/material.dart';
import '../../config/constants.dart';
import '../../config/routes.dart';
import '../../config/ui_styles.dart';
import '../../services/api_service.dart';
import '../../services/auth_service.dart';
import '../../services/job_service.dart';
import '../../services/notification_service.dart';
import '../../services/provider_service.dart';
import '../../widgets/customer_bottom_nav.dart';
import '../../widgets/shimmer_skeleton.dart';
import '../../widgets/ui_scale.dart';

class CustomerDashboard extends StatefulWidget {
  const CustomerDashboard({super.key});

  @override
  State<CustomerDashboard> createState() => _CustomerDashboardState();
}

class _CustomerDashboardState extends State<CustomerDashboard> {
  static const List<String> _projectCategories = <String>[
    'Plumbing',
    'Electrical',
    'Carpentry',
    'Painting',
    'Cleaning',
    'Gardening',
    'AC Repair',
    'Appliance Repair',
    'Masonry',
    'Other',
  ];

  final ApiService _apiService = ApiService();
  final JobService _jobService = JobService();
  final ProviderService _providerService = ProviderService();
  final NotificationService _notificationService = NotificationService();

  bool _loading = true;
  String? _error;
  bool _hasUnauthorizedError = false;
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
    _hasUnauthorizedError = false;

    try {
      final jobsFuture = _fetchJobsSafe();
      final providersFuture = _fetchProvidersSafe();

      final me = await _fetchMeSafe();
      final notifications = await _fetchNotificationsSafe();

      if (_hasUnauthorizedError) {
        await _handleUnauthorized();
        return;
      }

      if (!mounted) return;
      setState(() {
        _me = me;
        _hasUnreadNotification = notifications.any(_isNotificationUnread);
        _loading = false;
      });

      final jobs = await jobsFuture;
      if (_hasUnauthorizedError) {
        await _handleUnauthorized();
        return;
      }
      if (mounted) {
        setState(() => _jobs = jobs);
      }

      final providers = await providersFuture;
      if (_hasUnauthorizedError) {
        await _handleUnauthorized();
        return;
      }
      if (mounted) {
        setState(() => _providers = providers);
      }
    } on ApiException catch (e) {
      if (e.statusCode == 401) {
        await _handleUnauthorized();
        return;
      }
      if (!mounted) return;
      setState(() => _error = e.toString());
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _handleUnauthorized() async {
    await AuthService().logout();
    if (!mounted) return;
    Navigator.pushNamedAndRemoveUntil(context, AppRoutes.login, (_) => false);
  }

  Future<Map<String, dynamic>> _fetchMeSafe() async {
    try {
      final res = await _apiService.get('/users/me');
      return (res['data'] as Map<String, dynamic>?) ?? <String, dynamic>{};
    } on ApiException catch (e) {
      if (e.statusCode == 401) {
        _hasUnauthorizedError = true;
        return <String, dynamic>{};
      }
      return <String, dynamic>{};
    } catch (_) {
      return <String, dynamic>{};
    }
  }

  Future<List<Map<String, dynamic>>> _fetchJobsSafe() async {
    try {
      return await _jobService.fetchJobs(limit: 100);
    } on ApiException catch (e) {
      if (e.statusCode == 401) {
        _hasUnauthorizedError = true;
        return <Map<String, dynamic>>[];
      }
      return <Map<String, dynamic>>[];
    } catch (_) {
      return <Map<String, dynamic>>[];
    }
  }

  Future<List<Map<String, dynamic>>> _fetchProvidersSafe() async {
    try {
      return await _providerService.searchProviders(limit: 8);
    } on ApiException catch (e) {
      if (e.statusCode == 401) {
        _hasUnauthorizedError = true;
        return <Map<String, dynamic>>[];
      }
      return <Map<String, dynamic>>[];
    } catch (_) {
      return <Map<String, dynamic>>[];
    }
  }

  Future<List<Map<String, dynamic>>> _fetchNotificationsSafe() async {
    try {
      return await _notificationService.fetchNotifications();
    } on ApiException catch (e) {
      if (e.statusCode == 401) {
        _hasUnauthorizedError = true;
        return <Map<String, dynamic>>[];
      }
      return <Map<String, dynamic>>[];
    } catch (_) {
      return <Map<String, dynamic>>[];
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

  String _displayName() {
    final name = _me['name']?.toString().trim() ?? '';
    return name.isEmpty ? 'Customer' : name;
  }

  String _avatarUrl() => AppConstants.normalizeUrl(_me['profileImage']?.toString());

  List<Map<String, dynamic>> _activeJobs() {
    const inactiveStatuses = <String>{
      'completed',
      'paid',
      'cancelled',
      'rejected',
    };

    final jobs = _jobs.where((job) {
      final status = (job['status']?.toString() ?? 'pending').toLowerCase();
      return !inactiveStatuses.contains(status);
    }).toList();

    jobs.sort((a, b) {
      final aDate = DateTime.tryParse(a['createdAt']?.toString() ?? '');
      final bDate = DateTime.tryParse(b['createdAt']?.toString() ?? '');
      if (aDate == null && bDate == null) return 0;
      if (aDate == null) return 1;
      if (bDate == null) return -1;
      return bDate.compareTo(aDate);
    });

    return jobs;
  }

  String _normalizeProjectCategory(String rawCategory) {
    final value = rawCategory.trim();
    final lower = value.toLowerCase();
    if (lower.isEmpty) return 'Other';

    if (lower == 'electrician') return 'Electrical';
    if (lower == 'plumber') return 'Plumbing';
    if (lower == 'carpenter') return 'Carpentry';
    if (lower == 'cleaner') return 'Cleaning';
    if (lower == 'ac tech' || lower == 'ac technician') return 'AC Repair';

    for (final category in _projectCategories) {
      if (category.toLowerCase() == lower) return category;
    }

    for (final category in _projectCategories) {
      if (lower.contains(category.toLowerCase())) return category;
    }

    return 'Other';
  }

  List<_ServiceCategoryTileData> _popularServiceTiles() {
    final counts = <String, int>{
      for (final category in _projectCategories) category: 0,
    };

    for (final job in _jobs) {
      final raw = job['category']?.toString() ?? '';
      final normalized = _normalizeProjectCategory(raw);
      counts.update(normalized, (value) => value + 1, ifAbsent: () => 1);
    }

    final ranked = counts.entries.toList()
      ..sort((a, b) {
        final countCompare = b.value.compareTo(a.value);
        if (countCompare != 0) return countCompare;
        return _projectCategories
            .indexOf(a.key)
            .compareTo(_projectCategories.indexOf(b.key));
      });

    return ranked
        .take(4)
        .map((entry) => _tileForCategory(entry.key, entry.value))
        .toList();
  }

  _ServiceCategoryTileData _tileForCategory(String category, int count) {
    final lower = category.toLowerCase();
    if (lower.contains('plumb')) {
      return _ServiceCategoryTileData(
        title: 'Plumbing',
        icon: Icons.plumbing_rounded,
        bg: Color(0xFFE6ECF6),
        iconColor: Color(0xFF3D5FD2),
        count: count,
      );
    }
    if (lower.contains('elect')) {
      return _ServiceCategoryTileData(
        title: 'Electrical',
        icon: Icons.electrical_services_rounded,
        bg: Color(0xFFFFEFE4),
        iconColor: Color(0xFFF97316),
        count: count,
      );
    }
    if (lower.contains('carpent') || lower.contains('mason')) {
      return _ServiceCategoryTileData(
        title: 'Carpentry',
        icon: Icons.handyman_rounded,
        bg: Color(0xFFE8F1EC),
        iconColor: Color(0xFF16A34A),
        count: count,
      );
    }
    if (lower.contains('paint')) {
      return _ServiceCategoryTileData(
        title: 'Painting',
        icon: Icons.format_paint_rounded,
        bg: Color(0xFFE9F5FF),
        iconColor: Color(0xFF0284C7),
        count: count,
      );
    }
    if (lower.contains('clean')) {
      return _ServiceCategoryTileData(
        title: 'Cleaning',
        icon: Icons.cleaning_services_rounded,
        bg: Color(0xFFE6ECF6),
        iconColor: Color(0xFF3D5FD2),
        count: count,
      );
    }
    if (lower.contains('garden')) {
      return _ServiceCategoryTileData(
        title: 'Gardening',
        icon: Icons.yard_rounded,
        bg: Color(0xFFE8F1EC),
        iconColor: Color(0xFF16A34A),
        count: count,
      );
    }
    if (lower.contains('ac')) {
      return _ServiceCategoryTileData(
        title: 'AC Repair',
        icon: Icons.ac_unit_rounded,
        bg: Color(0xFFE8F4FF),
        iconColor: Color(0xFF2563EB),
        count: count,
      );
    }
    if (lower.contains('appliance')) {
      return _ServiceCategoryTileData(
        title: 'Appliance Repair',
        icon: Icons.build_circle_rounded,
        bg: Color(0xFFF2EFFF),
        iconColor: Color(0xFF7C3AED),
        count: count,
      );
    }
    if (lower.contains('other')) {
      return _ServiceCategoryTileData(
        title: 'Other',
        icon: Icons.miscellaneous_services_rounded,
        bg: Color(0xFFF3EDE4),
        iconColor: Color(0xFFF97316),
        count: count,
      );
    }
    return _ServiceCategoryTileData(
      title: category,
      icon: Icons.miscellaneous_services_rounded,
      bg: const Color(0xFFF3EDE4),
      iconColor: const Color(0xFFF97316),
      count: count,
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

  @override
  Widget build(BuildContext context) {
    final compactScale = UiScale.factor(context, min: 0.76, max: 0.90);
    final activeJobs = _activeJobs();
    final popularServiceTiles = _popularServiceTiles();

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
                      const SliverToBoxAdapter(child: SizedBox(height: 12)),
                      if (_loading)
                        SliverToBoxAdapter(
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 18),
                            child: _CustomerDashboardSkeleton(),
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
                        const SliverToBoxAdapter(child: SizedBox(height: 12)),
                        const SliverToBoxAdapter(child: _StatRow()),
                        const SliverToBoxAdapter(child: SizedBox(height: 14)),
                        SliverToBoxAdapter(
                          child: _SectionTitle(
                            title: 'Active Jobs',
                            action: 'View All',
                            onTap: () => Navigator.pushNamed(
                              context,
                              AppRoutes.jobStatus,
                            ),
                          ),
                        ),
                        const SliverToBoxAdapter(child: SizedBox(height: 10)),
                        SliverToBoxAdapter(
                          child: _ActiveJobsCarousel(
                            jobs: activeJobs,
                            onViewDetails: (_) => Navigator.pushNamed(
                              context,
                              AppRoutes.jobStatus,
                            ),
                          ),
                        ),
                        const SliverToBoxAdapter(child: SizedBox(height: 14)),
                        const SliverToBoxAdapter(
                          child: _SectionTitle(title: 'Popular Services'),
                        ),
                        const SliverToBoxAdapter(child: SizedBox(height: 8)),
                        SliverPadding(
                          padding: const EdgeInsets.symmetric(horizontal: 18),
                          sliver: SliverGrid(
                            delegate: SliverChildBuilderDelegate((
                              context,
                              index,
                            ) {
                              final tile = popularServiceTiles[index];
                              return _ServiceTile(
                                title: tile.title,
                                icon: tile.icon,
                                bg: tile.bg,
                                iconColor: tile.iconColor,
                                count: tile.count,
                              );
                            }, childCount: popularServiceTiles.length),
                            gridDelegate:
                                const SliverGridDelegateWithFixedCrossAxisCount(
                                  crossAxisCount: 2,
                                  crossAxisSpacing: 10,
                                  mainAxisSpacing: 10,
                                  childAspectRatio: 1.62,
                                ),
                          ),
                        ),
                        const SliverToBoxAdapter(child: SizedBox(height: 14)),
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
                        const SliverToBoxAdapter(child: SizedBox(height: 88)),
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
      height: 68,
      padding: const EdgeInsets.fromLTRB(18, 12, 18, 10),
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
              fontSize: 18,
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
              width: 40,
              height: 40,
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
        padding: const EdgeInsets.fromLTRB(18, 16, 18, 14),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
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
                    fontSize: 13.5,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  name,
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 10),
                GestureDetector(
                  onTap: () => Navigator.pushNamed(context, AppRoutes.postJob),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 11,
                      vertical: 7,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
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
                            fontSize: 12.5,
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
  const _StatRow();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 18),
      child: Row(
        children: [
          Expanded(
            child: _StatCard(
              icon: Icons.history_rounded,
              iconBg: Color(0xFFE9EFFB),
              iconColor: Color(0xFF3B5CCC),
              label: 'My Jobs',
              onTap: () => Navigator.pushNamed(context, AppRoutes.jobStatus),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: _StatCard(
              icon: Icons.add_task_rounded,
              iconBg: Color(0xFFE8F3EC),
              iconColor: Color(0xFF22C55E),
              label: 'Post Service',
              onTap: () => Navigator.pushNamed(context, AppRoutes.postJob),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: _StatCard(
              icon: Icons.person_search_rounded,
              iconBg: Color(0xFFFFF0E5),
              iconColor: Color(0xFFEA580C),
              label: 'Find Providers',
              onTap: () => Navigator.pushNamed(context, AppRoutes.providerList),
            ),
          ),
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
    this.onTap,
  });

  final IconData icon;
  final Color iconBg;
  final Color iconColor;
  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final card = Container(
      height: 98,
      padding: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE7EBF2)),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(color: iconBg, shape: BoxShape.circle),
            child: Icon(icon, color: iconColor, size: 21),
          ),
          const SizedBox(height: 5),
          Text(
            label,
            style: const TextStyle(
              color: Color(0xFF66758E),
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
    if (onTap == null) return card;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
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
              fontSize: 18,
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
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _ActiveJobsCarousel extends StatefulWidget {
  const _ActiveJobsCarousel({required this.jobs, required this.onViewDetails});

  final List<Map<String, dynamic>> jobs;
  final ValueChanged<Map<String, dynamic>> onViewDetails;

  @override
  State<_ActiveJobsCarousel> createState() => _ActiveJobsCarouselState();
}

class _ActiveJobsCarouselState extends State<_ActiveJobsCarousel> {
  late final PageController _controller;
  int _activeIndex = 0;

  @override
  void initState() {
    super.initState();
    _controller = PageController(viewportFraction: 0.92);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  void didUpdateWidget(covariant _ActiveJobsCarousel oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (_activeIndex >= widget.jobs.length && widget.jobs.isNotEmpty) {
      setState(() => _activeIndex = widget.jobs.length - 1);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.jobs.isEmpty) {
      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 18),
        child: Container(
          height: 138,
          padding: const EdgeInsets.symmetric(horizontal: 20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: const Color(0xFFE7EBF2)),
          ),
          alignment: Alignment.centerLeft,
          child: const Text(
            'No active services right now.',
            style: TextStyle(
              color: Color(0xFF6E7F98),
              fontSize: 14,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
      );
    }

    return Column(
      children: [
        SizedBox(
          height: 186,
          child: PageView.builder(
            controller: _controller,
            itemCount: widget.jobs.length,
            onPageChanged: (index) => setState(() => _activeIndex = index),
            itemBuilder: (context, index) {
              final job = widget.jobs[index];
              return Padding(
                padding: const EdgeInsets.only(left: 18, right: 8),
                child: _ActiveJobCard(
                  job: job,
                  onViewDetails: () => widget.onViewDetails(job),
                ),
              );
            },
          ),
        ),
        if (widget.jobs.length > 1) ...[
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(widget.jobs.length, (index) {
              final isActive = index == _activeIndex;
              return AnimatedContainer(
                duration: const Duration(milliseconds: 220),
                margin: const EdgeInsets.symmetric(horizontal: 3),
                width: isActive ? 14 : 6,
                height: 5,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(5),
                  color: isActive
                      ? const Color(0xFF3D5FD2)
                      : const Color(0xFFCAD3E2),
                ),
              );
            }),
          ),
        ],
      ],
    );
  }
}

class _ActiveJobCard extends StatelessWidget {
  const _ActiveJobCard({required this.job, required this.onViewDetails});

  final Map<String, dynamic> job;
  final VoidCallback onViewDetails;

  String _title() {
    final value = job['title']?.toString().trim() ?? '';
    return value.isEmpty ? 'Untitled Job' : value;
  }

  String _category() {
    final value = job['category']?.toString().trim() ?? '';
    return value.isEmpty ? 'GENERAL' : value.toUpperCase();
  }

  (String, Color, Color) _statusInfo() {
    final status = (job['status']?.toString() ?? 'pending').toLowerCase();
    switch (status) {
      case 'accepted':
      case 'arrived':
      case 'ongoing':
      case 'in_progress':
        return (
          'In Progress',
          const Color(0xFF2F62D5),
          const Color(0xFFDCE8FF),
        );
      case 'pending':
        return (
          'Pending Approval',
          const Color(0xFFD97706),
          const Color(0xFFFDF3D8),
        );
      default:
        return (
          'Under Review',
          const Color(0xFF7C3AED),
          const Color(0xFFEDE9FE),
        );
    }
  }

  String _postedLabel() {
    final createdAt = DateTime.tryParse(job['createdAt']?.toString() ?? '');
    if (createdAt == null) return 'Posted recently';
    const months = <String>[
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return 'Posted ${months[createdAt.month - 1]} ${createdAt.day}';
  }

  String _providerHint() {
    final status = (job['status']?.toString() ?? 'pending').toLowerCase();
    final provider = job['providerId'];
    final isAssignedStatus =
        status == 'accepted' ||
        status == 'arrived' ||
        status == 'ongoing' ||
        status == 'in_progress';

    if (provider is String && provider.trim().isNotEmpty) {
      return isAssignedStatus ? 'Assigned Provider' : 'Awaiting Provider';
    }
    if (provider is! Map<String, dynamic>) {
      return isAssignedStatus ? 'Assigned Provider' : 'Awaiting Provider';
    }

    final direct = provider['name']?.toString().trim() ?? '';
    if (direct.isNotEmpty) return direct;

    final user = provider['userId'];
    if (user is Map<String, dynamic>) {
      final userName = user['name']?.toString().trim() ?? '';
      if (userName.isNotEmpty) return userName;
    }
    if (provider['_id']?.toString().trim().isNotEmpty == true ||
        provider['id']?.toString().trim().isNotEmpty == true) {
      return 'Assigned Provider';
    }
    return isAssignedStatus ? 'Assigned Provider' : 'Awaiting Provider';
  }

  @override
  Widget build(BuildContext context) {
    final statusInfo = _statusInfo();

    return Container(
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE7EBF2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 5,
                ),
                decoration: BoxDecoration(
                  color: const Color(0xFFEAF0FF),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  _category(),
                  style: const TextStyle(
                    color: Color(0xFF114BD2),
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.3,
                  ),
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 5,
                ),
                decoration: BoxDecoration(
                  color: statusInfo.$3,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Text(
                  statusInfo.$1,
                  style: TextStyle(
                    color: statusInfo.$2,
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            _title(),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: Color(0xFF111A33),
              fontSize: 15.5,
              fontWeight: FontWeight.w800,
            ),
          ),
          const Spacer(),
          Row(
            children: [
              const Icon(
                Icons.access_time_rounded,
                color: Color(0xFF5D7AA3),
                size: 15.5,
              ),
              const SizedBox(width: 8),
              Text(
                _postedLabel(),
                style: const TextStyle(
                  color: Color(0xFF4D678E),
                  fontSize: 12.5,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
          const SizedBox(height: 9),
          Container(height: 1, color: const Color(0xFFE8EDF5)),
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(
                Icons.person_outline_rounded,
                color: Color(0xFF9DAFC6),
                size: 16.5,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  _providerHint(),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Color(0xFF8A9AB2),
                    fontSize: 12.5,
                    fontStyle: FontStyle.italic,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              GestureDetector(
                onTap: onViewDetails,
                child: const Row(
                  children: [
                    Text(
                      'View Details',
                      style: TextStyle(
                        color: Color(0xFF1F46B8),
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    SizedBox(width: 4),
                    Icon(
                      Icons.arrow_forward_rounded,
                      color: Color(0xFF1F46B8),
                      size: 20,
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

class _RecommendedRow extends StatefulWidget {
  const _RecommendedRow({required this.providers, required this.onProviderTap});

  final List<Map<String, dynamic>> providers;
  final ValueChanged<Map<String, dynamic>> onProviderTap;

  @override
  State<_RecommendedRow> createState() => _RecommendedRowState();
}

class _RecommendedRowState extends State<_RecommendedRow> {
  late final PageController _controller;
  int _activeIndex = 0;

  @override
  void initState() {
    super.initState();
    _controller = PageController(viewportFraction: 0.92);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  void didUpdateWidget(covariant _RecommendedRow oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (_activeIndex >= widget.providers.length &&
        widget.providers.isNotEmpty) {
      setState(() => _activeIndex = widget.providers.length - 1);
    }
  }

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
    if (widget.providers.isEmpty) {
      return const Padding(
        padding: EdgeInsets.symmetric(horizontal: 18),
        child: _InfoTile(message: 'No recommended providers yet.'),
      );
    }

    final visibleProviders = widget.providers.take(5).toList();
    return Column(
      children: [
        SizedBox(
          height: 186,
          child: PageView.builder(
            controller: _controller,
            itemCount: visibleProviders.length,
            onPageChanged: (index) => setState(() => _activeIndex = index),
            itemBuilder: (context, index) {
              final provider = visibleProviders[index];
              final stats = provider['stats'] as Map<String, dynamic>?;
              final rating = _asDouble(stats?['averageRating']);
              final reviewCount =
                  stats?['totalReviews'] ?? stats?['completedJobs'] ?? 0;
              return Padding(
                padding: const EdgeInsets.only(left: 18, right: 8),
                child: _ProviderCard(
                  name: _name(provider),
                  category: _category(provider),
                  avatar: _avatar(provider),
                  rating: rating > 0 ? rating.toStringAsFixed(1) : '-',
                  reviewCount: '$reviewCount',
                  onTap: () => widget.onProviderTap(provider),
                ),
              );
            },
          ),
        ),
        if (visibleProviders.length > 1) ...[
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(visibleProviders.length, (index) {
              final isActive = index == _activeIndex;
              return AnimatedContainer(
                duration: const Duration(milliseconds: 220),
                margin: const EdgeInsets.symmetric(horizontal: 3),
                width: isActive ? 14 : 6,
                height: 5,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(5),
                  color: isActive
                      ? const Color(0xFF3D5FD2)
                      : const Color(0xFFCAD3E2),
                ),
              );
            }),
          ),
        ],
      ],
    );
  }
}

class _ProviderCard extends StatelessWidget {
  const _ProviderCard({
    required this.name,
    required this.category,
    required this.avatar,
    required this.rating,
    required this.reviewCount,
    required this.onTap,
  });

  final String name;
  final String category;
  final String avatar;
  final String rating;
  final String reviewCount;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: const Color(0xFFE7EBF2)),
            boxShadow: const [
              BoxShadow(
                color: Color(0x110F172A),
                blurRadius: 8,
                offset: Offset(0, 4),
              ),
            ],
          ),
          child: Column(
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
                                width: 56,
                                height: 56,
                                fit: BoxFit.cover,
                                errorBuilder: (context, error, stackTrace) =>
                                    _avatarFallback(56),
                              )
                            : _avatarFallback(56),
                      ),
                      Positioned(
                        right: -2,
                        bottom: -2,
                        child: Container(
                          width: 14,
                          height: 14,
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
                          style: const TextStyle(
                            color: Color(0xFF111A33),
                            fontSize: 14,
                            fontWeight: FontWeight.w800,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 3,
                          ),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF2F6FC),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            category,
                            style: const TextStyle(
                              color: Color(0xFF5F7391),
                              fontSize: 10.5,
                              fontWeight: FontWeight.w600,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 5,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFF5D8),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Row(
                      children: [
                        const Icon(
                          Icons.star_rounded,
                          color: Color(0xFFF59E0B),
                          size: 14,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          rating,
                          style: const TextStyle(
                            color: Color(0xFF7A5504),
                            fontSize: 11.5,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '$reviewCount reviews',
                    style: const TextStyle(
                      color: Color(0xFF7B8AA3),
                      fontSize: 11.5,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
              const Spacer(),
              Container(height: 1, color: const Color(0xFFEAEFF6)),
              const SizedBox(height: 8),
              const Row(
                children: [
                  Text(
                    'View Profile',
                    style: TextStyle(
                      color: Color(0xFF2F55C9),
                      fontSize: 12.5,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  Spacer(),
                  Icon(
                    Icons.arrow_forward_rounded,
                    size: 17,
                    color: Color(0xFF2F55C9),
                  ),
                ],
              ),
            ],
          ),
        ),
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

class _ServiceCategoryTileData {
  const _ServiceCategoryTileData({
    required this.title,
    required this.icon,
    required this.bg,
    required this.iconColor,
    required this.count,
  });

  final String title;
  final IconData icon;
  final Color bg;
  final Color iconColor;
  final int count;
}

class _ServiceTile extends StatelessWidget {
  const _ServiceTile({
    required this.title,
    required this.icon,
    required this.bg,
    required this.iconColor,
    required this.count,
  });

  final String title;
  final IconData icon;
  final Color bg;
  final Color iconColor;
  final int count;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: const BoxDecoration(
              color: Color(0xFFF8F9FB),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: iconColor, size: 21),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  maxLines: 2,
                  overflow: TextOverflow.fade,
                  style: const TextStyle(
                    color: Color(0xFF121E35),
                    fontSize: 13.5,
                    fontWeight: FontWeight.w800,
                    height: 1.15,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  '$count jobs',
                  style: const TextStyle(
                    color: Color(0xFF6A7C97),
                    fontSize: 11.5,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
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
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: const Color(0xFFF3F5F8),
              borderRadius: BorderRadius.circular(21),
              border: Border.all(color: const Color(0xFFE6EBF2)),
            ),
            child: Icon(icon, color: const Color(0xFF4B5B74), size: 20),
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
              style:
                  AppUiStyles.neutralOutlineButton(
                    height: 44,
                    radius: BorderRadius.circular(12),
                  ).copyWith(
                    foregroundColor: WidgetStateProperty.all(
                      const Color(0xFF273D98),
                    ),
                    side: WidgetStateProperty.all(
                      const BorderSide(color: Color(0xFFD1DAE8)),
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

class _CustomerDashboardSkeleton extends StatelessWidget {
  const _CustomerDashboardSkeleton();

  @override
  Widget build(BuildContext context) {
    return ShimmerContainer(
      child: Column(
        children: [
          ShimmerBox(height: 148, borderRadius: BorderRadius.circular(20)),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(child: ShimmerBox(height: 98, borderRadius: BorderRadius.circular(16))),
              const SizedBox(width: 10),
              Expanded(child: ShimmerBox(height: 98, borderRadius: BorderRadius.circular(16))),
              const SizedBox(width: 10),
              Expanded(child: ShimmerBox(height: 98, borderRadius: BorderRadius.circular(16))),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              ShimmerBox(height: 22, width: 100, borderRadius: BorderRadius.circular(8)),
              const Spacer(),
              ShimmerBox(height: 18, width: 60, borderRadius: BorderRadius.circular(8)),
            ],
          ),
          const SizedBox(height: 10),
          ShimmerBox(height: 140, borderRadius: BorderRadius.circular(18)),
          const SizedBox(height: 14),
          Align(
            alignment: Alignment.centerLeft,
            child: ShimmerBox(height: 22, width: 130, borderRadius: BorderRadius.circular(8)),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(child: ShimmerBox(height: 82, borderRadius: BorderRadius.circular(16))),
              const SizedBox(width: 10),
              Expanded(child: ShimmerBox(height: 82, borderRadius: BorderRadius.circular(16))),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(child: ShimmerBox(height: 82, borderRadius: BorderRadius.circular(16))),
              const SizedBox(width: 10),
              Expanded(child: ShimmerBox(height: 82, borderRadius: BorderRadius.circular(16))),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              ShimmerBox(height: 22, width: 150, borderRadius: BorderRadius.circular(8)),
              const Spacer(),
              ShimmerBox(height: 18, width: 60, borderRadius: BorderRadius.circular(8)),
            ],
          ),
          const SizedBox(height: 10),
          SizedBox(
            height: 120,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: 4,
              separatorBuilder: (context, index) => const SizedBox(width: 10),
              itemBuilder: (context, index) => ShimmerBox(
                height: 120,
                width: 140,
                borderRadius: BorderRadius.circular(16),
              ),
            ),
          ),
          const SizedBox(height: 88),
        ],
      ),
    );
  }
}
