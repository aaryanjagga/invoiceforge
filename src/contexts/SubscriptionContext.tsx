import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import {
  fetchUserSubscription,
  UserSubscriptionInfo,
  hasFeature as checkHasFeature,
  isProUser as checkIsProUser,
  canCreateInvoice as checkCanCreateInvoice,
  getMonthlyInvoiceUsage as checkMonthlyUsage,
  ProFeatureName,
} from '@/services/subscriptionService';
import { SubscriptionPlan, SubscriptionStatus } from '@/types/database.types';

interface SubscriptionContextType {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  isPro: boolean;
  monthlyUsage: number;
  maxInvoices: number | null;
  canCreateInvoice: boolean;
  startedAt: string | null;
  expiresAt: string | null;
  loading: boolean;
  isUpgradeModalOpen: boolean;
  openUpgradeModal: () => void;
  closeUpgradeModal: () => void;
  refreshSubscription: () => Promise<void>;
  hasFeature: (feature: ProFeatureName) => boolean;
  isProUser: () => boolean;
  getMonthlyInvoiceUsage: () => number;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [subInfo, setSubInfo] = useState<UserSubscriptionInfo>({
    userId: '',
    plan: 'free',
    status: 'free',
    isPro: false,
    monthlyUsage: 0,
    maxInvoices: 5,
    canCreateInvoice: true,
    startedAt: null,
    expiresAt: null,
  });
  const [loading, setLoading] = useState(true);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  const refreshSubscription = useCallback(async () => {
    if (!user?.id) {
      setSubInfo({
        userId: '',
        plan: 'free',
        status: 'free',
        isPro: false,
        monthlyUsage: 0,
        maxInvoices: 5,
        canCreateInvoice: true,
        startedAt: null,
        expiresAt: null,
      });
      setLoading(false);
      return;
    }

    try {
      const data = await fetchUserSubscription(user.id);
      setSubInfo(data);
    } catch (err) {
      console.error('Failed to refresh subscription status:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refreshSubscription();
  }, [refreshSubscription]);

  const openUpgradeModal = () => setIsUpgradeModalOpen(true);
  const closeUpgradeModal = () => setIsUpgradeModalOpen(false);

  const hasFeature = useCallback(
    (feature: ProFeatureName) => {
      return checkHasFeature(subInfo, feature);
    },
    [subInfo]
  );

  const isProUser = useCallback(() => {
    return checkIsProUser(subInfo);
  }, [subInfo]);

  const getMonthlyInvoiceUsage = useCallback(() => {
    return checkMonthlyUsage(subInfo);
  }, [subInfo]);

  return (
    <SubscriptionContext.Provider
      value={{
        plan: subInfo.plan,
        status: subInfo.status,
        isPro: subInfo.isPro,
        monthlyUsage: subInfo.monthlyUsage,
        maxInvoices: subInfo.maxInvoices,
        canCreateInvoice: subInfo.canCreateInvoice,
        startedAt: subInfo.startedAt,
        expiresAt: subInfo.expiresAt,
        loading,
        isUpgradeModalOpen,
        openUpgradeModal,
        closeUpgradeModal,
        refreshSubscription,
        hasFeature,
        isProUser,
        getMonthlyInvoiceUsage,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};
