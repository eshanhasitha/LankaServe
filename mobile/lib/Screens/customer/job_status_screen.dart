import 'package:flutter/material.dart';

import '../../config/routes.dart';
import '../../config/ui_styles.dart';
import '../../services/job_service.dart';
import '../../services/review_service.dart';
import '../../widgets/customer_bottom_nav.dart';
import '../../widgets/ui_scale.dart';

class JobStatusScreen extends StatefulWidget {
  const JobStatusScreen({super.key});

  @override
  State<JobStatusScreen> createState() => _JobStatusScreenState();
}

class _JobStatusScreenState extends State<JobStatusScreen> {
  static const List<String> _tabs = <String>[
    'All',
    'Pending',
    'Accepted',
    'Ongoing',
    'Completed',
    'Cancelled',
  ];

  final JobService _jobService = JobService();
  final ReviewService _reviewService = ReviewService();

  String _activeTab = 'Ongoing';
  bool _loading = true;
  String? _error;
  String _cancellingJobId = '';
  String _ratingJobId = '';
  final Set<String> _ratedJobIds = <String>{};
  List<Map<String, dynamic>> _jobs = <Map<String, dynamic>>[];

  @override
  void initState() {
    super.initState();
    _loadJobs();
  }

  Future<void> _loadJobs() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final items = await _jobService.fetchJobs(limit: 150);
      if (!mounted) return;
      setState(() => _jobs = items);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _cancelJob(_JobItem item) async {
    if (item.id.isEmpty || _cancellingJobId.isNotEmpty) return;

    final shouldCancel = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cancel Job'),
        content: const Text(
          'Are you sure you want to cancel this job request?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('No'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style:
                AppUiStyles.primaryButton(
                  height: 44,
                  radius: AppUiStyles.radiusMd,
                ).copyWith(
                  backgroundColor: WidgetStateProperty.all(
                    const Color(0xFFD92D20),
                  ),
                  foregroundColor: WidgetStateProperty.all(Colors.white),
                ),
            child: const Text('Yes, Cancel'),
          ),
        ],
      ),
    );

    if (shouldCancel != true) return;

    setState(() {
      _cancellingJobId = item.id;
      _error = null;
    });

    try {
      await _jobService.cancelJob(item.id);
      if (!mounted) return;
      setState(() {
        _jobs = _jobs.map((job) {
          if (job['_id']?.toString() != item.id) return job;
          return <String, dynamic>{...job, 'status': 'cancelled'};
        }).toList();
      });
      _show('Job cancelled.');
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    } finally {
      if (mounted) {
        setState(() => _cancellingJobId = '');
      }
    }
  }

  Future<void> _openRatingSheet(_JobItem item) async {
    if (item.id.isEmpty || _ratingJobId.isNotEmpty) return;
    int rating = 0;
    final controller = TextEditingController();

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            return Padding(
              padding: EdgeInsets.fromLTRB(
                18,
                12,
                18,
                MediaQuery.of(context).viewInsets.bottom + 16,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: const Color(0xFFD5DEEA),
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'Rate Provider',
                    style: TextStyle(
                      color: Color(0xFF141C34),
                      fontSize: 19,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    item.providerName,
                    style: const TextStyle(
                      color: Color(0xFF6B7C95),
                      fontSize: 13.5,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: List.generate(5, (index) {
                      final value = index + 1;
                      final filled = value <= rating;
                      return IconButton(
                        onPressed: () => setSheetState(() => rating = value),
                        icon: Icon(
                          filled
                              ? Icons.star_rounded
                              : Icons.star_border_rounded,
                          color: filled
                              ? const Color(0xFFF59E0B)
                              : const Color(0xFFBFC9DA),
                          size: 30,
                        ),
                      );
                    }),
                  ),
                  TextField(
                    controller: controller,
                    maxLines: 3,
                    decoration: InputDecoration(
                      hintText: 'Write a short review (optional)',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () => Navigator.pop(context),
                          style: AppUiStyles.neutralOutlineButton(),
                          child: const Text('Cancel'),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: rating == 0 || _ratingJobId.isNotEmpty
                              ? null
                              : () async {
                                  Navigator.pop(context);
                                  await _submitRating(
                                    jobId: item.id,
                                    rating: rating,
                                    comment: controller.text.trim(),
                                  );
                                },
                          style: AppUiStyles.primaryButton(),
                          child: const Text(
                            'Submit',
                            style: TextStyle(fontWeight: FontWeight.w700),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Future<void> _submitRating({
    required String jobId,
    required int rating,
    required String comment,
  }) async {
    setState(() => _ratingJobId = jobId);
    try {
      await _reviewService.createReview(
        jobId: jobId,
        rating: rating,
        comment: comment,
      );
      if (!mounted) return;
      setState(() => _ratedJobIds.add(jobId));
      _show('Review submitted.');
    } catch (e) {
      if (!mounted) return;
      _show('Failed to submit review: $e');
    } finally {
      if (mounted) {
        setState(() => _ratingJobId = '');
      }
    }
  }

  void _show(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  String _normalizeStatus(String raw) {
    final status = raw.toLowerCase();
    if (status == 'in_progress' || status == 'started' || status == 'arrived') {
      return 'Ongoing';
    }
    if (status == 'paid') return 'Completed';
    if (status == 'rejected') return 'Cancelled';
    if (status.isEmpty) return 'Pending';
    return '${status[0].toUpperCase()}${status.substring(1)}';
  }

  String _statusRaw(Map<String, dynamic> job) {
    return (job['status']?.toString() ?? 'pending').toLowerCase();
  }

  String _providerDisplayName(Map<String, dynamic> job, String rawStatus) {
    final provider = job['providerId'];
    if (provider is Map<String, dynamic>) {
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
    }
    if (provider is String && provider.trim().isNotEmpty) {
      return 'Assigned Provider';
    }
    final normalized = _normalizeStatus(rawStatus);
    if (normalized == 'Pending') return 'Awaiting Provider';
    return 'Assigned Provider';
  }

  String _statusLabel(String normalized) {
    if (normalized == 'Ongoing') return 'IN PROGRESS';
    if (normalized == 'Completed') return 'COMPLETED';
    if (normalized == 'Cancelled') return 'CANCELLED';
    if (normalized == 'Accepted') return 'ACCEPTED';
    return 'PENDING';
  }

  Color _statusColor(String normalized) {
    if (normalized == 'Ongoing') return const Color(0xFF2F62D5);
    if (normalized == 'Completed') return const Color(0xFF16A34A);
    if (normalized == 'Cancelled') return const Color(0xFFDC2626);
    if (normalized == 'Accepted') return const Color(0xFF2563EB);
    return const Color(0xFFB45309);
  }

  Color _statusBg(String normalized) {
    if (normalized == 'Ongoing') return const Color(0xFFDCE8FF);
    if (normalized == 'Completed') return const Color(0xFFDDF3E4);
    if (normalized == 'Cancelled') return const Color(0xFFFEE2E2);
    if (normalized == 'Accepted') return const Color(0xFFDBEAFE);
    return const Color(0xFFFBE9D8);
  }

  String _money(dynamic value) {
    final amount = (value is num)
        ? value
        : num.tryParse(value?.toString() ?? '0') ?? 0;
    final whole = amount.round();
    final text = whole.toString();
    final buffer = StringBuffer();
    for (int i = 0; i < text.length; i++) {
      final reverseIndex = text.length - i;
      buffer.write(text[i]);
      if (reverseIndex > 1 && reverseIndex % 3 == 1) {
        buffer.write(',');
      }
    }
    return buffer.toString();
  }

  String _postedLabel(DateTime? createdAt) {
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

  String _durationText(String normalized, Map<String, dynamic> job) {
    if (normalized == 'Completed') {
      final completedAt = DateTime.tryParse(
        job['completedAt']?.toString() ?? '',
      );
      if (completedAt != null) {
        return 'Finished ${_postedLabel(completedAt).replaceFirst('Posted ', '')}';
      }
      return 'Finished';
    }
    if (normalized == 'Accepted') return 'Provider assigned';
    if (normalized == 'Ongoing') return 'Work in progress';
    if (normalized == 'Cancelled') return 'Request cancelled';
    return 'Awaiting provider';
  }

  String _locationLabel(Map<String, dynamic> job) {
    final location = job['location'];
    final coordinates = location is Map<String, dynamic>
        ? location['coordinates']
        : null;
    if (coordinates is List && coordinates.length >= 2) {
      final lng = (coordinates[0] as num?)?.toDouble();
      final lat = (coordinates[1] as num?)?.toDouble();
      if (lat != null && lng != null) {
        return '${lat.toStringAsFixed(4)}, ${lng.toStringAsFixed(4)}';
      }
    }
    return 'Location unavailable';
  }

  _JobItem _toItem(Map<String, dynamic> job) {
    final rawStatus = _statusRaw(job);
    final normalized = _normalizeStatus(rawStatus);
    final createdAt = DateTime.tryParse(job['createdAt']?.toString() ?? '');
    final providerName = _providerDisplayName(job, rawStatus);

    return _JobItem(
      id: job['_id']?.toString() ?? '',
      title: job['title']?.toString().trim().isNotEmpty == true
          ? job['title'].toString().trim()
          : 'Untitled Job',
      amount: 'LKR ${_money(job['price'])}',
      posted: _postedLabel(createdAt),
      statusNormalized: normalized,
      statusText: _statusLabel(normalized),
      statusColor: _statusColor(normalized),
      statusBg: _statusBg(normalized),
      providerName: providerName,
      durationText: _durationText(normalized, job),
      locationText: _locationLabel(job),
      canCancel: normalized != 'Completed' && normalized != 'Cancelled',
      canRate:
          normalized == 'Completed' &&
          !_ratedJobIds.contains(job['_id']?.toString() ?? ''),
    );
  }

  @override
  Widget build(BuildContext context) {
    final compactScale = UiScale.factor(context, min: 0.76, max: 0.90);
    final items = _jobs.map(_toItem).toList(growable: false);
    final filtered = _activeTab == 'All'
        ? items
        : items.where((job) => job.statusNormalized == _activeTab).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF3F4F7),
      body: SafeArea(
        child: MediaQuery(
          data: MediaQuery.of(
            context,
          ).copyWith(textScaler: TextScaler.linear(compactScale)),
          child: Column(
            children: [
              const _TopBar(),
              Expanded(
                child: RefreshIndicator(
                  onRefresh: _loadJobs,
                  child: ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.fromLTRB(18, 12, 18, 96),
                    children: [
                      _Tabs(
                        tabs: _tabs,
                        active: _activeTab,
                        onChanged: (value) =>
                            setState(() => _activeTab = value),
                      ),
                      const SizedBox(height: 12),
                      if (_error != null)
                        _EmptyState(label: _error!)
                      else if (_loading)
                        const _JobsSkeleton()
                      else if (filtered.isEmpty)
                        _EmptyState(
                          label: 'No jobs found in $_activeTab tab.',
                          actionLabel: 'Post a Service',
                          onAction: () =>
                              Navigator.pushNamed(context, AppRoutes.postJob),
                        )
                      else ...[
                        ...filtered.map(
                          (item) => Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: _JobCard(
                              item: item,
                              cancelling: _cancellingJobId == item.id,
                              onViewDetails: () => Navigator.pushNamed(
                                context,
                                AppRoutes.review,
                                arguments: item.id,
                              ),
                              onCancel: item.canCancel
                                  ? () => _cancelJob(item)
                                  : null,
                              onRate: item.canRate
                                  ? () => _openRatingSheet(item)
                                  : null,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
      bottomNavigationBar: const CustomerBottomNav(activeIndex: 3),
    );
  }
}

class _TopBar extends StatelessWidget {
  const _TopBar();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 64,
      padding: const EdgeInsets.fromLTRB(18, 10, 18, 10),
      decoration: const BoxDecoration(
        color: Color(0xFFF8F9FB),
        border: Border(bottom: BorderSide(color: Color(0xFFE1E6EE))),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          const Expanded(
            child: Text(
              'My Jobs',
              style: TextStyle(
                color: Color(0xFF121C33),
                fontSize: 18,
                fontWeight: FontWeight.w800,
                letterSpacing: -0.2,
                height: 1.0,
              ),
            ),
          ),
          InkWell(
            borderRadius: BorderRadius.circular(14),
            onTap: () => Navigator.pushNamed(context, AppRoutes.postJob),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: const Color(0xFF273D98),
                borderRadius: BorderRadius.circular(14),
              ),
              child: const Row(
                children: [
                  Icon(Icons.add_rounded, color: Colors.white, size: 17),
                  SizedBox(width: 4),
                  Text(
                    'Post a Service',
                    style: TextStyle(
                      color: Colors.white,
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
    );
  }
}

class _Tabs extends StatelessWidget {
  const _Tabs({
    required this.tabs,
    required this.active,
    required this.onChanged,
  });

  final List<String> tabs;
  final String active;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 48,
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: Color(0xFFE1E8F3))),
      ),
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: tabs.length,
        separatorBuilder: (context, index) => const SizedBox(width: 20),
        itemBuilder: (context, index) {
          final tab = tabs[index];
          final selected = tab == active;
          return InkWell(
            onTap: () => onChanged(tab),
            child: Container(
              alignment: Alignment.center,
              decoration: BoxDecoration(
                border: Border(
                  bottom: BorderSide(
                    color: selected
                        ? const Color(0xFF2F4DA0)
                        : Colors.transparent,
                    width: 2,
                  ),
                ),
              ),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 2),
                child: Text(
                  tab,
                  style: TextStyle(
                    color: selected
                        ? const Color(0xFF2F4DA0)
                        : const Color(0xFF64748B),
                    fontSize: 13.5,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

class _JobCard extends StatelessWidget {
  const _JobCard({
    required this.item,
    required this.onViewDetails,
    required this.onCancel,
    required this.onRate,
    required this.cancelling,
  });

  final _JobItem item;
  final VoidCallback onViewDetails;
  final VoidCallback? onCancel;
  final VoidCallback? onRate;
  final bool cancelling;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE3E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  item.title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Color(0xFF141C34),
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    height: 1.2,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 5,
                ),
                decoration: BoxDecoration(
                  color: item.statusBg,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Text(
                  item.statusText,
                  style: TextStyle(
                    color: item.statusColor,
                    fontSize: 9.5,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.6,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 7),
          RichText(
            text: TextSpan(
              style: const TextStyle(
                color: Color(0xFF6E7F98),
                fontSize: 11.5,
                fontWeight: FontWeight.w500,
              ),
              children: [
                TextSpan(
                  text: item.amount,
                  style: const TextStyle(
                    color: Color(0xFF141C34),
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const TextSpan(text: '  -  '),
                TextSpan(text: item.posted),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
            decoration: BoxDecoration(
              color: const Color(0xFFF3F6FA),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    CircleAvatar(
                      radius: 16,
                      backgroundColor: const Color(0xFFE7EDF5),
                      child: Icon(
                        item.providerName == 'Awaiting Provider'
                            ? Icons.person_search_rounded
                            : Icons.person_rounded,
                        color: const Color(0xFF8EA0B8),
                        size: 21,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Service Provider',
                            style: TextStyle(
                              color: Color(0xFF6A7A93),
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          Text(
                            item.providerName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              color: item.providerName == 'Awaiting Provider'
                                  ? const Color(0xFF8EA0B8)
                                  : const Color(0xFF141C34),
                              fontSize: 14,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 9),
                Row(
                  children: [
                    const Icon(
                      Icons.location_on_rounded,
                      color: Color(0xFF7F93AF),
                      size: 16,
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        item.locationText,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Color(0xFF6C7C95),
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    const Icon(
                      Icons.schedule_rounded,
                      color: Color(0xFF7F93AF),
                      size: 15,
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        item.durationText,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Color(0xFF6C7C95),
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: InkWell(
                  borderRadius: BorderRadius.circular(16),
                  onTap: onViewDetails,
                  child: Container(
                    height: 40,
                    decoration: BoxDecoration(
                      color: const Color(0xFF273D98),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    alignment: Alignment.center,
                    child: const Text(
                      'View Details',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
              ),
              if (item.canCancel) ...[
                const SizedBox(width: 10),
                Expanded(
                  child: OutlinedButton(
                    onPressed: cancelling ? null : onCancel,
                    style: AppUiStyles.dangerOutlineButton(
                      height: 40,
                      radius: BorderRadius.circular(16),
                    ),
                    child: Text(
                      cancelling ? 'Cancelling...' : 'Cancel Job',
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                  ),
                ),
              ],
            ],
          ),
          if (item.canRate) ...[
            const SizedBox(height: 8),
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton(
                onPressed: onRate,
                style: TextButton.styleFrom(
                  foregroundColor: const Color(0xFF2F4DA0),
                  padding: EdgeInsets.zero,
                  minimumSize: const Size(0, 0),
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                child: const Text(
                  'Rate Provider',
                  style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12.5),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _JobsSkeleton extends StatelessWidget {
  const _JobsSkeleton();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: List.generate(
        3,
        (index) => const Padding(
          padding: EdgeInsets.only(bottom: 12),
          child: _SkeletonJobCard(),
        ),
      ),
    );
  }
}

class _SkeletonJobCard extends StatelessWidget {
  const _SkeletonJobCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFE7EBF2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: const [
          _SkeletonLine(width: 180, height: 24),
          SizedBox(height: 10),
          _SkeletonLine(width: 120, height: 16),
          SizedBox(height: 18),
          _SkeletonLine(width: double.infinity, height: 58),
          SizedBox(height: 14),
          _SkeletonLine(width: double.infinity, height: 48),
        ],
      ),
    );
  }
}

class _SkeletonLine extends StatelessWidget {
  const _SkeletonLine({required this.width, required this.height});

  final double width;
  final double height;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: const Color(0xFFE8EDF4),
        borderRadius: BorderRadius.circular(14),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({
    this.label = 'No jobs found in this tab.',
    this.actionLabel,
    this.onAction,
  });

  final String label;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 34, horizontal: 8),
      alignment: Alignment.center,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            label,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: Color(0xFF6E7F98),
              fontSize: 14.5,
              fontWeight: FontWeight.w500,
            ),
          ),
          if (actionLabel != null && onAction != null) ...[
            const SizedBox(height: 10),
            TextButton(
              onPressed: onAction,
              style: TextButton.styleFrom(
                foregroundColor: const Color(0xFF2F4DA0),
                textStyle: const TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 13,
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

class _JobItem {
  const _JobItem({
    required this.id,
    required this.title,
    required this.amount,
    required this.posted,
    required this.statusNormalized,
    required this.statusText,
    required this.statusColor,
    required this.statusBg,
    required this.providerName,
    required this.durationText,
    required this.locationText,
    required this.canCancel,
    required this.canRate,
  });

  final String id;
  final String title;
  final String amount;
  final String posted;
  final String statusNormalized;
  final String statusText;
  final Color statusColor;
  final Color statusBg;
  final String providerName;
  final String durationText;
  final String locationText;
  final bool canCancel;
  final bool canRate;
}
