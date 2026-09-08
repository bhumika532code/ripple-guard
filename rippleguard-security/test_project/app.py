import os
import sqlite3


def search_user():
    connection = sqlite3.connect("users.db")

    username = input("Enter username: ")

    query = "SELECT * FROM users WHERE username = '" + username + "'"

    return connection.execute(query).fetchall()


def run_command():
    command = input("Enter command: ")

    return os.system(command)


def read_file():
    filename = input("Enter filename: ")

    with open(filename, "r") as file:
        return file.read()