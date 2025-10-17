from time import sleep
import requests as r
from bs4 import BeautifulSoup
from urllib.request import urlopen
from urllib.parse import urlparse
from Data import Posts, Tags, TempComments, engine
from sqlalchemy import func
from sqlalchemy.orm import Session
from html_to_markdown import convert_to_markdown
import threading
import logging
import os
import time

last_time = 0

logging.basicConfig(level=logging.INFO, filename="py_log.log", filemode="w",
                    format="%(asctime)s %(levelname)s %(message)s")


def get_response(url="http://shikimori.one/forum/news.rss"):
    return r.get(url, headers=
    {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64; rv:45.0) Gecko/20100101 Firefox/45.0"})


def open_and_save(post, url, name=None):
    with urlopen(url) as response:
        data = response.read()
        filename, file_extension = os.path.splitext(urlparse(url).path)
        name = name + file_extension if name else filename.split("/")[-1] + file_extension
        logging.info(name)
        if not os.path.exists(f"/var/www/html/ShikimoryClone/img/{post}"):
            os.mkdir(f"/var/www/html/ShikimoryClone/img/{post}")
        with open(f"/var/www/html/ShikimoryClone/img/{post}/{name}", "wb") as photo:
            photo.write(data)
            logging.info(f"good {post}")


def load_comments(link, post_id):
    sleep(3600)
    post_page = BeautifulSoup(get_response(link).text, "lxml")
    comments = post_page.find_all("div", {"class": "b-comment"})
    for comment in comments:
        pub_date = comment.find("header").find("time")["datetime"]

        nickname = comment["data-user_nickname"]
        photo = comment.find("header").find("img")["src"]

        content = comment.find("div", {"class": "body"})
        unless.decompose() if (unless := content.find("div", {"class": "b-replies translated-before"})) else ...
        unless.decompose() if (unless := content.find("div", {"class": "b-replies translated-before single"})) else ...
        for marker in content.find_all("span", {"class": "marker"}):
            marker.decompose()

        quotes = []
        for quote in content.find_all("div", {"class": "b-quote"}):
            quote_content_text = quote.find("div", {"class": "quote-content"}).text
            # noinspection PyTypeChecker
            quote.find("div", {"class": "quote-content"}).replace_with(
                "\n?quote?" + quote_content_text + "\n\n")
            quotes.append("?quote?" + quote_content_text)
        content = convert_to_markdown(content)

        for quote in quotes:
            content = content.replace(quote, ">" + quote[7:])
        with Session(bind=engine) as session:
            session.add(TempComments(
                post_id=post_id,
                pubDate=pub_date,
                user_type=0,
                nickname=nickname,
                photo=photo,
                content=content
            ))
            session.commit()


def get_news():
    global last_time
    try:
        response = get_response()
        soup = BeautifulSoup(response.text, "xml")
        item = soup.find_all("item")
        if item:
            item = soup.find_all("item")[0]
        else:
            return
        new_time = item.find("pubDate").text
        new_time = time.strptime(new_time, "%a, %d %b %Y %H:%M:%S %z")
        new_time = time.mktime(new_time)
        if new_time > last_time:
            last_time = new_time
            with Session(bind=engine) as session:
                post_id = session.query(func.max(Posts.id)).scalar()
                if post_id:
                    post_id += 1
                else:
                    post_id = 1

            # Link
            link = soup.find_all("link")[1].text

            # Title
            title = item.find("title").text

            # Description
            description = BeautifulSoup(item.find("description").text, "lxml")
            description_full = str(description.body)
            for el in description.find_all("br"):
                # noinspection PyTypeChecker
                el.replace_with("_br_delimiter_")
            description = description.get_text(strip=False)
            if len(description.split("_br_delimiter__br_delimiter_")) - 1:
                description = description.split("_br_delimiter__br_delimiter_")[0] + "\n\n" + \
                              description.split("_br_delimiter__br_delimiter_")[1]
            else:
                description = description.split("_br_delimiter__br_delimiter_")[0]

            while "_br_delimiter_" in description:
                description = description.replace("_br_delimiter_", "\n")

            # Posts page
            post_page = BeautifulSoup(get_response(link).text, "lxml")

            # Photos
            photos = post_page.find("div", {"class": "inner block"}).find_all("img")
            photo = photos[1]["src"]
            del photos[1]
            if not photo.startswith("http"):
                photo = "https:" + photo
            open_and_save(str(post_id), photo, "title")
            for photo in photos[1:]:
                photo = photo["src"]
                if not photo.startswith("http"):
                    continue
                open_and_save(str(post_id), photo)

            # PubDate
            pub_date = item.find("pubDate").text

            # New post adding
            with Session(bind=engine) as session:
                post = Posts(link=link,
                             title=title,
                             description=description,
                             description_full=description_full,
                             pubDate=pub_date)
                tags = [Tags(name=name["data-text"])
                        for name in post_page.find("div", {"class": "tags"}).find_all("div")]
                post.tags = tags
                session.add(post)
                session.commit()

            threading.Thread(target=lambda: load_comments(link, post_id)).start()
    except Exception:
        logging.exception("get_news error")


active = True
while active:
    get_news()
    sleep(360)
