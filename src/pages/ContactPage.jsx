import ArticleLayout from '../components/ArticleLayout.jsx';

export default function ContactPage() {
  return (
    <ArticleLayout
      eyebrow="Contact"
      title="Get in touch"
      subtitle="Corrections, suggestions, questions, partnerships — we read everything."
    >
      <p>
        AI WAR ROOM is a small independent project. The fastest way to reach us is by email at:
      </p>

      <p style={{
        fontSize: 19, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em',
        background: 'var(--card)', borderRadius: 12, padding: '14px 18px', margin: '20px 0',
        border: '0.5px solid var(--sep)',
      }}>
        contact@aiwarroom.app
      </p>

      <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text)', margin: '32px 0 12px' }}>
        What to write about
      </h2>

      <p>
        <strong style={{ fontWeight: 600 }}>Corrections.</strong> If you spot an error in any of our model profiles, lab profiles, or blog posts — a wrong number, a misattributed quote, a model description that does not match reality — please tell us. Include the URL of the page and the specific claim you think is wrong, with a source if possible. We treat correction requests as the highest priority.
      </p>

      <p>
        <strong style={{ fontWeight: 600 }}>Coverage requests.</strong> If there is a model, lab, or trend you wish we covered, drop us a note. We cannot promise to write about everything, but reader suggestions guide a meaningful fraction of what ends up on the blog.
      </p>

      <p>
        <strong style={{ fontWeight: 600 }}>Press and interviews.</strong> If you are working on a story about the LLM landscape and want background or quotes, we are happy to help where we have something useful to say. Please specify your publication, deadline, and the angle you are working on.
      </p>

      <p>
        <strong style={{ fontWeight: 600 }}>Partnerships.</strong> We do not accept paid placements, sponsored content, or undisclosed promotion. We are open to non-commercial partnerships with research labs, academic groups, or other independent trackers where the work aligns with our editorial principles.
      </p>

      <p>
        <strong style={{ fontWeight: 600 }}>Bug reports.</strong> If something on the site is broken — a chart that does not render, a link that goes nowhere, a model that has gone missing from the rankings — please report it. Include your browser and a screenshot if you can.
      </p>

      <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text)', margin: '32px 0 12px' }}>
        Response times
      </h2>

      <p>
        We read every message. We aim to reply within 3-5 working days for substantive correspondence. Routine questions where the answer is already on the site may get a shorter reply or a link to the relevant page. We do not always have the bandwidth to respond to every message, but corrections always get a response.
      </p>

      <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text)', margin: '32px 0 12px' }}>
        What not to write about
      </h2>

      <p>
        Please do not send: cold sales pitches, SEO link-exchange offers, content marketing solicitations, or AI-generated outreach. These get auto-archived. If you are not sure whether your message qualifies, send it anyway — we will tell you if it does not fit.
      </p>
    </ArticleLayout>
  );
}
