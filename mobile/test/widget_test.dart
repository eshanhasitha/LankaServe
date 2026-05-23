import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:mobile/main.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues(<String, Object>{});
  });

  testWidgets('Splash shows branding', (WidgetTester tester) async {
    await tester.pumpWidget(const LankaServeApp());

    expect(find.text('LankaServe'), findsOneWidget);
    expect(find.text('Smart Service Marketplace'), findsOneWidget);
    expect(find.text('Welcome Back'), findsNothing);

    // Let splash timer complete to avoid pending timer assertions in tests.
    await tester.pump(const Duration(seconds: 3));
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
