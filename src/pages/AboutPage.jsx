import ArticleLayout, { ArticleSections } from '../components/ArticleLayout.jsx';

const SECTIONS = [
  {
    h: null,
    p: `AI WAR ROOM is an independent tracker of large language model performance. We exist to answer one simple question with as much clarity as possible: which AI model is actually winning right now, and by how much.

The AI field generates an enormous amount of marketing material, benchmark leaderboards, and partial information. Every new release comes with carefully selected charts. Every lab has reasons to emphasize the metrics where they win. The signal is real but it is buried in noise. This site is our attempt to surface the signal.`
  },
  {
    h: 'What we do',
    p: `We aggregate data from the LMArena (formerly Chatbot Arena) ELO leaderboard — the largest public source of human-judged head-to-head model comparisons — and present it in a format designed for fast comprehension. We pull live pricing from OpenRouter, we cross-reference license information, and we write editorial analysis of how the numbers should actually be read.

We do not run our own evals. We are not affiliated with any of the labs whose models we track. We do not receive payment from any model provider. The data is public; our value-add is curation, presentation, and analysis.`
  },
  {
    h: 'How we are funded',
    p: `AI WAR ROOM is funded by display advertising and direct reader contributions. We do not take sponsorships from AI labs and we do not accept payment for favorable coverage of any model. If we ever change this, we will say so on this page first.

Our advertising is delivered through Google AdSense. We do not sell user data to third parties; ad targeting is handled by Google's standard ad-serving infrastructure with the same privacy controls available to any user of Google's services.`
  },
  {
    h: 'Who runs the site',
    p: `AI WAR ROOM is a small independent project — not a venture-backed company, not a media organization. We are a handful of people who care about the AI field and wanted a tracker that did not exist. The site is built and maintained on weekends and evenings. If we ever grow beyond that, we will say so.`
  },
  {
    h: 'Editorial principles',
    p: `Three principles guide how we write about models:

We try to be specific. "GPT-5.4 is better at math" is useless without saying how much better, on what kinds of math, and against what alternatives. We try to make every claim concrete enough that you can act on it.

We try to be honest about uncertainty. The AI field changes weekly. Some of what we write will be wrong in six months. When we are confident, we say so plainly; when we are not, we flag the uncertainty.

We try to be useful, not viral. Our goal is that someone trying to pick a model for a real workload comes away with a better decision. That is the only metric we optimize for. The site is not a content farm and never will be.`
  },
  {
    h: 'Get in touch',
    p: `Corrections, questions, or feedback — see the contact page. We read everything, even when we do not always reply.`
  },
];

export default function AboutPage({ onNavigate }) {
  return (
    <ArticleLayout
      eyebrow="About"
      title="About AI WAR ROOM"
      subtitle="An independent tracker of large language model performance — built for clarity, not hype."
    >
      <ArticleSections sections={SECTIONS} />
    </ArticleLayout>
  );
}
