import 'package:flutter/material.dart';

import '../../config/routes.dart';
import '../../services/api_service.dart';
import '../../services/auth_service.dart';
import '../../services/provider_service.dart';
import '../../widgets/customer_bottom_nav.dart';
import '../../widgets/provider_bottom_nav.dart';
import '../../widgets/ui_scale.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final ApiService _apiService = ApiService();
  final ProviderService _providerService = ProviderService();
  final AuthService _authService = AuthService();

  bool _loading = true;
  bool _savingAvailability = false;
  bool _signingOut = false;
  bool _isAvailable = false;
  String? _error;

  Map<String, dynamic> _me = <String, dynamic>{};
  Map<String, dynamic> _providerProfile = <String, dynamic>{};

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  bool get _isProvider {
    return (_me['role']?.toString().toLowerCase() ?? '') == 'provider';
  }

  Future<void> _loadProfile() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final meRes = await _apiService.get('/users/me');
      final me =
          (meRes['data'] as Map<String, dynamic>?) ?? <String, dynamic>{};

      Map<String, dynamic> providerProfile = <String, dynamic>{};
      bool available = false;
      if ((me['role']?.toString().toLowerCase() ?? '') == 'provider') {
        try {
          providerProfile = await _providerService.getProviderMe();
          available =
              (providerProfile['availability']?.toString().toLowerCase() ??
                  '') ==
              'online';
        } catch (_) {
          providerProfile = <String, dynamic>{};
          available = false;
        }
      }

      if (!mounted) return;
      setState(() {
        _me = me;
        _providerProfile = providerProfile;
        _isAvailable = available;
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

  String _displayName() {
    final name = _me['name']?.toString().trim() ?? '';
    return name.isEmpty ? 'User' : name;
  }

  String _avatarUrl() {
    final fromMe = _me['profileImage']?.toString() ?? '';
    if (fromMe.isNotEmpty) return fromMe;
    final user = _providerProfile['userId'];
    if (user is Map<String, dynamic>) {
      return user['profileImage']?.toString() ?? '';
    }
    return '';
  }

  String _accountLabel() {
    return _isProvider ? 'Service Provider Account' : 'Customer Account';
  }

  String _languageLabel() {
    final value = _me['language']?.toString().toLowerCase() ?? 'en';
    switch (value) {
      case 'si':
        return 'Sinhala';
      case 'ta':
        return 'Tamil';
      default:
        return 'English';
    }
  }

  Future<void> _toggleAvailability(bool value) async {
    if (!_isProvider || _savingAvailability) return;

    final previous = _isAvailable;
    setState(() {
      _isAvailable = value;
      _savingAvailability = true;
    });

    try {
      final updated = await _providerService.setAvailability(
        isAvailable: value,
      );
      if (!mounted) return;
      setState(() => _providerProfile = updated);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            value
                ? 'You are now available for jobs.'
                : 'You are now marked unavailable.',
          ),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _isAvailable = previous);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to update availability: $e')),
      );
    } finally {
      if (mounted) {
        setState(() => _savingAvailability = false);
      }
    }
  }

  Future<void> _openEditProfile() async {
    if (_isProvider) {
      await Navigator.pushNamed(context, AppRoutes.providerProfileEdit);
      if (!mounted) return;
      await _loadProfile();
      return;
    }

    final nameController = TextEditingController(
      text: _me['name']?.toString() ?? '',
    );
    final cityController = TextEditingController(
      text: _me['city']?.toString() ?? '',
    );
    final districtController = TextEditingController(
      text: _me['district']?.toString() ?? '',
    );

    final result = await showDialog<Map<String, String>>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Edit Profile'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameController,
                decoration: const InputDecoration(labelText: 'Full Name'),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: cityController,
                decoration: const InputDecoration(labelText: 'City'),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: districtController,
                decoration: const InputDecoration(labelText: 'District'),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, <String, String>{
              'name': nameController.text.trim(),
              'city': cityController.text.trim(),
              'district': districtController.text.trim(),
            }),
            child: const Text('Save'),
          ),
        ],
      ),
    );

    nameController.dispose();
    cityController.dispose();
    districtController.dispose();

    if (result == null) return;

    final payload = <String, dynamic>{};
    if (result['name'] != (_me['name']?.toString() ?? '')) {
      payload['name'] = result['name'];
    }
    if (result['city'] != (_me['city']?.toString() ?? '')) {
      payload['city'] = result['city'];
    }
    if (result['district'] != (_me['district']?.toString() ?? '')) {
      payload['district'] = result['district'];
    }
    if (payload.isEmpty) return;

    try {
      await _apiService.put('/users/me', body: payload);
      if (!mounted) return;
      await _loadProfile();
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Profile updated')));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Failed to update profile: $e')));
    }
  }

  Future<void> _openLanguagePicker() async {
    final current = (_me['language']?.toString().toLowerCase() ?? 'en');
    final selected = await showModalBottomSheet<String>(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 8),
            const Text(
              'Choose Language',
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 6),
            _langItem(context, current, 'en', 'English'),
            _langItem(context, current, 'si', 'Sinhala'),
            _langItem(context, current, 'ta', 'Tamil'),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );

    if (selected == null || selected == current) return;

    try {
      await _apiService.put('/users/me', body: {'language': selected});
      if (!mounted) return;
      setState(() => _me['language'] = selected);
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Language updated')));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Failed to update language: $e')));
    }
  }

  Widget _langItem(
    BuildContext context,
    String current,
    String value,
    String label,
  ) {
    final selected = current == value;
    return ListTile(
      title: Text(label),
      trailing: selected
          ? const Icon(Icons.check_rounded, color: Color(0xFF3E5DD0))
          : null,
      onTap: () => Navigator.pop(context, value),
    );
  }

  void _showPrivacyInfo() {
    showModalBottomSheet<void>(
      context: context,
      builder: (context) => const SafeArea(
        child: Padding(
          padding: EdgeInsets.fromLTRB(18, 14, 18, 18),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Privacy & Security',
                style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
              ),
              SizedBox(height: 10),
              Text(
                'Authentication is managed by Firebase. For password and sign-in security settings, update your account in the app auth flow.',
                style: TextStyle(
                  fontSize: 14,
                  color: Color(0xFF5D6E88),
                  height: 1.45,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showHelpInfo() {
    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Help & Support'),
        content: const Text(
          'Need help? Contact support@lankaserve.lk or use in-app chat.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  Future<void> _signOut() async {
    if (_signingOut) return;
    setState(() => _signingOut = true);
    try {
      await _authService.logout();
      if (!mounted) return;
      Navigator.pushNamedAndRemoveUntil(context, AppRoutes.login, (_) => false);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Sign out failed: $e')));
    } finally {
      if (mounted) {
        setState(() => _signingOut = false);
      }
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
              _Header(onRefresh: _loadProfile),
              Expanded(
                child: RefreshIndicator(
                  onRefresh: _loadProfile,
                  child: ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.fromLTRB(18, 12, 18, 16),
                    children: [
                      if (_loading)
                        const Padding(
                          padding: EdgeInsets.only(top: 90),
                          child: Center(
                            child: CircularProgressIndicator(
                              color: Color(0xFF273D98),
                            ),
                          ),
                        )
                      else if (_error != null)
                        _InfoTile(
                          message: _error!,
                          actionLabel: 'Retry',
                          onAction: _loadProfile,
                        )
                      else ...[
                        _ProfileCard(
                          name: _displayName(),
                          accountLabel: _accountLabel(),
                          avatarUrl: _avatarUrl(),
                        ),
                        if (_isProvider) ...[
                          const SizedBox(height: 10),
                          _AvailabilityTile(
                            enabled: !_savingAvailability,
                            value: _isAvailable,
                            onChanged: _toggleAvailability,
                          ),
                        ],
                        const SizedBox(height: 12),
                        _ActionTile(
                          icon: Icons.person_outline_rounded,
                          title: 'Edit Profile',
                          onTap: _openEditProfile,
                        ),
                        const SizedBox(height: 8),
                        _ActionTile(
                          icon: Icons.lock_outline_rounded,
                          title: 'Privacy & Security',
                          onTap: _showPrivacyInfo,
                        ),
                        const SizedBox(height: 8),
                        _ActionTile(
                          icon: Icons.language_rounded,
                          title: 'Language (${_languageLabel()})',
                          onTap: _openLanguagePicker,
                        ),
                        const SizedBox(height: 8),
                        _ActionTile(
                          icon: Icons.help_outline_rounded,
                          title: 'Help & Support',
                          onTap: _showHelpInfo,
                        ),
                        const SizedBox(height: 8),
                        _ActionTile(
                          icon: Icons.logout_rounded,
                          title: _signingOut ? 'Signing Out...' : 'Sign Out',
                          danger: true,
                          onTap: _signOut,
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
      bottomNavigationBar: _isProvider
          ? const ProviderBottomNav(activeIndex: -1)
          : const CustomerBottomNav(activeIndex: -1),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.onRefresh});

  final VoidCallback onRefresh;

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
              'My Profile',
              style: TextStyle(
                color: Color(0xFF121C33),
                fontSize: 19,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
          IconButton(
            onPressed: onRefresh,
            splashRadius: 18,
            icon: const Icon(
              Icons.refresh_rounded,
              color: Color(0xFF5E6F88),
              size: 22,
            ),
          ),
        ],
      ),
    );
  }
}

class _ProfileCard extends StatelessWidget {
  const _ProfileCard({
    required this.name,
    required this.accountLabel,
    required this.avatarUrl,
  });

  final String name;
  final String accountLabel;
  final String avatarUrl;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFE7EBF2)),
      ),
      child: Column(
        children: [
          CircleAvatar(
            radius: 40,
            backgroundColor: const Color(0xFFE8EDF4),
            backgroundImage: avatarUrl.isNotEmpty
                ? NetworkImage(avatarUrl)
                : null,
            child: avatarUrl.isEmpty
                ? const Icon(Icons.person, size: 44, color: Color(0xFF8EA0B8))
                : null,
          ),
          const SizedBox(height: 10),
          Text(
            name,
            textAlign: TextAlign.center,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: Color(0xFF141C34),
              fontSize: 22,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 3),
          Text(
            accountLabel,
            style: const TextStyle(
              color: Color(0xFF66758E),
              fontSize: 14.5,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

class _AvailabilityTile extends StatelessWidget {
  const _AvailabilityTile({
    required this.value,
    required this.onChanged,
    required this.enabled,
  });

  final bool value;
  final bool enabled;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 64,
      padding: const EdgeInsets.symmetric(horizontal: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE7EBF2)),
      ),
      child: Row(
        children: [
          const Icon(
            Icons.verified_user_outlined,
            color: Color(0xFF5E6F88),
            size: 22,
          ),
          const SizedBox(width: 10),
          const Expanded(
            child: Text(
              'Available for New Jobs',
              style: TextStyle(
                color: Color(0xFF1A2842),
                fontSize: 15.5,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          Text(
            value ? 'Online' : 'Offline',
            style: TextStyle(
              color: value ? const Color(0xFF16A34A) : const Color(0xFF94A3B8),
              fontSize: 12.5,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(width: 8),
          Switch.adaptive(
            value: value,
            activeThumbColor: const Color(0xFF3E5DD0),
            activeTrackColor: const Color(0xFFBFCBF4),
            onChanged: enabled ? onChanged : null,
          ),
        ],
      ),
    );
  }
}

class _ActionTile extends StatelessWidget {
  const _ActionTile({
    required this.icon,
    required this.title,
    required this.onTap,
    this.danger = false,
  });

  final IconData icon;
  final String title;
  final VoidCallback onTap;
  final bool danger;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Container(
          height: 56,
          padding: const EdgeInsets.symmetric(horizontal: 14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFE7EBF2)),
          ),
          child: Row(
            children: [
              Icon(
                icon,
                color: danger
                    ? const Color(0xFFEF4444)
                    : const Color(0xFF5E6F88),
                size: 22,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: danger
                        ? const Color(0xFFEF4444)
                        : const Color(0xFF1A2842),
                    fontSize: 15.5,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const Icon(
                Icons.chevron_right_rounded,
                color: Color(0xFF94A2B8),
                size: 24,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _InfoTile extends StatelessWidget {
  const _InfoTile({required this.message, this.actionLabel, this.onAction});

  final String message;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE7EBF2)),
      ),
      child: Column(
        children: [
          Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: Color(0xFF6E7F98),
              fontSize: 14.5,
              fontWeight: FontWeight.w500,
            ),
          ),
          if (actionLabel != null && onAction != null) ...[
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: onAction,
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFF273D98),
                side: const BorderSide(color: Color(0xFFD1DAE8)),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: Text(actionLabel!),
            ),
          ],
        ],
      ),
    );
  }
}
