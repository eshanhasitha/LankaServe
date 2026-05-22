import 'package:flutter/material.dart';

import '../../config/routes.dart';
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
  late final AnimationController _scanController;
  final JobService _jobService = JobService();

  String? _jobId;
  Map<String, dynamic>? _job;
  bool _loading = true;
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

  void _onScanTap() {
    _openTokenSheet();
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
      String? id = _jobId;
      if (id == null || id.isEmpty) {
        final all = await _jobService.fetchJobs(limit: 40);
        final first = all.cast<Map<String, dynamic>?>().firstWhere(
              (item) =>
                  item != null &&
                  _trackableStatuses.contains(
                    item['status']?.toString().toLowerCase(),
                  ),
              orElse: () => all.isNotEmpty ? all.first : null,
            );
        id = first?['_id']?.toString();
      }
      if (id == null || id.isEmpty) {
        setState(() {
          _job = null;
        });
        return;
      }
      final details = await _jobService.getJobById(id);
      if (!mounted) return;
      setState(() {
        _jobId = id;
        _job = details;
      });
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _openTokenSheet() async {
    final id = _jobId;
    if (id == null || id.isEmpty) {
      _show('No active job to verify.');
      return;
    }

    final tokenController = TextEditingController();
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFFF8F9FB),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (sheetContext) {
        return Padding(
          padding: EdgeInsets.fromLTRB(
            18,
            12,
            18,
            MediaQuery.of(sheetContext).viewInsets.bottom + 16,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 42,
                height: 4,
                decoration: BoxDecoration(
                  color: const Color(0xFFD5DEEA),
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
              const SizedBox(height: 14),
              const Text(
                'Paste Provider QR Token',
                style: TextStyle(
                  color: Color(0xFF141C34),
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: tokenController,
                decoration: InputDecoration(
                  hintText: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                  filled: true,
                  fillColor: Colors.white,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: const BorderSide(color: Color(0xFFD2DBE8)),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: const BorderSide(color: Color(0xFFD2DBE8)),
                  ),
                ),
                minLines: 1,
                maxLines: 3,
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.pop(sheetContext),
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size.fromHeight(50),
                        side: const BorderSide(color: Color(0xFFD2DBE8)),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      child: const Text(
                        'Cancel',
                        style: TextStyle(
                          color: Color(0xFF41516A),
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () async {
                        final token = tokenController.text.trim();
                        if (token.isEmpty) {
                          _show('Paste the provider QR token.');
                          return;
                        }
                        Navigator.pop(sheetContext);
                        await _scanToken(id, token);
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF273D98),
                        foregroundColor: Colors.white,
                        minimumSize: const Size.fromHeight(50),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                        elevation: 0,
                      ),
                      child: const Text(
                        'Confirm Arrival',
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
  }

  Future<void> _scanToken(String jobId, String token) async {
    try {
      await _jobService.scanArrival(jobId: jobId, token: token);
      if (!mounted) return;
      _show('Arrival confirmed.');
      Navigator.pushReplacementNamed(context, AppRoutes.review, arguments: jobId);
    } catch (e) {
      if (!mounted) return;
      _show('QR scan failed: $e');
    }
  }

  static const Set<String> _trackableStatuses = <String>{
    'accepted',
    'arrived',
    'ongoing',
  };

  void _show(String message) {
    if (!mounted) return;
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
                child: _loading
                    ? const Center(
                        child: CircularProgressIndicator(
                          color: Color(0xFF273D98),
                        ),
                      )
                    : ListView(
                        padding: const EdgeInsets.fromLTRB(18, 14, 18, 16),
                        children: [
                          _ScanCard(
                            controller: _scanController,
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

class _ScanCard extends StatelessWidget {
  const _ScanCard({required this.controller, required this.onScanTap});

  final AnimationController controller;
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
                  final scanTop = (maxH - 4) * controller.value;
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
                      Positioned(
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
                      ),
                      const Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.qr_code_2_rounded,
                              size: 84,
                              color: Color(0xFF273D98),
                            ),
                            SizedBox(height: 8),
                            Text(
                              'Align provider QR in frame',
                              style: TextStyle(
                                color: Color(0xFF61728C),
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
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
          const SizedBox(height: 14),
          SizedBox(
            height: 56,
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: onScanTap,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF273D98),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(18),
                ),
                elevation: 0,
              ),
              icon: const Icon(Icons.qr_code_scanner_rounded, size: 21),
              label: const Text(
                'Scan QR to Confirm Arrival',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
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
                  style: TextStyle(
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
              color: status == 'pending' ? Color(0xFFF97316) : Color(0xFF2F62D5),
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
            '• Check provider name and service ID on their QR.',
            style: tipStyle,
          ),
          SizedBox(height: 4),
          Text(
            '• Confirm the provider is physically at your location.',
            style: tipStyle,
          ),
          SizedBox(height: 4),
          Text('• Scan only once service is ready to start.', style: tipStyle),
        ],
      ),
    );
  }
}


