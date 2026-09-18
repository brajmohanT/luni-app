# Chat: new chat, send, failure, and retry

The current chat API is request-and-response. The app waits for the completed reply; it does not stream tokens.

```mermaid
flowchart TD
  list["Conversation list"] --> newChat["New chat route"]
  detail["Conversation detail route"] --> existingChat["Shared composer with conversation ID"]
  newChat --> newComposer["Shared composer without conversation ID"]

  newComposer --> draft["User writes a draft"]
  existingChat --> draft
  draft --> sendTap["User taps Send"]
  sendTap --> validate{"Trimmed message has 1 to 4000 characters?"}
  validate -->|No| validationError["Show local validation error"]
  validate -->|Yes| request["Create UUID clientRequestId and ChatRequest"]
  request --> post["POST /chat with bearer token"]
  post --> result{"Request result"}

  result -->|Success| accepted["Backend persists message and reply"]
  accepted --> invalidate["Invalidate conversation list and detail queries"]
  invalidate --> destination{"Request includes conversation ID?"}
  destination -->|No| openDetail["Replace route with returned conversation ID"]
  destination -->|Yes| reload["Reload persisted messages"]
  openDetail --> reload
  reload --> messages["Show user message and assistant reply"]

  result -->|Failure| failed["Keep the original ChatRequest in memory"]
  failed --> retry["Show error, request ID, and Retry"]
  retry --> retryTap["User taps Retry"]
  retryTap --> replay["Resend the same message and clientRequestId"]
  replay --> post

  failed --> edit["User edits the draft"]
  edit --> reset["Discard failed request and create a new UUID on Send"]
  reset --> draft
```

## Reliability rules

- `useChatComposer` creates a UUID before the first request and retains the complete `ChatRequest` after failure.
- Retry reuses the same `clientRequestId`. The backend uses it to replay a completed result or reject concurrent processing without creating a duplicate message.
- Editing a failed draft discards its pending request. The next send creates a new UUID.
- `useSendChatMessage` disables TanStack Query automatic mutation retry. The user chooses when to retry.
- On a successful new chat, the app routes to `/conversations/:conversationId`. On a successful existing-conversation send, the app refreshes its messages.
- Device-persisted drafts and pending requests are not implemented yet.
