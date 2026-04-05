import 'package:flutter/material.dart';

class ProviderProfileCard extends StatelessWidget {
  const ProviderProfileCard({super.key});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        title: Text("Provider Name"),
        subtitle: Text("Provider Details"),
      ),
    );
  }
}