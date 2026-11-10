# Research basis for *Breeze* — a breathing-controlled distraction game for needle procedures

This document collects the evidence the game is built on, and states exactly how each finding was turned into a design or tuning decision. Citations were checked against PubMed / Crossref / publisher pages in September 2026; the few numbers that could not be re-verified from the primary source are marked **[unverified]**.

Context from the client (hospital nurse): roughly one third of paediatric patients are extremely afraid of needles. The product is a browser game for a tablet, played immediately before and during the injection or blood draw, controlled only by breathing out, for three age bands (toddlers/very young, children, teenagers up to 18).

---

## 1. The problem: needle fear is common, starts early, and has real consequences

- A systematic review of 119 studies found that **the majority of children** show needle fear, falling to **20–50 % of adolescents** and **20–30 % of young adults**; fear is higher in females and decreases with age. Needle fear leads to vaccine avoidance in 8–27 % of the adult groups studied [1]. The client's "one third" estimate sits inside this range.
- **90 % of 14–18-month-olds and 45 % of 4–6-year-olds** show severe distress during vaccination; 63 % of children endorse fear of needles, and the fear typically becomes established at **5–10 years of age**, by which time a child has usually had well over a dozen needles [2, 3]. Needle fear is a learned response to repeated painful procedures, so every calmer procedure is also prevention.
- Practical consequence for the design: the toddler band (2–5) is the highest-distress group and the one that can least follow instructions; the child band (6–12) is where fear crystallises and where a coping skill can be learned; teenagers are already fearful and mostly need dignity, control and a credible technique rather than a "kids' game".

## 2. What is known to help during the needle itself

### 2.1 Guideline and meta-analytic evidence

- The Cochrane review of psychological interventions for needle procedures in children and adolescents (59 trials, 5 550 participants) reports that **distraction reduces self-reported pain (SMD −0.56) and distress (SMD −0.82)**; **breathing interventions reduce self-reported pain (SMD −1.04, few trials, wide CI)**; hypnosis has the largest effects [4].
- The Canadian clinical practice guideline for vaccination pain (HELPinKids&Adults) recommends, for children 3–12 years, **"breathing with a toy" (bubbles, pinwheel) — and recommends *against* plain deep breathing without a toy** in that age group; it also recommends video and verbal distraction for 3–12 and adolescents, and directed toys for infants and young children [5]. A breathing-controlled game is exactly a "toy that makes you breathe out": it satisfies the one breathing recommendation the guideline endorses for children.
- Active distraction is on balance better than passive: a 2023 meta-analysis of 13 RCTs (553 vs 551 children) found active distraction superior on parent/staff-rated pain and on all anxiety measures [6]; a 2025 RCT in 105 children aged 3–7 found pain scores of **1.9 (video game) vs 4.3 (cartoon) vs 7.0 (control)** during venipuncture [7].
- Caveats that shaped the design:
  - In 1–7-year-olds a **passive movie beat an interactive toy**: young, distressed children could not engage with a demanding toy [8]. In 3–6-year-olds an interactive video game beat watching it, *provided the game was developmentally easy* [9]. → The toddler mode must be movie-like and reward *anything* the child does; it must never wait for correct input.
  - In 6–8-year-olds **cartoon watching beat unguided bubble blowing** [10]. → Blowing must be wrapped in rich, continuously moving visuals; a bare "blow the bubble" mechanic is not enough.
  - The benefit of VR/game distraction **shrinks with age** (≈ +0.1 SMD per year in a 2026 Bayesian re-analysis) [11]; teenagers therefore get a calmer, more explicit, skill-framed experience rather than more cartoon stimulation.
  - The same game on a **tablet and in a VR headset performed equally** in 5–12-year-olds (n = 50) [12]: the game, not the headset, carries the effect. A tablet in the browser is an appropriate platform.

### 2.2 Blowing out during the needle

- **"Blowing away shot pain"** (n = 149, 4–7 years, DTP injection): children taught to blow out repeatedly during the injection "as if blowing bubbles" showed **significantly fewer pain behaviours (p < .04)** and a trend to lower self-reported pain [13]. This is the direct ancestor of the product: the needle should ideally go in *while the child is breathing out*.
- Bubble blowing (n = 105, 4–6 years) reduced pain perception during DTP injections in a quasi-experiment [14].
- Recent RCTs in 5–12-year-olds during venipuncture / IV cannulation consistently show that an exhalation "toy" lowers pain, fear and anxiety: soap bubbles, balloon inflation, pinwheels and cough tricks all beat standard care, with no consistent winner among them [15–19]; the largest 2025 trial (n = 90) reported pain 8/100 with a pinwheel vs 50/100 in controls [19]. A 2026 RCT (n = 207) found bubble blowing more effective than positive reinforcement [20].
- Design consequences: (a) the game rewards a **long, gentle exhale**, not a hard puff; (b) the nurse panel shows an **"exhaling now" light** so the clinician can time the needle to an exhalation, exactly as in [13]; (c) no mouthpiece or shared object is needed — the child blows toward the tablet microphone from a hand's width away, which avoids the hygiene and training problems of straws and party blowers noted in the ChillFish hospital study [24].

### 2.3 Breath-controlled and biofeedback games

- **ChillFish** (a puffer fish that rises and sinks with breathing, collecting starfish placed along a sine wave so that scoring forces slow breathing) reached relaxation comparable to a conventional breathing exercise in adults [21], and in a hospital phlebotomy study with 20 children (6–11 y) was rated more useful than an aquarium video by laboratory staff, with parents reporting less pain than expected [24]. The study also notes that a party-blower sensor needed 10–12 minutes of training — too long for a busy clinic.
- **DEEP** (a VR game where a breathing belt lifts and boosts the avatar, with a breathing circle and growing plants mirroring the breath) reduced anxiety in special-education adolescents (d = −0.29 over six sessions) [22]; in an RCT with 112 anxious young adults it was as effective as a guided-breathing phone app, not better, but produced higher self-efficacy and engagement [23].
- **BioVirtualPed**, a respiratory-biofeedback VR game used during port-needle insertion in 62 children with cancer (6–12 y), lowered post-procedure pain, fear, anxiety and respiratory rate (all p < .001) [25]. **VR-guided deep breathing** during needle procedures (n = 45) brought respiratory rate to a median of 14 vs 20 breaths/min and raised high-frequency HRV [26]. A Turkish trial of expiratory-mouthpiece games (balloon inflation / candle blowing) during venipuncture is registered for 2026 [27].
- On visualisation: a comparison of mobile breathing trainers found that a **wave-shaped visualisation** of the breath out-performed a growing/shrinking sphere and audio counting on measured breath depth and on user preference, without being perceived as distracting [28]. → The child's breath moves the hero along a visible wave of collectibles, and the pacer is a ring that grows on the inhale and shrinks on the exhale around the hero.

## 3. Why the slow, extended exhale is the therapeutic ingredient

- Slow breathing (< 10 breaths/min) increases heart-rate variability and respiratory sinus arrhythmia, shifts EEG toward alpha, and lowers anxiety and anger across 15 studies [29]. The **respiratory vagal stimulation model** explains this as vagal (parasympathetic) activation, and notes that *emphasis on a long exhalation is the dominant instruction across contemplative traditions* [30].
- In a randomised 28-day trial (n = 108 adults, 5 min/day), **cyclic sighing — a double inhale and a long, slow exhale — produced the largest improvement in positive affect and the largest drop in respiratory rate**, beating mindfulness meditation and box breathing [31]. The exhale is the lever; the game therefore only *needs* the exhale as input.
- **Resonance-frequency breathing** is ~5.5–6 breaths/min (10–11 s per breath) in adults [32]; in **children the resonance frequency is higher, 6.5–9.5 breaths/min**, and children's protocols succeed with "simplified instructions, providing entertaining displays" [33]. → Teen pacing targets ≈ 5.5–6/min; child pacing ≈ 7–8/min; toddlers are not paced.
- Exhale longer than inhale: at 6 breaths/min a low inhale/exhale ratio (long exhale) increased relaxation, stress reduction and positive energy [34]; a 2024 replication found no *HRV* difference between 1:1 and 1:2 ratios [35]. → The extended exhale reliably improves *subjective* calm, which is what a needle procedure needs; the game uses roughly 1:1.5 (child) and 1:1.5 (teen) inhale:exhale with an adaptive exhale target.
- Implementation guidelines from a systematic review of 58 studies (41 RCTs) [36]: slow paces of 6–10/min and extended-exhale patterns (e.g. 4 s in / 6 s out) work; fast-only pacing and sessions under 5 min are less effective; **guided** instruction (live or recorded) helps; four youth studies (8–15 y) were all effective. → The game guides continuously (visual pacer + short spoken-style prompts), runs 3 min by default, and the nurse can extend to 10 min.
- **Anti-hyperventilation**: at 6 breaths/min, adults who were *not* told to breathe gently dropped end-tidal CO₂ by 5.2 mmHg and reported dizziness/tingling; the instruction "avoid excessively deep breathing, breathe shallowly and naturally" halved the CO₂ drop and abolished symptoms [37]. There are no trials of breathing exercises for hyperventilation in children [38]. → The game never rewards *hard* blowing (see §5), prompts "breathe in gently, not a big breath", inserts a rest pause in every cycle, and caps session length.

## 4. Paediatric physiology used for tuning

| Quantity | Evidence | Values used |
|---|---|---|
| Resting respiratory rate | Systematic review of 69 studies; median falls from 44/min at birth to 26/min at 2 y; 1st–99th centiles 18–38 (2–3 y), 17–33 (3–4 y), 17–29 (4–6 y), 16–27 (6–8 y) [39]. Medians for 8–18 y (≈ 19, 18, 16/min) **[unverified, from the appendix table]**. | Toddler natural cycle ≈ 2–2.5 s; the game does not pace toddlers. Child paced cycle ≈ 7–8 s (7.5–8.5/min). Teen paced cycle ≈ 10–11 s (5.5–6/min). |
| How long a child can comfortably breathe out | Maximum phonation time (sustained /a/, maximal effort): **6.1 s at 4–6 y, 7.9 s at 7–9 y, 9.0 s at 10–12 y** (n = 1 660) [40]; 5.8 s (4 y), 7.2 s (5 y), 10.3 s (6 y) [41]; rises through adolescence to ~15–20 s [42]. | A *comfortable* game exhale must sit well below the maximal value, especially in a frightened child: exhale targets are capped at **3 s (toddlers), 6 s (children), 8 s (teens)**, start lower, and adapt to the child (see §5). |
| Lung volumes | Tidal volume 5–7 mL/kg [43]; forced vital capacity ≈ 1–1.3 L at 5–6 y, ≈ 2 L at 8–14 y (measured 2.0 ± 0.5 L) [44, 45], 3–5 L in adults. | Strength normalisation is *relative to the individual child* (adaptive peak tracking), so a small child with a quarter of a teenager's flow still reaches "full power". |
| Hyperventilation risk | See [37, 38]. | No reward above the gentle "sweet spot"; rest phase each cycle; session cap 10 min; on-screen "gentle" prompts. |

## 5. From evidence to design: the decisions in the game

| Evidence | Design decision | Where in the code |
|---|---|---|
| Blowing out during the needle reduces pain [13–20]; nurses want to time the needle | The only input is the exhale; the nurse panel shows a large green "BREATHING OUT" light and a live microphone meter | `src/core/BreathEngine.ts`, `src/ui/ClinicianPanel.tsx` |
| Long, gentle exhale calms; forced blowing risks hypocapnia [29–31, 37] | Lift reaches its maximum at the *low* end of a strength "sweet spot" and nothing extra happens above it; "calm breaths" are judged on duration and steadiness, not force | `World.liftFor`, `BreathEngine.endExhale` (steadiness), `profiles.sweetSpot` |
| Lung capacity and sustainable exhale grow with age [40–45] | Exhale target = clamp(1.15 × the child's own median exhale, profile min, profile max); caps 3 / 6 / 8 s; the guide follows the child rather than forcing a rhythm | `src/core/Pacer.ts`, `profiles.ts` |
| Children's resonance frequency is higher than adults' [32, 33] | Teen pacing ≈ 4 s in / 5–8 s out (5.5–6/min); child pacing 2.5 s in / 3.5–6 s out (7–8/min) | `profiles.ts` |
| Young children cannot follow pacing; passive-rich content works for them [8, 9] | Toddler world animates itself (friends appear every ~7 s, celebrations every ~22 s regardless of input); any sound or a touch counts as a puff; no text | `profiles.little`, `World.spawnFriend`, `TouchSensor` |
| Unguided blowing loses to good passive content [10]; guided practice works better [36] | Continuous visual pacer around the hero, short prompts, encouragement toasts, world that changes over the session (dawn → night), rewards every few seconds | `WorldRenderer.drawAura`, `HudOverlay`, shaders |
| Wave visualisations of breath work best [28]; ChillFish's sine-wave starfish [21] | Collectibles are laid out in arcs whose length matches the exhale target, so one full gentle exhale sweeps the whole arc | `World.spawnGroup` |
| Music/sound lowers procedural pain and anxiety (SMD ≈ −0.35–0.39) [46]; natural sounds lower heart and respiratory rate [47, 48] | World ambience (underwater pad, birds, soft space pad), a wind sound that follows the breath, pentatonic chimes so any order of collecting sounds musical; all CC0 samples | `src/audio/*`, `CREDITS.md` |
| Teens benefit less from cartoon distraction and more from control and a credible skill [11, 23] | Teen mode: minimal HUD, a "calm" meter driven by exhale length and steadiness, end-of-session statistics (breaths/min, longest exhale, calm score) | `profiles.teen`, `EndScreen` |
| Hygiene, no training time [24] | No mouthpiece; microphone at a hand's width; touch fallback if the microphone is unavailable or the room is noisy; automatic room-noise calibration in 0.8 s | `src/sensors/*` |
| Sessions ≥ 3–5 min are more effective; procedures last 1–5 min [36] | Default 3 min, nurse-adjustable 1–10 min; there is no way to lose and the game can be ended at any time | `ClinicianPanel` |

### Age profile parameters (`breeze/src/core/profiles.ts`)

| Parameter | Little ones (2–5) | Kids (6–12) | Teens (13–18) |
|---|---|---|---|
| World | Bubble Pond (Puff the fish) | Sky Sailor (hot-air balloon) | Nebula Drift (comet) |
| Guided pacing | none (fish visibly breathes) | ring: 2.5 s in / 3.5 s out (adapts 1.5–6 s) / 0.8 s rest | ring: 4 s in / 5 s out (adapts 2.5–8 s) / 0.6 s rest |
| Resulting rate | child's own | ≈ 7–8 breaths/min | ≈ 5.5–6.5 breaths/min |
| Exhale detection | 40 ms onset, any sound incl. voice, ≥ 120 ms counts | 80 ms onset, voices penalised 16 dB, ≥ 300 ms counts | 90 ms onset, voices penalised 20 dB, ≥ 400 ms counts |
| "Calm breath" | ≥ 40 % of target | ≥ 60 % of target | ≥ 60 % of target |
| Strength sweet spot | 5–100 % | 18–75 % | 15–70 % |
| Celebrations | every 22 s regardless | every 4 calm breaths (safety net every 45 s) | every 4 calm breaths (safety net every 50 s) |
| Session | 2.5 min | 3 min | 3 min |
| Touch also counts | always | as backup | as backup |

## 6. Sound

Music reduces pain (SMD −0.39) and anxiety (SMD −0.39) in children undergoing procedures across 19 RCTs [46]; natural soundscapes lower heart rate, blood pressure and respiratory rate in a 2024 meta-analysis [47], and a 2025 RCT in 8–10-year-olds found that natural sounds combined with eye massage reduced injection pain and pulse during dental anaesthesia [48]. Breeze uses gentle nature/ambient beds per world, a breath-following wind bed (immediate auditory feedback that "my breath is the wind"), soft pentatonic chimes, and short jingles for celebrations; sounds are never harsh or startling. All samples are CC0 (see `CREDITS.md`).

## 7. Safety and clinical notes

- **No forced or deep breathing.** The game rewards gentle, steady exhales; strength above the sweet spot gains nothing; a rest pause is built into every cycle; prompts say "gently, not a big breath" [37].
- **Asthma / respiratory illness:** blowing is at conversational effort; if a child is wheezy or breathless, use touch mode (the nurse holds the screen during each exhale) or skip the game.
- **Dizziness:** stop the game if the child reports light-headedness or tingling; shorten the exhale target in the nurse panel (lower sensitivity does not shorten it — the target adapts from the child's own breaths).
- **Infection control:** the child does not touch a mouthpiece; wipe the tablet between patients; a hand's width distance avoids droplets on the screen.
- **Not a substitute** for topical anaesthesia, positioning, or the CARD (Comfort, Ask, Relax, Distract) framework [5]; it is the "Relax" and "Distract" part.

## 8. Limitations and what should be validated

The mechanics are built on trial evidence for bubble/pinwheel blowing, distraction games and paced breathing, but **this game itself has not been trialled**. A pragmatic evaluation could randomise children to Breeze vs standard distraction and measure: Faces Pain Scale–Revised, Children's Fear Scale, observed respiratory rate before/during the needle, procedure duration and number of attempts, and staff usefulness ratings — the outcome set used in [15, 24, 25]. Microphone detection was verified with scripted breathing and room-noise/voice simulations (`npm run simulate`), not yet with real children; the sensitivity control and touch fallback exist for that reason.

---

## References

1. McLenon J, Rogers MAM. The fear of needles: a systematic review and meta-analysis. *J Adv Nurs.* 2019;75(1):30-42. doi:10.1111/jan.13818
2. McMurtry CM, Pillai Riddell R, Taddio A, et al. Far from "just a poke": common painful needle procedures and the development of needle fear. *Clin J Pain.* 2015;31(10 Suppl):S3-S11. doi:10.1097/AJP.0000000000000272
3. Taddio A, Ipp M, Thivakaran S, et al. Survey of the prevalence of immunization non-compliance due to needle fears in children and adults. *Vaccine.* 2012;30(32):4807-4812. doi:10.1016/j.vaccine.2012.05.011
4. Birnie KA, Noel M, Chambers CT, Uman LS, Parker JA. Psychological interventions for needle-related procedural pain and distress in children and adolescents. *Cochrane Database Syst Rev.* 2018;10:CD005179. doi:10.1002/14651858.CD005179.pub4
5. Taddio A, McMurtry CM, Shah V, et al. Reducing pain during vaccine injections: clinical practice guideline. *CMAJ.* 2015;187(13):975-982. doi:10.1503/cmaj.150391
6. Shen T, Wang X, Xue Q, Chen D. Active versus passive distraction for pediatric needle procedures: systematic review and meta-analysis. *Ital J Pediatr.* 2023;49:109. doi:10.1186/s13052-023-01518-4
7. Gökoğlu A, Sukut Ö. Video game versus cartoon distraction during venipuncture in children aged 3–7: randomised controlled trial. *BMC Pediatr.* 2025;25:875. doi:10.1186/s12887-025-06188-1
8. MacLaren JE, Cohen LL. A comparison of distraction strategies for venipuncture distress in children. *J Pediatr Psychol.* 2005;30(5):387-396. doi:10.1093/jpepsy/jsi062
9. Wohlheiter KA, Dahlquist LM. Interactive versus passive distraction for acute pain management in young children: the role of selective attention and development. *J Pediatr Psychol.* 2013;38(2):202-212. doi:10.1093/jpepsy/jss108
10. Ugucu G, et al. Effects of cartoon watching and bubble blowing on pain, anxiety and fear during venipuncture in children aged 6–8. *J Pediatr Nurs.* 2022;65:e107-e114. doi:10.1016/j.pedn.2022.03.016
11. Cocchi E, Bloise S, Marchetti F. Virtual reality for paediatric needle procedures: Bayesian re-analysis — effect declines with age. *Pediatr Res.* 2026. doi:10.1038/s41390-026-05243-6
12. Zavlanou C, et al. Virtual reality versus tablet for the same distraction game during paediatric venipuncture: randomised comparison. *Front Pediatr.* 2024;12:1378459. doi:10.3389/fped.2024.1378459
13. French GM, Painter EC, Coury DL. Blowing away shot pain: a technique for pain management during immunization. *Pediatrics.* 1994;93(3):384-388.
14. Sparks L. Taking the "ouch" out of injections for children: using distraction to decrease pain. *MCN Am J Matern Child Nurs.* 2001;26(2):72-78.
15. Balliel N. Effects of soap bubbles, distraction cards and coughing on pain and fear during phlebotomy in children aged 6–12: randomised controlled trial. *Paediatr Neonatal Pain.* 2023;5(2):31-37. doi:10.1002/pne2.12090
16. Mutlu B, Balcı S. Effects of balloon inflation and cough trick methods on easing pain in children during blood drawing. *J Spec Pediatr Nurs.* 2015;20(3):178-186. doi:10.1111/jspn.12112
17. Canbulat Sahiner N, Demirgoz Bal M. The effects of three different distraction methods on pain and anxiety in children. *J Child Health Care.* 2016;20(3):277-285. doi:10.1177/1367493515587062
18. Sarman A, Tuncay S. Effects of bubble blowing and ball squeezing on anxiety, fear and pain during venipuncture in children. *J Child Adolesc Psychiatr Nurs.* 2024;37(3):e12478. doi:10.1111/jcap.12478
19. Dehnavi RD, et al. Pinwheel and stress-ball distraction during intravenous catheterisation in children aged 6–12: randomised controlled trial. *Sci Rep.* 2025;15:31359. doi:10.1038/s41598-025-17250-4
20. Çaka SY, et al. Bubble blowing and positive reinforcement during paediatric venipuncture: randomised controlled trial. *BMC Pediatr.* 2026. doi:10.1186/s12887-026-07249-9
21. Sonne T, Jensen MM. ChillFish: a respiration game for children with ADHD. In: *Proc TEI '16.* ACM; 2016:271-278. doi:10.1145/2839462.2839480
22. Bossenbroek R, Wols A, Weerdmeester J, Lichtwarck-Aschoff A, Granic I, van Rooij MMJW. Efficacy of a virtual reality biofeedback game (DEEP) to reduce anxiety and disruptive classroom behavior. *JMIR Ment Health.* 2020;7(3):e16066. doi:10.2196/16066
23. Weerdmeester J, van Rooij MMJW, Maciejewski DF, Engels RCME, Granic I. A randomized controlled trial assessing the efficacy of a virtual reality biofeedback video game (DEEP) versus a guided-breathing app for anxiety. *Technol Mind Behav.* 2021;2(2). doi:10.1037/tmb0000028
24. Sonne T, Merritt T, Marshall P, Lomholt JJ, Müller J, Grønbæk K. Calming children when drawing blood using breath-based biofeedback. In: *Proc DIS '17.* ACM; 2017:725-737. doi:10.1145/3064663.3064742
25. Savaş EH, Semerci R, Bayram C. Effect of a biofeedback-based virtual reality game (BioVirtualPed) on pain, fear and anxiety during port needle insertion in children with cancer: randomised controlled trial. *Eur J Oncol Nurs.* 2024;70:102621. doi:10.1016/j.ejon.2024.102621
26. Karppa E, Puura K, Jyskä I, Viik J, Pohjankoski H, Turunen M, Palmu S. Virtual-reality-guided deep breathing during needle procedures in children. *Sci Rep.* 2026;16:14375. doi:10.1038/s41598-026-44390-y
27. ClinicalTrials.gov NCT07550062. Expiratory-mouthpiece games (BREATHING+) during venipuncture in children 7–12 years. Uludağ University; registered 2026.
28. Chittaro L, Sioni R. Evaluating mobile apps for breathing training: the effectiveness of visualization. *Comput Human Behav.* 2014;40:56-63. doi:10.1016/j.chb.2014.07.049
29. Zaccaro A, Piarulli A, Laurino M, et al. How breath-control can change your life: a systematic review on psycho-physiological correlates of slow breathing. *Front Hum Neurosci.* 2018;12:353. doi:10.3389/fnhum.2018.00353
30. Gerritsen RJS, Band GPH. Breath of life: the respiratory vagal stimulation model of contemplative activity. *Front Hum Neurosci.* 2018;12:397. doi:10.3389/fnhum.2018.00397
31. Balban MY, Neri E, Kogon MM, et al. Brief structured respiration practices enhance mood and reduce physiological arousal. *Cell Rep Med.* 2023;4(1):100895. doi:10.1016/j.xcrm.2022.100895
32. Lehrer PM, Gevirtz R. Heart rate variability biofeedback: how and why does it work? *Front Psychol.* 2014;5:756. doi:10.3389/fpsyg.2014.00756
33. Shaffer F, Meehan ZM. A practical guide to resonance frequency assessment for heart rate variability biofeedback. *Front Neurosci.* 2020;14:570400. doi:10.3389/fnins.2020.570400
34. Van Diest I, Verstappen K, Aubert AE, Widjaja D, Vansteenwegen D, Vlemincx E. Inhalation/exhalation ratio modulates the effect of slow breathing on heart rate variability and relaxation. *Appl Psychophysiol Biofeedback.* 2014;39(3-4):171-180. doi:10.1007/s10484-014-9253-x
35. Meehan ZM, Shaffer F. Inhalation-to-exhalation ratio does not affect heart rate variability during resonance-frequency breathing. *Appl Psychophysiol Biofeedback.* 2024;49(3):407-417. doi:10.1007/s10484-024-09637-2
36. Bentley TGK, D'Andrea-Penna G, Rakic M, et al. Breathing practices for stress and anxiety reduction: conceptual framework of implementation guidelines based on a systematic review of the published literature. *Brain Sci.* 2023;13(12):1612. doi:10.3390/brainsci13121612
37. Szulczewski MT. An anti-hyperventilation instruction decreases the drop in end-tidal CO₂ and symptoms of hyperventilation during breathing at 0.1 Hz. *Appl Psychophysiol Biofeedback.* 2019;44(3):247-256. doi:10.1007/s10484-019-09438-y
38. Barker NJ, Jones M, O'Connell NE, Everard ML. Breathing exercises for dysfunctional breathing/hyperventilation syndrome in children. *Cochrane Database Syst Rev.* 2013;(12):CD010376. doi:10.1002/14651858.CD010376.pub2
39. Fleming S, Thompson M, Stevens R, et al. Normal ranges of heart rate and respiratory rate in children from birth to 18 years of age: a systematic review of observational studies. *Lancet.* 2011;377(9770):1011-1018. doi:10.1016/S0140-6736(10)62226-X
40. Tavares ELM, Brasolotto A, Santana MF, Padovan CA, Martins RHG. Maximum phonation time and s/z ratio in a large child cohort. *J Voice.* 2012;26(5):675.e1-675.e4. doi:10.1016/j.jvoice.2012.03.001
41. Cielo CA, Cappellari VM. Maximum phonation time in pre-school children. *Braz J Otorhinolaryngol.* 2008;74(4):552-560.
42. Finnegan DE. Maximum phonation time for children with normal voices. *J Commun Disord.* 1984;17(5):309-317. doi:10.1016/0021-9924(84)90035-9
43. OpenAnesthesia. Pediatric ventilation: physiology (tidal volume 5–7 mL/kg). Accessed September 2026.
44. Quanjer PH, Stanojevic S, Cole TJ, et al. Multi-ethnic reference values for spirometry for the 3–95-yr age range: the global lung function 2012 equations. *Eur Respir J.* 2012;40(6):1324-1343. doi:10.1183/09031936.00080312 (age-specific FVC figures above are approximate **[unverified]**)
45. Doctor TH, Trivedi SS, Chudasama RK. Pulmonary function test in healthy school children of 8 to 14 years age in south Gujarat region. *Lung India.* 2010;27(3):145-148. doi:10.4103/0970-2113.68321
46. Klassen JA, Liang Y, Tjosvold L, Klassen TP, Hartling L. Music for pain and anxiety in children undergoing medical procedures: a systematic review of randomized controlled trials. *Ambul Pediatr.* 2008;8(2):117-128. doi:10.1016/j.ambp.2007.12.005
47. Fan L, Baharum MR. The effect of exposure to natural sounds on stress reduction: a systematic review and meta-analysis. *Stress.* 2024;27(1):2402519. doi:10.1080/10253890.2024.2402519
48. Abed D, Bchara J, Abed D, Alfeel J, Bshara N. Natural sounds and eye massage during dental local anaesthesia in children aged 8–10: randomised controlled trial. *Sci Rep.* 2025;15:1678. doi:10.1038/s41598-024-83613-y

Additional evidence consulted: Eijlers R et al., *Anesth Analg* 2019;129(5):1344-1353 (VR meta-analysis, SMD 1.30 for pain in ≤ 21 y); Chan E et al., *J Pediatr* 2019;209:160-167 (two VR RCTs in 4–11 y, FPS-R −1.4 to −1.8); Gold JI, Mahrer NE, *J Pediatr Psychol* 2018;43(3):266-275 (VR for blood draw in 10–21 y); van Rooij M et al., *CHI EA '16* (DEEP design); Sonne T, Jensen MM, *IDC '16* (ChillFish with children).
