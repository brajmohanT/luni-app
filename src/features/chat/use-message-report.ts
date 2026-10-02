import * as Crypto from 'expo-crypto';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useReportAssistantMessage } from '@/features/conversations/hooks';
import {
  messageReportRequestSchema,
  type MessageReportReason,
  type MessageReportReceipt,
} from '@/lib/api/types';
import type { ReportAssistantMessageInput } from '@/lib/queries/message-reports';
import { useAuth } from '@/providers/auth-provider';

type ReportDraft = {
  messageId: string;
  reason: MessageReportReason;
  details?: string;
};

export function useMessageReport() {
  const mutation = useReportAssistantMessage();
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const pendingRef = useRef<Readonly<ReportAssistantMessageInput> | null>(null);
  const inFlightRef = useRef<Readonly<ReportAssistantMessageInput> | null>(null);
  const accountRef = useRef(userId);
  const [pendingReport, setPendingReport] = useState<Readonly<ReportAssistantMessageInput> | null>(null);
  const [reportedMessageIds, setReportedMessageIds] = useState<ReadonlySet<string>>(() => new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (accountRef.current === userId) return;
    accountRef.current = userId;
    pendingRef.current = null;
    inFlightRef.current = null;
    setPendingReport(null);
    setReportedMessageIds(new Set());
    setIsSubmitting(false);
    setValidationError(null);
    mutation.reset();
  }, [mutation, userId]);

  const run = useCallback(async (
    report: Readonly<ReportAssistantMessageInput>,
  ): Promise<MessageReportReceipt | null> => {
    if (inFlightRef.current) return null;
    const submittingUserId = accountRef.current;
    inFlightRef.current = report;
    setIsSubmitting(true);
    setValidationError(null);
    try {
      const receipt = await mutation.mutateAsync(report);
      if (accountRef.current === submittingUserId && pendingRef.current === report) {
        pendingRef.current = null;
        setPendingReport(null);
        setReportedMessageIds(current => new Set(current).add(report.messageId));
      }
      return receipt;
    } catch {
      return null;
    } finally {
      if (inFlightRef.current === report) {
        inFlightRef.current = null;
        setIsSubmitting(false);
      }
    }
  }, [mutation]);

  const submitReport = useCallback((draft: ReportDraft) => {
    if (inFlightRef.current || pendingRef.current) return Promise.resolve(null);
    const details = draft.details?.trim();
    const result = messageReportRequestSchema.safeParse({
      reason: draft.reason,
      clientRequestId: Crypto.randomUUID(),
      ...(details ? { details } : {}),
    });
    if (!result.success) {
      setValidationError('Use no more than 1,000 characters for the report details.');
      return Promise.resolve(null);
    }
    const report = Object.freeze({
      messageId: draft.messageId,
      request: Object.freeze(result.data),
    });
    pendingRef.current = report;
    setPendingReport(report);
    return run(report);
  }, [run]);

  const retryReport = useCallback(() => {
    const report = pendingRef.current;
    return report ? run(report) : Promise.resolve(null);
  }, [run]);

  const discardReport = useCallback(() => {
    if (inFlightRef.current) return;
    pendingRef.current = null;
    setPendingReport(null);
    setValidationError(null);
    mutation.reset();
  }, [mutation]);

  return {
    submitReport,
    retryReport,
    discardReport,
    isReported: (messageId: string) => reportedMessageIds.has(messageId),
    isSubmitting,
    pendingMessageId: pendingReport?.messageId ?? null,
    requestId: pendingReport?.request.clientRequestId ?? null,
    error: mutation.error,
    validationError,
  };
}
