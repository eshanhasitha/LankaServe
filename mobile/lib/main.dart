import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:http/http.dart' as http;

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const MyApp());
}

class MyApp extends StatefulWidget {
  const MyApp({super.key});

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  late final Future<FirebaseApp> _firebaseInit;

  @override
  void initState() {
    super.initState();
    _firebaseInit = Firebase.initializeApp(options: _firebaseOptions);
  }

  FirebaseOptions get _firebaseOptions {
    if (kIsWeb) {
      return const FirebaseOptions(
        apiKey: 'AIzaSyCBrRVLE6PRqxLvmt2-0_zEe9uNvRzvG3o',
        appId: '1:759974294598:web:c666216e18e9e6f9164647',
        messagingSenderId: '759974294598',
        projectId: 'lankaserve-e327a',
        authDomain: 'lankaserve-e327a.firebaseapp.com',
      );
    }

    // Android is the active mobile target in this workspace.
    return const FirebaseOptions(
      apiKey: 'AIzaSyCBrRVLE6PRqxLvmt2-0_zEe9uNvRzvG3o',
      appId: '1:759974294598:web:c666216e18e9e6f9164647',
      messagingSenderId: '759974294598',
      projectId: 'lankaserve-e327a',
      storageBucket: 'lankaserve-e327a.appspot.com',
    );
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: FutureBuilder<FirebaseApp>(
        future: _firebaseInit,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const _StatusScreen(
              title: 'Starting App',
              message: 'Initializing services...',
            );
          }

          if (snapshot.hasError) {
            return LoginPage(
              firebaseEnabled: false,
              initError:
                  'Firebase initialization failed. Add Firebase config files '
                  'for Android/iOS and try again.\n\n${snapshot.error}',
            );
          }

          return const LoginPage(firebaseEnabled: true);
        },
      ),
    );
  }
}

class _StatusScreen extends StatelessWidget {
  final String title;
  final String message;

  const _StatusScreen({required this.title, required this.message});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Mobile App')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(title, style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 12),
              Text(message, textAlign: TextAlign.center),
            ],
          ),
        ),
      ),
    );
  }
}

class LoginPage extends StatefulWidget {
  final bool firebaseEnabled;
  final String? initError;

  const LoginPage({super.key, required this.firebaseEnabled, this.initError});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final email = TextEditingController();
  final password = TextEditingController();
  String result = "";

  Future<void> login() async {
    if (!widget.firebaseEnabled) {
      setState(() {
        result =
            'Firebase is not configured for this build yet. Configure Android '
            'Firebase files first.';
      });
      return;
    }

    try {
      await FirebaseAuth.instance.signInWithEmailAndPassword(
        email: email.text.trim(),
        password: password.text.trim(),
      );
      setState(() => result = 'Login success');
    } catch (e) {
      setState(() => result = 'Login failed: $e');
    }
  }

  Future<void> protectedCall() async {
    if (!widget.firebaseEnabled) {
      setState(() {
        result =
            'Protected route requires Firebase login. Configure Firebase first.';
      });
      return;
    }

    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) {
        setState(() => result = 'Please log in first.');
        return;
      }

      final token = await user.getIdToken();
      final res = await http.get(
        Uri.parse('http://10.0.2.2:5000/api/users/me'),
        headers: {'Authorization': 'Bearer $token'},
      );
      setState(() => result = jsonEncode(jsonDecode(res.body)));
    } catch (e) {
      setState(() => result = 'Request failed: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Mobile App")),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (!widget.firebaseEnabled) ...[
                Text(
                  'Limited mode: Firebase is not configured on this device.',
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
                const SizedBox(height: 8),
                if (widget.initError != null)
                  Text(
                    widget.initError!,
                    style: const TextStyle(fontSize: 12),
                    maxLines: 8,
                    overflow: TextOverflow.ellipsis,
                  ),
                const SizedBox(height: 12),
              ],
              TextField(
                controller: email,
                decoration: const InputDecoration(labelText: 'Email'),
              ),
              TextField(
                controller: password,
                decoration: const InputDecoration(labelText: 'Password'),
                obscureText: true,
              ),
              const SizedBox(height: 12),
              ElevatedButton(onPressed: login, child: const Text('Login')),
              ElevatedButton(
                onPressed: protectedCall,
                child: const Text('Protected Route'),
              ),
              const SizedBox(height: 12),
              Text(result),
            ],
          ),
        ),
      ),
    );
  }
}
