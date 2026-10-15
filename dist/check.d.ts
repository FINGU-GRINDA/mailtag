/**
 * 이미 만들어진 주소·메일 HTML 이 규칙을 지키는지 보는 게이트.
 *
 * 링크를 만드는 쪽(`mailTagUrl`)이 던지더라도, 사람·AI 가 쓴 본문이나 옛 초안은 다른 길로 들어온다.
 * 발송 전·테스트에서 이 게이트로 한 번 더 걸러 규칙 밖 링크가 나가지 않게 한다.
 * 컴포넌트는 링크에 `data-mds="<자리>"` 를 달고, `checkEmailUtm` 이 그 표시로 자리 규칙까지 본다.
 */
/** href 안의 HTML 엔티티를 푼다(`&amp;` → `&` 등). */
export declare function decodeEntities(text: string): string;
/** UTM 이 붙은 주소 하나의 규칙 위반(축·순서·값). 자리 규칙은 `checkEmailUtm` 이 따로 본다. */
export declare function mailTagErrors(url: URL): string[];
/** 메일 HTML 의 모든 링크를 규칙과 대조한다. 어긴 링크마다 한 줄씩 돌려준다(없으면 빈 배열). */
export declare function checkEmailUtm(html: string): string[];
