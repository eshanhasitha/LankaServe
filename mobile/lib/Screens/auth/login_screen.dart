import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_sign_in/google_sign_in.dart';

import '../../config/firebase_bootstrap.dart';
import '../../config/routes.dart';
import '../../config/ui_styles.dart';
import '../../services/auth_service.dart';
import '../../widgets/google_logo.dart';
import '../../widgets/ui_scale.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  String _selectedLanguage = 'EN';
  bool _obscurePassword = true;
  bool _loading = false;

  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    const Color bg = Color(0xFFF3F4F7);
    const Color brand = Color(0xFF243F97);
    const Color heading = Color(0xFF0B1A44);
    const Color body = Color(0xFF66758E);

    final screenHeight = MediaQuery.sizeOf(context).height;
    final double hs = (screenHeight / 820.0).clamp(0.65, 1.0);

    final s = UiScale.factor(context, min: 0.76, max: 0.90) * hs;
    final hPad = UiScale.size(context, 28, min: 16, max: 30) * hs;
    final topPad = UiScale.size(context, 18, min: 10, max: 22) * hs;
    final bottomPad = UiScale.size(context, 24, min: 14, max: 30) * hs;

    double space(double value, {double min = 4, double max = double.infinity}) {
      return (UiScale.size(context, value, min: min, max: max) * hs).clamp(min, max);
    }

    return GestureDetector(
      onTap: () => FocusScope.of(context).unfocus(),
      child: Scaffold(
        backgroundColor: bg,
        body: SafeArea(
          child: SingleChildScrollView(
            padding: EdgeInsets.fromLTRB(hPad, topPad, hPad, bottomPad),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _buildHeader(brand, heading, s),
                SizedBox(height: space(18, min: 6, max: 20)),
                _buildLanguageSelector(body, brand, s),
                SizedBox(height: space(34, min: 10, max: 34)),
                Text(
                  'Welcome Back',
                  style: TextStyle(
                    color: heading,
                    fontSize: (UiScale.size(context, 58 / 2, min: 25, max: 30) * hs).clamp(18.0, 30.0),
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.3,
                  ),
                ),
                SizedBox(height: space(10, min: 4, max: 12)),
                Text(
                  'Please enter your details to sign in',
                  style: TextStyle(
                    color: body,
                    fontSize: (UiScale.size(context, 19 / 1.3, min: 14, max: 16) * hs).clamp(11.0, 16.0),
                    height: 1.4,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                SizedBox(height: space(30, min: 10, max: 32)),
                Text(
                  'Email Address',
                  style: TextStyle(
                    color: const Color(0xFF34435C),
                    fontSize: (UiScale.size(context, 16, min: 14, max: 17) * hs).clamp(12.0, 17.0),
                    fontWeight: FontWeight.w700,
                  ),
                ),
                SizedBox(height: space(8, min: 4, max: 10)),
                _buildInputField(
                  controller: _emailController,
                  hint: 'name@example.com',
                  keyboardType: TextInputType.emailAddress,
                  scale: s,
                ),
                SizedBox(height: space(18, min: 6, max: 20)),
                Text(
                  'Password',
                  style: TextStyle(
                    color: const Color(0xFF34435C),
                    fontSize: (UiScale.size(context, 16, min: 14, max: 17) * hs).clamp(12.0, 17.0),
                    fontWeight: FontWeight.w700,
                  ),
                ),
                SizedBox(height: space(8, min: 4, max: 10)),
                _buildInputField(
                  controller: _passwordController,
                  hint: '••••••••',
                  obscureText: _obscurePassword,
                  scale: s,
                  suffix: IconButton(
                    onPressed: () =>
                        setState(() => _obscurePassword = !_obscurePassword),
                    splashRadius: 20,
                    icon: Icon(
                      _obscurePassword
                          ? Icons.visibility_off_outlined
                          : Icons.visibility_outlined,
                      color: const Color(0xFF93A2B8),
                    ),
                  ),
                ),
                const SizedBox(height: 4),
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton(
                    onPressed: () =>
                        _show('Forgot password flow will be added next.'),
                    child: Text(
                      'Forgot password?',
                      style: TextStyle(
                        color: brand,
                        fontSize: (17 * hs).clamp(13.0, 17.0),
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
                SizedBox(height: space(2, min: 1, max: 4)),
                SizedBox(
                  height: (UiScale.size(context, 64, min: 56, max: 66) * hs).clamp(42.0, 66.0),
                  child: ElevatedButton(
                    onPressed: _loading ? null : _handleLogin,
                    style: AppUiStyles.primaryButton(
                      height: (UiScale.size(context, 64, min: 56, max: 66) * hs).clamp(42.0, 66.0),
                      radius: BorderRadius.circular((20 * (s / 0.8)).clamp(12.0, 20.0)),
                    ),
                    child: _loading
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
                        : Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                'Login',
                                style: TextStyle(
                                  fontSize: (18 * hs).clamp(13.0, 18.0),
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Icon(Icons.login_rounded, size: (28 * hs).clamp(18.0, 28.0)),
                            ],
                          ),
                  ),
                ),
                SizedBox(height: space(20, min: 8, max: 22)),
                Row(
                  children: [
                    const Expanded(
                      child: Divider(color: Color(0xFFD3D9E3), thickness: 1.2),
                    ),
                    SizedBox(width: space(12, min: 6, max: 14)),
                    Text(
                      'or continue with',
                      style: TextStyle(
                        color: const Color(0xFF6D7D97),
                        fontSize: (UiScale.size(
                          context,
                          22 / 1.3,
                          min: 14,
                          max: 17,
                        ) * hs).clamp(11.0, 17.0),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    SizedBox(width: space(12, min: 6, max: 14)),
                    const Expanded(
                      child: Divider(color: Color(0xFFD3D9E3), thickness: 1.2),
                    ),
                  ],
                ),
                SizedBox(height: space(18, min: 8, max: 20)),
                SizedBox(
                  height: (UiScale.size(context, 58, min: 52, max: 60) * hs).clamp(40.0, 60.0),
                  child: OutlinedButton(
                    onPressed: _loading ? null : _onGoogleLogin,
                    style:
                        AppUiStyles.neutralOutlineButton(
                          height: (UiScale.size(context, 58, min: 52, max: 60) * hs).clamp(40.0, 60.0),
                          radius: BorderRadius.circular((16 * (s / 0.8)).clamp(10.0, 16.0)),
                        ).copyWith(
                          backgroundColor: WidgetStateProperty.all(
                            const Color(0xFFF8F9FB),
                          ),
                        ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        GoogleLogo(size: (26 * hs).clamp(18.0, 26.0)),
                        const SizedBox(width: 14),
                        Text(
                          'Continue with Google',
                          style: TextStyle(
                            color: const Color(0xFF364862),
                            fontSize: (17 * hs).clamp(13.0, 17.0),
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                SizedBox(height: space(42, min: 14, max: 42)),
                Center(
                  child: TextButton(
                    onPressed: () => Navigator.pushReplacementNamed(
                      context,
                      AppRoutes.register,
                    ),
                    child: Text.rich(
                      TextSpan(
                        children: [
                          TextSpan(
                            text: 'Don\'t have an account? ',
                            style: TextStyle(
                              color: const Color(0xFF5F6F89),
                              fontSize: (UiScale.size(
                                context,
                                17,
                                min: 15,
                                max: 17,
                              ) * hs).clamp(12.0, 17.0),
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          TextSpan(
                            text: 'Register',
                            style: TextStyle(
                              color: brand,
                              fontSize: (UiScale.size(
                                context,
                                17,
                                min: 15,
                                max: 17,
                              ) * hs).clamp(12.0, 17.0),
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(Color brand, Color heading, double scale) {
    return Center(
      child: Column(
        children: [
          Container(
            width: (98 * scale).clamp(48.0, 104.0),
            height: (98 * scale).clamp(48.0, 104.0),
            decoration: BoxDecoration(
              color: brand,
              borderRadius: BorderRadius.circular((24 * (scale / 0.8)).clamp(12.0, 24.0)),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x25000000),
                  blurRadius: 22,
                  spreadRadius: 0,
                  offset: Offset(0, 10),
                ),
              ],
            ),
            child: Icon(
              Icons.handshake_rounded,
              color: Colors.white,
              size: (52 * scale).clamp(26.0, 54.0),
            ),
          ),
          SizedBox(height: (10 * scale).clamp(4.0, 12.0)),
          Text(
            'LankaServe',
            style: TextStyle(
              color: heading,
              fontSize: (25 / 1.1 * scale).clamp(16.0, 24.0),
              fontWeight: FontWeight.w800,
              letterSpacing: -0.2,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLanguageSelector(Color body, Color brand, double scale) {
    return Center(
      child: Container(
        width: (256 * scale).clamp(160.0, 280.0),
        height: (54 * scale).clamp(36.0, 56.0),
        padding: EdgeInsets.all((6 * scale).clamp(3.0, 6.0)),
        decoration: BoxDecoration(
          color: const Color(0xFFD6DCE5),
          borderRadius: BorderRadius.circular(999),
        ),
        child: Row(
          children: [
            _languageTab('EN', body, brand, scale),
            _languageTab('SI', body, brand, scale),
            _languageTab('TA', body, brand, scale),
          ],
        ),
      ),
    );
  }

  Widget _languageTab(String label, Color body, Color brand, double scale) {
    final selected = _selectedLanguage == label;
    return Expanded(
      child: InkWell(
        borderRadius: BorderRadius.circular(999),
        onTap: () => setState(() => _selectedLanguage = label),
        child: Container(
          decoration: BoxDecoration(
            color: selected ? const Color(0xFFF8F9FB) : Colors.transparent,
            borderRadius: BorderRadius.circular(999),
            border: selected
                ? Border.all(color: const Color(0xFFD1D7E1))
                : null,
          ),
          child: Center(
            child: Text(
              label,
              style: TextStyle(
                color: selected ? brand : body,
                fontSize: (17 * scale).clamp(11.0, 18.0),
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildInputField({
    required TextEditingController controller,
    required String hint,
    required double scale,
    TextInputType keyboardType = TextInputType.text,
    bool obscureText = false,
    Widget? suffix,
  }) {
    return TextField(
      controller: controller,
      keyboardType: keyboardType,
      obscureText: obscureText,
      textInputAction: TextInputAction.next,
      style: TextStyle(
        color: const Color(0xFF2B3B56),
        fontSize: (18 * scale).clamp(13.0, 18.0),
        fontWeight: FontWeight.w500,
      ),
      decoration: InputDecoration(
        filled: true,
        fillColor: const Color(0xFFF8F9FB),
        hintText: hint,
        hintStyle: TextStyle(
          color: const Color(0xFF93A2B8),
          fontSize: (18 * scale).clamp(13.0, 18.0),
          letterSpacing: obscureText ? 2.0 : 0,
          fontWeight: FontWeight.w500,
        ),
        suffixIcon: suffix,
        contentPadding: EdgeInsets.symmetric(
          horizontal: (18 * scale).clamp(10.0, 18.0),
          vertical: (18 * scale).clamp(10.0, 18.0),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular((18 * (scale / 0.8)).clamp(10.0, 18.0)),
          borderSide: const BorderSide(color: Color(0xFFD3DAE5)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular((18 * (scale / 0.8)).clamp(10.0, 18.0)),
          borderSide: const BorderSide(color: Color(0xFF9CADC3), width: 1.3),
        ),
      ),
    );
  }

  Future<void> _onGoogleLogin() async {
    if (!_ensureFirebaseReady()) return;

    setState(() => _loading = true);
    try {
      final googleSignIn = GoogleSignIn();
      await googleSignIn.signOut();
      final googleUser = await googleSignIn.signIn();
      if (googleUser == null) return;

      final googleAuth = await googleUser.authentication;
      final credential = GoogleAuthProvider.credential(
        accessToken: googleAuth.accessToken,
        idToken: googleAuth.idToken,
      );

      final userCredential = await FirebaseAuth.instance.signInWithCredential(
        credential,
      );
      final token = await userCredential.user?.getIdToken(true);
      if (token == null || token.isEmpty) {
        _show('Unable to get Firebase token.');
        return;
      }

      final session = await AuthService().loginWithFirebase(
        firebaseIdToken: token,
      );
      if (!mounted) return;
      final role = session.user['role']?.toString() ?? 'customer';
      Navigator.pushNamedAndRemoveUntil(
        context,
        role == 'provider'
            ? AppRoutes.providerDashboard
            : AppRoutes.customerDashboard,
        (_) => false,
      );
    } catch (e) {
      _show(_googleSignInErrorMessage(e));
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _handleLogin() async {
    if (!_ensureFirebaseReady()) return;

    final email = _emailController.text.trim();
    final password = _passwordController.text;

    if (email.isEmpty || password.isEmpty) {
      _show('Please enter email and password.');
      return;
    }

    final emailValid = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(email);
    if (!emailValid) {
      _show('Please enter a valid email address.');
      return;
    }

    setState(() => _loading = true);
    try {
      final credential = await FirebaseAuth.instance.signInWithEmailAndPassword(
        email: email,
        password: password,
      );

      final token = await credential.user?.getIdToken(true);
      if (token == null || token.isEmpty) {
        _show('Unable to get Firebase token.');
        return;
      }

      final session = await AuthService().loginWithFirebase(
        firebaseIdToken: token,
      );
      if (!mounted) return;

      final role = session.user['role']?.toString() ?? 'customer';
      Navigator.pushNamedAndRemoveUntil(
        context,
        role == 'provider'
            ? AppRoutes.providerDashboard
            : AppRoutes.customerDashboard,
        (_) => false,
      );
    } on FirebaseAuthException catch (e) {
      _show(e.message ?? 'Firebase login failed.');
    } catch (e) {
      _show(e.toString());
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  bool _ensureFirebaseReady() {
    if (FirebaseBootstrap.initialized) return true;
    final error = FirebaseBootstrap.initError;
    if (error != null) {
      _show('Firebase init failed: $error');
    } else {
      _show(
        'Firebase is not configured. Add android/app/google-services.json and re-run app.',
      );
    }
    return false;
  }

  void _show(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  String _googleSignInErrorMessage(Object error) {
    final text = error.toString();
    if ((error is PlatformException && text.contains('ApiException: 10')) ||
        text.contains('ApiException: 10')) {
      return 'Google Sign-In is blocked by Firebase Android OAuth setup. Add SHA1 '
          '76:20:FC:B2:BA:80:D1:B1:AA:88:22:44:3E:93:C4:5A:8A:09:DD:79 to Firebase app '
          '(com.lankaserve.mobile), download new google-services.json, then rebuild.';
    }
    return 'Google sign-in failed: $text';
  }
}
