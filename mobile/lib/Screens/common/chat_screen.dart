import 'package:flutter/material.dart';

import '../../config/routes.dart';
import '../../services/message_badge_service.dart';
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
  String _activeThreadId = '';
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
      setState(() {
        _threads = items;
        if (_activeThreadId.isEmpty && items.isNotEmpty) {
          _activeThreadId = items.first['threadId']?.toString() ?? '';
        }
      });
      MessageBadgeService.instance.updateFromConversations(items);
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
    final date = DateTime.tryParse(raw?.toString() ?? '')?.toLocal();
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
    if (diff.inDays <= 0) return 'Today';
    if (diff.inDays == 1) return 'Yesterday';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${date.day}/${date.month}/${date.year.toString().substring(2)}';
  }

  String _contextLabel(Map<String, dynamic> item) {
    final jobTitle = item['jobTitle']?.toString().trim() ?? '';
    if (jobTitle.isNotEmpty) return jobTitle;
    return item['contextType']?.toString() == 'job'
        ? 'Job Conversation'
        : 'Direct Chat';
  }

  Future<void> _openThread(Map<String, dynamic> thread) async {
    final threadId = thread['threadId']?.toString() ?? '';
    setState(() {
      _activeThreadId = threadId;
    });

    await Navigator.pushNamed(
      context,
      AppRoutes.chatConversation,
      arguments: <String, dynamic>{...thread, 'fromProvider': _fromProvider},
    );

    if (!mounted) return;
    _loadConversations();
  }

  @override
  Widget build(BuildContext context) {
    final compactScale = UiScale.factor(context, min: 0.76, max: 0.90);
    final bottomInset = MediaQuery.paddingOf(context).bottom;

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
              _SearchBar(controller: _searchController),
              Expanded(
                child: RefreshIndicator(
                  onRefresh: _loadConversations,
                  child: _loading
                      ? ListView(
                          physics: const AlwaysScrollableScrollPhysics(),
                          children: const [
                            SizedBox(height: 80),
                            _InfoTile('Loading conversations...'),
                          ],
                        )
                      : _error != null
                      ? ListView(
                          physics: const AlwaysScrollableScrollPhysics(),
                          children: [_InfoTile(_error!)],
                        )
                      : _filteredThreads.isEmpty
                      ? ListView(
                          physics: const AlwaysScrollableScrollPhysics(),
                          children: const [
                            SizedBox(height: 80),
                            _InfoTile('No conversations yet.'),
                          ],
                        )
                      : ListView.builder(
                          physics: const AlwaysScrollableScrollPhysics(),
                          padding: EdgeInsets.fromLTRB(
                            0,
                            4,
                            0,
                            96 + bottomInset,
                          ),
                          itemCount: _filteredThreads.length,
                          itemBuilder: (context, index) {
                            final thread = _filteredThreads[index];
                            final threadId =
                                thread['threadId']?.toString() ?? '';
                            return _ThreadRow(
                              name:
                                  thread['counterpartName']?.toString() ??
                                  'User',
                              contextTitle: _contextLabel(thread),
                              message:
                                  thread['lastMessage']?.toString() ??
                                  'No messages yet',
                              time: _timeLabel(thread['lastMessageAt']),
                              avatarUrl: thread['counterpartAvatar']
                                  ?.toString(),
                              unreadCount: (thread['unread'] is num)
                                  ? (thread['unread'] as num).toInt()
                                  : 0,
                              active: threadId == _activeThreadId,
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
      child: const Row(
        children: [
          Expanded(
            child: Text(
              'Messages',
              style: TextStyle(
                color: Color(0xFF121C33),
                fontSize: 18,
                fontWeight: FontWeight.w800,
                height: 1.0,
              ),
            ),
          ),
        ],
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
      padding: const EdgeInsets.fromLTRB(14, 10, 14, 8),
      child: Container(
        height: 44,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE3E8F2)),
        ),
        child: Row(
          children: [
            const Icon(
              Icons.search_rounded,
              color: Color(0xFF9AA8BD),
              size: 20,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: TextField(
                controller: controller,
                style: const TextStyle(
                  color: Color(0xFF1C2A44),
                  fontSize: 13.8,
                  fontWeight: FontWeight.w500,
                ),
                decoration: const InputDecoration(
                  isCollapsed: true,
                  isDense: true,
                  filled: false,
                  fillColor: Colors.transparent,
                  contentPadding: EdgeInsets.zero,
                  border: InputBorder.none,
                  enabledBorder: InputBorder.none,
                  focusedBorder: InputBorder.none,
                  disabledBorder: InputBorder.none,
                  errorBorder: InputBorder.none,
                  focusedErrorBorder: InputBorder.none,
                  hintText: 'Search conversations...',
                  hintStyle: TextStyle(
                    color: Color(0xFF8A9AB2),
                    fontSize: 13.5,
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

class _ThreadRow extends StatelessWidget {
  const _ThreadRow({
    required this.name,
    required this.contextTitle,
    required this.message,
    required this.time,
    required this.avatarUrl,
    required this.unreadCount,
    required this.active,
    required this.onTap,
  });

  final String name;
  final String contextTitle;
  final String message;
  final String time;
  final String? avatarUrl;
  final int unreadCount;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: active ? Colors.white : Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
          decoration: const BoxDecoration(
            border: Border(bottom: BorderSide(color: Color(0xFFE9EDF4))),
          ),
          child: Row(
            children: [
              Container(
                width: 3,
                height: 52,
                decoration: BoxDecoration(
                  color: active ? const Color(0xFF2F4DA0) : Colors.transparent,
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
              const SizedBox(width: 9),
              _Avatar(url: avatarUrl),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: Color(0xFF151F36),
                              fontSize: 14.8,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          time,
                          style: const TextStyle(
                            color: Color(0xFF8796AC),
                            fontSize: 11.5,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      contextTitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Color(0xFF2F4DA0),
                        fontSize: 11.8,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            message,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: Color(0xFF5B6B84),
                              fontSize: 12.8,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        if (unreadCount > 0)
                          Container(
                            constraints: const BoxConstraints(
                              minWidth: 19,
                              minHeight: 19,
                            ),
                            padding: const EdgeInsets.symmetric(
                              horizontal: 5,
                              vertical: 2,
                            ),
                            decoration: const BoxDecoration(
                              color: Color(0xFF2F4DA0),
                              shape: BoxShape.circle,
                            ),
                            child: Center(
                              child: Text(
                                unreadCount.toString(),
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
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
  const _Avatar({required this.url});

  final String? url;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 46,
      height: 46,
      child: ClipOval(
        child: (url == null || url!.isEmpty)
            ? const ColoredBox(
                color: Color(0xFFE4EAF2),
                child: Icon(
                  Icons.person_outline_rounded,
                  color: Color(0xFF93A1B7),
                  size: 24,
                ),
              )
            : Image.network(
                url!,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) => const ColoredBox(
                  color: Color(0xFFE4EAF2),
                  child: Icon(
                    Icons.person_outline_rounded,
                    color: Color(0xFF93A1B7),
                    size: 24,
                  ),
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
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
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
      ),
    );
  }
}
