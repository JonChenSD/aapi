export type ArtistSection = {
  title?: string;
  paragraphs: string[];
};

export type Artist = {
  id: string;
  name: string;
  /** Shown under the name in the profile panel */
  tagline?: string;
  /** MP4/WebM under `public/` (e.g. `/videos/Jon.mp4`). */
  reelVideoSrc?: string;
  reelVideoPoster?: string;
  /**
   * How to box self-hosted video: `wide` = 16:9 (landscape-friendly; tall sources letterbox),
   * `portrait` = 9:16 typical phone reel.
   */
  reelVideoBox?: "wide" | "portrait";
  sections: ArtistSection[];
};

export const ARTISTS: Artist[] = [
  {
    id: "sebastian-loo",
    name: "Sebastian Loo",
    tagline: "b. Los Angeles, 1996\nLA-based installation artist",
    reelVideoSrc: "/videos/Seb.mp4",
    reelVideoBox: "portrait",
    sections: [
      {
        paragraphs: [
          "Sebastian Loo (b. Los Angeles, 1996) is an LA-based installation artist working primarily with ink, colors, and Chinese Xuan rice paper. As a queer, Chinese American, Loo’s work ultimately seeks hybridity of: Eastern and Western culture, contemporary and ancient perspectives, religious and secular practices, the natural and artificial. Their practice ultimately aims at personal transformation and systems change, utilizing pointillism and paper cut-out techniques to question the origin stories that shape our worldview. Through these methods, Loo creates works that transcend boundaries, inviting viewers into a space of interconnectedness where all things—matter, icon, or system—exist beyond categorization and are united within a field of unconditional relationship.",
          "Drawing from both “real” and mythological imagery, Loo’s work connects disparate origins. He engages deeply with the idea that meaning and understanding are born from narrative and myth, examining how foundational stories shape human actions and beliefs. By repurposing canonized motifs such as gods, scientific processes, and architectures, Loo creates immersive paintings that allow space for reflection and questioning. He calls his pieces “painted assemblages” since their bodies contain a range of subjects and dynamics, as in multifaceted systems alone. Coming together as hanging installations rather than wall-fixed paintings, his floating pieces respond to each other as if they were societal or cosmic microcosms playing out global dialogues. These suspended mythologies ultimately serve as portals, inviting an essential awareness for all sentient beings to consider the narratives that govern existence.",
        ],
      },
      {
        title: "Dwelling: Collective Dreams of Earth/Site/Energy/Shelter/Sky/Person",
        paragraphs: [
          "(Watercolor Class/Group Installation)",
          "“Dwelling” was inspired by the text Dwelling by River, which recorded the lives and shelter building approaches of transient people and communards of the 1970’s. River’s enchanting concept of the constructed domestic space stirred in me a profound necessity to explore the same undertaking. I wanted to ask: What creates community? And can the shared labor of alchemizing dreams into reality create and sustain community?",
          "Through mediums of water, pigment and Chinese Xuan paper, “Dwelling” became a community container space shaped by multiple floating murals, representing the minds of 7 friends/artists, and our collective dynamics. Attempting to materialize our vision, I taught and led us into intuitive painting that organically emerged into organic forms paralleling traditional Chinese landscape ink painting. Ultimately, the resulting shelter is an embodiment of both physical and metaphysical sanctuary where communities beyond us can peacefully find solace to nurture imagination, radical change, and deep time connection.",
          "“Dwelling is more than building and living in a house; it is the totality of earth/site/energy/shelter/sky/person. Dwelling is a personal, natural, living relationship with the earth. It feels crucial to begin that relationship clearly; for me this means no less than discovering who I am, in order to know what I want,” (River, Dwelling).",
        ],
      },
    ],
  },
  {
    id: "rino-kodama",
    name: "Rino Kodama",
    tagline: "b. 1998 Singapore · based in\nAlbion, California",
    reelVideoSrc: "/videos/Rino.mp4",
    reelVideoBox: "portrait",
    sections: [
      {
        paragraphs: [
          "Currently based in Albion, California, I am a second generation Japanese American artist and writer. Where my practice begins with poetry to explore themes of grief and transformation, they merge into life size ceramic sculptures, a celebration of the more than human world, in constant relationship and learning from the regenerative life all around us. Collaborating with the elements of fire and earth, I use repetitive coil building techniques, where clay becomes a medium for protection, somatic processing, ritual, and celebration. My clay vessels are extensions of my genderqueer body, malleable, undergoing stages of transformation, the way clay goes from its original to fired form. My earliest collaborations are with my mother, Tomoko Kodama, a gardener and florist who regularly creates arrangements for the vessels I create, and who was the first person who showed me the importance of planting and nurturing beauty in our lives. Outside of my ceramic practice, I find joy in working with other queer and trans artists searching and creating spaces of belonging. I am a co-editor of Letters to Home: Art and Writing by LGBTQ+ Nikkei and Allies, an anthology of works by Japanese American queer and trans folks and their families, on ways they have co-constructed community.",
          "Kodama holds a BA from UCLA, and most recently attended the inaugural session of Schools of Salmon Creek, co-creating and learning with 5 other artists on Pomo land. They recently completed their School Guide position at Salmon Creek, stewarding the next cohort of artists to experiment and develop a connection to their bodies, land, practice, and each other. Their first co-curated exhibition with Dav Bell, Natural Death, is open at the Mendocino Art Center until February 9th, 2026. Kodama is currently learning about wood firing at Cider Creek Collective.",
        ],
      },
      {
        title: "Waking/Walking Spells",
        paragraphs: [
          "Each vessel is engraved with incantations, prayers, and affirmations generated by the fellows through a stream of consciousness writing practice, with wishes for our personal and collective futures. These incantations were prompted with questions of, what needs holding? What requires protection? What desires to be remembered? We can look to pottery from the past to see what people have utilized in their prayer, I am specifically thinking of Mandaean incantation bowls that were inscribed with spells to ward off death, illness, and evil spirits. They often revealed a desire for protection, or a prayer for a healthy birth and baby. “We release the old, and welcome the new. We are change.” If these personal and collective incantations resonate, I invite you to walk around the vessels in a circular motion. I am inspired by the Japanese Buddhist tradition of Obon, a season of welcoming back and celebrating the dead through song and dance, performed in concentric circles. As we walk, may we meditate on the ways we can enact change in our day to day, beginning with the ways we take care of ourselves, and extending that nurturing to others.",
        ],
      },
      {
        title: "About the firing process",
        paragraphs: [
          "Each of the sculptures were fired in a Japanese style anagama kiln, which requires eight days of stoking wood, two people constantly on shift to sustain the fire to increasingly hot temperatures, and another week of cooling the kiln. The alchemical process of firing clay with wood creates a natural glaze through the ash in the kiln. We learn when to stoke the kiln by listening to the sounds of the chimney and watching the flame turn to a specific shade of orange. From splitting and stacking wood, to spending three days loading the kiln, the physical labor and attention the firing requires transforms us to center the kiln as our heart for the week. This process relies on a team of people to continue the fire, and our evenings are spent sharing meals together, potluck style, as friends, family, and neighbors stop by. Deep gratitude to my teachers Nick Schuartz and Jessica Thompson for welcoming me into Cider Creek Collective and guiding me through the firing processes. Thank you to Emma, David, Sam, and Wolf for your knowledge sharing, support, and camaraderie in loading and firing the kilns.",
        ],
      },
      {
        title: "Mediums",
        paragraphs: [
          "Stoneware clay, mixture of wild clay harvested from Salmon Creek, residing on Pomo land, with ball clay. Wood fired in an anagama kiln at Cider Creek Collective. Naturally glazed by the ash produced in the kiln.",
        ],
      },
    ],
  },
  {
    id: "jon-chen",
    name: "Jon Chen",
    tagline: "Artist\nQuantum Friend",
    reelVideoSrc: "/videos/Jon.mp4",
    reelVideoBox: "portrait",
    sections: [
      {
        paragraphs: [
          "Jon Chen is an artist and “Quantum Friend” whose practice challenges separations between technology, humanity, and nature. Their work seeks pathways toward harmonious co-existence in a moment defined by climate crisis, disconnection, and apathy. Rooted in wonder, they treat play as a radical tool for building toward these futures.",
          "Their ongoing exploration, ANY, is a digital creative ecosystem that oscillates between platform, tool, and artist network—aimed at liberating 21st-century creative tools and human attention to support dreaming and world-building that flows between the individual and collective.",
          "Grafted onto this is an interconnected web of modular “earthen-ware” sculptures grounded in a Chinese American mythopoetic lineage and reaching toward an emergent, decolonized U.S. mythos inspired by indigenous reclamation—recentering ourselves within an already-present, ever-shifting tapestry of cultural constellations guided by a wind older than memory.",
          "Influenced by the 2000s internet, fantasy and sci-fi RPG video games, and the mysteries of both micro and macro natural worlds, Jon’s work cultivates language, structures, and stories capable of holding our growing planetary and technological complexity. Their practice is balanced by an embodied knowing that brings coherence and clarity to these turbulent waters.",
          "Jon holds a BFA in Sculpture with a concentration in CTC (Computation, Technology, and Culture) from the Rhode Island School of Design. Their collaborative work has explored historical justice, Black cultural archives, immersive story-telling, ecological interaction design, and well-being through creative play, with contributions to the Emmett Till Memory Project, The Black Press @ 200, NYT R&D Team, Restor.eco, and Culture Therapy. Together, these and many other experiences have taught them that grief and joy often share the same flame.",
          "At heart, they remain a sun-kissed, whimsical spirit, tending a Mango Tree, where she plays beside and he dreams beneath, all held gently by the wisdom of the moon.",
        ],
      },
      {
        title: "Bixi: A Mythic Interface",
        paragraphs: [
          "Bixi rises from the longing to renew a shared mythos, one soft enough to hold our era’s grief and bright enough to hold its possibility. It began as a personal return to Chinese ancestry, tracing some of my most natural pathways in the creatures of fable from my childhood.",
          "Among these stories, Bixi appeared, child of the Dragon King. Depicted in carved stone, the Dragon Turtle carries tall steles meant to hold the weight of memory. In this work, Bixi is reimagined as a traveling spirit and a metaphor for immigration. Bixi metamorphosizes into a World Turtle, part of the ever-shifting Axis Mundi, the Navel of the World, and becomes a protector, a listener, and a wayfinder.",
          "Part clay, sound, and computer, this ecosystem of an art piece blends between realities of becoming. Embracing an emergent reality, its materiality bridges the digital, physical, and spiritual worlds, where each realm is invited to reach into and out of the others.",
          "Paired with this is The Tale of Bixi, a comic created in collaboration with Billy Theodosados. It shares a creation story as a metaphor for our times, paired with glimpses of a future where structure, culture, and ritual have led us back to our hearts.",
          "My hope is for Bixi to serve as a moving home for the many, calling upon stories of the past and forgotten, to help us remember and steward a more loving, peaceful, free, and playful dream together.",
        ],
      },
    ],
  },
  {
    id: "jenn-ban",
    name: "Jenn Ban",
    tagline: "she/they\nOhlone Territory (San Francisco)",
    reelVideoSrc: "/videos/Jenn.mp4",
    reelVideoBox: "portrait",
    sections: [
      {
        paragraphs: [
          "Jenn Ban (she/they) is a Mother, Filipinx-American multidisciplinary artist, Reiki master-teacher, tattoo artist, world builder and cultural-community organizer currently living in Ohlone Territory (San Francisco). Their artwork focuses on the themes of nature, self evolution and soul transcendence through exploration of art, healing, and community organizing. Their work spans from tattoos, soft-sculptures, paintings, film, soundscapes, workshops, and curation.",
          "Jenn’s work has been featured in the Asian Art Museum in San Francisco, Yerba Buena Center for the Arts, and in galleries across the Bay Area, Florida, Europe, and the Philippines. They’re the co-founder and Community Arts Director of Bituin Studio, a Filipinx-inspired Body Art shop, Art Gallery, and Community Space located in San Francisco's Filipino Historical District (SOMA).",
          "In this residency, Jenn is exploring the becoming of motherhood with her baby, Amansi Jude “Juju”. As a mother and living artist, Jenn’s practice incorporates ways of being with Juju. How mother and child are one and the remembrance that children can co-exist in our day to day living.",
        ],
      },
      {
        title: "Links",
        paragraphs: ["@jenn.ban · @sacredskinadornments · @bituinstudio"],
      },
      {
        title: "living medicine: the bridge between womb and world, 2025",
        paragraphs: [
          "fabric, my postpartum hair, thread, capiz shells · oscillating electric fan · film: moments of breastfeeding",
          "Remembering what a home is, so that they may build their world from that safe space. I give my blood which alchemizes into milk to nourish my baby. This milk that carries stem cells, anti-inflammatory and cancer-killing cells, and sugars (some of which science has not named yet) to build my baby’s body. Each feed, flooding my brain with oxytocin which softens my nervous system and brings safety between me and my baby. The original neurological regulation tool. This milk constantly adjusting, developing antibodies, to match my evolving baby’s needs. Providing cortisol in the AM and melatonin in the PM, developing my baby's biological clock.",
          "Data is exchanged with every latch — an ancient conversation between my body and my baby’s body. This latch strengthens their jaw muscles, speech development, and facial structure. I didn’t understand before, but now I remember. My mind. My body. My heart. Completely rewired. An offering to new-life, to building a safer world.",
        ],
      },
      {
        title: "Imagery",
        paragraphs: [
          "Imagery of breast anatomy, specifically milk glands, handsewn with Jenn’s postpartum hair onto green sheer fabric. Capiz shells from the Philippines reflecting expressed breast milk. Oscillating electric fan blowing movement into the fabric, promoting a delicate chime from the capiz shells. A short film looping zoomed in magical moments of breastfeeding.",
        ],
      },
    ],
  },
];

/** Curator credit — same shape as `Artist` for shared profile UI. */
export const CURATOR: Artist = {
  id: "hamsa-fae",
  name: "Hamsa Fae",
  tagline: "Curator",
  reelVideoSrc: "/videos/Hamsa.mp4",
  reelVideoPoster: "/images/reels/hamsa-poster.jpg",
  reelVideoBox: "portrait",
  sections: [],
};

export function getArtistById(id: string): Artist | undefined {
  return ARTISTS.find((a) => a.id === id);
}

export function getCreditProfile(id: string): Artist | undefined {
  return getArtistById(id) ?? (id === CURATOR.id ? CURATOR : undefined);
}
