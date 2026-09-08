from flask import Flask, request

app = Flask(__name__)


@app.route("/")
def home():
    return """
    <h1>RippleGuard Test Application</h1>
    <p>This application is intentionally vulnerable.</p>
    <a href="/search?q=test">Search</a>
    """


@app.route("/search")
def search():
    query = request.args.get("q", "")

    return f"""
    <h2>Search Results</h2>
    <p>You searched for: {query}</p>
    """


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)