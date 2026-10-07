import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export interface LogActivityParams {
  businessId: string;
  userId: string;
  entityType: 'invoice' | 'payment' | 'customer' | 'quote' | 'product' | 'business';
  entityId?: string;
  action: string;
  metadata?: Record<string, unknown>;
}

export const logActivity = async (params: LogActivityParams) => {
  if (!isSupabaseConfigured()) return;
  try {
    await supabase.from('activities').insert({
      business_id: params.businessId,
      user_id: params.userId,
      entity_type: params.entityType,
      entity_id: params.entityId || null,
      action: params.action,
      metadata: params.metadata || {},
    });
  } catch (err) {
    console.warn('Failed to log activity:', err);
  }
};

export const createNotification = async (params: {
  businessId: string;
  userId: string;
  type: string;
  title: string;
  message: string;
}) => {
  if (!isSupabaseConfigured()) return;
  try {
    await supabase.from('notifications').insert({
      business_id: params.businessId,
      user_id: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      read: false,
    });
  } catch (err) {
    console.warn('Failed to create notification:', err);
  }
};
