import 'package:flutter/material.dart';

import '../../services/message_service.dart';
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
      final items = await _messageService.fetchThread(
        otherUserId: _otherUserId,
        jobId: _jobId,
      );

      if (_threadId != null && _threadId!.isNotEmpty) {
        try {
          await _messageService.markThreadRead(_threadId!);
        } catch (_) {}
      }

      if (!mounted) return;
      setState(() => _messages = items);
      _scrollToBottom();
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
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
      setState(() => _messages.add(sent));
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

  bool _isMine(Map<String, dynamic> msg) {
    final sender = msg['senderId'];
    if (sender is String) return sender != _otherUserId;
    if (sender is Map<String, dynamic>) {
      final senderId = sender['_id']?.toString() ?? '';
      if (senderId.isNotEmpty) return senderId != _otherUserId;
    }
    final receiver = msg['receiverId'];
    if (receiver is String) return receiver == _otherUserId;
    if (receiver is Map<String, dynamic>) {
      return receiver['_id']?.toString() == _otherUserId;
    }
    return true;
  }

  String _timeLabel(dynamic raw) {
    final date = DateTime.tryParse(raw?.toString() ?? '');
    if (date == null) return '';
    final h = date.hour % 12 == 0 ? 12 : date.hour % 12;
    final m = date.minute.toString().padLeft(2, '0');
    final ampm = date.hour >= 12 ? 'PM' : 'AM';
    return '$h:$m $ampm';
  }

  @override
  Widget build(BuildContext context) {
    final compactScale = UiScale.factor(context, min: 0.76, max: 0.90);

    return Scaffold(
      resizeToAvoidBottomInset: true,
      backgroundColor: const Color(0xFFF3F4F7),
      body: SafeArea(
        child: MediaQuery(
          data: MediaQuery.of(
            context,
          ).copyWith(textScaler: TextScaler.linear(compactScale)),
          child: Column(
            children: [
              _ChatHeader(
                name: _name,
                avatarUrl: _avatarUrl,
                onBack: () => Navigator.of(context).maybePop(),
              ),
              Expanded(
                child: RefreshIndicator(
                  onRefresh: _loadThread,
                  child: ListView(
                    controller: _scrollController,
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.fromLTRB(16, 22, 16, 18),
                    children: [
                      const Center(child: _TodayChip()),
                      const SizedBox(height: 16),
                      if (_loading)
                        const _InfoTile('Loading messages...')
                      else if (_error != null)
                        _InfoTile(_error!)
                      else if (_messages.isEmpty)
                        const _InfoTile('No messages yet.')
                      else
                        ..._messages.map((msg) {
                          final mine = _isMine(msg);
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: _MessageBubble(
                              mine: mine,
                              text: msg['content']?.toString() ?? '',
                              time: _timeLabel(msg['createdAt']),
                              delivered: mine,
                            ),
                          );
                        }),
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
    required this.onBack,
  });

  final String name;
  final String avatarUrl;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 64,
      padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
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
                size: 26,
              ),
            ),
          ),
          const SizedBox(width: 4),
          Stack(
            clipBehavior: Clip.none,
            children: [
              SizedBox(
                width: 52,
                height: 52,
                child: ClipOval(
                  child: avatarUrl.isEmpty
                      ? const Icon(
                          Icons.person_outline_rounded,
                          color: Color(0xFF93A1B7),
                          size: 30,
                        )
                      : Image.network(
                          avatarUrl,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) =>
                              const Icon(
                                Icons.person_outline_rounded,
                                color: Color(0xFF93A1B7),
                                size: 30,
                              ),
                        ),
                ),
              ),
              Positioned(
                right: -1,
                bottom: -1,
                child: Container(
                  width: 15,
                  height: 15,
                  decoration: BoxDecoration(
                    color: const Color(0xFF22C55E),
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: const Color(0xFFF8F9FB),
                      width: 2,
                    ),
                  ),
                ),
              ),
            ],
          ),
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
                  softWrap: false,
                  style: const TextStyle(
                    color: Color(0xFF131C35),
                    fontSize: 19,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 1),
                const Text(
                  'ONLINE',
                  style: TextStyle(
                    color: Color(0xFF22C55E),
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 1.0,
                  ),
                ),
              ],
            ),
          ),
          _TopCircleIcon(icon: Icons.call_outlined, onTap: () {}),
          const SizedBox(width: 8),
          _TopCircleIcon(icon: Icons.more_vert_rounded, onTap: () {}),
        ],
      ),
    );
  }
}

class _TopCircleIcon extends StatelessWidget {
  const _TopCircleIcon({required this.icon, required this.onTap});

  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        width: 40,
        height: 40,
        decoration: const BoxDecoration(
          color: Color(0xFFF1F4F8),
          shape: BoxShape.circle,
        ),
        child: Icon(icon, color: const Color(0xFF4B5B74), size: 24),
      ),
    );
  }
}

class _TodayChip extends StatelessWidget {
  const _TodayChip();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
      decoration: BoxDecoration(
        color: const Color(0xFFE8EDF4),
        borderRadius: BorderRadius.circular(999),
      ),
      child: const Text(
        'TODAY',
        style: TextStyle(
          color: Color(0xFF687A95),
          fontSize: 14,
          fontWeight: FontWeight.w800,
          letterSpacing: 1.7,
        ),
      ),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({
    required this.mine,
    required this.text,
    required this.time,
    this.delivered = false,
  });

  final bool mine;
  final String text;
  final String time;
  final bool delivered;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
      child: Column(
        crossAxisAlignment: mine
            ? CrossAxisAlignment.end
            : CrossAxisAlignment.start,
        children: [
          Container(
            constraints: BoxConstraints(
              maxWidth: MediaQuery.sizeOf(context).width * 0.80,
            ),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              color: mine ? const Color(0xFF223B97) : Colors.white,
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(mine ? 22 : 8),
                topRight: Radius.circular(mine ? 8 : 22),
                bottomLeft: const Radius.circular(22),
                bottomRight: const Radius.circular(22),
              ),
              boxShadow: mine
                  ? const []
                  : const [
                      BoxShadow(
                        color: Color(0x120F172A),
                        blurRadius: 8,
                        offset: Offset(0, 2),
                      ),
                    ],
            ),
            child: Text(
              text,
              style: TextStyle(
                color: mine ? Colors.white : const Color(0xFF273449),
                fontSize: 14.8,
                height: 1.42,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          const SizedBox(height: 6),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                time,
                style: const TextStyle(
                  color: Color(0xFF8DA0BC),
                  fontSize: 13.8,
                  fontWeight: FontWeight.w500,
                ),
              ),
              if (delivered) ...[
                const SizedBox(width: 4),
                const Icon(
                  Icons.done_all_rounded,
                  color: Color(0xFF3B82F6),
                  size: 18,
                ),
              ],
            ],
          ),
        ],
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
          IconButton(
            onPressed: () {},
            icon: const Icon(
              Icons.attach_file_rounded,
              color: Color(0xFF8EA0B8),
              size: 30,
            ),
          ),
          const SizedBox(width: 2),
          Expanded(
            child: Container(
              height: 52,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                color: const Color(0xFFF1F4F8),
                borderRadius: BorderRadius.circular(999),
                border: Border.all(color: const Color(0xFFE3E8F1)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: controller,
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) => onSend(),
                      decoration: const InputDecoration(
                        border: InputBorder.none,
                        hintText: 'Type a message...',
                        hintStyle: TextStyle(
                          color: Color(0xFF8FA1BC),
                          fontSize: 16,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ),
                  const Icon(
                    Icons.sentiment_satisfied_rounded,
                    color: Color(0xFF8EA0B8),
                    size: 27,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 8),
          InkWell(
            onTap: sending ? null : onSend,
            borderRadius: BorderRadius.circular(30),
            child: Container(
              width: 52,
              height: 52,
              decoration: const BoxDecoration(
                color: Color(0xFF223B97),
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: Color(0x330F172A),
                    blurRadius: 22,
                    offset: Offset(0, 12),
                    spreadRadius: -8,
                  ),
                ],
              ),
              child: sending
                  ? const Padding(
                      padding: EdgeInsets.all(14),
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    )
                  : const Icon(
                      Icons.send_rounded,
                      color: Colors.white,
                      size: 28,
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
