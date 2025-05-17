/**
 * RelatedArtifactsLinker.tsx
 * Component for linking artifacts with typed relationships (v10.6 spec)
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Artifact, ArtifactRelationType, ArtifactRelation } from '@/types/artifact';
import { useMemoryStore } from '@/lib/state/store';
import { Badge } from '@/components/ui/Badge';
import { debounce } from 'lodash'; // Or create your own debounce utility

// Map of relation types to human-readable descriptions
const RELATION_TYPE_LABELS: Record<ArtifactRelationType, string> = {
  [ArtifactRelationType.Related]: 'Related to',
  [ArtifactRelationType.InspiredBy]: 'Inspired by',
  [ArtifactRelationType.Supporting]: 'Supported by',
  [ArtifactRelationType.Refuting]: 'Refuting',
  [ArtifactRelationType.Origin]: 'Originated from',
  [ArtifactRelationType.Contains]: 'Contains'
};

// Map of relation types to badge variants
const RELATION_TYPE_VARIANTS: Record<ArtifactRelationType, string> = {
  [ArtifactRelationType.Related]: 'default',
  [ArtifactRelationType.InspiredBy]: 'secondary',
  [ArtifactRelationType.Supporting]: 'success',
  [ArtifactRelationType.Refuting]: 'destructive',
  [ArtifactRelationType.Origin]: 'outline',
  [ArtifactRelationType.Contains]: 'info'
};

interface RelatedArtifactsLinkerProps {
  selectedRelations: ArtifactRelation[];
  onRelationChange: (relations: ArtifactRelation[]) => void;
  excludeArtifactIds?: string[];
  onFeedback?: (message: string) => void;
}

/**
 * Component that allows users to search for and link artifacts with typed relationships
 */
export const RelatedArtifactsLinker: React.FC<RelatedArtifactsLinkerProps> = ({
  selectedRelations = [],
  onRelationChange,
  excludeArtifactIds = [],
  onFeedback
}) => {
  // Local state for search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Artifact[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addedArtifactId, setAddedArtifactId] = useState<string | null>(null);
  
  // Local state for relation type selection
  const [selectedRelationType, setSelectedRelationType] = useState<ArtifactRelationType>(ArtifactRelationType.Related);
  
  // Get artifacts from store
  const { getArtifacts, searchArtifacts } = useMemoryStore(state => ({
    getArtifacts: state.getArtifacts || (() => []),
    searchArtifacts: state.searchArtifacts || ((query: string) => Promise.resolve([]))
  }));
  
  // Create a set of excluded artifact IDs for efficient lookup
  const excludedIds = useMemo(() => new Set([
    ...excludeArtifactIds,
    ...selectedRelations.map(rel => rel.targetId)
  ]), [excludeArtifactIds, selectedRelations]);
  
  // Create debounced search function
  const debouncedSearch = useMemo(() => 
    debounce(async (query: string) => {
      if (query.length < 2) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }
      
      try {
        const results = await searchArtifacts(query);
        
        // Filter out excluded artifacts
        const filteredResults = results.filter(artifact => !excludedIds.has(artifact.id));
        
        setSearchResults(filteredResults);
      } catch (error) {
        console.error('Error searching artifacts:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300), 
    [searchArtifacts, excludedIds]
  );
  
  // Handle search input change
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    debouncedSearch(searchQuery);
    
    // Cleanup
    return () => {
      debouncedSearch.cancel();
    };
  }, [searchQuery, debouncedSearch]);
  
  // Add a relation
  const handleAddRelation = useCallback((artifact: Artifact) => {
    // Guard against double adds
    if (selectedRelations.some(rel => rel.targetId === artifact.id)) {
      onFeedback?.('This artifact is already linked');
      return;
    }
    
    const newRelation: ArtifactRelation = {
      targetId: artifact.id,
      type: selectedRelationType
    };
    
    onRelationChange([...selectedRelations, newRelation]);
    
    // Show feedback
    setAddedArtifactId(artifact.id);
    onFeedback?.(`"${artifact.name}" linked as ${RELATION_TYPE_LABELS[selectedRelationType]}`);
    
    // Clear feedback after a delay
    setTimeout(() => {
      setAddedArtifactId(null);
    }, 2000);
  }, [selectedRelations, selectedRelationType, onRelationChange, onFeedback]);
  
  // Remove a relation
  const handleRemoveRelation = useCallback((targetId: string) => {
    const updatedRelations = selectedRelations.filter(rel => rel.targetId !== targetId);
    onRelationChange(updatedRelations);
    
    // Show feedback
    const artifact = getArtifactById(targetId);
    onFeedback?.(`Removed link to "${artifact?.name || 'artifact'}"`);
  }, [selectedRelations, onRelationChange, onFeedback, getArtifactById]);
  
  // Get artifact details by ID (for rendering selected relations)
  const getArtifactById = useCallback((id: string): Artifact | undefined => {
    return getArtifacts().find(artifact => artifact.id === id);
  }, [getArtifacts]);
  
  // Relation type selector component
  const RelationTypeSelector = React.memo(() => (
    <div className="flex flex-wrap gap-2 mb-3">
      {Object.values(ArtifactRelationType).map(type => (
        <button
          key={type}
          onClick={() => setSelectedRelationType(type)}
          className={`inline-flex items-center justify-center transition-colors ${
            selectedRelationType === type ? 'ring-2 ring-[var(--focus-ring)]' : ''
          }`}
          aria-label={`Set relation type to ${RELATION_TYPE_LABELS[type]}`}
          aria-pressed={selectedRelationType === type}
        >
          <Badge variant={RELATION_TYPE_VARIANTS[type] as any}>
            {RELATION_TYPE_LABELS[type]}
          </Badge>
        </button>
      ))}
    </div>
  ));
  
  // Search results component
  const SearchResults = React.memo(({ results }: { results: Artifact[] }) => (
    <div 
      className="max-h-48 overflow-y-auto border border-border-default rounded-md divide-y divide-border-default"
      role="list"
      aria-label="Search results"
    >
      {results.map(artifact => (
        <div
          key={artifact.id}
          className={`p-2 cursor-pointer hover:bg-bg-agent-muted relative ${
            addedArtifactId === artifact.id ? 'bg-[var(--color-success-muted)]' : ''
          }`}
          onClick={() => handleAddRelation(artifact)}
          role="listitem"
          aria-label={`Add ${artifact.name} with relation type ${RELATION_TYPE_LABELS[selectedRelationType]}`}
        >
          <div className="font-medium text-sm">{artifact.name}</div>
          <div className="text-xs text-text-muted">
            {artifact.type} • Created {new Date(artifact.createdAt).toLocaleDateString()}
          </div>
          {addedArtifactId === artifact.id && (
            <div className="absolute top-2 right-2 text-[var(--color-success)]">✓</div>
          )}
        </div>
      ))}
    </div>
  ));
  
  // Selected relations component
  const SelectedRelationsList = React.memo(() => (
    <div className="space-y-2" role="list" aria-label="Selected relations">
      {selectedRelations.map(relation => {
        const artifact = getArtifactById(relation.targetId);
        if (!artifact) return null;
        
        return (
          <div 
            key={relation.targetId} 
            className="flex items-center justify-between p-2 rounded-md bg-bg-muted"
            role="listitem"
          >
            <div className="flex items-center space-x-2">
              <Badge variant={RELATION_TYPE_VARIANTS[relation.type] as any}>
                {RELATION_TYPE_LABELS[relation.type]}
              </Badge>
              <span className="font-medium text-sm">{artifact.name}</span>
            </div>
            <button
              onClick={() => handleRemoveRelation(relation.targetId)}
              className="text-text-muted hover:text-color-error p-1 rounded-full"
              aria-label={`Remove relation to ${artifact.name}`}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  ));
  
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-text-heading">Related Artifacts</h3>
      
      {/* Relation type selector */}
      <RelationTypeSelector />
      
      {/* Display selected relations */}
      {selectedRelations.length > 0 && <SelectedRelationsList />}
      
      {/* Search interface */}
      <div className="space-y-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search artifacts to link..."
          className="w-full px-3 py-2 border border-border-default rounded-md bg-bg-surface text-sm focus:ring-1 focus:ring-agent-color-primary focus:border-agent-color-primary outline-none"
          aria-label="Search for artifacts to link"
        />
        
        {/* Search results or status */}
        {isSearching ? (
          <div className="p-2 text-center text-text-muted text-sm">
            Searching...
          </div>
        ) : searchQuery.length >= 2 && searchResults.length === 0 ? (
          <div className="p-2 text-center text-text-muted text-sm">
            No matching artifacts found
          </div>
        ) : searchResults.length > 0 ? (
          <SearchResults results={searchResults} />
        ) : null}
      </div>
    </div>
  );
};

export default RelatedArtifactsLinker;