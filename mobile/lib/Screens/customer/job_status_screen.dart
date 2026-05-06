import 'package:flutter/material.dart';

import '../../config/routes.dart';
import '../../services/job_service.dart';
import '../../widgets/customer_bottom_nav.dart';
import '../../widgets/ui_scale.dart';

class JobStatusScreen extends StatefulWidget {
  const JobStatusScreen({super.key});

  @override
  State<JobStatusScreen> createState() => _JobStatusScreenState();
}

class _JobStatusScreenState extends State<JobStatusScreen> {
  final JobService _jobService = JobService();

  int _activeTab = 0;
  bool _loading = true;
  String? _error;
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
      final items = await _jobService.fetchJobs(limit: 100);
      if (!mounted) return;
      setState(() {
        _jobs = items;
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

  @override
  Widget build(BuildContext context) {
    final compactScale = UiScale.factor(context, min: 0.76, max: 0.90);
    final filtered = _jobs
        .map(_toItem)
        .where((job) => job.tab == _activeTab)
        .toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF3F4F7),
      floatingActionButton: _AddButton(
        onTap: () => Navigator.pushNamed(context, AppRoutes.postJob),
      ),
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
                        active: _activeTab,
                        onChanged: (index) =>
                            setState(() => _activeTab = index),
                      ),
                      const SizedBox(height: 12),
                      if (_loading)
                        const _EmptyState(label: 'Loading jobs...')
                      else if (_error != null)
                        _EmptyState(label: _error!)
                      else if (filtered.isEmpty)
                        const _EmptyState()
                      else
                        ...filtered.map(
                          (item) => Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: _JobCard(item: item),
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
      bottomNavigationBar: const CustomerBottomNav(activeIndex: 3),
    );
  }

  _JobItem _toItem(Map<String, dynamic> job) {
    final status = (job['status']?.toString() ?? 'pending').toLowerCase();
    final createdAt = DateTime.tryParse(job['createdAt']?.toString() ?? '');
    final provider = job['providerId'];
    final providerName = provider is Map<String, dynamic>
        ? provider['name']?.toString()
        : null;

    return _JobItem(
      id: job['_id']?.toString() ?? '',
      title: _withLineBreak(job['title']?.toString() ?? 'Untitled Job'),
      amount: 'LKR ${_money(job['price'])}',
      posted: _postedLabel(createdAt),
      tab: _tabForStatus(status),
      statusText: _statusLabel(status),
      statusColor: _statusColor(status),
      statusBg: _statusBg(status),
      providerName: providerName ?? _providerFallback(status),
      providerHint: 'Service Provider',
      avatarBg: const Color(0xFFE7EDF5),
      showMore: status != 'pending',
    );
  }

  int _tabForStatus(String status) {
    if (status == 'completed' || status == 'paid') return 2;
    if (status == 'accepted' || status == 'arrived' || status == 'ongoing') {
      return 1;
    }
    return 0;
  }

  String _statusLabel(String status) {
    switch (status) {
      case 'accepted':
      case 'arrived':
      case 'ongoing':
        return 'ASSIGNED';
      case 'completed':
      case 'paid':
        return 'COMPLETED';
      case 'cancelled':
        return 'CANCELLED';
      default:
        return 'REVIEWING';
    }
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'accepted':
      case 'arrived':
      case 'ongoing':
        return const Color(0xFF2F62D5);
      case 'completed':
      case 'paid':
        return const Color(0xFF16A34A);
      case 'cancelled':
        return const Color(0xFFEF4444);
      default:
        return const Color(0xFFF97316);
    }
  }

  Color _statusBg(String status) {
    switch (status) {
      case 'accepted':
      case 'arrived':
      case 'ongoing':
        return const Color(0xFFDCE8FF);
      case 'completed':
      case 'paid':
        return const Color(0xFFDDF3E4);
      case 'cancelled':
        return const Color(0xFFFEE2E2);
      default:
        return const Color(0xFFFBE9D8);
    }
  }

  String _providerFallback(String status) {
    if (_tabForStatus(status) == 0) return 'Finding matches...';
    return 'Assigned provider';
  }

  String _money(dynamic value) {
    final amount = (value is num) ? value : num.tryParse(value?.toString() ?? '0') ?? 0;
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
    final diff = DateTime.now().difference(createdAt);
    if (diff.inMinutes < 60) return 'Posted ${diff.inMinutes}m ago';
    if (diff.inHours < 24) return 'Posted ${diff.inHours}h ago';
    if (diff.inDays == 1) return 'Posted Yesterday';
    return 'Posted ${diff.inDays} days ago';
  }

  String _withLineBreak(String title) {
    final words = title.split(' ');
    if (words.length <= 2) return title;
    final midpoint = (words.length / 2).ceil();
    return '${words.sublist(0, midpoint).join(' ')}\n${words.sublist(midpoint).join(' ')}';
  }
}

class _TopBar extends StatelessWidget {
  const _TopBar();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 64,
      padding: const EdgeInsets.fromLTRB(18, 12, 18, 12),
      decoration: const BoxDecoration(
        color: Color(0xFFF8F9FB),
        border: Border(bottom: BorderSide(color: Color(0xFFE1E6EE))),
      ),
      alignment: Alignment.centerLeft,
      child: const Text(
        'My Jobs',
        style: TextStyle(
          color: Color(0xFF121C33),
          fontSize: 19,
          fontWeight: FontWeight.w800,
          letterSpacing: -0.2,
        ),
      ),
    );
  }
}

class _Tabs extends StatelessWidget {
  const _Tabs({required this.active, required this.onChanged});

  final int active;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 54,
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: const Color(0xFFE7ECF4),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        children: [
          _tab('Pending', 0),
          _tab('Ongoing', 1),
          _tab('Completed', 2),
        ],
      ),
    );
  }

  Widget _tab(String text, int index) {
    final selected = active == index;
    return Expanded(
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: () => onChanged(index),
        child: Container(
          decoration: BoxDecoration(
            color: selected ? Colors.white : Colors.transparent,
            borderRadius: BorderRadius.circular(14),
          ),
          alignment: Alignment.center,
          child: Text(
            text,
            style: TextStyle(
              color: selected
                  ? const Color(0xFF141C34)
                  : const Color(0xFF6B7C95),
              fontSize: 15.5,
              fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
            ),
          ),
        ),
      ),
    );
  }
}

class _JobCard extends StatelessWidget {
  const _JobCard({required this.item});

  final _JobItem item;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
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
                  style: const TextStyle(
                    color: Color(0xFF141C34),
                    fontSize: 15.5,
                    fontWeight: FontWeight.w800,
                    height: 1.15,
                    letterSpacing: -0.2,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 7,
                ),
                decoration: BoxDecoration(
                  color: item.statusBg,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Text(
                  item.statusText,
                  style: TextStyle(
                    color: item.statusColor,
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.6,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          RichText(
            text: TextSpan(
              style: const TextStyle(
                color: Color(0xFF6E7F98),
                fontSize: 12.5,
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
                const TextSpan(text: '  •  '),
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
            child: Row(
              children: [
                CircleAvatar(
                  radius: 22,
                  backgroundColor: item.avatarBg,
                  child: Icon(
                    item.providerName == 'Finding matches...'
                        ? Icons.person_search_rounded
                        : Icons.person,
                    color: const Color(0xFF8EA0B8),
                    size: 23,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item.providerHint,
                        style: const TextStyle(
                          color: Color(0xFF6A7A93),
                          fontSize: 12.5,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      Text(
                        item.providerName,
                        style: TextStyle(
                          color: item.providerName == 'Finding matches...'
                              ? const Color(0xFF8EA0B8)
                              : const Color(0xFF141C34),
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ),
                ),
                if (item.providerName != 'Finding matches...')
                  const Icon(
                    Icons.chat_bubble_outline_rounded,
                    color: Color(0xFF5A6A84),
                    size: 28,
                  ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: InkWell(
                  borderRadius: BorderRadius.circular(18),
                  onTap: () => Navigator.pushNamed(
                    context,
                    AppRoutes.review,
                    arguments: item.id,
                  ),
                  child: Container(
                    height: 54,
                    decoration: BoxDecoration(
                      color: const Color(0xFF273D98),
                      borderRadius: BorderRadius.circular(18),
                    ),
                    alignment: Alignment.center,
                    child: const Text(
                      'View Details',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 16.5,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
              ),
              if (item.showMore) ...[
                const SizedBox(width: 10),
                Container(
                  width: 64,
                  height: 54,
                  decoration: BoxDecoration(
                    color: const Color(0xFFF0F3F8),
                    borderRadius: BorderRadius.circular(18),
                  ),
                  alignment: Alignment.center,
                  child: const Icon(
                    Icons.more_horiz_rounded,
                    color: Color(0xFF5F708A),
                    size: 30,
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}

class _AddButton extends StatelessWidget {
  const _AddButton({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(22),
      child: Container(
        width: 54,
        height: 54,
        decoration: BoxDecoration(
          color: const Color(0xFF273D98),
          borderRadius: BorderRadius.circular(22),
          boxShadow: const [
            BoxShadow(
              color: Color(0x33000000),
              blurRadius: 14,
              offset: Offset(0, 8),
            ),
          ],
        ),
        alignment: Alignment.center,
        child: const Icon(Icons.add, color: Colors.white, size: 38),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({this.label = 'No jobs in this tab yet.'});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 30),
      alignment: Alignment.center,
      child: Text(
        label,
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

class _JobItem {
  const _JobItem({
    required this.id,
    required this.title,
    required this.amount,
    required this.posted,
    required this.tab,
    required this.statusText,
    required this.statusColor,
    required this.statusBg,
    required this.providerName,
    required this.providerHint,
    required this.avatarBg,
    required this.showMore,
  });

  final String id;
  final String title;
  final String amount;
  final String posted;
  final int tab;
  final String statusText;
  final Color statusColor;
  final Color statusBg;
  final String providerName;
  final String providerHint;
  final Color avatarBg;
  final bool showMore;
}
