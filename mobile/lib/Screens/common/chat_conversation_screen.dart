import 'package:flutter/material.dart';

import '../../services/message_badge_service.dart';
import '../../services/message_service.dart';
import '../../widgets/shimmer_skeleton.dart';
import '../../widgets/ui_scale.dart';

class ChatConversationScreen extends StatefulWidget {
  const ChatConversationScreen({super.key});

  @override
  State<ChatConversationScreen> createState() => _ChatConversationScreenState();
}

class _ChatConversationScreenState extends State<ChatConversationScreen> {
  final MessageService _messageService = MessageService();
  final TextEditingController _composerController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  bool _loadedArgs = false;
  bool _loading = true;
  bool _sending = false;
  String? _error;

  String _otherUserId = '';
  String? _threadId;
  String? _jobId;
  String _name = 'User';
  String _avatarUrl = '';

  List<Map<String, dynamic>> _messages = <Map<String, dynamic>>[];

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_loadedArgs) return;
    _loadedArgs = true;

    final args = ModalRoute.of(context)?.settings.arguments;
    if (args is Map<String, dynamic>) {
      _otherUserId = args['counterpartId']?.toString() ?? '';
      _threadId = args['threadId']?.toString();
      _jobId = args['jobId']?.toString();
      _name = args['counterpartName']?.toString() ?? 'User';
      _avatarUrl = args['counterpartAvatar']?.toString() ?? '';
    }
    _jobId = _normalizeJobId(_jobId);
    if ((_jobId == null || _jobId!.isEmpty) &&
        _threadId != null &&
        _threadId!.startsWith('job:')) {
      final parts = _threadId!.split(':');
      if (parts.length >= 3 && parts[1].trim().isNotEmpty) {
        _jobId = parts[1].trim();
      }
    }

    _loadThread();
  }

  @override
  void dispose() {
    _composerController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _loadThread() async {
    if (_otherUserId.isEmpty) {
      setState(() {
        _loading = false;
        _error = 'Conversation target is missing.';
      });
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      var items = await _messageService.fetchThread(
        otherUserId: _otherUserId,
        jobId: _jobId,
      );

      // Some older chats were started as direct threads. If job-scoped query
      // returns nothing, retry without jobId so history still appears.
      var usedDirectFallback = false;
      if (items.isEmpty && (_jobId?.isNotEmpty ?? false)) {
        final directItems = await _messageService.fetchThread(
          otherUserId: _otherUserId,
        );
        if (directItems.isNotEmpty) {
          items = directItems;
          usedDirectFallback = true;
        }
      }

      final resolvedThreadId =
          _extractThreadId(items) ??
          ((_threadId != null && _threadId!.trim().isNotEmpty)
              ? _threadId!.trim()
              : null);

      if (resolvedThreadId != null && resolvedThreadId.isNotEmpty) {
        try {
          await _messageService.markThreadRead(resolvedThreadId);
        } catch (_) {}
      }

      if (!mounted) return;
      final sorted = _sortMessagesByCreatedAt(items);
      setState(() {
        _messages = sorted;
        if (usedDirectFallback) {
          _jobId = '';
        }
      });
      _scrollToBottom();
      MessageBadgeService.instance.refreshUnread();
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  String? _extractThreadId(List<Map<String, dynamic>> items) {
    if (items.isEmpty) return null;
    for (final item in items.reversed) {
      final value = item['threadId']?.toString().trim() ?? '';
      if (value.isNotEmpty) return value;
    }
    return null;
  }

  Future<void> _sendMessage() async {
    if (_sending) return;
    final text = _composerController.text.trim();
    if (text.isEmpty || _otherUserId.isEmpty) return;

    setState(() => _sending = true);
    try {
      final sent = await _messageService.sendMessage(
        receiverId: _otherUserId,
        content: text,
        jobId: _jobId,
      );
      if (!mounted) return;
      _composerController.clear();
      setState(() {
        _messages = _sortMessagesByCreatedAt(<Map<String, dynamic>>[
          ..._messages,
          sent,
        ]);
      });
      _scrollToBottom();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Failed to send message: $e')));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) return;
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent + 90,
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOut,
      );
    });
  }

  void _showInfoSheet() {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
      ),
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Conversation Info',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF141C34),
                ),
              ),
              const SizedBox(height: 16),
              if (_jobId != null && _jobId!.isNotEmpty)
                Text('Job ID: $_jobId')
              else
                const Text('Direct conversation'),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => Navigator.pop(context),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF273D98),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 13),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  child: const Text('Close'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  bool _isMine(Map<String, dynamic> msg) {
    final senderId = _extractEntityId(msg['senderId']);
    if (senderId.isNotEmpty) return senderId != _otherUserId;

    final receiverId = _extractEntityId(msg['receiverId']);
    if (receiverId.isNotEmpty) return receiverId == _otherUserId;

    return true;
  }

  String _timeLabel(dynamic raw) {
    final date = DateTime.tryParse(raw?.toString() ?? '')?.toLocal();
    if (date == null) return '';
    final h = date.hour % 12 == 0 ? 12 : date.hour % 12;
    final m = date.minute.toString().padLeft(2, '0');
    final ampm = date.hour >= 12 ? 'PM' : 'AM';
    return '$h:$m $ampm';
  }

  String _normalizeJobId(String? value) {
    final normalized = value?.trim();
    if (normalized == null ||
        normalized.isEmpty ||
        normalized == 'null' ||
        normalized == 'undefined') {
      return '';
    }
    return normalized;
  }

  String _extractEntityId(dynamic entity) {
    if (entity == null) return '';
    if (entity is String) return entity.trim();
    if (entity is Map<String, dynamic>) {
      final candidate =
          entity['_id'] ?? entity['id'] ?? entity['\$oid'] ?? entity['oid'];
      if (candidate != null) return candidate.toString().trim();
    }
    return entity.toString().trim();
  }

  DateTime _messageTime(Map<String, dynamic> msg) {
    final created = DateTime.tryParse(msg['createdAt']?.toString() ?? '');
    final updated = DateTime.tryParse(msg['updatedAt']?.toString() ?? '');
    return (created ?? updated ?? DateTime.fromMillisecondsSinceEpoch(0))
        .toLocal();
  }

  List<Map<String, dynamic>> _sortMessagesByCreatedAt(
    List<Map<String, dynamic>> items,
  ) {
    final list = <Map<String, dynamic>>[...items];
    list.sort((a, b) => _messageTime(a).compareTo(_messageTime(b)));
    return list;
  }

  @override
  Widget build(BuildContext context) {
    final compactScale = UiScale.factor(context, min: 0.76, max: 0.90);
    return Scaffold(
      resizeToAvoidBottomInset: true,
      backgroundColor: const Color(0xFFF3F4F7),
      body: SafeArea(
        child: MediaQuery(
          data: MediaQuery.of(context).copyWith(textScaler: TextScaler.linear(compactScale)),
          child: Column(
            children: [
            _ChatHeader(
              name: _name,
              avatarUrl: _avatarUrl,
              isJobConversation: _jobId != null && _jobId!.isNotEmpty,
              onBack: () => Navigator.of(context).maybePop(),
              onInfo: _showInfoSheet,
              onOptions: () {},
            ),
            Expanded(
              child: RefreshIndicator(
                onRefresh: _loadThread,
                child: ListView(
                  controller: _scrollController,
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
                  children: [
                    if (_loading)
                      const _MessagesSkeleton()
                    else if (_error != null)
                      _InfoTile(_error!)
                    else if (_messages.isEmpty)
                      const _InfoTile('No messages yet.')
                    else ...[
                      const Center(child: _TodayChip()),
                      const SizedBox(height: 10),
                      ..._messages.map((msg) {
                        final mine = _isMine(msg);
                        return _MessageRow(
                          mine: mine,
                          text: msg['content']?.toString() ?? '',
                          time: _timeLabel(msg['createdAt']),
                          avatarUrl: _avatarUrl,
                        );
                      }),
                    ],
                  ],
                ),
              ),
            ),
            _ChatComposer(
              controller: _composerController,
              sending: _sending,
              onSend: _sendMessage,
            ),
          ],
        ),
        ),
      ),
    );
  }
}

class _ChatHeader extends StatelessWidget {
  const _ChatHeader({
    required this.name,
    required this.avatarUrl,
    required this.isJobConversation,
    required this.onBack,
    this.onInfo,
    this.onOptions,
  });

  final String name;
  final String avatarUrl;
  final bool isJobConversation;
  final VoidCallback onBack;
  final VoidCallback? onInfo;
  final VoidCallback? onOptions;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 70,
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
      decoration: const BoxDecoration(
        color: Color(0xFFF8F9FB),
        border: Border(bottom: BorderSide(color: Color(0xFFE1E6EE))),
      ),
      child: Row(
        children: [
          InkWell(
            onTap: onBack,
            borderRadius: BorderRadius.circular(18),
            child: const Padding(
              padding: EdgeInsets.all(6),
              child: Icon(
                Icons.arrow_back_ios_new_rounded,
                color: Color(0xFF101933),
                size: 24,
              ),
            ),
          ),
          const SizedBox(width: 6),
          _AvatarCircle(url: avatarUrl, size: 42),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Color(0xFF131C35),
                    fontSize: 16.5,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 1),
                Text(
                  isJobConversation
                      ? 'Job conversation'
                      : 'Direct conversation',
                  style: const TextStyle(
                    color: Color(0xFF7B8CA7),
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
          _TopActionIcon(icon: Icons.info_outline_rounded, onTap: onInfo ?? () {}),
          const SizedBox(width: 8),
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert, color: Color(0xFF6E7F98)),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'clear',
                child: Text('Clear Chat'),
              ),
              const PopupMenuItem(
                value: 'report',
                child: Text('Report User'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _TopActionIcon extends StatelessWidget {
  const _TopActionIcon({required this.icon, required this.onTap});

  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(10),
      onTap: onTap,
      child: Container(
        width: 34,
        height: 34,
        decoration: BoxDecoration(
          color: const Color(0xFFF4F7FC),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: const Color(0xFFE4EAF4)),
        ),
        child: Icon(icon, size: 18, color: const Color(0xFF4C5D78)),
      ),
    );
  }
}

class _TodayChip extends StatelessWidget {
  const _TodayChip();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: const Color(0xFFE4EAF4)),
      ),
      child: const Text(
        'Today',
        style: TextStyle(
          color: Color(0xFF8292AA),
          fontSize: 10.5,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _MessageRow extends StatelessWidget {
  const _MessageRow({
    required this.mine,
    required this.text,
    required this.time,
    required this.avatarUrl,
  });

  final bool mine;
  final String text;
  final String time;
  final String avatarUrl;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        mainAxisAlignment: mine
            ? MainAxisAlignment.end
            : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!mine) ...[
            _AvatarCircle(url: avatarUrl, size: 28),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: Column(
              crossAxisAlignment: mine
                  ? CrossAxisAlignment.end
                  : CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 10,
                  ),
                  decoration: BoxDecoration(
                    color: mine ? const Color(0xFF2F4DA0) : Colors.white,
                    borderRadius: BorderRadius.only(
                      topLeft: Radius.circular(mine ? 16 : 6),
                      topRight: Radius.circular(mine ? 6 : 16),
                      bottomLeft: const Radius.circular(16),
                      bottomRight: const Radius.circular(16),
                    ),
                    border: mine
                        ? null
                        : Border.all(color: const Color(0xFFE7EBF2)),
                  ),
                  child: Text(
                    text,
                    style: TextStyle(
                      color: mine ? Colors.white : const Color(0xFF1F2A40),
                      fontSize: 13.8,
                      fontWeight: FontWeight.w500,
                      height: 1.35,
                    ),
                  ),
                ),
                const SizedBox(height: 3),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      time,
                      style: const TextStyle(
                        color: Color(0xFF8DA0BC),
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    if (mine) ...[
                      const SizedBox(width: 3),
                      const Icon(
                        Icons.done_all_rounded,
                        color: Color(0xFF4D7DF0),
                        size: 14,
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _AvatarCircle extends StatelessWidget {
  const _AvatarCircle({required this.url, required this.size});

  final String? url;
  final double size;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: ClipOval(
        child: (url == null || url!.isEmpty)
            ? const ColoredBox(
                color: Color(0xFFE3E8F1),
                child: Icon(
                  Icons.person_outline_rounded,
                  color: Color(0xFF93A1B7),
                  size: 18,
                ),
              )
            : Image.network(
                url!,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) => const ColoredBox(
                  color: Color(0xFFE3E8F1),
                  child: Icon(
                    Icons.person_outline_rounded,
                    color: Color(0xFF93A1B7),
                    size: 18,
                  ),
                ),
              ),
      ),
    );
  }
}

class _ChatComposer extends StatelessWidget {
  const _ChatComposer({
    required this.controller,
    required this.sending,
    required this.onSend,
  });

  final TextEditingController controller;
  final bool sending;
  final VoidCallback onSend;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Color(0xFFE1E6EE))),
      ),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: const Color(0xFFF2F5FA),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFFE1E7F1)),
            ),
            child: const Icon(
              Icons.attach_file_rounded,
              color: Color(0xFF8EA0B8),
              size: 20,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Container(
              height: 44,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(
                color: const Color(0xFFF7F9FD),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFE1E7F1)),
              ),
              child: TextField(
                controller: controller,
                textInputAction: TextInputAction.send,
                onSubmitted: (_) => onSend(),
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
                  hintText: 'Type a message...',
                  hintStyle: TextStyle(
                    color: Color(0xFF8FA1BC),
                    fontSize: 13.8,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),
          ElevatedButton(
            onPressed: sending ? null : onSend,
            style: ElevatedButton.styleFrom(
              minimumSize: const Size(84, 44),
              maximumSize: const Size(120, 44),
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              backgroundColor: const Color(0xFF2F4DA0),
              foregroundColor: Colors.white,
              disabledBackgroundColor: const Color(0xFF8E9DC9),
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 12),
            ),
            child: sending
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                    ),
                  )
                : const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'Send',
                        style: TextStyle(
                          fontSize: 13.8,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      SizedBox(width: 4),
                      Icon(Icons.send_rounded, size: 15),
                    ],
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

class _MessagesSkeleton extends StatelessWidget {
  const _MessagesSkeleton();

  @override
  Widget build(BuildContext context) {
    return ShimmerContainer(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: Column(
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                ShimmerBox(height: 28, width: 28, borderRadius: BorderRadius.circular(14)),
                const SizedBox(width: 8),
                Expanded(
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: ShimmerBox(height: 60, width: 220, borderRadius: BorderRadius.circular(16)),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: Align(
                    alignment: Alignment.centerRight,
                    child: ShimmerBox(height: 80, width: 200, borderRadius: BorderRadius.circular(16)),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                ShimmerBox(height: 28, width: 28, borderRadius: BorderRadius.circular(14)),
                const SizedBox(width: 8),
                Expanded(
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: ShimmerBox(height: 48, width: 160, borderRadius: BorderRadius.circular(16)),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: Align(
                    alignment: Alignment.centerRight,
                    child: ShimmerBox(height: 48, width: 120, borderRadius: BorderRadius.circular(16)),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
