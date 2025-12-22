/**
 * Authentication and authorization helpers
 */

import { cookies } from 'next/headers';
import { getWhopClient, WhopUser } from './whop/client';

export interface Session {
  userId: string;
  companyId?: string;
  productId?: string;
  user: WhopUser;
}

/**
 * Get current session from Whop SDK or cookies
 * TODO: Integrate with actual Whop SDK authentication
 */
export async function getSession(): Promise<Session | null> {
  try {
    // In development, return a mock session for local testing
    if (process.env.NODE_ENV === 'development') {
      // Try to get the actual company ID from database
      const { prisma } = await import('./db');
      const company = await prisma.company.findFirst({
        where: { whopId: 'default_company' },
      });
      
      return {
        userId: process.env.SERVICE_USER_ID || 'dev-user-123',
        companyId: company?.id,
        user: {
          id: process.env.SERVICE_USER_ID || 'dev-user-123',
          username: process.env.SERVICE_USER_USERNAME || 'dev-user',
        },
      };
    }

    // In a real implementation, this would use Whop SDK
    // For now, we'll use a placeholder that checks for session cookie
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('whop_session');
    
    if (!sessionToken) {
      return null;
    }

    // TODO: Validate session token with Whop API
    // For now, return a mock session
    const client = getWhopClient();
    const user = await client.getCurrentUser();
    
    return {
      userId: user.id,
      user,
    };
  } catch (error) {
    console.error('Auth error:', error);
    // In development, still return a mock session even on error
    if (process.env.NODE_ENV === 'development') {
      try {
        const { prisma } = await import('./db');
        const company = await prisma.company.findFirst({
          where: { whopId: 'default_company' },
        });
        
        return {
          userId: process.env.SERVICE_USER_ID || 'dev-user-123',
          companyId: company?.id,
          user: {
            id: process.env.SERVICE_USER_ID || 'dev-user-123',
            username: process.env.SERVICE_USER_USERNAME || 'dev-user',
          },
        };
      } catch {
        return {
          userId: process.env.SERVICE_USER_ID || 'dev-user-123',
          companyId: undefined,
          user: {
            id: process.env.SERVICE_USER_ID || 'dev-user-123',
            username: process.env.SERVICE_USER_USERNAME || 'dev-user',
          },
        };
      }
    }
    return null;
  }
}

/**
 * Check if user has permission for a company
 */
export async function isAuthorized(
  companyId: string,
  userId: string,
  requiredRole: 'admin' | 'moderator' | 'viewer' = 'viewer'
): Promise<boolean> {
  try {
    const session = await getSession();
    if (!session || session.userId !== userId) {
      return false;
    }

    // Check permissions in database
    const { prisma } = await import('./db');
    const permission = await prisma.userPermission.findUnique({
      where: {
        companyId_userId: {
          companyId,
          userId,
        },
      },
    });

    if (!permission) {
      // In development, allow access if no permissions are set
      if (process.env.NODE_ENV === 'development') {
        return true;
      }
      return false;
    }

    // Role hierarchy: admin > moderator > viewer
    const roleHierarchy = { admin: 3, moderator: 2, viewer: 1 };
    const userLevel = roleHierarchy[permission.role as keyof typeof roleHierarchy] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;

    return userLevel >= requiredLevel;
  } catch (error) {
    console.error('Authorization check error:', error);
    // In development, allow access on error
    if (process.env.NODE_ENV === 'development') {
      return true;
    }
    return false;
  }
}

/**
 * Get user's role for a company
 */
export async function getUserRole(
  companyId: string,
  userId: string
): Promise<'admin' | 'moderator' | 'viewer' | null> {
  try {
    const { prisma } = await import('./db');
    const permission = await prisma.userPermission.findUnique({
      where: {
        companyId_userId: {
          companyId,
          userId,
        },
      },
    });

    if (!permission) {
      // In development, default to admin if no permissions
      if (process.env.NODE_ENV === 'development') {
        return 'admin';
      }
      return null;
    }

    return permission.role as 'admin' | 'moderator' | 'viewer';
  } catch (error) {
    console.error('Get role error:', error);
    if (process.env.NODE_ENV === 'development') {
      return 'admin';
    }
    return null;
  }
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth(): Promise<Session> {
  const session = await getSession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}

