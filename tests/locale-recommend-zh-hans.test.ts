import assert from "node:assert/strict";
import { test } from "node:test";
import { getMessages } from "../i18n/messages";

test("zh-Hans Accept-Language soft prompt copy is Chinese", () => {
  const zh = getMessages("zh-Hans");
  const en = getMessages("en");
  assert.notEqual(zh.localeRecommendTitle, en.localeRecommendTitle);
  assert.match(zh.localeRecommendTitle, /语言|選擇|选择/);
  assert.match(zh.localeRecommendBody, /浏览器|瀏覽器|\{lang\}/);
  assert.match(zh.localeRecommendAccept, /使用|\{lang\}/);
  assert.match(zh.localeRecommendDismiss, /不用|稍后|暫時|暂时/);
  assert.equal("localeRecommendStay" in zh, false);
});
