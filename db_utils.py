# db_utils.py
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime, timedelta

# Database configuration
# DB_NAME = "happytummy"
# DB_USER = "cognotools"
# DB_PASS = "hrsh@cognotools"
# DB_HOST = "localhost"
# DB_PORT = "5432"

DB_HOST ="database-1.cpkaga6akmlt.ap-south-1.rds.amazonaws.com"
DB_PORT = 5432
DB_NAME = "sustainability"
DB_USER = "postgres"
DB_PASS = "Th!5!5lhmm"


def connect_db():
    """Establishes a connection to the PostgreSQL database."""
    try:
        conn = psycopg2.connect(
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASS,
            host=DB_HOST,
            port=DB_PORT,
            cursor_factory=RealDictCursor  # This will return results as dictionaries
        )
        print("postgres connected ")

        with conn.cursor() as cur:
            cur.execute("SELECT version();")
            print(f"PostgreSQL version: {cur.fetchone()['version']}")
        return conn
    except psycopg2.Error as e:
        print(f"Unable to connect to database: {e}")
        raise


def create_db_schema():
    """Creates the necessary tables if they don't exist."""
    conn = connect_db()
    cur = conn.cursor()

    # Enable uuid-ossp extension (required for uuid_generate_v4)
    cur.execute("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";")

    try:

        # Create user_persona table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS user_persona (
                user_id TEXT PRIMARY KEY,
                name TEXT,
                age INTEGER,
                gender TEXT,
                city TEXT,
                personality_info TEXT[],
                total_tokens INTEGER DEFAULT 0,
                prompt_tokens INTEGER  DEFAULT 0,
                completion_tokens INTEGER DEFAULT 0,
                cost_inr FLOAT DEFAULT 0,
                created_at TEXT, 
                updated_at TEXT 
            );
        """)

        # Create messages table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                message_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id TEXT NOT NULL REFERENCES user_persona(user_id) ON DELETE CASCADE,
                session_id TEXT NOT NULL,
                user_question TEXT NOT NULL,
                answer TEXT NOT NULL,
                user_feedback INTEGER DEFAULT 0,
                latency FLOAT,
                total_tokens INTEGER,
                prompt_tokens INTEGER,
                completion_tokens INTEGER,
                cost_inr FLOAT,
                timestamp TEXT 
            );
        """)

        # Create index on user_id and session_id for faster queries
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_personas_user_id 
            ON user_persona(user_id);
        """)

        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_messages_user_id_session_id 
            ON messages(user_id, session_id);
        """)

        conn.commit()
        print("Database schema created successfully")
    except psycopg2.Error as e:
        print(f"Error creating schema: {e}")
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()


def add_message(user_id, session_id, question, answer, latency, total_tokens, prompt_tokens, completion_tokens, cost_inr):
    """Adds a new message to the database."""
    conn = connect_db()
    cur = conn.cursor()

    try:
        now = datetime.now()
        time_offset = timedelta(hours=5, minutes=30)
        ist_time = now + time_offset
        timestamp = ist_time.strftime("%Y-%m-%d %H:%M:%S")

        cur.execute("""
            INSERT INTO messages 
            (user_id, session_id, user_question, answer, latency, total_tokens, prompt_tokens, completion_tokens, cost_inr, timestamp)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING message_id;
        """, (user_id, session_id, question, answer, latency, total_tokens, prompt_tokens, completion_tokens, cost_inr, timestamp))

        message_id = cur.fetchone()['message_id']
        conn.commit()
        return message_id
    except psycopg2.Error as e:
        print(f"Error adding message: {e}")
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()


def update_feedback(message_id, feedback):
    """Updates the feedback for a specific message."""
    conn = connect_db()
    cur = conn.cursor()

    try:
        cur.execute("""
            UPDATE messages 
            SET user_feedback = %s 
            WHERE message_id = %s
            RETURNING *;
        """, (feedback, message_id))

        updated_message = cur.fetchone()
        conn.commit()
        return updated_message
    except psycopg2.Error as e:
        print(f"Error updating feedback: {e}")
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()


def get_message_by_id(message_id):
    """Retrieves a specific message by its ID."""
    conn = connect_db()
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT * FROM messages 
            WHERE message_id = %s;
        """, (message_id,))

        message = cur.fetchone()
        return message
    except psycopg2.Error as e:
        print(f"Error retrieving message: {e}")
        raise
    finally:
        cur.close()
        conn.close()


def get_user_messages(user_id):
    """Retrieves all messages for a specific user, clustered by session_id."""
    conn = connect_db()
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT user_id, 
                   session_id, 
                   json_agg(json_build_object(
                       'message_id', message_id,
                       'user_question', user_question,
                       'answer', answer,
                       'user_feedback', user_feedback,
                       'latency', latency,
                       'total_tokens', total_tokens,
                       'prompt_tokens', prompt_tokens,
                       'completion_tokens', completion_tokens,
                       'cost_inr', cost_inr,
                       'timestamp', timestamp
                       ) ORDER BY timestamp DESC
                    ) AS messages
            FROM messages 
            WHERE user_id = %s 
            GROUP BY user_id, session_id
            ORDER BY MAX(timestamp) DESC;
        """, (user_id,))

        clustered_messages = cur.fetchall()
        return clustered_messages
    except psycopg2.Error as e:
        print(f"Error retrieving user messages: {e}")
        raise
    finally:
        cur.close()
        conn.close()


def get_all_user_messages():
    """Retrieves all messages for all users, grouped by user_id and session_id."""
    conn = connect_db()
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT user_id, 
                   session_id, 
                   json_agg(json_build_object(
                       'message_id', message_id,
                       'user_question', user_question,
                       'answer', answer,
                       'user_feedback', user_feedback,
                       'latency', latency,
                       'total_tokens', total_tokens,
                       'prompt_tokens', prompt_tokens,
                       'completion_tokens', completion_tokens,
                       'cost_inr', cost_inr,
                       'timestamp', timestamp
                       ) ORDER BY timestamp DESC
                    ) AS messages
            FROM messages 
            GROUP BY user_id, session_id
            ORDER BY MAX(timestamp) DESC;
        """)

        grouped_messages = cur.fetchall()
        return grouped_messages
    except psycopg2.Error as e:
        print(f"Error retrieving all user messages: {e}")
        raise
    finally:
        cur.close()
        conn.close()


def get_analytics():
    """Retrieves comprehensive analytics about message interactions, users, and sessions."""
    conn = connect_db()
    cur = conn.cursor()

    try:
        cur.execute("""
            WITH user_session_stats AS (
                SELECT 
                    user_id, 
                    COUNT(DISTINCT session_id) as sessions_per_user,
                    COUNT(*) as messages_per_user
                FROM messages
                GROUP BY user_id
            )

            SELECT 
                -- Basic message metrics
                COUNT(*) as total_messages,
                COUNT(DISTINCT user_id) as total_users,
                COUNT(DISTINCT session_id) as total_sessions,
                
                -- Average metrics
                ROUND(AVG(latency)::numeric, 3) as avg_latency,
                ROUND(AVG(total_tokens)::numeric, 2) as avg_total_tokens,
                ROUND(AVG(prompt_tokens)::numeric, 2) as avg_input_tokens,
                ROUND(AVG(completion_tokens)::numeric, 2) as avg_output_tokens,
                ROUND(AVG(cost_inr)::numeric, 4) as avg_cost_per_message,
                
                -- Token metrics
                SUM(total_tokens) as total_tokens_used,
                SUM(prompt_tokens) as total_input_tokens,
                SUM(completion_tokens) as total_output_tokens,
                
                -- Feedback metrics
                COUNT(CASE WHEN user_feedback = 1 THEN 1 END) as positive_feedback,
                COUNT(CASE WHEN user_feedback = -1 THEN 1 END) as negative_feedback,
                COUNT(CASE WHEN user_feedback = 0 THEN 1 END) as no_feedback,
                
                -- User and session distribution
                ROUND(COUNT(DISTINCT session_id)::numeric / NULLIF(COUNT(DISTINCT user_id), 0), 2) as avg_sessions_per_user,
                ROUND(COUNT(*)::numeric / NULLIF(COUNT(DISTINCT user_id), 0), 2) as avg_messages_per_user,
                ROUND(COUNT(*)::numeric / NULLIF(COUNT(DISTINCT session_id), 0), 2) as avg_messages_per_session,
                
                -- Cost metrics
                ROUND(SUM(cost_inr)::numeric, 2) as total_cost
            FROM messages;
        """)

        analytics = cur.fetchone()
        return analytics
    except psycopg2.Error as e:
        print(f"Error retrieving analytics: {e}")
        raise
    finally:
        cur.close()
        conn.close()


def add_persona(user_id, name, age, gender, city):
    conn = connect_db()
    cur = conn.cursor()

    try:
        # Check if the user already has a persona
        cur.execute("""
            SELECT user_id 
            FROM user_persona 
            WHERE user_id = %s;
        """, (user_id,))
        existing_persona = cur.fetchone()

        if existing_persona:
            return user_id

        now = datetime.now()
        time_offset = timedelta(hours=5, minutes=30)
        ist_time = now + time_offset
        timestamp = ist_time.strftime("%Y-%m-%d %H:%M:%S")

        cur.execute("""
            INSERT INTO user_persona 
            (user_id, name, age, gender, city, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s);
        """, (user_id, name, age, gender, city, timestamp, timestamp))

        conn.commit()
        return user_id
    except psycopg2.Error as e:
        print(f"Error adding persona: {e}")
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()


def upsert_user_persona(user_id, name=None, age=None, gender=None, city=None):

    conn = connect_db()
    cur = conn.cursor()

    try:
        now = datetime.now()
        time_offset = timedelta(hours=5, minutes=30)
        ist_time = now + time_offset
        timestamp = ist_time.strftime("%Y-%m-%d %H:%M:%S")

        cur.execute(
            """
            INSERT INTO user_persona (user_id, name, age, gender, city, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (user_id)
            DO UPDATE SET
                name = COALESCE(EXCLUDED.name, user_persona.name),
                age = COALESCE(EXCLUDED.age, user_persona.age),
                gender = COALESCE(EXCLUDED.gender, user_persona.gender),
                city = COALESCE(EXCLUDED.city, user_persona.city),
                updated_at = EXCLUDED.updated_at;
            """,
            (user_id, name, age, gender, city, timestamp, timestamp)
        )

        conn.commit()
        return f"User persona for user_id '{user_id}' has been created or updated."

    except psycopg2.Error as e:
        print(f"Error creating or updating user persona: {e}")
        conn.rollback()
        raise

    finally:
        cur.close()
        conn.close()


def get_user_persona(user_id):
    """Retrieves all personality traits for a specific user."""
    conn = connect_db()
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT * FROM user_persona 
            WHERE user_id = %s 
        """, (user_id,))

        personas = cur.fetchone()
        return personas
    except psycopg2.Error as e:
        print(f"Error retrieving user personas: {e}")
        raise
    finally:
        cur.close()
        conn.close()


def update_persona(user_id, new_personality_info, new_total_tokens, new_prompt_tokens, new_completion_tokens, new_cost_inr):
    conn = connect_db()
    cur = conn.cursor()

    try:
        now = datetime.now()
        time_offset = timedelta(hours=5, minutes=30)
        ist_time = now + time_offset
        timestamp = ist_time.strftime("%Y-%m-%d %H:%M:%S")

        # Retrieve the existing persona record
        cur.execute("""
            SELECT personality_info, total_tokens, prompt_tokens, completion_tokens, cost_inr
            FROM user_persona
            WHERE user_id = %s;
        """, (user_id,))

        existing_record = cur.fetchone()

        if not existing_record:
            # Return early if no existing record is found
            return f"No persona found for user {user_id}, no update made."

        # Extract existing data
        existing_traits = existing_record['personality_info'] or []
        total_tokens = existing_record['total_tokens'] or 0
        prompt_tokens = existing_record['prompt_tokens'] or 0
        completion_tokens = existing_record['completion_tokens'] or 0
        cost_inr = existing_record['cost_inr'] or 0

        # Merge personality traits
        updated_traits = existing_traits
        if new_personality_info:
            updated_traits.extend([trait.lstrip('-').strip()
                                  for trait in new_personality_info if trait.strip()])
            updated_traits = list(set(updated_traits))  # Remove duplicates

        # Add new token usage and cost
        total_tokens += new_total_tokens
        prompt_tokens += new_prompt_tokens
        completion_tokens += new_completion_tokens
        cost_inr += new_cost_inr

        # Update the record
        cur.execute("""
            UPDATE user_persona
            SET personality_info = %s, total_tokens = %s, prompt_tokens = %s,
                completion_tokens = %s, cost_inr = %s, updated_at = %s
            WHERE user_id = %s;
        """, (updated_traits, total_tokens, prompt_tokens, completion_tokens, cost_inr, timestamp, user_id))

        conn.commit()
        return f"Persona updated for user {user_id}"

    except psycopg2.Error as e:
        print(f"Error updating persona: {e}")
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()


def get_all_user_personas():
    """Retrieves all personality traits for all users."""
    conn = connect_db()
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT * FROM user_persona 
            ORDER BY updated_at DESC;
        """)

        personas = cur.fetchall()
        return personas
    except psycopg2.Error as e:
        print(f"Error retrieving all personas: {e}")
        raise
    finally:
        cur.close()
        conn.close()


def get_user_conversations(user_id, session_id, n=3):
    """Retrieves the most recent `n` conversations for a specific user and session_id."""
    conn = connect_db()
    cur = conn.cursor()

    try:
        print(
            f"Retrieving {n} conversations for user {user_id}, session {session_id}")
        cur.execute("""
            SELECT user_question, answer 
            FROM messages 
            WHERE user_id = %s AND session_id = %s 
            ORDER BY timestamp DESC
            LIMIT %s;
        """, (user_id, session_id, n))

        conversations = cur.fetchall()
        return conversations
    except psycopg2.Error as e:
        print(
            f"Error retrieving conversations for user {user_id}, session {session_id}: {e}")
        raise
    finally:
        cur.close()
        conn.close()


def get_last_3_days_user_queries():
    """
    Retrieves user queries from the last 3 days, grouped by user_id and session_id.
    """
    conn = connect_db()
    cur = conn.cursor()

    try:
        # Calculate the timestamp for 3 days ago and format it as a string
        three_days_ago = datetime.now() - timedelta(days=3, hours=1)
        three_days_ago_str = three_days_ago.strftime("%Y-%m-%d %H:%M:%S")

        # Query with explicit casting of the timestamp column
        cur.execute("""
            SELECT 
                user_id,
                session_id,
                json_agg(json_build_object(
                    'user_question', user_question,
                    'answer', answer,
                    'timestamp', timestamp
                ) ORDER BY timestamp::timestamp ASC) AS conversations
            FROM messages
            WHERE timestamp::timestamp >= %s
            GROUP BY user_id, session_id
            ORDER BY user_id, session_id;
        """, (three_days_ago_str,))

        # Fetch all results
        user_queries = cur.fetchall()

        return user_queries

    except psycopg2.Error as e:
        print(f"Error retrieving last 3 days user queries: {e}")
        raise

    finally:
        cur.close()
        conn.close()


create_db_schema()

# sudo -u postgres psql


