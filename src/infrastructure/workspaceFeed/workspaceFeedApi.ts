import apiClient from '../http/apiClient';

export interface FeedPostRecord {
  id: number;
  author_id: string;
  workspace_id: string | null;
  team_id: number | null;
  visibility: 'workspace' | 'team' | 'public';
  body: string;
  image_ids: number[];
  created_on: string;
  edited_on: string | null;
  is_pinned: boolean;
  like_count: number;
  comment_count: number;
}

export interface FeedPageResponse {
  posts: FeedPostRecord[];
  next_cursor: string | null;
}

export const workspaceFeedApi = {
  list: (
    workspaceId: string,
    params: { team_id?: number; cursor?: string | null; limit?: number } = {}
  ) =>
    apiClient.get<{ success: boolean; data: FeedPageResponse }>(
      `/social/workspaces/${workspaceId}/feed/`,
      { params }
    ),

  create: (
    workspaceId: string,
    payload: {
      body: string;
      team_id?: number | null;
      visibility?: 'workspace' | 'team';
      image_ids?: number[];
    }
  ) =>
    apiClient.post<{ success: boolean; data: FeedPostRecord }>(
      `/social/workspaces/${workspaceId}/feed/`,
      payload
    ),

  edit: (postId: number, body: string) =>
    apiClient.patch<{ success: boolean; data: FeedPostRecord }>(
      `/social/posts/${postId}/`,
      { body }
    ),

  remove: (postId: number) => apiClient.delete(`/social/posts/${postId}/`),

  toggleLike: (postId: number) =>
    apiClient.post<{ success: boolean; data: { liked: boolean; like_count: number } }>(
      `/social/posts/${postId}/like/`
    ),

  listComments: (postId: number) =>
    apiClient.get<{ success: boolean; data: any[] }>(
      `/social/posts/${postId}/comments/`
    ),

  addComment: (postId: number, comment: string) =>
    apiClient.post<{ success: boolean; data: any }>(
      `/social/posts/${postId}/comments/`,
      { comment }
    )
};
