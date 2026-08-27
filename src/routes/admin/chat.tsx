import { createFileRoute } from '@tanstack/react-router';
import { Messenger } from '@/components/messaging/Messenger';

export const Route = createFileRoute('/admin/chat')({
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
