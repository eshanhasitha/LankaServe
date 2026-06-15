import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../../services/provider_service.dart';
import '../../widgets/customer_bottom_nav.dart';
import '../../widgets/ui_scale.dart';

class HeatmapScreen extends StatefulWidget {
  const HeatmapScreen({super.key});

  @override
  State<HeatmapScreen> createState() => _HeatmapScreenState();
}

class _HeatmapScreenState extends State<HeatmapScreen> {
  final MapController _mapController = MapController();
  final ProviderService _providerService = ProviderService();
  final TextEditingController _searchController = TextEditingController();
  Timer? _searchDebounce;

  bool _loading = true;
  bool _showLegend = true;
  String? _error;
  String _selectedCategory = 'All Services';
  List<Map<String, dynamic>> _providers = <Map<String, dynamic>>[];

  static const _defaultCenter = LatLng(6.9271, 79.8612);
  static const _defaultZoom = 13.15;
  static const _fallbackCategories = <String>[
    'All Services',
    'Plumbing',
    'Electrical',
    'AC Repair',
    'Cleaning',
    'Painting',
  ];

  @override
  void initState() {
    super.initState();
    _searchController.addListener(_onSearchChanged);
    _loadProviders();
  }

  @override
  void dispose() {
    _searchDebounce?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  void _onSearchChanged() {
    setState(() {});
    _searchDebounce?.cancel();
    _searchDebounce = Timer(const Duration(milliseconds: 350), () {
      if (mounted) _centerOnProviders();
    });
  }

  Future<void> _loadProviders() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final items = await _providerService.searchProviders(page: 1, limit: 200);
      if (!mounted) return;
      setState(() {
        _providers = items;
      });
      WidgetsBinding.instance.addPostFrameCallback((_) => _centerOnProviders());
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<String> get _categories {
    final values = <String>{};
    for (final item in _fallbackCategories) {
      values.add(item);
    }
    for (final provider in _providers) {
      if (_isDefaultPlaceholder(provider)) continue;
      final categories = provider['categories'];
      if (categories is List) {
        for (final item in categories) {
          final text = item.toString().trim();
          if (text.isNotEmpty && text.toLowerCase() != 'other') {
            values.add(text);
          }
        }
      }
    }
    return values.toList();
  }

  List<_ProviderHeatPoint> get _visiblePoints {
    final query = _searchController.text.trim().toLowerCase();
    final category = _selectedCategory.toLowerCase();

    return _providers
        .map(_providerToHeatPoint)
        .whereType<_ProviderHeatPoint>()
        .where((point) {
          final categoryMatch =
              category == 'all services' ||
              point.categories.any((item) => _categoryMatches(category, item));
          final searchableText = <String>[
            point.name,
            point.bio,
            point.city,
            point.district,
            point.locationLabel,
            ...point.categories,
          ].join(' ').toLowerCase();
          final queryMatch =
              query.isEmpty ||
              searchableText.contains(query) ||
              _queryMatchesCategoryAlias(query, point.categories);
          return categoryMatch && queryMatch;
        })
        .toList();
  }

  bool _categoryMatches(String selectedCategory, String actualCategory) {
    final actual = actualCategory.trim().toLowerCase();
    if (actual == selectedCategory) return true;
    if (selectedCategory == 'ac repair') {
      return actual.contains('ac') || actual.contains('air condition');
    }
    return actual.contains(selectedCategory);
  }

  bool _queryMatchesCategoryAlias(String query, List<String> categories) {
    if (query.isEmpty) return true;
    if (!query.contains('ac') && !query.contains('air')) return false;
    return categories.any((item) {
      final category = item.toLowerCase();
      return category.contains('ac') || category.contains('air condition');
    });
  }

  bool _isDefaultPlaceholder(Map<String, dynamic> provider) {
    final location = provider['location'];
    if (location is! Map<String, dynamic>) return false;

    final coordinates = location['coordinates'];
    if (coordinates is! List || coordinates.length < 2) return false;

    final lng = _asDouble(coordinates[0]);
    final lat = _asDouble(coordinates[1]);
    if (lat == null || lng == null) return false;

    final categories =
        (provider['categories'] as List?)
            ?.map((item) => item.toString().trim().toLowerCase())
            .where((item) => item.isNotEmpty)
            .toList() ??
        <String>[];
    final city = provider['city']?.toString().trim() ?? '';
    final district = provider['district']?.toString().trim() ?? '';
    final bio = provider['bio']?.toString().trim() ?? '';
    final yearsExperience = _asDouble(provider['yearsExperience']) ?? 0;
    final isDefaultCoordinate =
        (lat - 6.9271).abs() < 0.00001 && (lng - 79.8612).abs() < 0.00001;
    final hasOnlyDefaultCategory =
        categories.isEmpty ||
        (categories.length == 1 && categories.first == 'other');

    return isDefaultCoordinate &&
        hasOnlyDefaultCategory &&
        city.isEmpty &&
        district.isEmpty &&
        bio.isEmpty &&
        yearsExperience == 0;
  }

  _ProviderHeatPoint? _providerToHeatPoint(Map<String, dynamic> provider) {
    final location = provider['location'];
    if (location is! Map<String, dynamic>) return null;

    final coordinates = location['coordinates'];
    if (coordinates is! List || coordinates.length < 2) return null;

    final lng = _asDouble(coordinates[0]);
    final lat = _asDouble(coordinates[1]);
    if (lat == null || lng == null) return null;
    if (lat.abs() > 90 || lng.abs() > 180) return null;

    final categories =
        (provider['categories'] as List?)
            ?.map((item) => item.toString().trim())
            .where((item) => item.isNotEmpty)
            .toList() ??
        <String>[];

    if (_isDefaultPlaceholder(provider)) return null;

    final user = provider['userId'];
    final userMap = user is Map<String, dynamic> ? user : <String, dynamic>{};
    final name = userMap['name']?.toString().trim().isNotEmpty == true
        ? userMap['name'].toString().trim()
        : 'Service Provider';
    final avatar = userMap['profileImage']?.toString() ?? '';
    final bio = provider['bio']?.toString() ?? '';
    final availability = provider['availability']?.toString().toLowerCase();
    final city = provider['city']?.toString().trim() ?? '';
    final district = provider['district']?.toString().trim() ?? '';
    final locationLabel = city.isNotEmpty && district.isNotEmpty
        ? '$city, $district'
        : city.isNotEmpty
        ? city
        : district;

    return _ProviderHeatPoint(
      position: LatLng(lat, lng),
      name: name,
      avatarUrl: avatar,
      bio: bio,
      categories: categories.isEmpty ? const ['General'] : categories,
      city: city,
      district: district,
      locationLabel: locationLabel,
      isOnline: availability == 'online',
      rating: _asDouble(provider['stats']?['averageRating']) ?? 0,
    );
  }

  double? _asDouble(dynamic value) {
    if (value is num) return value.toDouble();
    return double.tryParse(value?.toString() ?? '');
  }

  void _centerOnProviders() {
    final points = _visiblePoints;
    if (points.isEmpty) {
      _mapController.move(_defaultCenter, _defaultZoom);
      return;
    }

    final avgLat =
        points.fold<double>(0, (sum, item) => sum + item.position.latitude) /
        points.length;
    final avgLng =
        points.fold<double>(0, (sum, item) => sum + item.position.longitude) /
        points.length;
    final maxDistance = points
        .map(
          (item) => const Distance().as(
            LengthUnit.Kilometer,
            LatLng(avgLat, avgLng),
            item.position,
          ),
        )
        .fold<double>(0, math.max);

    final zoom = maxDistance > 12
        ? 11.2
        : maxDistance > 6
        ? 12.0
        : maxDistance > 2
        ? 12.8
        : 13.6;
    _mapController.move(LatLng(avgLat, avgLng), zoom);
  }

  String get _areaLabel {
    final points = _visiblePoints;
    final firstLocation = points
        .map((item) => item.locationLabel)
        .firstWhere((item) => item.isNotEmpty, orElse: () => '');
    if (firstLocation.isNotEmpty) return firstLocation;
    return 'Colombo, LK';
  }

  @override
  Widget build(BuildContext context) {
    final compactScale = UiScale.factor(context, min: 0.76, max: 0.90);
    final points = _visiblePoints;

    return Scaffold(
      backgroundColor: _HeatmapPalette.mapBase,
      body: SafeArea(
        child: MediaQuery(
          data: MediaQuery.of(
            context,
          ).copyWith(textScaler: TextScaler.linear(compactScale)),
          child: LayoutBuilder(
            builder: (context, _) {
              final pinSize = (40 * compactScale).clamp(34.0, 40.0);
              final controlsBottomGap = (12 * compactScale)
                  .clamp(10.0, 14.0)
                  .toDouble();
              final legendBottom =
                  controlsBottomGap +
                  _HeatmapMetrics.floatingButtonSize +
                  (10 * compactScale).clamp(8.0, 12.0).toDouble();

              return Stack(
                children: [
                  Positioned.fill(
                    child: _MapBackground(
                      pinSize: pinSize,
                      controller: _mapController,
                      points: points,
                    ),
                  ),
                  Positioned.fill(
                    child: IgnorePointer(
                      child: Container(
                        color: Colors.white.withValues(alpha: 0.25),
                      ),
                    ),
                  ),
                  Positioned(
                    top: 12,
                    left: _HeatmapMetrics.sideMargin,
                    right: _HeatmapMetrics.sideMargin,
                    child: Row(
                      children: [
                        _RoundActionButton(
                          icon: Icons.arrow_back_rounded,
                          onTap: () => Navigator.of(context).maybePop(),
                        ),
                        const Spacer(),
                        _LocationPill(label: _areaLabel),
                        const Spacer(),
                        _RoundActionButton(
                          icon: Icons.layers_rounded,
                          onTap: () =>
                              setState(() => _showLegend = !_showLegend),
                        ),
                      ],
                    ),
                  ),
                  Positioned(
                    top: 86,
                    left: _HeatmapMetrics.sideMargin,
                    right: _HeatmapMetrics.sideMargin,
                    child: _SearchFilterCard(
                      controller: _searchController,
                      categories: _categories,
                      selectedCategory: _selectedCategory,
                      onCategoryChanged: (value) {
                        setState(() => _selectedCategory = value);
                        WidgetsBinding.instance.addPostFrameCallback(
                          (_) => _centerOnProviders(),
                        );
                      },
                    ),
                  ),
                  if (_loading)
                    const Positioned(
                      top: 192,
                      left: _HeatmapMetrics.sideMargin,
                      right: _HeatmapMetrics.sideMargin,
                      child: _StatusCard(
                        icon: Icons.sync_rounded,
                        message: 'Loading live provider locations...',
                      ),
                    )
                  else if (_error != null)
                    Positioned(
                      top: 192,
                      left: _HeatmapMetrics.sideMargin,
                      right: _HeatmapMetrics.sideMargin,
                      child: _StatusCard(
                        icon: Icons.error_outline_rounded,
                        message: 'Could not load providers. Tap to retry.',
                        onTap: _loadProviders,
                      ),
                    )
                  else if (points.isEmpty)
                    const Positioned(
                      top: 192,
                      left: _HeatmapMetrics.sideMargin,
                      right: _HeatmapMetrics.sideMargin,
                      child: _StatusCard(
                        icon: Icons.search_off_rounded,
                        message: 'No providers match this search.',
                      ),
                    ),
                  if (_showLegend)
                    Positioned(
                      left: _HeatmapMetrics.sideMargin,
                      bottom: legendBottom,
                      child: const _DemandLegendCard(),
                    ),
                  Positioned(
                    left: _HeatmapMetrics.sideMargin,
                    bottom: controlsBottomGap,
                    child: _RoundActionButton(
                      icon: _showLegend
                          ? Icons.close_rounded
                          : Icons.analytics_outlined,
                      onTap: () => setState(() => _showLegend = !_showLegend),
                      size: _HeatmapMetrics.floatingButtonSize,
                      iconSize: _HeatmapMetrics.floatingButtonIcon,
                    ),
                  ),
                  Positioned(
                    right: 22,
                    bottom: controlsBottomGap,
                    child: _RoundActionButton(
                      icon: Icons.gps_fixed_rounded,
                      onTap: _centerOnProviders,
                      size: _HeatmapMetrics.floatingButtonSize,
                      iconSize: _HeatmapMetrics.floatingButtonIcon,
                    ),
                  ),
                ],
              );
            },
          ),
        ),
      ),
      bottomNavigationBar: const CustomerBottomNav(activeIndex: 1),
    );
  }
}

class _HeatmapPalette {
  const _HeatmapPalette._();

  static const mapBase = Color(0xFFDDE3EC);
  static const panel = Color(0xFFF8FAFD);
  static const title = Color(0xFF141C34);
  static const primary = Color(0xFF1F328B);
}

class _HeatmapMetrics {
  const _HeatmapMetrics._();

  static const sideMargin = 16.0;
  static const topButtonSize = 40.0;
  static const topButtonIcon = 24.0;
  static const floatingButtonSize = 48.0;
  static const floatingButtonIcon = 24.0;
  static const legendWidth = 176.0;
}

class _ProviderHeatPoint {
  const _ProviderHeatPoint({
    required this.position,
    required this.name,
    required this.avatarUrl,
    required this.bio,
    required this.categories,
    required this.city,
    required this.district,
    required this.locationLabel,
    required this.isOnline,
    required this.rating,
  });

  final LatLng position;
  final String name;
  final String avatarUrl;
  final String bio;
  final List<String> categories;
  final String city;
  final String district;
  final String locationLabel;
  final bool isOnline;
  final double rating;
}

class _LegendItem {
  const _LegendItem({required this.label, required this.color});

  final String label;
  final Color color;
}

const _legendItems = <_LegendItem>[
  _LegendItem(label: 'Very High', color: Color(0xFFEF4444)),
  _LegendItem(label: 'High', color: Color(0xFFF97316)),
  _LegendItem(label: 'Moderate', color: Color(0xFFEAB308)),
  _LegendItem(label: 'Low', color: Color(0xFF93C5FD)),
];

class _MapBackground extends StatelessWidget {
  const _MapBackground({
    required this.pinSize,
    required this.controller,
    required this.points,
  });

  final double pinSize;
  final MapController controller;
  final List<_ProviderHeatPoint> points;

  @override
  Widget build(BuildContext context) {
    return FlutterMap(
      mapController: controller,
      options: const MapOptions(
        initialCenter: _HeatmapScreenState._defaultCenter,
        initialZoom: _HeatmapScreenState._defaultZoom,
        minZoom: 10,
        maxZoom: 18,
        interactionOptions: InteractionOptions(
          flags:
              InteractiveFlag.drag |
              InteractiveFlag.pinchZoom |
              InteractiveFlag.doubleTapZoom,
        ),
      ),
      children: [
        ColorFiltered(
          colorFilter: const ColorFilter.matrix(<double>[
            0.2126,
            0.7152,
            0.0722,
            0,
            0,
            0.2126,
            0.7152,
            0.0722,
            0,
            0,
            0.2126,
            0.7152,
            0.0722,
            0,
            0,
            0,
            0,
            0,
            1,
            0,
          ]),
          child: TileLayer(
            urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            userAgentPackageName: 'com.lankaserve.mobile',
          ),
        ),
        CircleLayer(
          circles: [
            for (final point in points)
              CircleMarker(
                point: point.position,
                radius: _heatRadius(point),
                useRadiusInMeter: true,
                color: _heatColor(point).withValues(alpha: 0.24),
                borderColor: _heatColor(point).withValues(alpha: 0.03),
                borderStrokeWidth: 1,
              ),
          ],
        ),
        MarkerLayer(
          markers: [
            for (final point in points)
              Marker(
                point: point.position,
                width: pinSize,
                height: pinSize,
                alignment: Alignment.center,
                child: _ProviderPin(point: point, size: pinSize),
              ),
          ],
        ),
      ],
    );
  }

  double _heatRadius(_ProviderHeatPoint point) {
    final categoryBoost = point.categories.length > 1 ? 1.12 : 1.0;
    final ratingBoost = point.rating >= 4.5 ? 1.1 : 1.0;
    return 720 * categoryBoost * ratingBoost;
  }

  Color _heatColor(_ProviderHeatPoint point) {
    if (point.rating >= 4.8 || point.categories.length >= 3) {
      return const Color(0xFFEF4444);
    }
    if (point.rating >= 4.3 || point.categories.length == 2) {
      return const Color(0xFFF97316);
    }
    if (point.rating >= 3.5) return const Color(0xFFEAB308);
    return const Color(0xFF93C5FD);
  }
}

class _RoundActionButton extends StatelessWidget {
  const _RoundActionButton({
    required this.icon,
    required this.onTap,
    this.size = _HeatmapMetrics.topButtonSize,
    this.iconSize = _HeatmapMetrics.topButtonIcon,
  });

  final IconData icon;
  final VoidCallback onTap;
  final double size;
  final double iconSize;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(size / 2),
        child: Container(
          width: size,
          height: size,
          decoration: const BoxDecoration(
            color: _HeatmapPalette.panel,
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: Color(0x180F172A),
                blurRadius: 6,
                offset: Offset(0, 4),
                spreadRadius: -4,
              ),
              BoxShadow(
                color: Color(0x180F172A),
                blurRadius: 15,
                offset: Offset(0, 10),
                spreadRadius: -3,
              ),
            ],
          ),
          child: Icon(icon, size: iconSize, color: const Color(0xFF334155)),
        ),
      ),
    );
  }
}

class _LocationPill extends StatelessWidget {
  const _LocationPill({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 40,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.92),
        borderRadius: BorderRadius.circular(999),
        boxShadow: const [
          BoxShadow(
            color: Color(0x180F172A),
            blurRadius: 6,
            offset: Offset(0, 4),
            spreadRadius: -4,
          ),
          BoxShadow(
            color: Color(0x180F172A),
            blurRadius: 15,
            offset: Offset(0, 10),
            spreadRadius: -3,
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(
            Icons.location_on_outlined,
            color: Color(0xFF3D5FD2),
            size: 21,
          ),
          const SizedBox(width: 6),
          Text(
            label,
            style: const TextStyle(
              color: _HeatmapPalette.title,
              fontSize: 14,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _SearchFilterCard extends StatelessWidget {
  const _SearchFilterCard({
    required this.controller,
    required this.categories,
    required this.selectedCategory,
    required this.onCategoryChanged,
  });

  final TextEditingController controller;
  final List<String> categories;
  final String selectedCategory;
  final ValueChanged<String> onCategoryChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [
          BoxShadow(
            color: Color(0x170F172A),
            blurRadius: 10,
            offset: Offset(0, 8),
            spreadRadius: -6,
          ),
          BoxShadow(
            color: Color(0x170F172A),
            blurRadius: 25,
            offset: Offset(0, 20),
            spreadRadius: -5,
          ),
        ],
      ),
      child: Column(
        children: [
          Container(
            height: 48,
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(16),
            ),
            child: TextField(
              controller: controller,
              textInputAction: TextInputAction.search,
              decoration: const InputDecoration(
                prefixIcon: Icon(
                  Icons.search_rounded,
                  size: 30,
                  color: Color(0xFF94A3B8),
                ),
                hintText: 'Search service type...',
                hintStyle: TextStyle(
                  color: Color(0xFF6B7280),
                  fontSize: 14,
                  fontWeight: FontWeight.w400,
                ),
                border: InputBorder.none,
                contentPadding: EdgeInsets.symmetric(vertical: 14),
              ),
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 38,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: categories.length,
              separatorBuilder: (_, _) => const SizedBox(width: 10),
              itemBuilder: (context, index) {
                final category = categories[index];
                return _ServiceFilterChip(
                  text: category,
                  selected: selectedCategory == category,
                  onTap: () => onCategoryChanged(category),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _ServiceFilterChip extends StatelessWidget {
  const _ServiceFilterChip({
    required this.text,
    required this.selected,
    required this.onTap,
  });

  final String text;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(999),
        child: Container(
          alignment: Alignment.center,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6.5),
          decoration: BoxDecoration(
            color: selected ? _HeatmapPalette.primary : const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(999),
            border: selected
                ? null
                : Border.all(color: const Color(0xFFE2E8F0), width: 1),
          ),
          child: Text(
            text,
            style: TextStyle(
              color: selected ? Colors.white : const Color(0xFF475569),
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ),
    );
  }
}

class _ProviderPin extends StatelessWidget {
  const _ProviderPin({required this.point, required this.size});

  final _ProviderHeatPoint point;
  final double size;

  @override
  Widget build(BuildContext context) {
    final indicatorSize = size * 0.30;
    final hasImage = point.avatarUrl.trim().isNotEmpty;
    return Tooltip(
      message: point.name,
      child: SizedBox(
        width: size,
        height: size,
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            Container(
              width: size,
              height: size,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFF86C6AE),
                border: Border.all(color: Colors.white, width: 4),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x19000000),
                    blurRadius: 6,
                    offset: Offset(0, 4),
                    spreadRadius: -4,
                  ),
                  BoxShadow(
                    color: Color(0x19000000),
                    blurRadius: 15,
                    offset: Offset(0, 10),
                    spreadRadius: -3,
                  ),
                ],
                image: hasImage
                    ? DecorationImage(
                        image: NetworkImage(point.avatarUrl),
                        fit: BoxFit.cover,
                      )
                    : null,
              ),
              child: hasImage
                  ? null
                  : Center(
                      child: Text(
                        point.name.characters.first.toUpperCase(),
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
            ),
            Positioned(
              right: -2,
              bottom: -2,
              child: Container(
                width: indicatorSize,
                height: indicatorSize,
                decoration: BoxDecoration(
                  color: point.isOnline
                      ? const Color(0xFF22C55E)
                      : const Color(0xFF94A3B8),
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 2),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatusCard extends StatelessWidget {
  const _StatusCard({required this.icon, required this.message, this.onTap});

  final IconData icon;
  final String message;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.92),
            borderRadius: BorderRadius.circular(16),
            boxShadow: const [
              BoxShadow(
                color: Color(0x170F172A),
                blurRadius: 16,
                offset: Offset(0, 12),
                spreadRadius: -8,
              ),
            ],
          ),
          child: Row(
            children: [
              Icon(icon, color: _HeatmapPalette.primary, size: 22),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  message,
                  style: const TextStyle(
                    color: _HeatmapPalette.title,
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DemandLegendCard extends StatelessWidget {
  const _DemandLegendCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: _HeatmapMetrics.legendWidth,
      padding: const EdgeInsets.fromLTRB(14, 13, 14, 13),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.92),
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [
          BoxShadow(
            color: Color(0x19000000),
            blurRadius: 10,
            offset: Offset(0, 8),
            spreadRadius: -6,
          ),
          BoxShadow(
            color: Color(0x19000000),
            blurRadius: 25,
            offset: Offset(0, 20),
            spreadRadius: -5,
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'DEMAND INTENSITY',
            style: TextStyle(
              color: Color(0xFF8EA0B8),
              fontSize: 10,
              letterSpacing: 1,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 10),
          for (int i = 0; i < _legendItems.length; i++) ...[
            _LegendRow(item: _legendItems[i]),
            if (i < _legendItems.length - 1) const SizedBox(height: 8),
          ],
        ],
      ),
    );
  }
}

class _LegendRow extends StatelessWidget {
  const _LegendRow({required this.item});

  final _LegendItem item;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(shape: BoxShape.circle, color: item.color),
        ),
        const SizedBox(width: 10),
        Text(
          item.label,
          style: const TextStyle(
            color: _HeatmapPalette.title,
            fontSize: 12,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}
