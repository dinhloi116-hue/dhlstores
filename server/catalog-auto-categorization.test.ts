import { describe, expect, it } from "vitest";
import {
  CLUB_PLAYER_CATEGORY,
  NATIONAL_TEAM_PLAYER_CATEGORY,
  isNationalTeamPlayerProduct,
  isPlayerProduct,
} from "./catalogAutoCategorization";

describe("catalog auto categorization", () => {
  it("recognizes national-team player names", () => {
    expect(isPlayerProduct("Áo Bóng Đá Argentina Messi Last Dance 2024 Bản Player")).toBe(true);
    expect(isNationalTeamPlayerProduct("Áo Bóng Đá Argentina Messi Last Dance 2024 Bản Player")).toBe(true);
  });

  it("routes a player club name to the club bucket, not national teams", () => {
    expect(isPlayerProduct("Bộ Quần Áo Bóng Đá Real Madrid 2026 Player")).toBe(true);
    expect(isNationalTeamPlayerProduct("Bộ Quần Áo Bóng Đá Real Madrid 2026 Player")).toBe(false);
    expect(CLUB_PLAYER_CATEGORY.slug).toBe("ao-player-clb");
  });

  it("does not classify ordinary products as player jerseys", () => {
    expect(isPlayerProduct("Bộ Quần Áo Bóng Đá Real Madrid 2026")).toBe(false);
    expect(isNationalTeamPlayerProduct("Bộ Quần Áo Bóng Đá Real Madrid 2026")).toBe(false);
    expect(NATIONAL_TEAM_PLAYER_CATEGORY.type).toBe("physical");
  });
});
