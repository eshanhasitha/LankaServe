import 'package:flutter/material.dart';

import '../../config/routes.dart';
import '../../services/message_service.dart';
import '../../services/support_request_service.dart';
import '../../widgets/customer_bottom_nav.dart';
import '../../widgets/provider_bottom_nav.dart';
import '../../widgets/ui_scale.dart';

class HelpCenterScreen extends StatefulWidget {
  const HelpCenterScreen({super.key});

  @override
  State<HelpCenterScreen> createState() => _HelpCenterScreenState();
}

class _HelpCenterScreenState extends State<HelpCenterScreen> {
  final SupportRequestService _supportService = SupportRequestService();
  final MessageService _messageService = MessageService();
  final TextEditingController _subjectController = TextEditingController();
  final TextEditingController _messageController = TextEditingController();

  static const List<String> _categories = <String>[
    'Payment Issue',
    'Technical Problem',
    'Account Access',
    'Verification Help',
    'Job Issue',
    'Other',
  ];

  bool _loadedArgs = false;
  bool _fromProvider = false;
  bool _loadingTickets = true;
  bool _submittingTicket = false;
  bool _openingChat = false;
  String _category = 'Technical Problem';
  String? _error;
  List<Map<String, dynamic>> _tickets = <Map<String, dynamic>>[];

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_loadedArgs) return;
    _loadedArgs = true;
    final args = ModalRoute.of(context)?.settings.arguments;
    if (args is Map<String, dynamic>) {
      _fromProvider = args['fromProvider'] == true;
    }
    _loadTickets();
  }

  @override
  void dispose() {
    _subjectController.dispose();
    _messageController.dispose();
    super.dispose();
  }

  Future<void> _loadTickets() async {
    setState(() {
      _loadingTickets = true;
      _error = null;
    });

    try {
      final items = await _supportService.fetchMyRequests(limit: 5);
      if (!mounted) return;
      setState(() => _tickets = items);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loadingTickets = false);
    }
  }

  Future<void> _submitTicket() async {
    if (_submittingTicket) return;
    final subject = _subjectController.text.trim();
    final message = _messageController.text.trim();
    if (subject.length < 3) {
      _showSnack('Enter a short subject for your support request.');
      return;
    }
    if (message.length < 10) {
      _showSnack(
        'Enter at least 10 characters so support can understand the issue.',
      );
      return;
    }

    setState(() => _submittingTicket = true);
    try {
      final ticket = await _supportService.createRequest(
        category: _category,
        subject: subject,
        message: message,
      );
      if (!mounted) return;
      _subjectController.clear();
      _messageController.clear();
      setState(() {
        if (ticket.isNotEmpty) {
          _tickets = <Map<String, dynamic>>[
            ticket,
            ..._tickets,
          ].take(5).toList();
        }
      });
      _showSnack('Support request submitted.');
      if (ticket.isEmpty) await _loadTickets();
    } catch (e) {
      if (!mounted) return;
      _showSnack('Could not submit support request: $e');
    } finally {
      if (mounted) setState(() => _submittingTicket = false);
    }
  }

  Future<void> _openSupportChat() async {
    if (_openingChat) return;
    setState(() => _openingChat = true);
    try {
      final data = await _messageService.contactSupportAgent(
        content: 'I need help from the LankaServe support team.',
      );
      final agent =
          (data['agent'] as Map<String, dynamic>?) ?? <String, dynamic>{};
      final message =
          (data['message'] as Map<String, dynamic>?) ?? <String, dynamic>{};
      final agentId = agent['id']?.toString() ?? agent['_id']?.toString() ?? '';
      if (agentId.isEmpty) {
        throw Exception('No support agent is available right now.');
      }
      if (!mounted) return;
      await Navigator.pushNamed(
        context,
        AppRoutes.chatConversation,
        arguments: <String, dynamic>{
          'counterpartId': agentId,
          'counterpartName': agent['name']?.toString() ?? 'Support Agent',
          'counterpartAvatar': '',
          'threadId': message['threadId']?.toString(),
          'fromProvider': _fromProvider,
        },
      );
    } catch (e) {
      if (!mounted) return;
      _showSnack('Support chat failed: $e');
    } finally {
      if (mounted) setState(() => _openingChat = false);
    }
  }

  void _showSnack(String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  String _timeLabel(Map<String, dynamic> ticket) {
    final closedAt = DateTime.tryParse(ticket['closedAt']?.toString() ?? '');
    final status = ticket['status']?.toString() ?? '';
    if ((status == 'resolved' || status == 'closed') && closedAt != null) {
      return 'Closed ${_dateShort(closedAt.toLocal())}';
    }

    final updated = DateTime.tryParse(
      ticket['updatedAt']?.toString() ?? ticket['createdAt']?.toString() ?? '',
    )?.toLocal();
    if (updated == null) return 'Updated recently';
    final diff = DateTime.now().difference(updated);
    if (diff.inMinutes < 1) return 'Updated just now';
    if (diff.inMinutes < 60) return 'Updated ${diff.inMinutes} mins ago';
    if (diff.inHours < 24) {
      return 'Updated ${diff.inHours} hour${diff.inHours == 1 ? '' : 's'} ago';
    }
    return 'Updated ${_dateShort(updated)}';
  }

  String _dateShort(DateTime date) {
    const months = <String>[
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return '${months[date.month - 1]} ${date.day}';
  }

  Color _statusBg(String status) {
    switch (status) {
      case 'in_progress':
        return const Color(0xFFFFF7E6);
      case 'resolved':
        return const Color(0xFFEAFBF1);
      case 'closed':
        return const Color(0xFFEFF3F8);
      default:
        return const Color(0xFFEAF1FF);
    }
  }

  Color _statusFg(String status) {
    switch (status) {
      case 'in_progress':
        return const Color(0xFFD97706);
      case 'resolved':
        return const Color(0xFF059669);
      case 'closed':
        return const Color(0xFF64748B);
      default:
        return const Color(0xFF315BD8);
    }
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
              _Header(onBack: () => Navigator.maybePop(context)),
              Expanded(
                child: RefreshIndicator(
                  onRefresh: _loadTickets,
                  child: ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.fromLTRB(18, 12, 18, 96),
                    children: [
                      _AssistantCard(
                        openingChat: _openingChat,
                        onChatTap: _openSupportChat,
                      ),
                      const SizedBox(height: 12),
                      _FaqCard(),
                      const SizedBox(height: 12),
                      _TicketFormCard(
                        categories: _categories,
                        category: _category,
                        subjectController: _subjectController,
                        controller: _messageController,
                        submitting: _submittingTicket,
                        onCategoryChanged: (value) {
                          if (value != null) setState(() => _category = value);
                        },
                        onSubmit: _submitTicket,
                      ),
                      const SizedBox(height: 12),
                      _RequestsCard(
                        loading: _loadingTickets,
                        error: _error,
                        tickets: _tickets,
                        statusBg: _statusBg,
                        statusFg: _statusFg,
                        timeLabel: _timeLabel,
                        onRefresh: _loadTickets,
                      ),
                    ],
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
  const _Header({required this.onBack});

  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 64,
      padding: const EdgeInsets.fromLTRB(12, 12, 18, 12),
      decoration: const BoxDecoration(
        color: Color(0xFFF8F9FB),
        border: Border(bottom: BorderSide(color: Color(0xFFE1E6EE))),
      ),
      child: Row(
        children: [
          IconButton(
            onPressed: onBack,
            splashRadius: 18,
            icon: const Icon(
              Icons.arrow_back_rounded,
              color: Color(0xFF1A2940),
              size: 24,
            ),
          ),
          const Expanded(
            child: Text(
              'Help Center',
              style: TextStyle(
                color: Color(0xFF121C33),
                fontSize: 19,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _AssistantCard extends StatelessWidget {
  const _AssistantCard({required this.openingChat, required this.onChatTap});

  final bool openingChat;
  final VoidCallback onChatTap;

  @override
  Widget build(BuildContext context) {
    return _CardShell(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: const Color(0xFFEAF1FF),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: const Icon(
                  Icons.smart_toy_outlined,
                  color: Color(0xFF2F4DA0),
                  size: 24,
                ),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Help Assistant',
                      style: TextStyle(
                        color: Color(0xFF121C33),
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    SizedBox(height: 2),
                    Text(
                      'Quick answers or connect with an admin.',
                      style: TextStyle(
                        color: Color(0xFF6C7B94),
                        fontSize: 12.5,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: const [
              _PromptChip('Payment issue'),
              _PromptChip('QR verification'),
              _PromptChip('Account access'),
            ],
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: openingChat ? null : onChatTap,
              icon: openingChat
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Icon(Icons.support_agent_rounded, size: 18),
              label: Text(openingChat ? 'Connecting...' : 'Open Support Chat'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF2F4DA0),
                foregroundColor: Colors.white,
                elevation: 0,
                padding: const EdgeInsets.symmetric(vertical: 13),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(13),
                ),
                textStyle: const TextStyle(
                  fontSize: 13.5,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _PromptChip extends StatelessWidget {
  const _PromptChip(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: const Color(0xFFF4F7FC),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: const Color(0xFFE1E8F2)),
      ),
      child: Text(
        text,
        style: const TextStyle(
          color: Color(0xFF51637D),
          fontSize: 11.5,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _FaqCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return const _CardShell(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Common Help Topics',
            style: TextStyle(
              color: Color(0xFF121C33),
              fontSize: 15.5,
              fontWeight: FontWeight.w800,
            ),
          ),
          SizedBox(height: 10),
          _FaqRow(
            icon: Icons.qr_code_scanner_rounded,
            title: 'QR verification',
            text:
                'Use the job QR flow only when both parties are at the service location.',
          ),
          _FaqRow(
            icon: Icons.payments_outlined,
            title: 'Payments',
            text:
                'Payment issues should include the job ID and transaction evidence.',
          ),
          _FaqRow(
            icon: Icons.shield_outlined,
            title: 'Account security',
            text:
                'Keep your email, phone, and password reset access up to date.',
          ),
        ],
      ),
    );
  }
}

class _FaqRow extends StatelessWidget {
  const _FaqRow({required this.icon, required this.title, required this.text});

  final IconData icon;
  final String title;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 9),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: const Color(0xFF63738D), size: 19),
          const SizedBox(width: 9),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: Color(0xFF1B2840),
                    fontSize: 13.5,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  text,
                  style: const TextStyle(
                    color: Color(0xFF6C7B94),
                    fontSize: 12.2,
                    height: 1.35,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _TicketFormCard extends StatelessWidget {
  const _TicketFormCard({
    required this.categories,
    required this.category,
    required this.subjectController,
    required this.controller,
    required this.submitting,
    required this.onCategoryChanged,
    required this.onSubmit,
  });

  final List<String> categories;
  final String category;
  final TextEditingController subjectController;
  final TextEditingController controller;
  final bool submitting;
  final ValueChanged<String?> onCategoryChanged;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    return _CardShell(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Create Support Request',
            style: TextStyle(
              color: Color(0xFF121C33),
              fontSize: 15.5,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 10),
          DropdownButtonFormField<String>(
            initialValue: category,
            items: categories
                .map((item) => DropdownMenuItem(value: item, child: Text(item)))
                .toList(),
            onChanged: submitting ? null : onCategoryChanged,
            decoration: _inputDecoration('Category'),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: subjectController,
            textInputAction: TextInputAction.next,
            decoration: _inputDecoration('Short subject'),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: controller,
            maxLines: 4,
            keyboardType: TextInputType.multiline,
            textInputAction: TextInputAction.newline,
            decoration: _inputDecoration('Describe your issue in detail...'),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: submitting ? null : onSubmit,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF2F4DA0),
                foregroundColor: Colors.white,
                elevation: 0,
                padding: const EdgeInsets.symmetric(vertical: 13),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(13),
                ),
                textStyle: const TextStyle(
                  fontSize: 13.5,
                  fontWeight: FontWeight.w800,
                ),
              ),
              child: Text(submitting ? 'Submitting...' : 'Submit Ticket'),
            ),
          ),
        ],
      ),
    );
  }
}

InputDecoration _inputDecoration(String label) {
  return InputDecoration(
    labelText: label,
    filled: true,
    fillColor: const Color(0xFFF8FAFD),
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(13),
      borderSide: const BorderSide(color: Color(0xFFD9E2EF)),
    ),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(13),
      borderSide: const BorderSide(color: Color(0xFFD9E2EF)),
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(13),
      borderSide: const BorderSide(color: Color(0xFF2F4DA0), width: 1.4),
    ),
    labelStyle: const TextStyle(color: Color(0xFF6C7B94)),
    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
  );
}

class _RequestsCard extends StatelessWidget {
  const _RequestsCard({
    required this.loading,
    required this.error,
    required this.tickets,
    required this.statusBg,
    required this.statusFg,
    required this.timeLabel,
    required this.onRefresh,
  });

  final bool loading;
  final String? error;
  final List<Map<String, dynamic>> tickets;
  final Color Function(String status) statusBg;
  final Color Function(String status) statusFg;
  final String Function(Map<String, dynamic> ticket) timeLabel;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context) {
    return _CardShell(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Expanded(
                child: Text(
                  'My Support Requests',
                  style: TextStyle(
                    color: Color(0xFF121C33),
                    fontSize: 15.5,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              TextButton(onPressed: onRefresh, child: const Text('Refresh')),
            ],
          ),
          const SizedBox(height: 8),
          if (loading)
            const _InlineMessage('Loading support requests...')
          else if (error != null)
            _InlineMessage(error!)
          else if (tickets.isEmpty)
            const _InlineMessage('No support requests submitted yet.')
          else
            ...tickets.map((ticket) {
              final status = ticket['status']?.toString() ?? 'open';
              return Container(
                margin: const EdgeInsets.only(bottom: 9),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFD),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFE8EEF7)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            '#${ticket['ticketNumber']?.toString() ?? '--'}',
                            style: const TextStyle(
                              color: Color(0xFF8EA0B8),
                              fontSize: 11.5,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 3,
                          ),
                          decoration: BoxDecoration(
                            color: statusBg(status),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            ticket['statusLabel']?.toString() ?? status,
                            style: TextStyle(
                              color: statusFg(status),
                              fontSize: 10.5,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 7),
                    Text(
                      ticket['subject']?.toString() ??
                          ticket['category']?.toString() ??
                          'Support Request',
                      style: const TextStyle(
                        color: Color(0xFF121C33),
                        fontSize: 13.5,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      ticket['message']?.toString() ?? '',
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Color(0xFF63738D),
                        fontSize: 12.2,
                        height: 1.35,
                      ),
                    ),
                    const SizedBox(height: 7),
                    Row(
                      children: [
                        const Icon(
                          Icons.schedule_rounded,
                          size: 14,
                          color: Color(0xFF8EA0B8),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          timeLabel(ticket),
                          style: const TextStyle(
                            color: Color(0xFF8EA0B8),
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              );
            }),
        ],
      ),
    );
  }
}

class _InlineMessage extends StatelessWidget {
  const _InlineMessage(this.message);

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFD),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE8EEF7)),
      ),
      child: Text(
        message,
        style: const TextStyle(
          color: Color(0xFF63738D),
          fontSize: 12.5,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _CardShell extends StatelessWidget {
  const _CardShell({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE7EBF2)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0A000000),
            blurRadius: 8,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: child,
    );
  }
}
