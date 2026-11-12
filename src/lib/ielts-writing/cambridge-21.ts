// Cambridge IELTS 21 — Academic Writing tests (Task 1 + Task 2).
//
// Task 2 essays are scored by the existing IELTS essay engine
// (/api/score-ielts-essay). Task 1 reports are scored by the image-aware
// engine (/api/score-ielts-task1): the image is sent to the model, and the
// `keyFeatures` string is passed as a marking anchor so Task Achievement is
// judged against the data the visual actually shows.

export interface IeltsWritingTask1 {
  prompt: string;
  /** Public path to the visual shown to the student and sent to the scorer. */
  image: string;
  imageAlt: string;
  /** Line graph · Bar chart · Pie chart · Table · Map/Plan · Process diagram · Mixed */
  visualType: string;
  /** Ground-truth key features — the Cambridge-style marking anchor. */
  keyFeatures: string;
}

export interface IeltsWritingTask2 {
  prompt: string;
  /** Agree/Disagree · Discussion · Advantages/Disadvantages · Problem/Solution · Double Question */
  questionType: string;
}

export interface IeltsWritingTest {
  book: number;
  n: number;
  title: string;
  task1: IeltsWritingTask1;
  task2: IeltsWritingTask2;
}

export const CAMBRIDGE_21_WRITING: IeltsWritingTest[] = [
  {
    book: 21, n: 1, title: 'Test 1',
    task1: {
      prompt: 'The graph below gives information about the number of jobs in four sectors of the economy in the US between 1960 and 2020.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.',
      image: '/images/ielts/writing/cambridge-21-test-1-task1.png',
      imageAlt: 'Line graph: number of jobs (millions) in Manufacturing, Retail, Agriculture and Healthcare in the US, 1960–2020.',
      visualType: 'Line graph',
      keyFeatures: [
        'Line graph, "Number of jobs in four sectors of the economy in the US, 1960-2020". Y-axis: jobs in millions (0–25). X-axis years: 1960, 1980, 2000, 2020.',
        'Manufacturing: 15m (1960) → peak 20m (1980) → 17m (2000) → fell to 13m (2020). Overall decline after a 1980 peak.',
        'Retail: rose steadily 6m (1960) → 10m (1980) → 15m (2000) → 16m (2020).',
        'Agriculture: fell from 6m (1960) to 3m (1980), roughly flat at 3m (2000), down to 2m (2020). Lowest sector throughout the later years.',
        'Healthcare: rose sharply and continuously 2m (1960) → 5m (1980) → 11m (2000) → 16m (2020), the biggest increase.',
        'Overview: Retail and Healthcare rose while Manufacturing and Agriculture fell. By 2020 Healthcare and Retail were the largest (≈16m) and Agriculture the smallest; Healthcare overtook Manufacturing around 2010–2015.',
      ].join('\n'),
    },
    task2: {
      prompt: 'The best way to provide enough homes in large cities is to build tall apartment blocks.\n\nTo what extent do you agree or disagree with this statement?\n\nGive reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.',
      questionType: 'Agree/Disagree',
    },
  },
  {
    book: 21, n: 2, title: 'Test 2',
    task1: {
      prompt: 'The plans below show a college café before it was redesigned and how it looks now.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.',
      image: '/images/ielts/writing/cambridge-21-test-2-task1.png',
      imageAlt: 'Two floor plans of a college café, before redesign and today.',
      visualType: 'Map/Plan',
      keyFeatures: [
        'Two floor plans of a college café: "before redesign" and "today". The kitchen (top-left) and the toilets (bottom-right) were unchanged.',
        'Before: a single serving area for all food and drink (next to the kitchen); two staff dining rooms in the centre; a bar on the right wall; a large central area of tables and chairs.',
        'Now: the single serving area became separate "Hot meals" (by the kitchen); the two staff dining rooms were removed and replaced by "Take away food" and a "Coffee bar" in the centre.',
        'New features added: a salad bar on the left wall; recycling bins where the bar used to be (right); and, outside the café, a barbecue and outdoor seating along the bottom.',
        'Overview: the café was enlarged in service options — one serving point became several specialised ones (hot meals, salad bar, take away, coffee bar) — the staff-only dining rooms gave way to public facilities, and new outdoor seating/barbecue was created. The core seating area, kitchen and toilets stayed.',
      ].join('\n'),
    },
    task2: {
      prompt: 'Some people say that in the digital age, theatres and cinemas are no longer important as people can watch all the entertainment they want online. Others argue that theatres and cinemas are still important both economically and culturally.\n\nDiscuss both these views and give your own opinion.\n\nGive reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.',
      questionType: 'Discussion',
    },
  },
  {
    book: 21, n: 3, title: 'Test 3',
    task1: {
      prompt: 'The diagram below shows how one type of desert, known as a rain-shadow desert, is formed.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.',
      image: '/images/ielts/writing/cambridge-21-test-3-task1.png',
      imageAlt: 'Process diagram of the formation of a rain-shadow desert, with seven numbered stages across a mountain.',
      visualType: 'Process diagram',
      keyFeatures: [
        'Process diagram, "The formation of rain-shadow deserts" — a natural process in seven numbered stages across a coast and mountain (no data/figures). Use the present simple passive and sequencing language.',
        '(1) Winds approach the coast from the sea. (2) The winds are pushed upwards at the mountain.',
        '(3) On the windward side, the moist air rises and cools. (4) Clouds form. (5) Rain falls (on the windward side).',
        '(6) The now-dry air continues over the top of the mountain. (7) Dry winds descend the leeward side and reach inland areas.',
        'Result: because the moisture falls as rain on the windward side, the leeward/inland side receives little rain, forming a rain-shadow desert. The scale spans thousands of kilometres.',
        'Overview: it is a continuous natural process in which moist sea winds lose their water as rain while rising over a mountain, so dry winds pass over the far (leeward) side and create a desert inland.',
      ].join('\n'),
    },
    task2: {
      prompt: 'All university undergraduate courses should include a period of time spent studying abroad or doing a work placement.\n\nDo you think the advantages of this would outweigh the disadvantages?\n\nGive reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.',
      questionType: 'Advantages/Disadvantages',
    },
  },
  {
    book: 21, n: 4, title: 'Test 4',
    task1: {
      prompt: 'The chart and table below show the results of a survey of library users at a university.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.',
      image: '/images/ielts/writing/cambridge-21-test-4-task1.png',
      imageAlt: 'Pie chart of categories of library users and a table of library user satisfaction percentages.',
      visualType: 'Pie chart and table',
      keyFeatures: [
        'A pie chart ("Categories of library users") plus a table ("Library user satisfaction (%)").',
        'Pie chart: Full-time undergraduate 44% (largest), Full-time postgraduate 25%, Part-time postgraduate 16%, Distance learning (all courses) 8%, Academic staff 7% (smallest).',
        'Table columns: Very satisfied / Fairly satisfied / Not satisfied (%). Library opening hours: 65 / 35 / 0. Helpfulness of staff: 95 / 5 / 0. Availability of books: 50 / 40 / 10. Availability of journals: 45 / 35 / 20. Reliability of wi-fi: 48 / 33 / 19.',
        'Overview: Full-time undergraduates are by far the largest user group and postgraduates (full- and part-time) together form a large share, while academic staff and distance learners are small minorities. On satisfaction, helpfulness of staff and opening hours scored highest (no dissatisfaction), whereas availability of journals and reliability of wi-fi had the most "not satisfied" responses (20% and 19%).',
      ].join('\n'),
    },
    task2: {
      prompt: 'Some people argue that primary schools focus too much on formal learning.\n\nTo what extent do you agree with this opinion? How important do you think it is for children to play as well as learn in the primary school classroom?\n\nGive reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.',
      questionType: 'Double Question',
    },
  },
];

export function getCambridge21WritingTest(n: number): IeltsWritingTest | undefined {
  return CAMBRIDGE_21_WRITING.find(t => t.n === n);
}
