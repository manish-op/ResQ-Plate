# RAG Powered Operational Intelligence

## Objective
Add an AI analytics layer to ResQ-Plate that allows admins to ask operational questions in natural language.

Example questions:
- Which NGOs received the highest donations this month?
- Which areas have the highest food wastage?
- Which food categories expire most often?

## Proposed Architecture

React Frontend
    ↓
Spring Boot Backend
    ↓
Python FastAPI AI Service
    ↓
OpenAI API + PostgreSQL

## Workflow
1. Admin asks a natural language question.
2. Spring Boot forwards the request to the AI service.
3. AI service generates a safe SELECT SQL query.
4. Query executes against PostgreSQL.
5. Results are summarized by the LLM.
6. Structured insights are returned to the frontend.

## Security Rules
- Only allow SELECT queries.
- Use a read-only DB role.
- Validate SQL before execution.
- Add timeout limits.

## MVP Endpoints
POST /ask
POST /summarize
GET /health

## Future Enhancements
- Vector search using ChromaDB
- Semantic search for NGO feedback
- AI-generated dashboards
- Predictive donation analytics
