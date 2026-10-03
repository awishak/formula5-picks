// Every player's slogan: a famous sports movie line, adapted for driving cars.
// Pure. Andrew's brief, 2026-10-02: find a hundred, pick the best 48.
//
// SLOGAN_BANK is the hundred, kept so a line can be swapped without writing a
// new one. SLOGAN_OF is the 48 that run, one a player, fixed, so a slogan is
// the same every time the card opens. A player not in the map gets a line
// hashed off their name from the bank, so a new player is never blank.

export const SLOGAN_BANK = [
  // Rocky
  "It ain't about how fast you go. It's about how hard you brake and keep moving forward.",
  "Yo Adrian, I pitted!",
  "I just want to go the distance. On one set of tyres.",
  "If I can change tyres, and you can change tyres, everybody can change tyres.",
  "The world ain't all sunshine and rainbows. Sometimes it's wet at Spa.",
  "Eye of the tiger. Foot on the floor.",
  "Ain't gonna be no rematch. Ain't gonna be no restart.",
  "One corner at a time. One lap at a time. One stint at a time.",
  // Field of Dreams
  "If you build it, it will understeer.",
  "Is this heaven? No, it's the pit lane.",
  // Bull Durham
  "Don't think. It can only hurt the lap time.",
  // Jerry Maguire
  "Show me the podium!",
  "You had me at 'Box, box.'",
  "Help me help you. Pit now.",
  "The kwan. Love, respect, community, and the podium too.",
  // Any Given Sunday
  "Life is a game of inches. So is the apex.",
  // Remember the Titans
  "Left side! Inside line!",
  "Attitude reflects lap times, captain.",
  // Miracle
  "Do you believe in overtakes? Yes!",
  "Great moments are born from great pit windows.",
  "Again! Another lap!",
  // Hoosiers
  "I measured it. The track is the same length as the one at home.",
  // Rudy
  "Five foot nothing, a hundred and nothing, and I drive like it.",
  // Caddyshack
  "Be the car.",
  "So I got pole, which is nice.",
  "Cinderella story, out of nowhere, and he's in the gravel!",
  // Happy Gilmore
  "It's all in the hips. And the brakes.",
  "The price is wrong, Bob. Box, box.",
  "Just tap the brakes. Give it a little tappy.",
  "Go to your happy place. It's the podium.",
  // Talladega Nights
  "If you ain't first, you're last. Or P2, which is also fine.",
  "Shake and bake. And box.",
  "I wanna go fast. Just not into Turn 1.",
  "Help me Tom Cruise! I'm on fire!",
  // Days of Thunder
  "Rubbin' is racin'. Pittin' is winnin'.",
  "He didn't slam you. He didn't bump you. He rubbed you.",
  // Cars
  "Ka-chow. Box, box.",
  "Speed. I am speed. Mostly in the pit lane.",
  "Float like a Cadillac, sting like a Beemer.",
  // Dodgeball
  "If you can dodge a wrench, you can dodge a backmarker.",
  "Bold strategy, Cotton. One stop. Let's see if it pays off.",
  "Nobody makes me bleed my own brake fluid.",
  "Dodge, duck, dip, dive and DRS.",
  // Moneyball
  "How can you not be romantic about an undercut?",
  "I hate losing more than I even wanna win. Especially on tyre wear.",
  // The Natural
  "Pick me out a winner, Bobby. Two stops, on the hards.",
  // A League of Their Own
  "There's no crying in the pit lane!",
  // Major League
  "Just a bit outside. Of track limits.",
  "Wild thing, you make my tyres sing.",
  // The Sandlot
  "You're killin' me, Smalls! Box this lap!",
  "Heroes get remembered, but legends never lift.",
  // Space Jam
  "Come on and slam. Welcome to the chicane.",
  // Coach Carter
  "Our deepest fear is not that we are slow. It is that we are slow beyond measure.",
  // Friday Night Lights
  "Clear eyes, full tank, can't lose.",
  // Cool Runnings
  "Feel the rhythm, feel the rhyme, get on up, it's pit stop time.",
  "Peace be the journey. Especially through Eau Rouge.",
  "I'm feeling very Formula 1 today.",
  "Sanka, you dead? Ya mon. Box this lap.",
  "I see pride! I see power! I see a driver who don't lift for nobody!",
  // The Mighty Ducks
  "Ducks fly together. Teammates pit together.",
  "Quack, quack, quack, box, box, box.",
  "The Flying V. Four cars, one slipstream.",
  // The Karate Kid
  "Wax on, wax off. Tyres on, tyres off.",
  "Sweep the leg. Then sweep the apex.",
  "No mercy. No lift.",
  // Million Dollar Baby
  "Always protect yourself. And the inside line.",
  // Raging Bull
  "You never got me down, Ray. You never got past me either.",
  // Rush
  "The closer you are to the wall, the more alive you feel.",
  "A wise man learns more from his rival's telemetry than a fool from his own.",
  "Happiness is your biggest enemy. It weakens your late braking.",
  // Ford v Ferrari
  "There's a point at 7,000 RPM where everything fades. Then there's a pit stop.",
  "Go like hell. Then box.",
  // Tin Cup
  "Grip it and rip it. Then grip it again at Turn 3.",
  "When a defining moment comes along, you define the moment, or the moment defines your tyre strategy.",
  // The Waterboy
  "You can do it! Pit on lap 14!",
  "Now that's what I call high quality fuel.",
  // Blades of Glory
  "It's mind-bottling. Like a double-stack pit stop.",
  // White Men Can't Jump
  "You'd rather look good and lose than look bad and finish P7.",
  // Varsity Blues
  "I don't want your life. I want your grid slot.",
  // The Replacements
  "Pain heals. Chicks dig scuffs. Glory lasts forever.",
  "Winners always want the wheel when the race is on the line.",
  // Kingpin
  "You've been Munsoned. Out in the gravel.",
  // Slap Shot
  "Old time racing. Like Fangio.",
  // Chariots of Fire
  "God made me for a purpose. But he also made me fast.",
  // Seabiscuit
  "You don't throw a whole car away just 'cause it's banged up a little.",
  // Secretariat
  "Life is ahead of you. Run at it. In eighth gear.",
  // The Blind Side
  "This team is your family. Protect the lead.",
  // Invictus
  "I am the master of my fate. I am the captain of my strategy.",
  // Bend It Like Beckham
  "Bend it like a Red Bull.",
  // Little Giants
  "One time. That's all we need. One good lap.",
  // Angels in the Outfield
  "It could happen. It's a pit stop.",
  // Rookie of the Year
  "Pitcher's got a big rear wing!",
  // For Love of the Game
  "Clear the mechanism. Box, box.",
  // Eight Men Out
  "Say it ain't so, Joe. Not a five-second penalty.",
  // Semi-Pro
  "Everybody love everybody. Except the guy in P2.",
  // Air Bud
  "Ain't no rule says a dog can't drive.",
  // Bring It On
  "Bring it on. I've got fresh softs.",
  // Whip It
  "Be your own hero. Be your own strategist.",
  // Top Gun
  "I feel the need. The need for a one-stop.",
  "Negative, Ghost Rider, the pit lane is full.",
];

// The 48 that run. One a player, assigned 2026-10-02.
export const SLOGAN_OF = {
  "Aditya Satish": "Clear eyes, full tank, can't lose.",
  "Alicia Cho": "Bring it on. I've got fresh softs.",
  "Andrew Ishak": "Show me the podium!",
  "Andy Thompson": "Rubbin' is racin'. Pittin' is winnin'.",
  "Anthony Carnesecca": "Everybody love everybody. Except the guy in P2.",
  "Anthony Zamary": "Just a bit outside. Of track limits.",
  "Brett Dillon": "Shake and bake. And box.",
  "Brian Dong": "It could happen. It's a pit stop.",
  "Chris Fondacaro": "Cinderella story, out of nowhere, and he's in the gravel!",
  "Chris Malek": "No mercy. No lift.",
  "Dan Patry": "Bold strategy, Cotton. One stop. Let's see if it pays off.",
  "Danny Bowers": "Ducks fly together. Teammates pit together.",
  "Evie Ishak": "There's no crying in the pit lane!",
  "Formula5 Bot": "Speed. I am speed. Mostly in the pit lane.",
  "Francisco Soldavini": "Go like hell. Then box.",
  "George Fahmy": "If you ain't first, you're last. Or P2, which is also fine.",
  "Grant Wong": "If you can dodge a wrench, you can dodge a backmarker.",
  "Harold Gutmann": "Don't think. It can only hurt the lap time.",
  "Heather Ishak": "I see pride! I see power! I see a driver who don't lift for nobody!",
  "Jack Civitts": "Heroes get remembered, but legends never lift.",
  "Joe Hanna": "Life is a game of inches. So is the apex.",
  "Joe McGlynn": "Grip it and rip it. Then grip it again at Turn 3.",
  "Kerolos Nakhla": "It ain't about how fast you go. It's about how hard you brake and keep moving forward.",
  "Kevin Coolidge": "You had me at 'Box, box.'",
  "Krista Nabil": "Be the car.",
  "Larry Noel": "Is this heaven? No, it's the pit lane.",
  "Lucia Thompson": "Feel the rhythm, feel the rhyme, get on up, it's pit stop time.",
  "Maggie Ball": "Wax on, wax off. Tyres on, tyres off.",
  "Maggie Mudge": "Do you believe in overtakes? Yes!",
  "Martin Nobar": "The closer you are to the wall, the more alive you feel.",
  "Matilda Luton": "Float like a Cadillac, sting like a Beemer.",
  "Matteo Thompson": "I wanna go fast. Just not into Turn 1.",
  "Max Reisinger": "Quack, quack, quack, box, box, box.",
  "Mena Yousef": "How can you not be romantic about an undercut?",
  "Moses Abdelshaid": "God made me for a purpose. But he also made me fast.",
  "Nick Brody": "You're killin' me, Smalls! Box this lap!",
  "Paul Kohli": "Winners always want the wheel when the race is on the line.",
  "Pavly Attalah": "Sanka, you dead? Ya mon. Box this lap.",
  "Rafik Zarifa": "Great moments are born from great pit windows.",
  "Ramy Stephanos": "Help me Tom Cruise! I'm on fire!",
  "Ronnie Nobar": "I feel the need. The need for a one-stop.",
  "Ryan Kohli": "Ka-chow. Box, box.",
  "Sam Bottoms": "Clear the mechanism. Box, box.",
  "Scott Schertler": "Pain heals. Chicks dig scuffs. Glory lasts forever.",
  "Stacy Michaelsen": "I am the master of my fate. I am the captain of my strategy.",
  "Theo Ishak": "It's all in the hips. And the brakes.",
  "TJ Donato": "The price is wrong, Bob. Box, box.",
  "Zack Girgis": "Yo Adrian, I pitted!",
};

const hash = s => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };

export function sloganOf(name) {
  if (SLOGAN_OF[name]) return SLOGAN_OF[name];
  return SLOGAN_BANK[hash(String(name || "")) % SLOGAN_BANK.length];
}
