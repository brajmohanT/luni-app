import { mutationOptions } from '@tanstack/react-query';

import { reportAssistantMessage } from '@/lib/api/message-reports';
import type { MessageReportRequest } from '@/lib/api/types';
import { withRequestTimeout } from '@/lib/api/with-request-timeout';
import { requireAccount } from '@/lib/queries/profile';

export type ReportAssistantMessageInput = {
  messageId: string;
  request: MessageReportRequest;
};

export function reportAssistantMessageMutationOptions(userId: string | undefined) {
  return mutationOptions({
    retry: false,
    networkMode: 'always',
    mutationFn: async ({ messageId, request }: ReportAssistantMessageInput) => {
      requireAccount(userId);
      return withRequestTimeout(signal => reportAssistantMessage(messageId, request, {
        expectedUserId: userId, signal,
      }));
    },
  });
}
