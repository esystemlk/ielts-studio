// IELTS Speaking practice tests written for IELTS Studio (original questions in the style of the test,
// not copied from any published book). Each test: a Part 1 topic, a Part 2 cue card, and Part 3
// discussion questions on the cue card's theme — the same shape as the real exam.

export interface SpeakingTest {
  id: string;
  theme: string;
  part1: { topic: string; questions: string[] };
  part2: { task: string; points: string[]; finish: string };
  part3: string[];
}

export const SPEAKING_TESTS: SpeakingTest[] = [
  {
    id: 'st-1', theme: 'Places and travel',
    part1: { topic: 'Your hometown', questions: ['Where is your hometown?', 'What do you like most about living there?', 'Has your hometown changed much since you were a child?', 'Would you like to live there in the future? Why or why not?'] },
    part2: { task: 'Describe a place you visited that was more interesting than you expected.', points: ['where the place was', 'when and why you went there', 'what you did there'], finish: 'and explain why it was more interesting than you expected.' },
    part3: ['Why do some places become popular with tourists while others do not?', 'What are the advantages and disadvantages of tourism for local people?', 'Do you think people travel too much nowadays?', 'How might the way people go on holiday change in the future?'],
  },
  {
    id: 'st-2', theme: 'Learning and skills',
    part1: { topic: 'Work or study', questions: ['Do you work or are you a student?', 'Why did you choose that job or subject?', 'What is the most difficult part of it?', 'What would you like to do in the next few years?'] },
    part2: { task: 'Describe a skill you learned that took you a long time to learn.', points: ['what the skill is', 'how you learned it', 'why it took a long time'], finish: 'and explain how you feel about this skill now.' },
    part3: ['Which skills do you think are most important for young people today?', 'Is it better to learn a skill from a teacher or by yourself?', 'Why do some adults find it hard to learn new things?', 'Will schools need to teach different skills in the future?'],
  },
  {
    id: 'st-3', theme: 'People and relationships',
    part1: { topic: 'Friends', questions: ['Do you prefer to have a few close friends or many friends?', 'How often do you meet your friends?', 'What do you usually do together?', 'Is it easy to make new friends where you live?'] },
    part2: { task: 'Describe a person who has had an important influence on your life.', points: ['who this person is', 'how you know them', 'what they have done for you'], finish: 'and explain why their influence has been important to you.' },
    part3: ['Who usually influences children more, parents or friends?', 'Do famous people have a responsibility to be good role models?', 'How have family relationships changed in your country in recent years?', 'Why do some people find it hard to ask others for help?'],
  },
  {
    id: 'st-4', theme: 'Technology',
    part1: { topic: 'Mobile phones', questions: ['How often do you use your phone?', 'What do you mainly use it for?', 'Could you live without a phone for a week?', 'Have you ever had a problem because of your phone?'] },
    part2: { task: 'Describe a piece of technology you find very useful.', points: ['what it is', 'when you started using it', 'how you use it'], finish: 'and explain why you find it so useful.' },
    part3: ['How has technology changed the way people communicate?', 'Do you think older people find it harder to use new technology? Why?', 'Are there any dangers in children using technology too much?', 'What kinds of jobs might be replaced by technology in the future?'],
  },
  {
    id: 'st-5', theme: 'Environment',
    part1: { topic: 'Weather', questions: ['What is the weather usually like where you live?', 'What kind of weather do you like best?', 'Does the weather ever change your plans?', 'Has the weather in your country changed in recent years?'] },
    part2: { task: 'Describe something you do to help protect the environment.', points: ['what you do', 'when you started doing it', 'how often you do it'], finish: 'and explain why you think it is important.' },
    part3: ['What are the biggest environmental problems in your country?', 'Should governments or individuals be responsible for protecting the environment?', 'Why do some people not care about environmental issues?', 'Do you think cities will become greener in the future?'],
  },
  {
    id: 'st-6', theme: 'Free time and culture',
    part1: { topic: 'Music', questions: ['What kind of music do you enjoy?', 'When do you usually listen to music?', 'Did you learn to play a musical instrument as a child?', 'Do you prefer listening to music alone or with others?'] },
    part2: { task: 'Describe an event you attended that you really enjoyed.', points: ['what the event was', 'where and when it took place', 'who you went with'], finish: 'and explain why you enjoyed it so much.' },
    part3: ['Why do people enjoy going to live events such as concerts or festivals?', 'How important is it to keep traditional festivals alive?', 'Has the internet changed the way people spend their free time?', 'Should governments spend money on arts and culture?'],
  },
  {
    id: 'st-7', theme: 'Health and food',
    part1: { topic: 'Food', questions: ['What is your favourite food?', 'Do you prefer eating at home or eating out?', 'Can you cook? What do you like to make?', 'Is there any food you did not like as a child but like now?'] },
    part2: { task: 'Describe a healthy habit you have or would like to have.', points: ['what the habit is', 'when you started it, or why you want to start it', 'how it affects your daily life'], finish: 'and explain why you think it is a healthy habit.' },
    part3: ['Why do many people find it difficult to eat healthily?', 'Should schools teach children about health and nutrition?', 'How has the way people exercise changed over the years?', 'Is it the responsibility of the government to make people healthier?'],
  },
  {
    id: 'st-8', theme: 'Goals and success',
    part1: { topic: 'Daily routine', questions: ['What does a typical day look like for you?', 'Are you a morning person or an evening person?', 'Is there anything you would like to change about your routine?', 'Do you plan your day in advance?'] },
    part2: { task: 'Describe a goal you achieved that made you proud.', points: ['what the goal was', 'how long it took to achieve', 'what difficulties you faced'], finish: 'and explain why you felt proud of it.' },
    part3: ['What does success mean to most people in your country?', 'Is it more important to be successful at work or to be happy?', 'Why do some people give up on their goals?', 'Do young people today have more opportunities to succeed than their parents did?'],
  },
];

export const getSpeakingTest = (id: string) => SPEAKING_TESTS.find(t => t.id === id);

/** Longest recording allowed per answer, in seconds. Part 2 is one long turn. */
export const ANSWER_SECONDS: Record<1 | 2 | 3, number> = { 1: 45, 2: 120, 3: 90 };
export const PART2_PREP_SECONDS = 60;

/** The questions a student answers for one part (Part 2 is a single long answer). */
export function partQuestions(t: SpeakingTest, part: 1 | 2 | 3): string[] {
  if (part === 1) return t.part1.questions;
  if (part === 3) return t.part3;
  return [`${t.part2.task}\nYou should say: ${t.part2.points.join('; ')}; ${t.part2.finish}`];
}
