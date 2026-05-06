import 'package:flutter/material.dart';

import '../../config/routes.dart';
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
  String _selectedCategory = 'All Services';
  List<Map<String, dynamic>> _providers = <Map<String, dynamic>>[];

  static const List<String> _categories = <String>[
    'All Services',
    'Plumbing',
    'Electrical',
    'Cleaning',
    'AC Technician',
    'Painting',
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
      final category = _selectedCategory == 'All Services'
          ? null
          : _selectedCategory;
      final items = await _providerService.searchProviders(
        category: category,
        page: 1,
        limit: 40,
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

  List<Map<String, dynamic>> get _filteredProviders {
    final query = _searchController.text.trim().toLowerCase();
    if (query.isEmpty) return _providers;
    return _providers.where((item) {
      final user = item['userId'] as Map<String, dynamic>?;
      final name = user?['name']?.toString().toLowerCase() ?? '';
      final bio = item['bio']?.toString().toLowerCase() ?? '';
      final categories = (item['categories'] as List?)
              ?.map((e) => e.toString().toLowerCase())
              .join(' ') ??
          '';
      return name.contains(query) ||
          bio.contains(query) ||
          categories.contains(query);
    }).toList();
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
              _Header(onFilterTap: () {}, onMapTap: () => Navigator.pushNamed(context, AppRoutes.heatmap)),
              Expanded(
                child: RefreshIndicator(
                  onRefresh: _loadProviders,
                  child: ListView(
                  padding: const EdgeInsets.fromLTRB(18, 12, 18, 12),
                  physics: const AlwaysScrollableScrollPhysics(),
                  children: [
                    _SearchField(controller: _searchController),
                    const SizedBox(height: 12),
                    _CategoryChips(
                      selected: _selectedCategory,
                      items: _categories,
                      onSelected: (value) async {
                        setState(() => _selectedCategory = value);
                        await _loadProviders();
                      },
                    ),
                    const SizedBox(height: 14),
                    if (_loading)
                      const _InfoTile('Loading providers...')
                    else if (_error != null)
                      _InfoTile(_error!)
                    else if (_filteredProviders.isEmpty)
                      const _InfoTile('No providers found.')
                    else
                      ..._filteredProviders.map(
                        (item) => Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: _ProviderCard(
                            provider: item,
                            onViewProfile: () {
                              final user = item['userId'] as Map<String, dynamic>?;
                              final providerUserId = user?['_id']?.toString() ?? '';
                              Navigator.pushNamed(
                                context,
                                AppRoutes.providerProfile,
                                arguments: providerUserId,
                              );
                            },
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
  const _Header({required this.onMapTap, required this.onFilterTap});

  final VoidCallback onMapTap;
  final VoidCallback onFilterTap;

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
          const Text(
            'Find Providers',
            style: TextStyle(
              color: Color(0xFF121C33),
              fontSize: 19,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.2,
            ),
          ),
          const Spacer(),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              InkWell(
                borderRadius: BorderRadius.circular(16),
                onTap: onMapTap,
                child: Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: const Color(0xFFF0F4F8),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFE7ECF4)),
                  ),
                  child: const Icon(
                    Icons.map_outlined,
                    color: Color(0xFF4E5E78),
                    size: 22,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              InkWell(
                borderRadius: BorderRadius.circular(16),
                onTap: onFilterTap,
                child: Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: const Color(0xFFF0F4F8),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFE7ECF4)),
                  ),
                  child: const Icon(
                    Icons.tune_rounded,
                    color: Color(0xFF4E5E78),
                    size: 22,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _SearchField extends StatelessWidget {
  const _SearchField({required this.controller});

  final TextEditingController controller;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 56,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: const Color(0xFFEAF0F7),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        children: [
          const Icon(Icons.search_rounded, color: Color(0xFF93A1B7), size: 30),
          const SizedBox(width: 8),
          Expanded(
            child: TextField(
              controller: controller,
              decoration: const InputDecoration(
                border: InputBorder.none,
                isDense: true,
                hintText: 'Search services or providers...',
                hintStyle: TextStyle(
                  color: Color(0xFF6E7F98),
                  fontSize: 14.5,
                  fontWeight: FontWeight.w500,
                ),
              ),
              style: const TextStyle(
                color: Color(0xFF4E5E78),
                fontSize: 14.8,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _CategoryChips extends StatelessWidget {
  const _CategoryChips({
    required this.items,
    required this.selected,
    required this.onSelected,
  });

  final List<String> items;
  final String selected;
  final ValueChanged<String> onSelected;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 48,
      child: ListView(
        scrollDirection: Axis.horizontal,
        children: items
            .map(
              (item) => Padding(
                padding: const EdgeInsets.only(right: 12),
                child: _Chip(
                  text: item,
                  selected: selected == item,
                  onTap: () => onSelected(item),
                ),
              ),
            )
            .toList(),
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({required this.text, required this.selected, required this.onTap});

  final String text;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(24),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 20),
        decoration: BoxDecoration(
          color: selected ? const Color(0xFF273D98) : const Color(0xFFFFFFFF),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(
            color: selected
                ? const Color(0xFF273D98)
                : const Color(0xFFE7ECF4),
          ),
        ),
        alignment: Alignment.center,
        child: Text(
          text,
          style: TextStyle(
            color: selected ? Colors.white : const Color(0xFF4E5E78),
            fontSize: 12.5,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }
}

class _ProviderCard extends StatelessWidget {
  const _ProviderCard({
    required this.provider,
    required this.onViewProfile,
  });

  final Map<String, dynamic> provider;
  final VoidCallback onViewProfile;

  @override
  Widget build(BuildContext context) {
    final user = provider['userId'] as Map<String, dynamic>?;
    final name = user?['name']?.toString() ?? 'Service Provider';
    final imageUrl = user?['profileImage']?.toString() ?? '';
    final rating = (provider['stats']?['averageRating'] as num?)?.toStringAsFixed(1) ??
        provider['stats']?['averageRating']?.toString() ??
        '0.0';
    final jobs = '${provider['stats']?['completedJobs'] ?? 0} Jobs';
    final description = provider['bio']?.toString().trim().isNotEmpty == true
        ? provider['bio']?.toString() ?? ''
        : 'Professional service provider in your area.';
    final verified = provider['verified'] == true;
    final badgeLabel = verified ? 'VERIFIED' : 'NEW';
    final badgeTextColor = verified
        ? const Color(0xFF1E9A50)
        : const Color(0xFF2F62D5);
    final badgeBgColor = verified
        ? const Color(0xFFD8F2E2)
        : const Color(0xFFDCE8FF);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFE4EAF2)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x150F172A),
            blurRadius: 10,
            offset: Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Stack(
                clipBehavior: Clip.none,
                children: [
                  Container(
                    width: 84,
                    height: 84,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: const Color(0xFFE8EDF5),
                      image: DecorationImage(
                        image: imageUrl.isNotEmpty
                            ? NetworkImage(imageUrl)
                            : const NetworkImage(
                                'https://ui-avatars.com/api/?name=Provider',
                              ),
                        fit: BoxFit.cover,
                      ),
                    ),
                  ),
                  Positioned(
                    right: 2,
                    bottom: -2,
                    child: Container(
                      width: 16,
                      height: 16,
                      decoration: BoxDecoration(
                        color: const Color(0xFF22C55E),
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 2.2),
                      ),
                    ),
                  ),
                ],
              ),
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
                            style: const TextStyle(
                              color: Color(0xFF141C34),
                              fontSize: 15.5,
                              fontWeight: FontWeight.w800,
                              letterSpacing: -0.2,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Row(
                              children: [
                                const Icon(
                                  Icons.star_rounded,
                                  color: Color(0xFFFACC15),
                                  size: 17,
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  rating,
                                  style: const TextStyle(
                                    color: Color(0xFF141C34),
                                    fontSize: 15.5,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 2),
                            Text(
                              jobs,
                              style: const TextStyle(
                                color: Color(0xFF8EA0B8),
                                fontSize: 11,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: badgeBgColor,
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        badgeLabel,
                        style: TextStyle(
                          color: badgeTextColor,
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.2,
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      description,
                      style: const TextStyle(
                        color: Color(0xFF61738F),
                        fontSize: 13.5,
                        fontWeight: FontWeight.w500,
                        height: 1.24,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: SizedBox(
                  height: 47,
                  child: ElevatedButton(
                    onPressed: onViewProfile,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF273D98),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                      elevation: 0,
                    ),
                    child: const Text(
                      'View Profile',
                      style: TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Container(
                width: 64,
                height: 47,
                decoration: BoxDecoration(
                  color: const Color(0xFFF0F4FA),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: IconButton(
                  onPressed: () => Navigator.pushNamed(context, AppRoutes.chat),
                  icon: const Icon(
                    Icons.chat_bubble_outline_rounded,
                    color: Color(0xFF4F607A),
                    size: 24,
                  ),
                ),
              ),
            ],
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
