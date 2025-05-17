/**
 * artifact.ts
 * TypeScript definitions related to Artifacts (v10.6)
 */

export enum ArtifactRelationType {
  Related = 'related',
  InspiredBy = 'inspired-by',
  Supporting = 'supporting',
  Refuting = 'refuting',
  Origin = 'originated-from',
  Contains = 'contains',
}

export interface ArtifactRelation {
  targetId: string; // ID of the other artifact
  type: ArtifactRelationType;
  notes?: string; // Optional description of the relationship
}

export interface ArtifactOrigin {
  contextKey: string;
  originId?: string;
  highlightedText?: string;
}

export interface ArtifactMetadata {
  origin?: ArtifactOrigin;
  agentId?: string;
  relations?: ArtifactRelation[]; // v10.6: Typed relations
  worldPosition?: { x: number; y: number; z: number };
  // Additional metadata fields can be added here
  [key: string]: any;
}

export type ArtifactContent =
  | string
  | { url: string; type: 'image' | 'video' | 'audio'; description?: string }
  | { objectId: string; name?: string; sceneId?: string; type: 'world-link' }
  | { objectIds: string[]; type: 'world-group' }
  | any; // Allow custom structured content (JSON)

export interface Artifact {
  id: string;
  userId: string;
  name: string;
  type: string;
  content: ArtifactContent;
  tags: string[];
  metadata: ArtifactMetadata;
  createdAt: string;
  updatedAt: string;
  status?: 'draft' | 'published' | 'archived';
}