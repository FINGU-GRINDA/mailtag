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
export function toUtmSlug(value) {
    return (value ?? "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
}
const KST_OFFSET_MS = 9 * 3600000;
/**
 * 시각 → KST 날짜 `YYYYMMDD`. 발송일·발송 시작일·회차 값.
 * `kstDateStamp()`(지금) · `kstDateStamp(date)` · `kstDateStamp(ms)` · `kstDateStamp({ atMs })` 모두 받는다 —
 * 네 레포가 쓰던 두 가지 호출 모양을 이름 바꾸지 않고 그대로 옮겨 오게.
 */
export function kstDateStamp(at) {
    const ms = at === undefined
        ? Date.now()
        : typeof at === "number"
            ? at
            : at instanceof Date
                ? at.getTime()
                : at.atMs;
    return new Date(ms + KST_OFFSET_MS).toISOString().slice(0, 10).replace(/-/g, "");
}
/** 개인 웹메일 도메인의 회사 라벨. 이 도메인으로는 회사를 알 수 없다. */
export const WEBMAIL_LABELS = new Set([
    "gmail", "googlemail", "naver", "daum", "hanmail", "kakao", "nate", "outlook", "hotmail", "live", "msn",
    "yahoo", "icloud", "me", "mac", "aol", "proton", "protonmail", "gmx", "yandex", "qq", "163", "126",
]);
/** 국가 도메인 아래 2단 접미사(co.kr·com.au·ne.jp 등)의 앞 라벨. 이 라벨이면 회사 라벨은 한 칸 더 앞이다. */
const SECOND_LEVEL = new Set([
    "co", "com", "net", "org", "or", "ne", "ac", "go", "gov", "edu", "re", "pe", "ltd", "plc",
]);
/**
 * 메일 주소(`a@b.com`·`이름 <a@b.com>`) 또는 웹사이트(`https://www.b.co.kr/x`) → 회사 라벨.
 * 서브도메인·www·국가 2단 접미사를 걷는다(mail.acme.co.kr → acme). 못 읽으면 null.
 */
function companyLabel(raw) {
    const text = String(raw ?? "").trim().toLowerCase();
    if (!text)
        return null;
    let host;
    if (text.includes("@")) {
        const m = text.match(/@([a-z0-9.-]+)>?\s*$/);
        if (!m)
            return null;
        host = m[1] ?? "";
    }
    else {
        host = (text.replace(/^[a-z][a-z0-9+.-]*:\/\//, "").split(/[/?#]/)[0] ?? "").split(":")[0] ?? "";
        if (!/^[a-z0-9.-]+$/.test(host))
            return null;
    }
    const labels = host.replace(/^www\./, "").split(".").filter(Boolean);
    if (labels.length < 2)
        return null;
    const tld = labels[labels.length - 1] ?? "";
    const second = labels[labels.length - 2] ?? "";
    const twoLevel = labels.length >= 3 && tld.length === 2 && SECOND_LEVEL.has(second);
    const label = twoLevel ? (labels[labels.length - 3] ?? "") : second;
    return { label, webmail: WEBMAIL_LABELS.has(label) };
}
/**
 * 상대 메일 주소 → followup content 의 고객사 슬러그(mail.acme.co.kr → acme).
 * 웹메일(naver·gmail…)이면 도메인으로 회사를 알 수 없으니 브랜드 영문명(`brand`)을 쓴다 — `webmail` 로
 * 묶으면 어느 고객사가 가입했는지 나눌 수 없다(2026-10-20 김다미님). 브랜드도 없거나 주소를 못 읽으면
 * null — 호출부는 태그 없이 맨 주소를 쓴다(틀린 슬러그보다 낫다).
 */
export function followupCompanySlug({ email, brand, }) {
    const parsed = companyLabel(email);
    if (parsed && !parsed.webmail)
        return toUtmSlug(parsed.label) || toUtmSlug(brand) || null;
    return toUtmSlug(brand) || null;
}
/**
 * 고객사 레코드 → followup content 의 고객사 슬러그. 옛 손 슬러그가 회사 도메인
 * 이름이었으므로 같은 방식으로 뽑는다: 회사 메일 도메인 → 웹사이트 → 영문 회사명 → 고객사 id 앞 8자
 * (`c_<hex>`). 웹메일 도메인은 건너뛴다. 한글 이름만 있는 회사도 링크가 깨지지 않게 늘 값을 돌려준다.
 */
export function companyUtmSlug(c) {
    const fromDomain = (raw) => {
        const parsed = companyLabel(raw);
        return parsed && !parsed.webmail ? toUtmSlug(parsed.label) : "";
    };
    return (fromDomain(c.email) ||
        fromDomain(c.website) ||
        toUtmSlug(c.name) ||
        `c_${toUtmSlug(c.id).replace(/_/g, "").slice(0, 8) || "unknown"}`);
}
