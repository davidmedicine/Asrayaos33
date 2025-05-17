Agent2Agent Protocol (A2A)
An open protocol enabling Agent-to-Agent interoperability, bridging the gap between opaque agentic systems.
Agent2Agent Protocol A2A
Feedback and Changes
Key Principles
More Detailed Discussions
Overview
Actors
Transport
Authentication and Authorization
Agent Card
Discovery
Representation
Agent-to-Agent Communication
Core Objects
Task
Artifact
Message
Part
Push Notifications
Sample Methods and JSON Responses
Agent Card
Send a Task
Get a Task
Cancel a Task
Set Task Push Notifications
Get Task Push Notifications
Multi-turn Conversations
Streaming Support
Resubscribe to Task
Non-textual Media
Structured output
Error Handling
Feedback and Changes
A2A is a work in progress and is expected to change based on community feedback. This repo contains the initial specification, documentation, and sample code. We will continue to update this repo with more features, more examples, specs, and libraries as they become available. When the spec and samples can graduate to a production quality SDK, we will declare version 1.0 and maintain stable releases.
Key Principles
Using A2A, agents accomplish tasks for end-users without sharing memory, thoughts, or tools. Instead the agents exchange context, status, instructions, and data in their native modalities.
Simple: Reuse existing standards
Enterprise Ready: Auth, Security, Privacy, Tracing, Monitoring
Async First: (Very) Long running-tasks and human-in-the-loop
Modality Agnostic: text, audio/video, forms, iframe, etc.
Opaque Execution Agents do not have to share thoughts, plans, or tools.
More Detailed Discussions
A2A and MCP
Enterprise Ready
Push Notifications
Agent Discovery
Overview
Actors
The A2A protocol has three actors:
User
The end-user (human or service) that is using an agentic system to accomplish tasks.
Client
The entity (service, agent, application) that is requesting an action from an opaque agent on behalf of the user.
Remote Agent (Server)
The opaque ("blackbox") agent which is the A2A server.
Transport
The protocol leverages HTTP for transport between the client and the remote agent. Depending on the capabilities of the client and the remote agent, they may leverage SSE for supporting streaming for receiving updates from the server.
A2A leverages JSON-RPC 2.0 as the data exchange format for communication between a Client and a Remote Agent.
Async
A2A clients and servers can use standard request/response patterns and poll for updates. However, A2A also supports streaming updates through SSE (while connected) and receiving push notifications while disconnected.
Authentication and Authorization
A2A models agents as enterprise applications (and can do so because A2A agents are opaque and do not share tools and resources). This quickly brings enterprise-readiness to agentic interop.
A2A follows Open API’s Authentication specification for authentication. Importantly, A2A agents do not exchange identity information within the A2A protocol. Instead, they obtain materials (such as tokens) out of band and transmit materials in HTTP headers and not in A2A payloads.
While A2A does not transmit identity in-band, servers do send authentication requirements in A2A payloads. At minimum, servers are expected to publish its requirements in its Agent Card. Thoughts about discovering agent cards is in this topic.
Clients should use one of the servers published authentication protocols to authenticate their identity and obtain credential material. A2A servers should authenticate every request and reject or challenge requests with standard HTTP response codes (401, 403), and authentication-protocol-specific headers and bodies (such as a HTTP 401 response with a WWW-Authenticate header indicating the required authentication schema, or OIDC discovery document at a well-known path). More details discussed in Enterprise Ready.
Note: If an agent requires that the client/user provide additional credentials during execution of a task (for example, to use a specific tool), the agent should return a task status of Input-Required with the payload being an Authentication structure. The client should, again, obtain credential material out of band to A2A.
Agent Card
Remote Agents that support A2A are required to publish an Agent Card in JSON format describing the agent’s capabilities/skills and authentication mechanism. Clients use the Agent Card information to identify the best agent that can perform a task and leverage A2A to communicate with that remote agent.
Discovery
We recommend host their Agent Card at https://base url/.well-known/agent.json. This is compatible with a DNS approach where the client finds the server IP via DNS and sends an HTTP GET to retrieve the agent card. We also anticipate that systems will maintain private registries (e.g. an ‘Agent Catalog’ or private marketplace, etc). More discussion can be found in this document.
Representation
Following is the proposed representation of an Agent Card
// An AgentCard conveys key information: // - Overall details (version, name, description, uses) // - Skills: A set of capabilities the agent can perform // - Default modalities/content types supported by the agent. // - Authentication requirements interface AgentCard { // Human readable name of the agent. // (e.g. "Recipe Agent") name: string; // A human-readable description of the agent. Used to assist users and // other agents in understanding what the agent can do. // (e.g. "Agent that helps users with recipes and cooking.") description: string; // A URL to the address the agent is hosted at. url: string; // The service provider of the agent provider?: { organization: string; url: string; }; // The version of the agent - format is up to the provider. (e.g. "1.0.0") version: string; // A URL to documentation for the agent. documentationUrl?: string; // Optional capabilities supported by the agent. capabilities: { streaming?: boolean; // true if the agent supports SSE pushNotifications?: boolean; // true if the agent can notify updates to client stateTransitionHistory?: boolean; //true if the agent exposes status change history for tasks }; // Authentication requirements for the agent. // Intended to match OpenAPI authentication structure. authentication: { schemes: string[]; // e.g. Basic, Bearer credentials?: string; //credentials a client should use for private cards }; // The set of interaction modes that the agent // supports across all skills. This can be overridden per-skill. defaultInputModes: string[]; // supported mime types for input defaultOutputModes: string[]; // supported mime types for output // Skills are a unit of capability that an agent can perform. skills: { id: string; // unique identifier for the agent's skill name: string; //human readable name of the skill // description of the skill - will be used by the client or a human // as a hint to understand what the skill does. description: string; // Set of tagwords describing classes of capabilities for this specific // skill (e.g. "cooking", "customer support", "billing") tags: string[]; // The set of example scenarios that the skill can perform. // Will be used by the client as a hint to understand how the skill can be // used. (e.g. "I need a recipe for bread") examples?: string[]; // example prompts for tasks // The set of interaction modes that the skill supports // (if different than the default) inputModes?: string[]; // supported mime types for input outputModes?: string[]; // supported mime types for output }[]; }
Agent-to-Agent Communication
The communication between a Client and a Remote Agent is oriented towards task completion where agents collaboratively fulfill an end-user’s request. A Task object allows a Client and a Remote Agent to collaborate for completing the submitted task.
A task can be completed by a remote agent immediately or it can be long-running. For long-running tasks, the client may poll the agent for fetching the latest status. Agents can also push notifications to the client via SSE (if connected) or through an external notification service.
Core Objects
Task
A Task is a stateful entity that allows Clients and Remote Agents to achieve a specific outcome and generate results. Clients and Remote Agents exchange Messages within a Task. Remote Agents generate results as Artifacts.
A Task is always created by a Client and the status is always determined by the Remote Agent. Multiple Tasks may be part of a common session (denoted by optional sessionId) if required by the client. To do so, the Client sets an optional sessionId when creating the Task.
The agent may:
fulfill the request immediately
schedule work for later
reject the request
negotiate a different modality
ask the client for more information
delegate to other agents and systems
Even after fulfilling the goal, the client can request more information or a change in the context of that same Task. (For example client: "draw a picture of a rabbit", agent: "<picture>", client: "make it red").
Tasks are used to transmit Artifacts (results) and Messages (thoughts, instructions, anything else). Tasks maintain a status and an optional history of status and Messages.
interface Task { id: string; // unique identifier for the task sessionId: string; // client-generated id for the session holding the task. status: TaskStatus; // current status of the task history?: Message[]; artifacts?: Artifact[]; // collection of artifacts created by the agent. metadata?: Record<string, any>; // extension metadata } // TaskState and accompanying message. interface TaskStatus { state: TaskState; message?: Message; //additional status updates for client timestamp?: string; // ISO datetime value } // sent by server during sendSubscribe or subscribe requests interface TaskStatusUpdateEvent { id: string; status: TaskStatus; final: boolean; //indicates the end of the event stream metadata?: Record<string, any>; } // sent by server during sendSubscribe or subscribe requests interface TaskArtifactUpdateEvent { id: string; artifact: Artifact; metadata?: Record<string, any>; } // Sent by the client to the agent to create, continue, or restart a task. interface TaskSendParams { id: string; sessionId?: string; //server creates a new sessionId for new tasks if not set message: Message; historyLength?: number; //number of recent messages to be retrieved // where the server should send notifications when disconnected. pushNotification?: PushNotificationConfig; metadata?: Record<string, any>; // extension metadata } type TaskState = | "submitted" | "working" | "input-required" | "completed" | "canceled" | "failed" | "unknown";
Artifact
Agents generate Artifacts as an end result of a Task. Artifacts are immutable, can be named, and can have multiple parts. A streaming response can append parts to existing Artifacts.
A single Task can generate many Artifacts. For example, "create a webpage" could create separate HTML and image Artifacts.
interface Artifact { name?: string; description?: string; parts: Part[]; metadata?: Record<string, any>; index: number; append?: boolean; lastChunk?: boolean; }
Message
A Message contains any content that is not an Artifact. This can include things like agent thoughts, user context, instructions, errors, status, or metadata.
All content from a client comes in the form of a Message. Agents send Messages to communicate status or to provide instructions (whereas generated results are sent as Artifacts).
A Message can have multiple parts to denote different pieces of content. For example, a user request could include a textual description from a user and then multiple files used as context from the client.
interface Message { role: "user" | "agent"; parts: Part[]; metadata?: Record<string, any>; }
Part
A fully formed piece of content exchanged between a client and a remote agent as part of a Message or an Artifact. Each Part has its own content type and metadata.
interface TextPart { type: "text"; text: string; } interface FilePart { type: "file"; file: { name?: string; mimeType?: string; // oneof { bytes?: string; //base64 encoded content uri?: string; //} }; } interface DataPart { type: "data"; data: Record<string, any>; } type Part = (TextPart | FilePart | DataPart) & { metadata: Record<string, any>; };
Push Notifications
A2A supports a secure notification mechanism whereby an agent can notify a client of an update outside of a connected session via a PushNotificationService. Within and across enterprises, it is critical that the agent verifies the identity of the notification service, authenticates itself with the service, and presents an identifier that ties the notification to the executing Task.
The target server of the PushNotificationService should be considered a separate service, and is not guaranteed (or even expected) to be the client directly. This PushNotificationService is responsible for authenticating and authorizing the agent and for proxying the verified notification to the appropriate endpoint (which could be anything from a pub/sub queue, to an email inbox or other service, etc).
For contrived scenarios with isolated client-agent pairs (e.g. local service mesh in a contained VPC, etc.) or isolated environments without enterprise security concerns, the client may choose to simply open a port and act as its own PushNotificationService. Any enterprise implementation will likely have a centralized service that authenticates the remote agents with trusted notification credentials and can handle online/offline scenarios. (This should be thought of similarly to a mobile Push Notification Service).
interface PushNotificationConfig { url: string; token?: string; // token unique to this task/session authentication?: { schemes: string[]; credentials?: string; }; } interface TaskPushNotificationConfig { id: string; //task id pushNotificationConfig: PushNotificationConfig; }
Sample Methods and JSON Responses
Agent Card
//agent card { "name": "Google Maps Agent", "description": "Plan routes, remember places, and generate directions", "url": "https://maps-agent.google.com", "provider": { "organization": "Google", "url": "https://google.com" }, "version": "1.0.0", "authentication": { "schemes": "OAuth2" }, "defaultInputModes": ["text/plain"], "defaultOutputModes": ["text/plain", "application/html"], "capabilities": { "streaming": true, "pushNotifications": false }, "skills": [ { "id": "route-planner", "name": "Route planning", "description": "Helps plan routing between two locations", "tags": ["maps", "routing", "navigation"], "examples": [ "plan my route from Sunnyvale to Mountain View", "what's the commute time from Sunnyvale to San Francisco at 9AM", "create turn by turn directions from Sunnyvale to Mountain View" ], // can return a video of the route "outputModes": ["application/html", "video/mp4"] }, { "id": "custom-map", "name": "My Map", "description": "Manage a custom map with your own saved places", "tags": ["custom-map", "saved-places"], "examples": [ "show me my favorite restaurants on the map", "create a visual of all places I've visited in the past year" ], "outputModes": ["application/html"] } ] }
Send a Task
Allows a client to send content to a remote agent to start a new Task, resume an interrupted Task or reopen a completed Task. A Task interrupt may be caused due to an agent requiring additional user input or a runtime error.
//Request { "jsonrpc": "2.0", "id": 1, "method":"tasks/send", "params": { "id": "de38c76d-d54c-436c-8b9f-4c2703648d64", "message": { "role":"user", "data": [{ "type":"text", "text": "tell me a joke" }] }, "metadata": {} } } //Response { "jsonrpc": "2.0", "id": 1, "result": { "id": "de38c76d-d54c-436c-8b9f-4c2703648d64", "sessionId": "c295ea44-7543-4f78-b524-7a38915ad6e4", "status": { "state": "completed", }, "artifacts": [{ "name":"joke", "parts": [{ "type":"text", "text":"Why did the chicken cross the road? To get to the other side!" }] }], "metadata": {} } }
Get a Task
Clients may use this method to retrieve the generated Artifacts for a Task. The agent determines the retention window for Tasks previously submitted to it. An agent may return an error code for Tasks that were past the retention window for an agent or for Tasks that are short-lived and not persisted by the agent.
The client may also request the last N items of history of the Task which will include all Messages, in order, sent by client and server. By default this is 0 (no history).
//Request { "jsonrpc": "2.0", "id": 1, "method":"tasks/get", "params": { "id": "de38c76d-d54c-436c-8b9f-4c2703648d64", "historyLength": 10, "metadata": {} } } //Response { "jsonrpc": "2.0", "id": 1, "result": { "id": "de38c76d-d54c-436c-8b9f-4c2703648d64", "sessionId": "c295ea44-7543-4f78-b524-7a38915ad6e4", "status": { "state": "completed" }, "artifacts": [{ "parts": [{ "type":"text", "text":"Why did the chicken cross the road? To get to the other side!" }] }], "history":[ { "role": "user", "parts": [ { "type": "text", "text": "tell me a joke" } ] } ], "metadata": {} } }
Cancel a Task
A client may choose to cancel previously submitted Tasks as shown below.
//Request { "jsonrpc": "2.0", "id": 1, "method":"tasks/cancel", "params": { "id": "de38c76d-d54c-436c-8b9f-4c2703648d64", "metadata": {} } } //Response { "jsonrpc": "2.0", "id": 1, "result": { "id": 1, "sessionId": "c295ea44-7543-4f78-b524-7a38915ad6e4", "status": { "state": "canceled" }, "metadata": {} } }
Set Task Push Notifications
Clients may configure a push notification URL for receiving an update on Task status change.
//Request { "jsonrpc": "2.0", "id": 1, "method":"tasks/pushNotification/set", "params": { "id": "de38c76d-d54c-436c-8b9f-4c2703648d64", "pushNotificationConfig": { "url": "https://example.com/callback", "authentication": { "schemes": ["jwt"] } } } } //Response { "jsonrpc": "2.0", "id": 1, "result": { "id": "de38c76d-d54c-436c-8b9f-4c2703648d64", "pushNotificationConfig": { "url": "https://example.com/callback", "authentication": { "schemes": ["jwt"] } } } }
Get Task Push Notifications
Clients may retrieve the currently configured push notification configuration for a Task using this method.
//Request { "jsonrpc": "2.0", "id": 1, "method":"tasks/pushNotification/get", "params": { "id": "de38c76d-d54c-436c-8b9f-4c2703648d64" } } //Response { "jsonrpc": "2.0", "id": 1, "result": { "id": "de38c76d-d54c-436c-8b9f-4c2703648d64", "pushNotificationConfig": { "url": "https://example.com/callback", "authentication": { "schemes": ["jwt"] } } } }
Multi-turn Conversations
A Task may pause to be executed on the remote agent if they require additional user input. When a Task is in input-required state, the client is required to provide additional input for the Task to resume processing on the remote agent.
The Message included in the input-required state must include the details indicating what the client must do. For example "fill out a form" or "log into SaaS service foo". If this includes structured data, the instruction should be sent as one Part and the structured data as a second Part.
//Request - seq 1 { "jsonrpc": "2.0", "id": 1, "method":"tasks/send", "params": { "id": "de38c76d-d54c-436c-8b9f-4c2703648d64", "message": { "role":"user", "parts": [{ "type":"text", "text": "request a new phone for me" }] }, "metadata": {} } } //Response - seq 2 { "jsonrpc": "2.0", "id": 1, "result": { "id": "de38c76d-d54c-436c-8b9f-4c2703648d64", "sessionId": "c295ea44-7543-4f78-b524-7a38915ad6e4", "status": { "state": "input-required", "message": { "parts": [{ "type":"text", "text":"Select a phone type (iPhone/Android)" }] } }, "metadata": {} } } //Request - seq 3 { "jsonrpc": "2.0", "id": 2, "method":"tasks/send", "params": { "id": "de38c76d-d54c-436c-8b9f-4c2703648d64", "sessionId": "c295ea44-7543-4f78-b524-7a38915ad6e4", "message": { "role":"user", "parts": [{ "type":"text", "text": "Android" }] }, "metadata": {} } } //Response - seq 4 { "jsonrpc": "2.0", "id": 2, "result": { "id": 1, "sessionId": "c295ea44-7543-4f78-b524-7a38915ad6e4", "status": { "state": "completed" }, "artifacts": [{ "name": "order-confirmation", "parts": [{ "type":"text", "text":"I have ordered a new Android device for you. Your request number is R12443" }], "metadata": {} }], "metadata": {} } }
Streaming Support
For clients and remote agents capable of communicating over HTTP with SSE, clients can send the RPC request with method tasks/sendSubscribe when creating a new Task. The remote agent can respond with a stream of TaskStatusUpdateEvents (to communicate status changes or instructions/requests) and TaskArtifactUpdateEvents (to stream generated results). Note that TaskArtifactUpdateEvents can append new parts to existing Artifacts. Clients can use task/get to retrieve the entire Artifact outside of the streaming. Agents must set final: true attribute at the end of the stream or if the agent is interrupted and require additional user input.
//Request { "method":"tasks/sendSubscribe", "params": { "id": "de38c76d-d54c-436c-8b9f-4c2703648d64", "sessionId": "c295ea44-7543-4f78-b524-7a38915ad6e4", "message": { "role":"user", "parts": [{ "type":"text", "text": "write a long paper describing the attached pictures" },{ "type":"file", "file": { "mimeType": "image/png", "data":"<base64-encoded-content>" } }] }, "metadata": {} } } //Response data: { "jsonrpc": "2.0", "id": 1, "result": { "id": 1, "status": { "state": "working", "timestamp":"2025-04-02T16:59:25.331844" }, "final": false } } data: { "jsonrpc": "2.0", "id": 1, "result": { "id": 1, "artifact": [ "parts": [ {"type":"text", "text": "<section 1...>"} ], "index": 0, "append": false, "lastChunk": false ] } } data: { "jsonrpc": "2.0", "id": 1, "result": { "id": 1, "artifact": [ "parts": [ {"type":"text", "text": "<section 2...>"} ], "index": 0, "append": true, "lastChunk": false ] } } data: { "jsonrpc": "2.0", "id": 1, "result": { "id": 1, "artifact": [ "parts": [ {"type":"text", "text": "<section 3...>"} ], "index": 0, "append": true, "lastChunk": true ] } } data: { "jsonrpc": "2.0", "id": 1, "result": { "id": 1, "status": { "state": "completed", "timestamp":"2025-04-02T16:59:35.331844" }, "final": true } }
Resubscribe to Task
A disconnected client may resubscribe to a remote agent that supports streaming to receive Task updates via SSE.
//Request { "method":"tasks/resubscribe", "params": { "id": "de38c76d-d54c-436c-8b9f-4c2703648d64", "metadata": {} } } //Response data: { "jsonrpc": "2.0", "id": 1, "result": { "id": "de38c76d-d54c-436c-8b9f-4c2703648d64", "artifact":[ "parts": [ {"type":"text", "text": "<section 2...>"} ], "index": 0, "append": true, "lastChunk":false ] } } data: { "jsonrpc": "2.0", "id": 1, "result": { "id": "de38c76d-d54c-436c-8b9f-4c2703648d64", "artifact":[ "parts": [ {"type":"text", "text": "<section 3...>"} ], "index": 0, "append": true, "lastChunk": true ] } } data: { "jsonrpc": "2.0", "id": 1, "result": { "id": 1, "status": { "state": "completed", "timestamp":"2025-04-02T16:59:35.331844" }, "final": true } }
Non-textual Media
Following is an example interaction between a client and an agent with non-textual data.
//Request - seq 1 { "jsonrpc": "2.0", "id": 9, "method":"tasks/send", "params": { "id": "de38c76d-d54c-436c-8b9f-4c2703648d64", "sessionId": "c295ea44-7543-4f78-b524-7a38915ad6e4", "message": { "role":"user", "parts": [{ "type":"text", "text": "Analyze the attached report and generate high level overview" },{ "type":"file", "file": { "mimeType": "application/pdf", "data":"<base64-encoded-content>" } }] }, "metadata": {} } } //Response - seq 2 { "jsonrpc": "2.0", "id": 9, "result": { "id": "de38c76d-d54c-436c-8b9f-4c2703648d64", "sessionId": "c295ea44-7543-4f78-b524-7a38915ad6e4", "status": { "state": "working", "message": { "role": "agent", "parts": [{ "type":"text", "text":"analysis in progress, please wait" }], "metadata": {} } }, "metadata": {} } } //Request - seq 3 { "jsonrpc": "2.0", "id": 10, "method":"tasks/get", "params": { "id": "de38c76d-d54c-436c-8b9f-4c2703648d64", "metadata": {} } } //Response - seq 4 { "jsonrpc": "2.0", "id": 9, "result": { "id": "de38c76d-d54c-436c-8b9f-4c2703648d64", "sessionId": "c295ea44-7543-4f78-b524-7a38915ad6e4", "status": { "state": "completed" }, "artifacts": [{ "parts": [{ "type":"text", "text":"<generated analysis content>" }], "metadata": {} }], "metadata": {} } }
Structured output
Both the client or the agent can request structured output from the other party.
//Request { "jsonrpc": "2.0", "id": 9, "method":"tasks/send", "params": { "id": "de38c76d-d54c-436c-8b9f-4c2703648d64", "sessionId": "c295ea44-7543-4f78-b524-7a38915ad6e4", "message": { "role":"user", "parts": [{ "type":"text", "text": "Show me a list of my open IT tickets", "metadata": { "mimeType": "application/json", "schema": { "type": "array", "items": { "type": "object", "properties": { "ticketNumber": { "type": "string" }, "description": { "type": "string" } } } } } }] }, "metadata": {} } } //Response { "jsonrpc": "2.0", "id": 9, "result": { "id": "de38c76d-d54c-436c-8b9f-4c2703648d64", "sessionId": "c295ea44-7543-4f78-b524-7a38915ad6e4", "status": { "state": "working", "message": { "role": "agent", "parts": [{ "type":"text", "text":"[{\"ticketNumber\":\"REQ12312\",\"description\":\"request for VPN access\"},{\"ticketNumber\":\"REQ23422\",\"description\":\"Add to DL - team-gcp-onboarding\"}]" }], "metadata": {} } }, "metadata": {} } }
Error Handling
Following is the ErrorMessage format for the server to respond to the client when it encounters an error processing the client request.
interface ErrorMessage { code: number; message: string; data?: any; }
The following are the standard JSON-RPC error codes that the server can respond with for error scenarios:
Error Code
Message
Description
-32700
JSON parse error
Invalid JSON was sent
-32600
Invalid Request
Request payload validation error
-32601
Method not found
Not a valid method
-32602
Invalid params
Invalid method parameters
-32603
Internal error
Internal JSON-RPC error
-32000 to -32099
Server error
Reserved for implementation specific error codes
-32001
Task not found
Task not found with the provided id
-32002
Task cannot be canceled
Task cannot be canceled by the remote agent
-32003
Push notifications not supported
Push Notification is not supported by the agent
-32004
Unsupported operation
Operation is not supported
-32005
Incompatible content types
Incompatible content types between client and an agent

-
A2A ❤️ MCP
TLDR; Agentic applications needs both A2A and MCP. We recommend MCP for tools and A2A for agents.
A2A ❤️ MCP
Why Protocols?
Complementary
Example
Intersection
Why Protocols?
Standard protocols are essential for enabling agentic interoperability, particularly in connecting agents to external systems. This is critical in two interconnected areas of innovation: Tools and Agents.
Tools are primitives with structured inputs and outputs and (typically) well-known behavior. Agents are autonomous applications that can accomplish novel tasks by using tools, reasoning, and user interactions. Agentic applications must to use both tools and agents to accomplish goals for their users.
Complementary
Model Context Protocol (MCP) is the emerging standard for connecting LLMs with data, resources, and tools. We already observe MCP standardizing ‘function calling’ across different models and frameworks. This is creating an ecosystem of tool service providers and dramatically lowering the complexity to connect agents with tools and data. We expect this trend to continue as more frameworks, service providers, and platforms adopt MCP.
A2A is focused on a different problem. A2A is an application level protocol that enables agents to collaborate in their natural modalities. It allows agents to communicate as agents (or as users) instead of as tools. We hope that A2A gains adoption as a complement to MCP that enables ecosystems of agents and will be working in the open with the community to make this happen.
Example
Let’s look at an example:
Consider an auto repair shop that fixes cars. The shop employs autonomous workers who use special-purpose tools (such as vehicle jacks, multimeters, and socket wrenches) to diagnose and repair problems. The workers often have to diagnose and repair problems they have not seen before. The repair process can involve extensive conversations with a customer, research, and working with part suppliers.
Now let's model the shop employees as AI agents:
MCP is the protocol to connect these agents with their structured tools (e.g. raise platform by 2 meters, turn wrench 4 mm to the right).
A2A is the protocol that enables end-users or other agents to work with the shop employees ("my car is making a rattling noise"). A2A enables ongoing back-and-forth communication and an evolving plan to achieve results ("send me a picture of the left wheel", "I notice fluid leaking. How long has that been happening?"). A2A also helps the auto shop employees work with other agents such as their part suppliers.
Intersection
We recommend that applications model A2A agents as MCP resources (represented by their AgentCard). The frameworks can then use A2A to communicate with their user, the remote agents, and other agents.

A2A json  - {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "A2A Protocol Schema",
    "description": "JSON Schema for A2A Protocol",
    "$defs": {
      "AgentAuthentication": {
        "properties": {
          "schemes": {
            "items": {
              "type": "string"
            },
            "title": "Schemes",
            "type": "array"
          },
          "credentials": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "default": null,
            "title": "Credentials"
          }
        },
        "required": [
          "schemes"
        ],
        "title": "AgentAuthentication",
        "type": "object"
      },
      "AgentCapabilities": {
        "properties": {
          "streaming": {
            "default": false,
            "title": "Streaming",
            "type": "boolean"
          },
          "pushNotifications": {
            "default": false,
            "title": "PushNotifications",
            "type": "boolean"
          },
          "stateTransitionHistory": {
            "default": false,
            "title": "Statetransitionhistory",
            "type": "boolean"
          }
        },
        "title": "AgentCapabilities",
        "type": "object"
      },
      "AgentCard": {
        "properties": {
          "name": {
            "title": "Name",
            "type": "string"
          },
          "description": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "default": null,
            "title": "Description"
          },
          "url": {
            "title": "Url",
            "type": "string"            
          },
          "provider": {
            "anyOf": [
              {
                "$ref": "#/$defs/AgentProvider"
              },
              {
                "type": "null"
              }
            ],
            "default": null
          },
          "version": {
            "title": "Version",
            "type": "string"
          },
          "documentationUrl": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "default": null,
            "title": "Documentationurl"
          },
          "capabilities": {
            "$ref": "#/$defs/AgentCapabilities"
          },
          "authentication": {
            "anyOf": [
              {
                "$ref": "#/$defs/AgentAuthentication"
              },
              {
                "type": "null"
              }
            ],
            "default": null
          },
          "defaultInputModes": {
            "default": [
              "text"
            ],
            "items": {
              "type": "string"
            },
            "title": "Defaultinputmodes",
            "type": "array"
          },
          "defaultOutputModes": {
            "default": [
              "text"
            ],
            "items": {
              "type": "string"
            },
            "title": "Defaultoutputmodes",
            "type": "array"
          },
          "skills": {
            "items": {
              "$ref": "#/$defs/AgentSkill"
            },
            "title": "Skills",
            "type": "array"
          }
        },
        "required": [
          "name",
          "url",
          "version",
          "capabilities",
          "skills"
        ],
        "title": "AgentCard",
        "type": "object"
      },
      "AgentProvider": {
        "properties": {
          "organization": {
            "title": "Organization",
            "type": "string"
          },
          "url": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "default": null,
            "title": "Url"
          }
        },
        "required": [
          "organization"
        ],
        "title": "AgentProvider",
        "type": "object"
      },
      "AgentSkill": {
        "properties": {
          "id": {
            "title": "Id",
            "type": "string"
          },
          "name": {
            "title": "Name",
            "type": "string"
          },
          "description": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "default": null,
            "title": "Description"
          },
          "tags": {
            "anyOf": [
              {
                "items": {
                  "type": "string"
                },
                "type": "array"
              },
              {
                "type": "null"
              }
            ],
            "default": null,
            "title": "Tags"
          },
          "examples": {
            "anyOf": [
              {
                "items": {
                  "type": "string"
                },
                "type": "array"
              },
              {
                "type": "null"
              }
            ],
            "default": null,
            "title": "Examples"
          },
          "inputModes": {
            "anyOf": [
              {
                "items": {
                  "type": "string"
                },
                "type": "array"
              },
              {
                "type": "null"
              }
            ],
            "default": null,
            "title": "Inputmodes"
          },
          "outputModes": {
            "anyOf": [
              {
                "items": {
                  "type": "string"
                },
                "type": "array"
              },
              {
                "type": "null"
              }
            ],
            "default": null,
            "title": "Outputmodes"
          }
        },
        "required": [
          "id",
          "name"
        ],
        "title": "AgentSkill",
        "type": "object"
      },
      "Artifact": {
        "properties": {
          "name": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "default": null,
            "title": "Name"
          },
          "description": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "default": null,
            "title": "Description"
          },
          "parts": {
            "items": {
              "$ref": "#/$defs/Part"
            },
            "title": "Parts",
            "type": "array"
          },
          "index": {
            "type": "integer",
            "default": 0,
            "title": "Index"
          },
          "append": {
            "anyOf": [
              {
                "type": "boolean"
              },
              {
                "type": "null"
              }
            ],
            "default": null,
            "title": "Append"
          },
          "lastChunk": {
            "anyOf": [
              {
                "type": "boolean"
              },
              {
                "type": "null"
              }
            ],
            "default": null,
            "title": "LastChunk"
          },
          "metadata": {
            "anyOf": [
              {
                "additionalProperties": {},
                "type": "object"
              },
              {
                "type": "null"
              }
            ],
            "default": null,
            "title": "Metadata"
          }
        },
        "required": [
          "parts"
        ],
        "title": "Artifact",
        "type": "object"
      },
      "AuthenticationInfo": {
        "additionalProperties": {},
        "properties": {
          "schemes": {
            "items": {
              "type": "string"
            },
            "title": "Schemes",
            "type": "array"
          },
          "credentials": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "default": null,
            "title": "Credentials"
          }
        },
        "required": [
          "schemes"
        ],
        "title": "AuthenticationInfo",
        "type": "object"
      },
      "PushNotificationNotSupportedError": {
        "properties": {
          "code": {
            "const": -32003,
            "default": -32003,
            "description": "Error code",
            "examples": [
              -32003
            ],
            "title": "Code",
            "type": "integer"
          },
          "message": {
            "const": "Push Notification is not supported",
            "default": "Push Notification is not supported",
            "description": "A short description of the error",
            "examples": [
              "Push Notification is not supported"
            ],
            "title": "Message",
            "type": "string"
          },
          "data": {
            "const": null,
            "default": null,
            "title": "Data"
          }
        },
        "required": [
          "code",
          "message",
          "data"
        ],
        "title": "PushNotificationNotSupportedError",
        "type": "object"
      },
      "CancelTaskRequest": {
        "properties": {
          "jsonrpc": {
            "const": "2.0",
            "default": "2.0",
            "title": "Jsonrpc",
            "type": "string"
          },
          "id": {
            "anyOf": [
              {
                "type": "integer"
              },
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Id"
          },
          "method": {
            "const": "tasks/cancel",
            "default": "tasks/cancel",
            "title": "Method",
            "type": "string"
          },
          "params": {
            "$ref": "#/$defs/TaskIdParams"
          }
        },
        "required": [
          "method",
          "params"
        ],
        "title": "CancelTaskRequest",
        "type": "object"
      },
      "CancelTaskResponse": {
        "properties": {
          "jsonrpc": {
            "const": "2.0",
            "default": "2.0",
            "title": "Jsonrpc",
            "type": "string"
          },
          "id": {
            "anyOf": [
              {
                "type": "integer"
              },
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Id"
          },
          "result": {
            "anyOf": [
              {
                "$ref": "#/$defs/Task"
              },
              {
                "type": "null"
              }
            ],
            "default": null
          },
          "error": {
            "anyOf": [
              {
                "$ref": "#/$defs/JSONRPCError"
              },
              {
                "type": "null"
              }
            ],
            "default": null
          }
        },
        "title": "CancelTaskResponse",
        "type": "object"
      },
      "DataPart": {
        "properties": {
          "type": {
            "const": "data",
            "default": "data",
            "description": "Type of the part",
            "examples": [
              "data"
            ],
            "title": "Type",
            "type": "string"
          },
          "data": {
            "additionalProperties": {},
            "title": "Data",
            "type": "object"
          },
          "metadata": {
            "anyOf": [
              {
                "additionalProperties": {},
                "type": "object"
              },
              {
                "type": "null"
              }
            ],
            "default": null,
            "title": "Metadata"
          }
        },
        "required": [
          "data"
        ],
        "title": "DataPart",
        "type": "object"
      },
      "FileContent": {
        "properties": {
          "name": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "default": null,
            "title": "Name"
          },
          "mimeType": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "default": null,
            "title": "Mimetype"
          },
          "bytes": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "default": null,
            "title": "Bytes"
          },
          "uri": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "default": null,
            "title": "Uri"
          }
        },
        "title": "FileContent",
        "type": "object",
        "description": "Represents the content of a file, either as base64 encoded bytes or a URI.\n\nEnsures that either 'bytes' or 'uri' is provided, but not both."
      },
      "FilePart": {
        "properties": {
          "type": {
            "const": "file",
            "default": "file",
            "description": "Type of the part",
            "examples": [
              "file"
            ],
            "title": "Type",
            "type": "string"
          },
          "file": {
            "$ref": "#/$defs/FileContent"
          },
          "metadata": {
            "anyOf": [
              {
                "additionalProperties": {},
                "type": "object"
              },
              {
                "type": "null"
              }
            ],
            "default": null,
            "title": "Metadata"
          }
        },
        "required": [
          "file"
        ],
        "title": "FilePart",
        "type": "object"
      },
      "GetTaskPushNotificationRequest": {
        "properties": {
          "jsonrpc": {
            "const": "2.0",
            "default": "2.0",
            "title": "Jsonrpc",
            "type": "string"
          },
          "id": {
            "anyOf": [
              {
                "type": "integer"
              },
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Id"
          },
          "method": {
            "const": "tasks/pushNotification/get",
            "default": "tasks/pushNotification/get",
            "title": "Method",
            "type": "string"
          },
          "params": {
            "$ref": "#/$defs/TaskIdParams"
          }
        },
        "required": [
          "method",
          "params"
        ],
        "title": "GetTaskPushNotificationRequest",
        "type": "object"
      },
      "GetTaskPushNotificationResponse": {
        "properties": {
          "jsonrpc": {
            "const": "2.0",
            "default": "2.0",
            "title": "Jsonrpc",
            "type": "string"
          },
          "id": {
            "anyOf": [
              {
                "type": "integer"
              },
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Id"
          },
          "result": {
            "anyOf": [
              {
                "$ref": "#/$defs/TaskPushNotificationConfig"
              },
              {
                "type": "null"
              }
            ],
            "default": null
          },
          "error": {
            "anyOf": [
              {
                "$ref": "#/$defs/JSONRPCError"
              },
              {
                "type": "null"
              }
            ],
            "default": null
          }
        },
        "title": "GetTaskPushNotificationResponse",
        "type": "object"
      },      
      "GetTaskRequest": {
        "properties": {
          "jsonrpc": {
            "const": "2.0",
            "default": "2.0",
            "title": "Jsonrpc",
            "type": "string"
          },
          "id": {
            "anyOf": [
              {
                "type": "integer"
              },
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Id"
          },
          "method": {
            "const": "tasks/get",
            "default": "tasks/get",
            "title": "Method",
            "type": "string"
          },
          "params": {
            "$ref": "#/$defs/TaskQueryParams"
          }
        },
        "required": [
          "method",
          "params"
        ],
        "title": "GetTaskRequest",
        "type": "object"
      },
      "GetTaskResponse": {
        "properties": {
          "jsonrpc": {
            "const": "2.0",
            "default": "2.0",
            "title": "Jsonrpc",
            "type": "string"
          },
          "id": {
            "anyOf": [
              {
                "type": "integer"
              },
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Id"
          },
          "result": {
            "anyOf": [
              {
                "$ref": "#/$defs/Task"
              },
              {
                "type": "null"
              }
            ],
            "default": null
          },
          "error": {
            "anyOf": [
              {
                "$ref": "#/$defs/JSONRPCError"
              },
              {
                "type": "null"
              }
            ],
            "default": null
          }
        },
        "title": "GetTaskResponse",
        "type": "object"
      },
      "InternalError": {
        "properties": {
          "code": {
            "const": -32603,
            "default": -32603,
            "description": "Error code",
            "examples": [
              -32603
            ],
            "title": "Code",
            "type": "integer"
          },
          "message": {
            "const": "Internal error",
            "default": "Internal error",
            "description": "A short description of the error",
            "examples": [
              "Internal error"
            ],
            "title": "Message",
            "type": "string"
          },
          "data": {
            "anyOf": [
              {},
              {
                "type": "null"
              }
            ],
            "default": null,
            "title": "Data"
          }
        },
        "required": [
          "code",
          "message"
        ],
        "title": "InternalError",
        "type": "object"
      },
      "InvalidParamsError": {
        "properties": {
          "code": {
            "const": -32602,
            "default": -32602,
            "description": "Error code",
            "examples": [
              -32602
            ],
            "title": "Code",
            "type": "integer"
          },
          "message": {
            "const": "Invalid parameters",
            "default": "Invalid parameters",
            "description": "A short description of the error",
            "examples": [
              "Invalid parameters"
            ],
            "title": "Message",
            "type": "string"
          },
          "data": {
            "anyOf": [
              {},
              {
                "type": "null"
              }
            ],
            "default": null,
            "title": "Data"
          }
        },
        "required": [
          "code",
          "message"
        ],
        "title": "InvalidParamsError",
        "type": "object"
      },
      "InvalidRequestError": {
        "properties": {
          "code": {
            "const": -32600,
            "default": -32600,
            "description": "Error code",
            "examples": [
              -32600
            ],
            "title": "Code",
            "type": "integer"
          },
          "message": {
            "const": "Request payload validation error",
            "default": "Request payload validation error",
            "description": "A short description of the error",
            "examples": [
              "Request payload validation error"
            ],
            "title": "Message",
            "type": "string"
          },
          "data": {
            "anyOf": [
              {},
              {
                "type": "null"
              }
            ],
            "default": null,
            "title": "Data"
          }
        },
        "required": [
          "code",
          "message"
        ],
        "title": "InvalidRequestError",
        "type": "object"
      },
      "JSONParseError": {
        "properties": {
          "code": {
            "const": -32700,
            "default": -32700,
            "description": "Error code",
            "examples": [
              -32700
            ],
            "title": "Code",
            "type": "integer"
          },
          "message": {
            "const": "Invalid JSON payload",
            "default": "Invalid JSON payload",
            "description": "A short description of the error",
            "examples": [
              "Invalid JSON payload"
            ],
            "title": "Message",
            "type": "string"
          },
          "data": {
            "anyOf": [
              {},
              {
                "type": "null"
              }
            ],
            "default": null,
            "title": "Data"
          }
        },
        "required": [
          "code",
          "message"
        ],
        "title": "JSONParseError",
        "type": "object"
      },
      "JSONRPCError": {
        "properties": {
          "code": {
            "title": "Code",
            "type": "integer"
          },
          "message": {
            "title": "Message",
            "type": "string"
          },
          "data": {
            "anyOf": [
              {},
              {
                "type": "null"
              }
            ],
            "default": null,
            "title": "Data"
          }
        },
        "required": [
          "code",
          "message"
        ],
        "title": "JSONRPCError",
        "type": "object"
      },
      "JSONRPCMessage": {
        "properties": {
          "jsonrpc": {
            "const": "2.0",
            "default": "2.0",
            "title": "Jsonrpc",
            "type": "string"
          },
          "id": {
            "anyOf": [
              {
                "type": "integer"
              },
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Id"
          }
        },
        "title": "JSONRPCMessage",
        "type": "object"
      },
      "JSONRPCRequest": {
        "properties": {
          "jsonrpc": {
            "const": "2.0",
            "default": "2.0",
            "title": "Jsonrpc",
            "type": "string"
          },
          "id": {
            "anyOf": [
              {
                "type": "integer"
              },
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Id"
          },
          "method": {
            "title": "Method",
            "type": "string"
          },
          "params": {
            "anyOf": [
              {
                "additionalProperties": {},
                "type": "object"
              },
              {
                "type": "null"
              }
            ],
            "default": null,
            "title": "Params"
          }
        },
        "required": [
          "method"
        ],
        "title": "JSONRPCRequest",
        "type": "object"
      },
      "JSONRPCResponse": {
        "properties": {
          "jsonrpc": {
            "const": "2.0",
            "default": "2.0",
            "title": "Jsonrpc",
            "type": "string"
          },
          "id": {
            "anyOf": [
              {
                "type": "integer"
              },
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Id"
          },
          "result": {
            "anyOf": [
              {},
              {
                "type": "null"
              }
            ],
            "default": null,
            "title": "Result"
          },
          "error": {
            "anyOf": [
              {
                "$ref": "#/$defs/JSONRPCError"
              },
              {
                "type": "null"
              }
            ],
            "default": null
          }
        },
        "title": "JSONRPCResponse",
        "type": "object"
      },
      "Message": {
        "properties": {
          "role": {
            "enum": [
              "user",
              "agent"
            ],
            "title": "Role",
            "type": "string"
          },
          "parts": {
            "items": {
              "$ref": "#/$defs/Part"
            },
            "title": "Parts",
            "type": "array"
          },          
          "metadata": {
            "anyOf": [
              {
                "additionalProperties": {},
                "type": "object"
              },
              {
                "type": "null"
              }
            ],
            "default": null,
            "title": "Metadata"
          }
        },
        "required": [
          "role",
          "parts"
        ],
        "title": "Message",
        "type": "object"
      },
      "MethodNotFoundError": {
        "properties": {
          "code": {
            "const": -32601,
            "default": -32601,
            "description": "Error code",
            "examples": [
              -32601
            ],
            "title": "Code",
            "type": "integer"
          },
          "message": {
            "const": "Method not found",
            "default": "Method not found",
            "description": "A short description of the error",
            "examples": [
              "Method not found"
            ],
            "title": "Message",
            "type": "string"
          },
          "data": {
            "const": null,
            "default": null,
            "title": "Data"
          }
        },
        "required": [
          "code",
          "message",
          "data"
        ],
        "title": "MethodNotFoundError",
        "type": "object"
      },
      "PushNotificationConfig": {
        "properties": {
          "url": {
            "title": "Url",
            "type": "string"
          },
          "token": {
            "title": "Token",
            "anyOf": [              
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ]
          },
          "authentication": {
            "anyOf": [
              {
                "$ref": "#/$defs/AuthenticationInfo"
              },
              {
                "type": "null"
              }
            ],
            "default": null
          }
        },
        "required": [
          "url"
        ],
        "title": "PushNotificationConfig",
        "type": "object"
      },
      "Part": {
        "anyOf": [
          {
            "$ref": "#/$defs/TextPart"
          },
          {
            "$ref": "#/$defs/FilePart"
          },
          {
            "$ref": "#/$defs/DataPart"
          }
        ],
        "title": "Part"
      },
      "SendTaskRequest": {
        "properties": {
          "jsonrpc": {
            "const": "2.0",
            "default": "2.0",
            "title": "Jsonrpc",
            "type": "string"
          },
          "id": {
            "anyOf": [
              {
                "type": "integer"
              },
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Id"
          },
          "method": {
            "const": "tasks/send",
            "default": "tasks/send",
            "title": "Method",
            "type": "string"
          },
          "params": {
            "$ref": "#/$defs/TaskSendParams"
          }
        },
        "required": [
          "method",
          "params"
        ],
        "title": "SendTaskRequest",
        "type": "object"
      },      
      "SendTaskResponse": {
        "properties": {
          "jsonrpc": {
            "const": "2.0",
            "default": "2.0",
            "title": "Jsonrpc",
            "type": "string"
          },
          "id": {
            "anyOf": [
              {
                "type": "integer"
              },
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Id"
          },
          "result": {
            "anyOf": [
              {
                "$ref": "#/$defs/Task"
              },              
              {
                "type": "null"
              }
            ],
            "default": null
          },
          "error": {
            "anyOf": [
              {
                "$ref": "#/$defs/JSONRPCError"
              },
              {
                "type": "null"
              }
            ],
            "default": null
          }
        },
        "title": "SendTaskResponse",
        "type": "object"
      },
      "SendTaskStreamingRequest": {
        "properties": {
          "jsonrpc": {
            "const": "2.0",
            "default": "2.0",
            "title": "Jsonrpc",
            "type": "string"
          },
          "id": {
            "anyOf": [
              {
                "type": "integer"
              },
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Id"
          },
          "method": {
            "const": "tasks/sendSubscribe",
            "default": "tasks/sendSubscribe",
            "title": "Method",
            "type": "string"
          },
          "params": {
            "$ref": "#/$defs/TaskSendParams"
          }
        },
        "required": [
          "method",
          "params"
        ],
        "title": "SendTaskStreamingRequest",
        "type": "object"
      },
      "SendTaskStreamingResponse": {
        "properties": {
          "jsonrpc": {
            "const": "2.0",
            "default": "2.0",
            "title": "Jsonrpc",
            "type": "string"
          },
          "id": {
            "anyOf": [
              {
                "type": "integer"
              },
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Id"
          },
          "result": {
            "anyOf": [              
              {
                "$ref": "#/$defs/TaskStatusUpdateEvent"
              },
              {
                "$ref": "#/$defs/TaskArtifactUpdateEvent"
              },
              {
                "type": "null"
              }
            ],
            "default": null
          },
          "error": {
            "anyOf": [
              {
                "$ref": "#/$defs/JSONRPCError"
              },
              {
                "type": "null"
              }
            ],
            "default": null
          }
        },
        "title": "SendTaskStreamingResponse",
        "type": "object"
      },
      "SetTaskPushNotificationRequest": {
        "properties": {
          "jsonrpc": {
            "const": "2.0",
            "default": "2.0",
            "title": "Jsonrpc",
            "type": "string"
          },
          "id": {
            "anyOf": [
              {
                "type": "integer"
              },
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Id"
          },
          "method": {
            "const": "tasks/pushNotification/set",
            "default": "tasks/pushNotification/set",
            "title": "Method",
            "type": "string"
          },
          "params": {
            "$ref": "#/$defs/TaskPushNotificationConfig"
          }
        },
        "required": [
          "method",
          "params"
        ],
        "title": "SetTaskPushNotificationRequest",
        "type": "object"
      },
      "SetTaskPushNotificationResponse": {
        "properties": {
          "jsonrpc": {
            "const": "2.0",
            "default": "2.0",
            "title": "Jsonrpc",
            "type": "string"
          },
          "id": {
            "anyOf": [
              {
                "type": "integer"
              },
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Id"
          },
          "result": {
            "anyOf": [
              {
                "$ref": "#/$defs/TaskPushNotificationConfig"
              },
              {
                "type": "null"
              }
            ],
            "default": null
          },
          "error": {
            "anyOf": [
              {
                "$ref": "#/$defs/JSONRPCError"
              },
              {
                "type": "null"
              }
            ],
            "default": null
          }
        },
        "title": "SetTaskPushNotificationResponse",
        "type": "object"
      },
      "Task": {
        "properties": {
          "id": {
            "title": "Id",
            "type": "string"
          },
          "sessionId": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "default": null,
            "title": "Sessionid"
          },
          "status": {
            "$ref": "#/$defs/TaskStatus"
          },
          "artifacts": {
            "anyOf": [
              {
                "items": {
                  "$ref": "#/$defs/Artifact"
                },
                "type": "array"
              },
              {
                "type": "null"
              }
            ],
            "default": null,
            "title": "Artifacts"
          },
          "metadata": {
            "anyOf": [
              {
                "additionalProperties": {},
                "type": "object"
              },
              {
                "type": "null"
              }
            ],
            "default": null,
            "title": "Metadata"
          }
        },
        "required": [
          "id",
          "status"
        ],
        "title": "Task",
        "type": "object"
      },
      "TaskPushNotificationConfig": {
        "properties": {
          "id": {
            "title": "Id",
            "type": "string"
          },
          "pushNotificationConfig": {
            "$ref": "#/$defs/PushNotificationConfig"
          }
        },
        "required": [
          "id",
          "pushNotificationConfig"
        ],
        "title": "TaskPushNotificationConfig",
        "type": "object"
      },      
      "TaskNotCancelableError": {
        "properties": {
          "code": {
            "const": -32002,
            "default": -32002,
            "description": "Error code",
            "examples": [
              -32002
            ],
            "title": "Code",
            "type": "integer"
          },
          "message": {
            "const": "Task cannot be canceled",
            "default": "Task cannot be canceled",
            "description": "A short description of the error",
            "examples": [
              "Task cannot be canceled"
            ],
            "title": "Message",
            "type": "string"
          },
          "data": {
            "const": null,
            "default": null,
            "title": "Data"
          }
        },
        "required": [
          "code",
          "message",
          "data"
        ],
        "title": "TaskNotCancelableError",
        "type": "object"
      },
      "TaskNotFoundError": {
        "properties": {
          "code": {
            "const": -32001,
            "default": -32001,
            "description": "Error code",
            "examples": [
              -32001
            ],
            "title": "Code",
            "type": "integer"
          },
          "message": {
            "const": "Task not found",
            "default": "Task not found",
            "description": "A short description of the error",
            "examples": [
              "Task not found"
            ],
            "title": "Message",
            "type": "string"
          },
          "data": {
            "const": null,
            "default": null,
            "title": "Data"
          }
        },
        "required": [
          "code",
          "message",
          "data"
        ],
        "title": "TaskNotFoundError",
        "type": "object"
      },
      "TaskIdParams": {
        "properties": {
          "id": {
            "title": "Id",
            "type": "string"
          },
          "metadata": {
            "anyOf": [
              {
                "additionalProperties": {},
                "type": "object"
              },
              {
                "type": "null"
              }
            ],
            "default": null,
            "title": "Metadata"
          }
        },
        "required": [
          "id"
        ],
        "title": "TaskQueryParams",
        "type": "object"
      },
      "TaskQueryParams": {
        "properties": {
          "id": {
            "title": "Id",
            "type": "string"
          },
          "historyLength": {
            "anyOf": [
              {
                "type": "integer"
              },              
              {
                "type": "null"
              }
            ],
            "default": null,
            "title": "HistoryLength"
          },          
          "metadata": {
            "anyOf": [
              {
                "additionalProperties": {},
                "type": "object"
              },
              {
                "type": "null"
              }
            ],
            "default": null,
            "title": "Metadata"
          }
        },
        "required": [
          "id"
        ],
        "title": "TaskQueryParams",
        "type": "object"
      },
      "TaskSendParams": {
        "properties": {
          "id": {
            "title": "Id",
            "type": "string"
          },
          "sessionId": {
            "title": "Sessionid",
            "type": "string"
          },
          "message": {
            "$ref": "#/$defs/Message"
          },          
          "pushNotification": {
            "anyOf": [
              {
                "$ref": "#/$defs/PushNotificationConfig"
              },
              {
                "type": "null"
              }
            ],
            "default": null
          },
          "historyLength": {
            "anyOf": [
              {
                "type": "integer"
              },              
              {
                "type": "null"
              }
            ],
            "default": null,
            "title": "HistoryLength"
          },   
          "metadata": {
            "anyOf": [
              {
                "additionalProperties": {},
                "type": "object"
              },
              {
                "type": "null"
              }
            ],
            "default": null,
            "title": "Metadata"
          }
        },
        "required": [
          "id",
          "message"
        ],
        "title": "TaskSendParams",
        "type": "object"
      },
      "TaskState": {
        "description": "An enumeration.",
        "enum": [
          "submitted",
          "working",
          "input-required",
          "completed",
          "canceled",
          "failed",
          "unknown"
        ],
        "title": "TaskState",
        "type": "string"
      },
      "TaskStatus": {
        "properties": {
          "state": {
            "$ref": "#/$defs/TaskState"
          },
          "message": {
            "anyOf": [
              {
                "$ref": "#/$defs/Message"
              },
              {
                "type": "null"
              }
            ],
            "default": null
          },
          "timestamp": {
            "format": "date-time",
            "title": "Timestamp",
            "type": "string"
          }
        },
        "required": [
          "state"
        ],
        "title": "TaskStatus",
        "type": "object"
      },
      "TaskResubscriptionRequest": {
        "properties": {
          "jsonrpc": {
            "const": "2.0",
            "default": "2.0",
            "title": "Jsonrpc",
            "type": "string"
          },
          "id": {
            "anyOf": [
              {
                "type": "integer"
              },
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Id"
          },
          "method": {
            "const": "tasks/resubscribe",
            "default": "tasks/resubscribe",
            "title": "Method",
            "type": "string"
          },
          "params": {
            "$ref": "#/$defs/TaskQueryParams"
          }
        },
        "required": [
          "method",
          "params"
        ],
        "title": "TaskResubscriptionRequest",
        "type": "object"
      },
      "TaskStatusUpdateEvent": {
        "properties": {
          "id": {
            "title": "Id",
            "type": "string"
          },
          "status": {
            "$ref": "#/$defs/TaskStatus"
          },
          "final": {
            "default": false,
            "title": "Final",
            "type": "boolean"
          },
          "metadata": {
            "anyOf": [
              {
                "additionalProperties": {},
                "type": "object"
              },
              {
                "type": "null"
              }
            ],
            "default": null,
            "title": "Metadata"
          }
        },
        "required": [
          "id",
          "status"
        ],
        "title": "TaskStatusUpdateEvent",
        "type": "object"
      },
      "TaskArtifactUpdateEvent": {
        "properties": {
          "id": {
            "title": "Id",
            "type": "string"
          },
          "artifact": {
            "$ref": "#/$defs/Artifact"
          },
          "metadata": {
            "anyOf": [
              {
                "additionalProperties": {},
                "type": "object"
              },
              {
                "type": "null"
              }
            ],
            "default": null,
            "title": "Metadata"
          }
        },
        "required": [
          "id",
          "artifact"
        ],
        "title": "TaskArtifactUpdateEvent",
        "type": "object"
      },
      "TextPart": {
        "properties": {
          "type": {
            "const": "text",
            "default": "text",
            "description": "Type of the part",
            "examples": [
              "text"
            ],
            "title": "Type",
            "type": "string"
          },
          "text": {
            "title": "Text",
            "type": "string"
          },
          "metadata": {
            "anyOf": [
              {
                "additionalProperties": {},
                "type": "object"
              },
              {
                "type": "null"
              }
            ],
            "default": null,
            "title": "Metadata"
          }
        },
        "required": [
          "text"
        ],
        "title": "TextPart",
        "type": "object"
      },
      "UnsupportedOperationError": {
        "properties": {
          "code": {
            "const": -32004,
            "default": -32004,
            "description": "Error code",
            "examples": [
              -32004
            ],
            "title": "Code",
            "type": "integer"
          },
          "message": {
            "const": "This operation is not supported",
            "default": "This operation is not supported",
            "description": "A short description of the error",
            "examples": [
              "This operation is not supported"
            ],
            "title": "Message",
            "type": "string"
          },
          "data": {
            "const": null,
            "default": null,
            "title": "Data"
          }
        },
        "required": [
          "code",
          "message",
          "data"
        ],
        "title": "UnsupportedOperationError",
        "type": "object"
      },
      "A2ARequest": {
        "oneOf": [
          {
            "$ref": "#/$defs/SendTaskRequest"
          },
          {
            "$ref": "#/$defs/GetTaskRequest"
          },
          {
            "$ref": "#/$defs/CancelTaskRequest"
          },          
          {
            "$ref": "#/$defs/SetTaskPushNotificationRequest"
          },
          {
            "$ref": "#/$defs/GetTaskPushNotificationRequest"
          },
          {
            "$ref": "#/$defs/TaskResubscriptionRequest"
          }
        ],
        "title": "A2ARequest"
      }
    }
  }


Using langgraph -- 
LangGraph
This sample uses LangGraph to build a simple Currency Converter agent and host it as an A2A server.
The agent supports multi-turn for completing the currency conversion tasks. For example, the agent sets the task to input-required if additional user input is required to complete the task and accepts additional user input.
Prerequisites
Python 3.13 or higher
UV
Access to an LLM and API Key
Running the Sample
Navigate to the samples directory:
cd samples/python
Create a file named .env under agents/crewai.
touch agents/langgraph/.env
Add GOOGLE_API_KEY to .env (sample uses Google Gemini by default)
Run an agent:
uv run langgraph/agent
Run one of the client apps
Examples
Synchronous request
Request:
POST http://localhost:10000
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": 11,
  "method": "tasks/send",
  "params": {
    "id": "129",
    "sessionId": "8f01f3d172cd4396a0e535ae8aec6687",
    "acceptedOutputModes": [
      "text"
    ],
    "message": {
      "role": "user",
      "parts": [
        {
          "type": "text",
          "text": "How much is the exchange rate for 1 USD to INR?"
        }
      ]
    }
  }
}


Response:
{
  "jsonrpc": "2.0",
  "id": 11,
  "result": {
    "id": "129",
    "status": {
      "state": "completed",
      "timestamp": "2025-04-02T16:53:29.301828"
    },
    "artifacts": [
      {
        "parts": [
          {
            "type": "text",
            "text": "The exchange rate for 1 USD to INR is 85.49."
          }
        ],
        "index": 0
      }
    ],
    "history": []
  }
}