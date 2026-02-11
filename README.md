SYSTEM TYPE:
Financial-grade simulation engine with deterministic strategy logic and dynamic payout pools.
Mock-Up UI: https://alienpoker.lovable.app/
--------------------------------------------------
SECTION 1 — CORE GAME LOOP
--------------------------------------------------

FOR round in 1 → Rounds_Per_Run:

    1. Initialize round state
        - Reset deck
        - Reset per-round balances
        - Create round log object

    2. Collect antes
        - Each player and dealer pay Ante
        - Add to Play_Pot
        - Update house input tracking

    3. Shuffle deck (standard 52-card deck)

    4. Deal 5 cards to each participant

    5. For each participant (including dealer if Dealer_Draw_Allowed = TRUE):

           a. Determine HT_ID using deterministic HT decision engine
           b. Apply HoldMask
           c. Discard non-held cards
           d. Draw replacements from deck
           e. Evaluate final 5-card hand
           f. Record HT usage

    6. Resolve outcomes vs dealer
           - Compare hand ranks
           - Apply tie rule (DealerWinsOnTie flag)
           - Determine Play_Pot winner

    7. Process Tube payouts
           - If final hand qualifies ST, FL, FH, SF, RF:
                payout = Tube_Payout_Function(tube)
                tube.current_balance -= payout
                player.balance += payout
           - If tube empty:
                Apply refill rules

    8. Apply Bust penalties
           - If HT flagged as Bust:
                penalty = Ante * Bust_Penalty_Multiplier
                player.balance -= penalty
                house.balance += penalty

    9. Update House + Tube balances

   10. Log statistics:
           - Round net
           - House delta
           - Player deltas
           - Tube balances
           - HT_ID used
           - Bust events

--------------------------------------------------
SECTION 2 — GAME RULES
--------------------------------------------------

Game Goal:
Players compete against dealer to beat dealer’s final 5-card hand.
House is the bank.

Core Rules:
- 1 dealer + N players (default 4)
- Fixed Ante (default 5 chips)
- 52-card deck reshuffled each round
- Deterministic Hold Types (no manual player decisions)

Dealer configuration:
- Dealer_Draw_Allowed
- Dealer_Bust_Allowed
- DealerWinsOnTie

--------------------------------------------------
SECTION 3 — HOLD TYPE (HT) ENGINE
--------------------------------------------------

Each HT must contain:

HT {
    id
    priority_rank
    hold_mask[5]
    bust_probability_flag
    usage_count
    win_count
    loss_count
    bust_count
    expected_value
}

HT Decision Algorithm:

Evaluate in strict priority order:

1. Made hands
2. Strong draws (4 to straight/flush)
3. Medium draws
4. High card logic
5. Draw all

HT must be deterministic.
No randomness in strategy.

Track:
- Win %
- Loss %
- Bust %
- EV per HT
- Average tube trigger rate

--------------------------------------------------
SECTION 4 — STACK_TUBE ECONOMY ENGINE
--------------------------------------------------

Define Tube object:

Tube {
    name (ST, FL, FH, SF, RF)
    initial_balance
    current_balance
    total_funded
    total_paid
    hit_count
    depletion_count
}

Tube_Payout_Function options must be modular:

Option A: Fixed payout
Option B: Percentage drain
Option C: Logarithmic scaling
Option D: Progressive scaling

Refill Rules:
- Player_Refills_Tubes_On_Take
- House_Refills_On_Decline
- Trigger thresholds for forced refill

Track:
- Average tube balance
- Depletion frequency
- Volatility index per tube

--------------------------------------------------
SECTION 5 — AI FEEDBACK LOOP (MATHEMATICAL DESIGN)
--------------------------------------------------

Target:
Maintain House Edge between Target_Min and Target_Max (example 3%–7%)

Definitions:

HouseEdge = (Total_Antes - Total_Payouts) / Total_Antes

Total_Payouts = PlayPot_Payouts + Tube_Payouts - Bust_Penalties

After each 20,000-round simulation:

Compute:
- HouseEdge
- Volatility (std deviation of round returns)
- HT_EV_distribution
- Tube_Depletion_Rate

AI Adjustment Algorithm:

Error = Target_HouseEdge - Measured_HouseEdge

If |Error| > tolerance:

    Adjust parameters proportionally:

    Bust_Penalty_Multiplier += alpha * Error
    Tube_Initial_Values += beta * Error
    Tube_Payout_Scaling += gamma * Error
    Dealer_Draw_Aggressiveness += delta * Error

Re-run simulation.

Repeat until:
HouseEdge within acceptable band AND
No HT EV > +2%

This forms a closed-loop control system.

Use gradient-based parameter tuning.

--------------------------------------------------
SECTION 6 — REQUIRED OUTPUTS
--------------------------------------------------

Simulation must output:

1. House net profit
2. House edge %
3. Player aggregate net
4. Per-HT:
      - Usage %
      - Win %
      - Loss %
      - Bust %
      - EV
5. Tube metrics:
      - Avg balance
      - Max balance
      - Total funded
      - Total paid
      - Depletion frequency
6. Exploit flags:
      - HT_EV > threshold
      - Tube drain > threshold
7. Monte Carlo summary (optional 100 runs)

--------------------------------------------------
SECTION 7 — MODULAR ARCHITECTURE
--------------------------------------------------

Must generate modular code:

/engine
    deck
    hand_evaluator
    ht_engine
    tube_engine
    resolution_engine
    bust_engine

/simulation
    round_runner
    simulator
    monte_carlo
    analytics

/ai
    edge_controller
    ht_optimizer
    anomaly_detector

/config
    config_loader

Include structured logging for 20,000+ round runs.
Code must support scaling to 100k+ simulations.

--------------------------------------------------
END REQUIREMENTS
--------------------------------------------------

Engine must be deterministic, reproducible, and simulation-ready.
All economic variables configurable.
All statistics exportable.
