import logging
import jwt
from datetime import datetime, timedelta
from fastapi.security import HTTPAuthorizationCredentials
from fastapi import HTTPException
from cryptography.fernet import Fernet, InvalidToken as FernetInvalidToken
#from const import ALGORITHM, SECRET_KEY, TOKEN_EXPIRATION
import os
from dotenv import load_dotenv
load_dotenv()

ALGORITHM = os.getenv("ALGORITHM")
SECRET_KEY = os.getenv("SECRET_KEY")
TOKEN_EXPIRATION = 30


#generate encryption key
ENCRYPTION_KEY =  Fernet.generate_key()
fernet = Fernet(ENCRYPTION_KEY)

def generate_token():
    """
    Generate a JWT token with expiration time
    """
    try:
        payload ={
            "exp":datetime.utcnow() + timedelta(minutes=TOKEN_EXPIRATION),
            "iat": datetime.utcnow()
        }
        jwt_token = jwt.encode(payload, SECRET_KEY, algorithm = ALGORITHM)

        encrypted_token = fernet.encrypt(jwt_token.encode())

        return encrypted_token.decode()
    
    except Exception as e:
        logging.error({
            "event":"token_generation_error",
            "error": str(e)
        })
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