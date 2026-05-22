import 'package:flutter/foundation.dart';

import 'message_service.dart';

class MessageBadgeService {
  MessageBadgeService._();

  static final MessageBadgeService instance = MessageBadgeService._();

  final MessageService _messageService = MessageService();
  final ValueNotifier<bool> hasUnread = ValueNotifier<bool>(false);

  bool _refreshing = false;

  Future<void> refreshUnread() async {
    if (_refreshing) return;
    _refreshing = true;
    try {
      final conversations = await _messageService.fetchConversations();
      updateFromConversations(conversations);
    } catch (_) {
      // Keep previous badge state when refresh fails.
    } finally {
      _refreshing = false;
    }
  }

  void updateFromConversations(List<Map<String, dynamic>> conversations) {
    bool unread = false;
    for (final item in conversations) {
      final count = (item['unread'] is num)
          ? (item['unread'] as num).toInt()
          : 0;
      if (count > 0) {
        unread = true;
        break;
      }
    }
    if (hasUnread.value != unread) {
      hasUnread.value = unread;
    }
  }
}
