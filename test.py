import psycopg2
from db_utils import connect_db
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def root():
    return {"message": "Hello from FastAPI!"}



def get_recent_session_ids(limit=10):
    """Retrieves the most recent session IDs based on message timestamps."""
    conn = connect_db()
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT session_id 
            FROM (
                SELECT session_id, MAX(timestamp) as last_activity
                FROM messages
                GROUP BY session_id
                ORDER BY last_activity DESC
                LIMIT %s
            ) subquery;
        """, (limit,))

        recent_sessions = cur.fetchall()
        return [session['session_id'] for session in recent_sessions]
    except psycopg2.Error as e:
        print(f"Error retrieving recent session IDs: {e}")
        raise
    finally:
        cur.close()
        conn.close()

# Example usage:
# print(get_recent_session_ids())


# Example usage:
print(get_recent_session_ids(7))
