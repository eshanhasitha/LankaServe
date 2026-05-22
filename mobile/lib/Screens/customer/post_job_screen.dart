import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../config/routes.dart';
import '../../services/job_service.dart';
import '../../widgets/customer_bottom_nav.dart';
import '../../widgets/ui_scale.dart';

class PostJobScreen extends StatefulWidget {
  const PostJobScreen({super.key});

  @override
  State<PostJobScreen> createState() => _PostJobScreenState();
}

class _PostJobScreenState extends State<PostJobScreen> {
  final _jobTitleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _budgetController = TextEditingController();
  final JobService _jobService = JobService();

  String? _selectedCategory;
  bool _submitting = false;

  static const List<String> _categories = [
    'Electrical',
    'Plumbing',
    'Cleaning',
    'AC Technician',
    'Painting',
  ];

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
      backgroundColor: const Color(0xFFF4F6FA),
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
                  padding: const EdgeInsets.fromLTRB(18, 16, 18, 112),
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
                      const SizedBox(height: 20),
                      const _Label('Category'),
                      const SizedBox(height: 8),
                      _CategoryField(
                        selectedCategory: _selectedCategory,
                        onTap: _pickCategory,
                      ),
                      const SizedBox(height: 20),
                      const _Label('Description'),
                      const SizedBox(height: 8),
                      _InputField(
                        controller: _descriptionController,
                        hint:
                            'Describe what needs to be fixed or done\nin detail...',
                        minLines: 6,
                        maxLines: 6,
                        keyboardType: TextInputType.multiline,
                        textInputAction: TextInputAction.newline,
                      ),
                      const SizedBox(height: 20),
                      const _Label('Budget (LKR)'),
                      const SizedBox(height: 8),
                      _InputField(
                        controller: _budgetController,
                        hint: 'Enter estimated budget',
                        keyboardType: TextInputType.number,
                        textInputAction: TextInputAction.done,
                      ),
                      const SizedBox(height: 20),
                      const _Label('Location'),
                      const SizedBox(height: 8),
                      _DashedPanel(
                        icon: Icons.location_on_outlined,
                        text: 'Select on Map',
                        onTap: () {},
                        iconColor: const Color(0xFF3C5ECC),
                        background: const Color(0xFFEFF3F8),
                      ),
                      const SizedBox(height: 20),
                      const _Label('Attach Photos'),
                      const SizedBox(height: 8),
                      _DashedPanel(
                        icon: Icons.photo_camera_outlined,
                        text: 'Upload up to 5 images',
                        onTap: () {},
                        iconColor: const Color(0xFF93A2B8),
                        background: const Color(0xFFFFFFFF),
                      ),
                      const SizedBox(height: 24),
                      Container(
                        height: 64,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(22),
                          boxShadow: const [
                            BoxShadow(
                              color: Color(0x3A2B41A0),
                              blurRadius: 18,
                              spreadRadius: 1,
                              offset: Offset(0, 8),
                            ),
                          ],
                        ),
                        child: ElevatedButton(
                          onPressed: _submitting ? null : _submitJob,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF273D98),
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(22),
                            ),
                            elevation: 0,
                          ),
                          child: _submitting
                              ? const SizedBox(
                                  width: 24,
                                  height: 24,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2.4,
                                    valueColor: AlwaysStoppedAnimation<Color>(
                                      Colors.white,
                                    ),
                                  ),
                                )
                              : const Text(
                                  'Submit Request',
                                  style: TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.w700,
                                  ),
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
      backgroundColor: const Color(0xFFF8F9FB),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(18, 14, 18, 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
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
                for (final item in _categories)
                  ListTile(
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
                  ),
              ],
            ),
          ),
        );
      },
    );

    if (selected != null) {
      setState(() => _selectedCategory = selected);
    }
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

    setState(() => _submitting = true);
    try {
      await _jobService.createJob(
        title: title,
        description: description,
        category: category,
        price: budget,
        coordinates: const <double>[79.8612, 6.9271],
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
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.onBack});

  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 64,
      padding: const EdgeInsets.fromLTRB(18, 12, 18, 12),
      decoration: const BoxDecoration(
        color: Color(0xFFFFFFFF),
        border: Border(bottom: BorderSide(color: Color(0xFFE7ECF3))),
      ),
      child: Row(
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
          const SizedBox(width: 6),
          const Text(
            'Post a Service',
            style: TextStyle(
              color: Color(0xFF141C34),
              fontSize: 19,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
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
        color: Color(0xFF122247),
        fontSize: 16,
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
        fontSize: 16,
        fontWeight: FontWeight.w500,
      ),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(
          color: Color(0xFF8FA0B8),
          fontSize: 16,
          fontWeight: FontWeight.w500,
          height: 1.35,
        ),
        filled: true,
        fillColor: const Color(0xFFFCFDFE),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 16,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: const BorderSide(color: Color(0xFFC6D1E2)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: const BorderSide(color: Color(0xFF3D5FD2), width: 1.3),
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
      borderRadius: BorderRadius.circular(18),
      child: Container(
        height: 58,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        decoration: BoxDecoration(
          color: const Color(0xFFFCFDFE),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: const Color(0xFFC6D1E2)),
        ),
        child: Row(
          children: [
            Expanded(
              child: Text(
                hasValue ? selectedCategory! : 'Select a category',
                style: TextStyle(
                  color: hasValue
                      ? const Color(0xFF1F2A43)
                      : const Color(0xFF1F2A43),
                  fontSize: 16,
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
    required this.onTap,
    required this.iconColor,
    required this.background,
  });

  final IconData icon;
  final String text;
  final VoidCallback onTap;
  final Color iconColor;
  final Color background;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(22),
      child: CustomPaint(
        painter: _DashedRRectPainter(
          color: const Color(0xFFCED7E5),
          radius: 22,
          dashLength: 8,
          dashGap: 5,
          strokeWidth: 1.2,
        ),
        child: Container(
          height: 160,
          decoration: BoxDecoration(
            color: background,
            borderRadius: BorderRadius.circular(22),
          ),
          child: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 62,
                  height: 62,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(31),
                    boxShadow: const [
                      BoxShadow(
                        color: Color(0x14000000),
                        blurRadius: 8,
                        offset: Offset(0, 3),
                      ),
                    ],
                  ),
                  child: Icon(icon, color: iconColor, size: 32),
                ),
                const SizedBox(height: 10),
                Text(
                  text,
                  style: const TextStyle(
                    color: Color(0xFF50627B),
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
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
