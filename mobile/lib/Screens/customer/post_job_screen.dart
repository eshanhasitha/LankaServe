import 'dart:io';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:image_picker/image_picker.dart';
import 'package:latlong2/latlong.dart' as latlng;

import '../../config/routes.dart';
import '../../config/ui_styles.dart';
import '../../services/job_service.dart';
import '../../widgets/customer_bottom_nav.dart';
import '../../widgets/ui_scale.dart';

class PostJobScreen extends StatefulWidget {
  const PostJobScreen({super.key});

  @override
  State<PostJobScreen> createState() => _PostJobScreenState();
}

class _PostJobScreenState extends State<PostJobScreen> {
  static const int _maxImages = 5;
  static const int _maxImageBytes = 5 * 1024 * 1024;
  static const latlng.LatLng _defaultLocation = latlng.LatLng(6.9271, 79.8612);

  static const List<String> _categories = <String>[
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

  final _jobTitleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _budgetController = TextEditingController();
  final JobService _jobService = JobService();
  final ImagePicker _imagePicker = ImagePicker();

  String? _selectedCategory;
  bool _submitting = false;
  bool _locationPicked = false;
  latlng.LatLng _selectedLocation = _defaultLocation;
  List<_SelectedImage> _images = <_SelectedImage>[];

  @override
  void dispose() {
    _jobTitleController.dispose();
    _descriptionController.dispose();
    _budgetController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final compactScale = UiScale.factor(context, min: 0.80, max: 0.93);

    return Scaffold(
      backgroundColor: const Color(0xFFF3F6FC),
      body: SafeArea(
        child: MediaQuery(
          data: MediaQuery.of(
            context,
          ).copyWith(textScaler: TextScaler.linear(compactScale)),
          child: Column(
            children: [
              _Header(
                onBack: () {
                  if (Navigator.of(context).canPop()) {
                    Navigator.of(context).pop();
                    return;
                  }
                  Navigator.pushReplacementNamed(
                    context,
                    AppRoutes.customerDashboard,
                  );
                },
              ),
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(16, 14, 16, 112),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _SectionCard(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            const _Label('Service Title'),
                            const SizedBox(height: 8),
                            _InputField(
                              controller: _jobTitleController,
                              hint: 'e.g. Living room AC repair',
                              textInputAction: TextInputAction.next,
                            ),
                            const SizedBox(height: 16),
                            const _Label('Category'),
                            const SizedBox(height: 8),
                            _CategoryField(
                              selectedCategory: _selectedCategory,
                              onTap: _pickCategory,
                            ),
                            const SizedBox(height: 16),
                            const _Label('Description'),
                            const SizedBox(height: 8),
                            _InputField(
                              controller: _descriptionController,
                              hint:
                                  'Describe what needs to be fixed or done\nin detail...',
                              minLines: 5,
                              maxLines: 5,
                              keyboardType: TextInputType.multiline,
                              textInputAction: TextInputAction.newline,
                            ),
                            const SizedBox(height: 16),
                            const _Label('Budget (LKR)'),
                            const SizedBox(height: 8),
                            _InputField(
                              controller: _budgetController,
                              hint: 'Enter estimated budget',
                              keyboardType: TextInputType.number,
                              textInputAction: TextInputAction.done,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 14),
                      _SectionCard(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            const _Label('Location'),
                            const SizedBox(height: 8),
                            _DashedPanel(
                              icon: Icons.location_on_outlined,
                              text: _locationPicked
                                  ? 'Location: ${_coordLabel(_selectedLocation)}'
                                  : 'Select on map',
                              subText: _locationPicked
                                  ? 'Tap to change your selected location'
                                  : 'Tap and drop marker on map',
                              onTap: _pickLocationOnMap,
                              iconColor: const Color(0xFF3C5ECC),
                              background: const Color(0xFFF4F8FF),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 14),
                      _SectionCard(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            const _Label('Attach Photos'),
                            const SizedBox(height: 8),
                            _DashedPanel(
                              icon: Icons.photo_library_outlined,
                              text:
                                  'Upload up to $_maxImages images (${_images.length}/$_maxImages)',
                              subText: 'JPG, PNG, WEBP - Max 5MB each',
                              onTap: _pickImages,
                              iconColor: const Color(0xFF6D7E94),
                              background: const Color(0xFFFFFFFF),
                            ),
                            if (_images.isNotEmpty) ...[
                              const SizedBox(height: 12),
                              GridView.builder(
                                shrinkWrap: true,
                                physics: const NeverScrollableScrollPhysics(),
                                itemCount: _images.length,
                                gridDelegate:
                                    const SliverGridDelegateWithFixedCrossAxisCount(
                                      crossAxisCount: 3,
                                      crossAxisSpacing: 8,
                                      mainAxisSpacing: 8,
                                      childAspectRatio: 0.92,
                                    ),
                                itemBuilder: (context, index) {
                                  final image = _images[index];
                                  return _ImageThumb(
                                    image: image,
                                    onRemove: () => _removeImageAt(index),
                                  );
                                },
                              ),
                            ],
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                      Container(
                        height: 58,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(18),
                          boxShadow: const [
                            BoxShadow(
                              color: Color(0x322A3FA0),
                              blurRadius: 14,
                              offset: Offset(0, 7),
                            ),
                          ],
                        ),
                        child: ElevatedButton(
                          onPressed: _submitting ? null : _submitJob,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF2640A7),
                            disabledBackgroundColor: const Color(0xFF8B99C8),
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(18),
                            ),
                            elevation: 0,
                            padding: const EdgeInsets.symmetric(horizontal: 18),
                          ),
                          child: _submitting
                              ? const Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    SizedBox(
                                      width: 20,
                                      height: 20,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2.3,
                                        valueColor:
                                            AlwaysStoppedAnimation<Color>(
                                              Colors.white,
                                            ),
                                      ),
                                    ),
                                    SizedBox(width: 10),
                                    Text(
                                      'Submitting...',
                                      style: TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                  ],
                                )
                              : const Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Text(
                                      'Submit Request',
                                      style: TextStyle(
                                        fontSize: 17,
                                        fontWeight: FontWeight.w700,
                                        letterSpacing: 0.2,
                                      ),
                                    ),
                                    SizedBox(width: 8),
                                    Icon(Icons.arrow_forward_rounded, size: 20),
                                  ],
                                ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
      bottomNavigationBar: const CustomerBottomNav(activeIndex: 3),
    );
  }

  Future<void> _pickCategory() async {
    final selected = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFFF8F9FB),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        final maxHeight = MediaQuery.of(context).size.height * 0.72;
        return SafeArea(
          child: SizedBox(
            height: maxHeight,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(18, 14, 18, 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Select a category',
                    style: TextStyle(
                      color: Color(0xFF1A263F),
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Expanded(
                    child: ListView.builder(
                      itemCount: _categories.length,
                      itemBuilder: (context, index) {
                        final item = _categories[index];
                        return ListTile(
                          contentPadding: EdgeInsets.zero,
                          title: Text(
                            item,
                            style: const TextStyle(
                              color: Color(0xFF1F2A43),
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          onTap: () => Navigator.pop(context, item),
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );

    if (selected != null) {
      setState(() => _selectedCategory = selected);
    }
  }

  Future<void> _pickLocationOnMap() async {
    final picked = await showModalBottomSheet<latlng.LatLng>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return FractionallySizedBox(
          heightFactor: 0.78,
          child: _MapLocationPickerSheet(initial: _selectedLocation),
        );
      },
    );

    if (picked != null) {
      setState(() {
        _selectedLocation = picked;
        _locationPicked = true;
      });
    }
  }

  Future<void> _pickImages() async {
    final remaining = _maxImages - _images.length;
    if (remaining <= 0) {
      _show('You can upload up to $_maxImages images.');
      return;
    }

    List<XFile> files = const <XFile>[];
    try {
      files = await _imagePicker.pickMultiImage(
        limit: remaining,
        imageQuality: 88,
      );
    } on MissingPluginException {
      files = await _pickSingleImageFallback();
    } on PlatformException catch (e) {
      _show(
        e.message ??
            'Photo access denied. Please allow gallery access from app settings.',
      );
      return;
    } catch (e) {
      _show('Unable to open gallery: $e');
      return;
    }

    if (files.isEmpty) return;

    final accepted = <_SelectedImage>[];
    final rejected = <String>[];

    for (final file in files.take(remaining)) {
      final bytes = await file.length();
      if (bytes > _maxImageBytes) {
        rejected.add('${file.name} is larger than 5MB.');
        continue;
      }

      accepted.add(
        _SelectedImage(path: file.path, name: file.name, sizeBytes: bytes),
      );
    }

    if (accepted.isNotEmpty) {
      setState(() {
        _images = <_SelectedImage>[..._images, ...accepted];
      });
    }

    if (rejected.isNotEmpty) {
      _show(rejected.first);
    }
  }

  Future<List<XFile>> _pickSingleImageFallback() async {
    try {
      final single = await _imagePicker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 88,
      );
      if (single == null) return const <XFile>[];
      _show('Multi-image selection is unavailable. Add images one by one.');
      return <XFile>[single];
    } on MissingPluginException {
      _show(
        'Gallery plugin is not loaded. Run: flutter clean, flutter pub get, then reinstall app.',
      );
      return const <XFile>[];
    } on PlatformException catch (e) {
      _show(
        e.message ??
            'Photo access denied. Please allow gallery access from app settings.',
      );
      return const <XFile>[];
    } catch (e) {
      _show('Unable to open gallery: $e');
      return const <XFile>[];
    }
  }

  void _removeImageAt(int index) {
    if (index < 0 || index >= _images.length) return;
    setState(() {
      final next = <_SelectedImage>[..._images];
      next.removeAt(index);
      _images = next;
    });
  }

  String _coordLabel(latlng.LatLng value) {
    return '${value.latitude.toStringAsFixed(5)}, ${value.longitude.toStringAsFixed(5)}';
  }

  Future<void> _submitJob() async {
    final title = _jobTitleController.text.trim();
    final description = _descriptionController.text.trim();
    final category = _selectedCategory?.trim() ?? '';
    final budgetText = _budgetController.text.trim().replaceAll(',', '');
    final budget = double.tryParse(budgetText);

    if (title.isEmpty ||
        description.isEmpty ||
        category.isEmpty ||
        budget == null ||
        budget <= 0) {
      _show('Fill title, category, description, and valid budget.');
      return;
    }

    if (!_locationPicked) {
      _show('Please select your location on map.');
      return;
    }

    setState(() => _submitting = true);
    try {
      final imageUrls = <String>[];
      for (final image in _images) {
        final url = await _jobService.uploadServiceImage(File(image.path));
        imageUrls.add(url);
      }

      await _jobService.createJob(
        title: title,
        description: description,
        category: category,
        price: budget,
        images: imageUrls,
        coordinates: <double>[
          _selectedLocation.longitude,
          _selectedLocation.latitude,
        ],
      );
      if (!mounted) return;
      _show('Service request submitted.');
      Navigator.pushReplacementNamed(context, AppRoutes.jobStatus);
    } catch (e) {
      _show('Failed to submit request: $e');
    } finally {
      if (mounted) {
        setState(() => _submitting = false);
      }
    }
  }

  void _show(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.onBack});

  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 66,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      decoration: const BoxDecoration(
        color: Color(0xFFFFFFFF),
        border: Border(bottom: BorderSide(color: Color(0xFFE7ECF3))),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          InkWell(
            borderRadius: BorderRadius.circular(20),
            onTap: onBack,
            child: const SizedBox(
              width: 40,
              height: 40,
              child: Icon(
                Icons.arrow_back_rounded,
                size: 30,
                color: Color(0xFF1A2940),
              ),
            ),
          ),
          const SizedBox(width: 8),
          const Expanded(
            child: Text(
              'Post a Service',
              style: TextStyle(
                color: Color(0xFF141C34),
                fontSize: 18,
                fontWeight: FontWeight.w800,
                height: 1.0,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFDCE6F5)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x100D1C3F),
            blurRadius: 16,
            offset: Offset(0, 6),
          ),
        ],
      ),
      child: child,
    );
  }
}

class _Label extends StatelessWidget {
  const _Label(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: const TextStyle(
        color: Color(0xFF172645),
        fontSize: 15.5,
        fontWeight: FontWeight.w700,
      ),
    );
  }
}

class _InputField extends StatelessWidget {
  const _InputField({
    required this.controller,
    required this.hint,
    this.minLines = 1,
    this.maxLines = 1,
    this.keyboardType = TextInputType.text,
    this.textInputAction = TextInputAction.next,
  });

  final TextEditingController controller;
  final String hint;
  final int minLines;
  final int maxLines;
  final TextInputType keyboardType;
  final TextInputAction textInputAction;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      minLines: minLines,
      maxLines: maxLines,
      keyboardType: keyboardType,
      textInputAction: textInputAction,
      style: const TextStyle(
        color: Color(0xFF1C2740),
        fontSize: 15.5,
        fontWeight: FontWeight.w500,
      ),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(
          color: Color(0xFF8A9CB5),
          fontSize: 15.5,
          fontWeight: FontWeight.w500,
          height: 1.35,
        ),
        filled: true,
        fillColor: const Color(0xFFF9FBFF),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 14,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(15),
          borderSide: const BorderSide(color: Color(0xFFC7D5EA)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(15),
          borderSide: const BorderSide(color: Color(0xFF3A5DCB), width: 1.4),
        ),
      ),
    );
  }
}

class _CategoryField extends StatelessWidget {
  const _CategoryField({required this.selectedCategory, required this.onTap});

  final String? selectedCategory;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final hasValue = selectedCategory != null && selectedCategory!.isNotEmpty;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(15),
      child: Container(
        height: 54,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        decoration: BoxDecoration(
          color: const Color(0xFFF9FBFF),
          borderRadius: BorderRadius.circular(15),
          border: Border.all(color: const Color(0xFFC7D5EA)),
        ),
        child: Row(
          children: [
            Expanded(
              child: Text(
                hasValue ? selectedCategory! : 'Select a category',
                style: const TextStyle(
                  color: Color(0xFF1F2A43),
                  fontSize: 15.5,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            const Icon(
              Icons.keyboard_arrow_down_rounded,
              color: Color(0xFF6E819A),
              size: 28,
            ),
          ],
        ),
      ),
    );
  }
}

class _DashedPanel extends StatelessWidget {
  const _DashedPanel({
    required this.icon,
    required this.text,
    required this.subText,
    required this.onTap,
    required this.iconColor,
    required this.background,
  });

  final IconData icon;
  final String text;
  final String subText;
  final VoidCallback onTap;
  final Color iconColor;
  final Color background;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: CustomPaint(
        painter: _DashedRRectPainter(
          color: const Color(0xFFC9D6EA),
          radius: 18,
          dashLength: 7,
          dashGap: 4,
          strokeWidth: 1.2,
        ),
        child: Container(
          height: 132,
          decoration: BoxDecoration(
            color: background,
            borderRadius: BorderRadius.circular(18),
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
            child: Row(
              children: [
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(26),
                    boxShadow: const [
                      BoxShadow(
                        color: Color(0x14000000),
                        blurRadius: 8,
                        offset: Offset(0, 3),
                      ),
                    ],
                  ),
                  child: Icon(icon, color: iconColor, size: 28),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        text,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Color(0xFF223656),
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        subText,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Color(0xFF667B95),
                          fontSize: 12.5,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                const Icon(
                  Icons.arrow_forward_ios_rounded,
                  size: 16,
                  color: Color(0xFF6B7FA0),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _DashedRRectPainter extends CustomPainter {
  const _DashedRRectPainter({
    required this.color,
    required this.radius,
    required this.dashLength,
    required this.dashGap,
    required this.strokeWidth,
  });

  final Color color;
  final double radius;
  final double dashLength;
  final double dashGap;
  final double strokeWidth;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth;

    final rect = Offset.zero & size;
    final rrect = RRect.fromRectAndRadius(
      rect.deflate(strokeWidth / 2),
      Radius.circular(radius),
    );
    final path = Path()..addRRect(rrect);

    for (final metric in path.computeMetrics()) {
      double distance = 0;
      while (distance < metric.length) {
        final segment = math.min(dashLength, metric.length - distance);
        canvas.drawPath(
          metric.extractPath(distance, distance + segment),
          paint,
        );
        distance += dashLength + dashGap;
      }
    }
  }

  @override
  bool shouldRepaint(covariant _DashedRRectPainter oldDelegate) {
    return oldDelegate.color != color ||
        oldDelegate.radius != radius ||
        oldDelegate.dashLength != dashLength ||
        oldDelegate.dashGap != dashGap ||
        oldDelegate.strokeWidth != strokeWidth;
  }
}

class _SelectedImage {
  const _SelectedImage({
    required this.path,
    required this.name,
    required this.sizeBytes,
  });

  final String path;
  final String name;
  final int sizeBytes;

  String get sizeLabel {
    final kb = sizeBytes / 1024;
    if (kb < 1024) return '${kb.toStringAsFixed(0)} KB';
    return '${(kb / 1024).toStringAsFixed(1)} MB';
  }
}

class _ImageThumb extends StatelessWidget {
  const _ImageThumb({required this.image, required this.onRemove});

  final _SelectedImage image;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFDDE4EF)),
        color: Colors.white,
      ),
      child: Stack(
        children: [
          Positioned.fill(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(13),
              child: Image.file(File(image.path), fit: BoxFit.cover),
            ),
          ),
          Positioned(
            top: 6,
            right: 6,
            child: GestureDetector(
              onTap: onRemove,
              child: Container(
                width: 24,
                height: 24,
                decoration: const BoxDecoration(
                  color: Color(0xEFFFFFFF),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.close_rounded,
                  size: 16,
                  color: Color(0xFF334155),
                ),
              ),
            ),
          ),
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
              color: const Color(0xB31E293B),
              child: Text(
                '${image.name} - ${image.sizeLabel}',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 10,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MapLocationPickerSheet extends StatefulWidget {
  const _MapLocationPickerSheet({required this.initial});

  final latlng.LatLng initial;

  @override
  State<_MapLocationPickerSheet> createState() =>
      _MapLocationPickerSheetState();
}

class _MapLocationPickerSheetState extends State<_MapLocationPickerSheet> {
  late latlng.LatLng _selected;

  @override
  void initState() {
    super.initState();
    _selected = widget.initial;
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 14, 12, 10),
          child: Row(
            children: [
              const Expanded(
                child: Text(
                  'Select Service Location',
                  style: TextStyle(
                    color: Color(0xFF111A33),
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              IconButton(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.close_rounded),
              ),
            ],
          ),
        ),
        Expanded(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: FlutterMap(
              options: MapOptions(
                initialCenter: _selected,
                initialZoom: 12.8,
                minZoom: 6,
                maxZoom: 18,
                onTap: (_, point) => setState(() => _selected = point),
              ),
              children: [
                TileLayer(
                  urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                  userAgentPackageName: 'com.lankaserve.mobile',
                ),
                MarkerLayer(
                  markers: [
                    Marker(
                      point: _selected,
                      width: 44,
                      height: 44,
                      child: const Icon(
                        Icons.location_on_rounded,
                        color: Color(0xFFE11D48),
                        size: 40,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Selected: ${_selected.latitude.toStringAsFixed(5)}, ${_selected.longitude.toStringAsFixed(5)}',
                style: const TextStyle(
                  color: Color(0xFF475569),
                  fontSize: 12.5,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 10),
              SizedBox(
                height: 52,
                child: ElevatedButton(
                  onPressed: () => Navigator.pop(context, _selected),
                  style: AppUiStyles.primaryButton(
                    height: 52,
                    radius: BorderRadius.circular(14),
                  ),
                  child: const Text(
                    'Use This Location',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
