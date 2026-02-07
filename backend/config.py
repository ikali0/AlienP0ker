from dataclasses import dataclass, field

@dataclass
class Config:
    players: int = 4
    ante: int = 5
    rounds: int = 20000

    target_edge: float = 0.05
    bust_multiplier: float = 1.0

    tube_initial: dict = field(default_factory=lambda: {
        "ST": 5.0,
        "FL": 10.0,
        "FH": 15.0,
        "SF": 20.0,
        "RF": 25.0,
    })
