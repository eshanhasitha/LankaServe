import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../config/routes.dart';
import '../../services/job_service.dart';
import '../../widgets/customer_bottom_nav.dart';
import '../../widgets/ui_scale.dart';

class ReviewScreen extends StatefulWidget {
  const ReviewScreen({super.key});

  @override
  State<ReviewScreen> createState() => _ReviewScreenState();
}

class _ReviewScreenState extends State<ReviewScreen> {
  final JobService _jobService = JobService();
  String? _jobId;
  bool _loadedArgs = false;
  bool _loading = true;
  bool _confirming = false;
  String? _error;
  Map<String, dynamic>? _job;

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
      String id = _jobId ?? '';
      if (id.isEmpty) {
        final all = await _jobService.fetchJobs(limit: 40);
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
      if (!mounted) return;
      setState(() {
        _jobId = id;
        _job = details;
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
      await _jobService.confirmCustomerCompletion(id);
      await _jobService.finalizeCompletion(id);
      if (!mounted) return;
      _show('Job completion confirmed.');
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
    return status == 'ongoing' || status == 'arrived' || status == 'completed';
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
                    const _SectionLabel('ASSIGNED PROVIDER'),
                    const SizedBox(height: 8),
                    _ProviderCard(job: _job ?? const <String, dynamic>{}),
                    const SizedBox(height: 12),
                    const _SectionLabel('JOB PROGRESS'),
                    const SizedBox(height: 8),
                    _ProgressTimeline(status: _jobStatus(), job: _job ?? const <String, dynamic>{}),
                    const SizedBox(height: 14),
                    _QrCard(
                      onTap: _jobId == null
                          ? null
                          : () => Navigator.pushNamed(
                                context,
                                AppRoutes.customerQrScan,
                                arguments: _jobId,
                              ),
                    ),
                    const SizedBox(height: 14),
                    _BottomAction(
                      loading: _confirming,
                      enabled: _canConfirmCompletion,
                      onTap: _canConfirmCompletion ? _confirmCompletion : null,
                    ),
                    const SizedBox(height: 12),
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
            onTap: () => Navigator.pop(context),
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

class _ProviderCard extends StatelessWidget {
  const _ProviderCard({required this.job});

  final Map<String, dynamic> job;

  @override
  Widget build(BuildContext context) {
    final provider = job['providerId'] as Map<String, dynamic>?;
    final name = provider?['name']?.toString() ?? 'Provider not assigned';

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
              child: Image.network(
                'https://lh3.googleusercontent.com/aida-public/AB6AXuBCUIoMRWFWJ53a6WQVefseHo0hTLsKcjD6lgdkUVRV-ztlNqj0gHWWpmoZ_hk22l4HiX7V7ZEI67jspxklRUWtPRPzJphvthC5OQsYX1k0_EJ0P44KqdX5HSonMRNu2XzCQrYv3n8xFbEdq_6J5ziR7qTuAwAajY6aXrMRX7T-viLh84LUuflm6BxMPhUyGXhBjdPSI18aBNy0v3mcUFPLRsBa_iMObCRkc6FTGSZRC4XNiFym9DizUWBE06zhwyq8lo51z9tIBcAp',
                fit: BoxFit.cover,
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
                const Row(
                  children: [
                    Icon(Icons.star_rounded, color: Color(0xFFF97316), size: 20),
                    SizedBox(width: 4),
                    Text(
                      '4.9',
                      style: TextStyle(
                        color: Color(0xFFF97316),
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    SizedBox(width: 6),
                    Text(
                      '(reviews)',
                      style: TextStyle(
                        color: Color(0xFF8EA0B8),
                        fontSize: 13,
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
            child: const Icon(
              Icons.chat_bubble_outline_rounded,
              color: Color(0xFF5A6B86),
              size: 25,
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
  const _QrCard({required this.onTap});

  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        boxShadow: const [
          BoxShadow(
            color: Color(0x26000000),
            blurRadius: 12,
            offset: Offset(0, 6),
          ),
        ],
      ),
      child: CustomPaint(
        painter: const _DashedRRectPainter(
          color: Color(0xFFD7DFEC),
          radius: 28,
          dashLength: 8,
          dashGap: 6,
          strokeWidth: 1.6,
        ),
        child: Container(
          padding: const EdgeInsets.fromLTRB(18, 16, 18, 16),
          decoration: BoxDecoration(
            color: const Color(0xFFF8FAFD),
            borderRadius: BorderRadius.circular(28),
          ),
          child: Column(
            children: [
              Container(
                width: 76,
                height: 76,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(18),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x12000000),
                      blurRadius: 8,
                      offset: Offset(0, 3),
                    ),
                  ],
                ),
                child: const Icon(
                  Icons.qr_code_scanner_rounded,
                  color: Color(0xFF273D98),
                  size: 42,
                ),
              ),
              const SizedBox(height: 12),
              const Text(
                'QR Verification Required',
                style: TextStyle(
                  color: Color(0xFF273D98),
                  fontSize: 17,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Ensure the provider is at your location\nbefore scanning their QR code.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Color(0xFF66758E),
                  fontSize: 13.5,
                  fontWeight: FontWeight.w500,
                  height: 1.45,
                ),
              ),
              const SizedBox(height: 14),
              InkWell(
                borderRadius: BorderRadius.circular(18),
                onTap: onTap,
                child: Container(
                  height: 56,
                  decoration: BoxDecoration(
                    color: const Color(0xFF273D98),
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.qr_code_2_rounded,
                        color: Colors.white,
                        size: 22,
                      ),
                      SizedBox(width: 8),
                      Text(
                        'Scan QR to Confirm Arrival',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 16.5,
                          fontWeight: FontWeight.w700,
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
