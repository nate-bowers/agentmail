// Curated fact-of-the-day pool. Same rotation pattern as wordsOfDay: each user
// cycles through the entire pool before repeats, different users get different
// facts on the same day. No Claude tokens used for this module.

export interface FactEntry {
  fact: string;
  explanation: string;
  category: string;
}

const SCIENCE: FactEntry[] = [
  { fact: 'A teaspoon of neutron star material would weigh about 6 billion tons on Earth.', explanation: 'Neutron stars are the collapsed cores of massive stars; their material is packed so densely that the protons and electrons have fused into neutrons.', category: 'science' },
  { fact: 'The sun loses 4.7 million tons of mass every second.', explanation: 'Mass is converted to energy via E=mc² during the hydrogen-to-helium fusion in the sun\'s core. Even at this rate, the sun will keep burning for another 5 billion years.', category: 'science' },
  { fact: 'There are more possible games of chess than atoms in the observable universe.', explanation: 'The Shannon number estimates 10^120 possible chess games; the observable universe contains roughly 10^80 atoms.', category: 'science' },
  { fact: 'If you could fold a piece of paper 42 times, it would reach the moon.', explanation: 'Each fold doubles the thickness, so it grows exponentially. In practice paper can only be folded about 7 times before becoming impossibly thick to crease.', category: 'science' },
  { fact: 'Bananas are slightly radioactive.', explanation: 'They contain naturally occurring potassium-40. The dose is so small that "banana equivalent dose" is sometimes used informally to compare radiation exposures.', category: 'science' },
  { fact: 'Honey never spoils.', explanation: 'Archaeologists have found 3000-year-old honey in Egyptian tombs that was still edible. Its low water content and acidic pH make microbial growth impossible.', category: 'science' },
  { fact: 'It rains diamonds on Neptune and Uranus.', explanation: 'Atmospheric pressure crushes methane molecules, releasing carbon that forms diamond crystals as it sinks toward the planetary core.', category: 'science' },
  { fact: 'The shortest war in history lasted 38 minutes.', explanation: 'The Anglo-Zanzibar War of 1896 ended when the British navy bombarded the Sultan\'s palace, forcing surrender before lunch.', category: 'history' },
  { fact: 'Octopuses have three hearts and blue blood.', explanation: 'Two hearts pump blood through the gills; the third pumps it through the rest of the body. Their blood uses copper-based hemocyanin rather than iron-based hemoglobin.', category: 'science' },
  { fact: 'The Eiffel Tower can grow up to 15 cm taller in summer.', explanation: 'Thermal expansion in the iron lattice; the metal lengthens as it heats up in the sun, then contracts back at night.', category: 'science' },
  { fact: 'Cleopatra lived closer in time to the moon landing than to the building of the Great Pyramid.', explanation: 'The Pyramid was built around 2560 BC. Cleopatra died in 30 BC. The moon landing was in 1969 AD — making her era closer to ours by about 500 years.', category: 'history' },
  { fact: 'A day on Venus is longer than its year.', explanation: 'Venus rotates so slowly that one full rotation takes 243 Earth days, while a complete orbit of the sun takes 225. It also rotates backwards relative to most other planets.', category: 'science' },
  { fact: 'There are more trees on Earth than stars in the Milky Way.', explanation: 'Estimates put Earth\'s tree count around 3 trillion versus 100-400 billion stars in our galaxy. That\'s about 8 times as many trees as stars.', category: 'nature' },
  { fact: 'Wombats produce cube-shaped poop.', explanation: 'Their elongated intestines have varying elasticity along their length, which sculpts the waste into cubes — likely so it doesn\'t roll away when used to mark territory.', category: 'nature' },
  { fact: 'The Hawaiian alphabet has only 13 letters.', explanation: 'Five vowels (a, e, i, o, u) and eight consonants (h, k, l, m, n, p, w, plus the okina glottal stop). The system was standardized by missionaries in the 1820s.', category: 'history' },
];

const NATURE: FactEntry[] = [
  { fact: 'Sloths can hold their breath longer than dolphins.', explanation: 'Sloths can slow their heart rate enough to hold their breath for up to 40 minutes underwater. Dolphins manage about 10 minutes on average.', category: 'nature' },
  { fact: 'A group of crows is called a "murder", but a group of ravens is an "unkindness".', explanation: 'These collective nouns date to medieval English game books and probably owe more to imaginative storytelling than to any observed behavior.', category: 'nature' },
  { fact: 'Tardigrades can survive in space.', explanation: 'These microscopic "water bears" have survived being exposed to the vacuum, radiation, and temperatures of low Earth orbit. They enter a cryptobiotic state and revive when rehydrated.', category: 'nature' },
  { fact: 'A blue whale\'s heart is the size of a small car.', explanation: 'It weighs around 400 lbs and beats only 8-10 times per minute while the whale is diving. The aorta is wide enough for a human to crawl through.', category: 'nature' },
  { fact: 'Mantis shrimp can see 12-16 channels of color.', explanation: 'Humans see three. Mantis shrimp have 16 types of photoreceptors, including ones that detect circularly polarized light — but recent research suggests their brains don\'t actually process color as richly as their eyes suggest.', category: 'nature' },
  { fact: 'A single strawberry has about 200 seeds on its surface.', explanation: 'Technically, what we call a strawberry isn\'t a berry — it\'s an "accessory fruit", and each of those tiny yellow specks on the outside is the true fruit.', category: 'nature' },
  { fact: 'Some species of jellyfish are biologically immortal.', explanation: 'Turritopsis dohrnii can revert to its juvenile polyp stage after maturity, theoretically allowing it to live forever — though most are eaten or die from disease.', category: 'nature' },
  { fact: 'Bees can recognize human faces.', explanation: 'They use a "configural" approach similar to ours: identifying features like eyes and mouth and their spatial arrangement, even though their brains have fewer than a million neurons.', category: 'nature' },
  { fact: 'Trees can warn each other about insect attacks.', explanation: 'When attacked, some trees release volatile chemical signals through the air and root systems that prompt nearby trees to produce defensive compounds before the attackers arrive.', category: 'nature' },
  { fact: 'The Greenland shark can live for over 400 years.', explanation: 'It is the longest-lived vertebrate known. They grow slowly (about 1 cm per year) and don\'t reach sexual maturity until they are around 150.', category: 'nature' },
  { fact: 'A snail can sleep for three years.', explanation: 'In dry or cold conditions some species enter estivation or hibernation, sealing themselves inside their shell and slowing their metabolism dramatically.', category: 'nature' },
  { fact: 'Cows have best friends.', explanation: 'Studies measuring stress hormones show that cows kept with familiar companions have significantly lower heart rates and cortisol than those paired with strangers.', category: 'nature' },
  { fact: 'A flock of flamingos is called a "flamboyance".', explanation: 'The collective noun fits both the birds\' coloration and their tendency to perform synchronized courtship displays.', category: 'nature' },
  { fact: 'Pineapples take about two years to grow.', explanation: 'A pineapple plant produces just one fruit per harvest cycle, and the cycle from planting to harvest takes 18-24 months. That\'s part of why pineapples were once a status symbol.', category: 'nature' },
  { fact: 'Crows can hold grudges against specific humans for years.', explanation: 'A University of Washington study found that crows recognize faces of people who have harmed them, remember them for at least 5 years, and pass the warning to their offspring.', category: 'nature' },
];

const HISTORY: FactEntry[] = [
  { fact: 'Oxford University is older than the Aztec Empire.', explanation: 'Teaching at Oxford began around 1096. The Aztec capital Tenochtitlán was founded in 1325 — more than 200 years later.', category: 'history' },
  { fact: 'Napoleon was once attacked by a horde of rabbits.', explanation: 'After his ambassador organized a rabbit hunt to celebrate the 1807 Treaty of Tilsit, the released rabbits — many of them tame — charged toward Napoleon expecting food.', category: 'history' },
  { fact: 'The Great Wall of China is not visible from space with the naked eye.', explanation: 'Despite the popular myth, astronauts have confirmed the wall is too narrow to see from low Earth orbit without optical aids. The myth predates space travel by decades.', category: 'history' },
  { fact: 'Albert Einstein was offered the presidency of Israel in 1952.', explanation: 'After Chaim Weizmann\'s death, Israeli Prime Minister Ben-Gurion offered Einstein the largely ceremonial role. Einstein declined, saying he was unsuited for the human side of the position.', category: 'history' },
  { fact: 'The shortest reign in history was 20 minutes.', explanation: 'Louis-Antoine of France was technically king for about 20 minutes in 1830, between his father\'s abdication and his own, before the throne passed to his nephew.', category: 'history' },
  { fact: 'The Coca-Cola logo is recognized by 94% of the world\'s population.', explanation: 'This is according to research from the Coca-Cola Company. The original Spencerian script has remained essentially unchanged since 1887.', category: 'history' },
  { fact: 'The University of Oxford has its own dialect of English.', explanation: '"Oxford English" includes specific terms like "tute" (tutorial), "bod" (Bodleian Library), and a particular pronunciation of certain words that has survived for centuries.', category: 'history' },
  { fact: 'Pope Gregory IX once declared a war on cats in 1233.', explanation: 'His papal bull associated black cats with Satan worship. The resulting cat massacre may have contributed to the spread of the Black Death by allowing rat populations to explode.', category: 'history' },
  { fact: 'The Roman Empire used urine as mouthwash.', explanation: 'The ammonia in urine made an effective whitener, and a Roman urine tax (vectigal urinae) was levied on its collection from public urinals. The phrase "pecunia non olet" ("money doesn\'t smell") comes from this.', category: 'history' },
  { fact: 'Until 1913, you could mail a child via the U.S. Postal Service.', explanation: 'The newly established parcel post led to several documented cases of parents mailing children as cheap travel, until the Postmaster General officially banned the practice.', category: 'history' },
  { fact: 'The Eiffel Tower was meant to be temporary.', explanation: 'Built as the entrance arch for the 1889 World\'s Fair, it was scheduled for demolition after 20 years. It survived because its height made it useful as a radio transmitter.', category: 'history' },
  { fact: 'The Battle of Karánsebes in 1788 was lost when an army attacked itself.', explanation: 'Two units of the Austrian army, separated by night and confused by alcohol, mistook each other for the enemy. Over 1,200 casualties were reported, all without an enemy in sight.', category: 'history' },
  { fact: 'Marie Curie\'s notebooks are still radioactive.', explanation: 'A century after her work with radium, her papers and personal items remain so contaminated that they are stored in lead-lined boxes and require protective equipment to view.', category: 'history' },
  { fact: 'The English Channel has been swum more than space has been visited.', explanation: 'Over 1,800 people have swum the Channel; fewer than 700 humans have ever been to space.', category: 'history' },
  { fact: 'In 1962, Sweden switched from driving on the left to driving on the right overnight.', explanation: 'On September 3, 1962, "Dagen H" saw all traffic stop at 4:50 AM, switch sides, and resume at 5:00 AM. Accident rates actually fell in the months afterward.', category: 'history' },
];

const TECHNOLOGY: FactEntry[] = [
  { fact: 'The first computer bug was an actual bug.', explanation: 'In 1947, engineers found a moth trapped in a relay of the Harvard Mark II. Grace Hopper taped the moth into the logbook with the note "first actual case of bug being found".', category: 'technology' },
  { fact: 'Wi-Fi doesn\'t stand for anything.', explanation: 'The Wi-Fi Alliance hired a branding company to come up with a catchier name than "IEEE 802.11b Direct Sequence". Wi-Fi was meant to evoke "Hi-Fi" but is not an actual acronym.', category: 'technology' },
  { fact: 'The first email was sent in 1971.', explanation: 'Ray Tomlinson sent it across two computers in the same room. He doesn\'t remember the contents — just that it was something forgettable like "QWERTYUIOP".', category: 'technology' },
  { fact: 'The most common password is still "123456".', explanation: 'Year after year, breach data analyses by SplashData and NordPass confirm "123456", "password", and "qwerty" remain the top three globally.', category: 'technology' },
  { fact: 'Bitcoin\'s creator has never been identified.', explanation: 'Satoshi Nakamoto published the original whitepaper in 2008 and disappeared in 2011. The associated wallets hold an estimated $50+ billion and have never been touched.', category: 'technology' },
  { fact: 'YouTube\'s "View" counter once broke for the first video to hit 2.15 billion views.', explanation: '"Gangnam Style" exceeded YouTube\'s 32-bit integer limit (2,147,483,647) in 2014, forcing the company to upgrade to 64-bit counters.', category: 'technology' },
  { fact: 'The Apollo Guidance Computer had less RAM than a single emoji.', explanation: 'It had 4 KB of RAM. A single full-color emoji is about 10 KB. The computer that took us to the moon would not be able to display a smiley face.', category: 'technology' },
  { fact: 'About 90% of all data ever created was generated in the last two years.', explanation: 'The figure has been roughly true since 2013 due to the exponential growth of internet traffic, sensors, video, and AI-generated content.', category: 'technology' },
  { fact: '"Spam" comes from a Monty Python sketch.', explanation: 'In a 1970 sketch, a cafe serves dishes that all include Spam, sung repeatedly by Vikings. Early internet users coopted the term for unwanted repetitive messages.', category: 'technology' },
  { fact: 'The QWERTY layout was designed to slow typists down.', explanation: 'It separated frequently used letter pairs so the mechanical arms of early typewriters would not jam. We\'ve been stuck with the layout ever since, despite faster alternatives.', category: 'technology' },
  { fact: 'The first webcam watched a coffee pot.', explanation: 'In 1991, Cambridge University researchers set up a camera on the Trojan Room\'s coffee pot so they could check from their desks whether a fresh brew was available.', category: 'technology' },
  { fact: 'Twitter\'s mascot was named after a basketball player.', explanation: 'The blue bird, Larry T. Bird, was named for Boston Celtics legend Larry Bird by co-founder Biz Stone, a Celtics fan.', category: 'technology' },
  { fact: 'The original Macintosh shipped with 128 KB of RAM.', explanation: 'That\'s less than 1% of what a single browser tab uses today. The 1984 ad campaign managed to make it feel like the future anyway.', category: 'technology' },
  { fact: 'AI image-generation models contain no images.', explanation: 'Models like Stable Diffusion are a few gigabytes; their training set was hundreds of terabytes. They store statistical patterns about what images look like, not the images themselves.', category: 'technology' },
  { fact: 'A modern smartphone has more computing power than NASA had in 1969.', explanation: 'The iPhone 12 has about 11 billion transistors and clocks several gigahertz. The entire NASA mainframe network that ran Apollo had a tiny fraction of that throughput.', category: 'technology' },
];

const PSYCHOLOGY: FactEntry[] = [
  { fact: 'Your brain is more active during sleep than when you watch television.', explanation: 'EEG and PET studies show heightened neural activity during REM sleep, particularly in emotional and memory-related regions. Passive viewing produces some of the lowest brain activity outside of sleep.', category: 'psychology' },
  { fact: 'The "Mozart Effect" is largely a myth.', explanation: 'The 1993 study suggested classical music briefly improved spatial reasoning, but the effect was small, short-lived, and not specific to Mozart. The myth was inflated by marketers selling baby CDs.', category: 'psychology' },
  { fact: 'Smiling can actually make you feel happier.', explanation: 'The "facial feedback hypothesis" has been replicated in large multi-lab studies: forcing the muscles of a smile mildly elevates subjective mood, though the effect is small.', category: 'psychology' },
  { fact: 'People are more likely to lie over text than in person.', explanation: 'Multiple studies, including a notable one by Jeff Hancock at Stanford, find people tell fewer lies in face-to-face conversation than in chat or text, where accountability cues are weaker.', category: 'psychology' },
  { fact: 'You can only maintain about 150 stable relationships at a time.', explanation: 'Dunbar\'s number, based on the ratio of neocortex size to group size in primates, suggests humans have a cognitive limit of about 150 meaningful relationships.', category: 'psychology' },
  { fact: 'The IKEA Effect makes you value things you build yourself.', explanation: 'A 2011 Harvard study found that people will pay significantly more for items they assembled themselves, even if the result is objectively worse than the pre-built version.', category: 'psychology' },
  { fact: 'Most decisions are made before you\'re consciously aware of them.', explanation: 'Benjamin Libet\'s experiments in the 1980s, and subsequent fMRI studies, suggest that brain activity predicting a simple decision can appear up to 7-10 seconds before the person reports deciding.', category: 'psychology' },
  { fact: 'The "five stages of grief" were never about grief.', explanation: 'Elisabeth Kübler-Ross developed them in 1969 to describe terminally ill patients\' reactions to their own diagnoses, not the grieving of survivors. They were later popularized as universal — without strong evidence.', category: 'psychology' },
  { fact: 'You cannot really "multitask".', explanation: 'What feels like multitasking is rapid context-switching. Stanford research shows people who try it score worse on attention, memory, and the very task-switching they think they\'re good at.', category: 'psychology' },
  { fact: 'A single positive memory can fade more slowly than negative ones.', explanation: 'The "fading affect bias" describes the tendency for negative emotions associated with memories to fade faster than positive ones, especially with age.', category: 'psychology' },
  { fact: 'Looking at nature, even on a screen, lowers stress.', explanation: 'A 2019 study at the University of Exeter found that 20-minute exposures to nature photos or videos significantly reduced cortisol levels, though real nature works better.', category: 'psychology' },
  { fact: 'People are more honest in the morning.', explanation: 'A series of studies found that ethical decision-making and honesty both decline through the day, a phenomenon researchers called the "morning morality effect".', category: 'psychology' },
  { fact: 'The smell of fresh bread makes people kinder.', explanation: 'A 2012 French study found that bystanders near a bakery were significantly more likely to help a stranger than those near a neutral-smelling store.', category: 'psychology' },
  { fact: 'Memory is reconstructive, not recordable.', explanation: 'Each time you recall an event, you re-encode it. Memories can be altered just by remembering them — which is why eyewitness testimony is far less reliable than juries assume.', category: 'psychology' },
  { fact: 'Writing by hand engages more of the brain than typing.', explanation: 'Norwegian researchers using EEG found wider activation in language and learning regions when subjects wrote by hand, suggesting better encoding of new information.', category: 'psychology' },
];

const ANY: FactEntry[] = [...SCIENCE, ...NATURE, ...HISTORY, ...TECHNOLOGY, ...PSYCHOLOGY];

const POOLS: Record<string, FactEntry[]> = {
  any: ANY,
  science: SCIENCE,
  nature: NATURE,
  history: HISTORY,
  technology: TECHNOLOGY,
  psychology: PSYCHOLOGY,
};

function hashUserId(userId: string): number {
  let h = 0;
  for (let i = 0; i < userId.length; i++) {
    h = ((h << 5) - h + userId.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function daysSinceEpoch(date: Date): number {
  return Math.floor(date.getTime() / 86400000);
}

/**
 * Deterministic per-day, per-user pick. Same logic as wordsOfDay.
 */
export function pickFact(
  category: string,
  userId: string,
  now: Date = new Date()
): FactEntry {
  const pool = POOLS[category] ?? ANY;
  const idx = (daysSinceEpoch(now) + hashUserId(userId)) % pool.length;
  return pool[idx];
}
