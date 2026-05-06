import 'package:flutter/material.dart';

import '../../config/routes.dart';
import '../../services/message_service.dart';
import '../../widgets/customer_bottom_nav.dart';
import '../../widgets/provider_bottom_nav.dart';
import '../../widgets/ui_scale.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final MessageService _messageService = MessageService();
  final TextEditingController _searchController = TextEditingController();

  bool _loadedArgs = false;
  bool _fromProvider = false;
  bool _loading = true;
  String? _error;
  List<Map<String, dynamic>> _threads = <Map<String, dynamic>>[];

  @override
  void initState() {
    super.initState();
    _searchController.addListener(() => setState(() {}));
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_loadedArgs) return;
    _loadedArgs = true;
    final args = ModalRoute.of(context)?.settings.arguments;
    if (args is Map<String, dynamic> && args['fromProvider'] == true) {
      _fromProvider = true;
    }
    _loadConversations();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadConversations() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final items = await _messageService.fetchConversations();
      if (!mounted) return;
      setState(() => _threads = items);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<Map<String, dynamic>> get _filteredThreads {
    final q = _searchController.text.trim().toLowerCase();
    if (q.isEmpty) return _threads;
    return _threads.where((thread) {
      final name = (thread['counterpartName']?.toString() ?? '').toLowerCase();
      final last = (thread['lastMessage']?.toString() ?? '').toLowerCase();
      final jobTitle = (thread['jobTitle']?.toString() ?? '').toLowerCase();
      return name.contains(q) || last.contains(q) || jobTitle.contains(q);
    }).toList();
  }

  String _timeLabel(dynamic raw) {
    final date = DateTime.tryParse(raw?.toString() ?? '');
    if (date == null) return '';
    final now = DateTime.now();
    final diff = now.difference(date);
    final sameDay =
        now.year == date.year && now.month == date.month && now.day == date.day;
    if (sameDay) {
      final h = date.hour % 12 == 0 ? 12 : date.hour % 12;
      final m = date.minute.toString().padLeft(2, '0');
      final ampm = date.hour >= 12 ? 'PM' : 'AM';
      return '$h:$m $ampm';
    }
    if (diff.inDays == 1) return 'Yesterday';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${date.day}/${date.month}/${date.year.toString().substring(2)}';
  }

  String _roleLabel(Map<String, dynamic> item) {
    final jobTitle = item['jobTitle']?.toString().trim() ?? '';
    if (jobTitle.isNotEmpty) {
      final words = jobTitle
          .split(RegExp(r'\s+'))
          .where((e) => e.isNotEmpty)
          .toList();
      return words.take(2).join(' ').toUpperCase();
    }
    return item['contextType']?.toString() == 'job' ? 'JOB CHAT' : 'DIRECT';
  }

  void _openThread(Map<String, dynamic> thread) {
    Navigator.pushNamed(
      context,
      AppRoutes.chatConversation,
      arguments: <String, dynamic>{...thread, 'fromProvider': _fromProvider},
    ).then((_) => _loadConversations());
  }

  @override
  Widget build(BuildContext context) {
    final compactScale = UiScale.factor(context, min: 0.76, max: 0.90);
    final bottomInset = MediaQuery.paddingOf(context).bottom;

    return Scaffold(
      backgroundColor: const Color(0xFFF3F4F7),
      floatingActionButton: Container(
        width: 54,
        height: 54,
        decoration: const BoxDecoration(
          shape: BoxShape.circle,
          color: Color(0xFF223B97),
          boxShadow: [
            BoxShadow(
              color: Color(0x330F172A),
              blurRadius: 22,
              offset: Offset(0, 12),
              spreadRadius: -8,
            ),
          ],
        ),
        child: IconButton(
          onPressed: () {},
          icon: const Icon(Icons.add_rounded, color: Colors.white, size: 32),
        ),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.endFloat,
      body: SafeArea(
        child: MediaQuery(
          data: MediaQuery.of(
            context,
          ).copyWith(textScaler: TextScaler.linear(compactScale)),
          child: Column(
            children: [
              const _Header(),
              _SearchBar(controller: _searchController),
              Expanded(
                child: RefreshIndicator(
                  onRefresh: _loadConversations,
                  child: ListView.separated(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: EdgeInsets.fromLTRB(16, 8, 16, 122 + bottomInset),
                    itemCount: _loading
                        ? 1
                        : _error != null
                        ? 1
                        : (_filteredThreads.isEmpty
                              ? 1
                              : _filteredThreads.length),
                    separatorBuilder: (context, index) =>
                        const SizedBox(height: 12),
                    itemBuilder: (context, index) {
                      if (_loading) {
                        return const _InfoTile('Loading conversations...');
                      }
                      if (_error != null) {
                        return _InfoTile(_error!);
                      }
                      if (_filteredThreads.isEmpty) {
                        return const _InfoTile('No conversations yet.');
                      }
                      final thread = _filteredThreads[index];
                      return _ThreadCard(
                        name: thread['counterpartName']?.toString() ?? 'User',
                        role: _roleLabel(thread),
                        message: thread['lastMessage']?.toString() ?? '',
                        time: _timeLabel(thread['lastMessageAt']),
                        avatarUrl: thread['counterpartAvatar']?.toString(),
                        unreadCount: (thread['unread'] is num)
                            ? (thread['unread'] as num).toInt()
                            : 0,
                        onTap: () => _openThread(thread),
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
          ? const ProviderBottomNav(activeIndex: 4)
          : const CustomerBottomNav(activeIndex: 4),
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
          const Expanded(
            child: Text(
              'Messages',
              style: TextStyle(
                color: Color(0xFF121C33),
                fontSize: 22,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
          _HeaderIcon(icon: Icons.search_rounded, onTap: () {}),
          const SizedBox(width: 8),
          _HeaderIcon(icon: Icons.filter_list_rounded, onTap: () {}),
        ],
      ),
    );
  }
}

class _HeaderIcon extends StatelessWidget {
  const _HeaderIcon({required this.icon, required this.onTap});

  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Padding(
        padding: const EdgeInsets.all(2),
        child: Icon(icon, color: const Color(0xFF4B5B74), size: 28),
      ),
    );
  }
}

class _SearchBar extends StatelessWidget {
  const _SearchBar({required this.controller});

  final TextEditingController controller;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 6),
      child: Container(
        height: 50,
        padding: const EdgeInsets.symmetric(horizontal: 14),
        decoration: BoxDecoration(
          color: const Color(0xFFEAF0F7),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          children: [
            const Icon(
              Icons.search_rounded,
              color: Color(0xFF93A1B7),
              size: 24,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: TextField(
                controller: controller,
                decoration: const InputDecoration(
                  border: InputBorder.none,
                  hintText: 'Search conversations...',
                  hintStyle: TextStyle(
                    color: Color(0xFF6E7F98),
                    fontSize: 14.5,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ThreadCard extends StatelessWidget {
  const _ThreadCard({
    required this.name,
    required this.role,
    required this.message,
    required this.time,
    required this.avatarUrl,
    required this.unreadCount,
    required this.onTap,
  });

  final String name;
  final String role;
  final String message;
  final String time;
  final String? avatarUrl;
  final int unreadCount;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Container(
          padding: const EdgeInsets.fromLTRB(13, 13, 13, 13),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: const Color(0xFFE7EBF2)),
            boxShadow: const [
              BoxShadow(
                color: Color(0x120F172A),
                blurRadius: 8,
                offset: Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _Avatar(url: avatarUrl, online: false),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Text(
                            name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: Color(0xFF141C34),
                              fontSize: 16.8,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          time,
                          style: const TextStyle(
                            color: Color(0xFF62738F),
                            fontSize: 13.8,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 3.5,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFFE8EDF4),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        role,
                        style: const TextStyle(
                          color: Color(0xFF687A95),
                          fontSize: 11.8,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.8,
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Expanded(
                          child: Text(
                            message,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: Color(0xFF4D5E79),
                              fontSize: 14.8,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        if (unreadCount > 0)
                          Container(
                            width: 30,
                            height: 30,
                            decoration: const BoxDecoration(
                              color: Color(0xFFF44848),
                              shape: BoxShape.circle,
                            ),
                            child: Center(
                              child: Text(
                                unreadCount.toString(),
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
                          )
                        else
                          const Icon(
                            Icons.done_all_rounded,
                            color: Color(0xFFA0AEC0),
                            size: 21,
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Avatar extends StatelessWidget {
  const _Avatar({required this.url, required this.online});

  final String? url;
  final bool online;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 56,
      height: 56,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: const BoxDecoration(
              color: Color(0xFFE3E8F1),
              shape: BoxShape.circle,
            ),
            child: ClipOval(
              child: (url == null || url!.isEmpty)
                  ? const Icon(
                      Icons.person_outline_rounded,
                      color: Color(0xFF93A1B7),
                      size: 28,
                    )
                  : Image.network(
                      url!,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) => const Icon(
                        Icons.person_outline_rounded,
                        color: Color(0xFF93A1B7),
                        size: 28,
                      ),
                    ),
            ),
          ),
          if (online)
            Positioned(
              right: 0,
              bottom: 0,
              child: Container(
                width: 16,
                height: 16,
                decoration: BoxDecoration(
                  color: const Color(0xFF22C55E),
                  shape: BoxShape.circle,
                  border: Border.all(color: const Color(0xFFF8FAFD), width: 2),
                ),
              ),
            ),
        ],
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
