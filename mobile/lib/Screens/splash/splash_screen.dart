import 'package:flutter/material.dart';

import '../../config/constants.dart';
import '../../config/routes.dart';
import '../../services/auth_service.dart';
import '../../widgets/ui_scale.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _bootstrapSession();
  }

  Future<void> _bootstrapSession() async {
    final authService = AuthService();

    final sessionFuture = authService.restoreSession().timeout(
      const Duration(seconds: 1),
      onTimeout: () => null,
    );
    final delayFuture = Future<void>.delayed(AppConstants.splashDuration);

    final session = await sessionFuture;
    await delayFuture;
    if (!mounted) return;

    final role = session?.user['role']?.toString().toLowerCase();
    final targetRoute = switch (role) {
      'provider' => AppRoutes.providerDashboard,
      'customer' => AppRoutes.customerDashboard,
      _ => AppRoutes.login,
    };

    Navigator.pushReplacementNamed(context, targetRoute);
  }

  @override
  Widget build(BuildContext context) {
    const bgColor = Color(0xFFE8E9ED);
    const brandBlue = Color(0xFF25429A);
    const subtitleColor = Color(0xFF6F7785);
    final compactScale = UiScale.factor(context, min: 0.78, max: 0.92);

    return Scaffold(
      backgroundColor: bgColor,
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final double h = constraints.maxHeight;
            final double logoTop = h * 0.33;
            final double spinnerTop = h * 0.70;
            final double logoSize = 112 * compactScale;
            final double logoRadius = 22 * compactScale;

            return Stack(
              children: [
                Positioned(
                  top: logoTop,
                  left: 0,
                  right: 0,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: logoSize,
                        height: logoSize,
                        decoration: BoxDecoration(
                          color: brandBlue,
                          borderRadius: BorderRadius.circular(logoRadius),
                          boxShadow: const [
                            BoxShadow(
                              color: Color(0x29000000),
                              blurRadius: 16,
                              offset: Offset(0, 8),
                            ),
                          ],
                        ),
                        child: const Center(
                          child: Icon(
                            Icons.handshake_rounded,
                            color: Colors.white,
                            size: 52,
                          ),
                        ),
                      ),
                      SizedBox(height: 24 * compactScale),
                      Text(
                        'LankaServe',
                        style: const TextStyle(
                          color: Color(0xFF0F1115),
                          fontSize: 28,
                          height: 1.15,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      SizedBox(height: 10 * compactScale),
                      const Text(
                        'Smart Service Marketplace',
                        style: TextStyle(
                          color: subtitleColor,
                          fontSize: 15.5,
                          height: 1.2,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
                Positioned(
                  top: spinnerTop,
                  left: 0,
                  right: 0,
                  child: const Center(
                    child: SizedBox(
                      width: 38,
                      height: 38,
                      child: CircularProgressIndicator(
                        strokeWidth: 4.2,
                        valueColor: AlwaysStoppedAnimation<Color>(
                          Color(0xFF666A73),
                        ),
                        backgroundColor: Color(0xFFD6D8DD),
                      ),
                    ),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}
