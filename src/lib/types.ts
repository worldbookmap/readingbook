export type RelationshipType =
  | "친구"
  | "부부"
  | "커플"
  | "자식"
  | "사업"
  | "기타";

export type CharacterNode = {
  id: string;
  name: string;
  title: string;
  summary: string;
  majorActions: string[];
  x: number;
  y: number;
  color: string;
};

export type CharacterRelationship = {
  id: string;
  fromId: string;
  toId: string;
  type: RelationshipType;
  label?: string;
};

export type CharacterSeed = {
  nodes: CharacterNode[];
  relationships: CharacterRelationship[];
};

export type CharacterMapEntry = {
  id: string;
  title: string;
  titleKo?: string;
  author?: string;
  seed: CharacterSeed;
};

export type CharacterMapLibrary = {
  works: CharacterMapEntry[];
};

export type TimelineRegion = string;

export type TimelineCard = {
  id: string;
  region: TimelineRegion;
  year: number;
  yearLabel: string;
  title: string;
  description: string;
  tags: string[];
  order?: number;
};