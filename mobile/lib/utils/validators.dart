class Validators {
  Validators._();

  static String? requiredField(String? value, {String field = 'Field'}) {
    if (value == null || value.trim().isEmpty) {
      return '$field is required';
    }
    return null;
  }
}
