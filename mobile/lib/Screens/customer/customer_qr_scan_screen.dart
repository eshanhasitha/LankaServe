import 'package:flutter/material.dart';

class CustomerQrScanScreen extends StatefulWidget {
  const CustomerQrScanScreen({super.key});

  @override
  State<CustomerQrScanScreen> createState() => _CustomerQrScanScreenState();
}

class _CustomerQrScanScreenState extends State<CustomerQrScanScreen> {
  bool _scanBusy = false;

  void _show(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  Future<void> _scanToken(String jobId, String token) async {
    if (_scanBusy) return;
    _scanBusy = true;
    try {
      if (!mounted) return;
      _show('Arrival confirmed.');
    } catch (e) {
      if (!mounted) return;
      _show('QR scan failed: $e');
    } finally {
      _scanBusy = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Scan QR')),
      body: const Center(
        child: Text('QR Scanner Screen'),
      ),
    );
  }
}