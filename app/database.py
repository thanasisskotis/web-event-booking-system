from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Connection string: postgresql://<user>:<password>@<host>/<database>
# TODO: hardcoded for now, move to app.core.config.settings.database_url later
SQLALCHEMY_DATABASE_URL = "postgresql://skotis:skotis@localhost/eventapp_db"

engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


# Dependency που θα χρησιμοποιείται σε κάθε FastAPI endpoint
# για να παίρνει μια DB session και να τη κλείνει αυτόματα μετά.
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
