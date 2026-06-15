import 'package:flutter/material.dart';

import '../../config/constants.dart';
import '../../config/routes.dart';
import '../../config/ui_styles.dart';
import '../../services/provider_service.dart';
import '../../widgets/customer_bottom_nav.dart';
import '../../widgets/ui_scale.dart';

class ProviderListScreen extends StatefulWidget {
  const ProviderListScreen({super.key});

  @override
  State<ProviderListScreen> createState() => _ProviderListScreenState();
}

class _ProviderListScreenState extends State<ProviderListScreen> {
  final ProviderService _providerService = ProviderService();
  final TextEditingController _searchController = TextEditingController();

  bool _loading = true;
  String? _error;
  List<Map<String, dynamic>> _providers = <Map<String, dynamic>>[];
  _ProviderFilters _filters = const _ProviderFilters();

  static const List<String> _categories = <String>[
    'ALL',
    'Plumbing',
    'Electrical',
    'Carpentry',
    'Painting',
    'Cleaning',
    'Gardening',
    'AC Repair',
    'Appliance Repair',
    'Masonry',
    'Other',
  ];

  @override
  void initState() {
    super.initState();
    _loadProviders();
    _searchController.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadProviders() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final category = _filters.category == 'ALL' ? null : _filters.category;
      final items = await _providerService.searchProviders(
        category: category,
        verified: _filters.verifiedOnly ? true : null,
        page: 1,
        limit: 80,
      );
      if (!mounted) return;
      setState(() {
        _providers = items;
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

  List<Map<String, dynamic>> get _visibleProviders {
    final query = _searchController.text.trim().toLowerCase();
    final filtered = _providers.where((item) {
      final user = item['userId'] as Map<String, dynamic>?;
      final name = user?['name']?.toString().toLowerCase() ?? '';
      final bio = item['bio']?.toString().toLowerCase() ?? '';
      final categoryText =
          (item['categories'] as List?)
              ?.map((e) => e.toString().toLowerCase())
              .join(' ') ??
          '';
      final rating = _providerRating(item);
      final years = _providerYears(item);
      final available = _isOnline(item);

      final queryMatch =
          query.isEmpty ||
          name.contains(query) ||
          bio.contains(query) ||
          categoryText.contains(query);
      final ratingMatch = rating >= _filters.minRating;
      final yearsMatch = years >= _filters.minExperience;
      final topRatedMatch = !_filters.topRated || rating >= 4.5;
      final availableMatch = !_filters.availableNow || available;

      return queryMatch &&
          ratingMatch &&
          yearsMatch &&
          topRatedMatch &&
          availableMatch;
    }).toList();

    switch (_filters.sortBy) {
      case 'rating':
        filtered.sort(
          (a, b) => _providerRating(b).compareTo(_providerRating(a)),
        );
        break;
      case 'jobs':
        filtered.sort((a, b) => _providerJobs(b).compareTo(_providerJobs(a)));
        break;
      default:
        filtered.sort((a, b) {
          final verifiedCompare = (_isVerified(b) ? 1 : 0).compareTo(
            _isVerified(a) ? 1 : 0,
          );
          if (verifiedCompare != 0) return verifiedCompare;
          return _providerRating(b).compareTo(_providerRating(a));
        });
        break;
    }

    return filtered;
  }

  Future<void> _openFilters() async {
    final next = await showModalBottomSheet<_ProviderFilters>(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFFF8F9FC),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return _FilterSheet(initial: _filters, categories: _categories);
      },
    );

    if (next == null) return;
    setState(() => _filters = next);
    await _loadProviders();
  }

  int _activeFilterCount() {
    int count = 0;
    if (_filters.category != 'ALL') count++;
    if (_filters.minRating > 0) count++;
    if (_filters.minExperience > 0) count++;
    if (_filters.availableNow) count++;
    if (_filters.verifiedOnly) count++;
    if (_filters.topRated) count++;
    if (_filters.sortBy != 'recommended') count++;
    return count;
  }

  double _providerRating(Map<String, dynamic> provider) {
    final rating = provider['stats']?['averageRating'];
    if (rating is num) return rating.toDouble();
    return double.tryParse(rating?.toString() ?? '0') ?? 0;
  }

  int _providerJobs(Map<String, dynamic> provider) {
    final jobs = provider['stats']?['completedJobs'];
    if (jobs is num) return jobs.toInt();
    return int.tryParse(jobs?.toString() ?? '0') ?? 0;
  }

  int _providerYears(Map<String, dynamic> provider) {
    final years = provider['yearsExperience'];
    if (years is num) return years.toInt();
    return int.tryParse(years?.toString() ?? '0') ?? 0;
  }

  bool _isVerified(Map<String, dynamic> provider) {
    return provider['verified'] == true;
  }

  bool _isOnline(Map<String, dynamic> provider) {
    final availability = provider['availability']?.toString().toLowerCase();
    return availability == 'online';
  }

  String _providerUserId(Map<String, dynamic> provider) {
    final user = provider['userId'];
    if (user is String) return user;
    if (user is Map<String, dynamic>) {
      return user['_id']?.toString() ?? '';
    }
    return '';
  }

  String _providerName(Map<String, dynamic> provider) {
    final user = provider['userId'] as Map<String, dynamic>?;
    return user?['name']?.toString().trim().isNotEmpty == true
        ? user!['name'].toString().trim()
        : 'Service Provider';
  }

  String _providerAvatar(Map<String, dynamic> provider) {
    final user = provider['userId'] as Map<String, dynamic>?;
    return AppConstants.normalizeUrl(user?['profileImage']?.toString());
  }

  String _providerCategory(Map<String, dynamic> provider) {
    final categories =
        (provider['categories'] as List?)
            ?.map((e) => e.toString().trim())
            .where((e) => e.isNotEmpty)
            .toList() ??
        <String>[];
    return categories.isNotEmpty ? categories.first : 'General';
  }

  String _providerLocation(Map<String, dynamic> provider) {
    final city = provider['city']?.toString().trim() ?? '';
    final district = provider['district']?.toString().trim() ?? '';
    if (city.isNotEmpty && district.isNotEmpty) return '$city, $district';
    if (city.isNotEmpty) return city;
    if (district.isNotEmpty) return district;
    return 'Sri Lanka';
  }

  void _openProfile(Map<String, dynamic> provider) {
    final providerUserId = _providerUserId(provider);
    if (providerUserId.isEmpty) return;

    Navigator.pushNamed(
      context,
      AppRoutes.providerProfile,
      arguments: providerUserId,
    );
  }

  void _openContact(Map<String, dynamic> provider) {
    final providerUserId = _providerUserId(provider);
    if (providerUserId.isEmpty) return;

    Navigator.pushNamed(
      context,
      AppRoutes.chatConversation,
      arguments: <String, dynamic>{
        'counterpartId': providerUserId,
        'counterpartName': _providerName(provider),
        'counterpartAvatar': _providerAvatar(provider),
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final compactScale = UiScale.factor(context, min: 0.76, max: 0.90);
    final providers = _visibleProviders;

    return Scaffold(
      backgroundColor: const Color(0xFFF3F4F7),
      body: SafeArea(
        child: MediaQuery(
          data: MediaQuery.of(
            context,
          ).copyWith(textScaler: TextScaler.linear(compactScale)),
          child: Column(
            children: [
              _Header(
                filterCount: _activeFilterCount(),
                onFilterTap: _openFilters,
                onMapTap: () => Navigator.pushNamed(context, AppRoutes.heatmap),
              ),
              Expanded(
                child: RefreshIndicator(
                  onRefresh: _loadProviders,
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(14, 10, 14, 12),
                    physics: const AlwaysScrollableScrollPhysics(),
                    children: [
                      _SearchField(controller: _searchController),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Text(
                            '${providers.length} providers found',
                            style: const TextStyle(
                              color: Color(0xFF60718C),
                              fontSize: 12.5,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const Spacer(),
                          Text(
                            _filters.sortBy == 'rating'
                                ? 'Sorted: Top Rated'
                                : _filters.sortBy == 'jobs'
                                ? 'Sorted: Most Jobs'
                                : 'Sorted: Recommended',
                            style: const TextStyle(
                              color: Color(0xFF60718C),
                              fontSize: 12.5,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      if (_loading)
                        const _InfoTile('Loading providers...')
                      else if (_error != null)
                        _InfoTile(_error!)
                      else if (providers.isEmpty)
                        const _InfoTile(
                          'No providers match the selected filters.',
                        )
                      else
                        ...providers.map(
                          (item) => Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: _ProviderCard(
                              name: _providerName(item),
                              imageUrl: _providerAvatar(item),
                              category: _providerCategory(item),
                              rating: _providerRating(item),
                              jobs: _providerJobs(item),
                              years: _providerYears(item),
                              location: _providerLocation(item),
                              verified: _isVerified(item),
                              online: _isOnline(item),
                              onViewProfile: () => _openProfile(item),
                              onContact: () => _openContact(item),
                            ),
                          ),
                        ),
                      const SizedBox(height: 8),
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
}

class _Header extends StatelessWidget {
  const _Header({
    required this.onMapTap,
    required this.onFilterTap,
    required this.filterCount,
  });

  final VoidCallback onMapTap;
  final VoidCallback onFilterTap;
  final int filterCount;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 68,
      padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
      decoration: const BoxDecoration(
        color: Color(0xFFF8F9FB),
        border: Border(bottom: BorderSide(color: Color(0xFFE1E6EE))),
      ),
      child: Row(
        children: [
          const Text(
            'Find Providers',
            style: TextStyle(
              color: Color(0xFF121C33),
              fontSize: 18,
              fontWeight: FontWeight.w800,
            ),
          ),
          const Spacer(),
          _HeaderIconButton(icon: Icons.map_outlined, onTap: onMapTap),
          const SizedBox(width: 8),
          _HeaderIconButton(
            icon: Icons.tune_rounded,
            onTap: onFilterTap,
            badgeCount: filterCount,
          ),
        ],
      ),
    );
  }
}

class _HeaderIconButton extends StatelessWidget {
  const _HeaderIconButton({
    required this.icon,
    required this.onTap,
    this.badgeCount = 0,
  });

  final IconData icon;
  final VoidCallback onTap;
  final int badgeCount;

  @override
  Widget build(BuildContext context) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: onTap,
          child: Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFFE2E8F2)),
            ),
            child: Icon(icon, color: const Color(0xFF4E5E78), size: 22),
          ),
        ),
        if (badgeCount > 0)
          Positioned(
            right: -4,
            top: -4,
            child: Container(
              constraints: const BoxConstraints(minWidth: 18, minHeight: 18),
              padding: const EdgeInsets.symmetric(horizontal: 4),
              decoration: const BoxDecoration(
                color: Color(0xFF2F4DA0),
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Text(
                  badgeCount.toString(),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _SearchField extends StatelessWidget {
  const _SearchField({required this.controller});

  final TextEditingController controller;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 48,
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE3E8F2)),
      ),
      child: Row(
        children: [
          const Icon(Icons.search_rounded, color: Color(0xFF9AA8BD), size: 20),
          const SizedBox(width: 8),
          Expanded(
            child: TextField(
              controller: controller,
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
                hintText: 'Search providers by name or skill...',
                hintStyle: TextStyle(
                  color: Color(0xFF8A9AB2),
                  fontSize: 13.5,
                  fontWeight: FontWeight.w500,
                ),
              ),
              style: const TextStyle(
                color: Color(0xFF4E5E78),
                fontSize: 13.8,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ProviderCard extends StatelessWidget {
  const _ProviderCard({
    required this.name,
    required this.imageUrl,
    required this.category,
    required this.rating,
    required this.jobs,
    required this.years,
    required this.location,
    required this.verified,
    required this.online,
    required this.onViewProfile,
    required this.onContact,
  });

  final String name;
  final String imageUrl;
  final String category;
  final double rating;
  final int jobs;
  final int years;
  final String location;
  final bool verified;
  final bool online;
  final VoidCallback onViewProfile;
  final VoidCallback onContact;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE4EAF2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Stack(
            children: [
              ClipRRect(
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(16),
                ),
                child: SizedBox(
                  width: double.infinity,
                  height: 150,
                  child: imageUrl.isNotEmpty
                      ? Image.network(
                          imageUrl,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) =>
                              _fallbackImage(name),
                        )
                      : _fallbackImage(name),
                ),
              ),
              Positioned(
                top: 10,
                left: 10,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FBFF),
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(color: const Color(0xFFDBE6F7)),
                  ),
                  child: Text(
                    category,
                    style: const TextStyle(
                      color: Color(0xFF2F4DA0),
                      fontSize: 10.5,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ),
              Positioned(
                right: 10,
                bottom: 10,
                child: Container(
                  width: 13,
                  height: 13,
                  decoration: BoxDecoration(
                    color: online
                        ? const Color(0xFF22C55E)
                        : const Color(0xFF94A3B8),
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 2),
                  ),
                ),
              ),
            ],
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
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
                          color: Color(0xFF141C34),
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    const Icon(
                      Icons.star_rounded,
                      color: Color(0xFFFACC15),
                      size: 17,
                    ),
                    const SizedBox(width: 3),
                    Text(
                      rating.toStringAsFixed(1),
                      style: const TextStyle(
                        color: Color(0xFF141C34),
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                _MetaRow(
                  icon: Icons.verified_user_outlined,
                  text: '$jobs+ Jobs Completed',
                ),
                const SizedBox(height: 4),
                _MetaRow(icon: Icons.location_on_outlined, text: location),
                const SizedBox(height: 4),
                _MetaRow(
                  icon: Icons.history_edu_rounded,
                  text: years > 0
                      ? '$years+ Years Experience'
                      : 'Experience not specified',
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: onViewProfile,
                        style:
                            AppUiStyles.neutralOutlineButton(
                              radius: BorderRadius.circular(10),
                            ).copyWith(
                              foregroundColor: WidgetStateProperty.all(
                                const Color(0xFF4B5B74),
                              ),
                              side: WidgetStateProperty.all(
                                const BorderSide(color: Color(0xFFD8E1EF)),
                              ),
                              padding: WidgetStateProperty.all(
                                const EdgeInsets.symmetric(vertical: 10),
                              ),
                            ),
                        child: const Text(
                          'View Profile',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: onContact,
                        style:
                            AppUiStyles.primaryButton(
                              radius: BorderRadius.circular(10),
                            ).copyWith(
                              backgroundColor: WidgetStateProperty.all(
                                const Color(0xFF2F4DA0),
                              ),
                              padding: WidgetStateProperty.all(
                                const EdgeInsets.symmetric(vertical: 10),
                              ),
                            ),
                        child: const Text(
                          'Contact',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                if (verified) ...[
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 5,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0xFFE7F8EE),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: const Text(
                      'Verified Provider',
                      style: TextStyle(
                        color: Color(0xFF1E9A50),
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _fallbackImage(String name) {
    return Container(
      color: const Color(0xFFE8EDF5),
      alignment: Alignment.center,
      child: Text(
        name.isNotEmpty ? name.substring(0, 1).toUpperCase() : 'P',
        style: const TextStyle(
          color: Color(0xFF70839F),
          fontSize: 40,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _MetaRow extends StatelessWidget {
  const _MetaRow({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, color: const Color(0xFF7D8EA8), size: 14),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            text,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: Color(0xFF60718C),
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
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

class _ProviderFilters {
  const _ProviderFilters({
    this.category = 'ALL',
    this.minRating = 0,
    this.minExperience = 0,
    this.availableNow = false,
    this.verifiedOnly = false,
    this.topRated = false,
    this.sortBy = 'recommended',
  });

  final String category;
  final double minRating;
  final int minExperience;
  final bool availableNow;
  final bool verifiedOnly;
  final bool topRated;
  final String sortBy;

  _ProviderFilters copyWith({
    String? category,
    double? minRating,
    int? minExperience,
    bool? availableNow,
    bool? verifiedOnly,
    bool? topRated,
    String? sortBy,
  }) {
    return _ProviderFilters(
      category: category ?? this.category,
      minRating: minRating ?? this.minRating,
      minExperience: minExperience ?? this.minExperience,
      availableNow: availableNow ?? this.availableNow,
      verifiedOnly: verifiedOnly ?? this.verifiedOnly,
      topRated: topRated ?? this.topRated,
      sortBy: sortBy ?? this.sortBy,
    );
  }
}

class _FilterSheet extends StatefulWidget {
  const _FilterSheet({required this.initial, required this.categories});

  final _ProviderFilters initial;
  final List<String> categories;

  @override
  State<_FilterSheet> createState() => _FilterSheetState();
}

class _FilterSheetState extends State<_FilterSheet> {
  late _ProviderFilters _draft;

  @override
  void initState() {
    super.initState();
    _draft = widget.initial;
  }

  @override
  Widget build(BuildContext context) {
    final maxHeight = MediaQuery.of(context).size.height * 0.9;
    final safeBottom = MediaQuery.paddingOf(context).bottom;

    return SafeArea(
      top: false,
      child: SizedBox(
        height: maxHeight,
        child: Column(
          children: [
            const SizedBox(height: 8),
            Container(
              width: 44,
              height: 4,
              decoration: BoxDecoration(
                color: const Color(0xFFCAD4E3),
                borderRadius: BorderRadius.circular(999),
              ),
            ),
            const SizedBox(height: 10),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Filters',
                      style: TextStyle(
                        color: Color(0xFF141C34),
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Refine provider results',
                      style: TextStyle(
                        color: Color(0xFF6E7F98),
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 12),
                    const _FilterLabel('Category'),
                    const SizedBox(height: 6),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: widget.categories
                          .map(
                            (item) => _FilterChip(
                              text: item == 'ALL' ? 'All Categories' : item,
                              selected: _draft.category == item,
                              onTap: () => setState(
                                () => _draft = _draft.copyWith(category: item),
                              ),
                            ),
                          )
                          .toList(),
                    ),
                    const SizedBox(height: 12),
                    const _FilterLabel('Minimum Rating'),
                    const SizedBox(height: 6),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children:
                          <(String, double)>[
                            ('Any', 0),
                            ('4.0+', 4),
                            ('4.5+', 4.5),
                            ('5.0', 5),
                          ].map((item) {
                            return _FilterChip(
                              text: item.$1,
                              selected: _draft.minRating == item.$2,
                              onTap: () => setState(
                                () => _draft = _draft.copyWith(
                                  minRating: item.$2,
                                ),
                              ),
                            );
                          }).toList(),
                    ),
                    const SizedBox(height: 12),
                    const _FilterLabel('Experience'),
                    const SizedBox(height: 6),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children:
                          <(String, int)>[
                            ('Any', 0),
                            ('1+ yrs', 1),
                            ('3+ yrs', 3),
                            ('5+ yrs', 5),
                          ].map((item) {
                            return _FilterChip(
                              text: item.$1,
                              selected: _draft.minExperience == item.$2,
                              onTap: () => setState(
                                () => _draft = _draft.copyWith(
                                  minExperience: item.$2,
                                ),
                              ),
                            );
                          }).toList(),
                    ),
                    const SizedBox(height: 12),
                    const _FilterLabel('Sort'),
                    const SizedBox(height: 6),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children:
                          <(String, String)>[
                            ('Recommended', 'recommended'),
                            ('Top Rated', 'rating'),
                            ('Most Jobs', 'jobs'),
                          ].map((item) {
                            return _FilterChip(
                              text: item.$1,
                              selected: _draft.sortBy == item.$2,
                              onTap: () => setState(
                                () => _draft = _draft.copyWith(sortBy: item.$2),
                              ),
                            );
                          }).toList(),
                    ),
                    const SizedBox(height: 12),
                    _FilterToggle(
                      label: 'Available now',
                      value: _draft.availableNow,
                      onChanged: (value) => setState(
                        () => _draft = _draft.copyWith(availableNow: value),
                      ),
                    ),
                    _FilterToggle(
                      label: 'Verified providers only',
                      value: _draft.verifiedOnly,
                      onChanged: (value) => setState(
                        () => _draft = _draft.copyWith(verifiedOnly: value),
                      ),
                    ),
                    _FilterToggle(
                      label: 'Top rated only',
                      value: _draft.topRated,
                      onChanged: (value) => setState(
                        () => _draft = _draft.copyWith(topRated: value),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            Container(
              padding: EdgeInsets.fromLTRB(16, 10, 16, 10 + safeBottom),
              decoration: const BoxDecoration(
                color: Color(0xFFF8F9FC),
                border: Border(top: BorderSide(color: Color(0xFFE1E6EE))),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () =>
                          setState(() => _draft = const _ProviderFilters()),
                      style:
                          AppUiStyles.neutralOutlineButton(
                            radius: BorderRadius.circular(12),
                          ).copyWith(
                            foregroundColor: WidgetStateProperty.all(
                              const Color(0xFF4B5B74),
                            ),
                            side: WidgetStateProperty.all(
                              const BorderSide(color: Color(0xFFD8E1EF)),
                            ),
                            padding: WidgetStateProperty.all(
                              const EdgeInsets.symmetric(vertical: 12),
                            ),
                          ),
                      child: const Text(
                        'Clear',
                        style: TextStyle(fontWeight: FontWeight.w700),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () => Navigator.pop(context, _draft),
                      style:
                          AppUiStyles.primaryButton(
                            radius: BorderRadius.circular(12),
                          ).copyWith(
                            backgroundColor: WidgetStateProperty.all(
                              const Color(0xFF2F4DA0),
                            ),
                            padding: WidgetStateProperty.all(
                              const EdgeInsets.symmetric(vertical: 12),
                            ),
                          ),
                      child: const Text(
                        'Apply Filters',
                        style: TextStyle(fontWeight: FontWeight.w700),
                      ),
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

class _FilterLabel extends StatelessWidget {
  const _FilterLabel(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: const TextStyle(
        color: Color(0xFF44536C),
        fontSize: 12,
        fontWeight: FontWeight.w700,
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.text,
    required this.selected,
    required this.onTap,
  });

  final String text;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(999),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? const Color(0xFF2F4DA0) : Colors.white,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(
            color: selected ? const Color(0xFF2F4DA0) : const Color(0xFFDCE4F1),
          ),
        ),
        child: Text(
          text,
          style: TextStyle(
            color: selected ? Colors.white : const Color(0xFF5A6B86),
            fontSize: 12,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}

class _FilterToggle extends StatelessWidget {
  const _FilterToggle({
    required this.label,
    required this.value,
    required this.onChanged,
  });

  final String label;
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: const TextStyle(
                color: Color(0xFF1E2A3F),
                fontSize: 13.5,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          Switch(
            value: value,
            onChanged: onChanged,
            activeThumbColor: Colors.white,
            activeTrackColor: const Color(0xFF2F4DA0),
            inactiveThumbColor: Colors.white,
            inactiveTrackColor: const Color(0xFFD4DDEA),
            materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
          ),
        ],
      ),
    );
  }
}
