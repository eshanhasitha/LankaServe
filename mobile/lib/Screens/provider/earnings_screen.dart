import 'package:flutter/material.dart';

import '../../services/provider_service.dart';
import '../../widgets/provider_bottom_nav.dart';
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
        _providerService.getProviderEarnings(limit: 40, periodMonths: 6),
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
    final trend = (_summary['trend'] as List?)
            ?.whereType<Map<String, dynamic>>()
            .toList() ??
        <Map<String, dynamic>>[];

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
                  onRefresh: _load,
                  child: ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.fromLTRB(18, 12, 18, 16),
                    children: [
                      if (_loading)
                        const Padding(
                          padding: EdgeInsets.only(top: 80),
                          child: Center(
                            child: CircularProgressIndicator(color: Color(0xFF273D98)),
                          ),
                        )
                      else if (_error != null)
                        _InfoTile(message: _error!)
                      else ...[
                        _TotalCard(
                          lifetime: 'LKR ${_formatMoney(lifetime)}',
                          growthLabel: '${growth >= 0 ? '+' : ''}${growth.toStringAsFixed(1)}% from last month',
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
            onTap: () {},
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
  const _TotalCard({required this.lifetime, required this.growthLabel});

  final String lifetime;
  final String growthLabel;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF4365D8), Color(0xFF2E4CAD)],
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Total Lifetime Earnings',
            style: TextStyle(
              color: Color(0xFFD8E2FF),
              fontSize: 14,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            lifetime,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 34,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 14),
          DecoratedBox(
            decoration: const BoxDecoration(
              color: Color(0x33FFFFFF),
              borderRadius: BorderRadius.all(Radius.circular(999)),
            ),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              child: Text(
                growthLabel,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 13,
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
