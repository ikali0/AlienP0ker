from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import Config
from engine import GameEngine
from auto_balancer import AutoBalancer

app = FastAPI()

# Allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/simulate")
def simulate():
    cfg = Config()
    engine = GameEngine(cfg)
    result = engine.simulate()

    if not (0.03 <= result["house_edge"] <= 0.07):
        balancer = AutoBalancer(GameEngine, cfg)
        result = balancer.run()

    return result
