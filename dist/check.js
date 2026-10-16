/**
 * 이미 만들어진 주소·메일 HTML 이 규칙을 지키는지 보는 게이트.
 *
 * 링크를 만드는 쪽(`mailTagUrl`)이 던지더라도, 사람·AI 가 쓴 본문이나 옛 초안은 다른 길로 들어온다.
 * 발송 전·테스트에서 이 게이트로 한 번 더 걸러 규칙 밖 링크가 나가지 않게 한다.
 * 컴포넌트는 링크에 `data-mds="<자리>"` 를 달고, `checkEmailUtm` 이 그 표시로 자리 규칙까지 본다.
 */
import { isKstDateStamp, LEAD_MAIL_SOURCES, MAIL_TAG_SAFE, PRODUCT_MAIL_SOURCES, UTM_ORDER } from "./tag.js";
/** 세일즈 메일 content — `<이름>_<YYYYMMDD>`. */
const SALES_CONTENT = /^[a-z0-9_]+_(\d{8})$/;
import { MAIL_TERM_RULE } from "./term.js";
/** href 안의 HTML 엔티티를 푼다(`&amp;` → `&` 등). */
export function decodeEntities(text) {
    return text
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, "&");
}
/** UTM 이 붙은 주소 하나의 규칙 위반(축·순서·값). 자리 규칙은 `checkEmailUtm` 이 따로 본다. */
export function mailTagErrors(url) {
    const errors = [];
    const p = url.searchParams;
    const keys = Array.from(p.keys());
    const first = keys.findIndex((k) => k.startsWith("utm_"));
    if (first < 0) {
        return errors;
    }
    const utmKeys = keys.slice(first);
    const expected = UTM_ORDER.filter((k) => p.has(k));
    if (utmKeys.join() !== expected.join()) {
        errors.push(`UTM 은 맨 끝에 source→medium→campaign→content→term→id 순서여야 한다`);
    }
    const source = p.get("utm_source") ?? "";
    const sales = source === "email";
    const known = sales || PRODUCT_MAIL_SOURCES.includes(source) || LEAD_MAIL_SOURCES.includes(source);
    if (!known || p.get("utm_medium") !== "email") {
        errors.push(`source 는 메일 종류 값, medium 은 email 이어야 한다`);
    }
    const campaign = p.get("utm_campaign") ?? "";
    if (!campaign) {
        errors.push(`campaign 이 있어야 한다`);
    }
    for (const key of ["utm_campaign", "utm_content", "utm_term", "utm_id"]) {
        const value = p.get(key);
        if (value !== null && !MAIL_TAG_SAFE.test(value)) {
            errors.push(`${key} 「${value}」 은 ^[a-z0-9_]+$ 여야 한다`);
        }
    }
    if (sales) {
        if (campaign !== "coldmail" && campaign !== "followup") {
            errors.push(`세일즈 메일 campaign 은 coldmail·followup 이어야 한다`);
        }
        if (p.has("utm_id")) {
            errors.push(`세일즈 메일에는 utm_id 가 없어야 한다`);
        }
        const date = (p.get("utm_content") ?? "").match(SALES_CONTENT)?.[1];
        if (!date) {
            errors.push(`세일즈 메일 content 는 <이름>_<YYYYMMDD> 여야 한다`);
        }
        else if (!isKstDateStamp(date)) {
            errors.push(`세일즈 메일 content 의 날짜 「${date}」 는 달력에 없는 날이다`);
        }
    }
    else if (keys[keys.length - 1] !== "utm_id") {
        errors.push(`제품·리드 메일은 utm_id 가 맨 끝이어야 한다`);
    }
    return errors;
}
/** 메일 HTML 의 모든 링크를 규칙과 대조한다. 어긴 링크마다 한 줄씩 돌려준다(없으면 빈 배열). */
export function checkEmailUtm(html) {
    const errors = [];
    for (const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
        const attrs = m[1] ?? "";
        const inner = m[2] ?? "";
        const href = attrs.match(/href=(["'])(.*?)\1/i)?.[2];
        if (!href)
            continue;
        const role = attrs.match(/data-mds="([^"]*)"/i)?.[1];
        const label = decodeEntities(inner.replace(/<[^>]+>/g, "")).trim();
        let url;
        try {
            url = new URL(decodeEntities(href));
        }
        catch {
            continue;
        }
        const hasUtm = Array.from(url.searchParams.keys()).some((k) => k.startsWith("utm_"));
        const where = `${role ?? "링크"} 「${label || "(이미지)"}」 ${url.href}`;
        // 웹 보기·수신거부·자리 표시 없는 그림 링크는 추적하지 않는다.
        if (role === "webview" || role === "unsubscribe" || (!role && /<img\b/i.test(inner))) {
            if (hasUtm)
                errors.push(`UTM 이 없어야 한다: ${where}`);
            continue;
        }
        // 이미지 링크는 추적하지 않아도 된다 — UTM 이 있을 때만 아래 규칙을 본다.
        if (role === "img" && !hasUtm)
            continue;
        // 자리 표시가 없는 링크(옛 본문·외부 링크)는 UTM 이 있을 때 값 규칙만 본다.
        if (!role || !Object.prototype.hasOwnProperty.call(MAIL_TERM_RULE, role)) {
            for (const e of mailTagErrors(url))
                errors.push(`${e}: ${where}`);
            continue;
        }
        if (!hasUtm) {
            errors.push(`추적 링크에 UTM 이 없다: ${where}`);
            continue;
        }
        for (const e of mailTagErrors(url))
            errors.push(`${e}: ${where}`);
        const term = url.searchParams.get("utm_term") ?? "";
        if (!MAIL_TERM_RULE[role].test(term)) {
            errors.push(`utm_term 「${term}」 이 ${role} 자리 규칙과 다르다: ${where}`);
        }
    }
    return errors;
}
