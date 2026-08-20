-- Round 2's criteria were rewritten in the updated evaluation guide, so its
-- question bank is replaced wholesale: the old rows point at criterion keys
-- (clarifying_questions, assumptions, user_journey, information_architecture,
-- edge_cases, collaboration, communication) that no longer exist, and questions
-- with an unknown criterion would silently vanish from the grouped list.
--
-- Round 1's criteria are unchanged, so its questions are left alone.

delete from public.question_bank where round_key = 'whiteboard';

insert into public.question_bank (round_key, criterion, prompt, sort_order) values

('whiteboard', 'problem_framing',            'Before we start: how would you restate this problem in your own words?', 10),
('whiteboard', 'problem_framing',            'Which part of this problem are you choosing to solve, and which are you setting aside?', 11),

('whiteboard', 'context_gathering',          'What do you need to know from me about the goal, scope, and constraints?', 20),
('whiteboard', 'context_gathering',          'What would success look like here, and how would we measure it?', 21),
('whiteboard', 'context_gathering',          'What platform are we designing for, and does that change your approach?', 22),

('whiteboard', 'user_understanding',         'Who exactly is this for? What are they trying to get done?', 30),
('whiteboard', 'user_understanding',         'What behaviour or use case are you designing around, specifically?', 31),

('whiteboard', 'handling_ambiguity',         'What are you assuming right now that we have not confirmed?', 40),
('whiteboard', 'handling_ambiguity',         'If that assumption turned out to be wrong, what would you change?', 41),

('whiteboard', 'prioritization',             'If you only had time to solve one part of this, which and why?', 50),
('whiteboard', 'prioritization',             'What is explicitly out of scope for this version?', 51),

('whiteboard', 'user_flow_thinking',         'Walk me through the end-to-end flow before we look at any screen.', 60),
('whiteboard', 'user_flow_thinking',         'Where does this journey start, and where does it end?', 61),

('whiteboard', 'solution_reasoning',         'How does this decision connect back to the user need you identified?', 70),
('whiteboard', 'solution_reasoning',         'Which constraint we discussed earlier shaped this the most?', 71),

('whiteboard', 'tradeoffs',                  'You considered another approach — why this one over that?', 80),
('whiteboard', 'tradeoffs',                  'What are you deliberately sacrificing with this choice?', 81),

('whiteboard', 'communication_collaboration', 'What would you want the PM to go find out before the next iteration?', 90),
('whiteboard', 'communication_collaboration', 'Here is a new constraint — how does that change your thinking?', 91),

('whiteboard', 'reflection_next_steps',      'Summarise your solution in two sentences.', 100),
('whiteboard', 'reflection_next_steps',      'What is weakest about this, and what would you improve with more time?', 101),
('whiteboard', 'reflection_next_steps',      'How would you validate that this actually works?', 102)

on conflict (round_key, prompt) do nothing;
