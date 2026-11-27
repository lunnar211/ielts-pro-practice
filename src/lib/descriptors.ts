// Band-descriptor guide content for IELTS Pro Practice.
//
// Every summary below is written in plain words by this site, based on the
// official public IELTS band descriptors published by IELTS (British
// Council / IDP / Cambridge). Nothing here is copied from the official
// descriptor PDFs, and no official test material is reproduced. The sample
// essay is an original practice example written for this site — it is NOT
// an official IELTS answer.
//
// Sources (checked 27 Nov 2026):
// - IDP IELTS, "IELTS band scores – How they are calculated"
//   https://ielts.idp.com/nepal/results/scores
// - British Council, "How is IELTS assessed?"
//   https://takeielts.britishcouncil.org/results/how-is-ielts-assessed
// - IELTS, "Test format" https://www.ielts.org/about-the-test/test-format

export interface BandLevel {
  band: number;
  label: string;
  meaning: string;
}

/** The 9-band scale, in plain words. */
export const BAND_SCALE: BandLevel[] = [
  { band: 9, label: "Expert user", meaning: "Full command of English. Accurate, fluent, and shows complete understanding." },
  { band: 8, label: "Very good user", meaning: "Full command with only occasional small mistakes. Handles complex ideas and detailed arguments well." },
  { band: 7, label: "Good user", meaning: "Good command with occasional mistakes. Generally handles complex language well and understands detailed reasoning." },
  { band: 6, label: "Competent user", meaning: "Effective command despite some mistakes. Can use and understand fairly complex language, especially in familiar situations." },
  { band: 5, label: "Modest user", meaning: "Partial command. Copes with the overall meaning in most situations, but is likely to make many mistakes." },
  { band: 4, label: "Limited user", meaning: "Basic command, limited to familiar situations. Frequent problems in understanding and expression." },
  { band: 3, label: "Extremely limited user", meaning: "Only general meaning in very familiar situations. Communication breaks down often." },
  { band: 2, label: "Intermittent user", meaning: "Great difficulty understanding spoken and written English." },
  { band: 1, label: "Non-user", meaning: "Cannot use English except for a few isolated words." },
  { band: 0, label: "Did not attempt the test", meaning: "No assessable answer was given." },
];

export interface CriterionGuide {
  name: string;
  whatItMeans: string;
  /** Plain-word summary of what this band looks like, bands 9 down to 5. */
  levels: { band: number; summary: string }[];
}

export const WRITING_TASK1_CRITERIA: CriterionGuide[] = [
  {
    name: "Task Achievement",
    whatItMeans:
      "Did you cover everything the task asked for? For a chart or diagram: all the key features, an overview, and accurate data. For a letter: all the bullet points, the right tone, and the right format. At least 150 words.",
    levels: [
      { band: 9, summary: "Every key feature is covered fully and accurately. The overview is clear and the data is well chosen." },
      { band: 8, summary: "Key features are covered well. The overview is clear and the data is chosen well." },
      { band: 7, summary: "Key features are covered and the overview is clear. The data is adequate." },
      { band: 6, summary: "Key features are covered, but some are missed or unclear. The overview is present but weak." },
      { band: 5, summary: "Key features are only partly covered. The overview is missing or unclear, and some data may be wrong." },
    ],
  },
  {
    name: "Coherence and Cohesion",
    whatItMeans:
      "Is the answer organised so a reader can follow it? Clear paragraphs, ideas in a logical order, and linking words that help — not ones repeated mechanically.",
    levels: [
      { band: 9, summary: "Ideas flow naturally. Paragraphing is skilful and linking is smooth, never forced." },
      { band: 8, summary: "Ideas are ordered logically. Paragraphing is managed well and linking is skilful." },
      { band: 7, summary: "Ideas are organised logically with clear progress. Paragraphs are clear and linking words are used correctly." },
      { band: 6, summary: "Ideas are organised, but progress is not always clear. Some paragraphs are weak and linking is sometimes wrong or mechanical." },
      { band: 5, summary: "Organisation is weak in places. Paragraphs are unclear and linking is basic or often wrong." },
    ],
  },
  {
    name: "Lexical Resource",
    whatItMeans:
      "The range and accuracy of your words: enough different words for the task, words used in the right way, correct spelling and word forms.",
    levels: [
      { band: 9, summary: "A wide range used naturally and precisely. Rare slips only." },
      { band: 8, summary: "A wide range used fluently and flexibly, with only occasional small slips." },
      { band: 7, summary: "Enough range for the task. Some less common words are used well, with occasional errors." },
      { band: 6, summary: "Enough range, but words are often simple or repeated. Errors in choice and spelling happen, but meaning is usually clear." },
      { band: 5, summary: "Limited range. Frequent errors in word choice and spelling, and meaning is sometimes hard to follow." },
    ],
  },
  {
    name: "Grammatical Range and Accuracy",
    whatItMeans:
      "The range and accuracy of your sentences: a mix of simple and complex sentences, correct grammar and punctuation.",
    levels: [
      { band: 9, summary: "A full range of sentence structures used naturally. Almost no errors." },
      { band: 8, summary: "A wide range used well. Most sentences are error-free." },
      { band: 7, summary: "A good mix of simple and complex sentences. Frequent error-free sentences, with a few errors left." },
      { band: 6, summary: "A mix of simple and complex sentences. Errors happen, but meaning is usually clear." },
      { band: 5, summary: "Mostly simple sentences. Frequent grammar errors, and meaning is sometimes unclear." },
    ],
  },
];

export const WRITING_TASK2_CRITERIA: CriterionGuide[] = [
  {
    name: "Task Response",
    whatItMeans:
      "Did you answer the question fully? Every part of the question, a clear position from start to finish, ideas that are developed and supported — not just listed. At least 250 words.",
    levels: [
      { band: 9, summary: "Every part is answered fully. Ideas are fully developed with clear, relevant support. The position is clear throughout." },
      { band: 8, summary: "Every part is answered well. Ideas are well developed and supported. The position is clear throughout." },
      { band: 7, summary: "All parts are answered. The position is clear throughout, and main ideas are extended and supported." },
      { band: 6, summary: "All parts are answered, though some parts are covered more fully than others. The position is clear. Some ideas are supported, others are thin." },
      { band: 5, summary: "The question is answered only in part. The position is not always clear and ideas are listed more than developed." },
    ],
  },
  {
    name: "Coherence and Cohesion",
    whatItMeans:
      "Is the essay organised so a reader can follow it? Clear paragraphs, ideas in a logical order, and linking words that help — not ones repeated mechanically.",
    levels: [
      { band: 9, summary: "Ideas flow naturally. Paragraphing is skilful and linking is smooth, never forced." },
      { band: 8, summary: "Ideas are ordered logically. Paragraphing is managed well and linking is skilful." },
      { band: 7, summary: "Ideas are organised logically with clear progress. Paragraphs are clear and linking words are used correctly." },
      { band: 6, summary: "Ideas are organised, but progress is not always clear. Some paragraphs are weak and linking is sometimes wrong or mechanical." },
      { band: 5, summary: "Organisation is weak in places. Paragraphs are unclear and linking is basic or often wrong." },
    ],
  },
  {
    name: "Lexical Resource",
    whatItMeans:
      "The range and accuracy of your words: enough different words for the task, words used in the right way, correct spelling and word forms.",
    levels: [
      { band: 9, summary: "A wide range used naturally and precisely. Rare slips only." },
      { band: 8, summary: "A wide range used fluently and flexibly, with only occasional small slips." },
      { band: 7, summary: "Enough range for the task. Some less common words are used well, with occasional errors." },
      { band: 6, summary: "Enough range, but words are often simple or repeated. Errors in choice and spelling happen, but meaning is usually clear." },
      { band: 5, summary: "Limited range. Frequent errors in word choice and spelling, and meaning is sometimes hard to follow." },
    ],
  },
  {
    name: "Grammatical Range and Accuracy",
    whatItMeans:
      "The range and accuracy of your sentences: a mix of simple and complex sentences, correct grammar and punctuation.",
    levels: [
      { band: 9, summary: "A full range of sentence structures used naturally. Almost no errors." },
      { band: 8, summary: "A wide range used well. Most sentences are error-free." },
      { band: 7, summary: "A good mix of simple and complex sentences. Frequent error-free sentences, with a few errors left." },
      { band: 6, summary: "A mix of simple and complex sentences. Errors happen, but meaning is usually clear." },
      { band: 5, summary: "Mostly simple sentences. Frequent grammar errors, and meaning is sometimes unclear." },
    ],
  },
];

export const SPEAKING_CRITERIA: CriterionGuide[] = [
  {
    name: "Fluency and Coherence",
    whatItMeans:
      "Can you keep talking at length without long pauses, and do your ideas connect logically? Hesitation about what to say is normal; hesitation because you cannot find the words is not.",
    levels: [
      { band: 9, summary: "Speaks fluently with only natural pauses. Ideas develop fully and link smoothly." },
      { band: 8, summary: "Speaks fluently with only occasional repetition or self-correction. Ideas develop well." },
      { band: 7, summary: "Speaks at length without much effort. Some hesitation, usually about ideas rather than language. Ideas link clearly." },
      { band: 6, summary: "Speaks at length but with noticeable pauses and repetition. Ideas link, but not always smoothly." },
      { band: 5, summary: "Often pauses and repeats. Needs effort to keep going, and ideas are hard to follow at times." },
    ],
  },
  {
    name: "Lexical Resource",
    whatItMeans:
      "The range and accuracy of your spoken vocabulary: enough different words for the topic, the right words in the right place, idioms used naturally.",
    levels: [
      { band: 9, summary: "A full, natural range. Idioms are used precisely." },
      { band: 8, summary: "A wide range used flexibly. Idioms are used well, with rare slips." },
      { band: 7, summary: "Enough range to discuss the topic. Some idioms and less common words, with occasional errors." },
      { band: 6, summary: "Enough range for familiar topics. Errors in word choice happen and there is little idiom." },
      { band: 5, summary: "Limited range. Frequent word-choice errors and often cannot find the right word." },
    ],
  },
  {
    name: "Grammatical Range and Accuracy",
    whatItMeans:
      "The range and accuracy of your spoken grammar: a mix of simple and complex sentences, used correctly.",
    levels: [
      { band: 9, summary: "A full range, used naturally. Almost no errors." },
      { band: 8, summary: "A wide range with mostly accurate use." },
      { band: 7, summary: "A mix of simple and complex sentences. Frequent error-free sentences." },
      { band: 6, summary: "A mix of simple and complex sentences. Errors happen but meaning is usually clear." },
      { band: 5, summary: "Mostly simple sentences. Frequent errors, and meaning is sometimes lost." },
    ],
  },
  {
    name: "Pronunciation",
    whatItMeans:
      "How easy you are to understand: clear sounds, natural stress and rhythm. A foreign accent is fine — what matters is whether the listener can follow you.",
    levels: [
      { band: 9, summary: "Easy to understand throughout. Natural rhythm and stress." },
      { band: 8, summary: "Easy to understand. Rhythm and stress are mostly natural." },
      { band: 7, summary: "Easy to understand most of the time, though some features of pronunciation are not perfect." },
      { band: 6, summary: "Understandable, but the listener must concentrate. Some sounds or stress cause problems." },
      { band: 5, summary: "Often hard to understand. Pronunciation causes real problems for the listener." },
    ],
  },
];

/** Original practice essay written for this site (NOT an official IELTS
 *  answer). Topic: "Some people believe that children should begin formal
 *  education at a much younger age, while others think they should start
 *  later. Discuss both views and give your own opinion." */
export const SAMPLE_ESSAY = {
  topic:
    "Some people believe that children should begin formal education at a much younger age, while others think they should start later. Discuss both views and give your own opinion.",
  wordCount: 320,
  overallBand: 7,
  paragraphs: [
    "Starting school is one of the first big decisions parents make for their children, and people disagree about the right age. Some argue that children should start formal lessons as early as possible, while others believe a later start is better for a child's development. This essay will discuss both views and argue that a later start, at around the age of six, is the better choice for most children.",
    "Those who support an early start say that young children learn languages and basic skills very quickly. In the first years of life, the brain is very open to new information, so children who start reading, writing and simple maths early may build a strong base for later study. Supporters also point out that school gives children a daily routine and a chance to play and learn with other children, which can help shy children become more confident.",
    "On the other hand, many experts argue that starting too early can put pressure on children before they are ready. Very young children learn best through play, not through sitting at a desk and following formal lessons. If they are pushed too hard, they may begin to dislike school. There is also evidence from several countries that children who start school at six or seven catch up quickly and often do as well as, or better than, children who started earlier.",
    "In my opinion, children should start formal education at around six years old. Before that age, kindergartens and playgroups can teach them social skills and a love of learning without the pressure of tests and homework. A later start protects children's natural interest in learning, and the evidence shows they lose nothing in the long run.",
    "In conclusion, although an early start can help some children, the risks of pressure and loss of interest are greater. Starting formal school at about six gives children the best balance between learning and childhood.",
  ],
  comments: [
    {
      name: "Task Response",
      band: 7,
      comment:
        "Both views are discussed and the writer's opinion is clear from the introduction to the conclusion. The main ideas are extended — for example, the early-start paragraph explains why young children learn fast and adds the social benefit of school. It stays at Band 7, not 8, because the 'evidence from several countries' is vague: no country or study is named, so the idea is supported, but thinly.",
    },
    {
      name: "Coherence and Cohesion",
      band: 7,
      comment:
        "The essay has a clear shape: introduction, one paragraph per view, opinion, conclusion. Ideas move in a logical order and the linking words ('on the other hand', 'in my opinion', 'in conclusion') are used correctly. It is not Band 8 because the linking is a little mechanical — the standard phrases do the job, but the connections between ideas are not yet smooth.",
    },
    {
      name: "Lexical Resource",
      band: 7,
      comment:
        "There is a good range for this topic — 'formal education', 'natural interest', 'catch up quickly', 'daily routine' — and the words fit the topic well. The same word 'start' is repeated many times ('start school', 'early start', 'later start'), which keeps this at Band 7: a wider range of synonyms would push it higher.",
    },
    {
      name: "Grammatical Range and Accuracy",
      band: 7,
      comment:
        "The essay mixes simple and complex sentences well ('If they are pushed too hard, they may begin to dislike school') and most sentences are error-free. There are no serious grammar mistakes, but the range is safe rather than ambitious — few advanced structures such as conditionals beyond the basic 'if' or passive forms.",
    },
  ],
};
