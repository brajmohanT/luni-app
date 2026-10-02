import { z } from 'zod';

import { apiRequest } from '@/lib/api/client';
import {
  messageReportReceiptSchema,
  messageReportRequestSchema,
  type MessageReportReceipt,
  type MessageReportRequest,
} from '@/lib/api/types';

type MessageReportRequestOptions = {
  signal?: AbortSignal;
  expectedUserId?: string;
};

const messageIdSchema = z.uuid();

export function reportAssistantMessage(
  messageId: string,
  request: MessageReportRequest,
  options: MessageReportRequestOptions = {},
): Promise<MessageReportReceipt> {
  const parsedMessageId = messageIdSchema.parse(messageId);
  const body = messageReportRequestSchema.parse(request);

  return apiRequest({
    path: `/messages/${encodeURIComponent(parsedMessageId)}/reports`,
    method: 'POST',
    body,
    responseSchema: messageReportReceiptSchema,
    signal: options.signal,
    expectedUserId: options.expectedUserId,
    requestId: body.clientRequestId,
  });
}
