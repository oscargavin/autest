# autest

A/B test framework measuring doc impact on LLM coding tasks.

## Usage

```bash
npm run autogen -- <library> [context7-id] # generate tests from Context7 docs
npm run run:all -- <library>              # run A vs B variants
npm run evaluate -- <library>             # compare results
npm run export -- <library>               # export training data
```

## Environment

```bash
export XAI_API_KEY="xai_..." # or set OPENAI_API_KEY
export E2B_API_KEY="e2b_..."
export CONTEXT7_API_KEY="ctx_..."
```

## What it tests

- **Variant A**: LLM solves tasks without docs (1 attempt)
- **Variant B**: LLM solves tasks with docs (up to 3 attempts)

## Output

```
tasks/{library}/        # generated test suite
generated/{library}/    # raw attempt results
results/{library}.json  # evaluation report
training/{library}/     # SFT + DPO training data
```

## Training export

- `sft.jsonl` - passing solutions as prompt/response pairs
- `dpo.jsonl` - preference pairs where docs made the difference

## Results

| Library | A (no docs) | B (with docs) | Doc Impact |
|---------|-------------|---------------|------------|
| tanstack-ai | 25% | 100% | +75pp |
| tanstack-devtools | 92% | 100% | +8pp |

Docs help most for newer/unusual APIs.

## Requirements

- Node 18+
- `XAI_API_KEY` env var
- `E2B_API_KEY` env var
- `CONTEXT7_API_KEY` env var
