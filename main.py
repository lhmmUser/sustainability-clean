import asyncio
import os
import json
from const import API_KEY
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse, StreamingResponse
import time
import logging
from db_utils import (
    add_persona,
    get_all_user_personas,
    get_user_persona,
    update_feedback,
    get_message_by_id,
    get_user_messages,
    get_analytics,
    get_all_user_messages,
    upsert_user_persona
)
from sustainable_bot import generate_sustainable_bot_response
from models import TokenRequest, PromptUpdate, UserMessage, UserDetails, FeedbackUpdate
from personality_scheduler import setup_personality_analysis_scheduler
from utils import  verify_bearer_token, generate_token
from fastapi.requests import Request
from dotenv import load_dotenv
load_dotenv()


logging.basicConfig(level=logging.INFO)
print(os.path.abspath(__file__))

backend_app = FastAPI()
app = FastAPI(title="Sustainability", docs_url = None)

backend_app.mount("/static", StaticFiles(directory="static"), name="static")

backend_app.mount("/dashboard", StaticFiles(directory="dashboard/out",
                             html=True), name = "test-dashboard")

backend_app.mount("/chat",StaticFiles(directory="chat/out",
                              html=True), name = "test-agent")

backend_app.mount("/prompt", StaticFiles(directory="frontend/out", 
                                 html=True), name="test-prompt")

app.mount("/api",backend_app)
backend_app.add_middleware(
    CORSMiddleware,
    allow_origins = ["*"],
    allow_credentials = True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()
print(security,'security')
print(os.path.abspath(__file__))

@backend_app.on_event("startup")
async def startup_event():
    setup_personality_analysis_scheduler()

@backend_app.get("/docs",include_in_schema=False)
async def swagger_ui_html():
    return get_swagger_ui_html(
        openapi_url="/openapi.json",
        title="Sustaianability",
        swagger_favicon_url="/static/favico.ico"
    )

@backend_app.get("/get-prompt",include_in_schema=False)
async def get_prompt(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        if not verify_bearer_token(credentials):
            raise HTTPException(status_code=401, detail="Invalid API key")
        
        prompt_file = 'prompt.json'
        print(prompt_file,"promptfile")
        print(os.path.exists(prompt_file),"path")
        if os.path.exists(prompt_file):
            with open(prompt_file, 'r') as f:
                data = json.load(f)
                print(data,"data")
                prompt_template = data.get('prompt')
                if prompt_template:
                    return {
                        "success": True,
                        "prompt": prompt_template
                    }
        return{
            "success": False,
            "error": "Prompt not found"
        }
    except Exception as e:
        logging.error({
            "event":"unexpected_error",
            "error":str(e)
        })
        raise HTTPException(
            status_code=500, detail = "An unexpected error occured."
        )
    
@backend_app.post("/update-prompt", include_in_schema=False)
async def update_prompt(prompt_update: PromptUpdate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        if not verify_bearer_token(credentials):
            raise HTTPException(status_code=401, detail="Invalid API key")

        prompt = prompt_update.prompt
        if not prompt:
            raise HTTPException(status_code=400, detail="No prompt provided.")

        # Save the prompt to a JSON file
        prompt_file = 'prompt.json'
        with open(prompt_file, 'w') as f:
            json.dump({'prompt': prompt}, f)

        return {
            "success": True,
            "message": "Prompt updated successfully.",
            "error": None
        }

    except Exception as e:
        logging.error({
            "event": "unexpected_error",
            "error": str(e)
        })
        raise HTTPException(status_code=500, detail=str(e))


@backend_app.post("/generate-bearer-token")
async def generate_bearer_token(token_request: TokenRequest):
    try:

        if token_request.api_key != API_KEY:
            raise HTTPException(status_code=401, detail="Invalid API key")

        # If the API key is valid, generate a new bearer token
        new_bearer_token = generate_token()

        return {
            "success": True,
            "message": "Bearer token generated successfully.",
            "data": {"bearer_token": new_bearer_token},
            "error": None
        }

    except HTTPException as http_err:
        # This will catch the HTTPException raised for invalid API key
        logging.error({
            "event": "api_key_error",
            "error": str(http_err.detail)
        })
        raise http_err

    except Exception as e:
        logging.error({
            "event": "unexpected_error",
            "error": str(e)
        })
        raise HTTPException(
            status_code=500, detail="An unexpected error occurred.")


@backend_app.post("/upsert-user")
async def register_user(user_details: UserDetails, credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        # Verify API key
        if not verify_bearer_token(credentials):
            raise HTTPException(status_code=401, detail="Invalid API key")

        # Check if user already exists
        user_persona = get_user_persona(user_details.user_id)
        if user_persona:
            # If user exists, update their data
            upsert_user_persona(
                user_details.user_id,
                user_details.name,
                user_details.age,
                user_details.gender,
                user_details.city
            )
            return {
                "success": True,
                "message": "User data updated successfully.",
                "error": None
            }

        # If user does not exist, create new record
        upsert_user_persona(
            user_details.user_id,
            user_details.name,
            user_details.age,
            user_details.gender,
            user_details.city
        )

        return {
            "success": True,
            "message": "User registered successfully.",
            "error": None
        }

    except HTTPException as http_err:
        # Log and re-raise HTTP exceptions
        logging.error({
            "event": "api_key_error",
            "error": str(http_err.detail)
        })
        raise http_err

    except Exception as e:
        # Log unexpected errors
        logging.error({
            "event": "unexpected_error",
            "error": str(e)
        })
        raise HTTPException(
            status_code=500, detail=f"An unexpected error occurred: {str(e)}.")

@backend_app.post("/send-message")
async def send_message(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    try:
        # Step 1: Log raw request body
        body = await request.body()
        print("🧾 Raw JSON payload:", body.decode("utf-8"))

        # Step 2: Try to parse into model (will raise if 422)
        data = await request.json()
        print("✅ Parsed JSON:", data)

        user_message = UserMessage(**data)
        print("📦 user_message (parsed as Pydantic model):", user_message)

        # Step 3: Validate bearer token
        if not verify_bearer_token(credentials):
            raise HTTPException(status_code=401, detail="Invalid API key")

        # Step 4: Load prompt
        prompt_file = 'prompt.json'
        if os.path.exists(prompt_file):
            with open(prompt_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                prompt_template = data.get('prompt')
        else:
            raise HTTPException(status_code=400, detail="Prompt not found")

        if not prompt_template:
            raise HTTPException(status_code=400, detail="No prompt provided")

        # Step 5: Add persona to DB
        add_persona(
            user_message.user_id,
            user_message.name,
            user_message.age,
            user_message.gender,
            user_message.city
        )

        # Step 6: Async response stream
        async def response_stream():
            try:
                async for chunk in generate_sustainable_bot_response(
                    user_message.user_id,
                    user_message.session_id,
                    user_message.incoming_message,
                    user_message.name,
                    user_message.age,
                    user_message.gender,
                    user_message.city,
                    time.time(),
                    prompt_template
                ):
                    if "message_id" in chunk:
                        yield f"{json.dumps(chunk)}\n\n"
                    else:
                        yield chunk

            except asyncio.CancelledError:
                logging.warning("Message stream cancelled.")
                raise HTTPException(status_code=400, detail="Message stream cancelled.")

        return StreamingResponse(response_stream(), media_type="text/event-stream")

    except Exception as e:
        logging.error({
            "event": "unexpected_error",
            "error": str(e)
        })
        raise HTTPException(status_code=500, detail=f"Internal error: {e}")


# @app.post("/send-message")
# async def send_message(user_message: UserMessage, credentials: HTTPAuthorizationCredentials = Depends(security)):
#     try:

#         # Record start time
#         start_time = time.time()

#         if not verify_bearer_token(credentials):
#             raise HTTPException(status_code=401, detail="Invalid API key")

#         # Read the prompt from the JSON file
#         prompt_file = 'prompt.json'
#         if os.path.exists(prompt_file):
#             with open(prompt_file, 'r') as f:
#                 data = json.load(f)
#                 prompt_template = data.get('prompt')
#         else:
#             raise HTTPException(
#                 status_code=400, detail="Prompt not found. Please set the prompt first.")

#         if not prompt_template:
#             raise HTTPException(status_code=400, detail="No prompt provided.")
#         print(user_message, "usermessage")
#         add_persona(
#             user_message.user_id,
#             user_message.name,
#             user_message.age,
#             user_message.gender,
#             user_message.city
#         )

#         # Asynchronous response stream generator
#         async def response_stream():
#             try:
#                 async for chunk in generate_sustainable_bot_response(
#                     user_message.user_id,
#                     user_message.session_id,
#                     user_message.incoming_message,
#                     user_message.name,
#                     user_message.age,
#                     user_message.gender,
#                     user_message.city,
#                     start_time,
#                     prompt_template
#                 ):
#                     if "message_id" in chunk:
#                         yield f"{json.dumps(chunk)}\n\n"
#                     else:
#                         yield chunk
                        
#             except asyncio.CancelledError:
#                 logging.warning("Message stream cancelled.")
#                 raise HTTPException(
#                     status_code=400, detail="Message stream cancelled.")

#         return StreamingResponse(
#             response_stream(),
#             # Server-Sent Events (SSE) for real-time responses
#             media_type="text/event-stream"
#         )

#     except HTTPException as http_err:
#         # This will catch the HTTPException raised for invalid API key
#         logging.error({
#             "event": "api_key_error",
#             "error": str(http_err.detail)
#         })
#         raise http_err

#     except Exception as e:
#         logging.error({
#             "event": "unexpected_error",
#             "error": str(e),
#             "user_id": user_message.user_id
#         })
#         raise HTTPException(status_code=500, detail=str(e))


@backend_app.post("/update-feedback")
async def handle_feedback(feedback: FeedbackUpdate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:

        if not verify_bearer_token(credentials):
            raise HTTPException(status_code=401, detail="Invalid API key")

        # Check if feedback value is valid
        if feedback.user_feedback not in [-1, 1]:
            raise HTTPException(
                status_code=400, detail="Invalid feedback value")

        # Update feedback in database
        updated_message = update_feedback(
            feedback.message_id, feedback.user_feedback)

        if not updated_message:
            raise HTTPException(status_code=404, detail="Message not found")

        logging.info({
            "event": "feedback_updated",
            "message_id": feedback.message_id,
            "user_feedback": feedback.user_feedback
        })

        return {
            "success": True,
            "message": "Feedback updated successfully.",
            "error": None
        }

    except HTTPException as he:
        logging.warning({
            "event": "feedback_error",
            "message_id": feedback.message_id,
            "error": he.detail
        })
        raise he

    except Exception as e:
        logging.error({
            "event": "unexpected_error",
            "error": str(e)
        })
        raise HTTPException(
            status_code=500, detail="An unexpected error occurred.")


@backend_app.get("/get-message/{message_id}")
async def get_message(message_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:

        if not verify_bearer_token(credentials):
            raise HTTPException(status_code=401, detail="Invalid API key")

        message = get_message_by_id(message_id)

        if not message:
            raise HTTPException(
                status_code=404, detail="Message not found.")

        logging.info({
            "event": "message_retrieved",
            "message_id": message_id
        })

        return {
            "success": True,
            "message": "Message retrieved successfully.",
            "data": message,
            "error": None
        }

    except HTTPException as he:
        logging.warning({
            "event": "message_retrieval_error",
            "message_id": message_id,
            "error": he.detail
        })
        raise he
    except Exception as e:
        logging.error({
            "event": "unexpected_error",
            "error": str(e)
        })
        raise HTTPException(
            status_code=500, detail="An unexpected error occurred.")


@backend_app.get("/messages/{user_id}")
async def get_messages(user_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:

        if not verify_bearer_token(credentials):
            raise HTTPException(status_code=401, detail="Invalid API key")

        messages = get_user_messages(user_id)

        if not messages:
            raise HTTPException(
                status_code=404, detail="No messages found for the user.")

        logging.info({
            "event": "messages_retrieved",
            "user_id": user_id,
            "message_count": len(messages)
        })

        return {
            "success": True,
            "message": "Messages retrieved successfully.",
            "data": messages,
            "error": None
        }

    except HTTPException as he:
        logging.warning({
            "event": "message_retrieval_error",
            "user_id": user_id,
            "error": he.detail
        })
        raise he
    except Exception as e:
        logging.error({
            "event": "unexpected_error",
            "error": str(e)
        })
        raise HTTPException(
            status_code=500, detail="An unexpected error occurred.")


@backend_app.get("/messages")
async def get_all_messages(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:

        if not verify_bearer_token(credentials):
            raise HTTPException(status_code=401, detail="Invalid API key")

        messages = get_all_user_messages()

        if not messages:
            raise HTTPException(
                status_code=404, detail="No messages found.")

        logging.info({
            "event": "messages_retrieved",
            "message_count": len(messages)
        })

        return {
            "success": True,
            "message": "All messages retrieved successfully.",
            "data": messages,
            "error": None
        }

    except HTTPException as he:
        logging.warning({
            "event": "message_retrieval_error",
            "error": he.detail
        })
        raise he
    except Exception as e:
        logging.error({
            "event": "unexpected_error",
            "error": str(e)
        })
        raise HTTPException(
            status_code=500, detail="An unexpected error occurred.")


@backend_app.get("/users/{user_id}")
async def get_personas(user_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:

        if not verify_bearer_token(credentials):
            raise HTTPException(status_code=401, detail="Invalid API key")

        personas = get_user_persona(user_id)

        if not personas:
            raise HTTPException(
                status_code=404, detail=f"No personas found for user {user_id}."
            )

        logging.info({
            "event": "user_personas_retrieved",
            "user_id": user_id,
            "persona_count": len(personas)
        })

        return {
            "success": True,
            "message": f"Personas retrieved successfully for user {user_id}.",
            "data": personas,
            "error": None
        }

    except HTTPException as he:
        logging.warning({
            "event": "user_persona_error",
            "user_id": user_id,
            "error": he.detail
        })
        raise he
    except Exception as e:
        logging.error({
            "event": "unexpected_error",
            "user_id": user_id,
            "error": str(e)
        })
        raise HTTPException(
            status_code=500, detail="An unexpected error occurred."
        )


@backend_app.get("/users")
async def get_all_personas(credentials: HTTPAuthorizationCredentials = Depends(security)):

    try:

        if not verify_bearer_token(credentials):
            raise HTTPException(status_code=401, detail="Invalid API key")

        personas = get_all_user_personas()

        if not personas:
            raise HTTPException(
                status_code=404, detail="No personas found in the database."
            )

        logging.info({
            "event": "all_user_personas_retrieved",
            "persona_count": len(personas)
        })

        return {
            "success": True,
            "message": "All personas retrieved successfully.",
            "data": personas,
            "error": None
        }

    except HTTPException as he:
        logging.warning({
            "event": "all_user_personas_error",
            "error": he.detail
        })
        raise he
    except Exception as e:
        logging.error({
            "event": "unexpected_error",
            "error": str(e)
        })
        raise HTTPException(
            status_code=500, detail="An unexpected error occurred."
        )


@backend_app.get("/analytics")
async def get_message_analytics(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:

        if not verify_bearer_token(credentials):
            raise HTTPException(status_code=401, detail="Invalid API key")
        analytics = get_analytics()

        logging.info({
            "event": "analytics_retrieved",
            "analytics": analytics
        })

        return {
            "success": True,
            "message": "Analytics retrieved successfully.",
            "data": analytics,
            "error": None
        }

    except HTTPException as http_err:
        # This will catch the HTTPException raised for invalid API key
        logging.error({
            "event": "api_key_error",
            "error": str(http_err.detail)
        })
        raise http_err

    except Exception as e:
        logging.error({
            "event": "unexpected_error",
            "error": str(e)
        })
        raise HTTPException(
            status_code=500, detail="An unexpected error occurred.")


@backend_app.get("/")
async def root():
    return {"message": "Hello from root!"}


@app.get("/prompt/{path:path}", include_in_schema=False)
async def serve_frontend(path: str):
    # Base directory for frontend files
    base_path = "frontend/out"

    # Full file path
    file_path = os.path.join(base_path, path)

    # Check if the requested file exists
    if os.path.isfile(file_path):
        return FileResponse(file_path)

    # Fallback to index.html for dynamic routes
    return FileResponse(os.path.join(base_path, "index.html"))


@app.get("/chat/{path:path}", include_in_schema=False)
async def serve_frontend(path: str):
    # Base directory for frontend files
    base_path = "chat/out"

    # Full file path
    file_path = os.path.join(base_path, path)

    # Check if the requested file exists
    if os.path.isfile(file_path):
        return FileResponse(file_path)

    # Fallback to index.html for dynamic routes
    return FileResponse(os.path.join(base_path, "index.html"))


@app.get("/dashboard/{path:path}", include_in_schema=False)
async def serve_frontend(path: str):
    # Base directory for frontend files
    base_path = "dashboard/out"

    # Full file path
    file_path = os.path.join(base_path, path)

    # Check if the requested file exists
    if os.path.isfile(file_path):
        return FileResponse(file_path)

    # Fallback to index.html for dynamic routes
    return FileResponse(os.path.join(base_path, "index.html"))

    



