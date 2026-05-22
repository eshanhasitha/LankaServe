class ProviderModel {
  const ProviderModel({required this.id, required this.businessName});

  final String id;
  final String businessName;

  factory ProviderModel.fromJson(Map<String, dynamic> json) {
    return ProviderModel(
      id: json['id'] as String? ?? '',
      businessName: json['businessName'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() => {'id': id, 'businessName': businessName};
}
