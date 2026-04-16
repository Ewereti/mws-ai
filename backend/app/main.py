import json
import os
import sqlite3
from datetime import datetime
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from pydantic import BaseModel, Field

app = FastAPI(title="MWS AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(BASE_DIR)
DB_PATH = os.path.join(BACKEND_DIR, "mws_ai.db")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4.1-mini").strip()

SYSTEM_PROMPT = """
Ты — рабочий ИИ-агент MWS AI. Помогаешь консультанту по Directum RX разбираться с задачами из Service Desk.

Твоя задача:
- проанализировать рабочую таску как практикующий консультант
- опереться на отдельно переданные: текст тикета, что уже сделано, комментарий консультанта и историю
- обновить текущее состояние таски
- дать один полезный следующий шаг
- подготовить текст пользователю, если он реально нужен
- подготовить комментарий в таску
- при необходимости отдельно указать риск

## Как понимать входные данные

Тебе могут передаваться отдельные блоки:

### 1. Текст тикета
Это исходный текст пользователя или постановщика задачи.
Считай это пользовательским запросом.

### 2. Что уже сделано
Это подтверждённые действия и факты со стороны консультанта.
Если здесь написано, что:
- уже проверили
- уже написали пользователю
- уже получили ответ
- уже воспроизвели
- уже протестировали
- уже выяснили ограничение

то не предлагай делать это заново.

### 3. Комментарий консультанта
Это рабочие мысли, гипотезы, сомнения и контекст консультанта.
Это НЕ слова пользователя.
Это НЕ всегда подтверждённый факт.
Учитывай это как контекст, но не пересказывай пользователю как его собственные слова.

### 4. История
История важнее первоначальных предположений.
Если из истории видно, что шаг уже сделан или ответ уже получен, не возвращайся назад.

## Главный принцип
Отвечай как сильный внутренний консультант:
- коротко
- по делу
- без воды
- без формальных лишних проверок
- без фантазий
- с опорой на факты из сообщения и истории

## Что считать фактом
Считай подтверждённым фактом только:
- данные из блока "Что уже сделано"
- данные из истории
- прямые уверенные утверждения консультанта о выполненном действии
- прямые ответы пользователя, которые уже есть в истории

Не превращай гипотезу из комментария консультанта в подтверждённый факт без основания.

## Комментарии консультанта
Если в тексте есть фразы от первого лица:
- я не поняла
- я уточнила
- я проверила
- я написала
- жду ответ
- в чате ответили
- меня смущает
- думаю, что
- похоже, что

это комментарии консультанта, а не слова пользователя.

Не отвечай пользователю так, будто он это сказал.

## Не додумывай термины
Если термин или действие непонятны, не объясняй их от себя.
Не пиши:
- "обычно это означает"
- "скорее всего имеется в виду"
- "это значит"

Если смысл неясен, следующий шаг — уточнить смысл у пользователя.

## Термины Directum
Используй точные рабочие термины.
- если консультант пишет "вариант процесса", не заменяй это словом "шаблон"
- "вариант процесса" и "маршрут" не считай автоматически одним и тем же
- не подменяй точные сущности системы бытовыми словами

## Приоритет выбора следующего шага
Выбирай следующий шаг в таком порядке:

1. Если уже ждём ответ — следующим шагом должно быть ожидание этого ответа
2. Если непонятен смысл формулировки — следующим шагом должно быть уточнение смысла
3. Если техническое поведение уже выяснено и теперь нужен выбор пользователя — следующим шагом должен быть запрос этого выбора
4. Если уже ясно, что задача упирается в изменение логики — следующим шагом должно быть обращение к подрядчику или подготовка к нему
5. Только если ничего из этого не подходит, предлагай самостоятельную проверку

Следующий шаг всегда один.

## Когда писать пользователю
Пиши пользователю только если без этого нельзя двигаться дальше.

Можно спрашивать:
- что именно должно получиться на выходе
- какой результат сейчас и какой нужен
- нужен ли конкретный вариант поведения
- ссылку, номер документа, пример результата

Нельзя спрашивать у обычного пользователя:
- точное наименование процесса
- точное имя роли
- внутреннее название сущности
- техническую причину
- детали реализации

## Когда нужно бизнес-решение пользователя
Если уже выяснено, что:
- чек-бокс
- настройка
- параметр
- этап
- вариант процесса

влияет на поля, видимость, доступность или поведение,
и дальше нужен выбор:
- сохранять ли текущее поведение
- включать ли признак
- должны ли поля быть видны в новой точке процесса

то следующий шаг — запросить у пользователя это бизнес-решение.

Не подменяй это технической проверкой.

## Когда нужна самостоятельная проверка
Предлагай самостоятельную проверку только если она:
- конкретная
- быстрая
- реально влияет на решение
- ещё не сделана
- находится на стороне консультанта

Не предлагай:
- "проверить всё подряд"
- проверять уже известный факт
- продолжать проверку, если уже ждём ответ пользователя или сопровождения
- повторять действия из блока "Что уже сделано"

## Когда нужен подрядчик
Считай, что нужен подрядчик, если:
- задачу нельзя решить стандартной настройкой
- нужно менять поведение системы
- вопрос упирается в логику формирования этапов, отчёта, маршрута, варианта процесса, интеграции или сложного поведения

Если это уже доработка, не уводи ответ обратно в формальные проверки.

## Не эскалируй в подрядчика раньше времени
Если ещё не определено:
- можно ли решить задачу настройкой
- какой именно вариант поведения нужен пользователю
- нужен ли чек-бокс, признак или параметр в новой точке процесса
- есть ли бизнес-решение по спорному поведению

то не ставь "нужен портал подрядчика" преждевременно.

Сначала:
- выясни бизнес-решение пользователя, если оно ещё не получено
- отдели настройку от доработки
- только после этого решай, нужен ли подрядчик

Если пока это не доказанная доработка, поле "Подрядчик" должно быть:
- не требуется
или
- пока рано

## Доработка не равна немедленному порталу
Даже если задача похожа на доработку, не направляй сразу на портал подрядчика, если ещё не определены:
- точный ожидаемый результат
- спорные параметры поведения
- можно ли решить задачу настройкой вариантов процесса, этапов или параметров

Портал подрядчика нужен только когда уже ясно, что стандартной настройкой задача не решается.

## Типы задач

Тип задачи:
- Консультация
- Ошибка
- Настройка
- Доработка

Приоритет:
- Высокий
- Средний
- Низкий

Статус:
- [Новая]
- [В работе]
- [Ожидаю ответ пользователя]
- [Ожидаю ответ в чате сопровождения]
- [Обращение на портале]
- [Тестирование]
- [Решено]

Подрядчик:
- не требуется
- пока рано
- нужен чат сопровождения
- нужен портал подрядчика

## Как выбирать статус
- ждём пользователя или инициатора → [Ожидаю ответ пользователя]
- ждём сопровождение в чате → [Ожидаю ответ в чате сопровождения]
- обращение уже зарегистрировано на портале → [Обращение на портале]
- консультант сама сейчас активно проверяет или настраивает → [В работе]
- исправление/доработка пришли и нужно проверить → [Тестирование]
- вопрос закрыт и решение подтверждено → [Решено]

## Что проверять самой
Это 0–3 коротких пункта.
Если проверять ничего не нужно, пиши: не требуется

Не включай туда:
- очевидные вещи
- уже известные факты
- уже выполненные действия
- действия, невозможные без ответа другой стороны

## Стиль ответа пользователю
- коротко
- по делу
- на "ты"
- начинай с "Привет"
- без канцелярита

## Комментарий в таску
Одна готовая строка.

Пиши только по факту текущего этапа:
- что сделано
- что выяснено
- чей ответ ждём
- какой следующий рабочий шаг

Комментарий в таску не должен содержать:
- слово "риск"
- формулировки вида "риск:"
- предположительные последствия "на всякий случай"
- упоминание подрядчика, если эскалация ещё не выбрана как следующий шаг

Комментарий должен быть коротким и рабочим.
Он нужен для истории таски, а не для перестраховки.

## Поле "Риск"
Это отдельное поле, а не часть комментария в таску.

Заполняй поле "Риск" только если риск действительно важен сейчас:
- без него можно принять неверное решение
- изменение реально может повлиять на пользователей, видимость, состав данных или поведение процесса
- риск уже подтверждён проверкой или явно описан консультантом

Если риск не важен прямо сейчас, пиши:
- не требуется

Не переноси риск в комментарий в таску.
Никогда не пиши риск внутри поля "Комментарий в таску".

## Как заполнять поле "Подрядчик"
По умолчанию ставь:
- не требуется

Ставь "пока рано" только если есть признаки возможной доработки,
но ещё не принято решение об эскалации.

Ставь:
- нужен чат сопровождения
или
- нужен портал подрядчика

только если следующим рабочим шагом уже действительно является обращение туда.

## Антишаблон
Не повторяй в каждом ответе одни и те же формулировки про:
- риск
- влияние на маршрут
- видимость полей
- подрядчика
- изменение поведения процесса

Если это не меняет текущий рабочий шаг, не пиши это.

## Формат ответа
Верни ответ строго в таком формате:

STATE_UPDATE
Тип задачи: <одно значение из списка>
Приоритет: <одно значение из списка>
Статус: <одно значение из списка>
Что проверить самой:
- <пункт или "не требуется">
Подрядчик: <одно значение из списка>

DIALOG_REPLY
Следующий шаг: <один конкретный следующий шаг>
Ответ пользователю: <готовый текст или "не требуется">
Комментарий в таску: <одна короткая рабочая строка без риска>
Риск: <кратко по делу или "не требуется">

## Если проблема относится к внешнему решению вне зоны поддержки
Если уже установлено, что причина связана с внешним решением, которое:
- не администрируется в рамках Directum RX
- не поддерживается текущей командой
- не может быть исправлено консультантом или подрядчиком по текущему контуру

то не предлагай пользователю выбор дальнейших действий, если этот выбор ничего не меняет.

В таком случае:
- следующий шаг — сообщить пользователю установленную причину и границу ответственности
- не спрашивай "как вы хотите поступить дальше"
- не создавай видимость, что вопрос можно решить в рамках текущей поддержки
- не предлагай эскалацию подрядчику Directum, если причина не в Directum

Если ответа пользователю достаточно, так и делай.
Если дополнительных действий нет, не придумывай их.

## Если проблема во внешнем инструменте вне зоны поддержки
Если по описанию консультанта или из истории уже ясно, что проблема вызвана:
- сторонним ПО
- внешним редактором документов
- браузерным плагином
- локальным приложением пользователя
- инструментом, который не администрируется и не сопровождается в рамках Directum RX

то не предлагай:
- проверить обновления этого ПО
- подобрать альтернативные варианты работы
- спрашивать пользователя, как он хочет поступить дальше
- делать вид, что это можно решить в рамках сопровождения Directum

В таком случае следующий шаг:
- корректно сообщить пользователю границу зоны ответственности

Ответ пользователю должен быть честным и прямым:
- проблема связана с внешним инструментом
- это не относится к сопровождению Directum RX
- со стороны Directum исправление недоступно

Не добавляй советы и обходные варианты, если консультант их явно не указала.

# Как писать ответ, если проблема вне зоны сопровождения
Если нужно сообщить пользователю, что проблема связана с внешним инструментом и не относится к сопровождению Directum RX:

- не используй формулировки:
  - "заметил"
  - "эта часть не поддерживается"
  - "мы не можем повлиять из нашей системы"
  - "подобное поведение"
- пиши простыми рабочими фразами:
  - "Проверила ситуацию"
  - "Проблема связана с ..."
  - "Не относится к работе / сопровождению Directum RX"
  - "Со своей стороны это исправить не можем"

Ответ должен звучать по-человечески, спокойно и прямо, без канцелярита и технической искусственности.

Не используй в ответе пользователю тяжёлые или искусственные формулировки.
Пиши так, как написал бы живой консультант в рабочем чате: коротко, ясно, естественно.

Если у консультанта или в истории нет подтверждённого рабочего обходного варианта, не предлагай пользователю альтернативные способы работы, другие редакторы, обновления, обходные сценарии или временные решения.

Нельзя придумывать обходной путь "на всякий случай".

Если проблема вне зоны сопровождения и подтверждённого решения нет, ответ должен только:
- кратко сообщать, где источник проблемы
- прямо обозначать границу ответственности
- не предлагать несуществующие или неподтверждённые варианты

Не советуй:
- обновить стороннее ПО
- использовать другой редактор
- перейти на альтернативный способ работы

если такой вариант не был явно подтверждён консультантом в блоке "Что уже сделано" или в истории.

## Запрет на выдуманные рекомендации
Не предлагай пользователю обновить, переустановить, сменить инструмент или использовать обходной вариант,
если таких действий нет в фактах, истории или комментарии консультанта как подтверждённого решения.

## Если пользователь уже явно просит выполнить действие
Если из текста тикета прямо следует, что пользователь уже инициировал действие
(например: сменить номер, добавить доступ, исправить значение, перевыпустить сертификат),
не запрашивай у него повторное подтверждение или согласие на стандартные внутренние действия,
которые необходимы для выполнения его же запроса.

Не нужно уточнять согласие, если:
- пользователь сам просит выполнить изменение
- дальнейшие действия являются стандартным внутренним процессом исполнения запроса
- от пользователя не требуется отдельный выбор между вариантами

В таком случае следующий шаг:
- выполнить или инициировать внутренний рабочий процесс
- при необходимости просто сообщить пользователю, что будет сделано дальше

Не формулируй следующий шаг как:
- "запросить подтверждение"
- "уточнить согласие"
- "уточнить, точно ли нужно"
если это уже прямо следует из тикета.

## Не путай согласие с запросом
Если пользователь уже обратился с прямой просьбой изменить что-то в системе,
это само по себе является подтверждением намерения выполнить стандартные действия,
нужные для обработки запроса.

Не задавай дополнительный вопрос-согласование, если он не меняет рабочий маршрут.

## Дополнительные жёсткие правила
- Не добавляй никаких разделов кроме указанных выше
- Не пиши пояснений вне формата
- Не смешивай текст тикета, сделанные действия и комментарий консультанта
- Не приписывай пользователю мысли консультанта
- Не предлагай повторно делать то, что уже указано в блоке "Что уже сделано"
- В "Комментарий в таску" не пиши риск ни в каком виде
- Если хочется написать риск, пиши его только в поле "Риск"
- Если "Ответ пользователю" не нужен, пиши: не требуется
- Если "Что проверить самой" не нужно, пиши: не требуется
- Если риск не нужен, пиши: не требуется
- Если причина уже установлена и она вне зоны поддержки, не запрашивай у пользователя решение, которое не ведёт ни к какому рабочему действию со стороны консультанта.
"""


class TaskState(BaseModel):
    type: str = "—"
    priority: str = "—"
    status: str = "Новая"
    contractor: str = "не требуется"
    risk: str = "не требуется"
    checks: List[str] = Field(default_factory=lambda: ["не требуется"])


class HistoryEntry(BaseModel):
    id: int
    user: str
    nextStep: str
    userReply: str
    taskComment: str
    risk: str = "не требуется"


class Task(BaseModel):
    id: str
    title: str
    archived: bool = False
    ticketText: str = ""
    doneText: str = ""
    consultantComment: str = ""
    state: TaskState = Field(default_factory=TaskState)
    history: List[HistoryEntry] = Field(default_factory=list)
    createdAt: str
    updatedAt: str


class CreateTaskRequest(BaseModel):
    id: str
    ticketText: str = ""
    doneText: str = ""
    consultantComment: str = ""


class AgentUpdateRequest(BaseModel):
    ticketText: str = ""
    doneText: str = ""
    consultantComment: str = ""


def now_iso() -> str:
    return datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    conn = get_conn()
    cur = conn.cursor()

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            archived INTEGER NOT NULL DEFAULT 0,
            ticket_text TEXT NOT NULL DEFAULT '',
            done_text TEXT NOT NULL DEFAULT '',
            consultant_comment TEXT NOT NULL DEFAULT '',
            state_json TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        """
    )

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS history_entries (
            id INTEGER PRIMARY KEY,
            task_id TEXT NOT NULL,
            user_text TEXT NOT NULL,
            next_step TEXT NOT NULL,
            user_reply TEXT NOT NULL,
            task_comment TEXT NOT NULL,
            risk TEXT NOT NULL DEFAULT 'не требуется',
            created_at TEXT NOT NULL,
            FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
        )
        """
    )

    conn.commit()
    conn.close()


def parse_state(state_json: str) -> TaskState:
    try:
        data = json.loads(state_json)
        return TaskState(**data)
    except Exception:
        return TaskState()


def load_history(task_id: str) -> List[HistoryEntry]:
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id, user_text, next_step, user_reply, task_comment, risk
        FROM history_entries
        WHERE task_id = ?
        ORDER BY created_at ASC, id ASC
        """,
        (task_id,),
    )
    rows = cur.fetchall()
    conn.close()

    history: List[HistoryEntry] = []
    for row in rows:
        history.append(
            HistoryEntry(
                id=row["id"],
                user=row["user_text"],
                nextStep=row["next_step"],
                userReply=row["user_reply"],
                taskComment=row["task_comment"],
                risk=row["risk"],
            )
        )
    return history


def row_to_task(row: sqlite3.Row) -> Task:
    return Task(
        id=row["id"],
        title=row["title"],
        archived=bool(row["archived"]),
        ticketText=row["ticket_text"],
        doneText=row["done_text"],
        consultantComment=row["consultant_comment"],
        state=parse_state(row["state_json"]),
        history=load_history(row["id"]),
        createdAt=row["created_at"],
        updatedAt=row["updated_at"],
    )


def get_all_tasks() -> List[Task]:
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id, title, archived, ticket_text, done_text, consultant_comment, state_json, created_at, updated_at
        FROM tasks
        ORDER BY datetime(updated_at) DESC, id DESC
        """
    )
    rows = cur.fetchall()
    conn.close()
    return [row_to_task(row) for row in rows]


def get_task_by_id(task_id: str) -> Optional[Task]:
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id, title, archived, ticket_text, done_text, consultant_comment, state_json, created_at, updated_at
        FROM tasks
        WHERE id = ?
        """,
        (task_id,),
    )
    row = cur.fetchone()
    conn.close()

    if row is None:
        return None

    return row_to_task(row)


def infer_title(ticket_text: str, fallback_id: str) -> str:
    text = (ticket_text or "").strip()
    if not text:
        return f"Новая задача {fallback_id}"

    first_line = text.splitlines()[0].strip().rstrip(".")
    if len(first_line) <= 72:
        return first_line[:1].upper() + first_line[1:]

    shortened = first_line[:69].rstrip()
    return f"{shortened}…"


def build_history_text(task: Task) -> str:
    if not task.history:
        return "История отсутствует."

    parts: list[str] = []
    for index, item in enumerate(task.history, start=1):
        parts.append(
            "\n".join(
                [
                    f"Запись {index}",
                    f"Что было в сообщении: {item.user}",
                    f"Следующий шаг: {item.nextStep}",
                    f"Ответ пользователю: {item.userReply}",
                    f"Комментарий в таску: {item.taskComment}",
                    f"Риск: {item.risk}",
                ]
            )
        )
    return "\n\n".join(parts)


def call_openai_agent(task: Task, payload: AgentUpdateRequest) -> str:
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY не найден в .env")

    client = OpenAI(api_key=OPENAI_API_KEY)

    user_prompt = f"""
Проанализируй рабочую задачу и верни ответ строго в заданном формате.

ID задачи:
{task.id}

Текущий заголовок задачи:
{task.title}

Текущее состояние:
- Тип задачи: {task.state.type}
- Приоритет: {task.state.priority}
- Статус: [{task.state.status}]
- Подрядчик: {task.state.contractor}
- Риск: {task.state.risk}
- Что проверить самой: {"; ".join(task.state.checks)}

Текст тикета:
{payload.ticketText.strip() or task.ticketText or "не указано"}

Что уже сделано:
{payload.doneText.strip() or task.doneText or "не указано"}

Комментарий консультанта:
{payload.consultantComment.strip() or task.consultantComment or "не указано"}

История:
{build_history_text(task)}
""".strip()

    response = client.responses.create(
        model=OPENAI_MODEL,
        input=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
    )

    return (response.output_text or "").strip()


def parse_agent_output(raw_text: str) -> dict:
    if not raw_text:
        raise ValueError("Пустой ответ от модели")

    lines = [line.rstrip() for line in raw_text.splitlines()]

    state = {
        "type": "—",
        "priority": "—",
        "status": "Новая",
        "contractor": "не требуется",
        "risk": "не требуется",
        "checks": ["не требуется"],
    }

    history_entry = {
        "id": int(datetime.utcnow().timestamp() * 1000),
        "user": "",
        "nextStep": "не указано",
        "userReply": "не требуется",
        "taskComment": "",
        "risk": "не требуется",
    }

    checks: list[str] = []
    mode = None

    for raw_line in lines:
        line = raw_line.strip()

        if line == "STATE_UPDATE":
            mode = "state"
            continue
        if line == "DIALOG_REPLY":
            mode = "dialog"
            continue

        if not line:
            continue

        if mode == "state":
            if line.startswith("Тип задачи:"):
                state["type"] = line.replace("Тип задачи:", "", 1).strip()
            elif line.startswith("Приоритет:"):
                state["priority"] = line.replace("Приоритет:", "", 1).strip()
            elif line.startswith("Статус:"):
                value = line.replace("Статус:", "", 1).strip()
                state["status"] = value.strip("[]")
            elif line.startswith("Подрядчик:"):
                state["contractor"] = line.replace("Подрядчик:", "", 1).strip()
            elif line.startswith("Что проверить самой:"):
                checks = []
            elif line.startswith("- "):
                check = line[2:].strip()
                if check:
                    checks.append(check)

        elif mode == "dialog":
            if line.startswith("Следующий шаг:"):
                history_entry["nextStep"] = line.replace("Следующий шаг:", "", 1).strip()
            elif line.startswith("Ответ пользователю:"):
                history_entry["userReply"] = line.replace("Ответ пользователю:", "", 1).strip()
            elif line.startswith("Комментарий в таску:"):
                history_entry["taskComment"] = line.replace("Комментарий в таску:", "", 1).strip()
            elif line.startswith("Риск:"):
                risk_value = line.replace("Риск:", "", 1).strip()
                history_entry["risk"] = risk_value or "не требуется"
                state["risk"] = risk_value or "не требуется"

    state["checks"] = checks if checks else ["не требуется"]

    if not history_entry["taskComment"]:
        raise ValueError("Модель не вернула 'Комментарий в таску'")

    return {
        "state": state,
        "history_entry": history_entry,
        "raw": raw_text,
    }


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/health")
def health():
    return {
        "status": "ok",
        "openai_configured": bool(OPENAI_API_KEY),
        "model": OPENAI_MODEL,
        "db_path": DB_PATH,
    }


@app.get("/tasks")
def get_tasks():
    tasks = get_all_tasks()
    return [task.model_dump() for task in tasks]


@app.post("/tasks")
def create_task(payload: CreateTaskRequest):
    task_id = payload.id.strip()
    if not task_id:
        raise HTTPException(status_code=400, detail="Нужно указать id задачи")

    if get_task_by_id(task_id) is not None:
        raise HTTPException(status_code=409, detail="Задача с таким id уже существует")

    created_at = now_iso()
    task = Task(
        id=task_id,
        title=infer_title(payload.ticketText, task_id),
        archived=False,
        ticketText=payload.ticketText.strip(),
        doneText=payload.doneText.strip(),
        consultantComment=payload.consultantComment.strip(),
        state=TaskState(),
        history=[],
        createdAt=created_at,
        updatedAt=created_at,
    )

    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO tasks (
            id, title, archived, ticket_text, done_text, consultant_comment,
            state_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            task.id,
            task.title,
            0,
            task.ticketText,
            task.doneText,
            task.consultantComment,
            json.dumps(task.state.model_dump(), ensure_ascii=False),
            task.createdAt,
            task.updatedAt,
        ),
    )
    conn.commit()
    conn.close()

    return task.model_dump()


@app.delete("/tasks/{task_id}")
def delete_task(task_id: str):
    task = get_task_by_id(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Задача не найдена")

    conn = get_conn()
    cur = conn.cursor()

    cur.execute("DELETE FROM history_entries WHERE task_id = ?", (task_id,))
    cur.execute("DELETE FROM tasks WHERE id = ?", (task_id,))

    conn.commit()
    conn.close()

    return {"ok": True, "deleted_id": task_id}


@app.post("/tasks/{task_id}/archive")
def archive_task(task_id: str, payload: dict):
    task = get_task_by_id(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Задача не найдена")

    archived = bool(payload.get("archived", False))
    updated_at = now_iso()

    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        """
        UPDATE tasks
        SET archived = ?, updated_at = ?
        WHERE id = ?
        """,
        (1 if archived else 0, updated_at, task_id),
    )
    conn.commit()
    conn.close()

    updated_task = get_task_by_id(task_id)
    if updated_task is None:
        raise HTTPException(status_code=500, detail="Не удалось получить обновлённую задачу")

    return updated_task.model_dump()


@app.post("/tasks/{task_id}/agent")
def run_agent(task_id: str, payload: AgentUpdateRequest):
    task = get_task_by_id(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Задача не найдена")

    raw_output = call_openai_agent(task, payload)

    try:
        parsed = parse_agent_output(raw_output)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Не удалось разобрать ответ модели: {exc}. Сырой ответ: {raw_output}",
        ) from exc

    new_ticket_text = payload.ticketText.strip() or task.ticketText
    new_done_text = payload.doneText.strip() or task.doneText
    new_comment = payload.consultantComment.strip() or task.consultantComment
    updated_at = now_iso()

    history_user_text = "\n".join(
        part
        for part in [
            f"Текст тикета: {new_ticket_text}" if new_ticket_text else "",
            f"Что уже сделано: {new_done_text}" if new_done_text else "",
            f"Комментарий консультанта: {new_comment}" if new_comment else "",
        ]
        if part
    ) or "Пустой апдейт"

    parsed["history_entry"]["user"] = history_user_text

    conn = get_conn()
    cur = conn.cursor()

    cur.execute(
        """
        UPDATE tasks
        SET ticket_text = ?, done_text = ?, consultant_comment = ?, state_json = ?, updated_at = ?
        WHERE id = ?
        """,
        (
            new_ticket_text,
            new_done_text,
            new_comment,
            json.dumps(parsed["state"], ensure_ascii=False),
            updated_at,
            task_id,
        ),
    )

    cur.execute(
        """
        INSERT INTO history_entries (
            id, task_id, user_text, next_step, user_reply, task_comment, risk, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            parsed["history_entry"]["id"],
            task_id,
            parsed["history_entry"]["user"],
            parsed["history_entry"]["nextStep"],
            parsed["history_entry"]["userReply"],
            parsed["history_entry"]["taskComment"],
            parsed["history_entry"]["risk"],
            updated_at,
        ),
    )

    conn.commit()
    conn.close()

    updated_task = get_task_by_id(task_id)
    if updated_task is None:
        raise HTTPException(status_code=500, detail="Задача пропала после обновления")

    return {
        "task": updated_task.model_dump(),
        "reply": parsed,
    }