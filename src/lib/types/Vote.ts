// PATH: src/lib/types/Vote.ts

export type VoteType = 'up' | 'stay' | 'down';

export interface Vote {
  id: string;
  class_id: string;
  voter_id: string;
  voter_name: string;
  date: string;
  type: VoteType;
  shadow_banned: boolean;
}

export type DayResult = 'up' | 'stay' | 'down' | null;

export interface Day {
  id: string;
  class_id: string;
  date: string;
  votes: Vote[];
  result: DayResult;
}