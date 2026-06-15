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

enum RegisterType { customer, provider }

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  String _selectedLanguage = 'EN';
  RegisterType _selectedType = RegisterType.customer;

  bool _termsAccepted = false;
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;
  bool _loading = false;

  final TextEditingController _fullNameController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _confirmPasswordController =
      TextEditingController();
  final TextEditingController _addressController = TextEditingController();
  final TextEditingController _serviceCategoryController =
      TextEditingController();
  final TextEditingController _serviceAreaController = TextEditingController();

  @override
  void dispose() {
    _fullNameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _addressController.dispose();
    _serviceCategoryController.dispose();
    _serviceAreaController.dispose();
    super.dispose();
  }

  bool get _isProvider => _selectedType == RegisterType.provider;

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
                  'Create Account',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: heading,
                    fontSize: (UiScale.size(context, 58 / 2, min: 25, max: 30) * hs).clamp(18.0, 30.0),
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.3,
                  ),
                ),
                SizedBox(height: space(10, min: 4, max: 12)),
                Text(
                  'Join the trusted community of service providers\nand customers in Sri Lanka.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: body,
                    fontSize: (UiScale.size(context, 19 / 1.3, min: 14, max: 16) * hs).clamp(11.0, 16.0),
                    height: 1.4,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                SizedBox(height: space(28, min: 10, max: 30)),
                Text(
                  'I WANT TO REGISTER AS:',
                  style: TextStyle(
                    color: const Color(0xFF8EA0B8),
                    fontSize: (UiScale.size(context, 22 / 2, min: 10, max: 12) * hs).clamp(8.0, 12.0),
                    letterSpacing: 1.8,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                SizedBox(height: space(12, min: 6, max: 14)),
                Row(
                  children: [
                    Expanded(
                      child: _roleCard(
                        selected: _selectedType == RegisterType.customer,
                        label: 'Customer',
                        icon: Icons.person_outline_rounded,
                        onTap: () => setState(
                          () => _selectedType = RegisterType.customer,
                        ),
                      ),
                    ),
                    SizedBox(width: space(14, min: 6, max: 14)),
                    Expanded(
                      child: _roleCard(
                        selected: _selectedType == RegisterType.provider,
                        label: 'Service Provider',
                        icon: Icons.grid_view_rounded,
                        onTap: () => setState(
                          () => _selectedType = RegisterType.provider,
                        ),
                      ),
                    ),
                  ],
                ),
                if (_isProvider) ...[
                  SizedBox(height: space(12, min: 4, max: 14)),
                  Text(
                    'Your selected role will determine your dashboard experience.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: const Color(0xFF98A7BC),
                      fontSize: (UiScale.size(context, 13.5, min: 11, max: 14) * hs).clamp(9.0, 14.0),
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
                SizedBox(height: space(16, min: 8, max: 18)),
                const _FieldLabel('Full Name'),
                SizedBox(height: space(8, min: 4, max: 10)),
                _AppInput(
                  controller: _fullNameController,
                  hint: 'Enter your full name',
                  textInputAction: TextInputAction.next,
                ),
                SizedBox(height: space(14, min: 6, max: 16)),
                const _FieldLabel('Email Address'),
                SizedBox(height: space(8, min: 4, max: 10)),
                _AppInput(
                  controller: _emailController,
                  hint: 'example@mail.com',
                  keyboardType: TextInputType.emailAddress,
                  textInputAction: TextInputAction.next,
                ),
                SizedBox(height: space(14, min: 6, max: 16)),
                const _FieldLabel('Phone Number'),
                SizedBox(height: space(8, min: 4, max: 10)),
                _buildPhoneInput(),
                SizedBox(height: space(14, min: 6, max: 16)),
                const _FieldLabel('Password'),
                SizedBox(height: space(8, min: 4, max: 10)),
                _AppInput(
                  controller: _passwordController,
                  hint: '••••••••',
                  obscureText: _obscurePassword,
                  textInputAction: TextInputAction.next,
                  suffix: IconButton(
                    onPressed: () =>
                        setState(() => _obscurePassword = !_obscurePassword),
                    splashRadius: 20,
                    icon: Icon(
                      _obscurePassword
                          ? Icons.visibility_outlined
                          : Icons.visibility_off_outlined,
                      color: const Color(0xFF93A2B8),
                    ),
                  ),
                ),
                SizedBox(height: space(14, min: 6, max: 16)),
                const _FieldLabel('Confirm Password'),
                SizedBox(height: space(8, min: 4, max: 10)),
                _AppInput(
                  controller: _confirmPasswordController,
                  hint: '••••••••',
                  obscureText: _obscureConfirmPassword,
                  textInputAction: TextInputAction.next,
                  suffix: IconButton(
                    onPressed: () => setState(
                      () => _obscureConfirmPassword = !_obscureConfirmPassword,
                    ),
                    splashRadius: 20,
                    icon: Icon(
                      _obscureConfirmPassword
                          ? Icons.visibility_outlined
                          : Icons.visibility_off_outlined,
                      color: const Color(0xFF93A2B8),
                    ),
                  ),
                ),
                SizedBox(height: space(14, min: 6, max: 16)),
                const _FieldLabel('Address'),
                SizedBox(height: space(8, min: 4, max: 10)),
                _AppInput(
                  controller: _addressController,
                  hint: _isProvider
                      ? 'Enter your business or residential address'
                      : 'Enter your full street address',
                  maxLines: 3,
                  minLines: 3,
                  textInputAction: TextInputAction.newline,
                ),
                if (_isProvider) ...[
                  SizedBox(height: space(18, min: 8, max: 20)),
                  _buildProviderDivider(),
                  SizedBox(height: space(16, min: 8, max: 18)),
                  const _FieldLabel('Service Category'),
                  SizedBox(height: space(8, min: 4, max: 10)),
                  GestureDetector(
                    onTap: _selectServiceCategory,
                    child: AbsorbPointer(
                      child: _AppInput(
                        controller: _serviceCategoryController,
                        hint: 'Select your primary service',
                        hintColor: _serviceCategoryController.text.isEmpty
                            ? const Color(0xFF202634)
                            : const Color(0xFF202634),
                        suffix: const Icon(
                          Icons.keyboard_arrow_down_rounded,
                          color: Color(0xFF8EA0B8),
                          size: 30,
                        ),
                      ),
                    ),
                  ),
                  SizedBox(height: space(14, min: 6, max: 16)),
                  const _FieldLabel('Service Area'),
                  SizedBox(height: space(8, min: 4, max: 10)),
                  _AppInput(
                    controller: _serviceAreaController,
                    hint: 'Enter your city or district (e.g., Colombo,\nKandy)',
                    maxLines: 2,
                    minLines: 2,
                    textInputAction: TextInputAction.newline,
                  ),
                  Padding(
                    padding: EdgeInsets.only(
                      top: space(6, min: 3, max: 8),
                      left: 2,
                    ),
                    child: Text(
                      '? You will receive service requests from these locations.',
                      style: TextStyle(
                        color: const Color(0xFF9AA8BC),
                        fontSize: (UiScale.size(context, 13.5, min: 11, max: 14) * hs).clamp(9.0, 14.0),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
                SizedBox(height: space(14, min: 6, max: 16)),
                _buildTerms(body),
                SizedBox(height: space(18, min: 8, max: 20)),
                SizedBox(
                  height: (UiScale.size(context, 64, min: 56, max: 66) * hs).clamp(42.0, 66.0),
                  child: ElevatedButton(
                    onPressed: _loading ? null : _handleRegister,
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
                        : Text(
                            _isProvider
                                ? 'Register as Service Provider'
                                : 'Register',
                            style: TextStyle(
                              fontSize: (18 * hs).clamp(13.0, 18.0),
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                  ),
                ),
                SizedBox(height: space(20, min: 8, max: 22)),
                Row(
                  children: [
                    const Expanded(
                      child: Divider(color: Color(0xFFD3D9E3), thickness: 1.2),
                    ),
                    Padding(
                      padding: EdgeInsets.symmetric(
                        horizontal: space(12, min: 6, max: 14),
                      ),
                      child: Text(
                        _isProvider ? 'OR CONTINUE WITH' : 'OR',
                        style: TextStyle(
                          color: const Color(0xFF8EA0B8),
                          fontSize: (UiScale.size(context, 13, min: 11, max: 13) * hs).clamp(8.0, 13.0),
                          fontWeight: FontWeight.w800,
                          letterSpacing: 1.7,
                        ),
                      ),
                    ),
                    const Expanded(
                      child: Divider(color: Color(0xFFD3D9E3), thickness: 1.2),
                    ),
                  ],
                ),
                SizedBox(height: space(18, min: 8, max: 20)),
                SizedBox(
                  height: (UiScale.size(context, 58, min: 52, max: 60) * hs).clamp(40.0, 60.0),
                  child: OutlinedButton(
                    onPressed: _onGoogleRegister,
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
                          'Sign up with Google',
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
                if (_isProvider)
                  Padding(
                    padding: EdgeInsets.only(
                      top: space(12, min: 4, max: 14),
                    ),
                    child: Text(
                      'You will be registered as a Service Provider.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: const Color(0xFF9AA8BC),
                        fontSize: (UiScale.size(context, 13.5, min: 11, max: 14) * hs).clamp(9.0, 14.0),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                SizedBox(height: space(20, min: 8, max: 22)),
                Center(
                  child: TextButton(
                    onPressed: () => Navigator.pushReplacementNamed(
                      context,
                      AppRoutes.login,
                    ),
                    child: Text.rich(
                      TextSpan(
                        children: [
                          TextSpan(
                            text: 'Already have an account? ',
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
                            text: 'Login',
                            style: TextStyle(
                              color: const Color(0xFF243F97),
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

  Widget _roleCard({
    required bool selected,
    required String label,
    required IconData icon,
    required VoidCallback onTap,
  }) {
    final screenHeight = MediaQuery.sizeOf(context).height;
    final double hs = (screenHeight / 820.0).clamp(0.65, 1.0);
    final scale = UiScale.factor(context, min: 0.76, max: 0.90) * hs;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular((20 * scale).clamp(10.0, 22.0)),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 140),
        height: (102 * scale).clamp(56.0, 104.0),
        decoration: BoxDecoration(
          color: const Color(0xFFF8F9FB),
          borderRadius: BorderRadius.circular((20 * scale).clamp(10.0, 22.0)),
          border: Border.all(
            color: selected ? const Color(0xFF2846A2) : const Color(0xFFDCE3ED),
            width: selected ? 2.2 : 1.3,
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: (28 * scale).clamp(16.0, 30.0),
              color: const Color(0xFF93A2B8),
            ),
            SizedBox(height: (6 * scale).clamp(2.0, 7.0)),
            Text(
              label,
              style: TextStyle(
                color: selected
                    ? const Color(0xFF1A243D)
                    : const Color(0xFF6A7B95),
                fontSize:
                    ((label == 'Service Provider' ? 31 / 2.2 : 32 / 2.1) *
                            scale)
                        .clamp(10.0, 16.0),
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPhoneInput() {
    final screenHeight = MediaQuery.sizeOf(context).height;
    final double hs = (screenHeight / 820.0).clamp(0.65, 1.0);
    final scale = UiScale.factor(context, min: 0.76, max: 0.90) * hs;
    return Container(
      height: (70 * scale).clamp(42.0, 72.0),
      decoration: BoxDecoration(
        color: const Color(0xFFF8F9FB),
        borderRadius: BorderRadius.circular((18 * (scale / 0.8)).clamp(10.0, 18.0)),
        border: Border.all(color: const Color(0xFFD3DAE5)),
      ),
      child: Row(
        children: [
          Container(
            width: (78 * scale).clamp(50.0, 82.0),
            alignment: Alignment.center,
            decoration: const BoxDecoration(
              border: Border(right: BorderSide(color: Color(0xFFD3DAE5))),
            ),
            child: Text(
              '+94',
              style: TextStyle(
                color: const Color(0xFF62728C),
                fontSize: (17 * hs).clamp(13.0, 17.0),
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Expanded(
            child: TextField(
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              textInputAction: TextInputAction.next,
              style: TextStyle(
                color: const Color(0xFF2B3B56),
                fontSize: (17 * hs).clamp(13.0, 17.0),
                fontWeight: FontWeight.w500,
              ),
              decoration: InputDecoration(
                hintText: '77 123 4567',
                hintStyle: TextStyle(
                  color: const Color(0xFF93A2B8),
                  fontSize: (17 * hs).clamp(13.0, 17.0),
                  fontWeight: FontWeight.w500,
                ),
                border: InputBorder.none,
                contentPadding: EdgeInsets.symmetric(horizontal: (16 * hs).clamp(10.0, 16.0)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProviderDivider() {
    final screenHeight = MediaQuery.sizeOf(context).height;
    final double hs = (screenHeight / 820.0).clamp(0.65, 1.0);
    final scale = UiScale.factor(context, min: 0.76, max: 0.90) * hs;
    return Row(
      children: [
        const Expanded(
          child: Divider(color: Color(0xFFD3DAE4), thickness: 1.2),
        ),
        SizedBox(width: (10 * scale).clamp(6.0, 12.0)),
        DecoratedBox(
          decoration: const BoxDecoration(color: Color(0xFFF3F4F7)),
          child: Padding(
            padding: EdgeInsets.symmetric(horizontal: (8 * hs).clamp(4.0, 8.0), vertical: 1),
            child: Text(
              'PROVIDER DETAILS',
              style: TextStyle(
                color: const Color(0xFF8EA0B8),
                fontSize: (12 * scale).clamp(8.0, 12.0),
                fontWeight: FontWeight.w800,
                letterSpacing: 1.8,
              ),
            ),
          ),
        ),
        SizedBox(width: (10 * scale).clamp(6.0, 12.0)),
        const Expanded(
          child: Divider(color: Color(0xFFD3DAE4), thickness: 1.2),
        ),
      ],
    );
  }

  Widget _buildTerms(Color body) {
    final screenHeight = MediaQuery.sizeOf(context).height;
    final double hs = (screenHeight / 820.0).clamp(0.65, 1.0);
    final scale = UiScale.factor(context, min: 0.76, max: 0.90) * hs;
    final checkSize = (26 * hs).clamp(20.0, 26.0);
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        InkWell(
          onTap: () => setState(() => _termsAccepted = !_termsAccepted),
          borderRadius: BorderRadius.circular(16),
          child: Container(
            margin: const EdgeInsets.only(top: 2),
            width: checkSize,
            height: checkSize,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: _termsAccepted
                  ? const Color(0xFF243F97)
                  : const Color(0xFFF8F9FB),
              border: Border.all(color: const Color(0xFFC8D1DE)),
            ),
            child: _termsAccepted
                ? Icon(Icons.check, size: (16 * hs).clamp(12.0, 16.0), color: Colors.white)
                : null,
          ),
        ),
        SizedBox(width: (10 * scale).clamp(6.0, 12.0)),
        Expanded(
          child: Text.rich(
            TextSpan(
              children: [
                TextSpan(
                  text: _isProvider
                      ? 'By registering as a Provider, I agree to LankaServe\'s '
                      : 'By registering, I agree to LankaServe\'s ',
                  style: TextStyle(
                    color: body,
                    fontSize: (14 * scale).clamp(10.0, 14.0),
                    height: 1.45,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                TextSpan(
                  text: 'Service Terms',
                  style: TextStyle(
                    color: const Color(0xFF34435C),
                    decoration: TextDecoration.underline,
                    fontSize: (14 * scale).clamp(10.0, 14.0),
                    fontWeight: FontWeight.w700,
                  ),
                ),
                TextSpan(
                  text: ' and ',
                  style: TextStyle(
                    color: body,
                    fontSize: (14 * scale).clamp(10.0, 14.0),
                    fontWeight: FontWeight.w500,
                  ),
                ),
                TextSpan(
                  text: 'Privacy Policy.',
                  style: TextStyle(
                    color: const Color(0xFF34435C),
                    decoration: TextDecoration.underline,
                    fontSize: (14 * scale).clamp(10.0, 14.0),
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Future<void> _selectServiceCategory() async {
    final options = <String>[
      'Plumbing',
      'Electrical',
      'Cleaning',
      'Renovation',
      'Moving',
    ];
    final selected = await showModalBottomSheet<String>(
      context: context,
      backgroundColor: const Color(0xFFF8F9FB),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Select your primary service',
                  style: TextStyle(
                    color: Color(0xFF0B1A44),
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 12),
                ...options.map(
                  (item) => ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(
                      item,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    onTap: () => Navigator.pop(context, item),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
    if (selected != null && selected.isNotEmpty) {
      setState(() => _serviceCategoryController.text = selected);
    }
  }

  Future<void> _onGoogleRegister() async {
    if (!_ensureFirebaseReady()) return;
    if (!_termsAccepted) {
      _show('Please accept terms to continue.');
      return;
    }

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

      final providerProfile = _isProvider
          ? _buildOptionalProviderProfile(userCredential: userCredential)
          : null;

      AuthSession session;
      try {
        session = await AuthService().registerWithFirebase(
          firebaseIdToken: token,
          role: _isProvider ? 'provider' : 'customer',
          providerProfile: providerProfile,
        );
      } catch (e) {
        final message = e.toString().toLowerCase();
        if (message.contains('already exists')) {
          session = await AuthService().loginWithFirebase(
            firebaseIdToken: token,
          );
        } else {
          rethrow;
        }
      }

      if (!mounted) return;
      final role =
          session.user['role']?.toString() ??
          (_isProvider ? 'provider' : 'customer');
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

  Map<String, dynamic>? _buildOptionalProviderProfile({
    required UserCredential userCredential,
  }) {
    final fullName =
        (userCredential.user?.displayName ?? _fullNameController.text).trim();
    final phone = _phoneController.text.trim().replaceAll(
      RegExp(r'[^0-9]'),
      '',
    );
    final address = _addressController.text.trim();
    final serviceArea = _serviceAreaController.text.trim();
    final category = _serviceCategoryController.text.trim();

    final profile = <String, dynamic>{};
    if (fullName.isNotEmpty) profile['fullName'] = fullName;
    if (phone.isNotEmpty) profile['phoneNumber'] = '+94$phone';
    if (address.isNotEmpty) profile['address'] = address;
    if (serviceArea.isNotEmpty) profile['serviceArea'] = serviceArea;
    if (category.isNotEmpty) profile['categories'] = <String>[category];

    return profile.isEmpty ? null : profile;
  }

  Future<void> _handleRegister() async {
    if (!_ensureFirebaseReady()) return;

    final fullName = _fullNameController.text.trim();
    final email = _emailController.text.trim();
    final phone = _phoneController.text.trim();
    final password = _passwordController.text;
    final confirmPassword = _confirmPasswordController.text;
    final address = _addressController.text.trim();

    if (fullName.isEmpty ||
        email.isEmpty ||
        phone.isEmpty ||
        address.isEmpty ||
        password.isEmpty ||
        confirmPassword.isEmpty) {
      _show('Please fill all required fields.');
      return;
    }

    final emailValid = RegExp(
      r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
    ).hasMatch(email);
    if (!emailValid) {
      _show('Please enter a valid email address.');
      return;
    }

    if (!email.endsWith('@gmail.com')) {
      _show('Please use a valid Gmail email address.');
      return;
    }

    final phoneDigits = phone.replaceAll(RegExp(r'[^0-9]'), '');
    if (phoneDigits.length < 9) {
      _show('Please enter a valid phone number.');
      return;
    }

    if (password.length < 6) {
      _show('Password must be at least 6 characters.');
      return;
    }

    if (password != confirmPassword) {
      _show('Passwords do not match.');
      return;
    }

    if (_isProvider) {
      if (_serviceCategoryController.text.trim().isEmpty) {
        _show('Please select service category.');
        return;
      }
      if (_serviceAreaController.text.trim().isEmpty) {
        _show('Please enter service area.');
        return;
      }
    }

    if (!_termsAccepted) {
      _show('Please accept terms to continue.');
      return;
    }

    setState(() => _loading = true);
    try {
      final credential = await FirebaseAuth.instance
          .createUserWithEmailAndPassword(email: email, password: password);

      await credential.user?.updateDisplayName(fullName);
      final token = await credential.user?.getIdToken(true);
      if (token == null || token.isEmpty) {
        _show('Unable to get Firebase token.');
        return;
      }

      final providerProfile = _isProvider
          ? <String, dynamic>{
              'fullName': fullName,
              'phoneNumber': '+94$phoneDigits',
              'address': address,
              'serviceArea': _serviceAreaController.text.trim(),
              'categories': <String>[_serviceCategoryController.text.trim()],
            }
          : null;

      AuthSession session;
      try {
        session = await AuthService().registerWithFirebase(
          firebaseIdToken: token,
          role: _isProvider ? 'provider' : 'customer',
          providerProfile: providerProfile,
        );
      } catch (e) {
        final message = e.toString().toLowerCase();
        if (message.contains('already exists')) {
          session = await AuthService().loginWithFirebase(
            firebaseIdToken: token,
          );
        } else {
          rethrow;
        }
      }

      if (!mounted) return;
      final role =
          session.user['role']?.toString() ??
          (_isProvider ? 'provider' : 'customer');
      Navigator.pushNamedAndRemoveUntil(
        context,
        role == 'provider'
            ? AppRoutes.providerDashboard
            : AppRoutes.customerDashboard,
        (_) => false,
      );
    } on FirebaseAuthException catch (e) {
      _show(e.message ?? 'Firebase registration failed.');
    } catch (e) {
      _show(e.toString());
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  void _show(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
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

  String _googleSignInErrorMessage(Object error) {
    final text = error.toString();
    if ((error is PlatformException && text.contains('ApiException: 10')) ||
        text.contains('ApiException: 10')) {
      return 'Google Sign-In is blocked by Firebase Android OAuth setup. Add SHA1 '
          '76:20:FC:B2:BA:80:D1:B1:AA:88:22:44:3E:93:C4:5A:8A:09:DD:79 to Firebase app '
          '(com.lankaserve.mobile), download new google-services.json, then rebuild.';
    }
    return 'Google sign-up failed: $text';
  }
}

class _FieldLabel extends StatelessWidget {
  const _FieldLabel(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    final screenHeight = MediaQuery.sizeOf(context).height;
    final double hs = (screenHeight / 820.0).clamp(0.65, 1.0);
    final scale = UiScale.factor(context, min: 0.76, max: 0.90) * hs;
    return Text(
      text,
      style: TextStyle(
        color: const Color(0xFF34435C),
        fontSize: (16 * scale).clamp(11.0, 17.0),
        fontWeight: FontWeight.w700,
      ),
    );
  }
}

class _AppInput extends StatelessWidget {
  const _AppInput({
    required this.controller,
    required this.hint,
    this.keyboardType = TextInputType.text,
    this.obscureText = false,
    this.minLines = 1,
    this.maxLines = 1,
    this.textInputAction,
    this.hintColor = const Color(0xFF93A2B8),
    this.suffix,
  });

  final TextEditingController controller;
  final String hint;
  final TextInputType keyboardType;
  final bool obscureText;
  final int minLines;
  final int maxLines;
  final TextInputAction? textInputAction;
  final Color hintColor;
  final Widget? suffix;

  @override
  Widget build(BuildContext context) {
    final screenHeight = MediaQuery.sizeOf(context).height;
    final double hs = (screenHeight / 820.0).clamp(0.65, 1.0);
    final scale = UiScale.factor(context, min: 0.76, max: 0.90) * hs;
    final bool isMultiline =
        maxLines > 1 ||
        minLines > 1 ||
        textInputAction == TextInputAction.newline;
    final TextInputType resolvedKeyboardType = isMultiline
        ? TextInputType.multiline
        : keyboardType;

    return TextField(
      controller: controller,
      keyboardType: resolvedKeyboardType,
      obscureText: obscureText,
      minLines: minLines,
      maxLines: maxLines,
      textInputAction: textInputAction,
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
          color: hintColor,
          fontSize: (18 * scale).clamp(13.0, 18.0),
          height: 1.38,
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
}
