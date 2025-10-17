from sqlalchemy import create_engine, Column, Text, String, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, relationship
from sqlalchemy.orm import Mapped, mapped_column
from os import environ
import logging
import uuid

logging.basicConfig(level=logging.INFO, filename="py_log.log", filemode="w",
                    format="%(asctime)s %(levelname)s %(message)s")


class Base(DeclarativeBase):
    pass


class Posts(Base):
    __tablename__ = "posts"
    id: Mapped[int] = mapped_column(primary_key=True)

    link: Mapped[str] = Column(String)
    title: Mapped[str] = Column(String)
    description: Mapped[str] = Column(Text)
    description_full: Mapped[str] = Column(Text)
    pubDate: Mapped[str] = Column(String)

    user_comments = relationship("UserComments")
    temp_comments = relationship("TempComments")
    tags = relationship("Tags")


class UserComments(Base):
    __tablename__ = "user_comments"
    id: Mapped[int] = mapped_column(primary_key=True)
    post_id = Column(Integer, ForeignKey("posts.id"))
    user_id = Column(UUID, ForeignKey("users.id"))
    pubDate: Mapped[str] = Column(String)

    content: Mapped[str] = Column(String)


class TempComments(Base):
    __tablename__ = "temp_comments"
    id: Mapped[int] = mapped_column(primary_key=True)
    post_id = Column(Integer, ForeignKey("posts.id"))
    pubDate: Mapped[str] = Column(String)

    user_type: Mapped[int] = Column(Integer)
    nickname: Mapped[str] = Column(String)
    email: Mapped[str] = Column(String, nullable=True)
    photo: Mapped[str] = Column(String, nullable=True)

    content: Mapped[str] = Column(String)


class Users(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nickname: Mapped[str] = Column(String)
    password: Mapped[str] = Column(String)
    email: Mapped[str] = Column(String)
    photo: Mapped[str] = Column(String)
    last_comment_date: Mapped[int] = 0
    comments = relationship("UserComments")


class Tags(Base):
    __tablename__ = "tags"
    id: Mapped[int] = mapped_column(primary_key=True)
    post_id = Column(Integer, ForeignKey("posts.id"))
    name: Mapped[str] = Column(String)


try:
    engine = create_engine(
        f"postgresql+psycopg2://shikimory:{environ.get("DB_PASSWORD")}@{environ.get("DB_HOST", "postgres_data")}/"
        f"{environ.get("DB_NAME", "shikimory_clone")}")
    Base.metadata.create_all(engine)
except Exception as msg:
    logging.exception("sql_error")
    raise msg
