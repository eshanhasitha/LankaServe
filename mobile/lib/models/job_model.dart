class JobModel {
  const JobModel({required this.id, required this.title, required this.status});

  final String id;
  final String title;
  final String status;

  factory JobModel.fromJson(Map<String, dynamic> json) {
    return JobModel(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      status: json['status'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() => {'id': id, 'title': title, 'status': status};
}
