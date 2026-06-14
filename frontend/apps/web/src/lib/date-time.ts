const minuteMs = 60 * 1000;
const hourMs = 60 * minuteMs;
const dayMs = 24 * hourMs;

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function formatRelativeTime(value: unknown) {
  if (!value) return 'Just now';

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return 'Just now';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < minuteMs) return 'Just now';

  if (diffMs < hourMs) {
    const minutes = Math.floor(diffMs / minuteMs);
    return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
  }

  const dayDiff = Math.floor(
    (startOfLocalDay(now).getTime() - startOfLocalDay(date).getTime()) / dayMs
  );

  if (dayDiff <= 0) {
    const hours = Math.floor(diffMs / hourMs);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }

  if (dayDiff === 1) return 'Yesterday';
  if (dayDiff < 7) return `${dayDiff} days ago`;

  const weeks = Math.floor(dayDiff / 7);
  if (dayDiff < 30) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  });
}

export function formatNotificationReceivedLabel(value: unknown) {
  if (!value) return 'Just now';

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return 'Just now';

  const now = new Date();
  const sameDay = startOfLocalDay(now).getTime() === startOfLocalDay(date).getTime();
  const time = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  if (sameDay) return `Today, ${time}`;

  const dateText = date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  });

  return `${dateText}, ${time}`;
}
