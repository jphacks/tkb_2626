export const GENRE_LABEL: Record<string, string> = { DRINK: "飲み会", LUNCH: "ランチ", CAMP: "合宿", STUDY: "勉強会" };
export const GENRE_ICON_SMALL: Record<string, string> = {
  DRINK: "/figma/genre-drink.svg",
  LUNCH: "/figma/genre-lunch.svg",
  CAMP: "/figma/genre-camp.svg",
  STUDY: "/figma/genre-study.svg",
};
// ランチだけ黄色、ほかは緑の下地（Figma のジャンルタイル）
export const genreTileBg = (genre: string | null) => (genre === "LUNCH" ? "bg-accent-soft" : "bg-brand-soft");
