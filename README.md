# autest

A/B test framework measuring doc impact on Claude's coding tasks.

## Usage

```bash
npm run autogen -- <library>    # generate tests from Context7 docs
npm run run:all -- <library>    # run A vs B variants
npm run evaluate -- <library>   # compare results
npm run export -- <library>     # export training data
```

## What it tests

- **Variant A**: Claude solves tasks without docs (1 attempt)
- **Variant B**: Claude solves tasks with docs (up to 3 attempts)

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
- `ANTHROPIC_API_KEY` env var
