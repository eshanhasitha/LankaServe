import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../config/routes.dart';
import '../../config/ui_styles.dart';
import '../../services/job_service.dart';
import '../../services/provider_service.dart';
import '../../services/review_service.dart';
import '../../widgets/customer_bottom_nav.dart';
import '../../widgets/ui_scale.dart';

class ReviewScreen extends StatefulWidget {
  const ReviewScreen({super.key});

  @override
  State<ReviewScreen> createState() => _ReviewScreenState();
}

class _ReviewScreenState extends State<ReviewScreen> {
  final JobService _jobService = JobService();
  final ProviderService _providerService = ProviderService();
  final ReviewService _reviewService = ReviewService();
  String? _jobId;
  bool _loadedArgs = false;
  bool _loading = true;
  bool _confirming = false;
  bool _reviewLoading = false;
  bool _reviewSubmitting = false;
  int _reviewRating = 0;
  String? _error;
  Map<String, dynamic>? _job;
  Map<String, dynamic>? _review;
  Map<String, dynamic>? _providerProfile;
  String _providerProfileLookupId = '';
  Timer? _pollTimer;
  bool _polling = false;
  final TextEditingController _reviewCommentController =
      TextEditingController();

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

  @override
  void dispose() {
    _pollTimer?.cancel();
    _reviewCommentController.dispose();
    super.dispose();
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
          (item) =>
              item != null && _isTrackableStatus(item['status']?.toString()),
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
        if (!_canLoadReviewForStatus(
          (details['status']?.toString() ?? '').toLowerCase(),
        )) {
          _review = null;
        }
      });
      await _loadProviderProfileForJob(details, force: true);
      await _loadReviewForJob(id, withLoader: true);
      _startPolling();
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  void _startPolling() {
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(const Duration(seconds: 5), (_) {
      _refreshJobSilently();
    });
  }

  Future<void> _refreshJobSilently() async {
    if (_polling || !mounted) return;
    final id = _jobId;
    if (id == null || id.isEmpty) return;
    _polling = true;
    try {
      final details = await _jobService.getJobById(id);
      if (!mounted) return;
      setState(() {
        _job = details;
        _error = null;
        if (!_canLoadReviewForStatus(
          (details['status']?.toString() ?? '').toLowerCase(),
        )) {
          _review = null;
        }
      });
      await _loadProviderProfileForJob(details);
      if (_review == null &&
          _canLoadReviewForStatus(
            (details['status']?.toString() ?? '').toLowerCase(),
          )) {
        unawaited(_loadReviewForJob(id, withLoader: false));
      }
    } catch (_) {
      // Silent polling should not interrupt the screen with errors.
    } finally {
      _polling = false;
    }
  }

  Future<void> _loadProviderProfileForJob(
    Map<String, dynamic> details, {
    bool force = false,
  }) async {
    final candidateIds = _providerCandidateIds(details);
    if (candidateIds.isEmpty) {
      if (mounted && _providerProfile != null) {
        setState(() {
          _providerProfile = null;
          _providerProfileLookupId = '';
        });
      }
      return;
    }

    final primaryId = candidateIds.first;
    if (!force &&
        _providerProfile != null &&
        _providerProfileLookupId == primaryId) {
      return;
    }

    Map<String, dynamic>? profile;
    String lookup = '';
    for (final id in candidateIds) {
      try {
        final response = await _providerService.getPublicProviderProfile(id);
        if (response.isNotEmpty) {
          profile = response;
          lookup = id;
          break;
        }
      } catch (_) {
        // Try next candidate ID format.
      }
    }
    if (!mounted) return;
    setState(() {
      _providerProfile = profile;
      _providerProfileLookupId = lookup;
    });
  }

  List<String> _providerCandidateIds(Map<String, dynamic> details) {
    final provider = details['providerId'];
    final ids = <String>[];

    void add(dynamic value) {
      final id = value?.toString().trim() ?? '';
      if (id.isNotEmpty && !ids.contains(id)) {
        ids.add(id);
      }
    }

    if (provider is String) {
      add(provider);
    } else if (provider is Map<String, dynamic>) {
      add(
        provider['userId'] is Map<String, dynamic>
            ? provider['userId']['_id']
            : provider['userId'],
      );
      add(provider['_id']);
      add(provider['id']);
    }
    return ids;
  }

  bool _canLoadReviewForStatus(String status) {
    return status == 'completed' || status == 'paid';
  }

  Future<void> _loadReviewForJob(
    String jobId, {
    required bool withLoader,
  }) async {
    if (!_canLoadReviewForStatus(_jobStatus())) return;
    if (withLoader) {
      setState(() => _reviewLoading = true);
    }
    try {
      final review = await _reviewService.fetchMyJobReview(jobId);
      if (!mounted) return;
      setState(() => _review = review);
    } catch (_) {
      if (!mounted) return;
      setState(() => _review = null);
    } finally {
      if (mounted && withLoader) {
        setState(() => _reviewLoading = false);
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
    final providerCompletion = _job?['providerCompletion'] == true;
    final customerCompletion = _job?['customerCompletion'] == true;
    final statusAllowsConfirmation =
        status == 'ongoing' || status == 'arrived' || status == 'completed';
    return providerCompletion &&
        !customerCompletion &&
        statusAllowsConfirmation;
  }

  bool get _providerMarkedComplete => _job?['providerCompletion'] == true;

  bool get _customerMarkedComplete => _job?['customerCompletion'] == true;

  bool get _needsArrivalVerification {
    final status = _jobStatus();
    final arrivedAt = _job?['arrivedAt']?.toString().trim() ?? '';
    return status == 'accepted' && arrivedAt.isEmpty;
  }

  bool get _hasAssignedProvider {
    final provider = _job?['providerId'];
    if (provider is String) return provider.trim().isNotEmpty;
    if (provider is Map<String, dynamic>) {
      return provider['_id']?.toString().trim().isNotEmpty == true ||
          provider['id']?.toString().trim().isNotEmpty == true ||
          provider['name']?.toString().trim().isNotEmpty == true ||
          provider['userId']?.toString().trim().isNotEmpty == true;
    }
    return false;
  }

  bool get _canScanArrivalQr =>
      _hasAssignedProvider && _needsArrivalVerification;

  bool get _isCompletedPhase {
    final status = _jobStatus();
    return status == 'completed' || status == 'paid';
  }

  bool get _canSubmitReview {
    return _isCompletedPhase && _customerMarkedComplete && _review == null;
  }

  Future<void> _submitReview() async {
    final id = _jobId;
    if (id == null || id.isEmpty) return;
    if (_reviewRating <= 0) {
      _show('Please select a rating before submitting.');
      return;
    }

    setState(() => _reviewSubmitting = true);
    try {
      final created = await _reviewService.createReview(
        jobId: id,
        rating: _reviewRating,
        comment: _reviewCommentController.text.trim(),
      );
      if (!mounted) return;
      setState(() {
        _review = created;
      });
      _show('Review submitted.');
    } catch (e) {
      if (!mounted) return;
      _show('Failed to submit review: $e');
    } finally {
      if (mounted) {
        setState(() => _reviewSubmitting = false);
      }
    }
  }

  Future<void> _openProviderChat() async {
    final provider = _job?['providerId'];
    String providerId = '';
    String providerName = 'Provider';
    String providerAvatar = '';

    if (provider is Map<String, dynamic>) {
      providerId =
          provider['_id']?.toString() ??
          provider['id']?.toString() ??
          provider['userId']?['_id']?.toString() ??
          provider['userId']?.toString() ??
          '';
      final directName = provider['name']?.toString().trim() ?? '';
      final nestedName = provider['userId'] is Map<String, dynamic>
          ? (provider['userId']['name']?.toString().trim() ?? '')
          : '';
      providerName = directName.isNotEmpty
          ? directName
          : nestedName.isNotEmpty
          ? nestedName
          : 'Assigned Provider';
      providerAvatar =
          provider['profileImage']?.toString() ??
          (provider['userId'] is Map<String, dynamic>
              ? provider['userId']['profileImage']?.toString() ?? ''
              : '');
    } else if (provider is String) {
      providerId = provider;
    }

    if (providerId.trim().isEmpty) {
      _show('Provider is not assigned yet.');
      return;
    }

    if (!mounted) return;
    Navigator.pushNamed(
      context,
      AppRoutes.chatConversation,
      arguments: {
        'counterpartId': providerId,
        'counterpartName': providerName,
        'counterpartAvatar': providerAvatar,
        'isProvider': true,
        if ((_jobId ?? '').isNotEmpty) 'jobId': _jobId,
      },
    );
  }

  void _show(String message) {
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
                        onRefresh: _loadJob,
                        child: ListView(
                          padding: const EdgeInsets.fromLTRB(18, 12, 18, 18),
                          physics: const AlwaysScrollableScrollPhysics(),
                          children: [
                            _JobInfoCard(
                              job: _job ?? const <String, dynamic>{},
                            ),
                            const SizedBox(height: 12),
                            const _SectionLabel('ASSIGNED PROVIDER'),
                            const SizedBox(height: 8),
                            _ProviderCard(
                              job: _job ?? const <String, dynamic>{},
                              providerProfile: _providerProfile,
                              onMessage: _openProviderChat,
                            ),
                            const SizedBox(height: 12),
                            const _SectionLabel('JOB PROGRESS'),
                            const SizedBox(height: 8),
                            _ProgressTimeline(
                              status: _jobStatus(),
                              job: _job ?? const <String, dynamic>{},
                            ),
                            const SizedBox(height: 14),
                            _CompletionStatusCard(
                              providerConfirmed: _providerMarkedComplete,
                              customerConfirmed: _customerMarkedComplete,
                              canConfirm: _canConfirmCompletion,
                            ),
                            const SizedBox(height: 14),
                            _LocationCard(
                              job: _job ?? const <String, dynamic>{},
                            ),
                            const SizedBox(height: 14),
                            _QrCard(
                              enabled: _canScanArrivalQr && _jobId != null,
                              helperText: _canScanArrivalQr
                                  ? 'Ensure the provider is at your location\nbefore scanning their QR code.'
                                  : _hasAssignedProvider
                                  ? 'Arrival already verified or not ready for scanning.'
                                  : 'QR scan will activate after a provider is assigned.',
                              onTap: _canScanArrivalQr && _jobId != null
                                  ? () => Navigator.pushNamed(
                                      context,
                                      AppRoutes.customerQrScan,
                                      arguments: _jobId,
                                    )
                                  : null,
                            ),
                            const SizedBox(height: 14),
                            _BottomAction(
                              loading: _confirming,
                              enabled: _canConfirmCompletion,
                              onTap: _canConfirmCompletion
                                  ? _confirmCompletion
                                  : null,
                            ),
                            if (_isCompletedPhase) ...[
                              const SizedBox(height: 14),
                              _ReviewSection(
                                review: _review,
                                loading: _reviewLoading,
                                submitting: _reviewSubmitting,
                                canSubmit: _canSubmitReview,
                                selectedRating: _reviewRating,
                                onRatingChanged: (value) =>
                                    setState(() => _reviewRating = value),
                                commentController: _reviewCommentController,
                                onSubmit: _submitReview,
                              ),
                            ],
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
        : (num.tryParse(job['price']?.toString() ?? '0') ?? 0).toStringAsFixed(
            0,
          );
    final title = job['title']?.toString() ?? 'Job';
    final description =
        job['description']?.toString() ?? 'No description available.';

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
  const _ProviderCard({
    required this.job,
    required this.providerProfile,
    required this.onMessage,
  });

  final Map<String, dynamic> job;
  final Map<String, dynamic>? providerProfile;
  final VoidCallback onMessage;

  @override
  Widget build(BuildContext context) {
    final provider = providerProfile ?? job['providerId'];
    Map<String, dynamic>? providerMap;
    if (provider is Map<String, dynamic>) {
      providerMap = provider;
    }
    final user = providerMap?['userId'];
    final userMap = user is Map<String, dynamic> ? user : null;
    final name = providerMap?['name']?.toString().trim().isNotEmpty == true
        ? providerMap!['name'].toString().trim()
        : userMap?['name']?.toString().trim().isNotEmpty == true
        ? userMap!['name'].toString().trim()
        : provider is String && provider.trim().isNotEmpty
        ? 'Assigned Provider'
        : 'Provider not assigned';
    final avatar =
        providerMap?['profileImage']?.toString() ??
        userMap?['profileImage']?.toString() ??
        '';
    final categories = providerMap?['categories'];
    final categoryLabel = categories is List && categories.isNotEmpty
        ? categories.first.toString()
        : (job['category']?.toString() ?? 'General Service');
    final stats = providerMap?['stats'] as Map<String, dynamic>?;
    final ratingNum = stats?['averageRating'];
    final jobsNum = stats?['completedJobs'];
    final rating = ratingNum is num
        ? ratingNum.toStringAsFixed(1)
        : (num.tryParse(ratingNum?.toString() ?? '')?.toStringAsFixed(1) ??
              '-');
    final jobs = jobsNum is num
        ? jobsNum.toStringAsFixed(0)
        : (num.tryParse(jobsNum?.toString() ?? '')?.toStringAsFixed(0) ?? '0');
    final assigned = name != 'Provider not assigned';

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
            child: avatar.isEmpty
                ? const Icon(
                    Icons.person_rounded,
                    color: Color(0xFF8EA0B8),
                    size: 27,
                  )
                : ClipRRect(
                    borderRadius: BorderRadius.circular(26),
                    child: Image.network(
                      avatar,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) => const Icon(
                        Icons.person_rounded,
                        color: Color(0xFF8EA0B8),
                        size: 27,
                      ),
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
                Text(
                  categoryLabel,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Color(0xFF8092AD),
                    fontSize: 12.5,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 3),
                Row(
                  children: [
                    const Icon(
                      Icons.star_rounded,
                      color: Color(0xFFF97316),
                      size: 18,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      rating,
                      style: const TextStyle(
                        color: Color(0xFFF97316),
                        fontSize: 13.5,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      '$jobs jobs',
                      style: const TextStyle(
                        color: Color(0xFF8EA0B8),
                        fontSize: 12.5,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          InkWell(
            onTap: assigned ? onMessage : null,
            borderRadius: BorderRadius.circular(17),
            child: Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                color: const Color(0xFFFBFCFE),
                borderRadius: BorderRadius.circular(17),
                border: Border.all(color: const Color(0xFFE7ECF4)),
              ),
              child: Icon(
                Icons.chat_bubble_outline_rounded,
                color: assigned
                    ? const Color(0xFF5A6B86)
                    : const Color(0xFFB9C6D9),
                size: 25,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _CompletionStatusCard extends StatelessWidget {
  const _CompletionStatusCard({
    required this.providerConfirmed,
    required this.customerConfirmed,
    required this.canConfirm,
  });

  final bool providerConfirmed;
  final bool customerConfirmed;
  final bool canConfirm;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE4EAF2)),
      ),
      child: Row(
        children: [
          Expanded(
            child: _StatusTile(
              title: 'Provider Status',
              subtitle: providerConfirmed
                  ? 'Provider marked as completed.'
                  : 'Awaiting provider completion.',
              confirmed: providerConfirmed,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: _StatusTile(
              title: 'Your Status',
              subtitle: customerConfirmed
                  ? 'You confirmed completion.'
                  : canConfirm
                  ? 'Ready to confirm.'
                  : 'Waiting for provider.',
              confirmed: customerConfirmed,
            ),
          ),
        ],
      ),
    );
  }
}

class _StatusTile extends StatelessWidget {
  const _StatusTile({
    required this.title,
    required this.subtitle,
    required this.confirmed,
  });

  final String title;
  final String subtitle;
  final bool confirmed;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(10, 11, 10, 11),
      decoration: BoxDecoration(
        color: confirmed ? const Color(0xFFF1FAF4) : const Color(0xFFF8FAFD),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: confirmed ? const Color(0xFFCDEED8) : const Color(0xFFE4EAF2),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                confirmed ? Icons.check_circle_rounded : Icons.hourglass_empty,
                color: confirmed
                    ? const Color(0xFF16A34A)
                    : const Color(0xFFF97316),
                size: 16,
              ),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Color(0xFF1B2940),
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 5),
          Text(
            subtitle,
            style: const TextStyle(
              color: Color(0xFF6B7C95),
              fontSize: 11.5,
              fontWeight: FontWeight.w600,
              height: 1.3,
            ),
          ),
        ],
      ),
    );
  }
}

class _LocationCard extends StatelessWidget {
  const _LocationCard({required this.job});

  final Map<String, dynamic> job;

  @override
  Widget build(BuildContext context) {
    final location = job['location'];
    final coordinates = location is Map<String, dynamic>
        ? location['coordinates']
        : null;
    String text = 'Location not available';
    if (coordinates is List && coordinates.length >= 2) {
      final lng = (coordinates[0] as num?)?.toDouble();
      final lat = (coordinates[1] as num?)?.toDouble();
      if (lat != null && lng != null) {
        text = '${lat.toStringAsFixed(5)}, ${lng.toStringAsFixed(5)}';
      }
    }

    return Container(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE4EAF2)),
      ),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: const Color(0xFFF0F4FB),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(
              Icons.location_on_rounded,
              color: Color(0xFF2F62D5),
              size: 24,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Location',
                  style: TextStyle(
                    color: Color(0xFF1B2940),
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  text,
                  style: const TextStyle(
                    color: Color(0xFF66758E),
                    fontSize: 12.5,
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

    final assignedDone =
        status == 'accepted' ||
        status == 'arrived' ||
        status == 'ongoing' ||
        status == 'completed' ||
        status == 'paid';
    final inProgressDone =
        status == 'ongoing' || status == 'completed' || status == 'paid';
    final completedDone = status == 'completed' || status == 'paid';

    return Column(
      children: [
        _TimelineStep(
          title: 'Job Posted',
          subtitle: _timeLabel(created, fallback: 'Created'),
          state: _TimelineState.done,
          showLine: true,
          lineColor: assignedDone
              ? const Color(0xFF273D98)
              : const Color(0xFFD5DFEC),
        ),
        _TimelineStep(
          title: 'Provider Assigned',
          subtitle: _timeLabel(
            accepted,
            fallback: assignedDone ? 'Assigned' : 'Waiting for provider',
          ),
          state: assignedDone ? _TimelineState.done : _TimelineState.pending,
          showLine: true,
          lineColor: inProgressDone
              ? const Color(0xFF273D98)
              : const Color(0xFFD5DFEC),
        ),
        _TimelineStep(
          title: 'Job in Progress',
          subtitle: _timeLabel(
            arrived,
            fallback: inProgressDone
                ? 'Provider is on site'
                : 'Waiting for provider arrival',
          ),
          state: inProgressDone
              ? _TimelineState.current
              : _TimelineState.pending,
          showLine: true,
          lineColor: completedDone
              ? const Color(0xFF273D98)
              : const Color(0xFFD5DFEC),
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
    required this.onTap,
    required this.enabled,
    required this.helperText,
  });

  final VoidCallback? onTap;
  final bool enabled;
  final String helperText;

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
              Text(
                helperText,
                textAlign: TextAlign.center,
                style: const TextStyle(
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
                    color: enabled
                        ? const Color(0xFF273D98)
                        : const Color(0xFF93A1BD),
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

class _ReviewSection extends StatelessWidget {
  const _ReviewSection({
    required this.review,
    required this.loading,
    required this.submitting,
    required this.canSubmit,
    required this.selectedRating,
    required this.onRatingChanged,
    required this.commentController,
    required this.onSubmit,
  });

  final Map<String, dynamic>? review;
  final bool loading;
  final bool submitting;
  final bool canSubmit;
  final int selectedRating;
  final ValueChanged<int> onRatingChanged;
  final TextEditingController commentController;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE4EAF2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Rate & Review',
            style: TextStyle(
              color: Color(0xFF141C34),
              fontSize: 16.5,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 8),
          if (loading)
            const Center(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 12),
                child: CircularProgressIndicator(color: Color(0xFF273D98)),
              ),
            )
          else if (review != null) ...[
            Row(
              children: [
                ...List.generate(5, (index) {
                  final value = index + 1;
                  final filled =
                      value <=
                      ((review?['rating'] as num?)?.toInt() ??
                          int.tryParse(review?['rating']?.toString() ?? '0') ??
                          0);
                  return Icon(
                    filled ? Icons.star_rounded : Icons.star_border_rounded,
                    color: filled
                        ? const Color(0xFFF59E0B)
                        : const Color(0xFFBFC9DA),
                    size: 20,
                  );
                }),
                const SizedBox(width: 8),
                Text(
                  (review?['rating']?.toString() ?? '').isEmpty
                      ? '-'
                      : review!['rating'].toString(),
                  style: const TextStyle(
                    color: Color(0xFF334155),
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFD),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE4EAF2)),
              ),
              child: Text(
                (review?['comment']?.toString().trim().isNotEmpty ?? false)
                    ? review!['comment'].toString().trim()
                    : 'You submitted a rating without a written review.',
                style: const TextStyle(
                  color: Color(0xFF60718B),
                  fontSize: 12.5,
                  fontWeight: FontWeight.w600,
                  height: 1.35,
                ),
              ),
            ),
          ] else if (canSubmit) ...[
            _StarInput(selected: selectedRating, onChanged: onRatingChanged),
            const SizedBox(height: 8),
            TextField(
              controller: commentController,
              minLines: 2,
              maxLines: 4,
              decoration: InputDecoration(
                hintText: 'Write a short review (optional)',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: Color(0xFFD2DBE8)),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: Color(0xFFD2DBE8)),
                ),
              ),
            ),
            const SizedBox(height: 10),
            SizedBox(
              height: 48,
              width: double.infinity,
              child: ElevatedButton(
                onPressed: submitting ? null : onSubmit,
                style: AppUiStyles.primaryButton(radius: AppUiStyles.radiusMd),
                child: submitting
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(
                          strokeWidth: 2.2,
                          valueColor: AlwaysStoppedAnimation<Color>(
                            Colors.white,
                          ),
                        ),
                      )
                    : const Text(
                        'Submit Review',
                        style: TextStyle(fontWeight: FontWeight.w700),
                      ),
              ),
            ),
          ] else
            const Text(
              'Review will be available after completion is confirmed.',
              style: TextStyle(
                color: Color(0xFF6D7E97),
                fontSize: 12.5,
                fontWeight: FontWeight.w600,
              ),
            ),
        ],
      ),
    );
  }
}

class _StarInput extends StatelessWidget {
  const _StarInput({required this.selected, required this.onChanged});

  final int selected;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: List.generate(5, (index) {
        final value = index + 1;
        final filled = value <= selected;
        return IconButton(
          onPressed: () => onChanged(value),
          icon: Icon(
            filled ? Icons.star_rounded : Icons.star_border_rounded,
            color: filled ? const Color(0xFFF59E0B) : const Color(0xFFBFC9DA),
            size: 30,
          ),
        );
      }),
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
        style:
            AppUiStyles.primaryButton(
              height: 56,
              radius: BorderRadius.circular(18),
            ).copyWith(
              shadowColor: WidgetStateProperty.all(const Color(0x4A273D98)),
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
