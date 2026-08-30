import { useState } from 'react';
import {
  Star, Heart, Check, X, ArrowRight, ArrowLeft, ChevronRight, Plus, Minus,
  Home, User, Users, Mail, Phone, MapPin, Calendar, Clock, Search, Settings,
  Bell, Bookmark, Camera, Download, Upload, Edit, Trash2, Eye, Lock, Unlock,
  Globe, Link as LinkIcon, Image as ImageIcon, File, Folder, Award, Gift,
  ShoppingCart, CreditCard, DollarSign, TrendingUp, BarChart, PieChart,
  Zap, Shield, ThumbsUp, MessageCircle, Share2, Play, Pause, Sun, Moon,
  Facebook, Twitter, Instagram, Linkedin, Github, Youtube, Twitch, Figma,
  Slack, Dribbble, Gitlab,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// A curated set rather than the full library - keeps the bundle small and
// matches the "basic" icon picker called for in the Phase 1 scope.
const ICONS: Record<string, LucideIcon> = {
  Star, Heart, Check, X, ArrowRight, ArrowLeft, ChevronRight, Plus, Minus,
  Home, User, Users, Mail, Phone, MapPin, Calendar, Clock, Search, Settings,
  Bell, Bookmark, Camera, Download, Upload, Edit, Trash2, Eye, Lock, Unlock,
  Globe, Link: LinkIcon, Image: ImageIcon, File, Folder, Award, Gift,
  ShoppingCart, CreditCard, DollarSign, TrendingUp, BarChart, PieChart,
  Zap, Shield, ThumbsUp, MessageCircle, Share2, Play, Pause, Sun, Moon,
  // Brand/social - only what Lucide itself still ships (it dropped most
  // brand glyphs some versions back in favor of a separate icon set).
  // Discord/WhatsApp/Telegram/Pinterest/Reddit/Snapchat aren't available
  // here without pulling in a second icon library.
  Facebook, Twitter, Instagram, Linkedin, Github, Youtube, Twitch, Figma,
  Slack, Dribbble, Gitlab,
};

const ICON_NAMES = Object.keys(ICONS);

export function IconControl({
  value,
  onChange,
  compact = false,
}: {
  value: string | undefined;
  onChange: (v: string) => void;
  /** Icon-only square trigger with no name label, for tight spaces like a repeater row (see IconListItemsControl) - the full-width labelled button reads as clutter once several appear stacked close together. */
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const Selected = value ? ICONS[value] : undefined;
  const filtered = ICON_NAMES.filter((n) => n.toLowerCase().includes(search.toLowerCase()));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {compact ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            title={value || 'Choose icon'}
            className="h-9 w-9 shrink-0"
          >
            {Selected ? <Selected className="h-4 w-4" /> : <Star className="h-4 w-4 text-muted-foreground" />}
          </Button>
        ) : (
          <Button type="button" variant="outline" className="h-8 w-full justify-start gap-2 text-sm">
            {Selected ? <Selected className="h-4 w-4" /> : <Star className="h-4 w-4 text-muted-foreground" />}
            {value ?? 'Choose icon'}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search icons..."
          className="mb-2 h-8 text-sm"
        />
        <div className="grid max-h-48 grid-cols-6 gap-1 overflow-y-auto">
          {filtered.map((name) => {
            const Icon = ICONS[name]!;
            return (
              <button
                key={name}
                type="button"
                title={name}
                onClick={() => {
                  onChange(name);
                  setOpen(false);
                }}
                className={`flex h-8 w-8 items-center justify-center rounded hover:bg-muted ${
                  value === name ? 'bg-primary text-primary-foreground' : ''
                }`}
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { ICONS as CURATED_ICONS };
