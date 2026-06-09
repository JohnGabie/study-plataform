# Test-Driven Development with Python — Harry J.W. Percival (2025, 3ª ed.)

## Tese Central
Escrever o teste antes do código não é burocracia — é design. TDD força você a pensar na interface antes da implementação, e a rede de segurança que os testes formam torna refatoração e adição de features uma atividade confiante, não arriscada.

## Por que Este Livro Importa
O ZionHub tem código vibecoded sem testes. Este livro responde: como adicionar testes a um sistema que não tem? E mais importante: como desenvolver novos features com TDD em vez de adicionar testes depois? A mentalidade "test-first" muda a qualidade do design — não só da verificação.

## Onde o Livro Pode Ser Questionado
- O livro usa Django — o ZionHub usa FastAPI. Os princípios são idênticos; a implementação difere
- TDD rigoroso pode ser lento no início — o benefício se acumula com o tempo
- Testes de browser (Selenium) cobrem um caso de uso específico (web app) — APIs testam diferente
- "Obey the Testing Goat" pode criar rigidez — às vezes um spike sem testes é a abordagem certa

## Frases-Chave do Autor
> "By writing tests before building each part of your app—and then creating just enough code to pass them—you'll learn how TDD leads to clean, reliable, and maintainable software." — Descrição do livro

> "Testing is essential for developer sanity." — Michael Foord (praise)

## Mapa por Capítulo

### O Fluxo TDD Fundamental
**Red → Green → Refactor:**
1. **Red:** Escreva um teste que falha (o comportamento ainda não existe)
2. **Green:** Escreva o mínimo de código para o teste passar
3. **Refactor:** Melhore o código mantendo os testes verdes

**Por que este ciclo importa:**
- Garante que você só escreve código necessário
- Garante que o código é testável por design
- A refatoração é segura porque os testes verificam que o comportamento não mudou

### Part I — The Basics of TDD and Django

#### Caps. 1–3 — Getting Started with TDD
**Conceito central:** Functional tests vs. unit tests — dois níveis de testing.
**Regras práticas:**
- **Functional tests (E2E):** testam o sistema de fora — como um usuário. Lentos mas abrangentes.
- **Unit tests:** testam uma unidade isolada — uma função, uma classe. Rápidos e focados.
- A estratégia: escreva functional tests para guiar o desenvolvimento; unit tests para design e cobertura de casos extremos.
**Frase marcante:** "The Testing Goat says: never write new code without a failing test first." — Capítulo 1.
**Conexão:** Python Testing with pytest (Okken) — como implementar esses testes com pytest.

#### Caps. 4–7 — Functional Tests, Django, e o Ciclo TDD
**Conceito central:** Selenium para functional tests de browser. O ciclo TDD em prática.
**Para o ZionHub (FastAPI):** Em vez de Selenium, use `httpx.AsyncClient` para functional tests de API:
```python
# Functional test de API com FastAPI + pytest
async def test_create_order(async_client: AsyncClient):
    response = await async_client.post("/orders", json={"user_id": 1, "amount": 100})
    assert response.status_code == 201
    assert "id" in response.json()
```

#### Caps. 8–11 — Unit Tests e Design
**Conceito central:** Unit tests como ferramenta de design — eles revelam quando o código tem dependências demais ou responsabilidades demais.
**Regras práticas:**
- Um unit test difícil de escrever é um sinal de design ruim
- Se você precisa de 10 mocks para testar uma função, a função está fazendo demais
- Separe lógica de negócio (fácil de testar em isolamento) de I/O (banco, API externa)
**Conexão:** Clean Code Fundamentals (Hock) — SRP: funções com uma responsabilidade são mais fáceis de testar.

### Part II — Web Development Sins

#### Cap. 12 — Splitting Out Tests
**Conceito central:** Organização de testes em projetos maiores.
**Regras práticas:**
- Estrutura de testes espelha estrutura de código
- Separe unit tests de integration tests de functional tests
- `conftest.py` para fixtures compartilhadas (pytest)

#### Caps. 13–15 — Mocking
**Conceito central:** Mocks para isolar código de suas dependências.
**Regras práticas:**
- Mock apenas o que você não controla (APIs externas, email, tempo)
- Não mock o banco de dados se possível — use um banco de teste real
- `unittest.mock.patch` ou `pytest-mock` para mocking em Python
**Onde questionar:** Slatkin (Item 109) prefere integration tests — Percival e Okken permitem mocks estratégicos. A tensão é real: mocks demais criam testes que passam mas produção quebra.
**Conexão:** Effective Python (Slatkin) — Item 109: Prefer Integration Tests. Item 111: Use Mocks.

### Part III — More Advanced Topics

#### Cap. 17 — Test Isolation and "Integrated Tests are a Scam"
**Conceito central:** O debate sobre test isolation — unit tests vs. integration tests.
**Para o ZionHub:** Em APIs FastAPI com banco de dados, integration tests que testam endpoint → serviço → banco são mais valiosos que unit tests com mocks de banco.

#### Cap. 19 — Continuous Integration
**Conceito central:** CI como executor automático de testes a cada push.
**Regras práticas:** GitHub Actions ou similares. Testes devem ser determinísticos — nunca falhem aleatoriamente.
**Conexão:** Site Reliability Engineering (Google) — CI como parte da cultura de engenharia confiável.

#### Cap. 22 — Test-Driven Refactoring
**Conceito central:** Como adicionar testes a código legado para tornar refatoração segura.
**Regras práticas:**
1. Escreva testes para o comportamento atual (mesmo que seja ruim)
2. Verifique que os testes passam
3. Refatore com segurança
**Conexão:** Refactoring (Fowler) — "The first step is always the same: ensure you have a solid set of tests."

## Tensões com Outros Livros
- **vs. Python Testing with pytest:** Percival ensina o *por quê* e a filosofia do TDD; Okken ensina o *como* usar pytest. São complementares.
- **vs. Refactoring (Fowler):** Fowler usa testes como rede de segurança para refatoração; Percival usa TDD como metodologia de desenvolvimento. Dois usos dos mesmos testes.
- **vs. Effective Python (Slatkin):** Slatkin (Item 109) defende integration tests sobre unit tests com mocks — Percival usa ambos estrategicamente. A tensão é produtiva.

## Aplicação em Python Moderno (FastAPI + pytest)
```python
# conftest.py — setup compartilhado
import pytest
from httpx import AsyncClient
from app.main import app
from app.database import get_async_db, engine
from app.models import Base

@pytest.fixture(scope="function")
async def async_client():
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client

@pytest.fixture(autouse=True)
async def setup_database():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

# test_orders.py — ciclo TDD em FastAPI
class TestCreateOrder:
    # RED: escreva antes de implementar
    async def test_create_order_returns_201(self, async_client):
        response = await async_client.post(
            "/orders",
            json={"user_id": 1, "product_id": 5, "quantity": 2}
        )
        assert response.status_code == 201  # falha primeiro

    async def test_create_order_returns_order_id(self, async_client):
        response = await async_client.post("/orders", json={...})
        assert "id" in response.json()

    async def test_create_order_with_invalid_data_returns_422(self, async_client):
        response = await async_client.post("/orders", json={"user_id": "nao_e_int"})
        assert response.status_code == 422
```
