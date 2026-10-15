/**
 * UTM 값에 넣을 이름·날짜 만들기 — 고객사 슬러그·자료키·발송일.
 *
 * 세일즈 메일의 content 는 `<이름>_<YYYYMMDD>` 라 이름과 날짜를 사람마다 다르게 만들면 같은 고객사·같은
 * 발송일이 여러 줄로 갈린다. 그래서 슬러그·날짜 규칙을 여기 한 벌로 둔다. 날짜는 KST 달력일이다.
 */
/**
 * 아무 글자 → UTM 값 문법(`^[a-z0-9_]+$`). `prompts-500-ko` → `prompts_500_ko`.
 * 허용 문자가 하나도 없으면(한글 이름 등) 빈 문자열 — `mailTagUrl` 은 빈 축을 생략한다.
 */
export declare function toUtmSlug(value: string | null | undefined): string;
/**
 * 시각 → KST 날짜 `YYYYMMDD`. 발송일·발송 시작일·회차 값.
 * `kstDateStamp()`(지금) · `kstDateStamp(date)` · `kstDateStamp(ms)` · `kstDateStamp({ atMs })` 모두 받는다 —
 * 네 레포가 쓰던 두 가지 호출 모양을 이름 바꾸지 않고 그대로 옮겨 오게.
 */
export declare function kstDateStamp(at?: Date | number | {
    atMs: number;
}): string;
/** 개인 웹메일 도메인의 회사 라벨. 이 도메인으로는 회사를 알 수 없다. */
export declare const WEBMAIL_LABELS: ReadonlySet<string>;
/**
 * 상대 메일 주소 → followup content 의 고객사 슬러그(mail.acme.co.kr → acme).
 * 웹메일이면 `webmail`. 주소를 못 읽으면 null — 호출부는 태그 없이 맨 주소를 쓴다(틀린 슬러그보다 낫다).
 */
export declare function followupCompanySlug({ email }: {
    email?: string | null;
}): string | null;
/**
 * 고객사 레코드 → followup content 의 고객사 슬러그. 옛 손 슬러그가 회사 도메인
 * 이름이었으므로 같은 방식으로 뽑는다: 회사 메일 도메인 → 웹사이트 → 영문 회사명 → 고객사 id 앞 8자
 * (`c_<hex>`). 웹메일 도메인은 건너뛴다. 한글 이름만 있는 회사도 링크가 깨지지 않게 늘 값을 돌려준다.
 */
export declare function companyUtmSlug(c: {
    id: string;
    name: string;
    email?: string | null;
    website?: string | null;
}): string;
