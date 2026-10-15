/**
 * 메일 링크 하나에 UTM 을 붙이는 규칙 — 이 패키지의 중심.
 *
 * | 축 | 값 |
 * |---|---|
 * | utm_source | 메일 종류(kind)로 정해진다 — `MAIL_KIND_SOURCE` |
 * | utm_medium | `email` 고정 |
 * | utm_campaign | 세일즈 메일은 `coldmail`·`followup` 고정, 회차 메일은 `YYYYMMDD`, 그 밖은 메일 종류 키 |
 * | utm_content | 세일즈 메일은 `<이름>_<YYYYMMDD>`, 제품·리드 메일은 식별자(글 슬러그·A/B 변형·자료키) |
 * | utm_term | 링크 자리 — `main_<이름>`·`sub_<이름>`·`bnr`/`bnr_a`/`bnr_b`·`txt_<이름>`·`img_<이름>` |
 * | utm_id | 제품·리드 메일의 맨 끝 희생 슬롯(`nl`·`u1`·`w3`·`n1`·`f1`…). 세일즈 메일은 금지 |
 *
 * 순서는 source→medium→campaign→content→term→id. 입력 주소에 있던 utm_* 는 지우고 다른 쿼리·fragment
 * 는 그대로 둔다. campaign·content·term·id 는 `^[a-z0-9_]+$` 만 — 한글·대문자가 섞이면 집계에서
 * 같은 링크가 여러 줄로 쪼개진다. 규칙 밖 값은 고쳐 붙이지 않고 던진다(조용히 고치면 집계가 몰래 갈린다).
 *
 * 파트너스 고객사 대행 콜드메일은 대상이 아니다 — 고객사 이름으로 나가는 메일이라 kind 에 없다.
 */
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
};
/** 제품 메일(utm_id 를 다는 회원 메일)의 utm_source 값. 가입 채널 집계도 이 목록을 쓴다. */
export const PRODUCT_MAIL_SOURCES = [
    "letter",
    "release",
    "welcome",
    "lifecycle",
    "system",
];
/**
 * 비회원 리드 메일(랜딩 무료도구 결과·자료 다운로드)의 utm_source. 집계는 제품 메일과 따로 세지만,
 * 값 규칙은 제품 메일처럼 utm_id 를 맨 끝에 둔다.
 */
export const LEAD_MAIL_SOURCES = ["lead"];
/** campaign·content·term·id 에 허용되는 값. */
export const MAIL_TAG_SAFE = /^[a-z0-9_]+$/;
const SEND_DATE = /^\d{8}$/;
/** UTM 축의 고정 순서. */
export const UTM_ORDER = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
    "utm_id",
];
export function isMailKind(value) {
    return Object.prototype.hasOwnProperty.call(MAIL_KIND_SOURCE, value);
}
/** 세일즈 메일(coldmail·followup)의 campaign·content 를 정한다. id 가 붙으면 거절한다. */
function salesAxes(input) {
    if (input.id) {
        throw new Error(`mailtag: ${input.kind} 메일에는 utm_id 를 달지 않는다`);
    }
    if (!SEND_DATE.test(input.sendDate ?? "")) {
        throw new Error(`mailtag: sendDate 는 YYYYMMDD 여야 한다 (${input.sendDate})`);
    }
    const name = input.kind === "coldmail" ? input.campaignName : input.company;
    if (!name) {
        throw new Error(`mailtag: ${input.kind} 에는 ${input.kind === "coldmail" ? "campaignName" : "company"} 이 필요하다`);
    }
    return { campaign: input.kind, content: `${name}_${input.sendDate}` };
}
/** 추적 링크 하나. 규칙을 어기는 값(모르는 kind·규칙 밖 문자·날짜 형식·세일즈 메일의 id)이면 던진다. */
export function mailTagUrl(input) {
    if (!isMailKind(input.kind)) {
        throw new Error(`mailtag: 모르는 메일 종류 ${String(input.kind)}`);
    }
    const url = new URL(input.url);
    for (const key of Array.from(url.searchParams.keys())) {
        if (key.startsWith("utm_")) {
            url.searchParams.delete(key);
        }
    }
    const sales = input.kind === "coldmail" || input.kind === "followup";
    const { campaign, content } = sales
        ? salesAxes(input)
        : { campaign: input.campaign, content: input.content };
    const values = {
        utm_source: MAIL_KIND_SOURCE[input.kind],
        utm_medium: "email",
        utm_campaign: campaign,
        utm_content: content,
        utm_term: input.term,
        utm_id: input.id,
    };
    for (const key of UTM_ORDER) {
        const value = values[key];
        if (!value) {
            continue;
        }
        if (key !== "utm_source" && key !== "utm_medium" && !MAIL_TAG_SAFE.test(value)) {
            throw new Error(`mailtag: ${key} 「${value}」 은 ^[a-z0-9_]+$ 여야 한다`);
        }
        url.searchParams.append(key, value);
    }
    return url.toString();
}
/** 세일즈 콜드메일. campaign=coldmail, content=<캠페인명>_<발송시작일>. */
export function coldmailTagUrl(p) {
    return mailTagUrl({ kind: "coldmail", ...p });
}
/** 세일즈 1:1 팔로업(답장·미팅 후속). campaign=followup, content=<고객사슬러그>_<발송일>. */
export function followupTagUrl(p) {
    return mailTagUrl({ kind: "followup", ...p });
}
