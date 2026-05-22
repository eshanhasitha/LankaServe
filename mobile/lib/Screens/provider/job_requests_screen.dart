import 'package:flutter/material.dart';

import '../../config/routes.dart';
import '../../services/job_service.dart';
import '../../widgets/provider_bottom_nav.dart';
import '../../widgets/ui_scale.dart';

class JobRequestsScreen extends StatefulWidget {
  const JobRequestsScreen({super.key});

  @override
  State<JobRequestsScreen> createState() => _JobRequestsScreenState();
}

class _JobRequestsScreenState extends State<JobRequestsScreen> {
  final JobService _jobService = JobService();

  int _activeTab = 0;
  bool _loadedArgs = false;
  bool _loading = true;
  String? _error;
  String? _actioningJobId;

  List<Map<String, dynamic>> _jobRequests = <Map<String, dynamic>>[];
  List<Map<String, dynamic>> _relatedJobs = <Map<String, dynamic>>[];

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_loadedArgs) return;
    _loadedArgs = true;

    final args = ModalRoute.of(context)?.settings.arguments;
    if (args is int && args >= 0 && args <= 1) {
      _activeTab = args;
    } else if (args is Map<String, dynamic>) {
      final tab = args['tab'];
      if (tab is int && tab >= 0 && tab <= 1) {
        _activeTab = tab;
      }
    }

    _loadJobs();
  }

  Future<void> _loadJobs() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final results = await Future.wait<List<Map<String, dynamic>>>([
        _jobService.fetchProviderJobRequests(),
        _jobService.fetchProviderBrowseJobs(),
      ]);

      if (!mounted) return;
      setState(() {
        _jobRequests = results[0];
        _relatedJobs = results[1];
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

  List<Map<String, dynamic>> get _currentItems => _activeTab == 0 ? _jobRequests : _relatedJobs;

  Future<void> _acceptJob(Map<String, dynamic> job) async {
    final id = job['_id']?.toString() ?? '';
    if (id.isEmpty) return;

    setState(() => _actioningJobId = id);
    try {
      await _jobService.acceptJob(id);
      if (!mounted) return;

      setState(() {
        _jobRequests.removeWhere((item) => item['_id']?.toString() == id);
        _relatedJobs.removeWhere((item) => item['_id']?.toString() == id);
      });

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Job accepted successfully.')),
      );

      Navigator.pushNamed(context, AppRoutes.qrDisplay, arguments: id);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Accept failed: $e')),
      );
    } finally {
      if (mounted) {
        setState(() => _actioningJobId = null);
      }
    }
  }

  Future<void> _rejectJob(Map<String, dynamic> job) async {
    final id = job['_id']?.toString() ?? '';
    if (id.isEmpty) return;

    setState(() => _actioningJobId = id);
    try {
      await _jobService.rejectJob(id);
      if (!mounted) return;

      setState(() {
        _jobRequests.removeWhere((item) => item['_id']?.toString() == id);
        _relatedJobs.removeWhere((item) => item['_id']?.toString() == id);
      });

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Job rejected.')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Reject failed: $e')),
      );
    } finally {
      if (mounted) {
        setState(() => _actioningJobId = null);
      }
    }
  }

  void _showDetails(Map<String, dynamic> job) {
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
                  job['description']?.toString() ?? 'No description available.',
                  style: const TextStyle(
                    color: Color(0xFF66758E),
                    fontSize: 14,
                    height: 1.45,
                    fontWeight: FontWeight.w500,
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
    final compactScale = UiScale.factor(context, min: 0.90, max: 1.0);

    return Scaffold(
      backgroundColor: const Color(0xFFF3F4F7),
      body: SafeArea(
        child: MediaQuery(
          data: MediaQuery.of(context).copyWith(
            textScaler: TextScaler.linear(compactScale),
          ),
          child: Column(
            children: [
              const _Header(),
              Expanded(
                child: RefreshIndicator(
                  onRefresh: _loadJobs,
                  child: ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.fromLTRB(24, 16, 24, 16),
                    children: [
                      _Tabs(
                        activeTab: _activeTab,
                        onChanged: (index) => setState(() => _activeTab = index),
                      ),
                      const SizedBox(height: 12),
                      if (_loading)
                        const _InfoTile('Loading jobs...')
                      else if (_error != null)
                        _InfoTile(_error!)
                      else if (_currentItems.isEmpty)
                        const _InfoTile('No jobs available in this tab.')
                      else
                        ..._currentItems.map(
                          (item) => Padding(
                            padding: const EdgeInsets.only(bottom: 14),
                            child: _RequestCard(
                              item: item,
                              actioning: _actioningJobId == (item['_id']?.toString() ?? ''),
                              onViewDetails: () => _showDetails(item),
                              onAccept: () => _acceptJob(item),
                              onReject: () => _rejectJob(item),
                            ),
                          ),
                        ),
                      const SizedBox(height: 86),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
      bottomNavigationBar: const ProviderBottomNav(activeIndex: 1),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 66,
      padding: const EdgeInsets.fromLTRB(18, 12, 18, 12),
      decoration: const BoxDecoration(
        color: Color(0xFFF8F9FB),
        border: Border(bottom: BorderSide(color: Color(0xFFE1E6EE))),
      ),
      alignment: Alignment.centerLeft,
      child: const Text(
        'Browse Jobs',
        style: TextStyle(
          color: Color(0xFF121C33),
          fontSize: 19,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}

class _Tabs extends StatelessWidget {
  const _Tabs({required this.activeTab, required this.onChanged});

  final int activeTab;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _tab(
            text: 'Job Requests',
            selected: activeTab == 0,
            onTap: () => onChanged(0),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _tab(
            text: 'Related Jobs',
            selected: activeTab == 1,
            onTap: () => onChanged(1),
          ),
        ),
      ],
    );
  }

  Widget _tab({
    required String text,
    required bool selected,
    required VoidCallback onTap,
  }) {
    return InkWell(
      borderRadius: BorderRadius.circular(999),
      onTap: onTap,
      child: Container(
        height: 52,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: selected ? const Color(0xFF273E99) : const Color(0xFFD6DDE9),
          borderRadius: BorderRadius.circular(999),
        ),
        child: Text(
          text,
          style: TextStyle(
            color: selected ? Colors.white : const Color(0xFF4D5D77),
            fontSize: 16,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}

class _RequestCard extends StatelessWidget {
  const _RequestCard({
    required this.item,
    required this.actioning,
    required this.onViewDetails,
    required this.onAccept,
    required this.onReject,
  });

  final Map<String, dynamic> item;
  final bool actioning;
  final VoidCallback onViewDetails;
  final VoidCallback onAccept;
  final VoidCallback onReject;

  String _formatMoney(num value) {
    final fixed = value.toStringAsFixed(2);
    final parts = fixed.split('.');
    final whole = parts[0];
    final fraction = parts.length > 1 ? parts[1] : '00';
    final buffer = StringBuffer();
    for (int i = 0; i < whole.length; i++) {
      final reverseIndex = whole.length - i;
      buffer.write(whole[i]);
      if (reverseIndex > 1 && reverseIndex % 3 == 1) {
        buffer.write(',');
      }
    }
    return '${buffer.toString()}.$fraction';
  }

  String _timeAgo(dynamic raw) {
    final date = DateTime.tryParse(raw?.toString() ?? '');
    if (date == null) return 'NEW';
    final diff = DateTime.now().difference(date);
    if (diff.inMinutes < 60) return '${diff.inMinutes}M AGO';
    if (diff.inHours < 24) return '${diff.inHours}H AGO';
    return '${diff.inDays}D AGO';
  }

  String _locationText() {
    final customer = item['customerId'];
    if (customer is Map<String, dynamic>) {
      final district = customer['district']?.toString().trim() ?? '';
      final city = customer['city']?.toString().trim() ?? '';
      if (district.isNotEmpty && city.isNotEmpty) return '$district - $city';
      if (district.isNotEmpty) return district;
      if (city.isNotEmpty) return city;
    }
    return 'Location not provided';
  }

  String _distanceAndLocationText() {
    final location = _locationText();
    final rawDistance =
        item['distanceKm'] ?? item['distance'] ?? item['distance_km'];
    final distance = rawDistance is num
        ? rawDistance.toDouble()
        : double.tryParse(rawDistance?.toString() ?? '');
    if (distance == null) return location;
    return '${distance.toStringAsFixed(1)} km away • $location';
  }

  String _requester() {
    final customer = item['customerId'];
    if (customer is Map<String, dynamic>) {
      final name = customer['name']?.toString().trim() ?? '';
      if (name.isNotEmpty) return name;
    }
    return 'Customer';
  }

  @override
  Widget build(BuildContext context) {
    final title = item['title']?.toString() ?? 'Job request';
    final amount = (item['price'] is num)
        ? item['price'] as num
        : num.tryParse(item['price']?.toString() ?? '0') ?? 0;

    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(24),
      child: InkWell(
        borderRadius: BorderRadius.circular(24),
        onTap: onViewDetails,
        child: Container(
          padding: const EdgeInsets.fromLTRB(18, 18, 18, 16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: const Color(0xFFE4E8EF)),
            boxShadow: const [
              BoxShadow(
                color: Color(0x0A000000),
                blurRadius: 6,
                offset: Offset(0, 2),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      title,
                      style: const TextStyle(
                        color: Color(0xFF141C34),
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                  Text(
                    _timeAgo(item['createdAt']),
                    style: const TextStyle(
                      color: Color(0xFF90A0B9),
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  const Icon(
                    Icons.person_outline_rounded,
                    color: Color(0xFF556783),
                    size: 23,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      _requester(),
                      style: const TextStyle(
                        color: Color(0xFF4B5D77),
                        fontSize: 15.5,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  const Icon(
                    Icons.near_me_outlined,
                    color: Color(0xFF556783),
                    size: 23,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      _distanceAndLocationText(),
                      style: const TextStyle(
                        color: Color(0xFF4B5D77),
                        fontSize: 15.5,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  const Icon(
                    Icons.payments_outlined,
                    color: Color(0xFF16A34A),
                    size: 24,
                  ),
                  const SizedBox(width: 10),
                  Text(
                    'LKR ${_formatMoney(amount)}',
                    style: const TextStyle(
                      color: Color(0xFF141C34),
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: actioning ? null : onReject,
                      borderRadius: BorderRadius.circular(18),
                      child: Container(
                        height: 50,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          border: Border.all(color: const Color(0xFFD3DBE7)),
                          borderRadius: BorderRadius.circular(18),
                        ),
                        child: const Text(
                          'Reject',
                          style: TextStyle(
                            color: Color(0xFF42556F),
                            fontSize: 15.5,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: InkWell(
                      onTap: actioning ? null : onAccept,
                      borderRadius: BorderRadius.circular(18),
                      child: Container(
                        height: 50,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: const Color(0xFF273E99),
                          borderRadius: BorderRadius.circular(18),
                        ),
                        child: actioning
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  valueColor:
                                      AlwaysStoppedAnimation<Color>(Colors.white),
                                ),
                              )
                            : const Text(
                                'Accept',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 15.5,
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
        ),
      ),
    );
  }
}

class _InfoTile extends StatelessWidget {
  const _InfoTile(this.message);

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
