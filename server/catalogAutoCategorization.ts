const NATIONAL_TEAM_NAMES = [
  "argentina", "argentine", "áo argentina", "vietnam", "viet nam", "việt nam", "portugal", "bồ đào nha",
  "brazil", "brazilian", "brasil", "france", "pháp", "spain", "tây ban nha", "germany", "đức",
  "england", "anh", "italy", "ý", "netherlands", "hà lan", "belgium", "bỉ", "croatia",
  "japan", "nhật bản", "korea", "hàn quốc", "mexico", "mexic", "usa", "united states", "mỹ",
  "uruguay", "colombia", "chile", "ecuador", "morocco", "ma-rốc", "senegal", "switzerland", "thụy sĩ",
  "australia", "úc", "canada", "scotland", "thổ nhĩ kỳ", "turkey", "china", "trung quốc",
];

export const NATIONAL_TEAM_PLAYER_CATEGORY = {
  name: "Áo Player Đội Tuyển Quốc Gia",
  nameEn: "National Team Player Jerseys",
  slug: "ao-player-doi-tuyen-quoc-gia",
  description: "Áo player của các đội tuyển quốc gia, có thể chọn in tên số.",
  descriptionEn: "Player jerseys for national teams, with optional name and number printing.",
  iconKey: "Shirt",
  type: "physical" as const,
  isActive: true,
};

export const CLUB_PLAYER_CATEGORY = {
  name: "Áo Player CLB",
  nameEn: "Club Player Jerseys",
  slug: "ao-player-clb",
  description: "Áo player của các câu lạc bộ bóng đá, có thể chọn in tên số.",
  descriptionEn: "Player jerseys for football clubs, with optional name and number printing.",
  iconKey: "Shirt",
  type: "physical" as const,
  isActive: true,
};

export function isPlayerProduct(name?: string, nameEn?: string) {
  const haystack = `${name ?? ""} ${nameEn ?? ""}`.toLocaleLowerCase();
  return /\bplayer\b|bản\s*player|áo\s*player/.test(haystack);
}

export function isNationalTeamPlayerProduct(name?: string, nameEn?: string) {
  const haystack = `${name ?? ""} ${nameEn ?? ""}`.toLocaleLowerCase();
  return isPlayerProduct(name, nameEn) && NATIONAL_TEAM_NAMES.some(country => haystack.includes(country));
}
