# Alith Python SDK Documentation

**Version:** 0.12.3

Complete guide to using the Alith Python SDK for decentralized AI services, data management, and blockchain interactions.

---

## Table of Contents

1. [Installation](#installation)
2. [Quick Start](#quick-start)
3. [Core Concepts](#core-concepts)
4. [API Reference](#api-reference)
   - [Agent](#agent)
   - [LazAI Client](#lazai-client)
   - [Store (Vector Databases)](#store-vector-databases)
   - [Embeddings](#embeddings)
   - [Memory](#memory)
   - [Tools](#tools)
   - [Data Management](#data-management)
   - [Extractor](#extractor)
   - [Services](#services)
5. [Examples](#examples)
6. [Configuration](#configuration)

---

## Installation

```bash
pip install alith
```

### Optional Dependencies

```bash
# For vector stores
pip install chromadb              # ChromaDB support
pip install pymilvus              # Milvus support
pip install faiss-cpu             # FAISS CPU support
pip install faiss-gpu             # FAISS GPU support

# For embeddings
pip install fastembed             # FastEmbed CPU
pip install fastembed-gpu         # FastEmbed GPU

# For training
pip install llamafactory           # LLM training support

# For encryption
pip install python-gnupg          # GPG encryption support
```

---

## Quick Start

### Basic Agent Usage

```python
from alith import Agent

# Create a simple agent
agent = Agent(
    name="MyAgent",
    model="gpt-4",
    api_key="your-api-key",
    base_url="https://api.openai.com/v1",
    preamble="You are a helpful assistant."
)

# Get a response
response = agent.prompt("What is the capital of France?")
print(response)
```

### Agent with Memory

```python
from alith import Agent, WindowBufferMemory

# Create agent with conversation memory
memory = WindowBufferMemory(window_size=10)
agent = Agent(
    name="ChatBot",
    model="gpt-4",
    api_key="your-api-key",
    memory=memory
)

# Have a conversation
agent.prompt("My name is John")
agent.prompt("What's my name?")  # Agent remembers: "Your name is John"
```

### Agent with RAG (Knowledge Base)

```python
from alith import Agent, ChromaDBStore, FastEmbeddings, chunk_text

# Setup vector store
embeddings = FastEmbeddings()
store = ChromaDBStore(path="./data", embeddings=embeddings)

# Add documents
documents = chunk_text("Your long document text here...", max_chunk_token_size=200)
store.save_docs(documents)

# Create agent with knowledge base
agent = Agent(
    name="KnowledgeBot",
    model="gpt-4",
    api_key="your-api-key",
    store=store
)

# Query with context
response = agent.prompt("What does the document say about AI?")
```

### Blockchain Interactions

```python
from alith.lazai import Client
import os

# Initialize client
os.environ["PRIVATE_KEY"] = "0x..."
client = Client()

# Check balance
balance = client.get_balance()
print(f"Balance: {balance} wei")

# Add a file to the registry
file_id = client.add_file("https://example.com/data.json")
print(f"File ID: {file_id}")

# Get file information
file_info = client.get_file(file_id)
print(file_info)
```

---

## Core Concepts

### 1. **Agent**
The central component for AI interactions. Supports tools, memory, and knowledge bases.

### 2. **Store**
Vector database for storing and retrieving document embeddings (RAG).

### 3. **Memory**
Conversation history management for multi-turn dialogues.

### 4. **Tools**
Functions that agents can call to perform specific tasks.

### 5. **Client**
Blockchain client for interacting with LazAI network contracts.

### 6. **Embeddings**
Text embedding models for semantic search and RAG.

---

## API Reference

## Agent

The `Agent` class is the primary interface for AI interactions.

### Constructor

```python
from alith import Agent

agent = Agent(
    model: Optional[str] = "",              # Model name
    name: Optional[str] = "",               # Agent name
    preamble: Optional[str] = "",           # System prompt
    api_key: Optional[str] = "",            # API key
    base_url: Optional[str] = "",           # API base URL
    tools: List[Union[Tool, Callable]] = [], # Available tools
    mcp_config_path: Optional[str] = "",    # MCP config path
    store: Optional[Store] = None,          # Vector store for RAG
    memory: Optional[Memory] = None,        # Conversation memory
    extra_headers: Optional[Headers] = None # Extra HTTP headers
)
```

### Methods

#### `prompt(prompt: str) -> str`
Send a prompt to the agent and get a response.

```python
response = agent.prompt("Explain quantum computing")
```

---

## LazAI Client

The `Client` class provides blockchain interactions for the LazAI network.

### Constructor

```python
from alith.lazai import Client, ChainConfig, ContractConfig

client = Client(
    chain_config: ChainConfig = ChainConfig.testnet(),
    contract_config: ContractConfig = ContractConfig.testnet(),
    private_key: str = None  # Or set PRIVATE_KEY env var
)
```

### Network Configuration

```python
# Use testnet (default)
client = Client()

# Use local development network
import os
os.environ["LAZAI_LOCAL_CHAIN"] = "true"
client = Client()
```

### Data Registry Methods

#### `add_file(url: str) -> int`
Add a file to the registry (without hash).

```python
file_id = client.add_file("https://example.com/data.json")
```

#### `add_file_with_hash(url: str, hash: str) -> str`
Add a file with content hash and return transaction hash.

```python
tx_hash = client.add_file_with_hash(
    "https://example.com/data.json",
    "0xabc123..."
)
```

#### `add_permission_for_file(file_id: int, account: str, key: str)`
Grant access permission to an account for a file.

```python
client.add_permission_for_file(
    file_id=1,
    account="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    key="encrypted_key_here"
)
```

#### `get_file(file_id: int)`
Get file information.

```python
file_info = client.get_file(1)
# Returns: (id, owner, url, hash, proof_index, reward_amount)
```

#### `get_file_id_by_url(url: str) -> int`
Get file ID by its URL.

```python
file_id = client.get_file_id_by_url("https://example.com/data.json")
```

#### `get_file_permission(file_id: int, account: str) -> str`
Get encryption key for an account.

```python
key = client.get_file_permission(1, "0x742d35...")
```

#### `get_file_proof(file_id: int, index: int)`
Get file proof at specific index.

```python
proof = client.get_file_proof(1, 0)
```

#### `get_files_count() -> int`
Get total number of files.

```python
count = client.get_files_count()
```

### Node Management

#### `add_node(address: str, url: str, public_key: str)`
Register a new compute node.

```python
client.add_node(
    address="0x...",
    url="https://node.example.com",
    public_key="-----BEGIN PUBLIC KEY-----\n..."
)
```

#### `remove_node(address: str)`
Remove a compute node.

```python
client.remove_node("0x...")
```

#### `get_node(addr: str)`
Get node information.

```python
node = client.get_node("0x...")
# Returns: (address, url, status, amount, jobs_count, public_key)
```

#### `node_list() -> List[str]`
Get list of all node addresses.

```python
nodes = client.node_list()
```

#### `active_node_list() -> List[str]`
Get list of active node addresses.

```python
active_nodes = client.active_node_list()
```

#### `nodes_count() -> int`
Get total number of nodes.

```python
count = client.nodes_count()
```

#### `active_nodes_count() -> int`
Get number of active nodes.

```python
count = client.active_nodes_count()
```

### Settlement & Accounts

#### `get_user(user: str)`
Get user settlement information.

```python
user_info = client.get_user("0x...")
# Returns: (addr, available_balance, total_balance, query_nodes, inference_nodes, training_nodes)
```

#### `add_user(amount: int)`
Register user with initial deposit.

```python
client.add_user(amount=1000000000000000000)  # 1 ETH in wei
```

#### `deposit(amount: int)`
Deposit funds to user account.

```python
client.deposit(1000000000000000000)
```

#### `withdraw(amount: int)`
Withdraw funds from user account.

```python
client.withdraw(500000000000000000)
```

#### `deposit_query(node: str, amount: int)`
Deposit funds for query service.

```python
client.deposit_query("0x...", 100000000000000000)
```

#### `deposit_inference(node: str, amount: int)`
Deposit funds for inference service.

```python
client.deposit_inference("0x...", 100000000000000000)
```

#### `deposit_training(node: str, amount: int)`
Deposit funds for training service.

```python
client.deposit_training("0x...", 1000000000000000000)
```

#### `retrieve_query(nodes: List[str])`
Retrieve funds from query nodes.

```python
client.retrieve_query(["0x...", "0x..."])
```

#### `retrieve_inference(nodes: List[str])`
Retrieve funds from inference nodes.

```python
client.retrieve_inference(["0x..."])
```

#### `retrieve_training(nodes: List[str])`
Retrieve funds from training nodes.

```python
client.retrieve_training(["0x..."])
```

### Account Queries

#### `get_query_account(user: str, node: str)`
Get query account details.

```python
account = client.get_query_account("0xuser...", "0xnode...")
# Returns: (user, node, nonce, balance, pending_refund, refunds)
```

#### `get_inference_account(user: str, node: str)`
Get inference account details.

```python
account = client.get_inference_account("0xuser...", "0xnode...")
```

#### `get_training_account(user: str, node: str)`
Get training account details.

```python
account = client.get_training_account("0xuser...", "0xnode...")
```

### Node Management (Service-Specific)

#### Query Nodes

```python
# Add query node
client.add_query_node("0x...", "https://query.node.com", "pubkey")

# Remove query node
client.remove_query_node("0x...")

# Get query node info
node = client.get_query_node("0x...")
```

#### Inference Nodes

```python
# Add inference node
client.add_inference_node("0x...", "https://inference.node.com", "pubkey")

# Remove inference node
client.remove_inference_node("0x...")

# Get inference node info
node = client.get_inference_node("0x...")
```

#### Training Nodes

```python
# Add training node
client.add_training_node("0x...", "https://training.node.com", "pubkey")

# Remove training node
client.remove_training_node("0x...")

# Get training node info
node = client.get_training_node("0x...")
```

### Request Headers Generation

#### `get_request_headers(node: str, file_id: int = None, nonce: int = None) -> Dict[str, str]`
Generate signed headers for authenticated requests.

```python
headers = client.get_request_headers(
    node="0xnode...",
    file_id=1
)

# Use with requests
import requests
response = requests.post(
    "https://node.example.com/query/rag",
    json={"query": "What is AI?", "file_id": 1},
    headers=headers
)
```

### Wallet Methods

#### `get_balance(address: str = None) -> int`
Get ETH balance in wei.

```python
balance = client.get_balance()
balance_in_eth = balance / 1e18
```

#### `transfer(to: str, value: int, gas: int = 21000, gas_price: int = None) -> str`
Transfer ETH to another address.

```python
tx_hash = client.transfer(
    to="0x...",
    value=1000000000000000000  # 1 ETH
)
```

---

## Store (Vector Databases)

Vector stores for semantic search and RAG (Retrieval Augmented Generation).

### ChromaDBStore

```python
from alith import ChromaDBStore, FastEmbeddings

# Initialize with custom embeddings
embeddings = FastEmbeddings(model_name="BAAI/bge-small-en-v1.5")
store = ChromaDBStore(
    path="./chroma_db",
    collection_name="my_docs",
    embeddings=embeddings
)

# Save documents
store.save("This is a document about AI.")
store.save_docs([
    "Document 1 content",
    "Document 2 content",
    "Document 3 content"
])

# Search
results = store.search("AI", limit=3, score_threshold=0.4)

# Collection management
if not store.has_collection("new_collection"):
    store.create_collection("new_collection")

results = store.search_in(
    "query text",
    limit=5,
    collection_name="new_collection"
)

# Reset store
store.reset()
```

### MilvusStore

```python
from alith import MilvusStore

store = MilvusStore(
    uri="alith.db",          # Local file or Milvus server
    dimension=768,           # Embedding dimension
    collection_name="docs",
    embeddings=embeddings
)

# Same API as ChromaDBStore
store.save_docs(documents)
results = store.search("query", limit=5)
```

### FAISSStore

High-performance vector store with batch operations.

```python
from alith import FAISSStore

store = FAISSStore(
    dimension=768,
    embeddings=embeddings,
    index_type="L2"  # or "IP" for inner product
)

# Save documents
store.save_docs([
    "Document 1",
    "Document 2",
    "Document 3"
])

# Regular search
results = store.search("query", limit=3, score_threshold=0.4)

# Batch search (much faster for multiple queries)
queries = ["query1", "query2", "query3"]
batch_results = store.search_batch(queries, limit=3)

# Search with scores
results_with_scores = store.search_with_scores("query", limit=3)
# Returns: [(text, score), ...]

# Approximate search for large datasets
results = store.search_approximate("query", limit=10, nprobe=10)

# Create IVF index for better performance
store.create_ivf_index(nlist=100)

# Persistence
store.save_to_disk("./faiss_index")
store.load_from_disk("./faiss_index")

# Statistics
stats = store.get_stats()
# Returns: {"total_documents": 1000, "index_size": 1000, "dimension": 768, "index_type": "L2"}
```

---

## Embeddings

### FastEmbeddings

```python
from alith import FastEmbeddings

embeddings = FastEmbeddings(
    model_name="BAAI/bge-small-en-v1.5",
    cache_dir="./models"
)

# Generate embeddings
vectors = embeddings.embed_texts([
    "First text",
    "Second text"
])
```

### MilvusEmbeddings

```python
from alith import MilvusEmbeddings

embeddings = MilvusEmbeddings()
vectors = embeddings.embed_texts(["text1", "text2"])
```

### RemoteModelEmbeddings

```python
from alith import RemoteModelEmbeddings

embeddings = RemoteModelEmbeddings(
    model="text-embedding-3-small",
    api_key="your-api-key",
    base_url="https://api.openai.com/v1",
    port=None
)

vectors = embeddings.embed_texts(["text"])
```

### OllamaEmbeddings

```python
from alith import OllamaEmbeddings

embeddings = OllamaEmbeddings(
    model="nomic-embed-text",
    base_url="http://localhost:11434"
)

vectors = embeddings.embed_texts(["text"])
```

---

## Memory

### WindowBufferMemory

Maintains a sliding window of recent messages.

```python
from alith import WindowBufferMemory, MessageBuilder

memory = WindowBufferMemory(window_size=10)

# Add messages
memory.add_user_message("Hello")
memory.add_ai_message("Hi! How can I help?")

# Add custom messages
message = MessageBuilder.new_human_message("What's the weather?")
memory.add_message(message)

# Get all messages
messages = memory.messages()

# Convert to string
conversation = memory.to_string()
print(conversation)

# Clear memory
memory.clear()
```

### MessageBuilder

```python
from alith import MessageBuilder

# Create messages
user_msg = MessageBuilder.new_human_message("Hello")
ai_msg = MessageBuilder.new_ai_message("Hi there!")
system_msg = MessageBuilder.new_system_message("You are helpful")
tool_msg = MessageBuilder.new_tool_message("Result: 42")

# Parse messages from JSON
messages = MessageBuilder.messages_from_value([
    {"role": "user", "content": "Hello"},
    {"role": "assistant", "content": "Hi!"}
])

# Convert messages to string
text = MessageBuilder.messages_to_string(messages)
```

---

## Tools

Tools allow agents to perform specific actions.

### Creating a Tool

```python
from alith import Tool
from pydantic import BaseModel, Field

# Define parameters schema
class WeatherParams(BaseModel):
    location: str = Field(..., description="City name")
    units: str = Field("celsius", description="Temperature units")

# Define handler function
def get_weather(location: str, units: str) -> dict:
    return {
        "location": location,
        "temperature": 22,
        "units": units
    }

# Create tool
weather_tool = Tool(
    name="get_weather",
    description="Get current weather for a location",
    parameters=WeatherParams,
    handler=get_weather
)

# Use with agent
agent = Agent(
    name="WeatherBot",
    model="gpt-4",
    api_key="your-api-key",
    tools=[weather_tool]
)

response = agent.prompt("What's the weather in Paris?")
```

### Using Functions as Tools

```python
from alith import Agent

def calculate(a: int, b: int) -> int:
    """Add two numbers together."""
    return a + b

# Functions automatically become tools
agent = Agent(
    name="MathBot",
    model="gpt-4",
    api_key="your-api-key",
    tools=[calculate]
)

response = agent.prompt("What is 5 + 3?")
```

### Built-in Tools

#### DuckDuckGo Search Tool

```python
from alith.utilities.search import DuckDuckGoTool

search_tool = DuckDuckGoTool()

# Use directly
results = search_tool.text("Python programming", max_results=5)
news = search_tool.news("AI news", max_results=3)
images = search_tool.images("cats", max_results=5)
videos = search_tool.videos("tutorials", max_results=3)

# Structured output
results = search_tool("Python", source="text", structured=True)
# Returns: {"structured": True, "results": [...], "answer": None}

# Text output
results = search_tool("Python", source="text", structured=False)
# Returns: {"structured": False, "results": None, "answer": "...formatted text..."}

# Use with agent
agent = Agent(
    name="SearchBot",
    model="gpt-4",
    api_key="your-api-key",
    tools=[search_tool.to_tool()]
)

response = agent.prompt("Search for latest AI news")
```

---

## Data Management

### Text Chunking

```python
from alith import chunk_text

# Chunk text for embedding
chunks = chunk_text(
    text="Your long document...",
    max_chunk_token_size=200,
    overlap_percent=0.1
)

for chunk in chunks:
    print(chunk)
```

### Encryption & Decryption

```python
from alith.data import encrypt, decrypt

# Encrypt data
plaintext = b"Sensitive data here"
password = "my-secret-password"
encrypted = encrypt(plaintext, password)

# Decrypt data
decrypted = decrypt(encrypted, password)
assert decrypted == plaintext
```

### File Download

```python
from alith.data import download_file

# Download file to temp location
temp_path = download_file("https://example.com/data.json")
with open(temp_path, 'r') as f:
    data = f.read()
```

---

## Extractor

Extract structured data from text using AI.

```python
from alith import Agent, Extractor
from pydantic import BaseModel

# Define schema
class Person(BaseModel):
    name: str
    age: int
    occupation: str

# Create extractor
agent = Agent(
    model="gpt-4",
    api_key="your-api-key"
)

extractor = Extractor(
    agent=agent,
    model=Person
)

# Extract data
text = "John Doe is a 35-year-old software engineer."
person = extractor.extract(text)

print(person.name)  # "John Doe"
print(person.age)   # 35
print(person.occupation)  # "software engineer"
```

---

## Services

### Running an Inference Server

```python
from alith.inference.server import run

# Run with llamacpp backend
run(
    host="0.0.0.0",
    port=8000,
    engine_type="llamacpp",
    model="/path/to/model.gguf",
    settlement=True,
    store_type="chromadb",
    llm_base_url=None,
    llm_api_key=None,
    private_key="0x..."
)

# Run with OpenAI-compatible backend
run(
    host="0.0.0.0",
    port=8000,
    engine_type="openai",
    model="gpt-4",
    settlement=True,
    store_type="chromadb",
    llm_base_url="https://api.openai.com/v1",
    llm_api_key="sk-...",
    private_key="0x..."
)
```

### Running a Query Server

```python
from alith.query.server import run

run(
    host="0.0.0.0",
    port=8000,
    settlement=True
)

# Set store type via environment
import os
os.environ["ALITH_STORE_TYPE"] = "faiss"  # or "chromadb", "milvus"
```

### Running a Training Server

```python
from alith.training.server import run

run(
    host="0.0.0.0",
    port=8000
)
```

### Training Configuration

```python
from alith.training.types import TrainingParams, LoraParams, DataParams

# Configure LoRA parameters
lora_params = LoraParams(
    rank=8,
    alpha=16,
    dropout=0.0,
    target="all"
)

# Configure data parameters
data_params = DataParams(
    data_url="https://example.com/training-data.jsonl",
    encryption_key="0xencrypted_key"
)

# Training parameters
params = TrainingParams(
    model="Qwen/Qwen2-0.5B",
    training_type="sft",  # sft, rm, ppo, dpo, kto, pt
    finetuning_type="lora",  # lora, freeze, full
    lr_scheduler_type="cosine",
    learning_rate=5e-5,
    num_epochs=3,
    max_samples=100000,
    bf16=True,
    optim="adamw_torch",
    cutoff_len=2048,
    flash_attn="auto",
    save_steps=100,
    template="qwen",
    lora_params=lora_params,
    data_params=data_params
)

# Start training via API
import requests
response = requests.post(
    "http://localhost:8000/v1/training",
    json=params.dict(),
    headers=client.get_request_headers(node="0xnode...")
)

job_id = response.json()["job_id"]

# Check training status
status_response = requests.get(
    f"http://localhost:8000/v1/training/{job_id}"
)
status = status_response.json()
print(f"Progress: {status['percentage']}%")
print(f"Loss: {status['loss']}")
```

---

## Examples

### Example 1: RAG Chatbot with Memory

```python
from alith import (
    Agent,
    WindowBufferMemory,
    ChromaDBStore,
    FastEmbeddings,
    chunk_text
)

# Setup
embeddings = FastEmbeddings()
store = ChromaDBStore(path="./db", embeddings=embeddings)
memory = WindowBufferMemory(window_size=20)

# Load knowledge base
with open("documents.txt", "r") as f:
    text = f.read()

chunks = chunk_text(text, max_chunk_token_size=200)
store.save_docs(chunks)

# Create agent
agent = Agent(
    name="RAG Assistant",
    model="gpt-4",
    api_key="your-api-key",
    preamble="You are a helpful assistant with access to a knowledge base.",
    store=store,
    memory=memory
)

# Chat
while True:
    user_input = input("You: ")
    if user_input.lower() in ["exit", "quit"]:
        break
    
    response = agent.prompt(user_input)
    print(f"Assistant: {response}")
```

### Example 2: Agent with Custom Tools

```python
from alith import Agent, Tool
from pydantic import BaseModel
import requests

class WeatherParams(BaseModel):
    city: str

def get_weather(city: str) -> dict:
    # Simulated weather API
    return {"city": city, "temp": 22, "condition": "sunny"}

class StockParams(BaseModel):
    symbol: str

def get_stock_price(symbol: str) -> dict:
    # Simulated stock API
    return {"symbol": symbol, "price": 150.25}

# Create tools
weather_tool = Tool(
    name="get_weather",
    description="Get current weather for a city",
    parameters=WeatherParams,
    handler=get_weather
)

stock_tool = Tool(
    name="get_stock_price",
    description="Get current stock price",
    parameters=StockParams,
    handler=get_stock_price
)

# Create agent
agent = Agent(
    name="InfoBot",
    model="gpt-4",
    api_key="your-api-key",
    tools=[weather_tool, stock_tool]
)

# Use agent
response = agent.prompt("What's the weather in Paris and the price of AAPL stock?")
print(response)
```

### Example 3: Blockchain Data Registry

```python
from alith.lazai import Client
import os

# Setup
os.environ["PRIVATE_KEY"] = "0x..."
client = Client()

# Register user
client.add_user(amount=1000000000000000000)  # 1 ETH

# Upload file
file_id = client.add_file_with_hash(
    url="https://example.com/dataset.json",
    hash="0xabc123..."
)
print(f"File registered with ID: {file_id}")

# Grant permission
client.add_permission_for_file(
    file_id=int(file_id, 16),
    account="0xrecipient...",
    key="encrypted_aes_key_here"
)

# Deposit for query service
query_node = "0xnode..."
client.deposit_query(query_node, 100000000000000000)

# Generate request headers
headers = client.get_request_headers(
    node=query_node,
    file_id=int(file_id, 16)
)

# Query the data
import requests
response = requests.post(
    f"https://{query_node}/query/rag",
    json={
        "query": "What insights can you provide?",
        "file_id": int(file_id, 16)
    },
    headers=headers
)

print(response.json())
```

### Example 4: Structured Data Extraction

```python
from alith import Agent, Extractor
from pydantic import BaseModel
from typing import List

class Article(BaseModel):
    title: str
    author: str
    publication_date: str
    key_points: List[str]

# Create extractor
agent = Agent(
    model="gpt-4",
    api_key="your-api-key"
)

extractor = Extractor(agent=agent, model=Article)

# Extract from text
text = """
AI Revolution in Healthcare
By Dr. Jane Smith
Published: January 15, 2024

Artificial intelligence is transforming healthcare in three major ways:
1. Early disease detection through image analysis
2. Personalized treatment recommendations
3. Drug discovery acceleration
"""

article = extractor.extract(text)

print(f"Title: {article.title}")
print(f"Author: {article.author}")
print(f"Date: {article.publication_date}")
print(f"Key Points: {article.key_points}")
```

### Example 5: Multi-Node Setup

```python
from alith.lazai import Client
import os

os.environ["PRIVATE_KEY"] = "0x..."
client = Client()

# Register inference node
client.add_inference_node(
    address="0xnode1...",
    url="https://inference1.example.com",
    public_key="-----BEGIN PUBLIC KEY-----\n..."
)

# Register query node
client.add_query_node(
    address="0xnode2...",
    url="https://query1.example.com",
    public_key="-----BEGIN PUBLIC KEY-----\n..."
)

# Deposit funds for services
client.deposit_inference("0xnode1...", 500000000000000000)
client.deposit_query("0xnode2...", 200000000000000000)

# Check account balances
inference_account = client.get_inference_account(
    client.wallet.address,
    "0xnode1..."
)
print(f"Inference balance: {inference_account[3]}")

query_account = client.get_query_account(
    client.wallet.address,
    "0xnode2..."
)
print(f"Query balance: {query_account[3]}")
```

### Example 6: FAISS High-Performance RAG

```python
from alith import Agent, FAISSStore, FastEmbeddings, chunk_text
import time

# Setup high-performance store
embeddings = FastEmbeddings()
store = FAISSStore(
    dimension=384,  # Match your embedding model
    embeddings=embeddings,
    index_type="L2"
)

# Load large dataset
documents = []
for i in range(100):
    with open(f"doc_{i}.txt", "r") as f:
        text = f.read()
        chunks = chunk_text(text, max_chunk_token_size=200)
        documents.extend(chunks)

# Batch save (efficient)
store.save_docs(documents)

# Create IVF index for fast approximate search
store.create_ivf_index(nlist=100)

# Save index to disk
store.save_to_disk("./faiss_index")

# Later: Load from disk
store.load_from_disk("./faiss_index")

# Batch search (much faster for multiple queries)
queries = [
    "What is machine learning?",
    "Explain neural networks",
    "How does backpropagation work?"
]

start = time.time()
batch_results = store.search_batch(queries, limit=5)
print(f"Batch search took: {time.time() - start:.3f}s")

# Use with agent
agent = Agent(
    name="HighPerfRAG",
    model="gpt-4",
    api_key="your-api-key",
    store=store
)
```

---

## Configuration

### Environment Variables

```bash
# Blockchain
export PRIVATE_KEY="0x..."
export LAZAI_LOCAL_CHAIN="true"  # Use local devnet

# Services
export ALITH_STORE_TYPE="chromadb"  # chromadb, milvus, faiss
export LLM_BASE_URL="https://api.openai.com/v1"
export LLM_API_KEY="sk-..."

# RSA encryption (for nodes)
export RSA_PRIVATE_KEY_BASE64="base64_encoded_key"
```

### Chain Configuration

```python
from alith.lazai import ChainConfig, Client

# Testnet (default)
testnet_config = ChainConfig.testnet()

# Local devnet
local_config = ChainConfig.local()

# Custom configuration
custom_config = ChainConfig(
    network="Custom Network",
    endpoint="https://custom-rpc.example.com",
    chain_id=12345
)

client = Client(chain_config=custom_config)
```

### Contract Configuration

```python
from alith.lazai import ContractConfig, Client

# Use testnet contracts
testnet_contracts = ContractConfig.testnet()

# Use local contracts
local_contracts = ContractConfig.local()

# Custom contracts
custom_contracts = ContractConfig(
    data_registry_address="0x...",
    verified_computing_address="0x...",
    data_anchoring_token_address="0x...",
    query_address="0x...",
    inference_address="0x...",
    training_address="0x...",
    settlement_address="0x..."
)

client = Client(contract_config=custom_contracts)
```

---

## Best Practices

### 1. Always Use Environment Variables for Secrets

```python
import os

# ✅ Good
api_key = os.getenv("OPENAI_API_KEY")
private_key = os.getenv("PRIVATE_KEY")

# ❌ Bad
api_key = "sk-hardcoded-key"
private_key = "0xhardcoded-key"
```

### 2. Handle Errors Gracefully

```python
from alith.lazai import Client

client = Client()

try:
    file_id = client.add_file("https://example.com/data.json")
    print(f"Success: {file_id}")
except Exception as e:
    print(f"Error: {e}")
    # Handle error appropriately
```

### 3. Use Context Managers for Resources

```python
# When implementing custom stores or resources
class CustomStore:
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.cleanup()
```

### 4. Chunk Large Documents

```python
from alith import chunk_text

# ✅ Good: Chunk before storing
large_text = open("large_doc.txt").read()
chunks = chunk_text(large_text, max_chunk_token_size=200)
store.save_docs(chunks)

# ❌ Bad: Store entire document
store.save(large_text)  # May exceed token limits
```

### 5. Monitor Gas Prices

```python
client = Client()

# Check gas before expensive operations
gas_price = client.get_gas_price()
print(f"Current gas price: {gas_price} wei")

# Estimate gas for transaction
estimated = client.estimated_gas(
    to=contract_address,
    value=0,
    data=transaction_data
)
```

---

## Troubleshooting

### Common Issues

#### 1. "PRIVATE_KEY not set"

```bash
export PRIVATE_KEY="0x..."
```

#### 2. ChromaDB collection name too long

Collection names must be ≤ 63 characters. The SDK automatically truncates hashes.

#### 3. Transaction failures

- Check gas price and limits
- Ensure sufficient balance
- Verify contract addresses
- Check nonce issues

#### 4. Embedding dimension mismatch

Ensure your store dimension matches your embedding model:

```python
# For BAAI/bge-small-en-v1.5
embeddings = FastEmbeddings(model_name="BAAI/bge-small-en-v1.5")
store = FAISSStore(dimension=384, embeddings=embeddings)  # 384 dims
```

---

## Additional Resources

- **GitHub**: https://github.com/your-org/alith
- **Website**: https://alith.ai
- **Discord**: https://discord.gg/alith
- **Documentation**: https://docs.alith.ai

---

## License

MIT License - See LICENSE file for details

---

## Support

For issues, questions, or contributions:
- Open an issue on GitHub
- Join our Discord community
- Email: support@alith.ai

---

**Last Updated**: October 19, 2025  
**SDK Version**: 0.12.3
