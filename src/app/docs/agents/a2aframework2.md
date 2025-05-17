
Multi-turn example
Request - Seq 1:
POST http://localhost:10000
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": 10,
  "method": "tasks/send",
  "params": {
    "id": "130",
    "sessionId": "a9bb617f2cd94bd585da0f88ce2ddba2",
    "acceptedOutputModes": [
      "text"
    ],
    "message": {
      "role": "user",
      "parts": [
        {
          "type": "text",
          "text": "How much is the exchange rate for 1 USD?"
        }
      ]
    }
  }
}


Response - Seq 2:
{
  "jsonrpc": "2.0",
  "id": 10,
  "result": {
    "id": "130",
    "status": {
      "state": "input-required",
      "message": {
        "role": "agent",
        "parts": [
          {
            "type": "text",
            "text": "Which currency do you want to convert to? Also, do you want the latest exchange rate or a specific date?"
          }
        ]
      },
      "timestamp": "2025-04-02T16:57:02.336787"
    },
    "history": []
  }
}


Request - Seq 3:
POST http://localhost:10000
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": 10,
  "method": "tasks/send",
  "params": {
    "id": "130",
    "sessionId": "a9bb617f2cd94bd585da0f88ce2ddba2",
    "acceptedOutputModes": [
      "text"
    ],
    "message": {
      "role": "user",
      "parts": [
        {
          "type": "text",
          "text": "CAD"
        }
      ]
    }
  }
}


Response - Seq 4:
{
  "jsonrpc": "2.0",
  "id": 10,
  "result": {
    "id": "130",
    "status": {
      "state": "completed",
      "timestamp": "2025-04-02T16:57:40.033328"
    },
    "artifacts": [
      {
        "parts": [
          {
            "type": "text",
            "text": "The current exchange rate is 1 USD = 1.4328 CAD."
          }
        ],
        "index": 0
      }
    ],
    "history": []
  }
}


Streaming example
Request:
{
  "jsonrpc": "2.0",
  "id": 12,
  "method": "tasks/sendSubscribe",
  "params": {
    "id": "131",
    "sessionId": "cebd704d0ddd4e8aa646aeb123d60614",
    "acceptedOutputModes": [
      "text"
    ],
    "message": {
      "role": "user",
      "parts": [
        {
          "type": "text",
          "text": "How much is 100 USD in GBP?"
        }
      ]
    }
  }
}


Response:
data: {"jsonrpc":"2.0","id":12,"result":{"id":"131","status":{"state":"working","message":{"role":"agent","parts":[{"type":"text","text":"Looking up the exchange rates..."}]},"timestamp":"2025-04-02T16:59:34.578939"},"final":false}}

data: {"jsonrpc":"2.0","id":12,"result":{"id":"131","status":{"state":"working","message":{"role":"agent","parts":[{"type":"text","text":"Processing the exchange rates.."}]},"timestamp":"2025-04-02T16:59:34.737052"},"final":false}}

data: {"jsonrpc":"2.0","id":12,"result":{"id":"131","artifact":{"parts":[{"type":"text","text":"Based on the current exchange rate, 1 USD is equivalent to 0.77252 GBP. Therefore, 100 USD would be approximately 77.252 GBP."}],"index":0,"append":false}}}

data: {"jsonrpc":"2.0","id":12,"result":{"id":"131","status":{"state":"completed","timestamp":"2025-04-02T16:59:35.331844"},"final":true}}




samples/python/agents/langgraph/__init__.py  -- blank 

samples/python/agents/langgraph/__main__.py

from common.server import A2AServer
from common.types import AgentCard, AgentCapabilities, AgentSkill, MissingAPIKeyError
from common.utils.push_notification_auth import PushNotificationSenderAuth
from agents.langgraph.task_manager import AgentTaskManager
from agents.langgraph.agent import CurrencyAgent
import click
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@click.command()
@click.option("--host", "host", default="localhost")
@click.option("--port", "port", default=10000)
def main(host, port):
    """Starts the Currency Agent server."""
    try:
        if not os.getenv("GOOGLE_API_KEY"):
            raise MissingAPIKeyError("GOOGLE_API_KEY environment variable not set.")

        capabilities = AgentCapabilities(streaming=True, pushNotifications=True)
        skill = AgentSkill(
            id="convert_currency",
            name="Currency Exchange Rates Tool",
            description="Helps with exchange values between various currencies",
            tags=["currency conversion", "currency exchange"],
            examples=["What is exchange rate between USD and GBP?"],
        )
        agent_card = AgentCard(
            name="Currency Agent",
            description="Helps with exchange rates for currencies",
            url=f"http://{host}:{port}/",
            version="1.0.0",
            defaultInputModes=CurrencyAgent.SUPPORTED_CONTENT_TYPES,
            defaultOutputModes=CurrencyAgent.SUPPORTED_CONTENT_TYPES,
            capabilities=capabilities,
            skills=[skill],
        )

        notification_sender_auth = PushNotificationSenderAuth()
        notification_sender_auth.generate_jwk()
        server = A2AServer(
            agent_card=agent_card,
            task_manager=AgentTaskManager(agent=CurrencyAgent(), notification_sender_auth=notification_sender_auth),
            host=host,
            port=port,
        )

        server.app.add_route(
            "/.well-known/jwks.json", notification_sender_auth.handle_jwks_endpoint, methods=["GET"]
        )

        logger.info(f"Starting server on {host}:{port}")
        server.start()
    except MissingAPIKeyError as e:
        logger.error(f"Error: {e}")
        exit(1)
    except Exception as e:
        logger.error(f"An error occurred during server startup: {e}")
        exit(1)


if __name__ == "__main__":
    main()


samples/python/agents/langgraph/agent.py

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.tools import tool
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.messages import AIMessage, ToolMessage, HumanMessage
import httpx
from typing import Any, Dict, AsyncIterable

memory = MemorySaver()


@tool
def get_exchange_rate(
    currency_from: str = "USD",
    currency_to: str = "EUR",
    currency_date: str = "latest",
):
    """Use this to get current exchange rate.

    Args:
        currency_from: The currency to convert from (e.g., "USD").
        currency_to: The currency to convert to (e.g., "EUR").
        currency_date: The date for the exchange rate or "latest". Defaults to "latest".

    Returns:
        A dictionary containing the exchange rate data, or an error message if the request fails.
    """
    try:
        response = httpx.get(
            f"https://api.frankfurter.app/{currency_date}",
            params={"from": currency_from, "to": currency_to},
        )
        response.raise_for_status()

        data = response.json()
        if "rates" not in data:
            return {"error": "Invalid API response format."}
        return data
    except httpx.HTTPError as e:
        return {"error": f"API request failed: {e}"}
    except ValueError:
        return {"error": "Invalid JSON response from API."}


class CurrencyAgent:
    def __init__(self):
        self.model = ChatGoogleGenerativeAI(model="gemini-2.0-flash")
        self.tools = [get_exchange_rate]
        self.graph = create_react_agent(
            self.model, tools=self.tools, checkpointer=memory
        )

    def invoke(self, query, sessionId) -> str:
        config = {"configurable": {"thread_id": sessionId}}
        self.graph.invoke({"messages": [("user", query)]}, config)
        return self.get_agent_response(config)

    async def stream(self, query, sessionId) -> AsyncIterable[Dict[str, Any]]:
        inputs = {"messages": [("user", query)]}
        config = {"configurable": {"thread_id": sessionId}}

        for item in self.graph.stream(inputs, config, stream_mode="values"):
            message = item["messages"][-1]
            if (
                isinstance(message, AIMessage)
                and message.tool_calls
                and len(message.tool_calls) > 0
            ):
                yield {
                    "is_task_complete": False,
                    "require_user_input": False,
                    "content": "Looking up the exchange rates...",
                }
            elif isinstance(message, ToolMessage):
                yield {
                    "is_task_complete": False,
                    "require_user_input": False,
                    "content": "Processing the exchange rates..",
                }
        yield self.get_agent_response(config)

    def get_agent_response(self, config):
        current_state = self.graph.get_state(config)
        messages = current_state.values["messages"]

        last_message = messages[-1]

        # from the last message check if there is a ToolMessage before we hit a HumanMessage
        # if there is ToolMessage, we assume the tool is invoked and we have final response
        # if not we assume the tool needs additional inputs from user
        for i in range(len(messages) - 2, 0, -1):
            current = messages[i]
            if isinstance(current, ToolMessage):
                return {
                    "is_task_complete": True,
                    "require_user_input": False,
                    "content": last_message.content,
                }
            elif isinstance(current, HumanMessage):
                break

        return {
            "is_task_complete": False,
            "require_user_input": True,
            "content": last_message.content,
        }

    SUPPORTED_CONTENT_TYPES = ["text", "text/plain"]

samples/python/agents/langgraph/task_manager.py
from typing import AsyncIterable
from common.types import (
    SendTaskRequest,
    TaskSendParams,
    Message,
    TaskStatus,
    Artifact,
    TextPart,
    TaskState,
    SendTaskResponse,
    InternalError,
    JSONRPCResponse,
    SendTaskStreamingRequest,
    SendTaskStreamingResponse,
    TaskArtifactUpdateEvent,
    TaskStatusUpdateEvent,
    Task,
    TaskIdParams,
    PushNotificationConfig,
    SetTaskPushNotificationRequest,
    SetTaskPushNotificationResponse,
    TaskPushNotificationConfig,
    TaskNotFoundError,
    InvalidParamsError,
)
from common.server.task_manager import InMemoryTaskManager
from agents.langgraph.agent import CurrencyAgent
from common.utils.push_notification_auth import PushNotificationSenderAuth
import common.server.utils as utils
from typing import Union
import asyncio
import logging
import traceback

logger = logging.getLogger(__name__)


class AgentTaskManager(InMemoryTaskManager):
    def __init__(self, agent: CurrencyAgent, notification_sender_auth: PushNotificationSenderAuth):
        super().__init__()
        self.agent = agent
        self.notification_sender_auth = notification_sender_auth

    async def _run_streaming_agent(self, request: SendTaskStreamingRequest):
        task_send_params: TaskSendParams = request.params
        query = self._get_user_query(task_send_params)

        try:
            async for item in self.agent.stream(query, task_send_params.sessionId):
                is_task_complete = item["is_task_complete"]
                require_user_input = item["require_user_input"]
                artifact = None
                message = None
                parts = [{"type": "text", "text": item["content"]}]
                end_stream = False

                if not is_task_complete and not require_user_input:
                    task_state = TaskState.WORKING
                    message = Message(role="agent", parts=parts)
                elif require_user_input:
                    task_state = TaskState.INPUT_REQUIRED
                    message = Message(role="agent", parts=parts)
                    end_stream = True
                else:
                    task_state = TaskState.COMPLETED
                    artifact = Artifact(parts=parts, index=0, append=False)
                    end_stream = True

                task_status = TaskStatus(state=task_state, message=message)
                latest_task = await self.update_store(
                    task_send_params.id,
                    task_status,
                    None if artifact is None else [artifact],
                )
                await self.send_task_notification(latest_task)

                if artifact:
                    task_artifact_update_event = TaskArtifactUpdateEvent(
                        id=task_send_params.id, artifact=artifact
                    )
                    await self.enqueue_events_for_sse(
                        task_send_params.id, task_artifact_update_event
                    )                    
                    

                task_update_event = TaskStatusUpdateEvent(
                    id=task_send_params.id, status=task_status, final=end_stream
                )
                await self.enqueue_events_for_sse(
                    task_send_params.id, task_update_event
                )

        except Exception as e:
            logger.error(f"An error occurred while streaming the response: {e}")
            await self.enqueue_events_for_sse(
                task_send_params.id,
                InternalError(message=f"An error occurred while streaming the response: {e}")                
            )

    def _validate_request(
        self, request: Union[SendTaskRequest, SendTaskStreamingRequest]
    ) -> JSONRPCResponse | None:
        task_send_params: TaskSendParams = request.params
        if not utils.are_modalities_compatible(
            task_send_params.acceptedOutputModes, CurrencyAgent.SUPPORTED_CONTENT_TYPES
        ):
            logger.warning(
                "Unsupported output mode. Received %s, Support %s",
                task_send_params.acceptedOutputModes,
                CurrencyAgent.SUPPORTED_CONTENT_TYPES,
            )
            return utils.new_incompatible_types_error(request.id)
        
        if task_send_params.pushNotification and not task_send_params.pushNotification.url:
            logger.warning("Push notification URL is missing")
            return JSONRPCResponse(id=request.id, error=InvalidParamsError(message="Push notification URL is missing"))
        
        return None
        
    async def on_send_task(self, request: SendTaskRequest) -> SendTaskResponse:
        """Handles the 'send task' request."""
        validation_error = self._validate_request(request)
        if validation_error:
            return SendTaskResponse(id=request.id, error=validation_error.error)
        
        if request.params.pushNotification:
            if not await self.set_push_notification_info(request.params.id, request.params.pushNotification):
                return SendTaskResponse(id=request.id, error=InvalidParamsError(message="Push notification URL is invalid"))

        await self.upsert_task(request.params)
        task = await self.update_store(
            request.params.id, TaskStatus(state=TaskState.WORKING), None
        )
        await self.send_task_notification(task)

        task_send_params: TaskSendParams = request.params
        query = self._get_user_query(task_send_params)
        try:
            agent_response = self.agent.invoke(query, task_send_params.sessionId)
        except Exception as e:
            logger.error(f"Error invoking agent: {e}")
            raise ValueError(f"Error invoking agent: {e}")
        return await self._process_agent_response(
            request, agent_response
        )

    async def on_send_task_subscribe(
        self, request: SendTaskStreamingRequest
    ) -> AsyncIterable[SendTaskStreamingResponse] | JSONRPCResponse:
        try:
            error = self._validate_request(request)
            if error:
                return error

            await self.upsert_task(request.params)

            if request.params.pushNotification:
                if not await self.set_push_notification_info(request.params.id, request.params.pushNotification):
                    return JSONRPCResponse(id=request.id, error=InvalidParamsError(message="Push notification URL is invalid"))

            task_send_params: TaskSendParams = request.params
            sse_event_queue = await self.setup_sse_consumer(task_send_params.id, False)            

            asyncio.create_task(self._run_streaming_agent(request))

            return self.dequeue_events_for_sse(
                request.id, task_send_params.id, sse_event_queue
            )
        except Exception as e:
            logger.error(f"Error in SSE stream: {e}")
            print(traceback.format_exc())
            return JSONRPCResponse(
                id=request.id,
                error=InternalError(
                    message="An error occurred while streaming the response"
                ),
            )

    async def _process_agent_response(
        self, request: SendTaskRequest, agent_response: dict
    ) -> SendTaskResponse:
        """Processes the agent's response and updates the task store."""
        task_send_params: TaskSendParams = request.params
        task_id = task_send_params.id
        history_length = task_send_params.historyLength
        task_status = None

        parts = [{"type": "text", "text": agent_response["content"]}]
        artifact = None
        if agent_response["require_user_input"]:
            task_status = TaskStatus(
                state=TaskState.INPUT_REQUIRED,
                message=Message(role="agent", parts=parts),
            )
        else:
            task_status = TaskStatus(state=TaskState.COMPLETED)
            artifact = Artifact(parts=parts)
        task = await self.update_store(
            task_id, task_status, None if artifact is None else [artifact]
        )
        task_result = self.append_task_history(task, history_length)
        await self.send_task_notification(task)
        return SendTaskResponse(id=request.id, result=task_result)
    
    def _get_user_query(self, task_send_params: TaskSendParams) -> str:
        part = task_send_params.message.parts[0]
        if not isinstance(part, TextPart):
            raise ValueError("Only text parts are supported")
        return part.text
    
    async def send_task_notification(self, task: Task):
        if not await self.has_push_notification_info(task.id):
            logger.info(f"No push notification info found for task {task.id}")
            return
        push_info = await self.get_push_notification_info(task.id)

        logger.info(f"Notifying for task {task.id} => {task.status.state}")
        await self.notification_sender_auth.send_push_notification(
            push_info.url,
            data=task.model_dump(exclude_none=True)
        )

    async def on_resubscribe_to_task(
        self, request
    ) -> AsyncIterable[SendTaskStreamingResponse] | JSONRPCResponse:
        task_id_params: TaskIdParams = request.params
        try:
            sse_event_queue = await self.setup_sse_consumer(task_id_params.id, True)
            return self.dequeue_events_for_sse(request.id, task_id_params.id, sse_event_queue)
        except Exception as e:
            logger.error(f"Error while reconnecting to SSE stream: {e}")
            return JSONRPCResponse(
                id=request.id,
                error=InternalError(
                    message=f"An error occurred while reconnecting to stream: {e}"
                ),
            )
    
    async def set_push_notification_info(self, task_id: str, push_notification_config: PushNotificationConfig):
        # Verify the ownership of notification URL by issuing a challenge request.
        is_verified = await self.notification_sender_auth.verify_push_notification_url(push_notification_config.url)
        if not is_verified:
            return False
        
        await super().set_push_notification_info(task_id, push_notification_config)
        return True

samples/python/agents/google_adk/README.md

## Google ADK Agent

This sample uses the Google Agent Development Kit (ADK) to create a simple "Expense Reimbursement" agent that is hosted as an A2A server.

This agent takes text requests from the client and, if any details are missing, returns a webform for the client (or its user) to fill out. After the client fills out the form, the agent will complete the task.

## Prerequisites

- Python 3.9 or higher
- UV
- Access to an LLM and API Key


## Running the Sample

1. Navigate to the samples directory:
    ```bash
    cd samples/python
    ```
2. Create a file named .env under agents/google_adk.
    ```bash
    touch agents/google_adk/.env
    ```
3. Add `GOOGLE_API_KEY` to .env  (sample uses Google Gemini by default)

4. Run an agent:
    ```bash
    uv run google_adk/agent
    ```
5. Run one of the [client apps](/samples/python/hosts/README.md)


samples/python/agents/google_adk/__init__.py - blank 

samples/python/agents/google_adk/__main__.py

from common.server import A2AServer
from common.types import AgentCard, AgentCapabilities, AgentSkill
from task_manager import AgentTaskManager
from agent import ReimbursementAgent
import click

@click.command()
@click.option("--host", default="localhost")
@click.option("--port", default=10002)
def main(host, port):
    capabilities = AgentCapabilities(streaming=True)
    skill = AgentSkill(
        id="process_reimbursement",
        name="Process Reimbursement Tool",
        description="Helps with the reimbursement process for users given the amount and purpose of the reimbursement.",
        tags=["reimbursement"],
        examples=["Can you reimburse me $20 for my lunch with the clients?"],
    )
    agent_card = AgentCard(
        name="Reimbursement Agent",
        description="This agent handles the reimbursement process for the employees given the amount and purpose of the reimbursement.",
        url=f"http://{host}:{port}/",
        version="1.0.0",
        defaultInputModes=ReimbursementAgent.SUPPORTED_CONTENT_TYPES,
        defaultOutputModes=ReimbursementAgent.SUPPORTED_CONTENT_TYPES,
        capabilities=capabilities,
        skills=[skill],
    )
    server = A2AServer(
        agent_card=agent_card,
        task_manager=AgentTaskManager(agent=ReimbursementAgent()),
        host=host,
        port=port,
    )
    server.start()
if __name__ == "__main__":
    main()


samples/python/agents/google_adk/agent.py
import json
import random
from typing import Any, AsyncIterable, Dict, Optional
from google.adk.agents.llm_agent import LlmAgent
from google.adk.tools.tool_context import ToolContext
from google.adk.artifacts import InMemoryArtifactService
from google.adk.memory.in_memory_memory_service import InMemoryMemoryService
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

# Local cache of created request_ids for demo purposes.
request_ids = set()


def create_request_form(date: Optional[str] = None, amount: Optional[str] = None, purpose: Optional[str] = None) -> dict[str, Any]:
  """
   Create a request form for the employee to fill out.
   
   Args:
       date (str): The date of the request. Can be an empty string.
       amount (str): The requested amount. Can be an empty string.
       purpose (str): The purpose of the request. Can be an empty string.
       
   Returns:
       dict[str, Any]: A dictionary containing the request form data.
   """
  request_id = "request_id_" + str(random.randint(1000000, 9999999))
  request_ids.add(request_id)
  return {
      "request_id": request_id,
      "date": "<transaction date>" if not date else date,
      "amount": "<transaction dollar amount>" if not amount else amount,
      "purpose": "<business justification/purpose of the transaction>" if not purpose else purpose,
  }

def return_form(
    form_request: dict[str, Any],    
    tool_context: ToolContext,
    instructions: Optional[str] = None) -> dict[str, Any]:
  """
   Returns a structured json object indicating a form to complete.
   
   Args:
       form_request (dict[str, Any]): The request form data.
       tool_context (ToolContext): The context in which the tool operates.
       instructions (str): Instructions for processing the form. Can be an empty string.       
       
   Returns:
       dict[str, Any]: A JSON dictionary for the form response.
   """  
  if isinstance(form_request, str):
    form_request = json.loads(form_request)

  tool_context.actions.skip_summarization = True
  tool_context.actions.escalate = True
  form_dict = {
      'type': 'form',
      'form': {
        'type': 'object',
        'properties': {
            'date': {
                'type': 'string',
                'format': 'date',
                'description': 'Date of expense',
                'title': 'Date',
            },
            'amount': {
                'type': 'string',
                'format': 'number',
                'description': 'Amount of expense',
                'title': 'Amount',
            },
            'purpose': {
                'type': 'string',
                'description': 'Purpose of expense',
                'title': 'Purpose',
            },
            'request_id': {
                'type': 'string',
                'description': 'Request id',
                'title': 'Request ID',
            },
        },
        'required': list(form_request.keys()),
      },
      'form_data': form_request,
      'instructions': instructions,
  }
  return json.dumps(form_dict)

def reimburse(request_id: str) -> dict[str, Any]:
  """Reimburse the amount of money to the employee for a given request_id."""
  if request_id not in request_ids:
    return {"request_id": request_id, "status": "Error: Invalid request_id."}
  return {"request_id": request_id, "status": "approved"}


class ReimbursementAgent:
  """An agent that handles reimbursement requests."""

  SUPPORTED_CONTENT_TYPES = ["text", "text/plain"]

  def __init__(self):
    self._agent = self._build_agent()
    self._user_id = "remote_agent"
    self._runner = Runner(
        app_name=self._agent.name,
        agent=self._agent,
        artifact_service=InMemoryArtifactService(),
        session_service=InMemorySessionService(),
        memory_service=InMemoryMemoryService(),
    )

  def invoke(self, query, session_id) -> str:
    session = self._runner.session_service.get_session(
        app_name=self._agent.name, user_id=self._user_id, session_id=session_id
    )
    content = types.Content(
        role="user", parts=[types.Part.from_text(text=query)]
    )
    if session is None:
      session = self._runner.session_service.create_session(
          app_name=self._agent.name,
          user_id=self._user_id,
          state={},
          session_id=session_id,
      )
    events = self._runner.run(
        user_id=self._user_id, session_id=session.id, new_message=content
    )
    if not events or not events[-1].content or not events[-1].content.parts:
      return ""
    return "\n".join([p.text for p in events[-1].content.parts if p.text])

  async def stream(self, query, session_id) -> AsyncIterable[Dict[str, Any]]:
    session = self._runner.session_service.get_session(
        app_name=self._agent.name, user_id=self._user_id, session_id=session_id
    )
    content = types.Content(
        role="user", parts=[types.Part.from_text(text=query)]
    )
    if session is None:
      session = self._runner.session_service.create_session(
          app_name=self._agent.name,
          user_id=self._user_id,
          state={},
          session_id=session_id,
      )
    async for event in self._runner.run_async(
        user_id=self._user_id, session_id=session.id, new_message=content
    ):
      if event.is_final_response():
        response = ""
        if (
            event.content
            and event.content.parts
            and event.content.parts[0].text
        ):
          response = "\n".join([p.text for p in event.content.parts if p.text])
        elif (
            event.content
            and event.content.parts
            and any([True for p in event.content.parts if p.function_response])):
          response = next((p.function_response.model_dump() for p in event.content.parts))
        yield {
            "is_task_complete": True,
            "content": response,
        }
      else:
        yield {
            "is_task_complete": False,
            "updates": "Processing the reimbursement request...",
        }

  def _build_agent(self) -> LlmAgent:
    """Builds the LLM agent for the reimbursement agent."""
    return LlmAgent(
        model="gemini-2.0-flash-001",
        name="reimbursement_agent",
        description=(
            "This agent handles the reimbursement process for the employees"
            " given the amount and purpose of the reimbursement."
        ),
        instruction="""
    You are an agent who handle the reimbursement process for employees.

    When you receive an reimbursement request, you should first create a new request form using create_request_form(). Only provide default values if they are provided by the user, otherwise use an empty string as the default value.
      1. 'Date': the the date of the transaction.
      2. 'Amount': the dollar amount of the transaction.
      3. 'Business Justification/Purpose': the reason for the reimbursement.

    Once you created the form, you should return the result of calling return_form with the form data from the create_request_form call.

    Once you received the filled-out form back from the user, you should then check the form contains all required information:
      1. 'Date': the the date of the transaction.
      2. 'Amount': the value of the amount of the reimbursement being requested.
      3. 'Business Justification/Purpose': the item/object/artifact of the reimbursement.

    If you don't have all of the information, you should reject the request directly by calling the request_form method, providing the missing fields.


    For valid reimbursement requests, you can then use reimburse() to reimburse the employee.
      * In your response, you should include the request_id and the status of the reimbursement request.

    """,
        tools=[
            create_request_form,
            reimburse,
            return_form,
        ],
    )


samples/python/agents/google_adk/task_manager.py

import json
from typing import AsyncIterable
from common.types import (
    SendTaskRequest,
    TaskSendParams,
    Message,
    TaskStatus,
    Artifact,
    TaskStatusUpdateEvent,
    TaskArtifactUpdateEvent,
    TextPart,
    TaskState,
    Task,
    SendTaskResponse,
    InternalError,
    JSONRPCResponse,
    SendTaskStreamingRequest,
    SendTaskStreamingResponse,
)
from common.server.task_manager import InMemoryTaskManager
from agent import ReimbursementAgent
import common.server.utils as utils
from typing import Union
import logging
logger = logging.getLogger(__name__)

class AgentTaskManager(InMemoryTaskManager):

    def __init__(self, agent: ReimbursementAgent):
        super().__init__()
        self.agent = agent

    async def _stream_generator(
        self, request: SendTaskStreamingRequest
    ) -> AsyncIterable[SendTaskStreamingResponse] | JSONRPCResponse:
        task_send_params: TaskSendParams = request.params
        query = self._get_user_query(task_send_params)
        try:
          async for item in self.agent.stream(query, task_send_params.sessionId):
            is_task_complete = item["is_task_complete"]
            artifacts = None
            if not is_task_complete:
              task_state = TaskState.WORKING
              parts = [{"type": "text", "text": item["updates"]}]
            else:
              if isinstance(item["content"], dict):
                if ("response" in item["content"]
                    and "result" in item["content"]["response"]):
                  data = json.loads(item["content"]["response"]["result"])
                  task_state = TaskState.INPUT_REQUIRED
                else:
                  data = item["content"]
                  task_state = TaskState.COMPLETED
                parts = [{"type": "data", "data": data}]
              else:
                task_state = TaskState.COMPLETED
                parts = [{"type": "text", "text": item["content"]}]
              artifacts = [Artifact(parts=parts, index=0, append=False)]
          message = Message(role="agent", parts=parts)
          task_status = TaskStatus(state=task_state, message=message)
          await self._update_store(task_send_params.id, task_status, artifacts)
          task_update_event = TaskStatusUpdateEvent(
                id=task_send_params.id,
                status=task_status,
                final=False,
            )
          yield SendTaskStreamingResponse(id=request.id, result=task_update_event)
          # Now yield Artifacts too
          if artifacts:
            for artifact in artifacts:
              yield SendTaskStreamingResponse(
                  id=request.id,
                  result=TaskArtifactUpdateEvent(
                      id=task_send_params.id,
                      artifact=artifact,
                  )
              )
          if is_task_complete:
            yield SendTaskStreamingResponse(
              id=request.id,
              result=TaskStatusUpdateEvent(
                  id=task_send_params.id,
                  status=TaskStatus(
                      state=task_status.state,
                  ),
                  final=True
              )
            )
        except Exception as e:
            logger.error(f"An error occurred while streaming the response: {e}")
            yield JSONRPCResponse(
                id=request.id,
                error=InternalError(
                    message="An error occurred while streaming the response"
                ),
            )
    def _validate_request(
        self, request: Union[SendTaskRequest, SendTaskStreamingRequest]
    ) -> None:
        task_send_params: TaskSendParams = request.params
        if not utils.are_modalities_compatible(
            task_send_params.acceptedOutputModes, ReimbursementAgent.SUPPORTED_CONTENT_TYPES
        ):
            logger.warning(
                "Unsupported output mode. Received %s, Support %s",
                task_send_params.acceptedOutputModes,
                ReimbursementAgent.SUPPORTED_CONTENT_TYPES,
            )
            return utils.new_incompatible_types_error(request.id)
    async def on_send_task(self, request: SendTaskRequest) -> SendTaskResponse:
        error = self._validate_request(request)
        if error:
            return error
        await self.upsert_task(request.params)
        return await self._invoke(request)
    async def on_send_task_subscribe(
        self, request: SendTaskStreamingRequest
    ) -> AsyncIterable[SendTaskStreamingResponse] | JSONRPCResponse:
        error = self._validate_request(request)
        if error:
            return error
        await self.upsert_task(request.params)
        return self._stream_generator(request)
    async def _update_store(
        self, task_id: str, status: TaskStatus, artifacts: list[Artifact]
    ) -> Task:
        async with self.lock:
            try:
                task = self.tasks[task_id]
            except KeyError:
                logger.error(f"Task {task_id} not found for updating the task")
                raise ValueError(f"Task {task_id} not found")
            task.status = status
            #if status.message is not None:
            #    self.task_messages[task_id].append(status.message)
            if artifacts is not None:
                if task.artifacts is None:
                    task.artifacts = []
                task.artifacts.extend(artifacts)
            return task
    async def _invoke(self, request: SendTaskRequest) -> SendTaskResponse:
        task_send_params: TaskSendParams = request.params
        query = self._get_user_query(task_send_params)
        try:
            result = self.agent.invoke(query, task_send_params.sessionId)
        except Exception as e:
            logger.error(f"Error invoking agent: {e}")
            raise ValueError(f"Error invoking agent: {e}")
        parts = [{"type": "text", "text": result}]
        task_state = TaskState.INPUT_REQUIRED if "MISSING_INFO:" in result else TaskState.COMPLETED
        task = await self._update_store(
            task_send_params.id,
            TaskStatus(
                state=task_state, message=Message(role="agent", parts=parts)
            ),
            [Artifact(parts=parts)],
        )
        return SendTaskResponse(id=request.id, result=task)
    def _get_user_query(self, task_send_params: TaskSendParams) -> str:
        part = task_send_params.message.parts[0]
        if not isinstance(part, TextPart):
            raise ValueError("Only text parts are supported")
        return part.text


Muti-Agent Orestractor 
samples/python/hosts/multiagent
samples/python/hosts/multiagent/__init__.py blank 

samples/python/hosts/multiagent/agent.py


from .host_agent import HostAgent

root_agent = HostAgent(["http://localhost:10000"]).create_agent()

samples/python/hosts/multiagent/host_agent.py

import sys
import asyncio
import functools
import json
import uuid
import threading
from typing import List, Optional, Callable

from google.genai import types
import base64

from google.adk import Agent
from google.adk.agents.invocation_context import InvocationContext
from google.adk.agents.readonly_context import ReadonlyContext
from google.adk.agents.callback_context import CallbackContext
from google.adk.tools.tool_context import ToolContext
from .remote_agent_connection import (
    RemoteAgentConnections,
    TaskUpdateCallback
)
from common.client import A2ACardResolver
from common.types import (
    AgentCard,
    Message,
    TaskState,
    Task,
    TaskSendParams,
    TextPart,
    DataPart,
    Part,
    TaskStatusUpdateEvent,
)


class HostAgent:
  """The host agent.

  This is the agent responsible for choosing which remote agents to send
  tasks to and coordinate their work.
  """

  def __init__(
      self,
      remote_agent_addresses: List[str],
      task_callback: TaskUpdateCallback | None = None
  ):
    self.task_callback = task_callback
    self.remote_agent_connections: dict[str, RemoteAgentConnections] = {}
    self.cards: dict[str, AgentCard] = {}
    for address in remote_agent_addresses:
      card_resolver = A2ACardResolver(address)
      card = card_resolver.get_agent_card()
      remote_connection = RemoteAgentConnections(card)
      self.remote_agent_connections[card.name] = remote_connection
      self.cards[card.name] = card
    agent_info = []
    for ra in self.list_remote_agents():
      agent_info.append(json.dumps(ra))
    self.agents = '\n'.join(agent_info)

  def register_agent_card(self, card: AgentCard):
    remote_connection = RemoteAgentConnections(card)
    self.remote_agent_connections[card.name] = remote_connection
    self.cards[card.name] = card
    agent_info = []
    for ra in self.list_remote_agents():
      agent_info.append(json.dumps(ra))
    self.agents = '\n'.join(agent_info)

  def create_agent(self) -> Agent:
    return Agent(
        model="gemini-2.0-flash-001",
        name="host_agent",
        instruction=self.root_instruction,
        before_model_callback=self.before_model_callback,
        description=(
            "This agent orchestrates the decomposition of the user request into"
            " tasks that can be performed by the child agents."
        ),
        tools=[
            self.list_remote_agents,
            self.send_task,
        ],
    )

  def root_instruction(self, context: ReadonlyContext) -> str:
    current_agent = self.check_state(context)
    return f"""You are a expert delegator that can delegate the user request to the
appropriate remote agents.

Discovery:
- You can use `list_remote_agents` to list the available remote agents you
can use to delegate the task.

Execution:
- For actionable tasks, you can use `create_task` to assign tasks to remote agents to perform.
Be sure to include the remote agent name when you response to the user.

You can use `check_pending_task_states` to check the states of the pending
tasks.

Please rely on tools to address the request, don't make up the response. If you are not sure, please ask the user for more details.
Focus on the most recent parts of the conversation primarily.

If there is an active agent, send the request to that agent with the update task tool.

Agents:
{self.agents}

Current agent: {current_agent['active_agent']}
"""

  def check_state(self, context: ReadonlyContext):
    state = context.state
    if ('session_id' in state and
        'session_active' in state and
        state['session_active'] and
        'agent' in state):
      return {"active_agent": f'{state["agent"]}'}
    return {"active_agent": "None"}

  def before_model_callback(self, callback_context: CallbackContext, llm_request):
    state = callback_context.state
    if 'session_active' not in state or not state['session_active']:
      if 'session_id' not in state:
        state['session_id'] = str(uuid.uuid4())
      state['session_active'] = True

  def list_remote_agents(self):
    """List the available remote agents you can use to delegate the task."""
    if not self.remote_agent_connections:
      return []

    remote_agent_info = []
    for card in self.cards.values():
      remote_agent_info.append(
          {"name": card.name, "description": card.description}
      )
    return remote_agent_info

  async def send_task(
      self,
      agent_name: str,
      message: str,
      tool_context: ToolContext):
    """Sends a task either streaming (if supported) or non-streaming.

    This will send a message to the remote agent named agent_name.

    Args:
      agent_name: The name of the agent to send the task to.
      message: The message to send to the agent for the task.
      tool_context: The tool context this method runs in.

    Yields:
      A dictionary of JSON data.
    """
    if agent_name not in self.remote_agent_connections:
      raise ValueError(f"Agent {agent_name} not found")
    state = tool_context.state
    state['agent'] = agent_name
    card = self.cards[agent_name]
    client = self.remote_agent_connections[agent_name]
    if not client:
      raise ValueError(f"Client not available for {agent_name}")
    if 'task_id' in state:
      taskId = state['task_id']
    else:
      taskId = str(uuid.uuid4())
    sessionId = state['session_id']
    task: Task
    messageId = ""
    metadata = {}
    if 'input_message_metadata' in state:
      metadata.update(**state['input_message_metadata'])
      if 'message_id' in state['input_message_metadata']:
        messageId = state['input_message_metadata']['message_id']
    if not messageId:
      messageId = str(uuid.uuid4())
    metadata.update(**{'conversation_id': sessionId, 'message_id': messageId})
    request: TaskSendParams = TaskSendParams(
        id=taskId,
        sessionId=sessionId,
        message=Message(
            role="user",
            parts=[TextPart(text=message)],
            metadata=metadata,
        ),
        acceptedOutputModes=["text", "text/plain", "image/png"],
        # pushNotification=None,
        metadata={'conversation_id': sessionId},
    )
    task = await client.send_task(request, self.task_callback)
    # Assume completion unless a state returns that isn't complete
    state['session_active'] = task.status.state not in [
        TaskState.COMPLETED,
        TaskState.CANCELED,
        TaskState.FAILED,
        TaskState.UNKNOWN,
    ]
    if task.status.state == TaskState.INPUT_REQUIRED:
      # Force user input back
      tool_context.actions.skip_summarization = True
      tool_context.actions.escalate = True
    elif task.status.state == TaskState.CANCELED:
      # Open question, should we return some info for cancellation instead
      raise ValueError(f"Agent {agent_name} task {task.id} is cancelled")
    elif task.status.state == TaskState.FAILED:
      # Raise error for failure
      raise ValueError(f"Agent {agent_name} task {task.id} failed")
    response = []
    if task.status.message:
      # Assume the information is in the task message.
      response.extend(convert_parts(task.status.message.parts, tool_context))
    if task.artifacts:
      for artifact in task.artifacts:
        response.extend(convert_parts(artifact.parts, tool_context))
    return response

def convert_parts(parts: list[Part], tool_context: ToolContext):
  rval = []
  for p in parts:
    rval.append(convert_part(p, tool_context))
  return rval

def convert_part(part: Part, tool_context: ToolContext):
  if part.type == "text":
    return part.text
  elif part.type == "data":
    return part.data
  elif part.type == "file":
    # Repackage A2A FilePart to google.genai Blob
    # Currently not considering plain text as files    
    file_id = part.file.name
    file_bytes = base64.b64decode(part.file.bytes)    
    file_part = types.Part(
      inline_data=types.Blob(
        mime_type=part.file.mimeType,
        data=file_bytes))
    tool_context.save_artifact(file_id, file_part)
    tool_context.actions.skip_summarization = True
    tool_context.actions.escalate = True
    return DataPart(data = {"artifact-file-id": file_id})
  return f"Unknown type: {p.type}"



samples/python/hosts/multiagent/remote_agent_connection.py
from typing import Callable
import uuid
from common.types import (
    AgentCard,
    Task,
    TaskSendParams,
    TaskStatusUpdateEvent,
    TaskArtifactUpdateEvent,
    TaskStatus,
    TaskState,
)
from common.client import A2AClient

TaskCallbackArg = Task | TaskStatusUpdateEvent | TaskArtifactUpdateEvent
TaskUpdateCallback = Callable[[TaskCallbackArg], Task]

class RemoteAgentConnections:
  """A class to hold the connections to the remote agents."""

  def __init__(self, agent_card: AgentCard):
    self.agent_client = A2AClient(agent_card)
    self.card = agent_card

    self.conversation_name = None
    self.conversation = None
    self.pending_tasks = set()

  def get_agent(self) -> AgentCard:
    return self.card

  async def send_task(
      self,
      request: TaskSendParams,
      task_callback: TaskUpdateCallback | None,
  ) -> Task | None:
    if self.card.capabilities.streaming:
      task = None
      if task_callback:
        task_callback(Task(
            id=request.id,
            sessionId=request.sessionId,
            status=TaskStatus(
                state=TaskState.SUBMITTED,
                message=request.message,
            ),
            history=[request.message],
        ))
      async for response in self.agent_client.send_task_streaming(request.model_dump()):
        merge_metadata(response.result, request)
        # For task status updates, we need to propagate metadata and provide
        # a unique message id.
        if (hasattr(response.result, 'status') and
            hasattr(response.result.status, 'message') and
            response.result.status.message):
          merge_metadata(response.result.status.message, request.message)
          m = response.result.status.message
          if not m.metadata:
            m.metadata = {}
          if 'message_id' in m.metadata:
            m.metadata['last_message_id'] = m.metadata['message_id']
          m.metadata['message_id'] = str(uuid.uuid4())
        if task_callback:
          task = task_callback(response.result)
        if hasattr(response.result, 'final') and response.result.final:
          break
      return task
    else: # Non-streaming
      response = await self.agent_client.send_task(request.model_dump())
      merge_metadata(response.result, request)
      # For task status updates, we need to propagate metadata and provide
      # a unique message id.
      if (hasattr(response.result, 'status') and
          hasattr(response.result.status, 'message') and
          response.result.status.message):
        merge_metadata(response.result.status.message, request.message)
        m = response.result.status.message
        if not m.metadata:
          m.metadata = {}
        if 'message_id' in m.metadata:
          m.metadata['last_message_id'] = m.metadata['message_id']
        m.metadata['message_id'] = str(uuid.uuid4())

      if task_callback:
        task_callback(response.result)
      return response.result

def merge_metadata(target, source):
  if not hasattr(target, 'metadata') or not hasattr(source, 'metadata'):
    return
  if target.metadata and source.metadata:
    target.metadata.update(source.metadata)
  elif source.metadata:
    target.metadata = dict(**source.metadata)
