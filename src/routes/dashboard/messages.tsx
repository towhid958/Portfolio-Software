import { createFileRoute } from '@tanstack/react-router';
import { Messenger } from '@/components/messaging/Messenger';

export const Route = createFileRoute('/dashboard/messages')({
  component: MessagesPage,
  head: () => ({
    meta: [
      { title: 'Messages | Client Portal' },
      { name: 'description', content: 'Chat directly with the team, create group channels and keep every project conversation in one place.' },
    ],
  }),
});

function MessagesPage() {
  return (
    <Messenger
      heading="Messages"
      subheading="Real-time direct chats and group channels with the Hasan Kamrul team."
      staffOnlyPicker
    />
  );
}
