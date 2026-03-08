# RL Engine

AgentLens includes a reinforcement learning engine that learns from agent session outcomes. Instead of just tracking metrics, it evaluates which tools help agents succeed.

## How it works

### 1. Reward signal

Every completed session produces a reward score:

| Factor | Value | Weight |
|--------|-------|--------|
| Success | +1.0 | Primary |
| Failure | −0.5 | Primary |
| Token efficiency | 0 to +0.3 | Budget under/over usage |
| Loop detected | −0.3 | Per loop occurrence |
| Speed bonus | 0 to +0.2 | Faster sessions score higher |

### 2. Q-value updates

Each tool used in a session has its Q-value updated using temporal difference learning:

```
Q(tool) = Q(tool) + α × (reward − Q(tool))
```

Where:
- **α (learning rate)** = 0.1 — how fast the model adapts
- **γ (discount)** = 0.95 — tools closer to the outcome get more credit
- **reward** = computed session score

### 3. What you see

The dashboard's **RL Insights** page shows:

- **Tool rankings** — sorted by Q-value (highest = most effective)
- **Confidence** — how many sessions contributed to the score
- **Trend** — whether a tool's effectiveness is improving or declining
- **Recommendation** — keep, investigate, or deprecate

## Example

After 100 sessions, the RL engine might report:

| Tool | Q-value | Sessions | Recommendation |
|------|---------|----------|---------------|
| `code_search` | 0.82 | 67 | ✅ Keep |
| `read_file` | 0.71 | 89 | ✅ Keep |
| `web_search` | 0.34 | 45 | ⚠️ Investigate |
| `run_shell` | −0.12 | 23 | 🔴 Consider removing |

This tells you that `code_search` consistently leads to successful sessions, while `run_shell` is correlated with failures.

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `LOOP_DETECTION_THRESHOLD` | `3` | Consecutive duplicate tool calls before flagging a loop |
