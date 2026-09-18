# Conversations: list to detail

This flow covers server-backed conversation browsing. TanStack Query keeps the in-memory cache scoped to the authenticated user. SQLite caching is later work.

```mermaid
flowchart TD
  listRoute["/(app) conversation list"] --> listHook["useConversations"]
  listHook --> listKey["Query key: conversations, user ID, list"]
  listKey --> listRequest["GET /conversations with Supabase bearer token"]
  listRequest --> listResult{"Request result"}

  listResult -->|Loading| listLoading["Show loading screen"]
  listResult -->|Error| listError["Show retry state and request ID"]
  listError --> listRetry["Try again or pull to refresh"]
  listRetry --> listRequest
  listResult -->|Empty| empty["Show start-a-conversation state"]
  listResult -->|Success| rows["Render conversation rows"]

  rows --> tap["User taps a conversation"]
  tap --> detailRoute["/conversations/:conversationId"]
  detailRoute --> detailHook["useConversationMessages"]
  detailHook --> detailKey["Query key: conversations, user ID, detail, conversation ID"]
  detailKey --> detailRequest["GET /conversations/:conversationId/messages"]
  detailRequest --> detailResult{"Request result"}

  detailResult -->|Loading| detailLoading["Show loading screen"]
  detailResult -->|Error| detailError{"Conversation missing?"}
  detailError -->|Yes, 404| unavailable["Show unavailable state and return to list"]
  detailError -->|No| detailRetry["Show retry state"]
  detailRetry --> detailRequest
  detailResult -->|Success| messages["Render chronological messages"]
  messages --> refresh["Pull to refresh"]
  refresh --> detailRequest
```

## Implementation notes

- `src/features/conversations/hooks.ts` separates list and detail caches by user ID and conversation ID.
- `src/app/(app)/index.tsx` calls `GET /conversations`, renders loading, empty, error, and refresh states, then routes to the selected conversation.
- `src/app/(app)/conversations/[conversationId].tsx` calls `GET /conversations/{conversationId}/messages` and renders messages in API order.
- A `CONVERSATION_NOT_FOUND` error returns the user to the list. The backend hides conversations that do not belong to the authenticated user.
- Conversation titles currently fall back to “Conversation” because the current API returns `title: null`.
