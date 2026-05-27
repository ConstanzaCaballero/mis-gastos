import os
from contextlib import contextmanager
from datetime import datetime

import psycopg2
from psycopg2.extras import RealDictCursor
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

_DATABASE_URL = os.environ.get("DATABASE_URL", "")
if _DATABASE_URL.startswith("postgres://"):
    _DATABASE_URL = _DATABASE_URL.replace("postgres://", "postgresql://", 1)

CATEGORIES = [
    "supermercado", "restaurantes", "alquiler", "transporte",
    "viajes", "ropa_compras", "salud_gym", "fertilidad",
    "hogar", "envios", "ocio", "suscripciones",
    "claude", "adopta_abuelo", "comunidad_stro", "temu",
]


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
                    amount     NUMERIC(10,2) NOT NULL,
                    category   TEXT NOT NULL,
                    note       TEXT,
                    date       DATE NOT NULL,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                )
                """
            )


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/expenses", methods=["GET"])
def list_expenses():
    month = request.args.get("month") or datetime.today().strftime("%Y-%m")
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, amount::float, category, note,
                       TO_CHAR(date, 'YYYY-MM-DD') AS date
                FROM expenses
                WHERE TO_CHAR(date, 'YYYY-MM') = %s
                ORDER BY date DESC, id DESC
                """,
                (month,),
            )
            rows = cur.fetchall()
    return jsonify([dict(r) for r in rows])


@app.route("/api/expenses", methods=["POST"])
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
                INSERT INTO expenses (amount, category, note, date)
                VALUES (%s, %s, %s, %s)
                RETURNING id, amount::float, category, note,
                          TO_CHAR(date, 'YYYY-MM-DD') AS date
                """,
                (amount, category, note or None, date),
            )
            row = cur.fetchone()
    return jsonify(dict(row)), 201


@app.route("/api/expenses/<int:expense_id>", methods=["DELETE"])
def delete_expense(expense_id):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM expenses WHERE id = %s", (expense_id,))
    return jsonify({"deleted": expense_id})


@app.route("/api/summary")
def summary():
    month = request.args.get("month") or datetime.today().strftime("%Y-%m")
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT category, SUM(amount)::float AS total
                FROM expenses
                WHERE TO_CHAR(date, 'YYYY-MM') = %s
                GROUP BY category
                ORDER BY total DESC
                """,
                (month,),
            )
            by_cat = cur.fetchall()
            cur.execute(
                "SELECT COALESCE(SUM(amount), 0)::float AS total FROM expenses "
                "WHERE TO_CHAR(date, 'YYYY-MM') = %s",
                (month,),
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
