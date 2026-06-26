import ArticleLayout, { ArticleSections } from '../components/ArticleLayout.jsx';

const SECTIONS = [
  {
    h: 'Acceptance',
    p: `By accessing or using AI WAR ROOM ("the site"), you agree to the terms set out on this page. If you do not agree, please do not use the site. We may update these terms from time to time; the current version is always the one shown here, with the last-updated date at the bottom.`
  },
  {
    h: 'What the site is',
    p: `AI WAR ROOM is an independent, free-to-use information resource that aggregates and analyzes public data about large language model performance. The site is not a commercial product, does not require sign-up, does not host user-generated content, and does not provide model inference or any other paid service.

The site is provided "as-is" and "as available". We do our best to keep the data accurate, but we make no guarantees about uptime, completeness, or freshness of any specific number on any specific page.`
  },
  {
    h: 'Use of content',
    p: `All editorial text on the site — model descriptions, lab profiles, blog posts, analysis — is original work and is protected by copyright. You may quote short excerpts (a few sentences) for review or commentary purposes with attribution. You may not reproduce substantial portions of the site's editorial content without prior written permission.

The leaderboard rankings, ELO ratings, and pricing data displayed on the site are aggregated from public sources (arena.ai, OpenRouter, official model documentation). The underlying data is owned by those sources and is subject to their terms. Our presentation and curation of the data is our own work.

Screenshots of the site (for example, in articles or social posts that link back to us) are welcome with attribution. We appreciate but do not require notification.`
  },
  {
    h: 'No warranty',
    p: `The information on the site is for general information purposes only. We do not warrant the accuracy, completeness, or reliability of any content. Model performance evolves rapidly and the data on the site may not reflect the current state of any particular model at any particular moment.

You should not rely solely on AI WAR ROOM for decisions with material consequences. We recommend cross-referencing with the original sources (arena.ai, OpenRouter, model documentation) and running your own evaluation against your specific workload before committing to any model in production.`
  },
  {
    h: 'No affiliation',
    p: `AI WAR ROOM is not affiliated with any AI lab whose models we cover. We are not affiliated with arena.ai, LMArena, OpenRouter, or any other data source we use. Model names, logos, and trademarks remain the property of their respective owners. Use of those names on the site is for identification purposes only.`
  },
  {
    h: 'External links',
    p: `The site may link to external resources — model documentation, lab websites, news articles, source data. We do not control these external sites and are not responsible for their content, accuracy, or availability. Following an external link is at your own discretion.`
  },
  {
    h: 'Limitation of liability',
    p: `To the maximum extent permitted by applicable law, AI WAR ROOM and its operators will not be liable for any indirect, incidental, consequential, or special damages arising out of your use of the site, including but not limited to lost profits, lost data, or business interruption, even if we have been advised of the possibility of such damages.`
  },
  {
    h: 'Governing law',
    p: `These terms are governed by the laws of the European Union and, where applicable, of Croatia, without regard to conflict-of-laws principles. Any disputes arising from these terms or from use of the site shall be resolved in the courts of competent jurisdiction in Croatia.`
  },
  {
    h: 'Contact',
    p: `Questions about these terms can be sent through the contact page on this site.`
  },
];

export default function TermsPage() {
  return (
    <ArticleLayout
      eyebrow="Legal"
      title="Terms of Use"
      subtitle="The terms that apply when you use AI WAR ROOM."
      meta={<span>Last updated: May 2026</span>}
    >
      <ArticleSections sections={SECTIONS} />
    </ArticleLayout>
  );
}
