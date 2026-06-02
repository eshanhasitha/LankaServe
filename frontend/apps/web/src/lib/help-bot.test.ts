import { describe, expect, test } from 'vitest';
import { getHelpBotReply, getQuickPrompts } from './help-bot.ts';

describe('help bot rules', () => {
  test('returns role-specific payout guidance for provider', () => {
    const reply = getHelpBotReply({ message: 'How do payouts work?', role: 'provider' });
    const actionLabels = reply.actions.map((item) => item.label);

    expect(reply.answer).toMatch(/payouts/i);
    expect(actionLabels).toContain('View Earnings');
  });

  test('returns cancellation guidance for customer', () => {
    const reply = getHelpBotReply({ message: 'Can I cancel this booking?', role: 'customer' });
    const paths = reply.actions.map((item) => item.path);

    expect(reply.answer).toMatch(/cancellations depend/i);
    expect(paths).toContain('/customer/my-jobs');
  });

  test('falls back with generic guidance when no intent matches', () => {
    const reply = getHelpBotReply({ message: 'tell me something random', role: 'customer' });

    expect(reply.answer).toMatch(/did not fully understand/i);
    expect(reply.actions).toHaveLength(2);
  });

  test('uses provider quick prompts for provider role', () => {
    const prompts = getQuickPrompts('provider');
    expect(prompts).toContain('Where can I see job requests?');
  });
});

