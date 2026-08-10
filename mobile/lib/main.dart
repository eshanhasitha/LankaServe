import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:provider/provider.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'config/routes.dart';
import 'config/theme.dart';
import 'config/firebase_bootstrap.dart';
import 'providers/locale_provider.dart';
import 'providers/user_provider.dart';
import 'providers/job_provider.dart';
import 'localization/app_localizations.dart';

Future<void> main() async {
  debugPrint('DEBUG: main() started');
  WidgetsFlutterBinding.ensureInitialized();
  debugPrint('DEBUG: WidgetsFlutterBinding initialized');
  try {
    debugPrint('DEBUG: Initializing Firebase');
    await Firebase.initializeApp();
    debugPrint('DEBUG: Firebase initialized');
    FirebaseBootstrap.initialized = true;
  } catch (e) {
    FirebaseBootstrap.initError = e;
    debugPrint('Firebase init failed: $e');
  }
  debugPrint('DEBUG: calling runApp');
  runApp(const LankaServeApp());
}

class LankaServeApp extends StatelessWidget {
  const LankaServeApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => LocaleProvider()),
        ChangeNotifierProvider(create: (_) => UserProvider()),
        ChangeNotifierProvider(create: (_) => JobProvider()),
      ],
      child: Consumer<LocaleProvider>(
        builder: (context, localeProvider, child) {
          return MaterialApp(
            debugShowCheckedModeBanner: false,
            title: 'LankaServe',
            theme: AppTheme.lightTheme,
            initialRoute: AppRoutes.splash,
            routes: AppRoutes.routes,
            locale: localeProvider.locale,
            supportedLocales: const [
              Locale('en', ''),
              Locale('si', ''),
              Locale('ta', ''),
            ],
            localizationsDelegates: const [
              AppLocalizations.delegate,
              GlobalMaterialLocalizations.delegate,
              GlobalWidgetsLocalizations.delegate,
              GlobalCupertinoLocalizations.delegate,
            ],
          );
        },
      ),
    );
  }
}
