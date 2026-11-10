"use client";

import { supabase } from "./supabase";
import { ApiError } from "./api";
import type { LocalText } from "./types";

/** RPC çağrısı (lib/api.ts'teki `call` ile aynı desen; orası dışa aktarmadığı için kopya) */
async function call<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args ?? {});
  if (error) throw new ApiError(error.message || "unknown_error");
  return data as T;
}

export interface CommunityLinks {
  x?: string;
  telegram?: string;
  website?: string;
}

export interface CommunityCard {
  id: string;
  slug: string;
  name: string;
  country: string | null;
  city: string | null;
  languages: string[];
  description: LocalText | null;
  links: CommunityLinks;
  approved: boolean;
  upcoming_count: number;
  next_meetup_at: string | null;
  created_by?: { username: string | null; display_name: string | null } | null;
}

export interface MeetupCard {
  id: string;
  title: string;
  language: string | null;
  starts_at: string;
  ends_at: string | null;
  timezone: string;
  city: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  venue: string | null;
  online: boolean;
  cancelled: boolean;
  going_count: number;
  me_going: boolean;
  community: { slug: string; name: string; country: string | null };
}

export interface CommunityDetail extends CommunityCard {
  is_organizer: boolean;
  organizers: { id: string; username: string | null; display_name: string | null }[] | null;
  upcoming: MeetupCard[];
  past: MeetupCard[];
}

export interface MeetupDetail extends Omit<MeetupCard, "community"> {
  description: string | null;
  online_url: string | null;
  room_code: string | null;
  quiz: { slug: string; title: LocalText; icon: string } | null;
  quiz_id: string | null;
  community: { id: string; slug: string; name: string; country: string | null; links: CommunityLinks; approved: boolean };
  is_organizer: boolean;
  started: boolean;
  ended: boolean;
  me: { going: boolean; attended: boolean } | null;
}

export interface Attendee {
  user_id: string;
  username: string | null;
  display_name: string | null;
  country: string | null;
  attended: boolean;
  rsvp_at: string;
}

export interface CommunityInput {
  id?: string;
  slug: string;
  name: string;
  country: string | null;
  city: string | null;
  languages: string[];
  description: LocalText | null;
  links: CommunityLinks;
}

export interface MeetupInput {
  id?: string;
  community_id?: string;
  title: string;
  description: string | null;
  language: string | null;
  starts_at: string;
  ends_at: string | null;
  timezone: string;
  city: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  venue: string | null;
  online_url: string | null;
  quiz_slug: string | null;
  room_code: string | null;
}

export const communityApi = {
  list: (o: { country?: string | null; language?: string | null } = {}) =>
    call<CommunityCard[]>("list_communities", { p_country: o.country || null, p_language: o.language || null }),
  get: (slug: string) => call<CommunityDetail | null>("get_community", { p_slug: slug }),
  mine: () => call<{ mine: CommunityCard[]; pending: CommunityCard[] }>("my_communities"),
  save: (p: CommunityInput) => call<{ id: string; slug: string; approved: boolean }>("save_community", { p }),
  setApproved: (id: string, approved: boolean) => call<void>("set_community_approved", { p_id: id, p_approved: approved }),
  addOrganizer: (id: string, username: string) => call<void>("add_community_organizer", { p_id: id, p_username: username }),
  removeOrganizer: (id: string, user: string) => call<void>("remove_community_organizer", { p_id: id, p_user: user }),

  meetups: (o: { country?: string | null; language?: string | null; community?: string | null; limit?: number } = {}) =>
    call<MeetupCard[]>("list_meetups", {
      p_country: o.country || null,
      p_language: o.language || null,
      p_community: o.community || null,
      p_limit: o.limit ?? 50,
    }),
  meetup: (id: string) => call<MeetupDetail | null>("get_meetup", { p_id: id }),
  saveMeetup: (p: MeetupInput) => call<{ id: string }>("save_meetup", { p }),
  setCancelled: (id: string, cancelled: boolean) => call<void>("set_meetup_cancelled", { p_id: id, p_cancelled: cancelled }),
  rsvp: (id: string, going: boolean) => call<{ going: boolean; going_count: number }>("rsvp_meetup", { p_id: id, p_going: going }),
  attendees: (id: string) => call<Attendee[]>("meetup_attendees", { p_id: id }),
  markAttendance: (id: string, user: string, attended: boolean) =>
    call<{ attended: boolean; awarded: number }>("mark_attendance", { p_id: id, p_user: user, p_attended: attended }),
  publicProgress: (username: string) =>
    call<{ xp: number; level: number; level_floor: number; next_level_at: number } | null>("get_public_progress", { p_username: username }),
};

/** UUID biçimi mi? (geçersiz id'yi sunucuya göndermeden yakalamak için) */
export const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
