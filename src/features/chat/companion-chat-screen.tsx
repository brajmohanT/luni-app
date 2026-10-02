import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

import { LuniLogo } from '@/design-system/components';
import { type Theme, useTheme } from '@/design-system/theme';
import { ChatComposer } from '@/features/chat/chat-composer';
import { MessageReportModal } from '@/features/chat/message-report-modal';
import { useChatComposer } from '@/features/chat/use-chat-composer';
import { useMessageReport } from '@/features/chat/use-message-report';
import { useCompanionMessages } from '@/features/conversations/hooks';
import { EntryRecovery } from '@/features/auth/entry-recovery';
import { entryFailure } from '@/features/auth/entry-failure';
import { SessionLoadingScreen } from '@/features/auth/session-loading-screen';
import { useMyProfile } from '@/features/profile/hooks';
import { useAuth } from '@/providers/auth-provider';
import { useQueryClient } from '@tanstack/react-query';
import { addCompletedSendToCache, conversationKeys } from '@/lib/queries/conversations';
import { isApiClientError } from '@/lib/api/errors';
import type {
  ChatRequest,
  ChatResponse,
  Message,
  MessageReportReason,
  ReplyTarget,
} from '@/lib/api/types';

const luniAvatar = require('../../../assets/brand/luni-chat-avatar.png');
const userAvatar = require('../../../assets/brand/user-chat-avatar.png');

const chatStarters = [
  'Let’s talk about my day',
  'Let’s talk about something light',
  'I’m not sure where to start',
] as const;

function calendarDay(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function formatDay(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (calendarDay(value) === calendarDay(today.toISOString())) return 'Today';
  if (calendarDay(value) === calendarDay(yesterday.toISOString())) return 'Yesterday';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric' });
}

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function reportFailure(error: unknown) {
  if (!error) return { message: null, canRetry: false };
  if (!isApiClientError(error)) {
    return { message: 'Couldn’t send your report. Check your connection and try again.', canRetry: true };
  }
  switch (error.code) {
    case 'REPORT_MESSAGE_NOT_FOUND':
      return { message: 'This response is no longer available to report.', canRetry: false };
    case 'REPORT_REQUEST_PAYLOAD_MISMATCH':
      return { message: 'This report cannot be retried. Close it and submit a new report.', canRetry: false };
    case 'VALIDATION_ERROR':
    case 'INVALID_JSON':
    case 'INVALID_REQUEST':
    case 'PAYLOAD_TOO_LARGE':
      return { message: 'Check the report details and submit it again.', canRetry: false };
    case 'MISSING_SESSION':
    case 'MISSING_ACCESS_TOKEN':
    case 'INVALID_ACCESS_TOKEN':
      return { message: 'Sign in again before reporting this response.', canRetry: false };
    case 'EMAIL_NOT_CONFIRMED':
      return { message: 'Confirm your email before reporting this response.', canRetry: false };
    case 'ACCOUNT_DELETION_IN_PROGRESS':
      return { message: 'Your account is being deleted, so it cannot submit new reports.', canRetry: false };
    default:
      if (error.code === 'NETWORK_ERROR' || error.code === 'INVALID_RESPONSE'
        || error.code === 'SERVICE_DRAINING' || error.code === 'SERVICE_UNAVAILABLE'
        || (error.status ?? 0) >= 500 || error.status === 429) {
        return { message: 'Couldn’t send your report. Check your connection and try again.', canRetry: true };
      }
      return { message: 'Couldn’t send this report. Close it and try again.', canRetry: false };
  }
}

function MessageRow({
  canReply,
  isReported,
  isReporting,
  message,
  onReport,
  onReply,
  showDay,
}: {
  canReply: boolean;
  isReported: boolean;
  isReporting: boolean;
  message: Message;
  onReport(messageId: string): void;
  onReply(reply: ReplyTarget): void;
  showDay: boolean;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => createMessageStyles(theme), [theme]);
  const isUserMessage = message.role === 'user';
  const isSystemMessage = message.role === 'system';

  return (
    <View>
      {showDay && <Text style={styles.day}>{formatDay(message.createdAt)}</Text>}
      {isSystemMessage ? (
        <Text style={styles.systemMessage}>{message.content}</Text>
      ) : (
        <View style={[styles.row, isUserMessage && styles.outgoingRow]}>
          <Image
            accessibilityLabel={isUserMessage ? 'Your profile picture' : 'Luni profile picture'}
            source={isUserMessage ? userAvatar : luniAvatar}
            style={styles.portrait}
          />
          <View style={[styles.messageBody, isUserMessage && styles.outgoingBody]}>
            <View style={[styles.meta, isUserMessage && styles.outgoingMeta]}>
              <Text style={styles.speaker}>{isUserMessage ? 'You' : 'Luni'}</Text>
              <Text style={styles.time}>{formatTime(message.createdAt)}</Text>
            </View>
            <View style={[styles.bubble, isUserMessage && styles.outgoingBubble]}>
              {message.replyToMessage && (
                <View style={[styles.quote, isUserMessage && styles.outgoingQuote]}>
                  <Text numberOfLines={3} style={[styles.quoteText, isUserMessage && styles.outgoingQuoteText]}>
                    {message.replyToMessage.content}
                  </Text>
                </View>
              )}
              <Text style={[styles.messageText, isUserMessage && styles.outgoingText]}>
                {message.content}
              </Text>
            </View>
            {!isUserMessage && (
              <View style={styles.messageActions}>
                <Pressable
                  accessibilityHint="Quotes this message in your next message"
                  accessibilityLabel="Reply to this message from Luni"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !canReply }}
                  disabled={!canReply}
                  onPress={() => onReply({ id: message.id, role: 'assistant', content: message.content })}
                  style={({ pressed }) => [
                    styles.messageAction,
                    !canReply && styles.messageActionDisabled,
                    pressed && canReply && styles.messageActionPressed,
                  ]}>
                  <Text style={styles.messageActionText}>Reply</Text>
                </Pressable>
                <Pressable
                  accessibilityHint={isReported ? undefined : 'Opens options for reporting unsafe or inappropriate content'}
                  accessibilityLabel={isReported ? 'This message from Luni has been reported' : 'Report this message from Luni'}
                  accessibilityRole="button"
                  accessibilityState={{ busy: isReporting, disabled: isReported || isReporting }}
                  disabled={isReported || isReporting}
                  onPress={() => onReport(message.id)}
                  style={({ pressed }) => [
                    styles.messageAction,
                    (isReported || isReporting) && styles.messageActionDisabled,
                    pressed && !isReported && !isReporting && styles.messageActionPressed,
                  ]}>
                  <Text style={styles.messageActionText}>
                    {isReported ? 'Reported' : isReporting ? 'Reporting…' : 'Report'}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

function FirstChatStarters({ onSelect }: { onSelect(value: string): void }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStarterStyles(theme), [theme]);
  return (
    <View accessibilityLabel="Conversation starters" style={styles.container}>
      <Text style={styles.hint}>Need a start? Tap to add, then send.</Text>
      {chatStarters.map((starter, index) => (
        <Pressable
          accessibilityHint="Adds this text to the message field"
          accessibilityRole="button"
          key={starter}
          onPress={() => onSelect(starter)}
          style={({ pressed }) => [
            styles.starter,
            index < chatStarters.length - 1 && styles.starterBorder,
            pressed && styles.starterPressed,
          ]}>
          <Text style={styles.starterText}>{starter}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function CompanionChatScreen() {
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isError,
    isFetchingNextPage,
    isPending,
    isRefetching,
    refetch,
  } = useCompanionMessages();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const chatStyles = useMemo(() => createChatStyles(theme), [theme]);
  const keyboardVerticalOffset = __DEV__ ? insets.top + theme.sizing.minimumTouchTarget : 0;
  const profile = useMyProfile();
  const client = useQueryClient();
  const { session } = useAuth();
  useEffect(() => {
    if (!__DEV__ || !error) return;
    if (isApiClientError(error)) {
      console.warn('Chat entry failed', {
        code: error.code,
        message: error.message,
        requestId: error.requestId,
        status: error.status,
      });
      return;
    }
    console.warn('Chat entry failed', error);
  }, [error]);
  const recover = async () => {
    if (isApiClientError(error) && error.code === 'COMPANION_CONVERSATION_NOT_FOUND' && session) {
      await client.invalidateQueries({ queryKey: conversationKeys.companion(session.user.id), refetchType: 'none' });
    }
    if (entryFailure(error, 'chat').action === 'profile') {
      const result = await profile.refetch();
      if (result.error) throw result.error;
      if (!result.data?.onboardingCompletedAt) return;
    }
    await refetch();
  };
  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);
  const listRef = useRef<FlatList<Message> | null>(null);
  const messageKeys = useRef(new Map<string, string>());
  const lastScrolledMessage = useRef<string | null>(null);
  const latestMessageId = useRef<string | null>(null);
  const shouldScrollToEnd = useRef(true);
  const scrollFrame = useRef<number | null>(null);
  const cancelScheduledScroll = useCallback(() => {
    if (scrollFrame.current !== null) cancelAnimationFrame(scrollFrame.current);
    scrollFrame.current = null;
  }, []);
  const scrollToLatest = useCallback(() => {
    cancelScheduledScroll();
    if (!shouldScrollToEnd.current || !latestMessageId.current
      || lastScrolledMessage.current === latestMessageId.current) return;
    scrollFrame.current = requestAnimationFrame(() => {
      scrollFrame.current = null;
      if (shouldScrollToEnd.current) {
        listRef.current?.scrollToOffset({ offset: 0, animated: false });
        lastScrolledMessage.current = latestMessageId.current;
      }
    });
  }, [cancelScheduledScroll]);
  useFocusEffect(useCallback(() => {
    shouldScrollToEnd.current = true;
    lastScrolledMessage.current = null;
    scrollToLatest();
    return () => {
      shouldScrollToEnd.current = false;
      cancelScheduledScroll();
    };
  }, [cancelScheduledScroll, scrollToLatest]));
  const showCompletedSend = useCallback((
    response: ChatResponse,
    request: Readonly<ChatRequest>,
    replyTarget: ReplyTarget | null,
  ) => {
    if (!session) return;
    shouldScrollToEnd.current = true;
    messageKeys.current.set(response.userMessageId, request.clientRequestId);
    addCompletedSendToCache(client, session.user.id, request, replyTarget, response);
  }, [client, session]);
  const composer = useChatComposer({
    onSuccess: showCompletedSend,
    messages: data?.messages,
  });
  const reporting = useMessageReport();
  const [reportMessageId, setReportMessageId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState<MessageReportReason | null>(null);
  const [reportDetails, setReportDetails] = useState('');
  const reportError = reportFailure(reporting.error);
  const composerInputRef = useRef<TextInput | null>(null);
  const [startersDismissed, setStartersDismissed] = useState(false);
  const newestId = composer.optimisticMessage?.id ?? data?.messages.at(-1)?.id ?? null;
  useLayoutEffect(() => {
    latestMessageId.current = newestId;
  }, [newestId]);

  if (isPending) return <SessionLoadingScreen message="Opening your conversation…" />;
  if (isError && (!data || entryFailure(error, 'chat').action !== 'retry')) {
    return <EntryRecovery error={error} target="chat" onRetry={recover} />;
  }

  if (!data) {
    return null;
  }
  // Offset zero is the newest message, so opening chat never requires estimating
  // the heights of all the older, unmeasured rows in the virtualized list.
  const messages = (composer.optimisticMessage
    ? [...data.messages, composer.optimisticMessage]
    : [...data.messages]).reverse();
  const showStarters = !startersDismissed && !composer.replyTarget
    && !data.messages.some(message => message.role === 'user')
    && !composer.draft.trim() && !composer.hasFailedSend && !composer.isSending;
  const selectStarter = (starter: string) => {
    composer.updateDraft(starter);
    requestAnimationFrame(() => composerInputRef.current?.focus());
  };
  const selectReply = (reply: ReplyTarget) => {
    composer.selectReply(reply);
    requestAnimationFrame(() => composerInputRef.current?.focus());
  };
  const openReport = (messageId: string) => {
    reporting.discardReport();
    setReportMessageId(messageId);
    setReportReason(null);
    setReportDetails('');
  };
  const closeReport = () => {
    if (reporting.isSubmitting) return;
    reporting.discardReport();
    setReportMessageId(null);
    setReportReason(null);
    setReportDetails('');
  };
  const submitReport = () => {
    if (!reportMessageId || !reportReason) return;
    void reporting.submitReport({
      messageId: reportMessageId,
      reason: reportReason,
      details: reportDetails,
    });
  };
  const loadEarlierMessages = () => {
    if (!hasNextPage || isFetchingNextPage) return;
    shouldScrollToEnd.current = false;
    void fetchNextPage();
  };

  // Keep the header outside the list while messages refresh independently.
  return (
    <SafeAreaView style={chatStyles.safeArea}>
      <KeyboardAvoidingView
        behavior="padding"
        keyboardVerticalOffset={keyboardVerticalOffset}
        style={chatStyles.screen}>
        <View style={chatStyles.header}>
          <View style={chatStyles.headerContent}>
            <View style={chatStyles.avatar}>
              <LuniLogo decorative size={24} />
            </View>
            <View style={chatStyles.headerText}>
              <Text accessibilityRole="header" style={chatStyles.headerTitle}>Luni</Text>
              <Text style={chatStyles.headerSubtitle}>Your AI companion</Text>
            </View>
          </View>
        </View>

        <View style={chatStyles.content}>
          {isError && <EntryRecovery error={error} target="chat" onRetry={recover} compact />}

          <FlatList
            contentContainerStyle={messages.length ? styles.messageList : styles.emptyList}
            data={messages}
            inverted
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            keyboardShouldPersistTaps="handled"
            keyExtractor={({ id }) => messageKeys.current.get(id) ?? id}
            removeClippedSubviews={false}
            ListFooterComponent={messages.length && hasNextPage ? (
              <Pressable
                accessibilityLabel={isFetchingNextPage ? 'Loading earlier messages' : 'Load earlier messages'}
                accessibilityRole="button"
                accessibilityState={{ busy: isFetchingNextPage, disabled: isFetchingNextPage }}
                disabled={isFetchingNextPage}
                onPress={loadEarlierMessages}
                style={({ pressed }) => [
                  chatStyles.loadEarlier,
                  pressed && chatStyles.loadEarlierPressed,
                ]}>
                {isFetchingNextPage && <ActivityIndicator color={theme.colors.primary} size="small" />}
                <Text accessibilityLiveRegion="polite" style={chatStyles.loadEarlierText}>
                  {isFetchingNextPage ? 'Loading earlier messages…' : 'Load earlier messages'}
                </Text>
              </Pressable>
            ) : null}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No messages yet</Text>
              </View>
            }
            onContentSizeChange={scrollToLatest}
            onScrollBeginDrag={() => {
              shouldScrollToEnd.current = false;
              cancelScheduledScroll();
            }}
            ref={listRef}
            refreshControl={(
              <RefreshControl
                colors={[theme.colors.primary]}
                onRefresh={refresh}
                progressBackgroundColor={theme.colors.canvas}
                refreshing={isRefetching}
                tintColor={theme.colors.primary}
              />
            )}
            renderItem={({ item, index }) => (
              <MessageRow
                canReply={composer.isEditable}
                isReported={reporting.isReported(item.id)}
                isReporting={reporting.isSubmitting && reporting.pendingMessageId === item.id}
                message={item}
                onReport={openReport}
                onReply={selectReply}
                showDay={index === messages.length - 1 || calendarDay(messages[index + 1].createdAt) !== calendarDay(item.createdAt)}
              />
            )}
            style={chatStyles.messages}
          />

          {showStarters && <FirstChatStarters onSelect={selectStarter} />}
          <ChatComposer {...composer}
            draft={composer.draft}
            errorMessage={composer.errorMessage}
            hasFailedSend={composer.hasFailedSend}
            isSending={composer.isSending}
            inputRef={composerInputRef}
            onChangeDraft={composer.updateDraft}
            onRetry={composer.retrySend}
            onSend={() => {
              setStartersDismissed(true);
              shouldScrollToEnd.current = true;
              composer.startSend();
            }}
            requestId={composer.requestId}
            validationError={composer.validationError}
          />
        </View>
      </KeyboardAvoidingView>
      <MessageReportModal
        canRetry={reportError.canRetry}
        details={reportDetails}
        errorMessage={reportError.message}
        isSubmitted={Boolean(reportMessageId && reporting.isReported(reportMessageId))}
        isSubmitting={reporting.isSubmitting}
        onChangeDetails={setReportDetails}
        onChangeReason={setReportReason}
        onClose={closeReport}
        onRetry={() => { void reporting.retryReport(); }}
        onSubmit={submitReport}
        reason={reportReason}
        validationError={reporting.validationError}
        visible={reportMessageId !== null}
      />
    </SafeAreaView>
  );
}

const createChatStyles = (theme: Theme) => StyleSheet.create({
  safeArea: {
    backgroundColor: theme.colors.canvas,
    flex: 1,
  },
  screen: {
    backgroundColor: theme.colors.canvas,
    flex: 1,
    overflow: 'hidden',
  },
  header: {
    borderBottomColor: theme.colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexShrink: 0,
  },
  headerContent: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
    maxWidth: 720,
    paddingBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    width: '100%',
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 15,
    height: theme.sizing.minimumTouchTarget,
    justifyContent: 'center',
    width: theme.sizing.minimumTouchTarget,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    ...theme.typography.title,
    color: theme.colors.text,
    letterSpacing: -0.72,
  },
  headerSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  content: {
    alignSelf: 'center',
    flex: 1,
    maxWidth: 720,
    minHeight: 0,
    width: '100%',
  },
  messages: {
    flex: 1,
    minHeight: 0,
  },
  loadEarlier: {
    alignItems: 'center',
    alignSelf: 'center',
    borderColor: theme.colors.border,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'center',
    marginBottom: theme.spacing.xl,
    minHeight: theme.sizing.minimumTouchTarget,
    paddingHorizontal: theme.spacing.lg,
  },
  loadEarlierPressed: { backgroundColor: theme.colors.composer },
  loadEarlierText: { ...theme.typography.caption, color: theme.colors.text },
});

const createMessageStyles = (theme: Theme) => StyleSheet.create({
  day: {
    ...theme.typography.messageMeta,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xxl,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  row: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xxl,
  },
  outgoingRow: { flexDirection: 'row-reverse' },
  portrait: { borderRadius: 22, height: 44, width: 44 },
  messageBody: { alignItems: 'flex-start', flex: 1, minWidth: 0 },
  outgoingBody: { alignItems: 'flex-end' },
  meta: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  outgoingMeta: { flexDirection: 'row-reverse' },
  speaker: { ...theme.typography.label, color: theme.colors.text },
  time: { ...theme.typography.messageMeta, color: theme.colors.textMuted },
  bubble: {
    backgroundColor: theme.colors.incomingBubble,
    borderRadius: theme.radii.message,
    maxWidth: theme.sizing.messageMaxWidth,
    paddingHorizontal: theme.sizing.messagePaddingHorizontal,
    paddingVertical: theme.sizing.messagePaddingVertical,
  },
  outgoingBubble: { backgroundColor: theme.colors.outgoingBubble },
  messageText: { ...theme.typography.message, color: theme.colors.text },
  outgoingText: { color: theme.colors.onPrimary },
  messageActions: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  messageAction: {
    alignItems: 'center',
    borderRadius: theme.radii.pill,
    justifyContent: 'center',
    minHeight: theme.sizing.minimumTouchTarget,
    paddingHorizontal: theme.spacing.md,
  },
  messageActionDisabled: { opacity: 0.45 },
  messageActionPressed: { backgroundColor: theme.colors.composer },
  messageActionText: { ...theme.typography.caption, color: theme.colors.textMuted },
  quote: {
    borderLeftColor: theme.colors.textMuted,
    borderLeftWidth: StyleSheet.hairlineWidth,
    marginBottom: theme.spacing.sm,
    paddingLeft: theme.spacing.md,
  },
  outgoingQuote: { borderLeftColor: theme.colors.onPrimary },
  quoteText: { ...theme.typography.secondary, color: theme.colors.textMuted },
  outgoingQuoteText: { color: theme.colors.onPrimary, opacity: 0.82 },
  systemMessage: {
    ...theme.typography.caption,
    alignSelf: 'center',
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xxl,
    maxWidth: 360,
    textAlign: 'center',
  },
});

const createStarterStyles = (theme: Theme) => StyleSheet.create({
  container: {
    marginBottom: theme.spacing.sm,
    marginHorizontal: theme.spacing.xl,
  },
  hint: { ...theme.typography.caption, color: theme.colors.textMuted, marginBottom: theme.spacing.sm },
  starter: {
    justifyContent: 'center',
    minHeight: theme.sizing.minimumTouchTarget,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
  },
  starterBorder: { borderBottomColor: theme.colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
  starterPressed: { backgroundColor: theme.colors.composer },
  starterText: { ...theme.typography.secondary, color: theme.colors.textMuted },
});

const styles = StyleSheet.create({
  emptyList: {
    flexGrow: 1,
  },
  emptyState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  emptyTitle: {
    color: '#667085',
    fontSize: 16,
  },
  messageList: {
    paddingBottom: 12,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
});
