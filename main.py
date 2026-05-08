from flask import Flask, render_template, request, jsonify, send_from_directory
from datetime import datetime, timedelta, timezone
import os

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from supabase import create_client

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "marialuiza-dev-key")

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://baiussfhwaxbnymhksff.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "sb_publishable_4-DvZ7oAt6GjwyCWQkxXbw_hDQMWV2k")
ONESIGNAL_APP_ID = os.environ.get("ONESIGNAL_APP_ID", "adc50cce-7803-4997-b030-16e794a792bb")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Brazil is UTC-3, no DST since 2019
BR_TZ = timezone(timedelta(hours=-3))


def now_utc():
    return datetime.now(timezone.utc)


def now_br():
    return datetime.now(BR_TZ)


def fmt_dt(s):
    """Validate and normalize an ISO datetime string (with or without TZ offset)."""
    if not s:
        return None
    s = str(s).strip().replace('Z', '+00:00')
    if len(s) == 16:
        s += ':00'
    try:
        datetime.fromisoformat(s)
        return s
    except Exception:
        return None


def parse_dt(s):
    """Parse ISO datetime string to UTC-aware datetime."""
    if not s:
        return None
    s = str(s).strip().replace('Z', '+00:00')
    if len(s) == 16:
        s += ':00'
    try:
        dt = datetime.fromisoformat(s)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        return None


def today_br_utc_range():
    """Return (start_utc_iso, end_utc_iso) for today in Brazil time."""
    now = now_br()
    start = now.replace(hour=0, minute=0, second=0, microsecond=0).astimezone(timezone.utc)
    end   = now.replace(hour=23, minute=59, second=59, microsecond=0).astimezone(timezone.utc)
    return start.isoformat(), end.isoformat()


def ok(data=None, msg="ok"):
    return jsonify({"status": "ok", "msg": msg, "data": data})


def err(msg="erro", code=400):
    return jsonify({"status": "error", "msg": msg}), code


# ==================== HOME ====================
@app.route("/")
def home():
    return render_template("index.html", onesignal_app_id=ONESIGNAL_APP_ID)


# ==================== DASHBOARD ====================
@app.route("/api/dashboard")
def dashboard():
    try:
        start_utc, end_utc = today_br_utc_range()
        agora_utc = now_utc().isoformat()

        mamadas_hoje = supabase.table("mamadas").select("*", count="exact") \
            .gte("horario", start_utc).lte("horario", end_utc).execute()

        remedios = supabase.table("remedios").select("*") \
            .order("proximo_horario", desc=False).limit(5).execute()

        consultas = supabase.table("consultas").select("*") \
            .gte("horario", agora_utc).order("horario", desc=False).limit(3).execute()

        exames = supabase.table("exames").select("*") \
            .gte("horario", agora_utc).order("horario", desc=False).limit(3).execute()

        vacinas = supabase.table("vacinas").select("*") \
            .eq("aplicada", False).order("data_prevista", desc=False).limit(3).execute()

        lembretes = supabase.table("lembretes").select("*") \
            .order("created_at", desc=False).limit(5).execute()

        ultima_mamada = supabase.table("mamadas").select("*") \
            .order("horario", desc=True).limit(1).execute()

        return ok({
            "mamadas_hoje": mamadas_hoje.count or 0,
            "ultima_mamada": ultima_mamada.data[0] if ultima_mamada.data else None,
            "remedios": remedios.data or [],
            "consultas": consultas.data or [],
            "exames": exames.data or [],
            "vacinas": vacinas.data or [],
            "lembretes": lembretes.data or []
        })
    except Exception as e:
        return err(str(e), 500)


# ==================== MAMADAS ====================
@app.route("/api/mamadas", methods=["GET"])
def get_mamadas():
    try:
        r = supabase.table("mamadas").select("*").order("horario", desc=True).limit(50).execute()
        return ok(r.data or [])
    except Exception as e:
        return err(str(e), 500)


@app.route("/api/mamadas", methods=["POST"])
def add_mamada():
    d = request.get_json(silent=True) or request.form
    horario = fmt_dt(d.get("horario"))
    ml = d.get("ml", 0)
    if not horario:
        return err("Horário inválido")
    try:
        r = supabase.table("mamadas").insert({
            "horario": horario,
            "ml": int(ml) if ml else 0
        }).execute()
        return ok(r.data[0] if r.data else None, "Mamada registrada!")
    except Exception as e:
        return err(str(e), 500)


@app.route("/api/mamadas/<id>", methods=["DELETE"])
def del_mamada(id):
    try:
        supabase.table("mamadas").delete().eq("id", id).execute()
        return ok(msg="Removido!")
    except Exception as e:
        return err(str(e), 500)


# ==================== REMÉDIOS ====================
@app.route("/api/remedios", methods=["GET"])
def get_remedios():
    try:
        r = supabase.table("remedios").select("*").order("proximo_horario", desc=False).execute()
        return ok(r.data or [])
    except Exception as e:
        return err(str(e), 500)


@app.route("/api/remedios", methods=["POST"])
def add_remedio():
    d = request.get_json(silent=True) or request.form
    nome = d.get("nome", "").strip()
    inicio = fmt_dt(d.get("inicio"))
    intervalo = d.get("intervalo")
    if not nome or not inicio or not intervalo:
        return err("Dados incompletos")
    try:
        r = supabase.table("remedios").insert({
            "nome": nome,
            "horario_inicio": inicio,
            "proximo_horario": inicio,
            "intervalo_horas": int(intervalo)
        }).execute()
        return ok(r.data[0] if r.data else None, "Remédio adicionado!")
    except Exception as e:
        return err(str(e), 500)


@app.route("/api/remedios/<id>/tomar", methods=["POST"])
def tomar_remedio(id):
    try:
        r = supabase.table("remedios").select("*").eq("id", id).execute()
        if not r.data:
            return err("Não encontrado", 404)
        rem = r.data[0]
        atual = parse_dt(rem["proximo_horario"])
        if not atual:
            return err("Horário inválido no registro")
        proximo = atual + timedelta(hours=int(rem["intervalo_horas"]))
        supabase.table("remedios").update({
            "proximo_horario": proximo.isoformat(),
            "ultima_dose": now_utc().isoformat()
        }).eq("id", id).execute()
        return ok({"proximo": proximo.isoformat()}, "Dose registrada!")
    except Exception as e:
        return err(str(e), 500)


@app.route("/api/remedios/<id>", methods=["DELETE"])
def del_remedio(id):
    try:
        supabase.table("remedios").delete().eq("id", id).execute()
        return ok(msg="Removido!")
    except Exception as e:
        return err(str(e), 500)


# ==================== CONSULTAS ====================
@app.route("/api/consultas", methods=["GET"])
def get_consultas():
    try:
        r = supabase.table("consultas").select("*").order("horario", desc=False).execute()
        return ok(r.data or [])
    except Exception as e:
        return err(str(e), 500)


@app.route("/api/consultas", methods=["POST"])
def add_consulta():
    d = request.get_json(silent=True) or request.form
    nome = d.get("nome", "").strip()
    horario = fmt_dt(d.get("horario"))
    local = d.get("local", "").strip()
    modalidade = d.get("modalidade", "Pediatra").strip()
    if not nome or not horario:
        return err("Dados incompletos")
    try:
        r = supabase.table("consultas").insert({
            "nome": nome, "horario": horario,
            "local": local, "modalidade": modalidade
        }).execute()
        return ok(r.data[0] if r.data else None, "Consulta agendada!")
    except Exception as e:
        return err(str(e), 500)


@app.route("/api/consultas/<id>", methods=["DELETE"])
def del_consulta(id):
    try:
        supabase.table("consultas").delete().eq("id", id).execute()
        return ok(msg="Removido!")
    except Exception as e:
        return err(str(e), 500)


# ==================== EXAMES ====================
@app.route("/api/exames", methods=["GET"])
def get_exames():
    try:
        r = supabase.table("exames").select("*").order("horario", desc=False).execute()
        return ok(r.data or [])
    except Exception as e:
        return err(str(e), 500)


@app.route("/api/exames", methods=["POST"])
def add_exame():
    d = request.get_json(silent=True) or request.form
    nome = d.get("nome", "").strip()
    horario = fmt_dt(d.get("horario"))
    local = d.get("local", "").strip()
    obs = d.get("observacao", "").strip()
    if not nome or not horario:
        return err("Dados incompletos")
    try:
        r = supabase.table("exames").insert({
            "nome": nome, "horario": horario,
            "local": local, "observacao": obs
        }).execute()
        return ok(r.data[0] if r.data else None, "Exame agendado!")
    except Exception as e:
        return err(str(e), 500)


@app.route("/api/exames/<id>", methods=["DELETE"])
def del_exame(id):
    try:
        supabase.table("exames").delete().eq("id", id).execute()
        return ok(msg="Removido!")
    except Exception as e:
        return err(str(e), 500)


# ==================== VACINAS ====================
@app.route("/api/vacinas", methods=["GET"])
def get_vacinas():
    try:
        r = supabase.table("vacinas").select("*").order("data_prevista", desc=False).execute()
        return ok(r.data or [])
    except Exception as e:
        return err(str(e), 500)


@app.route("/api/vacinas", methods=["POST"])
def add_vacina():
    d = request.get_json(silent=True) or request.form
    nome = d.get("nome", "").strip()
    data_prevista = d.get("data_prevista", "").strip()
    tipo = d.get("tipo", "SUS").strip()
    if not nome or not data_prevista:
        return err("Dados incompletos")
    try:
        r = supabase.table("vacinas").insert({
            "nome": nome, "data_prevista": data_prevista,
            "tipo": tipo, "aplicada": False
        }).execute()
        return ok(r.data[0] if r.data else None, "Vacina adicionada!")
    except Exception as e:
        return err(str(e), 500)


@app.route("/api/vacinas/<id>/aplicar", methods=["POST"])
def aplicar_vacina(id):
    try:
        supabase.table("vacinas").update({
            "aplicada": True,
            "data_aplicacao": now_br().date().isoformat()
        }).eq("id", id).execute()
        return ok(msg="Vacina marcada como aplicada!")
    except Exception as e:
        return err(str(e), 500)


@app.route("/api/vacinas/<id>", methods=["DELETE"])
def del_vacina(id):
    try:
        supabase.table("vacinas").delete().eq("id", id).execute()
        return ok(msg="Removido!")
    except Exception as e:
        return err(str(e), 500)


# ==================== CRESCIMENTO ====================
@app.route("/api/crescimento", methods=["GET"])
def get_crescimento():
    try:
        r = supabase.table("crescimento").select("*").order("data", desc=False).execute()
        return ok(r.data or [])
    except Exception as e:
        return err(str(e), 500)


@app.route("/api/crescimento", methods=["POST"])
def add_crescimento():
    d = request.get_json(silent=True) or request.form
    peso = d.get("peso")
    altura = d.get("altura")
    data = d.get("data") or now_br().date().isoformat()
    if not peso and not altura:
        return err("Informe peso ou altura")
    try:
        r = supabase.table("crescimento").insert({
            "peso": float(peso) if peso else None,
            "altura": float(altura) if altura else None,
            "data": data
        }).execute()
        return ok(r.data[0] if r.data else None, "Medida registrada!")
    except Exception as e:
        return err(str(e), 500)


@app.route("/api/crescimento/<id>", methods=["DELETE"])
def del_crescimento(id):
    try:
        supabase.table("crescimento").delete().eq("id", id).execute()
        return ok(msg="Removido!")
    except Exception as e:
        return err(str(e), 500)


# ==================== COMPRAS ====================
@app.route("/api/compras", methods=["GET"])
def get_compras():
    try:
        r = supabase.table("compras").select("*").order("comprado", desc=False).execute()
        return ok(r.data or [])
    except Exception as e:
        return err(str(e), 500)


@app.route("/api/compras", methods=["POST"])
def add_compra():
    d = request.get_json(silent=True) or request.form
    nome = d.get("nome", "").strip()
    quantidade = d.get("quantidade", "").strip()
    if not nome:
        return err("Nome obrigatório")
    try:
        r = supabase.table("compras").insert({
            "nome": nome, "quantidade": quantidade, "comprado": False
        }).execute()
        return ok(r.data[0] if r.data else None, "Item adicionado!")
    except Exception as e:
        return err(str(e), 500)


@app.route("/api/compras/<id>/comprado", methods=["POST"])
def marcar_comprado(id):
    d = request.get_json(silent=True) or {}
    try:
        supabase.table("compras").update({"comprado": bool(d.get("comprado", True))}).eq("id", id).execute()
        return ok(msg="Atualizado!")
    except Exception as e:
        return err(str(e), 500)


@app.route("/api/compras/<id>", methods=["DELETE"])
def del_compra(id):
    try:
        supabase.table("compras").delete().eq("id", id).execute()
        return ok(msg="Removido!")
    except Exception as e:
        return err(str(e), 500)


# ==================== LEMBRETES ====================
@app.route("/api/lembretes", methods=["GET"])
def get_lembretes():
    try:
        r = supabase.table("lembretes").select("*").order("created_at", desc=True).execute()
        return ok(r.data or [])
    except Exception as e:
        return err(str(e), 500)


@app.route("/api/lembretes", methods=["POST"])
def add_lembrete():
    d = request.get_json(silent=True) or request.form
    texto = d.get("texto", "").strip()
    if not texto:
        return err("Texto obrigatório")
    try:
        r = supabase.table("lembretes").insert({"texto": texto}).execute()
        return ok(r.data[0] if r.data else None, "Lembrete salvo!")
    except Exception as e:
        return err(str(e), 500)


@app.route("/api/lembretes/<id>", methods=["DELETE"])
def del_lembrete(id):
    try:
        supabase.table("lembretes").delete().eq("id", id).execute()
        return ok(msg="Removido!")
    except Exception as e:
        return err(str(e), 500)


# ==================== PRÓXIMOS EVENTOS ====================
@app.route("/api/proximos")
def proximos_eventos():
    agora = now_utc().isoformat()
    try:
        consultas = supabase.table("consultas").select("id,nome,horario,modalidade") \
            .gte("horario", agora).order("horario").limit(5).execute()
        exames = supabase.table("exames").select("id,nome,horario,local") \
            .gte("horario", agora).order("horario").limit(5).execute()
        vacinas = supabase.table("vacinas").select("id,nome,data_prevista,tipo") \
            .eq("aplicada", False).order("data_prevista").limit(5).execute()
        remedios = supabase.table("remedios").select("id,nome,proximo_horario,intervalo_horas") \
            .order("proximo_horario").limit(5).execute()

        feed = []
        for c in (consultas.data or []):
            feed.append({"tipo": "consulta", "nome": c["nome"],
                         "horario": c["horario"], "info": c.get("modalidade", "")})
        for e in (exames.data or []):
            feed.append({"tipo": "exame", "nome": e["nome"],
                         "horario": e["horario"], "info": e.get("local", "")})
        for v in (vacinas.data or []):
            feed.append({"tipo": "vacina", "nome": v["nome"],
                         "horario": v["data_prevista"], "info": v.get("tipo", "")})
        for r in (remedios.data or []):
            feed.append({"tipo": "remedio", "nome": r["nome"],
                         "horario": r.get("proximo_horario", ""), "info": f"{r['intervalo_horas']}h"})

        feed.sort(key=lambda x: x.get("horario", "") or "")
        return ok(feed[:15])
    except Exception as e:
        return err(str(e), 500)


# ==================== PWA / STATIC ====================
@app.route("/manifest.json")
def manifest():
    return app.send_static_file("manifest.json")


@app.route("/OneSignalSDKWorker.js")
def onesignal_worker():
    return send_from_directory("static", "OneSignalSDKWorker.js")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))

    app.run(
        host="0.0.0.0",
        port=port
    )