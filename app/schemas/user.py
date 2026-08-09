from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.models_user import UserPrivilege, UserStatus

class UserRegister(BaseModel):
    username: str = Field(max_length=50)
    password: str
    first_name: str = Field(max_length=100)
    last_name: str = Field(max_length=100)
    email: EmailStr = Field(max_length=150)
    phone: str = Field(max_length=30)
    address: str | None = Field(default=None, max_length=300)
    city: str | None = Field(default=None, max_length=100)
    country: str | None = Field(default=None, max_length=100)
    tax_id: str = Field(max_length=20)


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
