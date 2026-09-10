"use client";

import { ScrambleText } from "../_components/scramble-text";
import { Header, Footer } from "../_components/site-chrome";
import RecruitmentTerminal from "./recruitment-terminal";
import RecruitmentForm from "./recruitment-form";

export default function RecruitmentsClient() {
  const formId = process.env.NEXT_PUBLIC_RECRUITMENT_FORM_ID;

  const scrollToForm = () => {
    document.getElementById("apply")?.scrollIntoView({ behavior: "smooth" });
  };

  if (!formId) {
    return (
      <>
        <Header current="Recruitments" />
        <main className="flex-1 grid place-items-center">
          <section className="wrap py-20 md:py-28 text-center">
            <p className="kicker mb-6">{"// ~/recruitments"}</p>
            <h1 className="font-mono font-bold uppercase tracking-[0.18em] text-accent glow leading-none break-words text-[clamp(2rem,9vw,5rem)]">
              <ScrambleText text="RECRUITING SOON" decryptStepMs={85} />
            </h1>
            <p className="mt-8 text-sm md:text-base text-fg-dim max-w-md mx-auto">
              Applications aren&apos;t open yet. When they are, the form and the
              timeline land right here — until then, turn up to a weekly session.
            </p>
          </section>
        </main>
        <Footer current="Recruitments" />
      </>
    );
  }

  return (
    <>
      <Header current="Recruitments" />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="wrap py-12 md:py-20">
          <div className="grid md:grid-cols-[1fr_1.1fr] gap-12 items-center">
            <div>
              <p className="kicker mb-4">{"// ~/join"}</p>
              <h1 className="font-display font-bold text-4xl md:text-5xl lg:text-6xl mb-6 tracking-tight glow">
                join layer8
              </h1>
              <p className="text-fg-dim mb-8 max-w-md leading-relaxed">
                We&apos;re looking for curious people to break things, build tools,
                and host the best events on campus. No prior experience required
                — just a willingness to get stuck.
              </p>

              <div className="card mb-8">
                <p className="tag mb-3">why join?</p>
                <ul className="list-disc pl-4 space-y-2 text-sm text-fg-dim">
                  <li>Weekly hands-on sessions and CTFs</li>
                  <li>Build cool things and put them on your resume</li>
                  <li>Hang out with the best people on campus</li>
                </ul>
              </div>

              <button onClick={scrollToForm} className="btn btn-solid">
                &gt; apply_now
              </button>
            </div>

            <div className="relative z-10 w-full max-w-[550px] justify-self-center md:justify-self-end">
              {/* decorative blur behind terminal */}
              <div className="absolute inset-0 -z-10 bg-[var(--accent)]/10 blur-3xl rounded-full" />
              <RecruitmentTerminal onScrollToForm={scrollToForm} />
            </div>
          </div>
        </section>

        <div className="wrap">
          <div className="rule mb-12" />
        </div>

        {/* Application Form Section */}
        <section id="apply" className="wrap pb-20 scroll-mt-24">
          <div className="max-w-2xl mx-auto">
            <RecruitmentForm formId={formId} />
          </div>
        </section>
      </main>

      <Footer current="Recruitments" />
    </>
  );
}
