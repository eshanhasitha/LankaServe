import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../../widgets/customer_bottom_nav.dart';
import '../../widgets/ui_scale.dart';

class HeatmapScreen extends StatefulWidget {
  const HeatmapScreen({super.key});

  @override
  State<HeatmapScreen> createState() => _HeatmapScreenState();
}

class _HeatmapScreenState extends State<HeatmapScreen> {
  final MapController _mapController = MapController();
  bool _showLegend = false;

  @override
  Widget build(BuildContext context) {
    final compactScale = UiScale.factor(context, min: 0.92, max: 1.0);

    return Scaffold(
      backgroundColor: _HeatmapPalette.mapBase,
      body: SafeArea(
        child: MediaQuery(
          data: MediaQuery.of(
            context,
          ).copyWith(textScaler: TextScaler.linear(compactScale)),
          child: LayoutBuilder(
            builder: (context, _) {
              final pinSize = (40 * compactScale).clamp(36.0, 42.0);
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
                    ),
                  ),
                  Positioned.fill(
                    child: IgnorePointer(
                      child: Container(
                        color: Colors.white.withValues(alpha: 0.38),
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
                        const _LocationPill(),
                        const Spacer(),
                        _RoundActionButton(
                          icon: Icons.layers_rounded,
                          onTap: () {},
                        ),
                      ],
                    ),
                  ),
                  Positioned(
                    top: 86,
                    left: _HeatmapMetrics.sideMargin,
                    right: _HeatmapMetrics.sideMargin,
                    child: const _SearchFilterCard(),
                  ),
                  if (_showLegend)
                    Positioned(
                      left: _HeatmapMetrics.sideMargin,
                      bottom: legendBottom,
                      child: AnimatedOpacity(
                        duration: const Duration(milliseconds: 180),
                        opacity: _showLegend ? 1 : 0,
                        child: const _DemandLegendCard(),
                      ),
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
                      onTap: () {
                        _mapController.move(
                          _MapBackground.center,
                          _MapBackground.defaultZoom,
                        );
                      },
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

class _HeatmapImages {
  const _HeatmapImages._();

  static const avatarA =
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBCUIoMRWFWJ53a6WQVefseHo0hTLsKcjD6lgdkUVRV-ztlNqj0gHWWpmoZ_hk22l4HiX7V7ZEI67jspxklRUWtPRPzJphvthC5OQsYX1k0_EJ0P44KqdX5HSonMRNu2XzCQrYv3n8xFbEdq_6J5ziR7qTuAwAajY6aXrMRX7T-viLh84LUuflm6BxMPhUyGXhBjdPSI18aBNy0v3mcUFPLRsBa_iMObCRkc6FTGSZRC4XNiFym9DizUWBE06zhwyq8lo51z9tIBcAp';
  static const avatarB =
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDg-yv9P06jfkZgJBQa9z5QQHdVlbZMHFbe-lgJVaq51OL14WVSReYPQXBUoKmWy20wFQA8El9YyIPLBVIpUV1l784qnzwsuUjNnllzbAJ8sxRkzMoky2TKxDc31yElDFzhs6h2t6msP0SsO-MSXzHro0fFLlQ54pDqHpn0I_v_p9NiqUXVS2Oimw1rUteP8QciTH5wJvU4iJAC2CwhynPOG7ZoNKapzmExGnnFeUSDRyisYAM-QWd8MySuQH9-3FUtvWgsnzCGvU_3';
  static const avatarC =
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCHZ13M1ee3mjcULwm5ganLX3-Gs5S4A7zBlmWaw-80UwPlCki1eOWbJaDSt5t5i3OR0fHqaTLirXb2rdqTiElIWEQHhs_09hc4KMjGIhPXESykGEa446UxQKnxbnR0IWb0swZYHkcv8NFFhATsIXTsLs3XoawShCUMMwduUBhoP19ymWS1nCFo0_A3oC0FaMWdf9WFGxdGtndbMeu2cSqhQABzCtZpNXccGvE0GLyiQPXhAEhHDsD93bG8TUL6Pm76jle9YrZVT65q';
}

class _ProviderPinModel {
  const _ProviderPinModel({required this.position, required this.imageUrl});

  final LatLng position;
  final String imageUrl;
}

const _providerPins = <_ProviderPinModel>[
  _ProviderPinModel(
    position: LatLng(6.9308, 79.8617),
    imageUrl: _HeatmapImages.avatarA,
  ),
  _ProviderPinModel(
    position: LatLng(6.9197, 79.8752),
    imageUrl: _HeatmapImages.avatarB,
  ),
  _ProviderPinModel(
    position: LatLng(6.9138, 79.8532),
    imageUrl: _HeatmapImages.avatarC,
  ),
];

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

class _ServiceFilter {
  const _ServiceFilter({required this.text, this.selected = false});

  final String text;
  final bool selected;
}

const _serviceFilters = <_ServiceFilter>[
  _ServiceFilter(text: 'All Services', selected: true),
  _ServiceFilter(text: 'Plumbing'),
  _ServiceFilter(text: 'Electrical'),
  _ServiceFilter(text: 'AC Repair'),
];

class _MapBackground extends StatelessWidget {
  const _MapBackground({required this.pinSize, required this.controller});

  final double pinSize;
  final MapController controller;

  static const center = LatLng(6.9271, 79.8612);
  static const defaultZoom = 13.15;

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        FlutterMap(
          mapController: controller,
          options: const MapOptions(
            initialCenter: center,
            initialZoom: defaultZoom,
            minZoom: 11,
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
            MarkerLayer(
              markers: [
                for (final pin in _providerPins)
                  Marker(
                    point: pin.position,
                    width: pinSize,
                    height: pinSize,
                    alignment: Alignment.center,
                    child: _ProviderPin(imageUrl: pin.imageUrl, size: pinSize),
                  ),
              ],
            ),
          ],
        ),
        const IgnorePointer(
          child: DecoratedBox(
            decoration: BoxDecoration(
              gradient: RadialGradient(
                center: Alignment(-0.12, -0.02),
                radius: 0.96,
                colors: [Color(0x66EF4444), Color(0x00EF4444)],
              ),
            ),
          ),
        ),
        const IgnorePointer(
          child: DecoratedBox(
            decoration: BoxDecoration(
              gradient: RadialGradient(
                center: Alignment(0.60, 0.56),
                radius: 1.08,
                colors: [Color(0x52F97316), Color(0x00F97316)],
              ),
            ),
          ),
        ),
        const IgnorePointer(
          child: DecoratedBox(
            decoration: BoxDecoration(
              gradient: RadialGradient(
                center: Alignment(-0.60, 0.82),
                radius: 0.96,
                colors: [Color(0x3FEAB308), Color(0x00EAB308)],
              ),
            ),
          ),
        ),
      ],
    );
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
  const _LocationPill();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 40,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.90),
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
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.location_on_outlined, color: Color(0xFF3D5FD2), size: 21),
          SizedBox(width: 6),
          Text(
            'Colombo, LK',
            style: TextStyle(
              color: _HeatmapPalette.title,
              fontSize: 14,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _SearchFilterCard extends StatelessWidget {
  const _SearchFilterCard();

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
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Row(
              children: [
                Icon(Icons.search_rounded, size: 36, color: Color(0xFF94A3B8)),
                SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Search service type...',
                    style: TextStyle(
                      color: Color(0xFF6B7280),
                      fontSize: 14.5,
                      fontWeight: FontWeight.w400,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 38,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: [
                for (int i = 0; i < _serviceFilters.length; i++) ...[
                  _ServiceFilterChip(
                    text: _serviceFilters[i].text,
                    selected: _serviceFilters[i].selected,
                  ),
                  if (i < _serviceFilters.length - 1) const SizedBox(width: 10),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ServiceFilterChip extends StatelessWidget {
  const _ServiceFilterChip({required this.text, this.selected = false});

  final String text;
  final bool selected;

  @override
  Widget build(BuildContext context) {
    return Container(
      alignment: Alignment.center,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6.5),
      decoration: BoxDecoration(
        color: selected ? const Color(0xFF1A2E7E) : const Color(0xFFF1F5F9),
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
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}

class _ProviderPin extends StatelessWidget {
  const _ProviderPin({required this.imageUrl, required this.size});

  final String imageUrl;
  final double size;

  @override
  Widget build(BuildContext context) {
    final indicatorSize = size * 0.30;
    return SizedBox(
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
              image: DecorationImage(
                image: NetworkImage(imageUrl),
                fit: BoxFit.cover,
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
                color: const Color(0xFF22C55E),
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 2),
              ),
            ),
          ),
        ],
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
        color: Colors.white.withValues(alpha: 0.90),
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
