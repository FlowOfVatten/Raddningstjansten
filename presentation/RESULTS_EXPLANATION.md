# Results Explanation (Participant + Full Results Page)

This document explains every result shown in:
- Participant inline results (`presentation/index.html` -> `#inlineResults`)
- Full facilitator results page (`presentation/results.html`)

It also explains where values come from in code and how they are aggregated.

## 1. Data Flow Summary

1. Each participant submits a snapshot of their top-5 queue and summary data from `presentation/app.js`.
2. Backend stores submissions and uses the latest submission per participant.
3. Aggregation runs in `api/presentation/store.js` (`buildAggregateResults`).
4. Full results page reads `/api/presentation/results` and renders cards/bars in `presentation/results.js`.
5. Participant inline comparison reads:
- `/api/presentation/myresult` for own latest summary
- `/api/presentation/results` for group averages

## 2. Participant Inline Results (Shown After Results Phase)

UI location:
- `presentation/index.html` section `#inlineResults`
- Rendered by `showInlineResults()` in `presentation/app.js`

Displayed fields under **Your results**:
- Delivery score
- Wellbeing
- Overload

Displayed fields under **Group average**:
- Delivery score
- Wellbeing
- Overload

Additional summary line:
- Shows participant count and business alignment comparison:
  - `your businessAlignmentScore` vs `group avgBusinessAlignmentScore`

### 2.1 Delivery Score (participant)

Calculated in `computeSummary()` in `presentation/app.js`.

Formula:

```text
deliveryScore =
  (completedTaskCount * 12)
  + (completedBusinessValue * 0.35)
  - (overloadMinutes * 0.15)
```

Where:
- `completedTaskCount` = number of tasks fully completed
- `completedBusinessValue` = sum of business scores of completed tasks
- `overloadMinutes` = minutes beyond the 8-hour budget

Interpretation:
- Higher if participants complete more tasks and complete higher-value tasks.
- Lower if they exceed the workday budget.

### 2.2 Wellbeing (participant)

Calculated in `computeSummary()` in `presentation/app.js`.

Formula:

```text
wellbeingScore = (wellbeingTaskCount * 2) + chaosWellbeingDelta
```

Where:
- `wellbeingTaskCount` = number of wellbeing breaks taken
- `chaosWellbeingDelta` = scenario penalties/bonuses from interruption decisions

Interpretation:
- Captures recovery behavior plus the emotional/decision impact of chaos choices.

### 2.3 Overload (participant)

Calculated in `computeSummary()` in `presentation/app.js`.

Formulas:

```text
totalMinutes = workdayConsumedMinutes + chaosPenaltyMinutes
remainingMinutes = 480 - totalMinutes
overloadMinutes = max(0, -remainingMinutes)
```

Interpretation:
- `0 min` means participant stayed within the 8-hour budget.
- Positive value means they exceeded the day budget by that many minutes.

### 2.4 Business Alignment (shown in summary text)

Calculated in `computeSummary()` in `presentation/app.js`.

Per completed task:
1. Expected priority rank is inferred from task business score:
- 85+ => expected rank 1
- 70-84.9 => expected rank 2
- 55-69.9 => expected rank 3
- 40-54.9 => expected rank 4
- <40 => expected rank 5

2. Per-task alignment value:

```text
alignment = max(0, 100 - (rankDelta * 22) - falseUrgencyPenalty)
```

Where:
- `rankDelta = abs(actualCompletedRank - expectedRank)`
- `falseUrgencyPenalty = 20` when a false-urgency task is completed at rank 1-2, else `0`

3. Final score is average of alignment values over completed tasks.

Interpretation:
- High score means participants completed high-value work at appropriately high priority.
- Punishes promoting false urgency too high.

## 3. Full Results Page (Facilitator View)

UI location:
- `presentation/results.html`
- Loaded and rendered by `presentation/results.js`

The page shows:
- Header with latest phase and participant count
- 12 metric tiles
- 8 grouped bar insight cards
- All prioritized tasks frequency list
- CSV export

## 4. Metric Tiles (12 boxes)

All are group averages from `buildAggregateResults()` in `api/presentation/store.js`:

```text
avgX = round1(sumX / participants)
```

Participants used in aggregate:
- Only latest submission per participant is included.

### 4.1 Delivery score
- `avgDeliveryScore`
- Average of participant `deliveryScore`.
- Fallback: if a participant summary has no delivery score, backend computes a ranking-based fallback value.

### 4.2 Business alignment
- `avgBusinessAlignmentScore`
- Average of participant business alignment scores.

### 4.3 Completed tasks
- `avgCompletedTaskCount`
- Average number of fully completed tasks.

### 4.4 Hold events
- `avgHoldCount`
- Average number of hold interruptions per participant.

### 4.5 Hold minutes
- `avgHoldMinutes`
- Average total hold duration (minutes-equivalent from tracked hold time).

### 4.6 Wellbeing
- `avgWellbeingScore`
- Average wellbeing score.

### 4.7 Overload
- `avgOverloadMinutes`
- Average overtime beyond budget.

### 4.8 Channel accuracy
- `avgChannelAccuracy`
- Average percentage of correctly handled channel actions.

### 4.9 Focus efficiency
- `avgFocusEfficiency`

Per participant:

```text
focusEfficiency = (focusProducedSec / focusWorkedSec) * 100
```

(0 if no focus worked time)

### 4.10 Clarity match
- `avgClarityMatchRate`

Per participant:

```text
clarityRate = (clarityMatchCount / unclearTaskCount) * 100
```

(0 if no unclear tasks)

### 4.11 Interruptions
- `avgInterruptions`
- Average interruption count.

### 4.12 Breaks
- `avgBreakCount / avgBreakMinutes`
- Average number of breaks and average break minutes.

## 5. Insight Cards (Bar Sections)

### 5.1 Rank 1 choices
- Source: `highlights.topRanked`
- Meaning: tasks most often placed at rank 1.

### 5.2 Most common in Top 3
- Source: `highlights.topThree`
- Meaning: tasks most frequently appearing anywhere in rank 1-3.

### 5.3 Group consensus
- Source: `highlights.consensus`
- Built from average rank per task among participants who included it.
- Sorted by lowest (best) average rank, then by mentions.

### 5.4 Group profiles
- Source: `profiles`

Rules in `buildAggregateResults()`:
- **Perfection-driven**: participant has `>= 3` tasks marked `quality = perfect`
- **Recovery users**: participant has `wellbeingTaskCount >= 2`
- **Reactive operators**: participant has any of:
  - `interruptionCount >= 4`, or
  - `channelFalseFires >= 2`, or
  - `channelMissed >= 2`
- **Overload risk**: participant has `overloadMinutes > 0`

### 5.5 Workload status
- Source: `distributions`

Classification:
- **Overloaded**: `overloadMinutes > 0`
- **Tight schedule**: not overloaded and `remainingMinutes < 90`
- **In control**: all others

### 5.6 Channel behavior
- Source: `distributions`

Classification by channel accuracy:
- **Strong**: `>= 70%`
- **Mixed**: `>= 40%` and `< 70%`
- **Low**: `< 40%`

### 5.7 Focus stability
- Source: `distributions`

Classification by focus efficiency:
- **Stable**: `>= 70%`
- **Fragmented**: `>= 40%` and `< 70%`
- **Collapsed**: `< 40%`

### 5.8 Clarity vs overwork
- Source: `distributions`

Classification by clarity match rate:
- **Strong calibration**: `>= 70%`
- **Mixed calibration**: `>= 40%` and `< 70%`
- **Over/under-work**: `< 40%`

## 6. All Prioritized Tasks

Section title: **All prioritized tasks**

Source:
- `counts` + `taskLabels` from `/results`
- Rendered in `results.js` as sorted descending by total count

Meaning:
- Shows how many times each task appears in participant submitted top-5 lists.
- This is a frequency count, not a quality score.

Labeling behavior:
1. Uses backend `taskLabels[taskId]` when available.
2. Falls back to known legacy mapping.
3. For raw IDs like `task_001`, falls back to `Task 001` format.

## 7. CSV Export

Button: **Export CSV**

Exported columns include:
- session/phase/choice/count
- all average metric fields (delivery, business alignment, completed tasks/value, holds, wellbeing, overload, channel, focus, clarity, interruptions, breaks)
- export timestamp

Note:
- Export is anonymized group data by choice/aggregate metrics.

## 8. Rounding and Numeric Notes

- Most aggregate metrics are rounded to 1 decimal via `round1()`.
- Percent values are displayed with `%` in UI.
- Duration fields are displayed with `min` where relevant.

## 9. Practical Reading Guide for Facilitation

Use this sequence when presenting:
1. Start with **Delivery / Business alignment / Overload** for outcome quality.
2. Then show **Hold events/minutes + Interruptions** to explain pressure context.
3. Use **Channel / Focus / Clarity distributions** to explain behavior patterns.
4. Finish with **All prioritized tasks** and **Top 3/Rank 1** to discuss collective prioritization habits.
