/**
 * 메일 링크 하나에 UTM 을 붙이는 규칙 — 이 패키지의 중심.
 *
 * | 축 | 값 |
 * |---|---|
 * | utm_source | 메일 종류(kind)로 정해진다 — `MAIL_KIND_SOURCE` |
 * | utm_medium | `email` 고정 |
 * | utm_campaign | 콜드메일 `coldmail`, 1:1 팔로업은 콜드메일 유입이면 `followup`·그 밖의 유입이면 `followup_<유입경로>`, 회차 메일은 `YYYYMMDD`, 그 밖은 메일 종류 키 |
 * | utm_content | 세일즈 메일은 `<이름>_<YYYYMMDD>`, 제품·리드 메일은 식별자(글 슬러그·A/B 변형·자료키) |
 * | utm_term | 제품·리드 메일은 링크 자리 — `main_<이름>`·`sub_<이름>`·`bnr`/`bnr_a`/`bnr_b`·`txt_<이름>`·`img_<이름>`. 세일즈 메일은 접두어 없는 이름(`signup`·`signature`) |
 * | utm_id | 제품·리드 메일의 맨 끝 희생 슬롯(`nl`·`u1`·`w3`·`n1`·`f1`…). 세일즈 메일은 금지 |
 *
 * 순서는 source→medium→campaign→content→term→id. 입력 주소에 있던 utm_* 는 지우고 다른 쿼리·fragment
 * 는 그대로 둔다. campaign·content·term·id 는 `^[a-z0-9_]+$` 만 — 한글·대문자가 섞이면 집계에서
 * 같은 링크가 여러 줄로 쪼개진다. 규칙 밖 값은 고쳐 붙이지 않고 던진다(조용히 고치면 집계가 몰래 갈린다).
 *
 * 파트너스 고객사 대행 콜드메일은 대상이 아니다 — 고객사 이름으로 나가는 메일이라 kind 에 없다.
 */

import { isPositionTerm } from "./term.js"

/** 메일 종류 → utm_source. coldmail·followup 은 세일즈 메일이라 source 가 `email` 이다. */
export const MAIL_KIND_SOURCE = {
  coldmail: "email",
  followup: "email",
  letter: "letter",
  release: "release",
  welcome: "welcome",
  lifecycle: "lifecycle",
  system: "system",
  lead: "lead",
} as const

export type MailKind = keyof typeof MAIL_KIND_SOURCE
/** 회원에게 가는 제품 메일 종류. */
export type ProductMailKind = Exclude<MailKind, "coldmail" | "followup" | "lead">

/** 제품 메일(utm_id 를 다는 회원 메일)의 utm_source 값. 가입 채널 집계도 이 목록을 쓴다. */
export const PRODUCT_MAIL_SOURCES: readonly string[] = [
  "letter",
  "release",
  "welcome",
  "lifecycle",
  "system",
]

/**
 * 비회원 리드 메일(랜딩 무료도구 결과·자료 다운로드)의 utm_source. 집계는 제품 메일과 따로 세지만,
 * 값 규칙은 제품 메일처럼 utm_id 를 맨 끝에 둔다.
 */
export const LEAD_MAIL_SOURCES: readonly string[] = ["lead"]

/** campaign·content·term·id 에 허용되는 값. */
export const MAIL_TAG_SAFE = /^[a-z0-9_]+$/
const SEND_DATE = /^\d{8}$/

/** KST 달력일 `YYYYMMDD` 인가 — 8자리이면서 실제 달력에 있는 날(20261399 ✗, 20240229 ✓). */
export function isKstDateStamp(value: string | null | undefined): boolean {
  const v = value ?? ""
  if (!SEND_DATE.test(v)) return false
  const y = Number(v.slice(0, 4))
  const m = Number(v.slice(4, 6))
  const d = Number(v.slice(6, 8))
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

/** UTM 축의 고정 순서. */
export const UTM_ORDER = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "utm_id",
] as const

export type UtmKey = (typeof UTM_ORDER)[number]

export function isMailKind(value: string): value is MailKind {
  return Object.prototype.hasOwnProperty.call(MAIL_KIND_SOURCE, value)
}

/** null 은 undefined 와 같게 본다 — DB·폼에서 온 값을 그대로 넘겨도 되게. */
export type MailTagInput = {
  kind: MailKind
  url: string
  /** 제품·리드 메일의 utm_campaign. 세일즈 메일에서는 무시하고 고정값을 쓴다. */
  campaign?: string | null
  /** 제품·리드 메일의 utm_content. 세일즈 메일에서는 무시하고 `<이름>_<sendDate>` 를 쓴다. */
  content?: string | null
  /** 링크 자리(`mailTerm` 으로 만든다). */
  term?: string | null
  /** 제품·리드 메일의 희생 슬롯. 세일즈 메일에는 금지. */
  id?: string | null
  /** coldmail — 캠페인명. content 가 `<캠페인명>_<sendDate>` 가 된다. */
  campaignName?: string | null
  /** followup — 고객사 슬러그. content 가 `<고객사>_<sendDate>` 가 된다. */
  company?: string | null
  /** coldmail = 발송 시작일, followup = 발송일. KST `YYYYMMDD`. */
  sendDate?: string | null
  /**
   * followup — 그 고객사가 들어온 경로(`voucher`·`fair`·`referral`·`inbound` 등). 비우거나 `coldmail` 이면
   * campaign=`followup`, 그 밖이면 campaign=`followup_<inflow>` (2026-10-20 김다미님 결정).
   */
  inflow?: string | null
}

/** 1:1 팔로업의 utm_campaign. 콜드메일 유입(또는 모름)은 `followup`, 그 밖은 `followup_<유입경로>`. */
export function followupCampaign({ inflow }: { inflow?: string | null }): string {
  const v = inflow ?? ""
  if (!v || v === "coldmail") return "followup"
  if (!MAIL_TAG_SAFE.test(v)) {
    throw new Error(`mailtag: inflow 「${v}」 은 ^[a-z0-9_]+$ 여야 한다`)
  }
  return `followup_${v}`
}

/** 세일즈 메일(coldmail·followup)의 campaign·content 를 정한다. id 가 붙으면 거절한다. */
function salesAxes(input: MailTagInput): { campaign: string; content: string } {
  if (input.id) {
    throw new Error(`mailtag: ${input.kind} 메일에는 utm_id 를 달지 않는다`)
  }
  if (!isKstDateStamp(input.sendDate)) {
    throw new Error(`mailtag: sendDate 는 달력에 있는 YYYYMMDD 여야 한다 (${input.sendDate})`)
  }
  const name = input.kind === "coldmail" ? input.campaignName : input.company
  if (!name) {
    throw new Error(
      `mailtag: ${input.kind} 에는 ${input.kind === "coldmail" ? "campaignName" : "company"} 이 필요하다`,
    )
  }
  // 세일즈팀은 메일에 링크만 쓴다 — 버튼·글자·이미지를 나누는 자리 접두어가 정보를 더하지 않는다(2026-10-20 김다미님).
  if (input.term && isPositionTerm(input.term)) {
    throw new Error(`mailtag: ${input.kind} 메일의 utm_term 「${input.term}」 에 자리 접두어를 붙이지 않는다(예 signup)`)
  }
  const campaign = input.kind === "coldmail" ? "coldmail" : followupCampaign({ inflow: input.inflow })
  return { campaign, content: `${name}_${input.sendDate}` }
}

/** 추적 링크 하나. 규칙을 어기는 값(모르는 kind·규칙 밖 문자·날짜 형식·세일즈 메일의 id)이면 던진다. */
export function mailTagUrl(input: MailTagInput): string {
  if (!isMailKind(input.kind)) {
    throw new Error(`mailtag: 모르는 메일 종류 ${String(input.kind)}`)
  }
  const url = new URL(input.url)
  for (const key of Array.from(url.searchParams.keys())) {
    if (key.startsWith("utm_")) {
      url.searchParams.delete(key)
    }
  }
  const sales = input.kind === "coldmail" || input.kind === "followup"
  const { campaign, content } = sales
    ? salesAxes(input)
    : { campaign: input.campaign, content: input.content }
  const values: Record<UtmKey, string | null | undefined> = {
    utm_source: MAIL_KIND_SOURCE[input.kind],
    utm_medium: "email",
    utm_campaign: campaign,
    utm_content: content,
    utm_term: input.term,
    utm_id: input.id,
  }
  for (const key of UTM_ORDER) {
    const value = values[key]
    if (!value) {
      continue
    }
    if (key !== "utm_source" && key !== "utm_medium" && !MAIL_TAG_SAFE.test(value)) {
      throw new Error(`mailtag: ${key} 「${value}」 은 ^[a-z0-9_]+$ 여야 한다`)
    }
    url.searchParams.append(key, value)
  }
  return url.toString()
}

/** 세일즈 콜드메일. campaign=coldmail, content=<캠페인명>_<발송시작일>. */
export function coldmailTagUrl(p: {
  url: string
  campaignName: string
  sendDate: string
  term?: string | null
}): string {
  return mailTagUrl({ kind: "coldmail", ...p })
}

/** 세일즈 1:1 팔로업(답장·미팅 후속). campaign=followup(_<유입경로>), content=<고객사슬러그>_<발송일>. */
export function followupTagUrl(p: {
  url: string
  company: string
  sendDate: string
  term?: string | null
  inflow?: string | null
}): string {
  return mailTagUrl({ kind: "followup", ...p })
}
