import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format, isToday } from 'date-fns';
import { Send, Plus, Users, Search, Hash, MessageSquare, Loader2, Star } from 'lucide-react';
import { useServerFn } from '@tanstack/react-start';
import { getStaffProfiles } from '@/lib/users.functions';
import { Textarea } from '@/components/ui/textarea';

type Profile = { id: string; full_name: string | null; email: string };
type Conversation = {
  id: string;
  title: string | null;
  type: string;
  last_message_at: string;
  created_by: string | null;
};
type Message = {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  body: string;
  created_at: string;
  type: string;
};

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('');
}

export function Messenger({
  heading,
  subheading,
  staffOnlyPicker = false,
}: {
  heading: string;
  subheading: string;
  // When true, the "new conversation" member picker only offers staff
  // accounts - used on the client dashboard so clients can't see or
  // message other clients' profiles.
  staffOnlyPicker?: boolean;
}) {
  const queryClient = useQueryClient();
  const fetchStaffProfiles = useServerFn(getStaffProfiles);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [newOpen, setNewOpen] = useState(false);
  const [groupTitle, setGroupTitle] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const [testimonialConvoId, setTestimonialConvoId] = useState<string | null>(null);
  const [testimonialForm, setTestimonialForm] = useState({ name: '', role: '', company: '', rating: 5, content: '' });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const { data: conversations = [], isLoading: loadingConvos } = useQuery({
    queryKey: ['conversations'],
    queryFn: async (): Promise<Conversation[]> => {
      const { data, error } = await supabase
        .from('conversations')
        .select('id, title, type, last_message_at, created_by')
        .order('last_message_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Conversation[];
    },
  });

  const { data: participants = [] } = useQuery({
    queryKey: ['conversation-participants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversation_participants')
        .select('conversation_id, user_id, role');
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['messenger-profiles'],
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase.from('profiles').select('id, full_name, email');
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
  });

  const { data: staffProfiles = [] } = useQuery({
    queryKey: ['messenger-staff-profiles'],
    queryFn: async (): Promise<Profile[]> => (await fetchStaffProfiles()) as Profile[],
    enabled: staffOnlyPicker,
  });

  const pickerProfiles = staffOnlyPicker ? staffProfiles : profiles;

  const profileMap = useMemo(() => {
    const map: Record<string, Profile> = {};
    for (const p of profiles) map[p.id] = p;
    return map;
  }, [profiles]);

  const displayName = (id: string | null) => {
    if (!id) return 'System';
    const p = profileMap[id];
    return p?.full_name || p?.email || 'Unknown user';
  };

  const conversationLabel = (c: Conversation) => {
    if (c.title && c.type !== 'direct') return c.title;
    const others = participants
      .filter((p: any) => p.conversation_id === c.id && p.user_id !== userId)
      .map((p: any) => displayName(p.user_id));
    return others.length ? others.join(', ') : c.title || 'Conversation';
  };

  useEffect(() => {
    if (!activeId && conversations.length) setActiveId(conversations[0]!.id);
  }, [conversations, activeId]);

  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ['messages', activeId],
    enabled: !!activeId,
    queryFn: async (): Promise<Message[]> => {
      const { data, error } = await supabase
        .from('messages')
        .select('id, conversation_id, sender_id, body, created_at, type')
        .eq('conversation_id', activeId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Message[];
    },
  });

  // Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('messenger-stream')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: any) => {
        queryClient.invalidateQueries({ queryKey: ['messages', payload.new.conversation_id] });
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeId]);

  const sendMutation = useMutation({
    mutationFn: async (body: string) => {
      if (!activeId || !userId) throw new Error('No active conversation');
      const { error } = await supabase
        .from('messages')
        .insert({ conversation_id: activeId, sender_id: userId, body } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      setDraft('');
      queryClient.invalidateQueries({ queryKey: ['messages', activeId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openTestimonialDialog = async (conversationId: string) => {
    let prefillName = '';
    if (userId) {
      const { data } = await supabase.from('profiles').select('full_name').eq('id', userId).maybeSingle();
      prefillName = data?.full_name ?? '';
    }
    setTestimonialForm({ name: prefillName, role: '', company: '', rating: 5, content: '' });
    setTestimonialConvoId(conversationId);
  };

  const submitTestimonialMutation = useMutation({
    mutationFn: async () => {
      if (!userId || !testimonialConvoId) throw new Error('Not signed in');
      if (!testimonialForm.name.trim() || !testimonialForm.content.trim()) {
        throw new Error('Please add your name and a testimonial');
      }
      const { error } = await supabase.from('testimonials').insert({
        user_id: userId,
        name: testimonialForm.name.trim(),
        role: testimonialForm.role.trim() || null,
        company: testimonialForm.company.trim() || null,
        rating: testimonialForm.rating,
        content: testimonialForm.content.trim(),
        source: 'client_request',
        status: 'pending',
      } as any);
      if (error) throw error;

      // Closes the loop back in the same thread so the staff member who
      // asked can see it was answered without switching pages.
      await supabase.from('messages').insert({
        conversation_id: testimonialConvoId,
        sender_id: userId,
        body: '✅ Testimonial submitted — thank you!',
      } as any);
    },
    onSuccess: () => {
      toast.success('Testimonial submitted! It will appear after review.');
      queryClient.invalidateQueries({ queryKey: ['messages', testimonialConvoId] });
      setTestimonialConvoId(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('Not signed in');
      if (!selected.length) throw new Error('Pick at least one person');
      const isGroup = selected.length > 1 || !!groupTitle.trim();
      const { data: convo, error } = await supabase
        .from('conversations')
        .insert({
          title: groupTitle.trim() || null,
          type: isGroup ? 'group' : 'direct',
          created_by: userId,
        } as any)
        .select('id')
        .single();
      if (error) throw error;

      const rows = [
        { conversation_id: convo.id, user_id: userId, role: 'owner' },
        ...selected.map((id) => ({ conversation_id: convo.id, user_id: id, role: 'member' })),
      ];
      const { error: pErr } = await supabase.from('conversation_participants').insert(rows as any);
      if (pErr) throw pErr;
      return convo.id as string;
    },
    onSuccess: (id) => {
      toast.success('Conversation created');
      setNewOpen(false);
      setGroupTitle('');
      setSelected([]);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversation-participants'] });
      setActiveId(id);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = conversations.filter((c) =>
    conversationLabel(c).toLowerCase().includes(search.toLowerCase())
  );

  const active = conversations.find((c) => c.id === activeId) || null;
  const activeMembers = participants.filter((p: any) => p.conversation_id === activeId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{heading}</h2>
          <p className="text-muted-foreground">{subheading}</p>
        </div>
        <Dialog open={newOpen} onOpenChange={setNewOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> New conversation
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start a conversation</DialogTitle>
              <DialogDescription>
                Pick one person for a direct chat, or several people to create a group channel.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Group name (optional)</Label>
                <Input
                  placeholder="e.g. Website Redesign"
                  value={groupTitle}
                  onChange={(e) => setGroupTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Members</Label>
                <ScrollArea className="h-56 rounded-md border">
                  <div className="divide-y">
                    {pickerProfiles
                      .filter((p) => p.id !== userId)
                      .map((p) => (
                        <label
                          key={p.id}
                          className="flex cursor-pointer items-center gap-3 p-3 hover:bg-muted/50"
                        >
                          <Checkbox
                            checked={selected.includes(p.id)}
                            onCheckedChange={(checked) =>
                              setSelected((prev) =>
                                checked ? [...prev, p.id] : prev.filter((id) => id !== p.id)
                              )
                            }
                          />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">
                              {p.full_name || p.email}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">{p.email}</div>
                          </div>
                        </label>
                      ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !selected.length}
              >
                {createMutation.isPending ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid h-[640px] grid-cols-12 overflow-hidden rounded-xl border bg-card shadow-sm">
        {/* Sidebar */}
        <div className="col-span-12 flex flex-col border-r bg-muted/10 md:col-span-4 lg:col-span-3">
          <div className="border-b p-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="h-9 pl-8"
                placeholder="Search conversations"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="space-y-1 p-2">
              {loadingConvos ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : filtered.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  No conversations yet.
                </p>
              ) : (
                filtered.map((c) => {
                  const label = conversationLabel(c);
                  const isActive = c.id === activeId;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setActiveId(c.id)}
                      className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors ${
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'hover:bg-muted text-foreground'
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          isActive ? 'bg-primary-foreground/20' : 'bg-primary/10 text-primary'
                        }`}
                      >
                        {c.type === 'group' ? <Hash className="h-4 w-4" /> : initials(label)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{label}</div>
                        <div
                          className={`truncate text-[11px] ${
                            isActive ? 'text-primary-foreground/70' : 'text-muted-foreground'
                          }`}
                        >
                          {isToday(new Date(c.last_message_at))
                            ? format(new Date(c.last_message_at), 'p')
                            : format(new Date(c.last_message_at), 'MMM d')}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Thread */}
        <div className="col-span-12 flex flex-col md:col-span-8 lg:col-span-9">
          {!active ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground opacity-20" />
              <p className="max-w-xs text-sm text-muted-foreground">
                Select a conversation, or start a new one to begin chatting.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {active.type === 'group' ? (
                      <Hash className="h-4 w-4" />
                    ) : (
                      initials(conversationLabel(active))
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{conversationLabel(active)}</div>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Users className="h-3 w-3" /> {activeMembers.length} member
                      {activeMembers.length === 1 ? '' : 's'}
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className="capitalize">
                  {active.type}
                </Badge>
              </div>

              <ScrollArea className="flex-1 p-6">
                {loadingMessages ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    No messages yet — say hello.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {messages.map((m) => {
                      const mine = m.sender_id === userId;
                      return (
                        <div
                          key={m.id}
                          className={`flex gap-3 ${mine ? 'flex-row-reverse' : ''}`}
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold">
                            {initials(displayName(m.sender_id))}
                          </div>
                          <div className={`max-w-[70%] ${mine ? 'text-right' : ''}`}>
                            <div className="mb-1 text-[11px] text-muted-foreground">
                              {mine ? 'You' : displayName(m.sender_id)} ·{' '}
                              {format(new Date(m.created_at), 'MMM d, p')}
                            </div>
                            <div
                              className={`inline-block whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${
                                mine
                                  ? 'rounded-br-sm bg-primary text-primary-foreground'
                                  : 'rounded-bl-sm bg-muted text-foreground'
                              }`}
                            >
                              {m.body}
                            </div>
                            {m.type === 'testimonial_request' && !mine && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="mt-2 gap-1.5"
                                onClick={() => openTestimonialDialog(m.conversation_id)}
                              >
                                <Star className="h-3.5 w-3.5" /> Write a Testimonial
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={bottomRef} />
                  </div>
                )}
              </ScrollArea>

              <div className="border-t p-4">
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (draft.trim()) sendMutation.mutate(draft.trim());
                  }}
                >
                  <Input
                    placeholder="Type your message..."
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                  />
                  <Button type="submit" size="icon" disabled={!draft.trim() || sendMutation.isPending}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>

      <Dialog open={!!testimonialConvoId} onOpenChange={(open) => !open && setTestimonialConvoId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Write a Testimonial</DialogTitle>
            <DialogDescription>
              Your feedback helps others understand what it's like to work with us. It'll be reviewed before publishing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Your Name</Label>
                <Input
                  value={testimonialForm.name}
                  onChange={(e) => setTestimonialForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Rating</Label>
                <div className="flex items-center gap-1 pt-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setTestimonialForm((f) => ({ ...f, rating: n }))}
                      className="text-amber-500"
                    >
                      <Star className="h-5 w-5" fill={n <= testimonialForm.rating ? 'currentColor' : 'none'} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Role (optional)</Label>
                <Input
                  placeholder="e.g. CEO"
                  value={testimonialForm.role}
                  onChange={(e) => setTestimonialForm((f) => ({ ...f, role: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Company (optional)</Label>
                <Input
                  value={testimonialForm.company}
                  onChange={(e) => setTestimonialForm((f) => ({ ...f, company: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Your Testimonial</Label>
              <Textarea
                placeholder="Share your experience..."
                className="min-h-[120px]"
                value={testimonialForm.content}
                onChange={(e) => setTestimonialForm((f) => ({ ...f, content: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => submitTestimonialMutation.mutate()}
              disabled={submitTestimonialMutation.isPending}
            >
              {submitTestimonialMutation.isPending ? 'Submitting...' : 'Submit Testimonial'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
