/**
 * Human-QA lock for Southern Africa + ASEAN langPanelNoMatches copy quality.
 *
 *   npx tsx --test tests/lang-panel-no-matches-sa-asean.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const EXPECTED: Record<string, string> = {
  af: "Geen treffers nie",
  zu: "Akukho okutholakele",
  xh: "Akukho ziphumo zifumanekayo",
  ss: "Akukho lokufanako",
  ve: "A huna zwezwi zwifanaho",
  ts: "A ku na swo fambelana",
  nr: "Akukho okutholakala",
  nso: "Ga go na dipoelo",
  st: "Ha ho na liphetho",
  tn: "Ga go na diphitlhelelo",
  th: "ไม่พบภาษาที่ตรงกับคำค้น",
  vi: "Không có ngôn ngữ khớp",
  id: "Tidak ada bahasa yang cocok",
  ms: "Tiada bahasa sepadan",
  fil: "Walang tumugmang wika",
  km: "គ្មានភាសាត្រូវគ្នា",
  lo: "ບໍ່ພົບພາສາທີ່ກົງກັນ",
  my: "ရှာဖွေမှုနှင့် ကိုက်ညီသော ဘာသာစကား မရှိပါ",
  mi: "Kāore he reo e tutuki ana"
};

test("SA/ASEAN/Pacific langPanelNoMatches match curated copy", () => {
  for (const [id, expected] of Object.entries(EXPECTED)) {
    const bag = JSON.parse(readFileSync(`i18n/packs/${id}.json`, "utf8")) as {
      langPanelNoMatches?: string;
    };
    assert.equal(bag.langPanelNoMatches, expected, id);
    assert.notEqual(bag.langPanelNoMatches, "No matches", `${id} must not be EN stub`);
  }
});
