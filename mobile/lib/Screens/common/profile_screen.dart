import 'dart:io';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../../config/constants.dart';
import '../../config/routes.dart';
import '../../services/api_service.dart';
import '../../services/auth_service.dart';
import '../../services/provider_service.dart';
import '../../widgets/customer_bottom_nav.dart';
import '../../widgets/provider_bottom_nav.dart';
import '../../widgets/shimmer_skeleton.dart';
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
  final ImagePicker _imagePicker = ImagePicker();

  bool _loading = true;
  bool _uploadingAvatar = false;
  bool _savingAvailability = false;
  bool _signingOut = false;
  bool _isAvailable = false;
  String? _error;

  Map<String, dynamic> _me = <String, dynamic>{};
  Map<String, dynamic> _providerProfile = <String, dynamic>{};

  @override
  void initState() {
    super.initState();
    _me = Map<String, dynamic>.from(_authService.user);
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
    if (fromMe.isNotEmpty) return AppConstants.normalizeUrl(fromMe);
    final user = _providerProfile['userId'];
    if (user is Map<String, dynamic>) {
      final value = user['profileImage']?.toString() ?? '';
      if (value.isNotEmpty) return AppConstants.normalizeUrl(value);
    }
    return '';
  }

  String _avatarInitial() {
    final name = _displayName().trim();
    if (name.isEmpty || name.toLowerCase() == 'user') {
      return _isProvider ? 'P' : 'U';
    }
    return String.fromCharCode(name.runes.first).toUpperCase();
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

    final result = await showModalBottomSheet<Map<String, String>>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _EditProfileSheet(
        initialName: _me['name']?.toString() ?? '',
        initialEmail: _me['email']?.toString() ?? '',
        initialCity: _me['city']?.toString() ?? '',
        initialDistrict: _me['district']?.toString() ?? '',
        initialBio: _me['bio']?.toString() ?? '',
      ),
    );

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
    if (result['bio'] != (_me['bio']?.toString() ?? '')) {
      payload['bio'] = result['bio'];
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

  Future<void> _changeProfilePhoto() async {
    if (_uploadingAvatar) return;

    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
      ),
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 8),
            const Text(
              'Change Profile Photo',
              style: TextStyle(
                color: Color(0xFF121C33),
                fontSize: 17,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 6),
            ListTile(
              leading: const Icon(Icons.photo_library_outlined),
              title: const Text('Choose from gallery'),
              onTap: () => Navigator.pop(context, ImageSource.gallery),
            ),
            ListTile(
              leading: const Icon(Icons.photo_camera_outlined),
              title: const Text('Take a photo'),
              onTap: () => Navigator.pop(context, ImageSource.camera),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );

    if (source == null) return;

    try {
      final picked = await _imagePicker.pickImage(
        source: source,
        imageQuality: 82,
        maxWidth: 1200,
      );
      if (picked == null) return;

      if (!mounted) return;
      setState(() => _uploadingAvatar = true);

      final upload = await _apiService.postMultipart(
        '/uploads/profile-image',
        file: File(picked.path),
      );
      final data =
          (upload['data'] as Map<String, dynamic>?) ?? <String, dynamic>{};
      final imageUrl = data['url']?.toString().trim() ?? '';
      if (imageUrl.isEmpty) {
        throw ApiException('Profile image upload did not return a URL.');
      }

      await _apiService.put('/users/me', body: {'profileImage': imageUrl});
      if (!mounted) return;
      await _loadProfile();
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Profile photo updated')));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to update profile photo: $e')),
      );
    } finally {
      if (mounted) {
        setState(() => _uploadingAvatar = false);
      }
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

  Future<void> _sendPasswordResetEmail() async {
    final email = _me['email']?.toString().trim() ?? '';
    if (email.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('No email address is linked to this account.'),
        ),
      );
      return;
    }

    try {
      await FirebaseAuth.instance.sendPasswordResetEmail(email: email);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Password reset link sent to $email')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not send password reset email: $e')),
      );
    }
  }

  void _showPrivacyInfo() {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _SecuritySheet(
        email: _me['email']?.toString() ?? '',
        onPasswordReset: () {
          Navigator.pop(context);
          _sendPasswordResetEmail();
        },
      ),
    );
  }

  void _showHelpInfo() {
    Navigator.pushNamed(
      context,
      AppRoutes.helpCenter,
      arguments: <String, dynamic>{'fromProvider': _isProvider},
    );
  }

  void _showVerificationInfo() {
    if (_isProvider) {
      showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (context) => const _ProviderVerificationSheet(),
      );
      return;
    }

    final status = _me['emailVerified'] == true ? 'verified' : 'basic';

    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => SafeArea(
        child: Container(
          margin: const EdgeInsets.all(16),
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(22),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(Icons.verified_user_outlined, color: Color(0xFF273D98)),
                  SizedBox(width: 8),
                  Text(
                    'Verification',
                    style: TextStyle(
                      color: Color(0xFF121C33),
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                'Customer account verification status: ${status.toUpperCase()}. Keep your email, phone number, and profile information up to date for safer bookings.',
                style: const TextStyle(
                  color: Color(0xFF5E6F88),
                  fontSize: 14.5,
                  height: 1.45,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 14),
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
                  child: const Text('Done'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showNotificationSettings() {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => const _NotificationSheet(),
    );
  }

  void _showServicesSettings() {
    final categories = (_providerProfile['categories'] as List?)
            ?.map((e) => e.toString())
            .toList() ??
        <String>[];
    final city = _providerProfile['city']?.toString() ?? '';
    final district = _providerProfile['district']?.toString() ?? '';
    final experience = int.tryParse(_providerProfile['yearsExperience']?.toString() ?? '0') ?? 0;

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _ServicesSheet(
        initialCategories: categories,
        initialCity: city,
        initialDistrict: district,
        initialExperience: experience,
        onSaved: _loadProfile,
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
                        const _ProfileSkeleton()
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
                          initial: _avatarInitial(),
                          uploading: _uploadingAvatar,
                          onAvatarTap: _changeProfilePhoto,
                        ),
                        if (_isProvider) ...[
                          const SizedBox(height: 16),
                          const _SectionHeader('Account'),
                          _ActionTile(
                            icon: Icons.person_outline_rounded,
                            title: 'Profile Info',
                            onTap: _openEditProfile,
                          ),
                          const SizedBox(height: 16),
                          const _SectionHeader('Provider Settings'),
                          _AvailabilityTile(
                            enabled: !_savingAvailability,
                            value: _isAvailable,
                            onChanged: _toggleAvailability,
                          ),
                          const SizedBox(height: 8),
                          _ActionTile(
                            icon: Icons.work_outline_rounded,
                            title: 'Services & Availability',
                            onTap: _showServicesSettings,
                          ),
                        ] else ...[
                          const SizedBox(height: 16),
                          const _SectionHeader('Account'),
                          _ActionTile(
                            icon: Icons.person_outline_rounded,
                            title: 'Edit Profile',
                            onTap: _openEditProfile,
                          ),
                        ],
                        const SizedBox(height: 16),
                        const _SectionHeader('Security & Trust'),
                        _ActionTile(
                          icon: Icons.lock_outline_rounded,
                          title: 'Privacy & Security',
                          onTap: _showPrivacyInfo,
                        ),
                        const SizedBox(height: 8),
                        _ActionTile(
                          icon: Icons.verified_user_outlined,
                          title: 'Verification',
                          onTap: _showVerificationInfo,
                        ),
                        const SizedBox(height: 16),
                        const _SectionHeader('Preferences'),
                        _ActionTile(
                          icon: Icons.notifications_none_rounded,
                          title: 'Notification Settings',
                          onTap: _showNotificationSettings,
                        ),
                        const SizedBox(height: 8),
                        _ActionTile(
                          icon: Icons.language_rounded,
                          title: 'Language (${_languageLabel()})',
                          onTap: _openLanguagePicker,
                        ),
                        const SizedBox(height: 16),
                        const _SectionHeader('Support'),
                        _ActionTile(
                          icon: Icons.help_outline_rounded,
                          title: 'Help & Support',
                          onTap: _showHelpInfo,
                        ),
                        const SizedBox(height: 8),
                        _ActionTile(
                          icon: Icons.info_outline_rounded,
                          title: 'About LankaServe',
                          onTap: () {
                            showModalBottomSheet<void>(
                              context: context,
                              builder: (context) => SafeArea(
                                child: Padding(
                                  padding: const EdgeInsets.all(24),
                                  child: Column(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      const Text(
                                        'LankaServe',
                                        style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Color(0xFF141C34)),
                                      ),
                                      const SizedBox(height: 8),
                                      const Text('Version 1.0.0', style: TextStyle(color: Color(0xFF66758E))),
                                      const SizedBox(height: 24),
                                      SizedBox(
                                        width: double.infinity,
                                        child: ElevatedButton(
                                          onPressed: () => Navigator.pop(context),
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor: const Color(0xFF273D98),
                                            foregroundColor: Colors.white,
                                            padding: const EdgeInsets.symmetric(vertical: 13),
                                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                          ),
                                          child: const Text('Close'),
                                        ),
                                      )
                                    ],
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
                        const SizedBox(height: 24),
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

class _EditProfileSheet extends StatefulWidget {
  const _EditProfileSheet({
    required this.initialName,
    required this.initialEmail,
    required this.initialCity,
    required this.initialDistrict,
    required this.initialBio,
  });

  final String initialName;
  final String initialEmail;
  final String initialCity;
  final String initialDistrict;
  final String initialBio;

  @override
  State<_EditProfileSheet> createState() => _EditProfileSheetState();
}

class _EditProfileSheetState extends State<_EditProfileSheet> {
  late final TextEditingController nameController;
  late final TextEditingController emailController;
  late final TextEditingController cityController;
  late final TextEditingController districtController;
  late final TextEditingController bioController;

  @override
  void initState() {
    super.initState();
    nameController = TextEditingController(text: widget.initialName);
    emailController = TextEditingController(text: widget.initialEmail);
    cityController = TextEditingController(text: widget.initialCity);
    districtController = TextEditingController(text: widget.initialDistrict);
    bioController = TextEditingController(text: widget.initialBio);
  }

  @override
  void dispose() {
    nameController.dispose();
    emailController.dispose();
    cityController.dispose();
    districtController.dispose();
    bioController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.viewInsetsOf(context).bottom;
    return SafeArea(
      top: false,
      child: Padding(
        padding: EdgeInsets.only(bottom: bottomInset),
        child: Container(
          padding: const EdgeInsets.fromLTRB(18, 14, 18, 18),
          decoration: const BoxDecoration(
            color: Color(0xFFF8F9FB),
            borderRadius: BorderRadius.vertical(top: Radius.circular(26)),
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 42,
                    height: 4,
                    decoration: BoxDecoration(
                      color: const Color(0xFFD5DCE8),
                      borderRadius: BorderRadius.circular(99),
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                const Text(
                  'Edit Profile',
                  style: TextStyle(
                    color: Color(0xFF121C33),
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 12),
                _SheetField(
                  label: 'Full Name',
                  controller: nameController,
                  textInputAction: TextInputAction.next,
                ),
                const SizedBox(height: 10),
                _SheetField(
                  label: 'Email Address',
                  controller: emailController,
                  readOnly: true,
                  prefixIcon: Icons.email_outlined,
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: _SheetField(
                        label: 'City',
                        controller: cityController,
                        textInputAction: TextInputAction.next,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _SheetField(
                        label: 'District',
                        controller: districtController,
                        textInputAction: TextInputAction.next,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                _SheetField(
                  label: 'Bio',
                  controller: bioController,
                  maxLines: 3,
                  keyboardType: TextInputType.multiline,
                  textInputAction: TextInputAction.newline,
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => Navigator.pop(context),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFF2F4DA0),
                          side: const BorderSide(color: Color(0xFFD1DAE8)),
                          padding: const EdgeInsets.symmetric(vertical: 13),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(13),
                          ),
                        ),
                        child: const Text(
                          'Cancel',
                          style: TextStyle(fontWeight: FontWeight.w800),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () =>
                            Navigator.pop(context, <String, String>{
                              'name': nameController.text.trim(),
                              'city': cityController.text.trim(),
                              'district': districtController.text.trim(),
                              'bio': bioController.text.trim(),
                            }),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF2F4DA0),
                          foregroundColor: Colors.white,
                          elevation: 0,
                          padding: const EdgeInsets.symmetric(vertical: 13),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(13),
                          ),
                        ),
                        child: const Text(
                          'Save',
                          style: TextStyle(fontWeight: FontWeight.w800),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _SecuritySheet extends StatelessWidget {
  const _SecuritySheet({required this.email, required this.onPasswordReset});

  final String email;
  final VoidCallback onPasswordReset;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.fromLTRB(18, 14, 18, 18),
        decoration: const BoxDecoration(
          color: Color(0xFFF8F9FB),
          borderRadius: BorderRadius.vertical(top: Radius.circular(26)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 42,
                height: 4,
                decoration: BoxDecoration(
                  color: const Color(0xFFD5DCE8),
                  borderRadius: BorderRadius.circular(99),
                ),
              ),
            ),
            const SizedBox(height: 14),
            const Text(
              'Privacy & Security',
              style: TextStyle(
                color: Color(0xFF121C33),
                fontSize: 20,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 12),
            _SecurityRow(
              icon: Icons.email_outlined,
              title: 'Email Address',
              value: email.isEmpty ? 'Not linked' : email,
            ),
            const SizedBox(height: 10),
            _SecurityRow(
              icon: Icons.lock_reset_rounded,
              title: 'Password',
              value: 'Send a secure password reset link to your email.',
            ),
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: onPasswordReset,
                icon: const Icon(Icons.lock_reset_rounded, size: 18),
                label: const Text('Send Password Reset Email'),
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
            const SizedBox(height: 8),
            const Text(
              'For Google accounts, password changes are handled by Google account security.',
              style: TextStyle(
                color: Color(0xFF6C7B94),
                fontSize: 12,
                height: 1.35,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SecurityRow extends StatelessWidget {
  const _SecurityRow({
    required this.icon,
    required this.title,
    required this.value,
  });

  final IconData icon;
  final String title;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(15),
        border: Border.all(color: const Color(0xFFE7EBF2)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: const Color(0xFF63738D), size: 21),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: Color(0xFF1A2842),
                    fontSize: 13.5,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  value,
                  style: const TextStyle(
                    color: Color(0xFF6C7B94),
                    fontSize: 12.5,
                    height: 1.3,
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

class _SheetField extends StatelessWidget {
  const _SheetField({
    required this.label,
    this.controller,
    this.readOnly = false,
    this.prefixIcon,
    this.maxLines = 1,
    this.keyboardType,
    this.textInputAction,
  });

  final String label;
  final TextEditingController? controller;
  final bool readOnly;
  final IconData? prefixIcon;
  final int maxLines;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      readOnly: readOnly,
      maxLines: maxLines,
      keyboardType: keyboardType,
      textInputAction: textInputAction,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: prefixIcon == null ? null : Icon(prefixIcon, size: 19),
        filled: true,
        fillColor: readOnly ? const Color(0xFFF0F4FA) : Colors.white,
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
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 12,
          vertical: 12,
        ),
      ),
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

class _ProfileSkeleton extends StatelessWidget {
  const _ProfileSkeleton();

  @override
  Widget build(BuildContext context) {
    return ShimmerContainer(
      child: Column(
        children: [
          ShimmerBox(height: 184, borderRadius: BorderRadius.circular(22)),
          const SizedBox(height: 12),
          ...List.generate(
            5,
            (index) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: ShimmerBox(height: 56, borderRadius: BorderRadius.circular(16)),
            ),
          ),
          const SizedBox(height: 86),
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
    required this.initial,
    required this.uploading,
    required this.onAvatarTap,
  });

  final String name;
  final String accountLabel;
  final String avatarUrl;
  final String initial;
  final bool uploading;
  final VoidCallback onAvatarTap;

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
          GestureDetector(
            onTap: uploading ? null : onAvatarTap,
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                CircleAvatar(
                  radius: 40,
                  backgroundColor: const Color(0xFFE8EDF4),
                  backgroundImage: avatarUrl.isNotEmpty
                      ? NetworkImage(avatarUrl)
                      : null,
                  child: avatarUrl.isEmpty
                      ? Text(
                          initial,
                          style: const TextStyle(
                            color: Color(0xFF273D98),
                            fontSize: 24,
                            fontWeight: FontWeight.w800,
                          ),
                        )
                      : null,
                ),
                Positioned(
                  right: -2,
                  bottom: -2,
                  child: Container(
                    width: 28,
                    height: 28,
                    decoration: BoxDecoration(
                      color: const Color(0xFF273D98),
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 2),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.14),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: uploading
                        ? const Padding(
                            padding: EdgeInsets.all(7),
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Icon(
                            Icons.camera_alt_rounded,
                            color: Colors.white,
                            size: 15,
                          ),
                  ),
                ),
              ],
            ),
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

class _SectionHeader extends StatelessWidget {
  const _SectionHeader(this.title);

  final String title;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 8),
      child: Text(
        title.toUpperCase(),
        style: const TextStyle(
          color: Color(0xFF8EA0B8),
          fontSize: 12,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.5,
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

class _NotificationSheet extends StatefulWidget {
  const _NotificationSheet();

  @override
  State<_NotificationSheet> createState() => _NotificationSheetState();
}

class _NotificationSheetState extends State<_NotificationSheet> {
  bool jobUpdates = true;
  bool newMessages = true;
  bool paymentAlerts = false;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.fromLTRB(18, 14, 18, 24),
        decoration: const BoxDecoration(
          color: Color(0xFFF8F9FB),
          borderRadius: BorderRadius.vertical(top: Radius.circular(26)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 42,
                height: 4,
                decoration: BoxDecoration(
                  color: const Color(0xFFD5DCE8),
                  borderRadius: BorderRadius.circular(99),
                ),
              ),
            ),
            const SizedBox(height: 14),
            const Text(
              'Notification Settings',
              style: TextStyle(
                color: Color(0xFF121C33),
                fontSize: 20,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 16),
            _buildSwitch('Job Updates', 'Receive notifications about status changes of your jobs.', jobUpdates, (v) => setState(() => jobUpdates = v)),
            const SizedBox(height: 12),
            _buildSwitch('New Messages', 'Get notified when a provider or customer sends you a message.', newMessages, (v) => setState(() => newMessages = v)),
            const SizedBox(height: 12),
            _buildSwitch('Payment Alerts', 'Important notifications regarding invoices and bank payouts.', paymentAlerts, (v) => setState(() => paymentAlerts = v)),
          ],
        ),
      ),
    );
  }

  Widget _buildSwitch(String title, String description, bool value, ValueChanged<bool> onChanged) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE7EBF2)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: Color(0xFF1A2842),
                    fontSize: 15.5,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  description,
                  style: const TextStyle(
                    color: Color(0xFF6C7B94),
                    fontSize: 13,
                    height: 1.3,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Switch(
            value: value,
            onChanged: onChanged,
            activeTrackColor: const Color(0xFF273D98),
          ),
        ],
      ),
    );
  }
}

class _ProviderVerificationSheet extends StatelessWidget {
  const _ProviderVerificationSheet();

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Container(
        height: MediaQuery.of(context).size.height * 0.85,
        padding: const EdgeInsets.fromLTRB(18, 14, 18, 18),
        decoration: const BoxDecoration(
          color: Color(0xFFF8F9FB),
          borderRadius: BorderRadius.vertical(top: Radius.circular(26)),
        ),
        child: Column(
          children: [
            Container(
              width: 42,
              height: 4,
              decoration: BoxDecoration(
                color: const Color(0xFFD5DCE8),
                borderRadius: BorderRadius.circular(99),
              ),
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                const Expanded(
                  child: Text(
                    'Provider Verification',
                    style: TextStyle(
                      color: Color(0xFF121C33),
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFF0ED),
                    border: Border.all(color: const Color(0xFFFFD4CA)),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Text(
                    'NOT VERIFIED',
                    style: TextStyle(
                      color: Color(0xFFDC2626),
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Expanded(
              child: ListView(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF3FE),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFD9E2F9)),
                    ),
                    child: const Text(
                      'Required: upload a clear NIC/passport image and any trade certificate, business registration, or work proof you have.',
                      style: TextStyle(color: Color(0xFF2F4DA0), fontSize: 13.5, height: 1.4),
                    ),
                  ),
                  const SizedBox(height: 16),
                  const _SheetField(label: 'Legal Full Name', controller: null, readOnly: true),
                  const SizedBox(height: 10),
                  const _SheetField(label: 'NIC / Passport Number', controller: null, readOnly: true),
                  const SizedBox(height: 10),
                  const _SheetField(label: 'Phone Number', controller: null, readOnly: true),
                  const SizedBox(height: 10),
                  const _SheetField(label: 'Primary Service Area', controller: null, readOnly: true),
                  const SizedBox(height: 10),
                  const _SheetField(label: 'Residential / Business Address', controller: null, readOnly: true, maxLines: 3),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () => Navigator.pop(context),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF2F4DA0),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      child: const Text('Submit Documents (Mock)', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                    ),
                  ),
                  const SizedBox(height: 20),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ServicesSheet extends StatefulWidget {
  const _ServicesSheet({
    required this.initialCategories,
    required this.initialCity,
    required this.initialDistrict,
    required this.initialExperience,
    required this.onSaved,
  });

  final List<String> initialCategories;
  final String initialCity;
  final String initialDistrict;
  final int initialExperience;
  final VoidCallback onSaved;

  @override
  State<_ServicesSheet> createState() => _ServicesSheetState();
}

class _ServicesSheetState extends State<_ServicesSheet> {
  static const List<String> _allCategories = [
    'Plumbing',
    'Electrical',
    'Cleaning',
    'Carpentry',
    'Painting',
    'Gardening',
    'AC Repair',
    'Appliance Repair',
    'Moving & Transport',
    'Pest Control',
    'Roofing',
    'Masonry',
  ];

  late final Set<String> _selectedCategories;
  late final TextEditingController _cityController;
  late final TextEditingController _districtController;
  late final TextEditingController _yearsController;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _selectedCategories = Set<String>.from(widget.initialCategories);
    _cityController = TextEditingController(text: widget.initialCity);
    _districtController = TextEditingController(text: widget.initialDistrict);
    _yearsController = TextEditingController(
      text: widget.initialExperience > 0 ? widget.initialExperience.toString() : '',
    );
  }

  @override
  void dispose() {
    _cityController.dispose();
    _districtController.dispose();
    _yearsController.dispose();
    super.dispose();
  }

  void _toggleCategory(String category) {
    setState(() {
      if (_selectedCategories.contains(category)) {
        _selectedCategories.remove(category);
      } else {
        _selectedCategories.add(category);
      }
    });
  }

  Future<void> _saveChanges() async {
    if (_saving) return;
    setState(() => _saving = true);

    try {
      final years = int.tryParse(_yearsController.text.trim()) ?? 0;
      await ProviderService().updateProviderProfile({
        'categories': _selectedCategories.toList(),
        'city': _cityController.text.trim(),
        'district': _districtController.text.trim(),
        'yearsExperience': years,
      });

      if (!mounted) return;
      widget.onSaved();
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Services updated successfully')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to update services: $e')),
      );
    } finally {
      if (mounted) {
        setState(() => _saving = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.viewInsetsOf(context).bottom;
    return SafeArea(
      top: false,
      child: Padding(
        padding: EdgeInsets.only(bottom: bottomInset),
        child: Container(
          height: MediaQuery.of(context).size.height * 0.78,
          padding: const EdgeInsets.fromLTRB(18, 14, 18, 18),
          decoration: const BoxDecoration(
            color: Color(0xFFF8F9FB),
            borderRadius: BorderRadius.vertical(top: Radius.circular(26)),
          ),
          child: Column(
            children: [
              Container(
                width: 42,
                height: 4,
                decoration: BoxDecoration(
                  color: const Color(0xFFD5DCE8),
                  borderRadius: BorderRadius.circular(99),
                ),
              ),
              const SizedBox(height: 14),
              const Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Services & Availability',
                  style: TextStyle(
                    color: Color(0xFF121C33),
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Expanded(
                child: ListView(
                  children: [
                    const Text(
                      'Select Categories',
                      style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: Color(0xFF1A2842)),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Choose the services you offer',
                      style: TextStyle(color: Color(0xFF6C7B94), fontSize: 13, height: 1.3),
                    ),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 8,
                      runSpacing: 10,
                      children: _allCategories.map((cat) {
                        final isSelected = _selectedCategories.contains(cat);
                        return GestureDetector(
                          onTap: () => _toggleCategory(cat),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
                            decoration: BoxDecoration(
                              color: isSelected ? const Color(0xFF2F4DA0) : Colors.white,
                              borderRadius: BorderRadius.circular(22),
                              border: Border.all(
                                color: isSelected ? const Color(0xFF2F4DA0) : const Color(0xFFD1DAE8),
                                width: 1.2,
                              ),
                              boxShadow: isSelected
                                  ? [
                                      BoxShadow(
                                        color: const Color(0xFF2F4DA0).withValues(alpha: 0.18),
                                        blurRadius: 8,
                                        offset: const Offset(0, 2),
                                      ),
                                    ]
                                  : null,
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                if (isSelected) ...[
                                  const Icon(Icons.check_rounded, color: Colors.white, size: 16),
                                  const SizedBox(width: 5),
                                ],
                                Text(
                                  cat,
                                  style: TextStyle(
                                    color: isSelected ? Colors.white : const Color(0xFF5E6F88),
                                    fontWeight: FontWeight.w700,
                                    fontSize: 13.5,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 24),
                    Container(
                      width: double.infinity,
                      height: 1,
                      color: const Color(0xFFE7EBF2),
                    ),
                    const SizedBox(height: 20),
                    const Text(
                      'Service Area',
                      style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: Color(0xFF1A2842)),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Set your primary location for jobs',
                      style: TextStyle(color: Color(0xFF6C7B94), fontSize: 13, height: 1.3),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: _SheetField(
                            label: 'City',
                            controller: _cityController,
                            textInputAction: TextInputAction.next,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _SheetField(
                            label: 'District',
                            controller: _districtController,
                            textInputAction: TextInputAction.next,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    Container(
                      width: double.infinity,
                      height: 1,
                      color: const Color(0xFFE7EBF2),
                    ),
                    const SizedBox(height: 20),
                    const Text(
                      'Years of Experience',
                      style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: Color(0xFF1A2842)),
                    ),
                    const SizedBox(height: 8),
                    _SheetField(
                      label: 'Years',
                      controller: _yearsController,
                      keyboardType: TextInputType.number,
                      textInputAction: TextInputAction.done,
                    ),
                    const SizedBox(height: 28),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _saving ? null : _saveChanges,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF2F4DA0),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        ),
                        child: _saving
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2.5,
                                  color: Colors.white,
                                ),
                              )
                            : const Text('Save Changes', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                      ),
                    ),
                    const SizedBox(height: 16),
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
