import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../config/constants.dart';

class ApiException implements Exception {
  ApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => 'ApiException($statusCode): $message';
}

class ApiService {
  factory ApiService({http.Client? client}) {
    _instance ??= ApiService._internal(client: client);
    return _instance!;
  }

  ApiService._internal({http.Client? client})
    : _client = client ?? http.Client();

  static ApiService? _instance;

  final http.Client _client;
  String? _accessToken;
  String _activeBaseUrl = AppConstants.apiBaseUrl;

  Uri _uri(String baseUrl, String endpoint, [Map<String, dynamic>? query]) {
    final base = '$baseUrl${AppConstants.apiPrefix}$endpoint';
    return Uri.parse(
      base,
    ).replace(queryParameters: query?.map((k, v) => MapEntry(k, v.toString())));
  }

  void setAccessToken(String? token) {
    _accessToken = token;
  }

  String? get accessToken => _accessToken;

  Map<String, String> _headers({Map<String, String>? extra}) {
    final headers = <String, String>{'Content-Type': 'application/json'};
    if (_accessToken != null && _accessToken!.isNotEmpty) {
      headers['Authorization'] = 'Bearer $_accessToken';
    }
    if (extra != null) headers.addAll(extra);
    return headers;
  }

  Future<Map<String, dynamic>> get(
    String endpoint, {
    Map<String, dynamic>? query,
  }) async {
    final response = await _send(
      endpoint,
      (baseUrl) =>
          _client.get(_uri(baseUrl, endpoint, query), headers: _headers()),
    );
    return _decode(response);
  }

  Future<Map<String, dynamic>> post(
    String endpoint, {
    Map<String, dynamic>? body,
  }) async {
    final response = await _send(
      endpoint,
      (baseUrl) => _client.post(
        _uri(baseUrl, endpoint),
        headers: _headers(),
        body: jsonEncode(body ?? <String, dynamic>{}),
      ),
    );
    return _decode(response);
  }

  Future<Map<String, dynamic>> put(
    String endpoint, {
    Map<String, dynamic>? body,
  }) async {
    final response = await _send(
      endpoint,
      (baseUrl) => _client.put(
        _uri(baseUrl, endpoint),
        headers: _headers(),
        body: jsonEncode(body ?? <String, dynamic>{}),
      ),
    );
    return _decode(response);
  }

  Future<Map<String, dynamic>> delete(String endpoint) async {
    final response = await _send(
      endpoint,
      (baseUrl) => _client.delete(_uri(baseUrl, endpoint), headers: _headers()),
    );
    return _decode(response);
  }

  Future<Map<String, dynamic>> postMultipart(
    String endpoint, {
    required File file,
    String fieldName = 'image',
    Map<String, String>? fields,
  }) async {
    final response = await _sendMultipart(
      endpoint,
      file: file,
      fieldName: fieldName,
      fields: fields,
    );
    return _decode(response);
  }

  Iterable<String> _prioritizedBaseUrls() sync* {
    yield _activeBaseUrl;
    for (final baseUrl in AppConstants.apiBaseUrlCandidates) {
      if (baseUrl != _activeBaseUrl) {
        yield baseUrl;
      }
    }
  }

  Future<http.Response> _send(
    String endpoint,
    Future<http.Response> Function(String baseUrl) request,
  ) async {
    ApiException? lastError;
    final triedBaseUrls = <String>[];

    for (final baseUrl in _prioritizedBaseUrls()) {
      triedBaseUrls.add(baseUrl);

      try {
        final response = await request(
          baseUrl,
        ).timeout(Duration(seconds: AppConstants.apiTimeoutSeconds));
        _activeBaseUrl = baseUrl;
        return response;
      } on TimeoutException {
        lastError = ApiException(
          'Request timed out after ${AppConstants.apiTimeoutSeconds}s for '
          '$baseUrl${AppConstants.apiPrefix}$endpoint',
        );
      } on SocketException catch (e) {
        lastError = ApiException(
          'Cannot connect to backend ($baseUrl${AppConstants.apiPrefix}$endpoint): ${e.message}',
        );
      } on http.ClientException catch (e) {
        lastError = ApiException(
          'HTTP client error for $baseUrl${AppConstants.apiPrefix}$endpoint: ${e.message}',
        );
      }
    }

    final tried = triedBaseUrls.join(', ');
    if (lastError != null) {
      throw ApiException('${lastError.message}. Tried base URLs: $tried');
    }

    throw ApiException('Cannot connect to backend. Tried base URLs: $tried');
  }

  Future<http.Response> _sendMultipart(
    String endpoint, {
    required File file,
    required String fieldName,
    Map<String, String>? fields,
  }) async {
    ApiException? lastError;
    final triedBaseUrls = <String>[];

    for (final baseUrl in _prioritizedBaseUrls()) {
      triedBaseUrls.add(baseUrl);

      try {
        final request = http.MultipartRequest('POST', _uri(baseUrl, endpoint));
        if (_accessToken != null && _accessToken!.isNotEmpty) {
          request.headers['Authorization'] = 'Bearer $_accessToken';
        }
        if (fields != null && fields.isNotEmpty) {
          request.fields.addAll(fields);
        }
        request.files.add(
          await http.MultipartFile.fromPath(fieldName, file.path),
        );

        final streamed = await request.send().timeout(
          Duration(seconds: AppConstants.apiTimeoutSeconds),
        );
        final response = await http.Response.fromStream(streamed);
        _activeBaseUrl = baseUrl;
        return response;
      } on TimeoutException {
        lastError = ApiException(
          'Request timed out after ${AppConstants.apiTimeoutSeconds}s for '
          '$baseUrl${AppConstants.apiPrefix}$endpoint',
        );
      } on SocketException catch (e) {
        lastError = ApiException(
          'Cannot connect to backend ($baseUrl${AppConstants.apiPrefix}$endpoint): ${e.message}',
        );
      } on http.ClientException catch (e) {
        lastError = ApiException(
          'HTTP client error for $baseUrl${AppConstants.apiPrefix}$endpoint: ${e.message}',
        );
      }
    }

    final tried = triedBaseUrls.join(', ');
    if (lastError != null) {
      throw ApiException('${lastError.message}. Tried base URLs: $tried');
    }

    throw ApiException('Cannot connect to backend. Tried base URLs: $tried');
  }

  Map<String, dynamic> _decode(http.Response response) {
    final dynamic payload = response.body.isEmpty
        ? <String, dynamic>{}
        : jsonDecode(response.body);
    if (payload is! Map<String, dynamic>) {
      throw ApiException(
        'Unexpected API response format',
        statusCode: response.statusCode,
      );
    }
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return payload;
    }
    throw ApiException(
      payload['message']?.toString() ?? 'Request failed',
      statusCode: response.statusCode,
    );
  }
}
