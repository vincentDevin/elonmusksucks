import type {
  UnifiedContentFilters,
  UnifiedContentResponse,
  UnifiedContentBulkOperation,
  UnifiedContentBulkResult,
  UnifiedContentAnalytics,
} from '@ems/types';
import api from './axios';

// Base API path for unified content management
const BASE_PATH = '/api/admin/unified-content';

/**
 * Get unified content items with filtering and pagination
 */
export async function getContent(
  filters: UnifiedContentFilters = {},
): Promise<UnifiedContentResponse> {
  const params = new URLSearchParams();

  // Add filter parameters
  if (filters.types && filters.types.length > 0) {
    filters.types.forEach((type) => params.append('types[]', type));
  }

  if (filters.statuses && filters.statuses.length > 0) {
    filters.statuses.forEach((status) => params.append('statuses[]', status));
  }

  if (filters.search && filters.search.trim()) {
    params.set('search', filters.search.trim());
  }

  if (filters.authorIds && filters.authorIds.length > 0) {
    filters.authorIds.forEach((authorId) => params.append('authorIds[]', authorId.toString()));
  }

  // Date filtering
  if (filters.createdAfter) {
    params.set('createdAfter', filters.createdAfter);
  }
  if (filters.createdBefore) {
    params.set('createdBefore', filters.createdBefore);
  }
  if (filters.publishedAfter) {
    params.set('publishedAfter', filters.publishedAfter);
  }
  if (filters.publishedBefore) {
    params.set('publishedBefore', filters.publishedBefore);
  }

  if (filters.priority && filters.priority.length > 0) {
    filters.priority.forEach((priority) => params.append('priority[]', priority));
  }

  if (filters.tags && filters.tags.length > 0) {
    filters.tags.forEach((tag) => params.append('tags[]', tag));
  }

  // Pagination
  if (filters.limit !== undefined) {
    params.set('limit', filters.limit.toString());
  }

  if (filters.offset !== undefined) {
    params.set('offset', filters.offset.toString());
  }

  // Sort
  if (filters.sortBy) {
    params.set('sortBy', filters.sortBy);
  }

  if (filters.sortOrder) {
    params.set('sortOrder', filters.sortOrder);
  }

  const queryString = params.toString();
  const url = queryString ? `${BASE_PATH}?${queryString}` : BASE_PATH;

  const response = await api.get<UnifiedContentResponse>(url);
  return response.data;
}

/**
 * Perform bulk moderation operation on content items
 */
export async function bulkModerateContent(
  operation: UnifiedContentBulkOperation,
): Promise<UnifiedContentBulkResult> {
  const response = await api.post<UnifiedContentBulkResult>(`${BASE_PATH}/bulk`, operation);
  return response.data;
}

/**
 * Get unified content analytics
 */
export async function getAnalytics(timeRange?: string): Promise<UnifiedContentAnalytics> {
  const params = new URLSearchParams();
  if (timeRange) {
    params.set('timeRange', timeRange);
  }

  const queryString = params.toString();
  const url = queryString ? `${BASE_PATH}/analytics?${queryString}` : `${BASE_PATH}/analytics`;

  const response = await api.get<UnifiedContentAnalytics>(url);
  return response.data;
}

/**
 * Approve content item
 */
export async function approveContent(contentId: string, reason?: string): Promise<void> {
  await api.post(`${BASE_PATH}/${contentId}/approve`, { reason });
}

/**
 * Reject content item
 */
export async function rejectContent(contentId: string, reason?: string): Promise<void> {
  await api.post(`${BASE_PATH}/${contentId}/reject`, { reason });
}

/**
 * Flag content item
 */
export async function flagContent(contentId: string, reason?: string): Promise<void> {
  await api.post(`${BASE_PATH}/${contentId}/flag`, { reason });
}

/**
 * Delete content item
 */
export async function deleteContent(contentId: string, reason?: string): Promise<void> {
  await api.delete(`${BASE_PATH}/${contentId}`, { data: { reason } });
}

/**
 * Get content by ID with full details
 */
export async function getContentById(contentId: string): Promise<any> {
  const response = await api.get(`${BASE_PATH}/${contentId}`);
  return response.data;
}

/**
 * Update content metadata (tags, priority, etc.)
 */
export async function updateContentMetadata(
  contentId: string,
  updates: {
    tags?: string[];
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    notes?: string;
  },
): Promise<void> {
  await api.patch(`${BASE_PATH}/${contentId}/metadata`, updates);
}

/**
 * Export content data
 */
export async function exportContent(
  filters: UnifiedContentFilters,
  format: 'csv' | 'json' = 'csv',
): Promise<Blob> {
  const params = new URLSearchParams();

  // Add the same filter parameters as getContent
  if (filters.types && filters.types.length > 0) {
    filters.types.forEach((type) => params.append('types[]', type));
  }

  if (filters.statuses && filters.statuses.length > 0) {
    filters.statuses.forEach((status) => params.append('statuses[]', status));
  }
  if (filters.search) params.set('search', filters.search);
  if (filters.authorIds && filters.authorIds.length > 0) {
    filters.authorIds.forEach((authorId) => params.append('authorIds[]', authorId.toString()));
  }

  // Date filtering
  if (filters.createdAfter) params.set('createdAfter', filters.createdAfter);
  if (filters.createdBefore) params.set('createdBefore', filters.createdBefore);
  if (filters.publishedAfter) params.set('publishedAfter', filters.publishedAfter);
  if (filters.publishedBefore) params.set('publishedBefore', filters.publishedBefore);

  params.set('format', format);

  const response = await api.get(`${BASE_PATH}/export?${params.toString()}`, {
    responseType: 'blob',
  });

  return response.data;
}
