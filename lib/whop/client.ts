/**
 * Whop API Client
 * Handles all interactions with Whop's API
 */

const WHOP_API_BASE = 'https://api.whop.com/api/v2';

export interface WhopUser {
  id: string;
  username: string;
  email?: string;
  roles?: string[];
}

export interface WhopCompany {
  id: string;
  name: string;
}

export interface WhopProduct {
  id: string;
  name: string;
  company_id: string;
}

export interface WhopChannel {
  id: string;
  name: string;
  type: 'chat' | 'forum';
}

export class WhopClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${WHOP_API_BASE}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Whop API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async getCurrentUser(): Promise<WhopUser> {
    // TODO: Replace with actual Whop API endpoint
    return this.request<WhopUser>('/me');
  }

  async getCompany(companyId: string): Promise<WhopCompany> {
    // TODO: Replace with actual Whop API endpoint
    return this.request<WhopCompany>(`/companies/${companyId}`);
  }

  async getProduct(productId: string): Promise<WhopProduct> {
    // TODO: Replace with actual Whop API endpoint
    return this.request<WhopProduct>(`/products/${productId}`);
  }

  async getChannels(companyId: string): Promise<WhopChannel[]> {
    // TODO: Replace with actual Whop API endpoint
    return this.request<WhopChannel[]>(`/companies/${companyId}/channels`);
  }

  /**
   * Delete a message
   * Requires: chat:moderate permission
   */
  async deleteMessage(channelId: string, messageId: string): Promise<void> {
    try {
      await this.request(`/channels/${channelId}/messages/${messageId}`, {
        method: 'DELETE',
      });
    } catch (error: any) {
      // Try alternative endpoint
      try {
        await this.request(`/chat/${channelId}/messages/${messageId}`, {
          method: 'DELETE',
        });
      } catch (error2: any) {
        throw new Error(`Failed to delete message: ${error.message}. Please check Whop API documentation.`);
      }
    }
  }

  /**
   * Hide a forum post
   * Requires: forum:moderate permission
   */
  async hidePost(forumId: string, postId: string): Promise<void> {
    try {
      await this.request(`/forums/${forumId}/posts/${postId}/hide`, {
        method: 'POST',
      });
    } catch (error: any) {
      // Try alternative endpoint
      try {
        await this.request(`/forum/${forumId}/posts/${postId}/hide`, {
          method: 'POST',
        });
      } catch (error2: any) {
        throw new Error(`Failed to hide post: ${error.message}. Please check Whop API documentation.`);
      }
    }
  }

  /**
   * Get forum posts
   * Requires: forum:read permission
   */
  async getForumPosts(
    forumId: string,
    limit: number = 50,
    since?: string
  ): Promise<any[]> {
    const params = new URLSearchParams({
      limit: limit.toString(),
    });
    if (since) {
      params.append('since', since);
    }
    
    try {
      return await this.request<any[]>(`/forums/${forumId}/posts?${params}`);
    } catch (error: any) {
      try {
        return await this.request<any[]>(`/forum/${forumId}/posts?${params}`);
      } catch (error2: any) {
        throw new Error(`Failed to fetch forum posts: ${error.message}`);
      }
    }
  }

  async sendDM(userId: string, message: string): Promise<void> {
    // TODO: Replace with actual Whop API endpoint
    await this.request(`/users/${userId}/dm`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  async timeoutUser(userId: string, duration: number): Promise<void> {
    // TODO: Replace with actual Whop API endpoint
    await this.request(`/users/${userId}/timeout`, {
      method: 'POST',
      body: JSON.stringify({ duration }),
    });
  }

  async muteUser(userId: string, duration: number): Promise<void> {
    // TODO: Replace with actual Whop API endpoint
    await this.request(`/users/${userId}/mute`, {
      method: 'POST',
      body: JSON.stringify({ duration }),
    });
  }

  async notifyChannel(channelId: string, message: string): Promise<void> {
    // TODO: Replace with actual Whop API endpoint
    await this.request(`/channels/${channelId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content: message }),
    });
  }

  /**
   * Get recent messages from a channel
   * Requires: chat:read permission
   */
  async getChannelMessages(
    channelId: string,
    limit: number = 50,
    since?: string
  ): Promise<any[]> {
    const params = new URLSearchParams({
      limit: limit.toString(),
    });
    if (since) {
      params.append('since', since);
    }
    
    // Try common API endpoint patterns
    try {
      return await this.request<any[]>(`/channels/${channelId}/messages?${params}`);
    } catch (error: any) {
      // If that fails, try alternative endpoint
      try {
        return await this.request<any[]>(`/chat/${channelId}/messages?${params}`);
      } catch (error2: any) {
        throw new Error(`Failed to fetch messages: ${error.message}. Please check Whop API documentation for the correct endpoint.`);
      }
    }
  }

  /**
   * Get a specific message by ID
   * Requires: chat:read permission
   */
  async getMessage(channelId: string, messageId: string): Promise<any> {
    try {
      return await this.request(`/channels/${channelId}/messages/${messageId}`);
    } catch (error: any) {
      try {
        return await this.request(`/chat/${channelId}/messages/${messageId}`);
      } catch (error2: any) {
        throw new Error(`Failed to fetch message: ${error.message}`);
      }
    }
  }

  /**
   * Get all channels for a company
   * TODO: Replace with actual Whop API endpoint
   */
  async getCompanyChannels(companyId: string): Promise<WhopChannel[]> {
    // TODO: Implement actual Whop API call
    return this.getChannels(companyId);
  }
}

export function getWhopClient(): WhopClient {
  const apiKey = process.env.WHOP_API_KEY;
  if (!apiKey) {
    throw new Error('WHOP_API_KEY is not set');
  }
  return new WhopClient(apiKey);
}

