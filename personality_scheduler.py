
import asyncio
import logging
import os
from langchain_openai import AzureChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_community.callbacks.manager import get_openai_callback
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from db_utils import get_last_3_days_user_queries, get_user_persona, update_persona
#from const import USD_INR_CONVERSION_RATE, base_url, apim_key
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv
load_dotenv()

USD_INR_CONVERSION_RATE = 90
base_url = os.getenv("base_url")
apim_key = os.getenv("apim_key")

async def batch_personality_analysis():
    """
    Processes personality analysis for all users who have had conversations in the last 3 days.
    """
    try:
        logging.info("Starting batch personality analysis")

        # Get all user queries from the last 3 days
        user_queries = get_last_3_days_user_queries()
        logging.info(f"Retrieved {len(user_queries)} users' data for analysis")

        for user_data in user_queries:
            user_id = user_data['user_id']
            conversations = user_data['conversations']

            logging.info(
                f"Processing user {user_id} with {len(conversations)} conversations")
            # Get existing persona
            existing_personas = get_user_persona(user_id)

            # Prepare existing traits context
            existing_traits_context = []
            if existing_personas and existing_personas['personality_info']:
                existing_traits_context.append({
                    "role": "system",
                    "content": f"Existing Known Traits: {existing_personas['personality_info']}"
                })
                logging.info(
                    f"Found existing traits for user {user_id} - {existing_personas['personality_info']}")

            # Prepare conversation context
            conversation_context = [
                {"role": "user",
                    "content": f"User Question: {conv['user_question']}"}
                for conv in conversations
            ]

            # Skip if no conversations
            if not conversation_context:
                logging.info(
                    f"No conversations found for user {user_id}, skipping")
                continue

            prompt_template = """
You are a analysis bot for Aashirvaad Atta, your job is to analyze user conversation history to identify new, distinct health-related personality traits, behaviors, or conditions that can be used to uderstand these users better. Return short, specific keywords or phrases describing the user's health habits, conditions, or concerns (e.g., "frequent smoker", "diabetic", "fitness enthusiast").

Here are the existing list of keywords for the current user: 
{previous_health_traits}

Here is the conversation history: 
{conversation_history}


Guidelines:
    - **Keywords Only**: Do not include full sentences or explanations.
    - **No Repetition or Overlap**: Avoid keywords that are synonyms, duplicates, or semantically overlapping with existing keywords (e.g., "frequent smoker" and "quit smoking initiative" are considered duplicates).
    - **Empty Response**: If no new health-related traits are identified, return an empty string.

Output Format:
    - Return a newline-separated list of NEW, DISTINCT keywords or phrases (e.g., "keywords_1\nkeywords_2").
    - Do not include any additional text or commentary.
"""

            # Use LangChain to analyze
            prompt = ChatPromptTemplate.from_messages([
                ("human", prompt_template)
            ])

            #llm = AzureChatOpenAI(
            #    azure_endpoint=base_url,
            #    openai_api_version="2025-01-01-preview",
            #    deployment_name="gpt-4o-mini",
            #    openai_api_key=apim_key,
            #    temperature=0.2,
            #)

            
            llm = ChatGoogleGenerativeAI(
                model="gemini-2.0-flash",
                api_key = "AIzaSyAp_zaLyYW5BA-ZCj2YZ3AcOMtvjAJ1mTg",
                temperature= 0.2,
                streaming=True
            )   
            chain = prompt | llm

            with get_openai_callback() as cb:
                response = chain.invoke(
                    {
                        "previous_health_traits": existing_traits_context,
                        "conversation_history": conversation_context
                    }
                )

                if response:
                    logging.info(f"LLM Response: {response.content}")
                else:
                    logging.warning("LLM returned no response.")

                logging.info(
                    f"Analysis completed for user {user_id}. Tokens used: {cb.total_tokens}")

                traits_text = response.content if response else ""
                new_traits = []
                if traits_text:
                    # Extract and clean traits
                    new_traits = list(set(
                        trait.strip().lower()
                        for trait in traits_text.split("\n")
                        if trait.strip() and not any(
                            exclusion in trait.lower() for exclusion in ["no new health", "invalid"]
                        )
                    ))

                logging.info(
                    f"Analysis completed for user {user_id}. Tokens used: {cb.total_tokens}")

                total_tokens = cb.total_tokens
                prompt_tokens = cb.prompt_tokens
                completion_tokens = cb.completion_tokens
                cost_usd = cb.total_cost

                # Convert USD to INR
                cost_inr = USD_INR_CONVERSION_RATE * cost_usd

                # Update persona with new traits and usage metrics
                update_persona(
                    user_id,
                    new_traits,
                    new_total_tokens=total_tokens,
                    new_prompt_tokens=prompt_tokens,
                    new_completion_tokens=completion_tokens,
                    new_cost_inr=cost_inr
                )

                if new_traits:
                    logging.info(
                        f"Updated personality traits for user {user_id}: {new_traits}")
                else:
                    logging.info(f"No new traits found for user {user_id}")

            # Add small delay between users to prevent rate limiting
            await asyncio.sleep(1)

        logging.info("Batch personality analysis completed successfully")

    except Exception as e:
        logging.error(f"Error in batch personality analysis: {e}")


def setup_personality_analysis_scheduler():
    """
    Sets up the scheduler to run personality analysis every 3 days.
    """
    try:
        scheduler = AsyncIOScheduler()

        # Schedule the batch analysis to run every 3 days
        job = scheduler.add_job(
            batch_personality_analysis,
            trigger=CronTrigger(hour=2, minute=0, day="*/3"),
            id='personality_analysis',
            name='Batch personality analysis',
            replace_existing=True
        )

        scheduler.start()

        next_run = job.next_run_time
        logging.info("Personality analysis scheduler started successfully")
        logging.info(
            f"Next analysis will run at: {next_run.strftime('%Y-%m-%d %H:%M:%S')}")
        logging.info(f"Schedule: Every 3 days at 2:00 AM")

    except Exception as e:
        logging.error(f"Error setting up personality analysis scheduler: {e}")
