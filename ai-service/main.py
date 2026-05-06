from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title='ResQ Plate AI Service')

class QuestionRequest(BaseModel):
    question: str

@app.get('/health')
def health():
    return {'status': 'ok'}

@app.post('/ask')
def ask_question(request: QuestionRequest):
    return {
        'question': request.question,
        'message': 'AI operational intelligence endpoint scaffolded successfully.',
        'next_step': 'Integrate OpenAI + SQL generation layer.'
    }
