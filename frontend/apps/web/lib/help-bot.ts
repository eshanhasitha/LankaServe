const ROLE_BASE_ROUTES = {
  customer: {
    dashboard: '/customer/dashboard',
    postService: '/customer/post-service',
    findProviders: '/customer/find-providers',
    myJobs: '/customer/my-jobs',
    messages: '/customer/messages',
    notifications: '/customer/notifications',
    settings: '/customer/settings',
    helpCenter: '/customer/help-center',
  },
  provider: {
    dashboard: '/provider/dashboard',
    browseJobs: '/provider/browse-jobs',
    jobRequests: '/provider/job-requests',
    myJobs: '/provider/my-jobs',
    earnings: '/provider/earnings',
    messages: '/provider/messages',
    notifications: '/provider/notifications',
    settings: '/provider/settings',
    helpCenter: '/provider/help-center',
  },
};

function normalizeRole(role) {
  return role === 'provider' ? 'provider' : 'customer';
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function containsAny(text, keywords) {
  return keywords.some((keyword) => {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    const pattern = new RegExp(`\\b${escaped}\\b`);
    return pattern.test(text);
  });
}

function action(label, path) {
  return { label, path };
}

function baseActions(role) {
  const routes = ROLE_BASE_ROUTES[normalizeRole(role)];
  return [
    action('Open Help Center', routes.helpCenter),
    action('Open Settings', routes.settings),
  ];
}

function resolveIntent(text, role) {
  const safeRole = normalizeRole(role);
  const routes = ROLE_BASE_ROUTES[safeRole];
  const providerRoutes = ROLE_BASE_ROUTES.provider;
  const customerRoutes = ROLE_BASE_ROUTES.customer;

  if (!text) {
    return {
      answer: 'Tell me what you need help with. Example: "payment issue", "cancel job", or "verification".',
      actions: baseActions(safeRole),
    };
  }

  if (containsAny(text, ['thank you', 'thanks', 'thank'])) {
    return {
      answer: 'Glad to help. If you need anything else, ask another question and I will route you to the right place.',
      actions: baseActions(safeRole),
    };
  }

  if (containsAny(text, ['hello', 'hi', 'hey', 'good morning', 'good evening'])) {
    return {
      answer: 'I can quickly help with payments, verification, cancellations, disputes, and account settings.',
      actions: [
        action('Help Center', routes.helpCenter),
        action(
          safeRole === 'provider' ? 'Browse Jobs' : 'Post a Service',
          safeRole === 'provider' ? providerRoutes.browseJobs : customerRoutes.postService
        ),
      ],
    };
  }

  if (containsAny(text, ['verification', 'verified', 'verify', 'qr', 'scan'])) {
    return {
      answer: 'Verification starts at the job location using QR confirmation. Keep your profile details up to date to avoid verification delays.',
      actions: [
        action('Open My Jobs', routes.myJobs),
        action('Profile Settings', routes.settings),
      ],
    };
  }

  if (containsAny(text, ['payment', 'payments', 'paid', 'payout', 'payouts', 'earning', 'earnings', 'refund', 'refunds', 'invoice', 'invoices', 'release'])) {
    if (safeRole === 'provider') {
      return {
        answer: 'Provider payouts are processed after job completion is confirmed. You can monitor payout status from the earnings section.',
        actions: [
          action('View Earnings', providerRoutes.earnings),
          action('Open My Jobs', routes.myJobs),
        ],
      };
    }

    return {
      answer: 'Customer payments are released after job completion confirmation. If there is a mismatch, include the job ID in your support ticket.',
      actions: [
        action('Open My Jobs', routes.myJobs),
        action('Open Notifications', routes.notifications),
      ],
    };
  }

  if (containsAny(text, ['cancel', 'cancelled', 'cancellation', 'reschedule', 'rescheduled', 'rescheduling'])) {
    return {
      answer: 'Cancellations depend on the current job status and policy. Open the job first, then review available actions before confirming.',
      actions: [
        action('Open My Jobs', routes.myJobs),
        action('Contact Support', routes.helpCenter),
      ],
    };
  }

  if (containsAny(text, ['dispute', 'disputes', 'problem', 'problems', 'issue', 'issues', 'fraud', 'scam', 'complaint', 'complaints'])) {
    return {
      answer: 'For disputes, submit a support ticket with the job ID, timeline, chat evidence, and attachments. This helps faster resolution.',
      actions: [
        action('Open My Jobs', routes.myJobs),
        action('Go to Help Center', routes.helpCenter),
      ],
    };
  }

  if (containsAny(text, ['password', 'passwords', 'login', 'log in', 'sign in', 'account', 'accounts', 'security', 'profile'])) {
    return {
      answer: 'Most account and security changes are handled in Settings. Keep your email, phone, and password updated for secure access.',
      actions: [
        action('Open Settings', routes.settings),
        action('Open Notifications', routes.notifications),
      ],
    };
  }

  if (containsAny(text, ['message', 'messages', 'chat', 'chats', 'notification', 'notifications', 'alert', 'alerts', 'inbox'])) {
    return {
      answer: 'Use Messages for direct communication and Notifications for system updates. Check both if you are waiting on job updates.',
      actions: [
        action('Open Messages', routes.messages),
        action('Open Notifications', routes.notifications),
      ],
    };
  }

  if (safeRole === 'provider' && containsAny(text, ['job request', 'job requests', 'request', 'requests', 'browse', 'new job', 'new jobs'])) {
    return {
      answer: 'You can browse new opportunities and manage incoming requests from the provider workspace.',
      actions: [
        action('Browse Jobs', providerRoutes.browseJobs),
        action('Job Requests', providerRoutes.jobRequests),
      ],
    };
  }

  if (safeRole === 'customer' && containsAny(text, ['post service', 'post a service', 'find provider', 'find providers', 'search provider', 'search providers', 'book', 'booking'])) {
    return {
      answer: 'Create a clear service request with budget and timeline, then compare providers before confirming the booking.',
      actions: [
        action('Post a Service', customerRoutes.postService),
        action('Find Providers', customerRoutes.findProviders),
      ],
    };
  }

  if (containsAny(text, ['human', 'agent', 'agents', 'support team', 'support', 'ticket', 'tickets', 'representative'])) {
    return {
      answer: 'Use the Contact Support form on this page to create a ticket. Include your job ID and key details so the team can respond quickly.',
      actions: [
        action('Go to Help Center', routes.helpCenter),
        action('Open My Jobs', routes.myJobs),
      ],
    };
  }

  return {
    answer: 'I did not fully understand that. Try asking about payments, verification, cancellations, account access, or dispute support.',
    actions: baseActions(safeRole),
  };
}

export function getQuickPrompts(role) {
  const safeRole = normalizeRole(role);

  if (safeRole === 'provider') {
    return [
      'How do payouts work?',
      'How can I handle a dispute?',
      'Where can I see job requests?',
      'How do I update account security?',
    ];
  }

  return [
    'How does payment release work?',
    'How do I cancel a job request?',
    'How does verification work?',
    'How can I contact support?',
  ];
}

export function getHelpBotReply({ message, role }) {
  const normalizedText = normalizeText(message);
  return resolveIntent(normalizedText, role);
}
