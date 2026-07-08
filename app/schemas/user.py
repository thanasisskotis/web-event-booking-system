from pydantic import BaseModel, ConfigDict, EmailStr

from app.models.models_user import UserPrivilege, UserStatus


class UserRegister(BaseModel):
    username: str
    password: str
    first_name: str
    last_name: str
    email: EmailStr
    phone: str
    address: str | None = None
    city: str | None = None
    country: str | None = None
    tax_id: str


class UserLogin(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    username: str
    first_name: str
    last_name: str
    email: EmailStr
    phone: str
    address: str | None
    city: str | None
    country: str | None
    tax_id: str
    priviledge: UserPrivilege
    status: UserStatus


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
