import 'package:flutter/material.dart';

import '../../services/notification_service.dart';
import '../../widgets/customer_bottom_nav.dart';
import '../../widgets/provider_bottom_nav.dart';
import '../../widgets/ui_scale.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final NotificationService _notificationService = NotificationService();

  bool _loadedArgs = false;
  bool _fromProvider = false;
  bool _loading = true;
  String? _error;
  List<Map<String, dynamic>> _items = <Map<String, dynamic>>[];

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_loadedArgs) return;
    _loadedArgs = true;
    final args = ModalRoute.of(context)?.settings.arguments;
    if (args is Map<String, dynamic> && args['fromProvider'] == true) {
      _fromProvider = true;
    }
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final items = await _notificationService.fetchNotifications();
      if (!mounted) return;
      setState(() => _items = items);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _markRead(String id) async {
    if (id.isEmpty) return;
    try {
      await _notificationService.markAsRead(id);
      if (!mounted) return;
      setState(() {
        for (final item in _items) {
          if (item['_id']?.toString() == id) {
            item['isRead'] = true;
          }
        }
      });
    } catch (_) {}
  }

  Future<void> _markAllRead() async {
    final unread = _items
        .where((item) => item['isRead'] != true)
        .map((item) => item['_id']?.toString() ?? '')
        .where((id) => id.isNotEmpty)
        .toList();

    for (final id in unread) {
      await _markRead(id);
    }
  }

  IconData _iconForType(String type) {
    switch (type) {
      case 'job':
        return Icons.work_outline_rounded;
      case 'payment':
        return Icons.payments_rounded;
      case 'offer':
        return Icons.local_offer_outlined;
      default:
        return Icons.notifications_none_rounded;
    }
  }

  Color _iconBgForType(String type) {
    switch (type) {
      case 'job':
        return const Color(0xFFE8EEFA);
      case 'payment':
        return const Color(0xFFF8EFE3);
      case 'offer':
        return const Color(0xFFE8F3EC);
      default:
        return const Color(0xFFEFF2F7);
    }
  }

  Color _iconColorForType(String type) {
    switch (type) {
      case 'job':
        return const Color(0xFF3D5FD2);
      case 'payment':
        return const Color(0xFFF97316);
      case 'offer':
        return const Color(0xFF16A34A);
      default:
        return const Color(0xFF5F6F88);
    }
  }

  String _timeLabel(dynamic raw) {
    final date = DateTime.tryParse(raw?.toString() ?? '');
    if (date == null) return '';
    final diff = DateTime.now().difference(date);
    if (diff.inMinutes < 1) return 'Now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m';
    if (diff.inHours < 24) return '${diff.inHours}h';
    if (diff.inDays < 7) return '${diff.inDays}d';
    return '${date.day}/${date.month}';
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
              _Header(onMarkAll: _markAllRead),
              Expanded(
                child: RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.separated(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.fromLTRB(18, 12, 18, 16),
                    itemCount: _loading
                        ? 1
                        : _error != null
                        ? 1
                        : (_items.isEmpty ? 1 : _items.length),
                    separatorBuilder: (context, index) =>
                        const SizedBox(height: 10),
                    itemBuilder: (_, i) {
                      if (_loading) {
                        return const _InfoTile('Loading notifications...');
                      }
                      if (_error != null) {
                        return _InfoTile(_error!);
                      }
                      if (_items.isEmpty) {
                        return const _InfoTile('No notifications yet.');
                      }
                      final item = _items[i];
                      final type = item['type']?.toString() ?? 'system';
                      final body = item['body']?.toString() ?? '';
                      final job = item['job'] as Map<String, dynamic>?;
                      final extra = job == null
                          ? ''
                          : ' ${job['displayId'] ?? ''}';
                      return _NotificationTile(
                        title: item['title']?.toString() ?? 'Notification',
                        body: '$body$extra',
                        time: _timeLabel(item['createdAt']),
                        icon: _iconForType(type),
                        iconBg: _iconBgForType(type),
                        iconColor: _iconColorForType(type),
                        unread: item['isRead'] != true,
                        onTap: () => _markRead(item['_id']?.toString() ?? ''),
                      );
                    },
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
      bottomNavigationBar: _fromProvider
          ? const ProviderBottomNav(activeIndex: -1)
          : const CustomerBottomNav(activeIndex: -1),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.onMarkAll});

  final VoidCallback onMarkAll;

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
          const Expanded(
            child: Text(
              'Notifications',
              style: TextStyle(
                color: Color(0xFF121C33),
                fontSize: 19,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
          InkWell(
            onTap: onMarkAll,
            borderRadius: BorderRadius.circular(20),
            child: const SizedBox(
              width: 40,
              height: 40,
              child: Icon(
                Icons.checklist_rounded,
                color: Color(0xFF4B5B74),
                size: 24,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _NotificationTile extends StatelessWidget {
  const _NotificationTile({
    required this.title,
    required this.body,
    required this.time,
    required this.icon,
    required this.iconBg,
    required this.iconColor,
    required this.unread,
    required this.onTap,
  });

  final String title;
  final String body;
  final String time;
  final IconData icon;
  final Color iconBg;
  final Color iconColor;
  final bool unread;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: unread ? const Color(0xFFD6E0F5) : const Color(0xFFE7EBF2),
          ),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: iconBg,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: iconColor, size: 20),
            ),
            const SizedBox(width: 10),
            Expanded(
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
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                      Text(
                        time,
                        style: const TextStyle(
                          color: Color(0xFF8EA0B8),
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      if (unread) ...[
                        const SizedBox(width: 6),
                        Container(
                          width: 8,
                          height: 8,
                          decoration: const BoxDecoration(
                            color: Color(0xFF3D5FD2),
                            shape: BoxShape.circle,
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 3),
                  Text(
                    body,
                    style: const TextStyle(
                      color: Color(0xFF66758E),
                      fontSize: 13.5,
                      height: 1.35,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          ],
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
