import 'package:flutter/material.dart';

import '../screens/auth/login_screen.dart';
import '../screens/auth/register_screen.dart';
import '../screens/common/chat_conversation_screen.dart';
import '../screens/common/chat_screen.dart';
import '../screens/common/help_center_screen.dart';
import '../screens/common/notifications_screen.dart';
import '../screens/common/profile_screen.dart';
import '../screens/customer/customer_dashboard.dart';
import '../screens/customer/heatmap_screen.dart';
import '../screens/customer/job_status_screen.dart';
import '../screens/customer/post_job_screen.dart';
import '../screens/customer/provider_list_screen.dart';
import '../screens/customer/provider_profile_screen.dart';
import '../screens/customer/customer_qr_scan_screen.dart';
import '../screens/customer/review_screen.dart';
import '../screens/provider/accepted_jobs_screen.dart';
import '../screens/provider/earnings_screen.dart';
import '../screens/provider/job_requests_screen.dart';
import '../screens/provider/provider_dashboard.dart';
import '../screens/provider/provider_badges_screen.dart';
import '../screens/provider/provider_profile_edit.dart';
import '../screens/provider/qr_display_screen.dart';
import '../screens/splash/splash_screen.dart';

class AppRoutes {
  AppRoutes._();

  static const String splash = '/';
  static const String login = '/login';
  static const String register = '/register';

  static const String chat = '/chat';
  static const String chatConversation = '/chat/conversation';
  static const String notifications = '/notifications';
  static const String profile = '/profile';
  static const String helpCenter = '/help-center';

  static const String customerDashboard = '/customer/dashboard';
  static const String postJob = '/customer/post-job';
  static const String providerList = '/customer/providers';
  static const String providerProfile = '/customer/provider-profile';
  static const String jobStatus = '/customer/job-status';
  static const String review = '/customer/review';
  static const String heatmap = '/customer/heatmap';
  static const String customerQrScan = '/customer/qr-scan';

  static const String providerDashboard = '/provider/dashboard';
  static const String jobRequests = '/provider/job-requests';
  static const String acceptedJobs = '/provider/accepted-jobs';
  static const String qrDisplay = '/provider/qr';
  static const String earnings = '/provider/earnings';
  static const String providerProfileEdit = '/provider/profile-edit';
  static const String providerBadges = '/provider/badges';

  static Map<String, WidgetBuilder> get routes => {
    splash: (_) => const SplashScreen(),
    login: (_) => const LoginScreen(),
    register: (_) => const RegisterScreen(),
    chat: (_) => const ChatScreen(),
    chatConversation: (_) => const ChatConversationScreen(),
    helpCenter: (_) => const HelpCenterScreen(),
    notifications: (_) => const NotificationsScreen(),
    profile: (_) => const ProfileScreen(),
    customerDashboard: (_) => const CustomerDashboard(),
    postJob: (_) => const PostJobScreen(),
    providerList: (_) => const ProviderListScreen(),
    providerProfile: (_) => const ProviderProfileScreen(),
    jobStatus: (_) => const JobStatusScreen(),
    review: (_) => const ReviewScreen(),
    heatmap: (_) => const HeatmapScreen(),
    customerQrScan: (_) => const CustomerQrScanScreen(),
    providerDashboard: (_) => const ProviderDashboard(),
    jobRequests: (_) => const JobRequestsScreen(),
    acceptedJobs: (_) => const AcceptedJobsScreen(),
    qrDisplay: (_) => const QrDisplayScreen(),
    earnings: (_) => const EarningsScreen(),
    providerProfileEdit: (_) => const ProviderProfileEdit(),
    providerBadges: (_) => const ProviderBadgesScreen(),
  };
}
