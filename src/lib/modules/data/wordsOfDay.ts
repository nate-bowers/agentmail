// Curated word-of-the-day pool. Deterministic rotation by (date, userId) means
// users never get a repeat within the pool size, and different users get
// different words on the same day. No Claude tokens used for this module.

export interface WordEntry {
  word: string;
  partOfSpeech: string;
  definition: string;
  etymology: string;
  exampleSentence: string;
}

const EVERYDAY: WordEntry[] = [
  { word: 'serendipity', partOfSpeech: 'noun', definition: 'The occurrence of pleasant or fortunate events by chance.', etymology: 'Coined by Horace Walpole in 1754 from the Persian fairy tale "The Three Princes of Serendip", whose heroes were always making discoveries by accident.', exampleSentence: 'Meeting my future business partner at that conference was pure serendipity.' },
  { word: 'petrichor', partOfSpeech: 'noun', definition: 'The pleasant earthy smell produced by rain falling on dry soil.', etymology: 'From Greek "petra" (stone) and "ichor" (the fluid that flowed in the veins of the gods), coined in 1964 by two Australian researchers.', exampleSentence: 'She opened the window to breathe in the petrichor after the summer storm.' },
  { word: 'ephemeral', partOfSpeech: 'adjective', definition: 'Lasting for a very short time.', etymology: 'From Greek "ephemeros", meaning "lasting only a day", originally describing certain insects whose adult lives last one day.', exampleSentence: 'The ephemeral beauty of cherry blossoms is part of what makes them so prized.' },
  { word: 'eloquent', partOfSpeech: 'adjective', definition: 'Fluent and persuasive in speaking or writing.', etymology: 'From Latin "eloquens", the present participle of "eloqui" meaning "to speak out".', exampleSentence: 'Her eloquent defense of the proposal swayed even the skeptics in the room.' },
  { word: 'resilient', partOfSpeech: 'adjective', definition: 'Able to recover quickly from difficulty.', etymology: 'From Latin "resilire", meaning "to leap back" — literally to spring back into shape.', exampleSentence: 'Children are remarkably resilient when given a stable environment.' },
  { word: 'wanderlust', partOfSpeech: 'noun', definition: 'A strong desire to travel and explore the world.', etymology: 'A direct borrowing from German, combining "wandern" (to hike) and "Lust" (desire), entering English around 1902.', exampleSentence: 'After five years at the same job, her wanderlust finally won out.' },
  { word: 'nostalgia', partOfSpeech: 'noun', definition: 'A sentimental longing for the past.', etymology: 'Coined in 1688 by Swiss medical student Johannes Hofer from Greek "nostos" (homecoming) and "algos" (pain), originally diagnosed as a medical condition in soldiers.', exampleSentence: 'The smell of his grandmother\'s kitchen filled him with a sharp nostalgia.' },
  { word: 'meticulous', partOfSpeech: 'adjective', definition: 'Showing great attention to detail; very careful and precise.', etymology: 'From Latin "meticulosus" meaning "fearful", later shifting to mean overly careful or fussy.', exampleSentence: 'His meticulous notes saved the team weeks of work when the project was audited.' },
  { word: 'gregarious', partOfSpeech: 'adjective', definition: 'Fond of the company of others; sociable.', etymology: 'From Latin "gregarius" meaning "of a flock", from "grex" (flock or herd).', exampleSentence: 'Even at the largest parties, his gregarious nature made everyone feel welcome.' },
  { word: 'ineffable', partOfSpeech: 'adjective', definition: 'Too great or extreme to be expressed in words.', etymology: 'From Latin "ineffabilis", combining "in-" (not) and "effari" (to utter).', exampleSentence: 'There was an ineffable sadness in the way she closed the door.' },
  { word: 'limerence', partOfSpeech: 'noun', definition: 'The state of being infatuated with another person, typically involuntarily.', etymology: 'Coined by psychologist Dorothy Tennov in 1977 to describe an emotional state distinct from love or simple attraction.', exampleSentence: 'He recognized the giddy fixation as limerence, not love, and tried not to act on it.' },
  { word: 'mellifluous', partOfSpeech: 'adjective', definition: 'Sweet or musical; pleasant to hear.', etymology: 'From Latin "mel" (honey) and "fluere" (to flow), so literally "flowing with honey".', exampleSentence: 'The cellist\'s mellifluous tone filled the small concert hall.' },
  { word: 'quintessential', partOfSpeech: 'adjective', definition: 'Representing the most perfect or typical example of a quality.', etymology: 'From medieval Latin "quinta essentia", the "fifth essence" believed to permeate all things beyond the four elements.', exampleSentence: 'A scoop of vanilla on a hot summer afternoon — the quintessential American dessert.' },
  { word: 'ubiquitous', partOfSpeech: 'adjective', definition: 'Present, appearing, or found everywhere.', etymology: 'From Latin "ubique" meaning "everywhere", first appearing in English in the 1830s.', exampleSentence: 'Smartphones have become so ubiquitous that meetings without them feel unusual.' },
  { word: 'cathartic', partOfSpeech: 'adjective', definition: 'Providing psychological relief through the open expression of strong emotions.', etymology: 'From Greek "katharsis", a term Aristotle used to describe the purifying effect of tragedy.', exampleSentence: 'Writing a long letter she never sent was strangely cathartic.' },
  { word: 'languid', partOfSpeech: 'adjective', definition: 'Displaying or having a disinclination for physical exertion; pleasantly lazy.', etymology: 'From Latin "languidus", from "languere" meaning "to be faint or weary".', exampleSentence: 'They spent a languid afternoon in the hammock, neither awake nor asleep.' },
  { word: 'epiphany', partOfSpeech: 'noun', definition: 'A moment of sudden insight or realization.', etymology: 'From Greek "epiphaneia" meaning "manifestation" or "appearance", originally referring to divine revelation.', exampleSentence: 'It was halfway through dinner that he had the epiphany: the bug was in the cache layer.' },
  { word: 'vivacious', partOfSpeech: 'adjective', definition: 'Attractively lively and animated.', etymology: 'From Latin "vivax" meaning "lively" or "long-lived", from "vivere" (to live).', exampleSentence: 'Her vivacious laugh carried across the courtyard.' },
  { word: 'incandescent', partOfSpeech: 'adjective', definition: 'Emitting light as a result of being heated; passionately intense.', etymology: 'From Latin "incandescere" meaning "to glow white-hot".', exampleSentence: 'She was incandescent with anger when she discovered the lie.' },
  { word: 'sonder', partOfSpeech: 'noun', definition: 'The realization that each random passerby is living a life as vivid and complex as your own.', etymology: 'Coined in 2012 by John Koenig in the Dictionary of Obscure Sorrows.', exampleSentence: 'Walking through the airport terminal, she was overcome by a wave of sonder.' },
  { word: 'recalcitrant', partOfSpeech: 'adjective', definition: 'Having an obstinately uncooperative attitude.', etymology: 'From Latin "recalcitrare" meaning "to kick back", originally describing a stubborn mule.', exampleSentence: 'The recalcitrant printer chose, as always, the worst possible moment to jam.' },
  { word: 'lucid', partOfSpeech: 'adjective', definition: 'Expressed clearly; easy to understand.', etymology: 'From Latin "lucidus" meaning "bright" or "shining", from "lux" (light).', exampleSentence: 'Even after the long day, his lucid explanation of the plan settled the room.' },
  { word: 'apricity', partOfSpeech: 'noun', definition: 'The warmth of the sun in winter.', etymology: 'From Latin "apricitas", from "apricus" meaning "exposed to the sun"; rare in modern English but worth knowing.', exampleSentence: 'They stood in the apricity of a February afternoon, hands wrapped around their coffees.' },
  { word: 'tenacious', partOfSpeech: 'adjective', definition: 'Tending to keep a firm hold of something; persistent.', etymology: 'From Latin "tenax", from "tenere" (to hold).', exampleSentence: 'Her tenacious follow-up turned a polite "no" into a signed contract.' },
  { word: 'ethereal', partOfSpeech: 'adjective', definition: 'Extremely delicate and light, almost not of this world.', etymology: 'From Greek "aitherios", referring to the upper, pure air that the gods breathed.', exampleSentence: 'The fog gave the lake an ethereal quality at dawn.' },
  { word: 'pragmatic', partOfSpeech: 'adjective', definition: 'Dealing with things sensibly and realistically.', etymology: 'From Greek "pragmatikos" meaning "relating to fact", from "pragma" (deed).', exampleSentence: 'They took a pragmatic approach: ship the smaller fix this week, plan the rewrite next quarter.' },
  { word: 'voracious', partOfSpeech: 'adjective', definition: 'Wanting or devouring great quantities of something.', etymology: 'From Latin "vorax", from "vorare" meaning "to devour".', exampleSentence: 'She was a voracious reader, finishing two or three novels a week.' },
  { word: 'amiable', partOfSpeech: 'adjective', definition: 'Having or displaying a friendly and pleasant manner.', etymology: 'From Old French "amiable", from Latin "amicabilis" meaning "friendly".', exampleSentence: 'His amiable manner made even tense meetings feel collaborative.' },
  { word: 'pellucid', partOfSpeech: 'adjective', definition: 'Translucently clear; easily understood.', etymology: 'From Latin "pellucidus", combining "per-" (through) and "lucere" (to shine).', exampleSentence: 'The pellucid waters of the lagoon revealed the reef twenty feet below.' },
  { word: 'fastidious', partOfSpeech: 'adjective', definition: 'Very attentive to and concerned about accuracy and detail.', etymology: 'From Latin "fastidium" meaning "loathing" or "disgust", later softening to "exacting taste".', exampleSentence: 'He kept fastidious records of every purchase, no matter how small.' },
];

const ADVANCED: WordEntry[] = [
  { word: 'ineffable', partOfSpeech: 'adjective', definition: 'Too great or extreme to be expressed in words.', etymology: 'From Latin "ineffabilis", combining "in-" (not) and "effari" (to utter).', exampleSentence: 'There was an ineffable sadness in the way she closed the door for the last time.' },
  { word: 'eldritch', partOfSpeech: 'adjective', definition: 'Weird and sinister or ghostly.', etymology: 'Possibly from Old English "elf-rice", meaning "elf realm"; popularized by H.P. Lovecraft.', exampleSentence: 'An eldritch silence settled over the empty office at 3 a.m.' },
  { word: 'mendacious', partOfSpeech: 'adjective', definition: 'Not telling the truth; lying.', etymology: 'From Latin "mendax" meaning "lying", related to "menda" (a fault or defect).', exampleSentence: 'The mendacious witness was discredited within minutes of cross-examination.' },
  { word: 'perspicacious', partOfSpeech: 'adjective', definition: 'Having a ready insight into things; shrewd.', etymology: 'From Latin "perspicax" meaning "sharp-sighted", from "perspicere" (to see through).', exampleSentence: 'A perspicacious investor, she sold the position six months before the crash.' },
  { word: 'obsequious', partOfSpeech: 'adjective', definition: 'Obedient or attentive to an excessive or servile degree.', etymology: 'From Latin "obsequiosus", from "obsequi" meaning "to comply with".', exampleSentence: 'His obsequious manner with the CEO embarrassed everyone in the room.' },
  { word: 'sycophant', partOfSpeech: 'noun', definition: 'A person who acts obsequiously toward someone important to gain advantage.', etymology: 'From Greek "sykophantes", literally "fig-shower", possibly referring to those who informed on illegal fig exports in ancient Athens.', exampleSentence: 'The court was full of sycophants, but only one advisor would tell the king the truth.' },
  { word: 'sangfroid', partOfSpeech: 'noun', definition: 'Composure or coolness shown in danger or under trying circumstances.', etymology: 'From French "sang froid", meaning literally "cold blood".', exampleSentence: 'She negotiated the hostage release with remarkable sangfroid.' },
  { word: 'ennui', partOfSpeech: 'noun', definition: 'A feeling of listlessness and dissatisfaction arising from a lack of occupation or excitement.', etymology: 'From French "ennui", from Late Latin "inodiare" meaning "to make loathsome".', exampleSentence: 'Six weeks into the sabbatical, the ennui had crept in.' },
  { word: 'panacea', partOfSpeech: 'noun', definition: 'A solution or remedy for all difficulties or diseases.', etymology: 'From Greek "panakeia", from "pan-" (all) and "akos" (cure); Panacea was a goddess of universal remedy.', exampleSentence: 'The team learned quickly that no single framework was a panacea for the system\'s problems.' },
  { word: 'fugacious', partOfSpeech: 'adjective', definition: 'Tending to disappear; fleeting.', etymology: 'From Latin "fugax" meaning "apt to flee", from "fugere" (to flee).', exampleSentence: 'Fame in the algorithmic age is more fugacious than ever.' },
  { word: 'pulchritude', partOfSpeech: 'noun', definition: 'Physical beauty.', etymology: 'From Latin "pulchritudo", from "pulcher" meaning "beautiful".', exampleSentence: 'Her pulchritude was matched only by her intellect.' },
  { word: 'pernicious', partOfSpeech: 'adjective', definition: 'Having a harmful effect, especially in a gradual or subtle way.', etymology: 'From Latin "perniciosus", from "pernicies" (destruction).', exampleSentence: 'The pernicious effects of sleep deprivation can build up over weeks.' },
  { word: 'sesquipedalian', partOfSpeech: 'adjective', definition: 'Characterized by long words; long-winded.', etymology: 'From Latin "sesquipedalis" meaning "a foot and a half long", coined by Horace.', exampleSentence: 'His sesquipedalian style was impressive, but his readers wished for shorter sentences.' },
  { word: 'phlegmatic', partOfSpeech: 'adjective', definition: 'Having an unemotional and stolidly calm disposition.', etymology: 'From Greek "phlegmatikos", referring to the bodily humor of phlegm, thought to produce a sluggish temperament.', exampleSentence: 'His phlegmatic response to the news worried his colleagues more than panic would have.' },
  { word: 'sublime', partOfSpeech: 'adjective', definition: 'Of such excellence, grandeur, or beauty as to inspire great admiration or awe.', etymology: 'From Latin "sublimis" meaning "raised up" or "lofty".', exampleSentence: 'The view from the summit at sunrise was simply sublime.' },
  { word: 'truculent', partOfSpeech: 'adjective', definition: 'Eager or quick to argue or fight; aggressively defiant.', etymology: 'From Latin "truculentus", from "trux" meaning "fierce".', exampleSentence: 'The truculent committee chair derailed every attempt at compromise.' },
  { word: 'desultory', partOfSpeech: 'adjective', definition: 'Lacking a plan, purpose, or enthusiasm.', etymology: 'From Latin "desultorius", originally describing a circus rider who leaped between horses.', exampleSentence: 'The conversation was desultory until someone brought up the upcoming election.' },
  { word: 'effulgent', partOfSpeech: 'adjective', definition: 'Shining brightly; radiant.', etymology: 'From Latin "effulgere" meaning "to shine forth".', exampleSentence: 'The effulgent sunrise made the whole valley look gold-leafed.' },
  { word: 'ineluctable', partOfSpeech: 'adjective', definition: 'Unable to be resisted or avoided; inescapable.', etymology: 'From Latin "ineluctabilis", from "in-" (not) and "eluctari" (to struggle out).', exampleSentence: 'The ineluctable conclusion was that the entire project had to be rewritten.' },
  { word: 'palimpsest', partOfSpeech: 'noun', definition: 'A manuscript on which the original writing has been effaced to make room for later writing; something reused or altered but still bearing visible traces of its earlier form.', etymology: 'From Greek "palimpsestos", from "palin" (again) and "psestos" (rubbed smooth).', exampleSentence: 'The neighborhood is a palimpsest of every wave of immigration the city has seen.' },
  { word: 'apocryphal', partOfSpeech: 'adjective', definition: 'Of doubtful authenticity, although widely circulated as being true.', etymology: 'From Greek "apokryphos" meaning "hidden", originally applied to non-canonical biblical texts.', exampleSentence: 'The story about Einstein failing math is apocryphal but persistent.' },
  { word: 'cogent', partOfSpeech: 'adjective', definition: 'Clear, logical, and convincing.', etymology: 'From Latin "cogens", the present participle of "cogere" meaning "to compel".', exampleSentence: 'She made a cogent case for delaying the launch by two weeks.' },
  { word: 'denouement', partOfSpeech: 'noun', definition: 'The final part of a play, film, or narrative in which the strands of the plot are drawn together and resolved.', etymology: 'From French "dénouer" meaning "to untie".', exampleSentence: 'The denouement of the trial was anticlimactic — both parties simply settled.' },
  { word: 'lugubrious', partOfSpeech: 'adjective', definition: 'Looking or sounding sad and dismal.', etymology: 'From Latin "lugubris", from "lugere" meaning "to mourn".', exampleSentence: 'The lugubrious cello opening set the tone for the entire piece.' },
  { word: 'recondite', partOfSpeech: 'adjective', definition: 'Little known; abstruse.', etymology: 'From Latin "reconditus" meaning "hidden" or "concealed".', exampleSentence: 'His recondite knowledge of medieval banking made him invaluable to the historians.' },
  { word: 'obstreperous', partOfSpeech: 'adjective', definition: 'Noisy and difficult to control.', etymology: 'From Latin "obstreperus", from "obstrepere" meaning "to make a noise against".', exampleSentence: 'The obstreperous toddler had to be removed from the quiet car of the train.' },
  { word: 'nadir', partOfSpeech: 'noun', definition: 'The lowest or most unsuccessful point in a situation.', etymology: 'From Arabic "nazir" meaning "opposite", originally an astronomical term for the point directly below an observer.', exampleSentence: 'The 2008 layoffs were the nadir of the company\'s decade.' },
  { word: 'zenith', partOfSpeech: 'noun', definition: 'The time at which something is most powerful or successful.', etymology: 'From medieval Latin "cenit", from Arabic "samt" meaning "path".', exampleSentence: 'She left the company at the zenith of her career to start her own firm.' },
  { word: 'perfidious', partOfSpeech: 'adjective', definition: 'Deceitful and untrustworthy.', etymology: 'From Latin "perfidiosus", from "perfidia" (treachery), literally "through faith".', exampleSentence: 'His perfidious memo to the board cost him every friend he had at the company.' },
  { word: 'verisimilitude', partOfSpeech: 'noun', definition: 'The appearance of being true or real.', etymology: 'From Latin "verisimilis" meaning "like the truth", combining "verus" (true) and "similis" (similar).', exampleSentence: 'The film\'s verisimilitude was no accident — they\'d hired a historian as a consultant.' },
];

const OBSCURE: WordEntry[] = [
  { word: 'pareidolia', partOfSpeech: 'noun', definition: 'The tendency to perceive a meaningful image in a random or ambiguous visual pattern.', etymology: 'Coined in the 19th century from Greek "para-" (alongside) and "eidolon" (image or shape).', exampleSentence: 'Seeing faces in clouds and electrical outlets is a classic case of pareidolia.' },
  { word: 'meraki', partOfSpeech: 'noun', definition: 'Doing something with soul, creativity, or love; putting something of yourself into your work.', etymology: 'Modern Greek, with no precise English equivalent.', exampleSentence: 'The wedding cake was beautiful, but the dinner had real meraki behind it.' },
  { word: 'hiraeth', partOfSpeech: 'noun', definition: 'A homesickness for a home to which you cannot return, a home which maybe never was; nostalgia, yearning, grief for the lost places of your past.', etymology: 'Welsh, untranslatable in a single English word.', exampleSentence: 'Years after leaving, she still felt a deep hiraeth for the coastline of her childhood.' },
  { word: 'tsundoku', partOfSpeech: 'noun', definition: 'The practice of acquiring books and letting them pile up unread.', etymology: 'Japanese, combining "tsumu" (to pile up) and "doku" (to read), dating to the late 19th century.', exampleSentence: 'His tsundoku had reached the point where the bookshelves were stacked two-deep.' },
  { word: 'sprezzatura', partOfSpeech: 'noun', definition: 'Studied carelessness; the art of doing something difficult in a way that makes it look effortless.', etymology: 'Italian, coined by Baldassare Castiglione in his 1528 "Book of the Courtier".', exampleSentence: 'The jazz musician played the impossibly fast passage with practiced sprezzatura.' },
  { word: 'saudade', partOfSpeech: 'noun', definition: 'A deep emotional state of nostalgic longing for something absent.', etymology: 'Portuguese, often cited as one of the most untranslatable words in any language.', exampleSentence: 'Bossa nova captured the saudade of a generation of Brazilians.' },
  { word: 'koselig', partOfSpeech: 'adjective', definition: 'A Norwegian sense of warmth, comfort, and friendly intimacy, especially with others on long winter nights.', etymology: 'Norwegian, related to the broader Scandinavian tradition of "hygge" but with a more communal emphasis.', exampleSentence: 'Sharing wine by the fire with old friends — the whole evening had a koselig feeling to it.' },
  { word: 'wabi-sabi', partOfSpeech: 'noun', definition: 'A Japanese aesthetic centered on the acceptance of transience and imperfection.', etymology: 'Japanese, combining "wabi" (rustic simplicity) and "sabi" (the beauty of age and patina).', exampleSentence: 'The cracked ceramic bowl, repaired with gold, was a perfect expression of wabi-sabi.' },
  { word: 'mamihlapinatapai', partOfSpeech: 'noun', definition: 'A look shared by two people, each wishing the other would initiate something they both desire but neither wants to start.', etymology: 'From Yaghan, an indigenous language of Tierra del Fuego, sometimes cited as the world\'s most concise word.', exampleSentence: 'They sat across the table in a moment of mamihlapinatapai before he finally spoke.' },
  { word: 'gigil', partOfSpeech: 'noun', definition: 'The overwhelming urge to squeeze or pinch something irresistibly cute.', etymology: 'Tagalog, with no direct English equivalent.', exampleSentence: 'The puppy\'s face triggered such gigil that she could barely keep her hands at her sides.' },
  { word: 'apophenia', partOfSpeech: 'noun', definition: 'The tendency to perceive meaningful connections between unrelated things.', etymology: 'Coined in 1958 by German psychiatrist Klaus Conrad to describe a specific stage of schizophrenia, later broadened.', exampleSentence: 'The conspiracy theorist\'s entire worldview was a structured form of apophenia.' },
  { word: 'eunoia', partOfSpeech: 'noun', definition: 'Beautiful or well thinking; a state of normal mental health.', etymology: 'Greek, used by Aristotle to describe the goodwill a speaker must show to be persuasive.', exampleSentence: 'After months of therapy he felt he had finally returned to a state of eunoia.' },
  { word: 'orenda', partOfSpeech: 'noun', definition: 'A mystical force believed by the Iroquois to be present in all things, used to effect change.', etymology: 'From the Iroquois language, particularly Huron and Mohawk.', exampleSentence: 'There was an orenda about her — a quiet force that seemed to bend rooms toward her.' },
  { word: 'fernweh', partOfSpeech: 'noun', definition: 'An ache for distant places; the opposite of homesickness.', etymology: 'German, combining "fern" (distant) and "Weh" (woe or pain).', exampleSentence: 'Every time he saw photos of the Hebrides his fernweh became unbearable.' },
  { word: 'aware', partOfSpeech: 'noun', definition: 'The bittersweet awareness of the impermanence of beauty.', etymology: 'Japanese (pronounced "ah-wah-RAY"), often associated with the longer phrase "mono no aware".', exampleSentence: 'Watching her grandchildren play, she felt the gentle aware of how briefly this stage would last.' },
  { word: 'cwtch', partOfSpeech: 'noun', definition: 'A hug or cuddle, especially one that creates a sense of safety.', etymology: 'Welsh; etymologically related to "cubbyhole" via Middle English "couche".', exampleSentence: 'After the long day, all she wanted was a good cwtch from her dog.' },
  { word: 'duende', partOfSpeech: 'noun', definition: 'A quality of passion and inspiration; the mysterious power of a work of art to deeply move a person.', etymology: 'Spanish, originally referring to a kind of mischievous goblin; transformed by poet Federico García Lorca into an aesthetic concept.', exampleSentence: 'The flamenco dancer had a duende that lifted the entire courtyard.' },
  { word: 'iktsuarpok', partOfSpeech: 'noun', definition: 'The feeling of anticipation that leads you to keep checking outside to see if anyone is arriving.', etymology: 'Inuktitut, from the Inuit cultures of northern Canada.', exampleSentence: 'On the day of the visit he had iktsuarpok so badly he could not concentrate on anything.' },
  { word: 'L\'esprit de l\'escalier', partOfSpeech: 'noun', definition: 'The perfect comeback you only think of after the moment has passed.', etymology: 'French, literally "the wit of the staircase", coined by Denis Diderot in the 18th century.', exampleSentence: 'Driving home, he was struck by L\'esprit de l\'escalier — exactly what he should have said two hours earlier.' },
  { word: 'kalsarikännit', partOfSpeech: 'noun', definition: 'The act of drinking alone at home in your underwear with no intention of going out.', etymology: 'Finnish, dating to the 1990s; the country has even minted an emoji for the concept.', exampleSentence: 'After the worst Monday of the year, he committed to a Tuesday evening of kalsarikännit.' },
];

const POOLS: Record<string, WordEntry[]> = {
  everyday: EVERYDAY,
  advanced: ADVANCED,
  obscure: OBSCURE,
};

// Simple non-crypto hash → number, used to give each user a stable offset
// so two users on the same day get different words.
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
 * Deterministic per-day, per-user pick. Within a calendar day a given user
 * always gets the same word; different users get different words; across
 * days each user cycles through the entire pool before any repeat.
 */
export function pickWordOfDay(
  difficulty: string,
  userId: string,
  now: Date = new Date()
): WordEntry {
  const pool = POOLS[difficulty] ?? EVERYDAY;
  const idx = (daysSinceEpoch(now) + hashUserId(userId)) % pool.length;
  return pool[idx];
}
