import type { Metadata } from "next";
import "./plans.css";

export const metadata: Metadata = { title: "Plans" };

/* eslint-disable @next/next/no-img-element */
export default function PlansPage() {
  return (
    <>
      <div className="pricing">
        <header>
          <a className="wordmark" href="/dashboard"><picture className="mark"><source srcSet="/studio/logo-dark.png" media="(prefers-color-scheme: dark)" /><img src="/studio/logo.png" alt="IELTS Studio logo" width="256" height="256" /></picture><b>IELTS Studio</b><span>by Smart Labs</span></a>
          <span className="head-actions"><a className="btn secondary small" href="/login">Sign in</a><a className="btn accent small signup-btn" href="/signup"><span className="signup-ic"><img src="/studio/signup.png" alt="" width="256" height="256" /></span>Sign up free</a></span>
        </header>
      
        <section className="intro" aria-labelledby="plans-h">
          <p className="label">Plans</p>
          <h1 id="plans-h">Start free. Upgrade when you want feedback.</h1>
          <p>Listening and Reading practice for books 15–21 are free for everyone, with instant results. Paid plans add AI feedback, Speaking and more Writing.</p>
        </section>
      
        <section className="plans" aria-label="Plans">
          <article className="plan">
            <div className="plan-head"><picture><source srcSet="/studio/badge-free-dark.png" media="(prefers-color-scheme: dark)" /><img src="/studio/badge-free.png" alt="" width="256" height="256" /></picture><h2>Free</h2></div>
            <div className="price"><b>$0</b><span>forever</span></div>
            <p className="plan-note">Everything you need to start practising today.</p>
            <a className="btn secondary" href="/signup">Create free account</a>
            <ul className="feats">
              <li><span className="tick">✓</span><span>Listening practice<small>All tests in books 15–21</small></span></li>
              <li><span className="tick">✓</span><span>Reading practice<small>All tests in books 15–21</small></span></li>
              <li><span className="tick">✓</span><span>Instant results<small>Score and correct answers after every test</small></span></li>
              <li><span className="tick">✓</span><span>1 Writing essay<small>Task 2, with AI feedback</small></span></li>
              <li className="no"><span className="cross">–</span><span>AI feedback on each part</span></li>
              <li className="no"><span className="cross">–</span><span>Speaking practice</span></li>
            </ul>
          </article>
      
          <article className="plan featured">
            <span className="ribbon">Most popular</span>
            <div className="plan-head"><picture><source srcSet="/studio/badge-paid-dark.png" media="(prefers-color-scheme: dark)" /><img src="/studio/badge-paid.png" alt="" width="256" height="256" /></picture><h2>Plus</h2></div>
            <div className="price"><b>$15</b><span>/ month</span></div>
            <p className="renew">Monthly package · pay each month to keep it</p>
            <p className="plan-note">Find out exactly where you lose marks, part by part.</p>
            <a className="btn accent" href="/signup">Get Plus</a>
            <ul className="feats">
              <li><span className="tick">✓</span><span>Everything in Free</span></li>
              <li><span className="tick">✓</span><span>AI focused feedback on every part<small>What went wrong and what to practise next</small></span></li>
              <li><span className="tick">✓</span><span>Speaking practice<small>Parts 1, 2 and 3, with AI feedback</small></span></li>
              <li><span className="tick">✓</span><span>Writing Task 1 and Task 2<small>Up to 5 a day for each task, with AI feedback</small></span></li>
            </ul>
          </article>
      
          <article className="plan dark">
            <div className="plan-head"><picture><img src="/studio/badge-paid-dark.png" alt="" width="256" height="256" /></picture><h2>Unlimited</h2></div>
            <div className="price"><b>$35</b><span>/ month</span></div>
            <p className="renew">Monthly package · pay each month to keep it</p>
            <p className="plan-note">Everything in Plus, with no daily Writing limit.</p>
            <a className="btn" href="/signup">Get Unlimited</a>
            <ul className="feats">
              <li><span className="tick">✓</span><span>Everything in Plus</span></li>
              <li><span className="tick">✓</span><span>No daily Writing limit<small>Task 1 and Task 2, as often as you like</small></span></li>
            </ul>
          </article>
        </section>
      
        <section className="mock-offer" aria-labelledby="mock-h">
          <picture className="mock-ic"><source srcSet="/studio/mocks-dark.png" media="(prefers-color-scheme: dark)" /><img src="/studio/mocks.png" alt="" width="256" height="256" /></picture>
          <div className="mock-copy">
            <p className="label" style={{margin: "0"}}>Pay per test · works with any plan</p>
            <h2 id="mock-h">Full mock tests</h2>
            <p>Sit Listening, Reading and Writing in one go, timed like test day. You get a band for each skill, an overall band and a score report you can download.</p>
          </div>
          <div className="mock-buy">
            <div className="price"><b>$5</b><span>/ mock test</span></div>
            <p className="muted" style={{margin: "0 0 12px", fontSize: "13px"}}>1 credit = 1 full mock test. Credits don’t expire while you keep using your account.</p>
            <a className="btn accent" href="/signup">Buy mock credits</a>
          </div>
        </section>
      
        <section className="compare" aria-labelledby="cmp-h">
          <h2 id="cmp-h">Compare plans</h2>
          <div className="compare-wrap">
            <table className="cmp">
              <thead><tr><th scope="col">Feature</th><th scope="col">Free<small>$0</small></th><th scope="col" className="hl">Plus<small>$15 / month</small></th><th scope="col">Unlimited<small>$35 / month</small></th></tr></thead>
              <tbody>
                <tr className="group"><td colSpan={4}>Listening and Reading</td></tr>
                <tr><td>Practice tests, books 15–21</td><td className="y">All</td><td className="y hl">All</td><td className="y">All</td></tr>
                <tr><td>Instant results</td><td className="y">✓</td><td className="y hl">✓</td><td className="y">✓</td></tr>
                <tr><td>AI focused feedback on every part</td><td className="n">–</td><td className="y hl">✓</td><td className="y">✓</td></tr>
                <tr className="group"><td colSpan={4}>Writing</td></tr>
                <tr><td>Task 2 essays with AI feedback</td><td>1 essay</td><td className="hl">5 a day</td><td className="y">No limit</td></tr>
                <tr><td>Task 1 reports with AI feedback</td><td className="n">–</td><td className="hl">5 a day</td><td className="y">No limit</td></tr>
                <tr className="group"><td colSpan={4}>Speaking</td></tr>
                <tr><td>Speaking practice with AI feedback</td><td className="n">–</td><td className="y hl">✓</td><td className="y">✓</td></tr>
                <tr className="group"><td colSpan={4}>Full mock tests</td></tr>
                <tr><td>Listening + Reading + Writing, timed</td><td>$5 each</td><td className="hl">$5 each</td><td>$5 each</td></tr>
              </tbody>
            </table>
          </div>
        </section>
      
        <section className="faq" aria-labelledby="faq-h">
          <h2 id="faq-h">Questions</h2>
          <details><summary>Do I need a card for the Free plan?</summary><p>No. Create an account and every Listening and Reading test in books 15–21 is open straight away.</p></details>
          <details><summary>What does “5 a day” mean on Plus?</summary><p>Each day you can submit up to 5 Writing Task 1 reports and up to 5 Task 2 essays for AI feedback. The count starts again the next day. Unlimited removes the daily limit.</p></details>
          <details><summary>Are full mock tests included in a plan?</summary><p>No. Mock tests are bought separately as credits on any plan, including Free. One credit costs $5 and gives you one full mock: Listening, Reading and Writing, with a band for each and an overall band.</p></details>
          <details><summary>Do mock credits expire?</summary><p>No, not while you keep using your account. Unused mock credits only expire if you don’t sign in to IELTS Studio for more than 12 months in a row.</p></details>
          <details><summary>How do the monthly packages work?</summary><p>Plus and Unlimited are monthly packages. Each payment gives you one month of access. There are no automatic charges: to keep your package, pay again for the next month. If you don’t, your account returns to Free when the month ends, and your results and history stay saved.</p></details>
          <details><summary>Is my Smart Labs account the same?</summary><p>Yes. Sign in with the same email or Google account you use on Smart Labs.</p></details>
        </section>
      
        <p className="fine">Prices in US dollars. Plus and Unlimited are monthly packages: pay each month to keep access. Mock tests are paid per test. </p>
      </div>
    </>
  );
}
