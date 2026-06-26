import ArticleLayout, { ArticleSections } from '../components/ArticleLayout.jsx';

const SECTIONS = [
  {
    h: 'Overview',
    p: `AI WAR ROOM ("the site", "we") is committed to respecting your privacy. This page explains what data the site collects, what we do with it, and the rights you have over it. We have tried to keep this document plain-language and short; if anything is unclear, please reach out via the contact page.`
  },
  {
    h: 'Data we collect ourselves',
    p: `The site collects only the data necessary to operate and improve it:

**Anonymous usage analytics.** We use Google Analytics 4 to record aggregate, anonymized data about how the site is used — which pages are visited, approximate geographic region, device type, referring source. IP addresses are anonymized before processing. We use this data to understand which content is useful and how to improve the site. We do not use this data to identify individual visitors.

**Server logs.** Like any website, the servers hosting AI WAR ROOM produce standard access logs containing requested URLs, response codes, user-agent strings, and IP addresses. These logs are retained for a maximum of 30 days and are used only for security, abuse prevention, and operational diagnostics.

We do **not** collect names, email addresses, payment information, or any other personally identifying information unless you voluntarily provide it (for example, by emailing us). We do not maintain user accounts. We do not require sign-up to view any content on the site.`
  },
  {
    h: 'Data collected by third parties',
    p: `Several third-party services are embedded in the site, and each operates under its own privacy policy:

**Google Analytics (G-K00V59DWYF).** Google processes anonymized analytics data on our behalf. Google's privacy practices are documented at policies.google.com/privacy. You can opt out of Google Analytics across all sites by installing the official opt-out browser add-on.

**Google AdSense.** We display advertising delivered by Google AdSense. AdSense and its partners may use cookies and similar technologies to deliver ads based on your browsing patterns. You can manage your ad personalization settings at adssettings.google.com. EU/UK visitors are presented with a consent dialog before personalized ads are shown.

**Arena.ai and OpenRouter.** The leaderboard and pricing data on the site is fetched from these public sources. These services may log requests made by your browser when our site loads their data, subject to their own privacy practices.

We do not share, sell, or otherwise transfer any data we collect directly to any third party for marketing or any other purpose.`
  },
  {
    h: 'Cookies',
    p: `The site uses a small number of cookies:

A theme preference cookie (or localStorage entry) that remembers whether you prefer light or dark mode. This is stored only in your browser and is never sent to our servers.

Cookies set by Google Analytics and Google AdSense, as described above. These are subject to Google's cookie policies.

The site does not use cookies for any other purpose. You can disable cookies entirely in your browser settings; the site will continue to work, though theme preference will reset on each visit.`
  },
  {
    h: 'Your rights',
    p: `Depending on your jurisdiction, you may have specific rights over the data we hold about you. These typically include the right to access, correct, or delete data, and the right to object to certain processing. Because we do not maintain personally identifying records, most of these rights are satisfied automatically — there is no account to delete and no personal data to access.

If you have specific concerns about data we might hold about you (for example, in our server logs), you can contact us via the contact page and we will respond within 30 days.`
  },
  {
    h: 'Children',
    p: `The site is not directed at children under 13 and we do not knowingly collect data from children. If you believe a child has provided information to us, please contact us and we will delete it promptly.`
  },
  {
    h: 'Changes',
    p: `If we change how we handle data, we will update this page and note the date of the most recent change at the bottom. Material changes will be flagged on the home page for at least 14 days.`
  },
  {
    h: 'Contact',
    p: `Questions about this policy or about any data the site holds can be sent through the contact page on this site.`
  },
];

export default function PrivacyPage() {
  return (
    <ArticleLayout
      eyebrow="Legal"
      title="Privacy Policy"
      subtitle="How AI WAR ROOM handles data — written in plain language."
      meta={<span>Last updated: May 2026</span>}
    >
      <ArticleSections sections={SECTIONS} />
    </ArticleLayout>
  );
}
