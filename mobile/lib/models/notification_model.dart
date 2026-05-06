class NotificationModel {
  const NotificationModel({required this.id, required this.title, required this.body});

  final String id;
  final String title;
  final String body;

  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    return NotificationModel(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      body: json['body'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() => {'id': id, 'title': title, 'body': body};
}
