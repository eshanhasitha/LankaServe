import 'package:flutter/material.dart';

class RatingWidget extends StatelessWidget {
  const RatingWidget({super.key, required this.rating});

  final double rating;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List<Widget>.generate(
        5,
        (int i) => Icon(
          i < rating.round() ? Icons.star : Icons.star_border,
          size: 16,
          color: Colors.amber,
        ),
      ),
    );
  }
}
