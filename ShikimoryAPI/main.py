import re

from fastapi import FastAPI, Request, Query, HTTPException
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address

from Data import Posts, TempComments, UserComments, Users, engine
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, or_, and_
from email.utils import formatdate
from email_validator import validate_email, EmailNotValidError
from cachetools import TTLCache
from random import randint
import smtplib
from email.mime.text import MIMEText
from email.header import Header
import uuid
import asyncio
import re
import time
import logging
import os

logging.basicConfig(level=logging.INFO, filename="py_log.log", filemode="w",
                    format="%(asctime)s %(levelname)s %(message)s")

#add_header 'Access-Control-Allow-Origin' '*' always;
        	# add_header 'Access-Control-Allow-Methods' 'OPTIONS, GET, POST' always;
        	# add_header 'Access-Control-Allow-Headers' 'DNT, User-Agent, X-Requested-With, If-Modified-Since, Cache-Control, Content-Type, Range' always;
        	# add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range' always;

app = FastAPI()
v1 = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],  # Разрешаем все методы, включая OPTIONS
    allow_headers=["*"],
)

limiter = Limiter(key_func=get_remote_address)


@v1.get("/")
async def read_root():
    return {"message": "Hello, World"}


@v1.get("/get-posts/{page}")
async def get_posts(page: int, step: int = Query(5, ge=1, le=50)):
    with Session(bind=engine) as session:
        query = session.query(Posts).order_by(desc(Posts.id))
        posts = query.offset((page - 1) * step).limit(step).all()
        is_last = (min(post.id for post in posts) if posts else True) == session.query(func.min(Posts.id)).scalar()
        for post in posts:
            post.tags = post.tags
    return {
        "message": {
            "posts": posts,
            "is_last": is_last
        }
    }


@v1.get("/get-post/{post_id}")
async def get_post(post_id: int):
    with Session(bind=engine) as session:
        post = session.query(Posts).filter(Posts.id == post_id).first()
        post.tags = post.tags
        post.images = os.listdir(f"/var/www/html/ShikimoryClone/img/{post_id}")
    return {
        "message": {
            "post": post,
        }
    }


@v1.get("/get-post-comments/{post_id}")
async def get_post_comments(post_id: int, page: int = 1, step: int = Query(5, ge=1, le=50)):
    with (Session(bind=engine) as session):
        temp_comments = session.query(TempComments).filter(TempComments.post_id == post_id).order_by(TempComments.id)
        offset = temp_comments.count() - page * step
        is_last = False
        if offset <= 0:
            step = step + offset
            is_last = True
            offset = 0
        temp_comments = temp_comments.offset(offset).limit(step).all()
        if len(temp_comments) < step:
            user_comments = session.query(UserComments).filter(
                UserComments.post_id == post_id).offset((page - 1) * step).limit(step - len(temp_comments)).all()
        else:
            user_comments = []
    return {
        "message": {
            "temp_comments": temp_comments,
            "user_comments": user_comments,
            "page": page,
            "is_last": is_last
        }
    }


@v1.get("/search/")
async def search(q: str, page: int = 1, step: int = Query(5, ge=1, le=50)):
    with Session(bind=engine) as session:
        query = session.query(Posts).order_by(desc(Posts.id))
        my_filter = or_(Posts.title.ilike(f"%{q}%"),
                   Posts.description_full.ilike(f"%{q}%"))
        posts = query.filter(my_filter).offset((page - 1) * step).limit(step).all()
        for post in posts:
            post.tags = post.tags
        if posts:
            is_last = min([post.id for post in posts]) == session.query(
                func.min(Posts.id).filter(my_filter)).scalar()
        else:
            is_last = True
    return {
        "message": {
            "posts": posts,
            "is_last": is_last
        }
    }


class TempBody(BaseModel):
    content: str = Query(min_length=1, max_length=300)
    nickname: str = Query("Anonym", min_length=2, max_length=30)
    email: str | None = Query(None)


def get_ip(request: Request):
    if "x-forwarded-for" in request.headers:
        return request.headers["x-forwarded-for"].split(","[0].strip())
    return request.client.host


cache = TTLCache(maxsize=1000, ttl=900)
# cache_lock = asyncio.Lock()


@v1.post("/post/{post_id}/create-temp-comment/")
@limiter.limit("10/hour")
async def create_comment(request: Request, post_id: int, body: TempBody):
    if body.email != "" and body.email is not None:
        try:
            body.email = validate_email(body.email).email
        except EmailNotValidError:
            body.email = None
    with Session(bind=engine) as session:
        date = str(formatdate(localtime=True))
        session.add(TempComments(
            post_id=post_id,
            content=body.content,
            nickname=body.nickname,
            email=None, #body.email,
            photo="img/Anonym.png",
            pubDate=date,
            user_type=1
        ))
        for com_id in re.findall(r"\(http://193.124.93.120/temp-comments/(.+?)\)", body.content):
            mail = session.query(TempComments).filter(TempComments.id == com_id).first().email
            if mail:
                subject = 'На ваш комментарий был дан ответ'
                text = (f'Пользователь с ником {body.nickname} написал ответ на ваш комментарий под постом\n'
                        f'http://193.124.93.120/post/{post_id}')
                send_email(mail, subject, text)
        if body.email:
            comment_id = session.query(func.max(TempComments.id).filter(TempComments.post_id == post_id)).first()[0]
            # Отправка письма и запись в кэш
            code = randint(100000, 999999)
            cache[get_ip(request)] = (comment_id, code, body.email)

            subject = 'Код для подтверждения почты'
            text = f'{code}'
            send_email(body.email, subject, text)
        session.commit()
    return {"message": {
        "post_id": post_id,
        "content": body.content,
        "nickname": body.nickname,
        "email": body.email,
        "photo": "img/Anonym.png",
        "pubDate": date,
        "user_type": 1
    }}


class TempUserBody(BaseModel):
    user_id: str
    content: str = Query(min_length=1, max_length=300)


@v1.post("/post/{post_id}/create-temp-comment-user/")
@limiter.limit("30/hour")
async def create_user_comment(request: Request, post_id: int, body: TempUserBody):
    with Session(bind=engine) as session:
        user = session.query(Users).filter(Users.id == body.user_id).first()
        if not user:
            raise HTTPException(404, "User not found")
        for com_id in re.findall(r"\(http://193.124.93.120/temp-comments/(.+?)\)", body.content):
            mail = session.query(TempComments).filter(TempComments.id == com_id).first().email
            if mail:
                subject = 'На ваш комментарий был дан ответ'
                text = (f'Пользователь с ником {user.nickname} написал ответ на ваш комментарий под постом\n'
                        f'http://193.124.93.120/post/{post_id}')
                send_email(mail, subject, text)
        date = str(formatdate(localtime=True))
        nickname = user.nickname
        photo = user.photo
        session.add(TempComments(
            post_id=post_id,
            content=body.content,
            nickname=user.nickname,
            email=user.email,
            photo=user.photo,
            pubDate=date,
            user_type=1
        ))
        session.commit()
    return {"message": {
        "content": body.content,
        "nickname": nickname,
        "photo": photo,
        "pubDate": date,
        "user_type": 1
    }}


user_cache = TTLCache(maxsize=1000, ttl=900)


class UserBody(BaseModel):
    nickname: str = Query(min_length=1, max_length=27)
    password: str = Query(min_length=6, max_length=30)
    email: str = Query(min_length=1, max_length=320)
    photo: str = None


@v1.post("/registration/")
@limiter.limit("15/hour")
async def registration(request: Request, body: UserBody):
    try:
        # Проверка почты
        body.email = validate_email(body.email).email
        with Session(bind=engine) as session:
            if (session.query(Users).filter(
                    Users.email == body.email).first() is not None) or (get_ip(request) in user_cache):
                raise HTTPException(409, "The provided emil already registered")
        code = randint(100000, 999999)
        if body.photo is None:
            body.photo = "img/Anonym.png"
        user_cache[get_ip(request)] = (code, body.nickname, body.password, body.email, body.photo)

        # Отправка письма
        subject = 'Код для подтверждения почты'
        text = f'{code}'
        send_email(body.email, subject, text)
        return {"message": "Successful"}
    except EmailNotValidError:
        raise HTTPException(400, "Invalid email")


@v1.post("/verify-email/")
@limiter.limit("15/hour")
async def verify_email(request: Request, code: int):
    if not get_ip(request) in cache:
        raise HTTPException(404)
    data = cache[get_ip(request)]
    if data[1] == code:
        with Session(bind=engine) as session:
            session.query(TempComments).filter(TempComments.id == data[0]).first().email = data[2]
            session.commit()
        del cache[get_ip(request)]
        return {"message": "Successful"}
    else:
        raise HTTPException(400)


@v1.post("/verify-email-user/")
@limiter.limit("30/hour")
async def verify_email_user(request: Request, code: int):
    if not get_ip(request) in user_cache:
        raise HTTPException(404)
    data = user_cache[get_ip(request)]
    if data[0] == code:
        with Session(bind=engine) as session:
            # Создание пользователя
            session.add(Users(
                nickname=data[1],
                password=data[2],
                email=data[3],
                photo=data[4]
            ))
            session.commit()
        del user_cache[get_ip(request)]
        return {"message": "Successful"}
    else:
        raise HTTPException(400)


class UserLoginBody(BaseModel):
    email: str = Query(min_length=1, max_length=70)
    password: str = Query(min_length=6, max_length=30)


@v1.post("/login/")
@limiter.limit("30/minute")
async def login(request: Request, body: UserLoginBody):
    try:
        # Проверка почты
        body.email = validate_email(body.email).email
        with Session(bind=engine) as session:
            user = session.query(Users).filter(and_(Users.email == body.email, Users.password == body.password)).first()
            if user:
                return {"message": user.id}
            else:
                raise HTTPException(404, "User not found")
    except EmailNotValidError:
        raise HTTPException(400, "Invalid email")


@v1.get("/get-user-data/{user_id}")
async def get_user_data(user_id: str):
    with Session(bind=engine) as session:
        user = session.query(Users).filter(Users.id == uuid.UUID(user_id)).first()
        if not user:
            raise HTTPException(404)
    return {
        "message": {
            "user": user,
        }
    }


def send_email(to, subject, text):
    login = os.environ.get("SMTP_EMAIL")
    password = os.environ.get("SMTP_PASSWORD")
    server = smtplib.SMTP(os.environ.get("SMTP_HOST"), int(os.environ.get("SMTP_PORT", 587)))
    server.starttls()
    server.login(login, password)

    mime = MIMEText(text, 'plain', 'utf-8')
    mime['Subject'] = Header(subject, 'utf-8')
    server.sendmail(login, to, mime.as_string())
    server.close()


app.mount("/api/v1", v1)
