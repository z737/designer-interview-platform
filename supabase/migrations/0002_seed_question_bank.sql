-- Seed question bank, derived from "Product Designer Interview Process and
-- Evaluation Guide". One or more prompts per evaluation criterion so an
-- interviewer can pick the angle that fits the candidate's work.
--
-- Safe to re-run: prompts are matched on (round_key, prompt).

create unique index if not exists question_bank_round_prompt_key
  on public.question_bank (round_key, prompt);

insert into public.question_bank (round_key, criterion, prompt, sort_order) values

-- Round 1 — Portfolio / Case-Study Review -----------------------------------
('portfolio', 'problem_understanding', 'Walk me through this project. What problem were you solving, and why did it matter to the business?', 10),
('portfolio', 'problem_understanding', 'How did you know this was the right problem to work on rather than something else on the roadmap?', 11),
('portfolio', 'ownership',             'Which parts of this did you personally own, and which were driven by the PM, engineers, or other designers?', 20),
('portfolio', 'ownership',             'What decision in this project would not have happened without you?', 21),
('portfolio', 'user_understanding',    'Who were the users? Describe their goals, context, and biggest pain points.', 30),
('portfolio', 'user_understanding',    'What did you get wrong about your users at the start that you only learned later?', 31),
('portfolio', 'product_thinking',      'How did this design change a user or business metric? What did you measure?', 40),
('portfolio', 'product_thinking',      'What did you deliberately choose not to build, and why?', 41),
('portfolio', 'ux_thinking',           'Take me through the full flow, including the empty, loading, error, and permission states.', 50),
('portfolio', 'ux_thinking',           'Where was the hardest complexity in this experience, and how did you simplify it?', 51),
('portfolio', 'visual_craft',          'Talk me through your typography, spacing, and hierarchy decisions on this screen.', 60),
('portfolio', 'visual_craft',          'How did this work fit into (or extend) a design system?', 61),
('portfolio', 'research_validation',   'What evidence informed this direction, and how did testing change the solution?', 70),
('portfolio', 'research_validation',   'Describe a time user feedback invalidated a design you were attached to. What did you do?', 71),
('portfolio', 'collaboration',         'How did you work with your PM and engineers through this? Where did you disagree?', 80),
('portfolio', 'collaboration',         'How did you handle a stakeholder who wanted something you thought was wrong?', 81),
('portfolio', 'ai_workflows',          'Where does AI sit in your design process today — research, exploration, prototyping, audits?', 90),
('portfolio', 'ai_workflows',          'Show me something you shipped faster or better because of an AI tool. What did it not help with?', 91),
('portfolio', 'self_awareness',        'Looking at this work today, what is the weakest part and what would you change?', 100),
('portfolio', 'self_awareness',        'What is a skill you know you need to grow, and what are you doing about it?', 101),

-- Round 2 — Online Whiteboarding --------------------------------------------
('whiteboard', 'problem_framing',      'Before we start: how would you restate this problem in your own words?', 10),
('whiteboard', 'problem_framing',      'What outcome would tell us this was worth building?', 11),
('whiteboard', 'clarifying_questions', 'What do you need to know from me about the users, goals, and constraints?', 20),
('whiteboard', 'clarifying_questions', 'What business objective do you think sits behind this request?', 21),
('whiteboard', 'assumptions',          'What are you assuming right now that we have not confirmed?', 30),
('whiteboard', 'assumptions',          'Which of those assumptions would hurt the most if it turned out to be wrong?', 31),
('whiteboard', 'prioritization',       'If you could only solve one part of this, which part and why?', 40),
('whiteboard', 'prioritization',       'What is explicitly out of scope for a first version?', 41),
('whiteboard', 'user_journey',         'Walk me through the end-to-end journey, not just this screen. Where does it start and end?', 50),
('whiteboard', 'user_journey',         'What happens to this user the second and tenth time they do this?', 51),
('whiteboard', 'information_architecture', 'How would you organise this information? What is primary, secondary, and hidden?', 60),
('whiteboard', 'information_architecture', 'What happens to this layout when the data volume grows 10x?', 61),
('whiteboard', 'tradeoffs',            'You considered another approach — why did you choose this one over it?', 70),
('whiteboard', 'tradeoffs',            'What does this design cost us in engineering effort, and is it worth it?', 71),
('whiteboard', 'edge_cases',           'What does this look like when it is empty, when it fails, and when it is slow?', 80),
('whiteboard', 'edge_cases',           'Which user type breaks this design — a brand-new user, a power user, or an admin?', 81),
('whiteboard', 'collaboration',        'What would you want the PM to go find out before you designed the next version?', 90),
('whiteboard', 'collaboration',        'How would you pressure-test this with engineering before committing?', 91),
('whiteboard', 'communication',        'Summarise your recommendation in two sentences, as if to a room of stakeholders.', 100),
('whiteboard', 'communication',        'What is the single riskiest part of what you just proposed?', 101)

on conflict (round_key, prompt) do nothing;
