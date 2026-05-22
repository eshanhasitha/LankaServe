import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../config/routes.dart';
import '../../services/job_service.dart';
import '../../services/provider_service.dart';
import '../../widgets/provider_bottom_nav.dart';
import '../../widgets/ui_scale.dart';

class QrDisplayScreen extends StatefulWidget {
  const QrDisplayScreen({super.key});

  @override
  State<QrDisplayScreen> createState() => _QrDisplayScreenState();
}

class _QrDisplayScreenState extends State<QrDisplayScreen> {
  final ProviderService _providerService = ProviderService();
  final JobService _jobService = JobService();

  String? _jobId;
  bool _loadedArgs = false;
  bool _loading = true;
  bool _refreshing = false;
  bool _confirming = false;
  String? _error;
  Map<String, dynamic>? _job;
  Map<String, dynamic>? _providerProfile;
  Map<String, dynamic>? _qrData;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_loadedArgs) return;
    _loadedArgs = true;
    final args = ModalRoute.of(context)?.settings.arguments;
    if (args is String && args.isNotEmpty) {
      _jobId = args;
    }
    _loadJob();
  }

  Future<void> _loadJob() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final profileFuture = _providerService.getProviderMe();
      String id = _jobId ?? '';

      if (id.isEmpty) {
        final all = await _providerService.getProviderJobs(
          status: 'accepted,arrived,ongoing,completed,paid',
          limit: 40,
        );
        final first = all.cast<Map<String, dynamic>?>().firstWhere(
          (item) => item != null && _isTrackableStatus(item['status']?.toString()),
          orElse: () => all.isNotEmpty ? all.first : null,
        );
        id = first?['_id']?.toString() ?? '';
      }
      if (id.isEmpty) {
        if (!mounted) return;
        setState(() {
          _job = null;
          _error = 'No job found yet.';
        });
        return;
      }

      final details = await _jobService.getJobById(id);
      Map<String, dynamic>? qr;
      try {
        qr = await _providerService.getJobQr(id);
      } catch (_) {
        qr = null;
      }
      final profile = await profileFuture;

      if (!mounted) return;
      setState(() {
        _jobId = id;
        _job = details;
        _qrData = qr;
        _providerProfile = profile;
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

  Future<void> _confirmCompletion() async {
    final id = _jobId;
    if (id == null || id.isEmpty) return;

    setState(() => _confirming = true);
    try {
      await _jobService.confirmProviderCompletion(id);
      if (!mounted) return;
      _show('Marked as completed.');
      await _loadJob();
    } catch (e) {
      if (!mounted) return;
      _show('Failed to confirm completion: $e');
    } finally {
      if (mounted) {
        setState(() => _confirming = false);
      }
    }
  }

  bool _isTrackableStatus(String? status) {
    final s = (status ?? '').toLowerCase();
    return s == 'accepted' ||
        s == 'arrived' ||
        s == 'ongoing' ||
        s == 'completed' ||
        s == 'paid';
  }

  String _jobStatus() => (_job?['status']?.toString() ?? '').toLowerCase();

  bool get _canConfirmCompletion {
    final status = _jobStatus();
    return status == 'ongoing' || status == 'arrived';
  }

  bool get _canRefreshQr {
    final status = _jobStatus();
    return status == 'accepted' || status == 'arrived' || status == 'ongoing';
  }

  Future<void> _refreshQr() async {
    final id = _jobId;
    if (id == null || id.isEmpty) return;

    setState(() => _refreshing = true);
    try {
      final qr = await _providerService.getJobQr(id);
      if (!mounted) return;
      setState(() => _qrData = qr);
      _show('QR code refreshed.');
    } catch (e) {
      if (!mounted) return;
      _show('Unable to refresh code: $e');
    } finally {
      if (mounted) {
        setState(() => _refreshing = false);
      }
    }
  }

  String _providerName() {
    final user = _providerProfile?['userId'];
    if (user is Map<String, dynamic>) {
      final name = user['name']?.toString().trim() ?? '';
      if (name.isNotEmpty) return name;
    }
    return 'Provider';
  }

  String _providerSubtitle() {
    final categories =
        (_providerProfile?['categories'] as List?)
            ?.map((e) => e.toString())
            .where((e) => e.trim().isNotEmpty)
            .toList() ??
        <String>[];
    final primary = categories.isEmpty ? 'Service Provider' : categories.first;
    final verified = _providerProfile?['verified'] == true;
    return verified ? '$primary • LVL 2 Verified' : primary;
  }

  void _show(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
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
                        onRefresh: _loadJob,
                        child: ListView(
                  padding: const EdgeInsets.fromLTRB(18, 12, 18, 18),
                  physics: const AlwaysScrollableScrollPhysics(),
                  children: [
                    _JobInfoCard(job: _job ?? const <String, dynamic>{}),
                    const SizedBox(height: 12),
                    const _SectionLabel('CUSTOMER'),
                    const SizedBox(height: 8),
                    _CustomerCard(job: _job ?? const <String, dynamic>{}),
                    const SizedBox(height: 12),
                    const _SectionLabel('JOB PROGRESS'),
                    const SizedBox(height: 8),
                    _ProgressTimeline(status: _jobStatus(), job: _job ?? const <String, dynamic>{}),
                    const SizedBox(height: 12),
                    _QrCard(
                      refreshing: _refreshing,
                      hasToken: (_qrData?['token']?.toString().trim().isNotEmpty ?? false),
                      providerName: _providerName(),
                      providerSubtitle: _providerSubtitle(),
                      onRefresh: _canRefreshQr && !_refreshing ? _refreshQr : null,
                    ),
                    const SizedBox(height: 88),
                  ],
                ),
                      ),
              ),
            ],
          ),
        ),
      ),
      bottomNavigationBar: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            color: const Color(0xFFF8F9FB),
            padding: const EdgeInsets.fromLTRB(18, 10, 18, 10),
            child: _BottomAction(
              loading: _confirming,
              enabled: _canConfirmCompletion,
              onTap: _canConfirmCompletion ? _confirmCompletion : null,
            ),
          ),
          const ProviderBottomNav(activeIndex: 2),
        ],
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header();

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
            onTap: () {
              if (Navigator.of(context).canPop()) {
                Navigator.pop(context);
              } else {
                Navigator.pushReplacementNamed(context, AppRoutes.acceptedJobs);
              }
            },
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
              'Job Details',
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
                Icons.more_horiz_rounded,
                color: Color(0xFF1A2940),
                size: 27,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _JobInfoCard extends StatelessWidget {
  const _JobInfoCard({required this.job});

  final Map<String, dynamic> job;

  @override
  Widget build(BuildContext context) {
    final category = (job['category']?.toString() ?? 'General').toUpperCase();
    final amount = job['price'] is num
        ? (job['price'] as num).toStringAsFixed(0)
        : (num.tryParse(job['price']?.toString() ?? '0') ?? 0).toStringAsFixed(0);
    final title = job['title']?.toString() ?? 'Job';
    final description = job['description']?.toString() ?? 'No description available.';

    return Container(
      padding: const EdgeInsets.all(17),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFE4EAF2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              DecoratedBox(
                decoration: BoxDecoration(
                  color: Color(0xFFF0F4F9),
                  borderRadius: BorderRadius.all(Radius.circular(10)),
                ),
                child: Padding(
                  padding: EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  child: Text(
                    category,
                    style: TextStyle(
                      color: Color(0xFF5D6F88),
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.9,
                    ),
                  ),
                ),
              ),
              const Spacer(),
              Text(
                'LKR $amount',
                style: const TextStyle(
                  color: Color(0xFF141C34),
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            _wrapTitle(title),
            style: const TextStyle(
              color: Color(0xFF141C34),
              fontSize: 21,
              fontWeight: FontWeight.w800,
              height: 1.15,
              letterSpacing: -0.2,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            _wrapDescription(description),
            style: const TextStyle(
              color: Color(0xFF66758E),
              fontSize: 13.5,
              fontWeight: FontWeight.w500,
              height: 1.45,
            ),
          ),
        ],
      ),
    );
  }

  String _wrapTitle(String text) {
    final words = text.split(' ');
    if (words.length < 3) return text;
    final splitAt = (words.length / 2).ceil();
    return '${words.sublist(0, splitAt).join(' ')}\n${words.sublist(splitAt).join(' ')}';
  }

  String _wrapDescription(String text) {
    if (text.length < 82) return text;
    return text;
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 2),
      child: Text(
        text,
        style: const TextStyle(
          color: Color(0xFF8EA0B8),
          fontSize: 12,
          letterSpacing: 2.0,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}

class _CustomerCard extends StatelessWidget {
  const _CustomerCard({required this.job});

  final Map<String, dynamic> job;

  @override
  Widget build(BuildContext context) {
    final customer = job['customerId'] as Map<String, dynamic>?;
    final name = customer?['name']?.toString() ?? 'Customer';
    final district = customer?['district']?.toString().trim() ?? '';
    final city = customer?['city']?.toString().trim() ?? '';
    final location = district.isNotEmpty ? district : (city.isNotEmpty ? city : 'Location');
    final avatarUrl = customer?['profileImage']?.toString() ?? '';

    return Container(
      padding: const EdgeInsets.all(11),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(21),
        border: Border.all(color: const Color(0xFFE4EAF2)),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 26,
            backgroundColor: const Color(0xFFE6EBF4),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(26),
              child: avatarUrl.isNotEmpty
                  ? Image.network(avatarUrl, fit: BoxFit.cover)
                  : const Icon(
                      Icons.person_outline_rounded,
                      color: Color(0xFF8EA0B8),
                      size: 28,
                    ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: const TextStyle(
                    color: Color(0xFF141C34),
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    const Icon(
                      Icons.near_me_outlined,
                      color: Color(0xFF5A6B86),
                      size: 20,
                    ),
                    SizedBox(width: 4),
                    Text(
                      location,
                      style: TextStyle(
                        color: Color(0xFF5A6B86),
                        fontSize: 14.5,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              color: const Color(0xFFFBFCFE),
              borderRadius: BorderRadius.circular(17),
              border: Border.all(color: const Color(0xFFE7ECF4)),
            ),
            child: InkWell(
              borderRadius: BorderRadius.circular(17),
              onTap: () => Navigator.pushNamed(
                context,
                AppRoutes.chat,
                arguments: const {'fromProvider': true},
              ),
              child: const Icon(
                Icons.chat_bubble_outline_rounded,
                color: Color(0xFF5A6B86),
                size: 25,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ProgressTimeline extends StatelessWidget {
  const _ProgressTimeline({required this.status, required this.job});

  final String status;
  final Map<String, dynamic> job;

  @override
  Widget build(BuildContext context) {
    final created = DateTime.tryParse(job['createdAt']?.toString() ?? '');
    final accepted = DateTime.tryParse(job['acceptedAt']?.toString() ?? '');
    final arrived = DateTime.tryParse(job['arrivedAt']?.toString() ?? '');
    final completed = DateTime.tryParse(job['completedAt']?.toString() ?? '');

    final assignedDone = status == 'accepted' ||
        status == 'arrived' ||
        status == 'ongoing' ||
        status == 'completed' ||
        status == 'paid';
    final inProgressDone = status == 'ongoing' || status == 'completed' || status == 'paid';
    final completedDone = status == 'completed' || status == 'paid';

    return Column(
      children: [
        _TimelineStep(
          title: 'Job Posted',
          subtitle: _timeLabel(created, fallback: 'Created'),
          state: _TimelineState.done,
          showLine: true,
          lineColor: assignedDone ? const Color(0xFF273D98) : const Color(0xFFD5DFEC),
        ),
        _TimelineStep(
          title: 'Provider Assigned',
          subtitle: _timeLabel(accepted, fallback: assignedDone ? 'Assigned' : 'Waiting for provider'),
          state: assignedDone ? _TimelineState.done : _TimelineState.pending,
          showLine: true,
          lineColor: inProgressDone ? const Color(0xFF273D98) : const Color(0xFFD5DFEC),
        ),
        _TimelineStep(
          title: 'Job in Progress',
          subtitle: _timeLabel(
            arrived,
            fallback: inProgressDone
                ? 'Provider is on site'
                : 'Waiting for provider arrival',
          ),
          state: inProgressDone ? _TimelineState.current : _TimelineState.pending,
          showLine: true,
          lineColor: completedDone ? const Color(0xFF273D98) : const Color(0xFFD5DFEC),
        ),
        _TimelineStep(
          title: 'Job Completed',
          subtitle: completedDone
              ? _timeLabel(completed, fallback: 'Completed')
              : 'Awaiting confirmation',
          state: completedDone ? _TimelineState.done : _TimelineState.pending,
          showLine: false,
          lineColor: const Color(0xFFD5DFEC),
        ),
      ],
    );
  }

  String _timeLabel(DateTime? value, {required String fallback}) {
    if (value == null) return fallback;
    final h = value.hour % 12 == 0 ? 12 : value.hour % 12;
    final mm = value.minute.toString().padLeft(2, '0');
    final ampm = value.hour >= 12 ? 'PM' : 'AM';
    return '${_month(value.month)} ${value.day}, $h:$mm $ampm';
  }

  String _month(int month) {
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
    return months[month - 1];
  }
}

enum _TimelineState { done, current, pending }

class _TimelineStep extends StatelessWidget {
  const _TimelineStep({
    required this.title,
    required this.subtitle,
    required this.state,
    required this.showLine,
    required this.lineColor,
  });

  final String title;
  final String subtitle;
  final _TimelineState state;
  final bool showLine;
  final Color lineColor;

  @override
  Widget build(BuildContext context) {
    final isDone = state == _TimelineState.done;
    final isCurrent = state == _TimelineState.current;
    final isPending = state == _TimelineState.pending;

    return SizedBox(
      height: 82,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 26,
            child: Stack(
              alignment: Alignment.topCenter,
              children: [
                if (showLine)
                  Positioned(
                    top: 22,
                    bottom: 0,
                    child: Container(width: 2, color: lineColor),
                  ),
                Container(
                  width: 26,
                  height: 26,
                  decoration: BoxDecoration(
                    color: isDone
                        ? const Color(0xFF273D98)
                        : isCurrent
                        ? Colors.white
                        : const Color(0xFFD5DFEC),
                    shape: BoxShape.circle,
                    border: isCurrent
                        ? Border.all(color: const Color(0xFF273D98), width: 2)
                        : null,
                  ),
                  child: isDone
                      ? const Icon(Icons.check, color: Colors.white, size: 16)
                      : isCurrent
                      ? const Center(
                          child: DecoratedBox(
                            decoration: BoxDecoration(
                              color: Color(0xFF273D98),
                              shape: BoxShape.circle,
                            ),
                            child: SizedBox(width: 10, height: 10),
                          ),
                        )
                      : null,
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(top: 1),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      color: isPending
                          ? const Color(0xFFA5B3C6)
                          : const Color(0xFF273D98),
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: TextStyle(
                      color: isPending
                          ? const Color(0xFFA5B3C6)
                          : isCurrent
                          ? const Color(0xFF6A7B95)
                          : const Color(0xFF8EA0B8),
                      fontSize: 12.5,
                      fontWeight: FontWeight.w500,
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

class _QrCard extends StatelessWidget {
  const _QrCard({
    required this.hasToken,
    required this.providerName,
    required this.providerSubtitle,
    required this.refreshing,
    required this.onRefresh,
  });

  final bool hasToken;
  final String providerName;
  final String providerSubtitle;
  final bool refreshing;
  final VoidCallback? onRefresh;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: const Color(0xFFE3E8F0)),
      ),
      child: Column(
        children: [
          const Text(
            'Show this code to the customer\nupon arrival',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: Color(0xFF62738D),
              fontSize: 16,
              fontWeight: FontWeight.w500,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 12),
          CustomPaint(
            painter: const _DashedRRectPainter(
              color: Color(0xFFD7DFEC),
              radius: 24,
              dashLength: 8,
              dashGap: 6,
              strokeWidth: 1.6,
            ),
            child: Container(
              height: 300,
              width: double.infinity,
              alignment: Alignment.center,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.qr_code_2_rounded,
                    size: 102,
                    color: hasToken
                        ? const Color(0xFFC1CCDD)
                        : const Color(0xFFD7DFEC),
                  ),
                  const SizedBox(height: 10),
                  const Text(
                    'SCAN FOR VERIFICATION',
                    style: TextStyle(
                      color: Color(0xFF8EA0B8),
                      fontSize: 13.5,
                      letterSpacing: 2.1,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            providerName,
            style: const TextStyle(
              color: Color(0xFF141C34),
              fontSize: 19,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            providerSubtitle,
            style: const TextStyle(
              color: Color(0xFF66758E),
              fontSize: 14.5,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 14),
          SizedBox(
            height: 56,
            width: 276,
            child: ElevatedButton.icon(
              onPressed: onRefresh,
              icon: refreshing
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    )
                  : const Icon(Icons.refresh_rounded, size: 23),
              label: Text(
                refreshing ? 'Refreshing...' : 'Refresh Code',
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF273D98),
                foregroundColor: Colors.white,
                disabledBackgroundColor: const Color(0xFF8B97B5),
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(18),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _BottomAction extends StatelessWidget {
  const _BottomAction({
    required this.loading,
    required this.enabled,
    required this.onTap,
  });

  final bool loading;
  final bool enabled;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 56,
      child: ElevatedButton(
        onPressed: enabled && !loading ? onTap : null,
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF273D98),
          foregroundColor: Colors.white,
          disabledBackgroundColor: const Color(0xFF8B97B5),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(18),
          ),
          elevation: 0,
          shadowColor: const Color(0x4A273D98),
        ),
        child: loading
            ? const SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(
                  strokeWidth: 2.4,
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                ),
              )
            : const Text(
                'Confirm Job Completion',
                style: TextStyle(fontSize: 16.5, fontWeight: FontWeight.w700),
              ),
      ),
    );
  }
}

class _DashedRRectPainter extends CustomPainter {
  const _DashedRRectPainter({
    required this.color,
    required this.radius,
    required this.dashLength,
    required this.dashGap,
    required this.strokeWidth,
  });

  final Color color;
  final double radius;
  final double dashLength;
  final double dashGap;
  final double strokeWidth;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth;

    final rect = Offset.zero & size;
    final rrect = RRect.fromRectAndRadius(
      rect.deflate(strokeWidth / 2),
      Radius.circular(radius),
    );
    final path = Path()..addRRect(rrect);

    for (final metric in path.computeMetrics()) {
      double distance = 0;
      while (distance < metric.length) {
        final segment = math.min(dashLength, metric.length - distance);
        canvas.drawPath(
          metric.extractPath(distance, distance + segment),
          paint,
        );
        distance += dashLength + dashGap;
      }
    }
  }

  @override
  bool shouldRepaint(covariant _DashedRRectPainter oldDelegate) {
    return oldDelegate.color != color ||
        oldDelegate.radius != radius ||
        oldDelegate.dashLength != dashLength ||
        oldDelegate.dashGap != dashGap ||
        oldDelegate.strokeWidth != strokeWidth;
  }
}
