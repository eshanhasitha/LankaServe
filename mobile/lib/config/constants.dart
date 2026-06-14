class AppConstants {
  AppConstants._();

  static const String appName = 'LankaServe';
  static const Duration splashDuration = Duration(milliseconds: 300);

  // Override one URL:
  // flutter run --dart-define=API_BASE_URL=http://<host>:5000
  //
  // Or provide multiple candidates in priority order:
  // flutter run --dart-define=API_BASE_URLS=http://host1:5000,http://host2:5000
  //
  // Defaults cover common local-dev cases.
  static const String _apiBaseUrlOverride = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: '',
  );
  static const String _apiBaseUrlsOverride = String.fromEnvironment(
    'API_BASE_URLS',
    defaultValue: '',
  );

  static final List<String> apiBaseUrlCandidates = _buildApiBaseUrlCandidates();
  static String get apiBaseUrl => apiBaseUrlCandidates.first;

  static String normalizeUrl(String? url) {
    if (url == null || url.trim().isEmpty) return '';
    final trimmed = url.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    final host = apiBaseUrl;
    if (trimmed.startsWith('/')) {
      return '$host$trimmed';
    }
    return '$host/$trimmed';
  }

  static const String apiPrefix = String.fromEnvironment(
    'API_PREFIX',
    defaultValue: '/api',
  );

  static const int apiTimeoutSeconds = int.fromEnvironment(
    'API_TIMEOUT_SECONDS',
    defaultValue: 15,
  );

  static List<String> _buildApiBaseUrlCandidates() {
    final candidates = <String>[];
    final seen = <String>{};

    void addCandidate(String raw) {
      final value = raw.trim();
      if (value.isEmpty) return;
      final normalized = value.endsWith('/')
          ? value.substring(0, value.length - 1)
          : value;
      if (!normalized.startsWith('http://') &&
          !normalized.startsWith('https://')) {
        return;
      }
      if (seen.add(normalized)) {
        candidates.add(normalized);
      }
    }

    addCandidate(_apiBaseUrlOverride);
    for (final raw in _apiBaseUrlsOverride.split(',')) {
      addCandidate(raw);
    }

    // Production default for mobile builds when no --dart-define is provided.
    addCandidate('https://lanka-serve.vercel.app');

    // Local development fallbacks.
    addCandidate('http://127.0.0.1:5000');
    addCandidate('http://10.0.2.2:5000');
    addCandidate('http://localhost:5000');

    return List.unmodifiable(candidates);
  }
}
