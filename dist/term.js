/**
 * 링크 자리(utm_term) 이름 만들기.
 *
 * 버튼 문구는 언어마다 달라서 그대로 이름으로 쓰면 한·영·일 메일의 같은 버튼이 다른 줄로 집계된다.
 * 그래서 자리 이름은 영문 소문자로 접거나 링크 주소에서 만든다.
 */
/** 링크 자리 → utm_term. 이름은 `mailTermName` 으로 만든 영문 소문자여야 한다. */
export const mailTerm = {
    main: (name) => `main_${name}`,
    sub: (name) => `sub_${name}`,
    bnr: (variant) => (variant ? `bnr_${variant}` : "bnr"),
    txt: (name) => `txt_${name}`,
    img: (name) => `img_${name}`,
};
/** 자리별 utm_term 모양. 게이트(`checkEmailUtm`)가 `data-mds` 자리와 대조한다. */
export const MAIL_TERM_RULE = {
    main: /^main_[a-z0-9_]+$/,
    sub: /^sub_[a-z0-9_]+$/,
    bnr: /^bnr(_[ab])?$/,
    txt: /^txt_[a-z0-9_]+$/,
    img: /^img_[a-z0-9_]+$/,
};
/** 아무 글자 → term·content 에 쓸 수 있는 이름(최대 40자). 영문·숫자가 하나도 없으면 빈 문자열. */
export function mailTermName(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 40)
        .replace(/_+$/, "");
}
/**
 * 링크 주소 → 자리 이름(마지막 경로 조각, 루트면 `home`). 끝 조각이 ID(uuid·숫자)면 그 앞 조각을 쓴다.
 * 주소를 못 읽으면 `link`.
 */
export function mailTermNameFromUrl(url) {
    let segments;
    try {
        segments = new URL(url).pathname.split("/").filter(Boolean);
    }
    catch {
        return "link";
    }
    const named = segments.filter((s) => !/^[0-9a-f-]{8,}$/i.test(s) && !/^\d+$/.test(s));
    return mailTermName(named[named.length - 1] ?? "") || "home";
}
/** 자리 접두어(`main_`·`sub_`·`txt_`·`img_`·`bnr`)가 붙은 term 인가. 세일즈 메일에는 붙이지 않는다. */
export function isPositionTerm(term) {
    return /^(main|sub|txt|img)_/.test(term) || /^bnr(_[ab])?$/.test(term);
}
/**
 * 세일즈 메일 term → 자리 접두어를 뗀 이름. 2026-10-20 이전 링크(`txt_signature`)와 이후 링크(`signature`)를
 * 집계에서 한 줄로 묶을 때 쓴다. `bnr` 계열은 이름이 없어 그대로 둔다.
 */
export function salesTermName(term) {
    const t = (term ?? "").trim().toLowerCase();
    return t.replace(/^(main|sub|txt|img)_/, "");
}
/** 옛 규칙에서 자리를 content 에 넣던 값 — 다시 태그할 때 content 로 물려받지 않는다. */
export function isLegacyPositionContent(content) {
    return /^(main|sub|txt|img)_/.test(content) || /^bnr(_[ab])?$/.test(content);
}
