/**
 * memorySlice.ts
 * Zustand slice for managing artifacts and memory browsing with server-side search
 * Optimized for scale with Supabase, PostgreSQL, and Drizzle ORM
 */

import { StateCreator } from 'zustand';
import { Artifact, ArtifactRelation } from '@/types/artifact';
import { createSelector } from 'reselect';

// Extended artifact with UI state properties
export interface ExtendedArtifact extends Artifact {
  isPinned?: boolean;
  isFavorite?: boolean;
}

// Filter options for server-side search
export interface ArtifactFilters {
  query?: string;
  tags?: string[];
  types?: string[];
  dateRange?: { start: Date | null; end: Date | null };
  pinned?: boolean;
  favorite?: boolean;
  limit?: number;
  offset?: number;
}

// Search result interface from server
export interface SearchResult {
  artifacts: ExtendedArtifact[];
  totalCount: number;
  hasMore: boolean;
}

export interface MemorySlice {
  // State
  artifacts: Record<string, ExtendedArtifact>; // Local cache of artifacts
  artifactIds: string[]; // For preserving order/sorting
  searchResults: string[]; // IDs from the latest search
  pinnedArtifactIds: string[]; // Locally pinned artifacts
  favoriteArtifactIds: string[]; // Locally favorited artifacts
  searchQuery: string;
  selectedTags: string[];
  selectedTypes: string[];
  dateRange: { start: Date | null; end: Date | null };
  selectedArtifactId: string | null;
  isSearching: boolean;
  isLoading: boolean;
  error: string | null;
  currentPage: number; // For pagination
  totalResults: number; // Total matching results on server
  hasMoreResults: boolean; // Whether more results are available
  
  // Actions
  setSearchQuery: (query: string) => void;
  addTag: (tag: string) => void;
  removeTag: (tag: string) => void;
  clearTags: () => void;
  addType: (type: string) => void;
  removeType: (type: string) => void;
  clearTypes: () => void;
  setDateRange: (start: Date | null, end: Date | null) => void;
  clearFilters: () => void;
  selectArtifact: (id: string | null) => void;
  
  // Server-integrated actions
  loadArtifacts: (refresh?: boolean) => Promise<void>;
  searchArtifacts: (filters?: Partial<ArtifactFilters>) => Promise<SearchResult>;
  loadMoreResults: () => Promise<void>;
  fetchArtifactById: (id: string) => Promise<ExtendedArtifact | null>;
  saveArtifact: (artifact: ExtendedArtifact) => Promise<ExtendedArtifact>;
  updateArtifact: (id: string, updates: Partial<ExtendedArtifact>) => Promise<void>;
  deleteArtifact: (id: string) => Promise<void>;
  
  // Local UI state actions
  toggleLocalPinned: (id: string) => void;
  toggleLocalFavorite: (id: string) => void;
  syncPinnedToServer: () => Promise<void>;
  syncFavoritesToServer: () => Promise<void>;
  
  // Selectors/Getters
  getArtifacts: () => ExtendedArtifact[];
  getArtifactById: (id: string) => ExtendedArtifact | undefined;
  getRelatedArtifacts: (artifactId: string) => ExtendedArtifact[];
  getArtifactsRelatedTo: (targetId: string) => ExtendedArtifact[];
  getSearchResults: () => ExtendedArtifact[];
  getPinnedArtifacts: () => ExtendedArtifact[];
  getFavoriteArtifacts: () => ExtendedArtifact[];
  getArtifactGraph: () => {
    nodes: Array<{ id: string; label: string; type: string }>;
    edges: Array<{ source: string; target: string; type: string }>;
  };
  hasArtifactChanged: (a: ExtendedArtifact, b: ExtendedArtifact) => boolean;
}

// Create the memory slice
export const createMemorySlice: StateCreator<MemorySlice> = (set, get) => {
  // Initialize with localStorage for pinned/favorited if available
  let initialPinnedIds: string[] = [];
  let initialFavoriteIds: string[] = [];
  
  if (typeof window !== 'undefined') {
    try {
      const storedPinned = localStorage.getItem('asraya-pinned-artifacts');
      if (storedPinned) {
        initialPinnedIds = JSON.parse(storedPinned);
      }
      
      const storedFavorites = localStorage.getItem('asraya-favorite-artifacts');
      if (storedFavorites) {
        initialFavoriteIds = JSON.parse(storedFavorites);
      }
    } catch (e) {
      console.warn('Failed to load pinned/favorites from localStorage', e);
    }
  }
  
  // Helper to persist pinned IDs to localStorage
  const persistPinnedIds = (ids: string[]) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('asraya-pinned-artifacts', JSON.stringify(ids));
      } catch (e) {
        console.warn('Failed to save pinned artifacts to localStorage', e);
      }
    }
  };
  
  // Helper to persist favorite IDs to localStorage
  const persistFavoriteIds = (ids: string[]) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('asraya-favorite-artifacts', JSON.stringify(ids));
      } catch (e) {
        console.warn('Failed to save favorite artifacts to localStorage', e);
      }
    }
  };
  
  // Create selectors for memoization
  const getArtifactsSelector = createSelector(
    [(state: MemorySlice) => state.artifactIds, (state: MemorySlice) => state.artifacts],
    (ids, artifacts) => ids.map(id => artifacts[id])
  );
  
  const getSearchResultsSelector = createSelector(
    [(state: MemorySlice) => state.searchResults, (state: MemorySlice) => state.artifacts],
    (ids, artifacts) => ids.map(id => artifacts[id]).filter(Boolean)
  );
  
  return {
    // Initial state
    artifacts: {},
    artifactIds: [],
    searchResults: [],
    pinnedArtifactIds: initialPinnedIds,
    favoriteArtifactIds: initialFavoriteIds,
    searchQuery: '',
    selectedTags: [],
    selectedTypes: [],
    dateRange: { start: null, end: null },
    selectedArtifactId: null,
    isSearching: false,
    isLoading: false,
    error: null,
    currentPage: 0,
    totalResults: 0,
    hasMoreResults: false,
    
    // Actions for filter state
    setSearchQuery: (query) => set({ searchQuery: query }),
    
    addTag: (tag) => set(state => ({
      selectedTags: [...state.selectedTags, tag]
    })),
    
    removeTag: (tag) => set(state => ({
      selectedTags: state.selectedTags.filter(t => t !== tag)
    })),
    
    clearTags: () => set({ selectedTags: [] }),
    
    addType: (type) => set(state => ({
      selectedTypes: [...state.selectedTypes, type]
    })),
    
    removeType: (type) => set(state => ({
      selectedTypes: state.selectedTypes.filter(t => t !== type)
    })),
    
    clearTypes: () => set({ selectedTypes: [] }),
    
    setDateRange: (start, end) => set({ dateRange: { start, end } }),
    
    clearFilters: () => set({
      searchQuery: '',
      selectedTags: [],
      selectedTypes: [],
      dateRange: { start: null, end: null },
      currentPage: 0
    }),
    
    selectArtifact: (id) => set({ selectedArtifactId: id }),
    
    // Server-integrated actions
    loadArtifacts: async (refresh = false) => {
      set({ isLoading: true, error: null });
      
      try {
        // This would call a Server Action using Drizzle
        // const response = await loadArtifactsAction();
        // 
        // Example call structure:
        // const response = await fetch('/api/artifacts', { 
        //   method: 'GET', 
        //   headers: { 'Content-Type': 'application/json' } 
        // });
        // const data = await response.json();
        // 
        // For scalability, we'd fetch a reasonable initial batch (e.g., 50 most recent)
        
        // Simulate server call with placeholder data for now
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const mockArtifacts = Array.from({ length: 5 }).map((_, i) => ({
          id: `artifact-${i+1}`,
          userId: 'current-user',
          name: `Artifact ${i+1}`,
          type: i % 2 === 0 ? 'note' : 'insight',
          content: `Content for artifact ${i+1}`,
          tags: [`tag-${i % 3}`, `priority-${i % 2}`],
          metadata: {
            relations: i > 0 ? [{ targetId: `artifact-${i}`, type: 'related' }] : []
          },
          createdAt: new Date(Date.now() - i * 86400000).toISOString(),
          updatedAt: new Date(Date.now() - i * 86400000).toISOString(),
          isPinned: get().pinnedArtifactIds.includes(`artifact-${i+1}`),
          isFavorite: get().favoriteArtifactIds.includes(`artifact-${i+1}`)
        }));
        
        // Normalize artifacts into a map
        const artifactsMap: Record<string, ExtendedArtifact> = {};
        const ids: string[] = [];
        
        mockArtifacts.forEach(artifact => {
          artifactsMap[artifact.id] = artifact;
          ids.push(artifact.id);
        });
        
        // Merge with existing artifacts if not refreshing
        if (!refresh) {
          set(state => {
            const mergedArtifacts = { ...state.artifacts };
            const updatedIds = [...state.artifactIds];
            
            mockArtifacts.forEach(artifact => {
              // Add if not already present
              if (!mergedArtifacts[artifact.id]) {
                mergedArtifacts[artifact.id] = artifact;
                updatedIds.push(artifact.id);
              }
            });
            
            // Sort by createdAt
            updatedIds.sort((a, b) => {
              return new Date(mergedArtifacts[b].createdAt).getTime() - 
                     new Date(mergedArtifacts[a].createdAt).getTime();
            });
            
            return {
              artifacts: mergedArtifacts,
              artifactIds: updatedIds,
              isLoading: false
            };
          });
        } else {
          // Replace existing data
          set({
            artifacts: artifactsMap,
            artifactIds: ids,
            isLoading: false
          });
        }
      } catch (error) {
        console.error('Error loading artifacts:', error);
        set({ 
          isLoading: false, 
          error: error instanceof Error ? error.message : 'Failed to load artifacts'
        });
      }
    },
    
    searchArtifacts: async (filters = {}) => {
      set({ 
        isSearching: true, 
        error: null,
        currentPage: 0
      });
      
      // Update filter state based on provided filters
      if (filters.query !== undefined) set({ searchQuery: filters.query });
      if (filters.tags !== undefined) set({ selectedTags: filters.tags });
      if (filters.types !== undefined) set({ selectedTypes: filters.types });
      if (filters.dateRange !== undefined) set({ dateRange: filters.dateRange });
      
      // Prepare combined filters from current state and incoming filters
      const { searchQuery, selectedTags, selectedTypes, dateRange } = get();
      const combinedFilters: ArtifactFilters = {
        query: filters.query ?? searchQuery,
        tags: filters.tags ?? selectedTags,
        types: filters.types ?? selectedTypes,
        dateRange: filters.dateRange ?? dateRange,
        limit: filters.limit ?? 20,
        offset: 0 // Reset to first page
      };
      
      try {
        // This would call a Server Action using Drizzle
        // const result = await searchArtifactsAction(combinedFilters);
        //
        // Server would build query like:
        // const query = db.select().from(artifacts);
        // 
        // if (filters.query) {
        //   query.where(
        //     or(
        //       ilike(artifacts.name, `%${filters.query}%`),
        //       ilike(artifacts.content, `%${filters.query}%`),
        //       // Add full-text search here if configured...
        //     )
        //   );
        // }
        //
        // if (filters.tags && filters.tags.length > 0) {
        //   query.where(
        //     sql`${artifacts.tags} && ${sql.array(filters.tags, 'text')}`
        //   );
        // }
        //
        // // Add similar filters for types, dateRange, etc.
        // // Add limit and offset for pagination
        // // Return { artifacts, totalCount, hasMore }
        
        // Simulate server call with filtered data for now
        await new Promise(resolve => setTimeout(resolve, 400));
        
        // Create some mock data
        const allMockArtifacts = Array.from({ length: 50 }).map((_, i) => ({
          id: `search-${i+1}`,
          userId: 'current-user',
          name: `Search Result ${i+1}`,
          type: i % 3 === 0 ? 'note' : i % 3 === 1 ? 'insight' : 'reflection',
          content: `Content with ${combinedFilters.query || 'no query'} for artifact ${i+1}`,
          tags: [
            `tag-${i % 5}`, 
            ...(i % 2 === 0 ? ['important'] : []),
            ...(i % 7 === 0 ? ['personal'] : [])
          ],
          metadata: {
            relations: i > 0 ? [{ targetId: `search-${i}`, type: 'related' }] : []
          },
          createdAt: new Date(Date.now() - i * 23400000).toISOString(),
          updatedAt: new Date(Date.now() - i * 23400000).toISOString()
        }));
        
        // Filter based on combinedFilters
        let filteredResults = allMockArtifacts;
        
        if (combinedFilters.query) {
          const query = combinedFilters.query.toLowerCase();
          filteredResults = filteredResults.filter(a => 
            a.name.toLowerCase().includes(query) || 
            a.content.toLowerCase().includes(query) ||
            a.tags.some(tag => tag.toLowerCase().includes(query))
          );
        }
        
        if (combinedFilters.tags?.length) {
          filteredResults = filteredResults.filter(a => 
            combinedFilters.tags!.some(tag => a.tags.includes(tag))
          );
        }
        
        if (combinedFilters.types?.length) {
          filteredResults = filteredResults.filter(a => 
            combinedFilters.types!.includes(a.type)
          );
        }
        
        // Apply date range if present
        if (combinedFilters.dateRange?.start) {
          filteredResults = filteredResults.filter(a => 
            new Date(a.createdAt) >= combinedFilters.dateRange!.start!
          );
        }
        
        if (combinedFilters.dateRange?.end) {
          filteredResults = filteredResults.filter(a => 
            new Date(a.createdAt) <= combinedFilters.dateRange!.end!
          );
        }
        
        // Apply pinned/favorite filters if needed
        if (combinedFilters.pinned) {
          const { pinnedArtifactIds } = get();
          filteredResults = filteredResults.filter(a => pinnedArtifactIds.includes(a.id));
        }
        
        if (combinedFilters.favorite) {
          const { favoriteArtifactIds } = get();
          filteredResults = filteredResults.filter(a => favoriteArtifactIds.includes(a.id));
        }
        
        // Apply limit and offset for pagination
        const totalCount = filteredResults.length;
        const limit = combinedFilters.limit || 20;
        const offset = combinedFilters.offset || 0;
        const paginatedResults = filteredResults.slice(offset, offset + limit);
        const hasMore = offset + limit < totalCount;
        
        // Add to state
        set(state => {
          // Create a map with the search results
          const updatedArtifacts = { ...state.artifacts };
          const searchResultIds: string[] = [];
          
          paginatedResults.forEach(artifact => {
            // Add isPinned and isFavorite flags based on current state
            const artifactWithState = {
              ...artifact,
              isPinned: state.pinnedArtifactIds.includes(artifact.id),
              isFavorite: state.favoriteArtifactIds.includes(artifact.id)
            };
            
            updatedArtifacts[artifact.id] = artifactWithState;
            searchResultIds.push(artifact.id);
          });
          
          return {
            artifacts: updatedArtifacts,
            searchResults: searchResultIds,
            isSearching: false,
            totalResults: totalCount,
            hasMoreResults: hasMore,
            currentPage: 0 // Reset to first page
          };
        });
        
        // Return the search result for potential direct use
        return {
          artifacts: paginatedResults,
          totalCount,
          hasMore
        };
      } catch (error) {
        console.error('Error searching artifacts:', error);
        set({ 
          isSearching: false, 
          error: error instanceof Error ? error.message : 'Failed to search artifacts',
          searchResults: []
        });
        return { artifacts: [], totalCount: 0, hasMore: false };
      }
    },
    
    loadMoreResults: async () => {
      const { isSearching, hasMoreResults, currentPage, searchQuery, selectedTags, selectedTypes, dateRange } = get();
      
      // Don't load more if already searching or no more results
      if (isSearching || !hasMoreResults) return;
      
      set({ isSearching: true });
      
      const nextPage = currentPage + 1;
      const limit = 20; // Same as initial search
      const offset = nextPage * limit;
      
      try {
        // This would call the same searchArtifactsAction but with updated offset
        // const result = await searchArtifactsAction({
        //   query: searchQuery,
        //   tags: selectedTags,
        //   types: selectedTypes,
        //   dateRange,
        //   limit,
        //   offset
        // });
        
        // Simulate for now
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Create more mock results
        const moreMockResults = Array.from({ length: 10 }).map((_, i) => ({
          id: `more-${offset + i}`,
          userId: 'current-user',
          name: `More Result ${offset + i}`,
          type: (offset + i) % 3 === 0 ? 'note' : (offset + i) % 3 === 1 ? 'insight' : 'reflection',
          content: `Content with ${searchQuery || 'no query'} for artifact ${offset + i}`,
          tags: [
            `tag-${(offset + i) % 5}`, 
            ...((offset + i) % 2 === 0 ? ['important'] : []),
            ...((offset + i) % 7 === 0 ? ['personal'] : [])
          ],
          metadata: {
            relations: []
          },
          createdAt: new Date(Date.now() - (offset + i) * 43200000).toISOString(),
          updatedAt: new Date(Date.now() - (offset + i) * 43200000).toISOString()
        }));
        
        const hasMore = moreMockResults.length === limit;
        
        // Add to state
        set(state => {
          // Update the artifacts map and search results
          const updatedArtifacts = { ...state.artifacts };
          const updatedSearchResults = [...state.searchResults];
          
          moreMockResults.forEach(artifact => {
            // Add isPinned and isFavorite flags based on current state
            const artifactWithState = {
              ...artifact,
              isPinned: state.pinnedArtifactIds.includes(artifact.id),
              isFavorite: state.favoriteArtifactIds.includes(artifact.id)
            };
            
            updatedArtifacts[artifact.id] = artifactWithState;
            updatedSearchResults.push(artifact.id);
          });
          
          return {
            artifacts: updatedArtifacts,
            searchResults: updatedSearchResults,
            currentPage: nextPage,
            hasMoreResults: hasMore,
            isSearching: false
          };
        });
      } catch (error) {
        console.error('Error loading more results:', error);
        set({ 
          isSearching: false, 
          error: error instanceof Error ? error.message : 'Failed to load more results'
        });
      }
    },
    
    fetchArtifactById: async (id) => {
      // First check local cache
      const cachedArtifact = get().artifacts[id];
      if (cachedArtifact) return cachedArtifact;
      
      set({ isLoading: true });
      
      try {
        // This would call a Server Action to fetch a single artifact
        // const artifact = await getArtifactByIdAction(id);
        
        // Simulate server call
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Create mock artifact
        const mockArtifact = {
          id,
          userId: 'current-user',
          name: `Detail Artifact ${id}`,
          type: 'note',
          content: `Detailed content for artifact ${id}`,
          tags: ['detail', 'specific'],
          metadata: {
            relations: []
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isPinned: get().pinnedArtifactIds.includes(id),
          isFavorite: get().favoriteArtifactIds.includes(id)
        };
        
        // Add to state
        set(state => ({
          artifacts: {
            ...state.artifacts,
            [id]: mockArtifact
          },
          isLoading: false
        }));
        
        return mockArtifact;
      } catch (error) {
        console.error(`Error fetching artifact ${id}:`, error);
        set({ 
          isLoading: false, 
          error: error instanceof Error ? error.message : `Failed to fetch artifact ${id}`
        });
        return null;
      }
    },
    
    saveArtifact: async (artifact) => {
      set({ isLoading: true });
      
      try {
        // This would call a Server Action to save the artifact
        // const savedArtifact = await saveArtifactAction(artifact);
        
        // Simulate server call
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Create saved artifact (in real implementation, this would come from the server)
        const timestamp = new Date().toISOString();
        const savedArtifact = {
          ...artifact,
          createdAt: artifact.createdAt || timestamp,
          updatedAt: timestamp,
          // Apply local UI state
          isPinned: get().pinnedArtifactIds.includes(artifact.id),
          isFavorite: get().favoriteArtifactIds.includes(artifact.id)
        };
        
        // Update state
        set(state => {
          // Update artifacts map
          const updatedArtifacts = {
            ...state.artifacts,
            [savedArtifact.id]: savedArtifact
          };
          
          // Update ID lists
          let updatedIds = [...state.artifactIds];
          let updatedSearchResults = [...state.searchResults];
          
          // Add to artifactIds if new
          if (!state.artifactIds.includes(savedArtifact.id)) {
            updatedIds = [savedArtifact.id, ...updatedIds];
          }
          
          // Add to searchResults if we're currently searching and it matches
          // In a real implementation, you'd check if it matches current search criteria
          const isSearching = state.searchQuery.trim() !== '' || 
                               state.selectedTags.length > 0 || 
                               state.selectedTypes.length > 0;
          
          if (isSearching && !state.searchResults.includes(savedArtifact.id)) {
            // Simple "always add to top of search" for this example
            // In reality, you'd re-filter or call the server again
            updatedSearchResults = [savedArtifact.id, ...updatedSearchResults];
          }
          
          return {
            artifacts: updatedArtifacts,
            artifactIds: updatedIds,
            searchResults: updatedSearchResults,
            isLoading: false
          };
        });
        
        return savedArtifact;
      } catch (error) {
        console.error('Error saving artifact:', error);
        set({ 
          isLoading: false, 
          error: error instanceof Error ? error.message : 'Failed to save artifact'
        });
        throw error;
      }
    },
    
    updateArtifact: async (id, updates) => {
      set({ isLoading: true });
      
      try {
        // Get current artifact from state
        const currentArtifact = get().artifacts[id];
        if (!currentArtifact) {
          throw new Error(`Artifact with ID ${id} not found`);
        }
        
        // This would call a Server Action to update the artifact
        // const updatedArtifact = await updateArtifactAction(id, updates);
        
        // Simulate server call
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Create updated artifact
        const updatedArtifact = {
          ...currentArtifact,
          ...updates,
          updatedAt: new Date().toISOString()
        };
        
        // Update state
        set(state => ({
          artifacts: {
            ...state.artifacts,
            [id]: updatedArtifact
          },
          isLoading: false
        }));
      } catch (error) {
        console.error(`Error updating artifact ${id}:`, error);
        set({ 
          isLoading: false, 
          error: error instanceof Error ? error.message : `Failed to update artifact ${id}`
        });
        throw error;
      }
    },
    
    deleteArtifact: async (id) => {
      set({ isLoading: true });
      
      try {
        // This would call a Server Action to delete the artifact
        // await deleteArtifactAction(id);
        
        // Simulate server call
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Update state
        set(state => {
          // Create a new artifacts object without the deleted one
          const { [id]: deleted, ...remainingArtifacts } = state.artifacts;
          
          if (!deleted) {
            throw new Error(`Artifact with ID ${id} not found`);
          }
          
          return {
            artifacts: remainingArtifacts,
            artifactIds: state.artifactIds.filter(artifactId => artifactId !== id),
            searchResults: state.searchResults.filter(resultId => resultId !== id),
            pinnedArtifactIds: state.pinnedArtifactIds.filter(pinnedId => pinnedId !== id),
            favoriteArtifactIds: state.favoriteArtifactIds.filter(favoriteId => favoriteId !== id),
            selectedArtifactId: state.selectedArtifactId === id ? null : state.selectedArtifactId,
            isLoading: false
          };
        });
      } catch (error) {
        console.error(`Error deleting artifact ${id}:`, error);
        set({ 
          isLoading: false, 
          error: error instanceof Error ? error.message : `Failed to delete artifact ${id}`
        });
        throw error;
      }
    },
    
    // Local UI state actions
    toggleLocalPinned: (id) => {
      set(state => {
        const isPinned = state.pinnedArtifactIds.includes(id);
        let updatedPinnedIds: string[];
        
        if (isPinned) {
          updatedPinnedIds = state.pinnedArtifactIds.filter(pinnedId => pinnedId !== id);
        } else {
          updatedPinnedIds = [...state.pinnedArtifactIds, id];
        }
        
        // Update the artifact in the map if it exists
        let updatedArtifacts = { ...state.artifacts };
        if (updatedArtifacts[id]) {
          updatedArtifacts[id] = {
            ...updatedArtifacts[id],
            isPinned: !isPinned
          };
        }
        
        // Persist to localStorage
        persistPinnedIds(updatedPinnedIds);
        
        return {
          pinnedArtifactIds: updatedPinnedIds,
          artifacts: updatedArtifacts
        };
      });
    },
    
    toggleLocalFavorite: (id) => {
      set(state => {
        const isFavorite = state.favoriteArtifactIds.includes(id);
        let updatedFavoriteIds: string[];
        
        if (isFavorite) {
          updatedFavoriteIds = state.favoriteArtifactIds.filter(favoriteId => favoriteId !== id);
        } else {
          updatedFavoriteIds = [...state.favoriteArtifactIds, id];
        }
        
        // Update the artifact in the map if it exists
        let updatedArtifacts = { ...state.artifacts };
        if (updatedArtifacts[id]) {
          updatedArtifacts[id] = {
            ...updatedArtifacts[id],
            isFavorite: !isFavorite
          };
        }
        
        // Persist to localStorage
        persistFavoriteIds(updatedFavoriteIds);
        
        return {
          favoriteArtifactIds: updatedFavoriteIds,
          artifacts: updatedArtifacts
        };
      });
    },
    
    syncPinnedToServer: async () => {
      const { pinnedArtifactIds } = get();
      
      try {
        // This would call a Server Action to sync pinned state
        // await syncPinnedArtifactsAction(pinnedArtifactIds);
        
        // Simulate server call
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Success - nothing to update in state
      } catch (error) {
        console.error('Error syncing pinned artifacts:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Failed to sync pinned artifacts'
        });
      }
    },
    
    syncFavoritesToServer: async () => {
      const { favoriteArtifactIds } = get();
      
      try {
        // This would call a Server Action to sync favorite state
        // await syncFavoriteArtifactsAction(favoriteArtifactIds);
        
        // Simulate server call
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Success - nothing to update in state
      } catch (error) {
        console.error('Error syncing favorite artifacts:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Failed to sync favorite artifacts'
        });
      }
    },
    
    // Selectors
    getArtifacts: () => {
      return getArtifactsSelector(get());
    },
    
    getArtifactById: (id) => {
      return get().artifacts[id];
    },
    
    getRelatedArtifacts: (artifactId) => {
      const { artifacts } = get();
      const artifact = artifacts[artifactId];
      
      if (!artifact || !artifact.metadata.relations) {
        return [];
      }
      
      return artifact.metadata.relations
        .map(relation => artifacts[relation.targetId])
        .filter(Boolean);
    },
    
    getArtifactsRelatedTo: (targetId) => {
      const { artifacts } = get();
      
      return Object.values(artifacts).filter(artifact => 
        artifact.metadata.relations?.some(relation => relation.targetId === targetId)
      );
    },
    
    getSearchResults: () => {
      return getSearchResultsSelector(get());
    },
    
    getPinnedArtifacts: () => {
      const { artifacts, pinnedArtifactIds } = get();
      return pinnedArtifactIds
        .map(id => artifacts[id])
        .filter(Boolean);
    },
    
    getFavoriteArtifacts: () => {
      const { artifacts, favoriteArtifactIds } = get();
      return favoriteArtifactIds
        .map(id => artifacts[id])
        .filter(Boolean);
    },
    
    getArtifactGraph: () => {
      const { artifacts } = get();
      
      const nodes = Object.values(artifacts).map(a => ({
        id: a.id,
        label: a.name,
        type: a.type
      }));
      
      const edges: Array<{ source: string; target: string; type: string }> = [];
      
      // Collect all edges from relations
      Object.values(artifacts).forEach(artifact => {
        if (artifact.metadata.relations) {
          artifact.metadata.relations.forEach(relation => {
            edges.push({
              source: artifact.id,
              target: relation.targetId,
              type: relation.type
            });
          });
        }
      });
      
      return { nodes, edges };
    },
    
    hasArtifactChanged: (a, b) => {
      // Compare critical fields to determine if there are unsaved changes
      if (a.name !== b.name) return true;
      if (a.content !== b.content) return true;
      if (a.type !== b.type) return true;
      
      // Compare tags (order-insensitive)
      if (a.tags.length !== b.tags.length) return true;
      if (!a.tags.every(tag => b.tags.includes(tag))) return true;
      
      // Compare relations (simplified check)
      const aRelations = a.metadata.relations || [];
      const bRelations = b.metadata.relations || [];
      
      if (aRelations.length !== bRelations.length) return true;
      
      // Deep compare relations
      const relationsDiffer = aRelations.some(aRel => {
        const matchingRel = bRelations.find(bRel => bRel.targetId === aRel.targetId);
        return !matchingRel || matchingRel.type !== aRel.type;
      });
      
      if (relationsDiffer) return true;
      
      return false;
    }
  };
};