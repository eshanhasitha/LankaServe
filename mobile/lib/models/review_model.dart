class ReviewModel {
  const ReviewModel({required this.id, required this.rating, required this.comment});

  final String id;
  final double rating;
  final String comment;

  factory ReviewModel.fromJson(Map<String, dynamic> json) {
    return ReviewModel(
      id: json['id'] as String? ?? '',
      rating: (json['rating'] as num?)?.toDouble() ?? 0,
      comment: json['comment'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() => {'id': id, 'rating': rating, 'comment': comment};
}
