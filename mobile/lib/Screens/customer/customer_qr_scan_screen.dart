import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../../config/routes.dart';
import '../../config/ui_styles.dart';
import '../../services/job_service.dart';
import '../../widgets/customer_bottom_nav.dart';
import '../../widgets/ui_scale.dart';

class CustomerQrScanScreen extends StatefulWidget {
  const CustomerQrScanScreen({super.key});

  @override
  State<CustomerQrScanScreen> createState() => _CustomerQrScanScreenState();
}

class _CustomerQrScanScreenState extends State<CustomerQrScanScreen>
    with SingleTickerProviderStateMixin {
  static const Set<String> _trackableStatuses = <String>{
    'accepted',
    'arrived',
    'ongoing',
  };

  late final AnimationController _scanController;
  final JobService _jobService = JobService();

  String? _jobId;
  Map<String, dynamic>? _job;
  List<Map<String, dynamic>> _activeJobs = const <Map<String, dynamic>>[];
  bool _loading = true;
  bool _submitting = false;
  bool _loadedArgs = false;

  @override
  void initState() {
    super.initState();
    _scanController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1700),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _scanController.dispose();
    super.dispose();
  }

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
    setState(() => _loading = true);
    try {
      final all = await _jobService.fetchJobs(limit: 60);
      final trackable = all
          .where(
            (item) => _trackableStatuses.contains(
              item['status']?.toString().toLowerCase(),
            ),
          )
          .toList(growable: false);
      final available = trackable.isNotEmpty ? trackable : all;

      String? id = _jobId;
      final selectedExists =
          id != null &&
          id.isNotEmpty &&
          available.any((item) => item['_id']?.toString() == id);
      if (!selectedExists) {
        id = available.isNotEmpty ? available.first['_id']?.toString() : null;
      }

      if (id == null || id.isEmpty) {
        setState(() {
          _activeJobs = available;
          _job = null;
        });
        return;
      }

      final inline = available.cast<Map<String, dynamic>?>().firstWhere(
        (item) => item?['_id']?.toString() == id,
        orElse: () => null,
      );
      Map<String, dynamic> details = inline ?? <String, dynamic>{};
      try {
        details = await _jobService.getJobById(id);
      } catch (_) {
        // Keep inline list item when details API fails.
      }

      if (!mounted) return;
      setState(() {
        _activeJobs = available;
        _jobId = id;
        _job = details;
      });
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _selectJob(String jobId) async {
    if (jobId == _jobId) return;
    setState(() {
      _jobId = jobId;
      final inline = _activeJobs.cast<Map<String, dynamic>?>().firstWhere(
        (item) => item?['_id']?.toString() == jobId,
        orElse: () => null,
      );
      _job = inline;
      _loading = true;
    });

    try {
      final details = await _jobService.getJobById(jobId);
      if (!mounted) return;
      setState(() => _job = details);
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _onScanTap() async {
    if (_submitting) return;
    final id = _jobId;
    if (id == null || id.isEmpty) {
      _show('No active job to verify.');
      return;
    }
    final scanned = await Navigator.of(context).push<String>(
      MaterialPageRoute(builder: (_) => const _CameraQrScannerScreen()),
    );
    if (!mounted || scanned == null || scanned.trim().isEmpty) {
      return;
    }
    await _scanToken(id, scanned.trim());
  }

  Future<void> _scanToken(String jobId, String token) async {
    if (_submitting) return;
    setState(() => _submitting = true);
    try {
      await _jobService.scanArrival(jobId: jobId, token: token);
      if (!mounted) return;
      _show('Arrival confirmed.');
      Navigator.pushReplacementNamed(
        context,
        AppRoutes.review,
        arguments: jobId,
      );
    } catch (e) {
      if (!mounted) return;
      _show('QR scan failed: $e');
    } finally {
      if (mounted) {
        setState(() => _submitting = false);
      }
    }
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
              _Header(
                onBack: () {
                  if (Navigator.of(context).canPop()) {
                    Navigator.of(context).pop();
                    return;
                  }
                  Navigator.pushReplacementNamed(
                    context,
                    AppRoutes.customerDashboard,
                  );
                },
              ),
              Expanded(
                child: _loading && _job == null
                    ? const Center(
                        child: CircularProgressIndicator(
                          color: Color(0xFF273D98),
                        ),
                      )
                    : RefreshIndicator(
                        color: const Color(0xFF273D98),
                        onRefresh: _loadJob,
                        child: ListView(
                          padding: const EdgeInsets.fromLTRB(18, 14, 18, 16),
                          children: [
                            _ActiveJobsCard(
                              jobs: _activeJobs,
                              selectedJobId: _jobId,
                              onSelect: _selectJob,
                              onRefresh: _loadJob,
                            ),
                            const SizedBox(height: 12),
                            _ScanCard(
                              controller: _scanController,
                              enabled: _jobId != null && _jobId!.isNotEmpty,
                              submitting: _submitting,
                              onScanTap: _onScanTap,
                            ),
                            const SizedBox(height: 12),
                            _JobPreviewCard(job: _job),
                            const SizedBox(height: 12),
                            const _TipsCard(),
                            const SizedBox(height: 8),
                          ],
                        ),
                      ),
              ),
            ],
          ),
        ),
      ),
      bottomNavigationBar: const CustomerBottomNav(activeIndex: 2),
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
              'Scan Provider QR',
              style: TextStyle(
                color: Color(0xFF141C34),
                fontSize: 19,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
          const SizedBox(width: 40, height: 40),
        ],
      ),
    );
  }
}

class _ActiveJobsCard extends StatelessWidget {
  const _ActiveJobsCard({
    required this.jobs,
    required this.selectedJobId,
    required this.onSelect,
    required this.onRefresh,
  });

  final List<Map<String, dynamic>> jobs;
  final String? selectedJobId;
  final ValueChanged<String> onSelect;
  final Future<void> Function() onRefresh;

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
          Row(
            children: [
              const Expanded(
                child: Text(
                  'Active Jobs',
                  style: TextStyle(
                    color: Color(0xFF141C34),
                    fontSize: 16.5,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              TextButton.icon(
                onPressed: onRefresh,
                style: TextButton.styleFrom(
                  foregroundColor: const Color(0xFF3D5FD2),
                ),
                icon: const Icon(Icons.refresh_rounded, size: 18),
                label: const Text(
                  'Refresh',
                  style: TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ),
          if (jobs.isEmpty)
            const Padding(
              padding: EdgeInsets.only(top: 6, bottom: 2),
              child: Text(
                'No active jobs found. Open My Jobs and accept a service first.',
                style: TextStyle(
                  color: Color(0xFF66758E),
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  height: 1.35,
                ),
              ),
            )
          else
            SizedBox(
              height: 88,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: jobs.length,
                separatorBuilder: (context, index) => const SizedBox(width: 10),
                itemBuilder: (context, index) {
                  final job = jobs[index];
                  final id = job['_id']?.toString() ?? '';
                  final title =
                      job['title']?.toString().trim().isNotEmpty == true
                      ? job['title'].toString().trim()
                      : 'Service Request';
                  final status =
                      job['status']?.toString().toLowerCase() ?? 'pending';
                  final selected = id.isNotEmpty && id == selectedJobId;
                  return InkWell(
                    onTap: id.isEmpty ? null : () => onSelect(id),
                    borderRadius: BorderRadius.circular(14),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 170),
                      width: 210,
                      padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
                      decoration: BoxDecoration(
                        color: selected
                            ? const Color(0xFFEAF0FF)
                            : const Color(0xFFF8FAFE),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: selected
                              ? const Color(0xFF3D5FD2)
                              : const Color(0xFFDDE4F0),
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: Color(0xFF141C34),
                              fontSize: 13.5,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          const Spacer(),
                          Text(
                            status.toUpperCase(),
                            style: TextStyle(
                              color: status == 'pending'
                                  ? const Color(0xFFF97316)
                                  : const Color(0xFF2F62D5),
                              fontSize: 11.8,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }
}

class _ScanCard extends StatelessWidget {
  const _ScanCard({
    required this.controller,
    required this.enabled,
    required this.submitting,
    required this.onScanTap,
  });

  final AnimationController controller;
  final bool enabled;
  final bool submitting;
  final VoidCallback onScanTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFE4EAF2)),
      ),
      child: Column(
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: const Color(0xFFF6F9FE),
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Row(
              children: [
                Icon(
                  Icons.verified_user_rounded,
                  color: Color(0xFF3D5FD2),
                  size: 20,
                ),
                SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Verify provider arrival before service starts',
                    style: TextStyle(
                      color: Color(0xFF4E5F78),
                      fontSize: 12.5,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          AspectRatio(
            aspectRatio: 1,
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFF9FBFF),
                borderRadius: BorderRadius.circular(22),
                border: Border.all(color: const Color(0xFFD3DDEC)),
              ),
              child: LayoutBuilder(
                builder: (context, constraints) {
                  final maxH = constraints.maxHeight;
                  return Stack(
                    children: [
                      Positioned.fill(
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            color: const Color(0xFFF4F7FD),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: const Color(0xFFCAD5E7),
                              width: 1.2,
                            ),
                          ),
                        ),
                      ),
                      AnimatedBuilder(
                        animation: controller,
                        builder: (context, child) {
                          final scanTop = (maxH - 4) * controller.value;
                          return Positioned(
                            top: scanTop,
                            left: 10,
                            right: 10,
                            child: Container(
                              height: 4,
                              decoration: BoxDecoration(
                                gradient: const LinearGradient(
                                  colors: [
                                    Color(0x00273D98),
                                    Color(0xFF273D98),
                                    Color(0x00273D98),
                                  ],
                                ),
                                borderRadius: BorderRadius.circular(4),
                              ),
                            ),
                          );
                        },
                      ),
                      Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(
                              Icons.qr_code_2_rounded,
                              size: 76,
                              color: Color(0xFF273D98),
                            ),
                            const SizedBox(height: 14),
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 20),
                              child: ElevatedButton.icon(
                                onPressed: enabled && !submitting ? onScanTap : null,
                                style: AppUiStyles.primaryButton(
                                  height: 56,
                                  radius: BorderRadius.circular(18),
                                ),
                                icon: submitting
                                    ? const SizedBox(
                                        width: 20,
                                        height: 20,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2.2,
                                          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                        ),
                                      )
                                    : const Icon(Icons.qr_code_scanner_rounded, size: 21),
                                label: Text(
                                  submitting
                                      ? 'Confirming...'
                                      : enabled
                                      ? 'Scan QR to Confirm Arrival'
                                      : 'No Active Job to Verify',
                                  style: const TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _CameraQrScannerScreen extends StatefulWidget {
  const _CameraQrScannerScreen();

  @override
  State<_CameraQrScannerScreen> createState() => _CameraQrScannerScreenState();
}

class _CameraQrScannerScreenState extends State<_CameraQrScannerScreen> {
  final MobileScannerController _controller = MobileScannerController(
    detectionSpeed: DetectionSpeed.noDuplicates,
    formats: const [BarcodeFormat.qrCode],
  );
  bool _resolved = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _onDetect(BarcodeCapture capture) async {
    if (_resolved) return;
    for (final code in capture.barcodes) {
      final value = code.rawValue?.trim() ?? '';
      if (value.isEmpty) continue;
      _resolved = true;
      await _controller.stop();
      if (!mounted) return;
      Navigator.of(context).pop(value);
      return;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          MobileScanner(
            controller: _controller,
            onDetect: _onDetect,
            errorBuilder: (context, error) {
              final isPermission =
                  error.errorCode == MobileScannerErrorCode.permissionDenied;
              return Center(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        Icons.camera_alt_outlined,
                        color: Colors.white,
                        size: 48,
                      ),
                      const SizedBox(height: 12),
                      Text(
                        isPermission
                            ? 'Camera permission denied. Enable camera access in app settings.'
                            : 'Unable to open camera. Please try again.',
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      if (isPermission)
                        const Padding(
                          padding: EdgeInsets.only(top: 10),
                          child: Text(
                            'Please enable Camera permission from app settings and retry.',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: Colors.white70,
                              fontSize: 12.5,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              );
            },
          ),
          Positioned(
            top: MediaQuery.of(context).padding.top + 14,
            left: 16,
            right: 16,
            child: Row(
              children: [
                InkWell(
                  onTap: () => Navigator.of(context).pop(),
                  borderRadius: BorderRadius.circular(20),
                  child: Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: const Color(0x66000000),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Icon(
                      Icons.arrow_back_rounded,
                      color: Colors.white,
                      size: 26,
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                const Expanded(
                  child: Text(
                    'Scan Provider QR',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 19,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                ValueListenableBuilder<MobileScannerState>(
                  valueListenable: _controller,
                  builder: (context, state, child) {
                    final unavailable =
                        state.torchState == TorchState.unavailable;
                    final isOn = state.torchState == TorchState.on;
                    return InkWell(
                      onTap: unavailable
                          ? null
                          : () async {
                              try {
                                await _controller.toggleTorch();
                              } catch (_) {}
                            },
                      borderRadius: BorderRadius.circular(20),
                      child: Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: const Color(0x66000000),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Icon(
                          isOn
                              ? Icons.flashlight_on_rounded
                              : Icons.flashlight_off_rounded,
                          color: unavailable ? Colors.white38 : Colors.white,
                          size: 22,
                        ),
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
          Align(
            alignment: Alignment.bottomCenter,
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(18, 16, 18, 22),
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Color(0x00000000), Color(0xB2000000)],
                ),
              ),
              child: const Text(
                'Align the provider QR inside camera view.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _JobPreviewCard extends StatelessWidget {
  const _JobPreviewCard({required this.job});

  final Map<String, dynamic>? job;

  @override
  Widget build(BuildContext context) {
    final title = job?['title']?.toString() ?? 'No active job selected';
    final serviceId = job?['_id']?.toString();
    final status = (job?['status']?.toString() ?? 'pending').toLowerCase();
    final serviceIdLabel = serviceId == null || serviceId.isEmpty
        ? 'Select a job from My Jobs'
        : 'Service ID: #${serviceId.substring(0, serviceId.length > 8 ? 8 : serviceId.length)}';

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE4EAF2)),
      ),
      child: Row(
        children: [
          const CircleAvatar(
            radius: 24,
            backgroundColor: Color(0xFFE8EDF7),
            child: Icon(
              Icons.electrical_services_rounded,
              color: Color(0xFF3D5FD2),
              size: 24,
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
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  serviceIdLabel,
                  style: const TextStyle(
                    color: Color(0xFF66758E),
                    fontSize: 12.5,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
          Text(
            status.toUpperCase(),
            style: TextStyle(
              color: status == 'pending'
                  ? const Color(0xFFF97316)
                  : const Color(0xFF2F62D5),
              fontSize: 12.5,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

class _TipsCard extends StatelessWidget {
  const _TipsCard();

  @override
  Widget build(BuildContext context) {
    const tipStyle = TextStyle(
      color: Color(0xFF60718B),
      fontSize: 12.8,
      fontWeight: FontWeight.w600,
      height: 1.35,
    );
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFD),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFDCE4F1)),
      ),
      child: const Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Before you confirm',
            style: TextStyle(
              color: Color(0xFF273D98),
              fontSize: 14.5,
              fontWeight: FontWeight.w800,
            ),
          ),
          SizedBox(height: 8),
          Text(
            '- Check provider name and service ID on their QR.',
            style: tipStyle,
          ),
          SizedBox(height: 4),
          Text(
            '- Confirm the provider is physically at your location.',
            style: tipStyle,
          ),
          SizedBox(height: 4),
          Text('- Scan only once service is ready to start.', style: tipStyle),
        ],
      ),
    );
  }
}
