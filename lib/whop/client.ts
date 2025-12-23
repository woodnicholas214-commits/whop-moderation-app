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

  async deleteMessage(channelId: string, messageId: string): Promise<void> {
    // TODO: Replace with actual Whop API endpoint
    await this.request(`/channels/${channelId}/messages/${messageId}`, {
      method: 'DELETE',
    });
  }

  async hidePost(forumId: string, postId: string): Promise<void> {
    // TODO: Replace with actual Whop API endpoint
    await this.request(`/forums/${forumId}/posts/${postId}/hide`, {
      method: 'POST',
    });
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
   * TODO: Replace with actual Whop API endpoint
   * This endpoint may not exist - check Whop API documentation
   */
  async getChannelMessages(
    channelId: string,
    limit: number = 50,
    since?: string
  ): Promise<any[]> {
    // TODO: Implement actual Whop API call
    // Example: GET /api/v2/channels/{channelId}/messages?limit=50&since={timestamp}
    throw new Error('Message fetching not yet implemented - needs Whop API endpoint');
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

