import logging
import jwt
from datetime import datetime, timedelta
from fastapi.security import HTTPAuthorizationCredentials
from fastapi import HTTPException
from cryptography.fernet import Fernet, InvalidToken as FernetInvalidToken
from const import ALGORITHM, SECRET_KEY, TOKEN_EXPIRATION
import os
from dotenv import load_dotenv
load_dotenv()



#generate encryption key
ENCRYPTION_KEY =  Fernet.generate_key()
fernet = Fernet(ENCRYPTION_KEY)

def get_payload():
    try:
        return {
            "exp": datetime.utcnow() + timedelta(minutes=TOKEN_EXPIRATION),
            "iat": datetime.utcnow()
        }
    except Exception as e:
        logging.error({"event": "token_payload_error", "error": str(e)})
        raise


def create_jwt_token(payload):
    try:
        jwt_token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
        return jwt_token.decode() if isinstance(jwt_token, bytes) else jwt_token
    except Exception as e:
        logging.error({"event": "jwt_encoding_error", "error": str(e)})
        raise


def encrypt_token(token):
    try:
        encrypted = fernet.encrypt(token.encode())
        return encrypted.decode()
    except Exception as e:
        logging.error({"event": "token_encryption_error", "error": str(e)})
        raise


def generate_token():
    """
    Generate a JWT token with expiration time
    """
    try:
        from datetime import datetime, timedelta
        import jwt
        from cryptography.fernet import Fernet

        logging.info("Starting token generation...")

        payload = {
            "exp": datetime.utcnow() + timedelta(minutes=TOKEN_EXPIRATION),
            "iat": datetime.utcnow()
        }

        try:
            jwt_token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
            logging.info("JWT token generated successfully.")
        except Exception as jwt_err:
            logging.error({"event": "jwt_encoding_error", "error": str(jwt_err)})
            raise HTTPException(status_code=500, detail="JWT encoding failed.")

        try:
            if isinstance(jwt_token, bytes):
                jwt_token = jwt_token.decode()

            encrypted_token = fernet.encrypt(jwt_token.encode())
            logging.info("Token encryption successful.")
        except Exception as enc_err:
            logging.error({"event": "fernet_encryption_error", "error": str(enc_err)})
            raise HTTPException(status_code=500, detail="Token encryption failed.")

        return encrypted_token.decode()

    except Exception as e:
        logging.error({"event": "token_generation_error", "error": str(e)})
        raise HTTPException(status_code=500, detail="Error generation token")

    

def verify_bearer_token(credentials: HTTPAuthorizationCredentials):
    """
    Verify the JWT token
    """
    try: 
        encrypted_token = credentials.credentials

        decrypted_jwt_token = fernet.decrypt(encrypted_token.encode()).decode()

        payload = jwt.decode(decrypted_jwt_token, SECRET_KEY, algorithms = [ALGORITHM])

        return True
    
    except FernetInvalidToken:
        #Handle invalid Fernet token
        raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.ExpiredSignatureError:
        #Handle expired JWT
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        #Handle invalid jwt
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        logging.error({
            "event":"token_verification_error",
            "error": str(e)
        })
        raise HTTPException(status_code=500, detail="Error verifying token")
