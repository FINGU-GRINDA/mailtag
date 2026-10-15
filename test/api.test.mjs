// golden 밖 규칙 — 받는 쪽 판정(리드·팔로업), 슬러그·날짜, 자리 이름, 게이트.
import assert from "node:assert/strict"
import { test } from "node:test"
import * as m from "../dist/index.js"

test("isLeadMailUtm — 새 값", () => {
  assert.equal(m.isLeadMailUtm({ source: "lead", medium: "email", campaign: "leadmagnet" }), true)
  assert.equal(m.isLeadMailUtm({ source: "lead", medium: "email", campaign: null }), true)
  assert.equal(m.isLeadMailUtm({ source: "x", medium: "email", campaign: "freetool_hs_code_finder" }), true)
})

test("isLeadMailUtm — 같은 날 잠깐 나간 값·이전 랜딩 값", () => {
  assert.equal(m.isLeadMailUtm({ source: "lifecycle", medium: "email", campaign: "lead_magnet" }), true)
  assert.equal(m.isLeadMailUtm({ source: "lifecycle", medium: "email", campaign: "free_tool_hs_code" }), true)
  assert.equal(m.isLeadMailUtm({ source: "free-tool-email", medium: null, campaign: null }), true)
  assert.equal(m.isLeadMailUtm({ source: "prompts-500-email", medium: "nudge", campaign: "x" }), true)
  assert.equal(m.isLeadMailUtm({ source: "downloads-email", medium: "nudge", campaign: null }), true)
  // -email 이지만 medium 이 nudge 가 아니면 리드 아님
  assert.equal(m.isLeadMailUtm({ source: "prompts-500-email", medium: "email", campaign: "x" }), false)
})

test("isLeadMailUtm — campaign=nudge 이면서 source 가 email 이 아닌 값(옛 자료 넛지)", () => {
  for (const source of ["downloads", "beauty-guide", "prompts-500", "japan-buyer-prompts"]) {
    assert.equal(m.isLeadMailUtm({ source, medium: "email", campaign: "nudge" }), true, source)
  }
  // 대소문자·공백은 걷어 비교한다
  assert.equal(m.isLeadMailUtm({ source: " Downloads ", medium: "Email", campaign: "NUDGE" }), true)
})

test("isLeadMailUtm — 리드가 아닌 값", () => {
  // source=email ∧ campaign=nudge 는 옛 제품 메일(넛지)
  assert.equal(m.isLeadMailUtm({ source: "email", medium: "email", campaign: "nudge" }), false)
  // source 가 비면 판정 근거가 없다
  assert.equal(m.isLeadMailUtm({ source: null, medium: "email", campaign: "nudge" }), false)
  assert.equal(m.isLeadMailUtm({ source: "", medium: null, campaign: "nudge" }), false)
  assert.equal(m.isLeadMailUtm({ source: "email", medium: "email", campaign: "coldmail" }), false)
  assert.equal(m.isLeadMailUtm({ source: "letter", medium: "email", campaign: "20261015" }), false)
  assert.equal(m.isLeadMailUtm({ source: "google", medium: "cpc", campaign: "brand" }), false)
  assert.equal(m.isLeadMailUtm({ source: null, medium: null, campaign: null }), false)
})

test("followupCompanySlug — 회사 도메인", () => {
  const f = (email) => m.followupCompanySlug({ email })
  assert.equal(f("kim@acme.co.kr"), "acme")
  assert.equal(f("kim@mail.acme.co.kr"), "acme")
  assert.equal(f("Kim <kim@Acme-Tech.com>"), "acme_tech")
  assert.equal(f("a@www.example.com.au"), "example")
  assert.equal(f("a@example.ne.jp"), "example")
  assert.equal(f("a@sub.example.io"), "example")
})

test("followupCompanySlug — 웹메일 목록은 webmail", () => {
  for (const d of ["gmail.com", "googlemail.com", "naver.com", "daum.net", "hanmail.net", "kakao.com", "nate.com",
    "outlook.com", "hotmail.com", "live.com", "msn.com", "yahoo.co.jp", "icloud.com", "me.com", "mac.com", "aol.com",
    "proton.me", "protonmail.com", "gmx.de", "yandex.ru", "qq.com", "163.com", "126.com"]) {
    assert.equal(m.followupCompanySlug({ email: `x@${d}` }), "webmail", d)
  }
  assert.equal(m.WEBMAIL_LABELS.has("gmail"), true)
})

test("followupCompanySlug — 못 읽으면 null", () => {
  assert.equal(m.followupCompanySlug({ email: null }), null)
  assert.equal(m.followupCompanySlug({ email: "" }), null)
  assert.equal(m.followupCompanySlug({ email: "no-at-sign" }), null)
  assert.equal(m.followupCompanySlug({ email: "a@localhost" }), null)
  assert.equal(m.followupCompanySlug({}), null)
})

test("followupCompanySlug 결과로 followup 링크를 만든다", () => {
  const company = m.followupCompanySlug({ email: "kim@acme.co.kr" })
  assert.equal(
    m.followupTagUrl({ url: "https://rinda.ai/", company, sendDate: "20261015", term: "txt_signature" }),
    "https://rinda.ai/?utm_source=email&utm_medium=email&utm_campaign=followup&utm_content=acme_20261015&utm_term=txt_signature",
  )
})

test("companyUtmSlug — 메일 도메인 → 웹사이트 → 영문 이름 → id", () => {
  assert.equal(m.companyUtmSlug({ id: "1", name: "x", email: "a@acme.co.kr" }), "acme")
  assert.equal(m.companyUtmSlug({ id: "1", name: "x", email: "a@gmail.com", website: "https://www.globex.com/en" }), "globex")
  assert.equal(m.companyUtmSlug({ id: "1", name: "Initech Co.", email: "a@naver.com" }), "initech_co")
  assert.equal(m.companyUtmSlug({ id: "9f8e7d6c-1234", name: "가나다" }), "c_9f8e7d6c")
  assert.equal(m.companyUtmSlug({ id: "", name: "가나다" }), "c_unknown")
})

test("kstDateStamp — 네 가지 호출 모양", () => {
  const at = Date.UTC(2026, 9, 14, 15, 30) // KST 10/15 00:30
  assert.equal(m.kstDateStamp(new Date(at)), "20261015")
  assert.equal(m.kstDateStamp(at), "20261015")
  assert.equal(m.kstDateStamp({ atMs: at }), "20261015")
  assert.equal(m.kstDateStamp(new Date(Date.UTC(2026, 9, 14, 14, 59))), "20261014")
  assert.match(m.kstDateStamp(), /^\d{8}$/)
})

test("toUtmSlug", () => {
  assert.equal(m.toUtmSlug("prompts-500-ko"), "prompts_500_ko")
  assert.equal(m.toUtmSlug("  HS Code Finder! "), "hs_code_finder")
  assert.equal(m.toUtmSlug("대흥"), "")
  assert.equal(m.toUtmSlug(null), "")
})

test("옛 팔로업 판정 — 슬러그 목록은 인자로 받는다", () => {
  // 실제 목록은 소비 레포에 있다. 여기서는 가짜 이름으로 규칙만 본다.
  const slugs = ["acme", "globex", "initech"]
  assert.equal(m.isLegacyFollowupContent({ content: "initech", slugs }), true)
  assert.equal(m.isLegacyFollowupContent({ content: "Initech_20261001", slugs }), true)
  assert.equal(m.isLegacyFollowupContent({ content: "initechx", slugs }), false)
  assert.equal(m.isLegacyFollowupContent({ content: null, slugs }), false)
  assert.equal(m.isLegacyFollowupContent({ content: "acme", slugs: [] }), false)
  assert.equal(m.isLegacyFollowupContent({ content: "_x", slugs: [""] }), false)
  assert.equal(m.isSalesFollowupMail({ source: "email", campaign: "followup", slugs: [] }), true)
  assert.equal(m.isSalesFollowupMail({ source: "email", campaign: "coldmail", content: "globex", slugs }), true)
  assert.equal(m.isSalesFollowupMail({ source: "email", campaign: "coldmail", content: "kbeauty_jp_20261015", slugs }), false)
  assert.equal(m.isSalesFollowupMail({ source: "letter", campaign: "followup", slugs }), false)
  assert.equal(m.isLegacyFollowupArrival({ source: "email", campaign: "coldmail", content: "acme", slugs }), true)
  assert.equal(m.isLegacyFollowupArrival({ source: "email", campaign: "followup", content: "acme_20261015", slugs }), false)
  assert.equal("LEGACY_FOLLOWUP_SLUGS" in m, false)
})

test("mailTerm · 자리 이름", () => {
  assert.equal(m.mailTerm.main("trial"), "main_trial")
  assert.equal(m.mailTerm.bnr(), "bnr")
  assert.equal(m.mailTerm.bnr("a"), "bnr_a")
  assert.equal(m.mailTermName("RINDA 시작하기"), "rinda")
  assert.equal(m.mailTermNameFromUrl("https://app.rinda.ai/"), "home")
  assert.equal(m.mailTermNameFromUrl("https://rinda.ai/blog/find-buyers/12345"), "find_buyers")
  assert.equal(m.mailTermNameFromUrl("not a url"), "link")
  assert.equal(m.isLegacyPositionContent("main_home"), true)
  assert.equal(m.isLegacyPositionContent("partners_link_a"), false)
})

test("mailTagUrl — null 은 빈 값", () => {
  assert.equal(
    m.mailTagUrl({ kind: "letter", url: "https://rinda.ai/", campaign: "20261015", content: null, term: null, id: "nl" }),
    "https://rinda.ai/?utm_source=letter&utm_medium=email&utm_campaign=20261015&utm_id=nl",
  )
  assert.equal(
    m.coldmailTagUrl({ url: "https://rinda.ai/", campaignName: "kbeauty_jp", sendDate: "20261015" }),
    "https://rinda.ai/?utm_source=email&utm_medium=email&utm_campaign=coldmail&utm_content=kbeauty_jp_20261015",
  )
})

test("checkEmailUtm — 자리 규칙", () => {
  const ok = m.mailTagUrl({ kind: "letter", url: "https://rinda.ai/", campaign: "20261015", term: "main_home", id: "nl" })
  assert.deepEqual(m.checkEmailUtm(`<a data-mds="main" href="${ok.replace(/&/g, "&amp;")}">x</a>`), [])
  assert.equal(m.checkEmailUtm(`<a data-mds="sub" href="${ok}">x</a>`).length, 1)
  assert.equal(m.checkEmailUtm(`<a data-mds="unsubscribe" href="${ok}">x</a>`).length, 1)
  assert.equal(m.checkEmailUtm(`<a data-mds="main" href="https://rinda.ai/">x</a>`).length, 1)
  assert.ok(m.mailTagErrors(new URL("https://rinda.ai/?utm_medium=email&utm_source=letter&utm_campaign=x")).length >= 2)
  assert.deepEqual(m.mailTagErrors(new URL("https://rinda.ai/?a=1")), [])
})
