Prompt: English Word Mastery Loops with Streaks, Sets, and Persistence

You are extending my English word reading practice app for a child learner. The app currently shows two- and three-letter words and tracks whether the learner could read them.

I want to add a mastery system with clear rules, persistence, and test coverage.

⸻

Feature Requirements
	1.	Sets of 12 words
	•	Once the learner accumulates 12 “unknown” words (words she could not read), the app should freeze into an Active Set of 12 words.
	•	The learner practices only these 12 until they are all mastered.
	•	No new words are introduced until all 12 are mastered.
	2.	Mastery rule
	•	A word is considered mastered once the learner reads it correctly 5 times in a row.
	•	Mastered words turn green in the Weak Words panel.
	3.	Progression
	•	When all 12 words in the active set are mastered, the app automatically advances to the next batch of 12 weak words.
	•	If fewer than 12 unknown words remain, the set size adjusts accordingly.
	4.	Rotation
	•	Words rotate only within the current active set.
	•	Words with lower streaks should appear more often than higher-streak words.
	•	Within equal streaks, older lastSeen words are shown before recently seen ones.
	•	Mastered words do not reappear unless reset.
	5.	Persistence
	•	Store all learner progress in localStorage.
	•	Save: current active set, per-word streaks and attempts, mastery status, progress (set number, mastered count), and rotation position.
	•	On restart, the app restores exactly where the learner left off.
	6.	Controls / UI
	•	Display progress indicators: “Set X of Y, N/12 mastered.”
	•	Add:
	•	Reset current set → clears streaks and mastery only for active set words.
	•	Reset all mastery → clears progress across all words.
	•	Undo last tap → reverts the last action within a short window (e.g., 5 seconds).
	7.	Corpus filter
	•	Only two- and three-letter English words are included in this loop system.

⸻

Acceptance Criteria & Test Scenarios

Scenario 1: Form a 12-word active set and freeze intake
	•	Given 12 words are marked “Couldn’t read”
	•	When the 12th word is added
	•	Then the app creates Active Set #1 of exactly 12 words
	•	And no new words can enter until all are mastered

Scenario 2: Rotate only inside the active set
	•	Given an active set exists
	•	Then only those words appear in prompts

Scenario 3: Streak increments on correct
	•	When a word is read correctly 3 times in a row
	•	Then streak = 3, attempts = 3

Scenario 4: Streak resets on incorrect
	•	Given streak = 3
	•	When answered wrong
	•	Then streak = 0, attempts increment by 1

Scenario 5: Mastery marks word green
	•	Given streak reaches 5 consecutive corrects
	•	Then the word is marked green
	•	And is removed from rotation

Scenario 6: Complete set → auto-advance
	•	When all words in a set are green
	•	Then the app loads the next batch of up to 12 unknown words

Scenario 7: Last set smaller than 12
	•	If fewer than 12 words remain
	•	Then active set size = remaining words

Scenario 8: Rotation bias
	•	Words with streak 0–1 should appear more frequently than words with streak 3–4
	•	For equal streaks, words not seen recently should appear first

Scenario 9: Progress indicators
	•	Show “Set X of Y” and “N/K mastered”
	•	Update live after each answer

Scenario 10: Undo last tap
	•	Given a word was answered
	•	When undo is pressed within 5s
	•	Then the streak/attempt/mastery change is reverted

Scenario 11: Reset current set
	•	When reset is triggered
	•	Then all streaks/mastery for that set clear, but the same set stays active

Scenario 12: Reset all mastery
	•	When global reset is triggered
	•	Then all progress across all words clears
	•	And the app starts fresh intake until 12 unknowns form a new set

Scenario 13: Persistence—mid-session
	•	If the app is closed and reopened mid-set
	•	Then the same active set, streaks, progress, and next word appear correctly

Scenario 14: Persistence—after set completion
	•	If the app is closed after finishing a set
	•	Then the next set remains active with correct stats restored

Scenario 15: Separate learners
	•	Multiple learners (e.g., Eva, Mishika) each have isolated progress and sets

Scenario 16: Only 2- and 3-letter words
	•	Ensure the corpus filter excludes any longer words

⸻

QA Checklist
	•	Freeze rule: after 12 unknowns, intake stops until all are mastered
	•	Mastery rule: 5 consecutive correct → mastered; wrong resets streak to 0
	•	Rotation: bias toward low-streak words; no mastered words shown
	•	Persistence: full restore of active set and state after reload
	•	Controls: Undo (last tap), Reset current set, Reset all mastery
	•	Edge cases: last set < 12; empty corpus; multiple learners; localStorage off

⸻

Instruction:
Implement all the features with acceptance scenarios and track them in a checklist so you do not lose track
Do not add Kannada or Hindi yet — we’ll extend later.