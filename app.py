import functools
import os
import secrets
from contextlib import contextmanager
from datetime import datetime

import psycopg2
from psycopg2.extras import RealDictCursor
from flask import (
    Flask, jsonify, redirect, render_template,
    request, session, url_for,
)

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "dev-secret-change-me")

_DATABASE_URL = os.environ.get("DATABASE_URL", "")
if _DATABASE_URL.startswith("postgres://"):
    _DATABASE_URL = _DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Passwords loaded from env vars — usernames are fixed
USERS = {
    "admin":     os.environ.get("PASSWORD_ADMIN", ""),
    "Maximo":    os.environ.get("PASSWORD_MAXIMO", ""),
    "Guillermo": os.environ.get("PASSWORD_GUILLERMO", ""),
}

CATEGORIES = [
    "supermercado", "restaurantes", "alquiler", "transporte",
    "viajes", "ropa_compras", "salud_gym", "fertilidad",
    "envios", "ocio", "suscripciones",
    "claude", "adopta_abuelo", "comunidad_stro", "temu", "otros",
]


# ── Auth helpers ─────────────────────────────────────────────
def current_user():
    return session.get("username")


def login_required(f):
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        if not session.get("username"):
            if request.path.startswith("/api/"):
                return jsonify({"error": "No autenticado"}), 401
            return redirect(url_for("login"))
        return f(*args, **kwargs)
    return decorated


# ── Auth routes ──────────────────────────────────────────────
@app.route("/login", methods=["GET", "POST"])
def login():
    error = None
    if request.method == "POST":
        username = request.form.get("username", "")
        password = request.form.get("password", "")
        stored   = USERS.get(username, "")
        if stored and secrets.compare_digest(password, stored):
            session["username"] = username
            return redirect(url_for("index"))
        error = "Usuario o contraseña incorrectos"
    return render_template("login.html", error=error)


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


# ── DB ───────────────────────────────────────────────────────
@contextmanager
def get_db():
    conn = psycopg2.connect(_DATABASE_URL, cursor_factory=RealDictCursor)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS expenses (
                    id         SERIAL PRIMARY KEY,
                    username   TEXT NOT NULL,
                    amount     NUMERIC(10,2) NOT NULL,
                    category   TEXT NOT NULL,
                    note       TEXT,
                    date       DATE NOT NULL,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                )
                """
            )
            # Migration: add username column to pre-existing tables
            cur.execute(
                """
                ALTER TABLE expenses
                ADD COLUMN IF NOT EXISTS username TEXT NOT NULL DEFAULT 'admin'
                """
            )


# ── App routes ───────────────────────────────────────────────
@app.route("/")
@login_required
def index():
    return render_template("index.html", username=current_user())


@app.route("/api/expenses", methods=["GET"])
@login_required
def list_expenses():
    month = request.args.get("month") or datetime.today().strftime("%Y-%m")
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, amount::float, category, note,
                       TO_CHAR(date, 'YYYY-MM-DD') AS date
                FROM expenses
                WHERE username = %s
                  AND TO_CHAR(date, 'YYYY-MM') = %s
                ORDER BY date DESC, id DESC
                """,
                (current_user(), month),
            )
            rows = cur.fetchall()
    return jsonify([dict(r) for r in rows])


@app.route("/api/expenses", methods=["POST"])
@login_required
def add_expense():
    data = request.get_json(silent=True) or {}
    try:
        amount = float(data["amount"])
        assert amount > 0
    except (KeyError, ValueError, AssertionError):
        return jsonify({"error": "Importe inválido"}), 400

    category = data.get("category", "")
    if category not in CATEGORIES:
        return jsonify({"error": "Categoría inválida"}), 400

    note = (data.get("note") or "").strip()[:200]
    date = data.get("date") or datetime.today().strftime("%Y-%m-%d")

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO expenses (username, amount, category, note, date)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, amount::float, category, note,
                          TO_CHAR(date, 'YYYY-MM-DD') AS date
                """,
                (current_user(), amount, category, note or None, date),
            )
            row = cur.fetchone()
    return jsonify(dict(row)), 201


@app.route("/api/expenses/<int:expense_id>", methods=["DELETE"])
@login_required
def delete_expense(expense_id):
    with get_db() as conn:
        with conn.cursor() as cur:
            # username check prevents deleting another user's expense
            cur.execute(
                "DELETE FROM expenses WHERE id = %s AND username = %s",
                (expense_id, current_user()),
            )
    return jsonify({"deleted": expense_id})


@app.route("/api/summary")
@login_required
def summary():
    month = request.args.get("month") or datetime.today().strftime("%Y-%m")
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT category, SUM(amount)::float AS total
                FROM expenses
                WHERE username = %s
                  AND TO_CHAR(date, 'YYYY-MM') = %s
                GROUP BY category
                ORDER BY total DESC
                """,
                (current_user(), month),
            )
            by_cat = cur.fetchall()
            cur.execute(
                """
                SELECT COALESCE(SUM(amount), 0)::float AS total
                FROM expenses
                WHERE username = %s
                  AND TO_CHAR(date, 'YYYY-MM') = %s
                """,
                (current_user(), month),
            )
            grand = cur.fetchone()
    return jsonify(
        {
            "month": month,
            "by_category": [dict(r) for r in by_cat],
            "total": grand["total"],
        }
    )


if __name__ == "__main__":
    init_db()
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
