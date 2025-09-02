# Rocket.Chat Schemas and Data Models

## Overview

This document defines the data schemas and models used throughout the Rocket.Chat API. These schemas represent the structure of objects returned by API endpoints and expected in request payloads.

## Core Models

### User Model

```typescript
interface IUser {
  _id: string;
  username: string;
  emails: Array<{
    address: string;
    verified: boolean;
  }>;
  status: 'online' | 'away' | 'busy' | 'offline';
  statusConnection: 'online' | 'away' | 'busy' | 'offline';
  statusText?: string;
  name?: string;
  bio?: string;
  avatarUrl?: string;
  avatarETag?: string;
  language?: string;
  createdAt: Date;
  _updatedAt: Date;
  roles: string[];
  type: 'user' | 'bot' | 'app';
  active: boolean;
  services?: {
    password?: {
      bcrypt: string;
    };
    email?: {
      verificationTokens: Array<{
        token: string;
        address: string;
        when: Date;
      }>;
    };
    resume?: {
      loginTokens: Array<{
        when: Date;
        hashedToken: string;
      }>;
    };
    google?: any;
    facebook?: any;
    github?: any;
    gitlab?: any;
    linkedin?: any;
    twitter?: any;
    saml?: any;
    ldap?: any;
    oauth?: any;
  };
  customFields?: Record<string, any>;
  settings?: {
    preferences?: {
      enableAutoAway?: boolean;
      idleTimeLimit?: number;
      desktopNotificationRequireInteraction?: boolean;
      desktopNotifications?: string;
      mobileNotifications?: string;
      unreadAlert?: boolean;
      useEmojis?: boolean;
      convertAsciiEmoji?: boolean;
      autoImageLoad?: boolean;
      saveMobileBandwidth?: boolean;
      collapseMediaByDefault?: boolean;
      hideUsernames?: boolean;
      hideRoles?: boolean;
      hideFlexTab?: boolean;
      displayAvatars?: boolean;
      sidebarGroupByType?: boolean;
      sidebarViewMode?: 'extended' | 'medium' | 'condensed';
      sidebarDisplayAvatar?: boolean;
      sidebarShowUnread?: boolean;
      sidebarSortby?: 'activity' | 'alphabetical';
      showMessageInMainThread?: boolean;
      sidebarShowFavorites?: boolean;
      sendOnEnter?: 'normal' | 'alternative' | 'desktop';
      messageViewMode?: 'normal' | 'cozy' | 'compact';
      emailNotificationMode?: 'all' | 'mentions' | 'nothing';
      newRoomNotification?: string;
      newMessageNotification?: string;
      muteFocusedConversations?: boolean;
      notificationsSoundVolume?: number;
    };
  };
  requirePasswordChange?: boolean;
  requirePasswordChangeReason?: string;
  e2e?: {
    public_key?: string;
    private_key?: string;
  };
  lastLogin?: Date;
  banners?: Record<string, any>;
  utcOffset?: number;
}
```

### Room Model

```typescript
interface IRoom {
  _id: string;
  t: 'c' | 'p' | 'd' | 'l'; // channel, private group, direct message, livechat
  name?: string;
  fname?: string;
  msgs: number;
  usersCount: number;
  u: {
    _id: string;
    username: string;
    name?: string;
  };
  customFields?: Record<string, any>;
  broadcast?: boolean;
  encrypted?: boolean;
  ts: Date;
  ro?: boolean; // read-only
  default?: boolean;
  sysMes?: boolean | string[];
  _updatedAt: Date;
  lastMessage?: IMessage;
  lm?: Date; // last message date
  topic?: string;
  announcement?: string;
  announcementDetails?: {
    enabled: boolean;
    style: string;
  };
  description?: string;
  archived?: boolean;
  avatarETag?: string;
  teamId?: string;
  teamMain?: boolean;
  teamDefault?: boolean;
  featured?: boolean;
  usernames?: string[];
  muted?: string[];
  unmuted?: string[];
  jitsiTimeout?: Date;
  departmentId?: string;
  livechatData?: {
    tags?: string[];
    sla?: string;
    topic?: string;
  };
  retention?: {
    enabled: boolean;
    maxAge: number;
    excludePinned: boolean;
    filesOnly: boolean;
    overrideGlobal: boolean;
  };
}
```

### Message Model

```typescript
interface IMessage {
  _id: string;
  rid: string;
  msg: string;
  ts: Date;
  u: {
    _id: string;
    username: string;
    name?: string;
  };
  _updatedAt: Date;
  editedAt?: Date;
  editedBy?: {
    _id: string;
    username: string;
  };
  urls?: Array<{
    url: string;
    meta?: Record<string, any>;
    headers?: Record<string, any>;
    parsedUrl?: {
      host: string;
      hostname: string;
      hash: string;
      pathname: string;
      protocol: string;
      port?: string;
      query?: string;
      search?: string;
      auth?: string;
    };
  }>;
  attachments?: IAttachment[];
  alias?: string;
  avatar?: string;
  groupable?: boolean;
  parseUrls?: boolean;
  bot?: {
    i: string;
  };
  mentions?: Array<{
    _id: string;
    username: string;
    name?: string;
  }>;
  channels?: Array<{
    _id: string;
    name: string;
  }>;
  reactions?: Record<string, {
    usernames: string[];
    names?: string[];
  }>;
  starred?: Array<{
    _id: string;
  }>;
  pinned?: boolean;
  pinnedAt?: Date;
  pinnedBy?: {
    _id: string;
    username: string;
  };
  unread?: boolean;
  temp?: boolean;
  drid?: string; // discussion room id
  dcount?: number; // discussion count
  dlm?: Date; // discussion last message
  tmid?: string; // thread message id
  tcount?: number; // thread count
  tlm?: Date; // thread last message
  replies?: string[]; // user ids who replied
  file?: {
    _id: string;
    name: string;
    type: string;
    size?: number;
  };
  files?: Array<{
    _id: string;
    name: string;
    type: string;
    size?: number;
    description?: string;
  }>;
  md?: Array<{
    type: string;
    value: any;
  }>;
  blocks?: any[];
  e2e?: 'pending' | 'done';
  t?: string; // message type
  role?: string;
  draftMessage?: string;
}
```

### Attachment Model

```typescript
interface IAttachment {
  title?: string;
  title_link?: string;
  title_link_download?: boolean;
  type?: string;
  description?: string;
  author_name?: string;
  author_link?: string;
  author_icon?: string;
  text?: string;
  image_url?: string;
  image_type?: string;
  image_size?: number;
  image_dimensions?: {
    width: number;
    height: number;
  };
  audio_url?: string;
  audio_type?: string;
  audio_size?: number;
  video_url?: string;
  video_type?: string;
  video_size?: number;
  fields?: Array<{
    short?: boolean;
    title: string;
    value: string;
  }>;
  actions?: Array<{
    type: 'button';
    text: string;
    url?: string;
    image_url?: string;
    is_webview?: boolean;
    webview_height_ratio?: 'compact' | 'tall' | 'full';
    msg?: string;
    msg_in_chat_window?: boolean;
    msg_processing_type?: 'sendMessage' | 'respondWithMessage';
  }>;
  actionButtonsAlignment?: 'vertical' | 'horizontal';
  button_alignment?: 'vertical' | 'horizontal';
  color?: string;
  thumb_url?: string;
  message_link?: string;
  collapsed?: boolean;
  ts?: Date;
  attachments?: IAttachment[]; // nested attachments
}
```

### Subscription Model

```typescript
interface ISubscription {
  _id: string;
  rid: string;
  name: string;
  fname?: string;
  t: 'c' | 'p' | 'd' | 'l';
  u: {
    _id: string;
    username: string;
    name?: string;
  };
  open: boolean;
  alert: boolean;
  unread: number;
  userMentions: number;
  groupMentions: number;
  ts: Date;
  ls?: Date; // last seen
  lr?: Date; // last read
  _updatedAt: Date;
  roles?: string[];
  f?: boolean; // favorite
  customFields?: Record<string, any>;
  blocked?: boolean;
  blocker?: boolean;
  autoTranslate?: boolean;
  autoTranslateLanguage?: string;
  disableNotifications?: boolean;
  hideUnreadStatus?: boolean;
  hideMentionStatus?: boolean;
  muteGroupMentions?: boolean;
  desktopNotifications?: 'all' | 'mentions' | 'nothing';
  mobilePushNotifications?: 'all' | 'mentions' | 'nothing';
  emailNotifications?: 'all' | 'mentions' | 'nothing';
  audioNotifications?: 'all' | 'mentions' | 'nothing';
  audioNotificationValue?: string;
  desktopNotificationDuration?: number;
  desktopPrefOrigin?: 'user' | 'subscription';
  mobilePrefOrigin?: 'user' | 'subscription';
  emailPrefOrigin?: 'user' | 'subscription';
  audioPrefOrigin?: 'user' | 'subscription';
  archived?: boolean;
  E2EKey?: string;
  E2ESuggestedKey?: string;
  unreadAlert?: 'all' | 'mentions' | 'nothing';
  prid?: string; // parent room id for discussions
}
```

### Integration Model

```typescript
interface IIntegration {
  _id: string;
  type: 'webhook-incoming' | 'webhook-outgoing';
  name: string;
  enabled: boolean;
  username: string;
  urls?: string[];
  url?: string;
  channel?: string[];
  triggerWords?: string[];
  alias?: string;
  avatar?: string;
  emoji?: string;
  token?: string;
  scriptEnabled?: boolean;
  script?: string;
  scriptCompiled?: string;
  scriptError?: string;
  impersonateUser?: boolean;
  event?: string;
  targetRoom?: string;
  triggerWordAnywhere?: boolean;
  runOnEdits?: boolean;
  _createdAt: Date;
  _createdBy: {
    _id: string;
    username: string;
  };
  _updatedAt: Date;
  _updatedBy?: {
    _id: string;
    username: string;
  };
  userId: string;
  history?: Array<{
    type: string;
    step: string;
    integration: {
      _id: string;
    };
    event: string;
    _createdAt: Date;
    _updatedAt: Date;
    data?: any;
    error?: boolean;
    errorStack?: string;
  }>;
}
```

### Setting Model

```typescript
interface ISetting {
  _id: string;
  i18nLabel?: string;
  i18nDescription?: string;
  type: 'boolean' | 'string' | 'int' | 'select' | 'multiSelect' | 'code' | 'color' | 'font' | 'language' | 'action' | 'asset' | 'roomPick' | 'group' | 'timezone' | 'date' | 'lookup';
  public?: boolean;
  group?: string;
  section?: string;
  hidden?: boolean;
  blocked?: boolean;
  sorter?: number;
  value: any;
  packageValue?: any;
  valueSource?: string;
  meteorSettingsValue?: any;
  ts?: Date;
  _updatedAt?: Date;
  createdAt?: Date;
  enableQuery?: string | object;
  displayQuery?: string | object;
  alert?: string;
  actionText?: string;
  values?: Array<{
    key: string;
    i18nLabel: string;
  }>;
  wizard?: {
    step?: number;
    order?: number;
  };
  enterprise?: boolean;
  invalidValue?: any;
  modules?: string[];
  requiredOnWizard?: boolean;
  secret?: boolean;
}
```

### Permission Model

```typescript
interface IPermission {
  _id: string;
  roles: string[];
  _updatedAt?: Date;
  level?: 'settings' | 'permissions';
  settingId?: string;
  group?: string;
  groupPermissionId?: string;
  sorter?: number;
}
```

### Role Model

```typescript
interface IRole {
  _id: string;
  name: string;
  scope: 'Users' | 'Subscriptions';
  description?: string;
  protected?: boolean;
  mandatory2fa?: boolean;
  _updatedAt: Date;
}
```

### Upload/File Model

```typescript
interface IUpload {
  _id: string;
  name: string;
  size: number;
  type: string;
  extension?: string;
  description?: string;
  store?: string;
  rid?: string;
  userId: string;
  complete: boolean;
  uploading?: boolean;
  progress?: number;
  etag?: string;
  path?: string;
  token?: string;
  uploadedAt: Date;
  url?: string;
  _updatedAt?: Date;
  instanceId?: string;
  identify?: {
    format?: string;
    size?: {
      width?: number;
      height?: number;
    };
  };
  typeGroup?: string;
}
```

### OAuth App Model

```typescript
interface IOAuthApp {
  _id: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  name: string;
  active: boolean;
  _createdAt: Date;
  _createdBy: {
    _id: string;
    username: string;
  };
  _updatedAt?: Date;
}
```

### Team Model

```typescript
interface ITeam {
  _id: string;
  name: string;
  type: 0 | 1; // 0: public, 1: private
  createdAt: Date;
  createdBy: {
    _id: string;
    username: string;
  };
  _updatedAt: Date;
  roomId: string;
  numberOfChannels?: number;
  numberOfUsers?: number;
}
```

## API Response Models

### Success Response

```typescript
interface ISuccessResponse<T> {
  success: true;
  data?: T;
  count?: number;
  offset?: number;
  total?: number;
}
```

### Error Response

```typescript
interface IErrorResponse {
  success: false;
  error: string;
  errorType?: string;
  details?: any;
  statusCode?: number;
}
```

### Pagination Response

```typescript
interface IPaginatedResponse<T> {
  success: true;
  items: T[];
  count: number;
  offset: number;
  total: number;
}
```

## Request Models

### Login Request

```typescript
interface ILoginRequest {
  user?: string;
  username?: string;
  email?: string;
  password: string;
  code?: string; // 2FA code
  resume?: string; // Resume token
}
```

### Message Request

```typescript
interface ISendMessageRequest {
  roomId?: string;
  channel?: string;
  text?: string;
  alias?: string;
  emoji?: string;
  avatar?: string;
  attachments?: IAttachment[];
  parseUrls?: boolean;
  tmid?: string; // Thread message ID
  customFields?: Record<string, any>;
}
```

### Room Creation Request

```typescript
interface ICreateRoomRequest {
  name: string;
  members?: string[];
  readOnly?: boolean;
  customFields?: Record<string, any>;
  extraData?: Record<string, any>;
  teamId?: string;
  encrypted?: boolean;
  retention?: {
    enabled: boolean;
    maxAge: number;
    excludePinned: boolean;
    filesOnly: boolean;
    overrideGlobal: boolean;
  };
}
```

### User Registration Request

```typescript
interface IRegisterUserRequest {
  username: string;
  email: string;
  pass: string;
  name: string;
  reason?: string;
  customFields?: Record<string, any>;
  secret?: string;
}
```

### User Update Request

```typescript
interface IUpdateUserRequest {
  userId?: string;
  data: {
    email?: string;
    name?: string;
    password?: string;
    username?: string;
    active?: boolean;
    roles?: string[];
    joinDefaultChannels?: boolean;
    requirePasswordChange?: boolean;
    sendWelcomeEmail?: boolean;
    verified?: boolean;
    customFields?: Record<string, any>;
  };
}
```

## Enum Types

### Room Types

```typescript
enum RoomType {
  Channel = 'c',
  PrivateGroup = 'p',
  DirectMessage = 'd',
  LiveChat = 'l'
}
```

### Message Types

```typescript
enum MessageType {
  Regular = '',
  UserJoined = 'uj',
  UserLeft = 'ul',
  UserAdded = 'au',
  UserRemoved = 'ru',
  UserMuted = 'user-muted',
  UserUnmuted = 'user-unmuted',
  RoleAdded = 'subscription-role-added',
  RoleRemoved = 'subscription-role-removed',
  RoomArchived = 'room-archived',
  RoomUnarchived = 'room-unarchived',
  MessageRemoved = 'rm',
  MessagePinned = 'message_pinned',
  WelcomeMessage = 'wm',
  RoomNameChanged = 'r',
  RoomTopicChanged = 'room_changed_topic',
  RoomDescriptionChanged = 'room_changed_description',
  RoomAnnouncementChanged = 'room_changed_announcement',
  RoomPrivacyChanged = 'room_changed_privacy',
  RoomE2EEnabled = 'room-e2e-enabled',
  RoomE2EDisabled = 'room-e2e-disabled',
  VideoCall = 'jitsi_call_started'
}
```

### User Status

```typescript
enum UserStatus {
  Online = 'online',
  Away = 'away',
  Busy = 'busy',
  Offline = 'offline'
}
```

### User Roles

```typescript
enum UserRole {
  Admin = 'admin',
  Moderator = 'moderator',
  Owner = 'owner',
  User = 'user',
  Bot = 'bot',
  Guest = 'guest',
  Anonymous = 'anonymous',
  AppUser = 'app',
  LivechatAgent = 'livechat-agent',
  LivechatManager = 'livechat-manager',
  LivechatGuest = 'livechat-guest'
}
```

## Special Fields

### Date Fields

All date fields use MongoDB date format:

```typescript
{
  "$date": number // Unix timestamp in milliseconds
}
```

### ID Fields

All `_id` fields are strings, typically MongoDB ObjectIds or custom string identifiers.

### Pagination Parameters

```typescript
interface IPaginationParams {
  offset?: number; // Default: 0
  count?: number; // Default: 50, Max: 100
  sort?: Record<string, 1 | -1>; // { fieldName: 1 } for ASC, -1 for DESC
  query?: Record<string, any>; // MongoDB query
  fields?: Record<string, 0 | 1>; // Field projection
}
```

## Validation Rules

### Username
- 2-30 characters
- Alphanumeric, dots, hyphens, and underscores only
- Cannot start or end with dots
- No consecutive dots

### Email
- Valid email format (RFC 5322)
- Maximum 254 characters

### Password
- Minimum 8 characters (configurable)
- Must contain at least one uppercase, lowercase, and number (configurable)

### Room Name
- 1-100 characters
- No special characters except hyphens and underscores

### Message
- Maximum 5000 characters (configurable)
- Supports markdown
- Supports @mentions and #channels

## Custom Fields

Custom fields can be added to Users, Rooms, and Messages:

```typescript
interface ICustomFields {
  [key: string]: string | number | boolean | Date | object | array;
}
```

Custom field names must:
- Start with a letter
- Contain only alphanumeric characters and underscores
- Be unique within the object type