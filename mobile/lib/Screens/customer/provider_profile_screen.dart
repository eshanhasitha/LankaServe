import 'package:flutter/material.dart';

import '../../services/provider_service.dart';
import '../../services/review_service.dart';
import '../../widgets/customer_bottom_nav.dart';
import '../../widgets/ui_scale.dart';

class ProviderProfileScreen extends StatefulWidget {
  const ProviderProfileScreen({super.key});

  @override
  State<ProviderProfileScreen> createState() => _ProviderProfileScreenState();
}

class _ProviderProfileScreenState extends State<ProviderProfileScreen> {
  final ProviderService _providerService = ProviderService();
  final ReviewService _reviewService = ReviewService();

  String? _providerUserId;
  bool _loadedArgs = false;
  bool _loading = true;
  String? _error;
  Map<String, dynamic>? _profile;
  List<Map<String, dynamic>> _reviews = <Map<String, dynamic>>[];

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_loadedArgs) return;
    _loadedArgs = true;
    final args = ModalRoute.of(context)?.settings.arguments;
    if (args is String && args.isNotEmpty) {
      _providerUserId = args;
    }
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    final providerId = _providerUserId;
    if (providerId == null || providerId.isEmpty) {
      setState(() {
        _loading = false;
        _error = 'Provider ID not found.';
      });
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final profile = await _providerService.getPublicProviderProfile(providerId);
      final reviews = await _reviewService.fetchProviderReviews(providerId);
      if (!mounted) return;
      setState(() {
        _profile = profile;
        _reviews = reviews;
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
              const _Header(),
              Expanded(
                child: _loading
                    ? const Center(
                        child: CircularProgressIndicator(
                          color: Color(0xFF273D98),
                        ),
                      )
                    : _error != null
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 24),
                          child: Text(
                            _error!,
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              color: Color(0xFF6E7F98),
                              fontSize: 14.5,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _loadProfile,
                        child: ListView(
                  padding: EdgeInsets.fromLTRB(0, 0, 0, 12),
                  children: [
                    _TopProfilePanel(profile: _profile ?? const <String, dynamic>{}),
                    const SizedBox(height: 12),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 18),
                      child: _AboutSection(profile: _profile ?? const <String, dynamic>{}),
                    ),
                    const SizedBox(height: 16),
                    _SectionHeader(
                      title: 'Services Offered',
                      action: 'View All',
                    ),
                    const SizedBox(height: 8),
                    ..._serviceCards(_profile).map(
                      (card) => Padding(
                        padding: const EdgeInsets.fromLTRB(18, 0, 18, 8),
                        child: card,
                      ),
                    ),
                    const SizedBox(height: 16),
                    _SectionHeader(
                      title: 'Customer Reviews',
                      action: 'See All',
                    ),
                    const SizedBox(height: 8),
                    ..._reviewCards(_reviews).map(
                      (card) => Padding(
                        padding: const EdgeInsets.fromLTRB(18, 0, 18, 8),
                        child: card,
                      ),
                    ),
                    const SizedBox(height: 12),
                    const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 14),
                      child: _BottomActions(),
                    ),
                  ],
                ),
                      ),
              ),
            ],
          ),
        ),
      ),
      bottomNavigationBar: const CustomerBottomNav(activeIndex: 1),
    );
  }

  List<Widget> _serviceCards(Map<String, dynamic>? profile) {
    final categories = (profile?['categories'] as List?)
            ?.map((e) => e.toString())
            .where((e) => e.trim().isNotEmpty)
            .toList() ??
        <String>[];
    if (categories.isEmpty) {
      categories.add('General Service');
    }
    return categories.take(3).map((category) {
      return _ServiceCard(
        icon: _iconForCategory(category),
        iconColor: const Color(0xFF3D5FD2),
        iconBg: const Color(0xFFE6ECF6),
        title: category,
        subtitle: 'Service provided by this professional',
        price: 'LKR 2,500',
      );
    }).toList();
  }

  List<Widget> _reviewCards(List<Map<String, dynamic>> reviews) {
    if (reviews.isEmpty) {
      return const <Widget>[_EmptyReviewCard()];
    }
    return reviews.take(4).map((item) => _ReviewCard(review: item)).toList();
  }

  IconData _iconForCategory(String category) {
    final value = category.toLowerCase();
    if (value.contains('electric')) return Icons.bolt_rounded;
    if (value.contains('clean')) return Icons.cleaning_services_rounded;
    if (value.contains('plumb')) return Icons.plumbing_rounded;
    if (value.contains('ac')) return Icons.ac_unit_rounded;
    return Icons.handyman_rounded;
  }
}

class _Header extends StatelessWidget {
  const _Header();

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
            borderRadius: BorderRadius.circular(20),
            onTap: () => Navigator.of(context).maybePop(),
            child: const SizedBox(
              width: 40,
              height: 40,
              child: Icon(
                Icons.arrow_back_rounded,
                color: Color(0xFF1A2940),
                size: 32,
              ),
            ),
          ),
          const Expanded(
            child: Center(
              child: Text(
                'Provider Profile',
                style: TextStyle(
                  color: Color(0xFF222F46),
                  fontSize: 19,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -0.2,
                ),
              ),
            ),
          ),
          InkWell(
            borderRadius: BorderRadius.circular(20),
            onTap: () {},
            child: const SizedBox(
              width: 40,
              height: 40,
              child: Icon(
                Icons.share_outlined,
                color: Color(0xFF1A2940),
                size: 24,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TopProfilePanel extends StatelessWidget {
  const _TopProfilePanel({required this.profile});

  final Map<String, dynamic> profile;

  @override
  Widget build(BuildContext context) {
    final user = profile['userId'] as Map<String, dynamic>?;
    final name = user?['name']?.toString() ?? 'Service Provider';
    final avatar = user?['profileImage']?.toString() ?? '';
    final rating = (profile['stats']?['averageRating'] as num?)?.toStringAsFixed(1) ??
        profile['stats']?['averageRating']?.toString() ??
        '0.0';
    final reviews = profile['totalReviews'] ?? 0;
    final years = profile['yearsExperience']?.toString() ?? '0';
    final city = profile['city']?.toString().trim().isNotEmpty == true
        ? profile['city']?.toString() ?? ''
        : profile['district']?.toString().trim().isNotEmpty == true
        ? profile['district']?.toString() ?? ''
        : 'Sri Lanka';

    return Container(
      padding: const EdgeInsets.fromLTRB(18, 16, 18, 18),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: const Color(0xFFE3E8F0)),
        borderRadius: const BorderRadius.vertical(bottom: Radius.circular(34)),
      ),
      child: Column(
        children: [
          Stack(
            clipBehavior: Clip.none,
            children: [
              Container(
                width: 136,
                height: 136,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: const Color(0xFFE8EDF4),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x160F172A),
                      blurRadius: 16,
                      offset: Offset(0, 4),
                    ),
                  ],
                  image: DecorationImage(
                    image: NetworkImage(
                      avatar.isNotEmpty
                          ? avatar
                          : 'https://ui-avatars.com/api/?name=${Uri.encodeComponent(name)}',
                    ),
                    fit: BoxFit.cover,
                  ),
                ),
              ),
              Positioned(
                right: 4,
                bottom: 6,
                child: Container(
                  width: 30,
                  height: 30,
                  decoration: BoxDecoration(
                    color: const Color(0xFF4A84EC),
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 3),
                  ),
                  child: const Icon(
                    Icons.verified_rounded,
                    color: Colors.white,
                    size: 18,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            name,
            style: TextStyle(
              color: Color(0xFF141C34),
              fontSize: 21,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 4),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.star_rounded, color: Color(0xFFFACC15), size: 21),
              const SizedBox(width: 4),
              Text(
                rating,
                style: const TextStyle(
                  color: Color(0xFF141C34),
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(width: 6),
              Text(
                '($reviews Reviews)',
                style: const TextStyle(
                  color: Color(0xFF8EA0B8),
                  fontSize: 15,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: _TopInfoCard(title: 'EXPERIENCE', value: '$years Years'),
              ),
              SizedBox(width: 10),
              Expanded(child: _TopInfoCard(title: 'SERVICE AREA', value: city)),
            ],
          ),
          const SizedBox(height: 10),
          const Row(
            children: [
              Expanded(child: _ActionButton(title: 'Hire Now', filled: true)),
              SizedBox(width: 10),
              Expanded(child: _ActionButton(title: 'Message', filled: false)),
            ],
          ),
        ],
      ),
    );
  }
}

class _TopInfoCard extends StatelessWidget {
  const _TopInfoCard({required this.title, required this.value});

  final String title;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 86,
      decoration: BoxDecoration(
        color: const Color(0xFFF3F5F9),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            title,
            style: const TextStyle(
              color: Color(0xFF8EA0B8),
              fontSize: 11,
              fontWeight: FontWeight.w800,
              letterSpacing: 1.2,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: const TextStyle(
              color: Color(0xFF1A233A),
              fontSize: 17,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  const _ActionButton({required this.title, required this.filled});

  final String title;
  final bool filled;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 54,
      decoration: BoxDecoration(
        color: filled ? const Color(0xFF273D98) : const Color(0xFFE9EDF4),
        borderRadius: BorderRadius.circular(18),
      ),
      alignment: Alignment.center,
      child: Text(
        title,
        style: TextStyle(
          color: filled ? Colors.white : const Color(0xFF374760),
          fontSize: 17,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _AboutSection extends StatelessWidget {
  const _AboutSection({required this.profile});

  final Map<String, dynamic> profile;

  @override
  Widget build(BuildContext context) {
    final bio = profile['bio']?.toString().trim();
    final about = (bio != null && bio.isNotEmpty)
        ? bio
        : 'This provider has not added an about section yet.';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'About',
          style: TextStyle(
            color: Color(0xFF141C34),
            fontSize: 19,
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 10),
        Text(
          about,
          style: const TextStyle(
            color: Color(0xFF60718C),
            fontSize: 13.5,
            fontWeight: FontWeight.w500,
            height: 1.5,
          ),
        ),
      ],
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title, required this.action});

  final String title;
  final String action;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 18),
      child: Row(
        children: [
          Text(
            title,
            style: const TextStyle(
              color: Color(0xFF141C34),
              fontSize: 19,
              fontWeight: FontWeight.w800,
            ),
          ),
          const Spacer(),
          Text(
            action,
            style: const TextStyle(
              color: Color(0xFF3D5FD2),
              fontSize: 12,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _ServiceCard extends StatelessWidget {
  const _ServiceCard({
    required this.icon,
    required this.iconColor,
    required this.iconBg,
    required this.title,
    required this.subtitle,
    required this.price,
  });

  final IconData icon;
  final Color iconColor;
  final Color iconBg;
  final String title;
  final String subtitle;
  final String price;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE4EAF2)),
      ),
      child: Row(
        children: [
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: iconBg,
              borderRadius: BorderRadius.circular(15),
            ),
            child: Icon(icon, color: iconColor, size: 33),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: Color(0xFF1F2A40),
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: const TextStyle(
                    color: Color(0xFF8EA0B8),
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              const Text(
                'From',
                style: TextStyle(
                  color: Color(0xFF8EA0B8),
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                price,
                style: const TextStyle(
                  color: Color(0xFF3D5FD2),
                  fontSize: 17,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ReviewCard extends StatelessWidget {
  const _ReviewCard({required this.review});

  final Map<String, dynamic> review;

  @override
  Widget build(BuildContext context) {
    final customer = review['customerId'] as Map<String, dynamic>?;
    final reviewerNameRaw = customer?['name']?.toString().trim() ?? '';
    final reviewerName = reviewerNameRaw.isNotEmpty ? reviewerNameRaw : 'Customer';
    final reviewerAvatar = customer?['profileImage']?.toString() ?? '';
    final ratingValue = (review['rating'] as num?)?.toDouble() ?? 0;
    final rating = ratingValue.toStringAsFixed(1);
    final commentRaw = review['comment']?.toString().trim() ?? '';
    final comment = commentRaw.isNotEmpty ? commentRaw : 'No comment provided.';
    final createdAt = DateTime.tryParse(review['createdAt']?.toString() ?? '');
    final age = _age(createdAt);

    return Container(
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE4EAF2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 22,
                backgroundColor: const Color(0xFFD9DFE8),
                backgroundImage: reviewerAvatar.isNotEmpty
                    ? NetworkImage(reviewerAvatar)
                    : null,
                child: reviewerAvatar.isEmpty
                    ? const Icon(
                        Icons.person_outline_rounded,
                        color: Color(0xFF8EA0B8),
                        size: 24,
                      )
                    : null,
              ),
              const SizedBox(width: 10),
              Text(
                reviewerName,
                style: const TextStyle(
                  color: Color(0xFF141C34),
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const Spacer(),
              const Icon(
                Icons.star_rounded,
                color: Color(0xFFFACC15),
                size: 20,
              ),
              const SizedBox(width: 4),
              Text(
                rating,
                style: const TextStyle(
                  color: Color(0xFF141C34),
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            '"$comment"',
            style: const TextStyle(
              color: Color(0xFF4E5E78),
              fontSize: 13.5,
              fontWeight: FontWeight.w500,
              height: 1.42,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            age,
            style: const TextStyle(
              color: Color(0xFF9AA8BD),
              fontSize: 12.5,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  String _age(DateTime? createdAt) {
    if (createdAt == null) return 'Recently';
    final diff = DateTime.now().difference(createdAt);
    if (diff.inDays >= 7) {
      final weeks = (diff.inDays / 7).floor();
      return weeks == 1 ? '1 week ago' : '$weeks weeks ago';
    }
    if (diff.inDays >= 1) return '${diff.inDays} days ago';
    if (diff.inHours >= 1) return '${diff.inHours} hours ago';
    return 'Today';
  }
}

class _EmptyReviewCard extends StatelessWidget {
  const _EmptyReviewCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE4EAF2)),
      ),
      child: const Text(
        'No reviews yet for this provider.',
        textAlign: TextAlign.center,
        style: TextStyle(
          color: Color(0xFF6E7F98),
          fontSize: 14,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}

class _BottomActions extends StatelessWidget {
  const _BottomActions();

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Container(
            height: 58,
            decoration: BoxDecoration(
              color: const Color(0xFF273D98),
              borderRadius: BorderRadius.circular(20),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x1F273D98),
                  blurRadius: 12,
                  offset: Offset(0, 4),
                ),
              ],
            ),
            alignment: Alignment.center,
            child: const Text(
              'Contact Provider',
              style: TextStyle(
                color: Colors.white,
                fontSize: 17,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Container(
            height: 58,
            decoration: BoxDecoration(
              color: const Color(0xFFF8F9FB),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFFC8D3E4), width: 2),
            ),
            alignment: Alignment.center,
            child: const Text(
              'Book Service',
              style: TextStyle(
                color: Color(0xFF273D98),
                fontSize: 17,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ),
      ],
    );
  }
}
