from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="MWS AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/tasks")
def get_tasks():
    return [
        {
            "id": "DIR-1436",
            "title": "Протестировать изменение приёма",
            "archived": False,
            "ticketText": "Необходимо протестировать изменение приёма согласно инструкции от вендора.",
            "doneText": "Инструкция прочитана, вариант процесса настроен на тестовом контуре.",
            "consultantComment": "Нужно прогнать сценарии и понять, требуется ли ответ пользователю.",
            "state": {
                "type": "Консультация",
                "priority": "Средний",
                "status": "В работе",
                "contractor": "не требуется",
                "risk": "не требуется",
                "checks": [
                    "Прогнать тестовые сценарии из инструкции на тестовом контуре",
                    "Проверить логи и результат выполнения для каждого сценария",
                ],
            },
            "history": [],
            "createdAt": "2026-04-13T12:00:00",
            "updatedAt": "2026-04-13T12:00:00",
        }
    ]