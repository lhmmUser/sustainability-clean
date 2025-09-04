import logging
import time
import os
from db_utils import add_message, get_user_conversations
from langchain_community.callbacks.manager import get_openai_callback
from langchain_openai import AzureChatOpenAI, ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from const import USD_INR_CONVERSION_RATE, base_url, apim_key, OPEN_API_KEY
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv
load_dotenv()


async def generate_sustainable_bot_response(user_id, session_id, user_query, name, age, gender, city, start_time, prompt_template):
    conversations_history = get_user_conversations(user_id, session_id)
    
    conversation_context = []

    if conversations_history:
        for conv in conversations_history:
            conversation_context.append(
                {
                    "role": "user",
                    "content": conv.get('user_qustion', '')
                }
            )
            conversation_context.append(
                {
                    "role": "assistant",
                    "content": conv.get('answer',''),
                }
            )
        logging.info(conversations_history)

    prompt_suffix = f"\nHere are the user details: Name: {name}, age: {age}, gender: {gender}, city: {city}"
    	
    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", prompt_template + prompt_suffix),
            MessagesPlaceholder("chat_history"),
            ("human", "{input}"),
        ]
    )

    llm = ChatOpenAI(
	model="gpt-4o-mini",
	api_key = OPEN_API_KEY,
	temperature=0.2,
	streaming=True
    )	
    
    #llm = AzureChatOpenAI(
    #    azure_endpoint=base_url,
    #    openai_api_version="2025-01-01-preview",
    #    deployment_name="gpt-4o-mini",
    #    openai_api_key=apim_key,
    #    temperature=0.2,
    #    streaming=True
    #)

    #llm = ChatGoogleGenerativeAI(
    #    model="gemini-2.0-flash",
    #    api_key = "AIzaSyAp_zaLyYW5BA-ZCj2YZ3AcOMtvjAJ1mTg",
    #    temperature= 0.2,
    #    streaming=True
    #)

    chain = prompt | llm
    answer_text = ""

    with get_openai_callback() as cb:
        for chunk in chain.stream({"chat_history": conversation_context, "input": user_query}):
            answer_text += chunk.content
            yield chunk.content

        #Calculate latency
        latency = time.time() - start_time

        total_tokens = cb.total_tokens
        prompt_tokens = cb.prompt_tokens
        completion_tokens = cb.completion_tokens
        cost_usd = cb.total_cost

        # Convert USD to INR
        cost_inr = USD_INR_CONVERSION_RATE * cost_usd

        #Save to Database
        message_id = add_message(
            user_id,
            session_id,
            user_query,
            answer_text,
            latency,
            total_tokens,
            prompt_tokens,
            completion_tokens,
            cost_inr
        )

        #yield the message_id at the end
        yield {
            "message_id": message_id,
            "latency": latency,
            "total_tokens": total_tokens,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "cost_inr": cost_inr
        }

        logging.info({
            "event":"message_processed",
            "user_id": user_id,
            "session_id": session_id,
            "latency": latency,
            "total_tokens": total_tokens,
            "message_id": message_id,
            "cost_inr": cost_inr
        })
