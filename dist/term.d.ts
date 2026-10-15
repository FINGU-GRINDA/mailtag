/**
 * 링크 자리(utm_term) 이름 만들기.
 *
 * 버튼 문구는 언어마다 달라서 그대로 이름으로 쓰면 한·영·일 메일의 같은 버튼이 다른 줄로 집계된다.
 * 그래서 자리 이름은 영문 소문자로 접거나 링크 주소에서 만든다.
 */
export type EmailLinkRole = "main" | "sub" | "bnr" | "txt" | "img" | "webview" | "unsubscribe";
/** 링크 자리 → utm_term. 이름은 `mailTermName` 으로 만든 영문 소문자여야 한다. */
export declare const mailTerm: {
    main: (name: string) => string;
    sub: (name: string) => string;
    bnr: (variant?: "a" | "b") => string;
    txt: (name: string) => string;
    img: (name: string) => string;
};
/** 자리별 utm_term 모양. 게이트(`checkEmailUtm`)가 `data-mds` 자리와 대조한다. */
export declare const MAIL_TERM_RULE: Readonly<Record<"main" | "sub" | "bnr" | "txt" | "img", RegExp>>;
/** 아무 글자 → term·content 에 쓸 수 있는 이름(최대 40자). 영문·숫자가 하나도 없으면 빈 문자열. */
export declare function mailTermName(text: string): string;
/**
 * 링크 주소 → 자리 이름(마지막 경로 조각, 루트면 `home`). 끝 조각이 ID(uuid·숫자)면 그 앞 조각을 쓴다.
 * 주소를 못 읽으면 `link`.
 */
export declare function mailTermNameFromUrl(url: string): string;
/** 옛 규칙에서 자리를 content 에 넣던 값 — 다시 태그할 때 content 로 물려받지 않는다. */
export declare function isLegacyPositionContent(content: string): boolean;
