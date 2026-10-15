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
export declare const MAIL_KIND_SOURCE: {
    readonly coldmail: "email";
    readonly followup: "email";
    readonly letter: "letter";
    readonly release: "release";
    readonly welcome: "welcome";
    readonly lifecycle: "lifecycle";
    readonly system: "system";
    readonly lead: "lead";
};
export type MailKind = keyof typeof MAIL_KIND_SOURCE;
/** 회원에게 가는 제품 메일 종류. */
export type ProductMailKind = Exclude<MailKind, "coldmail" | "followup" | "lead">;
/** 제품 메일(utm_id 를 다는 회원 메일)의 utm_source 값. 가입 채널 집계도 이 목록을 쓴다. */
export declare const PRODUCT_MAIL_SOURCES: readonly string[];
/**
 * 비회원 리드 메일(랜딩 무료도구 결과·자료 다운로드)의 utm_source. 집계는 제품 메일과 따로 세지만,
 * 값 규칙은 제품 메일처럼 utm_id 를 맨 끝에 둔다.
 */
export declare const LEAD_MAIL_SOURCES: readonly string[];
/** campaign·content·term·id 에 허용되는 값. */
export declare const MAIL_TAG_SAFE: RegExp;
/** UTM 축의 고정 순서. */
export declare const UTM_ORDER: readonly ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "utm_id"];
export type UtmKey = (typeof UTM_ORDER)[number];
export declare function isMailKind(value: string): value is MailKind;
/** null 은 undefined 와 같게 본다 — DB·폼에서 온 값을 그대로 넘겨도 되게. */
export type MailTagInput = {
    kind: MailKind;
    url: string;
    /** 제품·리드 메일의 utm_campaign. 세일즈 메일에서는 무시하고 고정값을 쓴다. */
    campaign?: string | null;
    /** 제품·리드 메일의 utm_content. 세일즈 메일에서는 무시하고 `<이름>_<sendDate>` 를 쓴다. */
    content?: string | null;
    /** 링크 자리(`mailTerm` 으로 만든다). */
    term?: string | null;
    /** 제품·리드 메일의 희생 슬롯. 세일즈 메일에는 금지. */
    id?: string | null;
    /** coldmail — 캠페인명. content 가 `<캠페인명>_<sendDate>` 가 된다. */
    campaignName?: string | null;
    /** followup — 고객사 슬러그. content 가 `<고객사>_<sendDate>` 가 된다. */
    company?: string | null;
    /** coldmail = 발송 시작일, followup = 발송일. KST `YYYYMMDD`. */
    sendDate?: string | null;
};
/** 추적 링크 하나. 규칙을 어기는 값(모르는 kind·규칙 밖 문자·날짜 형식·세일즈 메일의 id)이면 던진다. */
export declare function mailTagUrl(input: MailTagInput): string;
/** 세일즈 콜드메일. campaign=coldmail, content=<캠페인명>_<발송시작일>. */
export declare function coldmailTagUrl(p: {
    url: string;
    campaignName: string;
    sendDate: string;
    term?: string | null;
}): string;
/** 세일즈 1:1 팔로업(답장·미팅 후속). campaign=followup, content=<고객사슬러그>_<발송일>. */
export declare function followupTagUrl(p: {
    url: string;
    company: string;
    sendDate: string;
    term?: string | null;
}): string;
