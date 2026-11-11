/**
 * 메일 링크 하나에 UTM 을 붙이는 규칙 — 이 패키지의 중심.
 *
 * | 축 | 값 |
 * |---|---|
 * | utm_source | 메일 종류(kind) 그대로 — `MAIL_KIND_SOURCE`. 폴더처럼 «어떤 메일인가» |
 * | utm_medium | `email` 고정 |
 * | utm_campaign | 그 폴더 안에서 무엇. 린다 캠페인 메일은 캠페인마다 지은 UTM 이름, 담당자 1:1 메일은 보낸 이유, 넛지는 넛지 유형 키, 회차 메일은 `YYYYMMDD` |
 * | utm_content | 제품·리드 메일은 식별자(글 슬러그·A/B 변형·자료키) |
 * | utm_term | 제품·리드 메일은 링크 자리 — `main_<이름>`·`sub_<이름>`·`bnr`/`bnr_a`/`bnr_b`·`txt_<이름>`·`img_<이름>`. 바이어에게 가는 메일은 접두어 없는 이름(`signup`·`pricing`) |
 * | utm_id | 린다 캠페인 메일은 캠페인 id(선택). 제품·리드 메일은 맨 끝 희생 슬롯(선택). 담당자 1:1 메일은 금지 |
 * | rid (UTM 밖) | 담당자 1:1 메일의 받는 사람 id(선택). 고객사 이름을 링크에 싣지 않으려고 id 로 둔다 |
 *
 * 순서는 rid 다음 source→medium→campaign→content→term→id. rid 를 UTM 앞에 두는 까닭: 메일 클릭 추적기가
 * 주소 맨 끝 값 뒤에 제 경로를 이어 붙여서, 맨 끝 값은 망가질 수 있다. 받는 사람 id 는 망가지면 안 된다.
 * 입력 주소에 있던 utm_*·rid 는 지우고
 * 다른 쿼리·fragment 는 그대로 둔다. campaign·content·term·id·rid 는 `^[a-z0-9_]+$` 만 — 한글·대문자가
 * 섞이면 집계에서 같은 링크가 여러 줄로 쪼개진다. 규칙 밖 값은 고쳐 붙이지 않고 던진다(조용히 고치면
 * 집계가 몰래 갈린다).
 *
 * 2026-10-15~11 의 옛 값(`email`·`system`·`lifecycle`)은 더 만들지 않는다. 그 값으로 이미 나간 링크는
 * `read.ts` 가 새 값으로 묶어 읽는다.
 *
 * 파트너스 고객사 대행 콜드메일은 대상이 아니다 — 고객사 이름으로 나가는 메일이라 kind 에 없다.
 */

import { isPositionTerm } from "./term.js"

/** 메일 종류 → utm_source. 종류 이름과 source 값이 같다. */
export const MAIL_KIND_SOURCE = {
  /** 린다 캠페인 메일 — 바이어에게. campaign = 캠페인마다 지은 UTM 이름. */
  rinda_campaign: "rinda_campaign",
  /** 담당자 1:1 메일 — 바이어에게. campaign = 보낸 이유. */
  personal: "personal",
  /** 넛지 메일 — 유저에게 자동으로 가는 메일 전부(거래성·마케팅성 모두). campaign = 넛지 유형 키. */
  nudge: "nudge",
  welcome: "welcome",
  letter: "letter",
  release: "release",
  lead: "lead",
} as const

export type MailKind = keyof typeof MAIL_KIND_SOURCE

/**
 * 메일 종류 → 화면에 보이는 이름(린다 용어정의서 말). 메일 UTM 의 정본은 이 패키지라서, 랜딩의 유입경로
 * 화면·알림은 이름표를 따로 두지 않고 이것을 그대로 보여 준다. 넛지·캠페인 하나하나의 이름은 규칙이 아니라
 * 앱의 데이터라 여기 두지 않는다.
 */
export const MAIL_KIND_LABEL: Readonly<Record<MailKind, string>> = {
  rinda_campaign: "린다 캠페인 메일",
  personal: "담당자 1:1 메일",
  nudge: "넛지 메일",
  welcome: "가입 환영 메일",
  letter: "린다레터",
  release: "업데이트 노트",
  lead: "비회원 리드 메일",
}
/** 회원에게 가는 제품 메일 종류. */
export type ProductMailKind = Exclude<MailKind, "rinda_campaign" | "personal" | "lead">

/** 바이어에게 가는 메일의 utm_source. */
export const SALES_MAIL_SOURCES: readonly string[] = ["rinda_campaign", "personal"]

/** 제품 메일(회원 메일)의 utm_source. 가입 채널 집계도 이 목록을 쓴다. */
export const PRODUCT_MAIL_SOURCES: readonly string[] = ["nudge", "welcome", "letter", "release"]

/**
 * 비회원 리드 메일(랜딩 무료도구 결과·자료 다운로드)의 utm_source. 집계는 제품 메일과 따로 세지만,
 * 값 규칙은 제품 메일과 같다.
 */
export const LEAD_MAIL_SOURCES: readonly string[] = ["lead"]

/** 받는 사람 id 를 싣는 쿼리 이름(UTM 밖). 담당자 1:1 메일만 쓴다. */
export const RECIPIENT_PARAM = "rid"

/** campaign·content·term·id·rid 에 허용되는 값. */
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
  /** utm_campaign. 린다 캠페인 메일은 UTM 이름, 담당자 1:1 메일은 보낸 이유(`personalReason`), 그 밖은 메일 종류 키·회차. */
  campaign?: string | null
  /** 제품·리드 메일의 utm_content(식별자). */
  content?: string | null
  /** 링크 자리(`mailTerm` 으로 만든다). 바이어에게 가는 메일은 접두어 없는 이름. */
  term?: string | null
  /** 린다 캠페인 메일의 캠페인 id 또는 제품·리드 메일의 희생 슬롯. 담당자 1:1 메일에는 금지. */
  id?: string | null
  /** 담당자 1:1 메일의 받는 사람 id(`rid`, `mailRecipientId` 로 만든다). 다른 메일에는 금지. */
  recipient?: string | null
}

/**
 * 담당자 1:1 메일의 보낸 이유 — 닫힌 목록. 값 = `utm_campaign`, 뜻 = 화면에 보이는 이름.
 * 목록 밖 값으로는 링크를 만들지 않는다: 자유 입력이면 쓰는 쪽마다 `voucher2`·`expo` 같은 값이 생겨
 * 같은 이유가 여러 줄로 갈린다. 새 이유가 필요하면 여기에 한 줄 더한다.
 */
export const PERSONAL_REASONS = {
  /** 린다 캠페인 메일에 답한 곳 — 들어온 경로를 모를 때의 기본값이기도 하다(옛 `followup`). */
  from_campaign: "캠페인 메일에 답한 곳",
  inbound: "먼저 문의한 곳",
  voucher: "지원사업(바우처)",
  referral: "소개",
  fair: "박람회·전시회",
  cold: "담당자가 처음 연락한 곳",
} as const

export type PersonalReason = keyof typeof PERSONAL_REASONS

export function isPersonalReason(value: string): value is PersonalReason {
  return Object.prototype.hasOwnProperty.call(PERSONAL_REASONS, value)
}

/**
 * 들어온 경로 → 담당자 1:1 메일의 보낸 이유. 비었거나 옛 값 `coldmail` 이면 `from_campaign`,
 * 그 밖은 `PERSONAL_REASONS` 의 값이어야 한다(아니면 던진다).
 */
export function personalReason({ inflow }: { inflow?: string | null }): PersonalReason {
  const v = inflow ?? ""
  if (!v || v === "coldmail") return "from_campaign"
  if (!isPersonalReason(v)) {
    throw new Error(`mailtag: 보낸 이유 「${v}」 는 목록에 없다(${Object.keys(PERSONAL_REASONS).join("·")})`)
  }
  return v
}

/** 종류별로 붙을 수 없는 값을 거절한다. 값 문법은 `mailTagUrl` 이 본다. */
function assertKindRules(input: MailTagInput): void {
  const { kind } = input
  const sales = kind === "rinda_campaign" || kind === "personal"
  if (sales && !input.campaign) {
    throw new Error(
      `mailtag: ${kind} 에는 campaign 이 필요하다(${kind === "rinda_campaign" ? "캠페인 UTM 이름" : "보낸 이유"})`,
    )
  }
  if (kind === "personal" && input.campaign && !isPersonalReason(input.campaign)) {
    throw new Error(`mailtag: personal 메일의 보낸 이유 「${input.campaign}」 는 목록에 없다(PERSONAL_REASONS)`)
  }
  if (kind === "personal" && input.id) {
    throw new Error(`mailtag: personal 메일에는 utm_id 를 달지 않는다(받는 사람은 recipient)`)
  }
  if (kind !== "personal" && input.recipient) {
    throw new Error(`mailtag: recipient(${RECIPIENT_PARAM}) 는 personal 메일에만 단다`)
  }
  // 바이어에게 가는 메일에는 링크만 쓴다 — 버튼·글자·이미지를 나누는 자리 접두어가 정보를 더하지 않는다(2026-10-20 김다미님).
  if (sales && input.term && isPositionTerm(input.term)) {
    throw new Error(`mailtag: ${kind} 메일의 utm_term 「${input.term}」 에 자리 접두어를 붙이지 않는다(예 signup)`)
  }
}

/** 추적 링크 하나. 규칙을 어기는 값(모르는 kind·규칙 밖 문자·종류에 맞지 않는 값)이면 던진다. */
export function mailTagUrl(input: MailTagInput): string {
  if (!isMailKind(input.kind)) {
    throw new Error(`mailtag: 모르는 메일 종류 ${String(input.kind)}`)
  }
  assertKindRules(input)
  const url = new URL(input.url)
  for (const key of Array.from(url.searchParams.keys())) {
    if (key.startsWith("utm_") || key === RECIPIENT_PARAM) {
      url.searchParams.delete(key)
    }
  }
  const values: Record<UtmKey | typeof RECIPIENT_PARAM, string | null | undefined> = {
    [RECIPIENT_PARAM]: input.recipient,
    utm_source: MAIL_KIND_SOURCE[input.kind],
    utm_medium: "email",
    utm_campaign: input.campaign,
    utm_content: input.content,
    utm_term: input.term,
    utm_id: input.id,
  }
  for (const key of [RECIPIENT_PARAM, ...UTM_ORDER] as const) {
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
