import { createFileRoute, redirect } from '@tanstack/react-router';
import { Messenger } from '@/components/messaging/Messenger';
import { resolveCan, type Role } from '@/lib/rbac';

export const Route = createFileRoute('/admin/chat')({
  beforeLoad: async ({ context }) => {
    const allowed = resolveCan(context.roles as Role[], context.dbPermissions, 'messages', 'view');
    if (!allowed) {
      throw redirect({ to: '/admin' });
    }
  },
  component: AdminChatPage,
});

function AdminChatPage() {
  return (
    <Messenger
      heading="Team Chat"
      subheading="Direct conversations and group channels with clients and staff."
    />
  );
}
