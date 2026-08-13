import enum

from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy import Enum as SAEnum
from sqlalchemy.sql import func

from app.database import Base


class UserPrivilege(str, enum.Enum):
    # Only two account kinds exist: the built-in administrator, and the ordinary
    # registered user. "Organizer" and "participant" are NOT stored roles -- they
    # are modes of use derived per event from relationships (Events.organizer_id
    # and Bookings), so a single USER acts as both depending on context.
    ADMIN = "ADMIN"
    USER = "USER"


class UserStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False)
    phone = Column(String(30), nullable=False)
    address = Column(String(300), nullable=True)
    city = Column(String(100), nullable=True)
    country = Column(String(100), nullable=True)
    tax_id = Column(String(20), unique=True, nullable=False)
    priviledge = Column(SAEnum(UserPrivilege, name="user_priviledge"), nullable=False, default=UserPrivilege.USER)
    status = Column(SAEnum(UserStatus, name="user_status"), nullable=False, default=UserStatus.PENDING)
    created_at = Column(DateTime(timezone=True), server_default=func.now())