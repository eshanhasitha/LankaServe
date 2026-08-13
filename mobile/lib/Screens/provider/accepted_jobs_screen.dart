import 'package:flutter/material.dart';

import '../../config/routes.dart';
import '../../services/provider_service.dart';
import '../../widgets/provider_bottom_nav.dart';
import '../../widgets/shimmer_skeleton.dart';
import '../../widgets/ui_scale.dart';

class AcceptedJobsScreen extends StatefulWidget {
  const AcceptedJobsScreen({super.key});

  @override
  State<AcceptedJobsScreen> createState() => _AcceptedJobsScreenState();
}

class _AcceptedJobsScreenState extends State<AcceptedJobsScreen> {
  final ProviderService _providerService = ProviderService();

  int _activeTab = 0; //  0=accepted, 1=ongoing, 2=completed
  bool _loading = true;
  String? _error;
  List<Map<String, dynamic>> _jobs = <Map<String, dynamic>>[];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final items = await _providerService.getProviderJobs(
        status: 'accepted,arrived,ongoing,completed,paid',
        limit: 40,
      );

      items.sort((a, b) {
        final da =
            DateTime.tryParse(a['updatedAt']?.toString() ?? '') ??
            DateTime.fromMillisecondsSinceEpoch(0);
        final db =
            DateTime.tryParse(b['updatedAt']?.toString() ?? '') ??
            DateTime.fromMillisecondsSinceEpoch(0);
        return db.compareTo(da);
      });

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

  bool _belongsToCurrentTab(Map<String, dynamic> job) {
    final status = job['status']?.toString().toLowerCase() ?? '';
    switch (_activeTab) {
      case 0:
        return status == 'accepted';
      case 1:
        return status == 'arrived' || status == 'ongoing';
      case 2:
        return status == 'completed' || status == 'paid';
      default:
        return true;
    }
  }

  List<Map<String, dynamic>> get _filteredJobs =>
      _jobs.where(_belongsToCurrentTab).toList();

  void _openDetails(Map<String, dynamic> job) {
    final id = job['_id']?.toString() ?? '';
    if (id.isEmpty) return;
    Navigator.pushNamed(context, AppRoutes.qrDisplay, arguments: id);
  }

  void _openCustomerChat(Map<String, dynamic> job) {
    final customer = job['customerId'];
    String customerId = '';
    String customerName = 'Customer';
    String customerAvatar = '';

    if (customer is Map<String, dynamic>) {
      customerId =
          customer['_id']?.toString() ?? customer['id']?.toString() ?? '';
      final userId = customer['userId'];
      if (customerId.isEmpty && userId is Map<String, dynamic>) {
        customerId = userId['_id']?.toString() ?? '';
      }
      if (customerId.isEmpty && userId is String) {
        customerId = userId;
      }
      customerName = customer['name']?.toString().trim().isNotEmpty == true
          ? customer['name'].toString().trim()
          : 'Customer';
      customerAvatar = customer['profileImage']?.toString() ?? '';
    } else if (customer is String && customer.trim().isNotEmpty) {
      customerId = customer;
    }

    if (customerId.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Customer info unavailable.')),
      );
      return;
    }

    Navigator.pushNamed(
      context,
      AppRoutes.chatConversation,
      arguments: {
        'counterpartId': customerId,
        'counterpartName': customerName,
        'counterpartAvatar': customerAvatar,
        'isProvider': false,
        if ((job['_id']?.toString() ?? '').isNotEmpty)
          'jobId': job['_id'].toString(),
      },
    );
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
                child: RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.fromLTRB(24, 14, 24, 16),
                    children: [
                      _JobsTabs(
                        activeTab: _activeTab,
                        onTabChanged: (idx) => setState(() => _activeTab = idx),
                      ),
                      const SizedBox(height: 16),
                      if (_loading)
                        const _AcceptedJobsSkeleton()
                      else if (_error != null)
                        _InfoTile(message: _error!)
                      else if (_filteredJobs.isEmpty)
                        const _InfoTile(message: 'No jobs in this tab.')
                      else
                        ..._filteredJobs.map(
                          (job) => Padding(
                            padding: const EdgeInsets.only(bottom: 14),
                            child: _JobCard(
                              job: job,
                              onViewDetails: () => _openDetails(job),
                              onChatTap: () {
                                _openCustomerChat(job);
                              },
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
      bottomNavigationBar: const ProviderBottomNav(activeIndex: 2),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 64,
      padding: const EdgeInsets.fromLTRB(24, 10, 24, 10),
      decoration: const BoxDecoration(
        color: Color(0xFFF8F9FB),
        border: Border(bottom: BorderSide(color: Color(0xFFE1E6EE))),
      ),
      alignment: Alignment.centerLeft,
      child: const Text(
        'My Jobs',
        style: TextStyle(
          color: Color(0xFF141C34),
          fontSize: 19,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}

class _JobsTabs extends StatelessWidget {
  const _JobsTabs({required this.activeTab, required this.onTabChanged});

  final int activeTab;
  final ValueChanged<int> onTabChanged;

  static const List<String> _tabsList = ['Accepted', 'Ongoing', 'Completed'];

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 48,
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: Color(0xFFE1E8F3))),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: List.generate(_tabsList.length, (index) {
          final tab = _tabsList[index];
          final selected = index == activeTab;
          return Expanded(
            child: InkWell(
              onTap: () => onTabChanged(index),
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
        }),
      ),
    );
  }
}

class _JobCard extends StatelessWidget {
  const _JobCard({
    required this.job,
    required this.onViewDetails,
    required this.onChatTap,
  });

  final Map<String, dynamic> job;
  final VoidCallback onViewDetails;
  final VoidCallback onChatTap;

  int _asInt(dynamic value) {
    if (value is int) return value;
    if (value is num) return value.round();
    return int.tryParse(value?.toString() ?? '0') ?? 0;
  }

  String _formatMoney(num value) {
    final rounded = value.round().toString();
    final buffer = StringBuffer();
    for (int i = 0; i < rounded.length; i++) {
      final reverseIndex = rounded.length - i;
      buffer.write(rounded[i]);
      if (reverseIndex > 1 && reverseIndex % 3 == 1) {
        buffer.write(',');
      }
    }
    return buffer.toString();
  }

  String _statusLabel() {
    final status = job['status']?.toString().toLowerCase() ?? '';
    switch (status) {
      case 'accepted':
        return 'ASSIGNED';
      case 'arrived':
      case 'ongoing':
        return 'ONGOING';
      case 'completed':
      case 'paid':
        return 'COMPLETED';
      default:
        return status.toUpperCase();
    }
  }

  Color _statusBg() {
    final status = job['status']?.toString().toLowerCase() ?? '';
    if (status == 'completed' || status == 'paid') {
      return const Color(0xFFDDF3E4);
    }
    return const Color(0xFFE8EEFA);
  }

  Color _statusFg() {
    final status = job['status']?.toString().toLowerCase() ?? '';
    if (status == 'completed' || status == 'paid') {
      return const Color(0xFF159D50);
    }
    return const Color(0xFF3F5DD0);
  }

  String _customerName() {
    final customer = job['customerId'];
    if (customer is Map<String, dynamic>) {
      final name = customer['name']?.toString().trim() ?? '';
      if (name.isNotEmpty) return name;
    }
    return 'Customer';
  }

  String _customerAvatarUrl() {
    final customer = job['customerId'];
    if (customer is Map<String, dynamic>) {
      return customer['profileImage']?.toString() ?? '';
    }
    return '';
  }

  String _postedLabel() {
    final raw = job['createdAt']?.toString() ?? '';
    final date = DateTime.tryParse(raw);
    if (date == null) return 'Posted recently';
    final diff = DateTime.now().difference(date);
    if (diff.inMinutes < 60) return 'Posted ${diff.inMinutes}m ago';
    if (diff.inHours < 24) return 'Posted ${diff.inHours}h ago';
    return 'Posted ${diff.inDays} days ago';
  }

  @override
  Widget build(BuildContext context) {
    final title = job['title']?.toString() ?? 'Job';
    final amount = _asInt(job['price']);
    final avatarUrl = _customerAvatarUrl();

    return Container(
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE6EAF1)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0A000000),
            blurRadius: 8,
            offset: Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    color: Color(0xFF141C34),
                    fontSize: 15.5,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: _statusBg(),
                  borderRadius: BorderRadius.circular(13),
                ),
                child: Text(
                  _statusLabel(),
                  style: TextStyle(
                    color: _statusFg(),
                    fontSize: 9.5,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Text(
                'LKR ${_formatMoney(amount)}',
                style: const TextStyle(
                  color: Color(0xFF141C34),
                  fontSize: 15.5,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(width: 10),
              const Text(
                '•',
                style: TextStyle(
                  color: Color(0xFF9AA8BC),
                  fontSize: 15.5,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  _postedLabel(),
                  style: const TextStyle(
                    color: Color(0xFF6E7F98),
                    fontSize: 11.5,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
            decoration: BoxDecoration(
              color: const Color(0xFFF3F6FB),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: const Color(0xFFE8EDF5),
                    shape: BoxShape.circle,
                    image: avatarUrl.isNotEmpty
                        ? DecorationImage(
                            image: NetworkImage(avatarUrl),
                            fit: BoxFit.cover,
                          )
                        : null,
                  ),
                  child: avatarUrl.isEmpty
                      ? const Icon(
                          Icons.person_outline_rounded,
                          color: Color(0xFF8EA0B8),
                          size: 24,
                        )
                      : null,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'User',
                        style: TextStyle(
                          color: Color(0xFF7A8CA7),
                          fontSize: 10.5,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 1),
                      Text(
                        _customerName(),
                        style: const TextStyle(
                          color: Color(0xFF1A243C),
                          fontSize: 14.5,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ),
                ),
                InkWell(
                  onTap: onChatTap,
                  borderRadius: BorderRadius.circular(12),
                  child: const Padding(
                    padding: EdgeInsets.all(6),
                    child: Icon(
                      Icons.chat_bubble_outline_rounded,
                      color: Color(0xFF5E6F88),
                      size: 26,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          InkWell(
            onTap: onViewDetails,
            borderRadius: BorderRadius.circular(24),
            child: Container(
              height: 46,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: const Color(0xFF273E99),
                borderRadius: BorderRadius.circular(16),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x1E273E99),
                    blurRadius: 10,
                    offset: Offset(0, 4),
                  ),
                ],
              ),
              child: const Text(
                'View Details',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _InfoTile extends StatelessWidget {
  const _InfoTile({required this.message});

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

class _AcceptedJobsSkeleton extends StatelessWidget {
  const _AcceptedJobsSkeleton();

  @override
  Widget build(BuildContext context) {
    return ShimmerContainer(
      child: Column(
        children: [
          ...List.generate(
            3,
            (_) => Padding(
              padding: const EdgeInsets.only(bottom: 14),
              child: ShimmerBox(
                height: 180,
                borderRadius: BorderRadius.circular(20),
              ),
            ),
          ),
          const SizedBox(height: 86),
        ],
      ),
    );
  }
}
