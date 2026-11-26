export interface AnimatedAvatar {
  id: string;
  label: string;
  category: "characters" | "robots" | "adventurers" | "emoji";
  url: string;
}

export const ANIMATED_AVATAR_PRESETS: AnimatedAvatar[] = [
  // 1. Postavičky (Avataaars & Lorelei)
  {
    id: "av_char_1",
    label: "Alex",
    category: "characters",
    url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex&backgroundColor=b6e3f4",
  },
  {
    id: "av_char_2",
    label: "Sofia",
    category: "characters",
    url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sofia&backgroundColor=ffd5dc",
  },
  {
    id: "av_char_3",
    label: "Oliver",
    category: "characters",
    url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver&backgroundColor=c0aede",
  },
  {
    id: "av_char_4",
    label: "Emma",
    category: "characters",
    url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma&backgroundColor=d1d4f9",
  },

  // 2. Roboti (Bottts)
  {
    id: "av_bot_1",
    label: "Cyber Bot",
    category: "robots",
    url: "https://api.dicebear.com/7.x/bottts/svg?seed=Sparky&backgroundColor=b6e3f4",
  },
  {
    id: "av_bot_2",
    label: "Neon Bot",
    category: "robots",
    url: "https://api.dicebear.com/7.x/bottts/svg?seed=Neon&backgroundColor=c0aede",
  },
  {
    id: "av_bot_3",
    label: "Gizmo",
    category: "robots",
    url: "https://api.dicebear.com/7.x/bottts/svg?seed=Gizmo&backgroundColor=ffdfbf",
  },
  {
    id: "av_bot_4",
    label: "Rust Bot",
    category: "robots",
    url: "https://api.dicebear.com/7.x/bottts/svg?seed=Rust&backgroundColor=ffd5dc",
  },

  // 3. Dobrodruzi (Adventurer)
  {
    id: "av_adv_1",
    label: "Hero Leo",
    category: "adventurers",
    url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Leo&backgroundColor=b6e3f4",
  },
  {
    id: "av_adv_2",
    label: "Ranger Mia",
    category: "adventurers",
    url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Mia&backgroundColor=ffd5dc",
  },
  {
    id: "av_adv_3",
    label: "Mage Lucas",
    category: "adventurers",
    url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Lucas&backgroundColor=c0aede",
  },
  {
    id: "av_adv_4",
    label: "Scout Zoe",
    category: "adventurers",
    url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Zoe&backgroundColor=d1d4f9",
  },

  // 4. Fun Emoji
  {
    id: "av_emo_1",
    label: "Happy Face",
    category: "emoji",
    url: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Happy&backgroundColor=ffdfbf",
  },
  {
    id: "av_emo_2",
    label: "Cool Smile",
    category: "emoji",
    url: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Cool&backgroundColor=b6e3f4",
  },
  {
    id: "av_emo_3",
    label: "Star Smile",
    category: "emoji",
    url: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Star&backgroundColor=ffd5dc",
  },
  {
    id: "av_emo_4",
    label: "Wink Face",
    category: "emoji",
    url: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Wink&backgroundColor=c0aede",
  },
];

const STYLES = ["avataaars", "bottts", "adventurer", "fun-emoji", "lorelei", "notionists"];
const PASTEL_BG = ["b6e3f4", "c0aede", "d1d4f9", "ffd5dc", "ffdfbf"];

export function getRandomAnimatedAvatar(category?: string): string {
  let style = STYLES[Math.floor(Math.random() * STYLES.length)];
  if (category === "robots") style = "bottts";
  else if (category === "adventurers") style = "adventurer";
  else if (category === "emoji") style = "fun-emoji";
  else if (category === "characters") style = Math.random() > 0.5 ? "avataaars" : "lorelei";

  const randomSeed = Math.random().toString(36).substring(2, 9);
  const bg = PASTEL_BG[Math.floor(Math.random() * PASTEL_BG.length)];
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${randomSeed}&backgroundColor=${bg}`;
}
