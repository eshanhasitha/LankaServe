import 'package:flutter/material.dart';

class JobListScreen extends StatelessWidget {
  const JobListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text("Job List"),
      ),
      body: Center(
        child: Text(
          "Job List Screen",
          style: TextStyle(fontSize: 20),
        ),
      ),
    );
  }
}