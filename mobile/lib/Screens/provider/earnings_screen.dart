import 'package:flutter/material.dart';

import '../../services/provider_service.dart';
import '../../widgets/provider_bottom_nav.dart';
import '../../widgets/shimmer_skeleton.dart';
import '../../widgets/ui_scale.dart';

class EarningsScreen extends StatefulWidget {
  const EarningsScreen({super.key});

  @override
  State<EarningsScreen> createState() => _EarningsScreenState();
}

class _EarningsScreenState extends State<EarningsScreen> {
  final ProviderService _providerService = ProviderService();

  bool _loading = true;
  String? _error;
  Map<String, dynamic> _summary = <String, dynamic>{};
  List<Map<String, dynamic>> _entries = <Map<String, dynamic>>[];
  int _completedJobs = 0;
  int _periodMonths = 6;

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
      final results = await Future.wait<dynamic>([
        _providerService.getProviderEarnings(limit: 40, periodMonths: _periodMonths),
        _providerService.getProviderDashboard(),
      ]);

      final earnings = (results[0] as Map<String, dynamic>?) ?? <String, dynamic>{};
      final summary = (earnings['summary'] as Map<String, dynamic>?) ?? <String, dynamic>{};
      final list = (earnings['list'] as List?)
              ?.whereType<Map<String, dynamic>>()
              .toList() ??
          <Map<String, dynamic>>[];
      final dashboard = (results[1] as Map<String, dynamic>?) ?? <String, dynamic>{};

      if (!mounted) return;
      setState(() {
        _summary = summary;
        _entries = list;
        _completedJobs = _asInt(dashboard['completed']);
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

  Future<void> _openFilters() async {
    final selected = await showModalBottomSheet<int>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => _FilterSheet(currentPeriod: _periodMonths),
    );

    if (selected != null && selected != _periodMonths) {
      setState(() {
        _periodMonths = selected;
      });
      _load();
    }
  }

  int _asInt(dynamic value) {
    if (value is int) return value;
    if (value is num) return value.round();
    return int.tryParse(value?.toString() ?? '0') ?? 0;
  }

  double _asDouble(dynamic value) {
    if (value is double) return value;
    if (value is num) return value.toDouble();
    return double.tryParse(value?.toString() ?? '0') ?? 0;
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

  @override
  Widget build(BuildContext context) {
    final compactScale = UiScale.factor(context, min: 0.76, max: 0.90);
    final lifetime = _asDouble(_summary['lifetime']);
    final monthly = _asDouble(_summary['monthly']);
    final growth = _asDouble(_summary['monthlyGrowthPercent']);
    final latestAdded = _asDouble(_summary['latestAddedAmount']);
    final trend = (_summary['trend'] as List?)
            ?.whereType<Map<String, dynamic>>()
            .toList() ??
        <Map<String, dynamic>>[];

    final totalEarningsVal = _entries.fold<double>(0.0, (sum, item) => sum + _asDouble(item['amount']));
    final avgJobValue = _entries.isNotEmpty ? totalEarningsVal / _entries.length : 0.0;

    return Scaffold(
      backgroundColor: const Color(0xFFF3F4F7),
      body: SafeArea(
        child: MediaQuery(
          data: MediaQuery.of(context).copyWith(
            textScaler: TextScaler.linear(compactScale),
          ),
          child: Column(
            children: [
              _Header(
                onFilterTap: _openFilters,
              ),
              Expanded(
                child: RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.fromLTRB(18, 12, 18, 16),
                    children: [
                      if (_loading)
                        const _EarningsSkeleton()
                      else if (_error != null)
                        _InfoTile(message: _error!)
                      else ...[
                        _TotalCard(
                          lifetime: 'LKR ${_formatMoney(lifetime)}',
                          growthLabel: growth != 0 ? '${growth >= 0 ? '+' : ''}${growth.toStringAsFixed(1)}%' : '',
                          lastAdded: latestAdded > 0 ? 'LKR ${_formatMoney(latestAdded)}' : '',
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: _SmallStatsCard(
                                title: 'Monthly Earnings',
                                value: 'LKR ${_formatMoney(monthly)}',
                                subtitle: 'Last 30 days revenue',
                                icon: Icons.calendar_month_rounded,
                                iconColor: const Color(0xFF3B82F6),
                                iconBg: const Color(0xFFDBEAFE),
                                growthLabel: growth != 0 ? '${growth >= 0 ? '+' : ''}${growth.toStringAsFixed(1)}%' : null,
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: _SmallStatsCard(
                                title: 'Completed Jobs',
                                value: _completedJobs.toString(),
                                subtitle: 'Total billable services',
                                icon: Icons.task_alt_rounded,
                                iconColor: const Color(0xFF10B981),
                                iconBg: const Color(0xFFD1FAE5),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        _SmallStatsCard(
                          title: 'Avg. Job Value',
                          value: 'LKR ${_formatMoney(avgJobValue)}',
                          subtitle: 'Revenue per project average',
                          icon: Icons.analytics_rounded,
                          iconColor: const Color(0xFFF59E0B),
                          iconBg: const Color(0xFFFEF3C7),
                        ),
                        const SizedBox(height: 12),
                        _MonthlyCard(
                          trend: trend,
                          currentMonth: 'LKR ${_formatMoney(monthly)}',
                          jobsCompleted: _completedJobs.toString(),
                        ),
                        const SizedBox(height: 14),
                        const _SectionTitle('Earnings History', 'View All'),
                        const SizedBox(height: 10),
                        if (_entries.isEmpty)
                          const _InfoTile(message: 'No earnings history yet.')
                        else
                          ..._entries.take(8).map(
                            (entry) => Padding(
                              padding: const EdgeInsets.only(bottom: 10),
                              child: _Entry(entry: entry),
                            ),
                          ),
                        const SizedBox(height: 86),
                      ],
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
      bottomNavigationBar: const ProviderBottomNav(activeIndex: 3),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.onFilterTap});

  final VoidCallback onFilterTap;

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
            onTap: () => Navigator.maybePop(context),
            child: const SizedBox(
              width: 40,
              height: 40,
              child: Icon(Icons.arrow_back_rounded, color: Color(0xFF1A2940), size: 30),
            ),
          ),
          const SizedBox(width: 6),
          const Expanded(
            child: Text(
              'My Earnings',
              style: TextStyle(
                color: Color(0xFF141C34),
                fontSize: 19,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
          InkWell(
            borderRadius: BorderRadius.circular(20),
            onTap: onFilterTap,
            child: const SizedBox(
              width: 40,
              height: 40,
              child: Icon(Icons.tune_rounded, color: Color(0xFF1A2940), size: 25),
            ),
          ),
        ],
      ),
    );
  }
}

class _TotalCard extends StatelessWidget {
  const _TotalCard({
    required this.lifetime,
    required this.growthLabel,
    required this.lastAdded,
  });

  final String lifetime;
  final String growthLabel;
  final String lastAdded;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF3B5CCC), Color(0xFF1E3A8A)],
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x33345DCC),
            blurRadius: 18,
            offset: Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Total Lifetime Earnings',
                style: TextStyle(
                  color: Color(0xFFD8E2FF),
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                ),
              ),
              if (growthLabel.isNotEmpty)
                DecoratedBox(
                  decoration: const BoxDecoration(
                    color: Color(0x22FFFFFF),
                    borderRadius: BorderRadius.all(Radius.circular(999)),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 4,
                    ),
                    child: Text(
                      growthLabel,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            lifetime,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 30,
              fontWeight: FontWeight.w800,
            ),
          ),
          if (lastAdded.isNotEmpty) ...[
            const SizedBox(height: 14),
            Text(
              'Last added $lastAdded',
              style: const TextStyle(
                color: Color(0xFFAEC2F8),
                fontSize: 11.5,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _SmallStatsCard extends StatelessWidget {
  const _SmallStatsCard({
    required this.title,
    required this.value,
    required this.subtitle,
    required this.icon,
    required this.iconColor,
    required this.iconBg,
    this.growthLabel,
  });

  final String title;
  final String value;
  final String subtitle;
  final IconData icon;
  final Color iconColor;
  final Color iconBg;
  final String? growthLabel;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE7EBF2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  title.toUpperCase(),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Color(0xFF8EA0B8),
                    fontSize: 10.5,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.8,
                  ),
                ),
              ),
              if (growthLabel != null) ...[
                const SizedBox(width: 4),
                Text(
                  growthLabel!,
                  style: const TextStyle(
                    color: Color(0xFF16A34A),
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 8),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: Color(0xFF141C34),
              fontSize: 18,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: iconBg,
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, color: iconColor, size: 16),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  subtitle,
                  style: const TextStyle(
                    color: Color(0xFF6E7F98),
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _MonthlyCard extends StatelessWidget {
  const _MonthlyCard({
    required this.trend,
    required this.currentMonth,
    required this.jobsCompleted,
  });

  final List<Map<String, dynamic>> trend;
  final String currentMonth;
  final String jobsCompleted;

  @override
  Widget build(BuildContext context) {
    final maxValue = _maxTrendAmount(trend);

    return Container(
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFE7EBF2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Text(
                'Monthly Performance',
                style: TextStyle(
                  color: Color(0xFF141C34),
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                ),
              ),
              Spacer(),
              Text(
                'Details',
                style: TextStyle(
                  color: Color(0xFF3D5FD2),
                  fontSize: 13.5,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Container(
            height: 120,
            decoration: BoxDecoration(
              color: const Color(0xFFF2F5FA),
              borderRadius: BorderRadius.circular(14),
            ),
            alignment: Alignment.bottomCenter,
            padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                for (int i = 0; i < trend.length; i++) ...[
                  _Bar(
                    h: _heightForAmount(trend[i]['amount'], maxValue),
                    active: i == trend.length - 1,
                  ),
                  if (i < trend.length - 1) const SizedBox(width: 6),
                ],
                if (trend.isEmpty) const Expanded(child: _Bar(h: 40, active: true)),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: trend
                .map(
                  (item) => Text(
                    item['label']?.toString() ?? '-',
                    style: TextStyle(
                      color: item == trend.last
                          ? const Color(0xFF3D5FD2)
                          : const Color(0xFF8EA0B8),
                      fontWeight: item == trend.last ? FontWeight.w700 : FontWeight.w500,
                    ),
                  ),
                )
                .toList(),
          ),
          const SizedBox(height: 10),
          const Divider(color: Color(0xFFE8EDF4), height: 1),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: _Metric(title: 'CURRENT MONTH', value: currentMonth),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _Metric(title: 'JOBS COMPLETED', value: jobsCompleted, alignEnd: true),
              ),
            ],
          ),
        ],
      ),
    );
  }

  double _maxTrendAmount(List<Map<String, dynamic>> items) {
    double max = 0;
    for (final item in items) {
      final value = item['amount'];
      final amount = (value is num)
          ? value.toDouble()
          : double.tryParse(value?.toString() ?? '0') ?? 0;
      if (amount > max) max = amount;
    }
    return max <= 0 ? 1 : max;
  }

  double _heightForAmount(dynamic raw, double max) {
    final amount = (raw is num)
        ? raw.toDouble()
        : double.tryParse(raw?.toString() ?? '0') ?? 0;
    final minBar = 34.0;
    final maxBar = 98.0;
    final ratio = (amount / max).clamp(0, 1);
    return minBar + ((maxBar - minBar) * ratio);
  }
}

class _Bar extends StatelessWidget {
  const _Bar({required this.h, this.active = false});

  final double h;
  final bool active;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        height: h,
        decoration: BoxDecoration(
          color: active ? const Color(0xFF3D5FD2) : const Color(0xFFDDE4EF),
          borderRadius: BorderRadius.circular(9),
        ),
      ),
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric({required this.title, required this.value, this.alignEnd = false});

  final String title;
  final String value;
  final bool alignEnd;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: alignEnd ? CrossAxisAlignment.end : CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            color: Color(0xFF8EA0B8),
            fontSize: 11.5,
            fontWeight: FontWeight.w800,
            letterSpacing: 1.2,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(
            color: Color(0xFF141C34),
            fontSize: 18,
            fontWeight: FontWeight.w800,
          ),
        ),
      ],
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.title, this.action);

  final String title;
  final String action;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Text(
          title,
          style: const TextStyle(
            color: Color(0xFF131E35),
            fontSize: 19,
            fontWeight: FontWeight.w800,
          ),
        ),
        const Spacer(),
        Text(
          action,
          style: const TextStyle(
            color: Color(0xFF3D5FD2),
            fontSize: 13.5,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }
}

class _Entry extends StatelessWidget {
  const _Entry({required this.entry});

  final Map<String, dynamic> entry;

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

  String _dateLabel(String? raw) {
    final date = DateTime.tryParse(raw ?? '');
    if (date == null) return 'Recent';
    const months = <String>['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    final month = months[(date.month - 1).clamp(0, 11)];
    return '${date.day} $month';
  }

  IconData _iconForTitle(String title) {
    final lower = title.toLowerCase();
    if (lower.contains('plumb')) return Icons.plumbing_rounded;
    if (lower.contains('ac') || lower.contains('fan')) return Icons.ac_unit_rounded;
    if (lower.contains('clean')) return Icons.cleaning_services_rounded;
    if (lower.contains('electric')) return Icons.electrical_services_rounded;
    return Icons.build_rounded;
  }

  @override
  Widget build(BuildContext context) {
    final title = entry['jobTitle']?.toString() ?? 'Service Payment';
    final amountValue = (entry['amount'] is num)
        ? entry['amount'] as num
        : num.tryParse(entry['amount']?.toString() ?? '0') ?? 0;
    final amount = 'LKR ${_formatMoney(amountValue)}';
    final date = _dateLabel(entry['createdAt']?.toString());
    final id = entry['_id']?.toString() ?? '--';

    return Container(
      padding: const EdgeInsets.all(13),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE7EBF2)),
      ),
      child: Row(
        children: [
          Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(
              color: const Color(0xFFE8EDF7),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(_iconForTitle(title), color: const Color(0xFF3F5DD0)),
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
                    fontSize: 16.5,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '$date - ID: #${id.length > 6 ? id.substring(id.length - 6) : id}',
                  style: const TextStyle(
                    color: Color(0xFF8EA0B8),
                    fontSize: 12.5,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                amount,
                style: const TextStyle(
                  color: Color(0xFF141C34),
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 3),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFFDDF3E4),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: const Text(
                  'COMPLETED',
                  style: TextStyle(
                    color: Color(0xFF159D50),
                    fontSize: 11.5,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
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

class _EarningsSkeleton extends StatelessWidget {
  const _EarningsSkeleton();

  @override
  Widget build(BuildContext context) {
    return ShimmerContainer(
      child: Column(
        children: [
          ShimmerBox(height: 130, borderRadius: BorderRadius.circular(20)),
          const SizedBox(height: 12),
          ShimmerBox(height: 200, borderRadius: BorderRadius.circular(20)),
          const SizedBox(height: 14),
          Row(
            children: [
              ShimmerBox(height: 22, width: 130, borderRadius: BorderRadius.circular(8)),
              const Spacer(),
              ShimmerBox(height: 18, width: 60, borderRadius: BorderRadius.circular(8)),
            ],
          ),
          const SizedBox(height: 10),
          ...List.generate(
            4,
            (_) => Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: ShimmerBox(height: 72, borderRadius: BorderRadius.circular(16)),
            ),
          ),
          const SizedBox(height: 86),
        ],
      ),
    );
  }
}

class _FilterSheet extends StatelessWidget {
  const _FilterSheet({required this.currentPeriod});

  final int currentPeriod;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Container(
        margin: const EdgeInsets.all(16),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(22),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.08),
              blurRadius: 16,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: const BoxDecoration(
                    color: Color(0xFFEFF3FF),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.tune_rounded, color: Color(0xFF2F4DA0), size: 20),
                ),
                const SizedBox(width: 10),
                const Text(
                  'Filter Earnings',
                  style: TextStyle(
                    color: Color(0xFF121C33),
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            const Text(
              'SELECT PERIOD',
              style: TextStyle(
                color: Color(0xFF8EA0B8),
                fontSize: 11,
                fontWeight: FontWeight.w800,
                letterSpacing: 1.1,
              ),
            ),
            const SizedBox(height: 12),
            _PeriodItem(
              label: '6 Months',
              value: 6,
              selected: currentPeriod == 6,
            ),
            const SizedBox(height: 8),
            _PeriodItem(
              label: '1 Year (12 Months)',
              value: 12,
              selected: currentPeriod == 12,
            ),
          ],
        ),
      ),
    );
  }
}

class _PeriodItem extends StatelessWidget {
  const _PeriodItem({
    required this.label,
    required this.value,
    required this.selected,
  });

  final String label;
  final int value;
  final bool selected;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () => Navigator.pop(context, value),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        decoration: BoxDecoration(
          color: selected ? const Color(0xFFEFF3FF) : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: selected ? const Color(0xFF2F4DA0) : const Color(0xFFE2E8F0),
            width: selected ? 1.5 : 1,
          ),
        ),
        child: Row(
          children: [
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  color: selected ? const Color(0xFF2F4DA0) : const Color(0xFF1A2940),
                  fontSize: 14.5,
                  fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
                ),
              ),
            ),
            if (selected)
              const Icon(
                Icons.check_circle_rounded,
                color: Color(0xFF2F4DA0),
                size: 20,
              ),
          ],
        ),
      ),
    );
  }
}
