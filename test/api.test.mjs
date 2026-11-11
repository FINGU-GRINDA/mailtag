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
  // 지금 쓰는 다른 메일 종류는 리드가 아니다
  for (const source of ["rinda_campaign", "personal", "nudge", "welcome", "letter", "release"]) {
    assert.equal(m.isLeadMailUtm({ source, medium: "email", campaign: "nudge" }), false, source)
  }
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

test("followupCompanySlug — 웹메일이면 브랜드 영문명, 브랜드가 없으면 null", () => {
  for (const d of ["gmail.com", "googlemail.com", "naver.com", "daum.net", "hanmail.net", "kakao.com", "nate.com",
    "outlook.com", "hotmail.com", "live.com", "msn.com", "yahoo.co.jp", "icloud.com", "me.com", "mac.com", "aol.com",
    "proton.me", "protonmail.com", "gmx.de", "yandex.ru", "qq.com", "163.com", "126.com"]) {
    assert.equal(m.followupCompanySlug({ email: `x@${d}` }), null, d)
    assert.equal(m.followupCompanySlug({ email: `x@${d}`, brand: "Glow Barrier" }), "glow_barrier", d)
  }
  // 회사 도메인이 있으면 브랜드보다 도메인이 먼저다
  assert.equal(m.followupCompanySlug({ email: "kim@acme.co.kr", brand: "Other" }), "acme")
  // 주소가 없어도 브랜드가 있으면 쓴다
  assert.equal(m.followupCompanySlug({ email: null, brand: "Acme" }), "acme")
  // 한글 브랜드만 있으면 태그하지 않는다
  assert.equal(m.followupCompanySlug({ email: "x@naver.com", brand: "글로우" }), null)
  assert.equal(m.WEBMAIL_LABELS.has("gmail"), true)
})

test("followupCompanySlug — 못 읽으면 null", () => {
  assert.equal(m.followupCompanySlug({ email: null }), null)
  assert.equal(m.followupCompanySlug({ email: "" }), null)
  assert.equal(m.followupCompanySlug({ email: "no-at-sign" }), null)
  assert.equal(m.followupCompanySlug({ email: "a@localhost" }), null)
  assert.equal(m.followupCompanySlug({}), null)
})

test("MAIL_KIND_LABEL — 메일 종류마다 이름이 하나씩", () => {
  assert.deepEqual(Object.keys(m.MAIL_KIND_LABEL).sort(), Object.keys(m.MAIL_KIND_SOURCE).sort())
  assert.equal(m.MAIL_KIND_LABEL.nudge, "넛지 메일")
  // 옛 값도 이름까지 한 번에: system → nudge → 넛지 메일
  assert.equal(m.MAIL_KIND_LABEL[m.mailKindOf({ source: "system", campaign: "billing_grace", slugs: [] })], "넛지 메일")
})

test("personalReason — 들어온 경로 → 담당자 1:1 메일 보낸 이유", () => {
  assert.equal(m.personalReason({}), "from_campaign")
  assert.equal(m.personalReason({ inflow: "coldmail" }), "from_campaign")
  assert.equal(m.personalReason({ inflow: "voucher" }), "voucher")
  assert.throws(() => m.personalReason({ inflow: "박람회" }))
  assert.equal(
    m.mailTagUrl({ kind: "personal", url: "https://rinda.ai/", campaign: m.personalReason({ inflow: "fair" }), term: "signature", recipient: "r1" }),
    "https://rinda.ai/?rid=r1&utm_source=personal&utm_medium=email&utm_campaign=fair&utm_term=signature",
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
  // 옛 슬러그로 시작하는 새 캠페인명은 팔로업이 아니다 — 날짜 8자리만 뒤에 올 수 있다
  assert.equal(m.isLegacyFollowupContent({ content: "initech_jp_20261016", slugs }), false)
  assert.equal(m.isLegacyFollowupContent({ content: "initech_2026", slugs }), false)
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
    m.mailTagUrl({ kind: "personal", url: "https://rinda.ai/", campaign: "inbound", recipient: null }),
    "https://rinda.ai/?utm_source=personal&utm_medium=email&utm_campaign=inbound",
  )
})

test("checkEmailUtm — 자리 규칙", () => {
  const ok = m.mailTagUrl({ kind: "letter", url: "https://rinda.ai/", campaign: "20261015", term: "main_home", id: "nl" })
  assert.deepEqual(m.checkEmailUtm(`<a data-mds="main" href="${ok.replace(/&/g, "&amp;")}">x</a>`), [])
  assert.equal(m.checkEmailUtm(`<a data-mds="sub" href="${ok}">x</a>`).length, 1)
  assert.equal(m.checkEmailUtm(`<a data-mds="unsubscribe" href="${ok}">x</a>`).length, 1)
  assert.equal(m.checkEmailUtm(`<a data-mds="main" href="https://rinda.ai/">x</a>`).length, 1)
  assert.equal(m.mailTagErrors(new URL("https://rinda.ai/?utm_medium=email&utm_source=letter&utm_campaign=x")).length, 1)
  assert.deepEqual(m.mailTagErrors(new URL("https://rinda.ai/?a=1")), [])
})

test("isKstDateStamp — 8자리이면서 달력에 있는 날", () => {
  assert.equal(m.isKstDateStamp("20261015"), true)
  assert.equal(m.isKstDateStamp("20240229"), true)
  assert.equal(m.isKstDateStamp("20250229"), false)
  assert.equal(m.isKstDateStamp("20261399"), false)
  assert.equal(m.isKstDateStamp("2026-10-15"), false)
  assert.equal(m.isKstDateStamp(null), false)
})

test("checkEmailUtm — 바이어에게 가는 메일·받는 사람·옛 값", () => {
  const ok = "https://rinda.ai/?utm_source=rinda_campaign&utm_medium=email&utm_campaign=kr_food_buyer_0421&utm_term=pricing"
  assert.deepEqual(m.checkEmailUtm(`<a href='${ok}'>x</a>`), [])
  const personal = "https://rinda.ai/?rid=r1&utm_source=personal&utm_medium=email&utm_campaign=inbound&utm_term=signup"
  assert.deepEqual(m.checkEmailUtm(`<a href="${personal}">x</a>`), [])
  // rid 는 UTM 앞, personal 에만
  assert.equal(m.checkEmailUtm(`<a href="https://rinda.ai/?utm_source=personal&utm_medium=email&utm_campaign=inbound&rid=r1">x</a>`).length, 1)
  assert.equal(m.checkEmailUtm(`<a href="https://rinda.ai/?rid=r1&${ok.split("?")[1]}">x</a>`).length, 1)
  assert.equal(m.checkEmailUtm(`<a href="${personal}&utm_id=x">x</a>`).length, 1)
  // 옛 값으로 새로 보내지 않는다
  for (const old of [
    "https://rinda.ai/?utm_source=email&utm_medium=email&utm_campaign=coldmail&utm_content=kbeauty_jp_20261015",
    "https://app.rinda.ai/?utm_source=system&utm_medium=email&utm_campaign=billing_grace&utm_term=txt_billing&utm_id=s1",
    "https://app.rinda.ai/?utm_source=lifecycle&utm_medium=email&utm_campaign=trial_ending_1day&utm_term=main_upgrade&utm_id=n1",
  ]) {
    assert.equal(m.checkEmailUtm(`<a href="${old}">x</a>`).length, 1, old)
  }
  // medium 은 email
  assert.equal(m.checkEmailUtm(`<a href='https://rinda.ai/?utm_source=rinda_campaign&utm_medium=newsletter&utm_campaign=a'>x</a>`).length, 1)
  // 제품 메일은 utm_id 가 없어도 된다
  assert.deepEqual(m.checkEmailUtm(`<a href="https://app.rinda.ai/?utm_source=nudge&utm_medium=email&utm_campaign=trial_ending_1day&utm_term=main_upgrade">x</a>`), [])
})

test("옛 1:1 팔로업 유입 경로 읽기", () => {
  assert.equal(m.followupInflow("followup"), "coldmail")
  assert.equal(m.followupInflow("followup_voucher"), "voucher")
  assert.equal(m.followupInflow("Followup_Fair"), "fair")
  assert.equal(m.followupInflow("coldmail"), null)
  assert.equal(m.followupInflow("followupx"), null)
  assert.equal(m.isSalesFollowupMail({ source: "email", campaign: "followup_voucher", slugs: [] }), true)
  assert.equal(m.isSalesFollowupMail({ source: "personal", campaign: "inbound", slugs: [] }), true)
  assert.equal(m.isSalesFollowupMail({ source: "letter", campaign: "followup_voucher", slugs: [] }), false)
})

test("mailKindOf — 새 값은 그대로, 옛 값은 지금 종류로 묶는다", () => {
  const slugs = ["globex"]
  const k = (source, campaign, content, medium = "email") => m.mailKindOf({ source, medium, campaign, content, slugs })
  assert.equal(k("rinda_campaign", "kr_food_buyer_0421"), "rinda_campaign")
  assert.equal(k("personal", "inbound"), "personal")
  assert.equal(k("nudge", "trial_ending_1day"), "nudge")
  assert.equal(k("letter", "20261015"), "letter")
  assert.equal(k("system", "billing_grace"), "nudge")
  assert.equal(k("Lifecycle", "trial_ending_1day"), "nudge")
  assert.equal(k("email", "coldmail", "kbeauty_jp_20261015"), "rinda_campaign")
  assert.equal(k("email", null), "rinda_campaign")
  assert.equal(k("email", "followup_voucher", "acme_20261020"), "personal")
  assert.equal(k("email", "coldmail", "globex"), "personal")
  assert.equal(k("free-tool-email", null, null, null), "lead")
  assert.equal(k("downloads", "nudge"), "lead")
  // 2026-10-15 이전 제품 메일(source=email + 메일 종류·넛지 키)은 콜드메일이 아니라 그 종류
  assert.equal(k("email", "newsletter"), "letter")
  assert.equal(k("email", "update news"), "release")
  assert.equal(k("email", "welcome"), "welcome")
  assert.equal(k("email", "nudge"), "nudge")
  assert.equal(k("email", "Weekly_Digest"), "nudge")
  assert.equal(k("email", "trial_ending_1day"), "nudge")
  // 링크에서 온 값이라 상속 키가 들어와도 종류가 아닌 값을 돌려주지 않는다
  assert.equal(k("email", "constructor"), "rinda_campaign")
  assert.equal(k("email", "__proto__"), "rinda_campaign")
  assert.equal(k("email", "toString"), "rinda_campaign")
  assert.equal(k("google", "brand", null, "cpc"), null)
  assert.equal(k(null, null), null)
})

test("personalReasonOf — 새 값·옛 값에서 보낸 이유 읽기", () => {
  assert.equal(m.personalReasonOf({ source: "personal", campaign: "Inbound" }), "inbound")
  assert.equal(m.personalReasonOf({ source: "email", campaign: "followup" }), "from_campaign")
  assert.equal(m.personalReasonOf({ source: "email", campaign: "followup_voucher" }), "voucher")
  assert.equal(m.personalReasonOf({ source: "email", campaign: "coldmail" }), null)
  assert.equal(m.personalReasonOf({ source: "nudge", campaign: "inbound" }), null)
})

test("바이어에게 가는 메일 term — 접두어 없음, 옛 값은 읽을 때 접두어를 뗀다", () => {
  assert.equal(m.isPositionTerm("txt_signup"), true)
  assert.equal(m.isPositionTerm("bnr_a"), true)
  assert.equal(m.isPositionTerm("signup"), false)
  assert.equal(m.salesTermName("txt_signature"), "signature")
  assert.equal(m.salesTermName("main_trial"), "trial")
  assert.equal(m.salesTermName("signup"), "signup")
  assert.equal(m.salesTermName(null), "")
  const prefixed = "https://app.rinda.ai/?utm_source=personal&utm_medium=email&utm_campaign=fair&utm_term=txt_signup"
  assert.equal(m.checkEmailUtm(`<a href="${prefixed}">x</a>`).length, 1)
  const ok = "https://app.rinda.ai/?utm_source=personal&utm_medium=email&utm_campaign=fair&utm_term=signup"
  assert.deepEqual(m.checkEmailUtm(`<a href="${ok}">x</a>`), [])
  // 제품 메일은 자리 접두어를 그대로 쓴다
  assert.equal(m.mailTagUrl({ kind: "letter", url: "https://rinda.ai/", campaign: "20261020", term: "main_home", id: "nl" }).includes("utm_term=main_home"), true)
})
