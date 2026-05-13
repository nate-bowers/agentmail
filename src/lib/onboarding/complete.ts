export async function completeOnboarding(): Promise<void> {
  await fetch('/api/user/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ has_onboarded: true }),
  });
}
