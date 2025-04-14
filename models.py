from pydantic import BaseModel

class TokenRequest(BaseModel):
    api_key: str

class PromptUpdate(BaseModel):
    prompt: str

class UserMessage(BaseModel):
    user_id: str
    session_id: str
    name: str
    age: str
    gender: str
    city: str
    incoming_message: str

class UserDetails(BaseModel):
    user_id: str
    name: str
    age: int
    gender: str
    city: str

class FeedbackUpdate(BaseModel):
    message_id: str
    user_feedback: int