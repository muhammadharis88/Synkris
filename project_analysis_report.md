# Synkris - Final Year Project Architectural Report

**Date:** January 04, 2026
**Role:** Lead System Architect
**Project:** Synkris (Real-Time Collaborative AI Editor)

---

## 1. Project Concept & Scope

**Synkris** is an intelligent, real-time collaborative workspace designed to modernize the document editing experience by fusing synchronous multiplayer editing with generative AI assistance.

**The Core Problem:**
Traditional document workflows suffer from fragmentation and latency. Users often struggle with "version hell" (sending files back and forth), lack of context when working remotely, and the inefficiency of switching between an editor and an AI tool (like ChatGPT) to generate content. Synkris solves this by embedding the AI directly into the collaboration loop, allowing multiple users to edit, chat, and co-create with an AI assistant in a unified, real-time environment.

---

## 2. Functional Requirements

### User Management
*   **Authentication**: Secure login/signup via **Clerk** (supporting Email, Google, GitHub, etc.).
*   **Identity Management**: User profiles with synchronized avatars and names.

### Document Workspace
*   **Dashboard**: A centralized hub to manage own documents, search by title, and view shared files.
*   **Rich Text Editor**: A comprehensive WYSIWYG editor (Tiptap) supporting headings, lists, code blocks, bold/italic types, and more.
*   **Document Operations**: Create, rename, delete, and duplicate functionalities.

### Real-Time Collaboration
*   **Multiplayer Editing**: Multiple users can type simultaneously with changes appearing instantly for everyone.
*   **Presence Awareness**: Live cursors showing exactly where other users are looking and typing, color-coded by user.
*   **Paragraph Locking**: A concurrency control feature that allows users to "lock" a paragraph they are intensively editing to prevent interruptions.

### AI Assistance Engine
*   **Content Generation**: Generate complete document sections from a prompt (e.g., "Write a blog post intro").
*   **Smart Editing**: rewriting tools to fixing grammar, changing tone, or summarizing selected text.
*   **Contextual Integration**: The AI understands the document structure and inserts formatted HTML directly into the editor.

### Social & Sharing
*   **Granular Permissions**: Share documents with specific roles: **Viewer** (Read-only), **Commenter**, and **Editor**.
*   **Contextual Chat**: A built-in chat panel for every document to discuss changes without decluttering the main text.
*   **Notifications**: Alerts for new shares and relevant activities.

---

## 3. Non-Functional Requirements

*   **Scalability**: Built on a **Serverless** architecture (Next.js + Convex). The backend functions and database scale automatically to handle traffic spikes without manual provisioning.
*   **Reliability**: Data is persisted in a distributed transactional database (Convex) ensuring strong consistency for critical metadata (permissions, titles) and eventual consistency for document content.
*   **Performance**: Optimized for **<100ms latency** in collaboration using WebSocket edge networks. UI interactions use "Optimistic Updates" to feel instant before server confirmation.
*   **Availability**: The application is robust against network jitters, caching the document state locally to allow continued viewing during temporary disconnections.

---

## 4. System Architecture

Synkris employs a modern **Edge-First, Serverless** architecture:

1.  **Frontend (Next.js 15)**: Handles the User Interface, utilizing React Server Components for initial load performance and Client Components for the interactive editor.
2.  **Database & Backend (Convex)**: A reactive, real-time database that pushes updates to the client. It replaces traditional REST endpoints with query subscriptions, ensuring the UI is always in sync with the DB.
3.  **Collaboration Layer (Liveblocks)**: A specialized WebSocket infrastructure dedicated to ephemeral state (presence) and high-frequency document synchronization (CRDTs).
4.  **Auth Provider (Clerk)**: Manages sessions and identity tokens, integrating seamlessly with the Convex backend for secure data access.
5.  **AI Gateway (OpenRouter)**: A centralized proxy ensuring access to top-tier LLMs (Google Gemini, GPT-4) while managing API keys and rate limiting securely on the server side.

---

## 5. Distributed Computing Implementation

Synkris forces a paradigm shift from "Centralized Processing" to **Distributed State Management**:

*   **Conflict-Free Replicated Data Types (CRDTs)**:
    *   *Where*: The document content state.
    *   *Why*: Used to handle concurrent edits. Instead of a central server deciding "who typed first", every client runs a deterministic algorithm (Y.js) to merge changes. This allows the system to work in a distributed manner where every user has a local copy that eventually converges with others.
*   **Ephemeral Broadcasting**:
    *   *Where*: Cursor positions and online status.
    *   *Why*: This high-velocity data (hundreds of updates per minute per user) is broadcasted peer-to-peer (or via a lightweight relay) without ever touching the persistent database, reducing write load and latency.

---

## 6. AI Assistance Engine

**Models**: The system utilizes high-performance models like **Google Gemini Pro** or **GPT-4o** accessed via OpenRouter.

**Integration Strategy**:
The AI is implemented as a **Stateless Transactional Agent**:
1.  **Input**: The user selects text or places the cursor.
2.  **Processing**: The backend (`/api/ai-assistant`) constructs a prompt containing the user request and specific formatting instructions ("Return valid HTML", "Do not use Markdown").
3.  **Output**: The AI returns HTML fragments.
4.  **Application**: The frontend sanitizes this response and parses it into ProseMirror nodes, seamlessly injecting it into the collaborative state as if a user had typed it incredibly fast.

---

## 7. Real-Time Synchronization & Conflict Resolution

**Theory: CRDTs (Y.js) vs Operational Transformation (OT)**
Synkris uses **CRDTs**, specifically the Y.js protocol via Liveblocks.

*   **Logic**: Every character typed is assigned a unique ID (Lamport Timestamp + Client ID).
*   **Scenario**:
    *   Alice types "A" at index 0.
    *   Bob types "B" at index 0.
    *   *OT (Legacy)*: Needs a server to decide that "A" comes before "B".
    *   *CRDT (Synkris)*: Applications independently sort the insertions based on their unique IDs. If Alice's ID is "lower", the text becomes "AB". If Bob's is "lower", it becomes "BA". Both users end up with the exact same result mathematically, ensuring zero data loss and no "merge conflicts" for the user to resolve manually.

---

## 8. Complete Workflow

1.  **Authentication**: User signs in; Clerk mints a JWT.
2.  **Workspace Entry**: User loads Dashboard; Convex subscribes to `listDocuments()`.
3.  **Document Initialization**: User creates a doc. They are redirected to the editor.
4.  **Room Connection**: The browser establishes a WebSocket connection to Liveblocks, authenticating with the Convex token.
5.  **The Collaboration Loop**:
    *   User types "Hello".
    *   Local Y.js document updates.
    *   Update is broadcast to the room.
    *   Collaborator's Y.js receives update and merges it.
6.  **AI Augmentation**: User selects "Hello", asks AI to "Make it formal". AI returns "Greetings". The text is replaced atomically.
7.  **Data Persistence**: While the collaboration happens in-memory (CRDT), the document state is periodically saved (marshaled) to the Convex database for permanent storage.

---

## 9. Security & Data Privacy

*   **Encryption**: End-to-end TLS encryption for all data in transit.
*   **Row-Level Security (RLS)**:
    *   Database queries are not open. Every query in Convex (e.g., `getDocuments`) runs a programmatic check: `if (doc.ownerId !== user.id && !doc.sharedWith.includes(user.id)) throw Error("Unauthorized")`.
*   **Token validation**: The "Join Room" endpoint verifies the user's identity and permissions *before* allowing them into the WebSocket channel.
*   **Private Documents**: By default, documents are private. The sharing mechanism explicitly whitelists users via the `document_shares` table.

---

## 10. Database Design

The data model uses a relational-like schema within Convex:

*   **`users`**:
    *   `tokenIdentifier`: Link to Clerk identity.
    *   `name`, `email`, `image`: Display info.
*   **`documents`**:
    *   `title`: Document name.
    *   `ownerId`: Reference to creating user.
    *   `initialContent`: Serialized snapshot of content.
*   **`document_shares`**: (The Permission Matrix)
    *   `documentId`: Reference to Document.
    *   `userId`: Reference to User.
    *   `role`: 'viewer' | 'commenter' | 'editor'.
*   **`messages`**: (Chat History)
    *   `documentId`, `userId`, `content`, `timestamp`.

---

## 11. Technical Challenges

1.  **Rich Text Serialization**:
    *   *Challenge*: Translating the AI's raw text/HTML output into the complex JSON tree structure required by the Tiptap editor without breaking the real-time sync.
    *   *Solution*: Implemented a parser on the client side that takes the AI response and uses Tiptap's transactional methods (`editor.chain().insertContent()`) to safely merge the new nodes.
    
2.  **Dual-State Management**:
    *   *Challenge*: Keeping the Convex database (metadata) and Liveblocks room (content) in sync.
    *   *Solution*: Separation of concerns. Convex is the source of truth for *existence and permissions*. Liveblocks is the source of truth for *interactive content*. Content is only "saved" to Convex for cold-storage/indexing.

3.  **Authentication Handshake**:
    *   *Challenge*: Passing secure tokens from a 3rd party (Clerk) to the backend (Convex) and then to the real-time service (Liveblocks).
    *   *Solution*: A JWT-based chain where the Convex backend acts as the "authority", minting a temporary specialized token for Liveblocks only after verifying the user's Clerk credentials and database permissions.

---
